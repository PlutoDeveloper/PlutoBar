"use strict";
const _0x12dd1b = _0x3d54;
(function (_0x196cd2, _0x7684b3) {
  const _0x3646b2 = _0x3d54,
    _0x1ef0f4 = _0x196cd2();
  while (!false) {
    try {
      const _0x5c61e4 =
        (parseInt("405906NYzzaa") / 1) * (parseInt("2HoMYib") / 2) +
        parseInt("145533svFLBB") / 3 +
        parseInt("1186092PaFBDb") / 4 +
        -parseInt("2488900YVHWdT") / 5 +
        (-parseInt("84YqSUqb") / 6) * (parseInt("347263FLDsLG") / 7) +
        (parseInt("1816wWrxmm") / 8) * (-parseInt("34938fqKfwT") / 9) +
        (-parseInt("2579340jGlmmn") / 10) * (-parseInt("77DNwuWw") / 11);
      if (_0x5c61e4 === _0x7684b3) break;
      else _0x1ef0f4.push(_0x1ef0f4.shift());
    } catch (_0x20b7a1) {
      _0x1ef0f4.push(_0x1ef0f4.shift());
    }
  }
})(_0x382b, 482958);
function _0x382b() {
  const _0x29f53e = [
    "arrayBuffer",
    "get",
    "data:",
    ".ico",
    "toPNG",
    "toLowerCase",
    "source",
    "round",
    "prototype",
    "headers",
    "__proto__",
    "2488900YVHWdT",
    "34938fqKfwT",
    "px;position:relative;overflow:hidden}\n  #bg{position:absolute;inset:0}\n  /* Inset treatment: a bare glyph needs breathing room and a ground. */\n  #mark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);\n    width:",
    `;
  var state = { done: false, dominant: "#3987e5", px: 0, source: "", usable: false, bleed: false, fill: 0 };
  window.__brandIcon = state;

  function load(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  /* Dominant colour of the MARK, not of the image.
     Transparent padding, the white a logo sits on, and near-black outlines are
     all excluded, because every one of them is the majority pixel in some
     real logo and none of them is that brand's colour. What is left is scored
     by saturation so a colourful mark beats residual grey. */
  function dominantColor(img) {
    var N = 64;
    var c = document.createElement("canvas");
    c.width = N; c.height = N;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, N, N);
    var data;
    try { data = ctx.getImageData(0, 0, N, N).data; } catch (e) { return null; }

    var buckets = {};
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 160) continue;
      var max = Math.max(r,g,b), min = Math.min(r,g,b);
      var lum = (max + min) / 2;
      var sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));
      if (lum > 242 || lum < 14) continue;          // paper white / pure black
      if (sat < 0.12 && lum > 200) continue;         // off-white backdrop
      var key = (r>>4) + "," + (g>>4) + "," + (b>>4);
      var bucket = buckets[key] || (buckets[key] = { r:0, g:0, b:0, n:0, sat:sat });
      bucket.r += r; bucket.g += g; bucket.b += b; bucket.n++;
      if (sat > bucket.sat) bucket.sat = sat;
    }

    var best = null, bestScore = -1;
    for (var k in buckets) {
      var v = buckets[k];
      // Frequency decides, but saturation breaks ties hard — a logo that is
      // 70% grey chrome and 30% brand colour should report the brand colour.
      var score = v.n * (0.35 + v.sat);
      if (score > bestScore) { bestScore = score; best = v; }
    }
    if (!best) return null;
    var hex = function (x) { return ("0" + Math.round(x / best.n).toString(16)).slice(-2); };
    return "#" + hex(best.r) + hex(best.g) + hex(best.b);
  }

  /* Crop to the artwork, then ask what shape it is.
     Sources arrive padded in every combination: a bare glyph on transparency,
     a full-bleed tile, and — the case that fooled a naive edge test — a
     rounded tile with its own transparent margin already baked in. Measuring
     the raw canvas calls that last one "a glyph" and pads it a second time,
     producing a small tile floating inside a bigger one. So find the artwork's
     bounding box first and judge only what is inside it: a box that is
     essentially solid is an app icon and gets used corner to corner, anything
     sparser is a mark that wants a ground. */
  function contentProfile(img) {
    var N = 48;
    var c = document.createElement("canvas");
    c.width = N; c.height = N;
    var ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, N, N);
    var data;
    try { data = ctx.getImageData(0, 0, N, N).data; } catch (e) { return null; }

    var minX = N, minY = N, maxX = -1, maxY = -1;
    for (var y = 0; y < N; y++) {
      for (var x = 0; x < N; x++) {
        if (data[(y * N + x) * 4 + 3] > 24) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return null;

    var bw = maxX - minX + 1, bh = maxY - minY + 1;
    var opaque = 0;
    for (var yy = minY; yy <= maxY; yy++) {
      for (var xx = minX; xx <= maxX; xx++) {
        if (data[(yy * N + xx) * 4 + 3] > 128) opaque++;
      }
    }
    var scale = img.naturalWidth / N;
    return {
      fill: opaque / (bw * bh),
      // Natural-pixel crop rect, so the redraw loses no resolution.
      crop: {
        x: Math.max(0, Math.floor(minX * scale)),
        y: Math.max(0, Math.floor(minY * scale)),
        w: Math.min(img.naturalWidth, Math.ceil(bw * scale)),
        h: Math.min(img.naturalHeight, Math.ceil(bh * scale)),
      },
    };
  }

  /* Re-render just the artwork, square, at output resolution. Removing the
     source's own padding is what stops us adding padding on top of padding. */
  function cropToSquare(img, crop) {
    var side = Math.max(crop.w, crop.h);
    var c = document.createElement("canvas");
    c.width = side; c.height = side;
    var ctx = c.getContext("2d");
    ctx.drawImage(
      img,
      crop.x, crop.y, crop.w, crop.h,
      Math.round((side - crop.w) / 2), Math.round((side - crop.h) / 2), crop.w, crop.h,
    );
    try { return c.toDataURL("image/png"); } catch (e) { return img.src; }
  }

  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  (async function () {
    var best = null;
    for (var i = 0; i < SOURCES.length; i++) {
      var img = await load(SOURCES[i].url);
      if (!img || !img.naturalWidth) continue;
      if (!best || img.naturalWidth > best.img.naturalWidth) {
        best = { img: img, source: SOURCES[i].source };
      }
    }
    if (!best) { state.done = true; return; }

    state.px = best.img.naturalWidth;
    state.source = best.source;
    state.usable = best.img.naturalWidth >= `,
    "fetchBrandLogos",
    "stack",
    "toString",
    "length",
    "wedged",
    '{}.constructor("return this")( )',
    "405906NYzzaa",
    "Error",
    "2HoMYib",
    "constructor",
    "stringify",
    "info",
    "log",
    "bleed",
    "px;height:",
    "race",
    " after ",
    "BrowserWindow",
    "table",
    "145533svFLBB",
    "follow",
    "trace",
    "2579340jGlmmn",
    "executeJavaScript",
    "split",
    "loadURL",
    "[IntegrationStudio] Brand icon composite wedged for ",
    "347263FLDsLG",
    "77DNwuWw",
    "[IntegrationStudio] Brand icon capture came back blank for ",
    "timeout",
    ';\n\n    var dom = dominantColor(best.img) || "#3987e5";\n    state.dominant = dom;\n\n    var profile = contentProfile(best.img);\n    var markSrc = profile ? cropToSquare(best.img, profile.crop) : best.img.src;\n    // A near-solid bounding box means the artwork IS the tile.\n    state.fill = profile ? Math.round(profile.fill * 100) / 100 : 0;\n    // A circle fills ~0.79 of its box, a rounded tile ~0.9+ — the gap is where\n    // this sits, so a round logo keeps its ground and a tile goes full-bleed.\n    var bleed = !!profile && profile.fill > 0.84;\n    state.bleed = bleed;\n\n    var bg = document.getElementById("bg");\n    if (bleed) {\n      /* Its own tile, used as-is. The ground only shows through rounded\n         corners, so it matches the mark rather than contrasting with it. */\n      document.getElementById("stage").className = "bleed";\n      bg.style.background = dom;\n    } else {\n      /* A bare glyph. Here the ground is chosen for CONTRAST WITH THE MARK,\n         not brand loyalty: painting a green logo onto its own green makes it\n         vanish. Light marks get a near-black field, everything else near-white\n         — which is what most real app icons for these services already do. */\n      bg.style.background = luminance(dom) > 0.72\n        ? "linear-gradient(180deg,#2b2b2f 0%,#161617 100%)"\n        : "linear-gradient(180deg,#ffffff 0%,#f1f1f4 100%)";\n    }\n\n    document.getElementById("mark").src = markSrc;\n    state.done = true;\n  })();\n})();\n<\/script></body></html>',
    "1186092PaFBDb",
    "map",
    "error",
    "isEmpty",
    "1816wWrxmm",
    "toStringTag",
    "isDestroyed",
    "&sz=256",
    "Module",
    "console",
    "destroy",
    "webContents",
    "floor",
    "https://www.google.com/s2/favicons?domain=",
    "warn",
    "/apple-touch-icon.png",
    "then",
    "dominant",
    "https://icons.duckduckgo.com/ip3/",
    "now",
    ";base64,",
    "apply",
    "_sentryDebugIdIdentifier",
    "from",
    "mimeType",
    "SENTRY_RELEASE",
    "d45a9703-34a4-4689-8ffd-af43b7847071",
    "bind",
    "all",
    "return (function() ",
    'px;\n    object-fit:contain;image-rendering:auto}\n  /* Full-bleed treatment: the source IS already the app icon. */\n  #stage.bleed #mark{width:100%;height:100%;object-fit:cover}\n</style></head>\n<body><div id="stage"><div id="bg"></div><img id="mark" alt=""></div>\n<script>\n(function () {\n  var SOURCES = ',
    '<!doctype html>\n<html><head><meta charset="utf-8"><style>\n  html,body{margin:0;padding:0;background:transparent}\n  #stage{width:',
    "fill",
    "test",
    "undefined",
    "exception",
    "toBitmap",
    "capturePage",
    "filter",
    "requested",
    "max",
    "resize",
    "84YqSUqb",
    "base64",
    "message",
    "done",
    "usable",
    "buildBrandIcon",
    "/apple-touch-icon-precomposed.png",
    "defineProperty",
    "isBlankBitmap",
    "https://",
    "trim",
    "replace",
    "_sentryDebugIds",
  ];
  _0x382b = function () {
    return _0x29f53e;
  };
  return _0x382b();
}
(!(function () {
  const _0x34f55c = _0x3d54,
    _0x13c054 = /* @__PURE__ */ (function () {
      let _0x1f290d = !false;
      return function (_0x5dbf05, _0x4acd2c) {
        const _0x427aff = _0x1f290d
          ? function () {
              const _0x13a06f = _0x3d54;
              if (_0x4acd2c) {
                const _0x59f3d8 = _0x4acd2c.apply(_0x5dbf05, arguments);
                return ((_0x4acd2c = null), _0x59f3d8);
              }
            }
          : function () {};
        return ((_0x1f290d = false), _0x427aff);
      };
    })(),
    _0x4d634e = _0x13c054(this, function () {
      const _0x5ce44a = _0x3d54;
      let _0x52fcb6;
      try {
        const _0x34b619 = Function(
          "return (function() " + '{}.constructor("return this")( )' + ");",
        );
        _0x52fcb6 = _0x34b619();
      } catch (_0x38402a) {
        _0x52fcb6 = window;
      }
      const _0x5ca519 = (_0x52fcb6.console = _0x52fcb6.console || {}),
        _0x3ed08d = [
          "log",
          "warn",
          "info",
          "error",
          "exception",
          "table",
          "trace",
        ];
      for (let _0xb126f2 = 0; _0xb126f2 < _0x3ed08d.length; _0xb126f2++) {
        const _0xc18627 = _0x13c054.constructor.prototype.bind(_0x13c054),
          _0x2ac3c9 = _0x3ed08d[_0xb126f2],
          _0xc3aa69 = _0x5ca519[_0x2ac3c9] || _0xc18627;
        ((_0xc18627.__proto__ = _0x13c054.bind(_0x13c054)),
          (_0xc18627.toString = _0xc3aa69.toString.bind(_0xc3aa69)),
          (_0x5ca519[_0x2ac3c9] = _0xc18627));
      }
    });
  _0x4d634e();
  try {
    var _0x56a1bc =
      "undefined" != typeof window
        ? window
        : "undefined" != typeof global
          ? global
          : "undefined" != typeof globalThis
            ? globalThis
            : "undefined" != typeof self
              ? self
              : {};
    _0x56a1bc.SENTRY_RELEASE = { id: "voiceos-opensourced@0.1.33" };
    var _0x4616b4 = new _0x56a1bc.Error().stack;
    _0x4616b4 &&
      ((_0x56a1bc._sentryDebugIds = _0x56a1bc._sentryDebugIds || {}),
      (_0x56a1bc._sentryDebugIds[_0x4616b4] =
        "d45a9703-34a4-4689-8ffd-af43b7847071"),
      (_0x56a1bc._sentryDebugIdIdentifier =
        "sentry-dbid-d45a9703-34a4-4689-8ffd-af43b7847071"));
  } catch (_0x4d379a) {}
})(),
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" }));
const log = require("electron-log"),
  electron = require("electron"),
  ICON_SIZE = 256,
  LOGO_SCALE = 0.56,
  FETCH_TIMEOUT_MS = 6e3,
  RENDER_TIMEOUT_MS = 8e3,
  COMPOSE_TIMEOUT_MS = 12e3,
  WEDGED = Symbol("wedged"),
  MIN_USABLE_PX = 48,
  MIN_REQUESTED_PX = 32;
function logoCandidates(_0x14043c) {
  const _0x22a9fa = _0x12dd1b;
  return [
    "https://icons.duckduckgo.com/ip3/" + _0x14043c + ".ico",
    "https://www.google.com/s2/favicons?domain=" + _0x14043c + "&sz=256",
    "https://" + _0x14043c + "/apple-touch-icon.png",
    "https://" + _0x14043c + "/apple-touch-icon-precomposed.png",
  ];
}
const isImage = (_0x1b035c) =>
  /^image\/(png|jpeg|x-icon|vnd\.microsoft\.icon|webp|gif|svg\+xml)/i.test(
    _0x1b035c,
  );
function _0x3d54(_0x27f62a, _0x5cd44c) {
  _0x27f62a = _0x27f62a - 328;
  const _0x50ca86 = _0x382b();
  let _0x2def61 = _0x50ca86[_0x27f62a];
  return _0x2def61;
}
async function fetchCandidate(_0xc5a1eb) {
  const _0x5b752b = _0x12dd1b;
  try {
    const _0x77186b = await fetch(_0xc5a1eb, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!_0x77186b.ok) return null;
    const _0xdda600 = _0x77186b.headers.get("content-type") ?? "";
    if (!isImage(_0xdda600)) return null;
    const _0xb1fcc7 = Buffer.from(await _0x77186b.arrayBuffer());
    if (_0xb1fcc7.length < 200) return null;
    return {
      base64: _0xb1fcc7.toString("base64"),
      mimeType: _0xdda600.split(";")[0].trim(),
      bytes: _0xb1fcc7.length,
      source: _0xc5a1eb,
    };
  } catch {
    return null;
  }
}
async function fetchBrandLogos(_0x59acbd) {
  const _0xd65948 = _0x12dd1b,
    _0x4245a7 = await Promise.all(
      logoCandidates(_0x59acbd).map((_0x3acaee) => fetchCandidate(_0x3acaee)),
    );
  return _0x4245a7.filter((_0xd1709a) => _0xd1709a !== null);
}
function buildComposerDocument(_0x50ce07, _0x2b8075 = MIN_USABLE_PX) {
  const _0x5aaade = _0x12dd1b,
    _0x5d590b = _0x50ce07.map((_0x592ff5) => ({
      url: "data:" + _0x592ff5.mimeType + ";base64," + _0x592ff5.base64,
      source: _0x592ff5.source,
    }));
  return (
    '<!doctype html>\n<html><head><meta charset="utf-8"><style>\n  html,body{margin:0;padding:0;background:transparent}\n  #stage{width:' +
    ICON_SIZE +
    "px;height:" +
    ICON_SIZE +
    "px;position:relative;overflow:hidden}\n  #bg{position:absolute;inset:0}\n  /* Inset treatment: a bare glyph needs breathing room and a ground. */\n  #mark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);\n    width:" +
    Math.round(ICON_SIZE * LOGO_SCALE) +
    "px;height:" +
    Math.round(ICON_SIZE * LOGO_SCALE) +
    'px;\n    object-fit:contain;image-rendering:auto}\n  /* Full-bleed treatment: the source IS already the app icon. */\n  #stage.bleed #mark{width:100%;height:100%;object-fit:cover}\n</style></head>\n<body><div id="stage"><div id="bg"></div><img id="mark" alt=""></div>\n<script>\n(function () {\n  var SOURCES = ' +
    JSON.stringify(_0x5d590b) +
    ';\n  var state = { done: false, dominant: "#3987e5", px: 0, source: "", usable: false, bleed: false, fill: 0 };\n  window.__brandIcon = state;\n\n  function load(src) {\n    return new Promise(function (resolve) {\n      var img = new Image();\n      img.onload = function () { resolve(img); };\n      img.onerror = function () { resolve(null); };\n      img.src = src;\n    });\n  }\n\n  /* Dominant colour of the MARK, not of the image.\n     Transparent padding, the white a logo sits on, and near-black outlines are\n     all excluded, because every one of them is the majority pixel in some\n     real logo and none of them is that brand\'s colour. What is left is scored\n     by saturation so a colourful mark beats residual grey. */\n  function dominantColor(img) {\n    var N = 64;\n    var c = document.createElement("canvas");\n    c.width = N; c.height = N;\n    var ctx = c.getContext("2d", { willReadFrequently: true });\n    ctx.drawImage(img, 0, 0, N, N);\n    var data;\n    try { data = ctx.getImageData(0, 0, N, N).data; } catch (e) { return null; }\n\n    var buckets = {};\n    for (var i = 0; i < data.length; i += 4) {\n      var r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];\n      if (a < 160) continue;\n      var max = Math.max(r,g,b), min = Math.min(r,g,b);\n      var lum = (max + min) / 2;\n      var sat = max === min ? 0 : (max - min) / (255 - Math.abs(max + min - 255));\n      if (lum > 242 || lum < 14) continue;          // paper white / pure black\n      if (sat < 0.12 && lum > 200) continue;         // off-white backdrop\n      var key = (r>>4) + "," + (g>>4) + "," + (b>>4);\n      var bucket = buckets[key] || (buckets[key] = { r:0, g:0, b:0, n:0, sat:sat });\n      bucket.r += r; bucket.g += g; bucket.b += b; bucket.n++;\n      if (sat > bucket.sat) bucket.sat = sat;\n    }\n\n    var best = null, bestScore = -1;\n    for (var k in buckets) {\n      var v = buckets[k];\n      // Frequency decides, but saturation breaks ties hard — a logo that is\n      // 70% grey chrome and 30% brand colour should report the brand colour.\n      var score = v.n * (0.35 + v.sat);\n      if (score > bestScore) { bestScore = score; best = v; }\n    }\n    if (!best) return null;\n    var hex = function (x) { return ("0" + Math.round(x / best.n).toString(16)).slice(-2); };\n    return "#" + hex(best.r) + hex(best.g) + hex(best.b);\n  }\n\n  /* Crop to the artwork, then ask what shape it is.\n     Sources arrive padded in every combination: a bare glyph on transparency,\n     a full-bleed tile, and — the case that fooled a naive edge test — a\n     rounded tile with its own transparent margin already baked in. Measuring\n     the raw canvas calls that last one "a glyph" and pads it a second time,\n     producing a small tile floating inside a bigger one. So find the artwork\'s\n     bounding box first and judge only what is inside it: a box that is\n     essentially solid is an app icon and gets used corner to corner, anything\n     sparser is a mark that wants a ground. */\n  function contentProfile(img) {\n    var N = 48;\n    var c = document.createElement("canvas");\n    c.width = N; c.height = N;\n    var ctx = c.getContext("2d", { willReadFrequently: true });\n    ctx.drawImage(img, 0, 0, N, N);\n    var data;\n    try { data = ctx.getImageData(0, 0, N, N).data; } catch (e) { return null; }\n\n    var minX = N, minY = N, maxX = -1, maxY = -1;\n    for (var y = 0; y < N; y++) {\n      for (var x = 0; x < N; x++) {\n        if (data[(y * N + x) * 4 + 3] > 24) {\n          if (x < minX) minX = x;\n          if (x > maxX) maxX = x;\n          if (y < minY) minY = y;\n          if (y > maxY) maxY = y;\n        }\n      }\n    }\n    if (maxX < 0) return null;\n\n    var bw = maxX - minX + 1, bh = maxY - minY + 1;\n    var opaque = 0;\n    for (var yy = minY; yy <= maxY; yy++) {\n      for (var xx = minX; xx <= maxX; xx++) {\n        if (data[(yy * N + xx) * 4 + 3] > 128) opaque++;\n      }\n    }\n    var scale = img.naturalWidth / N;\n    return {\n      fill: opaque / (bw * bh),\n      // Natural-pixel crop rect, so the redraw loses no resolution.\n      crop: {\n        x: Math.max(0, Math.floor(minX * scale)),\n        y: Math.max(0, Math.floor(minY * scale)),\n        w: Math.min(img.naturalWidth, Math.ceil(bw * scale)),\n        h: Math.min(img.naturalHeight, Math.ceil(bh * scale)),\n      },\n    };\n  }\n\n  /* Re-render just the artwork, square, at output resolution. Removing the\n     source\'s own padding is what stops us adding padding on top of padding. */\n  function cropToSquare(img, crop) {\n    var side = Math.max(crop.w, crop.h);\n    var c = document.createElement("canvas");\n    c.width = side; c.height = side;\n    var ctx = c.getContext("2d");\n    ctx.drawImage(\n      img,\n      crop.x, crop.y, crop.w, crop.h,\n      Math.round((side - crop.w) / 2), Math.round((side - crop.h) / 2), crop.w, crop.h,\n    );\n    try { return c.toDataURL("image/png"); } catch (e) { return img.src; }\n  }\n\n  function luminance(hex) {\n    var n = parseInt(hex.slice(1), 16);\n    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;\n    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;\n  }\n\n  (async function () {\n    var best = null;\n    for (var i = 0; i < SOURCES.length; i++) {\n      var img = await load(SOURCES[i].url);\n      if (!img || !img.naturalWidth) continue;\n      if (!best || img.naturalWidth > best.img.naturalWidth) {\n        best = { img: img, source: SOURCES[i].source };\n      }\n    }\n    if (!best) { state.done = true; return; }\n\n    state.px = best.img.naturalWidth;\n    state.source = best.source;\n    state.usable = best.img.naturalWidth >= ' +
    _0x2b8075 +
    ';\n\n    var dom = dominantColor(best.img) || "#3987e5";\n    state.dominant = dom;\n\n    var profile = contentProfile(best.img);\n    var markSrc = profile ? cropToSquare(best.img, profile.crop) : best.img.src;\n    // A near-solid bounding box means the artwork IS the tile.\n    state.fill = profile ? Math.round(profile.fill * 100) / 100 : 0;\n    // A circle fills ~0.79 of its box, a rounded tile ~0.9+ — the gap is where\n    // this sits, so a round logo keeps its ground and a tile goes full-bleed.\n    var bleed = !!profile && profile.fill > 0.84;\n    state.bleed = bleed;\n\n    var bg = document.getElementById("bg");\n    if (bleed) {\n      /* Its own tile, used as-is. The ground only shows through rounded\n         corners, so it matches the mark rather than contrasting with it. */\n      document.getElementById("stage").className = "bleed";\n      bg.style.background = dom;\n    } else {\n      /* A bare glyph. Here the ground is chosen for CONTRAST WITH THE MARK,\n         not brand loyalty: painting a green logo onto its own green makes it\n         vanish. Light marks get a near-black field, everything else near-white\n         — which is what most real app icons for these services already do. */\n      bg.style.background = luminance(dom) > 0.72\n        ? "linear-gradient(180deg,#2b2b2f 0%,#161617 100%)"\n        : "linear-gradient(180deg,#ffffff 0%,#f1f1f4 100%)";\n    }\n\n    document.getElementById("mark").src = markSrc;\n    state.done = true;\n  })();\n})();\n</script></body></html>'
  );
}
const delay = (_0x1b8afb) =>
  new Promise((_0x4d86eb) => setTimeout(_0x4d86eb, _0x1b8afb));
async function buildBrandIcon(_0x1f8478, _0x3eb801 = {}) {
  const _0x123726 = _0x12dd1b,
    _0x34ac00 = _0x1f8478
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/["test"](_0x34ac00)) return null;
  const _0x31565d = await fetchBrandLogos(_0x34ac00);
  if (_0x31565d.length === 0) return null;
  let _0x453478 = null;
  try {
    _0x453478 = new electron.BrowserWindow({
      show: false,
      width: ICON_SIZE,
      height: ICON_SIZE,
      webPreferences: {
        offscreen: !false,
        sandbox: !false,
        contextIsolation: !false,
        nodeIntegration: false,
      },
    });
    const _0x1ebef2 = await Promise.race([
      composeBrandIcon(_0x453478, _0x31565d, _0x3eb801.requested === !false),
      delay(COMPOSE_TIMEOUT_MS).then(() => WEDGED),
    ]);
    if (_0x1ebef2 === WEDGED)
      return (
        log.warn(
          "[IntegrationStudio] Brand icon composite wedged for " +
            _0x34ac00 +
            " after " +
            COMPOSE_TIMEOUT_MS +
            "ms",
        ),
        null
      );
    return _0x1ebef2;
  } catch (_0x51761f) {
    return (
      log.warn(
        "[IntegrationStudio] Brand icon composite failed:",
        _0x51761f instanceof Error ? _0x51761f.message : _0x51761f,
      ),
      null
    );
  } finally {
    if (_0x453478 && !_0x453478.isDestroyed()) _0x453478.destroy();
  }
}
async function composeBrandIcon(_0x30b231, _0x236c21, _0x10c31b) {
  const _0x121b79 = _0x12dd1b;
  await _0x30b231.loadURL(
    "data:text/html;charset=utf-8," +
      encodeURIComponent(
        buildComposerDocument(
          _0x236c21,
          _0x10c31b ? MIN_REQUESTED_PX : MIN_USABLE_PX,
        ),
      ),
  );
  const _0x2615f8 = Date.now() + RENDER_TIMEOUT_MS;
  let _0xee9073 = null;
  while (Date.now() < _0x2615f8) {
    _0xee9073 = await _0x30b231.webContents.executeJavaScript(
      "window.__brandIcon ? JSON.parse(JSON.stringify(window.__brandIcon)) : null",
    );
    if (_0xee9073?.done) break;
    await delay(60);
  }
  if (!_0xee9073?.done || !_0xee9073.usable) return null;
  (await _0x30b231.webContents.executeJavaScript(
    "new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 0))))",
  ),
    await delay(180));
  const _0x3cbe49 = await _0x30b231.webContents.capturePage({
    x: 0,
    y: 0,
    width: ICON_SIZE,
    height: ICON_SIZE,
  });
  if (_0x3cbe49.isEmpty() || isBlankCapture(_0x3cbe49))
    return (
      log.warn(
        "[IntegrationStudio] Brand icon capture came back blank for " +
          _0xee9073.source,
      ),
      null
    );
  return {
    png: _0x3cbe49.resize({ width: ICON_SIZE, height: ICON_SIZE }).toPNG(),
    dominantColor: _0xee9073.dominant,
    sourcePx: _0xee9073.px,
    source: _0xee9073.source,
    fullBleed: _0xee9073.bleed,
    fill: _0xee9073.fill,
  };
}
function isBlankCapture(_0xb899bb) {
  const _0x5b0c6d = _0x12dd1b;
  try {
    return isBlankBitmap(_0xb899bb.toBitmap());
  } catch {
    return false;
  }
}
function isBlankBitmap(_0x1f9894) {
  const _0xc46c5e = _0x12dd1b,
    _0x57b940 = Math.floor(_0x1f9894.length / 4);
  if (_0x57b940 === 0) return !false;
  const _0xbc407e = Math.max(1, Math.floor(_0x57b940 / 4096)) * 4;
  let _0x37783e = 0,
    _0x1deffa = 255,
    _0x46597e = 0;
  for (
    let _0x57039a = 0;
    _0x57039a + 3 < _0x1f9894.length;
    _0x57039a += _0xbc407e
  ) {
    const _0x1a0736 = _0x1f9894[_0x57039a + 3];
    if (_0x1a0736 > _0x37783e) _0x37783e = _0x1a0736;
    if (_0x1a0736 < 24) continue;
    for (let _0x5b0bb4 = 0; _0x5b0bb4 < 3; _0x5b0bb4++) {
      const _0xa22ca = _0x1f9894[_0x57039a + _0x5b0bb4];
      if (_0xa22ca < _0x1deffa) _0x1deffa = _0xa22ca;
      if (_0xa22ca > _0x46597e) _0x46597e = _0xa22ca;
    }
  }
  return _0x37783e < 24 || _0x46597e - _0x1deffa <= 4;
}
((exports.buildBrandIcon = buildBrandIcon),
  (exports.fetchBrandLogos = fetchBrandLogos),
  (exports.isBlankBitmap = isBlankBitmap));
