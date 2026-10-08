(() => {
  const WTP = window.WTP;
  const X = {};
  WTP.pxs = X;
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const RAMPS = {
    gun: ['#1b1e25', '#2c313b', '#434a57', '#677182'],
    steel: ['#565d6a', '#858e9c', '#b5bdc9', '#e9eef4'],
    rubber: ['#121419', '#1f2228', '#2e323a', '#434852'],
    wood: ['#47291a', '#6d4128', '#94613b', '#c08b58'],
    gold: ['#77511a', '#b5842c', '#e3b94b', '#fbe9a6'],
    red: ['#661818', '#a3282a', '#d9493c', '#f58c76'],
    orange: ['#73350f', '#b25a1b', '#f08a2e', '#ffc581'],
    yellow: ['#86650f', '#c79f24', '#f4d03f', '#fff2a6'],
    green: ['#1d4a24', '#2d7634', '#56b955', '#a3e59a'],
    lime: ['#3c6815', '#6ca223', '#a6e05a', '#dbf8a6'],
    cyan: ['#125870', '#278cae', '#4cc6ec', '#b4eefc'],
    blue: ['#1a2d68', '#2a48a4', '#3e70d9', '#93b3f6'],
    navy: ['#10183a', '#1b2856', '#2a3b78', '#4c60a6'],
    purple: ['#3b2064', '#61349b', '#9b5de5', '#cfaaf7'],
    pink: ['#78214e', '#b53a78', '#ef6aa8', '#fcbad7'],
    white: ['#8e94a2', '#bac1cb', '#e1e5eb', '#ffffff'],
    cream: ['#988560', '#c7b388', '#f1e3c0', '#fffaee'],
    brown: ['#2b1d13', '#473120', '#6b4a2f', '#946d4b'],
    teal: ['#10403d', '#1c6863', '#2da198', '#82ded5'],
    glass: ['#3a6d86', '#6aacca', '#bde6fb', '#ffffff'],
    grey: ['#474c56', '#6c727f', '#989fac', '#cbd1da'],
    magenta: ['#5e1450', '#9a1f86', '#e03ad1', '#f9a6f1'],
    fire: ['#8a1d0f', '#d9491c', '#ff9a2e', '#fff1a6'],
    ice: ['#2b5f80', '#5aa6d0', '#a8e2fb', '#ffffff'],
    paper: ['#9a9a90', '#c9c9c0', '#ededE6', '#ffffff'],
    blood: ['#4a0c0c', '#7a1414', '#b3201f', '#e0503f']
  };
  X.RAMPS = RAMPS;
  const RGB = {};
  for (const [k, v] of Object.entries(RAMPS)) RGB[k] = v.map((c) => hex(c.length === 7 ? c : c.slice(0, 7)));
  const OUT = [10, 11, 14];
  X.OUT = OUT;
  const FIXED = { '1': ['gun', 0], '2': ['gun', 1], '3': ['gun', 2], '4': ['gun', 3], '5': ['steel', 0], '6': ['steel', 1], '7': ['steel', 2], '8': ['steel', 3], '9': ['rubber', 0], '0': ['rubber', 2], v: ['wood', 0], w: ['wood', 1], W: ['wood', 2], V: ['wood', 3] };
  const ACC = { a: ['A', 0], b: ['A', 1], c: ['A', 2], C: ['A', 3], e: ['B', 0], f: ['B', 1], g: ['B', 2], G: ['B', 3], i: ['C', 0], j: ['C', 1], k: ['C', 2], K: ['C', 3] };

  function colorFor(ch, def) {
    if (ch === '#') return OUT;
    if (ch === 'x') return [255, 255, 255];
    if (def.pal && def.pal[ch]) return hex(def.pal[ch]);
    if (FIXED[ch]) { const [r, i] = FIXED[ch]; return RGB[r][i]; }
    if (ACC[ch]) { const [slot, i] = ACC[ch]; const r = RGB[def[slot] || 'red']; return r[i]; }
    return null;
  }
  function parse(str, def) {
    const rows = str.split('\n').map((r) => r.replace(/\s+$/, '')).filter((r, i, a) => r.length || (i > 0 && i < a.length - 1));
    while (rows.length && !rows[0].trim()) rows.shift();
    while (rows.length && !rows[rows.length - 1].trim()) rows.pop();
    const ind = Math.min(...rows.filter((r) => r.trim()).map((r) => r.match(/^ */)[0].length));
    const R = rows.map((r) => r.slice(ind));
    const h = R.length, w = Math.max(...R.map((r) => r.length));
    const px = new Array(w * h).fill(null);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = R[y][x]; if (ch && ch !== '.' && ch !== ' ') px[y * w + x] = colorFor(ch, def); }
    return { w, h, px };
  }
  X.parse = parse;

  function scale2x(src, w, h) {
    const W = w * 2, out = new Array(W * h * 2);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : src[y * w + x]);
    const eq = (a, b) => a === b || (a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), C = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (eq(C, A) && !eq(C, D) && !eq(A, B)) e0 = A;
      if (eq(A, B) && !eq(A, C) && !eq(B, D)) e1 = B;
      if (eq(D, C) && !eq(D, B) && !eq(C, A)) e2 = C;
      if (eq(B, D) && !eq(B, A) && !eq(D, C)) e3 = D;
      const o = y * 2 * W + x * 2;
      out[o] = e0; out[o + 1] = e1; out[o + W] = e2; out[o + W + 1] = e3;
    }
    return out;
  }
  function up8(px, w, h) { let a = px, W = w, H = h; for (let k = 0; k < 3; k++) { a = scale2x(a, W, H); W *= 2; H *= 2; } return a; }

  function toCanvas(px, w, h, dst) {
    const c = dst || document.createElement('canvas');
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext('2d', { willReadFrequently: true });
    const im = g.createImageData(w, h), d = im.data;
    for (let i = 0; i < w * h; i++) { const q = px[i]; if (!q) continue; d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
    return c;
  }
  function outline(px, w, h) {
    const out = px.slice();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (px[i]) continue;
      if ((x > 0 && px[i - 1] && px[i - 1] !== OUT) || (x < w - 1 && px[i + 1] && px[i + 1] !== OUT) || (y > 0 && px[i - w] && px[i - w] !== OUT) || (y < h - 1 && px[i + w] && px[i + w] !== OUT)) out[i] = OUT;
    }
    return out;
  }
  X.outline = outline;

  class PSprite {
    constructor(id, def) {
      this.id = id;
      this.def = def;
      this.base0 = parse(def.px, def);
      this.layers = [];
      for (const [name, L] of Object.entries(def.L || {})) {
        const frames = (Array.isArray(L.px) ? L.px : [L.px]).map((s) => parse(s, { ...def, ...(L.def || {}) }));
        this.layers.push({ name, anim: L.anim || name, frames, dx: L.dx || 0, dy: L.dy || 0, opt: L });
      }
      const w = this.base0.w, h = this.base0.h;
      this.pw = w; this.ph = h;
      const [ox, oy] = def.o || [Math.floor(w * 0.3), Math.floor(h * 0.6)];
      this.ox = ox; this.oy = oy;
      const [mx, my] = def.m || [w - 1, oy];
      this.mxy = [mx - ox + 0.5, my - oy];
      this.b = { x0: -ox - 1.5, y0: -oy - 1.5, x1: w - ox + 0.5, y1: h - oy + 0.5 };
      this.w = w + 2; this.h = h + 2;
      this.gx = ox + 1.5; this.gy = oy + 1.5;
      this.mx = this.mxy[0] + this.gx; this.my = this.mxy[1] + this.gy;
      this.vector = true;
      this.pixel = true;
      this.frames = new Map();
      this.rot = new Map();
      this.icons = new Map();
      this.sk = new Map();
    }
    get cv() { return this.base(); }
    keyOf(st) {
      if (!st || !this.layers.length) return 'rest';
      let k = '';
      for (const L of this.layers) k += L.name + ':' + X.layerState(L, st, this) + '|';
      return k;
    }
    compose(key, st) {
      let f = this.frames.get(key);
      if (f) return f;
      const { w, h } = this.base0;
      const px = this.base0.px.slice();
      for (const L of this.layers) {
        const s = key === 'rest' ? X.layerState(L, null, this) : X.layerState(L, st, this);
        if (s === 'off') continue;
        const [fi, dx, dy] = String(s).split(',').map(Number);
        const F = L.frames[Math.min(L.frames.length - 1, fi || 0)];
        for (let y = 0; y < F.h; y++) for (let x = 0; x < F.w; x++) {
          const q = F.px[y * F.w + x];
          if (!q) continue;
          const tx = x + (dx || 0) + L.dx, ty = y + (dy || 0) + L.dy;
          if (tx < 0 || ty < 0 || tx >= w || ty >= h) continue;
          px[ty * w + tx] = q;
        }
      }
      f = { px, w, h };
      this.frames.set(key, f);
      if (this.frames.size > 64) { const k0 = this.frames.keys().next().value; this.frames.delete(k0); }
      return f;
    }
    skinPx(f, skin) {
      if (!skin) return f.px;
      const out = f.px.slice();
      for (let i = 0; i < out.length; i++) {
        const q = out[i];
        if (!q || q === OUT) continue;
        const x = (i % f.w) + 1, y = Math.floor(i / f.w) + 1;
        out[i] = skin.fn(q[0], q[1], q[2], x, y, skin.frame || 0);
      }
      return out;
    }
    padded(px, w, h) {
      const W = w + 2, H = h + 2, out = new Array(W * H).fill(null);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[(y + 1) * W + x + 1] = px[y * w + x];
      return outline(out, W, H);
    }
    base() {
      if (this._base) return this._base;
      const f = this.compose('rest');
      return (this._base = toCanvas(this.padded(f.px, f.w, f.h), f.w + 2, f.h + 2));
    }
    skinBase(skin) {
      const k = `b|${skin.key}|${skin.frame || 0}`;
      let c = this.sk.get(k);
      if (!c) { const f = this.compose('rest'); c = toCanvas(this.padded(this.skinPx(f, skin), f.w, f.h), f.w + 2, f.h + 2); this.sk.set(k, c); }
      return c;
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
    rotated(ang, flip, key = 'rest', st = null, skin = null) {
      const step = Math.round(((ang % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 32)) % 64;
      const rk = `${key}|${step}|${flip ? 1 : 0}|${skin ? skin.key + (skin.frame || 0) : ''}`;
      let r = this.rot.get(rk);
      if (r) return r;
      const f = this.compose(key, st);
      const src = skin ? this.skinPx(f, skin) : f.px;
      const ukey = key + '|' + (skin ? skin.key + (skin.frame || 0) : '');
      f.up = f.up || new Map();
      let U = f.up.get(ukey);
      if (!U) { U = up8(src, f.w, f.h); f.up.set(ukey, U); if (f.up.size > 6) f.up.delete(f.up.keys().next().value); }
      const a = step * (Math.PI / 32);
      const { w, h } = f, ox = this.ox + 0.5, oy = this.oy + 0.5;
      const R = Math.ceil(Math.max(Math.hypot(ox, oy), Math.hypot(w - ox, oy), Math.hypot(ox, h - oy), Math.hypot(w - ox, h - oy))) + 2;
      const S = R * 2, out = new Array(S * S).fill(null);
      const ca = Math.cos(a), sa = Math.sin(a), W8 = w * 8, H8 = h * 8;
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
        const px = dx + 0.5 - R, py = dy + 0.5 - R;
        let lx = px * ca + py * sa, ly = -px * sa + py * ca;
        if (flip) ly = -ly;
        const u = Math.floor((lx + ox) * 8), v = Math.floor((ly + oy) * 8);
        if (u < 0 || v < 0 || u >= W8 || v >= H8) continue;
        out[dy * S + dx] = U[v * W8 + u];
      }
      r = { cv: toCanvas(outline(out, S, S), S, S), ox: R, oy: R, a, sc: 1 };
      this.rot.set(rk, r);
      if (this.rot.size > 900) this.rot.delete(this.rot.keys().next().value);
      return r;
    }
    draw(ctx, x, y, ang, flip, skin, st) {
      const key = st ? this.keyOf(st) : 'rest';
      const r = this.rotated(ang, flip, key, st, skin);
      const sm = ctx.imageSmoothingEnabled;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(r.cv, Math.round(x - r.ox), Math.round(y - r.oy));
      ctx.imageSmoothingEnabled = sm;
    }
    drawC(ctx, x, y, ang) {
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
  X.PSprite = PSprite;

  X.layerState = (L, st, sp) => {
    const o = L.opt;
    switch (L.anim) {
      case 'slide': case 'bolt': {
        if (!st) return '0,0,0';
        const dur = o.dur || (L.anim === 'bolt' ? 0.45 : 0.1), back = o.back || 2;
        const t = st.t;
        if (t >= dur) return '0,0,0';
        const k = t / dur, d = k < 0.35 ? back : Math.round(back * (1 - (k - 0.35) / 0.65));
        return `0,${-d},${o.up && k < 0.8 ? -1 : 0}`;
      }
      case 'pump': {
        if (!st) return '0,0,0';
        const t = st.t - (o.delay ?? 0.14), dur = o.dur || 0.3, back = o.back || 3;
        if (t <= 0 || t >= dur) return '0,0,0';
        const k = t / dur, d = Math.round(back * (k < 0.5 ? k * 2 : (1 - k) * 2));
        return `0,${-d},0`;
      }
      case 'cyl': return `${st ? st.n % L.frames.length : 0},0,0`;
      case 'spin': {
        if (!st || !(st.spin > 0.02)) return '0,0,0';
        const fps = (o.fps || 24) * st.spin;
        return `${Math.floor(st.time * fps) % L.frames.length},0,0`;
      }
      case 'loaded': {
        if (!st) return '0,0,0';
        return st.ready ? '0,0,0' : 'off';
      }
      case 'glow': {
        if (!st) return o.idle != null ? `${o.idle},0,0` : 'off';
        const lv = st.charge > 0.98 ? L.frames.length - 1 : st.charge > 0.01 ? Math.min(L.frames.length - 2, Math.floor(st.charge * (L.frames.length - 1))) : st.firing ? Math.max(0, L.frames.length - 2) : o.idle != null ? o.idle : -1;
        if (lv < 0) return 'off';
        const flick = st.firing && !(st.charge > 0) && L.frames.length > 2 && Math.floor(st.time * 20) % 2 ? Math.max(0, lv - 1) : lv;
        return `${flick},0,0`;
      }
      case 'mag': {
        if (!st || !(st.reload > 0)) return '0,0,0';
        const k = st.reload, d = k > 0.7 ? Math.round((1 - k) / 0.3 * 4) : k > 0.3 ? 4 : Math.round(k / 0.3 * 4);
        return `0,${o.mx ? -d : 0},${o.mx ? 0 : d}`;
      }
      case 'swing': {
        if (!st || !(st.reload > 0)) return '0,0,0';
        return `${L.frames.length > 1 ? 1 : 0},0,0`;
      }
      case 'fire': return st && st.firing ? `${Math.floor(st.time * (o.fps || 12)) % L.frames.length},0,0` : 'off';
      case 'idle': return `${Math.floor(((st ? st.time : 0)) * (o.fps || 4)) % L.frames.length},0,0`;
      default: return '0,0,0';
    }
  };

  X.sprites = {};
  X.install = () => {
    const WP = WTP.weapons, DATA = WTP.PXW || {};
    for (const [id, def] of Object.entries(DATA)) {
      try {
        const sp = new PSprite(id, def);
        X.sprites[id] = sp;
        const d = WP.BY[id];
        if (d) { d.pixelSprite = d.pixelSprite || d.sprite; d.sprite = sp; }
      } catch (e) { console.warn('pxsprite', id, e); }
    }
  };
})();
