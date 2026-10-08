const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WEB = path.join(ROOT, 'web');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve(sessDir) {
  return new Promise((res) => {
    const srv = http.createServer((req, rsp) => {
      const u = new URL(req.url, 'http://x');
      let f;
      if (u.pathname.startsWith('/session/')) {
        const name = path.basename(u.pathname);
        if (name === 'save.json') { rsp.writeHead(200, { 'content-type': 'application/json' }); rsp.end('{}'); return; }
        f = path.join(sessDir, name);
      } else f = path.join(WEB, u.pathname === '/' ? 'index.html' : u.pathname);
      fs.readFile(f, (err, buf) => {
        if (err) { rsp.writeHead(404); rsp.end(); return; }
        rsp.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' });
        rsp.end(buf);
      });
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.cb = new Map(); this.events = []; ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && this.cb.has(d.id)) { const { res, rej } = this.cb.get(d.id); this.cb.delete(d.id); d.error ? rej(new Error(d.error.message)) : res(d.result); } else if (d.method) { this.events.push(d); if (this.onEvent) this.onEvent(d); } }; }
  send(method, params = {}, sessionId) { const id = ++this.id; const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId; this.ws.send(JSON.stringify(msg)); return new Promise((res, rej) => this.cb.set(id, { res, rej })); }
}

async function launch({ fixture = 'tiled3', w = 1600, h = 1000, scale = 1.6, query = '' } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wtd-test-'));
  const sess = path.join(tmp, 'session');
  execFileSync('python3', [path.join(ROOT, 'tools', 'fixture_session.py'), fixture, sess]);
  const srv = await serve(sess);
  const port = srv.address().port;
  const prof = path.join(tmp, 'profile');
  const chrome = spawn('chromium', ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${prof}`, '--mute-audio', '--no-first-run', '--no-default-browser-check', '--disable-gpu-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--window-size=${w},${h}`, `--force-device-scale-factor=${scale}`, '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let wsUrl = null;
  await new Promise((res, rej) => {
    let buf = '';
    const to = setTimeout(() => rej(new Error('chromium did not start')), 20000);
    chrome.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m && !wsUrl) { wsUrl = m[1]; clearTimeout(to); res(); } });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => (ws.onopen = r));
  const cdp = new CDP(ws);
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => cdp.send(m, p, sessionId);
  await S('Runtime.enable');
  await S('Page.enable');
  const logs = [];
  cdp.onEvent = (e) => {
    if (e.method === 'Runtime.consoleAPICalled') logs.push(e.params.args.map((a) => a.value ?? a.description).join(' '));
    if (e.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text));
  };
  await S('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
  await S('Page.navigate', { url: `http://127.0.0.1:${port}/index.html?mon=eDP-2&test=1${query}` });
  const ev = async (expr) => { const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
  const wait = async (expr, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(`!!(${expr})`)) return true; await new Promise((r) => setTimeout(r, 50)); } throw new Error('timeout waiting for ' + expr); };
  const shot = async (file) => { const r = await S('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.data, 'base64')); return file; };
  const close = async () => { try { ws.close(); } catch (e) { } chrome.kill('SIGKILL'); srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); };
  return { ev, wait, shot, close, logs, S };
}
module.exports = { launch };
