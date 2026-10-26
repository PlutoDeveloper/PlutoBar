"use strict";
// On battery or plugged in, as macOS says (pmset). Electron's
// powerMonitor.isOnBatteryPower() answers false on this Mac while it runs on
// battery, so every "wait for power" rule would never apply. Checked at most
// every 30 s, and again at once when Electron reports a change.

const { execFileSync } = require("node:child_process");
const electron = require("electron");

let cached = null;
let checkedAt = 0;
const listeners = new Set();

function read() {
  try {
    return /'Battery Power'/.test(String(execFileSync("/usr/bin/pmset", ["-g", "ps"], { timeout: 2000 })));
  } catch {
    return false;
  }
}

function onBattery() {
  if (cached === null || Date.now() - checkedAt > 30_000) {
    cached = read();
    checkedAt = Date.now();
  }
  return cached;
}

// fn(onBattery) when it changes. Electron's events still fire on a change even
// where its state query is wrong; a minute's poll catches anything they miss.
let watching = false;
function onChange(fn) {
  listeners.add(fn);
  if (watching) return;
  watching = true;
  const recheck = () => {
    const before = cached;
    checkedAt = 0;
    const now = onBattery();
    if (before !== null && before !== now) for (const l of listeners) l(now);
  };
  electron.powerMonitor.on("on-ac", recheck);
  electron.powerMonitor.on("on-battery", recheck);
  setInterval(recheck, 60_000).unref?.();
}

module.exports = { onBattery, onChange };
