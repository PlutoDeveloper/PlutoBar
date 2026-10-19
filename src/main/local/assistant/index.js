"use strict";
// One interface over both ways of using Claude:
//   engine "subscription" → your Claude account, via the Claude Code CLI
//   engine "apikey"       → Anthropic API key
// runTurn() yields { type: "text" | "tool" | "activity", ... } events.

const claudeCode = require("./claudeCode");
const claudeApi = require("./claudeApi");

function runTurn(target, turn) {
  return target.engine === "subscription"
    ? claudeCode.runTurn({ ...turn, model: target.model })
    : claudeApi.runTurn({ ...turn, apiKey: target.apiKey, model: target.model });
}

function complete(target, { system, prompt, signal }) {
  return target.engine === "subscription"
    ? claudeCode.complete({ system, prompt, model: target.model, signal })
    : claudeApi.complete({ apiKey: target.apiKey, system, prompt, model: target.model, signal });
}

module.exports = { runTurn, complete, claudeCode, claudeApi };
