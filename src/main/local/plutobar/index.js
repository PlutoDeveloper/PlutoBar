"use strict";
// PlutoBar: VoiceOS as a Spotlight-style bar.
//
// One Liquid Glass field (resources/src/plutobar, a native module) that, like
// Spotlight with Siri in macOS 27, takes whatever you type or say and decides
// what it is:
//   - a name to find: apps, actions and your Shortcuts, clipboard history, and
//     your files by what's in them (DigUp's on-device index, see digup.js)
//   - a sum or a website: answered or opened right there
//   - something to ask or do: "Ask Pluto" (the VoiceOS assistant: Claude with
//     its Mac tools), offered on every query and the top hit when the query
//     reads like a request; the answer streams in under the bar and follow-ups
//     continue the conversation
// The Swift side only draws; this file decides every row and every answer.

const fs = require("node:fs");
const path = require("node:path");
const electron = require("electron");
const log = require("../log");
const apps = require("./apps");
const actions = require("./actions");
const clipboard = require("./clipboard");
const digup = require("./digup");

const DEFAULT_SHORTCUT = "Alt+Space";

let addon = null;
let loadFailed = false;
let active = false;
let shortcut = null;
let hooks = {};
let prefsCache = null;

// The query being shown, and what DigUp found for it so far.
let cur = { q: "", scope: "", seq: 0 };
let files = { seq: -1, q: "", hits: [], meaning: false, code: false };
let meaningTimer = null;
let registry = new Map();
let filesNote = "";
let recentFilesCache = { at: 0, items: [] };

// ------------------------------------------------------------- loading

function dir() {
  return electron.app.isPackaged ? path.join(process.resourcesPath, "plutobar") : path.join(__dirname, "../../../../resources/plutobar");
}

function isAvailable() {
  return process.platform === "darwin" && fs.existsSync(path.join(dir(), "plutobar.node"));
}

function load() {
  if (addon || loadFailed) return addon;
  if (!isAvailable()) {
    loadFailed = true;
    log.warn("[PlutoBar] not built: run scripts/build-plutobar.sh");
    return null;
  }
  try {
    addon = require(path.join(dir(), "plutobar.node"));
    addon.onAction((json) => {
      try {
        onAction(JSON.parse(json));
      } catch (err) {
        log.warn("[PlutoBar] action failed: " + err.stack);
      }
    });
    addon.start();
  } catch (err) {
    loadFailed = true;
    log.warn("[PlutoBar] failed to load: " + err.message);
  }
  return addon;
}

// ------------------------------------------------------------- prefs
// What PlutoBar learns: how often you open each app, your last question.

function prefsFile() {
  return path.join(electron.app.getPath("userData"), "plutobar.json");
}

function prefs() {
  if (!prefsCache) {
    try {
      prefsCache = JSON.parse(fs.readFileSync(prefsFile(), "utf8"));
    } catch {
      prefsCache = {};
    }
    prefsCache.launches ||= {};
  }
  return prefsCache;
}

let saveTimer = null;
function savePrefs() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(prefsFile(), JSON.stringify(prefsCache));
    } catch {}
  }, 500);
}

// ------------------------------------------------------------- on / off

// options: { shortcut, clipboard }
function setEnabled(on, options = {}) {
  active = !!on && !!load();
  clipboard.setEnabled(active && options.clipboard !== false);
  setShortcut(active ? options.shortcut || DEFAULT_SHORTCUT : null);
  if (!active) {
    addon?.hide();
    digup.service.stop();
  } else {
    log.info("[PlutoBar] on (" + (shortcut || "no shortcut") + ")" + (digup.available() ? ", files through DigUp" : ", DigUp not found"));
    pushState();
  }
  return { active, shortcut, shortcutOk: !!shortcut };
}

function setShortcut(accel) {
  if (shortcut) electron.globalShortcut.unregister(shortcut);
  shortcut = null;
  if (!accel) return;
  try {
    if (electron.globalShortcut.register(accel, () => show({ toggle: true }))) shortcut = accel;
    else log.warn("[PlutoBar] " + accel + " is taken by another app");
  } catch (err) {
    log.warn("[PlutoBar] shortcut " + accel + ": " + err.message);
  }
}

const isActive = () => active && !!addon;

function show(opts = {}) {
  if (isActive()) addon.show(JSON.stringify({ key: true, ...opts }));
}

function hide() {
  addon?.hide();
}

// What the bar's buttons and rows do: main.js's assistant actions plus a few more.
function setActions(a) {
  hooks = a || {};
}

// ------------------------------------------------------------- the assistant

// One small assistant event (see agentEvents.js translate).
function agentEvent(e) {
  if (!isActive()) return;
  if (e.t === "text" && e.text) {
    prefs().last = { ...(prefs().last || {}), reply: e.text.slice(0, 400), at: Date.now() };
    savePrefs();
  }
  if (e.t === "phase" && e.transcript) {
    prefs().last = { question: e.transcript.slice(0, 200), reply: "", at: Date.now() };
    savePrefs();
  }
  addon.agentEvent(JSON.stringify(e));
}

function ask(text) {
  prefs().last = { question: text.slice(0, 200), reply: "", at: Date.now() };
  savePrefs();
  hooks.sendText?.(text);
}

// ------------------------------------------------------------- input

function onAction(a) {
  if (a.a !== "query" && a.a !== "clipboard") log.info("[PlutoBar] " + a.a + (a.id ? " " + a.id : ""));
  switch (a.a) {
    case "opened":
      digup.service.prewarm();
      actions.refreshShortcuts();
      pushState();
      return;
    case "hidden":
      clearTimeout(meaningTimer);
      return;
    case "query":
      return onQuery(a);
    case "open":
      return open(a);
    case "ask":
      return ask(String(a.text || ""));
    case "askVoice":
      return hooks.askVoice?.();
    case "stopVoice":
      return hooks.stopVoice?.();
    case "approve": {
      const edits = a.edits && Object.keys(a.edits).length ? JSON.stringify(a.edits) : undefined;
      return hooks.confirm?.(a.id, true, edits);
    }
    case "cancel":
      return hooks.confirm?.(a.id, false);
    case "dismiss":
      return hooks.dismiss?.();
    case "stopSpeaking":
      return hooks.stopSpeaking?.();
    case "clipboard":
      return clipboard.onChange(a);
  }
}

function pushState() {
  if (!isActive()) return;
  const last = prefs().last;
  const recent =
    last?.question && Date.now() - (last.at || 0) < 8 * 3600_000
      ? [{ id: "recent", kind: "recent", title: last.question, subtitle: last.reply ? last.reply.replace(/\s+/g, " ").slice(0, 90) : "Pluto", icon: { type: "orb" } }]
      : [];
  addon.state(JSON.stringify({ recent }));
  if (digup.available()) {
    digup.service
      .status()
      .then((s) => {
        const total = (s.searchable || 0) + (s.pending || 0);
        filesNote = s.pending > 0 && total ? "DigUp · indexing " + Math.floor((100 * (s.searchable || 0)) / total) + "%" : "DigUp";
      })
      .catch(() => {});
  } else {
    filesNote = "names only · install DigUp to search inside files";
  }
}

function onQuery({ q = "", scope = "", seq = 0, mode }) {
  if (mode === "conversation") return;
  cur = { q: String(q), scope: String(scope || ""), seq };
  clearTimeout(meaningTimer);
  render();
  const text = cur.q.trim();
  const code = /^code:/i.test(text);
  const words = code ? text.replace(/^code:\s*/i, "") : text;
  const wantsFiles = !cur.scope || cur.scope === "files";
  if (!wantsFiles || words.length < 2) return;
  const limit = cur.scope === "files" ? 40 : 16;

  if (!digup.available()) {
    spotlightFiles(words, seq);
    return;
  }
  // DigUp's own rhythm: exact words at once, meaning when you pause.
  digup.service
    .search(words, { meaning: false, code, limit, prefixLast: true })
    .then((r) => seq === cur.seq && files.seq !== seq && setFiles(seq, r, false, code))
    .catch(() => {});
  // A fragment ("saf") is a name being typed, not a description: exact words only.
  const describes = code || cur.scope === "files" || words.split(/\s+/).length >= 2 || words.length >= 6;
  if (!describes) return;
  digup.service.embedAhead(words, code);
  meaningTimer = setTimeout(() => {
    digup.service
      .search(words, { meaning: true, code, limit })
      .then((r) => {
        if (seq !== cur.seq) return;
        setFiles(seq, r, true, code);
        if (r.warning) log.warn("[DigUp] " + r.warning);
      })
      .catch((err) => log.warn("[DigUp] search: " + err.message));
  }, 240);
}

function setFiles(seq, reply, meaning, code) {
  files = { seq, q: cur.q.trim().toLowerCase(), hits: digup.strongHits(reply), meaning: meaning && reply.meaning !== false, code };
  render(true);
  if (meaning) pictures(seq);
}

// A video row shows the frame that matched, a PDF row the page.
function pictures(seq) {
  for (const hit of files.hits.slice(0, 6)) {
    const kind = hit.kind === "video" && hit.segment === "frame" ? "video" : hit.kind === "pdf" ? "pdf" : null;
    if (!kind || !Number.isFinite(hit.loc)) continue;
    digup.service
      .render(hit.path, kind, hit.loc, 160)
      .then((image) => {
        if (!image || seq !== cur.seq) return;
        const item = digup.toItem(hit, { code: files.code });
        item.icon = { type: "image", path: image };
        addon.results(JSON.stringify({ update: item }));
      })
      .catch(() => {});
  }
}

// Without DigUp: file names through macOS's own index.
function spotlightFiles(words, seq) {
  const { execFile } = require("node:child_process");
  execFile("/usr/bin/mdfind", ["-onlyin", require("node:os").homedir(), "-name", words], { timeout: 2000, maxBuffer: 1 << 20 }, (err, out) => {
    if (seq !== cur.seq) return;
    const paths = String(out || "")
      .split("\n")
      .filter((p) => p && !/\/(Library|\.[^/]+|node_modules)\//.test(p))
      .slice(0, 12);
    files = { seq, q: cur.q.trim().toLowerCase(), hits: paths.map((p, i) => ({ path: p, kind: "doc", segment: "name", segment_id: "s" + i })), meaning: false, code: false };
    render(true);
  });
}

// Files with an empty field (⌘2): what you used lately.
function recentFiles() {
  if (Date.now() - recentFilesCache.at < 60_000) return recentFilesCache.items;
  recentFilesCache.at = Date.now();
  const { execFile } = require("node:child_process");
  execFile(
    "/usr/bin/mdfind",
    ["-onlyin", require("node:os").homedir(), "kMDItemLastUsedDate >= $time.today(-7) && kMDItemContentTypeTree != public.folder"],
    { timeout: 3000, maxBuffer: 2 << 20 },
    (err, out) => {
      recentFilesCache.items = String(out || "")
        .split("\n")
        .filter((p) => p && !/\/(Library|\.[^/]+|node_modules)\//.test(p) && !p.endsWith(".app"))
        .slice(0, 40)
        .map((p) => ({ id: "recentfile:" + p, kind: "file", title: path.basename(p), subtitle: p.replace(require("node:os").homedir(), "~"), icon: { type: "file", path: p, thumb: true }, path: p }));
      if (cur.scope === "files" && !cur.q.trim()) render(true);
    },
  );
  return recentFilesCache.items;
}

// ------------------------------------------------------------- the rows

function render(keepSelection = false) {
  if (!isActive()) return;
  const query = cur.q.trim();
  const launches = prefs().launches;
  const reg = new Map();
  const sections = [];
  const add = (id, title, items, note = "") => {
    if (!items.length) return;
    sections.push({ id, title, note, items });
  };
  // While you type on, the last query's files stay until this one's arrive (no flicker).
  const typingOn = files.q.length >= 2 && query.toLowerCase().startsWith(files.q);
  const fileRows = () =>
    files.seq === cur.seq || typingOn
      ? files.hits.map((hit) => {
          const item = digup.toItem(hit, { code: files.code });
          reg.set(item.id, { type: "file", hit, code: files.code });
          return item;
        })
      : [];
  const appRow = (m) => {
    const item = apps.toItem(m.app);
    reg.set(item.id, { type: "app", path: m.app.path });
    return item;
  };
  const askRow = { id: "ask", kind: "ask", title: query, subtitle: "Ask Pluto", icon: { type: "orb" } };

  switch (cur.scope) {
    case "apps": {
      const list = query ? apps.match(query, launches, 60) : apps.browse(launches).map((app) => ({ app }));
      add("apps", "", list.map(appRow));
      break;
    }
    case "files": {
      if (query) add("files", "", fileRows().slice(0, 40), filesNote);
      else {
        const recents = recentFiles();
        for (const r of recents) reg.set(r.id, { type: "path", path: r.path });
        add("files", "Recent", recents);
      }
      break;
    }
    case "actions":
      add("actions", "", actions.match(query, 200));
      break;
    case "clipboard":
      add("clipboard", "", clipboard.match(query, 60));
      break;
    default: {
      if (!query) break;
      if (/^code:/i.test(query)) {
        const rows = fileRows();
        add("code", "Code", rows.slice(0, 8), filesNote);
        add("ask", "Pluto", [askRow]);
        break;
      }
      const calc = actions.calculate(query);
      const url = actions.urlFor(query);
      const askiness = actions.askiness(query);
      const appHits = apps.match(query, launches, 5);
      const best = appHits[0];
      let top = null;
      if (calc) top = { id: "calc", kind: "calc", title: calc, subtitle: query + " =", large: true, icon: { type: "symbol", name: "equal.circle" }, value: calc };
      else if (url) top = { id: "url", kind: "web", title: "Open " + url.replace(/^https?:\/\//, "").replace(/\/$/, ""), subtitle: url, icon: { type: "symbol", name: "safari" }, url };
      else if (best && best.score >= 750 && askiness < 0.85) top = appRow(best);
      else if (askiness >= 0.7) top = askRow;
      else if (best && best.score >= 600) top = appRow(best);
      if (top?.value) reg.set(top.id, { type: "calc", value: top.value });
      if (top?.url) reg.set(top.id, { type: "url", url: top.url });

      if (top) add("top", "Top Hit", [top]);
      // Siri in Spotlight: answering is always on offer.
      if (top !== askRow) add("ask", "Pluto", [askRow]);
      add("apps", "Applications", appHits.filter((m) => !top || "app:" + m.app.path !== top.id).slice(0, 4).map(appRow));
      if (query.length >= 2) add("actions", "Actions", actions.match(query, 3));
      // When an app is plainly what you're after, files make room.
      if (!calc && !url) add("files", "Files", fileRows().slice(0, top && top.kind === "app" && !/\s/.test(query) ? 3 : 6), filesNote);
      if (query.length >= 3) add("clipboard", "Clipboard", clipboard.match(query, 2));
      const web = { id: "web", kind: "web", title: "Search the web for “" + query + "”", icon: { type: "symbol", name: "globe" } };
      reg.set("web", { type: "url", url: actions.searchUrl(query) });
      add("web", "", [web]);
    }
  }
  registry = reg;
  addon.results(JSON.stringify({ seq: cur.seq, sections, keepSelection }));
}

// ------------------------------------------------------------- Return

function open({ id, kind, reveal, copy }) {
  const shell = electron.shell;
  const entry = registry.get(id);
  hide();
  try {
    switch (kind) {
      case "app": {
        const p = entry?.path || id.replace(/^app:/, "");
        if (reveal) return shell.showItemInFolder(p);
        prefs().launches[p] = (prefs().launches[p] || 0) + 1;
        savePrefs();
        return shell.openPath(p);
      }
      case "file": {
        if (entry?.type === "path") return reveal ? shell.showItemInFolder(entry.path) : shell.openPath(entry.path);
        if (!entry) return;
        if (reveal) return shell.showItemInFolder(entry.hit.path);
        if (copy) return electron.clipboard.writeBuffer("public.file-url", Buffer.from("file://" + encodeURI(entry.hit.path)));
        return digup.openHit(entry.hit, { shell, code: entry.code });
      }
      case "action":
        return actions.run(id, {
          shell,
          ask,
          askVoice: () => hooks.askVoice?.(),
          openHistory: () => hooks.openHistory?.(),
          openSettings: () => hooks.openSettings?.(),
          openDigUp: () => {
            const app = digup.appPath();
            app ? shell.openPath(app) : shell.openExternal("https://github.com/ARahim3/DigUp/releases/latest");
          },
        });
      case "clip":
        if (!clipboard.restore(id) || copy) return;
        // Into the app you were in, as if you'd pressed ⌘V there.
        return setTimeout(() => Promise.resolve(require("../assistant/computer").pressKeys("cmd+v")).catch(() => {}), 160);
      case "calc":
        return electron.clipboard.writeText(String(entry?.value ?? "").replace(/,/g, ""));
      case "web":
        return entry?.url && shell.openExternal(entry.url);
    }
  } catch (err) {
    log.warn("[PlutoBar] open " + id + ": " + err.message);
  }
}

function quit() {
  digup.service.stop();
  clipboard.clear();
}

module.exports = { isAvailable, isEnabled: isActive, setEnabled, setActions, agentEvent, show, hide, quit, DEFAULT_SHORTCUT };
