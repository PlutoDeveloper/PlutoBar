"use strict";
// Keeps the app fully self-contained: no request ever reaches the VoiceOS
// cloud (api.voiceos.com), its Supabase project, or the bundled telemetry
// (PostHog, Sentry). A handful of REST endpoints the app still calls are
// answered locally; everything else on those hosts gets a synthetic 503.
//
// Covered: globalThis.fetch, electron.net.fetch / net.request, Node
// http(s).request (used by `ws`), and every Electron session's webRequest
// (renderers, webviews). Provider APIs (Anthropic, OpenAI, Google, Groq) are
// untouched.

const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const { EventEmitter } = require("node:events");

const log = require("./log");
const BLOCKED_HOST_SUFFIXES = [
  "voiceos.com",
  "supabase.co",
  "supabase.in",
  "posthog.com",
  "sentry.io",
  "ingest.sentry.io",
];

let installed = false;
let localRoutes = [];
let blockedCount = 0;

function isBlockedHost(hostname) {
  if (!hostname) return false;
  const h = String(hostname).toLowerCase().replace(/\.$/, "");
  return BLOCKED_HOST_SUFFIXES.some((s) => h === s || h.endsWith("." + s));
}

function urlOf(input) {
  try {
    if (typeof input === "string") return new URL(input);
    if (input instanceof URL) return input;
    if (input && typeof input.url === "string") return new URL(input.url);
  } catch {}
  return null;
}

function noteBlocked(where, url) {
  blockedCount++;
  if (blockedCount <= 25 || blockedCount % 100 === 0)
    log.info("[NetworkGuard] kept local (" + where + "): " + url.hostname + url.pathname + " [#" + blockedCount + "]");
}

function jsonResponse(status, body) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-voiceos-local": "1" },
  });
}

async function readBody(input, init) {
  try {
    const body = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
    if (typeof body === "string") return body ? JSON.parse(body) : {};
    if (body instanceof Uint8Array || Buffer.isBuffer(body)) return JSON.parse(Buffer.from(body).toString("utf8"));
  } catch {}
  return {};
}

async function localFetch(url, input, init) {
  noteBlocked("fetch", url);
  const method = String(init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (url.hostname.endsWith("voiceos.com")) {
    for (const route of localRoutes) {
      if (route.method && route.method !== method) continue;
      if (typeof route.path === "string" ? route.path !== url.pathname : !route.path.test(url.pathname)) continue;
      try {
        const body = method === "GET" || method === "HEAD" ? {} : await readBody(input, init);
        const result = await route.handle({ url, method, body });
        if (result instanceof Response) return result;
        return jsonResponse(result?.status ?? 200, result?.body ?? result);
      } catch (err) {
        return jsonResponse(500, { error: "local_route_failed", message: err?.message || String(err) });
      }
    }
  }
  return jsonResponse(503, {
    error: "local_mode",
    message: "This VoiceOS cloud feature is not available in the self-contained local build.",
  });
}

function wrapFetch(original, where) {
  if (typeof original !== "function" || original.__voiceosGuarded) return original;
  const wrapped = function guardedFetch(input, init) {
    const url = urlOf(input);
    if (url && isBlockedHost(url.hostname)) return localFetch(url, input, init);
    return original.call(this, input, init);
  };
  wrapped.__voiceosGuarded = true;
  wrapped.__guardWhere = where;
  return wrapped;
}

// ----------------------------------------------------- node http(s).request

function failingSocket(host) {
  const socket = new net.Socket();
  process.nextTick(() => {
    const err = new Error("Blocked by VoiceOS local mode: " + host);
    err.code = "ECONNREFUSED";
    socket.destroy(err);
  });
  return socket;
}

function requestTarget(args) {
  const [a, b] = args;
  if (typeof a === "string" || a instanceof URL) {
    const u = urlOf(a);
    return u?.hostname || (b && typeof b === "object" ? b.hostname || b.host : null);
  }
  if (a && typeof a === "object") return a.hostname || (a.host ? String(a.host).split(":")[0] : null);
  return null;
}

function wrapNodeRequest(mod, name) {
  const original = mod[name];
  if (original.__voiceosGuarded) return;
  const wrapped = function guardedRequest(...args) {
    const host = requestTarget(args);
    if (!isBlockedHost(host)) return original.apply(this, args);
    noteBlocked(name === "get" ? "http.get" : "http.request", { hostname: host, pathname: "" });
    const block = { agent: false, createConnection: () => failingSocket(host) };
    if (typeof args[0] === "string" || args[0] instanceof URL) {
      if (args[1] && typeof args[1] === "object" && typeof args[1] !== "function") args[1] = { ...args[1], ...block };
      else args.splice(1, 0, block);
    } else if (args[0] && typeof args[0] === "object") {
      args[0] = { ...args[0], ...block };
    }
    return original.apply(this, args);
  };
  wrapped.__voiceosGuarded = true;
  mod[name] = wrapped;
}

// ------------------------------------------------------ electron net.request

function blockedElectronRequest(host) {
  const req = new EventEmitter();
  const fail = () =>
    process.nextTick(() => {
      const err = new Error("net::ERR_BLOCKED_BY_CLIENT (VoiceOS local mode: " + host + ")");
      req.emit("error", err);
      req.emit("close");
    });
  Object.assign(req, {
    setHeader() {},
    getHeader() {},
    removeHeader() {},
    write() {
      return true;
    },
    end() {
      fail();
    },
    abort() {
      req.emit("abort");
    },
    followRedirect() {},
    getUploadProgress() {
      return { active: false };
    },
  });
  return req;
}

// ---------------------------------------------------------- session guard

function globToRegExp(pattern) {
  if (pattern === "<all_urls>") return /^(https?|wss?|file|ftp):/;
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp("^" + esc + "$");
}

function guardSession(ses) {
  if (!ses || ses.__voiceosGuarded) return;
  ses.__voiceosGuarded = true;
  const webRequest = ses.webRequest;
  const originalOnBeforeRequest = webRequest.onBeforeRequest.bind(webRequest);
  let appListener = null;
  let appPatterns = null;

  const combined = (details, callback) => {
    const url = urlOf(details.url);
    if (url && isBlockedHost(url.hostname)) {
      noteBlocked("renderer", url);
      return callback({ cancel: true });
    }
    if (appListener && (!appPatterns || appPatterns.some((re) => re.test(details.url)))) return appListener(details, callback);
    callback({});
  };

  // Compose with any listener the app itself registers later.
  webRequest.onBeforeRequest = (filterOrListener, maybeListener) => {
    if (typeof filterOrListener === "function" || filterOrListener === null) {
      appListener = filterOrListener;
      appPatterns = null;
    } else {
      appListener = maybeListener || null;
      appPatterns = filterOrListener?.urls?.length ? filterOrListener.urls.map(globToRegExp) : null;
    }
  };
  originalOnBeforeRequest({ urls: ["<all_urls>"] }, combined);
}

// ------------------------------------------------------------------ install

function installNetworkGuard({ electron, routes = [] } = {}) {
  localRoutes = routes;
  if (installed) return;
  installed = true;

  globalThis.fetch = wrapFetch(globalThis.fetch, "global");
  for (const mod of [http, https]) {
    wrapNodeRequest(mod, "request");
    wrapNodeRequest(mod, "get");
  }

  if (electron?.net) {
    try {
      const netModule = electron.net;
      const originalNetFetch = netModule.fetch?.bind(netModule);
      if (originalNetFetch) netModule.fetch = wrapFetch(originalNetFetch, "electron.net");
      const originalNetRequest = netModule.request?.bind(netModule);
      if (originalNetRequest)
        netModule.request = (options) => {
          const url = urlOf(typeof options === "string" ? options : options?.url);
          const host = url?.hostname || options?.hostname || options?.host;
          if (isBlockedHost(host)) {
            noteBlocked("electron.net.request", { hostname: host, pathname: url?.pathname || "" });
            return blockedElectronRequest(host);
          }
          return originalNetRequest(options);
        };
    } catch (err) {
      log.warn("[NetworkGuard] Could not wrap electron.net:", err?.message);
    }
  }

  if (electron?.app) {
    electron.app.on("session-created", guardSession);
    electron.app.whenReady().then(() => guardSession(electron.session.defaultSession));
  }
  log.info("[NetworkGuard] Installed — VoiceOS cloud, Supabase and telemetry hosts are kept local.");
}

function setLocalRoutes(routes) {
  localRoutes = routes;
}

module.exports = { installNetworkGuard, setLocalRoutes, isBlockedHost };
