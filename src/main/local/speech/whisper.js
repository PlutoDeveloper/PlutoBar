"use strict";
// On-device speech-to-text: a warm whisper.cpp server (Metal GPU) bound to
// 127.0.0.1, fed 16 kHz WAV per utterance.

const fs = require("node:fs");
const os = require("node:os");
const net = require("node:net");
const path = require("node:path");
const { spawn } = require("node:child_process");
const electron = require("electron");
const { WHISPER_MODELS, whisperModelPath, isWhisperModelReady } = require("./models");

const log = require("../log");
const READY_TIMEOUT_MS = 90_000;
// Names Whisper tends to mishear; seeded into every prompt.
const BASE_VOCABULARY = ["PlutoBar", "Pluto", "VoiceOS", "Claude", "Claude Code", "Codex", "ChatGPT", "Gemini"];

let proc = null;
let port = null;
let modelId = null;
let readyPromise = null;
let lastError = null;
let restarts = 0;

function binaryPath() {
  const candidates = electron.app.isPackaged
    ? [path.join(process.resourcesPath, "binaries", "whisper-server")]
    : [path.join(__dirname, "../../../../resources/bin/whisper-server")];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port: p } = srv.address();
      srv.close(() => resolve(p));
    });
  });
}

async function waitUntilReady(p, child) {
  const started = Date.now();
  while (Date.now() - started < READY_TIMEOUT_MS) {
    if (child.exitCode !== null) throw new Error("whisper-server exited during startup (code " + child.exitCode + ")");
    try {
      const res = await fetch("http://127.0.0.1:" + p + "/", { signal: AbortSignal.timeout(1000) });
      if (res.ok || res.status === 404) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("whisper-server did not become ready in time");
}

// Starts (or reuses) the server for `id`. Resolves once the model is loaded.
function ensureStarted(id) {
  if (proc && modelId === id && readyPromise) return readyPromise;
  stop();
  if (!isWhisperModelReady(id)) return Promise.reject(new Error("Whisper model " + id + " is not downloaded"));
  const bin = binaryPath();
  if (!bin) return Promise.reject(new Error("whisper-server binary is missing (run scripts/build-whisper.sh)"));
  modelId = id;
  readyPromise = (async () => {
    port = await freePort();
    const threads = Math.max(2, Math.min(8, os.cpus().length - 2));
    const child = spawn(
      bin,
      ["-m", whisperModelPath(id), "--host", "127.0.0.1", "--port", String(port), "-t", String(threads), "-l", "auto", "-nt", "-sns", "-fa"],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    proc = child;
    let stderrTail = "";
    child.stderr.on("data", (d) => (stderrTail = (stderrTail + d).slice(-4000)));
    child.on("exit", (code, signal) => {
      if (proc !== child) return;
      log.warn("[LocalSTT] whisper-server exited (" + (signal || code) + ")");
      proc = null;
      readyPromise = null;
      lastError = "whisper-server exited: " + stderrTail.split("\n").slice(-3).join(" ");
    });
    const t0 = Date.now();
    await waitUntilReady(port, child);
    lastError = null;
    log.info("[LocalSTT] whisper-server ready (" + WHISPER_MODELS[id].label + ") in " + (Date.now() - t0) + "ms on port " + port);
  })().catch((err) => {
    lastError = err.message;
    stop();
    throw err;
  });
  return readyPromise;
}

async function transcribeWav(wav, { id, language, vocabulary = [], signal } = {}) {
  await ensureStarted(id);
  const form = new FormData();
  form.append("file", new Blob([wav], { type: "audio/wav" }), "speech.wav");
  form.append("response_format", "json");
  form.append("temperature", "0");
  form.append("language", language || "auto");
  const words = [...new Set([...BASE_VOCABULARY, ...vocabulary])].slice(0, 80);
  form.append("prompt", words.join(", ") + ".");
  let res;
  try {
    res = await fetch("http://127.0.0.1:" + port + "/inference", { method: "POST", body: form, signal });
  } catch (err) {
    // A crashed/restarted sidecar: retry once on a fresh process.
    if (signal?.aborted || restarts > 3) throw err;
    restarts++;
    stop();
    await ensureStarted(id);
    res = await fetch("http://127.0.0.1:" + port + "/inference", { method: "POST", body: form, signal });
  }
  if (!res.ok) throw new Error("Local transcription failed: HTTP " + res.status + " " + (await res.text()).slice(0, 200));
  const json = await res.json();
  if (json.error) throw new Error("Local transcription failed: " + json.error);
  restarts = 0;
  return cleanTranscript(json.text || "");
}

// whisper-server returns one line per segment; also drop bracketed
// non-speech annotations and prompt echoes.
function cleanTranscript(text) {
  const out = String(text)
    .replace(/\s*\n\s*/g, " ")
    .replace(/\[(?:BLANK_AUDIO|MUSIC|Music|music|NOISE|noise|silence|SILENCE|inaudible)[^\]]*\]/g, "")
    .replace(/\((?:music|silence|inaudible)\)/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return /^[.,!?…\s]*$/.test(out) ? "" : out;
}

function stop() {
  const child = proc;
  proc = null;
  readyPromise = null;
  port = null;
  if (child && child.exitCode === null) child.kill("SIGTERM");
}

function status() {
  return { running: !!proc, modelId, lastError, binary: !!binaryPath() };
}

electron.app.on("will-quit", stop);

module.exports = { ensureStarted, transcribeWav, stop, status, cleanTranscript };
