"use strict";
// Computer use: Claude sees the frontmost window's controls through the
// Accessibility API (resources/src/ui-control) and operates them, with an
// optional screenshot for things the control list can't describe.
//
//   mac_look  list the front window's buttons, links, fields… (numbered ids)
//   mac_act   press / click / type / key / scroll, then return the new list
//
// Acting and looking in one call keeps multi-step tasks to as few model
// round trips as possible (each one re-reads the whole prompt).

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const electron = require("electron");

const MAX_ELEMENTS = 120;
const SETTLE_MS = 700;

function helperPath() {
  return electron.app.isPackaged
    ? path.join(process.resourcesPath, "binaries", "ui-control")
    : path.join(__dirname, "../../../../resources/bin/ui-control");
}

const stateFile = () => path.join(electron.app.getPath("userData"), "ui-control-state.json");

function helper(args) {
  return new Promise((resolve) => {
    // The helper skips VoiceOS's own window and works on the app behind it.
    const env = { ...process.env, UI_CONTROL_SELF_PID: String(process.pid), UI_CONTROL_STATE: stateFile() };
    execFile(helperPath(), args, { timeout: 15_000, maxBuffer: 4 << 20, env }, (err, stdout) => {
      try {
        resolve(JSON.parse(String(stdout).trim().split("\n").pop()));
      } catch {
        resolve({ ok: false, error: err?.message || "ui-control failed" });
      }
    });
  });
}

const snapshot = () => helper(["snapshot", stateFile(), String(MAX_ELEMENTS)]);

// macOS permission, password and security prompts are the user's to answer.
// Computer use never clicks or types into them, whatever the model decides.
const PROTECTED_APPS = /^(UserNotificationCenter|SecurityAgent|CoreServicesUIAgent|coreautha|universalAccessAuthWarn|loginwindow|ScreenSaverEngine|Keychain Access|Passwords)$/i;
const PROTECTED_SETTINGS = /privacy|security|password|login items|users|touch id|lock screen/i;
let lastWindow = null;
let lastElements = [];

// Clicks and sends that are hard to undo or reach other people go through the
// notch's approval card first, whatever page or app text told Claude to do.
const RISKY_LABEL =
  /\b(send|post|tweet|publish|buy|purchase|pay|place (your )?order|order now|check ?out|subscribe|donate|transfer|withdraw|delete|remove|erase|trash|discard|unsubscribe|sign out|log out|confirm|submit|book now|reserve|uninstall|format|reset|accept|agree|allow|authori[sz]e|approve|deactivate)\b/i;
const TEXT_ROLES = /TextField|TextArea|SearchField|StaticText|Heading|ComboBox/;
const MESSAGING_APPS = /^(Messages|Mail|WhatsApp|Telegram|Slack|Discord|Signal|Microsoft Teams|Messenger|WeChat|LINE|Microsoft Outlook|Outlook|Spark|Superhuman)\b/i;

const quote = (s) => "“" + String(s).slice(0, 60) + "”";

// → { label, params } when the action needs the user's approval, else null.
async function riskOf(args) {
  const a = String(args.action || "");
  const where = { app: lastWindow?.app || "", ...(lastWindow?.title ? { window: lastWindow.title } : {}) };
  if ((a === "press" || a === "click") && args.element !== undefined && args.x === undefined) {
    const el = lastElements[Number(args.element)];
    if (el?.label && !TEXT_ROLES.test(el.role || "") && RISKY_LABEL.test(el.label)) return { label: "Click " + quote(el.label), params: { ...where, button: el.label } };
    return null;
  }
  if (a === "click" || a === "double_click") {
    const x = Math.round(Number(args.x) * lastScale);
    const y = Math.round(Number(args.y) * lastScale);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const at = await helper(["describe", String(x), String(y)]);
    if (at.ok && at.label && !TEXT_ROLES.test(at.role || "") && RISKY_LABEL.test(at.label)) return { label: "Click " + quote(at.label), params: { app: at.app || where.app, button: at.label } };
    return null;
  }
  const keys = a === "key" ? String(args.keys || "").toLowerCase() : "";
  const sends = (a === "type" && args.submit) || /(^|[\s+])(return|enter)(\s|$)/.test(keys);
  const mailSend = /^Mail\b/i.test(where.app) && /(cmd|command)\+shift\+d\b/.test(keys);
  if (mailSend || (sends && (MESSAGING_APPS.test(where.app) || /(cmd|command)\+(return|enter)/.test(keys))))
    return { label: "Send in " + (where.app || "this app"), params: { ...where, ...(args.text ? { message: String(args.text).slice(0, 2000) } : { keys: args.keys }) } };
  return null;
}

function frontApp() {
  return new Promise((resolve) =>
    execFile("/usr/bin/lsappinfo", ["front"], { timeout: 3000 }, (err, asn) => {
      if (err || !String(asn).trim()) return resolve(null);
      execFile("/usr/bin/lsappinfo", ["info", "-only", "name", String(asn).trim()], { timeout: 3000 }, (e, out) => resolve(String(out || "").match(/^"([^"]+)"/)?.[1] || null));
    }),
  );
}

function protectedReason(app, windowTitle) {
  if (app === "loginwindow") return "The Mac is locked (login window). Nothing can be operated until the user unlocks it.";
  if (app && PROTECTED_APPS.test(app))
    return "The frontmost window is a macOS permission, password or security prompt (" + app + "). Only the user may answer it: tell them what it asks and stop. Do not try to click it another way.";
  if (app === "System Settings" && PROTECTED_SETTINGS.test(windowTitle || ""))
    return "This System Settings page (" + windowTitle + ") controls privacy and security. Only the user may change it: tell them what to do and stop.";
  return null;
}

// Screenshot of the main display, resized so its pixels map to screen points
// by a known factor (clicks by coordinates use screenshot pixels).
let lastScale = 1;
async function screenshot() {
  const file = path.join(os.tmpdir(), "voiceos-look-" + process.pid + ".jpg");
  const run = (cmd, args) => new Promise((r) => execFile(cmd, args, { timeout: 10_000 }, (err) => r(!err)));
  if (!(await run("/usr/sbin/screencapture", ["-x", "-m", "-t", "jpg", file]))) return null;
  await run("/usr/bin/sips", ["-Z", "1280", file]);
  try {
    const data = fs.readFileSync(file);
    const { width } = electron.screen.getPrimaryDisplay().size;
    const sof = findSof(data); // [length:2][precision:1][height:2][width:2]
    const pxWidth = sof > 0 ? data.readUInt16BE(sof + 5) : 0;
    lastScale = pxWidth ? width / pxWidth : 1;
    return { type: "image", mimeType: "image/jpeg", data: data.toString("base64") };
  } catch {
    return null;
  } finally {
    fs.rmSync(file, { force: true });
  }
}

// Offset of the JPEG start-of-frame marker (holds the image size).
function findSof(buf) {
  for (let i = 2; i < buf.length - 9; ) {
    if (buf[i] !== 0xff) return -1;
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xc3) return i + 2;
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return -1;
}

async function look(args = {}) {
  const snap = await snapshot();
  if (!snap.ok) return { content: JSON.stringify(snap), isError: true };
  lastWindow = { app: snap.app, title: snap.window };
  lastElements = snap.elements || [];
  if (snap.app === "loginwindow") return { content: protectedReason("loginwindow"), isError: true };
  const blocks = [{ type: "text", text: JSON.stringify(snap) }];
  const guard = protectedReason(snap.app, snap.window);
  if (guard) blocks.unshift({ type: "text", text: guard });
  if (args.screenshot) {
    const shot = await screenshot();
    blocks.push(shot || { type: "text", text: "(Screenshot unavailable: VoiceOS needs Screen Recording permission.)" });
    if (shot) blocks.push({ type: "text", text: "Screenshot coordinates: pass x/y in this image's pixels to mac_act click." });
  }
  return { content: blocks };
}

async function act(args = {}) {
  const a = String(args.action || "");
  const front = await frontApp();
  const guard = protectedReason(front, front && front === lastWindow?.app ? lastWindow.title : null);
  if (guard) return { content: guard, isError: true };
  const risk = await riskOf(args);
  if (risk) return { needsApproval: risk, resume: () => perform(args) };
  return perform(args);
}

async function perform(args) {
  const a = String(args.action || "");
  let res;
  if (a === "press" || a === "focus") res = await helper([a, stateFile(), String(args.element ?? "")]);
  else if (a === "type") {
    if (args.element !== undefined) await helper(["focus", stateFile(), String(args.element)]);
    res = await helper(["type", String(args.text ?? "")]);
    if (res.ok && args.submit) res = await helper(["key", "return"]);
  } else if (a === "key") res = await helper(["key", String(args.keys || "")]);
  else if (a === "scroll") res = await helper(["scroll", args.direction || "down", String(args.amount || 5)]);
  else if (a === "click" && args.element !== undefined && args.x === undefined) res = await helper(["press", stateFile(), String(args.element)]);
  else if (a === "click" || a === "double_click" || a === "right_click") {
    const x = Math.round(Number(args.x) * lastScale);
    const y = Math.round(Number(args.y) * lastScale);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return { content: "click needs x and y from a mac_look screenshot", isError: true };
    res = await helper(["click", String(x), String(y), a === "double_click" ? "double" : a === "right_click" ? "right" : "left"]);
  } else return { content: "Unknown action: " + a, isError: true };
  if (!res.ok) return { content: JSON.stringify(res), isError: true };
  await new Promise((r) => setTimeout(r, SETTLE_MS));
  return look({ screenshot: !!args.screenshot_after }).then((after) => ({
    content: [{ type: "text", text: "Done: " + res.did + ". The window now:" }, ...after.content],
  }));
}

// A request that keeps clicking without getting anywhere should stop and
// report back rather than poke at the screen indefinitely.
const SOFT_STEPS = 12;
const MAX_STEPS = 25;

// Fresh tools for one request, with their own action count.
function tools() {
  let steps = 0;
  let lastCall = "";
  let repeats = 0;
  const limited = async (args = {}) => {
    const call = JSON.stringify(args);
    repeats = call === lastCall ? repeats + 1 : 0;
    lastCall = call;
    if (repeats >= 2) return { content: "That exact action was just tried three times with no progress. Don't repeat it: look again and try something different, or tell the user what's blocking you.", isError: true };
    if (++steps > MAX_STEPS)
      return { content: "Stopped after " + MAX_STEPS + " actions in one request. Don't act further: tell the user what you got done, what's on screen now, and ask how they want to continue.", isError: true };
    const res = await act(args);
    if (steps === SOFT_STEPS && Array.isArray(res.content))
      res.content.push({ type: "text", text: "(" + SOFT_STEPS + " actions so far in this request. If you aren't close to done, stop and tell the user where things stand instead of trying further.)" });
    return res;
  };
  return TOOLS.map((t) => (t.name === "mac_act" ? { ...t, run: limited } : t));
}

const TOOLS = [
  {
    name: "mac_look",
    label: "Looking at the screen",
    description:
      "See the frontmost app's window: its buttons, links, text fields, tabs, menus and visible text, each with a numbered id (works for web pages in Chrome/Safari too). Use it to operate apps or sites that your other tools can't. Set screenshot=true only when you need to see images or layout.",
    schema: { type: "object", properties: { screenshot: { type: "boolean", description: "Also return a screenshot of the main display." } } },
    run: look,
  },
  {
    name: "mac_act",
    label: "Using the app",
    description:
      "Operate the frontmost app, then get its updated control list. Actions: press (element id), type (text, optional element id to focus first, submit=true to press Return), key (e.g. 'cmd+l', 'return', 'cmd+f', 'escape'), scroll (direction, amount), click/double_click/right_click (x, y from a mac_look screenshot). Ids come from the latest mac_look/mac_act result.",
    schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["press", "focus", "type", "key", "scroll", "click", "double_click", "right_click"] },
        element: { type: "integer", description: "Element id from the latest control list." },
        text: { type: "string", description: "Text to type." },
        submit: { type: "boolean", description: "Press Return after typing." },
        keys: { type: "string", description: "Key combo(s), space-separated, e.g. 'cmd+l' or 'down down return'." },
        direction: { type: "string", enum: ["up", "down", "left", "right"] },
        amount: { type: "integer", description: "Scroll lines (default 5)." },
        x: { type: "number" },
        y: { type: "number" },
        screenshot_after: { type: "boolean", description: "Include a screenshot of the result." },
      },
      required: ["action"],
    },
    run: act,
  },
];

// A key combo through the Accessibility helper (no Automation prompt).
const pressKeys = (keys) => helper(["key", String(keys)]);

module.exports = { TOOLS, tools, look, act, pressKeys };
