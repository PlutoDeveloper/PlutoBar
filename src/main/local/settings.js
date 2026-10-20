"use strict";
// VoiceOS local settings: which Claude engine to use, its models, and the
// speech-recognition model. The reply voice, its speed and on/off switch are
// the app's own Agent voice settings (Agent page). The only secret is an optional Anthropic API key,
// encrypted with the macOS Keychain via Electron safeStorage. The Keychain is
// only touched when a key is saved or used — never at startup — because
// macOS may show a (blocking) Keychain prompt for it.

const electron = require("electron");
const { DEFAULT_WHISPER_MODEL, AGENT_VOICES, JARVIS_VOICE_ID, kokoroSpeed } = require("./speech/models");

const STORE_KEY = "voiceosLocal";
const ENC_PREFIX = "enc:v1:";

const SUCCESSORS = { "claude-haiku-4-5": "claude-haiku-5-5", "claude-haiku-4-5-20251001": "claude-haiku-5-5" };

const DEFAULTS = {
  assistant: {
    engine: null, // "subscription" (Claude Code sign-in) | "apikey"
    model: "sonnet", // Claude Code model alias
    fastModel: "haiku",
    apiModel: "claude-sonnet-5-5",
    apiFastModel: "claude-haiku-5-5",
  },
  speech: {
    whisperModel: DEFAULT_WHISPER_MODEL,
  },
};

class Settings {
  constructor(store, STORE_KEYS) {
    this.store = store;
    this.appSettingsKey = STORE_KEYS.SETTINGS;
    this.listeners = new Set();
    this.claude = { installed: false, signedIn: false, checked: false };
    // Earlier builds kept provider keys and a copied Claude session token
    // under "providers"; VoiceOS no longer stores Claude credentials.
    if (store.has("providers")) store.delete("providers");
    this.migrateVoicePrefs();
  }

  // Earlier builds had their own voice settings; carry them over to the
  // app's Agent voice settings once.
  migrateVoicePrefs() {
    const raw = this.store.get(STORE_KEY);
    const old = raw?.speech;
    if (!old || !("voice" in old || "speakReplies" in old)) return;
    const app = this.store.get(this.appSettingsKey) || {};
    if (old.voice === "bm_george") app.agentVoiceId = JARVIS_VOICE_ID;
    if (old.speakReplies === false) app.agentVoiceEnabled = false;
    this.store.set(this.appSettingsKey, app);
    const { setupCompleted, ...rest } = raw;
    this.store.set(STORE_KEY, { ...rest, speech: { whisperModel: old.whisperModel || DEFAULT_WHISPER_MODEL } });
  }

  // The Agent voice chosen on the Agent page, as a Kokoro voice.
  voice() {
    const app = this.store.get(this.appSettingsKey) || {};
    const id = AGENT_VOICES[app.agentVoiceId] ? app.agentVoiceId : "gemini-live-zephyr";
    return {
      enabled: app.agentVoiceEnabled !== false,
      appVoiceId: id,
      kokoroVoice: AGENT_VOICES[id],
      speed: kokoroSpeed(app.agentVoiceSpeed),
      jarvis: id === JARVIS_VOICE_ID,
    };
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit() {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch {}
    }
  }

  read() {
    const raw = this.store.get(STORE_KEY) || {};
    const assistant = { ...DEFAULTS.assistant, ...(raw.assistant || {}) };
    // A saved choice of a model that has a successor moves to the successor.
    for (const key of ["apiModel", "apiFastModel"]) assistant[key] = SUCCESSORS[assistant[key]] || assistant[key];
    return {
      ...DEFAULTS,
      ...raw,
      assistant,
      speech: { ...DEFAULTS.speech, ...(raw.speech || {}) },
    };
  }

  // set("assistant.model", "haiku"), set("speech.whisperModel", "small-q5_1")
  set(key, value) {
    const allowed = [
      "assistant.engine",
      "assistant.model",
      "assistant.fastModel",
      "assistant.apiModel",
      "assistant.apiFastModel",
      "speech.whisperModel",
    ];
    if (!allowed.includes(key)) throw new Error("Unknown setting: " + key);
    const state = this.read();
    const [group, field] = key.split(".");
    if (field) state[group] = { ...state[group], [field]: value };
    else state[group] = value;
    delete state.assistant.apiKey;
    const raw = this.store.get(STORE_KEY) || {};
    this.store.set(STORE_KEY, { ...state, apiKey: raw.apiKey });
    this.emit();
  }

  // ------------------------------------------------------------ API key

  setApiKey(key) {
    const trimmed = String(key || "").trim();
    if (!trimmed) throw new Error("The API key is empty.");
    const value = electron.safeStorage.isEncryptionAvailable()
      ? ENC_PREFIX + electron.safeStorage.encryptString(trimmed).toString("base64")
      : trimmed;
    this.store.set(STORE_KEY, { ...(this.store.get(STORE_KEY) || {}), apiKey: value });
    this.emit();
  }

  getApiKey() {
    const value = (this.store.get(STORE_KEY) || {}).apiKey;
    if (value?.startsWith(ENC_PREFIX)) {
      try {
        return electron.safeStorage.decryptString(Buffer.from(value.slice(ENC_PREFIX.length), "base64"));
      } catch {
        return null;
      }
    }
    return value || process.env.ANTHROPIC_API_KEY || null;
  }

  // ------------------------------------------------------------ connectors
  // On/off for connectors VoiceOS runs itself without an account (X).

  connector(slug) {
    return !!(this.store.get(STORE_KEY) || {}).connectors?.[slug];
  }

  setConnector(slug, on) {
    const raw = this.store.get(STORE_KEY) || {};
    this.store.set(STORE_KEY, { ...raw, connectors: { ...(raw.connectors || {}), [slug]: !!on } });
    return { connected: !!on };
  }

  // ------------------------------------------------------------ PlutoBar
  // The Spotlight-style bar (local/plutobar): on unless turned off.

  plutobar() {
    const p = (this.store.get(STORE_KEY) || {}).plutobar || {};
    return { enabled: p.enabled !== false, shortcut: p.shortcut || null, clipboard: p.clipboard !== false, setupDone: p.setupDone === true };
  }

  setPlutobar(patch) {
    const raw = this.store.get(STORE_KEY) || {};
    const next = { ...this.plutobar(), ...patch };
    this.store.set(STORE_KEY, {
      ...raw,
      plutobar: { enabled: !!next.enabled, shortcut: next.shortcut ? String(next.shortcut) : null, clipboard: !!next.clipboard, setupDone: !!next.setupDone },
    });
    this.emit();
    return this.plutobar();
  }

  // What file search covers (local/plutobar/digup.js): the folders, folders
  // and file types skipped inside them, and the code folders (empty: off).
  // `chosen` turns true once you've picked them (setup, or Settings).
  files() {
    const f = (this.store.get(STORE_KEY) || {}).files || {};
    const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
    return { roots: list(f.roots), skipped: list(f.skipped), types: list(f.types), codeRoots: list(f.codeRoots), codeSkipped: list(f.codeSkipped), chosen: f.chosen === true };
  }

  setFiles(patch) {
    const raw = this.store.get(STORE_KEY) || {};
    this.store.set(STORE_KEY, { ...raw, files: { ...this.files(), ...patch } });
    this.emit();
    return this.files();
  }

  clearApiKey() {
    const raw = { ...(this.store.get(STORE_KEY) || {}) };
    delete raw.apiKey;
    this.store.set(STORE_KEY, raw);
    this.emit();
  }

  // ---------------------------------------------------- Claude account

  setClaudeStatus(status) {
    this.claude = { ...status, checked: true };
    this.emit();
  }

  // Which Claude to use: your Claude account (via Claude Code) or an API
  // key. Honors the chosen engine and falls back to whichever is available.
  resolveAssistant(kind = "agent") {
    const s = this.read().assistant;
    const sub = () => (this.claude.signedIn ? { engine: "subscription", model: kind === "fast" ? s.fastModel : s.model } : null);
    const api = () => {
      const apiKey = this.getApiKey();
      return apiKey ? { engine: "apikey", apiKey, model: kind === "fast" ? s.apiFastModel : s.apiModel } : null;
    };
    return s.engine === "apikey" ? api() || sub() : sub() || api();
  }

  hasApiKey() {
    return !!((this.store.get(STORE_KEY) || {}).apiKey || process.env.ANTHROPIC_API_KEY);
  }

  publicState() {
    const state = this.read();
    const stored = (this.store.get(STORE_KEY) || {}).apiKey;
    const active = this.resolveAssistant("agent");
    return {
      assistant: { ...state.assistant, active: active ? { engine: active.engine, model: active.model } : null },
      speech: state.speech,
      claude: this.claude,
      apiKey: stored ? { masked: "saved", fromEnv: false } : process.env.ANTHROPIC_API_KEY ? { masked: "from environment", fromEnv: true } : null,
    };
  }
}

module.exports = { Settings };
