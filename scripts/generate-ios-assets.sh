#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ASSET_DIR="$ROOT_DIR/assets"
IOS_ASSET_DIR="$ROOT_DIR/ios/App/App/Assets.xcassets"

mkdir -p "$ASSET_DIR"

ICON_SRC="$ASSET_DIR/icon.png"
SPLASH_SRC="$ASSET_DIR/splash.png"

if [ ! -f "$ICON_SRC" ]; then
  cp "$ROOT_DIR/public/icons/icon-1024.png" "$ICON_SRC"
fi

if [ ! -f "$SPLASH_SRC" ]; then
  cp "$ICON_SRC" "$SPLASH_SRC"
fi

sips -z 1024 1024 "$ICON_SRC" --out "$ICON_SRC" >/dev/null
sips -z 2732 2732 "$SPLASH_SRC" --out "$SPLASH_SRC" >/dev/null

if [ ! -d "$IOS_ASSET_DIR" ]; then
  echo "iOS assets folder not found. Run pnpm run app:ios:add first."
  exit 0
fi

sips -z 1024 1024 "$ICON_SRC" \
  --out "$IOS_ASSET_DIR/AppIcon.appiconset/AppIcon-512@2x.png" >/dev/null

cp "$SPLASH_SRC" "$IOS_ASSET_DIR/Splash.imageset/splash-2732x2732.png"
cp "$SPLASH_SRC" "$IOS_ASSET_DIR/Splash.imageset/splash-2732x2732-1.png"
cp "$SPLASH_SRC" "$IOS_ASSET_DIR/Splash.imageset/splash-2732x2732-2.png"

echo "iOS app icon and splash assets updated."
