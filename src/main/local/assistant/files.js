"use strict";
// search_files: the user's own files, found by what's in them, through the
// built-in on-device index (DigUp's engine: see ../plutobar/digup.js). Photos by what they show, PDFs at
// the page, documents at the passage, recordings and videos at the moment,
// code ("code: …") at the function. Read-only: it never changes a file.

const path = require("node:path");
const electron = require("electron");
const digup = require("../plutobar/digup");

const TOOL = {
  name: "search_files",
  label: "Searching your files",
  description:
    "Search the user's own files on this Mac by what's in them, not just their names: photos and screenshots (by what they show and the text in them), PDFs (by page), documents, PowerPoint decks (by slide), recordings and videos (by moment), and, with a query starting 'code:', their code projects. Use it whenever the user refers to something in their files ('the lease', 'that screenshot with the payment error', 'the podcast where they talk about sleep', 'my notes on X'). Describe what to find in plain words. Returns the best matches with path, kind, page/moment and an excerpt; read=true adds the matched passage's text so you can answer from it. To open one for the user at its page or moment, call again with open_path (and at).",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to find, described in words ('a dog on the beach', 'invoice from March', 'code: retry with backoff')." },
      kinds: { type: "array", items: { type: "string", enum: ["screenshot", "image", "pdf", "doc", "audio", "video"] }, description: "Only these kinds of files." },
      limit: { type: "number", description: "How many matches (default 6, max 20)." },
      read: { type: "boolean", description: "Include the text of the matched passage for the top 3 matches." },
      open_path: { type: "string", description: "Instead of searching, open this file (a path from a previous result)." },
      at: { type: "number", description: "With open_path: the moment in seconds for audio/video." },
    },
  },
};

async function run(args = {}) {
  if (args.open_path) {
    const p = String(args.open_path);
    const at = Number(args.at);
    const kind = /\.(mp4|mov|m4v|avi|mkv|webm)$/i.test(p) ? "video" : /\.(mp3|m4a|wav|aiff?|flac|aac|ogg)$/i.test(p) ? "audio" : "file";
    digup.openHit({ path: p, kind, loc: Number.isFinite(at) ? at : undefined }, { shell: electron.shell });
    return { content: JSON.stringify({ ok: true, opened: p }) };
  }
  const query = String(args.query || "").trim();
  if (!query) throw new Error("Pass query: what to find.");
  if (!digup.available())
    return { content: "File search isn't set up yet (no folders indexed), so files can't be searched by content. Tell the user to choose folders in Settings → PlutoBar; meanwhile use the finder_ actions in app_tool to look by name." };
  const code = /^code:/i.test(query);
  const words = code ? query.replace(/^code:\s*/i, "") : query;
  const limit = Math.min(Math.max(Number(args.limit) || 6, 1), 20);
  const reply = await digup.service.search(words, { meaning: true, code, kinds: args.kinds, limit: Math.max(limit, 10) });
  const hits = digup.strongHits(reply).slice(0, limit);
  const results = [];
  for (const [i, hit] of hits.entries()) {
    const row = { path: hit.path, name: path.basename(hit.path), kind: hit.kind, where: digup.where(hit) || undefined, excerpt: hit.excerpt?.replace(/[«»]/g, "") || undefined };
    if (Number.isFinite(hit.loc) && (hit.kind === "audio" || hit.kind === "video")) row.at_seconds = Math.floor(hit.loc);
    if (args.read && i < 3) row.text = (await digup.service.text(hit.segment_id, code).catch(() => "")).slice(0, 3000) || undefined;
    results.push(row);
  }
  return {
    content: JSON.stringify({
      query,
      searched: reply.meaning ? "meaning and exact words" : "exact words only (the search model is still downloading)",
      results,
      ...(results.length ? {} : { note: "Nothing in the searched folders matched. The user chooses those folders in Settings → PlutoBar." }),
    }),
  };
}

module.exports = { TOOL, run };
