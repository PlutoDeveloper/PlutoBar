"use strict";
// The assistant's events, for PlutoBar. Every agent UI event passes through
// main.js's sendToAgentUI; translate() turns the ones PlutoBar shows into its
// small event shapes (Sources/PlutoBar/Model.swift handleAgent).
//
// The original Electron agent notch keeps running as an invisible engine (it
// plays the spoken replies and runs the turn state machine), but while
// PlutoBar is on it is never shown and never takes the mouse.

const log = require("./log");

let legacy = null;
let hidden = false;

// AgentStatusType in main.js
const STATUS = { TRANSCRIBING: 0, THINKING: 1, TOOL_SEARCH: 2, TOOL_EXECUTING: 3, TOOL_RESULT: 4, TEXT: 5, ERROR: 6, COMPLETE: 7, MCP_TOOL_EXECUTE: 9 };

// --------------------------------------------- the old agent notch window
const ENGINE_OVERRIDES = ["setIgnoreMouseEvents", "setOpacity", "setFocusable", "focus", "show"];

function adoptAgentNotchWindow(win) {
  legacy = { win, orig: Object.fromEntries(ENGINE_OVERRIDES.map((k) => [k, win[k].bind(win)])) };
  win.once("closed", () => legacy?.win === win && (legacy = null));
  applyLegacy();
}

function applyLegacy() {
  if (!legacy || legacy.win.isDestroyed()) return;
  const { win, orig } = legacy;
  if (hidden) {
    // Still "shown" (so its audio isn't throttled), but fully transparent,
    // click-through and unfocusable, whatever its own code asks for.
    win.setIgnoreMouseEvents = () => orig.setIgnoreMouseEvents(true);
    win.setOpacity = () => {};
    win.setFocusable = () => {};
    win.focus = () => {};
    win.show = () => win.showInactive();
    orig.setOpacity(0);
    orig.setFocusable(false);
    orig.setIgnoreMouseEvents(true);
  } else {
    for (const k of ENGINE_OVERRIDES) delete win[k];
    win.setOpacity(1);
    win.setFocusable(true);
    win.setIgnoreMouseEvents(true, { forward: true });
  }
}

// PlutoBar on: the old notch stays invisible. Off: it's the assistant again.
function setLegacyHidden(on) {
  hidden = !!on;
  applyLegacy();
}

// ------------------------------------------------------ assistant events

// Hands the small events for one agent UI event to `emit`.
//   ctx.strip      removes voice-control markers from reply text
//   ctx.agentMode  VoiceOSMode.AGENT
function translate(channel, data, ctx = {}, emit) {
  try {
    switch (channel) {
      case "recording-state-update":
        if (data?.isRecording && (data.mode === undefined || data.mode === ctx.agentMode)) emit({ t: "listen", on: true });
        else if (!data?.isRecording) emit({ t: "listen", on: false });
        break;
      case "volume-update":
        emit({ t: "level", v: Math.min(1, Math.max(0, Number(data) || 0)) });
        break;
      case "agent-status-update":
        statusEvent(data, ctx, emit);
        break;
      case "agent-complete":
        emit({ t: "complete" });
        break;
      case "agent-error":
        emit({ t: "error", message: errorText(data) });
        break;
      case "agent-confirm-required":
        emit(confirmEvent(data));
        break;
      case "agent-confirm-resolved":
        emit({ t: "confirmResolved", id: data?.confirmationId });
        break;
      case "agent-notch-dismiss-widget":
        emit({ t: "dismiss" });
        break;
      case "agent-no-speech-hint":
        emit({ t: "noSpeech" });
        break;
      case "agent-voice-speaking-state":
        emit({ t: "speaking", on: data?.speaking === true });
        break;
    }
  } catch (err) {
    log.warn("[PlutoBar] event " + channel + ": " + err.message);
  }
}

function statusEvent(s, ctx, emit) {
  const status = Number(s?.status);
  const message = typeof s?.message === "string" ? s.message : "";
  switch (status) {
    case STATUS.TRANSCRIBING:
      emit({ t: "phase", phase: "transcribing", transcript: message });
      break;
    case STATUS.THINKING:
      emit({ t: "phase", phase: "thinking" });
      break;
    case STATUS.TOOL_SEARCH:
    case STATUS.TOOL_EXECUTING:
    case STATUS.MCP_TOOL_EXECUTE:
      emit({ t: "phase", phase: "working", step: stepLabel(message, s?.toolName) });
      break;
    case STATUS.TOOL_RESULT: {
      const card = resultCard(s?.toolName, s?.detail);
      if (card) emit(card);
      break;
    }
    case STATUS.TEXT: {
      const text = (ctx.strip ? ctx.strip(message) : message).trim();
      if (text) emit({ t: "text", text });
      break;
    }
    case STATUS.ERROR:
      emit(/no speech/i.test(message) ? { t: "noSpeech" } : { t: "error", message: message || "Something went wrong." });
      break;
    case STATUS.COMPLETE:
      emit({ t: "complete" });
      break;
  }
}

function stepLabel(message, toolName) {
  const m = String(message || "").trim();
  if (m && m.length < 80) return /…$/.test(m) ? m : m + "…";
  const name = String(toolName || "").replace(/^mcp__[^_]+__/, "").replace(/[_-]+/g, " ").trim();
  return name ? "Using " + name + "…" : "Working…";
}

function errorText(data) {
  const e = data?.message || data?.error?.message || data?.error;
  return typeof e === "string" && e ? e : "Something went wrong.";
}

// Approval: the action's parameters, with the text ones editable.
const EDITABLE = /^(body|text|message|content|subject|title|note|notes|caption|reply|description|comment)$/i;

function confirmEvent(data) {
  let params = {};
  try {
    const details = JSON.parse(data?.actionDetails || "{}");
    params = details?.actions?.[0]?.params || details?.params || {};
  } catch {}
  const fields = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 6)
    .map(([key, v]) => ({
      key,
      label: key.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase()),
      value: typeof v === "string" ? v : Array.isArray(v) ? v.join(", ") : JSON.stringify(v),
      editable: typeof v === "string" && EDITABLE.test(key),
    }));
  return { t: "confirm", id: data?.confirmationId || "", title: data?.message || "Approve this action?", fields };
}

const DAY = new Intl.DateTimeFormat(undefined, { weekday: "short" });

// The weather and stock cards.
function resultCard(toolName, detail) {
  if (!detail || typeof detail !== "string") return null;
  let d;
  try {
    d = JSON.parse(detail);
  } catch {
    return null;
  }
  if (toolName === "weather_forecast" && d?.current && Array.isArray(d.forecast)) {
    const today = d.forecast[0] || {};
    return {
      t: "result",
      kind: "weather",
      place: d.location || "",
      temp: d.current.temp_c,
      condition: d.current.condition || "",
      isDay: d.current.is_day !== false,
      high: today.high_c,
      low: today.low_c,
      days: d.forecast.slice(1, 6).map((f) => ({ day: f.day ? DAY.format(new Date(f.day + "T12:00:00")) : "", condition: f.condition || "", high: f.high_c, low: f.low_c })),
    };
  }
  if (toolName === "stock_quote" && d?.ticker && typeof d.price === "number") {
    const chart = Array.isArray(d.chart) ? d.chart.map((p) => p.price).filter(Number.isFinite) : [];
    const step = Math.max(1, Math.ceil(chart.length / 80));
    return {
      t: "result",
      kind: "stock",
      ticker: d.ticker,
      name: d.name || d.ticker,
      price: d.price,
      change: d.change || 0,
      changePercent: d.changePercent || 0,
      currency: d.currency || "",
      points: chart.filter((_, i) => i % step === 0 || i === chart.length - 1),
    };
  }
  return null;
}

module.exports = { translate, adoptAgentNotchWindow, setLegacyHidden };
