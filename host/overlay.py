import json
import mimetypes
import os
import threading
import time
from pathlib import Path

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Gdk", "4.0")
gi.require_version("WebKit", "6.0")
from gi.repository import Gdk, Gio, GLib, Gtk, WebKit

try:
    gi.require_version("Gtk4LayerShell", "1.0")
    from gi.repository import Gtk4LayerShell as LS
except (ValueError, ImportError):
    LS = None

from common import DATA, WEB, log, read_json, write_json

TEST = bool(os.environ.get("WTD_TEST"))
MIME = {".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf"}
CSS = b"window, window.background { background: transparent; } webview { background: transparent; }"


def layer_ok():
    return LS is not None and not TEST and LS.is_supported()


class Overlay:
    def __init__(self, app, sess, data, handlers):
        self.app = app
        self.sess = Path(sess)
        self.data = data
        self.handlers = handlers
        self.windows = []
        self.view = None
        self.t0 = time.time()
        self.shown = False
        self.wall = None
        self.wall_done = False
        self.wall_want = False
        self.under = None

    def gdk_monitor(self, name):
        disp = Gdk.Display.get_default()
        mons = disp.get_monitors()
        for i in range(mons.get_n_items()):
            m = mons.get_item(i)
            if m.get_connector() == name:
                return m
        return None

    def make_window(self, mon, game):
        win = Gtk.ApplicationWindow(application=self.app)
        win.set_decorated(False)
        win.set_title("Wreck This Desktop")
        if layer_ok():
            LS.init_for_window(win)
            LS.set_namespace(win, "wreck-this-desktop")
            probe = bool(os.environ.get("WTD_PROBE"))
            LS.set_layer(win, LS.Layer.BACKGROUND if probe else LS.Layer.OVERLAY)
            for e in (LS.Edge.TOP, LS.Edge.BOTTOM, LS.Edge.LEFT, LS.Edge.RIGHT):
                LS.set_anchor(win, e, True)
            LS.set_exclusive_zone(win, -1)
            LS.set_keyboard_mode(win, LS.KeyboardMode.EXCLUSIVE if game and not probe else LS.KeyboardMode.NONE)
            if probe:
                win.connect("realize", self.no_input)
            gm = self.gdk_monitor(mon["name"])
            if gm:
                LS.set_monitor(win, gm)
        else:
            win.set_default_size(int(os.environ.get("WTD_TEST_W", mon["w"])), int(os.environ.get("WTD_TEST_H", mon["h"])))
        return win

    def log_scale(self, win):
        try:
            surf = win.get_surface()
            log("surface scale", surf.get_scale(), "factor", surf.get_scale_factor(), "widget", win.get_scale_factor(), "size", surf.get_width(), surf.get_height(), "renderer", type(win.get_renderer()).__name__)
        except Exception as e:
            log("scale log failed", e)
        return False

    def no_input(self, win):
        try:
            import cairo
            surf = win.get_surface()
            if surf:
                surf.set_input_region(cairo.Region())
        except Exception as e:
            log("input region failed", e)

    def build(self):
        prov = Gtk.CssProvider()
        prov.load_from_data(CSS)
        Gtk.StyleContext.add_provider_for_display(Gdk.Display.get_default(), prov, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)
        focused = self.data["focused"]
        for mon in self.data["monitors"]:
            game = mon["name"] == focused
            if not game and not layer_ok():
                continue
            win = self.make_window(mon, game)
            if game:
                view = self.make_view(mon)
                if layer_ok():
                    ov = Gtk.Overlay()
                    self.under = Gtk.Picture.new_for_filename(str(self.sess / mon["shot"]))
                    self.under.set_content_fit(Gtk.ContentFit.FILL)
                    self.under.set_can_shrink(True)
                    ov.set_child(self.under)
                    ov.add_overlay(view)
                    win.set_child(ov)
                else:
                    win.set_child(view)
            else:
                pic = Gtk.Picture.new_for_filename(str(self.sess / mon["shot"]))
                pic.set_content_fit(Gtk.ContentFit.FILL)
                pic.set_can_shrink(True)
                win.set_child(pic)
            win.present()
            self.windows.append(win)
            GLib.timeout_add(1500, self.log_scale, win)
        if self.view:
            self.view.grab_focus()
        threading.Thread(target=self.fetch_wallpaper, daemon=True).start()

    def make_view(self, mon):
        ctx = WebKit.WebContext.new()
        ctx.register_uri_scheme("wtd", self.on_scheme)
        sm = ctx.get_security_manager()
        sm.register_uri_scheme_as_secure("wtd")
        sm.register_uri_scheme_as_cors_enabled("wtd")
        ucm = WebKit.UserContentManager()
        ucm.register_script_message_handler("wtd", None)
        ucm.connect("script-message-received::wtd", self.on_message)
        view = WebKit.WebView(web_context=ctx, user_content_manager=ucm)
        st = view.get_settings()
        for k, v in (("enable-developer-extras", bool(os.environ.get("WTD_DEVTOOLS"))),
                     ("enable-write-console-messages-to-stdout", True),
                     ("media-playback-requires-user-gesture", False),
                     ("enable-webgl", True),
                     ("enable-webaudio", True),
                     ("enable-back-forward-navigation-gestures", False),
                     ("enable-smooth-scrolling", False)):
            try:
                st.set_property(k, v)
            except TypeError:
                pass
        try:
            st.set_hardware_acceleration_policy(WebKit.HardwareAccelerationPolicy.ALWAYS)
        except Exception:
            pass
        view.set_background_color(Gdk.RGBA(0, 0, 0, 0))
        view.connect("context-menu", lambda *a: True)
        view.connect("web-process-terminated", self.on_crash)
        q = "?mon=" + mon["name"]
        if TEST:
            q += "&test=1"
        if os.environ.get("WTD_PROBE"):
            q += "&probe=1"
        if layer_ok():
            q += "&under=1"
        view.load_uri("wtd://game/index.html" + q)
        view.set_hexpand(True)
        view.set_vexpand(True)
        self.view = view
        return view

    def on_crash(self, view, reason):
        log("web process terminated", reason)
        self.app.quit()

    def serve(self, path):
        path = path.lstrip("/")
        if path.startswith("session/"):
            name = os.path.basename(path)
            if name == "save.json":
                f = DATA / "save.json"
                return (f.read_bytes() if f.exists() else b"{}"), "application/json"
            f = self.sess / name
        else:
            f = (WEB / path).resolve()
            if not str(f).startswith(str(WEB)):
                return None, None
        if not f.is_file():
            return None, None
        return f.read_bytes(), MIME.get(f.suffix.lower()) or mimetypes.guess_type(str(f))[0] or "application/octet-stream"

    def on_scheme(self, req):
        path = req.get_path() or "/"
        body, mime = self.serve(path)
        if body is None:
            req.finish_error(GLib.Error.new_literal(GLib.quark_from_string("wtd"), "not found " + path, 404))
            return
        stream = Gio.MemoryInputStream.new_from_bytes(GLib.Bytes.new(body))
        resp = WebKit.URISchemeResponse.new(stream, len(body))
        resp.set_content_type(mime)
        req.finish_with_response(resp)

    def js(self, code):
        if self.view:
            self.view.evaluate_javascript(code, -1, None, None, None, None, None)

    def on_message(self, ucm, value):
        try:
            msg = json.loads(value.to_json(0))
        except Exception as e:
            log("bad message", e)
            return
        t = msg.get("t")
        if t == "log":
            log("page:", msg.get("msg"))
        elif t == "shown":
            self.shown = True
            log("shown after", round((time.time() - self.t0) * 1000), "ms")
        elif t == "save":
            write_json(DATA / "save.json", msg.get("data") or {})
        elif t == "want-wallpaper":
            self.wall_want = True
            if self.wall_done:
                self.send_wallpaper()
        elif t == "under":
            if self.under:
                self.under.set_visible(bool(msg.get("on")))
        elif t == "quit":
            log("quit from page", msg.get("why"))
            self.app.quit()
        else:
            h = self.handlers.get(t)
            if h:
                try:
                    h(msg, self)
                except Exception as e:
                    log("handler failed", t, e)

    def fetch_wallpaper(self):
        from capture import wallpaper
        fm = next(m for m in self.data["monitors"] if m["focused"])
        try:
            name = wallpaper(self.sess, fm)
        except Exception as e:
            log("wallpaper failed", e)
            name = None
        fm["wallpaper"] = name
        self.wall = name
        GLib.idle_add(self.wall_ready)

    def wall_ready(self):
        self.wall_done = True
        if self.wall_want:
            self.send_wallpaper()
        return False

    def send_wallpaper(self):
        self.js(f"window.WTD && WTD.onWallpaper && WTD.onWallpaper({json.dumps(self.wall)})")

    def hide(self, on):
        for w in self.windows:
            w.set_visible(not on)
