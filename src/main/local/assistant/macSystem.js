"use strict";
// Mac system controls and the user's own Shortcuts (Shortcuts.app), through
// built-in command-line tools. One tool keeps the prompt small.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");

function run(cmd, args, timeout = 15_000) {
  return new Promise((resolve, reject) =>
    execFile(cmd, args, { timeout, maxBuffer: 4 << 20 }, (err, stdout, stderr) => {
      if (err) {
        const msg = String(stderr || err.message).trim();
        if (/-1743|not authori[sz]ed/i.test(msg)) return reject(new Error("VoiceOS needs permission for this: allow it in System Settings → Privacy & Security → Automation."));
        const waitingForUser = err.killed && cmd.endsWith("osascript");
        const e = new Error(
          waitingForUser
            ? "Timed out. macOS is probably showing a permission prompt asking to let VoiceOS control another app. The user needs to click OK/Allow, then ask again."
            : msg.replace(/^.*execution error: /s, "").slice(0, 300) || "Command failed",
        );
        e.killed = err.killed;
        return reject(e);
      }
      resolve(String(stdout).trim());
    }),
  );
}

// Long enough for the user to answer macOS's one-time Automation prompt.
const osascript = (script) => run("/usr/bin/osascript", ["-e", script], 60_000);

async function listShortcuts() {
  return (await run("/usr/bin/shortcuts", ["list"])).split("\n").map((s) => s.trim()).filter(Boolean);
}

async function findShortcut(name) {
  const all = await listShortcuts();
  const want = String(name || "").trim().toLowerCase();
  if (!want) throw new Error("Pass the shortcut's name.");
  const exact = all.find((s) => s.toLowerCase() === want);
  if (exact) return exact;
  const partial = all.filter((s) => s.toLowerCase().includes(want) || want.includes(s.toLowerCase()));
  if (partial.length === 1) return partial[0];
  throw new Error(
    (partial.length ? "Several shortcuts match: " + partial.join(", ") : "No shortcut called '" + name + "'. The user's shortcuts: " + all.slice(0, 80).join(", ")) + ".",
  );
}

async function screenLocked() {
  try {
    return /<key>CGSSessionScreenIsLocked<\/key>\s*<true\/>/.test(await run("/usr/sbin/ioreg", ["-n", "Root", "-d1", "-a"], 5000));
  } catch {
    return false;
  }
}

async function runShortcut(name, input) {
  if (await screenLocked()) throw new Error("The Mac is locked, so Shortcuts can't run until the user unlocks it.");
  const shortcut = await findShortcut(name);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "voiceos-shortcut-"));
  const out = path.join(dir, "output");
  const args = ["run", shortcut, "--output-path", out];
  if (input) {
    const inFile = path.join(dir, "input.txt");
    fs.writeFileSync(inFile, String(input));
    args.push("--input-path", inFile);
  }
  try {
    await run("/usr/bin/shortcuts", args, 45_000).catch((err) => {
      throw new Error(err.killed || /SIGTERM/.test(err.message) ? "'" + shortcut + "' didn't finish in 45 seconds. It may be waiting for input or a permission on screen, or it may only work on iPhone/iPad." : "'" + shortcut + "' failed: " + err.message);
    });
    let output = "";
    try {
      output = fs.readFileSync(out, "utf8").slice(0, 4000);
    } catch {}
    return { ok: true, ran: shortcut, ...(output.trim() ? { output: output.trim() } : {}) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function battery() {
  const out = await run("/usr/bin/pmset", ["-g", "batt"]);
  const m = out.match(/(\d+)%;\s*([^;]+);\s*([^\n]*)/);
  return { source: /AC Power/.test(out) ? "power adapter" : "battery", ...(m ? { percent: Number(m[1]), state: m[2].trim(), remaining: m[3].replace(/present: true/, "").trim() } : { raw: out }) };
}

async function wifiDevice() {
  const out = await run("/usr/sbin/networksetup", ["-listallhardwareports"]);
  return out.match(/Hardware Port: Wi-Fi\s+Device: (\S+)/)?.[1] || "en0";
}

const ACTIONS = {
  list_shortcuts: async () => ({ shortcuts: await listShortcuts() }),
  run_shortcut: (a) => runShortcut(a.name, a.input),
  volume: async (a) => {
    const level = Math.max(0, Math.min(100, Math.round(Number(a.level))));
    if (!Number.isFinite(level)) throw new Error("volume needs level 0-100");
    await osascript("set volume output volume " + level + " without output muted");
    return { ok: true, volume: level };
  },
  mute: async () => (await osascript("set volume with output muted"), { ok: true, muted: true }),
  unmute: async () => (await osascript("set volume without output muted"), { ok: true, muted: false }),
  get_volume: async () => ({ settings: await osascript("get volume settings") }),
  dark_mode: async (a) => {
    const v = a.value === "on" ? "true" : a.value === "off" ? "false" : "not dark mode";
    const now = await osascript('tell application "System Events" to tell appearance preferences\nset dark mode to ' + v + "\nreturn dark mode\nend tell");
    return { ok: true, dark_mode: now === "true" };
  },
  battery,
  wifi: async (a) => {
    const dev = await wifiDevice();
    if (a.value === "on" || a.value === "off") await run("/usr/sbin/networksetup", ["-setairportpower", dev, a.value]);
    const power = await run("/usr/sbin/networksetup", ["-getairportpower", dev]);
    return { ok: true, wifi: /On$/.test(power) ? "on" : "off" };
  },
  sleep_display: async () => (await run("/usr/bin/pmset", ["displaysleepnow"]), { ok: true }),
  lock_screen: async () => {
    // Control-Command-Q, the system's own lock shortcut.
    const res = await require("./computer").pressKeys("ctrl+cmd+q");
    if (!res.ok) throw new Error(res.error || "Couldn't lock the screen");
    return { ok: true };
  },
};

const TOOL = {
  name: "mac_system",
  label: "Adjusting your Mac",
  description:
    "Mac settings and the user's own Shortcuts. Actions: volume (level 0-100), mute, unmute, get_volume, dark_mode (value on/off/toggle), battery, wifi (value on/off, or status), sleep_display, lock_screen, list_shortcuts, run_shortcut (name, optional text input; returns its output). Run a shortcut when the user names one or asks for something only a shortcut can do (Focus modes, HomeKit scenes…): list_shortcuts first if unsure of the name.",
  schema: {
    type: "object",
    properties: {
      action: { type: "string", enum: Object.keys(ACTIONS) },
      level: { type: "number", description: "volume: 0-100." },
      value: { type: "string", enum: ["on", "off", "toggle", "status"], description: "dark_mode / wifi." },
      name: { type: "string", description: "run_shortcut: the shortcut's name." },
      input: { type: "string", description: "run_shortcut: text passed to the shortcut." },
    },
    required: ["action"],
  },
};

async function runTool(args = {}) {
  const fn = ACTIONS[args.action];
  if (!fn) throw new Error("Unknown action: " + args.action);
  return { content: JSON.stringify(await fn(args)) };
}

module.exports = { TOOL, run: runTool };
