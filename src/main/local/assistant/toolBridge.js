"use strict";
// Localhost MCP server that exposes the app's own tools (native actions,
// integrations, user MCP servers) to Claude Code for one assistant turn.
// Each turn gets a random bearer token; requests without it are rejected.

const http = require("node:http");
const crypto = require("node:crypto");
const electron = require("electron");

let server = null;
let baseUrl = null;
const turns = new Map(); // token -> { tools, onCall }

async function ensureServer() {
  if (server) return;
  const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
  const { StreamableHTTPServerTransport } = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
  const { ListToolsRequestSchema, CallToolRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

  server = http.createServer((req, res) => {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const turn = token && turns.get(token);
    if (!turn) return res.writeHead(401).end();
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const mcp = new Server({ name: "voiceos", version: "1.0.0" }, { capabilities: { tools: {} } });
      mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: turn.tools.map((t) => ({ name: t.name, description: t.description, inputSchema: t.schema })),
      }));
      mcp.setRequestHandler(CallToolRequestSchema, async (r) => {
        const result = await turn.onCall(r.params.name, r.params.arguments || {});
        return { content: toMcpContent(result.content), isError: !!result.isError };
      });
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      res.on("close", () => (transport.close(), mcp.close()));
      try {
        await mcp.connect(transport);
        await transport.handleRequest(req, res, body ? JSON.parse(body) : undefined);
      } catch (err) {
        if (!res.headersSent) res.writeHead(500).end(String(err?.message || err));
      }
    });
  });
  await new Promise((resolve, reject) => server.listen(0, "127.0.0.1", resolve).on("error", reject));
  baseUrl = "http://127.0.0.1:" + server.address().port + "/mcp";
  electron.app.on("will-quit", () => server.close());
}

function toMcpContent(content) {
  if (!Array.isArray(content)) return [{ type: "text", text: content || "(no output)" }];
  return content.map((b) => (b.type === "image" ? { type: "image", data: b.data, mimeType: b.mimeType } : { type: "text", text: b.text }));
}

// Registers `tools` for one turn; `onCall(name, args)` must resolve to
// { content: string | [{type:"text",text} | {type:"image",mimeType,data}], isError?: boolean }.
async function openTurn(tools, onCall) {
  await ensureServer();
  const token = crypto.randomBytes(24).toString("hex");
  turns.set(token, { tools, onCall });
  return {
    mcpServer: { type: "http", url: baseUrl, headers: { Authorization: "Bearer " + token } },
    close: () => turns.delete(token),
  };
}

module.exports = { openTurn };
