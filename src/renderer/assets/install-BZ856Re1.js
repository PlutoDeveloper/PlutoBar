!(function() {
  const _0x334dd7 = /* @__PURE__ */ (function() {
    let _0x3d105b = !false;
    return function(_0x16f715, _0x2eb06d) {
      const _0x206b5b = _0x3d105b ? function() {
        if (_0x2eb06d) {
          const _0x2264d8 = _0x2eb06d.apply(_0x16f715, arguments);
          return _0x2eb06d = null, _0x2264d8;
        }
      } : function() {
      };
      return _0x3d105b = false, _0x206b5b;
    };
  })(), _0x40d207 = _0x334dd7(this, function() {
    let _0xf1c48e;
    try {
      const _0x4a6bef = Function('return (function() {}.constructor("return this")( ));');
      _0xf1c48e = _0x4a6bef();
    } catch (_0x37f1a2) {
      _0xf1c48e = window;
    }
    const _0x16e088 = _0xf1c48e.console = _0xf1c48e.console || {}, _0x48fc83 = ["log", "warn", "info", "error", "exception", "table", "trace"];
    for (let _0x57ab6a = 0; _0x57ab6a < _0x48fc83.length; _0x57ab6a++) {
      const _0x3c42e5 = _0x334dd7.constructor.prototype.bind(_0x334dd7), _0x418d0b = _0x48fc83[_0x57ab6a], _0x49ccad = _0x16e088[_0x418d0b] || _0x3c42e5;
      _0x3c42e5.__proto__ = _0x334dd7.bind(_0x334dd7), _0x3c42e5.toString = _0x49ccad.toString.bind(_0x49ccad), _0x16e088[_0x418d0b] = _0x3c42e5;
    }
  });
  _0x40d207();
  try {
    var _0x4942fc = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
    _0x4942fc.SENTRY_RELEASE = { "id": "voiceos-opensourced@0.1.33" };
    var _0x5b483b = new _0x4942fc.Error().stack;
    _0x5b483b && (_0x4942fc._sentryDebugIds = _0x4942fc._sentryDebugIds || {}, _0x4942fc._sentryDebugIds[_0x5b483b] = "0e4b8346-0c26-4913-ae11-f83fd4acfa00", _0x4942fc._sentryDebugIdIdentifier = "sentry-dbid-0e4b8346-0c26-4913-ae11-f83fd4acfa00");
  } catch (_0x20760e) {
  }
})();
function getInstallerLocale(_0x44a006) {
  for (const _0x184e35 of _0x44a006) {
    const _0x4e6592 = _0x184e35.toLowerCase().split(/[-_]/)[0];
    if (_0x4e6592 === "en" || _0x4e6592 === "ja") return _0x4e6592;
  }
  return "en";
}
const installerCopy = { "en": { "title": "Install VoiceOS opensourced", "heading": "To install, <em>drag</em> VoiceOS opensourced<br />to Applications", "applications": "Applications", "move": "Move VoiceOS opensourced to Applications", "destination": "Applications: move VoiceOS opensourced here" }, "ja": { "title": "VoiceOS opensourcedをインストール", "heading": "VoiceOS opensourcedを「アプリケーション」へ<br /><em>ドラッグ</em>してインストール", "applications": "アプリケーション", "move": "VoiceOS opensourcedをアプリケーションに移動", "destination": "アプリケーション：VoiceOS opensourcedをここに移動" } }, appItem = document.querySelector(".app-item"), folderItem = document.querySelector(".folder-item"), requestedLocale = new URLSearchParams(window.location.search).get("lang"), locale = getInstallerLocale(requestedLocale ? [requestedLocale] : navigator.languages), copy = installerCopy[locale];
document.documentElement.lang = locale, document.title = copy.title;
const heading = document.querySelector("#instruction");
if (heading) heading.innerHTML = copy.heading;
const folderLabel = folderItem?.querySelector(".item-label");
if (folderLabel) folderLabel.textContent = copy.applications;
appItem?.setAttribute("aria-label", copy.move), folderItem?.setAttribute("aria-label", copy.destination);
const dragType = "application/x-voiceos-install";
let draggingVoiceOS = false;
function install() {
  window.location.href = "voiceos-install://move";
}
function resetDrag() {
  draggingVoiceOS = false, folderItem?.classList.remove("drop-ready");
}
appItem?.addEventListener("dragstart", (_0x6b5d3e) => {
  if (!_0x6b5d3e.dataTransfer) return;
  draggingVoiceOS = !false, _0x6b5d3e.dataTransfer.setData(dragType, "VoiceOS"), _0x6b5d3e.dataTransfer.effectAllowed = "move";
}), appItem?.addEventListener("dragend", resetDrag), folderItem?.addEventListener("dragover", (_0x84823) => {
  if (!draggingVoiceOS || !_0x84823.dataTransfer?.types.includes(dragType)) return;
  _0x84823.preventDefault(), _0x84823.dataTransfer.dropEffect = "move", folderItem.classList.add("drop-ready");
}), folderItem?.addEventListener("dragleave", (_0x6b2c3e) => {
  if (_0x6b2c3e.relatedTarget instanceof Node && folderItem.contains(_0x6b2c3e.relatedTarget)) return;
  folderItem.classList.remove("drop-ready");
}), folderItem?.addEventListener("drop", (_0x5394c6) => {
  _0x5394c6.preventDefault();
  const _0x2f267d = draggingVoiceOS && _0x5394c6.dataTransfer?.getData(dragType) === "VoiceOS";
  resetDrag();
  if (_0x2f267d) install();
});
for (const item of [appItem, folderItem]) {
  item?.addEventListener("keydown", (_0x45fd38) => {
    if (_0x45fd38.key !== "Enter" && _0x45fd38.key !== " ") return;
    _0x45fd38.preventDefault(), install();
  });
}
