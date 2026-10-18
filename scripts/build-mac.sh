#!/usr/bin/env bash
# Construit Hexaria.app : build web (Vite) + lanceur natif Swift (WKWebView) + icône.
set -euo pipefail
cd "$(dirname "$0")/.."

APP="build/Hexaria.app"
VERSION="$(node -p "require('./package.json').version")"
echo "→ Build web (Vite)…"
npx tsc --noEmit
npx vite build --outDir dist --emptyOutDir >/dev/null

echo "→ Compilation du lanceur Swift (universel arm64 + x86_64)…"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" build/slices
for arch in arm64 x86_64; do
  swiftc -O -swift-version 5 -target "$arch-apple-macos12.0" -o "build/slices/Hexaria-$arch" mac/HexariaApp.swift -framework Cocoa -framework WebKit
done
lipo -create build/slices/Hexaria-arm64 build/slices/Hexaria-x86_64 -output "$APP/Contents/MacOS/Hexaria"
rm -rf build/slices

cp -R dist "$APP/Contents/Resources/web"

if [ -f mac/icon-1024.png ]; then
  echo "→ Icône…"
  ICONSET="build/Hexaria.iconset"
  rm -rf "$ICONSET" && mkdir -p "$ICONSET"
  for s in 16 32 128 256 512; do
    sips -z $s $s mac/icon-1024.png --out "$ICONSET/icon_${s}x${s}.png" >/dev/null
    d=$((s * 2))
    sips -z $d $d mac/icon-1024.png --out "$ICONSET/icon_${s}x${s}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/Hexaria.icns"
  rm -rf "$ICONSET"
fi

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Hexaria</string>
  <key>CFBundleDisplayName</key><string>Hexaria</string>
  <key>CFBundleIdentifier</key><string>com.hexaria.game</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleExecutable</key><string>Hexaria</string>
  <key>CFBundleIconFile</key><string>Hexaria</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.strategy-games</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSHumanReadableCopyright</key><string>Hexaria — MIT</string>
</dict>
</plist>
PLIST

codesign --force --deep --sign - "$APP" >/dev/null 2>&1 || true
echo "✓ $APP prêt — lancez-le avec : open $APP"
