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
const os = require("node:os");
const path = require("node:path");
const electron = require("electron");
const { installNetworkGuard } = require("./networkGuard");
const identity = require("./identity");
const { Settings } = require("./settings");
const { LocalVoiceOSClient } = require("./backend");
const assistant = require("./assistant");
const whisper = require("./speech/whisper");
const appleSpeech = require("./speech/appleSpeech");
const tts = require("./speech/tts");
const models = require("./speech/models");
const { pcm16ToWav } = require("./speech/transcribe");
const agentEvents = require("./agentEvents");
const plutobar = require("./plutobar");
const setup = require("./setup");
const settingsWindow = require("./settingsWindow");
const fileSearch = require("./plutobar/digup");

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
  moveDataFolder();
  installNetworkGuard({ electron, routes: localRoutes() });
}

// The app was "VoiceOS opensourced" before it was PlutoBar. Chromium makes
// PlutoBar's folder before any of this runs, so the first time, what's yours
// (speech models, history, settings, the windows' storage) moves into it,
// replacing the empty copies just made, and the rest of the old folder (caches)
// goes to the Trash. Runs before anything opens those files.
const MOVED = ["models", "voiceos.db", "voiceos.db-wal", "voiceos.db-shm", "config.json", "plutobar.json", "agent-nudge.json",
  "audio-backend.json", "audio-recordings", "claude-workspace", "managed-browsers", "ui-control-state.json", "Local Storage",
  "Partitions", "IndexedDB"];

function moveDataFolder() {
  try {
    const appData = electron.app.getPath("appData");
    const now = electron.app.getPath("userData");
    const before = path.join(appData, "VoiceOS opensourced");
    const marker = path.join(now, ".moved-from-voiceos");
    if (path.basename(now) !== "PlutoBar" || !fs.existsSync(before) || fs.existsSync(marker)) return;
    fs.mkdirSync(now, { recursive: true });
    const hasFiles = (dir) => fs.existsSync(dir) && fs.readdirSync(dir).some((f) => !f.startsWith("."));
    for (const name of MOVED) {
      const from = path.join(before, name);
      if (!fs.existsSync(from)) continue;
      // Models PlutoBar already downloaded stay (the old copies go with the folder).
      if (name === "models" && hasFiles(path.join(now, "models"))) continue;
      fs.rmSync(path.join(now, name), { recursive: true, force: true });
      fs.renameSync(from, path.join(now, name));
    }
    fs.writeFileSync(marker, new Date().toISOString());
    // What's left is caches: to the Trash (recoverable), once the app is up.
    electron.app.whenReady().then(() => electron.shell.trashItem(before).catch(() => {}));
  } catch (err) {
    log.warn("[PlutoBar] couldn't move the old data folder: " + err.message);
  }
}

function attachStore(store, STORE_KEYS) {
  identity.init(store, STORE_KEYS);
  skipLegacyOnboarding(store, STORE_KEYS);
  settings = new Settings(store, STORE_KEYS);
  settings.backgroundByDefault();
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
    openSettings: (pane) => settingsWindow.show(typeof pane === "string" ? pane : "general"),
    setup: (a) => setup.handle(a),
    settings: (a) => settingsWindow.handle(a),
    prefs: () => settings.plutobar(),
    chooseFolders: () => settingsWindow.show("search"),
  });
  setup.init({
    addon: () => plutobar.addon(),
    settings,
    state,
    downloadSpeech,
    signIn: signInClaude,
    saveApiKey,
    setShortcut: (accel) => {
      settings.setPlutobar({ shortcut: accel });
      applyPlutobar();
    },
    shortcutStatus: () => plutobar.shortcutStatus(),
    freeCommandSpace: () => {
      plutobar.freeCommandSpace();
      applyPlutobar();
    },
    setSearchFolders,
    showBar: () => plutobar.show(),
  });
  plutobar.onShortcut(() => setup.shortcutPressed());
  settingsWindow.init({
    addon: () => plutobar.addon(),
    settings,
    state,
    plutobar,
    setup,
    applyPlutobar,
    setSearchFolders,
    codeCandidates: setup.codeCandidates,
    signIn: signInClaude,
    saveApiKey,
    refreshClaude,
    downloadSpeech,
    warmUp,
    previewVoice,
    // VoiceOS's own pages (Apps, Agent, Dictation, History) in the main window.
    openPage: (page) => hooks.openMainWindow?.("voiceos:navigate", page),
    openClassicSettings: () => hooks.openMainWindow?.("voiceos:open-settings", "general"),
  });
  fileSearch.onChange(() => updateTray());
  electron.app.on("will-quit", () => plutobar.quit());
  require("./assistant/musicApp").setHooks({ pauseVoiceOSPlayer: hooks.pauseInternalMusic });
  log.info("[VoiceOS] local runtime ready — speech on-device, assistant: Claude");
  registerIpc();
  if (hooks.onStateChanged) settings.onChange(hooks.onStateChanged);
  tts.onStatus(pushState);
  electron.app.on("will-quit", () => tts.stop());
  electron.app.on("browser-window-focus", () => refreshClaude().catch(() => {}));
  refreshClaude().finally(() => hooks.onStateChanged?.());
  // Whisper (~650 MB) and the reply voice are preloaded only on power: on
  // battery they load the first time you talk (about 0.6 s more, once).
  setTimeout(() => (require("./power").onBattery() ? log.info("[VoiceOS] on battery: speech loads on first use") : warmUp()), 2500);
  applyPlutobar();
  // A background app (LSUIElement): the Dock icon only if you asked for it.
  if (settings.showInDock()) electron.app.dock?.show();
  startFileSearch().catch((err) => log.warn("[Search] " + err.message));
  // Diagnostics: which window's renderer uses CPU (PLUTOBAR_PERF=1, after 90 s).
  if (process.env.PLUTOBAR_PERF === "1") setInterval(logWindowCpu, 60_000);
  // First launch: the setup window (after the other windows have come up).
  if (plutobar.isEnabled() && !settings.plutobar().setupDone) setTimeout(() => setup.show(), 1500);
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

// File search (DigUp's engine, built in): the folders come from settings. The
// first time, a DigUp already set up on this Mac hands over its model, index
// and folders; then indexing starts for whatever folders are chosen.
async function startFileSearch() {
  fileSearch.setFolderSource(() => settings.files());
  fileSearch.onChange(() => pushState());
  if (!settings.files().chosen) {
    const theirs = await fileSearch.importDigUp();
    if (theirs?.roots?.length) settings.setFiles({ ...theirs, chosen: true });
  }
  fileSearch.start();
}

function setSearchFolders(patch) {
  settings.setFiles({ ...patch, chosen: true });
  fileSearch.foldersChanged();
}

async function refreshClaude() {
  settings.setClaudeStatus(await claudeCode.status().catch(() => ({ installed: false, signedIn: false })));
}

// -------------------------------------------------------------- speech

let warmedModel = null;
// Dictation's language arrives with each request; ahead of that, this Mac's.
const speechLanguage = () => null;

// Keeps Whisper (and Kokoro, if replies are spoken) loaded so the first
// dictation after launch is instant.
function warmUp() {
  const { whisperModel } = settings.read().speech;
  const speakReplies = settings.voice().enabled;
  // Apple's speech model: nothing to keep loaded (macOS's speech service runs
  // it); only make sure the language's model is installed.
  if (appleSpeech.available()) {
    appleSpeech.prepare(speechLanguage()).then(pushState);
    if (speakReplies && tts.isModelDownloaded()) tts.ensureReady().then(pushState, pushState);
    return;
  }
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

// A sample of the chosen voice, played on this Mac.
async function previewVoice() {
  await tts.ensureReady();
  const v = settings.voice();
  const chunks = [];
  let rate = 24000;
  const job = tts.synthesize("Hi, I'm Pluto. Ask me anything.", {
    voice: v.kokoroVoice,
    speed: v.speed,
    onChunk: (pcm, sampleRate) => (chunks.push(Buffer.from(pcm)), sampleRate && (rate = sampleRate)),
  });
  await job.promise;
  const file = path.join(require("node:os").tmpdir(), "plutobar-voice-sample.wav");
  fs.writeFileSync(file, pcm16ToWav(Buffer.concat(chunks), rate));
  require("node:child_process").execFile("/usr/bin/afplay", [file], () => fs.rmSync(file, { force: true }));
}

// ------------------------------------------------------------ menu bar

let tray = null;
let trayRebuildAt = 0;

// "Indexing · 42%" while there's a first pass going, as the menu bar icon's
// title (when that's on) and as the menu's first line.
function indexingLine() {
  const st = fileSearch.status;
  if (st.model.phase === "downloading") return "Getting the search model · " + Math.floor(st.model.fraction * 100) + "%";
  const total = st.searchable + st.pending;
  if (fileSearch.isPaused()) return total ? "Indexing paused · " + Math.floor((100 * st.searchable) / total) + "%" : null;
  if (st.pending > 0 && total) return "Indexing · " + Math.floor((100 * st.searchable) / total) + "%  (" + st.searchable.toLocaleString() + " of " + total.toLocaleString() + " files)";
  return null;
}

function updateTray() {
  if (!tray || tray.isDestroyed?.()) return;
  const st = fileSearch.status;
  const total = st.searchable + st.pending;
  const busy = st.model.phase === "downloading" || (st.pending > 0 && total && !fileSearch.isPaused());
  const pct = st.model.phase === "downloading" ? st.model.fraction : total ? st.searchable / total : 1;
  tray.setTitle(settings.plutobar().menuBarProgress && busy ? " " + Math.floor(pct * 100) + "%" : "", { fontType: "monospacedDigit" });
  // The menu's line follows, at most every few seconds.
  if (Date.now() - trayRebuildAt > 4000) {
    trayRebuildAt = Date.now();
    hooks.onStateChanged?.();
  }
}

function logWindowCpu() {
  const metrics = new Map(electron.app.getAppMetrics().map((m) => [m.pid, m]));
  for (const m of metrics.values()) if (m.type !== "Browser" && (m.cpu?.percentCPUUsage ?? 0) > 2) log.info("[Perf] busy " + m.type + " pid=" + m.pid + " cpu=" + m.cpu.percentCPUUsage.toFixed(1) + "% " + (m.name || m.serviceName || ""));
  for (const w of electron.BrowserWindow.getAllWindows()) {
    const pid = w.webContents.getOSProcessId();
    const m = metrics.get(pid);
    log.info("[Perf] window '" + w.getTitle() + "' visible=" + w.isVisible() + " opacity=" + w.getOpacity() + " pid=" + pid + " cpu=" + (m?.cpu?.percentCPUUsage ?? 0).toFixed(1) + "% wakeups=" + (m?.cpu?.idleWakeupsPerSecond ?? 0) + "/s url=" + w.webContents.getURL().slice(-60));
  }
}

async function downloadSpeech() {
  const stt = appleSpeech.available() ? appleSpeech.prepare(speechLanguage()) : downloadWhisper(settings.read().speech.whisperModel);
  await Promise.all([stt, settings.voice().enabled ? downloadVoice() : null]);
}

// ---------------------------------------------------------------- Claude

async function signInClaude() {
  settings.setClaudeStatus(await claudeCode.signIn());
  settings.set("assistant.engine", "subscription");
}

async function saveApiKey(key) {
  await claudeApi.verifyKey(String(key || "").trim()).catch((err) => {
    throw new Error(claudeApi.friendlyError(err));
  });
  settings.setApiKey(key);
  settings.set("assistant.engine", "apikey");
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
  const whisperReady = models.isWhisperModelReady(s.speech.whisperModel) || (appleSpeech.available() && !appleSpeech.status().lastError);
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
      // The shortcut in use (the setting, or the default when there's none).
      shortcut: plutobar.shortcutStatus().shortcut || settings.plutobar().shortcut || "Alt+Space",
      shortcutOk: plutobarStatus.shortcutOk,
      spotlightConflict: plutobar.shortcutStatus().spotlightConflict,
      files: { ...settings.files(), searchable: fileSearch.status.searchable, pending: fileSearch.status.pending, model: fileSearch.status.model.phase },
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
  handle("voiceos:claude-sign-in", signInClaude);
  handle("voiceos:claude-test", async () => {
    const target = settings.resolveAssistant("agent");
    if (!target) throw new Error("Claude isn't connected yet.");
    const started = Date.now();
    const reply = await assistant.complete(target, { prompt: "Reply with exactly: VoiceOS is ready." });
    return { reply, latencyMs: Date.now() - started };
  });
  handle("voiceos:save-api-key", async ({ key }) => saveApiKey(key));
  handle("voiceos:clear-api-key", async () => settings.clearApiKey());

  // Speech
  handle("voiceos:download-speech", downloadSpeech);
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
  handle("voiceos:free-command-space", async () => {
    plutobar.freeCommandSpace();
    applyPlutobar();
  });
  handle("voiceos:plutobar-setup", async () => setup.show());
  handle("voiceos:choose-folders", async () => settingsWindow.show("search"));
  handle("voiceos:open-pluto-settings", async ({ pane } = {}) => settingsWindow.show(pane));

  handle("voiceos:open-external", async ({ url }) => {
    if (/^https:\/\/(code\.claude\.com|claude\.com|claude\.ai|console\.anthropic\.com|platform\.claude\.com)\//.test(url || "")) await electron.shell.openExternal(url);
  });
}

// ---------------------------------------------------------------- window

// Opens the main window on a Settings tab ("claude" | "speech" | "general").
// Claude, Speech and PlutoBar settings live in PlutoBar Settings now.
function openSettings(tab = "claude") {
  const pane = { claude: "pluto", speech: "dictation", plutobar: "general", notch: "general" }[tab];
  if (pane && settingsWindow.show(pane)) return;
  hooks.openMainWindow?.("voiceos:open-settings", tab);
}

function trayMenuItems() {
  const s = state();
  const keys = (accel) => accel.replace("Command", "⌘").replace("Shift", "⇧").replace("Control", "⌃").replace("Alt", "⌥").replace(/\+/g, "");
  const claude = s.assistant.active
    ? "Claude: " + (s.assistant.active.engine === "subscription" ? s.claude.email || "your account" : "API key") + " · " + s.assistant.active.model
    : "Claude: not connected";
  const indexing = indexingLine();
  const items = [];
  if (s.plutobar.active) items.push({ label: "Open PlutoBar" + (s.plutobar.shortcutOk ? "  (" + keys(s.plutobar.shortcut) + ")" : ""), click: () => plutobar.show() });
  // Setup only until it's done; after that it's in Settings → General.
  if (s.plutobar.active && !settings.plutobar().setupDone) items.push({ label: "Finish Setting Up PlutoBar…", click: () => setup.show() });
  if (indexing) items.push({ label: indexing, click: () => settingsWindow.show("search") });
  items.push({ label: claude, click: () => settingsWindow.show("pluto") });
  return items;
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

// Opened from the disk image, Downloads, or macOS's quarantine copy
// (App Translocation): PlutoBar offers to move itself into Applications and
// reopens from there, so it keeps working after the disk image is ejected and
// can open at login. True when it's moving (the app relaunches).
function offerMoveToApplications() {
  const app = electron.app;
  if (process.platform !== "darwin" || !app.isPackaged) return false;
  const where = app.getPath("exe");
  const fromDisk = where.startsWith("/Volumes/");
  const loose = fromDisk || where.includes("/AppTranslocation/") || where.startsWith(path.join(os.homedir(), "Downloads") + "/");
  if (!loose || app.isInApplicationsFolder()) return false;
  const choice = electron.dialog.showMessageBoxSync({
    message: "Move PlutoBar to Applications?",
    detail: (fromDisk ? "It's running from the disk image." : "It's running from your Downloads.") +
      " In Applications it keeps working after that's gone, opens at login, and updates in place.",
    buttons: ["Move to Applications", "Not Now"],
    defaultId: 0,
    cancelId: 1,
  });
  if (choice !== 0) return false;
  try {
    return app.moveToApplicationsFolder({
      conflictHandler: (kind) => kind === "existsAndRunning" ? false : true,
    });
  } catch (err) {
    log.warn("[PlutoBar] couldn't move to Applications: " + err.message);
    electron.dialog.showMessageBoxSync({ type: "warning", message: "PlutoBar couldn't move itself", detail: "Drag it from the disk image into Applications, then open it from there." });
    return false;
  }
}

module.exports = {
  LOCAL_MODE: true,
  offerMoveToApplications,
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
  // PlutoBar starts in the menu bar, without the main window (unless it's off,
  // or setup isn't done: then the window has the setup card).
  startsInBackground: () => settings.plutobar().enabled && settings.plutobar().setupDone,
  // PlutoBar's own Settings window (the tray's Settings).
  openPlutoSettings: (pane) => settingsWindow.show(pane),
  // The menu bar icon: indexing progress next to it.
  adoptTray: (t) => {
    tray = t;
    updateTray();
  },
  // The original Electron agent notch becomes an invisible engine.
  adoptAgentNotchWindow: (win) => agentEvents.adoptAgentNotchWindow(win),
};
