#!/bin/sh
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT=$(mktemp --suffix=.png)
LOG=$(mktemp)
GDK_BACKEND=x11 LIBGL_ALWAYS_SOFTWARE=1 xvfb-run -a -s "-screen 0 1600x1000x24" python3 -I "$ROOT/tests/webkit_probe.py" "$OUT" "__wtd.step(60); WTP.game.stopLoop(); __wtd.tp(300, 150); __wtd.setAim(1, -0.2); __wtd.step(2); WTP.game.renderNow(); 1" check > "$LOG" 2>&1
r=$?
grep -E "player pixels|errors" "$LOG"
rm -f "$OUT" "$LOG"
exit $r
