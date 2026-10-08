(() => {
  const WTP = window.WTP;
  const { rand, hash, shade, P32 } = WTP;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, A = (n, x) => WTP.audio.play(n, x);
  const ST = { slabs: [], wins: [], cracks: [], byId: new Map() };
  let nextId = 1;
  WTP.structs = ST;
  let occ = null, crack = null, visit = null, gen = 1, q = null, occList = [];
  const SOLID = 1, HOLE = 2, DEBRIS = 6;
  const BOLT_HP = 1;

  ST.init = () => {
    const Wd = W();
    const n = Wd.n;
    occ = new Uint16Array(n); crack = new Uint8Array(n); visit = new Uint32Array(n); q = new Int32Array(n);
    Wd.occ = occ; Wd.crack = crack;
    ST.slabs = []; ST.cracks = []; occList = []; ST.byId = new Map(); nextId = 1;
    ST.wins = [];
    for (const r of Wd.regions) {
      if (r.type !== 'window' && r.type !== 'bar' && r.type !== 'popup') { ST.wins[r.id] = null; continue; }
      if (r.type === 'bar' && !r.present) { ST.wins[r.id] = null; continue; }
      const w = { id: r.id, reg: r, state: 'static', dirty: false, t: 0, bolts: [], hits: 0, revealed: false, cells: 0 };
      let bolts = r.bolts ? r.bolts.slice() : [];
      if (r.type === 'bar') bolts = [{ x: 1, y: Math.round((r.y0 + r.y1) / 2), edge: true }, { x: Wd.w - 2, y: Math.round((r.y0 + r.y1) / 2), edge: true }];
      if (r.type === 'popup' || (r.type === 'window' && r.fullscreen)) bolts = [{ x: r.x0 + 3, y: r.y0 + 1 }, { x: r.x1 - 3, y: r.y0 + 1 }];
      for (const b of bolts) {
        const cells = [];
        for (let dy = 0; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const x = b.x + dx, y = b.y + dy;
          if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) continue;
          const i = y * Wd.w + x;
          if (Wd.rid[i] !== r.id) continue;
          if (Wd.mat[i] !== SOLID) { Wd.mat[i] = SOLID; Wd.kind[i] = 0; Wd.src[i] = i; }
          Wd.mtl[i] = Wd.M.METAL; Wd.flag[i] |= Wd.F_PIN | Wd.F_BOLT;
          cells.push(i);
        }
        w.bolts.push({ x: b.x, y: b.y, cells, alive: cells.length > 0 });
      }
      ST.wins[r.id] = w;
    }
  };
  ST.reset = () => {
    if (!occ) return;
    for (const i of occList) occ[i] = 0;
    occ.fill(0); crack.fill(0);
    ST.init();
  };
  const isStruct = (i, id) => { const Wd = W(); return Wd.rid[i] === id && !crack[i] && (Wd.mat[i] === SOLID || ((Wd.mat[i] === 0 || Wd.mat[i] === HOLE) && Wd.back[i])); };

  ST.dirty = (rid) => {
    const w = ST.wins[rid];
    if (!w || w.state !== 'static') return;
    w.dirty = true;
    w.revealed = true;
  };
  ST.isOcc = (i) => occ && occ[i] !== 0;

  function boltAlive(b) {
    const Wd = W();
    let k = 0;
    for (const i of b.cells) if (Wd.mat[i] === SOLID) k++;
    return k >= BOLT_HP;
  }
  function integrity(w) {
    const Wd = W();
    const r = w.reg;
    if (++gen > 4e9) { visit.fill(0); gen = 1; }
    let qn = 0;
    let alive = 0;
    const aliveBolts = [];
    for (const b of w.bolts) {
      const was = b.alive;
      b.alive = boltAlive(b);
      if (was && !b.alive) boltPop(b, w);
      if (!b.alive) continue;
      alive++;
      aliveBolts.push(b);
      for (const i of b.cells) if (Wd.mat[i] === SOLID && visit[i] !== gen) { visit[i] = gen; q[qn++] = i; }
    }
    const w0 = Wd.w;
    const x0 = Math.max(0, r.x0 - 1), x1 = Math.min(w0 - 1, r.x1 + 1), y0 = Math.max(0, r.y0 - 1), y1 = Math.min(Wd.gh - 1, r.y1 + 1);
    for (let h = 0; h < qn; h++) {
      const i = q[h];
      const x = i % w0;
      if (x > 0 && visit[i - 1] !== gen && isStruct(i - 1, r.id)) { visit[i - 1] = gen; q[qn++] = i - 1; }
      if (x < w0 - 1 && visit[i + 1] !== gen && isStruct(i + 1, r.id)) { visit[i + 1] = gen; q[qn++] = i + 1; }
      if (i >= w0 && visit[i - w0] !== gen && isStruct(i - w0, r.id)) { visit[i - w0] = gen; q[qn++] = i - w0; }
      if (i + w0 < Wd.n && visit[i + w0] !== gen && isStruct(i + w0, r.id)) { visit[i + w0] = gen; q[qn++] = i + w0; }
    }
    const comps = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * w0 + x;
      if (visit[i] === gen || !isStruct(i, r.id)) continue;
      const cells = [];
      let h = 0, n0 = 0;
      q[n0++] = i; visit[i] = gen;
      while (h < n0) {
        const c = q[h++];
        cells.push(c);
        const cx = c % w0;
        if (cx > 0 && visit[c - 1] !== gen && isStruct(c - 1, r.id)) { visit[c - 1] = gen; q[n0++] = c - 1; }
        if (cx < w0 - 1 && visit[c + 1] !== gen && isStruct(c + 1, r.id)) { visit[c + 1] = gen; q[n0++] = c + 1; }
        if (c >= w0 && visit[c - w0] !== gen && isStruct(c - w0, r.id)) { visit[c - w0] = gen; q[n0++] = c - w0; }
        if (c + w0 < Wd.n && visit[c + w0] !== gen && isStruct(c + w0, r.id)) { visit[c + w0] = gen; q[n0++] = c + w0; }
      }
      comps.push(cells);
    }
    w.cells = qn;
    for (const cells of comps) detach(cells, w, null);
    if (alive === 1 && qn > 300 && w.reg.type !== 'bar') {
      const b = aliveBolts[0];
      const cells = [];
      for (let k = 0; k < qn; k++) cells.push(q[k]);
      const s = detach(cells, w, { x: b.x + 0.5, y: b.y + 0.5 });
      if (s) { w.state = 'hanging'; G()?.event?.('HANGING BY A BOLT', b.x, b.y - 4, 1); A('creak', 1); }
    } else if (alive === 0 && qn > 0) {
      const cells = [];
      for (let k = 0; k < qn; k++) cells.push(q[k]);
      detach(cells, w, null);
    }
    if (alive === 0 || w.cells === 0) w.state = w.state === 'hanging' ? 'hanging' : 'gone';
  }
  function boltPop(b, w) {
    FX().pop(b.x, b.y - 3, 'BOLT!', { scale: 1, ramp: ['7', '6', '5'], life: 0.7 });
    for (let k = 0; k < 10; k++) FX().spark(b.x + 0.5, b.y + 0.5, rand(-120, 120), rand(-160, -20), k & 1 ? P32.y : P32['7'], 0.3);
    FX().debris(b.x + 0.5, b.y + 0.5, rand(-80, 80), rand(-200, -100), P32['5']);
    A('clank', 3);
    G()?.shake?.(3);
  }

  function detach(cells, w, pivot) {
    const Wd = W();
    if (!cells.length) return null;
    const small = cells.length < 260 && !pivot;
    if (small) {
      const pts = [];
      for (const i of cells) {
        if (Wd.mat[i] !== SOLID) { Wd.back[i] = 0; Wd.touch(i); continue; }
        const x = i % Wd.w, y = (i / Wd.w) | 0;
        pts.push(x, y, Wd.col[i]); Wd.cellSrc(pts, i);
        Wd.mat[i] = HOLE; Wd.back[i] = 0; Wd.burn[i] = 0; Wd.counted(i); Wd.touch(i); Wd.wakeAbove(i);
      }
      if (pts.length >= 15) Wd.makeChunk(pts, rand(-20, 20), rand(-40, 0), { mtl: w.reg.mats ? w.reg.mats.frame : -1 });
      else for (let k = 0; k < pts.length; k += 3) FX().debris(pts[k] + 0.5, pts[k + 1] + 0.5, rand(-30, 30), rand(-60, 0), pts[k + 2]);
      return null;
    }
    return makeSlab(cells, w, pivot);
  }

  function makeSlab(cells, w, pivot) {
    const Wd = W();
    let sx = 0, sy = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const i of cells) { const x = i % Wd.w, y = (i / Wd.w) | 0; sx += x; sy += y; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    const n = cells.length;
    const mx = sx / n + 0.5, my = sy / n + 0.5;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const kind = new Uint8Array(bw * bh), src = new Int32Array(bw * bh).fill(-1), col = new Uint32Array(bw * bh), mtl = new Uint8Array(bw * bh);
    let solidN = 0;
    const paneMtl = w.reg.mats ? w.reg.mats.pane : Wd.M.PAPER;
    for (const i of cells) {
      const x = i % Wd.w, y = (i / Wd.w) | 0, l = (y - y0) * bw + (x - x0);
      if (Wd.mat[i] === SOLID) {
        kind[l] = 1; src[l] = Wd.src[i]; col[l] = Wd.col[i]; mtl[l] = Wd.mtl[i]; solidN++;
        Wd.mat[i] = HOLE; Wd.burn[i] = 0;
        if (Wd.pgid[i]) { const pr = Wd.props[Wd.pgid[i]]; if (pr && !pr.dead) pr.left--; }
      } else {
        kind[l] = 2; src[l] = Wd.ptex[i] && Wd.bcol[i] === Wd.obcol[i] ? i : -1; col[l] = Wd.bcol[i]; mtl[l] = paneMtl;
      }
      Wd.back[i] = 0; Wd.dmg[i] = 0;
      Wd.touch(i); Wd.wakeAbove(i);
    }
    Wd.destroyed += solidN * 0.4;
    G()?.scored?.(Math.round(solidN * 0.15), mx, my);
    let inertia = 0;
    for (let ly = 0; ly < bh; ly++) for (let lx = 0; lx < bw; lx++) if (kind[ly * bw + lx]) { const dx = x0 + lx + 0.5 - mx, dy = y0 + ly + 0.5 - my; inertia += dx * dx + dy * dy; }
    const edge = [];
    for (let ly = 0; ly < bh; ly++) for (let lx = 0; lx < bw; lx++) {
      const l = ly * bw + lx;
      if (!kind[l]) continue;
      const e = lx === 0 || ly === 0 || lx === bw - 1 || ly === bh - 1 || !kind[l - 1] || !kind[l + 1] || !kind[l - bw] || !kind[l + bw];
      if (e) edge.push(lx, ly);
    }
    const s = {
      id: 0, win: w, x: mx, y: my, a: 0, vx: 0, vy: 0, va: 0, bw, bh, ox: mx - x0, oy: my - y0, kind, src, col, mtl, n, solidN, edge: Int32Array.from(edge),
      inertia: Math.max(1, inertia / n), pivot: pivot ? { x: pivot.x, y: pivot.y, lx: pivot.x - mx, ly: pivot.y - my } : null,
      t: 0, rest: 0, hits: 0, tex: null, texDirty: true, glass: paneMtl === Wd.M.GLASS, occ: [], dead: false, px: mx, py: my, pa: 0, maxV: 0, carried: 0
    };
    s.id = nextId++;
    if (nextId > 65000) nextId = 1;
    ST.slabs.push(s);
    ST.byId.set(s.id, s);
    G()?.stat?.('windows', 1);
    if (!pivot) {
      G()?.event?.(w.reg.type === 'bar' ? 'THE BAR GAVE WAY!' : 'TIMBER!', mx, y0 - 2, 2);
      A('creak', 2);
      w.state = w.state === 'static' ? 'falling' : w.state;
    }
    return s;
  }
  function reindex() { for (const s of ST.slabs) if (s.dead) ST.byId.delete(s.id); ST.slabs = ST.slabs.filter((s) => !s.dead); }

  function localOf(s, wx, wy) {
    const cs = Math.cos(s.a), sn = Math.sin(s.a);
    const dx = wx - s.x, dy = wy - s.y;
    return [dx * cs + dy * sn + s.ox, -dx * sn + dy * cs + s.oy];
  }
  function blockedAt(s, x, y, a) {
    const Wd = W();
    const cs = Math.cos(a), sn = Math.sin(a);
    const E = s.edge;
    const step = E.length > 4000 ? 6 : E.length > 1200 ? 4 : 2;
    let hits = 0, hx = 0, hy = 0;
    for (let k = 0; k < E.length; k += step) {
      const dx = E[k] + 0.5 - s.ox, dy = E[k + 1] + 0.5 - s.oy;
      const wx = x + dx * cs - dy * sn, wy = y + dx * sn + dy * cs;
      const cx = Math.floor(wx), cy = Math.floor(wy);
      if (cx < 0 || cx >= Wd.w) { hits++; hx += wx; hy += wy; continue; }
      if (cy < 0) continue;
      if (cy >= Wd.gh) { hits++; hx += wx; hy += wy; continue; }
      const i = cy * Wd.w + cx;
      const m = Wd.mat[i];
      if (m === SOLID || m === 3 || m === 5 || m === DEBRIS || (occ[i] && occ[i] !== s.id)) { hits++; hx += wx; hy += wy; }
    }
    return hits ? { n: hits, x: hx / hits, y: hy / hits } : null;
  }

  function rasterize(s) {
    const Wd = W();
    for (const i of s.occ) if (occ[i] === s.id) occ[i] = 0;
    s.occ = [];
    const cs = Math.cos(s.a), sn = Math.sin(s.a);
    const R = Math.hypot(s.bw, s.bh) / 2 + 2;
    const x0 = Math.max(0, Math.floor(s.x - R)), x1 = Math.min(Wd.w - 1, Math.ceil(s.x + R));
    const y0 = Math.max(0, Math.floor(s.y - R)), y1 = Math.min(Wd.gh - 1, Math.ceil(s.y + R));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - s.y;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - s.x;
        const lx = Math.floor(dx * cs + dy * sn + s.ox), ly = Math.floor(-dx * sn + dy * cs + s.oy);
        if (lx < 0 || ly < 0 || lx >= s.bw || ly >= s.bh) continue;
        if (!s.kind[ly * s.bw + lx]) continue;
        const i = y * Wd.w + x;
        if (!occ[i]) { occ[i] = s.id; s.occ.push(i); }
      }
    }
  }

  ST.hitCell = (i, cx, cy, force) => {
    const s = ST.byId.get(occ[i]);
    if (!s || s.dead) { occ[i] = 0; return 0; }
    const Wd = W();
    const x = i % Wd.w, y = (i / Wd.w) | 0;
    const [lx, ly] = localOf(s, x + 0.5, y + 0.5);
    const ix = Math.floor(lx), iy = Math.floor(ly);
    if (ix < 0 || iy < 0 || ix >= s.bw || iy >= s.bh) return 0;
    const l = iy * s.bw + ix;
    if (!s.kind[l]) return 0;
    const c = s.col[l];
    s.kind[l] = 0;
    s.n--;
    if (s.tex) s.texCtx.clearRect(ix * Wd.CP, iy * Wd.CP, Wd.CP, Wd.CP);
    s.edgeDirty = true;
    occ[i] = 0;
    if (Math.random() < 0.35) Wd.matDebris(s.mtl[l], x + 0.5, y + 0.5, (x - cx) * 6 + rand(-30, 30), rand(-90, -20), c);
    const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
    const f = (force || 60) / Math.max(40, s.n) * 0.4;
    s.vx += (dx / d) * f; s.vy += (dy / d) * f;
    if (!s.pivot) s.va += ((x - s.x) * (dy / d) - (y - s.y) * (dx / d)) * f / s.inertia;
    else s.va += ((x - s.pivot.x) * (dy / d) - (y - s.pivot.y) * (dx / d)) * f / (s.inertia * 2);
    s.rest = 0;
    return 1;
  };

  ST.blast = (x, y, r, power = 1) => {
    for (const s of ST.slabs) {
      if (s.dead) continue;
      const dx = s.x - x, dy = s.y - y, d = Math.hypot(dx, dy) || 1;
      const reach = r * 3 + Math.max(s.bw, s.bh) / 2;
      if (d > reach) continue;
      const f = (1 - d / reach) * 900 * power / Math.sqrt(Math.max(50, s.n) / 50);
      s.vx += (dx / d) * f * 0.6; s.vy += (dy / d) * f * 0.6 - f * 0.2;
      s.va += rand(-1, 1) * f / Math.max(30, Math.sqrt(s.n));
      s.rest = 0;
      if (s.pivot && f > 160) { s.pivot = null; s.win.state = 'falling'; G()?.event?.('SNAPPED!', s.x, s.y, 1); A('clank', 4); }
    }
    for (const w of ST.wins) {
      if (!w || w.state !== 'static') continue;
      for (const b of w.bolts) if (b.alive && Math.hypot(b.x - x, b.y - y) < r * 1.3) w.dirty = true;
    }
  };

  function spreadCracks(x, y, pow, rid) {
    const Wd = W();
    if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) return;
    const i0 = Math.floor(y) * Wd.w + Math.floor(x);
    const m = Wd.mtl[i0];
    if (m === Wd.M.METAL || m === Wd.M.RUBBER) return;
    const glass = m === Wd.M.GLASS || m === Wd.M.IMAGE;
    const n = Math.min(7, 1 + Math.floor(pow * (glass ? 1.2 : 0.6)));
    for (let k = 0; k < n; k++) {
      if (ST.cracks.length > 160) break;
      const a = rand(0, Math.PI * 2);
      ST.cracks.push({ x, y, a, len: (glass ? 26 : 14) + pow * (glass ? 10 : 6) + rand(0, 20), straight: glass ? 0.06 : 0.4, rid, gen: 0, speed: glass ? 6 : 3 });
    }
  }
  ST.impact = (x, y, r, pow) => {
    const Wd = W();
    if (pow < 1.6) return;
    const i = Math.floor(y) * Wd.w + Math.floor(x);
    if (i < 0 || i >= Wd.n) return;
    const rid = Wd.rid[i];
    spreadCracks(x, y, pow, rid);
  };
  function updateCracks(dt) {
    const Wd = W();
    const C = ST.cracks;
    for (let k = C.length - 1; k >= 0; k--) {
      const c = C[k];
      for (let s = 0; s < c.speed; s++) {
        c.a += rand(-c.straight, c.straight);
        c.x += Math.cos(c.a); c.y += Math.sin(c.a);
        c.len--;
        const x = Math.floor(c.x), y = Math.floor(c.y);
        if (c.len <= 0 || x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) { C.splice(k, 1); break; }
        const i = y * Wd.w + x;
        const onStruct = Wd.mat[i] === SOLID || Wd.back[i] || Wd.code[i];
        if (!onStruct || Wd.mtl[i] === Wd.M.METAL && Wd.mat[i] === SOLID) { C.splice(k, 1); break; }
        if (!crack[i]) {
          crack[i] = 1;
          Wd.markHi(x, y);
          if (Wd.rid[i]) ST.dirty(Wd.rid[i]);
          if (Math.random() < 0.08) FX().dust(x + 0.5, y + 0.5);
        }
        if (Math.random() < 0.03 && c.gen < 2 && C.length < 160) C.push({ ...c, a: c.a + rand(-1.2, 1.2), len: c.len * 0.6, gen: c.gen + 1 });
      }
    }
  }

  function slabTex(s) {
    if (s.tex && !s.texDirty) return s.tex;
    const Wd = W();
    const CP = Wd.CP;
    const cv = s.tex || document.createElement('canvas');
    cv.width = s.bw * CP; cv.height = s.bh * CP;
    const g = cv.getContext('2d');
    const im = g.createImageData(cv.width, cv.height);
    const p = new Uint32Array(im.data.buffer);
    const shot = WTP.deskRender.shot32();
    const PW = WTP.deskRender.size().PW, PH = WTP.deskRender.size().PH;
    const cw = cv.width;
    for (let ly = 0; ly < s.bh; ly++) for (let lx = 0; lx < s.bw; lx++) {
      const l = ly * s.bw + lx;
      if (!s.kind[l]) continue;
      const sr = s.src[l];
      const ox = lx * CP, oy = ly * CP;
      if (sr >= 0) {
        const o = Wd.ocol[sr] || s.col[l], c = s.col[l];
        const dr = (c & 255) - (o & 255), dg = ((c >>> 8) & 255) - ((o >>> 8) & 255), db = ((c >>> 16) & 255) - ((o >>> 16) & 255);
        const sx = (sr % Wd.w) * CP, sy = ((sr / Wd.w) | 0) * CP;
        for (let dy = 0; dy < CP && sy + dy < PH; dy++) {
          const so = (sy + dy) * PW + sx, d = (oy + dy) * cw + ox;
          for (let dx = 0; dx < CP && sx + dx < PW; dx++) {
            const v = shot[so + dx];
            p[d + dx] = (dr || dg || db) ? ((255 << 24) | (Math.max(0, Math.min(255, ((v >>> 16) & 255) + db)) << 16) | (Math.max(0, Math.min(255, ((v >>> 8) & 255) + dg)) << 8) | Math.max(0, Math.min(255, (v & 255) + dr))) >>> 0 : (v | 0xff000000) >>> 0;
          }
        }
      } else {
        const f = (s.col[l] | 0xff000000) >>> 0;
        for (let dy = 0; dy < CP; dy++) p.fill(f, (oy + dy) * cw + ox, (oy + dy) * cw + ox + CP);
      }
    }
    g.putImageData(im, 0, 0);
    s.tex = cv; s.texCtx = g; s.texDirty = false;
    return cv;
  }

  function rebuildEdge(s) {
    const edge = [];
    const bw = s.bw, bh = s.bh, kind = s.kind;
    let n = 0, sx = 0, sy = 0;
    for (let ly = 0; ly < bh; ly++) for (let lx = 0; lx < bw; lx++) {
      const l = ly * bw + lx;
      if (!kind[l]) continue;
      n++;
      if (lx === 0 || ly === 0 || lx === bw - 1 || ly === bh - 1 || !kind[l - 1] || !kind[l + 1] || !kind[l - bw] || !kind[l + bw]) edge.push(lx, ly);
    }
    s.edge = Int32Array.from(edge);
    s.n = n;
    s.edgeDirty = false;
  }

  function settleSlab(s, shatter) {
    const Wd = W();
    s.dead = true;
    if (s.win.state === 'falling' || s.win.state === 'hanging') s.win.state = 'gone';
    for (const i of s.occ) if (occ[i] === s.id) occ[i] = 0;
    s.occ = [];
    const cs = Math.cos(s.a), sn = Math.sin(s.a);
    let placed = 0;
    if (shatter) {
      Wd.destroyed += s.solidN * 0.6;
      const seeds = [];
      const ns = Math.max(4, Math.min(22, Math.round(s.n / 900)));
      for (let k = 0; k < ns; k++) seeds.push([rand(0, s.bw), rand(0, s.bh)]);
      const groups = seeds.map(() => []);
      for (let ly = 0; ly < s.bh; ly++) for (let lx = 0; lx < s.bw; lx++) {
        const l = ly * s.bw + lx;
        if (!s.kind[l]) continue;
        let best = 0, bd = 1e9;
        for (let k = 0; k < ns; k++) { const d = (seeds[k][0] - lx) ** 2 + (seeds[k][1] - ly) ** 2; if (d < bd) { bd = d; best = k; } }
        groups[best].push(l);
      }
      for (const gcells of groups) {
        if (gcells.length < 6) continue;
        const pts = [];
        pts.src = [];
        for (const l of gcells) {
          const lx = l % s.bw, ly = (l / s.bw) | 0;
          const dx = lx + 0.5 - s.ox, dy = ly + 0.5 - s.oy;
          pts.push(Math.floor(s.x + dx * cs - dy * sn), Math.floor(s.y + dx * sn + dy * cs), s.col[l]);
          pts.src.push(s.src[l]);
        }
        const c = Wd.makeChunk(pts, s.vx * 0.5 + rand(-90, 90), Math.min(0, s.vy * -0.3) - rand(40, 160), { mtl: s.glass ? Wd.M.GLASS : -1, life: 6 });
        if (c) c.va = rand(-4, 4);
      }
      if (s.glass) { A('glass'); for (let k = 0; k < 40; k++) FX().shard(s.x + rand(-s.bw / 2, s.bw / 2), s.y + rand(-s.bh / 3, s.bh / 3), rand(-160, 160), rand(-220, -40), k & 1 ? P32['7'] : P32.C); }
      G()?.event?.('SHATTERED!', s.x, s.y - s.bh / 2, 2);
      G()?.killcam?.(s.x, s.y, 20);
    } else {
      for (let ly = 0; ly < s.bh; ly++) for (let lx = 0; lx < s.bw; lx++) {
        const l = ly * s.bw + lx;
        if (!s.kind[l]) continue;
        const dx = lx + 0.5 - s.ox, dy = ly + 0.5 - s.oy;
        const x = Math.floor(s.x + dx * cs - dy * sn), y = Math.floor(s.y + dx * sn + dy * cs);
        if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] !== 0 && Wd.mat[i] !== HOLE) continue;
        if (G()?.inPlayer?.(x, y)) continue;
        if (s.kind[l] === 1) placed++;
        Wd.under[i] = Wd.mat[i];
        Wd.mat[i] = DEBRIS; Wd.col[i] = s.col[l]; Wd.src[i] = s.src[l]; Wd.mtl[i] = s.mtl[l]; Wd.rid[i] = 0; Wd.kind[i] = 0; Wd.gid[i] = 0;
        Wd.rubbleN++;
        Wd.touch(i);
      }
    }
    for (let k = 0; k < Math.min(30, s.n / 200); k++) FX().dust(s.x + rand(-s.bw / 2, s.bw / 2), s.y + rand(0, s.bh / 2));
    reindex();
  }

  function stepSlab(s, dt) {
    const Wd = W();
    s.t += dt;
    if (s.edgeDirty) rebuildEdge(s);
    if (s.n < 40) { settleSlab(s, true); return; }
    s.px = s.x; s.py = s.y; s.pa = s.a;
    if (s.pivot) {
      const lx = s.pivot.lx, ly = s.pivot.ly;
      const cs = Math.cos(s.a), sn = Math.sin(s.a);
      const rx = -(lx * cs - ly * sn), ry = -(lx * sn + ly * cs);
      const L2 = rx * rx + ry * ry + s.inertia * 0.35;
      s.va += (560 * rx / L2) * dt;
      s.va *= Math.pow(0.55, dt);
      const na = s.a + s.va * dt;
      const ncs = Math.cos(na), nsn = Math.sin(na);
      const nx = s.pivot.x - (lx * ncs - ly * nsn), ny = s.pivot.y - (lx * nsn + ly * ncs);
      const b = blockedAt(s, nx, ny, na);
      if (!b) { s.x = nx; s.y = ny; s.a = na; }
      else { if (Math.abs(s.va) > 0.6) { A('crash', s.n * 0.3); G()?.shake?.(3); impactAt(s, b, Math.abs(s.va) * 60); } s.va *= -0.3; }
      rasterize(s);
      carryPlayer(s);
      return;
    }
    s.vy = Math.min(520, s.vy + 600 * dt);
    const sp = Math.hypot(s.vx, s.vy);
    s.maxV = Math.max(s.maxV, sp);
    const steps = Math.max(1, Math.ceil((sp * dt) / 1.2));
    let hit = null;
    for (let k = 0; k < steps; k++) {
      const nx = s.x + (s.vx * dt) / steps, ny = s.y + (s.vy * dt) / steps, na = s.a + (s.va * dt) / steps;
      const b = blockedAt(s, nx, ny, na);
      if (!b) { s.x = nx; s.y = ny; s.a = na; continue; }
      if (!blockedAt(s, s.x, ny, s.a)) { s.y = ny; s.vx *= -0.25; s.va *= 0.5; continue; }
      hit = b;
      if (!blockedAt(s, nx, s.y, na)) { s.x = nx; s.a = na; }
      else if (!blockedAt(s, s.x, s.y, na)) s.a = na;
      break;
    }
    if (hit) {
      s.lastHit = hit;
      const v = Math.abs(s.vy);
      if (v > 120 || sp > 160) impactAt(s, hit, sp);
      else if (s.n > 2500 && (s.crushT = (s.crushT || 0) - dt) <= 0 && !s.pivot) {
        const cx = Math.floor(hit.x), cy = Math.floor(hit.y + 1);
        const below = cy >= 0 && cy < Wd.gh && cx >= 0 && cx < Wd.w ? Wd.mat[cy * Wd.w + cx] : 3;
        if (below !== 3 && below !== DEBRIS && (s.crushed || 0) < 45) {
          s.crushT = 0.07;
          s.crushed = (s.crushed || 0) + 1;
          const big = Math.min(1, s.n / 20000);
          const r = 4 + big * 7;
          Wd.carve(hit.x + rand(-2, 2), hit.y + 1, r, { debris: 0.5, force: 90, cause: 'crush', pow: 5 + big * 6, noCrumble: true, back: 0.4, letters: 4, noCrack: true });
          for (let k = 0; k < 2; k++) Wd.carve(hit.x + rand(-s.bw / 2.5, s.bw / 2.5), hit.y + rand(0, 2), r * 0.7, { debris: 0.4, force: 70, cause: 'crush', pow: 4 + big * 5, noCrumble: true, letters: 2, noCrack: true });
          G()?.shake?.(2 + big * 4);
          A('crash', 40 + big * 80);
          s.rest = 0;
          const i = cy * Wd.w + cx;
          if (cy >= 0 && cy < Wd.gh && Wd.rid[i] && Wd.rid[i] !== s.win.id) ST.dirty(Wd.rid[i]);
          if (s.crushed === 1) G()?.event?.('CRUSHED!', hit.x, hit.y - 4, 2);
        }
      }
      const tq = (s.x - hit.x);
      s.va = s.va * 0.5 + tq * Math.min(0.06, 6 / s.inertia) * (1 + v / 200) * 0.4;
      s.vy = -s.vy * (s.glass ? 0.15 : 0.22);
      s.vx *= 0.7;
      s.hits++;
      const shatterNow = (s.forceShatter && sp > 60) || (s.glass && sp > 150) || (sp > 380 && s.hits <= 1 && Math.random() < 0.55);
      if (shatterNow) { settleSlab(s, true); return; }
      if (Math.abs(s.vy) < 40 && Math.abs(s.vx) < 30 && Math.abs(s.va) < 0.25) s.rest += dt; else s.rest = 0;
      if (s.rest > 0.35 || s.hits > 300) { settleSlab(s, false); return; }
    }
    s.va *= Math.pow(0.7, dt);
    if (s.y > Wd.gh + s.bh || (s.t > 10 && !s.pivot)) { settleSlab(s, false); return; }
    rasterize(s);
    carryPlayer(s);
  }
  function impactAt(s, hit, sp) {
    const Wd = W();
    const big = Math.min(1, s.n / 20000);
    G()?.shake?.(Math.min(30, 4 + sp / 30 + big * 14));
    if (sp > 200) G()?.hitstop?.(0.05);
    A('crash', Math.min(400, s.n * 0.5));
    if (s.solidN > 200) A('clank', 3);
    const r = Math.min(18, 3 + sp / 50 + big * 9);
    Wd.carve(hit.x, hit.y + 1, r, { debris: 0.6, force: 160, cause: 'slab', pow: 3 + sp / 60 + big * 6, noCrumble: false, back: 0.6, letters: 6 });
    if (sp > 90) for (let k = 0; k < 3; k++) Wd.carve(hit.x + rand(-s.bw / 3, s.bw / 3), hit.y + rand(0, 3), r * 0.6, { debris: 0.5, force: 120, cause: 'slab', pow: 2 + sp / 80 + big * 4, noCrumble: true, letters: 3 });
    ST.blast(hit.x, hit.y, r * 0.8, 0.5);
    ST.impact(hit.x, hit.y + 2, r, 3 + sp / 80);
    for (let k = 0; k < 12 + big * 30; k++) FX().dust(hit.x + rand(-s.bw / 3, s.bw / 3), hit.y + rand(-2, 2));
    if (sp > 260) G()?.killcam?.(hit.x, hit.y, sp / 20);
    const i = Math.floor(hit.y) * Wd.w + Math.floor(hit.x);
    if (i >= 0 && i < Wd.n && Wd.rid[i] && Wd.rid[i] !== s.win.id) ST.dirty(Wd.rid[i]);
  }
  function carryPlayer(s) {
    const P = WTP.player;
    if (P.dead || !P.ground || P.on !== s.id) return;
    const cs = Math.cos(s.a), sn = Math.sin(s.a), pcs = Math.cos(s.pa), psn = Math.sin(s.pa);
    const fx = P.x + P.w / 2, fy = P.y + P.h + 0.5;
    const dx = fx - s.px, dy = fy - s.py;
    const lx = dx * pcs + dy * psn, ly = -dx * psn + dy * pcs;
    const nx = s.x + lx * cs - ly * sn, ny = s.y + lx * sn + ly * cs;
    const mx = nx - fx, my = ny - fy;
    if (Math.abs(mx) < 8 && Math.abs(my) < 8) {
      if (!P.collide(P.x + mx, P.y, P.w, P.h)) P.x += mx;
      if (!P.collide(P.x, P.y + my, P.w, P.h) || my < 0) P.y += my;
    }
  }

  let integT = 0;
  ST.update = (dt) => {
    if (!occ) return;
    updateCracks(dt);
    integT -= dt;
    if (integT <= 0) {
      integT = 0.12;
      let budget = 2;
      for (const w of ST.wins) {
        if (!w || w.state !== 'static' || !w.dirty) continue;
        w.dirty = false;
        integrity(w);
        if (--budget <= 0) break;
      }
    }
    for (const s of ST.slabs.slice()) if (!s.dead) stepSlab(s, dt);
  };
  ST.draw = (ctx, alpha) => {
    const Wd = W();
    const CP = Wd.CP;
    for (const s of ST.slabs) {
      if (s.dead) continue;
      const tex = slabTex(s);
      const x = s.px + (s.x - s.px) * alpha, y = s.py + (s.y - s.py) * alpha, a = s.pa + (s.a - s.pa) * alpha;
      ctx.save();
      ctx.translate(x * CP, y * CP);
      ctx.rotate(a);
      ctx.globalAlpha = 0.35; ctx.fillStyle = '#000';
      ctx.fillRect(-s.ox * CP + 8, -s.oy * CP + 12, s.bw * CP, s.bh * CP);
      ctx.globalAlpha = 1;
      ctx.drawImage(tex, -s.ox * CP, -s.oy * CP);
      ctx.restore();
      if (s.pivot) {
        ctx.fillStyle = '#9a9aa2';
        ctx.beginPath(); ctx.arc(s.pivot.x * CP, s.pivot.y * CP, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e8e8ee'; ctx.fillRect(s.pivot.x * CP - 1.5, s.pivot.y * CP - 4, 3, 8);
      }
    }
    for (const w of ST.wins) {
      if (!w || !w.revealed || w.state !== 'static') continue;
      for (const b of w.bolts) {
        if (!b.alive) continue;
        const x = (b.x + 0.5) * CP, y = (b.y + 1) * CP;
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.beginPath(); ctx.arc(x + 1, y + 1.5, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a8a8b0'; ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a4a52'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 2.6, y); ctx.lineTo(x + 2.6, y); ctx.stroke();
      }
    }
  };
  ST.slabAt = (x, y) => { const Wd = W(); if (!occ || x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) return null; const id = occ[y * Wd.w + x]; return id ? ST.byId.get(id) || null : null; };

  ST.collapse = (rid, o = {}) => {
    const w = ST.wins[rid];
    const Wd = W();
    if (!w) return false;
    if (w.state === 'hanging') { const s = ST.slabs.find((x) => x.win === w && !x.dead); if (s) { s.pivot = null; w.state = 'falling'; s.vy = -120; s.va = rand(-0.8, 0.8); } return true; }
    if (w.state !== 'static') return false;
    for (const b of w.bolts) if (b.alive) { for (const i of b.cells) if (Wd.mat[i] === SOLID) { Wd.kill(i, i % Wd.w, (i / Wd.w) | 0, b.x, b.y, 1, 120); } }
    w.dirty = true; w.revealed = true;
    integrity(w);
    const s = ST.slabs.filter((x) => x.win === w && !x.dead).sort((a, b) => b.n - a.n)[0];
    if (s) { s.vy = o.vy ?? -60; s.va = o.va ?? rand(-0.5, 0.5); s.vx = o.vx ?? 0; if (o.shatter) s.forceShatter = true; }
    return true;
  };
  ST.windowAt = (x, y) => {
    const Wd = W();
    if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) return null;
    const s = ST.slabAt(x, y);
    if (s) return s.win;
    const r = Wd.rid[y * Wd.w + x];
    return r ? ST.wins[r] : null;
  };
  ST.crackAt = (i) => crack && crack[i];
})();
