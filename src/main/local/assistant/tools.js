"use strict";
// Maps the app's tool declarations (native actions, integrations, MCP
// servers) to names Claude accepts: ^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$.

// Prepended to app tool descriptions to route requests to VoiceOS's own tools.
const NOTES = {
  voiceos_native_action_open_app: "Not for YouTube: to play or watch anything on YouTube use the youtube_play tool instead, which opens the actual video. ",
};

function noteFor(name) {
  if (NOTES[name]) return NOTES[name];
  if (/^applemusic_(play|resume|control|now_playing)/.test(name))
    return "Plays inside VoiceOS, NOT in the Music app. For anything already in the user's library (their playlists, songs, albums, artists) and for controlling what Music is playing, use the music_app tool instead; use this only for catalog songs the user doesn't have. ";
  return "";
}

function buildToolTable(declarations = []) {
  const byName = new Map();
  const list = [];
  for (const decl of declarations) {
    const base = String(decl.name || decl.originalName || "tool")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .replace(/^([^a-zA-Z_])/, "_$1")
      .slice(0, 60);
    let name = base;
    for (let i = 2; byName.has(name); i++) name = base.slice(0, 58) + "_" + i;
    const entry = { name, description: noteFor(decl.originalName || decl.name) + (decl.description || "").slice(0, 4000), schema: normalizeSchema(parseJson(decl.parametersJson)), decl };
    byName.set(name, entry);
    list.push(entry);
  }
  // A stable order keeps Claude's prompt cache valid from turn to turn.
  list.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { list, byName };
}

function normalizeSchema(schema) {
  const s = schema && typeof schema === "object" && !Array.isArray(schema) ? { ...schema } : {};
  delete s.$schema;
  delete s.$id;
  if (s.type !== "object") s.type = "object";
  if (!s.properties || typeof s.properties !== "object") s.properties = {};
  if (Array.isArray(s.required)) s.required = s.required.filter((k) => k in s.properties);
  return s;
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

// Adds a tool VoiceOS answers itself (no round trip through the app).
// `run(args)` resolves to a tool result (see toolBridge.openTurn).
function addLocalTool(table, { name, description, schema, label, run }) {
  const entry = { name, description, schema: normalizeSchema(schema), label: label || name, local: run };
  table.byName.set(name, entry);
  table.list.push(entry);
}

// ------------------------------------------------------------ catalog
// Every tool definition is re-sent (and billed) with every request, and a
// Mac with several connected apps has 70+ of them (~45k tokens). So only
// everyday tools keep their full definitions; the rest are listed one line
// each inside a single `app_tool`, which runs any of them by name. The
// split never changes between requests, so the prompt cache stays valid.

const CORE_SERVERS = new Set(["voiceos_native_actions"]);
const CORE_TOOLS = new Set(["voiceos_create_reminder"]);

function isCore(entry) {
  if (entry.local) return true;
  const d = entry.decl || {};
  return CORE_SERVERS.has(d.mcpServerId) || CORE_TOOLS.has(d.originalName || d.name);
}

// The action's own name ("list_notes", "mail_send"), without VoiceOS prefixes.
const shortName = (entry) =>
  String(entry.decl?.originalName || entry.name)
    .replace(/^custom_mcp_voiceos[a-z]*?_/, "")
    .replace(/^voiceos_/, "");

function signature(key, schema) {
  const props = Object.entries(schema.properties || {});
  const required = new Set(schema.required || []);
  const params = props.slice(0, 7).map(([k, p]) => {
    const values = Array.isArray(p?.enum) && p.enum.length <= 5 ? ":" + p.enum.join("|") : "";
    return k + (required.has(k) ? "" : "?") + values;
  });
  if (props.length > 7) params.push("…");
  return key + "(" + params.join(", ") + ")";
}

function summary(description) {
  const text = String(description || "").replace(/\s+/g, " ").trim();
  const first = text.split(/(?<=[.!?])\s/)[0] || text;
  return first.length > 110 ? first.slice(0, 107) + "…" : first;
}

// Moves non-core tools behind `app_tool`; returns the table with
// `catalog` (short name → entry) for the backend to dispatch.
function withCatalog(table) {
  const catalog = new Map();
  const groups = new Map();
  table.list = table.list.filter((entry) => {
    if (isCore(entry)) return true;
    const group = entry.decl?.mcpServerName || "VoiceOS";
    const tag = group.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10);
    let key = shortName(entry);
    if (catalog.has(key)) key = tag + "_" + key;
    for (let i = 2; catalog.has(key); i++) key = shortName(entry) + "_" + i;
    catalog.set(key, entry);
    if (!groups.has(group)) groups.set(group, []);
    const note = entry.description.startsWith("Plays inside VoiceOS") ? " (plays in VoiceOS, not the Music app)" : "";
    groups.get(group).push(signature(key, entry.schema) + " — " + summary(entry.decl?.description || entry.description) + note);
    table.byName.delete(entry.name);
    return false;
  });
  table.catalog = catalog;
  if (!catalog.size) return table;
  const listing = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, lines]) => group + ":\n" + lines.sort().map((l) => "- " + l).join("\n"))
    .join("\n");
  addLocalTool(table, {
    name: "app_tool",
    label: "Using an app",
    description:
      "Runs one of the user's connected app actions below: name = the action exactly as listed (not the app), arguments = its parameters (? = optional). Example: {\"name\": \"list_notes\", \"arguments\": {\"limit\": 3}}. If unsure of the parameters, call with describe=true first.\n" +
      listing,
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Action name exactly as listed, e.g. list_notes." },
        arguments: { type: "object", description: "The action's arguments." },
        describe: { type: "boolean", description: "Return the action's full description and parameters instead of running it." },
      },
      required: ["name"],
    },
    run: null, // dispatched by the backend (it runs through the app's executor)
  });
  return table;
}

const EMPTY_TOOLS = { list: [], byName: new Map(), catalog: new Map() };

// Closest catalog names to a mistyped one: shared words, or the app's name.
function suggest(catalog, name, n = 5) {
  const lower = String(name).toLowerCase();
  const group = (e) => String(e.decl?.mcpServerName || "").toLowerCase().replace(/[^a-z]/g, "");
  const inGroup = (e) => group(e) && lower.replace(/[^a-z]/g, "").includes(group(e));
  return [...catalog.entries()]
    .map(([k, e]) => [k, k.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && lower.includes(w)).length + (inGroup(e) ? 2 : 0)])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

module.exports = { buildToolTable, addLocalTool, withCatalog, suggest, signature, EMPTY_TOOLS };
