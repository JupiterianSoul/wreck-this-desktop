import json
import os
import shutil
import socket
import subprocess
import time
import tomllib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from common import HOME, hypr, log, read_json

FIX = os.environ.get("WTD_FIXTURE")


def fixture(name):
    return read_json(Path(FIX) / f"{name}.json")


def query(name):
    if FIX:
        return fixture(name)
    return hypr(name, j=True)


def run(cmd, timeout=3):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout).stdout.strip()
    except (OSError, subprocess.TimeoutExpired):
        return ""


def theme_colors():
    p = HOME / ".local/state/omarchy/current/theme/colors.toml"
    if FIX:
        p = Path(FIX) / "colors.toml"
    try:
        data = tomllib.loads(p.read_text())
    except (OSError, tomllib.TOMLDecodeError):
        return {}
    return {k: v for k, v in data.items() if isinstance(v, str)}


def bar_layout():
    p = HOME / ".config/omarchy/shell.json"
    if FIX:
        p = Path(FIX) / "shell.json"
    d = read_json(p, {}) or {}
    lay = (d.get("bar") or {}).get("layout") or {}
    out = {}
    for side in ("left", "center", "right"):
        out[side] = [x.get("id", "") for x in lay.get(side, []) if isinstance(x, dict)]
    return out


def keyboard_layout():
    if FIX:
        return (fixture("devices") or {}).get("layout", "fr")
    d = hypr("devices", j=True) or {}
    kbs = d.get("keyboards") or []
    main = next((k for k in kbs if k.get("main")), kbs[0] if kbs else {})
    lay = str(main.get("layout") or "us").split(",")[0]
    return lay


def battery_mode():
    if FIX:
        return os.environ.get("WTD_BATTERY", "balanced")
    out = run(["jupiterian-battery", "status"])
    return (out.split() or ["balanced"])[0].lower()


def font_name():
    if FIX:
        return "monospace"
    return run(["omarchy-font-current"]) or "monospace"


def visible_clients(clients, mon):
    ws = (mon.get("activeWorkspace") or {}).get("id")
    sp = (mon.get("specialWorkspace") or {}).get("id") or 0
    out = []
    for c in clients or []:
        if not c.get("mapped", True) or c.get("hidden"):
            continue
        wid = (c.get("workspace") or {}).get("id")
        on = c.get("monitor") == mon.get("id")
        if wid == ws or (sp and wid == sp) or (c.get("pinned") and on):
            out.append(c)
    return out


def layers_for(layers, mon):
    d = (layers or {}).get(mon["name"]) or {}
    out = []
    for lvl, items in (d.get("levels") or {}).items():
        for it in items:
            out.append({**it, "level": int(lvl)})
    return out


def grim(mon, path):
    if FIX:
        src = Path(FIX) / f"shot-{mon['name']}.png"
        shutil.copy(src, path)
        return True
    r = subprocess.run(["grim", "-o", mon["name"], "-t", "png", "-l", "0", str(path)], capture_output=True, timeout=5)
    return r.returncode == 0 and Path(path).exists()


def live_wallpaper_frame(path):
    rt = Path(os.environ.get("XDG_RUNTIME_DIR", "/tmp"))
    sock_path = rt / "ls-wallpaper.sock"
    if not sock_path.exists():
        return False
    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.settimeout(1.5)
        s.connect(str(sock_path))
        s.sendall((json.dumps({"command": ["screenshot-to-file", str(path), "window"], "request_id": 7}) + "\n").encode())
        buf = b""
        t0 = time.time()
        while time.time() - t0 < 1.5:
            buf += s.recv(4096)
            if b'"request_id":7' in buf:
                break
        s.close()
    except OSError as e:
        log("mpv frame failed", e)
        return False
    for _ in range(30):
        if Path(path).exists() and Path(path).stat().st_size > 0:
            return True
        time.sleep(0.02)
    return False


def wallpaper(sess, mon):
    out = sess / f"wall-{mon['name']}.png"
    if FIX:
        src = Path(FIX) / "wallpaper.png"
        if src.exists():
            shutil.copy(src, out)
            return out.name
        return None
    try:
        live = run(["ls-live-wallpaper", "status"]) == "on"
    except Exception:
        live = False
    if live and live_wallpaper_frame(out):
        return out.name
    bg = HOME / ".local/state/omarchy/current/background"
    try:
        real = bg.resolve()
        if real.exists():
            dst = sess / ("wall-" + mon["name"] + real.suffix.lower())
            shutil.copy(real, dst)
            return dst.name
    except OSError:
        pass
    return None


def option(name, default):
    if FIX:
        return (fixture("options") or {}).get(name, default)
    d = hypr("getoption", name, j=True) or {}
    if "int" in d:
        return d["int"]
    if "float" in d:
        return d["float"]
    if "custom" in d:
        return d["custom"]
    return default


def capture(sess, suffix=""):
    t0 = time.time()
    mons = [m for m in (query("monitors") or []) if not m.get("disabled")]
    if not mons:
        raise RuntimeError("no monitors")
    focused = next((m for m in mons if m.get("focused")), mons[0])
    procs = []
    shots = {}
    for m in mons:
        p = sess / f"shot-{m['name']}{suffix}.png"
        shots[m["name"]] = p.name
        if FIX:
            grim(m, p)
        else:
            procs.append(subprocess.Popen(["grim", "-o", m["name"], "-t", "png", "-l", "0", str(p)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL))
    # Everything else is independent, so ask for it while grim works
    with ThreadPoolExecutor(max_workers=12) as ex:
        jobs = {k: ex.submit(f) for k, f in {
            "clients": lambda: query("clients") or [], "layers": lambda: query("layers") or {}, "active": lambda: query("activewindow") or {},
            "gaps": lambda: option("general:gaps_out", 8), "border": lambda: option("general:border_size", 2), "rounding": lambda: option("decoration:rounding", 0),
            "theme": theme_colors, "font": font_name, "layout": keyboard_layout, "battery": battery_mode, "bar": bar_layout,
        }.items()}
        for pr in procs:
            try:
                pr.wait(timeout=5)
            except subprocess.TimeoutExpired:
                pr.kill()
        t_shot = time.time()
        got = {k: j.result() for k, j in jobs.items()}
    clients, layers, active = got["clients"], got["layers"], got["active"]
    gaps = got["gaps"]
    if isinstance(gaps, str):
        try:
            gaps = int(gaps.split()[0])
        except (ValueError, IndexError):
            gaps = 8
    monitors = []
    for m in mons:
        scale = float(m.get("scale") or 1)
        lw = round(m["width"] / scale) if m.get("transform", 0) in (0, 2, 4, 6) else round(m["height"] / scale)
        lh = round(m["height"] / scale) if m.get("transform", 0) in (0, 2, 4, 6) else round(m["width"] / scale)
        monitors.append({
            "id": m.get("id"), "name": m["name"], "x": m.get("x", 0), "y": m.get("y", 0), "w": lw, "h": lh,
            "pw": m["width"], "ph": m["height"], "scale": scale, "refresh": m.get("refreshRate", 60),
            "focused": m is focused, "workspace": m.get("activeWorkspace") or {}, "special": m.get("specialWorkspace") or {},
            "reserved": m.get("reserved") or [0, 0, 0, 0],
            "shot": shots[m["name"]],
            "clients": visible_clients(clients, m),
            "layers": layers_for(layers, m),
        })
    fm = next(x for x in monitors if x["focused"])
    fm["wallpaper"] = None
    data = {
        "v": 1,
        "t": time.time(),
        "monitors": monitors,
        "focused": fm["name"],
        "active": active.get("address") if isinstance(active, dict) else None,
        "border": got["border"],
        "rounding": got["rounding"],
        "gaps": gaps,
        "theme": got["theme"],
        "font": got["font"],
        "layout": got["layout"],
        "battery": got["battery"],
        "bar": got["bar"],
        "timing": {"shot": round((t_shot - t0) * 1000), "total": round((time.time() - t0) * 1000)},
    }
    (sess / "session.json").write_text(json.dumps(data))
    log("capture", data["timing"])
    return data
