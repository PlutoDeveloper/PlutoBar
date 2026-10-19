// Talks to the running app over the Chrome DevTools Protocol (start it with launch-debug.sh).
// node cdp.js list | eval <urlMatch> <js> | shot <urlMatch> <out.png>
const WebSocket = require(require("path").resolve(__dirname, "../../node_modules/ws"));
const PORT = process.env.CDP_PORT || 9333;
(async () => {
  const [cmd, match, arg] = process.argv.slice(2);
  const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
  if (cmd === "list") { for (const t of targets) console.log(t.type, t.title, t.url.slice(0, 120)); return; }
  const t = targets.find((t) => t.type === "page" && (match === "MAIN" ? /index\.html(#\/?(dashboard|insights|history|dictation|agent|apps|settings)?.*)?$/.test(t.url) && !/notch|pill|scheduling/.test(t.url) : t.url.includes(match)));
  if (!t) throw new Error("no target " + match);
  const ws = new WebSocket(t.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((r) => ws.on("open", r));
  let id = 0; const pending = new Map();
  ws.on("message", (m) => { const j = JSON.parse(m); if (pending.has(j.id)) { pending.get(j.id)(j); pending.delete(j.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  if (cmd === "eval") {
    const r = await send("Runtime.evaluate", { expression: arg, awaitPromise: true, returnByValue: true });
    console.log(JSON.stringify(r.result?.result?.value ?? r.result, null, 1));
  } else if (cmd === "shot") {
    const r = await send("Page.captureScreenshot", { format: "png" });
    require("fs").writeFileSync(arg, Buffer.from(r.result.data, "base64"));
    console.log("saved", arg);
  }
  ws.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
