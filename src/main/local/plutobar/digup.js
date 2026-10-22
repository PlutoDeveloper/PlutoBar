"use strict";
// File search, built in: DigUp's engine (resources/src/digup, MIT, by Abdur
// Rahim) finds the files on this Mac by what's in them, with Google DeepMind's
// EmbeddingGemma 2 running on-device. PlutoBar ships its `digup` tool and runs
// it the way DigUp's own app does:
//   download-model   the model (865 MB, once) into PlutoBar's folder
//   index-service    keeps the index in step with the folders you chose: new
//                    files first, the first pass ("backfill") while on power,
//                    again a moment after anything in them changes
//   search-service   the index open and the query encoder warm, so a keyword
//                    search costs milliseconds and a meaning search (after you
//                    pause typing) well under a second
// Everything lives in ~/Library/Application Support/PlutoBar/Search. If DigUp
// itself was set up on this Mac, its model, index and folders are taken over
// once (APFS clones: instant, no extra space).
//
// Protocols: resources/src/digup/Sources/digup/{SearchService,IndexService,DownloadModel}.swift,
// one JSON object per line each way.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn, execFile } = require("node:child_process");
const electron = require("electron");
const log = require("../log");

const HOME = os.homedir();
const MODEL_FILES = [
  { name: "embeddinggemma-2-Q8_0.gguf", bytes: 309_855_456 },
  { name: "mmproj-embeddinggemma-2-Q8_0.gguf", bytes: 554_821_024 },
];
const MODEL_BYTES = MODEL_FILES.reduce((n, f) => n + f.bytes, 0);
const DIGUP_APP_DATA = path.join(HOME, "Library/Application Support/DigUp");

// ------------------------------------------------------------ places

const home = () => path.join(electron.app.getPath("userData"), "Search");
const modelsDir = () => path.join(home(), "Models");
const indexDir = () => path.join(home(), "index.noindex");

function binary() {
  const p = electron.app.isPackaged ? path.join(process.resourcesPath, "binaries", "digup") : path.join(__dirname, "../../../../resources/bin/digup");
  return fs.existsSync(p) ? p : null;
}

const env = () => ({ ...process.env, DIGUP_HOME: home(), DIGUP_MODELS: modelsDir() });
const hasIndex = () => fs.existsSync(path.join(indexDir(), "index.sqlite"));

function modelReady(dir = modelsDir()) {
  return MODEL_FILES.every((f) => {
    try {
      return fs.statSync(path.join(dir, f.name)).size === f.bytes;
    } catch {
      return false;
    }
  });
}

// The folders searched (settings.files(), handed in by setFolderSource).
let folderSource = () => ({ roots: [], skipped: [], types: [], codeRoots: [], codeSkipped: [] });
const folders = () => folderSource();

function folderArgs(f, { withRoots = true } = {}) {
  const args = [];
  for (const d of f.skipped || []) args.push("--exclude", d);
  for (const t of f.types || []) args.push("--exclude-ext", t);
  for (const d of f.codeRoots || []) args.push("--code-root", d);
  for (const d of f.codeSkipped || []) args.push("--code-exclude", d);
  return withRoots ? [...args, ...(f.roots || [])] : args;
}

// What changed, for whoever shows it (setup, Settings, the bar's Files note).
const listeners = new Set();
const status = { model: { phase: modelReady() ? "ready" : "needed", fraction: 0, text: "" }, files: 0, searchable: 0, pending: 0, indexing: false };
function changed() {
  for (const fn of listeners) {
    try {
      fn(status);
    } catch {}
  }
}

// ------------------------------------------------------------ search-service

class SearchService {
  constructor() {
    this.proc = null;
    this.pending = new Map();
    this.nextId = 1;
    this.encoder = "stopped";
    this.startedAt = 0;
    this.failures = 0;
    this.lastReload = 0;
  }

  available() {
    return !!binary() && hasIndex();
  }

  async ensure() {
    if (this.proc) return true;
    if (!this.available()) return false;
    // A service that keeps dying is left alone for a while.
    if (this.failures >= 3 && Date.now() - this.startedAt < 60_000) return false;
    const f = folders();
    const args = ["search-service", "--index", indexDir(), ...folderArgs(f), "--encoder-idle", "120"];
    this.startedAt = Date.now();
    const proc = spawn(binary(), args, { stdio: ["pipe", "pipe", "pipe"], env: env() });
    this.proc = proc;
    proc.stdin.on("error", () => {});
    readline.createInterface({ input: proc.stdout }).on("line", (line) => this.onLine(line));
    proc.stderr.on("data", (d) => log.warn("[Search] " + String(d).trim().slice(0, 300)));
    proc.on("exit", (code) => {
      if (this.proc === proc) this.proc = null;
      this.encoder = "stopped";
      if (code !== 0 && code !== null) this.failures++;
      for (const [, p] of this.pending) p.reject(new Error("file search stopped"));
      this.pending.clear();
      log.info("[Search] search-service exited (" + code + ")");
    });
    proc.on("error", (err) => log.warn("[Search] " + err.message));
    log.info("[Search] search-service started on " + f.roots.length + " folders" + (f.codeRoots.length ? " + " + f.codeRoots.length + " code folders" : ""));
    return true;
  }

  onLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.event === "encoder") {
      this.encoder = msg.state;
      if (msg.state === "ready") this.failures = 0;
      return;
    }
    if (msg.id == null) return;
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    clearTimeout(p.timer);
    msg.ok === false ? p.reject(new Error(msg.error || "search error")) : p.resolve(msg);
  }

  async request(op, fields = {}, timeoutMs = 10_000) {
    if (!(await this.ensure())) throw new Error("File search isn't set up yet: choose folders in Settings → PlutoBar.");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("file search took too long"));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.proc.stdin.write(JSON.stringify({ id, op, ...fields }) + "\n");
    });
  }

  // `meaning: false` is the keyword-only pass DigUp itself runs while you type.
  search(q, { meaning = true, code = false, kinds, limit = 24, prefixLast = false } = {}) {
    const body = { q, meaning, code, limit, prefix_last: prefixLast };
    if (kinds?.length) body.kinds = kinds;
    return this.request("search", body, meaning ? 15_000 : 4000);
  }

  embedAhead(q, code = false) {
    return this.request("embed_ahead", { q, code }, 15_000).catch(() => {});
  }

  // The bar opened: start the encoder and load the vectors before the first pause.
  async prewarm() {
    if (!this.available() || !modelReady()) return;
    try {
      if (Date.now() - this.lastReload > 60_000 && this.proc) await this.reload();
      await this.request("prewarm", {}, 15_000);
    } catch (err) {
      log.warn("[Search] prewarm: " + err.message);
    }
  }

  async reload() {
    this.lastReload = Date.now();
    if (this.proc) await this.request("reload", {}, 8000).catch(() => {});
  }

  // The folders changed: the running service takes them as they are.
  setFolders(f) {
    if (!this.proc) return;
    this.request("folders", { roots: f.roots, skipped: f.skipped, types: f.types, code_roots: f.codeRoots, code_skipped: f.codeSkipped }).catch(() => {});
  }

  render(filePath, kind, loc, pixels = 128) {
    return this.request("render", { path: filePath, kind, loc, pixels }, 8000).then((r) => r.image || null);
  }

  text(segment, code = false) {
    return this.request("text", { segment, code }, 5000).then((r) => r.text || "");
  }

  status() {
    return this.request("status", {}, 5000);
  }

  // The encoder can't start without the model; once it's in, a new service picks it up.
  restart() {
    this.stop();
    this.failures = 0;
  }

  stop() {
    const proc = this.proc;
    if (!proc) return;
    try {
      proc.stdin.write(JSON.stringify({ id: 0, op: "quit" }) + "\n");
    } catch {}
    setTimeout(() => proc.exitCode === null && proc.kill(), 800);
    this.proc = null;
  }
}

const service = new SearchService();

// ------------------------------------------------------------ index-service
// One process per stretch of work, as in DigUp's app (Engine.startHelper): it
// syncs, indexes up to 50 new files on any power source, then the backfill if
// allowed, lingers a minute, and exits. Changes in the folders ask it to sync
// again (or start a new one).

let indexer = null;
let syncOwed = false;
// Pruning (files under folders no longer chosen leave the index) needs a full
// look at the index: once a session, and after the folders change.
let pruneWanted = true;
let watchers = [];
let watchTimer = null;
let periodic = null;
let started = false;

let paused = false;
// The first pass ("backfill") runs on power, or on battery too when that's chosen.
const onPower = () => folders().onBattery === true || !electron.powerMonitor.isOnBatteryPower();

function startIndexer() {
  if (indexer || !binary() || paused) return;
  const f = folders();
  if (!f.roots.length && !f.codeRoots.length) return;
  // It stays up (model loaded) for 3 minutes after its last file, so a burst of
  // new files (screenshots, downloads) is read by one process, not one each.
  const args = ["index-service", "--index", indexDir(), "--linger", "180"];
  if (pruneWanted) args.push("--prune");
  pruneWanted = false;
  if (onPower()) args.push("--backfill");
  args.push(...folderArgs(f));
  fs.mkdirSync(indexDir(), { recursive: true });
  const err = fs.openSync(path.join(indexDir(), "indexer.log"), "a");
  // Background priority: efficiency cores and throttled disk, so indexing never
  // competes with what you're doing (and costs less battery).
  const proc = spawn("/usr/sbin/taskpolicy", ["-b", binary(), ...args], { stdio: ["pipe", "pipe", err], env: env() });
  fs.closeSync(err);
  indexer = proc;
  syncOwed = false;
  status.indexing = true;
  changed();
  proc.stdin.on("error", () => {});
  readline.createInterface({ input: proc.stdout }).on("line", (line) => {
    try {
      indexEvent(JSON.parse(line));
    } catch {}
  });
  proc.on("exit", (code) => {
    if (indexer === proc) indexer = null;
    status.indexing = false;
    changed();
    service.reload();
    log.info("[Search] indexer exited (" + code + ")");
    if (syncOwed) startIndexer();
  });
  proc.on("error", (e) => log.warn("[Search] indexer: " + e.message));
  log.info("[Search] indexing " + f.roots.length + " folders" + (args.includes("--backfill") ? "" : " (new files only: on battery)"));
}

function counts(e) {
  if (typeof e.files !== "number") return;
  status.files = e.files;
  status.searchable = e.searchable || 0;
  status.pending = e.pending || 0;
}

let lastReloadAt = 0;
function indexEvent(e) {
  if (e.code) return;
  switch (e.event) {
    case "sync":
    case "idle":
    case "waiting":
      counts(e);
      changed();
      if (e.event !== "sync") service.reload();
      break;
    case "file":
    case "rest":
      // New files become searchable as they're read.
      if (Date.now() - lastReloadAt > 5000) {
        lastReloadAt = Date.now();
        service.reload();
      }
      break;
    case "error":
      log.warn("[Search] indexer: " + (e.message || "error"));
      break;
  }
}

function send(command) {
  try {
    indexer?.stdin.write(command + "\n");
  } catch {}
}

function requestSync() {
  if (indexer) send("sync");
  else startIndexer();
}

// Watches the folders (FSEvents, through fs.watch). The indexer syncs once
// things have been quiet for 8 s (a download, a burst of screenshots), or
// after a minute of steady change at most. Files still being written
// (partial downloads, Office lock files) don't count.
const NOISE = /(^|\/)(~\$|\.~lock)|\.(crdownload|download|part|partial|tmp|temp|swp|lock)$/i;
let changedSince = 0;
function changedFile() {
  const now = Date.now();
  if (!changedSince) changedSince = now;
  clearTimeout(watchTimer);
  const wait = Math.max(0, Math.min(8000, 60_000 - (now - changedSince)));
  watchTimer = setTimeout(() => {
    changedSince = 0;
    requestSync();
  }, wait);
}

// Code changes all the time while you work: like DigUp, the code index catches
// up once a project has been quiet for a minute (10 minutes at most), and only
// the code index syncs.
let codeTimer = null;
let codeChangedSince = 0;
function changedCode() {
  const now = Date.now();
  if (!codeChangedSince) codeChangedSince = now;
  clearTimeout(codeTimer);
  codeTimer = setTimeout(() => {
    codeChangedSince = 0;
    if (indexer) send("sync code");
    else startIndexer();
  }, Math.max(0, Math.min(60_000, 600_000 - (now - codeChangedSince))));
}

function watch() {
  for (const w of watchers) w.close();
  watchers = [];
  const f = folders();
  const roots = [...f.roots.map((r) => [r, false]), ...f.codeRoots.map((r) => [r, true])];
  for (const [root, code] of roots) {
    try {
      const w = fs.watch(root, { recursive: true }, (_event, file) => {
        if (file && (String(file).split("/").some((part) => part.startsWith(".")) || NOISE.test(String(file)))) return;
        code ? changedCode() : changedFile();
      });
      w.on("error", () => {});
      watchers.push(w);
    } catch {}
  }
}

// ------------------------------------------------------------ the model

let download = null;

function downloadModel() {
  if (download || !binary()) return;
  if (modelReady()) {
    status.model = { phase: "ready", fraction: 1, text: "" };
    return changed();
  }
  fs.mkdirSync(modelsDir(), { recursive: true });
  const proc = spawn(binary(), ["download-model", "--to", modelsDir()], { stdio: ["ignore", "pipe", "pipe"], env: env() });
  download = proc;
  status.model = { phase: "downloading", fraction: 0, text: "" };
  changed();
  readline.createInterface({ input: proc.stdout }).on("line", (line) => {
    let e;
    try {
      e = JSON.parse(line);
    } catch {
      return;
    }
    if (e.event === "progress" && e.all_total) status.model = { phase: "downloading", fraction: e.all_bytes / e.all_total, text: "" };
    if (e.event === "waiting") status.model = { ...status.model, text: "waiting for the network" };
    if (e.event === "error") status.model = { phase: "failed", fraction: 0, text: String(e.message || "Download failed").slice(0, 80) };
    changed();
  });
  proc.on("exit", (code) => {
    download = null;
    if (code === 0 && modelReady()) {
      status.model = { phase: "ready", fraction: 1, text: "" };
      log.info("[Search] model ready");
      service.restart();
      requestSync();
    } else if (status.model.phase !== "failed") {
      status.model = { phase: "failed", fraction: 0, text: "Download failed" };
    }
    changed();
  });
}

// ------------------------------------------------------------ DigUp's own setup
// If DigUp was set up on this Mac, PlutoBar takes over its model and index
// (clones: no copy, no extra space) and offers its folders. Once.

function digupPrefs() {
  return new Promise((resolve) => {
    execFile("defaults", ["read", "com.abdurrahim.DigUp"], { timeout: 4000, maxBuffer: 1 << 20 }, (err, out) => {
      if (err) return resolve(null);
      const list = (key) => {
        const m = new RegExp("\\n\\s*" + key + " =\\s+\\(([\\s\\S]*?)\\);").exec("\n" + out);
        if (!m) return [];
        return m[1]
          .split(/,\s*\n|\n/)
          .map((s) => s.trim().replace(/,$/, ""))
          .filter(Boolean)
          .map((s) => s.replace(/^"(.*)"$/, "$1").replace(/\\U([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, "$1"));
      };
      resolve({ roots: list("roots"), skipped: list("excludedFolders"), types: list("excludedTypes"), codeRoots: list("codeRoots"), codeSkipped: list("codeExcludedFolders") });
    });
  });
}

function clone(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to, fs.constants.COPYFILE_FICLONE);
}

// Returns DigUp's folder choices when there were any to take over.
async function importDigUp() {
  try {
    const theirModels = path.join(DIGUP_APP_DATA, "Models");
    if (!modelReady() && modelReady(theirModels)) {
      for (const f of MODEL_FILES) clone(path.join(theirModels, f.name), path.join(modelsDir(), f.name));
      log.info("[Search] took over DigUp's model");
      status.model = { phase: "ready", fraction: 1, text: "" };
      changed();
    }
    const theirIndex = path.join(DIGUP_APP_DATA, "index.noindex");
    if (!hasIndex() && fs.existsSync(path.join(theirIndex, "index.sqlite"))) {
      for (const name of ["index.sqlite", "index.sqlite-wal", "index.sqlite-shm", "code.sqlite", "code.sqlite-wal", "code.sqlite-shm", "costs.json"]) {
        if (fs.existsSync(path.join(theirIndex, name))) clone(path.join(theirIndex, name), path.join(indexDir(), name));
      }
      log.info("[Search] took over DigUp's index");
      return await digupPrefs();
    }
  } catch (err) {
    log.warn("[Search] couldn't take over DigUp's setup: " + err.message);
  }
  return null;
}

// ------------------------------------------------------------ choosing folders

// The folders offered at first: the usual ones in your home folder.
function candidates() {
  return ["Desktop", "Documents", "Downloads", "Pictures", "Movies", "Music"].map((n) => path.join(HOME, n)).filter((p) => fs.existsSync(p));
}

// How much a folder holds and how long its first pass takes (DigUp's estimate).
function estimate(folder) {
  return new Promise((resolve) => {
    if (!binary()) return resolve(null);
    execFile(binary(), ["estimate", folder, "--json", "--index", indexDir()], { env: env(), timeout: 60_000, maxBuffer: 8 << 20 }, (err, out) => {
      const line = String(out || "").split("\n").find((l) => l.startsWith("{"));
      try {
        resolve(line ? JSON.parse(line) : null);
      } catch {
        resolve(null);
      }
    });
  });
}

// ------------------------------------------------------------ on / off

function setFolderSource(fn) {
  folderSource = fn;
}

// Indexing on: watch the folders, sync now and every half hour, get the model.
function start() {
  if (!binary()) return log.warn("[Search] resources/bin/digup missing: run npm run build:digup");
  if (!download && modelReady() && status.model.phase !== "ready") {
    status.model = { phase: "ready", fraction: 1, text: "" };
    changed();
  }
  const f = folders();
  if (!f.roots.length && !f.codeRoots.length) return;
  if (!started) {
    started = true;
    electron.powerMonitor.on("on-ac", () => (indexer ? send("backfill on") : startIndexer()));
    electron.powerMonitor.on("on-battery", () => send("backfill off"));
    periodic = setInterval(requestSync, 30 * 60_000);
  }
  watch();
  if (!modelReady()) downloadModel();
  requestSync();
}

// The folders changed (setup, Settings): the indexer and the service follow.
function foldersChanged() {
  const f = folders();
  pruneWanted = true;
  service.setFolders(f);
  watch();
  if (indexer) {
    // Its folders are fixed at start: finish this one, then a new one.
    syncOwed = true;
    send("stop");
  } else {
    start();
  }
}

// Pause takes effect after the current batch (the indexer finishes it and exits).
function setPaused(on) {
  paused = !!on;
  status.paused = paused;
  if (paused) send("stop");
  else requestSync();
  changed();
}

// What's indexed under each folder (DigUp's per-folder counts).
async function summaries(code = false) {
  if (!service.available()) return [];
  try {
    return (await service.request("summaries", { code }, 8000)).roots || [];
  } catch {
    return [];
  }
}

function stop() {
  for (const w of watchers) w.close();
  watchers = [];
  clearInterval(periodic);
  clearTimeout(watchTimer);
  clearTimeout(codeTimer);
  send("stop");
  download?.kill();
  service.stop();
}

// ------------------------------------------------------------ hits

const tilde = (p) => (p.startsWith(HOME) ? "~" + p.slice(HOME.length) : p);

function clock(seconds) {
  const t = Math.floor(seconds);
  return t >= 3600
    ? Math.floor(t / 3600) + ":" + String(Math.floor(t / 60) % 60).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0")
    : Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
}

// Where in the file the match is, as DigUp's CLI says it.
// PowerPoint decks: a chunk is a slide (resources/src/digup Slides.swift).
const isDeck = (p) => /\.(pptx|ppsx|potx|pptm)$/i.test(p || "");

function where(hit) {
  const loc = hit.loc;
  if (hit.segment === "chunk" && isDeck(hit.path)) return loc != null ? "slide " + Math.round(loc) : "";
  switch (hit.segment) {
    case "page":
    case "pageImage":
      return loc != null ? "p. " + Math.round(loc) : "";
    case "audio":
    case "frame":
      return loc != null ? clock(loc) : "";
    case "lines":
      return loc != null ? "line " + Math.round(hit.focus ?? loc) : "";
    case "cells":
      return loc != null ? "cell " + Math.round(loc) : "";
    case "ocr":
      return "text in image";
    default:
      return "";
  }
}

const KIND_LABEL = { screenshot: "Screenshot", image: "Picture", pdf: "PDF", doc: "Document", audio: "Recording", video: "Video", deck: "Presentation" };

function excerpt(hit) {
  const e = String(hit.excerpt || "").replace(/[«»]/g, "").replace(/\s+/g, " ").trim();
  return e.length > 140 ? e.slice(0, 137) + "…" : e;
}

// A DigUp hit as a bar row (the row id carries the segment, so the same file
// matched at two moments is two rows).
function toItem(hit, { code = false } = {}) {
  const name = path.basename(hit.path);
  const ex = excerpt(hit);
  const picture = ["image", "screenshot"].includes(hit.kind);
  const subtitle = ex || [KIND_LABEL[isDeck(hit.path) ? "deck" : hit.kind] || (code ? "Code" : "File"), tilde(path.dirname(hit.path))].join(" · ");
  return {
    id: "file:" + (code ? "c" : "") + hit.segment_id,
    kind: "file",
    title: name,
    subtitle,
    badge: where(hit),
    icon: { type: "file", path: hit.path, thumb: picture || hit.kind === "pdf" || hit.kind === "video" },
  };
}

// A match isn't worth a row unless it stands out (DigUp's own "strong" fold),
// or contains the words exactly.
function strongHits(reply) {
  const hits = reply?.hits || [];
  const strong = Number.isFinite(reply?.strong) ? reply.strong : hits.length;
  return hits.filter((h, i) => i < strong || h.keyword_rank != null);
}


// ------------------------------------------------------------ opening

// The code editor results open in: the first of these that's installed.
const EDITORS = [
  ["Visual Studio Code", "vscode"],
  ["Cursor", "cursor"],
  ["Zed", "zed"],
  ["Windsurf", "windsurf"],
];
const editorScheme = () => EDITORS.find(([app]) => fs.existsSync("/Applications/" + app + ".app"))?.[1] || null;

const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

// Opens a hit where it matched: a recording or video at its moment (QuickTime),
// code in your editor at the line, anything else as macOS would.
function openHit(hit, { shell, code = false }) {
  const loc = hit.loc;
  if ((hit.kind === "video" || hit.kind === "audio") && Number.isFinite(loc)) {
    const script = [
      'tell application "QuickTime Player"',
      "activate",
      "open POSIX file " + q(hit.path),
      "delay 0.4",
      "set current time of front document to " + Math.max(0, Math.floor(loc)),
      "play front document",
      "end tell",
    ].join("\n");
    execFile("osascript", ["-e", script], (err) => err && shell.openPath(hit.path));
    return;
  }
  // A deck at its slide: PowerPoint if it's here, else Keynote (which opens pptx too).
  if (isDeck(hit.path) && hit.segment === "chunk" && Number.isFinite(loc) && loc > 1) {
    const slide = Math.round(loc);
    const script = fs.existsSync("/Applications/Microsoft PowerPoint.app")
      ? ['tell application "Microsoft PowerPoint"', "activate", "open POSIX file " + q(hit.path), "delay 1.5",
          "go to slide (view of document window 1) number " + slide, "end tell"].join("\n")
      : ['tell application "Keynote"', "activate", "set d to open POSIX file " + q(hit.path), "delay 1",
          "set current slide of d to slide " + slide + " of d", "end tell"].join("\n");
    execFile("osascript", ["-e", script], (err) => {
      if (err) {
        log.warn("[Search] couldn't open at slide " + slide + ": " + String(err.message).slice(0, 160));
        shell.openPath(hit.path);
      }
    });
    return;
  }
  if (code && Number.isFinite(loc)) {
    const scheme = editorScheme();
    const line = Math.round(hit.focus ?? loc);
    if (scheme) return shell.openExternal(scheme + "://file" + encodeURI(hit.path) + ":" + line);
  }
  shell.openPath(hit.path);
}


module.exports = {
  service,
  status,
  onChange: (fn) => listeners.add(fn),
  available: () => service.available(),
  installed: () => !!binary(),
  modelReady: () => modelReady(),
  setFolderSource,
  start,
  stop,
  foldersChanged,
  setPaused,
  indexNow: () => requestSync(),
  summaries,
  isPaused: () => paused,
  downloadModel,
  importDigUp,
  candidates,
  estimate,
  toItem,
  strongHits,
  openHit,
  where,
  MODEL_BYTES,
};
