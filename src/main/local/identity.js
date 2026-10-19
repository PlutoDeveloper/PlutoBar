"use strict";
// The local "account": VoiceOS runs permanently signed in using the
// renderer's built-in self-hosted mode, so no login screen is shown and
// every plan/usage check passes. The profile lives in the app's own store.

const LOCAL_USER_ID = "self-hosted";
const LOCAL_ACCESS_TOKEN = "voiceos-local";
const PROFILE_KEY = "localProfile";

let store = null;
let keys = null;

function init(electronStore, STORE_KEYS) {
  store = electronStore;
  keys = STORE_KEYS;
  seed();
}

// Reuse the id of a profile that already owns local history rows in SQLite.
function userId() {
  const existing = store.get(keys.USER_PROFILE)?.id;
  return typeof existing === "string" && existing.trim() ? existing.trim() : LOCAL_USER_ID;
}

function profile() {
  const settings = store.get(keys.SETTINGS) || {};
  const saved = store.get(PROFILE_KEY) || {};
  return {
    user_id: userId(),
    email: saved.email || settings.email || "local@voiceos.local",
    first_name: saved.first_name ?? settings.firstName ?? "",
    last_name: saved.last_name ?? settings.lastName ?? "",
    default_language: saved.default_language ?? settings.defaultLanguage ?? "en",
    enabled_languages: saved.enabled_languages ?? settings.enabledLanguages ?? ["en"],
    plan_type: "pro",
    subscription_status: "active",
    created_at: saved.created_at || "2025-01-01T00:00:00.000Z",
    updated_at: saved.updated_at || new Date().toISOString(),
  };
}

function updateProfile(patch) {
  const map = { firstName: "first_name", lastName: "last_name", defaultLanguage: "default_language", enabledLanguages: "enabled_languages" };
  const saved = { ...(store.get(PROFILE_KEY) || {}) };
  for (const [k, v] of Object.entries(patch || {})) saved[map[k] || k] = v;
  saved.updated_at = new Date().toISOString();
  store.set(PROFILE_KEY, saved);
  return profile();
}

function seed() {
  const p = profile();
  const auth = store.get(keys.AUTH) || {};
  if (!auth.isSelfHosted || auth.user?.id !== p.user_id || auth.tokens)
    store.set(keys.AUTH, {
      user: { id: p.user_id, provider: "self-hosted", email: p.email, lastSignInAt: new Date().toISOString() },
      tokens: null,
      state: null,
      isSelfHosted: true,
    });
  store.set(keys.ACCESS_TOKEN, LOCAL_ACCESS_TOKEN);
  const existing = store.get(keys.USER_PROFILE) || {};
  store.set(keys.USER_PROFILE, {
    ...existing,
    id: p.user_id,
    email: existing.email || p.email,
    first_name: existing.first_name ?? p.first_name,
    last_name: existing.last_name ?? p.last_name,
  });
}

module.exports = { init, seed, profile, updateProfile };
