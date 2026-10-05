#!/bin/bash
# Stops Famees Companion and removes it.
LABEL="com.famees.companion"
AGENT="$HOME/Library/LaunchAgents/$LABEL.plist"
launchctl unload "$AGENT" 2>/dev/null || true
rm -f "$AGENT"
pkill -x FameesCompanion 2>/dev/null || true
rm -rf "$HOME/Applications/FameesCompanion.app"
echo "Famees Companion removed."
