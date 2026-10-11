import ctypes
import ctypes.util
import json
import sys

lib = ctypes.util.find_library("X11")
if not lib:
    print(json.dumps({"windows": []}))
    sys.exit(0)
X = ctypes.cdll.LoadLibrary(lib)

Window = ctypes.c_ulong
Atom = ctypes.c_ulong


class Attrs(ctypes.Structure):
    _fields_ = [("x", ctypes.c_int), ("y", ctypes.c_int), ("width", ctypes.c_int), ("height", ctypes.c_int), ("border_width", ctypes.c_int),
                ("depth", ctypes.c_int), ("visual", ctypes.c_void_p), ("root", Window), ("class_", ctypes.c_int), ("bit_gravity", ctypes.c_int),
                ("win_gravity", ctypes.c_int), ("backing_store", ctypes.c_int), ("backing_planes", ctypes.c_ulong), ("backing_pixel", ctypes.c_ulong),
                ("save_under", ctypes.c_int), ("colormap", ctypes.c_ulong), ("map_installed", ctypes.c_int), ("map_state", ctypes.c_int),
                ("all_event_masks", ctypes.c_long), ("your_event_mask", ctypes.c_long), ("do_not_propagate_mask", ctypes.c_long),
                ("override_redirect", ctypes.c_int), ("screen", ctypes.c_void_p)]


X.XOpenDisplay.restype = ctypes.c_void_p
X.XOpenDisplay.argtypes = [ctypes.c_char_p]
X.XDefaultRootWindow.restype = Window
X.XDefaultRootWindow.argtypes = [ctypes.c_void_p]
X.XInternAtom.restype = Atom
X.XInternAtom.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_int]
X.XGetWindowProperty.argtypes = [ctypes.c_void_p, Window, Atom, ctypes.c_long, ctypes.c_long, ctypes.c_int, Atom, ctypes.POINTER(Atom),
                                 ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_ulong), ctypes.POINTER(ctypes.c_ulong), ctypes.POINTER(ctypes.c_void_p)]
X.XGetWindowAttributes.argtypes = [ctypes.c_void_p, Window, ctypes.POINTER(Attrs)]
X.XTranslateCoordinates.argtypes = [ctypes.c_void_p, Window, Window, ctypes.c_int, ctypes.c_int, ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(Window)]
X.XFree.argtypes = [ctypes.c_void_p]
X.XSetErrorHandler.restype = ctypes.c_void_p
ERR = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p)(lambda d, e: 0)
X.XSetErrorHandler(ERR)

d = X.XOpenDisplay(None)
if not d:
    print(json.dumps({"windows": []}))
    sys.exit(0)
root = X.XDefaultRootWindow(d)
atoms = {}


def atom(name):
    if name not in atoms:
        atoms[name] = X.XInternAtom(d, name.encode(), 0)
    return atoms[name]


def prop(w, name, kind="card"):
    t, f, n, left, data = Atom(), ctypes.c_int(), ctypes.c_ulong(), ctypes.c_ulong(), ctypes.c_void_p()
    if X.XGetWindowProperty(d, w, atom(name), 0, 4096, 0, 0, ctypes.byref(t), ctypes.byref(f), ctypes.byref(n), ctypes.byref(left), ctypes.byref(data)) != 0:
        return None
    if not data.value:
        return None
    try:
        if f.value == 8:
            raw = ctypes.string_at(data.value, n.value)
            return raw if kind == "bytes" else raw.decode("utf-8", "replace")
        if f.value == 32:
            arr = ctypes.cast(data.value, ctypes.POINTER(ctypes.c_ulong))
            return [arr[i] for i in range(n.value)]
        return None
    finally:
        X.XFree(data)


skip_types = {atom(f"_NET_WM_WINDOW_TYPE_{t}") for t in ("DESKTOP", "DOCK", "TOOLBAR", "MENU", "SPLASH", "DROPDOWN_MENU", "POPUP_MENU", "TOOLTIP", "NOTIFICATION", "DND")}
hidden = atom("_NET_WM_STATE_HIDDEN")
full = atom("_NET_WM_STATE_FULLSCREEN")
cur = (prop(root, "_NET_CURRENT_DESKTOP") or [0])[0]
stack = prop(root, "_NET_CLIENT_LIST_STACKING") or prop(root, "_NET_CLIENT_LIST") or []
out = []
for w in stack:
    a = Attrs()
    if not X.XGetWindowAttributes(d, w, ctypes.byref(a)) or a.map_state != 2:
        continue
    types = set(prop(w, "_NET_WM_WINDOW_TYPE") or [])
    if types & skip_types:
        continue
    state = set(prop(w, "_NET_WM_STATE") or [])
    if hidden in state:
        continue
    desk = (prop(w, "_NET_WM_DESKTOP") or [cur])[0]
    if desk not in (cur, 0xFFFFFFFF, 0xFFFFFFFFFFFFFFFF):
        continue
    x, y, child = ctypes.c_int(), ctypes.c_int(), Window()
    X.XTranslateCoordinates(d, w, root, 0, 0, ctypes.byref(x), ctypes.byref(y), ctypes.byref(child))
    l, t, ww, hh = x.value, y.value, a.width, a.height
    gtk = prop(w, "_GTK_FRAME_EXTENTS")
    if gtk and len(gtk) == 4:
        l += gtk[0]
        t += gtk[2]
        ww -= gtk[0] + gtk[1]
        hh -= gtk[2] + gtk[3]
    else:
        fr = prop(w, "_NET_FRAME_EXTENTS")
        if fr and len(fr) == 4 and full not in state:
            l -= fr[0]
            t -= fr[2]
            ww += fr[0] + fr[1]
            hh += fr[2] + fr[3]
    if ww < 8 or hh < 8:
        continue
    title = prop(w, "_NET_WM_NAME") or prop(w, "WM_NAME") or ""
    cls = prop(w, "WM_CLASS", "bytes") or b""
    parts = [p.decode("utf-8", "replace") for p in cls.split(b"\0") if p]
    out.append({"id": int(w), "title": title, "cls": parts[-1] if parts else "", "x": l, "y": t, "w": ww, "h": hh})
out.reverse()
print(json.dumps({"windows": out}))
