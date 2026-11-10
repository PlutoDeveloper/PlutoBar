#!/usr/bin/env bash
# Builds resources/bin/apple-speech: dictation on Apple's own speech model
# (SpeechAnalyzer, macOS 26+, Neural Engine). See resources/src/apple-speech.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
xcrun swiftc -O -target arm64-apple-macos14.0 "$ROOT/resources/src/apple-speech/main.swift" -o "$ROOT/resources/bin/apple-speech"
# Ad-hoc here; scripts/package-app.sh re-signs everything with the app's identity.
codesign --force -s - "$ROOT/resources/bin/apple-speech" >/dev/null 2>&1
echo "✓ resources/bin/apple-speech"
