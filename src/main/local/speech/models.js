"use strict";
// On-device model catalog + resumable downloader (Hugging Face).

const fs = require("node:fs");
const path = require("node:path");
const electron = require("electron");

const WHISPER_MODELS = {
  "large-v3-turbo-q5_0": {
    id: "large-v3-turbo-q5_0",
    label: "Whisper large-v3 turbo",
    detail: "Best accuracy, 99 languages · about a second per sentence on Apple Silicon",
    file: "ggml-large-v3-turbo-q5_0.bin",
    bytes: 574041195,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin",
  },
  "small-q5_1": {
    id: "small-q5_1",
    label: "Whisper small",
    detail: "Balanced · lower memory",
    file: "ggml-small-q5_1.bin",
    bytes: 190085487,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin",
  },
  "base-q5_1": {
    id: "base-q5_1",
    label: "Whisper base",
    detail: "Fastest and smallest · lower accuracy",
    file: "ggml-base-q5_1.bin",
    bytes: 59707625,
    url: "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base-q5_1.bin",
  },
};
const DEFAULT_WHISPER_MODEL = "large-v3-turbo-q5_0";

// Kokoro-82M (Apache-2.0) through transformers.js; fp16 is the fastest
// variant on Apple Silicon CPUs (int8 dequantisation is slower on ARM).
const KOKORO = {
  repo: "onnx-community/Kokoro-82M-v1.0-ONNX",
  dtype: "fp16",
  bytes: 170_000_000,
};

// The app's five Agent voices (picked on the Agent page) → Kokoro voices.
const AGENT_VOICES = {
  "gemini-live-zephyr": "af_heart", // Sky — warm and friendly
  "gemini-live-umbriel": "af_bella", // Dawn — energetic
  "gemini-live-laomedeia": "bf_emma", // Dusk — smooth, British
  "gemini-live-midnight": "am_michael", // Midnight — deep and steady
  "xai-leo": "bm_george", // Jarvis — British butler
};
const JARVIS_VOICE_ID = "xai-leo";

// The app's speed presets (0.85 slow / 1.2 normal / 2 fast) were tuned for
// cloud voices. Kokoro stays clear up to about 1.5x.
function kokoroSpeed(appSpeed) {
  const n = Number(appSpeed);
  if (!Number.isFinite(n)) return 1.15;
  return n <= 0.9 ? 0.95 : n >= 1.8 ? 1.5 : 1.15;
}

function modelsDir() {
  const dir = path.join(electron.app.getPath("userData"), "models");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function whisperModelPath(id) {
  return path.join(modelsDir(), WHISPER_MODELS[id].file);
}

function isWhisperModelReady(id) {
  const m = WHISPER_MODELS[id];
  if (!m) return false;
  try {
    return fs.statSync(whisperModelPath(id)).size === m.bytes;
  } catch {
    return false;
  }
}

const activeDownloads = new Map();

// Streams `url` to `dest` via a .part file, resuming if one exists.
function downloadFile({ key, url, dest, bytes, onProgress }) {
  if (activeDownloads.has(key)) return activeDownloads.get(key).promise;
  const controller = new AbortController();
  const promise = (async () => {
    const part = dest + ".part";
    let have = 0;
    try {
      have = fs.statSync(part).size;
    } catch {}
    const res = await fetch(url, {
      headers: have ? { Range: "bytes=" + have + "-" } : {},
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok && res.status !== 206) throw new Error("Download failed: HTTP " + res.status);
    if (res.status === 200) have = 0; // server ignored the range
    const total = bytes || have + Number(res.headers.get("content-length") || 0);
    const out = fs.createWriteStream(part, { flags: have ? "a" : "w" });
    let done = have;
    let lastEmit = 0;
    try {
      for await (const chunk of res.body) {
        if (!out.write(chunk)) await new Promise((r) => out.once("drain", r));
        done += chunk.length;
        const now = Date.now();
        if (now - lastEmit > 250) {
          lastEmit = now;
          onProgress?.({ received: done, total });
        }
      }
    } finally {
      await new Promise((r) => out.end(r));
    }
    if (bytes && fs.statSync(part).size !== bytes) {
      fs.rmSync(part, { force: true });
      throw new Error("Downloaded file is incomplete; please retry.");
    }
    fs.renameSync(part, dest);
    onProgress?.({ received: total, total, done: true });
    return dest;
  })().finally(() => activeDownloads.delete(key));
  activeDownloads.set(key, { promise, controller });
  return promise;
}

function cancelDownload(key) {
  activeDownloads.get(key)?.controller.abort();
}

function isDownloading(key) {
  return activeDownloads.has(key);
}

module.exports = {
  WHISPER_MODELS,
  DEFAULT_WHISPER_MODEL,
  KOKORO,
  AGENT_VOICES,
  JARVIS_VOICE_ID,
  kokoroSpeed,
  modelsDir,
  whisperModelPath,
  isWhisperModelReady,
  downloadFile,
  cancelDownload,
  isDownloading,
};
