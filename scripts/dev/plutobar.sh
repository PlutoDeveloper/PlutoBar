#!/usr/bin/env bash
# Drives PlutoBar in the running app, for screenshots and checks.
#   scripts/dev/plutobar.sh show                  open it
#   scripts/dev/plutobar.sh query "dog on the beach"
#   scripts/dev/plutobar.sh key down|up|return|escape|home|1|2|3|4
#   scripts/dev/plutobar.sh agent '{"t":"text","text":"Hi"}'   an assistant event (see notch.js)
#   scripts/dev/plutobar.sh hide
set -euo pipefail
cmd="${1:-show}"
case "$cmd" in
  show) msg="show {}" ;;
  query) msg="show $(node -e 'console.log(JSON.stringify({query: process.argv[1]}))' "${2:-}")" ;;
  key) msg="key ${2:?which key}" ;;
  agent) msg="agent ${2:?event json}" ;;
  hide) msg="hide" ;;
  *) echo "usage: $0 show|query <text>|key <name>|agent <json>|hide" >&2; exit 1 ;;
esac
swift -e "import Foundation; DistributedNotificationCenter.default().postNotificationName(.init(\"com.voiceos.plutobar.debug\"), object: #\"\"\"
$msg
\"\"\"#, userInfo: nil, deliverImmediately: true)" 2>/dev/null
