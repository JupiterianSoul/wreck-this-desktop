#!/bin/sh
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd)
T=$(mktemp -d)
export WTD_RUNTIME_DIR="$T/run" WTD_STATE_DIR="$T/state" WTD_DATA_DIR="$T/data" WTD_HYPRCTL="$ROOT/tests/fake-hyprctl" WTD_FAKE_LOG="$T/hypr.log"
export WTD_TEST=1 WTD_FIXTURE="$ROOT/tests/fixtures/${1:-tiled3}" WTD_AUTOQUIT="${2:-10}" WTD_TEST_W=1600 WTD_TEST_H=1000
export GDK_BACKEND=x11 GSK_RENDERER=cairo LIBGL_ALWAYS_SOFTWARE=1 PULSE_SERVER=none
fail=0
xvfb-run -a -s "-screen 0 1600x1000x24" "$ROOT/wreck-this-desktop" run > "$T/out.txt" 2>&1
echo "exit $?"
grep -v "^$" "$T/run/log.txt" 2>/dev/null | sed 's/^/  log: /' | head -30
grep -q "game started" "$T/run/log.txt" || { echo "FAIL no game started"; fail=1; }
grep -q "page: error" "$T/run/log.txt" && { echo "FAIL page error"; fail=1; }
[ -e "$T/state/journal.json" ] && { echo "FAIL journal left behind"; fail=1; }
ls "$T/run" | grep -q '^s-' && { echo "FAIL session dir left behind"; fail=1; }
echo "hyprctl calls:"; sed 's/^/  /' "$T/hypr.log" 2>/dev/null
tail -5 "$T/out.txt"
rm -rf "$T"
[ $fail = 0 ] && echo "HOST OK" || echo "HOST FAIL"
exit $fail
