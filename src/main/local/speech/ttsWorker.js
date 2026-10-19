"use strict";
// Worker thread: runs Kokoro-82M (ONNX) off the Electron main thread.
const { parentPort } = require("node:worker_threads");

let tts = null;
let loading = null;
const cancelled = new Set();

async function init({ cacheDir, repo, dtype }) {
  if (tts) return;
  loading ??= (async () => {
    const { env } = require("@huggingface/transformers");
    const { KokoroTTS } = require("kokoro-js");
    env.cacheDir = cacheDir;
    env.allowLocalModels = true;
    tts = await KokoroTTS.from_pretrained(repo, {
      dtype,
      device: "cpu",
      progress_callback: (p) => {
        if (p.status === "progress" && p.file?.endsWith(".onnx"))
          parentPort.postMessage({ type: "progress", loaded: p.loaded, total: p.total });
      },
    });
  })();
  await loading;
}

async function speak({ id, text, voice, speed }) {
  if (cancelled.has(id)) return;
  const audio = await tts.generate(text, { voice, speed });
  if (cancelled.has(id)) return;
  const f32 = audio.audio;
  const pcm = new Int16Array(f32.length);
  for (let i = 0; i < f32.length; i++) {
    const s = Math.max(-1, Math.min(1, f32[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  parentPort.postMessage({ type: "chunk", id, sampleRate: audio.sampling_rate, pcm: pcm.buffer }, [pcm.buffer]);
}

parentPort.on("message", async (msg) => {
  try {
    if (msg.type === "init") {
      await init(msg);
      parentPort.postMessage({ type: "ready", voices: Object.keys(tts.voices || {}) });
    } else if (msg.type === "speak") {
      await init(msg.init);
      await speak(msg);
      parentPort.postMessage({ type: "done", id: msg.id });
    } else if (msg.type === "cancel") {
      cancelled.add(msg.id);
      if (cancelled.size > 200) cancelled.delete(cancelled.values().next().value);
    }
  } catch (err) {
    parentPort.postMessage({ type: "error", id: msg.id, message: err?.message || String(err) });
  }
});
