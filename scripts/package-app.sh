#!/usr/bin/env bash
# Builds "VoiceOS opensourced.app" into dist/ and signs it with a stable
# identity so macOS permissions (Microphone, Accessibility) stick to the app
# across rebuilds. (`npm run dev` runs as the generic Electron binary, which
# macOS can't grant reliably.)
#
#   scripts/package-app.sh --open    build, sign, launch      (npm run app)
#   scripts/package-app.sh --dmg     build, sign, make a DMG  (npm run dist)
#
# Identity: $VOICEOS_SIGN_IDENTITY (name or SHA-1), else the first
# "Developer ID Application" / "Apple Development" identity in your keychain.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
APP_NAME="VoiceOS opensourced"
ENT="resources/build/entitlements.mac.plist"

IDENTITY="${VOICEOS_SIGN_IDENTITY:-}"
if [[ -z "$IDENTITY" ]]; then
  IDENTITY="$(security find-identity -v -p codesigning | grep -E '"(Developer ID Application|Apple Development):' | head -1 | awk '{print $2}' || true)"
fi
if [[ -z "$IDENTITY" ]]; then
  echo "⚠︎ No signing identity found — using ad-hoc signing (macOS will ask for permissions again after each rebuild)."
  IDENTITY="-"
fi

# Quit a running copy so the bundle can be replaced (force after 5s).
PATTERN="dist/mac.*/$APP_NAME.app/Contents/MacOS/"
if pgrep -f "$PATTERN" >/dev/null; then
  pkill -f "$PATTERN" || true
  for _ in 1 2 3 4 5 6 7 8 9 10; do pgrep -f "$PATTERN" >/dev/null || break; sleep 0.5; done
  pkill -9 -f "$PATTERN" 2>/dev/null || true
  pkill -9 -f "$APP_NAME.app/Contents/Resources/binaries/" 2>/dev/null || true
fi

echo "→ Building app bundle"
npx electron-builder --mac dir -c.mac.identity=null >/dev/null
APP="$(ls -d dist/mac*/"$APP_NAME.app" | head -1)"

echo "→ Signing with ${IDENTITY:0:12}…"
sign() { codesign --force --timestamp=none --options runtime --entitlements "$ENT" --sign "$IDENTITY" "$@" 2>/dev/null; }
# Inside-out: helpers and native modules, then frameworks, then the app.
while IFS= read -r -d '' f; do
  file -b "$f" | grep -q "Mach-O" && sign "$f"
done < <(find "$APP/Contents/Resources" -type f \( -perm -u+x -o -name "*.node" -o -name "*.dylib" \) -print0)
for fw in "$APP"/Contents/Frameworks/*; do sign "$fw"; done
sign "$APP"
codesign --verify --deep --strict "$APP"
echo "✓ $APP"

case "${1:-}" in
  --open) open "$APP" ;;
  --dmg)
    npx electron-builder --mac dmg --prepackaged "$APP" -c.mac.identity=null >/dev/null
    echo "✓ $(ls dist/*.dmg | head -1)"
    ;;
esac
