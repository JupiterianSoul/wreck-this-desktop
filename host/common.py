import json
import os
import shutil
import subprocess
import time
from pathlib import Path

HOME = Path.home()
ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
RUNTIME = Path(os.environ.get("WTD_RUNTIME_DIR") or Path(os.environ.get("XDG_RUNTIME_DIR") or f"/run/user/{os.getuid()}") / "wreck-this-desktop")
STATE = Path(os.environ.get("WTD_STATE_DIR") or HOME / ".local/state/wreck-this-desktop")
DATA = Path(os.environ.get("WTD_DATA_DIR") or HOME / ".local/share/wreck-this-desktop")
JOURNAL = STATE / "journal.json"
WRECKAGE = STATE / "wreckage.json"
LOCK = RUNTIME / "lock"
PANIC_KEY = "F12"
SELF = ROOT / "wreck-this-desktop"


def log(*a):
    if os.environ.get("WTD_QUIET"):
        return
    try:
        p = RUNTIME / "log.txt"
        RUNTIME.mkdir(parents=True, exist_ok=True)
        with open(p, "a") as f:
            f.write(time.strftime("%H:%M:%S ") + " ".join(str(x) for x in a) + "\n")
    except OSError:
        pass


def hyprctl_bin():
    return os.environ.get("WTD_HYPRCTL") or "hyprctl"


def hypr(*args, j=False, timeout=3):
    cmd = [hyprctl_bin()]
    if j:
        cmd.append("-j")
    cmd += list(args)
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except (OSError, subprocess.TimeoutExpired) as e:
        log("hyprctl failed", args, e)
        return None if j else ""
    if j:
        try:
            return json.loads(r.stdout)
        except ValueError:
            return None
    return r.stdout


def hypr_eval(lua):
    return hypr("eval", lua)


def lua_str(s):
    return '"' + str(s).replace("\\", "\\\\").replace('"', '\\"') + '"'


def pid_alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, ValueError, TypeError):
        return False


def read_json(p, default=None):
    try:
        return json.loads(Path(p).read_text())
    except (OSError, ValueError):
        return default


def write_json(p, data):
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(data))
    os.replace(tmp, p)


class Journal:
    def __init__(self, path=JOURNAL):
        self.path = Path(path)

    def load(self):
        return read_json(self.path, None)

    def start(self, session_dir):
        write_json(self.path, {"pid": os.getpid(), "session": str(session_dir), "entries": [], "t": time.time()})

    def add(self, kind, **data):
        j = self.load() or {"pid": os.getpid(), "session": "", "entries": []}
        j["entries"].append({"kind": kind, **data})
        write_json(self.path, j)

    def drop(self, kind, match=None):
        j = self.load()
        if not j:
            return
        j["entries"] = [e for e in j["entries"] if not (e["kind"] == kind and (match is None or all(e.get(k) == v for k, v in match.items())))]
        write_json(self.path, j)

    def entries(self, kind):
        j = self.load() or {}
        return [e for e in j.get("entries", []) if e["kind"] == kind]


def undo_entry(e):
    k = e["kind"]
    if k == "bind":
        hypr_eval(f"hl.unbind({lua_str(e['keys'])})")
    elif k == "winpos":
        addr = e["address"]
        clients = hypr("clients", j=True) or []
        cur = next((c for c in clients if c.get("address") == addr), None)
        if cur and cur.get("floating"):
            x, y = e["at"]
            hypr("dispatch", "movewindowpixel", f"exact {x} {y},address:{addr}")
    elif k == "workspace":
        wid = e.get("id")
        if isinstance(wid, int) and wid > 0:
            hypr("dispatch", "workspace", str(wid))
        elif e.get("name"):
            hypr("dispatch", "workspace", "name:" + str(e["name"]))
    elif k == "focus":
        addr = e.get("address")
        if addr:
            hypr("dispatch", "focuswindow", f"address:{addr}")


def restore(journal=None, reason=""):
    journal = journal or Journal()
    j = journal.load()
    if not j:
        return False
    log("restore", reason, len(j.get("entries", [])))
    order = {"bind": 0, "winpos": 1, "workspace": 2, "focus": 3}
    entries = list(j.get("entries", []))
    seen = set()
    for e in sorted(reversed(entries), key=lambda e: order.get(e["kind"], 9)):
        key = json.dumps(e, sort_keys=True)
        if key in seen:
            continue
        seen.add(key)
        if e["kind"] == "winpos":
            first = next((x for x in entries if x["kind"] == "winpos" and x["address"] == e["address"]), e)
            if first is not e:
                continue
        try:
            undo_entry(e)
        except Exception as ex:
            log("undo failed", e, ex)
    sess = j.get("session")
    if sess and Path(sess).is_dir() and str(Path(sess)).startswith(str(RUNTIME)):
        shutil.rmtree(sess, ignore_errors=True)
    try:
        journal.path.unlink()
    except OSError:
        pass
    return True


def stop_wreckage():
    w = read_json(WRECKAGE)
    if not w:
        return False
    pid = w.get("pid")
    if pid and pid_alive(pid):
        try:
            cmd = Path(f"/proc/{pid}/cmdline").read_bytes().decode(errors="ignore")
        except OSError:
            cmd = ""
        if "wreckage" in cmd:
            try:
                os.kill(int(pid), 15)
            except OSError:
                pass
    img = w.get("image")
    if img:
        try:
            Path(img).unlink()
        except OSError:
            pass
    try:
        WRECKAGE.unlink()
    except OSError:
        pass
    return True
