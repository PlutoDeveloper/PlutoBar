"use strict";
// Clipboard history, like Spotlight's (⌘4): what you copied in the last
// 8 hours, newest first. Kept in memory only, never on disk except pictures
// (in a temp folder, deleted with them). Copies a password manager marks
// concealed are skipped before they're ever read (Runtime.swift).

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const electron = require("electron");

const KEEP_MS = 8 * 3600_000;
const MAX = 60;
const DIR = path.join(os.tmpdir(), "plutobar-clips");

let items = [];
let seq = 0;
let enabled = true;
// The bar's own write (Return on an item) shouldn't count as a new copy.
let ignoreNext = false;

function setEnabled(on) {
  enabled = !!on;
  if (!enabled) clear();
}

function clear() {
  items = [];
  fs.rmSync(DIR, { recursive: true, force: true });
}

function prune() {
  const now = Date.now();
  for (const it of items) if (now - it.at > KEEP_MS && it.image) fs.rmSync(it.image, { force: true });
  items = items.filter((it) => now - it.at <= KEEP_MS).slice(0, MAX);
}

// Something new is on the pasteboard.
function onChange({ concealed, app }) {
  if (!enabled) return;
  if (ignoreNext) return void (ignoreNext = false);
  if (concealed) return;
  const cb = electron.clipboard;
  const formats = cb.availableFormats();
  let item = null;
  const fileUrl = cb.read("public.file-url");
  if (fileUrl && fileUrl.startsWith("file://")) {
    const p = decodeURIComponent(fileUrl.replace(/^file:\/\//, ""));
    item = { type: "file", path: p, text: path.basename(p) };
  } else if (formats.some((f) => f.startsWith("image/")) && !cb.readText()) {
    const img = cb.readImage();
    if (img.isEmpty()) return;
    fs.mkdirSync(DIR, { recursive: true });
    const file = path.join(DIR, "clip-" + Date.now() + ".png");
    const size = img.getSize();
    fs.writeFileSync(file, img.toPNG());
    item = { type: "image", image: file, text: "Image " + size.width + " × " + size.height };
  } else {
    const text = cb.readText();
    if (!text || !text.trim()) return;
    item = { type: /^https?:\/\/\S+$/.test(text.trim()) ? "link" : "text", text };
  }
  // The same thing copied again moves to the top.
  items = items.filter((it) => !(it.type === item.type && it.text === item.text && it.path === item.path));
  items.unshift({ ...item, id: "clip:" + ++seq, at: Date.now(), app: app || "" });
  prune();
}

function ago(at) {
  const m = Math.round((Date.now() - at) / 60_000);
  return m < 1 ? "Just now" : m < 60 ? m + " min ago" : Math.round(m / 60) + " h ago";
}

function toItem(it) {
  const first = it.text.replace(/\s+/g, " ").trim();
  const label = it.type === "link" ? "Link" : it.type === "image" ? "Image" : it.type === "file" ? "File" : it.text.length > 120 ? it.text.length.toLocaleString() + " characters" : "Text";
  return {
    id: it.id,
    kind: "clip",
    title: first.length > 120 ? first.slice(0, 117) + "…" : first,
    subtitle: [label, it.app, ago(it.at)].filter(Boolean).join(" · "),
    icon:
      it.type === "image"
        ? { type: "image", path: it.image }
        : it.type === "file"
          ? { type: "file", path: it.path, thumb: true }
          : { type: "symbol", name: it.type === "link" ? "link" : "text.alignleft" },
  };
}

function match(query, limit = 3) {
  prune();
  const q = String(query || "").trim().toLowerCase();
  const list = q ? items.filter((it) => it.text.toLowerCase().includes(q)) : items;
  return list.slice(0, q ? limit : MAX).map(toItem);
}

// Puts an item back on the clipboard.
function restore(id) {
  const it = items.find((x) => x.id === id);
  if (!it) return false;
  ignoreNext = true;
  const cb = electron.clipboard;
  if (it.type === "image") cb.writeImage(electron.nativeImage.createFromPath(it.image));
  else if (it.type === "file") cb.writeBuffer("public.file-url", Buffer.from("file://" + encodeURI(it.path)));
  else cb.writeText(it.text);
  items = [it, ...items.filter((x) => x !== it)];
  return true;
}

module.exports = { onChange, match, restore, setEnabled, clear };
