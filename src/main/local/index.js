"use strict";
// Self-contained VoiceOS runtime. main.js calls, in order:
//   installEarly()                 network guard, before any request
//   attachStore(store, STORE_KEYS) local identity + settings
//   createVoiceOSClient(...)       in-process VoiceOSService (backend.js)
//   onReady(...)                   IPC, speech warm-up
//
// Setup and settings live in the main window (Dashboard setup card, and the
// Claude / Speech tabs in Settings), drawn by src/renderer/voiceos/local-ui.js
// on top of the state and IPC defined here.

const fs = require("node:fs");
const path = require("node:path");
const electron = require("electron");
const { installNetworkGuard } = require("./networkGuard");
const identity = require("./identity");
const { Settings } = require("./settings");
const { LocalVoiceOSClient } = require("./backend");
const assistant = require("./assistant");
const whisper = require("./speech/whisper");
const tts = require("./speech/tts");
const models = require("./speech/models");
const { pcm16ToWav } = require("./speech/transcribe");
const agentEvents = require("./agentEvents");
const plutobar = require("./plutobar");

const log = require("./log");
const { claudeCode, claudeApi } = assistant;

let settings = null;
let voiceClient = null;
let hooks = {};
let sendVoiceHook = null;
let setupPromptedAt = 0;
const downloads = {};

// --------------------------------------------------------------- startup

function installEarly() {
  installNetworkGuard({ electron, routes: localRoutes() });
}

function attachStore(store, STORE_KEYS) {
  identity.init(store, STORE_KEYS);
  skipLegacyOnboarding(store, STORE_KEYS);
  settings = new Settings(store, STORE_KEYS);
  settings.onChange(pushState);
  return settings;
}

// The original onboarding was built around the VoiceOS cloud (narrated intro,
// account email, cloud integrations). The Dashboard's setup card replaces
// it, so mark it done before any window opens. (If a required permission is later revoked,
// the app itself reopens its permissions step.)
function skipLegacyOnboarding(store, K) {
  const ob = store.get(K.ONBOARDING) || {};
  if (ob.onboardingCompleted === true && ob.onboardingFlow?.completed === true) return;
  store.set(K.ONBOARDING, { ...ob, onboardingCompleted: true, onboardingFlow: { ...(ob.onboardingFlow || {}), completed: true } });
  store.set(K.ONBOARDING_INTRO_PRESENTED, true);
}

function createVoiceOSClient({ create, service, getSampleRate, sendVoice }) {
  if (sendVoice) sendVoiceHook = sendVoice;
  voiceClient ??= new LocalVoiceOSClient({
    create,
    service,
    settings,
    log,
    getSampleRate,
    onNeedsSetup: (kind) => {
      // Open the relevant Settings tab when something required is missing
      // (at most once a minute).
      if (Date.now() - setupPromptedAt < 60_000) return;
      setupPromptedAt = Date.now();
      electron.app.whenReady().then(() => openSettings(kind === "speech" ? "speech" : "claude"));
    },
    sendVoice: (payload) => sendVoiceHook?.(payload),
  });
  return voiceClient;
}

// hooks.onStateChanged()               rebuild the tray menu
// hooks.openMainWindow(channel?, arg?)  show the main window, then send it an event
// hooks.pauseInternalMusic()            pause the Apple Music connector's player
// hooks.notchActions                    what PlutoBar's assistant buttons do (main.js still names them for the old notch)
function onReady(readyHooks = {}) {
  hooks = readyHooks;
  plutobar.setActions({
    ...hooks.notchActions,
    stopSpeaking: () => voiceClient?.stopSpeaking(),
    openSettings: () => openSettings("plutobar"),
  });
  electron.app.on("will-quit", () => plutobar.quit());
  require("./assistant/musicApp").setHooks({ pauseVoiceOSPlayer: hooks.pauseInternalMusic });
  log.info("[VoiceOS] local runtime ready — speech on-device, assistant: Claude");
  registerIpc();
  if (hooks.onStateChanged) settings.onChange(hooks.onStateChanged);
  tts.onStatus(pushState);
  electron.app.on("will-quit", () => tts.stop());
  electron.app.on("browser-window-focus", () => refreshClaude().catch(() => {}));
  refreshClaude().finally(() => hooks.onStateChanged?.());
  setTimeout(warmUp, 2500);
  applyPlutobar();
}

// PlutoBar on: the assistant lives in the bar. Off: back in VoiceOS's
// original Electron overlay.
let plutobarStatus = { active: false, shortcut: null, shortcutOk: false };
function applyPlutobar() {
  const p = settings.plutobar();
  plutobarStatus = plutobar.setEnabled(p.enabled, p);
  agentEvents.setLegacyHidden(plutobar.isEnabled());
  pushState();
}

async function refreshClaude() {
  settings.setClaudeStatus(await claudeCode.status().catch(() => ({ installed: false, signedIn: false })));
}

// -------------------------------------------------------------- speech

let warmedModel = null;

// Keeps Whisper (and Kokoro, if replies are spoken) loaded so the first
// dictation after launch is instant.
function warmUp() {
  const { whisperModel } = settings.read().speech;
  const speakReplies = settings.voice().enabled;
  log.info("[VoiceOS] warm-up: whisper=" + whisperModel + (models.isWhisperModelReady(whisperModel) ? " (downloaded)" : " (not downloaded)") + " voice=" + (speakReplies ? "on" : "off"));
  if (models.isWhisperModelReady(whisperModel) && warmedModel !== whisperModel) {
    warmedModel = whisperModel;
    whisper.ensureStarted(whisperModel).then(pushState, (err) => {
      warmedModel = null;
      log.warn("[VoiceOS] Whisper failed to start:", err.message);
      pushState();
    });
  }
  if (speakReplies && tts.isModelDownloaded()) tts.ensureReady().then(pushState, pushState);
}

async function downloadWhisper(id) {
  const m = models.WHISPER_MODELS[id];
  if (!m) throw new Error("Unknown model: " + id);
  if (models.isWhisperModelReady(id)) return;
  const key = "whisper";
  downloads[key] = { received: 0, total: m.bytes };
  pushState();
  try {
    await models.downloadFile({
      key,
      url: m.url,
      dest: models.whisperModelPath(id),
      bytes: m.bytes,
      onProgress: (p) => ((downloads[key] = p), pushState()),
    });
    delete downloads[key];
    warmUp();
  } catch (err) {
    downloads[key] = { error: err.name === "AbortError" ? "Download cancelled." : err.message };
    throw err;
  } finally {
    pushState();
  }
}

async function downloadVoice() {
  if (tts.status().ready) return;
  downloads.voice = { received: 0, total: models.KOKORO.bytes };
  pushState();
  try {
    await tts.ensureReady();
    delete downloads.voice;
  } catch (err) {
    downloads.voice = { error: err.message };
    throw err;
  } finally {
    pushState();
  }
}

// ---------------------------------------------------------- permissions

function permissions() {
  const sp = electron.systemPreferences;
  return {
    microphone: sp.getMediaAccessStatus("microphone"),
    accessibility: sp.isTrustedAccessibilityClient(false) ? "granted" : "denied",
    packaged: electron.app.isPackaged,
  };
}

// ---------------------------------------------------------------- state

function state() {
  const s = settings.publicState();
  const w = whisper.status();
  const t = tts.status();
  const voice = settings.voice();
  const perms = permissions();
  const whisperReady = models.isWhisperModelReady(s.speech.whisperModel);
  return {
    ...s,
    voice,
    whisperModels: Object.values(models.WHISPER_MODELS).map((m) => ({ ...m, ready: models.isWhisperModelReady(m.id) })),
    claudeModels: claudeCode.MODELS,
    apiModels: claudeApi.MODELS,
    engines: {
      whisper: { ready: whisperReady, running: w.running && w.modelId === s.speech.whisperModel, error: w.lastError, download: downloads.whisper || null },
      voice: { downloaded: t.downloaded, ready: t.ready, loading: t.loading, error: t.lastError, download: downloads.voice || null },
    },
    permissions: perms,
    plutobar: {
      available: plutobar.isAvailable(),
      ...settings.plutobar(),
      active: plutobarStatus.active,
      shortcutOk: plutobarStatus.shortcutOk,
      digup: require("./plutobar/digup").available(),
    },
    // What the Dashboard's setup card still needs.
    setup: {
      speech: whisperReady,
      voice: !voice.enabled || t.downloaded,
      claude: !!s.assistant.active,
      microphone: perms.microphone === "granted",
      accessibility: perms.accessibility === "granted",
    },
  };
}

let pushTimer = null;
function pushState() {
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const snapshot = state();
    for (const w of electron.BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send("voiceos:state", snapshot);
  }, 120);
}

// ------------------------------------------------------------------ IPC

function registerIpc() {
  const handle = (channel, fn) => {
    electron.ipcMain.removeHandler(channel);
    electron.ipcMain.handle(channel, async (_event, arg = {}) => {
      try {
        const extra = (await fn(arg)) || {};
        return { ok: true, ...extra, state: state() };
      } catch (err) {
        return { ok: false, error: err?.message || String(err), state: state() };
      }
    });
  };

  // X (Twitter) in Apps: no account to link, so connecting just turns it on.
  const xHandle = (channel, fn) => {
    electron.ipcMain.removeHandler(channel);
    electron.ipcMain.handle(channel, async () => ({ success: true, status: fn() }));
  };
  xHandle("twitter:status", () => ({ connected: settings.connector("twitter") }));
  xHandle("twitter:connect", () => settings.setConnector("twitter", true));
  xHandle("twitter:disconnect", () => settings.setConnector("twitter", false));

  handle("voiceos:get-state", async () => {});
  handle("voiceos:set", async ({ key, value }) => {
    settings.set(key, value);
    if (key.startsWith("speech.")) warmUp();
  });
  handle("voiceos:refresh", async () => {}); // re-reads permissions etc.

  // Claude
  handle("voiceos:claude-refresh", refreshClaude);
  handle("voiceos:claude-sign-in", async () => {
    settings.setClaudeStatus(await claudeCode.signIn());
    settings.set("assistant.engine", "subscription");
  });
  handle("voiceos:claude-test", async () => {
    const target = settings.resolveAssistant("agent");
    if (!target) throw new Error("Claude isn't connected yet.");
    const started = Date.now();
    const reply = await assistant.complete(target, { prompt: "Reply with exactly: VoiceOS is ready." });
    return { reply, latencyMs: Date.now() - started };
  });
  handle("voiceos:save-api-key", async ({ key }) => {
    await claudeApi.verifyKey(String(key || "").trim()).catch((err) => {
      throw new Error(claudeApi.friendlyError(err));
    });
    settings.setApiKey(key);
    settings.set("assistant.engine", "apikey");
  });
  handle("voiceos:clear-api-key", async () => settings.clearApiKey());

  // Speech
  handle("voiceos:download-speech", async () => {
    await Promise.all([downloadWhisper(settings.read().speech.whisperModel), settings.voice().enabled ? downloadVoice() : null]);
  });
  handle("voiceos:download-whisper", async ({ id }) => downloadWhisper(id));
  handle("voiceos:download-voice", downloadVoice);
  handle("voiceos:cancel-download", async ({ key }) => models.cancelDownload(key));
  handle("voiceos:delete-whisper", async ({ id }) => {
    if (whisper.status().modelId === id) (whisper.stop(), (warmedModel = null));
    fs.rmSync(models.whisperModelPath(id), { force: true });
  });
  // The Agent page's voice previews (the app used to fetch these from its
  // cloud); returns a WAV clip.
  handle("voiceos:preview-voice", async ({ voiceId, text, speed }) => {
    await tts.ensureReady();
    const voice = models.AGENT_VOICES[voiceId] || settings.voice().kokoroVoice;
    const chunks = [];
    let rate = 24000;
    const job = tts.synthesize(String(text || "Hi! I'm ready when you are.").slice(0, 300), {
      voice,
      speed: models.kokoroSpeed(speed),
      onChunk: (pcm, sampleRate) => (chunks.push(Buffer.from(pcm)), sampleRate && (rate = sampleRate)),
    });
    await job.promise;
    return { audioBase64: pcm16ToWav(Buffer.concat(chunks), rate).toString("base64"), mimeType: "audio/wav" };
  });

  // Permissions
  handle("voiceos:request-microphone", async () => {
    await electron.systemPreferences.askForMediaAccess("microphone");
  });
  handle("voiceos:request-accessibility", async () => {
    electron.systemPreferences.isTrustedAccessibilityClient(true);
    await electron.shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility");
  });


  // Settings → PlutoBar
  handle("voiceos:set-plutobar", async (patch = {}) => {
    const allowed = {};
    for (const k of ["enabled", "shortcut", "clipboard"]) if (k in patch) allowed[k] = patch[k];
    settings.setPlutobar(allowed);
    applyPlutobar();
    if (allowed.shortcut && !plutobarStatus.shortcutOk) throw new Error(allowed.shortcut + " is already used by another app. Pick another shortcut.");
  });
  handle("voiceos:plutobar-show", async () => plutobar.show());
  handle("voiceos:open-digup", async () => {
    const app = require("./plutobar/digup").appPath();
    if (app) await electron.shell.openPath(app);
    else await electron.shell.openExternal("https://github.com/ARahim3/DigUp/releases/latest");
  });

  handle("voiceos:open-external", async ({ url }) => {
    if (/^https:\/\/(code\.claude\.com|claude\.com|claude\.ai|console\.anthropic\.com|platform\.claude\.com)\//.test(url || "")) await electron.shell.openExternal(url);
  });
}

// ---------------------------------------------------------------- window

// Opens the main window on a Settings tab ("claude" | "speech" | "general").
function openSettings(tab = "claude") {
  hooks.openMainWindow?.("voiceos:open-settings", tab);
}

function trayMenuItems() {
  const s = state();
  const needsSetup = Object.values(s.setup).some((ok) => !ok);
  const claude = s.assistant.active
    ? "Claude: " + (s.assistant.active.engine === "subscription" ? s.claude.email || "your account" : "API key") + " · " + s.assistant.active.model
    : "Claude: not connected";
  const speech = s.engines.whisper.ready ? "Speech: on-device" : "Speech: model not downloaded";
  const pluto = s.plutobar.active
    ? [{ label: "Open PlutoBar" + (s.plutobar.shortcutOk ? "  (" + s.plutobar.shortcut.replace("Command", "⌘").replace("Shift", "⇧").replace("Control", "⌃").replace("Alt", "⌥").replace(/\+/g, "") + ")" : ""), click: () => plutobar.show() }]
    : [];
  return [
    ...pluto,
    ...(needsSetup ? [{ label: "Finish setting up VoiceOS…", click: () => hooks.openMainWindow?.() }] : []),
    { label: claude, click: () => openSettings("claude") },
    { label: speech, click: () => openSettings("speech") },
  ];
}

// ------------------------------------------------------ local REST routes
// The few api.voiceos.com endpoints the app still calls, answered locally.

function localRoutes() {
  const fast = () => settings?.resolveAssistant("fast");
  return [
    { path: "/user/profile", method: "GET", handle: () => ({ profile: identity.profile() }) },
    { path: "/user/profile", method: "POST", handle: ({ body }) => ({ profile: identity.updateProfile(body) }) },
    {
      path: "/llm/transform-text",
      method: "POST",
      handle: async ({ body }) => {
        if (!fast()) return { status: 503, body: { error: "Claude isn't connected" } };
        const transformedText = await assistant.complete(fast(), {
          system: "Apply the voice command to the text. Output only the transformed text.",
          prompt: "<text>\n" + (body.selectedText || "") + "\n</text>\n<command>" + (body.voiceCommand || "") + "</command>",
        });
        return { transformedText };
      },
    },
    {
      path: "/agent-history/title",
      method: "POST",
      handle: async ({ body }) => {
        const words = String(body.transcript || "").trim().split(/\s+/).filter(Boolean);
        const fallback = words.slice(0, 6).join(" ").replace(/[.?!,]+$/, "");
        // Short requests ("open Spotify") are their own title; skip the Claude call.
        if (!fast() || words.length <= 6) return { success: !!fallback, title: fallback.charAt(0).toUpperCase() + fallback.slice(1) };
        try {
          const title = await assistant.complete(fast(), {
            system:
              "You label conversations. Reply with a 2-6 word title describing the user's request, like 'Play TVK live stream' or 'Open Google account settings'. Never answer, refuse or comment on the request; output only the title.",
            prompt: "<request>" + (body.transcript || "") + "</request>\n<reply>" + String(body.responseText || "").slice(0, 600) + "</reply>",
          });
          const clean = title.replace(/^["'*\s]+|["'.*\s]+$/g, "");
          const ok = clean && clean.split(/\s+/).length <= 8 && !/^(I |I'm |Sorry|As an)/i.test(clean);
          return { success: true, title: ok ? clean.slice(0, 80) : fallback };
        } catch {
          return { success: !!fallback, title: fallback };
        }
      },
    },
    {
      path: "/agent/confirmation-intent",
      method: "POST",
      handle: async ({ body }) => {
        const reply = String(body.replyText || "").trim();
        if (/^(yes|yeah|yep|sure|ok(ay)?|do it|go ahead|send( it)?|confirm(ed)?|approved?)\b/i.test(reply))
          return { success: true, decision: "approve", reason: "affirmative", model: "local" };
        if (/^(no|nope|cancel|stop|don't|do not)\b/i.test(reply)) return { success: true, decision: "revise", reason: "negative", model: "local" };
        return { success: true, decision: "unrelated", reason: "unclear", model: "local" };
      },
    },
    { path: /^\/(telemetry|feedback.*|dictation\/agent-nudge-event)$/, handle: () => ({ success: true }) },
  ];
}

module.exports = {
  LOCAL_MODE: true,
  installEarly,
  attachStore,
  seedIdentity: () => identity.seed(),
  createVoiceOSClient,
  onReady,
  openSettings,
  trayMenuItems,
  stopSpeaking: () => voiceClient?.stopSpeaking(),
  // PlutoBar shows the assistant: every agent UI event, mic level and
  // speaking state goes through here (main.js sendToAgentUI and friends).
  notchAgentEvent: (channel, data, ctx) =>
    plutobar.isEnabled() && agentEvents.translate(channel, data, ctx, plutobar.agentEvent),
  // PlutoBar owns the assistant, so the original notch draws nothing at the top.
  nativeNotchOwnsTop: () => plutobar.isEnabled(),
  // The original Electron agent notch becomes an invisible engine.
  adoptAgentNotchWindow: (win) => agentEvents.adoptAgentNotchWindow(win),
};
