#!/usr/bin/env bash
# Renders PlutoBar's brand images (render-brand.swift) and puts them where the
# app reads them: the app icon (.icns), the menu bar icon, and the renderer's
# logo and wordmark files (same file names, so the UI bundle needs no change).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
swift "$ROOT/scripts/brand/render-brand.swift" "$TMP" >/dev/null

A="$ROOT/src/renderer/assets"
cp "$TMP/wordmark-white.png" "$A/voiceOsWordmarkWhite-Dmt_eONs.png"
cp "$TMP/wordmark-black.png" "$A/voiceOsWordmarkBlack-B9LkesqI.png"
cp "$TMP/mark-white-202x97.png" "$A/voiceOsLogoWhite-CbIBNSRL.png"
cp "$TMP/mark-black-202x97.png" "$A/voiceOsLogoBlack-CWhcVBti.png"
cp "$TMP/mark-light-591.png" "$A/logo-CLBh_nY7.png"
cp "$TMP/mark-black-591x282.png" "$A/logoBlack-BqU1vWJd.png"
cp "$TMP/icon-1024.png" "$A/icon-DkPb6-F6.png"

B="$ROOT/resources/build"
cp "$TMP/tray.png" "$B/logoTemplate.png"
cp "$TMP/tray@2x.png" "$B/logoTemplate@2x.png"
SET="$TMP/icon.iconset"
mkdir -p "$SET"
for s in 16 32 128 256 512; do
  cp "$TMP/icon_$s.png" "$SET/icon_${s}x${s}.png"
  cp "$TMP/icon_$((s * 2)).png" "$SET/icon_${s}x${s}@2x.png"
done
iconutil -c icns "$SET" -o "$B/icon.icns"
echo "✓ brand installed"
