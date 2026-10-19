#!/usr/bin/env bash
# Builds a self-contained whisper.cpp server (Metal GPU, shaders embedded, no
# dylibs) into resources/bin/whisper-server for on-device speech-to-text.
#
#   scripts/build-whisper.sh [version]      e.g. v1.9.4
set -euo pipefail

VERSION="${1:-v1.9.4}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${TMPDIR:-/tmp}/voiceos-whisper-build"

command -v cmake >/dev/null || { echo "cmake is required (brew install cmake)"; exit 1; }

rm -rf "$WORK"
git clone --depth 1 --branch "$VERSION" https://github.com/ggml-org/whisper.cpp "$WORK"

cmake -S "$WORK" -B "$WORK/build" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0 \
  -DBUILD_SHARED_LIBS=OFF \
  -DGGML_METAL=ON \
  -DGGML_METAL_EMBED_LIBRARY=ON \
  -DGGML_NATIVE=OFF \
  -DWHISPER_BUILD_SERVER=ON \
  -DWHISPER_BUILD_EXAMPLES=ON \
  -DWHISPER_BUILD_TESTS=OFF \
  -DWHISPER_SDL2=OFF
cmake --build "$WORK/build" --config Release -j --target whisper-server

install -m 0755 "$WORK/build/bin/whisper-server" "$ROOT/resources/bin/whisper-server"
echo "Built $("$ROOT/resources/bin/whisper-server" --help 2>&1 | head -1 || true)"
otool -L "$ROOT/resources/bin/whisper-server"
