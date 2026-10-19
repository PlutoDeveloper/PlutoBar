"use strict";
// What PlutoBar can do besides finding things, like Spotlight's Actions:
// quick Mac controls, your own Shortcuts, a calculator, opening a website or
// searching the web. Anything bigger is a request for Pluto (the assistant).

const macSystem = require("../assistant/macSystem");
const log = require("../log");

// Built-in actions. `run(ctx)` gets { shell, ask, askVoice, openHistory, openSettings }.
const BUILT_IN = [
  { id: "voice", title: "Ask Pluto by Voice", symbol: "mic", words: "talk speak siri voice ask", run: (c) => c.askVoice() },
  { id: "dark", title: "Toggle Dark Mode", symbol: "circle.lefthalf.filled", words: "dark light appearance theme mode", run: () => system({ action: "dark_mode", value: "toggle" }) },
  { id: "lock", title: "Lock Screen", symbol: "lock", words: "lock away", run: () => system({ action: "lock_screen" }) },
  { id: "display", title: "Turn Off Display", symbol: "display", words: "sleep display screen off", run: () => system({ action: "sleep_display" }) },
  { id: "mute", title: "Mute", symbol: "speaker.slash", words: "mute silence sound volume", run: () => system({ action: "mute" }) },
  { id: "unmute", title: "Unmute", symbol: "speaker.wave.2", words: "unmute sound volume", run: () => system({ action: "unmute" }) },
  { id: "playpause", title: "Play or Pause Music", symbol: "playpause", words: "play pause music song resume stop", run: () => music("playpause") },
  { id: "next", title: "Next Track", symbol: "forward", words: "next skip track song music", run: () => music("next track") },
  { id: "screenshot", title: "Take Screenshot", symbol: "camera.viewfinder", words: "screenshot capture screen grab", run: (c) => c.shell.openPath("/System/Applications/Utilities/Screenshot.app") },
  { id: "history", title: "Pluto History", symbol: "clock.arrow.circlepath", words: "history conversations past chats", run: (c) => c.openHistory() },
  { id: "settings", title: "PlutoBar Settings", symbol: "gearshape", words: "settings preferences plutobar voiceos shortcut", run: (c) => c.openSettings() },
  { id: "digup", title: "Choose Folders to Search (DigUp)", symbol: "magnifyingglass", words: "digup index folders files search", run: (c) => c.openDigUp() },
];

function system(args) {
  return macSystem.run(args).catch((err) => log.warn("[PlutoBar] " + args.action + ": " + err.message));
}

function music(command) {
  return require("node:child_process").execFile("osascript", ["-e", 'tell application "Music" to ' + command], () => {});
}

// ---------------------------------------------------------- Shortcuts

let shortcuts = [];
let shortcutsAt = 0;

function refreshShortcuts() {
  if (Date.now() - shortcutsAt < 10 * 60_000) return;
  shortcutsAt = Date.now();
  macSystem
    .run({ action: "list_shortcuts" })
    .then((r) => (shortcuts = JSON.parse(r.content).shortcuts || []))
    .catch(() => {});
}

// ---------------------------------------------------------- matching

function matchScore(q, title, words = "") {
  if (!q) return 1;
  const t = title.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  const all = (t + " " + words).split(/\s+/);
  if (all.some((w) => w.startsWith(q))) return 70;
  const parts = q.split(/\s+/).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => all.some((w) => w.startsWith(p)))) return 60;
  return 0;
}

function match(query, limit = 4) {
  refreshShortcuts();
  const q = String(query || "").trim().toLowerCase();
  const items = [];
  for (const a of BUILT_IN) {
    const s = matchScore(q, a.title, a.words);
    if (s) items.push({ s, item: { id: "action:" + a.id, kind: "action", title: a.title, icon: { type: "symbol", name: a.symbol } } });
  }
  for (const name of shortcuts) {
    const s = matchScore(q, name);
    if (s) items.push({ s: s - 5, item: { id: "shortcut:" + name, kind: "action", title: name, subtitle: "Shortcut", icon: { type: "file", path: "/System/Applications/Shortcuts.app" } } });
  }
  items.sort((a, b) => b.s - a.s);
  return items.slice(0, q ? limit : 200).map((x) => x.item);
}

async function run(id, ctx) {
  if (id.startsWith("shortcut:")) return system({ action: "run_shortcut", name: id.slice("shortcut:".length) });
  const a = BUILT_IN.find((x) => "action:" + x.id === id);
  if (a) return a.run(ctx);
}

// ---------------------------------------------------------- calculator
// A small, safe arithmetic parser (never eval): + - × ÷ ^ %, parentheses,
// sqrt, and "x" as times. "12% of 80", "2^10", "(4+5)*3".

function calculate(input) {
  let s = String(input || "").trim().toLowerCase();
  if (!/\d/.test(s) || !/[-+*/^×÷x%]|sqrt|of/.test(s)) return null;
  s = s.replace(/×/g, "*").replace(/÷/g, "/").replace(/,/g, "").replace(/(\d)\s*x\s*(\d)/g, "$1*$2").replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*/g, "$1/100*");
  if (/[^0-9+\-*/^%().\s]/.test(s.replace(/sqrt/g, ""))) return null;
  let i = 0;
  const peek = () => s[i];
  const skip = () => {
    while (s[i] === " ") i++;
  };
  function expr() {
    let v = term();
    for (skip(); peek() === "+" || peek() === "-"; skip()) v = s[i++] === "+" ? v + term() : v - term();
    return v;
  }
  function term() {
    let v = power();
    for (skip(); peek() === "*" || peek() === "/" || peek() === "%"; skip()) {
      const op = s[i++];
      const r = power();
      v = op === "*" ? v * r : op === "/" ? v / r : v % r;
    }
    return v;
  }
  function power() {
    const b = unary();
    skip();
    if (peek() === "^") {
      i++;
      return Math.pow(b, power());
    }
    return b;
  }
  function unary() {
    skip();
    if (peek() === "-") return i++, -unary();
    if (peek() === "+") return i++, unary();
    return atom();
  }
  function atom() {
    skip();
    if (s.startsWith("sqrt", i)) {
      i += 4;
      return Math.sqrt(atom());
    }
    if (peek() === "(") {
      i++;
      const v = expr();
      skip();
      if (peek() !== ")") throw new Error("paren");
      i++;
      return v;
    }
    const m = /^\d*\.?\d+(e[-+]?\d+)?/.exec(s.slice(i));
    if (!m) throw new Error("number");
    i += m[0].length;
    return parseFloat(m[0]);
  }
  try {
    const v = expr();
    skip();
    if (i !== s.length || !Number.isFinite(v)) return null;
    // Just a number isn't a calculation.
    if (/^\s*-?\d*\.?\d+\s*$/.test(s)) return null;
    return Number.isInteger(v) ? v.toLocaleString("en-US", { useGrouping: true }) : Number(v.toPrecision(12)).toLocaleString("en-US", { maximumFractionDigits: 10 });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------- the web

const URLISH = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(:\d+)?(\/\S*)?$/i;

function urlFor(query) {
  const q = String(query || "").trim();
  if (!q || /\s/.test(q) || !URLISH.test(q)) return null;
  return /^https?:\/\//i.test(q) ? q : "https://" + q;
}

const searchUrl = (q) => "https://www.google.com/search?q=" + encodeURIComponent(q);

// ---------------------------------------------------------- Siri's routing
// How much a query reads like something to ask (a question, a request) rather
// than a name to find. 0…1. Siri in Spotlight offers to answer every query;
// this decides whether "Ask Pluto" is the top hit or sits below the matches.

const OPENERS =
  /^(who|whom|whose|what|what's|whats|when|where|why|how|which|is|are|am|was|were|do|does|did|can|could|should|would|will|shall|tell|explain|summari[sz]e|translate|define|compare|write|draft|reply|respond|email|text|message|send|remind|set|turn|play|pause|skip|open|close|quit|find|search|show|schedule|create|make|add|call|navigate|directions|book|convert|calculate|give|help|list|check|read|go|start|stop|move|rename|delete|organi[sz]e|clean|plan|suggest|recommend)\b/i;

function askiness(query) {
  const q = String(query || "").trim();
  if (!q) return 0;
  const words = q.split(/\s+/).length;
  if (/\?$/.test(q)) return 0.95;
  if (OPENERS.test(q) && words >= 2) return 0.85;
  if (words >= 5) return 0.75;
  if (words >= 3) return 0.45;
  return 0.15;
}

module.exports = { match, run, calculate, urlFor, searchUrl, askiness, refreshShortcuts };
