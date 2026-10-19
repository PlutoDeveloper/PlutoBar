"use strict";
const _0x15be8e = _0x5349;
(function (_0x1b21d3, _0x394c88) {
  const _0x127a2e = _0x5349,
    _0x4c58a5 = _0x1b21d3();
  while (!false) {
    try {
      const _0x1e5d0c =
        (parseInt("1199HTFgtw") / 1) * (parseInt("802uAVSTz") / 2) +
        -parseInt("3474321jtXSiU") / 3 +
        (parseInt("955628DmomPT") / 4) * (-parseInt("10ICOJIT") / 5) +
        (-parseInt("204yzAtHh") / 6) * (parseInt("277382HKtcgB") / 7) +
        -parseInt("1364032ErEcbe") / 8 +
        (parseInt("9gxKIrD") / 9) * (-parseInt("2995750VRnTaM") / 10) +
        (parseInt("28831DaKTnw") / 11) * (parseInt("17772PYaATR") / 12);
      if (_0x1e5d0c === _0x394c88) break;
      else _0x4c58a5.push(_0x4c58a5.shift());
    } catch (_0x20e9ba) {
      _0x4c58a5.push(_0x4c58a5.shift());
    }
  }
})(_0x1593, 909216);
(!(function () {
  const _0x56f478 = _0x5349,
    _0x5c959e = /* @__PURE__ */ (function () {
      let _0x4c441a = !false;
      return function (_0x1b6670, _0x5d654e) {
        const _0x53d5f1 = _0x4c441a
          ? function () {
              const _0xf11349 = _0x5349;
              if (_0x5d654e) {
                const _0x55269c = _0x5d654e.apply(_0x1b6670, arguments);
                return ((_0x5d654e = null), _0x55269c);
              }
            }
          : function () {};
        return ((_0x4c441a = false), _0x53d5f1);
      };
    })(),
    _0x43cde2 = _0x5c959e(this, function () {
      const _0xc641d8 = _0x5349;
      let _0x57402d;
      try {
        const _0x16165e = Function(
          "return (function() " + '{}.constructor("return this")( )' + ");",
        );
        _0x57402d = _0x16165e();
      } catch (_0x9bbf2f) {
        _0x57402d = window;
      }
      const _0x2d8a42 = (_0x57402d.console = _0x57402d.console || {}),
        _0x1a14e0 = [
          "log",
          "warn",
          "info",
          "error",
          "exception",
          "table",
          "trace",
        ];
      for (let _0x49dc2e = 0; _0x49dc2e < _0x1a14e0.length; _0x49dc2e++) {
        const _0x4d880c = _0x5c959e.constructor.prototype.bind(_0x5c959e),
          _0x3e942c = _0x1a14e0[_0x49dc2e],
          _0x11f3e1 = _0x2d8a42[_0x3e942c] || _0x4d880c;
        ((_0x4d880c.__proto__ = _0x5c959e.bind(_0x5c959e)),
          (_0x4d880c.toString = _0x11f3e1.toString.bind(_0x11f3e1)),
          (_0x2d8a42[_0x3e942c] = _0x4d880c));
      }
    });
  _0x43cde2();
  try {
    var _0x49b55e =
      "undefined" != typeof window
        ? window
        : "undefined" != typeof global
          ? global
          : "undefined" != typeof globalThis
            ? globalThis
            : "undefined" != typeof self
              ? self
              : {};
    _0x49b55e.SENTRY_RELEASE = { id: "voiceos-opensourced@0.1.33" };
    var _0x4c7066 = new _0x49b55e.Error().stack;
    _0x4c7066 &&
      ((_0x49b55e._sentryDebugIds = _0x49b55e._sentryDebugIds || {}),
      (_0x49b55e._sentryDebugIds[_0x4c7066] =
        "9a4f802e-86d0-446c-ad84-3fbf01c31b6b"),
      (_0x49b55e._sentryDebugIdIdentifier =
        "sentry-dbid-9a4f802e-86d0-446c-ad84-3fbf01c31b6b"));
  } catch (_0x100b32) {}
})(),
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" }));
function _0x5349(_0x355c54, _0x1ee24f) {
  _0x355c54 = _0x355c54 - 354;
  const _0x45be54 = _0x1593();
  let _0xc2f83c = _0x45be54[_0x355c54];
  return _0xc2f83c;
}
const CLAUDE_DESKTOP_BUNDLE_ID = "com.anthropic.claudefordesktop",
  BROWSER_BUNDLE_PREFIXES = [
    "com.google.chrome",
    "com.apple.safari",
    "org.mozilla.firefox",
    "com.microsoft.edgemac",
    "com.brave.browser",
    "company.thebrowser.browser",
    "com.operasoftware.opera",
    "com.vivaldi.vivaldi",
  ],
  AGENT_NUDGE_SURFACE_MATCHERS = [
    {
      slug: "chatgpt",
      surfaceType: "ai_chat",
      bundleIds: ["com.openai.chat"],
      urlHosts: ["chatgpt.com", "chat.openai.com"],
    },
    {
      slug: "claude",
      surfaceType: "ai_chat",
      bundleIds: [CLAUDE_DESKTOP_BUNDLE_ID],
      urlHosts: ["claude.ai"],
    },
    {
      slug: "google",
      surfaceType: "web_search",
      bundleIds: [],
      urlHosts: [],
      exactUrlHosts: ["google.com", "www.google.com"],
    },
    {
      slug: "bing",
      surfaceType: "web_search",
      bundleIds: [],
      urlHosts: ["bing.com"],
    },
    {
      slug: "duckduckgo",
      surfaceType: "web_search",
      bundleIds: [],
      urlHosts: ["duckduckgo.com"],
    },
    {
      slug: "codex",
      surfaceType: "coding",
      bundleIds: ["com.openai.codex"],
      urlHosts: [],
    },
    {
      slug: "cursor",
      surfaceType: "coding",
      bundleIds: ["com.todesktop.230313mzl4w4u92"],
      urlHosts: [],
    },
    {
      slug: "vscode",
      surfaceType: "coding",
      bundleIds: ["com.microsoft.vscode"],
      urlHosts: [],
    },
    {
      slug: "windsurf",
      surfaceType: "coding",
      bundleIds: ["com.exafunction.windsurf"],
      urlHosts: [],
    },
    {
      slug: "zed",
      surfaceType: "coding",
      bundleIds: ["dev.zed.zed"],
      urlHosts: [],
    },
  ];
function getHostname(_0x23660) {
  const _0x3222e6 = _0x15be8e;
  if (!_0x23660) return undefined;
  try {
    return new URL(_0x23660).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}
function hostMatches(_0x5cda54, _0x3c9fce) {
  const _0x1d25ba = _0x15be8e;
  return _0x5cda54 === _0x3c9fce || _0x5cda54.endsWith("." + _0x3c9fce);
}
function detectAgentNudgeSurface(_0x465cb9) {
  const _0x3c60fe = _0x15be8e,
    { bundleId: _0x41e620, url: _0x4abd70 } = _0x465cb9;
  if (_0x41e620) {
    const _0x1c96d4 = _0x41e620.toLowerCase();
    for (const _0x4630c7 of AGENT_NUDGE_SURFACE_MATCHERS) {
      if (_0x4630c7.bundleIds.includes(_0x1c96d4))
        return { slug: _0x4630c7.slug, surfaceType: _0x4630c7.surfaceType };
    }
  }
  const _0x2eebbf = getHostname(_0x4abd70);
  if (_0x2eebbf)
    for (const _0x138e6b of AGENT_NUDGE_SURFACE_MATCHERS) {
      if (
        _0x138e6b.urlHosts.some((_0x1d1af5) =>
          hostMatches(_0x2eebbf, _0x1d1af5),
        ) ||
        _0x138e6b.exactUrlHosts?.includes(_0x2eebbf)
      )
        return { slug: _0x138e6b.slug, surfaceType: _0x138e6b.surfaceType };
    }
  if (_0x2eebbf) return { slug: "browser", surfaceType: "browser" };
  if (_0x41e620) {
    const _0x67ab06 = _0x41e620.toLowerCase();
    if (
      BROWSER_BUNDLE_PREFIXES.some((_0xa961ec) =>
        _0x67ab06.startsWith(_0xa961ec),
      )
    )
      return { slug: "browser", surfaceType: "browser" };
  }
  return null;
}
((exports.AGENT_NUDGE_SURFACE_MATCHERS = AGENT_NUDGE_SURFACE_MATCHERS),
  (exports.detectAgentNudgeSurface = detectAgentNudgeSurface));
function _0x1593() {
  const _0xf344be = [
    "SENTRY_RELEASE",
    "toLowerCase",
    "google",
    "error",
    "277382HKtcgB",
    "toStringTag",
    "defineProperty",
    "coding",
    "Module",
    "undefined",
    "204yzAtHh",
    "Error",
    "_sentryDebugIds",
    "log",
    "stack",
    "955628DmomPT",
    "browser",
    "com.todesktop.230313mzl4w4u92",
    "10ICOJIT",
    "9a4f802e-86d0-446c-ad84-3fbf01c31b6b",
    "chatgpt",
    "warn",
    "duckduckgo.com",
    "exactUrlHosts",
    "trace",
    "slug",
    "claude",
    "www.google.com",
    "com.google.chrome",
    "length",
    "cursor",
    "bundleIds",
    "com.operasoftware.opera",
    "hostname",
    "some",
    "table",
    "exception",
    "9gxKIrD",
    "prototype",
    "chatgpt.com",
    "zed",
    "__proto__",
    "includes",
    "windsurf",
    "28831DaKTnw",
    "802uAVSTz",
    "17772PYaATR",
    "urlHosts",
    "console",
    "2995750VRnTaM",
    "bing.com",
    "ai_chat",
    "com.vivaldi.vivaldi",
    "detectAgentNudgeSurface",
    "1199HTFgtw",
    "1364032ErEcbe",
    "com.anthropic.claudefordesktop",
    "com.microsoft.edgemac",
    "constructor",
    "info",
    "duckduckgo",
    "return (function() ",
    "3474321jtXSiU",
    "_sentryDebugIdIdentifier",
    "google.com",
    "AGENT_NUDGE_SURFACE_MATCHERS",
    "com.brave.browser",
    "surfaceType",
    "com.apple.safari",
    "bind",
    "bing",
    "endsWith",
    "apply",
    "toString",
    "startsWith",
    "claude.ai",
    '{}.constructor("return this")( )',
  ];
  _0x1593 = function () {
    return _0xf344be;
  };
  return _0x1593();
}
