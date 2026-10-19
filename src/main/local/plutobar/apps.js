"use strict";
// The apps on this Mac, and Spotlight-style matching: "saf" finds Safari,
// "vsc" Visual Studio Code, "term" Terminal, with the apps you open most
// winning ties.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const DIRS = [
  "/Applications",
  "/Applications/Utilities",
  "/System/Applications",
  "/System/Applications/Utilities",
  "/System/Cryptexes/App/System/Applications", // Safari
  "/System/Library/CoreServices/Applications",
  path.join(os.homedir(), "Applications"),
];
const EXTRA = ["/System/Library/CoreServices/Finder.app"];
// Helpers that live in those folders but aren't apps you'd launch.
const HIDDEN = /^(Install |Uninstall|.*Helper$|.*Agent$)/;

let apps = [];
let scannedAt = 0;

function scan() {
  const found = new Map();
  const add = (p) => {
    const name = path.basename(p, ".app");
    if (HIDDEN.test(name) || found.has(name.toLowerCase())) return;
    found.set(name.toLowerCase(), { name, path: p, lower: name.toLowerCase(), words: words(name) });
  };
  for (const dir of DIRS) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.name.endsWith(".app")) add(p);
      else if (e.isDirectory() && !e.name.startsWith(".")) {
        // One level down: "Microsoft Office/…", "Setapp/…".
        try {
          for (const sub of fs.readdirSync(p)) if (sub.endsWith(".app")) add(path.join(p, sub));
        } catch {}
      }
    }
  }
  for (const p of EXTRA) if (fs.existsSync(p)) add(p);
  apps = [...found.values()].sort((a, b) => a.lower.localeCompare(b.lower));
  scannedAt = Date.now();
}

function all() {
  if (!apps.length || Date.now() - scannedAt > 5 * 60_000) scan();
  return apps;
}

function words(name) {
  // "Visual Studio Code" → visual, studio, code; "FaceTime" → face, time.
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

// 0 (no match) … ~1000 (exactly the name).
function score(app, q) {
  if (!q) return 1;
  if (app.lower === q) return 1000;
  if (app.lower.startsWith(q)) return 900 - Math.min(app.lower.length - q.length, 50);
  if (app.words.some((w) => w.startsWith(q))) return 800;
  const initials = app.words.map((w) => w[0]).join("");
  if (q.length >= 2 && initials.startsWith(q)) return 760;
  if (app.lower.includes(q)) return 620;
  // Every letter in order ("chrm" → Chrome), tighter is better.
  let i = 0,
    start = -1,
    end = -1;
  for (let j = 0; j < app.lower.length && i < q.length; j++) {
    if (app.lower[j] !== q[i]) continue;
    if (i === 0) start = j;
    end = j;
    i++;
  }
  if (i === q.length && q.length >= 3) return 300 - Math.min(end - start, 200);
  return 0;
}

// Best matches, with how often you open each (launches: path → count).
function match(query, launches = {}, limit = 6) {
  const q = String(query || "").trim().toLowerCase();
  return all()
    .map((app) => {
      const s = score(app, q);
      return { app, score: s ? s + Math.min(launches[app.path] || 0, 25) * 6 : 0 };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.app.lower.localeCompare(b.app.lower))
    .slice(0, limit);
}

// Applications with an empty field: the ones you use, then A to Z.
function browse(launches = {}) {
  return [...all()].sort((a, b) => (launches[b.path] || 0) - (launches[a.path] || 0) || a.lower.localeCompare(b.lower));
}

const toItem = (app, extra = {}) => ({
  id: "app:" + app.path,
  kind: "app",
  title: app.name,
  subtitle: extra.subtitle || "",
  icon: { type: "file", path: app.path },
  accessory: extra.accessory || "",
});

module.exports = { all, match, browse, toItem, scan, score };
