(() => {
  const WTP = window.WTP;
  const V = {};
  WTP.vsprites = V;
  const C = {
    gun: '#3f4450', gun2: '#545b69', steel: '#9aa1ae', chrome: '#cfd5df', dark: '#24272e', black: '#16181d', wood: '#8d5c3b', woodL: '#b07a4f', rubber: '#2e3138',
    gold: '#e3b94b', red: '#d9493c', orange: '#f08a2e', yellow: '#f4d03f', green: '#5cbf5a', lime: '#a6e05a', cyan: '#4cc6ec', blue: '#3e70d9', navy: '#24356e', purple: '#9b5de5', pink: '#ef6aa8', white: '#eceff4', cream: '#f3e6c4', brown: '#6b4a2f', teal: '#2bb3a3', grey: '#7b818c'
  };
  V.C = C;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const shade = (h, k) => { if (h[0] !== '#') return h; const [r, g, b] = hex(h); const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); return `rgb(${f(r)},${f(g)},${f(b)})`; };

  function bbox(parts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const add = (x, y) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; };
    for (const p of parts) {
      const t = p[0];
      if (t === 'r') { add(p[1], p[2]); add(p[1] + p[3], p[2] + p[4]); }
      else if (t === 'p') for (let k = 0; k < p[1].length; k += 2) add(p[1][k], p[1][k + 1]);
      else if (t === 'c' || t === 'g' || t === 'o') { add(p[1] - p[3], p[2] - p[3]); add(p[1] + p[3], p[2] + p[3]); }
      else if (t === 'l') { add(p[1], p[2]); add(p[3], p[4]); }
    }
    return { x0: x0 - 0.6, y0: y0 - 0.6, x1: x1 + 0.6, y1: y1 + 0.6 };
  }
  function pathOf(g, p) {
    const t = p[0];
    g.beginPath();
    if (t === 'r') { const r = Math.min(p[6] || 0, p[3] / 2, p[4] / 2); if (g.roundRect) g.roundRect(p[1], p[2], p[3], p[4], r); else g.rect(p[1], p[2], p[3], p[4]); }
    else if (t === 'p') { const q = p[1]; g.moveTo(q[0], q[1]); for (let k = 2; k < q.length; k += 2) g.lineTo(q[k], q[k + 1]); g.closePath(); }
    else if (t === 'c' || t === 'o') g.arc(p[1], p[2], p[3], 0, Math.PI * 2);
  }
  const colOf = (p) => p[0] === 'r' ? p[5] : p[0] === 'p' ? p[2] : p[4];
  function fillOf(g, p, pix) {
    const t = p[0];
    if (t === 'l' || t === 'g') return;
    const col = colOf(p);
    const b = bbox([p]);
    const gr = g.createLinearGradient(0, b.y0 + 0.6, 0, b.y1 - 0.6);
    if (pix) { const hi = shade(col, 0.3), lo = shade(col, -0.32); gr.addColorStop(0, hi); gr.addColorStop(0.3, hi); gr.addColorStop(0.3, col); gr.addColorStop(0.72, col); gr.addColorStop(0.72, lo); gr.addColorStop(1, lo); }
    else { gr.addColorStop(0, shade(col, 0.32)); gr.addColorStop(0.42, col); gr.addColorStop(1, shade(col, -0.35)); }
    g.fillStyle = gr;
    pathOf(g, p);
    if (t === 'o') { g.lineWidth = p[5] || 0.6; g.strokeStyle = gr; g.stroke(); } else g.fill();
  }
  function paint(g, parts, outline = true, pix = false) {
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (outline) {
      g.strokeStyle = 'rgba(8,9,12,.95)'; g.fillStyle = 'rgba(8,9,12,.95)';
      for (const p of parts) {
        if (p[0] === 'g') continue;
        if (p[0] === 'l') { g.lineWidth = p[5] + 0.7; g.beginPath(); g.moveTo(p[1], p[2]); g.lineTo(p[3], p[4]); g.stroke(); continue; }
        if (p[0] === 'o') { g.lineWidth = (p[5] || 0.6) + 0.7; pathOf(g, p); g.stroke(); continue; }
        g.lineWidth = 0.7; pathOf(g, p); g.fill(); g.stroke();
      }
    }
    for (const p of parts) {
      if (p[0] === 'l') { g.strokeStyle = p[6]; g.lineWidth = p[5]; g.beginPath(); g.moveTo(p[1], p[2]); g.lineTo(p[3], p[4]); g.stroke(); }
      else if (p[0] === 'g') { if (pix) continue; const gr = g.createRadialGradient(p[1], p[2], 0, p[1], p[2], p[3]); gr.addColorStop(0, p[4]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(p[1], p[2], p[3], 0, Math.PI * 2); g.fill(); }
      else fillOf(g, p, pix);
    }
  }

  const PXD = 1, SS = 4;
  V.PXD = PXD;
  const OUTC = [10, 11, 14];
  const rgbOf = (c) => { if (c[0] === '#') return hex(c); const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return [0, 0, 0]; return m[1].split(',').slice(0, 3).map((v) => +v); };
  function paletteOf(parts) {
    const out = [OUTC];
    for (const p of parts) {
      if (p[0] === 'g') continue;
      if (p[0] === 'l') { out.push(rgbOf(p[6])); continue; }
      const c = colOf(p);
      if (c[0] !== '#') { out.push(rgbOf(c)); continue; }
      out.push(rgbOf(shade(c, 0.3)), hex(c), rgbOf(shade(c, -0.32)));
    }
    return out;
  }
  function snapIndex(pal, core, r, gg, b) {
    const ch = Math.max(r, gg, b) - Math.min(r, gg, b);
    let best = 0, bd = 1e12;
    for (let n = 0; n < pal.length; n++) { const q = pal[n]; const e = ((q[0] - r) ** 2 + (q[1] - gg) ** 2 + (q[2] - b) ** 2 + 3 * (ch - q[3]) ** 2) * (n < core ? 1 : 6); if (e < bd) { bd = e; best = n; } }
    return best;
  }
  function downsample(src, pal, ss, outline = true, core = pal.length, dst = null, opt = {}) {
    for (const q of pal) if (q.length < 4) q[3] = Math.max(q[0], q[1], q[2]) - Math.min(q[0], q[1], q[2]);
    const g = src.getContext('2d', { willReadFrequently: true });
    const W = src.width, H = src.height, w = Math.max(1, Math.floor(W / ss)), h = Math.max(1, Math.floor(H / ss));
    const d = g.getImageData(0, 0, W, H).data;
    const idx = new Int16Array(W * H);
    for (let i = 0, j = 0; j < W * H; i += 4, j++) idx[j] = d[i + 3] < 110 ? -1 : snapIndex(pal, core, d[i], d[i + 1], d[i + 2]);
    const out = new ImageData(w, h), o = out.data;
    const on = new Uint8Array(w * h), cnt = new Uint16Array(pal.length), need = Math.max(1, Math.ceil(ss * ss * (opt.need ?? 0.42)));
    const OC = opt.out || OUTC;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      cnt.fill(0);
      let n = 0;
      for (let sy = 0; sy < ss; sy++) { const row = (y * ss + sy) * W + x * ss; for (let sx = 0; sx < ss; sx++) { const k = idx[row + sx]; if (k >= 0) { cnt[k]++; n++; } } }
      if (n < need) continue;
      let bk = 0;
      for (let k = 1; k < pal.length; k++) if (cnt[k] > cnt[bk]) bk = k;
      const q = pal[bk], i = (y * w + x) * 4;
      o[i] = q[0]; o[i + 1] = q[1]; o[i + 2] = q[2]; o[i + 3] = 255; on[y * w + x] = 1;
    }
    if (outline) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const j = y * w + x;
      if (on[j]) continue;
      if ((x > 0 && on[j - 1]) || (x < w - 1 && on[j + 1]) || (y > 0 && on[j - w]) || (y < h - 1 && on[j + w])) { const i = j * 4; o[i] = OC[0]; o[i + 1] = OC[1]; o[i + 2] = OC[2]; o[i + 3] = 255; }
    }
    const c = dst || document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    c.getContext('2d', { willReadFrequently: true }).putImageData(out, 0, 0);
    return c;
  }
  const pixelize = (c, pal, outline = true, core = pal.length) => downsample(c, pal, 1, outline, core, c);
  V.downsample = downsample;
  V.pixelize = pixelize;
  V.paletteOf = paletteOf;
  V.rgbOf = rgbOf;

  class VSprite {
    constructor(def) {
      this.parts = def.parts;
      this.mxy = def.muzzle || [6, 0];
      const b = bbox(this.parts);
      this.b = b;
      this.w = Math.ceil(b.x1 - b.x0); this.h = Math.ceil(b.y1 - b.y0);
      this.gx = -b.x0; this.gy = -b.y0;
      this.mx = this.mxy[0] - b.x0; this.my = this.mxy[1] - b.y0;
      this.vector = true;
      this._cv = null;
      this.icons = new Map();
    }
    get cv() { return this.base(); }
    base() {
      if (this._base) return this._base;
      const c = document.createElement('canvas');
      const pw = Math.max(1, Math.ceil(this.w * PXD)), ph = Math.max(1, Math.ceil(this.h * PXD));
      c.width = pw * SS; c.height = ph * SS;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.scale(PXD * SS, PXD * SS); g.translate(this.gx, this.gy);
      paint(g, this.parts, false, true);
      this.pal = this.pal || paletteOf(this.parts);
      return (this._base = downsample(c, this.pal, SS));
    }
    icon(f = 1, tint) {
      f = Math.max(1, Math.round(f));
      const k = `${f}|${tint || ''}`;
      if (this.icons.has(k)) return this.icons.get(k);
      const b = this.base();
      const c = document.createElement('canvas');
      c.width = b.width * f; c.height = b.height * f;
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(b, 0, 0, c.width, c.height);
      if (tint) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height); }
      this.icons.set(k, c);
      return c;
    }
    rotated(ang, flip) {
      const step = Math.round(((ang % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 32)) % 64;
      const key = step * 2 + (flip ? 1 : 0);
      this.rot = this.rot || new Map();
      let r = this.rot.get(key);
      if (r) return r;
      const a = step * (Math.PI / 32);
      const b = this.b, R = Math.ceil(Math.max(Math.hypot(b.x0, b.y0), Math.hypot(b.x1, b.y0), Math.hypot(b.x0, b.y1), Math.hypot(b.x1, b.y1))) + 2;
      const c = document.createElement('canvas');
      c.width = R * 2 * PXD * SS; c.height = R * 2 * PXD * SS;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.scale(PXD * SS, PXD * SS); g.translate(R, R); g.rotate(a); if (flip) g.scale(1, -1);
      paint(g, this.parts, false, true);
      this.pal = this.pal || paletteOf(this.parts);
      r = { cv: downsample(c, this.pal, SS), ox: R, oy: R, a, sc: PXD };
      this.rot.set(key, r);
      return r;
    }
    draw(ctx, x, y, ang, flip) {
      const r = this.rotated(ang, flip);
      const sm = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(r.cv, Math.round((x - r.ox) * PXD) / PXD, Math.round((y - r.oy) * PXD) / PXD, r.cv.width / PXD, r.cv.height / PXD);
      ctx.imageSmoothingEnabled = sm;
    }
    drawC(ctx, x, y, ang, sc = 1) {
      const cx = (this.b.x0 + this.b.x1) / 2, cy = (this.b.y0 + this.b.y1) / 2;
      const c = Math.cos(ang), s = Math.sin(ang);
      this.draw(ctx, x - (cx * c - cy * s), y - (cx * s + cy * c), ang, false);
    }
    muzzle(ang, flip) {
      const dx = this.mxy[0], dy = flip ? -this.mxy[1] : this.mxy[1];
      const c = Math.cos(ang), s = Math.sin(ang);
      return [dx * c - dy * s, dx * s + dy * c];
    }
  }
  V.VSprite = VSprite;
  V.paint = paint;
  const scaleParts = (parts, k) => parts.map((p) => {
    const t = p[0];
    if (t === 'r') return ['r', p[1] * k, p[2] * k, p[3] * k, p[4] * k, p[5], (p[6] || 0) * k];
    if (t === 'p') return ['p', p[1].map((v) => v * k), p[2]];
    if (t === 'c' || t === 'g') return [t, p[1] * k, p[2] * k, p[3] * k, p[4]];
    if (t === 'o') return ['o', p[1] * k, p[2] * k, p[3] * k, p[4], (p[5] || 0.6) * k];
    if (t === 'l') return ['l', p[1] * k, p[2] * k, p[3] * k, p[4] * k, p[5] * k, p[6]];
    return p;
  });
  V.make = (def, k = 1) => new VSprite(k === 1 ? def : { parts: scaleParts(def.parts, k), muzzle: (def.muzzle || [6, 0]).map((v) => v * k) });

  const grip = (x = -1, y = 0, col = C.rubber, a = 0.22) => ['p', [x - 0.9, y - 0.2, x + 1.3, y - 0.2, x + 1.0 - a * 4, y + 4.2, x - 1.4 - a * 4, y + 4.2], col];
  const guard = (x = 0.4) => ['o', x + 0.9, 0.9, 0.9, C.dark, 0.35];
  const stock = (col = C.wood, x = -2) => ['p', [x, -1.8, x - 5.5, -1.2, x - 6, 2.6, x - 4.6, 2.8, x - 0.6, 0.6], col];
  const mag = (x, col = C.dark, h = 3.2, w = 1.5) => ['p', [x, 0, x + w, 0, x + w + 0.4, h, x + 0.4, h], col];

  const R = {};
  R.pistol = { muzzle: [7.8, -1.3], parts: [grip(), guard(), ['r', -1.6, -2.4, 9.2, 2.4, C.gun, 0.4], ['r', 6.6, -2.0, 1.4, 1.4, C.dark, 0.2], ['l', -0.8, -1.9, 5.6, -1.9, 0.18, C.steel], ['r', -1.4, -2.9, 1.0, 0.6, C.dark, 0.2], ['r', 5.8, -2.9, 0.6, 0.6, C.dark, 0.2]] };
  R.revolver = { muzzle: [11.4, -1.5], parts: [['p', [-1.6, -0.6, 0.8, -0.6, 0.6, 4.4, -2.6, 4.4], C.wood], guard(0.6), ['r', -1.8, -2.6, 3.4, 2.6, C.gun2, 0.6], ['r', 1.2, -3.1, 3.6, 3.4, C.steel, 0.9], ['l', 1.6, -2.2, 4.4, -2.2, 0.2, C.dark], ['l', 1.6, -1.0, 4.4, -1.0, 0.2, C.dark], ['r', 4.6, -2.3, 7.2, 1.7, C.gun, 0.4], ['r', 10.2, -2.9, 0.8, 0.6, C.dark, 0.2]] };
  R.dual = { muzzle: [7.6, -1.3], parts: [grip(-1, 0, C.wood), guard(), ['r', -1.6, -2.4, 9, 2.4, C.gold, 0.4], ['l', -0.6, -1.9, 6, -1.9, 0.2, C.cream], ['r', 6.6, -2.0, 1.2, 1.4, C.brown, 0.2], ['c', 2.8, -1.2, 0.5, C.cream]] };
  R.nailgun = { muzzle: [8.6, -0.8], parts: [grip(-1, 0.4, C.yellow), ['r', -2, -3.2, 8.8, 3.6, C.yellow, 0.8], ['r', 2.4, -0.2, 3.6, 2.6, C.dark, 0.3], ['r', 6.6, -1.5, 2.2, 1.4, C.dark, 0.3], ['l', 3, 0.6, 5.6, 0.6, 0.25, C.chrome], ['l', 3, 1.4, 5.6, 1.4, 0.25, C.chrome], ['r', -1.4, -2.6, 3, 1.2, C.dark, 0.4]] };
  R.flare = { muzzle: [8.2, -1.4], parts: [grip(-1, 0, C.orange), guard(), ['r', -1.8, -2.6, 4.2, 2.8, C.orange, 0.6], ['r', 2, -3.0, 6.4, 3.2, C.orange, 1.4], ['c', 8.2, -1.4, 1.5, C.dark], ['c', 8.2, -1.4, 0.9, C.red], ['g', 8.2, -1.4, 2.2, 'rgba(255,90,40,.5)']] };
  R.saw = { muzzle: [8.5, -1.2], parts: [grip(), guard(), ['r', -2, -2.6, 7.2, 2.8, C.gun2, 0.5], ['c', 7.6, -1.2, 2.6, C.chrome], ['c', 7.6, -1.2, 0.8, C.dark], ['l', 5.4, -2.5, 9.8, 0.1, 0.25, C.steel], ['l', 5.4, 0.1, 9.8, -2.5, 0.25, C.steel], ['r', -1.6, -3.4, 3.2, 0.9, C.orange, 0.4]] };
  R.smg = { muzzle: [11.3, -1.4], parts: [grip(-0.6, 0), mag(2.2, C.dark, 4.6), ['r', -2.6, -2.8, 11.2, 3, C.gun, 0.5], ['r', 8.4, -2.0, 2.8, 1.2, C.dark, 0.3], ['r', -4.8, -2.2, 2.4, 1.4, C.dark, 0.4], ['l', -1.6, -2.2, 7.4, -2.2, 0.2, C.steel], ['r', 0.6, -3.5, 3.4, 0.8, C.dark, 0.3]] };
  R.rifle = { muzzle: [14.6, -1.3], parts: [stock(C.gun2, -2.2), grip(-0.6, 0), mag(3.2, C.dark, 4.2, 1.8), ['r', -2.4, -2.8, 12.6, 3, C.gun, 0.4], ['r', 10, -2.2, 4.6, 1.4, C.dark, 0.3], ['r', 0.4, -4.4, 5.4, 1.2, C.dark, 0.4], ['c', 5.2, -3.8, 0.6, C.cyan], ['l', 0, -1.8, 9.6, -1.8, 0.2, C.steel], ['r', 6.4, -0.2, 3.6, 1.4, C.gun2, 0.4]] };
  R.minigun = { muzzle: [16, -1.0], parts: [['r', -3.2, -3.8, 8, 6.4, C.gun2, 1.2], ['r', -1.2, 2.4, 3.4, 1.6, C.dark, 0.4], ['r', 4.6, -3.6, 10.8, 1.3, C.steel, 0.4], ['r', 4.6, -1.7, 10.8, 1.3, C.chrome, 0.4], ['r', 4.6, 0.2, 10.8, 1.3, C.steel, 0.4], ['r', 13.8, -4.2, 1.6, 6.2, C.dark, 0.4], ['r', 7.4, -4.2, 1.2, 6.2, C.dark, 0.4], ['r', -2.2, -5.0, 4.8, 1.4, C.orange, 0.5], ['c', 1, 0, 1.3, C.dark]] };
  R.shotgun = { muzzle: [14.4, -1.6], parts: [stock(C.wood, -1.8), grip(-0.6, 0, C.woodL), ['r', -2, -2.8, 6.4, 2.8, C.gun, 0.4], ['r', 4, -2.6, 10.4, 1.4, C.steel, 0.4], ['r', 4.6, -1.0, 6.8, 1.6, C.wood, 0.6], ['l', 5.4, -0.2, 10.4, -0.2, 0.2, C.woodL], ['r', 12.8, -3.0, 0.8, 0.6, C.dark, 0.2]] };
  R.double = { muzzle: [14, -1.2], parts: [stock(C.woodL, -1.6), grip(-0.4, 0.2, C.wood), ['r', -1.8, -2.6, 4, 2.8, C.gold, 0.6], ['r', 2, -3.0, 12, 1.5, C.steel, 0.5], ['r', 2, -1.5, 12, 1.5, C.chrome, 0.5], ['r', 2.6, 0, 6, 1.0, C.wood, 0.4], ['c', 0.4, -1.2, 0.5, C.cream]] };
  R.flak = { muzzle: [12.8, -1.4], parts: [grip(-0.4, 0.2), ['c', 2.4, 0.8, 2.6, C.navy], ['c', 2.4, 0.8, 1.1, C.dark], ['r', -2.4, -3.0, 10, 3.4, C.gun2, 0.5], ['r', 7.4, -2.8, 5.4, 2.8, C.gun, 0.4], ['r', 11.6, -3.4, 1.6, 4, C.dark, 0.5], ['l', 8, -2.2, 11.2, -2.2, 0.2, C.steel], ['l', 8, -0.8, 11.2, -0.8, 0.2, C.steel]] };
  R.confetti = { muzzle: [11, -1.4], parts: [grip(-0.6, 0, C.pink), ['r', -2, -2.8, 5, 3, C.purple, 0.8], ['p', [3, -2.4, 11, -4.4, 11, 1.6, 3, -0.2], C.pink], ['c', 6, -2.2, 0.5, C.yellow], ['c', 8, -1, 0.5, C.cyan], ['c', 9.4, -3, 0.5, C.lime], ['c', 7.6, 0.4, 0.4, C.yellow], ['l', 3.4, -1.3, 10.6, -1.3, 0.25, C.white]] };
  R.sniper = { muzzle: [19, -1.2], parts: [stock(C.dark, -2.2), grip(-0.6, 0, C.dark), mag(2.4, C.dark, 3, 1.4), ['r', -2.4, -2.6, 8.8, 2.8, C.gun, 0.4], ['r', 6, -1.9, 13, 1.2, C.steel, 0.4], ['r', 17.4, -2.3, 1.8, 2, C.dark, 0.4], ['r', -0.8, -5.2, 7, 1.8, C.dark, 0.8], ['c', 6.2, -4.3, 0.9, C.dark], ['c', 6.2, -4.3, 0.55, C.cyan], ['l', 1.4, -3.4, 1.4, -2.6, 0.5, C.dark], ['l', 4.6, -3.4, 4.6, -2.6, 0.5, C.dark]] };
  R.railgun = { muzzle: [16.6, -1.4], parts: [grip(-0.6, 0, C.dark), ['r', -2.6, -3.2, 7.6, 3.8, C.navy, 0.8], ['r', 4.6, -3.4, 12, 0.9, C.chrome, 0.3], ['r', 4.6, 0.6, 12, 0.9, C.chrome, 0.3], ['r', 5, -2.3, 11.2, 2.8, C.dark, 0.3], ['l', 6.4, -0.9, 15.4, -0.9, 0.7, '#7fe3ff'], ['g', 11, -0.9, 3.6, 'rgba(110,220,255,.55)'], ['c', 0.6, -1.2, 1.2, C.cyan]] };
  R.crossbow = { muzzle: [10.6, -1.6], parts: [grip(-0.8, 0, C.wood), ['r', -3, -2.4, 13.6, 1.6, C.wood, 0.5], ['p', [6.6, -1.6, 7.4, -1.6, 9.4, -6.6, 8.6, -6.8], C.dark], ['p', [6.6, -1.6, 7.4, -1.6, 9.4, 3.4, 8.6, 3.6], C.dark], ['l', 8.8, -6.6, 1.2, -1.6, 0.18, C.cream], ['l', 8.8, 3.4, 1.2, -1.6, 0.18, C.cream], ['l', 1, -2.0, 10.4, -2.0, 0.35, C.steel], ['p', [10.2, -2.6, 11.6, -2.0, 10.2, -1.4], C.chrome]] };
  R.harpoon = { muzzle: [13, -1.4], parts: [grip(-0.4, 0, C.teal), ['r', -3, -3.0, 9.2, 3.4, C.teal, 1.2], ['c', -1.2, 0.8, 1.6, C.dark], ['l', 5, -1.4, 12.4, -1.4, 0.45, C.steel], ['p', [12, -2.8, 14.2, -1.4, 12, 0, 12.6, -1.4], C.chrome], ['r', 1.2, -3.8, 3, 0.8, C.yellow, 0.3]] };
  R.laser = { muzzle: [12.2, -1.5], parts: [grip(-0.6, 0, C.white), ['r', -2.6, -3.0, 9.6, 3.2, C.white, 1.4], ['r', 6.6, -2.4, 4.6, 1.8, C.grey, 0.4], ['c', 11.6, -1.5, 1.2, C.pink], ['g', 11.6, -1.5, 3, 'rgba(255,90,170,.6)'], ['l', -1.2, -1.4, 5.8, -1.4, 0.35, C.pink], ['r', 0.2, -3.8, 3.4, 0.9, C.pink, 0.4]] };
  R.plasma = { muzzle: [12, -1.4], parts: [grip(-0.6, 0, C.dark), ['r', -2.6, -3.2, 6.6, 3.8, C.gun2, 1], ['c', 5.4, -1.4, 2.6, C.dark], ['c', 5.4, -1.4, 1.8, C.purple], ['g', 5.4, -1.4, 3.2, 'rgba(200,110,255,.6)'], ['r', 7.4, -2.4, 4.6, 2, C.gun, 0.6], ['c', 12, -1.4, 0.9, C.pink]] };
  R.tesla = { muzzle: [11.6, -2.2], parts: [grip(-0.6, 0.2, C.dark), ['r', -2.6, -2.6, 6.6, 3, C.navy, 0.8], ['r', 4, -2.0, 5.2, 1.6, C.dark, 0.3], ['o', 5.2, -1.2, 1.3, C.gold, 0.45], ['o', 6.8, -1.2, 1.3, C.gold, 0.45], ['o', 8.4, -1.2, 1.3, C.gold, 0.45], ['c', 11, -2.0, 1.6, C.chrome], ['g', 11, -2, 3, 'rgba(140,220,255,.6)']] };
  R.freeze = { muzzle: [12.2, -1.6], parts: [grip(-0.6, 0, C.white), ['r', -2.6, -2.8, 7.4, 3, C.white, 1], ['r', -1.4, 0.4, 4.4, 2.4, C.cyan, 1.1], ['r', 4.6, -2.4, 6.4, 1.6, C.steel, 0.4], ['p', [10.8, -3.2, 12.8, -1.6, 10.8, 0], C.cyan], ['l', -0.8, -1.6, 4, -1.6, 0.3, C.cyan], ['g', 12.2, -1.6, 2.6, 'rgba(160,230,255,.55)']] };
  R.sound = { muzzle: [11.8, -1.2], parts: [grip(-0.4, 0, C.dark), ['r', -2.6, -2.6, 6.6, 3, C.gun, 0.8], ['p', [4, -2.4, 11, -5.4, 11, 3, 4, 0.2], C.dark], ['o', 10.2, -1.2, 3.4, C.grey, 0.6], ['c', 10.4, -1.2, 1.2, C.pink], ['o', 7.8, -1.2, 1.6, C.grey, 0.35]] };
  R.eraser = { muzzle: [11, -1.2], parts: [grip(-0.6, 0, C.dark), ['r', -2.4, -2.6, 6, 3, C.gun2, 0.8], ['r', 3.4, -3.2, 7.4, 4, C.pink, 1], ['r', 7.4, -3.2, 3.4, 4, C.cyan, 1], ['l', 3.8, -2.4, 7, -2.4, 0.3, '#ffd0e6']] };
  R.glitch = { muzzle: [11, -1.2], parts: [grip(-0.6, 0, C.dark), ['r', -2.6, -3.0, 8.6, 3.4, C.dark, 0.3], ['r', -1.2, -2.4, 2, 1.2, C.pink, 0], ['r', 1.4, -1.6, 2.6, 0.8, C.lime, 0], ['r', 4, -2.6, 1.6, 1.2, C.cyan, 0], ['r', 6, -2.4, 4.8, 1.8, C.purple, 0.3], ['r', 9, -3.4, 1.4, 0.8, C.pink, 0], ['r', 8.2, 0.2, 1.4, 0.7, C.lime, 0]] };
  R.backspace = { muzzle: [11.4, -1.2], parts: [grip(-0.6, 0.4, C.dark), ['r', -2.8, -3.6, 13.6, 4.6, C.white, 1.2], ['r', -2, -3.0, 12, 3.4, C.cream, 0.9], ['p', [1.4, -1.3, 3.4, -2.6, 3.4, -0.0], C.dark], ['l', 3.4, -1.3, 8, -1.3, 0.55, C.dark]] };
  R.flame = { muzzle: [13.4, -1.0], parts: [grip(-0.4, 0, C.dark), ['r', -2.6, -2.4, 9.4, 2.8, C.red, 0.6], ['r', -2.2, 0.4, 5.6, 2.8, C.orange, 1.3], ['r', 6.6, -1.6, 6.2, 1.2, C.steel, 0.3], ['r', 12, -2.0, 1.4, 2, C.dark, 0.3], ['c', 13.6, -1, 0.6, C.yellow], ['g', 13.8, -1, 1.8, 'rgba(255,170,40,.6)']] };
  R.acid = { muzzle: [12.4, -1.2], parts: [grip(-0.4, 0, C.dark), ['r', -2.6, -2.4, 7.4, 2.8, C.gun2, 0.6], ['c', 1, -4.2, 2.2, C.dark], ['c', 1, -4.2, 1.6, C.lime], ['g', 1, -4.2, 2.6, 'rgba(160,240,80,.5)'], ['r', 4.8, -1.8, 7.2, 1.2, C.green, 0.3], ['p', [11.4, -2.4, 12.8, -1.2, 11.4, 0], C.green]] };
  R.paint = { muzzle: [12, -1.2], parts: [grip(-0.4, 0, C.blue), ['r', -2.6, -2.6, 9, 3, C.blue, 0.8], ['c', 1.6, -4.4, 2.2, C.yellow], ['c', 0.8, -4.8, 0.6, C.pink], ['c', 2.4, -4.0, 0.6, C.lime], ['r', 6.4, -2.0, 5.6, 1.4, C.steel, 0.3], ['c', 3.4, -1.0, 0.5, C.pink]] };
  R.lava = { muzzle: [12.6, -1.3], parts: [grip(-0.4, 0, C.dark), ['r', -2.8, -3.2, 9, 3.8, C.dark, 0.8], ['r', -1.8, -2.4, 6.4, 2.2, C.orange, 0.6], ['g', 1.4, -1.3, 3, 'rgba(255,120,30,.55)'], ['r', 6.2, -2.4, 6.2, 2.2, C.gun, 0.4], ['c', 12.4, -1.3, 1.0, C.orange]] };
  R.water = { muzzle: [12.6, -1.2], parts: [grip(-0.4, 0.2, C.yellow), ['r', -2.8, -2.6, 13, 2.8, C.orange, 1.2], ['c', 1, -4.6, 2.6, C.cyan], ['r', 9.6, -2.0, 3, 1.6, C.yellow, 0.4], ['l', 3, -1.2, 8.6, -1.2, 0.35, C.yellow]] };
  R.termites = { muzzle: [5, -1.5], parts: [['r', -2.4, -5.0, 6.2, 7.2, C.cream, 1.4], ['r', -2.0, -4.0, 5.4, 5.8, '#b9d9e8', 1.2], ['r', -2.6, -6.2, 6.6, 1.6, C.brown, 0.5], ['c', -0.4, -1.2, 0.5, C.brown], ['c', 1.4, -2.4, 0.5, C.brown], ['c', 1.0, -0.2, 0.5, C.brown]] };
  R.lens = { muzzle: [9.6, -2.2], parts: [['r', -1.0, -0.8, 1.6, 5.0, C.wood, 0.8], ['l', 0, -0.8, 5, -2.2, 0.9, C.gold], ['o', 7.2, -2.2, 2.6, C.gold, 0.7], ['c', 7.2, -2.2, 2.2, '#cfe9f5'], ['c', 6.4, -3.0, 0.6, C.white]] };
  R.grenade = { muzzle: [2, -2], parts: [['c', 1, 0, 2.6, C.green], ['l', -1.2, -0.8, 3.2, -0.8, 0.25, '#3d7d3a'], ['l', -1.2, 0.8, 3.2, 0.8, 0.25, '#3d7d3a'], ['r', 0.1, -3.6, 1.8, 1.3, C.steel, 0.3], ['p', [1.8, -3.2, 3.4, -3.8, 3.6, -1.2, 2.6, -1.4], C.chrome], ['o', -0.4, -3.4, 0.8, C.chrome, 0.3]] };
  R.rocket = { muzzle: [15, -1.6], parts: [grip(1.2, 0.8, C.dark), ['r', -3.6, -3.4, 18.4, 3.6, C.green, 1.2], ['r', -4.6, -3.8, 1.6, 4.4, C.dark, 0.4], ['r', 13.4, -3.9, 1.8, 4.6, C.dark, 0.4], ['r', 3, -5.6, 3.6, 1.6, C.dark, 0.4], ['c', 4.8, -4.8, 0.6, C.red], ['p', [14.6, -2.8, 16.6, -1.6, 14.6, -0.4], C.red], ['l', -1, -2.6, 12, -2.6, 0.25, C.lime]] };
  R.homing = { muzzle: [14.4, -1.6], parts: [grip(1.2, 0.8, C.dark), ['r', -3.6, -4.0, 17.8, 4.8, C.gun2, 1.4], ['c', 13.4, -2.8, 0.8, C.red], ['c', 13.4, -0.4, 0.8, C.red], ['c', 11.6, -2.8, 0.8, C.red], ['c', 11.6, -0.4, 0.8, C.red], ['r', 2, -6.0, 4.4, 2, C.dark, 0.5], ['c', 4.2, -5, 0.6, C.lime], ['g', 4.2, -5, 1.6, 'rgba(160,255,90,.5)']] };
  R.cluster = { muzzle: [2.6, -2.2], parts: [['c', 1, 0, 3, C.dark], ['c', -0.4, -1.2, 0.8, C.yellow], ['c', 2.4, -1.0, 0.8, C.yellow], ['c', 1.0, 1.4, 0.8, C.yellow], ['r', 0, -4.2, 2, 1.4, C.steel, 0.3], ['l', 1, -4.2, 2.4, -5.6, 0.3, C.cream], ['c', 2.6, -5.8, 0.5, C.orange]] };
  R.sticky = { muzzle: [2.6, -2], parts: [['p', [-2.2, 0.6, -1.4, -2.2, 1.4, -2.8, 3.8, -1.4, 3.4, 1.8, 0.8, 2.6, -1.4, 2.4], C.lime], ['c', 0.8, -0.2, 1.2, C.red], ['c', 0.8, -0.2, 0.5, C.yellow], ['c', 3.6, 2.2, 0.5, C.lime], ['c', -2.0, 2.4, 0.4, C.lime]] };
  R.mine = { muzzle: [2, -1.5], parts: [['r', -2.6, -1.2, 7.2, 2.6, C.gun, 1.2], ['r', -1.6, -2.2, 5.2, 1.4, C.gun2, 0.6], ['c', 1, -2.2, 0.7, C.red], ['g', 1, -2.2, 1.6, 'rgba(255,60,60,.6)']] };
  R.firework = { muzzle: [9.4, -1.0], parts: [['l', -2.6, -1, 3, -1, 0.5, C.woodL], ['r', 2.4, -2.2, 6.0, 2.4, C.red, 0.4], ['l', 3.2, -2.0, 7.6, 0, 0.3, C.yellow], ['p', [8.4, -2.2, 10.2, -1.0, 8.4, 0.2], C.yellow], ['l', 2.4, -1, 1.2, -0.2, 0.2, C.cream]] };
  R.nuke = { muzzle: [9, -1.5], parts: [grip(0, 0.4, C.dark), ['p', [-2.6, -1.5, -1.0, -4.0, 6.4, -4.0, 9.6, -1.5, 6.4, 1.0, -1.0, 1.0], C.yellow], ['p', [-2.6, -1.5, -3.8, -3.6, -3.8, 0.6], C.dark], ['c', 3.2, -1.5, 1.4, C.dark], ['p', [3.2, -1.5, 2.6, -2.7, 3.8, -2.7], C.yellow], ['p', [3.2, -1.5, 2.0, -0.9, 2.6, -0.3], C.yellow], ['p', [3.2, -1.5, 4.4, -0.9, 3.8, -0.3], C.yellow]] };
  R.bowling = { muzzle: [2.6, -1.6], parts: [['c', 1, 0, 3.4, C.purple], ['c', 0.2, -1.4, 0.5, C.dark], ['c', 1.6, -1.6, 0.5, C.dark], ['c', 1.0, -0.4, 0.5, C.dark], ['c', -0.8, 1.6, 1.2, 'rgba(255,255,255,.18)']] };
  R.antigrav = { muzzle: [3, -1], parts: [['c', 1, 0, 2.6, C.navy], ['o', 1, 0, 3.6, C.purple, 0.4], ['c', 1, 0, 1.2, C.purple], ['g', 1, 0, 4.4, 'rgba(160,100,255,.45)'], ['c', 1, 0, 0.5, C.white]] };
  R.hammer = { muzzle: [9.4, -1.5], parts: [['r', -1.2, -1.2, 9, 1.6, C.wood, 0.6], ['r', 6.4, -4.8, 4.8, 8.4, C.gun2, 0.8], ['r', 6.0, -5.2, 5.6, 1.6, C.steel, 0.5], ['r', 6.0, 2.4, 5.6, 1.6, C.steel, 0.5], ['r', -1.6, -1.4, 2.6, 2.0, C.rubber, 0.6]] };
  R.chainsaw = { muzzle: [14, -0.8], parts: [['r', -3, -3.6, 7.4, 5.4, C.orange, 1.2], ['r', -2.4, -4.8, 4.2, 1.4, C.dark, 0.6], ['p', [4.2, -2.2, 14.6, -1.8, 15, -0.8, 14.6, 0.2, 4.2, 0.6], C.steel], ['l', 5, -2.0, 14.4, -1.6, 0.3, C.dark], ['l', 5, 0.4, 14.4, 0.0, 0.3, C.dark], ['c', 0.6, -1.0, 1.0, C.dark]] };
  R.katana = { muzzle: [15, -0.6], parts: [['r', -2.6, -0.9, 4, 1.8, C.dark, 0.6], ['l', -2.2, -0.9, -2.2, 0.9, 0.3, C.red], ['l', -0.8, -0.9, -0.8, 0.9, 0.3, C.red], ['r', 1.4, -1.8, 0.9, 3.6, C.gold, 0.3], ['p', [2.3, -0.7, 14, -0.9, 15.4, -0.3, 2.3, 0.6], C.chrome], ['l', 3, -0.3, 13.6, -0.5, 0.15, C.white]] };
  R.drill = { muzzle: [12.4, -1.4], parts: [grip(-0.4, 0, C.yellow), ['r', -2.6, -3.0, 7.6, 3.6, C.yellow, 1.2], ['r', 4.6, -2.4, 2.2, 2.0, C.dark, 0.4], ['p', [6.6, -2.4, 12.8, -1.2, 6.6, 0.0], C.chrome], ['l', 7.6, -2.0, 8.8, -0.2, 0.25, C.grey], ['l', 9.2, -1.8, 10.2, -0.4, 0.25, C.grey], ['c', -0.8, -1.2, 0.7, C.dark]] };
  R.wrecking = { muzzle: [8, 0], parts: [['r', -1.2, -1.0, 2.6, 2.0, C.rubber, 0.6], ['l', 1, 0, 5, 0, 0.5, C.steel], ['c', 7.6, 0, 2.8, C.dark], ['c', 6.8, -0.8, 0.8, C.grey]] };
  R.whip = { muzzle: [12, 0], parts: [['r', -1.4, -0.9, 4.2, 1.8, C.brown, 0.8], ['l', 2.6, 0, 6, -1.2, 0.5, C.wood], ['l', 6, -1.2, 9.6, 0.4, 0.4, C.wood], ['l', 9.6, 0.4, 12, -0.4, 0.3, C.woodL]] };
  R.glove = { muzzle: [9, -1], parts: [['r', -1.6, -1.0, 3.6, 2.0, C.dark, 0.6], ['o', 2.8, -1.0, 1.0, C.steel, 0.4], ['o', 4.4, -1.0, 1.0, C.steel, 0.4], ['c', 7.6, -1.0, 3.0, C.red], ['r', 5.2, -3.2, 2.0, 4.4, '#b8352b', 0.8], ['c', 8.4, -2.0, 0.8, C.white]] };
  R.stamp = { muzzle: [9.6, 0], parts: [['r', -1.4, -1.0, 4.4, 2.0, C.wood, 0.8], ['c', -1.6, 0, 1.6, C.woodL], ['r', 2.8, -0.6, 3, 1.2, C.dark, 0.3], ['r', 5.6, -4.4, 2.2, 8.8, C.red, 0.4], ['r', 7.6, -4.6, 1.4, 9.2, C.dark, 0.3]] };
  R.portal = { muzzle: [12.4, -1.6], parts: [grip(-0.4, 0.2, C.dark), ['r', -2.8, -3.6, 8.4, 4.4, C.white, 1.6], ['r', 5, -2.8, 6.4, 2.6, C.dark, 0.8], ['c', 11.6, -1.5, 1.4, C.cyan], ['g', 11.6, -1.5, 3.2, 'rgba(80,200,255,.55)'], ['l', -1.6, -2.0, 4, -2.0, 0.35, C.orange]] };
  R.gravity = { muzzle: [12.8, -1.6], parts: [grip(-0.4, 0.2, C.dark), ['r', -2.8, -3.6, 8, 4.6, C.orange, 1.0], ['r', 4.6, -3.0, 4.4, 3.2, C.dark, 0.6], ['p', [8.8, -3.2, 12.6, -4.6, 12.0, -3.4, 9.4, -2.2], C.steel], ['p', [8.8, 0.0, 12.6, 1.4, 12.0, 0.2, 9.4, -1.0], C.steel], ['c', 10.4, -1.6, 0.9, C.yellow], ['g', 10.4, -1.6, 2.6, 'rgba(255,200,60,.5)']] };
  R.magnet = { muzzle: [9, -1.5], parts: [grip(-0.6, 0.4, C.dark), ['o', 5.6, -1.5, 2.8, C.red, 1.5], ['r', 2.4, -4.6, 3.4, 1.6, C.red, 0.2], ['r', 2.4, 1.6, 3.4, 1.6, C.red, 0.2], ['r', 4.8, -4.6, 1.6, 1.6, C.chrome, 0.2], ['r', 4.8, 1.6, 1.6, 1.6, C.chrome, 0.2], ['r', -2, -1.2, 4.6, 1.8, C.gun, 0.4]] };
  R.ballgun = { muzzle: [11.6, -1.4], parts: [grip(-0.4, 0, C.cyan), ['r', -2.6, -3, 9.4, 3.4, C.cyan, 1.4], ['c', 2.6, -4.6, 2.2, C.white], ['c', 2.0, -5.0, 0.8, C.pink], ['c', 3.4, -4.2, 0.8, C.yellow], ['r', 6.6, -2.4, 5, 2.2, C.pink, 1]] };
  R.boomerang = { muzzle: [4, -2], parts: [['p', [-2.6, 1.2, 1.0, -4.6, 3.0, -4.6, 1.0, -0.4, 6.0, 1.0, 5.2, 2.6, 0.0, 2.6], C.orange], ['l', -1.4, 1.2, 1.4, -3.4, 0.25, C.yellow], ['l', 1.6, 1.4, 5.2, 1.8, 0.25, C.yellow]] };
  R.blackhole = { muzzle: [3, -1], parts: [['g', 1, 0, 5, 'rgba(155,93,229,.55)'], ['c', 1, 0, 2.8, C.black], ['o', 1, 0, 3.0, C.purple, 0.5], ['o', 1, 0, 4.0, 'rgba(155,93,229,.6)', 0.25]] };
  R.snowball = { muzzle: [2.6, -1.4], parts: [['c', 1, 0, 2.8, C.white], ['c', 0.2, -0.8, 0.9, '#d6eef8'], ['c', 2.0, 0.8, 0.6, '#c3e3f2']] };
  R.banana = { muzzle: [4, -2.4], parts: [['p', [-2.6, -1.4, -1.6, 1.2, 1.4, 2.4, 4.6, 1.2, 6.0, -1.4, 5.4, -1.6, 3.8, 0.0, 0.6, 0.2, -1.6, -2.0], C.yellow], ['l', -2.4, -1.6, -3, -2.6, 0.5, C.brown], ['c', 5.8, -1.6, 0.4, C.brown], ['r', 0.6, -1.4, 1.6, 1.0, C.red, 0.3]] };
  R.cutter = { muzzle: [11, -0.4], parts: [['o', -1.4, -1.6, 1.4, C.red, 0.6], ['o', -1.4, 1.4, 1.4, C.red, 0.6], ['p', [0, -1.2, 11, -0.6, 11, -0.1, 0.4, 0.2], C.chrome], ['p', [0, 1.0, 11, 0.2, 11, -0.2, 0.4, -0.2], C.steel], ['c', 0.8, -0.2, 0.5, C.dark]] };
  R.vacuum = { muzzle: [13.2, 0.6], parts: [['r', -3, -3.4, 7, 5.6, C.gold, 1.6], ['c', 0.4, -0.6, 1.4, C.dark], ['l', 4, -1, 10, 0.4, 1.4, C.grey], ['p', [10, -1.0, 13.6, -0.2, 13.6, 1.6, 10, 1.8], C.dark], ['r', -2.6, -4.6, 3, 1.4, C.dark, 0.5]] };
  R.pen = { muzzle: [10.4, 0], parts: [['r', -1.4, -1.0, 9, 2.0, C.navy, 0.9], ['r', 1.0, -1.6, 3.4, 0.7, C.gold, 0.3], ['p', [7.6, -1.0, 10.6, 0, 7.6, 1.0], C.cream], ['p', [9.6, -0.35, 10.6, 0, 9.6, 0.35], C.dark], ['c', -1.4, 0, 1.0, C.navy]] };
  R.blower = { muzzle: [14, -0.8], parts: [grip(-0.2, 0.6, C.dark), ['r', -3, -3.6, 7.4, 5, C.orange, 1.6], ['c', 0.8, -1.2, 1.4, C.dark], ['l', 4.2, -0.8, 13, -0.8, 1.6, C.grey], ['r', 12.8, -2.2, 1.4, 2.8, C.dark, 0.3]] };
  R.airstrike = { muzzle: [4, -3], parts: [['r', -1.8, -2.8, 5.6, 6.8, C.green, 0.8], ['r', -1.0, -1.8, 4, 2.4, C.dark, 0.3], ['c', 0.2, 2.0, 0.6, C.red], ['c', 2.0, 2.0, 0.6, C.yellow], ['l', 3.0, -2.8, 4.6, -7.0, 0.35, C.dark], ['c', 4.6, -7.2, 0.5, C.red]] };
  R.orbital = { muzzle: [4, -3], parts: [['r', -1.6, -1.8, 4.8, 4.8, C.navy, 1.0], ['p', [-0.6, -1.8, 0.8, -5.0, 2.2, -1.8], C.steel], ['c', 0.8, -5.2, 0.8, C.cyan], ['g', 0.8, -5.2, 2.4, 'rgba(110,220,255,.6)'], ['c', 0.8, 0.6, 0.8, C.cyan]] };
  R.meteor = { muzzle: [9.4, -2.2], parts: [['l', -1.4, 2.4, 6, -1.4, 0.8, C.wood], ['c', 7.4, -2.2, 2.4, C.brown], ['c', 6.8, -2.8, 0.7, C.orange], ['c', 8.2, -1.6, 0.6, C.red], ['g', 7.4, -2.2, 3.6, 'rgba(255,120,40,.5)']] };
  R.bees = { muzzle: [4, -2], parts: [['p', [-1.6, 2.4, -2.4, -0.6, -1.0, -3.6, 3.0, -3.6, 4.4, -0.6, 3.6, 2.4], C.gold], ['l', -2.0, -0.6, 4.0, -0.6, 0.3, C.brown], ['l', -1.6, 1.0, 3.6, 1.0, 0.3, C.brown], ['c', 1, 2.2, 0.8, C.dark], ['c', 4.6, -4.2, 0.6, C.yellow]] };
  R.tornado = { muzzle: [5, -2], parts: [['p', [-2.6, -4.0, 5.4, -4.0, 2.8, 3.8, 0.0, 3.8], C.grey], ['l', -1.8, -2.6, 4.6, -2.6, 0.3, C.white], ['l', -1.0, -0.8, 3.8, -0.8, 0.3, C.white], ['l', -0.2, 1.0, 3.0, 1.0, 0.3, C.white]] };
  R.lightning = { muzzle: [10.6, -3.2], parts: [['l', -1.6, 2.8, 8, -2.4, 0.9, C.wood], ['p', [7.6, -5.4, 11.4, -3.6, 9.6, -3.2, 11.4, -1.0, 7.6, -2.8, 9.4, -3.2], C.yellow], ['g', 9.6, -3.2, 3.2, 'rgba(255,230,90,.55)']] };
  R.quake = { muzzle: [8, -1.2], parts: [['r', -1.2, -1.0, 7, 1.8, C.wood, 0.6], ['p', [5.4, -3.2, 10.4, -3.2, 9.4, 1.8, 6.4, 1.8], C.brown], ['l', 6.0, -1.4, 7.4, 0.2, 0.3, C.orange], ['l', 7.4, 0.2, 8.4, -1.6, 0.3, C.orange], ['l', 8.4, -1.6, 9.6, 0.4, 0.3, C.orange]] };

  R.altf4 = { muzzle: [11.2, -1.8], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.2, 14, 4.8, C.gun, 0.8], ['r', -1.8, -3.6, 4.4, 3.6, C.white, 0.6], ['r', 3.4, -3.6, 4.4, 3.6, C.white, 0.6], ['r', 8.6, -3.6, 2.4, 3.6, C.red, 0.5], ['l', 9.2, -2.8, 10.4, -1.0, 0.3, C.white], ['l', 10.4, -2.8, 9.2, -1.0, 0.3, C.white]] };
  R.fist = { muzzle: [11, -1.2], parts: [['r', -2.6, -2.4, 6, 3.2, C.steel, 0.8], ['p', [-2.6, -2.0, -4.6, -3.0, -4.6, 0.8, -2.6, 0.4], C.orange], ['r', 3.0, -4.4, 7.6, 6.6, C.white, 2.4], ['r', 3.4, -4.4, 1.8, 6.6, '#d9dee6', 1.0], ['l', 6.6, -4.0, 6.6, 1.8, 0.25, C.grey], ['l', 8.4, -4.0, 8.4, 1.8, 0.25, C.grey], ['g', -4.8, -1.2, 2.4, 'rgba(255,150,40,.6)']] };
  R.rmrf = { muzzle: [12.4, -1.6], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.4, 15.2, 5.6, C.black, 0.7], ['r', -2.6, -4.4, 15.2, 1.2, C.gun2, 0.5], ['l', -1.6, -2.2, 0.0, -1.4, 0.3, C.lime], ['l', 0.0, -1.4, -1.6, -0.6, 0.3, C.lime], ['l', 1.0, -1.4, 6.0, -1.4, 0.4, C.lime], ['l', 6.8, -1.4, 9.0, -1.4, 0.4, C.red], ['c', 11.6, -1.4, 0.6, C.lime]] };
  R.ctrlz = { muzzle: [11, -1.6], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.0, 6.2, 4.6, C.white, 0.8], ['r', 4.2, -4.0, 6.2, 4.6, C.white, 0.8], ['l', -1.2, -2.6, 1.6, -2.6, 0.3, C.dark], ['l', 5.6, -2.8, 8.8, -2.8, 0.35, C.blue], ['l', 8.8, -2.8, 5.6, -0.8, 0.35, C.blue], ['l', 5.6, -0.8, 8.8, -0.8, 0.35, C.blue], ['o', -0.2, -1.2, 0.6, C.dark, 0.25]] };
  R.kill9 = { muzzle: [19.4, -1.4], parts: [stock(C.black, -2.2), grip(-0.6, 0, C.black), ['r', -2.4, -2.8, 9.2, 3, C.black, 0.4], ['r', 6.4, -2.1, 13, 1.3, C.dark, 0.4], ['r', -0.6, -5.4, 7.4, 1.8, C.red, 0.8], ['c', 6.6, -4.5, 0.6, C.white], ['l', 8, -1.4, 18, -1.4, 0.2, C.red], ['p', [18.6, -2.4, 19.8, -1.4, 18.6, -0.4], C.red]] };
  R.forkbomb = { muzzle: [3, -3], parts: [['c', 1, 0.4, 2.8, C.black], ['c', 0.2, -0.4, 0.8, C.gun2], ['l', 1, -2.4, 1, -4.4, 0.4, C.chrome], ['l', 0, -4.4, 0, -6.0, 0.3, C.chrome], ['l', 1, -4.4, 1, -6.2, 0.3, C.chrome], ['l', 2, -4.4, 2, -6.0, 0.3, C.chrome], ['c', 1, 0.6, 0.6, C.red]] };
  R.dragdrop = { muzzle: [8, -1.5], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.4, -2.6, 6, 3, C.gun2, 0.8], ['p', [4.2, -5.0, 4.2, 2.6, 6.0, 0.8, 7.4, 3.8, 8.6, 3.2, 7.2, 0.4, 9.6, 0.4], C.white], ['g', 6.4, -1, 3, 'rgba(120,200,255,.4)']] };
  R.wsportal = { muzzle: [12.4, -1.6], parts: [grip(-0.4, 0.2, C.dark), ['r', -2.8, -3.4, 9, 4.2, C.navy, 1.4], ['o', 1.4, -1.3, 1.4, C.cyan, 0.5], ['o', 4.6, -1.3, 1.4, C.orange, 0.5], ['r', 6.2, -2.6, 5, 2.4, C.dark, 0.6], ['c', 11.8, -1.4, 1.2, C.purple], ['g', 11.8, -1.4, 2.8, 'rgba(155,93,229,.55)']] };
  R.screenshot = { muzzle: [8.6, -1.8], parts: [['r', -2.6, -4.2, 10, 6.4, C.dark, 1.2], ['r', -1.8, -5.2, 3.2, 1.4, C.gun2, 0.4], ['c', 3.6, -1.0, 2.4, C.gun2], ['c', 3.6, -1.0, 1.6, C.black], ['c', 3.0, -1.6, 0.5, C.white], ['r', 5.6, -3.6, 1.6, 1.0, C.yellow, 0.3]] };
  R.cursors = { muzzle: [8, -2], parts: [['p', [-1.6, -5.6, -1.6, 2.2, 0.4, 0.4, 1.8, 3.4, 3.0, 2.8, 1.6, 0.0, 4.2, 0.0], C.white], ['p', [3.2, -5.0, 3.2, 0.6, 4.6, -0.6, 5.6, 1.6, 6.4, 1.2, 5.4, -1.0, 7.4, -1.0], C.white]] };
  R.bsod = { muzzle: [10, -1.8], parts: [grip(1.8, 2.6, C.dark), ['r', -2.6, -5.0, 12.6, 7.6, C.dark, 0.8], ['r', -1.8, -4.2, 11, 6, C.blue, 0.4], ['l', -0.6, -2.6, 1.0, -2.6, 0.5, C.white], ['l', -0.6, -0.8, 6.0, -0.8, 0.3, C.white], ['l', -0.6, 0.6, 4.0, 0.6, 0.3, C.white]] };
  R.tiler = { muzzle: [11, -1.6], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.6, 13.4, 6.2, C.gun, 0.8], ['r', -1.8, -3.8, 3.4, 2.2, C.cyan, 0.3], ['r', 2.0, -3.8, 3.4, 2.2, C.blue, 0.3], ['r', 5.8, -3.8, 3.4, 2.2, C.cyan, 0.3], ['r', -1.8, -1.2, 5.4, 2.0, C.blue, 0.3], ['r', 4.0, -1.2, 5.2, 2.0, C.cyan, 0.3]] };
  R.sudo = { muzzle: [9, -2], parts: [grip(-0.4, 0.4, C.dark), ['p', [-2.4, -1.0, -1.6, -5.6, 0.8, -3.4, 2.8, -6.2, 4.8, -3.4, 7.2, -5.6, 8.0, -1.0], C.gold], ['r', -2.4, -1.4, 10.4, 1.8, C.gold, 0.4], ['c', 2.8, -2.6, 0.7, C.red], ['c', 0.2, -2.0, 0.5, C.cyan], ['c', 5.4, -2.0, 0.5, C.lime]] };
  R.panic = { muzzle: [10, -1.8], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.4, 12, 5.4, C.black, 0.6], ['l', -1.6, -3.0, 5.4, -3.0, 0.35, C.white], ['l', -1.6, -1.6, 8.0, -1.6, 0.35, C.white], ['l', -1.6, -0.2, 3.6, -0.2, 0.35, C.red], ['r', 8.0, -4.0, 1.4, 1.4, C.red, 0.3]] };
  R.segv = { muzzle: [10.4, -1.6], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -3.8, 12.4, 4.6, C.dark, 0.5], ['r', -1.6, -3.0, 2, 2, C.lime, 0], ['r', 1.0, -3.0, 2, 2, C.black, 0], ['r', 3.6, -3.0, 2, 2, C.pink, 0], ['r', 6.2, -3.0, 2, 2, C.black, 0], ['r', 8.0, -2.4, 1.8, 1.6, C.red, 0.2]] };
  R.zip = { muzzle: [3.6, -2.4], parts: [['r', -2.4, -3.4, 7.2, 7.2, C.yellow, 1.0], ['r', 0.6, -3.4, 1.4, 7.2, C.dark, 0.2], ['l', 1.3, -2.6, 1.3, 2.8, 0.3, C.gold], ['r', 0.4, 0.6, 1.8, 2.0, C.steel, 0.4]] };
  R.ddos = { muzzle: [11, -2], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -3.4, 8, 4.2, C.gun2, 0.8], ['l', 5.4, -1.4, 8.6, -1.4, 0.5, C.steel], ['o', 9.6, -1.4, 1.2, C.cyan, 0.35], ['o', 9.6, -1.4, 2.4, C.cyan, 0.3], ['c', 9.6, -1.4, 0.5, C.white], ['l', 1, -3.4, 1, -6.6, 0.35, C.dark], ['c', 1, -6.8, 0.6, C.red]] };
  R.grep = { muzzle: [9.4, -2.8], parts: [['l', -1.6, 2.4, 3.6, -1.0, 1.0, C.dark], ['o', 6.0, -2.8, 2.8, C.gun2, 0.8], ['c', 6.0, -2.8, 2.3, '#d8f2ff'], ['l', 4.8, -3.2, 7.2, -3.2, 0.3, C.dark], ['l', 4.8, -2.2, 6.4, -2.2, 0.3, C.red]] };
  R.caps = { muzzle: [9, -1.6], parts: [grip(-0.4, 0.6, C.dark), ['r', -2.6, -5.0, 10, 6.6, C.white, 1.2], ['r', -2.0, -4.4, 8.8, 5.0, C.cream, 0.9], ['p', [2.2, -3.6, 4.0, -1.4, 0.4, -1.4], C.dark], ['c', 5.6, -3.4, 0.5, C.lime], ['g', 5.6, -3.4, 1.4, 'rgba(150,255,90,.6)']] };
  R.copypaste = { muzzle: [9.6, -1.2], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -5.0, 9, 7.4, C.wood, 0.8], ['r', -1.4, -5.8, 6.6, 1.8, C.steel, 0.5], ['r', -1.6, -3.4, 7, 4.8, C.white, 0.3], ['l', -0.8, -2.4, 4.4, -2.4, 0.25, C.grey], ['l', -0.8, -1.2, 3.2, -1.2, 0.25, C.grey], ['r', 4.8, -2.0, 4.4, 1.6, C.cyan, 0.4]] };
  R.tear = { muzzle: [11.6, -1.4], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.8, 6.4, 2.4, C.cyan, 0.3], ['r', 0.2, -2.4, 6.4, 2.4, C.pink, 0.3], ['r', -1.4, 0.0, 6.4, 2.4, C.lime, 0.3], ['r', 5.8, -2.4, 6, 2.2, C.dark, 0.6], ['l', 6.4, -1.3, 11.4, -1.3, 0.3, C.cyan]] };
  R.pixelsort = { muzzle: [10.6, -1.4], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.4, 2, 5, C.black, 0], ['r', -0.6, -4.4, 2, 5, C.dark, 0], ['r', 1.4, -4.4, 2, 5, C.gun2, 0], ['r', 3.4, -4.4, 2, 5, C.grey, 0], ['r', 5.4, -4.4, 2, 5, C.steel, 0], ['r', 7.4, -4.4, 2, 5, C.white, 0], ['r', 9.0, -2.4, 1.8, 2, C.purple, 0.4]] };
  R.deadpx = { muzzle: [3.4, -1.4], parts: [['r', -2.2, -3.4, 6.8, 6.8, C.dark, 0.6], ['r', -1.2, -2.4, 2.2, 2.2, C.pink, 0], ['r', 1.0, -0.2, 2.2, 2.2, C.lime, 0], ['r', 1.0, -2.4, 2.2, 2.2, C.black, 0], ['r', -1.2, -0.2, 2.2, 2.2, C.cyan, 0]] };
  R.theme = { muzzle: [9.6, -2.4], parts: [['p', [-1.6, 2.6, -2.6, -1.4, 0.2, -4.8, 6.6, -4.4, 9.4, -1.4, 8.0, 2.2, 3.4, 1.0, 1.2, 3.2], C.cream], ['c', 0.8, -2.4, 1.0, C.red], ['c', 3.6, -3.0, 1.0, C.yellow], ['c', 6.4, -2.4, 1.0, C.cyan], ['c', 7.4, 0.4, 1.0, C.purple], ['c', -0.6, 0.6, 0.9, C.lime]] };
  R.usb = { muzzle: [9.6, -1], parts: [['r', -2.4, -2.6, 7.6, 3.8, C.navy, 0.8], ['r', 5, -2.0, 4.6, 2.6, C.chrome, 0.2], ['r', 6.2, -1.4, 1.0, 0.8, C.dark, 0], ['r', 8.0, -1.4, 1.0, 0.8, C.dark, 0], ['c', 0.6, -0.8, 0.5, C.cyan]] };
  R.battery = { muzzle: [3.4, -2.4], parts: [['r', -1.8, -4.6, 5.6, 9.2, C.dark, 0.8], ['r', -1.0, -5.6, 4.0, 1.2, C.steel, 0.3], ['r', -1.0, -3.6, 4, 2.6, C.lime, 0.3], ['r', -1.0, -0.6, 4, 2.6, C.lime, 0.3], ['r', -1.0, 2.4, 4, 1.6, C.green, 0.3], ['l', 0.4, -2.8, 1.6, -2.8, 0.3, C.dark]] };
  R.scroll = { muzzle: [6.4, -2], parts: [['r', -2.4, -4.4, 8, 9.6, C.gun2, 3.6], ['l', 1.6, -4.4, 1.6, -0.6, 0.25, C.dark], ['r', 0.9, -3.2, 1.4, 2.4, C.chrome, 0.7], ['l', 1.6, -2.6, 1.6, -1.4, 0.25, C.grey]] };
  R.notifspam = { muzzle: [10.4, -1.6], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.8, 12.6, 4.4, C.dark, 1.0], ['r', -1.8, -4.0, 2.4, 2.4, C.cyan, 0.4], ['l', 1.4, -3.4, 8.4, -3.4, 0.4, C.white], ['l', 1.4, -1.8, 6.2, -1.8, 0.35, C.grey], ['c', 9.4, -4.6, 1.0, C.red]] };
  R.defrag = { muzzle: [10.4, -1.6], parts: [grip(-0.4, 0.4, C.dark), ['r', -2.6, -4.6, 12.4, 5.4, C.gun, 0.6], ['r', -1.8, -3.8, 2.4, 1.6, C.blue, 0], ['r', 0.8, -3.8, 2.4, 1.6, C.cyan, 0], ['r', 3.4, -3.8, 2.4, 1.6, C.blue, 0], ['r', -1.8, -1.8, 2.4, 1.6, C.cyan, 0], ['r', 0.8, -1.8, 2.4, 1.6, C.red, 0], ['r', 6.2, -3.8, 3.0, 3.6, C.dark, 0.4]] };
  R.overclock = { muzzle: [4, -1.6], parts: [['r', -2.4, -4.4, 7.6, 7.6, C.gun2, 0.6], ['r', -1.2, -3.2, 5.2, 5.2, C.dark, 0.3], ['r', -0.2, -2.2, 3.2, 3.2, C.red, 0.3], ['g', 1.4, -0.6, 3.6, 'rgba(255,70,40,.55)'], ['l', -3.4, -2.6, -2.4, -2.6, 0.35, C.gold], ['l', -3.4, 1.4, -2.4, 1.4, 0.35, C.gold], ['l', 5.2, -2.6, 6.2, -2.6, 0.35, C.gold], ['l', 5.2, 1.4, 6.2, 1.4, 0.35, C.gold]] };
  R.peeler = { muzzle: [10.6, -0.4], parts: [['r', -1.4, -1.2, 5.6, 2.4, C.yellow, 0.9], ['p', [4.0, -1.0, 9.4, -2.6, 10.8, -0.4, 9.4, 1.8, 4.0, 1.0], C.chrome], ['l', 9.6, -2.2, 10.6, 1.4, 0.25, C.white]] };

  const ALIAS = { superq: 'fist', segfault: 'segv', zipbomb: 'zip', tearing: 'tear', deadpixel: 'deadpx' };
  V.recipeFor = (id) => R[ALIAS[id] || id];
  V.install = () => {
    const WP = WTP.weapons;
    for (const d of WP.DEFS) {
      const r = V.recipeFor(d.id);
      if (!r) continue;
      d.pixelSprite = d.pixelSprite || d.sprite;
      d.sprite = new VSprite(r);
    }
  };
  V.R = R;
  V.install();
})();
