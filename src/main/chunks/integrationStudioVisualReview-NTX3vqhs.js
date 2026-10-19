"use strict";
const _0x29902a = _0x31a8;
(function (_0x1f9d3, _0x10eacf) {
  const _0x2b8011 = _0x31a8,
    _0x4608ad = _0x1f9d3();
  while (!false) {
    try {
      const _0x34df1d =
        parseInt("359752wFwfim") / 1 +
        -parseInt("1317302uXTKGR") / 2 +
        (parseInt("38373uhqspX") / 3) * (-parseInt("124xmPROM") / 4) +
        parseInt("2786640UJmigG") / 5 +
        -parseInt("2397744WJqPMw") / 6 +
        (parseInt("4076667GBDqxS") / 7) * (parseInt("8KJUvdX") / 8) +
        parseInt("3053349DxoNKz") / 9;
      if (_0x34df1d === _0x10eacf) break;
      else _0x4608ad.push(_0x4608ad.shift());
    } catch (_0x388b41) {
      _0x4608ad.push(_0x4608ad.shift());
    }
  }
})(_0x292a, 383926);
(!(function () {
  const _0x58461e = _0x31a8,
    _0x3fa9ec = /* @__PURE__ */ (function () {
      let _0x50e6f1 = !false;
      return function (_0x39884a, _0x1ba790) {
        const _0x2e6c9f = _0x50e6f1
          ? function () {
              const _0x108cc5 = _0x31a8;
              if (_0x1ba790) {
                const _0x214b7c = _0x1ba790.apply(_0x39884a, arguments);
                return ((_0x1ba790 = null), _0x214b7c);
              }
            }
          : function () {};
        return ((_0x50e6f1 = false), _0x2e6c9f);
      };
    })(),
    _0x4ae39d = _0x3fa9ec(this, function () {
      const _0x356048 = _0x31a8,
        _0x3e5ae7 = function () {
          const _0x300b60 = _0x31a8;
          let _0x13d234;
          try {
            _0x13d234 = Function(
              "return (function() " + '{}.constructor("return this")( )' + ");",
            )();
          } catch (_0x32006d) {
            _0x13d234 = window;
          }
          return _0x13d234;
        },
        _0x28bbce = _0x3e5ae7(),
        _0x4960c4 = (_0x28bbce.console = _0x28bbce.console || {}),
        _0x54a438 = [
          "log",
          "warn",
          "info",
          "error",
          "exception",
          "table",
          "trace",
        ];
      for (let _0x147cb4 = 0; _0x147cb4 < _0x54a438.length; _0x147cb4++) {
        const _0x2c3cd6 = _0x3fa9ec.constructor.prototype.bind(_0x3fa9ec),
          _0x3b5845 = _0x54a438[_0x147cb4],
          _0x24fef0 = _0x4960c4[_0x3b5845] || _0x2c3cd6;
        ((_0x2c3cd6.__proto__ = _0x3fa9ec.bind(_0x3fa9ec)),
          (_0x2c3cd6.toString = _0x24fef0.toString.bind(_0x24fef0)),
          (_0x4960c4[_0x3b5845] = _0x2c3cd6));
      }
    });
  _0x4ae39d();
  try {
    var _0xca409 =
      "undefined" != typeof window
        ? window
        : "undefined" != typeof global
          ? global
          : "undefined" != typeof globalThis
            ? globalThis
            : "undefined" != typeof self
              ? self
              : {};
    _0xca409.SENTRY_RELEASE = { id: "voiceos-opensourced@0.1.33" };
    var _0x593027 = new _0xca409.Error().stack;
    _0x593027 &&
      ((_0xca409._sentryDebugIds = _0xca409._sentryDebugIds || {}),
      (_0xca409._sentryDebugIds[_0x593027] =
        "9bcde427-7ce0-431b-b344-9874c0fbdebd"),
      (_0xca409._sentryDebugIdIdentifier =
        "sentry-dbid-9bcde427-7ce0-431b-b344-9874c0fbdebd"));
  } catch (_0x18bafc) {}
})(),
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" }));
const electron = require("electron"),
  main = require("../main.js");
(require("zod"),
  require("path"),
  require("node:child_process"),
  require("node:fs"),
  require("node:fs/promises"),
  require("node:path"),
  require("electron-log"),
  require("ws"),
  require("node:os"),
  require("electron-store"),
  require("crypto"),
  require("@bufbuild/protobuf/codegenv2"),
  require("@bufbuild/protobuf/wkt"),
  require("node:crypto"),
  require("psl"),
  require("url"),
  require("child_process"),
  require("node:readline"),
  require("os"),
  require("fs"),
  require("@connectrpc/connect"),
  require("@connectrpc/connect-node"),
  require("@bufbuild/protobuf"),
  require("http-proxy-agent"),
  require("https-proxy-agent"),
  require("sqlite3"),
  require("uuid"),
  require("events"),
  require("string_decoder"),
  require("posthog-node"),
  require("node-machine-id"),
  require("dotenv"),
  require("@sentry/electron/main"),
  require("@electron-toolkit/utils"),
  require("readline"),
  require("node:perf_hooks"),
  require("electron-updater"),
  require("util"),
  require("ajv"),
  require("ajv/dist/2020"),
  require("node:url"),
  require("@modelcontextprotocol/sdk/client/index.js"),
  require("@modelcontextprotocol/sdk/types.js"),
  require("@modelcontextprotocol/sdk/server/zod-compat.js"),
  require("@modelcontextprotocol/sdk/validation/ajv-provider.js"),
  require("@modelcontextprotocol/sdk/client/stdio.js"),
  require("@modelcontextprotocol/sdk/client/streamableHttp.js"),
  require("@modelcontextprotocol/sdk/client/sse.js"),
  require("node:zlib"),
  require("worker_threads"),
  require("fs/promises"),
  require("fflate"),
  require("http"),
  require("dgram"));
const CARD_WIDTH = 388,
  MAX_CARD_HEIGHT = 420,
  MIN_CARD_HEIGHT = 60,
  STAGE_PADDING = 12,
  CARD_SURFACE_RADIUS_PX = main.WIDGET_SURFACE_RADIUS_PX,
  CAPTURE_SCALE = 2,
  BRIDGE_SETTLE_TIMEOUT_MS = 2500,
  PAINT_SETTLE_MS = 220,
  PER_CARD_TIMEOUT_MS = 8e3,
  escapeAttribute = (_0x548265) =>
    _0x548265.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
function buildHostDocument(_0x38fb22, _0x2109d7) {
  const _0x222468 = _0x29902a,
    _0x31a397 = _0x2109d7 === "light" ? "#f2f2f4" : "#0a0a0c",
    _0x10e017 =
      _0x38fb22.kind === "confirmation"
        ? '<div id="confirm">' +
          escapeHtmlText(_0x38fb22.confirmLabel?.trim() || "Confirm") +
          "</div>"
        : "";
  return (
    '<!doctype html>\n<html><head><meta charset="utf-8"><style>\n  html,body{margin:0;padding:0;background:' +
    _0x31a397 +
    ";}\n  #stage{position:relative;width:" +
    CARD_WIDTH +
    "px;padding:" +
    STAGE_PADDING +
    "px;}\n  iframe{display:block;width:100%;border:0;border-radius:" +
    CARD_SURFACE_RADIUS_PX +
    "px;\n    background:" +
    (_0x2109d7 === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)") +
    ";}\n  /* The button VoiceOS floats over the widget — copied from\n     FloatingConfirmButton so the review sees the real occlusion. */\n  #confirm{position:absolute;right:" +
    (STAGE_PADDING + 12) +
    "px;bottom:" +
    (STAGE_PADDING + 10) +
    'px;\n    height:30px;padding:0 18px;display:flex;align-items:center;\n    font:600 13px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;\n    letter-spacing:0.01em;color:rgba(255,255,255,0.96);background:rgba(17,18,21,0.85);\n    border:1px solid rgba(255,255,255,0.22);border-radius:999px;\n    box-shadow:0 3px 12px rgba(0,0,0,0.32),0 1px 3px rgba(0,0,0,0.28);}\n</style></head>\n<body>\n<div id="stage">\n  <iframe id="frame" sandbox="allow-scripts" srcdoc="' +
    escapeAttribute(main.hardenWidgetDocument(_0x38fb22.html)) +
    '"></iframe>\n  ' +
    _0x10e017 +
    '\n</div>\n<script>\n(function () {\n  var frame = document.getElementById("frame");\n  var state = { settled: false, measured: 0, errors: [] };\n  window.__voiceosCapture = state;\n\n  window.addEventListener("error", function (e) {\n    state.errors.push(String((e && e.message) || "error"));\n  });\n\n  window.addEventListener("message", function (event) {\n    if (event.source !== frame.contentWindow) return;\n    var msg = event.data;\n    if (!msg || typeof msg !== "object") return;\n    if (msg.type === "voiceos:resize" && typeof msg.height === "number") {\n      state.measured = msg.height;\n      frame.style.height =\n        Math.min(' +
    MAX_CARD_HEIGHT +
    ", Math.max(" +
    MIN_CARD_HEIGHT +
    ', msg.height)) + "px";\n      state.settled = true;\n    }\n  });\n\n  frame.addEventListener("load", function () {\n    frame.style.height = ' +
    clampHeight(_0x38fb22.declaredHeight) +
    ' + "px";\n    try {\n      frame.contentWindow.postMessage(' +
    JSON.stringify({
      type: "voiceos:init",
      data: _0x38fb22.data ?? null,
      args: _0x38fb22.args ?? {},
      theme: { mode: _0x2109d7 },
      radius: CARD_SURFACE_RADIUS_PX,
    }) +
    ', "*");\n    } catch (err) {\n      state.errors.push("init postMessage failed: " + err);\n    }\n  });\n})();\n</script>\n</body></html>'
  );
}
function escapeHtmlText(_0x12ede1) {
  const _0x65f662 = _0x29902a;
  return _0x12ede1
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function clampHeight(_0x4317fb) {
  const _0x28c8ac = _0x29902a;
  if (typeof _0x4317fb !== "number" || !Number.isFinite(_0x4317fb)) return 180;
  return Math.min(
    MAX_CARD_HEIGHT,
    Math.max(MIN_CARD_HEIGHT, Math.round(_0x4317fb)),
  );
}
const delay = (_0x2f054c) =>
  new Promise((_0x445ab6) => setTimeout(_0x445ab6, _0x2f054c));
async function captureOne(_0x4285fb, _0x48b027, _0x1e0242) {
  const _0x25a64d = _0x29902a,
    _0x2bca1e = clampHeight(_0x48b027.declaredHeight),
    _0x16b480 = buildHostDocument(_0x48b027, _0x1e0242);
  await _0x4285fb.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(_0x16b480),
  );
  let _0x29f5aa = false;
  const _0x44ae48 = Date.now() + BRIDGE_SETTLE_TIMEOUT_MS;
  while (Date.now() < _0x44ae48) {
    _0x29f5aa = await _0x4285fb.webContents.executeJavaScript(
      "window.__voiceosCapture ? window.__voiceosCapture.settled === true : false",
    );
    if (_0x29f5aa) break;
    await delay(60);
  }
  (await _0x4285fb.webContents.executeJavaScript(
    "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))))",
  ),
    await delay(PAINT_SETTLE_MS));
  const _0x90789e = await _0x4285fb.webContents.executeJavaScript(
      '(() => {\n    const stage = document.getElementById("stage").getBoundingClientRect();\n    const state = window.__voiceosCapture || {};\n    let inner = 0;\n    try {\n      inner = document.getElementById("frame").contentDocument.documentElement.scrollHeight;\n    } catch (e) { inner = 0; }\n    return {\n      width: Math.ceil(stage.width),\n      height: Math.ceil(stage.height),\n      measured: state.measured || inner || 0,\n      errors: (state.errors || []).slice(0, 5),\n    };\n  })()',
    ),
    _0x32d336 = await _0x4285fb.webContents.capturePage({
      x: 0,
      y: 0,
      width: _0x90789e.width,
      height: _0x90789e.height,
    }),
    _0xbcf522 = _0x32d336.resize({
      width: _0x90789e.width * CAPTURE_SCALE,
      height: _0x90789e.height * CAPTURE_SCALE,
      quality: "best",
    }),
    _0x2bf9cd = _0x90789e.measured || _0x2bca1e;
  return {
    id: _0x48b027.id,
    toolName: _0x48b027.toolName,
    label: _0x48b027.label,
    kind: _0x48b027.kind,
    theme: _0x1e0242,
    pngBase64: _0xbcf522.toPNG().toString("base64"),
    width: _0x90789e.width,
    height: _0x90789e.height,
    measuredHeight: _0x2bf9cd,
    declaredHeight: _0x2bca1e,
    clipped: _0x2bf9cd > MAX_CARD_HEIGHT,
    bridgeSettled: _0x29f5aa,
    consoleErrors: _0x90789e.errors ?? [],
  };
}
async function captureStudioCards(_0x3e5009, _0x3ac335) {
  const _0x41fde5 = _0x29902a,
    _0x5669cc = _0x3ac335?.themes?.["length"] ? _0x3ac335.themes : ["dark"];
  if (_0x3e5009.length === 0) return [];
  let _0x339f64 = null;
  const _0x31014e = [];
  try {
    _0x339f64 = new electron.BrowserWindow({
      show: false,
      width: CARD_WIDTH + STAGE_PADDING * 2,
      height: MAX_CARD_HEIGHT + STAGE_PADDING * 2,
      webPreferences: {
        offscreen: !false,
        sandbox: !false,
        contextIsolation: !false,
        nodeIntegration: false,
        webSecurity: !false,
      },
    });
    for (const _0x278d58 of _0x3e5009) {
      for (const _0xd6d024 of _0x5669cc) {
        if (_0x3ac335?.signal?.["aborted"]) return _0x31014e;
        try {
          const _0xf71df2 = await Promise.race([
            captureOne(_0x339f64, _0x278d58, _0xd6d024),
            delay(PER_CARD_TIMEOUT_MS).then(() => null),
          ]);
          if (_0xf71df2) _0x31014e.push(_0xf71df2);
          else
            console.warn(
              "[IntegrationStudio] Card capture timed out: " +
                _0x278d58.id +
                " (" +
                _0xd6d024 +
                ")",
            );
        } catch (_0x38c775) {
          console.warn(
            "[IntegrationStudio] Card capture failed for " + _0x278d58.id + ":",
            _0x38c775 instanceof Error ? _0x38c775.message : _0x38c775,
          );
        }
      }
    }
  } catch (_0x5120ce) {
    console.warn(
      "[IntegrationStudio] Offscreen capture window unavailable:",
      _0x5120ce instanceof Error ? _0x5120ce.message : _0x5120ce,
    );
  } finally {
    if (_0x339f64 && !_0x339f64.isDestroyed()) _0x339f64.destroy();
  }
  return _0x31014e;
}
function asWidget(_0x54626d) {
  const _0x363100 = _0x29902a,
    _0x2e2941 = _0x54626d;
  if (!_0x2e2941 || typeof _0x2e2941 !== "object") return null;
  if (_0x2e2941.type !== "widget") return null;
  return typeof _0x2e2941.html === "string" && _0x2e2941.html.trim()
    ? _0x2e2941
    : null;
}
function findWidgetInView(_0x4dc039, _0x5c92e1 = 0) {
  const _0x8d9c93 = _0x29902a;
  if (_0x5c92e1 > 8 || !_0x4dc039 || typeof _0x4dc039 !== "object") return null;
  const _0x8bce68 = asWidget(_0x4dc039);
  if (_0x8bce68) return _0x8bce68;
  const _0x41cdea = _0x4dc039;
  for (const _0x10cc1a of ["root", "children", "footer", "items", "rows"]) {
    const _0x2e5c03 = _0x41cdea[_0x10cc1a];
    if (Array.isArray(_0x2e5c03))
      for (const _0xa64934 of _0x2e5c03) {
        const _0x233252 = findWidgetInView(_0xa64934, _0x5c92e1 + 1);
        if (_0x233252) return _0x233252;
      }
    else {
      if (_0x2e5c03) {
        const _0x198849 = findWidgetInView(_0x2e5c03, _0x5c92e1 + 1);
        if (_0x198849) return _0x198849;
      }
    }
  }
  return null;
}
function findWidgetInGlance(_0xc55910) {
  const _0x3787c8 = _0x29902a,
    _0x4f7575 = _0xc55910?.blocks;
  if (!Array.isArray(_0x4f7575)) return null;
  for (const _0x374045 of _0x4f7575) {
    const _0x51d9b6 = asWidget(_0x374045);
    if (_0x51d9b6) return _0x51d9b6;
  }
  return null;
}
const heightOf = (_0x59658c) =>
    typeof _0x59658c.height === "number" ? _0x59658c.height : undefined,
  LIVE_TOOL_TIMEOUT_MS = 2e4;
async function liveCard(_0x3ee55d, _0x58d2d9) {
  const _0x5d1322 = _0x29902a;
  let _0x4cc658;
  try {
    const _0x153ea4 = await Promise.race([
      _0x3ee55d.previewToolResult(_0x58d2d9).catch(() => null),
      new Promise((_0x4c59c0) => {
        const _0x2f9ce6 = _0x5d1322;
        _0x4cc658 = setTimeout(() => {
          const _0x1cd87d = _0x31a8;
          (console.warn(
            "[IntegrationStudio] Live card for " +
              _0x58d2d9 +
              " timed out — reviewing its sample card instead",
          ),
            _0x4c59c0(null));
        }, _0x3ee55d.toolTimeoutMs ?? LIVE_TOOL_TIMEOUT_MS);
      }),
    ]);
    return _0x153ea4?.success ? (_0x153ea4.glance ?? null) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(_0x4cc658);
  }
}
async function collectStudioCards(_0x223428, _0x4536f1) {
  const _0x2d43c1 = _0x29902a,
    _0x434c63 = [],
    _0x52febc = _0x223428.preview?.toolPreviews ?? [];
  for (const _0x2bbd34 of _0x223428.manifest.tools) {
    const _0x5beb64 = _0x52febc.find(
        (_0x2ca6f9) => _0x2ca6f9.tool === _0x2bbd34.name,
      ),
      _0x597823 = _0x2bbd34.title || _0x2bbd34.name;
    if (_0x2bbd34.confirmation) {
      const _0x4cfe9b = findWidgetInView(_0x2bbd34.confirmation);
      if (!_0x4cfe9b) continue;
      _0x434c63.push({
        id: _0x2bbd34.name + ":confirmation",
        toolName: _0x2bbd34.name,
        label:
          _0x597823 + " — confirmation card (shown before the action runs)",
        kind: "confirmation",
        html: String(_0x4cfe9b.html),
        args: _0x5beb64?.sampleArgs ?? {},
        data: _0x4cfe9b.data,
        declaredHeight: heightOf(_0x4cfe9b),
        confirmLabel:
          typeof _0x4cfe9b.confirmLabel === "string"
            ? _0x4cfe9b.confirmLabel
            : undefined,
      });
      continue;
    }
    const _0x5ef807 = await liveCard(_0x4536f1, _0x2bbd34.name);
    let _0x43ecaf = _0x5ef807 ? findWidgetInGlance(_0x5ef807) : null;
    if (!_0x43ecaf) _0x43ecaf = findWidgetInGlance(_0x5beb64?.sampleGlance);
    if (!_0x43ecaf) continue;
    _0x434c63.push({
      id: _0x2bbd34.name + ":result",
      toolName: _0x2bbd34.name,
      label: _0x597823 + " — result card (shown after the action runs)",
      kind: "result",
      html: String(_0x43ecaf.html),
      data: _0x43ecaf.data,
      declaredHeight: heightOf(_0x43ecaf),
    });
  }
  return _0x434c63;
}
const MAX_AUTO_REVIEW_ROUNDS = 3;
function shouldReviewRound(_0x415850) {
  const _0x270c02 = _0x29902a;
  return (
    _0x415850.isCreateRun && _0x415850.roundsSoFar < MAX_AUTO_REVIEW_ROUNDS
  );
}
function _0x31a8(_0x233cb7, _0x146ef3) {
  _0x233cb7 = _0x233cb7 - 295;
  const _0x7bfc04 = _0x292a();
  let _0x54f6a3 = _0x7bfc04[_0x233cb7];
  return _0x54f6a3;
}
function shouldApplyReviewFeedback(_0x2abc88) {
  const _0x3b035a = _0x29902a;
  return _0x2abc88.roundsSoFar < MAX_AUTO_REVIEW_ROUNDS;
}
const EMPTY = { reviewed: 0, findings: [], feedback: null },
  KIT_BASE_CSS_SENTINEL =
    "@keyframes k-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}",
  MAX_STYLE_SOURCE_CHARS = 4e3;
function _0x292a() {
  const _0x2fa9e3 = [
    "roundsSoFar",
    "offscreen capture produced no images",
    "rows",
    "sqlite3",
    "stringify",
    " — result card (shown after the action runs)",
    "root",
    "executeJavaScript",
    "blocks",
    "bind",
    "zod",
    "_sentryDebugIdIdentifier",
    "4076667GBDqxS",
    "then",
    "&quot;",
    "stack",
    "info",
    "9bcde427-7ce0-431b-b344-9874c0fbdebd",
    "WIDGET_SURFACE_RADIUS_PX",
    "util",
    "px;}\n  iframe{display:block;width:100%;border:0;border-radius:",
    "find",
    "preview",
    "kind",
    " timed out — reviewing its sample card instead",
    "destroy",
    "themes",
    "&lt;",
    "2786640UJmigG",
    "lastIndexOf",
    "shouldApplyReviewFeedback",
    "replace",
    "dgram",
    "cancelled",
    ":result",
    "push",
    "#0a0a0c",
    "loadURL",
    "tools",
    "359752wFwfim",
    "findings",
    "now",
    "max",
    '{}.constructor("return this")( )',
    "errors",
    "SENTRY_RELEASE",
    "isArray",
    "__proto__",
    "glance",
    "posthog-node",
    "../main.js",
    ', msg.height)) + "px";\n      state.settled = true;\n    }\n  });\n\n  frame.addEventListener("load", function () {\n    frame.style.height = ',
    "webContents",
    "best",
    "map",
    "archive",
    '\n</div>\n<script>\n(function () {\n  var frame = document.getElementById("frame");\n  var state = { settled: false, measured: 0, errors: [] };\n  window.__voiceosCapture = state;\n\n  window.addEventListener("error", function (e) {\n    state.errors.push(String((e && e.message) || "error"));\n  });\n\n  window.addEventListener("message", function (event) {\n    if (event.source !== frame.contentWindow) return;\n    var msg = event.data;\n    if (!msg || typeof msg !== "object") return;\n    if (msg.type === "voiceos:resize" && typeof msg.height === "number") {\n      state.measured = msg.height;\n      frame.style.height =\n        Math.min(',
    "exception",
    "[IntegrationStudio] Card capture failed for ",
    "node:fs/promises",
    "signal",
    ", Math.max(",
    "number",
    "38373uhqspX",
    ";}\n  #stage{position:relative;width:",
    "child_process",
    "min",
    "manifest",
    "type",
    '<div id="confirm">',
    "prototype",
    "rgba(255,255,255,0.06)",
    "toStringTag",
    "table",
    " — confirmation card (shown before the action runs)",
    "bridgeSettled",
    "pngBase64",
    "readline",
    "toString",
    "feedback",
    "confirmation",
    "[IntegrationStudio] Live card for ",
    "node:os",
    "isFinite",
    "no custom cards to review",
    "return (function() ",
    ', "*");\n    } catch (err) {\n      state.errors.push("init postMessage failed: " + err);\n    }\n  });\n})();\n<\/script>\n</body></html>',
    "clipped",
    "length",
    "capturePage",
    "trace",
    "error",
    "_sentryDebugIds",
    "apply",
    "8KJUvdX",
    "previewToolResult",
    "footer",
    "measuredHeight",
    "toPNG",
    "Error",
    "html",
    "confirmLabel",
    "Module",
    "isDestroyed",
    "fflate",
    "object",
    "args",
    "measured",
    "console",
    "2397744WJqPMw",
    "the critic failed: ",
    "node:fs",
    "base64",
    "px;padding:",
    "px;\n    background:",
    "success",
    "round",
    "px;bottom:",
    "width",
    "node:readline",
    "extractAuthorStyle",
    "MAX_AUTO_REVIEW_ROUNDS",
    "get",
    "slice",
    "message",
    "1317302uXTKGR",
    "node:zlib",
    "psl",
    "label",
    "trim",
    "name",
    "children",
    "toolPreviews",
    "3053349DxoNKz",
    "log",
    "&gt;",
    ' + "px";\n    try {\n      frame.contentWindow.postMessage(',
    "124xmPROM",
    '(() => {\n    const stage = document.getElementById("stage").getBoundingClientRect();\n    const state = window.__voiceosCapture || {};\n    let inner = 0;\n    try {\n      inner = document.getElementById("frame").contentDocument.documentElement.scrollHeight;\n    } catch (e) { inner = 0; }\n    return {\n      width: Math.ceil(stage.width),\n      height: Math.ceil(stage.height),\n      measured: state.measured || inner || 0,\n      errors: (state.errors || []).slice(0, 5),\n    };\n  })()',
    "light",
    "sampleArgs",
    "critique",
    "theme",
    "hardenWidgetDocument",
    "dark",
    "isCreateRun",
    "toolTimeoutMs",
    "rgba(0,0,0,0.05)",
    "declaredHeight",
    "[IntegrationStudio] Card capture timed out: ",
    "worker_threads",
    "toolName",
    "consoleErrors",
    "aborted",
    "indexOf",
    "fs/promises",
    "runVisualReview",
    "collectStudioCards",
    "cancelled before the critique",
    "</div>",
    "node:perf_hooks",
    "data",
    "&amp;",
    "\n/* …truncated */",
    "title",
    "sampleGlance",
    ";}\n  /* The button VoiceOS floats over the widget — copied from\n     FloatingConfirmButton so the review sees the real occlusion. */\n  #confirm{position:absolute;right:",
    "shouldReviewRound",
    "node:child_process",
    "string",
    "catch",
    "race",
    "BrowserWindow",
    "events",
    '<!doctype html>\n<html><head><meta charset="utf-8"><style>\n  html,body{margin:0;padding:0;background:',
    '"></iframe>\n  ',
    "warn",
    "constructor",
    "resize",
    'px;\n    height:30px;padding:0 18px;display:flex;align-items:center;\n    font:600 13px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;\n    letter-spacing:0.01em;color:rgba(255,255,255,0.96);background:rgba(17,18,21,0.85);\n    border:1px solid rgba(255,255,255,0.22);border-radius:999px;\n    box-shadow:0 3px 12px rgba(0,0,0,0.32),0 1px 3px rgba(0,0,0,0.28);}\n</style></head>\n<body>\n<div id="stage">\n  <iframe id="frame" sandbox="allow-scripts" srcdoc="',
    ":confirmation",
    "items",
    "undefined",
    "#f2f2f4",
    "tool",
    "height",
    "defineProperty",
  ];
  _0x292a = function () {
    return _0x2fa9e3;
  };
  return _0x292a();
}
function extractAuthorStyle(_0x3255f0) {
  const _0x19ad5f = _0x29902a,
    _0x37cb3c = _0x3255f0.indexOf("<style>"),
    _0x25865c = _0x3255f0.indexOf("</style>", _0x37cb3c);
  if (_0x37cb3c < 0 || _0x25865c < 0) return "";
  const _0x26d234 = _0x3255f0.slice(_0x37cb3c + "<style>".length, _0x25865c),
    _0x4c5396 = _0x26d234.lastIndexOf(KIT_BASE_CSS_SENTINEL),
    _0x24843f = (
      _0x4c5396 < 0
        ? _0x26d234.slice(-MAX_STYLE_SOURCE_CHARS)
        : _0x26d234.slice(_0x4c5396 + KIT_BASE_CSS_SENTINEL.length)
    ).trim();
  return _0x24843f.length > MAX_STYLE_SOURCE_CHARS
    ? _0x24843f.slice(0, MAX_STYLE_SOURCE_CHARS) + "\n/* …truncated */"
    : _0x24843f;
}
async function runVisualReview(_0x5eb2c2, _0x5ece82) {
  const _0x5932ab = _0x29902a;
  try {
    const _0x149a83 = (_0x55f88b, _0x5a9a1f, _0x23ebf0, _0x3b8ad2) =>
        _0x5ece82.archive?.({
          shots: _0x55f88b,
          findings: _0x5a9a1f,
          feedback: _0x23ebf0,
          note: _0x3b8ad2,
        }),
      _0x52d8f6 = await collectStudioCards(_0x5eb2c2, _0x5ece82);
    if (_0x52d8f6.length === 0) {
      const _0x369e6f = "no custom cards to review";
      return (
        _0x149a83([], [], null, _0x369e6f),
        { ...EMPTY, skippedReason: _0x369e6f }
      );
    }
    const _0x4f1cff = await captureStudioCards(_0x52d8f6, {
      themes: ["dark"],
      signal: _0x5ece82.signal,
    });
    if (_0x4f1cff.length === 0) {
      const _0x81fc26 = "offscreen capture produced no images";
      return (
        _0x149a83([], [], null, _0x81fc26),
        { ...EMPTY, skippedReason: _0x81fc26 }
      );
    }
    if (_0x5ece82.signal?.aborted)
      return (
        _0x149a83(_0x4f1cff, [], null, "cancelled before the critique"),
        { ...EMPTY, skippedReason: "cancelled" }
      );
    const _0x478af2 = new Map(
        _0x52d8f6.map((_0x47b6e8) => [
          _0x47b6e8.id,
          extractAuthorStyle(_0x47b6e8.html),
        ]),
      ),
      _0x12ed96 = _0x5ece82.critique({
        artifact: _0x5eb2c2,
        cards: _0x4f1cff.map((_0x3caec3) => ({
          id: _0x3caec3.id,
          toolName: _0x3caec3.toolName,
          label: _0x3caec3.label,
          kind: _0x3caec3.kind,
          theme: _0x3caec3.theme,
          pngBase64: _0x3caec3.pngBase64,
          declaredHeight: _0x3caec3.declaredHeight,
          measuredHeight: _0x3caec3.measuredHeight,
          clipped: _0x3caec3.clipped,
          bridgeSettled: _0x3caec3.bridgeSettled,
          consoleErrors: _0x3caec3.consoleErrors,
          styleSource: _0x478af2.get(_0x3caec3.id) || undefined,
        })),
      }),
      _0x55ae7 = await _0x12ed96.catch((_0x4c0543) => {
        const _0x13e0ad = _0x5932ab;
        _0x149a83(
          _0x4f1cff,
          [],
          null,
          "the critic failed: " +
            (_0x4c0543 instanceof Error ? _0x4c0543.message : "unknown error"),
        );
        throw _0x4c0543;
      }),
      _0x2ec2f1 = _0x55ae7?.findings ?? [],
      _0x31932e = _0x55ae7?.feedback?.["trim"]() || null;
    return (
      _0x149a83(
        _0x4f1cff,
        _0x2ec2f1,
        _0x31932e,
        _0x55ae7 ? undefined : "the critic did not answer",
      ),
      { reviewed: _0x4f1cff.length, findings: _0x2ec2f1, feedback: _0x31932e }
    );
  } catch (_0x5e4633) {
    return (
      console.warn(
        "[IntegrationStudio] Visual review failed:",
        _0x5e4633 instanceof Error ? _0x5e4633.message : _0x5e4633,
      ),
      { ...EMPTY, skippedReason: "review errored" }
    );
  }
}
((exports.MAX_AUTO_REVIEW_ROUNDS = MAX_AUTO_REVIEW_ROUNDS),
  (exports.collectStudioCards = collectStudioCards),
  (exports.extractAuthorStyle = extractAuthorStyle),
  (exports.runVisualReview = runVisualReview),
  (exports.shouldApplyReviewFeedback = shouldApplyReviewFeedback),
  (exports.shouldReviewRound = shouldReviewRound));
