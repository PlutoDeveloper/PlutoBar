"use strict";
// Controls the real Music app with AppleScript, so what VoiceOS plays shows
// up (and stays in sync) in Music, Control Center and the menu bar. Plays
// anything in the user's library: songs, albums, artists, playlists.
// Catalog songs that aren't in the library go through the Apple Music
// connector, which plays inside VoiceOS; the two never play at once.

const { execFile } = require("node:child_process");

let hooks = {}; // { pauseVoiceOSPlayer }
const setHooks = (h) => (hooks = h || {});

function osascript(script, timeout = 15_000) {
  return new Promise((resolve, reject) =>
    execFile("/usr/bin/osascript", ["-e", script], { timeout }, (err, stdout, stderr) => {
      if (err) {
        const msg = String(stderr || err.message);
        if (/-1743|not authori[sz]ed/i.test(msg)) return reject(new Error("VoiceOS isn't allowed to control Music. Allow it in System Settings → Privacy & Security → Automation."));
        return reject(new Error(msg.replace(/^.*execution error: /s, "").trim().slice(0, 300)));
      }
      resolve(String(stdout).trim());
    }),
  );
}

const q = (s) => '"' + String(s ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';

const NOW_PLAYING = `
tell application "Music"
  if player state is stopped then return "state=stopped"
  set t to current track
  return "state=" & (player state as text) & linefeed & "title=" & (name of t) & linefeed & "artist=" & (artist of t) & linefeed & "album=" & (album of t) & linefeed & "shuffle=" & (shuffle enabled as text) & linefeed & "volume=" & (sound volume as text)
end tell`;

function parse(out) {
  return Object.fromEntries(
    out
      .split("\n")
      .map((l) => l.split(/=(.*)/s))
      .filter((p) => p.length > 1)
      .map(([k, v]) => [k, v]),
  );
}

async function nowPlaying() {
  const running = await osascript('application "Music" is running');
  if (running !== "true") return { state: "not running" };
  return parse(await osascript(NOW_PLAYING));
}

// Plays the best library match. kind: song | album | artist | playlist | any
async function play({ query, kind = "any", shuffle }) {
  const text = q(query);
  const tries = {
    playlist: `set p to (first playlist whose name is ${text})
      play p
      return "playlist=" & name of p`,
    playlist_fuzzy: `set p to (first user playlist whose name contains ${text})
      play p
      return "playlist=" & name of p`,
    song: `set r to (search library playlist 1 for ${text} only songs)
      if r is {} then error "none"
      play item 1 of r
      return "song=" & name of item 1 of r`,
    album: `set r to (every track of library playlist 1 whose album contains ${text})
      if r is {} then error "none"
      play item 1 of r
      return "album=" & album of item 1 of r`,
    artist: `set r to (every track of library playlist 1 whose artist contains ${text})
      if r is {} then error "none"
      play some item of r
      return "artist=" & artist of item 1 of r`,
  };
  const order =
    kind === "playlist" ? ["playlist", "playlist_fuzzy"] : kind === "song" ? ["song"] : kind === "album" ? ["album", "song"] : kind === "artist" ? ["artist", "song"] : ["playlist", "playlist_fuzzy", "song", "artist", "album"];
  await hooks.pauseVoiceOSPlayer?.();
  for (const k of order) {
    try {
      const res = await osascript(`tell application "Music"
        ${shuffle === undefined ? "" : "set shuffle enabled to " + !!shuffle}
        ${tries[k]}
      end tell`);
      // Music reports "stopped" for a moment after starting a playlist.
      let now = await nowPlaying();
      for (let i = 0; i < 6 && now.state !== "playing"; i++) {
        await new Promise((r) => setTimeout(r, 300));
        now = await nowPlaying();
      }
      return { ok: true, matched: res, now_playing: now };
    } catch (err) {
      if (/VoiceOS isn't allowed/.test(err.message)) throw err;
    }
  }
  return { ok: false, message: "Nothing matching '" + query + "' is in the user's Music library. For a song that isn't in the library, use the Apple Music connector's search and play tools." };
}

async function pauseMusicApp() {
  try {
    await osascript('if application "Music" is running then tell application "Music" to pause', 5000);
  } catch {}
}

async function control({ action, value }) {
  const cmds = {
    pause: "pause",
    resume: "play",
    toggle: "playpause",
    next: "next track",
    previous: "previous track",
    shuffle_on: "set shuffle enabled to true",
    shuffle_off: "set shuffle enabled to false",
    volume: "set sound volume to " + Math.max(0, Math.min(100, Math.round(Number(value) || 50))),
    favorite: "set favorited of current track to true",
  };
  if (!cmds[action]) throw new Error("Unknown action: " + action);
  if (action === "resume") await hooks.pauseVoiceOSPlayer?.();
  await osascript('tell application "Music" to ' + cmds[action]);
  return { ok: true, now_playing: await nowPlaying() };
}

const TOOL = {
  name: "music_app",
  label: "Using Music",
  description:
    "Control the Music app on this Mac, so playback shows and stays in sync there. Use FIRST for anything in the user's library: their playlists (e.g. 'Favourite Songs'), songs, albums or artists they have, plus pause/resume/next/previous/shuffle/volume/favorite of what Music is playing and 'what's playing'. If play reports the item isn't in the library, fall back to the Apple Music connector for catalog songs.",
  schema: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["play", "now_playing", "pause", "resume", "toggle", "next", "previous", "shuffle_on", "shuffle_off", "volume", "favorite"] },
      query: { type: "string", description: "For play: song, album, artist or playlist name." },
      kind: { type: "string", enum: ["any", "song", "album", "artist", "playlist"], description: "For play (default any)." },
      shuffle: { type: "boolean", description: "For play: shuffle on/off." },
      value: { type: "number", description: "For volume: 0-100 (the Music app's own volume)." },
    },
    required: ["action"],
  },
};

async function run(args = {}) {
  const result = args.action === "play" ? await play(args) : args.action === "now_playing" ? await nowPlaying() : await control(args);
  return { content: JSON.stringify(result) };
}

module.exports = { TOOL, run, setHooks, nowPlaying, pauseMusicApp };
