"use strict";
// Claude through an Anthropic API key (Claude Console, pay-as-you-go).
// Same event interface as claudeCode.runTurn, with the tool loop run here.

const Anthropic = require("@anthropic-ai/sdk");

const AnthropicClient = Anthropic.Anthropic || Anthropic.default || Anthropic;
const MODELS = [
  { id: "claude-haiku-5-5", label: "Haiku 5.5 — fastest" },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5 — fast and capable" },
  { id: "claude-opus-5-5", label: "Opus 5.5 — most capable" },
  { id: "claude-fable-5-1", label: "Fable 5.1" },
];
const MAX_STEPS = 8;
const MAX_HISTORY = 60;

let cached = null;
const sessions = new Map(); // session key -> Anthropic messages

function client(apiKey) {
  if (cached?.apiKey !== apiKey) cached = { apiKey, client: new AnthropicClient({ apiKey, maxRetries: 2 }) };
  return cached.client;
}

async function verifyKey(apiKey) {
  const models = [];
  for await (const m of client(apiKey).models.list({ limit: 50 })) models.push(m.id);
  return models;
}

function friendlyError(err) {
  const status = err?.status;
  const msg = err?.error?.error?.message || err?.message || String(err);
  if (status === 401) return "Your Anthropic API key was rejected. Update it in Settings → Claude.";
  if (status === 429) return "Anthropic rate limit reached — try again in a moment.";
  if (status === 529 || status === 503) return "Claude is overloaded right now — try again shortly.";
  return "Claude: " + msg;
}

// Drops tool calls left without results by an interrupted turn.
function repair(messages) {
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (m.role !== "assistant" || !Array.isArray(m.content) || !m.content.some((b) => b.type === "tool_use")) continue;
    const next = messages[i + 1];
    if (next?.role === "user" && Array.isArray(next.content) && next.content.some((b) => b.type === "tool_result")) continue;
    const text = m.content.filter((b) => b.type === "text");
    messages[i] = { role: "assistant", content: text.length ? text : [{ type: "text", text: "(interrupted)" }] };
  }
  if (messages.length > MAX_HISTORY) {
    // start the kept window on a plain user message (not a tool result)
    let cut = messages.length - MAX_HISTORY;
    const isPlainUser = (m) => m.role === "user" && !m.content.some?.((b) => b.type === "tool_result");
    while (cut < messages.length && !isPlainUser(messages[cut])) cut++;
    messages.splice(0, cut);
  }
}

function toApiContent(content) {
  if (!Array.isArray(content)) return content || "(no output)";
  return content.map((b) => (b.type === "image" ? { type: "image", source: { type: "base64", media_type: b.mimeType, data: b.data } } : { type: "text", text: b.text }));
}

// Keeps exactly one cache breakpoint, on the newest message.
function markCacheTail(messages) {
  for (const m of messages) if (Array.isArray(m.content)) for (const b of m.content) delete b.cache_control;
  const last = messages[messages.length - 1];
  const block = Array.isArray(last?.content) ? last.content[last.content.length - 1] : null;
  if (block) block.cache_control = { type: "ephemeral" };
}

async function* runTurn({ apiKey, sessionKey, prompt, images = [], tools, system, model, signal, oneShot = false, maxTokens = 8192 }) {
  const messages = oneShot ? [] : sessions.get(sessionKey) || [];
  if (!oneShot) sessions.set(sessionKey, messages);
  repair(messages);
  messages.push({
    role: "user",
    content: [
      ...images.slice(0, 4).map((img) => ({ type: "image", source: { type: "base64", media_type: img.mimeType, data: img.data } })),
      { type: "text", text: prompt },
    ],
  });
  const apiTools = tools?.list.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema })) || [];
  // Prompt caching: tools + system are identical across a conversation, and
  // the history grows append-only, so each step re-reads the prefix at 10%.
  if (apiTools.length) apiTools[apiTools.length - 1].cache_control = { type: "ephemeral" };
  const systemBlocks = system ? [{ type: "text", text: system, cache_control: { type: "ephemeral" } }] : undefined;

  let prior = "";
  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      markCacheTail(messages);
      const stream = client(apiKey).messages.stream(
        { model, max_tokens: maxTokens, messages, ...(systemBlocks ? { system: systemBlocks } : {}), ...(apiTools.length ? { tools: apiTools } : {}) },
        { signal },
      );
      let text = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          text += event.delta.text;
          yield { type: "text", text: (prior ? prior + "\n\n" : "") + text };
        }
      }
      const final = await stream.finalMessage();
      messages.push({ role: "assistant", content: final.content });
      if (text.trim()) prior = (prior ? prior + "\n\n" : "") + text.trim();
      const calls = final.content.filter((b) => b.type === "tool_use");
      if (!calls.length) return;

      const results = [];
      for (const call of calls) {
        let respond;
        const done = new Promise((r) => (respond = r));
        yield { type: "tool", name: call.name, args: call.input || {}, respond };
        const res = await done;
        results.push({ type: "tool_result", tool_use_id: call.id, content: toApiContent(res.content), ...(res.isError ? { is_error: true } : {}) });
      }
      messages.push({ role: "user", content: results });
    }
    yield { type: "text", text: (prior ? prior + "\n\n" : "") + "(Stopped after " + MAX_STEPS + " steps.)" };
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError") return;
    throw new Error(friendlyError(err));
  }
}

async function complete({ apiKey, system, prompt, model = "claude-haiku-5-5", signal, maxTokens = 2048 }) {
  let text = "";
  for await (const ev of runTurn({ apiKey, prompt, system, model, signal, oneShot: true, maxTokens })) if (ev.type === "text") text = ev.text;
  return text.trim();
}

module.exports = { MODELS, verifyKey, runTurn, complete, friendlyError };
