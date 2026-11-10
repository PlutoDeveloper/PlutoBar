"use strict";
// Dictation on Apple's own speech model (SpeechAnalyzer, macOS 26+), through
// resources/src/apple-speech. The model runs in macOS's speech service on the
// Neural Engine: about 20 MB for the helper and no GPU, where whisper.cpp
// holds ~650 MB and runs on the GPU. Whisper stays as the fallback (older
// macOS, a language Apple's model lacks, or PLUTOBAR_STT=whisper).

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const readline = require("node:readline");
const { spawn } = require("node:child_process");
const electron = require("electron");
const log = require("../log");

const IDLE_MS = 5 * 60_000;
let proc = null;
let nextId = 1;
const waiting = new Map();
let idleTimer = null;
let lastError = null;

function binaryPath() {
  const p = electron.app.isPackaged ? path.join(process.resourcesPath, "binaries", "apple-speech") : path.join(__dirname, "../../../../resources/bin/apple-speech");
  return fs.existsSync(p) ? p : null;
}

// macOS 26 is Darwin 25.
function available() {
  return process.platform === "darwin" && Number(os.release().split(".")[0]) >= 25 && process.env.PLUTOBAR_STT !== "whisper" && !!binaryPath();
}

function start() {
  if (proc) return proc;
  const child = spawn(binaryPath(), [], { stdio: ["pipe", "pipe", "ignore"] });
  proc = child;
  child.stdin.on("error", () => {});
  readline.createInterface({ input: child.stdout }).on("line", (line) => {
    let m;
    try {
      m = JSON.parse(line);
    } catch {
      return;
    }
    const w = waiting.get(m.id);
    if (!w) return;
    waiting.delete(m.id);
    m.error ? w.reject(new Error(m.error)) : w.resolve(m);
  });
  child.on("exit", (code) => {
    if (proc === child) proc = null;
    for (const w of waiting.values()) w.reject(new Error("apple-speech exited (" + code + ")"));
    waiting.clear();
  });
  return child;
}

function touch() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(stop, IDLE_MS);
  idleTimer.unref?.();
}

function request(body, { signal, timeout = 60_000 } = {}) {
  touch();
  const child = start();
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      waiting.delete(id);
      reject(new Error("Apple speech timed out"));
    }, timeout);
    const done = (fn) => (v) => {
      clearTimeout(timer);
      fn(v);
    };
    waiting.set(id, { resolve: done(resolve), reject: done(reject) });
    signal?.addEventListener("abort", () => {
      waiting.delete(id);
      clearTimeout(timer);
      reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    });
    child.stdin.write(JSON.stringify({ id, ...body }) + "\n");
  });
}

// The language's model on this Mac (a one-time download macOS manages).
async function prepare(language) {
  try {
    const r = await request({ prepare: language || null }, { timeout: 10 * 60_000 });
    lastError = null;
    log.info("[Speech] Apple speech ready (" + r.locale + ")");
    return true;
  } catch (err) {
    lastError = err.message;
    log.warn("[Speech] Apple speech unavailable: " + err.message);
    return false;
  }
}

// Words the model splits ("Pluto Bar") back to how they're written.
function respell(text, words) {
  let out = text;
  for (const w of words) {
    const parts = w.match(/[A-Z]+(?![a-z])|[A-Z]?[a-z]+|\d+/g);
    if (!parts || parts.length < 2) continue;
    out = out.replace(new RegExp("\\b" + parts.join("[\\s-]?") + "\\b", "gi"), w);
  }
  return out;
}

async function transcribeWav(wav, { language, vocabulary = [], signal } = {}) {
  const file = path.join(os.tmpdir(), "plutobar-dictation-" + process.pid + "-" + nextId + ".wav");
  fs.writeFileSync(file, wav);
  try {
    const r = await request({ wav: file, language: language || null, words: vocabulary.slice(0, 100) }, { signal });
    lastError = null;
    return respell(String(r.text || "").trim(), vocabulary);
  } finally {
    fs.rm(file, { force: true }, () => {});
  }
}

function stop() {
  clearTimeout(idleTimer);
  if (proc) {
    try {
      proc.stdin.end();
    } catch {}
    proc = null;
  }
}

const status = () => ({ available: available(), running: !!proc, lastError });

module.exports = { available, prepare, transcribeWav, stop, status, respell };
