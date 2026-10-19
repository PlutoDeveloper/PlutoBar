"use strict";
// YouTube transcripts through yt-dlp (https://github.com/yt-dlp/yt-dlp), the
// same approach Agent Reach uses: one yt-dlp call for the video's info, then
// one caption track (the user's language, else the video's own) fetched and
// flattened to text with minute timestamps. No API key, no login.
//
// Dependency-free, so it also runs on its own:
//   node youtubeTranscript.js <url> [start_minute] [lang]

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

const MAX_CHARS = 28_000; // about 7k tokens per call
const CANDIDATES = [
  process.env.VOICEOS_YTDLP,
  path.join(os.homedir(), ".agent-reach-venv/bin/yt-dlp"),
  "/opt/homebrew/bin/yt-dlp",
  "/usr/local/bin/yt-dlp",
  path.join(os.homedir(), ".local/bin/yt-dlp"),
];

function ytDlpPath() {
  const found = CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!found) throw new Error("yt-dlp isn't installed, so transcripts aren't available. Install it with: brew install yt-dlp");
  return found;
}

function videoInfo(url, signal) {
  return new Promise((resolve, reject) =>
    execFile(ytDlpPath(), ["-J", "--skip-download", "--no-warnings", "--no-playlist", url], { timeout: 45_000, maxBuffer: 64 << 20, signal }, (err, stdout, stderr) => {
      if (err) {
        const msg = String(stderr || err.message);
        if (/Sign in to confirm|confirm you.re not a bot/i.test(msg)) return reject(new Error("YouTube is asking for a sign-in for this video, so its transcript can't be read."));
        if (/Private video|unavailable|has been removed/i.test(msg)) return reject(new Error("That video is private or unavailable."));
        return reject(new Error(msg.replace(/^ERROR:\s*/m, "").trim().slice(0, 300) || "yt-dlp failed"));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error("Couldn't read the video's details."));
      }
    }),
  );
}

// Picks one caption track: a human-written one in a wanted language, else the
// auto-generated track in the video's own language, else English.
function pickTrack(info, lang) {
  const wanted = [lang, "en", info.language].filter(Boolean).map((l) => String(l).toLowerCase());
  const usable = (tracks) => Object.keys(tracks || {}).filter((k) => k !== "live_chat" && (tracks[k] || []).some((f) => f.ext === "json3"));
  const match = (keys, want) => keys.find((k) => k.toLowerCase() === want) || keys.find((k) => k.toLowerCase().split("-")[0] === want);
  const manual = usable(info.subtitles);
  for (const w of wanted) {
    const k = match(manual, w);
    if (k) return { key: k, auto: false, formats: info.subtitles[k] };
  }
  const auto = usable(info.automatic_captions);
  const orig = auto.find((k) => k.endsWith("-orig"));
  const k = (lang && match(auto, String(lang).toLowerCase())) || orig || match(auto, "en") || manual[0] || auto[0];
  if (!k) return null;
  const from = manual.includes(k) ? info.subtitles : info.automatic_captions;
  return { key: k, auto: from === info.automatic_captions, formats: from[k] };
}

const clock = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(s % 60).padStart(2, "0");
};

// json3 events → "[m:ss] text" lines, one per minute of speech.
function flatten(json3, startSec) {
  const lines = [];
  let bucket = -1;
  let current = "";
  for (const ev of json3.events || []) {
    if (!ev.segs) continue;
    const t = (ev.tStartMs || 0) / 1000;
    if (t < startSec) continue;
    const text = ev.segs.map((s) => s.utf8 || "").join("").replace(/\s+/g, " ").trim();
    if (!text) continue;
    const minute = Math.floor(t / 60);
    if (minute !== bucket) {
      if (current) lines.push(current);
      bucket = minute;
      current = "[" + clock(t) + "] " + text;
    } else current += " " + text;
  }
  if (current) lines.push(current);
  return lines;
}

async function transcript({ url, start_minute, lang } = {}, { signal } = {}) {
  if (!url || !/youtu\.?be/i.test(String(url))) throw new Error("Pass a YouTube video URL.");
  const info = await videoInfo(String(url), signal);
  const meta = {
    title: info.title,
    channel: info.channel || info.uploader,
    duration: info.duration ? clock(info.duration) : undefined,
    uploaded: info.upload_date ? info.upload_date.replace(/(\d{4})(\d\d)(\d\d)/, "$1-$2-$3") : undefined,
    views: info.view_count,
    url: info.webpage_url || url,
    ...(info.chapters?.length ? { chapters: info.chapters.slice(0, 40).map((c) => clock(c.start_time) + " " + c.title) } : {}),
  };
  if (info.is_live) return { ...meta, note: "This is a live stream; it has no transcript yet." };
  const track = pickTrack(info, lang);
  if (!track) return { ...meta, description: String(info.description || "").slice(0, 1500), note: "This video has no captions, so there is no transcript. Only its description is available." };
  const res = await fetch(track.formats.find((f) => f.ext === "json3").url, { signal });
  if (!res.ok) throw new Error(res.status === 429 ? "YouTube is rate-limiting transcript requests right now. Try again in a minute." : "Couldn't download the captions (" + res.status + ").");
  const startSec = Math.max(0, Number(start_minute) || 0) * 60;
  const lines = flatten(await res.json(), startSec);
  let text = "";
  let next = null;
  for (const line of lines) {
    if (text.length + line.length > MAX_CHARS) {
      const m = line.match(/^\[(?:(\d+):)?(\d+):\d\d\]/);
      next = m ? Number(m[1] || 0) * 60 + Number(m[2]) : null;
      break;
    }
    text += (text ? "\n" : "") + line;
  }
  return {
    ...meta,
    captions: track.key + (track.auto ? " (auto-generated, may contain errors)" : ""),
    transcript: text || "(no speech in this part)",
    ...(next !== null ? { truncated: "The transcript continues. Call again with start_minute=" + next + " for the rest." } : {}),
  };
}

const TOOL = {
  name: "youtube_transcript",
  label: "Reading the video",
  description:
    "The transcript (captions with timestamps) plus title, channel, length and chapters of a YouTube video. Use it to summarize a video, answer questions about what was said, or find a moment in it. Pass the video's URL: the one the user gave, the page they're on, or one from youtube_play (open=false). Long videos come in parts; follow start_minute when the result says it continues.",
  schema: {
    type: "object",
    properties: {
      url: { type: "string", description: "YouTube video URL." },
      start_minute: { type: "number", description: "Start from this minute (default 0)." },
      lang: { type: "string", description: "Preferred caption language code, e.g. 'en' or 'ta' (default: English, else the video's language)." },
    },
    required: ["url"],
  },
};

async function run(args = {}, opts = {}) {
  return { content: JSON.stringify(await transcript(args, opts)) };
}

module.exports = { TOOL, run, transcript };

if (require.main === module) {
  const [url, start, lang] = process.argv.slice(2);
  transcript({ url, start_minute: start, lang }).then(
    (r) => {
      const { transcript: text, ...meta } = r;
      console.log(JSON.stringify(meta, null, 2));
      if (text) console.log("\n" + text);
    },
    (err) => {
      console.error("Error: " + err.message);
      process.exit(1);
    },
  );
}
