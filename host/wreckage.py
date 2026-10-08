import os
import signal
import sys
from pathlib import Path

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Gdk", "4.0")
from gi.repository import Gdk, GLib, Gtk

try:
    gi.require_version("Gtk4LayerShell", "1.0")
    from gi.repository import Gtk4LayerShell as LS
except (ValueError, ImportError):
    LS = None


def main(args):
    if not args or LS is None:
        return 1
    img = Path(args[0])
    mon_name = args[1] if len(args) > 1 else None
    if not img.exists():
        return 1
    app = Gtk.Application(application_id=None)

    def activate(a):
        win = Gtk.ApplicationWindow(application=a)
        LS.init_for_window(win)
        LS.set_namespace(win, "wreck-this-desktop-wreckage")
        LS.set_layer(win, LS.Layer.BOTTOM)
        for e in (LS.Edge.TOP, LS.Edge.BOTTOM, LS.Edge.LEFT, LS.Edge.RIGHT):
            LS.set_anchor(win, e, True)
        LS.set_exclusive_zone(win, -1)
        LS.set_keyboard_mode(win, LS.KeyboardMode.NONE)
        disp = Gdk.Display.get_default()
        mons = disp.get_monitors()
        for i in range(mons.get_n_items()):
            m = mons.get_item(i)
            if m.get_connector() == mon_name:
                LS.set_monitor(win, m)
        pic = Gtk.Picture.new_for_filename(str(img))
        pic.set_content_fit(Gtk.ContentFit.FILL)
        pic.set_can_shrink(True)
        win.set_child(pic)

        def no_input(w):
            try:
                import cairo
                w.get_surface().set_input_region(cairo.Region())
            except Exception:
                pass

        win.connect("realize", no_input)
        win.present()
        a.hold()

    app.connect("activate", activate)
    for s in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
        GLib.unix_signal_add(GLib.PRIORITY_HIGH, s, lambda *x: app.quit() or False)
    app.run([])
    try:
        img.unlink()
    except OSError:
        pass
    return 0
