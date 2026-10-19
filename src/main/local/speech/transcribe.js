"use strict";
// Speech-to-text, fully on-device: 16-bit PCM → WAV → whisper.cpp (Metal).

const whisper = require("./whisper");
const { isWhisperModelReady } = require("./models");

const log = require("../log");
const MIN_SPEECH_MS = 250;
// Peak amplitude (of 32767) below which audio counts as silence — keeps
// Whisper from hallucinating "Thanks for watching!" on empty input.
const SILENCE_PEAK = 350;

class SpeechError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function pcm16ToWav(pcm, sampleRate = 16000) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function analyzePcm(pcm, sampleRate) {
  const samples = Math.floor(pcm.length / 2);
  let peak = 0;
  for (let i = 0; i < samples; i += 4) {
    const v = Math.abs(pcm.readInt16LE(i * 2));
    if (v > peak) peak = v;
  }
  return { durationMs: (samples / sampleRate) * 1000, peak };
}

// `language`: ISO-639-1 code when exactly one language is enabled, else
// auto-detect. `vocabulary` biases spelling of names and jargon.
async function transcribe({ pcm, sampleRate = 16000, model, language, vocabulary = [], signal }) {
  const { durationMs, peak } = analyzePcm(pcm, sampleRate);
  if (durationMs < MIN_SPEECH_MS) throw new SpeechError("CLIENT_AUDIO_TOO_SHORT", "Audio too short");
  if (peak < SILENCE_PEAK) throw new SpeechError("CLIENT_NO_SPEECH_DETECTED", "No speech detected");
  if (!isWhisperModelReady(model))
    throw new SpeechError("LOCAL_STT_NOT_CONFIGURED", "The speech model isn't downloaded yet. Download it from the Dashboard or Settings → Speech.");

  const started = Date.now();
  let text;
  try {
    text = await whisper.transcribeWav(pcm16ToWav(pcm, sampleRate), { id: model, language, vocabulary, signal });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new SpeechError("LOCAL_STT_FAILED", err.message);
  }
  log.info("[Speech] transcribed " + Math.round(durationMs) + "ms of audio in " + (Date.now() - started) + "ms");
  if (!text) throw new SpeechError("CLIENT_NO_SPEECH_DETECTED", "No speech detected");
  return text;
}

module.exports = { transcribe, pcm16ToWav, SpeechError };
