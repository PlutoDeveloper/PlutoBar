"use strict";
function _0x50f2() {
  const _0x131ebb = [
    "custom-mcp:toggle",
    "agent-knowledge:save",
    "log",
    "stop-voice-follow-up-from-pill",
    "functions",
    "SENTRY_RELEASE",
    "3514272ZtDLem",
    "toStringTag",
    "removeAllListeners",
    "info",
    "agent-notch-activate-glass",
    "custom-mcp:list",
    "warn",
    "__proto__",
    "22865a6a-3035-4468-bae8-bd59b4c0c4e0",
    "start-voice-follow-up-from-pill",
    "40670evYESI",
    "3022880vpmRvO",
    "spotlight:stop",
    "marketplace:open-folder",
    "pill-drag-move",
    "custom-mcp:remove",
    "custom-mcp:generate",
    "567IVXWpo",
    "codingAgent:edit-queued-follow-up",
    "workflow:cancel",
    "spotlight:start",
    "custom-mcp:logs",
    "length",
    "getOwnPropertyDescriptor",
    "string",
    "applecalendar:calendars",
    "_sentryDebugIds",
    "reminders:lists",
    "electronAPI",
    "constructor",
    "removeListener",
    "chat-follow-up",
    "assign",
    "sendSync",
    "error",
    "spotlight:request-finish",
    "undefined",
    "send",
    "return (function() ",
    "exposeInMainWorld",
    "desktop",
    "start-agent-from-pill",
    "4210055cwAhKh",
    "pill-unpin",
    "marketplace:pick-folder",
    "pill-stop-drag",
    "music:details",
    "apply",
    "console",
    "freeze",
    "custom-mcp:pick-script",
    "Error",
    "Module",
    "workflow:acknowledge",
    "contextBridge",
    "stop-handsfree-recording",
    "pill-start-drag",
    "trace",
    "codingAgent:cancel-task",
    "codingAgent:remove-queued-follow-up",
    "1086FegeDB",
    "agent-knowledge:save-preferences",
    "marketplace:list",
    "_sentryDebugIdIdentifier",
    "cancel-handsfree-recording",
    "reminders:reminder-preview",
    '{}.constructor("return this")( )',
    "codingAgent:answer-prompt",
    "workflow:select",
    "get",
    "contextIsolated",
    "electron",
    "feedback:submit",
    "agent-knowledge:undo-preferences",
    "prototype",
    "1567fQtPTu",
    "exception",
    "api",
    "spotlight:request-dismiss",
    "codingAgent:task-snapshot",
    "stack",
    "clipboard",
    "toString",
    "invoke",
    "codingAgent:acknowledge-task",
    "applecalendar:event-preview",
    "notes:folders",
    "marketplace:create",
    "945maJWEG",
    "writeText",
    "create",
    "agent-notch-material-preview",
    "44656WhxhLN",
    "table",
    "defineProperty",
    "default",
    "ipcRenderer",
    "bind",
    "43104HNkCBy",
  ];
  _0x50f2 = function () {
    return _0x131ebb;
  };
  return _0x50f2();
}
const _0x12bc5e = _0x4f3b;
(function (_0x4f6c43, _0x1afb50) {
  const _0x76921c = _0x4f3b,
    _0x26aaca = _0x4f6c43();
  while (!false) {
    try {
      const _0x522b75 =
        (parseInt("1567fQtPTu") / 1) * (-parseInt("1086FegeDB") / 2) +
        -parseInt("43104HNkCBy") / 3 +
        parseInt("3022880vpmRvO") / 4 +
        parseInt("4210055cwAhKh") / 5 +
        parseInt("3514272ZtDLem") / 6 +
        (-parseInt("567IVXWpo") / 7) * (parseInt("44656WhxhLN") / 8) +
        (parseInt("945maJWEG") / 9) * (-parseInt("40670evYESI") / 10);
      if (_0x522b75 === _0x1afb50) break;
      else _0x26aaca.push(_0x26aaca.shift());
    } catch (_0x4738c2) {
      _0x26aaca.push(_0x26aaca.shift());
    }
  }
})(_0x50f2, 439017);
!(function () {
  const _0xcdc32a = _0x4f3b;
  try {
    var _0x2c35b0 =
      "undefined" != typeof window
        ? window
        : "undefined" != typeof global
          ? global
          : "undefined" != typeof globalThis
            ? globalThis
            : "undefined" != typeof self
              ? self
              : {};
    _0x2c35b0.SENTRY_RELEASE = { id: "voiceos-opensourced@0.1.33" };
    var _0x405a5f = new _0x2c35b0.Error().stack;
    _0x405a5f &&
      ((_0x2c35b0._sentryDebugIds = _0x2c35b0._sentryDebugIds || {}),
      (_0x2c35b0._sentryDebugIds[_0x405a5f] =
        "22865a6a-3035-4468-bae8-bd59b4c0c4e0"),
      (_0x2c35b0._sentryDebugIdIdentifier =
        "sentry-dbid-22865a6a-3035-4468-bae8-bd59b4c0c4e0"));
  } catch (_0x7f4a32) {}
})();
const electron = require("electron"),
  preload = require("@electron-toolkit/preload"),
  log = require("electron-log/renderer");
function _interopNamespaceDefault(_0x2adcc5) {
  const _0x998fec = _0x4f3b,
    _0x4daff3 = /* @__PURE__ */ (function () {
      let _0x43f787 = !false;
      return function (_0x328766, _0x6ae73d) {
        const _0x5b8379 = _0x43f787
          ? function () {
              const _0x189497 = _0x4f3b;
              if (_0x6ae73d) {
                const _0xcda797 = _0x6ae73d.apply(_0x328766, arguments);
                return ((_0x6ae73d = null), _0xcda797);
              }
            }
          : function () {};
        return ((_0x43f787 = false), _0x5b8379);
      };
    })(),
    _0x223333 = _0x4daff3(this, function () {
      const _0x2e4229 = _0x4f3b;
      let _0x53bb4f;
      try {
        const _0x37e801 = Function(
          "return (function() " + '{}.constructor("return this")( )' + ");",
        );
        _0x53bb4f = _0x37e801();
      } catch (_0x4f4ea9) {
        _0x53bb4f = window;
      }
      const _0x79a8db = (_0x53bb4f.console = _0x53bb4f.console || {}),
        _0x3e64e8 = [
          "log",
          "warn",
          "info",
          "error",
          "exception",
          "table",
          "trace",
        ];
      for (let _0x3e90a0 = 0; _0x3e90a0 < _0x3e64e8.length; _0x3e90a0++) {
        const _0x13e54e = _0x4daff3.constructor.prototype.bind(_0x4daff3),
          _0x1aaafe = _0x3e64e8[_0x3e90a0],
          _0x522b7f = _0x79a8db[_0x1aaafe] || _0x13e54e;
        ((_0x13e54e.__proto__ = _0x4daff3.bind(_0x4daff3)),
          (_0x13e54e.toString = _0x522b7f.toString.bind(_0x522b7f)),
          (_0x79a8db[_0x1aaafe] = _0x13e54e));
      }
    });
  _0x223333();
  const _0x543f08 = Object.create(null, {
    [Symbol.toStringTag]: { value: "Module" },
  });
  if (_0x2adcc5)
    for (const _0x8c791e in _0x2adcc5) {
      if (_0x8c791e !== "default") {
        const _0x7f74a1 = Object.getOwnPropertyDescriptor(_0x2adcc5, _0x8c791e);
        Object.defineProperty(
          _0x543f08,
          _0x8c791e,
          _0x7f74a1.get
            ? _0x7f74a1
            : { enumerable: !false, get: () => _0x2adcc5[_0x8c791e] },
        );
      }
    }
  return ((_0x543f08.default = _0x2adcc5), Object.freeze(_0x543f08));
}
const log__namespace = _interopNamespaceDefault(log),
  api = {
    integrationWidgetTools: {
      open: (_0x2b9dca) =>
        electron.ipcRenderer.invoke("integration-widget-tools:open", _0x2b9dca),
      invoke: (_0x4fd1dd, _0x2f0405) =>
        electron.ipcRenderer.invoke(
          "integration-widget-tools:invoke",
          _0x4fd1dd,
          _0x2f0405,
        ),
      confirm: (_0x37934b, _0x9f1b05, _0x4e2f99, _0x3373ba) =>
        electron.ipcRenderer.invoke(
          "integration-widget-tools:confirm",
          _0x37934b,
          _0x9f1b05,
          _0x4e2f99,
          _0x3373ba,
        ),
      close: (_0x5ee18e) =>
        electron.ipcRenderer.invoke(
          "integration-widget-tools:close",
          _0x5ee18e,
        ),
    },
    send: (_0x499fcf, ..._0x54ad9a) => {
      const _0x2d7224 = _0x12bc5e;
      electron.ipcRenderer.send(_0x499fcf, ..._0x54ad9a);
    },
    on: (_0x4600c7, _0x44b82d) => {
      const _0xefa825 = _0x12bc5e,
        _0x4b8ddc = (_0x9823b1, ..._0x5c75dc) => {
          _0x44b82d(..._0x5c75dc);
        };
      return (
        electron.ipcRenderer.on(_0x4600c7, _0x4b8ddc),
        () => {
          const _0x4f5493 = _0xefa825;
          electron.ipcRenderer.removeListener(_0x4600c7, _0x4b8ddc);
        }
      );
    },
    receive: (_0x5f01d4, _0x5a45d4) => {
      const _0x1608a4 = _0x12bc5e;
      electron.ipcRenderer.on(_0x5f01d4, (_0x46d08a, ..._0x507b26) =>
        _0x5a45d4(..._0x507b26),
      );
    },
    invoke: (_0x24b21e, ..._0x528726) => {
      const _0x1ff06b = _0x12bc5e;
      return electron.ipcRenderer.invoke(_0x24b21e, ..._0x528726);
    },
    removeAllListeners: (_0x4af1a1) =>
      electron.ipcRenderer.removeAllListeners(_0x4af1a1),
    startKeyListener: () =>
      electron.ipcRenderer.invoke("start-key-listener-service"),
    stopKeyListener: () => electron.ipcRenderer.invoke("stop-key-listener"),
    registerHotkeys: () => electron.ipcRenderer.invoke("register-hotkeys"),
    startNativeRecording: () =>
      electron.ipcRenderer.invoke("start-native-recording"),
    stopNativeRecording: () =>
      electron.ipcRenderer.invoke("stop-native-recording"),
    getNativeAudioDevices: () =>
      electron.ipcRenderer.invoke("get-native-audio-devices"),
    getNativeAudioDevicesWithInfo: () =>
      electron.ipcRenderer.invoke("get-native-audio-devices-with-info"),
    getDefaultMicrophoneName: () =>
      electron.ipcRenderer.invoke("get-default-microphone-name"),
    onVolumeUpdate: (_0x5da228) => {
      const _0x5bc760 = _0x12bc5e,
        _0x38b4db = (_0x6e19c3, _0x532985) => _0x5da228(_0x532985);
      return (
        electron.ipcRenderer.on("volume-update", _0x38b4db),
        () => electron.ipcRenderer.removeListener("volume-update", _0x38b4db)
      );
    },
    blockKeys: (_0x14b259, _0x26d666) =>
      electron.ipcRenderer.invoke("block-keys", _0x14b259, _0x26d666),
    unblockKey: (_0x32a7f2, _0x2cafdf) =>
      electron.ipcRenderer.invoke("unblock-key", _0x32a7f2, _0x2cafdf),
    getBlockedKeys: () => electron.ipcRenderer.invoke("get-blocked-keys"),
    onKeyEvent: (_0x4e1a4b) => {
      const _0x2d9b67 = _0x12bc5e,
        _0x3c8a49 = (_0x4620f0, _0x2d9b63) => _0x4e1a4b(_0x2d9b63);
      return (
        electron.ipcRenderer.on("key-event", _0x3c8a49),
        () => electron.ipcRenderer.removeListener("key-event", _0x3c8a49)
      );
    },
    getKeyListenerError: () =>
      electron.ipcRenderer.invoke("get-key-listener-error"),
    onNativeBinaryError: (_0xb005ad) => {
      const _0x154b30 = _0x12bc5e,
        _0x1b3293 = (_0x2b6324, _0x6a0444) => _0xb005ad(_0x6a0444);
      return (
        electron.ipcRenderer.on("native-binary-error", _0x1b3293),
        () =>
          electron.ipcRenderer.removeListener("native-binary-error", _0x1b3293)
      );
    },
    generateNewAuthState: () =>
      electron.ipcRenderer.invoke("generate-new-auth-state"),
    exchangeAuthCode: (_0x3e02df) =>
      electron.ipcRenderer.invoke("exchange-auth-code", _0x3e02df),
    logout: () => electron.ipcRenderer.invoke("logout"),
    setPillMouseEvents: (_0x3a59a4, _0x5916e9, _0x543ece) =>
      electron.ipcRenderer.invoke(
        "pill-set-mouse-events",
        _0x3a59a4,
        _0x5916e9,
        _0x543ece,
      ),
    setAgentNotchMouseEvents: (_0x5a2c65, _0x3d9744) =>
      electron.ipcRenderer.invoke(
        "agent-notch-set-mouse-events",
        _0x5a2c65,
        _0x3d9744,
      ),
    setAgentHistoryNotchMouseEvents: (_0x8589d8, _0x42f958) =>
      electron.ipcRenderer.invoke(
        "agent-history-notch-set-mouse-events",
        _0x8589d8,
        _0x42f958,
      ),
    setAgentHistoryNotchFocusable: (_0x3235e1) =>
      electron.ipcRenderer.invoke(
        "agent-history-notch-set-focusable",
        _0x3235e1,
      ),
    getDisplayHasNotch: () =>
      electron.ipcRenderer.invoke("agent-notch-display-has-notch"),
    getAgentNotchDisplayGeometry: () =>
      electron.ipcRenderer.invoke("agent-notch-display-geometry"),
    setAgentNotchFocusable: (_0x5271eb, _0x58b2bc) =>
      electron.ipcRenderer.invoke(
        "agent-notch-set-focusable",
        _0x5271eb,
        _0x58b2bc,
      ),
    setAgentNotchWindowSize: (_0x210ff6, _0x2985bd) =>
      electron.ipcRenderer.invoke(
        "agent-notch-set-window-size",
        _0x210ff6,
        _0x2985bd,
      ),
    isAgentNotchLiquidGlassAvailable: () =>
      electron.ipcRenderer.invoke("agent-notch-liquid-glass-available"),
    isLiquidGlassSupported: () =>
      electron.ipcRenderer.invoke("appearance-liquid-glass-supported"),
    onAgentNotchMaterialPreview: (_0x14bfc7) => {
      const _0x1ac4a5 = _0x12bc5e,
        _0x3a3d6a = (_0x254b3b, _0x4d6899) => _0x14bfc7(String(_0x4d6899));
      return (
        electron.ipcRenderer.on("agent-notch-material-preview", _0x3a3d6a),
        () => {
          const _0x4733c2 = _0x1ac4a5;
          electron.ipcRenderer.removeListener(
            "agent-notch-material-preview",
            _0x3a3d6a,
          );
        }
      );
    },
    activateAgentNotchGlass: (_0x36c02d) =>
      electron.ipcRenderer.invoke("agent-notch-activate-glass", _0x36c02d),
    prepareAgentNotchGlass: (_0x41d1a9, _0x378857) =>
      electron.ipcRenderer.invoke(
        "agent-notch-prepare-glass",
        _0x41d1a9,
        _0x378857,
      ),
    armPreparedAgentNotchGlass: (_0x5df435) =>
      electron.ipcRenderer.sendSync(
        "agent-notch-arm-prepared-glass",
        _0x5df435,
      ),
    isAgentHistoryNotchLiquidGlassAvailable: () =>
      electron.ipcRenderer.invoke("agent-history-notch-liquid-glass-available"),
    onAgentHistoryNotchMaterialPreview: (_0x50d118) => {
      const _0x566372 = _0x12bc5e,
        _0x344664 = (_0x211f0e, _0x12869d) => _0x50d118(String(_0x12869d));
      return (
        electron.ipcRenderer.on(
          "agent-history-notch-material-preview",
          _0x344664,
        ),
        () => {
          const _0x3f5640 = _0x566372;
          electron.ipcRenderer.removeListener(
            "agent-history-notch-material-preview",
            _0x344664,
          );
        }
      );
    },
    setAgentHistoryNotchGlassGeometry: (_0x46c9ab) =>
      electron.ipcRenderer.send(
        "agent-history-notch-set-glass-geometry",
        _0x46c9ab,
      ),
    activateAgentHistoryNotchGlass: (_0x4c1fc4) =>
      electron.ipcRenderer.invoke(
        "agent-history-notch-activate-glass",
        _0x4c1fc4,
      ),
    getAgentNotchCursorPoint: () =>
      electron.ipcRenderer.invoke("agent-notch-get-cursor-point"),
    getAgentHistoryNotchCursorPoint: () =>
      electron.ipcRenderer.invoke("agent-history-notch-get-cursor-point"),
    getPillCursorPoint: () =>
      electron.ipcRenderer.invoke("pill-get-cursor-point"),
    spotlight: {
      start: () => electron.ipcRenderer.invoke("spotlight:start"),
      startHistoryFollowUp: () =>
        electron.ipcRenderer.invoke("spotlight:start-history-follow-up"),
      prepareHistoryFollowUp: () =>
        electron.ipcRenderer.invoke("spotlight:prepare-history-follow-up"),
      prepareResultHover: () =>
        electron.ipcRenderer.invoke("spotlight:prepare-result-hover"),
      startResultHover: () =>
        electron.ipcRenderer.invoke("spotlight:start-result-hover"),
      stop: () => electron.ipcRenderer.invoke("spotlight:stop"),
      advanceToHistory: () =>
        electron.ipcRenderer.invoke("spotlight:advance-to-history"),
      requestFinish: () =>
        electron.ipcRenderer.invoke("spotlight:request-finish"),
      requestDismiss: () =>
        electron.ipcRenderer.invoke("spotlight:request-dismiss"),
    },
    permissions: {
      showDragPanel: (_0x211b56) =>
        electron.ipcRenderer.invoke("permissions:show-drag-panel", _0x211b56),
      hideDragPanel: () =>
        electron.ipcRenderer.invoke("permissions:hide-drag-panel"),
      showAppInFinder: (_0x17f01a) =>
        electron.ipcRenderer.invoke(
          "permissions:show-app-in-finder",
          _0x17f01a,
        ),
      startAppDrag: (_0x3ef920) =>
        electron.ipcRenderer.send("permissions:start-app-drag", {
          icon: _0x3ef920,
        }),
      onDragPanelClosed: (_0x33a3b1) => {
        const _0x3a1fed = _0x12bc5e,
          _0x449408 = (_0x2a393e, _0x19e5e4) => _0x33a3b1(_0x19e5e4);
        return (
          electron.ipcRenderer.on("permission-drag-panel-closed", _0x449408),
          () => {
            const _0x4d0676 = _0x3a1fed;
            electron.ipcRenderer.removeListener(
              "permission-drag-panel-closed",
              _0x449408,
            );
          }
        );
      },
    },
    setPillFocusable: (_0x3b219b) =>
      electron.ipcRenderer.invoke("pill-set-focusable", _0x3b219b),
    pillStartDrag: (_0x71fe06, _0x3d1579) =>
      electron.ipcRenderer.invoke("pill-start-drag", _0x71fe06, _0x3d1579),
    pillDragMove: () => electron.ipcRenderer.invoke("pill-drag-move"),
    pillStopDrag: () => electron.ipcRenderer.invoke("pill-stop-drag"),
    pillUnpin: () => electron.ipcRenderer.invoke("pill-unpin"),
    pillSetAgentFloatingMode: (_0x58dbaf) =>
      electron.ipcRenderer.invoke("pill-set-agent-floating-mode", _0x58dbaf),
    pillRestorePosition: () =>
      electron.ipcRenderer.invoke("pill-restore-position"),
    "init-window": () => electron.ipcRenderer.invoke("init-window"),
    "is-window-minimizable": () =>
      electron.ipcRenderer.invoke("is-window-minimizable"),
    "is-window-maximizable": () =>
      electron.ipcRenderer.invoke("is-window-maximizable"),
    "window-minimize": () => electron.ipcRenderer.invoke("window-minimize"),
    "window-maximize": () => electron.ipcRenderer.invoke("window-maximize"),
    "window-close": () => electron.ipcRenderer.invoke("window-close"),
    "window-maximize-toggle": () =>
      electron.ipcRenderer.invoke("window-maximize-toggle"),
    "web-undo": () => electron.ipcRenderer.invoke("web-undo"),
    "web-redo": () => electron.ipcRenderer.invoke("web-redo"),
    "web-cut": () => electron.ipcRenderer.invoke("web-cut"),
    "web-copy": () => electron.ipcRenderer.invoke("web-copy"),
    "web-paste": () => electron.ipcRenderer.invoke("web-paste"),
    "web-delete": () => electron.ipcRenderer.invoke("web-delete"),
    "web-select-all": () => electron.ipcRenderer.invoke("web-select-all"),
    "web-reload": () => electron.ipcRenderer.invoke("web-reload"),
    "web-force-reload": () => electron.ipcRenderer.invoke("web-force-reload"),
    "web-toggle-devtools": () =>
      electron.ipcRenderer.invoke("web-toggle-devtools"),
    "web-actual-size": () => electron.ipcRenderer.invoke("web-actual-size"),
    "web-zoom-in": () => electron.ipcRenderer.invoke("web-zoom-in"),
    "web-zoom-out": () => electron.ipcRenderer.invoke("web-zoom-out"),
    "web-toggle-fullscreen": () =>
      electron.ipcRenderer.invoke("web-toggle-fullscreen"),
    "web-open-url": (_0x377d16) =>
      electron.ipcRenderer.invoke("web-open-url", _0x377d16),
    openExternal: (_0x46dd9f) =>
      electron.ipcRenderer.invoke("web-open-url", _0x46dd9f),
    "check-accessibility-permission": (_0x928f31) =>
      electron.ipcRenderer.invoke("check-accessibility-permission", _0x928f31),
    "get-accessibility-permission-status": () =>
      electron.ipcRenderer.invoke("get-accessibility-permission-status"),
    openAccessibilitySettings: () =>
      electron.ipcRenderer.invoke("open-accessibility-settings"),
    "check-microphone-permission": (_0x3771d3) =>
      electron.ipcRenderer.invoke("check-microphone-permission", _0x3771d3),
    "get-microphone-permission-status": () =>
      electron.ipcRenderer.invoke("get-microphone-permission-status"),
    "check-screen-recording-permission": (_0x13f180) =>
      electron.ipcRenderer.invoke(
        "check-screen-recording-permission",
        _0x13f180,
      ),
    openScreenRecordingSettings: () =>
      electron.ipcRenderer.invoke("open-screen-recording-settings"),
    showMainWindow: () => electron.ipcRenderer.invoke("show-main-window"),
    showMainWindowSettings: () =>
      electron.ipcRenderer.invoke("show-main-window-settings"),
    triggerScreenCaptureConsent: () =>
      electron.ipcRenderer.invoke("trigger-screen-capture-consent"),
    restartApp: () => electron.ipcRenderer.invoke("restart-app"),
    "start-native-recording": () =>
      electron.ipcRenderer.send("start-native-recording"),
    "stop-native-recording": () =>
      electron.ipcRenderer.send("stop-native-recording"),
    pill: {
      startDictation: (_0x3fab8e) =>
        electron.ipcRenderer.invoke("start-dictation-from-pill", _0x3fab8e),
      startAgentMode: () =>
        electron.ipcRenderer.invoke("start-agent-from-pill"),
      stopRecording: () =>
        electron.ipcRenderer.invoke("stop-recording-from-pill"),
      cancelRecording: () =>
        electron.ipcRenderer.invoke("cancel-recording-from-pill"),
      undoKeyword: (_0x4f7d76) =>
        electron.ipcRenderer.invoke("dictionary:delete", _0x4f7d76),
      startVoiceFollowUp: () =>
        electron.ipcRenderer.invoke("start-voice-follow-up-from-pill"),
      stopVoiceFollowUp: () =>
        electron.ipcRenderer.invoke("stop-voice-follow-up-from-pill"),
      sendFollowUp: (_0x2dd8df) =>
        electron.ipcRenderer.invoke("chat-follow-up", _0x2dd8df),
      endChatSession: () => electron.ipcRenderer.send("end-chat-session"),
      cancelTranscription: () =>
        electron.ipcRenderer.send("cancel-transcription"),
      checkFocusedEditable: () =>
        electron.ipcRenderer.invoke("check-focused-editable"),
      pasteOutputText: (_0x59b18d) =>
        electron.ipcRenderer.invoke("paste-output-text", _0x59b18d),
    },
    handsFree: {
      stopRecording: () =>
        electron.ipcRenderer.invoke("stop-handsfree-recording"),
      cancelRecording: () =>
        electron.ipcRenderer.invoke("cancel-handsfree-recording"),
    },
    dev: {
      revertLastMigration: () =>
        electron.ipcRenderer.invoke("dev:revert-last-migration"),
      wipeDatabase: () => electron.ipcRenderer.invoke("dev:wipe-database"),
      checkSchema: () => electron.ipcRenderer.invoke("debug:check-schema"),
      armSimulatedFailure: () =>
        electron.ipcRenderer.invoke("dev:arm-simulated-failure"),
      isSimulatedFailureArmed: () =>
        electron.ipcRenderer.invoke("dev:is-simulated-failure-armed"),
    },
    notes: {
      getAll: () => electron.ipcRenderer.invoke("notes:get-all"),
      add: (_0x4e1d34) => electron.ipcRenderer.invoke("notes:add", _0x4e1d34),
      updateContent: (_0x37ec9b, _0x349851) =>
        electron.ipcRenderer.invoke("notes:update-content", {
          id: _0x37ec9b,
          content: _0x349851,
        }),
      delete: (_0x232482) =>
        electron.ipcRenderer.invoke("notes:delete", _0x232482),
    },
    dictionary: {
      getAll: () => electron.ipcRenderer.invoke("dictionary:get-all"),
      add: (_0x19ee39) =>
        electron.ipcRenderer.invoke("dictionary:add", _0x19ee39),
      update: (_0x2ac250, _0x4e49ca, _0x16373d, _0x776ab5) =>
        electron.ipcRenderer.invoke("dictionary:update", {
          id: _0x2ac250,
          text: _0x4e49ca,
          description: _0x16373d,
          app_identifiers: null,
        }),
      delete: (_0x1c6d45) =>
        electron.ipcRenderer.invoke("dictionary:delete", _0x1c6d45),
      analyzeImport: (_0x1a17da) =>
        electron.ipcRenderer.invoke("dictionary:analyze-import", _0x1a17da),
      previewCompetitorImport: (_0x3db0ab) =>
        electron.ipcRenderer.invoke(
          "dictionary:preview-competitor-import",
          _0x3db0ab,
        ),
    },
    knowledge: {
      getAll: () => electron.ipcRenderer.invoke("knowledge:get-all"),
      add: (_0x27c644, _0x3daf87) =>
        electron.ipcRenderer.invoke("knowledge:add", {
          title: _0x27c644,
          content: _0x3daf87,
        }),
      update: (_0x10f640, _0x1ed695, _0x596491) =>
        electron.ipcRenderer.invoke("knowledge:update", {
          id: _0x10f640,
          title: _0x1ed695,
          content: _0x596491,
        }),
      delete: (_0x17d2a8) =>
        electron.ipcRenderer.invoke("knowledge:delete", _0x17d2a8),
      syncToGrpc: (_0x147f87) =>
        electron.ipcRenderer.invoke("knowledge:sync-to-grpc", _0x147f87),
    },
    agentKnowledge: {
      get: () => electron.ipcRenderer.invoke("agent-knowledge:get"),
      save: (_0x289fbd) =>
        electron.ipcRenderer.invoke("agent-knowledge:save", _0x289fbd),
      extract: (_0x4fc7f4) =>
        electron.ipcRenderer.invoke("agent-knowledge:extract", {
          urls: _0x4fc7f4,
        }),
      processInteraction: (_0xb8920b) =>
        electron.ipcRenderer.invoke(
          "agent-knowledge:process-interaction",
          _0xb8920b,
        ),
      deleteMemory: (_0x28de53) =>
        electron.ipcRenderer.invoke("agent-knowledge:delete-memory", {
          memoryId: _0x28de53,
        }),
      addMemory: (_0x440836) =>
        electron.ipcRenderer.invoke("agent-knowledge:add-memory", {
          fact: _0x440836,
        }),
      setMemoryCore: (_0x17822e, _0x6e6290) =>
        electron.ipcRenderer.invoke("agent-knowledge:set-memory-core", {
          memoryId: _0x17822e,
          core: _0x6e6290,
        }),
      savePreferences: (_0x584b46) =>
        electron.ipcRenderer.invoke(
          "agent-knowledge:save-preferences",
          _0x584b46,
        ),
      undoPreferences: () =>
        electron.ipcRenderer.invoke("agent-knowledge:undo-preferences"),
    },
    customInstructions: {
      getAll: () => electron.ipcRenderer.invoke("custom-instructions:get-all"),
      add: (_0x2e6af4, _0x84a5a4) =>
        electron.ipcRenderer.invoke("custom-instructions:add", {
          appIdentifier: _0x2e6af4,
          instruction: _0x84a5a4,
        }),
      update: (_0x41fce9, _0xbcd362, _0x4b6f00) =>
        electron.ipcRenderer.invoke("custom-instructions:update", {
          id: _0x41fce9,
          appIdentifier: _0xbcd362,
          instruction: _0x4b6f00,
        }),
      delete: (_0x8187c8) =>
        electron.ipcRenderer.invoke("custom-instructions:delete", _0x8187c8),
      syncToGrpc: () =>
        electron.ipcRenderer.invoke("custom-instructions:sync-to-grpc"),
      getUsedApps: () =>
        electron.ipcRenderer.invoke("custom-instructions:get-used-apps"),
      getInstalledApps: () =>
        electron.ipcRenderer.invoke("custom-instructions:get-installed-apps"),
    },
    voiceSessions: {
      getInsights: () =>
        electron.ipcRenderer.invoke("voice-sessions:get-insights"),
      getAll: () => electron.ipcRenderer.invoke("voice-sessions:get-all"),
      delete: (_0x55034b) =>
        electron.ipcRenderer.invoke("voice-sessions:delete", _0x55034b),
      retranscribe: (_0x3b7c3a) =>
        electron.ipcRenderer.invoke("voice-sessions:retranscribe", _0x3b7c3a),
      hasAudio: (_0x3ae351) =>
        electron.ipcRenderer.invoke("voice-sessions:has-audio", _0x3ae351),
    },
    agentHistory: {
      getRecent: (_0x596cf7) =>
        electron.ipcRenderer.invoke("agent-history:get-recent", _0x596cf7),
      getLiveActivity: (_0x3a8dc6) =>
        electron.ipcRenderer.invoke(
          "agent-history:get-live-activity",
          _0x3a8dc6,
        ),
    },
    appIcons: {
      getAll: () => electron.ipcRenderer.invoke("app-icons:get-all"),
      getByName: (_0x378dfd) =>
        electron.ipcRenderer.invoke("app-icons:get-by-name", _0x378dfd),
    },
    loginItem: {
      setSettings: (_0x360ccf) =>
        electron.ipcRenderer.invoke("set-login-item-settings", _0x360ccf),
      getSettings: () => electron.ipcRenderer.invoke("get-login-item-settings"),
    },
    dock: {
      setVisibility: (_0x1eaaf7) =>
        electron.ipcRenderer.invoke("set-dock-visibility", _0x1eaaf7),
      getVisibility: () => electron.ipcRenderer.invoke("get-dock-visibility"),
    },
    notifySettingsUpdate: (_0x24fb8c) =>
      electron.ipcRenderer.send("settings-update", _0x24fb8c),
    notifyOnboardingUpdate: (_0x3c0d92) =>
      electron.ipcRenderer.send("onboarding-update", _0x3c0d92),
    persistOnboardingStoreSync: (_0x2b6551) =>
      electron.ipcRenderer.sendSync("onboarding-persist-sync", _0x2b6551),
    introOverlayHandoff: (_0x45ba06, _0x29e97a) =>
      electron.ipcRenderer.send("intro-overlay-handoff", _0x45ba06, _0x29e97a),
    introOverlayAwaitingGetStarted: (_0x5a8cea) =>
      electron.ipcRenderer.send(
        "intro-overlay-awaiting-get-started",
        _0x5a8cea,
      ),
    introOverlayAwaitingName: (_0x2a5d1d) =>
      electron.ipcRenderer.send("intro-overlay-awaiting-name", _0x2a5d1d),
    introOverlayAwaitingLanguage: (_0x37e18e) =>
      electron.ipcRenderer.send("intro-overlay-awaiting-language", _0x37e18e),
    introOverlayShowNotchWelcome: () =>
      electron.ipcRenderer.send("intro-overlay-show-notch-welcome"),
    introOverlaySubmitName: (_0x3d07c4) =>
      electron.ipcRenderer.invoke("intro-overlay-submit-name", _0x3d07c4),
    introOverlaySubmitLanguage: (_0x54988c) =>
      electron.ipcRenderer.invoke("intro-overlay-submit-language", _0x54988c),
    onIntroOverlayNameReplyComplete: (_0x33c9ba) => {
      const _0x11592d = _0x12bc5e,
        _0x2e65d6 = (_0x2028b, _0x19110f) => _0x33c9ba(_0x19110f);
      return (
        electron.ipcRenderer.on("intro-overlay-name-reply-complete", _0x2e65d6),
        () =>
          electron.ipcRenderer.removeListener(
            "intro-overlay-name-reply-complete",
            _0x2e65d6,
          )
      );
    },
    onIntroOverlayLanguageReplyComplete: (_0x1d0b6f) => {
      const _0x5dac4f = _0x12bc5e,
        _0x2a4bd9 = (_0x507bb3, _0x3c5b64) => _0x1d0b6f(_0x3c5b64);
      return (
        electron.ipcRenderer.on(
          "intro-overlay-language-reply-complete",
          _0x2a4bd9,
        ),
        () =>
          electron.ipcRenderer.removeListener(
            "intro-overlay-language-reply-complete",
            _0x2a4bd9,
          )
      );
    },
    onIntroOverlayExchangeUpdate: (_0x1f79cf) => {
      const _0x192ece = _0x12bc5e,
        _0x4e39e5 = (_0x6d77f, _0x4e05f3) => _0x1f79cf(_0x4e05f3);
      return (
        electron.ipcRenderer.on("intro-overlay-exchange-update", _0x4e39e5),
        () =>
          electron.ipcRenderer.removeListener(
            "intro-overlay-exchange-update",
            _0x4e39e5,
          )
      );
    },
    introOverlayFinished: (_0x8a7ca1) =>
      electron.ipcRenderer.send("intro-overlay-finished", _0x8a7ca1),
    notifyUserAuthUpdate: (_0x28a64c) =>
      electron.ipcRenderer.send("user-auth-update", _0x28a64c),
    "analytics:get-device-id": () =>
      electron.ipcRenderer.invoke("analytics:get-device-id"),
    detectInstalledCompetitorApps: () =>
      electron.ipcRenderer.invoke("analytics:detect-installed-competitor-apps"),
    getOnboardingState: () =>
      electron.ipcRenderer.invoke("get-onboarding-state"),
    notifyLoginSuccess: (_0x2b1339, _0x525fe0, _0x47bda9) => {
      const _0x2fdd7a = _0x12bc5e;
      return electron.ipcRenderer.invoke("notify-login-success", {
        profile: _0x2b1339,
        idToken: _0x525fe0,
        accessToken: _0x47bda9,
      });
    },
    deleteUserData: () => {
      const _0x4a1763 = _0x12bc5e;
      return electron.ipcRenderer.invoke("delete-user-data");
    },
    resetSettingsToDefaults: () => {
      const _0x19d329 = _0x12bc5e;
      return electron.ipcRenderer.invoke("reset-settings-to-defaults");
    },
    checkServerHealth: () => {
      const _0x36404b = _0x12bc5e;
      return electron.ipcRenderer.invoke("check-server-health");
    },
    updater: {
      onUpdateAvailable: (_0x25d6c7) => {
        const _0x5e6f37 = _0x12bc5e,
          _0x211811 = () => _0x25d6c7();
        return (
          electron.ipcRenderer.on("update-available", _0x211811),
          () =>
            electron.ipcRenderer.removeListener("update-available", _0x211811)
        );
      },
      onUpdateDownloading: (_0x5b6b65) => {
        const _0x27cfec = _0x12bc5e,
          _0x707881 = () => _0x5b6b65();
        return (
          electron.ipcRenderer.on("update-downloading", _0x707881),
          () =>
            electron.ipcRenderer.removeListener("update-downloading", _0x707881)
        );
      },
      onDownloadProgress: (_0x274bc8) => {
        const _0x22a5d8 = _0x12bc5e,
          _0x5a94d0 = (_0x2ade9a, _0x181d1e) => _0x274bc8(_0x181d1e);
        return (
          electron.ipcRenderer.on("update-download-progress", _0x5a94d0),
          () =>
            electron.ipcRenderer.removeListener(
              "update-download-progress",
              _0x5a94d0,
            )
        );
      },
      onUpdateDownloaded: (_0x4abfa0) => {
        const _0xf0ca4e = _0x12bc5e,
          _0x940037 = () => _0x4abfa0();
        return (
          electron.ipcRenderer.on("update-downloaded", _0x940037),
          () =>
            electron.ipcRenderer.removeListener("update-downloaded", _0x940037)
        );
      },
      onUpdateNotAvailable: (_0x204a04) => {
        const _0x5e5f95 = _0x12bc5e,
          _0xc51ef1 = () => _0x204a04();
        return (
          electron.ipcRenderer.on("update-not-available", _0xc51ef1),
          () =>
            electron.ipcRenderer.removeListener(
              "update-not-available",
              _0xc51ef1,
            )
        );
      },
      onUpdateError: (_0x3642eb) => {
        const _0x5d3275 = _0x12bc5e,
          _0x19ed0c = (_0x422604, _0x1c18db) => _0x3642eb(_0x1c18db);
        return (
          electron.ipcRenderer.on("update-error", _0x19ed0c),
          () => electron.ipcRenderer.removeListener("update-error", _0x19ed0c)
        );
      },
      onUpdateSkipped: (_0x59b09a) => {
        const _0x184de1 = _0x12bc5e,
          _0x37b12b = (_0x2e569f, _0x2a198a) => _0x59b09a(_0x2a198a);
        return (
          electron.ipcRenderer.on("update-skipped", _0x37b12b),
          () => electron.ipcRenderer.removeListener("update-skipped", _0x37b12b)
        );
      },
      checkForUpdates: () =>
        electron.ipcRenderer.invoke("request-check-updates"),
      downloadUpdate: () =>
        electron.ipcRenderer.invoke("request-download-update"),
      installUpdate: () => electron.ipcRenderer.send("install-update"),
      getUpdateStatus: () => electron.ipcRenderer.invoke("get-update-status"),
    },
    getPlatform: () => electron.ipcRenderer.invoke("get-platform"),
    getSystemTheme: () => electron.ipcRenderer.invoke("get-system-theme"),
    onSystemThemeChanged: (_0x519146) => {
      const _0x438ff9 = _0x12bc5e,
        _0xf4c61b = (_0x23603c, _0x32a30d) => _0x519146(_0x32a30d);
      return (
        electron.ipcRenderer.on("system-theme-changed", _0xf4c61b),
        () =>
          electron.ipcRenderer.removeListener("system-theme-changed", _0xf4c61b)
      );
    },
    selectedText: {
      get: (_0x47e2a2) =>
        electron.ipcRenderer.invoke("get-selected-text", _0x47e2a2),
      getString: (_0xb6e2e0) =>
        electron.ipcRenderer.invoke("get-selected-text-string", _0xb6e2e0),
      hasSelected: () => electron.ipcRenderer.invoke("has-selected-text"),
    },
    openai: { getToken: () => electron.ipcRenderer.invoke("openai:get-token") },
    subscription: {
      getStatus: () => electron.ipcRenderer.invoke("subscription:get-status"),
      getUsageStats: () =>
        electron.ipcRenderer.invoke("subscription:get-usage-stats"),
      createCheckoutSession: (_0x44abb4 = "yearly", _0x99765f) =>
        electron.ipcRenderer.invoke(
          "subscription:create-checkout-session",
          _0x44abb4,
          _0x99765f,
        ),
      createPortalSession: (_0xbf5bba) =>
        electron.ipcRenderer.invoke(
          "subscription:create-portal-session",
          _0xbf5bba,
        ),
      sendCancellationReason: (_0x4761d6, _0x3eac6e, _0x50af39) =>
        electron.ipcRenderer.invoke(
          "subscription:send-cancellation-reason",
          _0x4761d6,
          _0x3eac6e,
          _0x50af39,
        ),
      activateReferral: () =>
        electron.ipcRenderer.invoke("subscription:activate-referral"),
      activateTrial: () =>
        electron.ipcRenderer.invoke("subscription:activate-trial"),
      getCancelFlowOptions: (_0x7b90c1) =>
        electron.ipcRenderer.invoke(
          "subscription:get-cancel-flow-options",
          _0x7b90c1,
        ),
      pauseSubscription: (_0x75385a) =>
        electron.ipcRenderer.invoke("subscription:pause", _0x75385a),
      acceptRetentionOffer: () =>
        electron.ipcRenderer.invoke("subscription:accept-retention-offer"),
      notifyPaymentFailed: () =>
        electron.ipcRenderer.invoke("subscription:notify-payment-failed"),
      getPaymentMethod: () =>
        electron.ipcRenderer.invoke("subscription:get-payment-method"),
      undoCancel: () => electron.ipcRenderer.invoke("subscription:undo-cancel"),
      changeTrialPlan: (_0x4ad27f) =>
        electron.ipcRenderer.invoke(
          "subscription:change-trial-plan",
          _0x4ad27f,
        ),
      changePaidPlan: (_0x272d9a) =>
        electron.ipcRenderer.invoke("subscription:change-paid-plan", _0x272d9a),
      listPaymentMethods: () =>
        electron.ipcRenderer.invoke("subscription:list-payment-methods"),
      setDefaultPaymentMethod: (_0xa57b90) =>
        electron.ipcRenderer.invoke(
          "subscription:set-default-payment-method",
          _0xa57b90,
        ),
      detachPaymentMethod: (_0x520da9) =>
        electron.ipcRenderer.invoke(
          "subscription:detach-payment-method",
          _0x520da9,
        ),
      startCardUpdate: () =>
        electron.ipcRenderer.invoke("subscription:start-card-update"),
      finishCardUpdate: (_0x39e7f9) =>
        electron.ipcRenderer.invoke(
          "subscription:finish-card-update",
          _0x39e7f9,
        ),
      cancelPaidSubscription: () =>
        electron.ipcRenderer.invoke("subscription:cancel-paid"),
      cancelTrial: () =>
        electron.ipcRenderer.invoke("subscription:cancel-trial"),
      getWinbackOffer: () =>
        electron.ipcRenderer.invoke("subscription:get-winback-offer"),
      acceptWinbackOffer: () =>
        electron.ipcRenderer.invoke("subscription:accept-winback-offer"),
      getTrialEligibility: () =>
        electron.ipcRenderer.invoke("subscription:get-trial-eligibility"),
      paywallViewed: () =>
        electron.ipcRenderer.invoke("subscription:paywall-viewed"),
      embeddedPaywall: {
        closeWallet: () =>
          electron.ipcRenderer.invoke(
            "subscription:embedded-paywall-close-wallet",
          ),
        start: (_0x2a1496) =>
          electron.ipcRenderer.invoke(
            "subscription:embedded-paywall-start",
            _0x2a1496,
          ),
        browserWallet: (_0x1f4e8a) =>
          electron.ipcRenderer.invoke(
            "subscription:embedded-paywall-browser-wallet",
            _0x1f4e8a,
          ),
        confirm: (_0x8ad265) =>
          electron.ipcRenderer.invoke(
            "subscription:embedded-paywall-confirm",
            _0x8ad265,
          ),
        complete: (_0x1dcab5) =>
          electron.ipcRenderer.invoke(
            "subscription:embedded-paywall-complete",
            _0x1dcab5,
          ),
      },
      createTeamCheckoutSession: (
        _0x1ca222 = 3,
        _0x27b2ac = "yearly",
        _0x4a7dc0,
      ) =>
        electron.ipcRenderer.invoke(
          "subscription:create-team-checkout-session",
          _0x1ca222,
          _0x27b2ac,
          _0x4a7dc0,
        ),
      getTeamStatus: () =>
        electron.ipcRenderer.invoke("subscription:get-team-status"),
      linkTeamSubscription: (_0x4b2a96) =>
        electron.ipcRenderer.invoke(
          "subscription:link-team-subscription",
          _0x4b2a96,
        ),
      getPrices: (_0x3c3858) =>
        electron.ipcRenderer.invoke("subscription:get-prices", _0x3c3858),
      student: {
        getStatus: () => electron.ipcRenderer.invoke("student:get-status"),
        requestCode: (_0x2f1e57, _0xc3c8e1) =>
          electron.ipcRenderer.invoke(
            "student:request-code",
            _0x2f1e57,
            _0xc3c8e1,
          ),
        verifyCode: (_0x4fab6d) =>
          electron.ipcRenderer.invoke("student:verify-code", _0x4fab6d),
      },
    },
    feedback: {
      submit: (_0x477bcd) =>
        electron.ipcRenderer.invoke("feedback:submit", _0x477bcd),
      requestIntegration: (_0x58c6a9) =>
        electron.ipcRenderer.invoke("feedback:request-integration", _0x58c6a9),
      submitProductSurvey: (_0x249925) =>
        electron.ipcRenderer.invoke(
          "feedback:submit-product-survey",
          _0x249925,
        ),
      getProductSurveyStatus: () =>
        electron.ipcRenderer.invoke("feedback:get-product-survey-status"),
      dismissProductSurveyForMonth: () =>
        electron.ipcRenderer.invoke("feedback:dismiss-product-survey"),
    },
    playground: {
      setAppContext: (_0x4eebb8, _0x204b8f, _0x28f009) =>
        electron.ipcRenderer.invoke(
          "set-override-app-context",
          _0x4eebb8,
          _0x204b8f,
          _0x28f009,
        ),
      clearAppContext: () =>
        electron.ipcRenderer.invoke("clear-override-app-context"),
    },
    onboarding: {
      forceBuiltinMicrophone: () =>
        electron.ipcRenderer.invoke("force-builtin-microphone-for-onboarding"),
      restoreOriginalMicrophone: () =>
        electron.ipcRenderer.invoke(
          "restore-original-microphone-after-onboarding",
        ),
    },
    userProfile: {
      get: () => electron.ipcRenderer.invoke("user-profile:get"),
      update: (_0x101a2b) =>
        electron.ipcRenderer.invoke("user-profile:update", _0x101a2b),
    },
    getAppVersion: () => electron.ipcRenderer.invoke("get-app-version"),
    getSystemInfo: () => electron.ipcRenderer.invoke("get-system-info"),
    getDiagnosticLogs: () => electron.ipcRenderer.invoke("get-diagnostic-logs"),
    notifyRemoteDiagnosticLogsShared: () =>
      electron.ipcRenderer.invoke("notify-remote-diagnostic-logs-shared"),
    writingContexts: {
      getInstalledAppNames: () =>
        electron.ipcRenderer.invoke("writing-contexts:get-installed-app-names"),
    },
    writingStyles: {
      get: (_0x4916df) =>
        electron.ipcRenderer.invoke("writing-styles:get", {
          ownerUserId: _0x4916df,
        }),
      save: (_0x547219, _0x178bc9) =>
        electron.ipcRenderer.invoke("writing-styles:save", {
          state: _0x547219,
          ownerUserId: _0x178bc9,
        }),
    },
    chatGpt: {
      status: () => electron.ipcRenderer.invoke("chatgpt:status"),
      connect: () => electron.ipcRenderer.invoke("chatgpt:connect"),
      disconnect: () => electron.ipcRenderer.invoke("chatgpt:disconnect"),
      setActiveThread: (_0x2c6b36) =>
        electron.ipcRenderer.invoke("chatgpt:set-active-thread", _0x2c6b36),
    },
    chatGptHistory: {
      getRecent: () =>
        electron.ipcRenderer.invoke("chatgpt-history:get-recent"),
    },
    obsidian: {
      status: () => electron.ipcRenderer.invoke("obsidian:status"),
      connect: () => electron.ipcRenderer.invoke("obsidian:connect"),
      disconnect: () => electron.ipcRenderer.invoke("obsidian:disconnect"),
    },
    applemail: {
      accountAddresses: () =>
        electron.ipcRenderer.invoke("applemail:account-addresses"),
      status: () => electron.ipcRenderer.invoke("applemail:status"),
      connect: () => electron.ipcRenderer.invoke("applemail:connect"),
      disconnect: () => electron.ipcRenderer.invoke("applemail:disconnect"),
      messagePreview: (_0x3449e3) =>
        electron.ipcRenderer.invoke("applemail:message-preview", {
          id: _0x3449e3,
        }),
    },
    imessage: {
      status: () => electron.ipcRenderer.invoke("imessage:status"),
      connect: () => electron.ipcRenderer.invoke("imessage:connect"),
      disconnect: () => electron.ipcRenderer.invoke("imessage:disconnect"),
      threadPreview: (_0x8b3f31, _0xd9950c) =>
        electron.ipcRenderer.invoke("imessage:thread-preview", {
          target: _0x8b3f31,
          limit: _0xd9950c,
        }),
      linkPreview: (_0x2a9af9) =>
        electron.ipcRenderer.invoke("imessage:link-preview", {
          url: _0x2a9af9,
        }),
    },
    files: {
      status: () => electron.ipcRenderer.invoke("files:status"),
      connect: () => electron.ipcRenderer.invoke("files:connect"),
      disconnect: () => electron.ipcRenderer.invoke("files:disconnect"),
      filePreview: (_0x141992) =>
        electron.ipcRenderer.invoke("files:file-preview", { path: _0x141992 }),
      startDrag: (_0x9cc61e) =>
        electron.ipcRenderer.send("files:start-drag", _0x9cc61e),
      openPath: (_0x4a00ba) =>
        electron.ipcRenderer.send("files:open-path", { path: _0x4a00ba }),
      contextMenu: (_0x2b782a) =>
        electron.ipcRenderer.send("files:context-menu", { path: _0x2b782a }),
      browseFolder: (_0x3101eb) =>
        electron.ipcRenderer.invoke("files:browse-folder", { path: _0x3101eb }),
    },
    reminders: {
      status: () => electron.ipcRenderer.invoke("reminders:status"),
      connect: () => electron.ipcRenderer.invoke("reminders:connect"),
      disconnect: () => electron.ipcRenderer.invoke("reminders:disconnect"),
      reminderPreview: (_0x20ea3a) =>
        electron.ipcRenderer.invoke("reminders:reminder-preview", {
          target: _0x20ea3a,
        }),
      lists: () => electron.ipcRenderer.invoke("reminders:lists"),
    },
    twitter: {
      status: () => electron.ipcRenderer.invoke("twitter:status"),
      connect: () => electron.ipcRenderer.invoke("twitter:connect"),
      disconnect: () => electron.ipcRenderer.invoke("twitter:disconnect"),
    },
    maps: {
      status: () => electron.ipcRenderer.invoke("maps:status"),
      connect: () => electron.ipcRenderer.invoke("maps:connect"),
      disconnect: () => electron.ipcRenderer.invoke("maps:disconnect"),
    },
    codingAgents: {
      status: (_0x53a8b1) =>
        electron.ipcRenderer.invoke("codingAgent:status", _0x53a8b1),
      connect: (_0x41cd11) =>
        electron.ipcRenderer.invoke("codingAgent:connect", _0x41cd11),
      disconnect: (_0x1696ab) =>
        electron.ipcRenderer.invoke("codingAgent:disconnect", _0x1696ab),
      getModelSettings: (_0x5c4d4f) =>
        electron.ipcRenderer.invoke(
          "codingAgent:get-model-settings",
          _0x5c4d4f,
        ),
      setModel: (_0x24c9dd, _0x19de96) =>
        electron.ipcRenderer.invoke(
          "codingAgent:set-model",
          _0x24c9dd,
          _0x19de96,
        ),
      setEffort: (_0x1977d9, _0x1041cf) =>
        electron.ipcRenderer.invoke(
          "codingAgent:set-effort",
          _0x1977d9,
          _0x1041cf,
        ),
      taskHistory: () =>
        electron.ipcRenderer.invoke("codingAgent:task-history"),
      taskSnapshot: (_0x774883) =>
        electron.ipcRenderer.invoke("codingAgent:task-snapshot", _0x774883),
      continueWithSonnet: (_0x3e8af3) =>
        electron.ipcRenderer.invoke(
          "codingAgent:continue-with-sonnet",
          _0x3e8af3,
        ),
      openSession: (_0x325550, _0x5c46d2 = "desktop") =>
        electron.ipcRenderer.invoke(
          "codingAgent:open-session",
          _0x325550,
          _0x5c46d2,
        ),
      getBypassPermissions: () =>
        electron.ipcRenderer.invoke("codingAgent:get-bypass-permissions"),
      setBypassPermissions: (_0x68f3f5) =>
        electron.ipcRenderer.invoke(
          "codingAgent:set-bypass-permissions",
          _0x68f3f5,
        ),
      acknowledgeOrchestration: (_0x15211d) =>
        electron.ipcRenderer.invoke(
          "codingAgent:acknowledge-orchestration",
          _0x15211d,
        ),
      acknowledgeTask: (_0x29619e) =>
        electron.ipcRenderer.invoke("codingAgent:acknowledge-task", _0x29619e),
      answerPrompt: (_0xa7edbf, _0x59503d, _0x3fb328) =>
        electron.ipcRenderer.invoke(
          "codingAgent:answer-prompt",
          _0xa7edbf,
          _0x59503d,
          _0x3fb328,
        ),
      cancelTask: (_0x3dd340) =>
        electron.ipcRenderer.invoke("codingAgent:cancel-task", _0x3dd340),
      removeQueuedFollowUp: (_0x14c555, _0x583fd2) =>
        electron.ipcRenderer.invoke(
          "codingAgent:remove-queued-follow-up",
          _0x14c555,
          _0x583fd2,
        ),
      editQueuedFollowUp: (_0x1adb92, _0x5e51d6, _0x41cb25) =>
        electron.ipcRenderer.invoke(
          "codingAgent:edit-queued-follow-up",
          _0x1adb92,
          _0x5e51d6,
          _0x41cb25,
        ),
      cancelOrchestration: (_0x317c83) =>
        electron.ipcRenderer.invoke(
          "codingAgent:cancel-orchestration",
          _0x317c83,
        ),
    },
    workflows: {
      history: () => electron.ipcRenderer.invoke("workflow:history"),
      acknowledge: (_0x5eb09a) =>
        electron.ipcRenderer.invoke("workflow:acknowledge", _0x5eb09a),
      select: (_0x59cf28) =>
        electron.ipcRenderer.invoke("workflow:select", _0x59cf28),
      resolveCodeApproval: (_0x279870, _0x777af, _0x3f03dc) =>
        electron.ipcRenderer.invoke(
          "workflow:resolve-code-approval",
          _0x279870,
          _0x777af,
          _0x3f03dc,
        ),
      cancel: (_0x5b0e5b) =>
        electron.ipcRenderer.invoke("workflow:cancel", _0x5b0e5b),
    },
    appleCalendar: {
      status: () => electron.ipcRenderer.invoke("applecalendar:status"),
      connect: () => electron.ipcRenderer.invoke("applecalendar:connect"),
      disconnect: () => electron.ipcRenderer.invoke("applecalendar:disconnect"),
      calendars: () => electron.ipcRenderer.invoke("applecalendar:calendars"),
      eventPreview: (_0x4bcd9b, _0x4a95ad) =>
        electron.ipcRenderer.invoke("applecalendar:event-preview", {
          eventId: _0x4bcd9b,
          calendar: _0x4a95ad,
        }),
    },
    appleNotes: {
      status: () => electron.ipcRenderer.invoke("notes:status"),
      connect: () => electron.ipcRenderer.invoke("notes:connect"),
      disconnect: () => electron.ipcRenderer.invoke("notes:disconnect"),
      folders: () => electron.ipcRenderer.invoke("notes:folders"),
    },
    music: {
      details: (_0x4bb996) =>
        electron.ipcRenderer.invoke("music:details", _0x4bb996),
      playback: (_0x44fdea) =>
        electron.ipcRenderer.invoke("music:playback", _0x44fdea),
      control: (_0x5e3a61) =>
        electron.ipcRenderer.invoke("music:control", _0x5e3a61),
    },
    appleMusic: {
      status: () => electron.ipcRenderer.invoke("apple-music:status"),
      connect: () => electron.ipcRenderer.invoke("apple-music:connect"),
      disconnect: () => electron.ipcRenderer.invoke("apple-music:disconnect"),
    },
    spotify: {
      status: () => electron.ipcRenderer.invoke("spotify:status"),
      connect: () => electron.ipcRenderer.invoke("spotify:connect"),
      disconnect: () => electron.ipcRenderer.invoke("spotify:disconnect"),
    },
    customMcp: {
      list: () => electron.ipcRenderer.invoke("custom-mcp:list"),
      add: (_0x4a1822) =>
        electron.ipcRenderer.invoke("custom-mcp:add", _0x4a1822),
      update: (_0x2e0368) =>
        electron.ipcRenderer.invoke("custom-mcp:update", _0x2e0368),
      remove: (_0x246a10) =>
        electron.ipcRenderer.invoke("custom-mcp:remove", _0x246a10),
      toggle: (_0x416c3e, _0x346e47) =>
        electron.ipcRenderer.invoke("custom-mcp:toggle", {
          id: _0x416c3e,
          enabled: _0x346e47,
        }),
      refresh: (_0x2f99f4) =>
        electron.ipcRenderer.invoke("custom-mcp:refresh", _0x2f99f4),
      getTools: (_0x494f09) =>
        electron.ipcRenderer.invoke("custom-mcp:get-tools", _0x494f09),
      getLogs: (_0x41564f) =>
        electron.ipcRenderer.invoke("custom-mcp:logs", _0x41564f),
      pickScript: () => electron.ipcRenderer.invoke("custom-mcp:pick-script"),
      pickIcon: () => electron.ipcRenderer.invoke("custom-mcp:pick-icon"),
      generate: (_0x2019cb) =>
        electron.ipcRenderer.invoke("custom-mcp:generate", {
          prompt: _0x2019cb,
        }),
    },
    integrationStudio: {
      openSession: () =>
        electron.ipcRenderer.invoke("integration-studio:open-session"),
      plan: (_0x2ce6bc) =>
        electron.ipcRenderer.invoke("integration-studio:plan", _0x2ce6bc),
      savePlanSelections: (_0x3332e0) =>
        electron.ipcRenderer.invoke(
          "integration-studio:plan-selections",
          _0x3332e0,
        ),
      chat: (_0x10675c) =>
        electron.ipcRenderer.invoke("integration-studio:chat", _0x10675c),
      generate: (_0x55b923) =>
        electron.ipcRenderer.invoke("integration-studio:generate", _0x55b923),
      cancel: (_0x447b4a) =>
        electron.ipcRenderer.invoke("integration-studio:cancel", _0x447b4a),
      restartServer: (_0x539681) =>
        electron.ipcRenderer.invoke(
          "integration-studio:restart-server",
          _0x539681,
        ),
      serverLogs: (_0x32b3d2) =>
        electron.ipcRenderer.invoke(
          "integration-studio:server-logs",
          _0x32b3d2,
        ),
      saveDraft: (_0x411178) =>
        electron.ipcRenderer.invoke("integration-studio:save-draft", _0x411178),
      discardDraft: (_0x5918a5) =>
        electron.ipcRenderer.invoke(
          "integration-studio:discard-draft",
          _0x5918a5,
        ),
      getRuns: () => electron.ipcRenderer.invoke("integration-studio:get-runs"),
      getSession: (_0x1aa804) =>
        electron.ipcRenderer.invoke(
          "integration-studio:get-session",
          _0x1aa804,
        ),
      startFromInstalled: (_0x59ed44) =>
        electron.ipcRenderer.invoke(
          "integration-studio:start-from-installed",
          _0x59ed44,
        ),
      generateIcon: (_0x24a0fa) =>
        electron.ipcRenderer.invoke(
          "integration-studio:generate-icon",
          _0x24a0fa,
        ),
      openHandoff: (_0x26d650) =>
        electron.ipcRenderer.invoke(
          "integration-studio:open-handoff",
          _0x26d650,
        ),
      handoffCommand: (_0x38972b) =>
        electron.ipcRenderer.invoke(
          "integration-studio:handoff-command",
          _0x38972b,
        ),
      setToolConfirmation: (_0x522d8b) =>
        electron.ipcRenderer.invoke(
          "integration-studio:set-tool-confirmation",
          _0x522d8b,
        ),
      rename: (_0x255757) =>
        electron.ipcRenderer.invoke("integration-studio:rename", _0x255757),
      previewTool: (_0x326322) =>
        electron.ipcRenderer.invoke(
          "integration-studio:preview-tool",
          _0x326322,
        ),
      setConfigValues: (_0x161ac5, _0x324e51) =>
        electron.ipcRenderer.invoke("integration-studio:set-config-values", {
          sessionId: _0x161ac5,
          values: _0x324e51,
        }),
      getConfigState: (_0x2fe4cd) =>
        electron.ipcRenderer.invoke(
          "integration-studio:get-config-state",
          _0x2fe4cd,
        ),
      revealConfigSecret: (_0x5c3b71) =>
        electron.ipcRenderer.invoke(
          "integration-studio:reveal-config-secret",
          _0x5c3b71,
        ),
      testSend: (_0xa5da9, _0x31d3b3) =>
        electron.ipcRenderer.invoke("integration-studio:test-send", {
          sessionId: _0xa5da9,
          utterance: _0x31d3b3,
        }),
      testConfirm: (_0x4138aa) =>
        electron.ipcRenderer.invoke(
          "integration-studio:test-confirm",
          _0x4138aa,
        ),
      testCancel: (_0x2a8794) =>
        electron.ipcRenderer.invoke(
          "integration-studio:test-cancel",
          _0x2a8794,
        ),
    },
    integrationMarketplace: {
      list: () => electron.ipcRenderer.invoke("marketplace:list"),
      previewInstall: (_0x33bfe5) =>
        electron.ipcRenderer.invoke("marketplace:preview-install", {
          dirPath: _0x33bfe5,
        }),
      previewCatalogInstall: (_0x3f8050) =>
        electron.ipcRenderer.invoke("marketplace:preview-catalog-install", {
          catalogId: _0x3f8050,
        }),
      install: (_0x3f8853) =>
        electron.ipcRenderer.invoke("marketplace:install", {
          dirPath: _0x3f8853,
        }),
      uninstall: (_0x42a6a) =>
        electron.ipcRenderer.invoke("marketplace:uninstall", {
          manifestId: _0x42a6a,
        }),
      setEnabled: (_0x4afd44, _0x449c68) =>
        electron.ipcRenderer.invoke("marketplace:set-enabled", {
          manifestId: _0x4afd44,
          enabled: _0x449c68,
        }),
      setHooksEnabled: (_0x48ded4, _0x11ccce) =>
        electron.ipcRenderer.invoke("marketplace:set-hooks-enabled", {
          manifestId: _0x48ded4,
          enabled: _0x11ccce,
        }),
      setConfigValues: (_0x38bcca, _0x1df44e) =>
        electron.ipcRenderer.invoke("marketplace:set-config-values", {
          manifestId: _0x38bcca,
          values: _0x1df44e,
        }),
      revealConfigSecret: (_0x3625b9) =>
        electron.ipcRenderer.invoke(
          "marketplace:reveal-config-secret",
          _0x3625b9,
        ),
      refresh: (_0x567a5d) =>
        electron.ipcRenderer.invoke("marketplace:refresh", {
          manifestId: _0x567a5d,
        }),
      pickFolder: () => electron.ipcRenderer.invoke("marketplace:pick-folder"),
      create: (_0x32b40a) =>
        electron.ipcRenderer.invoke(
          "marketplace:create",
          typeof _0x32b40a === "string" ? { name: _0x32b40a } : _0x32b40a,
        ),
      openFolder: (_0x432a2c) =>
        electron.ipcRenderer.invoke("marketplace:open-folder", {
          manifestId: _0x432a2c,
        }),
      pickIcon: () => electron.ipcRenderer.invoke("integrations:pick-icon"),
      setIcon: (_0xd81456, _0x3092a3) =>
        electron.ipcRenderer.invoke("marketplace:set-icon", {
          manifestId: _0xd81456,
          iconDataUrl: _0x3092a3,
        }),
      generateIcon: (_0x52a96f) =>
        electron.ipcRenderer.invoke("marketplace:generate-icon", _0x52a96f),
    },
    protocol: {
      drainPendingUrls: () =>
        electron.ipcRenderer.invoke("protocol:drain-pending-urls"),
    },
    integrationShare: {
      publish: (_0x2c786a, _0x2dd2af) =>
        electron.ipcRenderer.invoke("integration-share:publish", {
          manifestId: _0x2c786a,
          reviewId: _0x2dd2af,
        }),
      preview: (_0x4b99d2) =>
        electron.ipcRenderer.invoke("integration-share:preview", {
          manifestId: _0x4b99d2,
        }),
      submitReview: (_0x246de1) =>
        electron.ipcRenderer.invoke("integration-share:submit-review", {
          manifestId: _0x246de1,
        }),
      reviewStatus: (_0xdfee07) =>
        electron.ipcRenderer.invoke("integration-share:review-status", {
          reviewId: _0xdfee07,
        }),
      publishState: (_0x249196) =>
        electron.ipcRenderer.invoke("integration-share:publish-state", {
          manifestId: _0x249196,
        }),
      getPending: () =>
        electron.ipcRenderer.invoke("integration-share:pending"),
      clearError: () =>
        electron.ipcRenderer.invoke("integration-share:clear-error"),
      discard: () => electron.ipcRenderer.invoke("integration-share:discard"),
      clear: () => electron.ipcRenderer.invoke("integration-share:clear"),
    },
    nativeActions: {
      list: () => electron.ipcRenderer.invoke("native-actions:list"),
      toggle: (_0x945991, _0x13b263, _0x2c8c6b) =>
        electron.ipcRenderer.invoke("native-actions:toggle", {
          id: _0x945991,
          enabled: _0x13b263,
          ..._0x2c8c6b,
        }),
    },
    copyToClipboard: (_0x1fa2c9) => {
      const _0x49ba7d = _0x12bc5e;
      electron.clipboard.writeText(_0x1fa2c9);
    },
  };
Object.assign(console, log__namespace.functions);
function _0x4f3b(_0x5aff39, _0x2e34bf) {
  _0x5aff39 = _0x5aff39 - 452;
  const _0x580a92 = _0x50f2();
  let _0x512741 = _0x580a92[_0x5aff39];
  return _0x512741;
}
if (process.contextIsolated)
  try {
    (electron.contextBridge.exposeInMainWorld("electron", {
      ...preload.electronAPI,
      store: {
        get(_0x3826e8) {
          const _0xd9df83 = _0x12bc5e;
          return electron.ipcRenderer.sendSync("electron-store-get", _0x3826e8);
        },
        set(_0x3d11a8, _0x1762f2) {
          const _0x2fe842 = _0x12bc5e;
          electron.ipcRenderer.send("electron-store-set", _0x3d11a8, _0x1762f2);
        },
      },
    }),
      electron.contextBridge.exposeInMainWorld("api", api));
  } catch (_0x43edf2) {
    console.error(_0x43edf2);
  }
else
  ((window.electron = {
    ...preload.electronAPI,
    store: {
      get(_0x5cb507) {
        const _0x2f9e48 = _0x12bc5e;
        return electron.ipcRenderer.sendSync("electron-store-get", _0x5cb507);
      },
      set(_0x16074e, _0x566148) {
        const _0x4c8ec6 = _0x12bc5e;
        electron.ipcRenderer.send("electron-store-set", _0x16074e, _0x566148);
      },
    },
  }),
    (window.api = api));
