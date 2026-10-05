#!/bin/bash
# Builds Famees Companion, installs it to ~/Applications and starts it at login.
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="FameesCompanion"
APP="$HOME/Applications/$APP_NAME.app"
LABEL="com.famees.companion"
AGENT="$HOME/Library/LaunchAgents/$LABEL.plist"

if ! command -v swiftc >/dev/null 2>&1; then
  echo "Swift compiler not found. Installing Apple's Command Line Tools..."
  echo "A popup will appear — click Install, wait for it to finish, then run ./install.sh again."
  xcode-select --install || true
  exit 1
fi

echo "▸ Building..."
BUILD_DIR="$(mktemp -d)"
swiftc -O -swift-version 5 main.swift -o "$BUILD_DIR/$APP_NAME" \
  -framework AppKit -framework SwiftUI -framework AVFoundation

echo "▸ Installing to $APP"
pkill -x "$APP_NAME" 2>/dev/null || true
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$BUILD_DIR/$APP_NAME" "$APP/Contents/MacOS/$APP_NAME"
mkdir -p "$APP/Contents/Resources"
cp assets/water.png assets/stretch.png "$APP/Contents/Resources/"
cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>Famees Companion</string>
  <key>CFBundleIdentifier</key><string>$LABEL</string>
  <key>CFBundleExecutable</key><string>$APP_NAME</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleVersion</key><string>1.0</string>
  <key>LSUIElement</key><true/>
</dict>
</plist>
PLIST
codesign --force --sign - "$APP" >/dev/null 2>&1 || true
rm -rf "$BUILD_DIR"

echo "▸ Setting it to start automatically when you log in"
mkdir -p "$HOME/Library/LaunchAgents"
cat > "$AGENT" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>$APP/Contents/MacOS/$APP_NAME</string></array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
PLIST
launchctl unload "$AGENT" 2>/dev/null || true
launchctl load -w "$AGENT"

echo "✅ Done! Your companion is running — look for 🧍‍♂️ in the menu bar."
