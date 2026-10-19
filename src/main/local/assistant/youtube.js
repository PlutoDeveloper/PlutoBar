"use strict";
// YouTube search without an API key: reads the public results page and
// returns videos (or live streams) with their ids, so "play the latest
// MKBHD video" opens that video instead of the search page.

const LIVE_FILTER = "EgJAAQ%3D%3D"; // YouTube's "Live" search filter
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";

const text = (t) => t?.simpleText || (t?.runs || []).map((r) => r.text).join("") || "";

async function search(query, { live = false, limit = 5, signal } = {}) {
  const url = "https://www.youtube.com/results?search_query=" + encodeURIComponent(query) + (live ? "&sp=" + LIVE_FILTER : "");
  const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" }, signal });
  if (!res.ok) throw new Error("YouTube search failed (" + res.status + ")");
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) throw new Error("YouTube returned an unexpected page");
  const videos = [];
  (function walk(o) {
    if (!o || typeof o !== "object" || videos.length >= limit) return;
    const v = o.videoRenderer;
    if (v?.videoId) {
      const isLive = (v.badges || []).some((b) => /LIVE/.test(b.metadataBadgeRenderer?.style || "")) || /watching/i.test(text(v.viewCountText));
      videos.push({
        title: text(v.title),
        channel: text(v.ownerText),
        published: text(v.publishedTimeText) || undefined,
        length: text(v.lengthText) || undefined,
        live: isLive || undefined,
        url: "https://www.youtube.com/watch?v=" + v.videoId,
      });
      return;
    }
    for (const k in o) walk(o[k]);
  })(JSON.parse(m[1]));
  return videos;
}

// Moves results from the named channel to the front. Matches the name or
// its initials ("TVK" → "Tamilaga Vettri Kazhagam", "MKBHD" → "Marques Brownlee").
const ALIASES = { mkbhd: "marques brownlee" };
function channelMatches(name, channel) {
  const want = String(channel || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (!want) return false;
  const target = (ALIASES[want.replace(/ /g, "")] || want).replace(/ /g, "");
  const n = String(name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");
  const initials = n.split(/\s+/).map((w) => w[0]).join("");
  return n.replace(/ /g, "").includes(target) || initials === target;
}

function preferChannel(videos, channel) {
  if (!channel) return videos;
  const seen = new Set();
  const unique = videos.filter((v) => !seen.has(v.url) && seen.add(v.url));
  return [...unique.filter((v) => channelMatches(v.channel, channel)), ...unique.filter((v) => !channelMatches(v.channel, channel))];
}

const TOOL = {
  name: "youtube_play",
  description:
    "Find a YouTube video or live stream and play it in the browser. Use for any 'play/watch/put on … on YouTube' request (a creator's latest video, a song, a live stream, a topic). Searches YouTube with `query`, opens the best match directly (not the search page) and returns what's playing plus other matches. Set live=true for live streams. Use open=false to only list results (e.g. 'what did MKBHD post today?').",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to search for, e.g. 'MKBHD', 'TVK live', 'lofi hip hop radio'. Add 'latest' only if the user wants the newest upload." },
      live: { type: "boolean", description: "Only live streams happening now." },
      channel: { type: "string", description: "The creator/channel the user named, if any (e.g. 'MKBHD', 'TVK'). Results from that channel are preferred." },
      pick: { type: "integer", description: "Which result to open, 1 = best match (default). Use after listing if the user chose another one." },
      open: { type: "boolean", description: "Open the chosen video (default true)." },
    },
    required: ["query"],
  },
};

// `openUrl(url)` opens the page in the user's browser.
async function run(args, { openUrl, signal } = {}) {
  let videos = preferChannel(await search(String(args.query || ""), { live: !!args.live, limit: 8, signal }), args.channel);
  // Named channel not among the results: search for the channel itself.
  if (args.channel && !videos.some((v) => channelMatches(v.channel, args.channel)))
    videos = preferChannel([...(await search(String(args.channel), { live: !!args.live, limit: 8, signal })), ...videos], args.channel);
  if (!videos.length) return { content: JSON.stringify({ ok: false, message: "No " + (args.live ? "live streams" : "videos") + " found for '" + args.query + "'." }) };
  const index = Math.min(Math.max((args.pick || 1) - 1, 0), videos.length - 1);
  const chosen = videos[index];
  if (args.open !== false) await openUrl(chosen.url);
  return { content: JSON.stringify({ ok: true, opened: args.open !== false ? chosen : null, results: videos }) };
}

module.exports = { TOOL, run, search, preferChannel };
