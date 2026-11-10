"use strict";
// PlutoBar Settings (the native window: resources/src/plutobar Settings.swift).
// While it's open this sends it every value about once a second, and applies
// what it changes. The panes: General, Search, Pluto, Apps & Actions,
// Dictation & Speech, Privacy & Permissions, About. VoiceOS's own pages (Apps,
// Agent actions, Dictation, History) open in the main window from here.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const electron = require("electron");
const fileSearch = require("./plutobar/digup");
const clipboard = require("./plutobar/clipboard");
const log = require("./log");

let deps = {};
let timer = null;
let error = "";
let summaries = { at: 0, main: [], code: [] };

const VOICES = [
  { id: "gemini-live-zephyr", label: "Sky — warm and friendly" },
  { id: "gemini-live-umbriel", label: "Dawn — energetic" },
  { id: "gemini-live-laomedeia", label: "Dusk — smooth, British" },
  { id: "gemini-live-midnight", label: "Midnight — deep and steady" },
  { id: "xai-leo", label: "Jarvis — the British butler" },
];
const SPEEDS = { slow: 0.85, normal: 1.2, fast: 2 };
const speedName = (n) => (n <= 0.9 ? "slow" : n >= 1.8 ? "fast" : "normal");

// deps: { addon(), settings, state(), plutobar, setup, applyPlutobar(), setSearchFolders(patch),
//         signIn(), saveApiKey(key), refreshClaude(), downloadSpeech(), warmUp(), openPage(page),
//         openClassicSettings(), previewVoice() }
function init(d) {
  deps = d;
}

function show(pane) {
  const addon = deps.addon?.();
  if (!addon) return false;
  addon.settingsShow(JSON.stringify(pane ? { pane } : {}));
  push();
  clearInterval(timer);
  timer = setInterval(push, 1200);
  return true;
}

const tilde = (p) => (p.startsWith(os.homedir()) ? "~" + p.slice(os.homedir().length) : p);

async function folderCounts() {
  if (Date.now() - summaries.at < 5000) return summaries;
  summaries.at = Date.now();
  const [main, code] = await Promise.all([fileSearch.summaries(false), fileSearch.summaries(true)]);
  summaries = { at: Date.now(), main, code };
  return summaries;
}

function countDetail(list, p) {
  const r = list.find((x) => x.path === p);
  if (!r) return "";
  if (r.missing) return "Not connected";
  if (r.unreadable) return "Can't read it: allow PlutoBar in System Settings → Privacy & Security → Files and Folders";
  const parts = [r.indexed.toLocaleString() + " files searchable"];
  if (r.pending) parts.push(r.pending.toLocaleString() + " to read");
  return parts.join(" · ");
}

function searchState(counts) {
  const f = deps.settings.files();
  const st = fileSearch.status;
  const total = st.searchable + st.pending;
  let headline;
  let detail = "";
  let progress;
  if (!f.roots.length && !f.codeRoots.length) {
    headline = "No folders yet";
    detail = "Add folders below, and PlutoBar finds what's in them.";
  } else if (st.model.phase === "downloading") {
    headline = "Getting the search model · " + Math.floor(st.model.fraction * 100) + "%";
    progress = st.model.fraction;
    detail = (fileSearch.NEURAL_ENGINE ? "1.5 GB, once, for the Neural Engine." : "865 MB, once.") + " File names are searchable meanwhile.";
  } else if (fileSearch.isPaused()) {
    headline = "Indexing paused";
    detail = total ? st.searchable.toLocaleString() + " of " + total.toLocaleString() + " files searchable." : "";
  } else if (st.pending > 0 && total) {
    headline = "Indexing · " + Math.floor((100 * st.searchable) / total) + "%";
    progress = st.searchable / total;
    detail = st.searchable.toLocaleString() + " of " + total.toLocaleString() + " files searchable" + (st.indexing ? "." : ". The rest waits for power, or the next change.");
  } else {
    headline = (st.searchable || 0).toLocaleString() + " files searchable";
    detail = st.indexing ? "Checking for changes…" : "Up to date. New files are read a moment after they appear.";
  }
  return {
    headline,
    detail,
    ...(progress !== undefined ? { progress } : {}),
    indexing: st.indexing,
    paused: fileSearch.isPaused(),
    model: st.model.phase,
    onBattery: f.onBattery,
    folders: f.roots.map((p) => ({ path: p, detail: countDetail(counts.main, p) })),
    skipped: f.skipped.map((p) => ({ path: p, detail: "" })),
    types: f.types.join(", "),
    codeOn: f.codeRoots.length > 0,
    codeFolders: f.codeRoots.map((p) => ({ path: p, detail: countDetail(counts.code, p) })),
  };
}

async function push() {
  const addon = deps.addon?.();
  if (!addon) return;
  if (!addon.settingsVisible()) {
    clearInterval(timer);
    timer = null;
    return;
  }
  try {
    const s = deps.state();
    const p = deps.settings.plutobar();
    const sc = deps.plutobar.shortcutStatus();
    const voice = deps.settings.voice();
    const app = electron.app;
    const counts = await folderCounts();
    const claude = s.claude || {};
    const claudeTitle = claude.signedIn
      ? "Signed in" + (claude.email ? " as " + claude.email : "") + (claude.plan ? " · " + claude.plan : "")
      : !claude.checked
        ? "Looking for Claude Code…"
        : claude.installed
          ? "Claude Code isn't signed in"
          : "Claude Code isn't installed";
    const w = s.engines.whisper;
    addon.settingsState(
      JSON.stringify({
        general: {
          enabled: p.enabled,
          shortcut: sc.shortcut || p.shortcut || "Alt+Space",
          shortcutOk: sc.shortcutOk,
          spotlightConflict: !!sc.spotlightConflict,
          loginItem: app.getLoginItemSettings().openAtLogin,
          showInDock: deps.settings.showInDock(),
          menuBarProgress: p.menuBarProgress,
          askFirst: p.askFirst,
          quickAnswers: p.quickAnswers,
          clipboard: p.clipboard,
        },
        search: searchState(counts),
        pluto: {
          claude: {
            installed: claude.checked ? !!claude.installed : undefined,
            signedIn: !!claude.signedIn,
            title: claudeTitle,
            detail: claude.signedIn ? "Pluto answers with your Claude plan." : claude.installed ? "Sign In opens Anthropic's own page in your browser." : "Install Claude Code, then sign in.",
          },
          engine: s.assistant.engine || (claude.signedIn ? "subscription" : s.apiKey ? "apikey" : "subscription"),
          model: s.assistant.model,
          fastModel: s.assistant.fastModel,
          apiModel: s.assistant.apiModel,
          apiFastModel: s.assistant.apiFastModel,
          models: s.claudeModels,
          apiModels: s.apiModels,
          apiKey: !!s.apiKey && !s.apiKey.fromEnv,
          error,
          speak: voice.enabled,
          voice: voice.appVoiceId,
          voices: VOICES,
          speed: speedName((deps.settings.store.get(deps.settings.appSettingsKey) || {}).agentVoiceSpeed ?? 1.2),
          filesTool: p.filesTool,
          x: deps.settings.connector("twitter"),
        },
        speech: {
          whisperModel: s.speech.whisperModel,
          whisperModels: s.whisperModels.map((m) => ({ id: m.id, label: m.label + (m.ready ? "" : " (not downloaded)") })),
          status: w.download?.total
            ? "Downloading · " + Math.floor((100 * (w.download.received || 0)) / w.download.total) + "%"
            : w.ready
              ? "Ready" + (w.running ? " · running" : "")
              : "Not downloaded",
          needsDownload: !w.ready && !w.download?.total,
        },
        permissions: {
          microphone: s.permissions.microphone,
          accessibility: s.permissions.accessibility,
          screen: electron.systemPreferences.getMediaAccessStatus("screen"),
          packaged: s.permissions.packaged,
        },
        about: { version: app.getVersion(), dataPath: tilde(app.getPath("userData")) },
      }),
    );
  } catch (err) {
    log.warn("[Settings] " + err.message);
  }
}

const pane = (name) => electron.shell.openExternal("x-apple.systempreferences:com.apple.preference.security?" + name);

function files(patch) {
  deps.setSearchFolders(patch);
  summaries.at = 0;
}

const list = (a) => (Array.isArray(a) ? a.map(String).filter((p) => p && fs.existsSync(p)) : []);
const plus = (have, add) => [...new Set([...have, ...add])];

async function handle(a) {
  const st = deps.settings;
  const v = a.value;
  try {
    switch (a.do) {
      case "opened":
        summaries.at = 0;
        return push();
      case "closed":
        clearInterval(timer);
        timer = null;
        return;
      // General
      case "shortcut":
        st.setPlutobar({ shortcut: String(v) });
        deps.applyPlutobar();
        break;
      case "freeSpotlight":
        deps.plutobar.freeCommandSpace();
        deps.applyPlutobar();
        break;
      case "enabled":
        st.setPlutobar({ enabled: !!v });
        deps.applyPlutobar();
        break;
      case "loginItem":
        electron.app.setLoginItemSettings({ openAtLogin: !!v });
        break;
      case "showInDock":
        st.setShowInDock(!!v);
        if (v) electron.app.dock?.show();
        else electron.app.dock?.hide();
        break;
      case "menuBarProgress":
      case "askFirst":
      case "quickAnswers":
      case "filesTool":
        st.setPlutobar({ [a.do]: !!v });
        break;
      case "clipboard":
        st.setPlutobar({ clipboard: !!v });
        deps.applyPlutobar();
        break;
      case "clearClipboard":
        clipboard.clear();
        break;
      case "runSetup":
        deps.setup.show();
        break;
      // Search
      case "pause":
        fileSearch.setPaused(!!v);
        break;
      case "indexNow":
        fileSearch.indexNow();
        break;
      case "downloadModel":
        fileSearch.downloadModel();
        break;
      case "onBattery":
        files({ onBattery: !!v });
        break;
      case "addFolders":
        files({ roots: plus(st.files().roots, list(a.paths)) });
        break;
      case "removeFolder":
        files({ roots: st.files().roots.filter((p) => p !== a.path) });
        break;
      case "skipFolders":
        files({ skipped: plus(st.files().skipped, list(a.paths)) });
        break;
      case "unskipFolder":
        files({ skipped: st.files().skipped.filter((p) => p !== a.path) });
        break;
      case "types":
        files({ types: String(v || "").split(/[\s,]+/).map((t) => t.replace(/^\./, "").toLowerCase()).filter(Boolean) });
        break;
      case "codeOn":
        files({ codeRoots: v ? (st.files().codeRoots.length ? st.files().codeRoots : deps.codeCandidates()) : [] });
        break;
      case "addCodeFolders":
        files({ codeRoots: plus(st.files().codeRoots, list(a.paths)) });
        break;
      case "removeCodeFolder":
        files({ codeRoots: st.files().codeRoots.filter((p) => p !== a.path) });
        break;
      // Pluto
      case "engine":
        st.set("assistant.engine", v === "apikey" ? "apikey" : "subscription");
        break;
      case "model":
      case "fastModel":
      case "apiModel":
      case "apiFastModel":
        st.set("assistant." + a.do, String(v));
        break;
      case "signIn":
        error = "";
        await deps.signIn().catch((err) => (error = err.message));
        break;
      case "installClaude":
        await electron.shell.openExternal("https://code.claude.com/docs/en/setup");
        break;
      case "refreshClaude":
        await deps.refreshClaude();
        break;
      case "saveKey":
        error = "";
        await deps.saveApiKey(String(a.key || "")).catch((err) => (error = err.message));
        break;
      case "clearKey":
        st.clearApiKey();
        break;
      case "speak":
        st.setVoice({ enabled: !!v });
        deps.warmUp();
        break;
      case "voice":
        st.setVoice({ id: String(v) });
        break;
      case "speed":
        st.setVoice({ speed: SPEEDS[v] ?? 1.2 });
        break;
      case "previewVoice":
        deps.previewVoice().catch((err) => log.warn("[Settings] preview: " + err.message));
        break;
      case "x":
        st.setConnector("twitter", !!v);
        break;
      case "openPage":
        deps.openPage(String(a.page || "home"));
        break;
      case "openClassicSettings":
        deps.openClassicSettings();
        break;
      case "openShortcuts":
        await electron.shell.openPath("/System/Applications/Shortcuts.app");
        break;
      // Dictation & Speech
      case "whisperModel":
        st.set("speech.whisperModel", String(v));
        deps.warmUp();
        break;
      case "downloadSpeech":
        deps.downloadSpeech().catch(() => {});
        break;
      // Permissions
      case "microphone":
        if (electron.systemPreferences.getMediaAccessStatus("microphone") === "not-determined") await electron.systemPreferences.askForMediaAccess("microphone");
        else await pane("Privacy_Microphone");
        break;
      case "accessibility":
        electron.systemPreferences.isTrustedAccessibilityClient(true);
        await pane("Privacy_Accessibility");
        break;
      case "screen":
        await pane("Privacy_ScreenCapture");
        break;
      // About
      case "revealData":
        electron.shell.showItemInFolder(path.join(electron.app.getPath("userData"), "config.json"));
        break;
    }
  } catch (err) {
    error = err.message;
    log.warn("[Settings] " + a.do + ": " + err.message);
  }
  push();
}

module.exports = { init, show, handle };
