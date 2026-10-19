#!/usr/bin/env bash
# Relaunches the built app with a DevTools port and a log of Claude's raw
# stream, for scripts/dev/turn.sh and cdp.js.
#   scripts/dev/launch-debug.sh          (uses dist/mac-arm64, run `npm run app` first)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP="$ROOT/dist/mac-arm64/VoiceOS opensourced.app"
PORT="${CDP_PORT:-9333}"
LOG="${VOICEOS_DEBUG_CLAUDE:-$ROOT/scripts/dev/.claude-stream.jsonl}"
# The port sometimes isn't opened on the first launch after a rebuild; retry.
for attempt in 1 2 3; do
  pkill -f "VoiceOS opensourced.app/Contents/MacOS" 2>/dev/null
  sleep 4
  : > "$LOG"
  open -n -a "$APP" --env "VOICEOS_DEBUG_CLAUDE=$LOG" --args "--remote-debugging-port=$PORT"
  for _ in $(seq 1 25); do curl -s -m 1 "http://127.0.0.1:$PORT/json" >/dev/null && break; sleep 1; done
  if curl -s -m 1 "http://127.0.0.1:$PORT/json" >/dev/null; then sleep 6; echo "✓ app up, DevTools on :$PORT, Claude stream → $LOG"; exit 0; fi
done
echo "✗ the app started without the DevTools port" >&2
exit 1
