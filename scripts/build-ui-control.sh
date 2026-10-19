#!/usr/bin/env bash
# Builds resources/bin/ui-control (the Accessibility helper behind the
# assistant's computer-use tools) from resources/src/ui-control.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
xcrun swiftc -O -target arm64-apple-macos13 "$ROOT/resources/src/ui-control/main.swift" -o "$ROOT/resources/bin/ui-control"
echo "✓ resources/bin/ui-control"
