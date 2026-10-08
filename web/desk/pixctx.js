(() => {
  const WTP = window.WTP;
  const parse = (c) => {
    if (!c || typeof c !== 'string') return null;
    if (c[0] === '#') { const h = c.length === 4 ? c.slice(1).split('').map((v) => v + v).join('') : c.slice(1, 7); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]; }
    const m = /rgba?\(([^)]+)\)/.exec(c);
    if (!m) return null;
    const v = m[1].split(',').map((x) => +x);
    return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1];
  };
  const cache = new Map();
  const col = (c) => { let r = cache.get(c); if (r === undefined) { r = parse(c); cache.set(c, r); } return r; };

  class PixCtx {
    constructor(w, h) {
      this.w = w; this.h = h;
      this.px = new Uint32Array(w * h);
      this.ox = 0; this.oy = 0;
      this.m = [1, 0, 0, 1, 0, 0];
      this.stack = [];
      this.path = [];
      this.cur = null;
      this.strokeStyle = '#fff'; this.fillStyle = '#fff'; this.lineWidth = 1; this.globalAlpha = 1;
      this.lineCap = 'round'; this.lineJoin = 'round'; this.imageSmoothingEnabled = false; this.globalCompositeOperation = 'source-over';
      this.canvas = { width: w, height: h };
    }
    begin(ox, oy) { this.ox = ox; this.oy = oy; this.px.fill(0); this.m = [1, 0, 0, 1, 0, 0]; this.stack.length = 0; this.globalAlpha = 1; }
    clear() { this.px.fill(0); }
    save() { this.stack.push({ m: this.m.slice(), s: this.strokeStyle, f: this.fillStyle, w: this.lineWidth, a: this.globalAlpha }); }
    restore() { const t = this.stack.pop(); if (!t) return; this.m = t.m; this.strokeStyle = t.s; this.fillStyle = t.f; this.lineWidth = t.w; this.globalAlpha = t.a; }
    setTransform(a, b, c, d, e, f) { this.m = [a, b, c, d, e, f]; }
    transform(a, b, c, d, e, f) { const m = this.m; this.m = [m[0] * a + m[2] * b, m[1] * a + m[3] * b, m[0] * c + m[2] * d, m[1] * c + m[3] * d, m[0] * e + m[2] * f + m[4], m[1] * e + m[3] * f + m[5]]; }
    translate(x, y) { this.transform(1, 0, 0, 1, x, y); }
    scale(x, y) { this.transform(x, 0, 0, y, 0, 0); }
    rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.transform(c, s, -s, c, 0, 0); }
    tp(x, y) { const m = this.m; return [m[0] * x + m[2] * y + m[4] - this.ox, m[1] * x + m[3] * y + m[5] - this.oy]; }
    sc() { const m = this.m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; }
    beginPath() { this.path = []; this.cur = null; }
    moveTo(x, y) { this.cur = [this.tp(x, y)]; this.path.push(this.cur); }
    lineTo(x, y) { if (!this.cur) return this.moveTo(x, y); this.cur.push(this.tp(x, y)); }
    closePath() { if (this.cur && this.cur.length) { this.cur.push(this.cur[0]); this.cur.closed = true; } }
    quadraticCurveTo(cx, cy, x, y) {
      if (!this.cur) return this.moveTo(x, y);
      const last = this.cur[this.cur.length - 1];
      const inv = this.inv(last);
      for (let k = 1; k <= 8; k++) { const t = k / 8, u = 1 - t; this.cur.push(this.tp(u * u * inv[0] + 2 * u * t * cx + t * t * x, u * u * inv[1] + 2 * u * t * cy + t * t * y)); }
    }
    inv(p) { const m = this.m, det = m[0] * m[3] - m[1] * m[2] || 1, x = p[0] + this.ox - m[4], y = p[1] + this.oy - m[5]; return [(m[3] * x - m[2] * y) / det, (-m[1] * x + m[0] * y) / det]; }
    arc(x, y, r, a0, a1) {
      const full = Math.abs(a1 - a0) >= Math.PI * 2 - 0.01;
      const n = Math.max(8, Math.ceil(r * this.sc() * 4));
      const pts = [];
      for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; pts.push(this.tp(x + Math.cos(a) * r, y + Math.sin(a) * r)); }
      if (full) { const c = this.tp(x, y); pts.disc = { x: c[0], y: c[1], r: r * this.sc() }; }
      if (this.cur && this.cur.length && !full) { for (const p of pts) this.cur.push(p); }
      else { this.cur = pts; this.path.push(pts); }
    }
    ellipse(x, y, rx, ry, rot, a0, a1) { this.save(); this.translate(x, y); this.rotate(rot); this.scale(rx, ry); this.arc(0, 0, 1, a0, a1); this.restore(); }
    rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
    put(x, y, c) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.px[y * this.w + x] = c; }
    pack(style) {
      const c = col(style);
      if (!c || c[3] * this.globalAlpha < 0.3) return 0;
      return (255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0];
    }
    dot(x, y, rad, c) {
      if (rad <= 0) { this.put(Math.floor(x), Math.floor(y), c); return; }
      const r2 = rad * rad;
      for (let dy = -Math.ceil(rad); dy <= Math.ceil(rad); dy++) for (let dx = -Math.ceil(rad); dx <= Math.ceil(rad); dx++) if (dx * dx + dy * dy <= r2) this.put(Math.floor(x) + dx, Math.floor(y) + dy, c);
    }
    line(x0, y0, x1, y1, rad, c) {
      let ax = Math.floor(x0), ay = Math.floor(y0);
      const bx = Math.floor(x1), by = Math.floor(y1);
      const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
      let err = dx + dy;
      for (let guard = 0; guard < 512; guard++) {
        this.dot(ax, ay, rad, c);
        if (ax === bx && ay === by) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; ax += sx; }
        if (e2 <= dx) { err += dx; ay += sy; }
      }
    }
    stroke() {
      const c = this.pack(this.strokeStyle);
      if (!c) return;
      const w = this.lineWidth * this.sc();
      const rad = w < 1.7 ? 0 : (w - 1) / 2;
      for (const p of this.path) for (let k = 1; k < p.length; k++) this.line(p[k - 1][0], p[k - 1][1], p[k][0], p[k][1], rad, c);
    }
    fill() {
      const c = this.pack(this.fillStyle);
      if (!c) return;
      for (const p of this.path) {
        if (p.disc) { this.disc(p.disc.x, p.disc.y, p.disc.r, c); continue; }
        this.poly(p, c);
      }
    }
    disc(cx, cy, r, c) {
      const y0 = Math.floor(cy - r), y1 = Math.ceil(cy + r), x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r + 0.15) this.put(x, y, c); }
      if (r < 0.9) this.put(Math.floor(cx), Math.floor(cy), c);
    }
    poly(p, c) {
      if (p.length < 3) { for (let k = 1; k < p.length; k++) this.line(p[k - 1][0], p[k - 1][1], p[k][0], p[k][1], 0, c); if (p.length === 1) this.put(Math.floor(p[0][0]), Math.floor(p[0][1]), c); return; }
      let y0 = 1e9, y1 = -1e9;
      for (const q of p) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
      let any = false;
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
        const yc = y + 0.5, xs = [];
        for (let k = 0; k < p.length; k++) { const a = p[k], b = p[(k + 1) % p.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + ((yc - a[1]) / (b[1] - a[1])) * (b[0] - a[0])); }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) { this.put(x, y, c); any = true; }
      }
      if (!any) for (let k = 1; k < p.length; k++) this.line(p[k - 1][0], p[k - 1][1], p[k][0], p[k][1], 0, c);
    }
    fillRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.fill(); this.beginPath(); }
    strokeRect(x, y, w, h) { this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.beginPath(); }
    clearRect() { }
    setLineDash() { }
    drawImage() { }
    createRadialGradient() { return { addColorStop() { } }; }
    createLinearGradient() { return { addColorStop() { } }; }
    toImage(out, dst) {
      const W = this.w, H = this.h, src = this.px;
      const im = new ImageData(W, H), d = new Uint32Array(im.data.buffer);
      const oc = out ? (255 << 24) | (out[2] << 16) | (out[1] << 8) | out[0] : 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const j = y * W + x, v = src[j];
        if (v) { d[j] = v; continue; }
        if (oc && ((x > 0 && src[j - 1]) || (x < W - 1 && src[j + 1]) || (y > 0 && src[j - W]) || (y < H - 1 && src[j + W]))) d[j] = oc;
      }
      const c = dst || document.createElement('canvas');
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      c.getContext('2d').putImageData(im, 0, 0);
      return c;
    }
  }
  WTP.PixCtx = PixCtx;
})();
