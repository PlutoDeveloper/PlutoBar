"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if ((from && typeof from === "object") || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, {
          get: () => from[key],
          enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable,
        });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (
  (target = mod != null ? __create(__getProtoOf(mod)) : {}),
  __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule
      ? __defProp(target, "default", { value: mod, enumerable: true })
      : target,
    mod,
  )
);
const _0x5f593b = _0x3e41;
(function (_0xc5846f, _0x44f175) {
  const _0x54b0d6 = _0x3e41,
    _0x549f68 = _0xc5846f();
  while (!false) {
    try {
      const _0x5e53b1 =
        -parseInt("196657VCUXJP") / 1 +
        (parseInt("1192oOgRlB") / 2) * (-parseInt("4959genmhO") / 3) +
        (-parseInt("20YwlnKc") / 4) * (-parseInt("38840qCfemf") / 5) +
        (parseInt("5010AILtuA") / 6) * (-parseInt("154osQkRF") / 7) +
        parseInt("8554312ioIQmi") / 8 +
        parseInt("76653OVelUM") / 9 +
        parseInt("6536870yDvEbu") / 10;
      if (_0x5e53b1 === _0x44f175) break;
      else _0x549f68.push(_0x549f68.shift());
    } catch (_0x234b7a) {
      _0x549f68.push(_0x549f68.shift());
    }
  }
})(_0xb889, 570118);
function _0x3e41(_0x2c3681, _0xebb7a1) {
  _0x2c3681 = _0x2c3681 - 360;
  const _0x54e984 = _0xb889();
  let _0x33dbb8 = _0x54e984[_0x2c3681];
  return _0x33dbb8;
}
(!(function () {
  const _0xf50712 = _0x3e41,
    _0x4f675b = /* @__PURE__ */ (function () {
      let _0x3aa80c = !false;
      return function (_0x5e8ca3, _0x305488) {
        const _0x4c9d0b = _0x3aa80c
          ? function () {
              const _0x7c24ad = _0x3e41;
              if (_0x305488) {
                const _0x480102 = _0x305488.apply(_0x5e8ca3, arguments);
                return ((_0x305488 = null), _0x480102);
              }
            }
          : function () {};
        return ((_0x3aa80c = false), _0x4c9d0b);
      };
    })(),
    _0x411c1c = _0x4f675b(this, function () {
      const _0x45653b = _0x3e41,
        _0x2db154 = function () {
          const _0x41cd33 = _0x3e41;
          let _0x4abef4;
          try {
            _0x4abef4 = Function(
              "return (function() " + '{}.constructor("return this")( )' + ");",
            )();
          } catch (_0x3e5f0d) {
            _0x4abef4 = window;
          }
          return _0x4abef4;
        },
        _0x2980a1 = _0x2db154(),
        _0x29c649 = (_0x2980a1.console = _0x2980a1.console || {}),
        _0x4ad0e7 = [
          "log",
          "warn",
          "info",
          "error",
          "exception",
          "table",
          "trace",
        ];
      for (let _0x56b2c9 = 0; _0x56b2c9 < _0x4ad0e7.length; _0x56b2c9++) {
        const _0x3b6d2f = _0x4f675b.constructor.prototype.bind(_0x4f675b),
          _0x23da94 = _0x4ad0e7[_0x56b2c9],
          _0x439014 = _0x29c649[_0x23da94] || _0x3b6d2f;
        ((_0x3b6d2f.__proto__ = _0x4f675b.bind(_0x4f675b)),
          (_0x3b6d2f.toString = _0x439014.toString.bind(_0x439014)),
          (_0x29c649[_0x23da94] = _0x3b6d2f));
      }
    });
  _0x411c1c();
  try {
    var _0x3488ca =
      "undefined" != typeof window
        ? window
        : "undefined" != typeof global
          ? global
          : "undefined" != typeof globalThis
            ? globalThis
            : "undefined" != typeof self
              ? self
              : {};
    _0x3488ca.SENTRY_RELEASE = { id: "voiceos-opensourced@0.1.33" };
    var _0x31b0be = new _0x3488ca.Error().stack;
    _0x31b0be &&
      ((_0x3488ca._sentryDebugIds = _0x3488ca._sentryDebugIds || {}),
      (_0x3488ca._sentryDebugIds[_0x31b0be] =
        "5729888e-56f0-478b-9dae-e908aa4bd299"),
      (_0x3488ca._sentryDebugIdIdentifier =
        "sentry-dbid-5729888e-56f0-478b-9dae-e908aa4bd299"));
  } catch (_0x5e9f6e) {}
})(),
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" }));
const log = require("electron-log"),
  main = require("../main.js");
(require("path"),
  require("electron"),
  require("node:child_process"),
  require("node:fs"),
  require("node:fs/promises"),
  require("node:path"),
  require("ws"),
  require("node:os"),
  require("electron-store"),
  require("crypto"),
  require("@bufbuild/protobuf/codegenv2"),
  require("@bufbuild/protobuf/wkt"),
  require("node:crypto"),
  require("zod"),
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
const LOG_PREFIX = "[DictionarySync]",
  SYNC_MIN_INTERVAL_MS = 5e3;
let inFlightSync = null,
  lastSyncCompletedAt = 0;
async function pullAndMergeDictionary() {
  const _0x1d2e37 = _0x5f593b;
  if (inFlightSync) return inFlightSync;
  if (Date.now() - lastSyncCompletedAt < SYNC_MIN_INTERVAL_MS) return;
  return (
    (inFlightSync = doPullAndMergeDictionary().finally(() => {
      const _0x50dcf6 = _0x1d2e37;
      ((lastSyncCompletedAt = Date.now()), (inFlightSync = null));
    })),
    inFlightSync
  );
}
async function doPullAndMergeDictionary() {
  const _0x4ea062 = _0x5f593b,
    _0x95df58 = main.getCurrentUserId();
  if (!_0x95df58) {
    log.info(LOG_PREFIX + " No user logged in, skipping sync");
    return;
  }
  const { net: _0x41fa08 } = await import("electron");
  if (!_0x41fa08.isOnline()) {
    log.info(LOG_PREFIX + " Offline, skipping sync");
    return;
  }
  try {
    log.info(LOG_PREFIX + " Starting dictionary sync...");
    const [_0x4f5e9e, _0x15ad02] = await Promise.all([
        main.grpcClient.listDictionaryItems(),
        main.DictionaryTable.findAllForSync(_0x95df58),
      ]),
      _0x64aff0 = _0x4f5e9e.filter(
        (_0x58198a) => !_0x58198a.userId.startsWith("team:"),
      );
    log.info(
      LOG_PREFIX +
        " Found " +
        _0x64aff0.length +
        " remote personal, " +
        _0x15ad02.length +
        " local items",
    );
    const _0x1c4ab1 = new Map(
        _0x15ad02.map((_0x20239c) => [_0x20239c.id, _0x20239c]),
      ),
      _0x3c62ec = new Map(
        _0x15ad02
          .filter((_0x22ef91) => _0x22ef91.deleted_at === null)
          .map((_0x423026) => [normalizeText(_0x423026.text), _0x423026]),
      );
    let _0x28ce80 = 0,
      _0x582449 = 0,
      _0x22989b = 0;
    for (const _0x2d88eb of _0x64aff0) {
      const _0x51eadc = getRemoteTimestamp(_0x2d88eb);
      try {
        const _0x314364 = _0x1c4ab1.get(_0x2d88eb.id);
        if (_0x314364) {
          const _0x4d04c7 = Date.parse(_0x314364.updated_at);
          if (_0x4d04c7 > _0x51eadc) {
            (await pushLocalItem(_0x314364),
              await main.DictionaryTable.clearSyncFailed(_0x314364.id),
              _0x22989b++);
            continue;
          }
          if (_0x51eadc > _0x4d04c7) {
            if (_0x2d88eb.deletedAt) {
              const _0x4f31ff = remoteToLocal(_0x2d88eb, _0x95df58);
              (await main.DictionaryTable.upsert(_0x4f31ff),
                _0x1c4ab1.set(_0x4f31ff.id, _0x4f31ff),
                _0x3c62ec.delete(normalizeText(_0x4f31ff.text)));
            } else {
              const _0x4d57c3 = remoteToLocal(_0x2d88eb, _0x95df58);
              (await main.DictionaryTable.upsert(_0x4d57c3),
                _0x1c4ab1.set(_0x4d57c3.id, _0x4d57c3),
                _0x3c62ec.set(normalizeText(_0x4d57c3.text), _0x4d57c3));
            }
            _0x28ce80++;
          }
          continue;
        }
        if (_0x2d88eb.deletedAt) continue;
        const _0x80e319 = _0x3c62ec.get(normalizeText(_0x2d88eb.text));
        if (_0x80e319) {
          const _0x32848c = mergeItems(_0x80e319, _0x2d88eb, _0x95df58);
          (await main.DictionaryTable.softDelete(_0x80e319.id),
            await main.DictionaryTable.upsert(_0x32848c),
            await pushLocalItem(_0x32848c),
            await main.DictionaryTable.clearSyncFailed(_0x32848c.id),
            _0x1c4ab1.delete(_0x80e319.id),
            _0x1c4ab1.set(_0x32848c.id, _0x32848c),
            _0x3c62ec.set(normalizeText(_0x32848c.text), _0x32848c),
            _0x582449++,
            _0x22989b++);
          continue;
        }
        const _0x8ce72b = remoteToLocal(_0x2d88eb, _0x95df58);
        (await main.DictionaryTable.upsert(_0x8ce72b),
          _0x1c4ab1.set(_0x8ce72b.id, _0x8ce72b),
          _0x3c62ec.set(normalizeText(_0x8ce72b.text), _0x8ce72b),
          _0x28ce80++);
      } catch (_0x31f538) {
        log.warn(
          LOG_PREFIX +
            ' Failed reconciling remote item "' +
            _0x2d88eb.text +
            '" (' +
            _0x2d88eb.id +
            "):",
          _0x31f538,
        );
      }
    }
    const _0xfea73a = new Set(_0x64aff0.map((_0x1ba060) => _0x1ba060.id)),
      _0x3e59b6 = new Set(
        _0x64aff0
          .filter((_0x2bf7d2) => !_0x2bf7d2.deletedAt)
          .map((_0x12eaf8) => normalizeText(_0x12eaf8.text)),
      );
    for (const _0x72b8c9 of _0x15ad02) {
      if (_0xfea73a.has(_0x72b8c9.id)) continue;
      if (_0x72b8c9.deleted_at) continue;
      if (_0x3e59b6.has(normalizeText(_0x72b8c9.text))) continue;
      try {
        (await pushLocalItem(_0x72b8c9),
          await main.DictionaryTable.clearSyncFailed(_0x72b8c9.id),
          _0x22989b++);
      } catch (_0x52b1fc) {
        (await main.DictionaryTable.markSyncFailed(_0x72b8c9.id),
          log.warn(
            LOG_PREFIX + ' Failed to push local item "' + _0x72b8c9.text + '":',
            _0x52b1fc,
          ));
      }
    }
    log.info(
      LOG_PREFIX +
        " Sync complete: " +
        _0x28ce80 +
        " pulled, " +
        _0x582449 +
        " merged, " +
        _0x22989b +
        " pushed",
    );
  } catch (_0x1d3c56) {
    log.error(LOG_PREFIX + " Sync failed:", _0x1d3c56);
  }
}
function normalizeText(_0x51e51b) {
  const _0x216d79 = _0x5f593b;
  return _0x51e51b.trim().toLowerCase();
}
function getRemoteTimestamp(_0x17c624) {
  const _0x263686 = _0x5f593b;
  return Date.parse(_0x17c624.deletedAt || _0x17c624.updatedAt);
}
async function pushLocalItem(_0x4c7231) {
  const _0x52ccce = _0x5f593b;
  if (_0x4c7231.deleted_at) {
    await main.grpcClient.deleteDictionaryItem(_0x4c7231.id);
    return;
  }
  await main.grpcClient.createDictionaryItem(_0x4c7231);
}
function remoteToLocal(_0x252186, _0x8bde8d) {
  const _0x4ee8ba = _0x5f593b;
  return {
    id: _0x252186.id,
    user_id: _0x8bde8d,
    text: _0x252186.text,
    description: _0x252186.description || null,
    auto_added: _0x252186.autoAdded ?? false,
    app_identifiers: null,
    created_at: _0x252186.createdAt,
    updated_at: _0x252186.updatedAt,
    deleted_at: _0x252186.deletedAt || null,
    sync_failed_at: null,
  };
}
function mergeItems(_0x1f9663, _0xc99321, _0x16d977) {
  const _0x2b6256 = _0x5f593b,
    _0x329e85 = Date.parse(_0x1f9663.updated_at),
    _0x2b5a4f = Date.parse(_0xc99321.updatedAt);
  return {
    id: _0xc99321.id,
    user_id: _0x16d977,
    text: _0xc99321.text,
    description:
      _0x329e85 >= _0x2b5a4f
        ? _0x1f9663.description || _0xc99321.description || null
        : _0xc99321.description || _0x1f9663.description || null,
    auto_added: _0x1f9663.auto_added || _0xc99321.autoAdded,
    app_identifiers: null,
    created_at: _0xc99321.createdAt,
    updated_at:
      _0x329e85 >= _0x2b5a4f ? _0x1f9663.updated_at : _0xc99321.updatedAt,
    deleted_at: null,
    sync_failed_at: null,
  };
}
function _0xb889() {
  const _0x2ac7a1 = [
    "userId",
    "child_process",
    "DictionaryTable",
    "getCurrentUserId",
    "auto_added",
    "posthog-node",
    "text",
    "node:readline",
    "set",
    "__proto__",
    "20YwlnKc",
    "fs/promises",
    "log",
    "node:fs",
    "node:zlib",
    "worker_threads",
    "bind",
    "softDelete",
    " local items",
    "clearSyncFailed",
    "node:fs/promises",
    ' Failed to push local item "',
    "util",
    "_sentryDebugIds",
    "console",
    "delete",
    " No user logged in, skipping sync",
    "196657VCUXJP",
    "has",
    "4959genmhO",
    "autoAdded",
    "node:os",
    "table",
    "updatedAt",
    "trim",
    " remote personal, ",
    "zod",
    "76653OVelUM",
    "warn",
    "1192oOgRlB",
    "pullAndMergeDictionary",
    "5010AILtuA",
    "return (function() ",
    "Error",
    "../main.js",
    "deletedAt",
    "Module",
    " Sync complete: ",
    "apply",
    "trace",
    "length",
    "8554312ioIQmi",
    "node:child_process",
    "toLowerCase",
    "findAllForSync",
    "node:perf_hooks",
    " merged, ",
    "psl",
    "filter",
    "_sentryDebugIdIdentifier",
    "all",
    " pushed",
    "fflate",
    "get",
    "deleted_at",
    "sqlite3",
    "dgram",
    "parse",
    "team:",
    "isOnline",
    "constructor",
    "description",
    "readline",
    ' Failed reconciling remote item "',
    "6536870yDvEbu",
    "listDictionaryItems",
    "deleteDictionaryItem",
    "map",
    '" (',
    "prototype",
    "updated_at",
    "undefined",
    "info",
    "createdAt",
    " Sync failed:",
    "5729888e-56f0-478b-9dae-e908aa4bd299",
    "toStringTag",
    "finally",
    "SENTRY_RELEASE",
    "38840qCfemf",
    "stack",
    " pulled, ",
    "exception",
    "markSyncFailed",
    " Starting dictionary sync...",
    "defineProperty",
    "events",
    "startsWith",
    "upsert",
    "error",
    "toString",
    "createDictionaryItem",
    "154osQkRF",
    '{}.constructor("return this")( )',
    "now",
    " Offline, skipping sync",
    " Found ",
    "grpcClient",
  ];
  _0xb889 = function () {
    return _0x2ac7a1;
  };
  return _0xb889();
}
exports.pullAndMergeDictionary = pullAndMergeDictionary;
