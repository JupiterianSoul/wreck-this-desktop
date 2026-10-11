const { app, BrowserWindow, Menu, desktopCapturer, ipcMain, nativeImage, protocol, screen } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = __dirname;
const WEB = path.join(ROOT, 'web');
const WIN = process.platform === 'win32';
const WAYLAND = !WIN && (process.env.XDG_SESSION_TYPE === 'wayland' || !!process.env.WAYLAND_DISPLAY);
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.bmp': 'image/bmp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const TEST = !!process.env.WTD_TEST;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
if (process.env.WTD_MUTE) app.commandLine.appendSwitch('mute-audio');
protocol.registerSchemesAsPrivileged([{ scheme: 'wtd', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }]);

if (!app.requestSingleInstanceLock()) app.exit(0);

const DATA = path.join(app.getPath('userData'));
const SESS = fs.mkdtempSync(path.join(os.tmpdir(), 'wreck-this-desktop-'));
const LOG = path.join(DATA, 'log.txt');

function log(...a) {
  try {
    fs.mkdirSync(DATA, { recursive: true });
    fs.appendFileSync(LOG, new Date().toTimeString().slice(0, 8) + ' ' + a.map(String).join(' ') + '\n');
  } catch (e) { }
}

function run(cmd, args, timeout = 8000) {
  return new Promise((res) => {
    execFile(cmd, args, { timeout, windowsHide: true, maxBuffer: 16 << 20 }, (err, out, errOut) => {
      if (err) log('run failed', cmd, err.message, String(errOut || '').slice(0, 400));
      res(err ? null : String(out));
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function captureWindows(disp, file) {
  const r = screen.dipToScreenRect(null, disp.bounds);
  const out = await run(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'), ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'capture-win.ps1'),
    '-Out', file, '-X', String(r.x), '-Y', String(r.y), '-W', String(r.width), '-H', String(r.height)], 20000);
  try { return { phys: r, ...JSON.parse(out.trim()) }; } catch (e) { log('bad capture output', out); return null; }
}

async function captureX11(disp) {
  const out = await run('python3', [path.join(ROOT, 'x11-windows.py')]);
  try { return JSON.parse(out); } catch (e) { return null; }
}

async function grabWithCapturer(disp, file) {
  const s = disp.scaleFactor;
  const size = { width: Math.round(disp.bounds.width * s), height: Math.round(disp.bounds.height * s) };
  const srcs = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size });
  const src = srcs.find((x) => String(x.display_id) === String(disp.id)) || srcs[0];
  if (!src || src.thumbnail.isEmpty()) return false;
  fs.writeFileSync(file, src.thumbnail.toPNG());
  return true;
}

async function grabGnome(disp, file) {
  const tmp = path.join(SESS, 'full.png');
  if ((await run('gnome-screenshot', ['-f', tmp])) == null || !fs.existsSync(tmp)) return false;
  let img = nativeImage.createFromPath(tmp);
  const all = screen.getAllDisplays();
  if (all.length > 1) {
    const minX = Math.min(...all.map((d) => d.bounds.x)), minY = Math.min(...all.map((d) => d.bounds.y));
    const maxX = Math.max(...all.map((d) => d.bounds.x + d.bounds.width));
    const k = img.getSize().width / (maxX - minX);
    img = img.crop({ x: Math.round((disp.bounds.x - minX) * k), y: Math.round((disp.bounds.y - minY) * k), width: Math.round(disp.bounds.width * k), height: Math.round(disp.bounds.height * k) });
  }
  fs.writeFileSync(file, img.toPNG());
  fs.rmSync(tmp, { force: true });
  return true;
}

async function keyboardLayout() {
  if (WIN) return null;
  const g = await run('gsettings', ['get', 'org.gnome.desktop.input-sources', 'mru-sources']) || '';
  const g2 = await run('gsettings', ['get', 'org.gnome.desktop.input-sources', 'sources']) || '';
  const m = /\('xkb', '([^']+)'\)/.exec(g) || /\('xkb', '([^']+)'\)/.exec(g2);
  if (m) return m[1];
  const x = await run('setxkbmap', ['-query']) || '';
  const n = /layout:\s*(\S+)/.exec(x);
  return n ? n[1].split(',')[0] : null;
}

async function linuxWallpaper() {
  const scheme = await run('gsettings', ['get', 'org.gnome.desktop.interface', 'color-scheme']) || '';
  const keys = /dark/.test(scheme) ? ['picture-uri-dark', 'picture-uri'] : ['picture-uri', 'picture-uri-dark'];
  for (const k of keys) {
    const v = (await run('gsettings', ['get', 'org.gnome.desktop.background', k]) || '').trim().replace(/^'|'$/g, '');
    if (!v.startsWith('file://')) continue;
    const f = decodeURIComponent(v.slice(7));
    if (/\.(png|jpe?g|webp|bmp)$/i.test(f) && fs.existsSync(f)) return f;
  }
  return null;
}

function windowsWallpaper(info) {
  const cands = [info && info.wallpaper, path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper')];
  for (const f of cands) if (f && fs.existsSync(f) && fs.statSync(f).size > 0) return f;
  return null;
}

function toLogical(rect, origin, k) {
  return { x: (rect.x - origin.x) / k, y: (rect.y - origin.y) / k, w: rect.w / k, h: rect.h / k };
}

function client(i, w, r, mon) {
  const full = r.x <= 0.5 && r.y <= 0.5 && r.w >= mon.w - 1 && r.h >= mon.h - 1;
  return {
    address: '0x' + (w.id || i).toString(16), mapped: true, hidden: false, at: [Math.round(r.x + mon.x), Math.round(r.y + mon.y)], size: [Math.round(r.w), Math.round(r.h)],
    workspace: { id: 1, name: '1' }, floating: !full, fullscreen: full ? 2 : 0, monitor: 0, class: w.cls || '', title: w.title || '', focusHistoryID: i, pinned: false
  };
}

async function capture() {
  const disp = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const shotName = 'shot-screen.png';
  const file = path.join(SESS, shotName);
  const t0 = Date.now();
  let info = null, ok = false;
  if (WIN) {
    info = await captureWindows(disp, file);
    ok = !!(info && info.ok && fs.existsSync(file));
  } else if (WAYLAND) {
    ok = await grabGnome(disp, file);
  } else {
    const [i, g] = await Promise.all([captureX11(disp), grabWithCapturer(disp, file).catch((e) => { log('capturer', e); return false; })]);
    info = i; ok = g;
  }
  if (!ok) ok = await grabWithCapturer(disp, file).catch((e) => { log('capturer', e); return false; });
  if (!ok) throw new Error('could not take a screenshot');
  const size = nativeImage.createFromPath(file).getSize();
  const k = size.width / disp.bounds.width;
  const mon = { x: disp.bounds.x, y: disp.bounds.y, w: disp.bounds.width, h: disp.bounds.height };
  const clients = [];
  const layers = [];
  if (info && Array.isArray(info.windows)) {
    const origin = WIN ? { x: info.phys.x, y: info.phys.y } : { x: Math.round(disp.bounds.x * k), y: Math.round(disp.bounds.y * k) };
    info.windows.forEach((w, i) => {
      const r = toLogical(w, origin, k);
      if (r.x + r.w <= 0 || r.y + r.h <= 0 || r.x >= mon.w || r.y >= mon.h || r.w < 8 || r.h < 8) return;
      clients.push(client(i, w, r, mon));
    });
  }
  const anyFull = clients.some((c) => c.fullscreen);
  let bar = null;
  if (info && info.taskbar && info.taskbar.w > 0) {
    const origin = WIN ? { x: info.phys.x, y: info.phys.y } : { x: 0, y: 0 };
    bar = toLogical(info.taskbar, origin, k);
  } else {
    const b = disp.bounds, wa = disp.workArea;
    const top = wa.y - b.y, bottom = b.y + b.height - (wa.y + wa.height);
    if (bottom >= top && bottom > 8) bar = { x: 0, y: b.height - bottom, w: b.width, h: bottom };
    else if (top > 8) bar = { x: 0, y: 0, w: b.width, h: top };
  }
  if (bar && !anyFull && bar.w > 0 && bar.h > 0 && bar.h < 120) layers.push({ namespace: 'taskbar panel', level: 3, x: Math.round(bar.x), y: Math.round(bar.y), w: Math.round(bar.w), h: Math.round(bar.h) });
  const monitor = {
    id: 0, name: 'screen', x: mon.x, y: mon.y, w: mon.w, h: mon.h, pw: size.width, ph: size.height, scale: k, refresh: disp.displayFrequency || 60,
    focused: true, workspace: { id: 1, name: '1' }, special: {}, reserved: [0, 0, 0, 0], shot: shotName, clients, layers
  };
  const data = {
    v: 1, t: Date.now() / 1000, monitors: [monitor], focused: 'screen', active: null, border: 0, rounding: info && info.rounding != null ? info.rounding : WIN ? 0 : 8, gaps: 0,
    theme: {}, font: 'monospace', layout: (info && info.layout) || (await keyboardLayout()) || 'us', battery: 'balanced', bar: { left: [], center: [], right: [] },
    platform: process.platform, timing: { total: Date.now() - t0 }
  };
  fs.writeFileSync(path.join(SESS, 'session.json'), JSON.stringify(data));
  log('capture', JSON.stringify({ size, k, clients: clients.length, bar, ms: Date.now() - t0, wayland: WAYLAND }));
  return { disp, data, info };
}

let win = null;
let wall = { done: false, want: false, name: null };

async function fetchWallpaper(info) {
  try {
    const src = WIN ? windowsWallpaper(info) : await linuxWallpaper();
    if (src) {
      const ext = (path.extname(src).toLowerCase() || '.jpg');
      const name = 'wall-screen' + (/^\.(png|jpe?g|webp|bmp)$/.test(ext) ? ext : '.jpg');
      fs.copyFileSync(src, path.join(SESS, name));
      wall.name = name;
    }
  } catch (e) { log('wallpaper failed', e); }
  wall.done = true;
  if (wall.want) sendWallpaper();
}

function js(code) {
  if (win && !win.isDestroyed()) win.webContents.executeJavaScript(code).catch(() => { });
}

function sendWallpaper() { js(`window.WTD && WTD.onWallpaper && WTD.onWallpaper(${JSON.stringify(wall.name)})`); }

function savePhoto(png) {
  if (!String(png).startsWith('data:image/png;base64,')) return;
  const dir = process.env.WTD_PHOTO_DIR || path.join(app.getPath('pictures'), 'Wreck This Desktop');
  fs.mkdirSync(dir, { recursive: true });
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  const f = path.join(dir, `wreck-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.png`);
  fs.writeFileSync(f, Buffer.from(png.split(',', 2)[1], 'base64'));
  js(`window.WTD && WTD.onPhoto && WTD.onPhoto(${JSON.stringify(f)})`);
}

function show() {
  if (!win || win.isDestroyed() || win.isVisible()) return;
  win.show();
  win.setAlwaysOnTop(true, 'screen-saver');
  win.focus();
  win.webContents.focus();
}

function onMessage(_e, msg) {
  if (!msg || typeof msg !== 'object') return;
  switch (msg.t) {
    case 'log': log('page:', msg.msg); break;
    case 'shown': show(); break;
    case 'save': try { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(path.join(DATA, 'save.json.tmp'), JSON.stringify(msg.data || {})); fs.renameSync(path.join(DATA, 'save.json.tmp'), path.join(DATA, 'save.json')); } catch (e) { log('save failed', e); } break;
    case 'want-wallpaper': wall.want = true; if (wall.done) sendWallpaper(); break;
    case 'photo': try { savePhoto(msg.png); } catch (e) { log('photo failed', e); } break;
    case 'next-level': js('window.WTD && WTD.onNextLevel && WTD.onNextLevel(null)'); break;
    case 'quit': log('quit from page', msg.why); app.quit(); break;
  }
}

function serve(req) {
  const u = new URL(req.url);
  const p = decodeURIComponent(u.pathname).replace(/^\/+/, '');
  let f;
  if (p.startsWith('session/')) {
    const name = path.basename(p);
    if (name === 'save.json') {
      const s = path.join(DATA, 'save.json');
      return new Response(fs.existsSync(s) ? fs.readFileSync(s) : '{}', { headers: { 'content-type': 'application/json' } });
    }
    f = path.join(SESS, name);
  } else {
    f = path.resolve(WEB, p);
    if (!f.startsWith(WEB + path.sep)) return new Response('no', { status: 403 });
  }
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return new Response('not found', { status: 404 });
  return new Response(fs.readFileSync(f), { headers: { 'content-type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' } });
}

function cleanup() { try { fs.rmSync(SESS, { recursive: true, force: true }); } catch (e) { } }

app.on('window-all-closed', () => app.quit());
app.on('will-quit', cleanup);
process.on('exit', cleanup);

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  protocol.handle('wtd', serve);
  ipcMain.on('wtd', onMessage);
  await sleep(Number(process.env.WTD_DELAY ?? 250));
  let cap;
  try { cap = await capture(); } catch (e) { log('capture failed', e && e.stack); app.exit(1); return; }
  const b = cap.disp.bounds;
  win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height, show: false, frame: false, fullscreen: !TEST, resizable: false, movable: false, minimizable: false,
    backgroundColor: '#000000', title: 'Wreck This Desktop', autoHideMenuBar: true, icon: path.join(ROOT, 'icon.png'),
    webPreferences: { preload: path.join(ROOT, 'preload.js'), backgroundThrottling: false, spellcheck: false, devTools: !!process.env.WTD_DEVTOOLS }
  });
  win.webContents.on('render-process-gone', (_e, d) => { log('renderer gone', d && d.reason); app.quit(); });
  win.webContents.on('console-message', (e) => { if (process.env.WTD_CONSOLE) console.log('[page]', e.message); });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('wtd://')) e.preventDefault(); });
  let q = '?mon=screen&shot=shot-screen.png&portable=1';
  if (TEST) q += '&test=1';
  win.loadURL('wtd://game/index.html' + q);
  setTimeout(show, 3000);
  fetchWallpaper(cap.info);
  const auto = Number(process.env.WTD_AUTOQUIT || 0);
  if (auto > 0) setTimeout(() => app.quit(), auto * 1000);
});
