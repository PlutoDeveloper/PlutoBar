#!/usr/bin/env bash
# Sends one typed agent request to the running app and prints the tool calls,
# results and token use.   scripts/dev/turn.sh "what's the weather in Chennai?"
# Needs the app started with scripts/dev/launch-debug.sh.
DIR="$(cd "$(dirname "$0")" && pwd)"
LOG="${VOICEOS_DEBUG_CLAUDE:-$DIR/.claude-stream.jsonl}"
sleep 3; : > "$LOG"   # let the previous turn's title request finish first
node "$DIR/cdp.js" eval MAIN "window.api.send('agent-text-send',{text:$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$1"),widgetVisible:true}); 'sent'" >/dev/null || exit 1
until grep -q '"type":"result"' "$LOG"; do sleep 1; done
python3 - "$LOG" <<'PY'
import json, sys
for l in open(sys.argv[1]):
    try: e = json.loads(l)
    except ValueError: continue
    if e.get("type") == "assistant":
        for c in e["message"].get("content", []):
            if isinstance(c, dict) and c.get("type") in ("tool_use", "server_tool_use"):
                print("CALL", c["name"].replace("mcp__voiceos__", ""), json.dumps(c["input"])[:160])
    if e.get("type") == "user":
        for c in e["message"].get("content", []):
            if isinstance(c, dict) and c.get("type") == "tool_result": print("  ->", str(c.get("content"))[:200])
    if e.get("type") == "result":
        u = e.get("usage", {})
        print("RESULT:", str(e.get("result"))[:260].replace("\n", " "), "| new", u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0), "cached", u.get("cache_read_input_tokens"), "|", e.get("duration_ms"), "ms")
        break
PY
