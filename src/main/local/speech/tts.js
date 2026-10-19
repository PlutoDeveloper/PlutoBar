"use strict";
// On-device text-to-speech (Kokoro-82M) + spoken agent replies.
//
// Agent reply text is split into sentences as it streams; the first couple of
// sentences are synthesized in a worker thread and streamed to the notch's
// PCM voice player as `audio/pcm;rate=24000` chunks, JARVIS-style.

const fs = require("node:fs");
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { KOKORO, modelsDir } = require("./models");

const log = require("../log");
const MAX_SPOKEN_CHARS = 320;
const MAX_SPOKEN_SENTENCES = 3;
// Kokoro generates a whole chunk before any of it plays (about a quarter of
// the chunk's spoken length), so the reply's opening clause goes out on its
// own: speech starts about a second sooner and the rest is ready before the
// clause has finished playing.
const FIRST_CLAUSE_MIN = 18;
const FIRST_CLAUSE_MAX = 70;

let worker = null;
let ready = false;
let readyPromise = null;
let lastError = null;
let progress = null;
let nextJob = 1;
const jobs = new Map();
const listeners = new Set();

function cacheDir() {
  return path.join(modelsDir(), "hf");
}

function isModelDownloaded() {
  const onnx = path.join(cacheDir(), KOKORO.repo, "onnx", KOKORO.dtype === "fp32" ? "model.onnx" : "model_" + KOKORO.dtype + ".onnx");
  try {
    return fs.statSync(onnx).size > 1_000_000;
  } catch {
    return false;
  }
}

function initMessage() {
  return { cacheDir: cacheDir(), repo: KOKORO.repo, dtype: KOKORO.dtype };
}

function emit() {
  const s = status();
  for (const fn of listeners) fn(s);
}

function spawnWorker() {
  if (worker) return worker;
  worker = new Worker(path.join(__dirname, "ttsWorker.js"));
  worker.on("message", (msg) => {
    if (msg.type === "progress") {
      progress = { received: msg.loaded, total: msg.total };
      emit();
    } else if (msg.type === "ready") {
      ready = true;
      progress = null;
      emit();
    } else {
      const job = jobs.get(msg.id);
      if (!job) return;
      if (msg.type === "chunk") job.onChunk(Buffer.from(msg.pcm), msg.sampleRate);
      else if (msg.type === "done") (jobs.delete(msg.id), job.resolve());
      else if (msg.type === "error") (jobs.delete(msg.id), job.reject(new Error(msg.message)));
    }
  });
  worker.on("error", (err) => {
    lastError = err.message;
    log.error("[LocalTTS] worker error:", err);
  });
  worker.on("exit", () => {
    worker = null;
    ready = false;
    readyPromise = null;
    for (const job of jobs.values()) job.reject(new Error("TTS worker exited"));
    jobs.clear();
    emit();
  });
  return worker;
}

// Loads (downloading on first use) the Kokoro model.
function ensureReady() {
  if (ready) return Promise.resolve();
  readyPromise ??= new Promise((resolve, reject) => {
    const w = spawnWorker();
    const onMsg = (msg) => {
      if (msg.type === "ready") (w.off("message", onMsg), resolve());
      else if (msg.type === "error" && msg.id === undefined) (w.off("message", onMsg), reject(new Error(msg.message)));
    };
    w.on("message", onMsg);
    w.postMessage({ type: "init", ...initMessage() });
  }).catch((err) => {
    lastError = err.message;
    readyPromise = null;
    emit();
    throw err;
  });
  return readyPromise;
}

function synthesize(text, { voice, speed = 1, onChunk }) {
  const id = nextJob++;
  const promise = new Promise((resolve, reject) => {
    jobs.set(id, { resolve, reject, onChunk });
    spawnWorker().postMessage({ type: "speak", id, text, voice, speed, init: initMessage() });
  });
  return { id, promise, cancel: () => worker?.postMessage({ type: "cancel", id }) };
}

function status() {
  return { downloaded: isModelDownloaded(), ready, loading: !!readyPromise && !ready, progress, lastError };
}

function onStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function stop() {
  worker?.terminate();
}

// ------------------------------------------------------------ spoken replies

// Turns markdown-ish assistant text into something worth saying aloud.
function speakable(text) {
  return String(text)
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s{0,3}(#{1,6}|[-*•]|\d+[.)])\s+/gm, "")
    .replace(/[*_~|>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Complete sentences at the head of `text` (the tail may still be streaming).
function completeSentences(text, final) {
  const out = [];
  const re = /[^.!?。！？\n]+(?:[.!?。！？]+["')\]]*|\n+)/g;
  let m;
  let consumed = 0;
  while ((m = re.exec(text))) {
    out.push(m[0].trim());
    consumed = re.lastIndex;
  }
  if (final && consumed < text.length && text.slice(consumed).trim()) out.push(text.slice(consumed).trim());
  return out.filter((s) => /[\p{L}\p{N}]/u.test(s));
}

// Where the opening clause of `text` ends (after ", " / "; " / ": " / " — "),
// or 0 when there is no good place to cut yet.
function firstClauseEnd(text) {
  const re = /[,;:]\s|\s[—–-]\s/g;
  let m;
  while ((m = re.exec(text))) {
    const end = m.index + (/^[,;:]/.test(m[0]) ? 1 : 0);
    if (end < FIRST_CLAUSE_MIN) continue;
    if (end > FIRST_CLAUSE_MAX) return 0;
    if (/\d$/.test(text.slice(0, m.index)) && /^\d/.test(text.slice(re.lastIndex))) continue; // "3, 4"
    return end;
  }
  return 0;
}

// One per agent turn. Feed it the cumulative reply text; it speaks the first
// few sentences as soon as each one is complete.
class SpokenReply {
  constructor({ send, voice, speed, stage = "reply" }) {
    this.send = send;
    this.voice = voice;
    this.speed = speed;
    this.stage = stage;
    this.lineId = SpokenReply.nextLine++;
    this.spoken = 0;
    this.chars = 0;
    this.queue = Promise.resolve();
    this.jobs = [];
    this.cancelled = false;
    this.started = false;
    this.skip = 0; // characters already spoken as the opening clause
  }

  update(fullText, final = false) {
    if (this.cancelled) return;
    let text = speakable(fullText);
    if (this.spoken === 0 && this.skip === 0) {
      // Don't wait for the first full stop if the sentence is long.
      const firstStop = text.search(/[.!?。！？\n]/);
      const end = firstClauseEnd(firstStop < 0 ? text : text.slice(0, firstStop));
      if (end && (firstStop < 0 || firstStop - end > 12)) {
        this.skip = end;
        this.chars += end;
        this.enqueue(text.slice(0, end).trim());
      }
    }
    text = text.slice(this.skip);
    const sentences = completeSentences(text, final);
    while (this.spoken < sentences.length && this.spoken < MAX_SPOKEN_SENTENCES && this.chars < MAX_SPOKEN_CHARS) {
      const sentence = sentences[this.spoken++];
      this.chars += sentence.length;
      this.enqueue(sentence);
    }
    if (final) this.finish();
  }

  enqueue(sentence) {
    this.queue = this.queue.then(async () => {
      if (this.cancelled) return;
      await ensureReady();
      const job = synthesize(sentence, {
        voice: this.voice,
        speed: this.speed,
        onChunk: (pcm) => {
          if (this.cancelled) return;
          this.started = true;
          this.send({
            stage: this.stage,
            text: sentence,
            audioBase64: pcm.toString("base64"),
            mimeType: "audio/pcm;rate=24000",
            isFinal: false,
            lineId: this.lineId,
          });
        },
      });
      this.jobs.push(job);
      await job.promise;
    }).catch((err) => {
      lastError = err.message;
      log.warn("[LocalTTS] speech failed:", err.message);
    });
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.queue = this.queue.then(() => {
      if (this.started && !this.cancelled)
        this.send({ stage: this.stage, text: "", audioBase64: "", mimeType: "audio/pcm;rate=24000", isFinal: true, lineId: this.lineId });
    });
  }

  cancel() {
    if (this.cancelled) return;
    this.cancelled = true;
    for (const job of this.jobs) job.cancel();
    if (this.started)
      this.send({ stage: this.stage, text: "", audioBase64: "", mimeType: "audio/pcm;rate=24000", isFinal: true, lineId: this.lineId });
  }
}
SpokenReply.nextLine = 10_000;

module.exports = { ensureReady, synthesize, status, onStatus, stop, isModelDownloaded, SpokenReply, speakable, completeSentences, firstClauseEnd };
