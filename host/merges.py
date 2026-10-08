import base64
import json
import os
import re
import subprocess
import sys
import threading
import time
from pathlib import Path

from common import STATE, WRECKAGE, Journal, hypr, log, write_json, stop_wreckage

TEST = bool(os.environ.get("WTD_TEST") or os.environ.get("WTD_FIXTURE"))


class Merges:
    def __init__(self, sess, data):
        self.sess = Path(sess)
        self.data = data
        self.journal = Journal()
        self.notif_proc = None
        self.nudged = {}
        self.nudge_t = 0
        self.level = 0
        self.busy = False

    def handlers(self):
        return {"next-level": self.next_level, "notify-watch": self.notify_watch, "wreckage": self.wreckage, "nudge": self.nudge, "photo": self.photo}

    def focused_monitor(self):
        return next(m for m in self.data["monitors"] if m["focused"])

    def next_level(self, msg, ov):
        if self.busy or TEST:
            if TEST:
                ov.js("window.WTD && WTD.onNextLevel && WTD.onNextLevel(null)")
            return
        self.busy = True
        mon = self.focused_monitor()
        cur = (mon.get("workspace") or {}).get("id")
        if not self.journal.entries("workspace"):
            self.journal.add("workspace", id=cur, name=(mon.get("workspace") or {}).get("name"))
        target = msg.get("ws")
        if not target:
            wss = [w for w in (hypr("workspaces", j=True) or []) if w.get("windows", 0) > 0 and w.get("monitor") == mon["name"] and w.get("id", 0) > 0]
            ids = sorted(w["id"] for w in wss)
            later = [i for i in ids if i > (cur or 0)]
            target = (later or ids or [cur])[0]
        log("next level", cur, "->", target)
        ov.hide(True)
        GLib = __import__("gi.repository.GLib", fromlist=["GLib"])

        def work():
            hypr("dispatch", "workspace", str(target))
            time.sleep(0.45)
            import capture
            self.level += 1
            try:
                data = capture.capture(self.sess, suffix=f"-{self.level}")
            except Exception as e:
                log("recapture failed", e)
                data = None
            def back():
                if data:
                    self.data.clear()
                    self.data.update(data)
                    ov.data = self.data
                    ov.reload(data)
                ov.hide(False)
                self.busy = False
                return False
            GLib.idle_add(back)

        threading.Thread(target=work, daemon=True).start()

    def notify_watch(self, msg, ov):
        on = bool(msg.get("on"))
        if not on:
            if self.notif_proc:
                self.notif_proc.terminate()
                self.notif_proc = None
            return
        if self.notif_proc or TEST:
            return
        try:
            self.notif_proc = subprocess.Popen(["dbus-monitor", "--session", "interface='org.freedesktop.Notifications',member='Notify'"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)
        except OSError as e:
            log("dbus-monitor failed", e)
            return
        GLib = __import__("gi.repository.GLib", fromlist=["GLib"])

        def reader(proc):
            strings = []
            in_call = False
            for line in proc.stdout:
                line = line.rstrip("\n")
                if line.startswith("method call") and "member=Notify" in line:
                    if in_call and len(strings) >= 4:
                        emit(strings)
                    in_call = True
                    strings = []
                    continue
                if not in_call:
                    continue
                m = re.match(r'\s+string "(.*)"$', line)
                if m and len(strings) < 4:
                    strings.append(m.group(1))
                    if len(strings) == 4:
                        emit(strings)
                        in_call = False

        def emit(s):
            app, _icon, summary, body = s
            payload = json.dumps({"app": app[:40], "summary": summary[:80], "body": body[:120]})
            GLib.idle_add(lambda: ov.js(f"window.WTD && WTD.onNotify && WTD.onNotify({payload})") and False)

        threading.Thread(target=reader, args=(self.notif_proc,), daemon=True).start()

    def photo(self, msg, ov):
        data = msg.get("png") or ""
        if not data.startswith("data:image/png;base64,"):
            return
        d = os.environ.get("WTD_PHOTO_DIR")
        if not d:
            if TEST:
                return
            d = str(Path.home() / "Pictures" / "Wreck This Desktop")
        out = Path(d)
        out.mkdir(parents=True, exist_ok=True)
        f = out / time.strftime("wreck-%Y%m%d-%H%M%S.png")
        f.write_bytes(base64.b64decode(data.split(",", 1)[1]))
        log("photo", f)
        ov.js(f"window.WTD && WTD.onPhoto && WTD.onPhoto({json.dumps(str(f))})")

    def wreckage(self, msg, ov):
        if TEST:
            return
        data = msg.get("png") or ""
        if not data.startswith("data:image/png;base64,"):
            return
        STATE.mkdir(parents=True, exist_ok=True)
        stop_wreckage()
        img = STATE / "wreckage.png"
        img.write_bytes(base64.b64decode(data.split(",", 1)[1]))
        mon = self.focused_monitor()
        env = dict(os.environ)
        env["LD_PRELOAD"] = "/usr/lib/libgtk4-layer-shell.so" if Path("/usr/lib/libgtk4-layer-shell.so").exists() else env.get("LD_PRELOAD", "")
        p = subprocess.Popen([sys.executable, str(Path(__file__).resolve().parent / "wtd.py"), "wreckage", str(img), mon["name"]],
                             start_new_session=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)
        write_json(WRECKAGE, {"pid": p.pid, "image": str(img), "t": time.time()})
        log("wreckage wallpaper", p.pid)

    def nudge(self, msg, ov):
        if TEST:
            return
        now = time.time()
        if now - self.nudge_t < 0.12:
            return
        self.nudge_t = now
        power = max(0.0, min(1.0, float(msg.get("power", 0.5))))
        mon = self.focused_monitor()
        for c in mon.get("clients", []):
            if not c.get("floating") or c.get("fullscreen"):
                continue
            addr = c["address"]
            if addr not in self.nudged:
                self.nudged[addr] = c["at"]
                self.journal.add("winpos", address=addr, at=c["at"])
            ox, oy = self.nudged[addr]
            import random
            dx, dy = random.randint(-1, 1) * int(4 + 14 * power), random.randint(-1, 1) * int(3 + 10 * power)
            hypr("dispatch", "movewindowpixel", f"exact {ox + dx} {oy + dy},address:{addr}")
            threading.Timer(0.12, lambda a=addr, x=ox, y=oy: hypr("dispatch", "movewindowpixel", f"exact {x} {y},address:{a}")).start()

    def restore_now(self):
        if self.notif_proc:
            self.notif_proc.terminate()
            self.notif_proc = None
        for addr, (x, y) in self.nudged.items():
            hypr("dispatch", "movewindowpixel", f"exact {x} {y},address:{addr}")
        self.nudged = {}


_current = {}


def handlers(sess, data):
    m = Merges(sess, data)
    _current["m"] = m
    return m.handlers()


def restore_now():
    m = _current.get("m")
    if m:
        m.restore_now()
