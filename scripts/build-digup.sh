#!/usr/bin/env bash
# Builds DigUp's engine (resources/src/digup, MIT) into resources/bin/digup, the
# tool PlutoBar runs to download the search model, index your folders and
# search them. llama.cpp is built first at DigUp's pinned commit (needs CMake,
# or uv to fetch it); later runs reuse it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/resources/src/digup"

"$SRC/scripts/build-llama.sh"
if [[ -z "${DEVELOPER_DIR:-}" && -d /Applications/Xcode.app ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
swift build -c release --package-path "$SRC" --product digup -Xswiftc -suppress-warnings
BIN="$(swift build -c release --package-path "$SRC" --show-bin-path)"
cp "$BIN/digup" "$ROOT/resources/bin/digup"
# Ad-hoc here; scripts/package-app.sh re-signs everything with the app's identity.
codesign --force -s - "$ROOT/resources/bin/digup" >/dev/null 2>&1
echo "✓ resources/bin/digup"
