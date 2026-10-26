#!/usr/bin/env bash
# Captures README screenshots from an Android device connected over USB (or a running emulator).
# Usage: open the app on the device, then run ./scripts/capture-screenshots.sh
# For each screen, navigate to it in the app and press Enter to capture it.
# Screens: home (top), home-rows (scrolled to Continue watching), details, episodes (details,
# scrolled to the list), watch, fullscreen (landscape), search, genre (a genre list), history.
# Tip: turn off Expo Go's floating tools button first (developer menu > Tools button).
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/screenshots"
SCREENS=(home home-rows details episodes watch fullscreen search genre history)

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android platform-tools first." >&2
  exit 1
fi

if [ "$(adb devices | sed '1d' | grep -c 'device$')" -eq 0 ]; then
  echo "No Android device found. Connect a phone with USB debugging on, or start an emulator." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

# A clean status bar: 9:00, full battery and signal, no notification icons. Some phones (MIUI)
# drop it whenever the app changes screens, so it's applied again before every capture.
demo() { adb shell am broadcast -a com.android.systemui.demo -e command "$@" >/dev/null; }
clean_status_bar() {
  demo enter
  demo clock -e hhmm 0900
  demo notifications -e visible false
  demo battery -e level 100 -e plugged false
  demo network -e wifi show -e level 4
  demo network -e mobile show -e level 4
  sleep 1.5
}
adb shell settings put global sysui_demo_allowed 1
trap 'demo exit' EXIT

for screen in "${SCREENS[@]}"; do
  read -r -p "Open the '$screen' screen in the app, then press Enter… "
  clean_status_bar
  adb exec-out screencap -p > "$OUT_DIR/$screen.png"
  # Smaller JPGs keep the repo light (sips is on macOS); elsewhere the PNG is kept.
  if command -v sips >/dev/null 2>&1; then
    sips -Z 1200 -s format jpeg -s formatOptions 82 "$OUT_DIR/$screen.png" --out "$OUT_DIR/$screen.jpg" >/dev/null
    rm "$OUT_DIR/$screen.png"
    echo "Saved docs/screenshots/$screen.jpg"
  else
    echo "Saved docs/screenshots/$screen.png (the README expects .jpg)"
  fi
done

echo "Done."
