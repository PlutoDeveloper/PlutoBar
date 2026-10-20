"use strict";
// PlutoBar's first-launch setup, after DigUp's: Welcome (Get Started starts
// the downloads — speech, and the search model — shown at the bottom of every
// later step), Permissions, Claude, Files (which folders to search, with how
// long their first pass takes; indexing starts as you continue), Shortcut (try
// it for real) and Ready. The window is
// native (resources/src/plutobar Setup.swift); this keeps it fed with the
// facts, about every second and a half while it's open, and does what its
// buttons say.

const electron = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const fileSearch = require("./plutobar/digup");
const log = require("./log");

let deps = {};
let timer = null;
let step = 0;
let hotkey = false;
let claudeError = "";
let busy = "";
// The Files step's choices, applied on Continue: { roots, codeOn, codeRoots }.
let draft = null;
const estimates = new Map(); // folder → { seconds, files } | "busy" | null
let estimating = false;

// deps: { addon(), settings, state(), downloadSpeech(), signIn(), saveApiKey(key), setShortcut(accel),
//         shortcutStatus() → { shortcut, shortcutOk }, setSearchFolders({ roots, codeRoots }), showBar() }
function init(d) {
  deps = d;
}

// opts.step: open at a step (Settings → Choose Folders opens Files).
function show(opts = {}) {
  const addon = deps.addon?.();
  if (!addon) return false;
  draft = null;
  addon.setupShow();
  if (Number.isInteger(opts.step)) addon.setupState(JSON.stringify({ step: opts.step }));
  push();
  clearInterval(timer);
  timer = setInterval(push, 1500);
  return true;
}

const isOpen = () => !!deps.addon?.()?.setupVisible();

// The PlutoBar shortcut was pressed: on the Shortcut step, that's the test.
function shortcutPressed() {
  if (step === 4 && isOpen()) {
    hotkey = true;
    push();
  }
}

function mb(bytes) {
  return Math.round((bytes || 0) / 1e6).toLocaleString() + " MB";
}

// Everything to download, as one: Whisper, Kokoro if replies are spoken, and
// the search model when there are folders to search.
function downloads(s) {
  const w = s.engines.whisper;
  const v = s.engines.voice;
  const wantVoice = s.voice?.enabled !== false;
  const m = fileSearch.status.model;
  const error = w.download?.error || (wantVoice && v.download?.error) || (m.phase === "failed" && m.text);
  if (w.ready && (!wantVoice || v.downloaded) && m.phase === "ready") return { phase: "ready" };
  if (error) return { phase: "failed", text: String(error).slice(0, 80) };
  const parts = [w.download, wantVoice && v.download].filter((d) => d && d.total).map((d) => [d.received || 0, d.total]);
  if (m.phase === "downloading") parts.push([m.fraction * fileSearch.MODEL_BYTES, fileSearch.MODEL_BYTES]);
  if (!parts.length) return { phase: w.ready && m.phase === "ready" ? "ready" : "needed" };
  const got = parts.reduce((n, [r]) => n + r, 0);
  const total = parts.reduce((n, [, t]) => n + t, 0);
  return { phase: "downloading", fraction: got / total, text: Math.floor((100 * got) / total) + "% of " + mb(total) };
}

// ------------------------------------------------------------ Files step

function startDraft() {
  if (draft) return;
  const f = deps.settings.files();
  const roots = f.chosen ? f.roots : fileSearch.candidates();
  draft = { roots: [...roots], offered: [...new Set([...fileSearch.candidates(), ...roots])], codeOn: f.codeRoots.length > 0, codeRoots: [...f.codeRoots] };
  estimateAll();
}

// One folder at a time (each is a crawl), the ones on screen first.
async function estimateAll() {
  if (estimating) return;
  estimating = true;
  try {
    for (;;) {
      const next = draft && [...draft.offered, ...(draft.codeOn ? draft.codeRoots : [])].find((p) => !estimates.has(p));
      if (!next) break;
      estimates.set(next, "busy");
      push();
      const e = await fileSearch.estimate(next);
      estimates.set(
        next,
        e && e.readable !== false ? { seconds: e.seconds || 0, files: Object.values(e.files || {}).reduce((n, x) => n + x, 0) } : null,
      );
      push();
    }
  } finally {
    estimating = false;
  }
}

function duration(seconds) {
  if (seconds < 60) return "under a minute";
  if (seconds < 5400) return "about " + Math.round(seconds / 60) + " min";
  return "about " + (seconds / 3600).toFixed(1) + " h";
}

function folderRow(p, chosen) {
  const e = estimates.get(p);
  const detail = e === "busy" || e === undefined ? "Looking…" : e === null ? "Can't read it (macOS may ask first)" : e.files.toLocaleString() + " files · first pass " + duration(e.seconds);
  return { path: p, chosen, detail };
}

function filesFacts() {
  if (!draft) return null;
  const chosen = new Set(draft.roots);
  const total = draft.roots.reduce((n, p) => n + (typeof estimates.get(p) === "object" && estimates.get(p) ? estimates.get(p).seconds : 0), 0);
  const pendingEstimates = draft.roots.some((p) => estimates.get(p) === "busy" || !estimates.has(p));
  return {
    folders: draft.offered.map((p) => folderRow(p, chosen.has(p))),
    codeOn: draft.codeOn,
    codeFolders: draft.codeRoots.map((p) => folderRow(p, true)),
    summary: !draft.roots.length ? "Choose at least one folder" : pendingEstimates ? "Looking at your folders…" : "First pass: " + duration(total),
    searchable: fileSearch.status.searchable,
    pending: fileSearch.status.pending,
  };
}

function applyDraft() {
  if (!draft) return;
  deps.setSearchFolders({ roots: draft.roots, codeRoots: draft.codeOn ? draft.codeRoots : [] });
  log.info("[Setup] searching " + draft.roots.length + " folders" + (draft.codeOn ? " + " + draft.codeRoots.length + " code folders" : ""));
}

async function push() {
  const addon = deps.addon?.();
  if (!addon) return;
  try {
    const s = deps.state();
    const sc = deps.shortcutStatus();
    const p = deps.settings.plutobar();
    addon.setupState(
      JSON.stringify({
        speech: downloads(s),
        permissions: s.permissions,
        claude: {
          installed: !!s.claude.installed,
          signedIn: !!s.claude.signedIn,
          checked: !!s.claude.checked,
          account: s.claude.email || "",
          apiKey: !!s.apiKey && !s.apiKey.fromEnv,
          error: claudeError,
        },
        files: filesFacts(),
        shortcut: sc.shortcut,
        shortcutOk: sc.shortcutOk,
        spotlightConflict: !!sc.spotlightConflict,
        hotkey,
        loginItem: p.setupDone ? electron.app.getLoginItemSettings().openAtLogin : true,
        busy,
      }),
    );
  } catch (err) {
    log.warn("[Setup] " + err.message);
  }
}

async function run(name, fn) {
  busy = name;
  push();
  try {
    await fn();
  } finally {
    busy = "";
    push();
  }
}

const settingsPane = (pane) => electron.shell.openExternal("x-apple.systempreferences:com.apple.preference.security?" + pane);

async function handle(a) {
  switch (a.do) {
    case "opened":
      return push();
    case "step":
      // Leaving Files forward applies it: indexing starts while you set up the rest.
      if (step === 3 && Number(a.step) === 4) applyDraft();
      step = Number(a.step) || 0;
      if (step === 4) hotkey = false;
      if (step === 3) startDraft();
      return push();
    case "start":
      fileSearch.downloadModel();
      return deps.downloadSpeech().catch((err) => log.warn("[Setup] speech download: " + err.message));
    case "toggleFolder": {
      if (!draft) return;
      const p = String(a.path || "");
      draft.roots = draft.roots.includes(p) ? draft.roots.filter((x) => x !== p) : [...draft.roots, p];
      return push();
    }
    case "addFolders":
      if (!draft) return;
      for (const p of (a.paths || []).map(String)) {
        if (!fs.existsSync(p)) continue;
        if (!draft.offered.includes(p)) draft.offered.push(p);
        if (!draft.roots.includes(p)) draft.roots.push(p);
      }
      estimateAll();
      return push();
    case "codeOn":
      if (!draft) return;
      draft.codeOn = !!a.on;
      if (draft.codeOn && !draft.codeRoots.length) draft.codeRoots = codeCandidates();
      estimateAll();
      return push();
    case "addCodeFolders":
      if (!draft) return;
      for (const p of (a.paths || []).map(String)) if (fs.existsSync(p) && !draft.codeRoots.includes(p)) draft.codeRoots.push(p);
      estimateAll();
      return push();
    case "removeCodeFolder":
      if (!draft) return;
      draft.codeRoots = draft.codeRoots.filter((x) => x !== a.path);
      return push();
    case "microphone": {
      const now = electron.systemPreferences.getMediaAccessStatus("microphone");
      if (now === "denied" || now === "restricted") return settingsPane("Privacy_Microphone");
      await electron.systemPreferences.askForMediaAccess("microphone");
      return push();
    }
    case "accessibility":
      electron.systemPreferences.isTrustedAccessibilityClient(true);
      return settingsPane("Privacy_Accessibility");
    case "installClaude":
      return electron.shell.openExternal("https://code.claude.com/docs/en/setup");
    case "signIn":
      claudeError = "";
      return run("claude", () =>
        deps.signIn().catch((err) => {
          claudeError = err.message;
        }),
      );
    case "apiKey":
      claudeError = "";
      return run("apiKey", () =>
        deps.saveApiKey(String(a.key || "")).catch((err) => {
          claudeError = err.message;
        }),
      );
    case "freeSpotlight":
      try {
        deps.freeCommandSpace();
      } catch (err) {
        log.warn("[Setup] " + err.message);
      }
      return push();
    case "shortcut":
      deps.setShortcut(String(a.value || ""));
      hotkey = false;
      return push();
    case "finish":
      try {
        electron.app.setLoginItemSettings({ openAtLogin: !!a.loginItem });
      } catch {}
      deps.settings.setPlutobar({ setupDone: true });
      log.info("[Setup] done (login item " + (a.loginItem ? "on" : "off") + ")");
      setTimeout(() => deps.showBar?.(), 500);
      return;
    case "closed":
      // Closed on the Files step: what's picked there still counts.
      if (step === 3) applyDraft();
      clearInterval(timer);
      timer = null;
      // Closing it is as good as finishing: Settings → PlutoBar can run it again.
      if (!deps.settings.plutobar().setupDone) deps.settings.setPlutobar({ setupDone: true });
      return;
  }
}

// Folders that look like they hold code projects: the usual places, if there.
function codeCandidates() {
  const home = require("node:os").homedir();
  return ["Developer", "Projects", "projects", "Code", "code", "src", "GitHub", "repos", "Desktop/repos"]
    .map((n) => path.join(home, n))
    .filter((p) => fs.existsSync(p));
}

module.exports = { init, show, handle, shortcutPressed, isOpen, codeCandidates };
