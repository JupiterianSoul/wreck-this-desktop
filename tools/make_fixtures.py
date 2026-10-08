import json
import math
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
SCALE = 1.6
LW, LH = 1600, 1000
PW, PH = 2560, 1600
BAR = 26
GAP = 8
BORDER = 2
ROUND = 10
MONO = "/usr/share/fonts/Adwaita/AdwaitaMono-Regular.ttf"
MONOB = "/usr/share/fonts/Adwaita/AdwaitaMono-Bold.ttf"
SANS = "/usr/share/fonts/Adwaita/AdwaitaSans-Regular.ttf"
SERIF = "/usr/share/fonts/noto/NotoSerif-Regular.ttf"

CODE = """import { world } from './world.js';

export function carve(cx, cy, r, opts = {}) {
  const pow = opts.pow ?? 1 + r * 0.22;
  let n = 0;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      n += world.kill(x, y, pow);
    }
  }
  return n;
}

function shatter(group, force) {
  for (const cell of group.cells) {
    spawnShard(cell.x, cell.y, force * Math.random());
  }
  group.dead = true;
}

export default { carve, shatter };
""".splitlines()

TERM = """player@desktop ~ $ ls -la
total 128
drwxr-xr-x  1 player users   1176 Oct  8 18:41 .
drwxr-xr-x  1 root   root      28 Sep 12 10:02 ..
-rw-r--r--  1 player users   4210 Oct  8 18:35 PLAN.md
drwxr-xr-x  1 player users     82 Oct  8 18:42 host
drwxr-xr-x  1 player users     56 Oct  8 18:42 web
player@desktop ~ $ uptime
 18:44:02 up 3 days,  4:12,  1 user,  load average: 0.42, 0.51, 0.48
player@desktop ~ $ echo "wreck it"
wreck it
player@desktop ~ $ _""".splitlines()

ARTICLE = [
    ("h1", "The Quiet Art of Breaking Things"),
    ("p", "Every interface is a small building. It has floors made of text, walls made of"),
    ("p", "panels, and a foundation of pixels that nobody looks at until it cracks."),
    ("p", "Designers spend weeks aligning buttons to a grid, and then one stray click"),
    ("p", "sends the whole layout tumbling down like a stack of plates."),
    ("img", ""),
    ("h2", "Why we like to watch it fall"),
    ("p", "There is a strange comfort in watching something orderly come apart, as long"),
    ("p", "as it is not your own work. Demolition videos get millions of views."),
]


def L(v):
    return int(round(v * SCALE))


def font(path, size):
    return ImageFont.truetype(path, L(size))


def rr(d, box, r, fill, outline=None, width=0):
    d.rounded_rectangle([L(box[0]), L(box[1]), L(box[0] + box[2]) - 1, L(box[1] + box[3]) - 1], radius=L(r), fill=fill, outline=outline, width=width)


def wallpaper(seed=3):
    rnd = random.Random(seed)
    img = Image.new("RGB", (PW, PH))
    px = img.load()
    for y in range(0, PH, 2):
        for x in range(0, PW, 2):
            t = y / PH
            v = 18 + int(30 * t) + int(14 * math.sin(x / 210.0) * math.cos(y / 170.0))
            c = (v, v + 2, v + 6)
            px[x, y] = c
            px[x + 1, y] = c
            px[x, y + 1] = c
            px[x + 1, y + 1] = c
    d = ImageDraw.Draw(img)
    for _ in range(14):
        cx, cy, r = rnd.randint(0, PW), rnd.randint(0, PH), rnd.randint(80, 360)
        g = rnd.randint(40, 90)
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(g, g, g + 8), width=rnd.randint(3, 10))
    return img.filter(ImageFilter.GaussianBlur(1.2))


def draw_bar(img, widgets):
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, PW, L(BAR) - 1], fill=(18, 18, 19))
    f = font(SANS, 12)
    fm = font(MONOB, 12)
    out = []
    x = 10
    for wid, label in widgets["left"]:
        tw = d.textlength(label, font=fm)
        d.text((L(x), L(6)), label, font=fm, fill=(204, 204, 204))
        out.append({"id": wid, "x": x, "w": tw / SCALE})
        x += tw / SCALE + 18
    cx = LW / 2
    total = sum(d.textlength(l, font=f) / SCALE + 18 for _, l in widgets["center"])
    x = cx - total / 2
    for wid, label in widgets["center"]:
        tw = d.textlength(label, font=f)
        d.text((L(x), L(6)), label, font=f, fill=(220, 220, 220))
        x += tw / SCALE + 18
    x = LW - 10
    for wid, label in reversed(widgets["right"]):
        tw = d.textlength(label, font=fm)
        x -= tw / SCALE
        d.text((L(x), L(6)), label, font=fm, fill=(204, 204, 204))
        x -= 18
    return out


def border(img, c, active):
    d = ImageDraw.Draw(img)
    x, y = c["at"]
    w, h = c["size"]
    col = (143, 138, 130) if active else (42, 44, 49)
    rr(d, (x - BORDER, y - BORDER, w + 2 * BORDER, h + 2 * BORDER), ROUND + BORDER, col)


def window_base(img, c, bg, active):
    border(img, c, active)
    d = ImageDraw.Draw(img)
    x, y = c["at"]
    w, h = c["size"]
    rr(d, (x, y, w, h), ROUND, bg)
    return d


def clip_to(img, c, draw_fn):
    x, y = c["at"]
    w, h = c["size"]
    layer = img.copy()
    draw_fn(layer)
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([L(x), L(y), L(x + w) - 1, L(y + h) - 1], radius=L(ROUND), fill=255)
    img.paste(layer, (0, 0), mask)


def editor(img, c, active, truth):
    x, y = c["at"]
    w, h = c["size"]
    window_base(img, c, (30, 31, 34), active)

    def fn(layer):
        d = ImageDraw.Draw(layer)
        d.rectangle([L(x), L(y), L(x + w), L(y + 35)], fill=(24, 24, 26))
        tf = font(SANS, 12)
        d.text((L(x + w / 2 - 120), L(y + 10)), "world.js - wreck-this-desktop - Code", font=tf, fill=(170, 170, 170))
        d.rectangle([L(x), L(y + 35), L(x + 48), L(y + h)], fill=(24, 24, 26))
        for k in range(5):
            d.rounded_rectangle([L(x + 14), L(y + 52 + k * 46), L(x + 34), L(y + 72 + k * 46)], radius=L(3), outline=(120, 120, 125), width=L(2))
        d.rectangle([L(x + 48), L(y + 35), L(x + 260), L(y + h)], fill=(26, 27, 29))
        sf = font(SANS, 13)
        for k, name in enumerate(["host", "web", "desk", "tests", "tools", "PLAN.md", "README.md", "game.json", "wreck-this-desktop"]):
            d.text((L(x + 64 + (12 if k in (2,) else 0)), L(y + 50 + k * 22)), name, font=sf, fill=(190, 190, 192))
        mf = font(MONO, 14)
        colors = [(204, 204, 204), (166, 156, 134), (143, 180, 214), (190, 130, 160), (150, 190, 140)]
        lines = 0
        for k, line in enumerate(CODE):
            ly = y + 50 + k * 20
            if ly + 20 > y + h - 10:
                break
            d.text((L(x + 270), L(ly)), f"{k + 1:>3}", font=mf, fill=(90, 92, 98))
            col = colors[(k * 7) % len(colors)] if line.strip() else colors[0]
            d.text((L(x + 320), L(ly)), line, font=mf, fill=col)
            if line.strip():
                lines += 1
        truth["editor_lines"] = lines
    clip_to(img, c, fn)


def terminal(img, c, active, truth):
    x, y = c["at"]
    w, h = c["size"]
    window_base(img, c, (12, 12, 13), active)

    def fn(layer):
        d = ImageDraw.Draw(layer)
        mf = font(MONO, 13)
        n = 0
        for k, line in enumerate(TERM):
            ly = y + 10 + k * 19
            if ly + 19 > y + h:
                break
            col = (234, 234, 234) if "$" in line else (204, 204, 204)
            d.text((L(x + 12), L(ly)), line[: int((w - 24) / 7.9)], font=mf, fill=col)
            n += 1
        truth["term_lines"] = n
    clip_to(img, c, fn)


def browser(img, c, active, truth):
    x, y = c["at"]
    w, h = c["size"]
    window_base(img, c, (250, 249, 246), active)

    def fn(layer):
        d = ImageDraw.Draw(layer)
        d.rectangle([L(x), L(y), L(x + w), L(y + 40)], fill=(32, 33, 36))
        d.rounded_rectangle([L(x + 8), L(y + 6), L(x + 200), L(y + 34)], radius=L(6), fill=(53, 54, 58))
        d.text((L(x + 20), L(y + 13)), "Breaking Things", font=font(SANS, 12), fill=(232, 232, 232))
        d.rectangle([L(x), L(y + 40), L(x + w), L(y + 76)], fill=(53, 54, 58))
        d.rounded_rectangle([L(x + 60), L(y + 46), L(x + w - 60), L(y + 70)], radius=L(12), fill=(32, 33, 36))
        d.text((L(x + 76), L(y + 50)), "zoble.app/blog/breaking-things", font=font(SANS, 12), fill=(200, 200, 200))
        cy = y + 96
        words = 0
        for kind, text in ARTICLE:
            if cy > y + h - 30:
                break
            if kind == "h1":
                f = font(SERIF, 26)
                d.text((L(x + 40), L(cy)), text, font=f, fill=(20, 20, 22))
                cy += 44
            elif kind == "h2":
                f = font(SERIF, 20)
                d.text((L(x + 40), L(cy)), text, font=f, fill=(20, 20, 22))
                cy += 34
            elif kind == "p":
                f = font(SERIF, 15)
                d.text((L(x + 40), L(cy)), text, font=f, fill=(48, 48, 52))
                cy += 24
            elif kind == "img":
                iw, ih = min(w - 80, 420), 120
                for yy in range(L(ih)):
                    t = yy / L(ih)
                    d.line([L(x + 40), L(cy) + yy, L(x + 40 + iw), L(cy) + yy], fill=(int(210 - 90 * t), int(120 + 60 * t), int(80 + 140 * t)))
                d.ellipse([L(x + 40 + iw * 0.6), L(cy + 20), L(x + 40 + iw * 0.6 + 50), L(cy + 70)], fill=(250, 220, 120))
                d.polygon([(L(x + 40), L(cy + ih)), (L(x + 40 + iw * 0.35), L(cy + 50)), (L(x + 40 + iw * 0.7), L(cy + ih))], fill=(40, 60, 70))
                truth["image"] = [x + 40, cy, iw, ih]
                cy += ih + 20
            words += len(text.split())
        truth["browser_words"] = words
    clip_to(img, c, fn)


def viewer(img, c, active, truth):
    x, y = c["at"]
    w, h = c["size"]
    window_base(img, c, (0, 0, 0), active)

    def fn(layer):
        d = ImageDraw.Draw(layer)
        for yy in range(L(y), L(y + h)):
            t = (yy - L(y)) / L(h)
            d.line([L(x), yy, L(x + w), yy], fill=(int(40 + 120 * t), int(30 + 40 * t), int(90 - 40 * t)))
        for k in range(30):
            rx = x + (k * 97) % w
            d.ellipse([L(rx), L(y + h * 0.6), L(rx + 60), L(y + h * 0.6 + 60)], fill=(220, 180 - k * 3, 90))
    clip_to(img, c, fn)


def client(addr, cls, title, at, size, ws=1, floating=False, fullscreen=0, focus=0, monitor=0, pinned=False):
    return {"address": addr, "mapped": True, "hidden": False, "at": list(at), "size": list(size), "workspace": {"id": ws, "name": str(ws)},
            "floating": floating, "pseudo": False, "monitor": monitor, "class": cls, "title": title, "initialClass": cls, "initialTitle": title,
            "pid": 1000 + int(addr, 16) % 1000, "xwayland": False, "pinned": pinned, "fullscreen": fullscreen, "fullscreenClient": fullscreen,
            "grouped": [], "tags": [], "swallowing": "0x0", "focusHistoryID": focus}


def monitors(ws=1):
    return [{"id": 0, "name": "eDP-2", "description": "Fixture panel", "width": PW, "height": PH, "refreshRate": 165.0, "x": 0, "y": 0,
             "activeWorkspace": {"id": ws, "name": str(ws)}, "specialWorkspace": {"id": 0, "name": ""}, "reserved": [0, BAR, 0, 0],
             "scale": SCALE, "transform": 0, "focused": True, "dpmsStatus": True, "vrr": False, "disabled": False}]


def layers():
    return {"eDP-2": {"levels": {"0": [{"address": "0xb1", "x": 0, "y": 0, "w": LW, "h": LH, "namespace": "omarchy-background", "pid": 1}],
                                 "1": [], "2": [{"address": "0xb2", "x": 0, "y": 0, "w": LW, "h": BAR, "namespace": "omarchy-bar", "pid": 2}], "3": []}}}


BAR_WIDGETS = {
    "left": [("omarchy.menu", "◆"), ("user.workspaces", "1 2 3 4 5"), ("user.spotify", "♫ Lorna Shore - Pain Remains"), ("user.games", "▣"), ("io.github.twiking.omasettings", "⚙")],
    "center": [("omarchy.indicators", "●"), ("tmn73.calendar", "Thu 8 Oct 18:44"), ("omarchy.weather", "14°")],
    "right": [("jankeesvw.notification-center", "✉"), ("omarchy.network", "▲"), ("omarchy.battery", "87%")],
}
SHELL = {"bar": {"layout": {s: [{"id": i} for i, _ in BAR_WIDGETS[s]] for s in BAR_WIDGETS}}}
COLORS = 'mode = "dark"\naccent = "#d8d8d8"\nbackground = "#121213"\nforeground = "#CCCCCC"\nselection = "#3a3b3e"\nmuted = "#2c2d30"\nred = "#bdbdbd"\nyellow = "#A69C86"\n'


def scene(name, wins, ws=1):
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    wall = wallpaper()
    wall.save(d / "wallpaper.png")
    img = wall.copy()
    truth = {}
    clients = []
    order = sorted(wins, key=lambda w: (w["fullscreen"] > 0, w["floating"]))
    for k, wdef in enumerate(order):
        c = client(wdef["addr"], wdef["cls"], wdef["title"], wdef["at"], wdef["size"], ws=ws, floating=wdef["floating"], fullscreen=wdef["fullscreen"], focus=wdef.get("focus", k))
        clients.append(c)
        active = wdef.get("active", False)
        {"editor": editor, "terminal": terminal, "browser": browser, "viewer": viewer}[wdef["kind"]](img, c, active, truth)
    if not any(w["fullscreen"] for w in wins):
        draw_bar(img, BAR_WIDGETS)
    img.save(d / "shot-eDP-2.png", compress_level=1)
    act = next((w for w in wins if w.get("active")), wins[0])
    (d / "monitors.json").write_text(json.dumps(monitors(ws)))
    (d / "clients.json").write_text(json.dumps(clients))
    (d / "layers.json").write_text(json.dumps(layers()))
    (d / "activewindow.json").write_text(json.dumps({"address": act["addr"], "class": act["cls"]}))
    (d / "options.json").write_text(json.dumps({"general:border_size": BORDER, "decoration:rounding": ROUND, "general:gaps_out": GAP}))
    (d / "devices.json").write_text(json.dumps({"layout": "fr"}))
    (d / "colors.toml").write_text(COLORS)
    (d / "shell.json").write_text(json.dumps(SHELL))
    (d / "truth.json").write_text(json.dumps(truth))
    print(name, truth)


def W(addr, kind, cls, title, at, size, floating=False, fullscreen=0, active=False, focus=0):
    return {"addr": addr, "kind": kind, "cls": cls, "title": title, "at": at, "size": size, "floating": floating, "fullscreen": fullscreen, "active": active, "focus": focus}


def main():
    top = BAR + GAP + BORDER
    full_h = LH - top - GAP - BORDER
    left_w = 940
    right_x = 10 + left_w + 2 * BORDER + GAP
    right_w = LW - right_x - GAP - BORDER
    half = (full_h - GAP - 2 * BORDER) // 2
    scene("tiled3", [
        W("0x101", "editor", "com.microsoft.VSCode", "world.js - wreck-this-desktop - Visual Studio Code", (10, top), (left_w, full_h), active=True, focus=0),
        W("0x102", "terminal", "Alacritty", "player@desktop: ~", (right_x, top), (right_w, half), focus=1),
        W("0x103", "browser", "chromium", "Breaking Things - Chromium", (right_x, top + half + GAP + 2 * BORDER), (right_w, full_h - half - GAP - 2 * BORDER), focus=2),
    ])
    scene("floating", [
        W("0x201", "browser", "chromium", "Breaking Things - Chromium", (10, top), (LW - 20, full_h), focus=1),
        W("0x202", "terminal", "Alacritty", "player@desktop: ~", (520, 300), (620, 380), floating=True, active=True, focus=0),
    ])
    scene("fullscreen", [
        W("0x301", "viewer", "mpv", "sunset.mkv - mpv", (0, 0), (LW, LH), fullscreen=2, active=True),
    ])
    scene("single", [
        W("0x401", "editor", "dev.zed.Zed", "world.js - Zed", (10, top), (LW - 20, full_h), active=True),
    ])


if __name__ == "__main__":
    main()
