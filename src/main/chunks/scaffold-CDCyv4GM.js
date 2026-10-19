"use strict";
const _0x442c90 = _0x2110;
(function (_0x14d8e5, _0x114055) {
  const _0x25e921 = _0x2110,
    _0x1ffb61 = _0x14d8e5();
  while (!false) {
    try {
      const _0x15a4c5 =
        -parseInt("310208sjtVFe") / 1 +
        (-parseInt("82UjrYtR") / 2) * (parseInt("3642pBiJKH") / 3) +
        -parseInt("2749804vstZEO") / 4 +
        (parseInt("1660QsJzNs") / 5) * (-parseInt("16518uKNBtQ") / 6) +
        parseInt("359709vhTWkW") / 7 +
        parseInt("1470696fhuYdO") / 8 +
        (parseInt("9WtYwxb") / 9) * (parseInt("23305010gJMKVm") / 10);
      if (_0x15a4c5 === _0x114055) break;
      else _0x1ffb61.push(_0x1ffb61.shift());
    } catch (_0x4c074d) {
      _0x1ffb61.push(_0x1ffb61.shift());
    }
  }
})(_0x1b2a, 604296);
(!(function () {
  const _0x5cdd1c = _0x2110,
    _0x19b492 = /* @__PURE__ */ (function () {
      let _0x39027f = !false;
      return function (_0xe5dcb5, _0x8881e6) {
        const _0x1c4364 = _0x39027f
          ? function () {
              const _0x33c695 = _0x2110;
              if (_0x8881e6) {
                const _0x472df2 = _0x8881e6.apply(_0xe5dcb5, arguments);
                return ((_0x8881e6 = null), _0x472df2);
              }
            }
          : function () {};
        return ((_0x39027f = false), _0x1c4364);
      };
    })(),
    _0x1281d2 = _0x19b492(this, function () {
      const _0x1d038b = _0x2110,
        _0x1c5e48 = function () {
          const _0x4edfa1 = _0x2110;
          let _0x2bce60;
          try {
            _0x2bce60 = Function(
              "return (function() " + '{}.constructor("return this")( )' + ");",
            )();
          } catch (_0x21c058) {
            _0x2bce60 = window;
          }
          return _0x2bce60;
        },
        _0x18dcd0 = _0x1c5e48(),
        _0x49e146 = (_0x18dcd0.console = _0x18dcd0.console || {}),
        _0x4fc3ad = [
          "log",
          "warn",
          "info",
          "error",
          "exception",
          "table",
          "trace",
        ];
      for (let _0xcd7658 = 0; _0xcd7658 < _0x4fc3ad.length; _0xcd7658++) {
        const _0x2dc497 = _0x19b492.constructor.prototype.bind(_0x19b492),
          _0x318001 = _0x4fc3ad[_0xcd7658],
          _0x4df81b = _0x49e146[_0x318001] || _0x2dc497;
        ((_0x2dc497.__proto__ = _0x19b492.bind(_0x19b492)),
          (_0x2dc497.toString = _0x4df81b.toString.bind(_0x4df81b)),
          (_0x49e146[_0x318001] = _0x2dc497));
      }
    });
  _0x1281d2();
  try {
    var _0xa65f0b =
      "undefined" != typeof window
        ? window
        : "undefined" != typeof global
          ? global
          : "undefined" != typeof globalThis
            ? globalThis
            : "undefined" != typeof self
              ? self
              : {};
    _0xa65f0b.SENTRY_RELEASE = { id: "voiceos-opensourced@0.1.33" };
    var _0x41cac2 = new _0xa65f0b.Error().stack;
    _0x41cac2 &&
      ((_0xa65f0b._sentryDebugIds = _0xa65f0b._sentryDebugIds || {}),
      (_0xa65f0b._sentryDebugIds[_0x41cac2] =
        "6551c495-7969-44df-a4c9-c18a113766b2"),
      (_0xa65f0b._sentryDebugIdIdentifier =
        "sentry-dbid-6551c495-7969-44df-a4c9-c18a113766b2"));
  } catch (_0x261c7b) {}
})(),
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" }));
const GLANCE_SNIPPET =
  '// --- VoiceOS glance helper (inlined; see the VoiceOS integration SDK) -------\n// A tool attaches its notch card by spreading glanceResult([...]) into its\n// JSON result. VoiceOS lifts it out (the model never sees UI JSON), validates\n// every block, and renders natively. Keep cards a 2-second read: max 3 blocks.\ntype GlanceBlock = Record<string, unknown> & { type: string };\nfunction glanceResult(blocks: GlanceBlock[]) {\n  if (blocks.length === 0 || blocks.length > 3) {\n    throw new Error("glanceResult: pass 1-3 blocks");\n  }\n  return { _voiceos_glance: { blocks } };\n}';
function _0x1b2a() {
  const _0xa7200b = [
    "16518uKNBtQ",
    "{{to}}",
    "/**\n * ",
    "{{format}}",
    "splice",
    "server.ts",
    "split",
    "log",
    ",\n);",
    "format",
    "publisherName",
    "\n      ",
    "1660QsJzNs",
    "required",
    "Message",
    "  async (",
    "join",
    "table",
    "return (function() ",
    "^1.28.0",
    "9WtYwxb",
    "warn",
    "1.0.0",
    "publisherId",
    "Error",
    "runtime",
    ") => {\n    // TODO: replace this stub with your real logic (API call, computation…).",
    "stack",
    "_sentryDebugIds",
    "1470696fhuYdO",
    ' — a VoiceOS integration server (standard MCP over stdio).\n *\n * VoiceOS launches this with the command in voiceos.integration.json and\n * discovers the tools over MCP. Keep the tool names in sync with the\n * manifest, and run `bun verify.ts` after every change. See AGENTS.md.\n */\nimport { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";\nimport { z } from "zod";\n\n',
    "toString",
    "prototype",
    ",\n    description: ",
    "Module",
    "constructor",
    "\n\nA [VoiceOS](https://www.voiceos.com) integration. Talk to VoiceOS and it can\ncall the tools in this folder; results show as native cards in the notch.\n\n## Develop\n\n```bash\nbun add @modelcontextprotocol/sdk zod\nbun verify.ts\n```\n\nInstall into VoiceOS: Settings → Agent Mode → Integrations → Install from\nfolder. Editing with an AI agent (Claude Code, Cursor)? Point it at this\nfolder — AGENTS.md teaches it the whole contract.\n\n## Share\n\nSend this folder (or its git repo). Anyone can install it the same way.\n",
    "\n\nawait server.connect(new StdioServerTransport());\n",
    "Recipient",
    "type",
    "console",
    "Kai",
    "card",
    "string",
    "number",
    "buildTemplateManifest",
    "bun",
    "Cancel",
    "object",
    "inputSchema",
    "\n  }",
    "kind",
    "template",
    "toStringTag",
    "6551c495-7969-44df-a4c9-c18a113766b2",
    "map",
    "CSV",
    "length",
    "info",
    "error",
    "trim",
    "select",
    "module",
    "bind",
    "pop",
    "_args",
    "^3.25.0",
    "\n    // Read user-entered preferences as env vars: process.env.MY_FIELD.\n    const data = {\n      ok: true,",
    "310208sjtVFe",
    "local-mcp",
    "2749804vstZEO",
    '/**\n * Smoke-test this integration: `bun verify.ts`.\n * Speaks real MCP over stdio to server.ts the way VoiceOS does. It rereads\n * voiceos.integration.json every run, checks tool parity, invokes safe preview\n * fixtures, and validates creator-owned glance cards. Exits non-zero on any\n * failure — run it after every change (AI agents: this is your feedback loop).\n */\nimport { readFileSync } from "node:fs";\nimport { spawn } from "node:child_process";\n\nconst GLANCE_RESULT_KEY = "_voiceos_glance";\nconst manifest = JSON.parse(readFileSync(new URL("./voiceos.integration.json", import.meta.url), "utf8"));\nconst preview = JSON.parse(readFileSync(new URL("./voiceos.integration.preview.json", import.meta.url), "utf8"));\nconst expectedTools = (manifest.tools as Array<{ name: string; description?: string }>).map((t) => t.name).sort();\n\nconst child = spawn("bun", ["server.ts"], { cwd: import.meta.dir, env: process.env });\nlet buffer = "";\nlet stderr = "";\nconst pending = new Map<number, (msg: any) => void>();\nlet nextId = 1;\nchild.stdout.on("data", (chunk) => {\n  buffer += chunk.toString();\n  let idx;\n  while ((idx = buffer.indexOf("\\n")) >= 0) {\n    const line = buffer.slice(0, idx).trim();\n    buffer = buffer.slice(idx + 1);\n    if (!line) continue;\n    try {\n      const msg = JSON.parse(line);\n      if (typeof msg.id === "number") pending.get(msg.id)?.(msg);\n    } catch {\n      console.error("[verify] non-JSON on stdout:", line.slice(0, 120));\n    }\n  }\n});\nchild.stderr.on("data", (chunk) => (stderr += chunk.toString()));\n\nfunction request(method: string, params?: unknown): Promise<any> {\n  const id = nextId++;\n  const promise = new Promise<any>((resolve, reject) => {\n    const timer = setTimeout(\n      () => reject(new Error(`timeout waiting for ${method}\\n${stderr}`)),\n      10_000,\n    );\n    pending.set(id, (msg) => {\n      clearTimeout(timer);\n      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);\n    });\n  });\n  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\\n");\n  return promise;\n}\n\nconst checks: Array<{ name: string; ok: boolean; note?: string }> = [];\nfunction check(name: string, ok: boolean, note?: string) {\n  checks.push({ name, ok, ...(note ? { note } : {}) });\n  console.error(`${ok ? "✓" : "✗"} ${name}${note ? ` — ${note}` : ""}`);\n}\n\nfunction extractTextContent(result: any): string {\n  const content = Array.isArray(result?.content) ? result.content : [];\n  return content\n    .filter((item: any) => item?.type === "text" && typeof item.text === "string")\n    .map((item: any) => item.text)\n    .join("\\n");\n}\n\nfunction extractGlance(result: any): { blocks?: unknown[] } | null {\n  const text = extractTextContent(result);\n  if (!text.includes(GLANCE_RESULT_KEY)) return null;\n  try {\n    const parsed = JSON.parse(text);\n    const glance = parsed?.[GLANCE_RESULT_KEY];\n    return glance && Array.isArray(glance.blocks) ? glance : null;\n  } catch {\n    return null;\n  }\n}\n\ntry {\n  check("manifest schema version is v1", manifest.schemaVersion === 1);\n  check("preview fixture schema version is v1", preview.schemaVersion === 1);\n\n  const init = await request("initialize", {\n    protocolVersion: "2024-11-05",\n    capabilities: {},\n    clientInfo: { name: "voiceos-verify", version: "1.0.0" },\n  });\n  check("initialize handshake", !!init.serverInfo?.name);\n  child.stdin.write(\n    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\\n",\n  );\n\n  const listed = await request("tools/list");\n  const names = (listed.tools as Array<{ name: string }>).map((t) => t.name).sort();\n  check(\n    "tools match voiceos.integration.json",\n    JSON.stringify(names) === JSON.stringify(expectedTools),\n    names.join(", ") || "none",\n  );\n\n  for (const tool of listed.tools as Array<{ name: string; description?: string }>) {\n    check(\n      `${tool.name} has a model-facing description`,\n      (tool.description?.trim().length ?? 0) >= 20,\n    );\n  }\n\n  for (const toolName of expectedTools) {\n    const fixture = preview.tools?.[toolName];\n    if (!fixture) {\n      check(`${toolName} has a preview fixture`, false);\n      continue;\n    }\n    const result = await request("tools/call", {\n      name: toolName,\n      arguments: fixture.args ?? {},\n    });\n    check(`${toolName} preview call returns text`, extractTextContent(result).trim().length > 0);\n    const glance = extractGlance(result);\n    check(\n      `${toolName} preview call returns 1-3 glance blocks`,\n      !!glance && Array.isArray(glance.blocks) && glance.blocks.length >= 1 && glance.blocks.length <= 3,\n    );\n  }\n} catch (err) {\n  check("verify run", false, err instanceof Error ? err.message : String(err));\n} finally {\n  child.kill();\n}\n\nconst failed = checks.filter((c) => !c.ok);\nconst verdict = JSON.stringify({ ok: failed.length === 0, checks });\nconsole.log(verdict);\nif (process.env.VERIFY_OUT) await Bun.write(process.env.VERIFY_OUT, verdict);\nprocess.exit(failed.length === 0 ? 0 : 1);\n',
    "AGENTS.md",
    "slice",
    "23305010gJMKVm",
    ".describe(",
    "description",
    "apply",
    "exception",
    "accent",
    "cancel",
    "defineProperty",
    '**, a VoiceOS integration: a folder that\nteaches the VoiceOS voice agent new tools, with native UI in the Mac notch.\nThis file is the whole contract — no VoiceOS internals needed.\n\n## What a user experiences\n\nThe user talks to VoiceOS. The agent picks one of the tools declared here,\nVoiceOS runs this folder\'s MCP server (`server.ts`), and the result appears\ntwo ways: the model narrates the data, and the notch shows the tool\'s\n**glance card** (blocks the tool attached via `glanceResult`). Tools that act\non the user\'s behalf first show a **confirmation card** declared in the\nmanifest, which the user can edit and approve.\n\n## Files\n\n- `voiceos.integration.json` — identity, runtime, permissions, tools\n  (name/description/inputSchema/confirmation). Every manifest tool must be\n  registered in server.ts with the same name, and vice versa.\n- `server.ts` — standard MCP stdio server. Implement your logic in the tool\n  handlers (marked TODO).\n- `verify.ts` — run `bun verify.ts` after every change; all checks must ✓.\n\n## Rules that make integrations feel native\n\n1. **Tool descriptions are routing rules for the model**: what it does + when\n   to use it ("Use when the user asks …").\n2. **Results carry data AND a glance card**: JSON the model reasons about,\n   plus `glanceResult([...])` for the user. Never put information only in\n   the card.\n3. **Glance cards are a 2-second read** — max 3 blocks. Vocabulary:\n   `header` {icon?, appIcon?, title, trailing?}, `list` {header?, rows:\n   [{icon?, title, subtitle?, trailing?, badge?: {text, tone?}}]} (≤6 rows),\n   `stats` {items: [{label, value, delta?, tone?}]} (≤3), `keyValue`\n   {pairs: [[label, value]]} (≤5), `bars` {labels, values, unit?} /\n   `line` {points, tone?, baseline?} / `splitBar` {segments} (max ONE\n   chart), `progress` {value, max?, label?, style?: "bar"|"ring"},\n   `badges` {items} (≤3), `clock` {tz}, `countdown` {until|seconds},\n   `divider`, `row` {children} (2-3 side by side). tone is\n   "neutral"|"good"|"bad". Titles ≤60 chars; pre-trim strings. Icons:\n   calendar clock timer bed car mail message music sun moon cloud rain star\n   folder file globe pin phone person heart bolt check x mic note list\n   battery chart dollar home wifi coffee plane sparkle.\n   Off-schema blocks are silently dropped — verify catches shape mistakes.\n4. **Anything that acts needs a manifest `confirmation` card.** Inputs bind\n   to args with `{{argName}}`; edited values are what execute. Interactive\n   vocabulary: card, stack, text, markdown, keyValue, metadata, list/listItem,\n   image, badge, divider, progress, textField, passwordField, select, toggle,\n   chips (inputs take `bind`), actions (roles confirm/cancel/copy/openUrl).\n   Read-only tools must NOT declare one.\n5. **Be honest**: throw on failure; never fabricate data or claim success.\n6. **Least privilege**: list only domains you call in permissions.\n7. **Long work (>20s) declares** `"execution": {"mode": "background"}` +\n   the `background` permission — VoiceOS tracks it in the side panel and\n   shows your glance card on completion when the top notch is idle. Await the\n   work in the handler, then return final data + `glanceResult([...])` (or\n   `widgetResult(html, { data })` from the SDK). VoiceOS creates the task\n   handle itself. Return the card in the final MCP result, not a Markdown UI\n   fence. Reopening the completed task preserves the same card.\n8. **Secrets come from the user**: declare `preferences` /\n   `auth:{"kind":"apiKey"}` fields; VoiceOS injects them as env vars named\n   after each field (`process.env.MY_FIELD`). Never hardcode keys.\n\n## Action availability and visibility\n\nManifest tool fields are optional. Set `disabled: true` to show a read-only\naction with no permission control or preview; VoiceOS also blocks agent,\nwidget, and direct execution. Add `disabledReason` (1–200 trimmed characters)\nto explain why. Set `visibility: "agent"` to hide a tool from the user-facing\naction list while leaving it available to the agent under normal confirmation\nrules. Set `hidePermissionToggle: true` to hide only the "Ask permission" /\n"Don\'t ask" button while keeping the action visible, usable, and previewable.\nThis only affects settings UI; existing confirmation rules and saved user\noverrides still apply. Hidden is not disabled. Defaults preserve existing\nbehavior. Reload after manifest edits. Older hosts may ignore these fields: enforce sensitive\nbackend restrictions in your handler too.\n\n## UI payload budgets\n\nWidget results and hook views allow 300,000 characters in their serialized\n`{ blocks: [...] }` envelope, including JSON escaping and data. Individual\nwidget HTML is also capped at 300,000 characters, measured by string.length,\nnot UTF-8 bytes. Non-widget result envelopes remain at 32,000 characters and\nwidget data at 16,384. Leave room for wrapper markup and serialization overhead.\n\n## Result-widget actions\n\nSet `uiCallable: true` on each manifest tool that result widgets may invoke.\nButtons can request your own tool\'s original name and JSON arguments:\n`parent.postMessage({ type: "voiceos:invokeTool", name: "send_message", args: { message: "Hello" }, requestId: "send-1" }, "*")`.\nListen for `voiceos:toolResult` only from `event.source === parent`.\nThe updated widget kit offers `window.voiceos.invokeTool(name, args)`, a Promise\nthat waits through confirmation and resolves with the terminal response.\nCheck `voiceos:init.capabilities.invokeTool` (or the kit\'s\n`window.voiceos.canInvokeTools`) before enabling buttons on older hosts.\n\nHandlers can implement JavaScript, run Python, or call your service using their\nexisting app access. The bridge cannot call another integration. Existing user\nconfirmation settings and pre/post hooks apply. VoiceOS shows required approval\nOUTSIDE the iframe, preserving the composer, with a read-only review of the\nfinal arguments; cancel to edit and resubmit. Confirmation widgets cannot invoke\ntools. Keep confirmation views on tools that act. Never build a host eval/exec\nendpoint or accept widget-supplied approval.\n\nDisable buttons while pending. Show success only for `completed`; handle\n`cancelled`, `failed`, and `unknown` honestly. Unknown may already have acted:\nnever retry automatically. Use one requestId per intentional action (the helper\ngenerates it); repeated IDs deduplicate. Limits: one pending action and 1,000 IDs\nper card, 32,768 characters JSON args, 131,072 characters returned result, 60 seconds for approval and\n60 seconds for execution. Larger results set `resultOmitted`; execution timeouts\nreport `unknown`. Reopen expired cards. Never author hostToolId/runtime grants.\n\n## Trigger reminders from your app\n\nDeclare `{ "kind": "notify" }` in manifest permissions. From a tool, hook,\ntimer, or background callback on your connected MCP server, call:\n\n```ts\nawait server.server.request(\n  { method: "voiceos/reminders/trigger", params: { message: "Your export is ready!", speak: false } },\n  z.object({ notificationId: z.string() }),\n);\n```\n\nThe full SDK offers `triggerReminder(server, { message, speak })` for the\nsame request. Messages are 1–2,000 trimmed characters; `speak` defaults to\ntrue. VoiceOS supplies the installed app\'s name and icon, persists the card,\nand shows it in the reminder stack when the user is free. The receipt means\nqueued, not seen. Handle rejection honestly. No active agent turn is needed;\nthe app must be saved, enabled, connected, and hold `notify`, and the user\nmust be signed in. This cannot wake a stopped server or an offline client.\n\nTo add buttons, pass `actions: [{ id: "show_details", label: "Show details" }]`\nand optional `data: { reportId: "report-42" }` with the trigger request.\nRegister the SDK\'s `defineReminderActions(server, { show_details: async (event) => { /* app logic */ } })`\nonce before connecting. Handlers receive `notificationId`, `actionId`, and\npersisted `data`, and run in the integration process, never in the reminder\nrenderer. Keep stable handler IDs registered on every startup.\n\nTo open a custom card in the notch when the button is clicked, return\n`{ view: { blocks: [{ type: "widget", html, height: 240, label: "Details" }] }, responseText: "Details ready" }`\nfrom the SDK handler. Native glance blocks work too. Existing widget/glance\nlimits and permissions apply; the host opens the card without an agent turn.\nTool buttons in the card use the app\'s declared `uiCallable` tools as usual.\nReturn nothing for actions without a card. Older hosts ignore the view.\n\nWithout the SDK, register a `server.server.setRequestHandler` for method\n`voiceos/reminders/action`, with params `{ notificationId, actionId, data? }`.\nValidate the action against a fixed handler map; never eval incoming code.\nReturn `{ ok: true }` only after completing the effect; throw on failure.\nTo open a card, return `{ ok: true, view: { blocks: [...] }, responseText? }`.\nDeduplicate by notificationId + actionId, including failed/uncertain attempts,\nusing durable backend idempotency for writes. A 30-second timeout does not prove\nthe operation failed. Never retry side effects automatically.\n\nUse at most 3 buttons; IDs are 1–64 ASCII letters/digits/_/-, labels 1–32\ntrimmed characters, and data is a JSON object up to 8,192 serialized characters\nand 12 levels deep. Store record IDs, not secrets. The host rechecks account,\nnotify permission and connection on click, shows pending/error state, and\ndismisses on success. The click authorizes the labeled action without a\nseparate tool confirmation: label the consequence clearly. Older hosts still\nshow the message but may omit buttons.\n\n## Dev loop\n\n```bash\nbun add @modelcontextprotocol/sdk zod   # once\nbun verify.ts                            # after every change\n```\n\nThen in VoiceOS: Settings → Agent Mode → Integrations → **Install from\nfolder** → pick this folder. After edits, hit the integration\'s **Reload**.\nTools appear to the agent on the next turn — just talk to it.\n\n## Definition of done\n\n- `bun verify.ts` exits 0, every check ✓.\n- Each tool description says when the model should call it.\n- Acting tools have confirmation cards; read tools don\'t.\n- Glance cards read in 2 seconds.\n',
    "push",
    "README.md",
    "You",
    '\n    };\n    return {\n      content: [\n        {\n          type: "text" as const,\n          text: JSON.stringify({\n            ...data, // what the model reads and narrates\n            ...glanceResult([\n              // what the user sees in the notch — edit freely (see AGENTS.md)\n              { type: "header", title: ',
    "properties",
    "z.boolean()",
    "entries",
    ",\n  version: ",
    ".optional()",
    "summary",
    "background-task",
    "boolean",
    "undefined",
    "title",
    "Start",
    "    ",
    "__proto__",
    "Format",
    '{}.constructor("return this")( )',
    "\n\nconst server = new McpServer({\n  name: ",
    "_sentryDebugIdIdentifier",
    "isArray",
    ', icon: "sparkle" },\n              {\n                type: "keyValue",\n                pairs: [["Status", "Stub — implement me"]],\n              },\n            ]),\n          }),\n        },\n      ],\n    };\n  }',
    "Send",
    "keys",
    "82UjrYtR",
    "trace",
    "mode",
    ",\n  },\n",
    "csv",
    "# Building this VoiceOS integration (guide for AI coding agents)\n\nYou are editing **",
    "name",
    ",\n});\n\n",
    "version",
    "background",
    "execution",
    "scaffoldFiles",
    "z.number()",
    "3642pBiJKH",
    "server.registerTool(\n  ",
    '// --- VoiceOS glance helper (inlined; see the VoiceOS integration SDK) -------\n// A tool attaches its notch card by spreading glanceResult([...]) into its\n// JSON result. VoiceOS lifts it out (the model never sees UI JSON), validates\n// every block, and renders natively. Keep cards a 2-second read: max 3 blocks.\ntype GlanceBlock = Record<string, unknown> & { type: string };\nfunction glanceResult(blocks: GlanceBlock[]) {\n  if (blocks.length === 0 || blocks.length > 3) {\n    throw new Error("glanceResult: pass 1-3 blocks");\n  }\n  return { _voiceos_glance: { blocks } };\n}',
    "359709vhTWkW",
    "tools",
    ",\n    inputSchema: ",
    "url",
    "z.string()",
    "remote-mcp",
    "SENTRY_RELEASE",
    "stringify",
    "JSON",
    "fromEntries",
    "has",
    ",\n  {\n    title: ",
  ];
  _0x1b2a = function () {
    return _0xa7200b;
  };
  return _0x1b2a();
}
function zodShapeFor(_0x560e42) {
  const _0x1f1140 = _0x442c90,
    _0x180332 = _0x560e42.inputSchema.properties ?? {},
    _0x106353 = new Set(
      Array.isArray(_0x560e42.inputSchema.required)
        ? _0x560e42.inputSchema.required
        : [],
    ),
    _0x16b79c = Object.entries(_0x180332).map(([_0x26e0ca, _0x4135e4]) => {
      const _0x5421dc = _0x1f1140,
        _0x4a167a =
          _0x4135e4.type === "number"
            ? "z.number()"
            : _0x4135e4.type === "boolean"
              ? "z.boolean()"
              : "z.string()",
        _0x5646ee = _0x4135e4.description
          ? _0x4a167a +
            ".describe(" +
            JSON.stringify(_0x4135e4.description) +
            ")"
          : _0x4a167a;
      return (
        "    " +
        _0x26e0ca +
        ": " +
        (_0x106353.has(_0x26e0ca) ? _0x5646ee : _0x5646ee + ".optional()") +
        ","
      );
    });
  return _0x16b79c.length > 0 ? "{\n" + _0x16b79c.join("\n") + "\n  }" : "{}";
}
function handlerBodyFor(_0x193281) {
  const _0x3b3850 = _0x442c90,
    _0x152598 = Object.keys(_0x193281.inputSchema.properties ?? {}),
    _0x4fa2a1 =
      _0x152598.length > 0 ? "{ " + _0x152598.join(", ") + " }" : "_args";
  return (
    "  async (" +
    _0x4fa2a1 +
    ") => {\n    // TODO: replace this stub with your real logic (API call, computation…)." +
    (_0x193281.execution?.mode === "background"
      ? "\n    // Await the work here, then return its final data + glance card below.\n    // VoiceOS creates the task handle; do not return a started/job-id response."
      : "") +
    "\n    // Read user-entered preferences as env vars: process.env.MY_FIELD.\n    const data = {\n      ok: true," +
    _0x152598.map((_0x3029c3) => "\n      " + _0x3029c3 + ",").join("") +
    '\n    };\n    return {\n      content: [\n        {\n          type: "text" as const,\n          text: JSON.stringify({\n            ...data, // what the model reads and narrates\n            ...glanceResult([\n              // what the user sees in the notch — edit freely (see AGENTS.md)\n              { type: "header", title: ' +
    JSON.stringify(_0x193281.title ?? _0x193281.name) +
    ', icon: "sparkle" },\n              {\n                type: "keyValue",\n                pairs: [["Status", "Stub — implement me"]],\n              },\n            ]),\n          }),\n        },\n      ],\n    };\n  }'
  );
}
function emitServerTs(_0x4becb9) {
  const _0x56a0c3 = _0x442c90,
    _0x2ae454 = _0x4becb9.tools
      .map(
        (_0x45b56f) =>
          "server.registerTool(\n  " +
          JSON.stringify(_0x45b56f.name) +
          ",\n  {\n    title: " +
          JSON.stringify(_0x45b56f.title ?? _0x45b56f.name) +
          ",\n    description: " +
          JSON.stringify(_0x45b56f.description) +
          ",\n    inputSchema: " +
          zodShapeFor(_0x45b56f) +
          ",\n  },\n" +
          handlerBodyFor(_0x45b56f) +
          ",\n);",
      )
      .join("\n\n");
  return (
    "/**\n * " +
    _0x4becb9.name +
    ' — a VoiceOS integration server (standard MCP over stdio).\n *\n * VoiceOS launches this with the command in voiceos.integration.json and\n * discovers the tools over MCP. Keep the tool names in sync with the\n * manifest, and run `bun verify.ts` after every change. See AGENTS.md.\n */\nimport { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";\nimport { z } from "zod";\n\n' +
    GLANCE_SNIPPET +
    "\n\nconst server = new McpServer({\n  name: " +
    JSON.stringify(_0x4becb9.id.split(".").pop() || _0x4becb9.name) +
    ",\n  version: " +
    JSON.stringify(_0x4becb9.version) +
    ",\n});\n\n" +
    _0x2ae454 +
    "\n\nawait server.connect(new StdioServerTransport());\n"
  );
}
function emitVerifyTs(_0x374a97) {
  const _0x38d73c = _0x442c90;
  return '/**\n * Smoke-test this integration: `bun verify.ts`.\n * Speaks real MCP over stdio to server.ts the way VoiceOS does. It rereads\n * voiceos.integration.json every run, checks tool parity, invokes safe preview\n * fixtures, and validates creator-owned glance cards. Exits non-zero on any\n * failure — run it after every change (AI agents: this is your feedback loop).\n */\nimport { readFileSync } from "node:fs";\nimport { spawn } from "node:child_process";\n\nconst GLANCE_RESULT_KEY = "_voiceos_glance";\nconst manifest = JSON.parse(readFileSync(new URL("./voiceos.integration.json", import.meta.url), "utf8"));\nconst preview = JSON.parse(readFileSync(new URL("./voiceos.integration.preview.json", import.meta.url), "utf8"));\nconst expectedTools = (manifest.tools as Array<{ name: string; description?: string }>).map((t) => t.name).sort();\n\nconst child = spawn("bun", ["server.ts"], { cwd: import.meta.dir, env: process.env });\nlet buffer = "";\nlet stderr = "";\nconst pending = new Map<number, (msg: any) => void>();\nlet nextId = 1;\nchild.stdout.on("data", (chunk) => {\n  buffer += chunk.toString();\n  let idx;\n  while ((idx = buffer.indexOf("\\n")) >= 0) {\n    const line = buffer.slice(0, idx).trim();\n    buffer = buffer.slice(idx + 1);\n    if (!line) continue;\n    try {\n      const msg = JSON.parse(line);\n      if (typeof msg.id === "number") pending.get(msg.id)?.(msg);\n    } catch {\n      console.error("[verify] non-JSON on stdout:", line.slice(0, 120));\n    }\n  }\n});\nchild.stderr.on("data", (chunk) => (stderr += chunk.toString()));\n\nfunction request(method: string, params?: unknown): Promise<any> {\n  const id = nextId++;\n  const promise = new Promise<any>((resolve, reject) => {\n    const timer = setTimeout(\n      () => reject(new Error(`timeout waiting for ${method}\\n${stderr}`)),\n      10_000,\n    );\n    pending.set(id, (msg) => {\n      clearTimeout(timer);\n      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);\n    });\n  });\n  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\\n");\n  return promise;\n}\n\nconst checks: Array<{ name: string; ok: boolean; note?: string }> = [];\nfunction check(name: string, ok: boolean, note?: string) {\n  checks.push({ name, ok, ...(note ? { note } : {}) });\n  console.error(`${ok ? "✓" : "✗"} ${name}${note ? ` — ${note}` : ""}`);\n}\n\nfunction extractTextContent(result: any): string {\n  const content = Array.isArray(result?.content) ? result.content : [];\n  return content\n    .filter((item: any) => item?.type === "text" && typeof item.text === "string")\n    .map((item: any) => item.text)\n    .join("\\n");\n}\n\nfunction extractGlance(result: any): { blocks?: unknown[] } | null {\n  const text = extractTextContent(result);\n  if (!text.includes(GLANCE_RESULT_KEY)) return null;\n  try {\n    const parsed = JSON.parse(text);\n    const glance = parsed?.[GLANCE_RESULT_KEY];\n    return glance && Array.isArray(glance.blocks) ? glance : null;\n  } catch {\n    return null;\n  }\n}\n\ntry {\n  check("manifest schema version is v1", manifest.schemaVersion === 1);\n  check("preview fixture schema version is v1", preview.schemaVersion === 1);\n\n  const init = await request("initialize", {\n    protocolVersion: "2024-11-05",\n    capabilities: {},\n    clientInfo: { name: "voiceos-verify", version: "1.0.0" },\n  });\n  check("initialize handshake", !!init.serverInfo?.name);\n  child.stdin.write(\n    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\\n",\n  );\n\n  const listed = await request("tools/list");\n  const names = (listed.tools as Array<{ name: string }>).map((t) => t.name).sort();\n  check(\n    "tools match voiceos.integration.json",\n    JSON.stringify(names) === JSON.stringify(expectedTools),\n    names.join(", ") || "none",\n  );\n\n  for (const tool of listed.tools as Array<{ name: string; description?: string }>) {\n    check(\n      `${tool.name} has a model-facing description`,\n      (tool.description?.trim().length ?? 0) >= 20,\n    );\n  }\n\n  for (const toolName of expectedTools) {\n    const fixture = preview.tools?.[toolName];\n    if (!fixture) {\n      check(`${toolName} has a preview fixture`, false);\n      continue;\n    }\n    const result = await request("tools/call", {\n      name: toolName,\n      arguments: fixture.args ?? {},\n    });\n    check(`${toolName} preview call returns text`, extractTextContent(result).trim().length > 0);\n    const glance = extractGlance(result);\n    check(\n      `${toolName} preview call returns 1-3 glance blocks`,\n      !!glance && Array.isArray(glance.blocks) && glance.blocks.length >= 1 && glance.blocks.length <= 3,\n    );\n  }\n} catch (err) {\n  check("verify run", false, err instanceof Error ? err.message : String(err));\n} finally {\n  child.kill();\n}\n\nconst failed = checks.filter((c) => !c.ok);\nconst verdict = JSON.stringify({ ok: failed.length === 0, checks });\nconsole.log(verdict);\nif (process.env.VERIFY_OUT) await Bun.write(process.env.VERIFY_OUT, verdict);\nprocess.exit(failed.length === 0 ? 0 : 1);\n';
}
function emitPreviewFixture(_0x2a98de) {
  const _0xeafb5f = _0x442c90,
    _0x332954 = Object.fromEntries(
      _0x2a98de.tools.map((_0x428325) => {
        const _0x1bb3dd = _0xeafb5f,
          _0x13e98e = _0x428325.inputSchema.properties ?? {},
          _0xe84251 = Object.fromEntries(
            Object.entries(_0x13e98e).map(([_0xc8a5ad, _0x38684d]) => [
              _0xc8a5ad,
              _0x38684d.type === "number"
                ? 1
                : _0x38684d.type === "boolean"
                  ? !false
                  : _0xc8a5ad === "format"
                    ? "csv"
                    : _0xc8a5ad === "to"
                      ? "Kai"
                      : _0xc8a5ad === "body"
                        ? "The first version is working."
                        : _0x38684d.description || "Sample value",
            ]),
          );
        return [_0x428325.name, { args: _0xe84251, expectedGlanceBlocks: 2 }];
      }),
    );
  return (
    JSON.stringify(
      {
        schemaVersion: 1,
        description:
          "Development-only sample inputs used by bun verify.ts and the VoiceOS Integration Studio preview.",
        tools: _0x332954,
      },
      null,
      2,
    ) + "\n"
  );
}
function emitAgentsMd(_0x2ebdc7) {
  const _0x8ed89f = _0x442c90;
  return (
    "# Building this VoiceOS integration (guide for AI coding agents)\n\nYou are editing **" +
    _0x2ebdc7.name +
    '**, a VoiceOS integration: a folder that\nteaches the VoiceOS voice agent new tools, with native UI in the Mac notch.\nThis file is the whole contract — no VoiceOS internals needed.\n\n## What a user experiences\n\nThe user talks to VoiceOS. The agent picks one of the tools declared here,\nVoiceOS runs this folder\'s MCP server (`server.ts`), and the result appears\ntwo ways: the model narrates the data, and the notch shows the tool\'s\n**glance card** (blocks the tool attached via `glanceResult`). Tools that act\non the user\'s behalf first show a **confirmation card** declared in the\nmanifest, which the user can edit and approve.\n\n## Files\n\n- `voiceos.integration.json` — identity, runtime, permissions, tools\n  (name/description/inputSchema/confirmation). Every manifest tool must be\n  registered in server.ts with the same name, and vice versa.\n- `server.ts` — standard MCP stdio server. Implement your logic in the tool\n  handlers (marked TODO).\n- `verify.ts` — run `bun verify.ts` after every change; all checks must ✓.\n\n## Rules that make integrations feel native\n\n1. **Tool descriptions are routing rules for the model**: what it does + when\n   to use it ("Use when the user asks …").\n2. **Results carry data AND a glance card**: JSON the model reasons about,\n   plus `glanceResult([...])` for the user. Never put information only in\n   the card.\n3. **Glance cards are a 2-second read** — max 3 blocks. Vocabulary:\n   `header` {icon?, appIcon?, title, trailing?}, `list` {header?, rows:\n   [{icon?, title, subtitle?, trailing?, badge?: {text, tone?}}]} (≤6 rows),\n   `stats` {items: [{label, value, delta?, tone?}]} (≤3), `keyValue`\n   {pairs: [[label, value]]} (≤5), `bars` {labels, values, unit?} /\n   `line` {points, tone?, baseline?} / `splitBar` {segments} (max ONE\n   chart), `progress` {value, max?, label?, style?: "bar"|"ring"},\n   `badges` {items} (≤3), `clock` {tz}, `countdown` {until|seconds},\n   `divider`, `row` {children} (2-3 side by side). tone is\n   "neutral"|"good"|"bad". Titles ≤60 chars; pre-trim strings. Icons:\n   calendar clock timer bed car mail message music sun moon cloud rain star\n   folder file globe pin phone person heart bolt check x mic note list\n   battery chart dollar home wifi coffee plane sparkle.\n   Off-schema blocks are silently dropped — verify catches shape mistakes.\n4. **Anything that acts needs a manifest `confirmation` card.** Inputs bind\n   to args with `{{argName}}`; edited values are what execute. Interactive\n   vocabulary: card, stack, text, markdown, keyValue, metadata, list/listItem,\n   image, badge, divider, progress, textField, passwordField, select, toggle,\n   chips (inputs take `bind`), actions (roles confirm/cancel/copy/openUrl).\n   Read-only tools must NOT declare one.\n5. **Be honest**: throw on failure; never fabricate data or claim success.\n6. **Least privilege**: list only domains you call in permissions.\n7. **Long work (>20s) declares** `"execution": {"mode": "background"}` +\n   the `background` permission — VoiceOS tracks it in the side panel and\n   shows your glance card on completion when the top notch is idle. Await the\n   work in the handler, then return final data + `glanceResult([...])` (or\n   `widgetResult(html, { data })` from the SDK). VoiceOS creates the task\n   handle itself. Return the card in the final MCP result, not a Markdown UI\n   fence. Reopening the completed task preserves the same card.\n8. **Secrets come from the user**: declare `preferences` /\n   `auth:{"kind":"apiKey"}` fields; VoiceOS injects them as env vars named\n   after each field (`process.env.MY_FIELD`). Never hardcode keys.\n\n## Action availability and visibility\n\nManifest tool fields are optional. Set `disabled: true` to show a read-only\naction with no permission control or preview; VoiceOS also blocks agent,\nwidget, and direct execution. Add `disabledReason` (1–200 trimmed characters)\nto explain why. Set `visibility: "agent"` to hide a tool from the user-facing\naction list while leaving it available to the agent under normal confirmation\nrules. Set `hidePermissionToggle: true` to hide only the "Ask permission" /\n"Don\'t ask" button while keeping the action visible, usable, and previewable.\nThis only affects settings UI; existing confirmation rules and saved user\noverrides still apply. Hidden is not disabled. Defaults preserve existing\nbehavior. Reload after manifest edits. Older hosts may ignore these fields: enforce sensitive\nbackend restrictions in your handler too.\n\n## UI payload budgets\n\nWidget results and hook views allow 300,000 characters in their serialized\n`{ blocks: [...] }` envelope, including JSON escaping and data. Individual\nwidget HTML is also capped at 300,000 characters, measured by string.length,\nnot UTF-8 bytes. Non-widget result envelopes remain at 32,000 characters and\nwidget data at 16,384. Leave room for wrapper markup and serialization overhead.\n\n## Result-widget actions\n\nSet `uiCallable: true` on each manifest tool that result widgets may invoke.\nButtons can request your own tool\'s original name and JSON arguments:\n`parent.postMessage({ type: "voiceos:invokeTool", name: "send_message", args: { message: "Hello" }, requestId: "send-1" }, "*")`.\nListen for `voiceos:toolResult` only from `event.source === parent`.\nThe updated widget kit offers `window.voiceos.invokeTool(name, args)`, a Promise\nthat waits through confirmation and resolves with the terminal response.\nCheck `voiceos:init.capabilities.invokeTool` (or the kit\'s\n`window.voiceos.canInvokeTools`) before enabling buttons on older hosts.\n\nHandlers can implement JavaScript, run Python, or call your service using their\nexisting app access. The bridge cannot call another integration. Existing user\nconfirmation settings and pre/post hooks apply. VoiceOS shows required approval\nOUTSIDE the iframe, preserving the composer, with a read-only review of the\nfinal arguments; cancel to edit and resubmit. Confirmation widgets cannot invoke\ntools. Keep confirmation views on tools that act. Never build a host eval/exec\nendpoint or accept widget-supplied approval.\n\nDisable buttons while pending. Show success only for `completed`; handle\n`cancelled`, `failed`, and `unknown` honestly. Unknown may already have acted:\nnever retry automatically. Use one requestId per intentional action (the helper\ngenerates it); repeated IDs deduplicate. Limits: one pending action and 1,000 IDs\nper card, 32,768 characters JSON args, 131,072 characters returned result, 60 seconds for approval and\n60 seconds for execution. Larger results set `resultOmitted`; execution timeouts\nreport `unknown`. Reopen expired cards. Never author hostToolId/runtime grants.\n\n## Trigger reminders from your app\n\nDeclare `{ "kind": "notify" }` in manifest permissions. From a tool, hook,\ntimer, or background callback on your connected MCP server, call:\n\n```ts\nawait server.server.request(\n  { method: "voiceos/reminders/trigger", params: { message: "Your export is ready!", speak: false } },\n  z.object({ notificationId: z.string() }),\n);\n```\n\nThe full SDK offers `triggerReminder(server, { message, speak })` for the\nsame request. Messages are 1–2,000 trimmed characters; `speak` defaults to\ntrue. VoiceOS supplies the installed app\'s name and icon, persists the card,\nand shows it in the reminder stack when the user is free. The receipt means\nqueued, not seen. Handle rejection honestly. No active agent turn is needed;\nthe app must be saved, enabled, connected, and hold `notify`, and the user\nmust be signed in. This cannot wake a stopped server or an offline client.\n\nTo add buttons, pass `actions: [{ id: "show_details", label: "Show details" }]`\nand optional `data: { reportId: "report-42" }` with the trigger request.\nRegister the SDK\'s `defineReminderActions(server, { show_details: async (event) => { /* app logic */ } })`\nonce before connecting. Handlers receive `notificationId`, `actionId`, and\npersisted `data`, and run in the integration process, never in the reminder\nrenderer. Keep stable handler IDs registered on every startup.\n\nTo open a custom card in the notch when the button is clicked, return\n`{ view: { blocks: [{ type: "widget", html, height: 240, label: "Details" }] }, responseText: "Details ready" }`\nfrom the SDK handler. Native glance blocks work too. Existing widget/glance\nlimits and permissions apply; the host opens the card without an agent turn.\nTool buttons in the card use the app\'s declared `uiCallable` tools as usual.\nReturn nothing for actions without a card. Older hosts ignore the view.\n\nWithout the SDK, register a `server.server.setRequestHandler` for method\n`voiceos/reminders/action`, with params `{ notificationId, actionId, data? }`.\nValidate the action against a fixed handler map; never eval incoming code.\nReturn `{ ok: true }` only after completing the effect; throw on failure.\nTo open a card, return `{ ok: true, view: { blocks: [...] }, responseText? }`.\nDeduplicate by notificationId + actionId, including failed/uncertain attempts,\nusing durable backend idempotency for writes. A 30-second timeout does not prove\nthe operation failed. Never retry side effects automatically.\n\nUse at most 3 buttons; IDs are 1–64 ASCII letters/digits/_/-, labels 1–32\ntrimmed characters, and data is a JSON object up to 8,192 serialized characters\nand 12 levels deep. Store record IDs, not secrets. The host rechecks account,\nnotify permission and connection on click, shows pending/error state, and\ndismisses on success. The click authorizes the labeled action without a\nseparate tool confirmation: label the consequence clearly. Older hosts still\nshow the message but may omit buttons.\n\n## Dev loop\n\n```bash\nbun add @modelcontextprotocol/sdk zod   # once\nbun verify.ts                            # after every change\n```\n\nThen in VoiceOS: Settings → Agent Mode → Integrations → **Install from\nfolder** → pick this folder. After edits, hit the integration\'s **Reload**.\nTools appear to the agent on the next turn — just talk to it.\n\n## Definition of done\n\n- `bun verify.ts` exits 0, every check ✓.\n- Each tool description says when the model should call it.\n- Acting tools have confirmation cards; read tools don\'t.\n- Glance cards read in 2 seconds.\n'
  );
}
function emitPackageJson(_0x30c60c) {
  const _0x52aeed = _0x442c90;
  return (
    JSON.stringify(
      {
        name: _0x30c60c.id.split(".").pop() || "voiceos-integration",
        private: !false,
        type: "module",
        dependencies: {
          "@modelcontextprotocol/sdk": "^1.28.0",
          zod: "^3.25.0",
        },
      },
      null,
      2,
    ) + "\n"
  );
}
function _0x2110(_0x5cd31b, _0x58b296) {
  _0x5cd31b = _0x5cd31b - 452;
  const _0x3f4174 = _0x1b2a();
  let _0x4818f6 = _0x3f4174[_0x5cd31b];
  return _0x4818f6;
}
function emitReadme(_0x6e9d20) {
  const _0x2f48bc = _0x442c90;
  return (
    "# " +
    _0x6e9d20.name +
    "\n\n" +
    _0x6e9d20.summary +
    "\n\nA [VoiceOS](https://www.voiceos.com) integration. Talk to VoiceOS and it can\ncall the tools in this folder; results show as native cards in the notch.\n\n## Develop\n\n```bash\nbun add @modelcontextprotocol/sdk zod\nbun verify.ts\n```\n\nInstall into VoiceOS: Settings → Agent Mode → Integrations → Install from\nfolder. Editing with an AI agent (Claude Code, Cursor)? Point it at this\nfolder — AGENTS.md teaches it the whole contract.\n\n## Share\n\nSend this folder (or its git repo). Anyone can install it the same way.\n"
  );
}
function base(_0x529085, _0xf3d394, _0x15c8f9, _0x3d0378) {
  const _0x3d1dc4 = _0x442c90,
    _0x242dd7 = _0x529085.description?.trim() || _0xf3d394;
  return {
    schemaVersion: 1,
    id: _0x529085.id,
    version: "1.0.0",
    name: _0x529085.name,
    summary: _0x242dd7.slice(0, 140),
    publisher: {
      id: _0x529085.publisherId ?? "pub_you",
      name: _0x529085.publisherName ?? "You",
    },
    runtime: _0x529085.url
      ? { kind: "remote-mcp", url: _0x529085.url }
      : { kind: "local-mcp", command: "bun", args: ["server.ts"] },
    ..._0x15c8f9,
    tools: _0x3d0378,
  };
}
function confirmAndSend(_0x1b2bf9) {
  const _0x219c2b = _0x442c90;
  return base(_0x1b2bf9, "Send something, with a confirmation card.", {}, [
    {
      name: "send_message",
      title: "Send message",
      description:
        "Send a message. Use when the user wants to send something to someone.",
      inputSchema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient" },
          body: { type: "string", description: "Message body" },
        },
        required: ["to", "body"],
      },
      confirmation: {
        schemaVersion: 1,
        root: {
          type: "card",
          title: "Send message",
          children: [
            { type: "textField", bind: "{{to}}", label: "To" },
            {
              type: "textField",
              bind: "{{body}}",
              label: "Message",
              multiline: !false,
            },
          ],
          footer: [
            {
              type: "actions",
              items: [
                { label: "Cancel", role: "cancel" },
                { label: "Send", role: "confirm", color: "accent" },
              ],
            },
          ],
        },
      },
    },
  ]);
}
function fetchAndShowList(_0x3889fc) {
  const _0x5c9a35 = _0x442c90;
  return base(_0x3889fc, "Search something and show the matches.", {}, [
    {
      name: "search_items",
      title: "Search",
      description: "Search items and show the matches to the user.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"],
      },
    },
  ]);
}
function backgroundTask(_0x397976) {
  const _0x298fe1 = _0x442c90;
  return base(
    _0x397976,
    "Kick off a long task; notify when it's done.",
    { permissions: [{ kind: "background" }] },
    [
      {
        name: "start_export",
        title: "Start export",
        description:
          "Start a long export. Runs in the background and notifies when complete.",
        inputSchema: {
          type: "object",
          properties: {
            format: { type: "string", description: "csv or json" },
          },
        },
        execution: { mode: "background", estimatedDurationMs: 3e4 },
        confirmation: {
          schemaVersion: 1,
          root: {
            type: "card",
            title: "Start export",
            children: [
              {
                type: "select",
                bind: "{{format}}",
                label: "Format",
                options: [
                  { label: "CSV", value: "csv" },
                  { label: "JSON", value: "json" },
                ],
              },
            ],
            footer: [
              {
                type: "actions",
                items: [
                  { label: "Cancel", role: "cancel" },
                  { label: "Start", role: "confirm", color: "accent" },
                ],
              },
            ],
          },
        },
      },
    ],
  );
}
function buildTemplateManifest(_0x3f7063) {
  const _0x236871 = _0x442c90;
  switch (_0x3f7063.template) {
    case "fetch-and-show-list":
      return fetchAndShowList(_0x3f7063);
    case "background-task":
      return backgroundTask(_0x3f7063);
    case "confirm-and-send":
    default:
      return confirmAndSend(_0x3f7063);
  }
}
function scaffoldFiles(_0x2b652f) {
  const _0x3dd277 = _0x442c90,
    _0x593a8b = buildTemplateManifest(_0x2b652f),
    _0x25028a = [
      {
        path: "voiceos.integration.json",
        content: JSON.stringify(_0x593a8b, null, 2) + "\n",
      },
      {
        path: "voiceos.integration.preview.json",
        content: emitPreviewFixture(_0x593a8b),
      },
      { path: "verify.ts", content: emitVerifyTs() },
      { path: "AGENTS.md", content: emitAgentsMd(_0x593a8b) },
      { path: "README.md", content: emitReadme(_0x593a8b) },
    ];
  return (
    _0x593a8b.runtime.kind === "local-mcp" &&
      (_0x25028a.splice(1, 0, {
        path: "server.ts",
        content: emitServerTs(_0x593a8b),
      }),
      _0x25028a.push({
        path: "package.json",
        content: emitPackageJson(_0x593a8b),
      })),
    _0x25028a
  );
}
((exports.buildTemplateManifest = buildTemplateManifest),
  (exports.scaffoldFiles = scaffoldFiles));
