#!/usr/bin/env bash
# Builds PlutoBar, VoiceOS's Spotlight-style bar, from resources/src/plutobar
# into resources/plutobar/plutobar.node (loaded by src/main/local/plutobar).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/resources/src/plutobar"
OUT="$ROOT/resources/plutobar"

swift build -c release --package-path "$SRC" -Xswiftc -suppress-warnings
BIN="$(swift build -c release --package-path "$SRC" --show-bin-path)"

rm -rf "${OUT:?}"
mkdir -p "$OUT"
cp "$BIN/libPlutoBar.dylib" "$OUT/plutobar.node"
# Only Node-API may be left for the host process to provide.
if nm -u "$OUT/plutobar.node" | grep -q plutobar_; then
  echo "✗ plutobar.node: Swift entry points missing (are they public?)"; exit 1
fi
# Ad-hoc here; scripts/package-app.sh re-signs everything with the app's identity.
codesign --force -s - "$OUT/plutobar.node" >/dev/null 2>&1
echo "✓ resources/plutobar"
