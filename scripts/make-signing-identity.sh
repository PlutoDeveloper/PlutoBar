#!/usr/bin/env bash
# Creates "PlutoBar Developer", a self-signed code-signing identity in your
# login keychain, which scripts/package-app.sh then signs with. It keeps the
# same identity across builds (so macOS keeps Microphone and Accessibility
# permissions after updates) and puts no personal details in the app.
#
# Self-signed apps aren't trusted by Gatekeeper: on another Mac the first open
# needs System Settings → Privacy & Security → Open Anyway, once. For no
# warning at all, sign with a Developer ID and notarize instead.
set -euo pipefail
NAME="PlutoBar Developer"
if security find-identity -p codesigning | grep -q "\"$NAME\""; then
  echo "✓ \"$NAME\" is already in your keychain"; exit 0
fi
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
cat > "$WORK/cfg" <<CFG
[req]
distinguished_name = dn
x509_extensions = ext
prompt = no
[dn]
CN = $NAME
[ext]
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
extendedKeyUsage = critical,codeSigning
subjectKeyIdentifier = hash
CFG
/usr/bin/openssl req -x509 -newkey rsa:2048 -nodes -keyout "$WORK/key.pem" -out "$WORK/cert.pem" -days 3650 -config "$WORK/cfg" 2>/dev/null
PASS="$(/usr/bin/openssl rand -hex 12)"
/usr/bin/openssl pkcs12 -export -inkey "$WORK/key.pem" -in "$WORK/cert.pem" -name "$NAME" -out "$WORK/id.p12" -passout "pass:$PASS"
security import "$WORK/id.p12" -k "$HOME/Library/Keychains/login.keychain-db" -P "$PASS" -T /usr/bin/codesign -T /usr/bin/security >/dev/null
echo "✓ \"$NAME\" added to your login keychain"
