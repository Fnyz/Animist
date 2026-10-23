#!/usr/bin/env bash
# Captures README screenshots from an Android device connected over USB (or a running emulator).
# Usage: open the app on the device, then run ./scripts/capture-screenshots.sh
# For each screen, navigate to it in the app and press Enter to capture it.
set -euo pipefail

OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/docs/screenshots"
SCREENS=(home details episodes search my-list)

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android platform-tools first." >&2
  exit 1
fi

if [ "$(adb devices | sed '1d' | grep -c 'device$')" -eq 0 ]; then
  echo "No Android device found. Connect a phone with USB debugging on, or start an emulator." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

# Hide notification icons and show a clean status bar while capturing.
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0900 >/dev/null
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false >/dev/null
trap 'adb shell am broadcast -a com.android.systemui.demo -e command exit >/dev/null' EXIT

for screen in "${SCREENS[@]}"; do
  read -r -p "Open the '$screen' screen in the app, then press Enter… "
  adb exec-out screencap -p > "$OUT_DIR/$screen.png"
  echo "Saved docs/screenshots/$screen.png"
done

echo "Done. Uncomment the screenshot table in README.md to show them."
