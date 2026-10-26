#!/bin/bash

# ==============================================================================
# GridWise Desktop Launcher
# Launches GridWise in standalone native desktop application mode (no address bar / no toolbars)
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
cd "$DIR"

PORT=5173
URL="http://localhost:${PORT}"
USER_DATA_DIR="$HOME/Library/Application Support/GridWiseDesktop"
mkdir -p "$USER_DATA_DIR"

# 1. Verify Vite dev server is running
if ! curl -s --head "$URL" > /dev/null 2>&1; then
  echo "⚡ Starting GridWise development server on port $PORT..."
  npm run dev &
  VITE_PID=$!
  sleep 2
else
  echo "✓ GridWise server is already running at $URL"
fi

# 2. Locate standalone desktop-capable browser
CHROME_BIN="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BRAVE_BIN="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
EDGE_BIN="/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"

if [ -f "$CHROME_BIN" ]; then
  echo "🖥️  Launching GridWise in dedicated desktop window via Google Chrome..."
  "$CHROME_BIN" --app="$URL" --window-name="GridWise" --window-size=1440,900 --user-data-dir="$USER_DATA_DIR" > /dev/null 2>&1 &
elif [ -f "$BRAVE_BIN" ]; then
  echo "🖥️  Launching GridWise in dedicated desktop window via Brave..."
  "$BRAVE_BIN" --app="$URL" --window-name="GridWise" --window-size=1440,900 --user-data-dir="$USER_DATA_DIR" > /dev/null 2>&1 &
elif [ -f "$EDGE_BIN" ]; then
  echo "🖥️  Launching GridWise in dedicated desktop window via Microsoft Edge..."
  "$EDGE_BIN" --app="$URL" --window-name="GridWise" --window-size=1440,900 --user-data-dir="$USER_DATA_DIR" > /dev/null 2>&1 &
else
  echo "🌐 Opening GridWise in default browser..."
  open "$URL"
fi

echo "🚀 GridWise Desktop launched successfully!"
