"use strict";
// Claude, using your own Claude account through the Claude Code CLI.
//
// VoiceOS runs your installed, unmodified `claude` binary in headless mode,
// so requests go through Claude Code with the sign-in you made in Anthropic's
// own flow — the path Anthropic permits for subscription plans. VoiceOS never
// reads, stores or forwards Claude credentials: sign-in state comes from
// `claude auth status`, and sign-in runs `claude auth login`.
//
// Each turn runs isolated from your personal Claude Code setup: an empty
// working folder, no user settings/hooks/plugins, no built-in file or shell
// tools, and only the VoiceOS tools served for that turn over a localhost MCP
// bridge (see toolBridge.js).

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn, execFile } = require("node:child_process");
const electron = require("electron");
const toolBridge = require("./toolBridge");
const log = require("../log");

const MODELS = [
  { id: "haiku", label: "Haiku 5.5 — fastest" },
  { id: "sonnet", label: "Sonnet — fast and capable" },
  { id: "opus", label: "Opus — most capable" },
  { id: "fable", label: "Fable" },
];

// The CLI's "haiku" alias follows whichever Haiku that CLI version shipped
// with (4.5 on older installs), so name the current one explicitly: for the
// alias itself and, through the environment, for the CLI's own helper model
// (the one that summarizes pages for WebFetch).
const HAIKU = "claude-haiku-5-5";
const MODEL_IDS = { haiku: HAIKU };

let binaryCache;
// VoiceOS session id -> { id (Claude Code session), lastUsed, contextTokens, recap }
const sessions = new Map();

// A resumed session re-reads its whole history (old tool results and
// screenshots included) on every request, at full price once the prompt cache
// has expired. So a conversation that has sat idle or grown large continues
// in a fresh session that carries only a short recap.
const ROLLOVER_IDLE_MS = 20 * 60 * 1000;
const ROLLOVER_TOKENS = Number(process.env.VOICEOS_ROLLOVER_TOKENS) || 40_000; // env override is for testing
const RECAP_TURNS = 4;
const RECAP_CHARS = 500;

const clipText = (t) => (t.length > RECAP_CHARS ? t.slice(0, RECAP_CHARS) + "…" : t);

function recapBlock(recap) {
  if (!recap?.length) return "";
  return (
    "<earlier_in_this_conversation>\n" +
    recap.map((r) => "User: " + r.user + "\nYou: " + r.assistant).join("\n\n") +
    "\n</earlier_in_this_conversation>\n\n"
  );
}

// GUI apps don't inherit your shell PATH, so look in the usual install spots.
function findClaude() {
  if (binaryCache !== undefined) return binaryCache;
  const home = os.homedir();
  const candidates = [
    path.join(home, ".local/bin/claude"),
    path.join(home, ".claude/local/claude"),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
    path.join(home, ".npm-global/bin/claude"),
    path.join(home, ".bun/bin/claude"),
  ];
  binaryCache = candidates.find((p) => {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }) || null;
  return binaryCache;
}

function cliEnv() {
  const bin = findClaude();
  const extra = [bin && path.dirname(bin), "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean);
  return {
    ...process.env,
    PATH: [...extra, process.env.PATH || "/usr/bin:/bin"].join(":"),
    NO_COLOR: "1",
    // Voice replies should start fast: no extended thinking (it more than
    // triples time-to-first-word), and no Claude Code telemetry/update checks.
    MAX_THINKING_TOKENS: "0",
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    // Tools can wait on the user's approval card (up to 5 minutes).
    MCP_TOOL_TIMEOUT: "330000",
    ANTHROPIC_DEFAULT_HAIKU_MODEL: HAIKU,
  };
}

function workspace() {
  const dir = path.join(electron.app.getPath("userData"), "claude-workspace");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function status() {
  const bin = findClaude();
  if (!bin) return { installed: false, signedIn: false };
  const out = await new Promise((resolve) =>
    execFile(bin, ["auth", "status"], { env: cliEnv(), timeout: 15_000 }, (err, stdout) => resolve(err && !stdout ? null : stdout)),
  );
  try {
    const j = JSON.parse(out);
    return {
      installed: true,
      signedIn: !!j.loggedIn,
      method: j.authMethod === "claude.ai" ? "subscription" : j.authMethod || null,
      plan: j.subscriptionType || null,
      email: j.email || null,
    };
  } catch {
    return { installed: true, signedIn: false };
  }
}

// Opens Anthropic's own sign-in page (handled entirely by Claude Code).
async function signIn() {
  const bin = findClaude();
  if (!bin) throw new Error("Claude Code isn't installed.");
  await new Promise((resolve) => {
    const child = spawn(bin, ["auth", "login", "--claudeai"], { env: cliEnv(), stdio: "ignore" });
    const timer = setTimeout(() => child.kill("SIGTERM"), 10 * 60 * 1000);
    child.on("close", () => (clearTimeout(timer), resolve()));
    child.on("error", () => (clearTimeout(timer), resolve()));
  });
  electron.app.focus({ steal: true });
  const s = await status();
  if (!s.signedIn) throw new Error("Claude sign-in wasn't completed.");
  return s;
}

function isAuthError(text) {
  return /\/login|not logged in|authenticat|oauth token|401|invalid api key/i.test(text || "");
}

// Streams one assistant turn. Yields:
//   { type: "text", text }                     cumulative reply text
//   { type: "tool", name, args, respond(res) } a VoiceOS tool call to run
//   { type: "activity", label, done }          Claude's own web searches
async function* runTurn({ sessionKey, prompt, images = [], tools, system, model = "sonnet", signal, oneShot = false }) {
  const bin = findClaude();
  if (!bin) throw new Error("Claude Code isn't installed. Install it from Settings → Claude, or add an API key there.");

  const userText = prompt.split("</context>").pop().trim();
  let session = null;
  const queue = [];
  let wake = null;
  const push = (item) => {
    queue.push(item);
    wake?.();
  };

  const bridge = tools?.list.length
    ? await toolBridge.openTurn(tools.list, (name, args) => new Promise((respond) => push({ type: "tool", name, args, respond })))
    : null;

  const args = ["-p", "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--input-format", "stream-json"];
  args.push("--model", MODEL_IDS[model] || model || "sonnet", "--setting-sources", "local", "--permission-mode", "dontAsk", "--strict-mcp-config", "--disable-slash-commands");
  args.push("--tools", oneShot ? "" : "WebSearch,WebFetch");
  // Always replace Claude Code's own (~6k-token) coding-agent system prompt.
  args.push("--system-prompt", system || "You are a concise, helpful assistant.");
  // "dontAsk" denies anything not listed here, including the web tools.
  if (!oneShot) args.push("--allowedTools", "WebSearch", "WebFetch");
  if (bridge) args.push("--mcp-config", JSON.stringify({ mcpServers: { voiceos: bridge.mcpServer } }), "--allowedTools", "mcp__voiceos");
  if (oneShot) args.push("--no-session-persistence");
  else {
    session = sessions.get(sessionKey);
    const rollOver = session && (Date.now() - session.lastUsed > ROLLOVER_IDLE_MS || session.contextTokens > ROLLOVER_TOKENS);
    if (session && !rollOver) args.push("--resume", session.id);
    else {
      if (rollOver) {
        log.info("[Claude] conversation continues in a fresh session (" + (session.contextTokens > ROLLOVER_TOKENS ? session.contextTokens + " tokens of history" : "idle") + ")");
        prompt = recapBlock(session.recap) + prompt;
      }
      session = { id: crypto.randomUUID(), lastUsed: Date.now(), contextTokens: 0, recap: rollOver ? session.recap : [] };
      sessions.set(sessionKey, session);
      if (sessions.size > 200) sessions.delete(sessions.keys().next().value); // oldest
      args.push("--session-id", session.id);
    }
  }

  const child = spawn(bin, args, { cwd: workspace(), env: cliEnv(), stdio: ["pipe", "pipe", "pipe"] });
  const onAbort = () => child.kill("SIGTERM");
  signal?.addEventListener?.("abort", onAbort, { once: true });

  const content = [
    ...images.slice(0, 4).map((img) => ({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.data } })),
    { type: "text", text: prompt },
  ];
  child.stdin.end(JSON.stringify({ type: "user", message: { role: "user", content } }) + "\n");

  let stderr = "";
  let buffer = "";
  let exited = false;
  child.stderr.on("data", (d) => (stderr = (stderr + d).slice(-4000)));
  child.stdout.on("data", (d) => {
    buffer += d;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!line) continue;
      if (process.env.VOICEOS_DEBUG_CLAUDE) fs.appendFileSync(process.env.VOICEOS_DEBUG_CLAUDE, line + "\n");
      try {
        push({ type: "event", event: JSON.parse(line) });
      } catch {}
    }
  });
  child.on("close", (code) => {
    exited = code;
    wake?.();
  });
  child.on("error", (err) => {
    stderr += err.message;
    exited = -1;
    wake?.();
  });

  const segments = new Map(); // assistant message id -> text
  let currentId = null;
  let result = null;
  const reply = () => [...segments.values()].map((s) => s.trim()).filter(Boolean).join("\n\n");

  try {
    for (;;) {
      if (!queue.length) {
        if (exited !== false) break;
        await new Promise((r) => (wake = r));
        wake = null;
        continue;
      }
      const item = queue.shift();
      if (item.type === "tool") {
        yield item;
        continue;
      }
      const e = item.event;
      if (e.type === "stream_event") {
        const ev = e.event;
        if (ev.type === "message_start") currentId = ev.message?.id || crypto.randomUUID();
        else if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta" && currentId) {
          segments.set(currentId, (segments.get(currentId) || "") + ev.delta.text);
          yield { type: "text", text: reply() };
        } else if (ev.type === "content_block_start" && ["server_tool_use", "tool_use"].includes(ev.content_block?.type) && /^Web(Search|Fetch)$|^web_search$/.test(ev.content_block?.name || ""))
          yield { type: "activity", label: /Fetch/.test(ev.content_block.name) ? "Reading a web page" : "Searching the web", done: false };
      } else if (e.type === "assistant" && e.message?.id) {
        // Size of the conversation as of the latest request to Claude.
        const u = e.message.usage;
        if (session && u) session.contextTokens = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.cache_read_input_tokens || 0);
        const text = (e.message.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
        if (text && text.length > (segments.get(e.message.id) || "").length) {
          segments.set(e.message.id, text);
          yield { type: "text", text: reply() };
        }
      } else if (e.type === "system" && e.subtype === "init" && process.env.VOICEOS_DEBUG_CLAUDE) {
        log.info("[Claude] init tools: " + (e.tools || []).join(", "));
      } else if (e.type === "result") {
        result = e;
      }
    }
  } finally {
    bridge?.close();
    signal?.removeEventListener?.("abort", onAbort);
    if (exited === false) child.kill("SIGTERM");
  }

  if (signal?.aborted) return;
  logUsage(model, oneShot, result);
  const failed = !result || result.is_error || (result.subtype && result.subtype !== "success");
  if (failed) {
    const detail = (result?.result || result?.subtype || stderr || "Claude Code exited unexpectedly").toString();
    if (!oneShot) sessions.delete(sessionKey);
    if (isAuthError(detail)) throw new Error("Your Claude sign-in has expired. Sign in again from Settings → Claude.");
    if (/rate limit|usage limit|limit reached/i.test(detail)) throw new Error("You've reached your Claude plan's usage limit for now.");
    throw new Error("Claude: " + detail.split("\n").filter(Boolean).pop().slice(0, 300));
  }
  if (session) {
    session.lastUsed = Date.now();
    session.recap = [...session.recap, { user: clipText(userText), assistant: clipText(reply() || String(result.result || "")) }].slice(-RECAP_TURNS);
  }
  if (!segments.size && result.result) yield { type: "text", text: String(result.result) };
}

function logUsage(model, oneShot, result) {
  const u = result?.usage;
  if (!u) return;
  const fresh = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  log.info(
    "[Claude] " + (oneShot ? "one-shot" : "turn") + " " + model + ": in " + fresh + " (+" + (u.cache_read_input_tokens || 0) + " cached), out " + (u.output_tokens || 0) + ", " + (result.duration_ms || "?") + " ms",
  );
}

// One-shot text completion (dictation polish, Write/Edit modes, titles).
async function complete({ system, prompt, model = "haiku", signal }) {
  let text = "";
  for await (const ev of runTurn({ prompt, system, model, signal, oneShot: true })) if (ev.type === "text") text = ev.text;
  return text.trim();
}

function forgetSession(sessionKey) {
  sessions.delete(sessionKey);
}

module.exports = { MODELS, findClaude, status, signIn, runTurn, complete, forgetSession };
