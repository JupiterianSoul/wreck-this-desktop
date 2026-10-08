import os, sys, json, threading, subprocess, tempfile, http.server, functools
import gi
gi.require_version('Gtk', '4.0'); gi.require_version('WebKit', '6.0')
from gi.repository import Gtk, WebKit, GLib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = sys.argv[1]
JS = sys.argv[2] if len(sys.argv) > 2 else "__wtd.step(60); WTP.game.stopLoop(); __wtd.tp(120, 380); __wtd.setAim(1,-0.2); __wtd.step(30); WTP.game.renderNow(); 1"
tmp = tempfile.mkdtemp(); sess = os.path.join(tmp, 'session')
subprocess.run(['python3', os.path.join(ROOT, 'tools/fixture_session.py'), 'tiled3', sess], check=True)
class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, p):
        p = p.split('?')[0]
        if p.startswith('/session/'): return os.path.join(sess, os.path.basename(p))
        return os.path.join(ROOT, 'web', p.lstrip('/') or 'index.html')
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
threading.Thread(target=srv.serve_forever, daemon=True).start()
RES = {}
app = Gtk.Application(application_id='wtd.probe')
def ev(wv, js, cb):
    wv.evaluate_javascript(js, -1, None, None, None, lambda w, r: cb(w.evaluate_javascript_finish(r).to_string()))
def on_act(app):
    win = Gtk.ApplicationWindow(application=app); win.set_default_size(1600, 1000)
    wv = WebKit.WebView(); win.set_child(wv); win.present()
    wv.load_uri(f'http://127.0.0.1:{srv.server_address[1]}/index.html?mon=eDP-2&test=1')
    def poll():
        def got(v):
            if v == 'true':
                ev(wv, JS, lambda r: (print('result', r), GLib.timeout_add(500, lambda: snap(wv))))
            else: GLib.timeout_add(300, poll)
        ev(wv, '!!(window.WTD && WTD.ready)', got); return False
    def snap(wv):
        def done(w, r):
            tex = w.get_snapshot_finish(r); tex.save_to_png(OUT)
            ev(wv, 'JSON.stringify(WTD.errors)', lambda e: (print('errors', e), RES.update(errors=e), app.quit()))
        wv.get_snapshot(WebKit.SnapshotRegion.VISIBLE, WebKit.SnapshotOptions.NONE, None, done); return False
    GLib.timeout_add(1500, poll)
    GLib.timeout_add(60000, app.quit)
app.connect('activate', on_act); app.run([])
if len(sys.argv) > 3 and sys.argv[3] == 'check':
    from PIL import Image
    im = Image.open(OUT).convert('RGB')
    k = im.width / 640
    box = im.crop((int(270 * k), int(110 * k), int(340 * k), int(180 * k)))
    bright = sum(1 for p in box.getdata() if min(p) > 200)
    ok = bright > 40 and RES.get('errors') == '[]'
    print('player pixels', bright, 'PASS webkit' if ok else 'FAIL webkit')
    sys.exit(0 if ok else 1)
