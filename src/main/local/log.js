"use strict";
// Logs to the app's electron-log file (~/Library/Logs/VoiceOS opensourced/).
// main.js silences console.log/info, so the local runtime logs through here.
const log = require("electron-log");

module.exports = log.scope ? log.scope("voiceos") : log;
