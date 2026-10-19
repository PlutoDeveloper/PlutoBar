"use strict";
// On-device "Light" dictation polish: instant, no Claude call. Whisper
// already punctuates and capitalizes, so this drops filler sounds and
// stutters and applies the app's writing style. ("Polished" uses Claude.)

const FILLERS = /(,\s*)?\b(?:u+m+|u+h+m*|e+r+m+|e+r+|a+h+|h+m+|mm+)\b[,.]?/gi;

function tidyTranscript(text, structure = {}) {
  let out = String(text || "")
    .replace(FILLERS, "")
    .replace(/\b(\w+)(?:,?\s+\1\b)+/gi, "$1") // "so so" → "so"
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])(?:\s*,)+/g, "$1")
    .replace(/^[\s,]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (out) out = out.charAt(0).toUpperCase() + out.slice(1);
  if (structure.capitalization === "never" || structure.capitalization === "lowercase") out = out.toLowerCase();
  if (structure.sentenceEndings === "none" || structure.sentenceEndings === "casual") out = out.replace(/\.$/, "");
  if (structure.exclamation === "off") out = out.replace(/!/g, ".");
  return out;
}

module.exports = { tidyTranscript };
