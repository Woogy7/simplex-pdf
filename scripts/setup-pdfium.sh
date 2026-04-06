#!/usr/bin/env bash
# Downloads the PDFium shared library for the current platform.
# Pre-built binaries from: https://github.com/bblanchon/pdfium-binaries
set -euo pipefail

PDFIUM_VERSION="chromium/7776"
LIB_DIR="$(dirname "$0")/../src-tauri/lib"
mkdir -p "$LIB_DIR"

OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)
    case "$ARCH" in
      x86_64)  PLATFORM="linux-x64" ;;
      aarch64) PLATFORM="linux-arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    LIB_NAME="libpdfium.so"
    ;;
  Darwin)
    case "$ARCH" in
      x86_64)  PLATFORM="mac-x64" ;;
      arm64)   PLATFORM="mac-arm64" ;;
      *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    LIB_NAME="libpdfium.dylib"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    PLATFORM="win-x64"
    LIB_NAME="pdfium.dll"
    ;;
  *)
    echo "Unsupported OS: $OS"
    exit 1
    ;;
esac

URL="https://github.com/bblanchon/pdfium-binaries/releases/download/$PDFIUM_VERSION/pdfium-$PLATFORM.tgz"

echo "Downloading PDFium for $PLATFORM..."
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "$URL" -o "$TMPDIR/pdfium.tgz"
tar -xzf "$TMPDIR/pdfium.tgz" -C "$TMPDIR"

# Find and copy the library file
FOUND_LIB=$(find "$TMPDIR" -name "$LIB_NAME" -type f | head -1)
if [ -z "$FOUND_LIB" ]; then
  echo "Could not find $LIB_NAME in archive. Listing contents:"
  find "$TMPDIR" -type f
  exit 1
fi

cp "$FOUND_LIB" "$LIB_DIR/$LIB_NAME"
echo "PDFium library installed to: $LIB_DIR/$LIB_NAME"

# Also copy headers if present (useful for development)
INCLUDE_DIR="$TMPDIR/include"
if [ -d "$INCLUDE_DIR" ]; then
  cp -r "$INCLUDE_DIR" "$LIB_DIR/"
  echo "PDFium headers copied to: $LIB_DIR/include/"
fi
