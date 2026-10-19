"use strict";
// DigUp (github.com/ARahim3/DigUp, MIT): search the files on this Mac by
// what's in them, with EmbeddingGemma 2 on-device. PlutoBar doesn't index
// anything itself: DigUp.app keeps its index up to date, and this runs DigUp's
// own `digup search-service` helper on that index, with the folders chosen in
// DigUp's settings. The service keeps the index open and the query encoder
// warm, so a keyword search costs a few milliseconds and a meaning search
// (after you pause typing) well under a second.
//
// Protocol (Sources/digup/SearchService.swift): one JSON request per line on
// stdin, one response per line on stdout carrying the request's id.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn, execFile } = require("node:child_process");
const log = require("../log");

const HOME = os.homedir();
const APP_CANDIDATES = ["/Applications/DigUp.app", path.join(HOME, "Applications/DigUp.app")];
const INDEX = path.join(HOME, "Library/Application Support/DigUp/index.noindex");
const PREFS_DOMAIN = "com.abdurrahim.DigUp";

function appPath() {
  return APP_CANDIDATES.find((p) => fs.existsSync(path.join(p, "Contents/Helpers/digup"))) || null;
}

const binary = () => {
  const app = appPath();
  return app ? path.join(app, "Contents/Helpers/digup") : null;
};

const hasIndex = () => fs.existsSync(path.join(INDEX, "index.sqlite"));

// DigUp's folder choices, from its preferences ("defaults read" prints an
// old-style plist; only the string arrays are needed).
function readPrefs() {
  return new Promise((resolve) => {
    execFile("defaults", ["read", PREFS_DOMAIN], { timeout: 4000, maxBuffer: 1 << 20 }, (err, out) => {
      if (err) return resolve({});
      const list = (key) => {
        const m = new RegExp("\\n\\s*" + key + " =\\s+\\(([\\s\\S]*?)\\);").exec("\n" + out);
        if (!m) return [];
        return m[1]
          .split(/,\s*\n|\n/)
          .map((s) => s.trim().replace(/,$/, ""))
          .filter(Boolean)
          .map((s) => s.replace(/^"(.*)"$/, "$1").replace(/\\U([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\(.)/g, "$1"));
      };
      const scalar = (key) => new RegExp("\\n\\s*" + key + " = \"?([^\";\\n]*)\"?;").exec("\n" + out)?.[1] || null;
      resolve({
        roots: list("roots"),
        excluded: list("excludedFolders"),
        types: list("excludedTypes"),
        codeRoots: list("codeRoots"),
        codeExcluded: list("codeExcludedFolders"),
        codeEditor: scalar("codeEditor"),
      });
    });
  });
}

class DigUpService {
  constructor() {
    this.proc = null;
    this.pending = new Map();
    this.nextId = 1;
    this.prefs = null;
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
    // A service that keeps dying (an index from a newer DigUp, say) is left alone for a while.
    if (this.failures >= 3 && Date.now() - this.startedAt < 60_000) return false;
    this.prefs = await readPrefs();
    if (this.proc) return true;
    const p = this.prefs;
    const args = ["search-service", ...(p.roots || [])];
    for (const d of p.excluded || []) args.push("--exclude", d);
    if (p.types?.length) args.push("--exclude-ext", p.types.join(","));
    for (const d of p.codeRoots || []) args.push("--code-root", d);
    for (const d of p.codeExcluded || []) args.push("--code-exclude", d);
    args.push("--encoder-idle", "300");
    this.startedAt = Date.now();
    const proc = spawn(binary(), args, { stdio: ["pipe", "pipe", "pipe"] });
    this.proc = proc;
    proc.stdin.on("error", () => {});
    readline.createInterface({ input: proc.stdout }).on("line", (line) => this.onLine(line));
    proc.stderr.on("data", (d) => log.warn("[DigUp] " + String(d).trim().slice(0, 300)));
    proc.on("exit", (code) => {
      if (this.proc === proc) this.proc = null;
      this.encoder = "stopped";
      if (code !== 0 && code !== null) this.failures++;
      for (const [, p] of this.pending) p.reject(new Error("DigUp's search stopped"));
      this.pending.clear();
      log.info("[DigUp] search-service exited (" + code + ")");
    });
    proc.on("error", (err) => log.warn("[DigUp] " + err.message));
    log.info("[DigUp] search-service started on " + (p.roots || []).length + " folders" + (p.codeRoots?.length ? " + " + p.codeRoots.length + " code folders" : ""));
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
    msg.ok === false ? p.reject(new Error(msg.error || "DigUp error")) : p.resolve(msg);
  }

  async request(op, fields = {}, timeoutMs = 10_000) {
    if (!(await this.ensure())) throw new Error("DigUp isn't installed or hasn't indexed anything yet.");
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("DigUp took too long"));
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
    if (!this.available()) return;
    try {
      if (Date.now() - this.lastReload > 60_000 && this.proc) {
        this.lastReload = Date.now();
        await this.request("reload", {}, 8000);
      }
      await this.request("prewarm", {}, 15_000);
    } catch (err) {
      log.warn("[DigUp] prewarm: " + err.message);
    }
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

const service = new DigUpService();

// ------------------------------------------------------------ hits

const tilde = (p) => (p.startsWith(HOME) ? "~" + p.slice(HOME.length) : p);

function clock(seconds) {
  const t = Math.floor(seconds);
  return t >= 3600
    ? Math.floor(t / 3600) + ":" + String(Math.floor(t / 60) % 60).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0")
    : Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
}

// Where in the file the match is, as DigUp's CLI says it.
function where(hit) {
  const loc = hit.loc;
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

const KIND_LABEL = { screenshot: "Screenshot", image: "Picture", pdf: "PDF", doc: "Document", audio: "Recording", video: "Video" };

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
  const subtitle = ex || [KIND_LABEL[hit.kind] || (code ? "Code" : "File"), tilde(path.dirname(hit.path))].join(" · ");
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

const EDITOR_SCHEMES = { "com.microsoft.VSCode": "vscode", "com.todesktop.230313mzl4w4u92": "cursor", "dev.zed.Zed": "zed", "com.exafunction.windsurf": "windsurf" };

const q = (s) => '"' + String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

// Opens a hit where it matched: a recording or video at its moment (QuickTime),
// code in DigUp's chosen editor at the line, anything else as macOS would.
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
  if (code && Number.isFinite(loc)) {
    const scheme = EDITOR_SCHEMES[service.prefs?.codeEditor || ""];
    const line = Math.round(hit.focus ?? loc);
    if (scheme) return shell.openExternal(scheme + "://file" + encodeURI(hit.path) + ":" + line);
  }
  shell.openPath(hit.path);
}

module.exports = { service, toItem, strongHits, openHit, where, appPath, available: () => service.available() };
