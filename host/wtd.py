import fcntl
import json
import os
import select
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import (JOURNAL, LOCK, PANIC_KEY, RUNTIME, SELF, STATE, WRECKAGE, Journal, hypr, hypr_eval, log, lua_str,
                    pid_alive, read_json, restore, stop_wreckage)

TEST = bool(os.environ.get("WTD_TEST"))


def leftover():
    j = Journal().load()
    if j and not pid_alive(j.get("pid")):
        restore(reason="leftover")
    elif j and pid_alive(j.get("pid")) and j.get("pid") != os.getpid():
        try:
            cmd = Path(f"/proc/{j['pid']}/cmdline").read_bytes().decode(errors="ignore")
        except OSError:
            cmd = ""
        if "wtd.py" not in cmd:
            restore(reason="stale")


def lock():
    RUNTIME.mkdir(parents=True, exist_ok=True)
    os.chmod(RUNTIME, 0o700)
    fd = os.open(LOCK, os.O_CREAT | os.O_RDWR, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        os.close(fd)
        return None
    os.ftruncate(fd, 0)
    os.write(fd, str(os.getpid()).encode())
    return fd


def locked_screen():
    if TEST or os.environ.get("WTD_FIXTURE"):
        return False
    layers = hypr("layers", j=True) or {}
    for mon in layers.values():
        for items in (mon.get("levels") or {}).values():
            for it in items:
                if "lock" in str(it.get("namespace", "")).lower():
                    return True
    return False


def spawn_watchdog():
    env = dict(os.environ)
    return subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "watchdog", str(os.getpid())],
                            start_new_session=True, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env)


def cmd_run(args):
    fd = lock()
    if fd is None:
        log("already running")
        return 0
    if locked_screen():
        log("screen locked, not starting")
        return 0
    leftover()
    stop_wreckage()
    sess = RUNTIME / f"s-{os.getpid()}"
    sess.mkdir(parents=True, exist_ok=True)
    os.chmod(sess, 0o700)
    j = Journal()
    j.start(sess)
    spawn_watchdog()
    code = 0
    try:
        import capture
        data = capture.capture(sess)
        if not TEST and not os.environ.get("WTD_FIXTURE") and not os.environ.get("WTD_PROBE"):
            j.add("bind", keys=PANIC_KEY)
            hypr_eval(f"hl.bind({lua_str(PANIC_KEY)}, hl.dsp.exec_cmd({lua_str(str(SELF) + ' panic')}), {{ description = \"Wreck This Desktop panic\" }})")
        code = run_gui(sess, data)
    except Exception as e:
        log("run failed", repr(e))
        import traceback
        log(traceback.format_exc())
        code = 1
    finally:
        restore(j, reason="exit")
        shutil.rmtree(sess, ignore_errors=True)
    return code


def run_gui(sess, data):
    import gi
    gi.require_version("Gtk", "4.0")
    from gi.repository import GLib, Gtk
    import overlay
    import merges

    app = Gtk.Application(application_id=None)
    holder = {}

    def activate(a):
        ov = overlay.Overlay(a, sess, data, merges.handlers(sess, data))
        holder["ov"] = ov
        ov.build()
        a.hold()
        q = float(os.environ.get("WTD_AUTOQUIT", "0") or 0)
        if q > 0:
            GLib.timeout_add(int(q * 1000), lambda: a.quit() or False)

    app.connect("activate", activate)
    try:
        gi.require_version("GLibUnix", "2.0")
        from gi.repository import GLibUnix
        add_sig = GLibUnix.signal_add
    except (ValueError, ImportError):
        add_sig = GLib.unix_signal_add
    for s in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        add_sig(GLib.PRIORITY_HIGH, s, lambda *a: app.quit() or False)
    app.run([])
    return 0


def cmd_watchdog(args):
    pid = int(args[0])
    try:
        fd = os.pidfd_open(pid)
    except OSError:
        fd = None
    if fd is not None:
        p = select.poll()
        p.register(fd, select.POLLIN)
        while True:
            if p.poll(5000):
                break
            if not pid_alive(pid):
                break
    else:
        while pid_alive(pid):
            time.sleep(0.5)
    time.sleep(0.05)
    j = Journal().load()
    if j and j.get("pid") == pid:
        restore(reason="watchdog")
    sess = RUNTIME / f"s-{pid}"
    if sess.is_dir():
        shutil.rmtree(sess, ignore_errors=True)
    return 0


def cmd_panic(args):
    j = Journal().load()
    pid = j.get("pid") if j else None
    if not pid:
        try:
            pid = int(LOCK.read_text().strip())
        except (OSError, ValueError):
            pid = None
    if pid and pid_alive(pid):
        try:
            cmd = Path(f"/proc/{pid}/cmdline").read_bytes().decode(errors="ignore")
        except OSError:
            cmd = ""
        if "wtd.py" in cmd:
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass
            for _ in range(40):
                if not pid_alive(pid):
                    break
                time.sleep(0.025)
    restore(reason="panic")
    return 0


def cmd_restore(args):
    j = Journal().load()
    if j and pid_alive(j.get("pid")) and j.get("pid") != os.getpid():
        cmd_panic(args)
    else:
        restore(reason="manual")
    stop_wreckage()
    return 0


def cmd_status(args):
    j = Journal().load()
    print(json.dumps({"running": bool(j and pid_alive(j.get("pid"))), "journal": j, "wreckage": read_json(WRECKAGE)}, indent=2))
    return 0


def cmd_wreckage(args):
    import wreckage
    return wreckage.main(args)


def main():
    a = sys.argv[1:]
    cmd = a[0] if a else "run"
    fn = {"run": cmd_run, "watchdog": cmd_watchdog, "panic": cmd_panic, "restore": cmd_restore, "status": cmd_status, "wreckage": cmd_wreckage}.get(cmd)
    if not fn:
        print("usage: wreck-this-desktop [run | restore | panic | status]")
        return 2
    return fn(a[1:]) or 0


if __name__ == "__main__":
    sys.exit(main())
