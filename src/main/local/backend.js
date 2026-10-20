"use strict";
// In-process implementation of the VoiceOSService RPC surface.
//
// The app was built as a thin client for a remote Connect/gRPC backend
// (api.voiceos.com). This class implements that service locally and returns
// the same protobuf messages, so the dictation pipeline, notch, pill,
// history, tool execution and paste logic run unchanged:
//   speech-to-text  → on-device Whisper (speech/transcribe.js)
//   assistant turns → Claude (assistant/index.js), tools run by the app
//   spoken replies  → on-device Kokoro (speech/tts.js)

const crypto = require("node:crypto");
const { EventEmitter } = require("node:events");
const { transcribe, SpeechError } = require("./speech/transcribe");
const { SpokenReply } = require("./speech/tts");
const { tidyTranscript } = require("./speech/tidy");
const assistant = require("./assistant");
const { buildToolTable, addLocalTool, withCatalog, suggest, signature } = require("./assistant/tools");
const files = require("./assistant/files");
const signatureOf = (key, entry) => (entry ? signature(key, entry.schema) : key);
const prompts = require("./assistant/prompts");
const youtube = require("./assistant/youtube");
const youtubeTranscript = require("./assistant/youtubeTranscript");
const computer = require("./assistant/computer");
const weather = require("./assistant/weather");
const x = require("./assistant/x");
const stocks = require("./assistant/stocks");
const macSystem = require("./assistant/macSystem");
const musicApp = require("./assistant/musicApp");

const MODE = { DICTATE: 0, EDIT: 1, WRITE: 2, AGENT: 3 };
const STATUS = {
  TRANSCRIBING: 0,
  THINKING: 1,
  TOOL_EXECUTING: 3,
  TOOL_RESULT: 4,
  TEXT: 5,
  ERROR: 6,
  COMPLETE: 7,
  CONFIRM_REQUIRED: 8,
  MCP_TOOL_EXECUTE: 9,
  KEEPALIVE: 11,
};
// The app aborts a turn after 30 s without any status; ping well within that
// while Claude thinks or a slow local tool (Shortcuts, web fetches) runs.
const KEEPALIVE_MS = 10_000;

// Yields { keepalive: true } every KEEPALIVE_MS until the promise settles,
// then { value }.
async function* whilePending(promise) {
  const settled = promise.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  for (;;) {
    let timer;
    const tick = new Promise((r) => (timer = setTimeout(() => r(null), KEEPALIVE_MS)));
    const res = await Promise.race([settled, tick]);
    clearTimeout(timer);
    if (!res) {
      yield { keepalive: true };
      continue;
    }
    if (res.error) throw res.error;
    yield { value: res.value };
    return;
  }
}

// Wraps an async iterable so a slow next() yields { type: "keepalive" }.
async function* withKeepalive(iterable) {
  const it = iterable[Symbol.asyncIterator]();
  try {
    for (;;) {
      let next;
      for await (const r of whilePending(it.next())) {
        if (r.keepalive) yield { type: "keepalive" };
        else next = r.value;
      }
      if (next.done) return;
      yield next.value;
    }
  } finally {
    await it.return?.();
  }
}
const ERROR_TYPE = { CONFIGURATION: 0, AUDIO: 2, API: 3 };
const AGENT_HANDOFF_DETAIL = "__VOICEOS_AGENT_HANDOFF__";
const TOOL_RESULT_TIMEOUT_MS = 5 * 60 * 1000;
const TEXT_FLUSH_MS = 45;
const NO_ASSISTANT = "Claude isn't signed in. Open Settings → Claude and choose Sign in.";
const NO_ASSISTANT_SPOKEN = "Claude isn't signed in. Open Settings, then Claude, to sign in.";

class LocalVoiceOSClient {
  constructor({ create, service, settings, getSampleRate, onNeedsSetup, sendVoice, log = console }) {
    this.create = create;
    this.service = service;
    this.settings = settings;
    this.getSampleRate = getSampleRate || (() => 16000);
    this.onNeedsSetup = onNeedsSetup || (() => {});
    this.sendVoice = sendVoice || null;
    this.log = log;
    this.pendingToolResults = new Map();
    this.pendingConfirmations = new Map();
    this.progress = new EventEmitter();
    this.progress.setMaxListeners(50);
    this.readyProgressIds = new Set();
    this.activeSpeech = null;
  }

  out(method, init = {}) {
    return this.create(this.service.method[method].output, init);
  }

  // ======================================================== dictation

  transcribeStream(stream, options) {
    return this.voiceOSSessionStream(stream, options);
  }

  async voiceOSSessionStream(stream, options = {}) {
    const headers = options.headers;
    const ctx = { mode: MODE.DICTATE, knowledge: [], customInstructions: [], vocabulary: [] };
    const chunks = [];
    for await (const msg of stream) {
      const { case: kind, value } = msg?.payload || {};
      if (kind === "audioChunk" && value?.audioData?.length) chunks.push(Buffer.from(value.audioData));
      else if (kind === "modeUpdate") ctx.mode = value.mode;
      else if (kind === "knowledgeContext") ctx.knowledge = value.items || [];
      else if (kind === "customInstructionsContext") ctx.customInstructions = value.items || [];
      else if (kind === "dictionaryContext") ctx.vocabulary = [...(value.vocabulary || []), ...(value.items || []).map((i) => i.text)];
    }
    const progressId = header(headers, "progress-id");
    try {
      ctx.vocabulary = unique([...ctx.vocabulary, ...headerCsv(headers, "vocabulary"), ...(headerJson(headers, "dictionary-items") || []).map((i) => i?.text)]);
      const languages = headerCsv(headers, "supported-languages");
      const raw = await transcribe({
        pcm: Buffer.concat(chunks),
        sampleRate: this.getSampleRate(),
        model: this.settings.read().speech.whisperModel,
        language: languages.length === 1 ? languages[0] : undefined,
        vocabulary: ctx.vocabulary,
        signal: options.signal,
      });
      if (progressId) this.markRawTranscriptReady(progressId);
      if (ctx.mode === MODE.AGENT) return this.out("voiceOSSessionStream", { transcript: raw, rawTranscript: raw });
      const text = await this.renderDictation(ctx, raw, headers, options.signal);
      return this.out("voiceOSSessionStream", { transcript: text, rawTranscript: raw });
    } catch (err) {
      if (progressId) this.markRawTranscriptReady(progressId);
      return this.out("voiceOSSessionStream", { error: this.toClientError(err) });
    } finally {
      if (progressId) setTimeout(() => this.readyProgressIds.delete(progressId), 30_000).unref?.();
    }
  }

  async renderDictation(ctx, raw, headers, signal) {
    const appName = header(headers, "app-name");
    const windowTitle = header(headers, "window-title");
    const structure = headerJson(headers, "writing-structure");
    const instructions = matchingInstructions(ctx.customInstructions, appName, header(headers, "app-bundle-id"));
    const contextLines = [
      appName && "Active app: " + appName + (windowTitle ? " — " + windowTitle : ""),
      structure && "Writing style for this app: " + prompts.describeStructure(structure),
      instructions.length && "User instructions for this app:\n" + instructions.map((i) => "- " + i).join("\n"),
    ].filter(Boolean);

    // Dictation follows the Polishing choice on the Dictation page:
    // None = Whisper's text as-is, Light = on-device cleanup (instant, no
    // tokens), Polished = rewritten by Claude's fast model.
    if (ctx.mode === MODE.DICTATE) {
      const style = header(headers, "polish-style") || "light";
      if (style === "none") return raw;
      const tidy = tidyTranscript(raw, structure || {});
      const fast = style === "polished" && this.settings.resolveAssistant("fast");
      if (!fast) return tidy;
      try {
        const polished = await assistant.complete(fast, {
          system: prompts.dictationSystemPrompt(style),
          prompt:
            (contextLines.length ? contextLines.join("\n") + "\n\n" : "") +
            (ctx.vocabulary.length ? "Preferred spellings: " + ctx.vocabulary.slice(0, 80).join(", ") + "\n\n" : "") +
            "<transcript>\n" + raw + "\n</transcript>",
          signal,
        });
        return prompts.stripWrapper(polished) || tidy;
      } catch (err) {
        this.log.warn("[LocalBackend] Dictation polish failed, using on-device cleanup:", err.message);
        return tidy;
      }
    }

    // Write / Edit modes need the assistant.
    const target = this.settings.resolveAssistant("fast") || this.settings.resolveAssistant("agent");
    if (!target) {
      this.onNeedsSetup("assistant");
      throw new SpeechError("LOCAL_LLM_NOT_CONFIGURED", NO_ASSISTANT);
    }
    const selected = header(headers, "selected-text");
    const knowledge = ctx.knowledge.length
      ? "Reference notes:\n" + ctx.knowledge.slice(0, 20).map((k) => "## " + k.title + "\n" + k.content).join("\n\n")
      : "";
    if (ctx.mode === MODE.EDIT && selected?.trim()) {
      const edited = await assistant.complete(target, {
        system: prompts.EDIT_SYSTEM_PROMPT,
        prompt: [contextLines.join("\n"), knowledge, "<selected_text>\n" + selected + "\n</selected_text>", "<instruction>\n" + raw + "\n</instruction>"].filter(Boolean).join("\n\n"),
        signal,
      });
      return prompts.stripWrapper(edited);
    }
    const before = header(headers, "cursor-text-before");
    const after = header(headers, "cursor-text-after");
    const written = await assistant.complete(target, {
      system: prompts.WRITE_SYSTEM_PROMPT,
      prompt: [
        contextLines.join("\n"),
        knowledge,
        selected?.trim() && "<selected_text>\n" + selected + "\n</selected_text>",
        (before || after) && "<surrounding_text>\n" + (before || "") + "[CURSOR]" + (after || "") + "\n</surrounding_text>",
        "<request>\n" + raw + "\n</request>",
      ].filter(Boolean).join("\n\n"),
      signal,
    });
    return prompts.stripWrapper(written);
  }

  markRawTranscriptReady(id) {
    this.readyProgressIds.add(id);
    this.progress.emit(id);
  }

  async *watchTranscription(req, options = {}) {
    const id = req.progressId;
    if (!id) return;
    if (!this.readyProgressIds.has(id)) {
      await new Promise((resolve) => {
        let timer = null;
        const done = () => {
          clearTimeout(timer);
          this.progress.off(id, done);
          options.signal?.removeEventListener?.("abort", done);
          resolve();
        };
        this.progress.on(id, done);
        options.signal?.addEventListener?.("abort", done);
        timer = setTimeout(done, 120_000);
      });
    }
    if (options.signal?.aborted || !this.readyProgressIds.has(id)) return;
    yield this.out("watchTranscription", { event: { case: "progress", value: { rawTranscriptReady: true } } });
  }

  toClientError(err) {
    const code = typeof err?.code === "string" ? err.code : "LOCAL_ERROR";
    const type = code.startsWith("CLIENT_") ? ERROR_TYPE.AUDIO : code.includes("NOT_CONFIGURED") ? ERROR_TYPE.CONFIGURATION : ERROR_TYPE.API;
    if (code.includes("NOT_CONFIGURED")) this.onNeedsSetup(code.includes("STT") ? "speech" : "assistant");
    if (!(err instanceof SpeechError)) this.log.error("[LocalBackend] Dictation error:", err);
    return { code, type, message: err?.message || String(err), details: {} };
  }

  // ======================================================== assistant

  agentCatalogStream(req, options) {
    return this.agentStream(req, options);
  }

  async *agentStream(req, options = {}) {
    const signal = options.signal;
    const sessionId = req.sessionId || crypto.randomUUID();
    const status = (s, init = {}) => this.out("agentStream", { status: s, sessionId, ...init });

    // The handoff marker lets the client start agent history for the turn.
    yield status(STATUS.THINKING, { message: "Thinking…", detail: AGENT_HANDOFF_DETAIL });
    yield status(STATUS.THINKING, { message: "Thinking…" });

    let userText = (req.textInput || "").trim();
    if (!userText && req.audioData?.length) {
      try {
        userText = await transcribe({
          pcm: Buffer.from(req.audioData),
          model: this.settings.read().speech.whisperModel,
          language: req.supportedLanguages?.length === 1 ? req.supportedLanguages[0] : undefined,
          vocabulary: req.vocabulary || [],
          signal,
        });
        yield status(STATUS.TRANSCRIBING, { message: userText });
      } catch (err) {
        if (signal?.aborted) return;
        yield status(STATUS.ERROR, { message: err.message });
        return;
      }
    }
    if (!userText) {
      yield status(STATUS.ERROR, { message: "No speech detected" });
      return;
    }

    const target = this.settings.resolveAssistant("agent");
    if (!target) {
      // Shown and spoken as a normal reply: the app replaces error text with
      // a generic "request was interrupted", which hides what to do.
      this.onNeedsSetup("assistant");
      const speech = this.startSpokenReply();
      speech?.update(NO_ASSISTANT_SPOKEN, true);
      yield status(STATUS.TEXT, { message: NO_ASSISTANT });
      yield status(STATUS.COMPLETE, { message: "" });
      return;
    }

    const voice = this.settings.voice();
    const tools = buildToolTable(req.customToolDeclarations || []);
    addLocalTool(tools, {
      ...youtube.TOOL,
      label: "Searching YouTube",
      run: (args) => youtube.run(args, { openUrl: (url) => require("electron").shell.openExternal(url), signal }),
    });
    addLocalTool(tools, { ...youtubeTranscript.TOOL, run: (args) => youtubeTranscript.run(args, { signal }) });
    for (const t of computer.tools()) addLocalTool(tools, t);
    addLocalTool(tools, { ...weather.TOOL, run: (args) => weather.run(args, { signal }) });
    addLocalTool(tools, { ...stocks.TOOL, run: (args) => stocks.run(args, { signal }) });
    addLocalTool(tools, { ...macSystem.TOOL, run: macSystem.run });
    const xConnected = this.settings.connector("twitter");
    if (xConnected) addLocalTool(tools, { ...x.TOOL, run: (args) => x.run(args, { openUrl: (url) => require("electron").shell.openExternal(url), signal }) });
    addLocalTool(tools, { ...musicApp.TOOL, run: musicApp.run });
    // Always offered (a stable tool list keeps the prompt cache); without DigUp it says so.
    if (this.settings.plutobar?.().filesTool !== false) addLocalTool(tools, { ...files.TOOL, run: files.run });
    // Always offered (a tool list that changes between requests breaks the
    // prompt cache); without a screenshot it points to mac_look.
    const screen = screenImage(req);
    addLocalTool(tools, {
      name: "view_screen",
      description:
        "Look at a screenshot of the user's screen, taken when they made this request. Use it when the request depends on something visible (\"what's this\", \"reply to this\", images, layouts) and the text in <context> isn't enough.",
      schema: {},
      label: "Looking at your screen",
      run: async () =>
        screen ? { content: [screen] } : { content: "No screenshot was taken with this request. Use mac_look with screenshot=true to see the screen now." },
    });
    withCatalog(tools);
    this.log.info("[LocalBackend] tools: " + tools.list.length + " direct, " + tools.catalog.size + " via app_tool");
    if (process.env.VOICEOS_DEBUG_CLAUDE) this.log.info("[LocalBackend] app_tool:\n" + (tools.byName.get("app_tool")?.description || ""));
    const speech = this.startSpokenReply();
    const fileText = collectTextFiles(req.attachedFiles);
    let text = "";
    let lastFlush = 0;
    try {
      for await (const ev of withKeepalive(assistant.runTurn(target, {
        sessionKey: sessionId,
        prompt: prompts.assistantUserMessage(req, userText + (fileText ? "\n\n" + fileText : "")),
        images: collectImages(req),
        tools,
        system: prompts.assistantSystemPrompt({
          speakReplies: voice.enabled,
          jarvis: voice.jarvis,
          language: req.defaultLanguage || req.language,
          hasTools: tools.list.length > 0,
          x: xConnected,
          tool: (n) => (target.engine === "subscription" ? "mcp__voiceos__" + n : n),
        }),
        signal,
      }))) {
        if (ev.type === "keepalive") {
          yield status(STATUS.KEEPALIVE);
        } else if (ev.type === "text") {
          text = ev.text;
          speech?.update(text);
          const now = Date.now();
          if (now - lastFlush >= TEXT_FLUSH_MS) {
            lastFlush = now;
            yield status(STATUS.TEXT, { message: text });
          }
        } else if (ev.type === "tool") {
          const entry = tools.byName.get(ev.name);
          if (!entry) ev.respond({ content: "Unknown tool: " + ev.name, isError: true });
          else if (entry.name === "app_tool") ev.respond(yield* this.runCatalogTool(tools.catalog, ev.args, status, signal));
          else if (entry.local) {
            yield status(STATUS.TOOL_EXECUTING, { toolName: entry.name, message: entry.label });
            let result;
            for await (const r of whilePending(entry.local(ev.args).catch((err) => ({ content: "Failed: " + err.message, isError: true })))) {
              if (r.keepalive) yield status(STATUS.KEEPALIVE);
              else result = r.value;
            }
            // A risky click or send: ask through the notch's approval card first.
            if (result.needsApproval) {
              const { label, params } = result.needsApproval;
              const decision = yield* this.askToConfirm({ name: entry.name }, label, params, status, signal);
              if (decision.aborted) result = { content: '{"error":"aborted"}', isError: true };
              else if (!decision.approved) result = { content: "The user declined, so this was not done. Don't try to do it another way; ask what they'd like instead." };
              else {
                const approved = result.resume().catch((err) => ({ content: "Failed: " + err.message, isError: true }));
                for await (const r of whilePending(approved)) {
                  if (r.keepalive) yield status(STATUS.KEEPALIVE);
                  else result = r.value;
                }
              }
            }
            this.log.info("[LocalBackend] " + entry.name + (result.isError ? " failed: " + result.content : " done"));
            const card = !result.isError && result.detail ? "\n\n(Shown to the user as a card on screen. Reply in one or two short sentences with the key point; don't list the details.)" : "";
            ev.respond({ content: typeof result.content === "string" ? result.content + card : result.content, isError: result.isError });
            // detail feeds the notch's native cards (weather, X posts).
            yield status(STATUS.TOOL_RESULT, { toolName: result.toolName || entry.name, message: entry.label, detail: result.isError ? "" : result.detail || "" });
          } else ev.respond(yield* this.executeTool(entry, ev.args, status, signal));
        } else if (ev.type === "activity") {
          yield status(ev.done ? STATUS.TOOL_RESULT : STATUS.TOOL_EXECUTING, { toolName: "web_search", message: ev.label });
        }
      }
    } catch (err) {
      speech?.cancel();
      if (signal?.aborted) return;
      this.log.error("[LocalBackend] Assistant turn failed:", err.message);
      if (/sign-in has expired|isn't installed/.test(err.message)) this.onNeedsSetup("assistant");
      yield status(STATUS.ERROR, { message: err.message });
      return;
    }
    if (signal?.aborted) return speech?.cancel();
    if (text) yield status(STATUS.TEXT, { message: text });
    speech?.update(text, true);
    yield status(STATUS.COMPLETE, { message: "" });
  }

  // app_tool: runs (or describes) a connected-app action from the catalog.
  async *runCatalogTool(catalog, args = {}, status, signal) {
    let key = String(args.name || "").replace(/^mcp__voiceos__/, "");
    const find = (k) => catalog.get(k) || [...catalog.values()].find((e) => e.name === k || e.decl?.originalName === k);
    let entry = find(key);
    // Also accept { name: "<app>", arguments: { action: "<action>", … } }.
    const nested = args.arguments && typeof args.arguments === "object" ? args.arguments : null;
    if (!entry && nested && typeof nested.action === "string" && find(nested.action)) {
      key = nested.action;
      entry = find(key);
      const { action, ...rest } = nested;
      args = { ...args, arguments: rest, describe: args.describe ?? rest.describe };
      delete args.arguments.describe;
    }
    if (!entry) {
      // The arguments often name the app ({ app: "Finder" }), which narrows it down.
      const close = suggest(catalog, key + " " + JSON.stringify(nested || {}), 10);
      return {
        content:
          "Unknown action '" + key + "'. name must be one of the actions listed in app_tool's description (grouped by app)." +
          (close.length ? " Closest: " + close.map((k) => signatureOf(k, catalog.get(k))).join("; ") + "." : ""),
        isError: true,
      };
    }
    const details = () => ({ name: key, description: entry.description, parameters: entry.schema });
    if (args.describe) return { content: JSON.stringify(details()) };
    let input = args.arguments ?? {};
    if (typeof input === "string") {
      try {
        input = JSON.parse(input);
      } catch {
        input = {};
      }
    }
    const missing = (entry.schema.required || []).filter((k) => input[k] === undefined);
    if (missing.length) return { content: JSON.stringify({ error: "Missing required arguments: " + missing.join(", "), ...details() }), isError: true };
    return yield* this.executeTool(entry, input, status, signal);
  }

  // Runs one tool through the app's own executor: the client receives
  // MCP_TOOL_EXECUTE, runs the native action / integration / MCP tool, and
  // reports back through agentMcpToolResult().
  async *executeTool(entry, args, status, signal) {
    const decl = entry.decl;
    const label = humanizeToolName(decl.originalName || decl.name);
    // Actions the app marks as needing approval (sending messages or email,
    // moving files…) wait for the notch's confirmation card, where the user
    // can also edit the message before approving.
    if (decl.requiresConfirmation) {
      const decision = yield* this.askToConfirm(decl, label, args, status, signal);
      if (decision.aborted) return { content: '{"error":"aborted"}', isError: true };
      if (!decision.approved)
        return { content: "The user declined, so this was not run. Don't retry it unless they ask again." };
      if (decision.updatedInput) {
        try {
          args = { ...args, ...JSON.parse(decision.updatedInput) };
        } catch {}
      }
    }
    // The Apple Music connector plays inside VoiceOS; don't talk over Music.app.
    if (/^applemusic_(play|resume)/.test(decl.originalName || "")) await musicApp.pauseMusicApp();
    yield status(STATUS.TOOL_EXECUTING, { toolName: decl.name, message: label });
    const executionId = crypto.randomUUID();
    const pending = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingToolResults.delete(executionId);
        resolve({ resultJson: JSON.stringify({ error: "Tool timed out" }), isError: true });
      }, TOOL_RESULT_TIMEOUT_MS);
      const onAbort = () => {
        clearTimeout(timer);
        resolve({ resultJson: '{"error":"aborted"}', isError: true, aborted: true });
      };
      signal?.addEventListener?.("abort", onAbort, { once: true });
      this.pendingToolResults.set(executionId, (res) => {
        clearTimeout(timer);
        signal?.removeEventListener?.("abort", onAbort);
        resolve(res);
      });
    });
    yield status(STATUS.MCP_TOOL_EXECUTE, {
      toolName: decl.name,
      message: label,
      actionDetails: JSON.stringify({ executionId, serverId: decl.mcpServerId, toolName: decl.originalName || decl.name, args: args || {} }),
    });
    const res = await pending;
    this.pendingToolResults.delete(executionId);
    if (!res.aborted) yield status(STATUS.TOOL_RESULT, { toolName: decl.name, message: label, detail: "" });
    return { content: truncate(res.resultJson || "", 24_000), isError: !!res.isError };
  }

  async agentMcpToolResult(req) {
    const resolve = this.pendingToolResults.get(req.executionId);
    if (resolve) resolve({ resultJson: req.resultJson, isError: req.isError });
    return this.out("agentMcpToolResult", { success: !!resolve });
  }

  async *askToConfirm(decl, label, args, status, signal) {
    const confirmationId = crypto.randomUUID();
    const decision = new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingConfirmations.delete(confirmationId);
        resolve({ approved: false });
      }, TOOL_RESULT_TIMEOUT_MS);
      const onAbort = () => {
        clearTimeout(timer);
        this.pendingConfirmations.delete(confirmationId);
        resolve({ aborted: true });
      };
      signal?.addEventListener?.("abort", onAbort, { once: true });
      this.pendingConfirmations.set(confirmationId, (res) => {
        clearTimeout(timer);
        signal?.removeEventListener?.("abort", onAbort);
        this.pendingConfirmations.delete(confirmationId);
        resolve(res);
      });
    });
    yield status(STATUS.CONFIRM_REQUIRED, {
      confirmationId,
      toolName: decl.name,
      message: label,
      actionDetails: JSON.stringify({ actions: [{ name: decl.originalName || decl.name, params: args || {} }] }),
    });
    const res = await decision;
    this.log.info("[LocalBackend] " + (decl.originalName || decl.name) + (res.aborted ? " confirmation aborted" : res.approved ? " approved" : " declined"));
    return res;
  }

  async agentConfirmAction(req) {
    const resolve = this.pendingConfirmations.get(req.confirmationId);
    if (resolve) resolve({ approved: !!req.approved, updatedInput: req.updatedInput || "" });
    return this.out("agentConfirmAction", { success: !!resolve });
  }

  async agentWarmup() {
    return this.out("agentWarmup", { success: true, toolCatalogRevision: "" });
  }

  async matchAppIntent() {
    return this.out("matchAppIntent", {});
  }

  startSpokenReply() {
    this.stopSpeaking();
    const voice = this.settings.voice();
    if (!this.sendVoice || !voice.enabled) return null;
    this.activeSpeech = new SpokenReply({ send: this.sendVoice, voice: voice.kokoroVoice, speed: voice.speed });
    return this.activeSpeech;
  }

  stopSpeaking() {
    this.activeSpeech?.cancel();
    this.activeSpeech = null;
  }

  // ==================================================== chat & helpers

  async chatFollowUp(req, options = {}) {
    const target = this.settings.resolveAssistant("agent");
    if (!target) return this.out("chatFollowUp", { error: { code: "LOCAL_LLM_NOT_CONFIGURED", type: ERROR_TYPE.CONFIGURATION, message: NO_ASSISTANT } });
    const context = [
      req.appName && "Active app: " + req.appName + (req.windowTitle ? " — " + req.windowTitle : ""),
      req.windowUrl && "URL: " + req.windowUrl,
      req.selectedText && "<selected_text>\n" + truncate(req.selectedText, 8000) + "\n</selected_text>",
      req.ocrText && "<screen_text>\n" + truncate(req.ocrText, 6000) + "\n</screen_text>",
      req.accessibilityText && "<window_text>\n" + truncate(req.accessibilityText, 6000) + "\n</window_text>",
      req.originalTranscript && "The conversation started from this dictated request: " + req.originalTranscript,
    ].filter(Boolean);
    const transcript = (req.conversationHistory || [])
      .filter((m) => m.content)
      .map((m) => (m.role === "assistant" ? "Assistant: " : "User: ") + m.content)
      .concat("User: " + req.text)
      .join("\n\n");
    try {
      const text = await assistant.complete(target, {
        system: "You are VoiceOS, a helpful writing assistant. Continue the conversation and answer the last user message concisely." + (context.length ? "\n\n" + context.join("\n\n") : ""),
        prompt: transcript,
        signal: options.signal,
      });
      return this.out("chatFollowUp", { text });
    } catch (err) {
      return this.out("chatFollowUp", { error: { code: "LOCAL_ERROR", type: ERROR_TYPE.API, message: err.message } });
    }
  }

  async analyzeKeywordSuggestion(req) {
    const mods = (req.modifications || []).slice(0, 10);
    const target = this.settings.resolveAssistant("fast");
    if (!target || !mods.length) return this.out("analyzeKeywordSuggestion", { shouldAdd: false, reason: "unavailable" });
    const verdict = await this.askJson(
      target,
      'A user corrected words in a dictated transcript. Decide whether a corrected word is a proper noun, product name, jargon or unusual spelling that belongs in their speech-recognition dictionary. Respond with JSON {"shouldAdd": boolean, "keyword": string, "reason": string}.',
      JSON.stringify(mods.map((m) => ({ before: m.before, after: m.after }))),
    );
    return this.out("analyzeKeywordSuggestion", { shouldAdd: !!verdict?.shouldAdd && !!verdict?.keyword, keyword: verdict?.keyword || "", reason: verdict?.reason || "" });
  }

  async analyzeAbbreviationSuggestion() {
    return this.out("analyzeAbbreviationSuggestion", { shouldAdd: false, reason: "local mode" });
  }

  async analyzeDictionaryImport(req) {
    const existing = new Set((req.existingKeywords || []).map((k) => k.toLowerCase()));
    const slots = req.availableSlots > 0 ? req.availableSlots : 100;
    const candidates = unique(String(req.pastedText || "").split(/[\n,;]+/).map((s) => s.trim())).filter((t) => t.length <= 60 && !existing.has(t.toLowerCase()));
    return this.out("analyzeDictionaryImport", {
      candidates: candidates.map((text, index) => ({ index, text, shouldAdd: index < slots, reason: "" })),
      summary: candidates.length + " terms found",
    });
  }

  async askJson(target, system, prompt) {
    try {
      const text = await assistant.complete(target, { system: system + " Output only JSON.", prompt });
      const match = text.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : null;
    } catch (err) {
      this.log.warn("[LocalBackend] JSON helper failed:", err.message);
      return null;
    }
  }

  // ==================================================== account & data
  // Local SQLite is the source of truth; these keep the sync paths happy.

  async createDictionaryItem(req) {
    const now = new Date().toISOString();
    return this.out("createDictionaryItem", { id: req.id, userId: "self-hosted", text: req.text, description: req.description, autoAdded: req.autoAdded, appIdentifiers: req.appIdentifiers, createdAt: now, updatedAt: now });
  }
  async updateDictionaryItem(req) {
    return this.out("updateDictionaryItem", { id: req.id, userId: "self-hosted", text: req.text, description: req.description, updatedAt: new Date().toISOString() });
  }
  async deleteDictionaryItem() {
    return this.out("deleteDictionaryItem");
  }
  async listDictionaryItems() {
    return this.out("listDictionaryItems", { items: [] });
  }
  async createVoiceSession(req) {
    const now = new Date().toISOString();
    return this.out("createVoiceSession", { ...pick(req, ["id", "transcript", "generatedText", "appName", "windowTitle", "durationSeconds", "sampleRate", "mode", "language", "chatHistory"]), userId: "self-hosted", createdAt: now, updatedAt: now });
  }
  async getVoiceSession(req) {
    return this.out("getVoiceSession", { id: req.id });
  }
  async listVoiceSessions() {
    return this.out("listVoiceSessions", { sessions: [] });
  }
  async updateVoiceSession(req) {
    return this.out("updateVoiceSession", { ...pick(req, ["id", "transcript", "generatedText", "chatHistory"]), updatedAt: new Date().toISOString() });
  }
  async deleteVoiceSession() {
    return this.out("deleteVoiceSession");
  }
  async createAppIcon(req) {
    return this.out("createAppIcon", pick(req, ["id", "appName", "iconBase64"]));
  }
  async getAppIconByName(req) {
    return this.out("getAppIconByName", { appName: req.appName });
  }
  async listAppIcons() {
    return this.out("listAppIcons", { icons: [] });
  }
  async deleteUserData() {
    return this.out("deleteUserData");
  }
  async getSubscriptionStatus() {
    return this.out("getSubscriptionStatus", { planType: "pro", status: "active", isActive: true, entitlement: "pro", currentPeriodEnd: "2099-12-31T00:00:00.000Z" });
  }
  async getUsageStats() {
    return this.out("getUsageStats", { weeklyLimit: 1_000_000, planType: "pro", daysUntilReset: 7, agentWeeklyLimit: 1_000_000, entitlement: "pro" });
  }
  async recordVoiceSessionUsage() {
    return this.out("recordVoiceSessionUsage", { allowed: true, limit: 1_000_000, planType: "pro" });
  }
}

// ============================================================ helpers

function header(headers, name) {
  const v = headers?.get?.(name);
  if (!v) return null;
  if (!v.startsWith("base64:")) return v;
  try {
    return Buffer.from(v.slice(7), "base64").toString("utf8");
  } catch {
    return null;
  }
}

function headerCsv(headers, name) {
  return (header(headers, name) || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function headerJson(headers, name) {
  try {
    return JSON.parse(header(headers, name));
  } catch {
    return null;
  }
}

function unique(list) {
  return [...new Set(list.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean))];
}

function pick(obj, keys) {
  return Object.fromEntries(keys.map((k) => [k, obj[k]]));
}

function matchingInstructions(items, appName, bundleId) {
  const keys = [appName, bundleId].filter(Boolean).map((s) => s.toLowerCase());
  return (items || [])
    .filter((i) => i.instruction && (!i.appIdentifier || keys.includes(i.appIdentifier.toLowerCase())))
    .map((i) => i.instruction)
    .slice(0, 10);
}

function parseImage(s) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(s);
  return m ? { mimeType: m[1], data: m[2] } : { mimeType: s.startsWith("/9j/") ? "image/jpeg" : "image/png", data: s };
}

// The screenshot the app takes automatically on every voice request. It's
// offered as the view_screen tool instead of being attached, so Claude only
// pays for it (~1.5k tokens, and slower replies) when a request needs it.
function screenImage(req) {
  return req.cursorScreenshotBase64 ? { type: "image", ...parseImage(req.cursorScreenshotBase64) } : null;
}

// Images the user chose to share: windows picked with the highlight
// overlay, and dropped image files.
function collectImages(req) {
  const images = [req.screenshotBase64, ...(req.screenshotsBase64 || [])].filter(Boolean).map(parseImage);
  for (const f of req.attachedFiles || [])
    if (f?.data?.length && f.mimeType?.startsWith("image/")) images.push({ mimeType: f.mimeType, data: Buffer.from(f.data).toString("base64") });
  return images.slice(0, 4);
}

function collectTextFiles(files = []) {
  return files
    .filter((f) => f?.data?.length && (/^text\/|json|xml|csv|markdown|yaml/.test(f.mimeType || "") || /\.(md|txt|csv|json|ya?ml|xml|html?|js|ts|py|swift)$/i.test(f.name || "")))
    .map((f) => '<attached_file name="' + (f.name || "file") + '">\n' + truncate(Buffer.from(f.data).toString("utf8"), 20_000) + "\n</attached_file>")
    .join("\n\n");
}

function humanizeToolName(name) {
  const clean = String(name || "tool").replace(/^voiceos[_-]?/i, "").replace(/^mcp__[^_]+__/, "").replace(/[_-]+/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "Running tool";
}

const truncate = prompts.truncate;

module.exports = { LocalVoiceOSClient };
