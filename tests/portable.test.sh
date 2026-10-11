#!/bin/bash
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
zip="$root/dist/wreck-this-desktop-linux.zip"
[ -f "$zip" ] || { echo "build first: tools/build-portable.sh"; exit 1; }
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
export HOME="$work/home"
mkdir -p "$HOME"
unzip -q "$zip" -d "$work/unz"
env -u DBUS_SESSION_BUS_ADDRESS GSETTINGS_BACKEND=memory XDG_SESSION_TYPE=x11 bash "$work/unz/wreck-this-desktop/install.sh" | tail -3
test -x "$HOME/.local/bin/wreck-this-desktop"
test -f "$HOME/.local/share/applications/wreck-this-desktop.desktop"

cat > "$work/desk.py" <<'PY'
import subprocess, sys, gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GLib
wins = []
for i, (x, y, w, h, txt) in enumerate([(80, 60, 900, 600, "terminal output line\n" * 20), (700, 300, 800, 500, "hello from a fake browser window " * 6)]):
    win = Gtk.Window(title=f"Fake Window {i}")
    win.move(x, y)
    win.set_default_size(w, h)
    lab = Gtk.Label(label=txt)
    lab.set_line_wrap(True)
    win.add(lab)
    win.show_all()
    wins.append(win)
def done():
    ids = ",".join(hex(w.get_window().get_xid()) for w in wins)
    subprocess.run(["xprop", "-root", "-f", "_NET_CLIENT_LIST_STACKING", "32x", "-set", "_NET_CLIENT_LIST_STACKING", ids])
    subprocess.run(["xprop", "-root", "-f", "_NET_CURRENT_DESKTOP", "32c", "-set", "_NET_CURRENT_DESKTOP", "0"])
    open(sys.argv[1], "w").write(ids)
    return False
GLib.timeout_add(800, done)
GLib.timeout_add(30000, Gtk.main_quit)
Gtk.main()
PY

cat > "$work/run.sh" <<RUN
set -e
GDK_BACKEND=x11 python3 "$work/desk.py" "$work/ready" &
desk=\$!
for i in \$(seq 50); do [ -f "$work/ready" ] && break; sleep 0.1; done
python3 "$root/portable/x11-windows.py" > "$work/windows.json"
WTD_MUTE=1 WTD_AUTOQUIT=9 "$HOME/.local/bin/wreck-this-desktop" --ozone-platform=x11 &
game=\$!
sleep 7
ffmpeg -loglevel error -f x11grab -video_size 1920x1080 -i "\$DISPLAY" -frames:v 1 -y "$work/shot.png"
wait \$game || true
kill \$desk 2>/dev/null || true
RUN
env -u GDK_SCALE -u GDK_DPI_SCALE -u QT_SCALE_FACTOR -u WAYLAND_DISPLAY -u DBUS_SESSION_BUS_ADDRESS -u ELECTRON_RUN_AS_NODE XDG_SESSION_TYPE=x11 XDG_CONFIG_HOME="$HOME/.config" XDG_DATA_HOME="$HOME/.local/share" XDG_CACHE_HOME="$HOME/.cache" GSETTINGS_BACKEND=memory xvfb-run -a -s "-screen 0 1920x1080x24" bash "$work/run.sh"
echo "x11 windows: $(cat "$work/windows.json")"
grep -E "capture|segmented|game started|error|failed|quit" "$HOME/.config/Wreck This Desktop/log.txt" | cut -c1-240
mkdir -p "${WTD_OUT:-$root/dist}"
cp "$work/shot.png" "${WTD_OUT:-$root/dist}/portable-shot.png"
grep -q "game started" "$HOME/.config/Wreck This Desktop/log.txt" && echo PASS || { echo FAIL; exit 1; }
