(() => {
  const WTP = window.WTP;
  const { P32, pack, shade, mix, hash, unR, unG, unB, rand } = WTP;
  const CELL = 1, TOPPAD = 0;
  const AIR = 0, SOLID = 1, HOLE = 2, ROCK = 3, RUBBLE = 4, ICE = 5, DEBRIS = 6;
  const K_BOX = 0, K_TEXT = 1, K_IMG = 2, K_GLASS = 3;
  const F_CHAR = 1, F_PAINT = 2, F_ACID = 4, F_PIN = 8, F_DENT = 16, F_FRAME = 32, F_TITLE = 64, F_BOLT = 128;
  const M = { PAPER: 0, INK: 1, GLASS: 2, METAL: 3, WOOD: 4, IMAGE: 5, BUTTON: 6, STONE: 7, PLASTIC: 8, GOLD: 9, RUBBER: 10, INKPEN: 11 };
  const MAT_NAMES = ['paper', 'ink', 'glass', 'metal', 'wood', 'image', 'button', 'stone', 'plastic', 'gold', 'rubber', 'ink'];
  const TOUGH = new Float32Array([1, 1, 1, 4, 2.2, 1, 1.2, 3, 1.6, 1, 2, 1.4]);
  const FLAMMABLE = new Uint8Array([1, 1, 0, 0, 2, 1, 1, 0, 1, 0, 1, 1]);
  const TILE = 32;
  const W = {
    CELL, TOPPAD, AIR, SOLID, HOLE, ROCK, RUBBLE, ICE, DEBRIS, K_TEXT, K_GLASS, K_IMG, K_BOX, M, MAT_NAMES, TOUGH, F_PIN, F_CHAR, F_PAINT, F_ACID, F_DENT, F_FRAME, F_TITLE, F_BOLT, TILE,
    w: 0, h: 0, n: 0, total: 1, destroyed: 0, ready: false, MX: 0, PX0: 0, PX1: 0, top: 0, CP: 4,
    chunks: [], groups: [], words: [], lines: [], targets: [], tElems: [], burning: [], smoulder: [], iceList: [], sand: [], props: [], regions: [],
    rubbleN: 0, chunkLimit: 70, componentLimit: 1200, quality: 2, powMul: 1
  };
  WTP.world = W;

  let levelCv = null, levelCtx = null, img = null, pix = null;
  let mat, back, code, col, bcol, kind, gid, pgid, burn, flag, under, tgt, mtl, dmg, init = null, sandMark, visit, visitGen = 0;
  let src, rid, ptex, wvis, ocol, obcol;
  let dirtyTiles = null, dirtyList = [], TW = 0, TH = 0, hiTiles = null, hiList = [];
  const qbuf = new Int32Array(1 << 19);

  function buildDesk(seg) {
    const w = seg.gw, gh = seg.gh, h = gh + 3, n = w * h;
    W.w = w; W.h = h; W.n = n; W.MX = 0; W.PX0 = 0; W.PX1 = w; W.top = 0; W.bottom = gh; W.gh = gh; W.CP = seg.CP;
    mat = new Uint8Array(n); back = new Uint8Array(n); code = new Uint8Array(n); col = new Uint32Array(n); bcol = new Uint32Array(n);
    kind = new Uint8Array(n); gid = new Int32Array(n); pgid = new Uint16Array(n); burn = new Uint8Array(n); flag = new Uint8Array(n); under = new Uint8Array(n); tgt = new Uint16Array(n);
    mtl = new Uint8Array(n); dmg = new Uint8Array(n);
    src = new Int32Array(n).fill(-1); rid = new Uint16Array(n); ptex = new Uint8Array(n); wvis = new Uint8Array(n); ocol = new Uint32Array(n); obcol = new Uint32Array(n);
    sandMark = new Uint32Array(n); visit = new Uint32Array(n);
    Object.assign(W, { mat, back, code, col, bcol, kind, gid, pgid, burn, flag, tgt, mtl, dmg, src, rid, ptex, wvis, ocol, obcol, under });
    levelCv = document.createElement('canvas');
    levelCv.width = w; levelCv.height = h;
    levelCtx = levelCv.getContext('2d');
    img = levelCtx.createImageData(w, h);
    pix = new Uint32Array(img.data.buffer);
    W.levelCv = levelCv; W.pix = pix;
    TW = Math.ceil(w / TILE); TH = Math.ceil(h / TILE);
    W.TW = TW; W.TH = TH;
    dirtyTiles = new Uint8Array(TW * TH);
    hiTiles = new Uint8Array(TW * TH);
    const c = seg.cells;
    let total = 0;
    for (let i = 0; i < w * gh; i++) {
      rid[i] = c.rid[i]; back[i] = c.back[i]; code[i] = 1; col[i] = c.col[i]; bcol[i] = c.bcol[i]; kind[i] = c.kind[i]; mtl[i] = c.mtl[i];
      flag[i] = c.flag[i]; ptex[i] = c.ptex[i]; wvis[i] = c.wvis[i]; gid[i] = c.gid[i];
      ocol[i] = col[i]; obcol[i] = bcol[i];
      if (c.mat[i]) { mat[i] = SOLID; src[i] = i; total++; }
    }
    for (let cy = gh; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
      const i = cy * w + cx;
      mat[i] = ROCK; mtl[i] = M.STONE;
      const nz = hash(cx, cy) & 7;
      col[i] = shade(P32['1'], 1, nz);
    }
    W.groups = [null];
    const cnt = new Int32Array(seg.glyphs.length + 1);
    for (let i = 0; i < w * gh; i++) if (gid[i]) cnt[gid[i]]++;
    seg.glyphs.forEach((g, k) => W.groups.push({ t: 'g', x0: g.x0, y0: g.y0, x1: g.x1, y1: g.y1, n: cnt[k + 1], ch: '', rid: g.rid, sig: g.sig, line: g.line, word: g.word, px: g.px }));
    W.words = seg.words.map((wd, k) => ({ text: '', sig: wd.glyphs.map((g) => seg.glyphs[g].sig).join('.'), ids: wd.glyphs.map((g) => g + 1), x: wd.x0, y: wd.y0, w: wd.x1 - wd.x0 + 1, h: wd.y1 - wd.y0 + 1, rid: wd.rid, line: wd.line, k }));
    W.lines = seg.lines.map((l) => ({ ids: l.glyphs.map((g) => g + 1), x0: l.x0, y0: l.y0, x1: l.x1, y1: l.y1, rid: l.rid }));
    W.regions = seg.regions;
    W.props = [null];
    for (const wd of seg.widgets) addPropRegion('widget', { x0: wd.x0, y0: wd.y0, x1: wd.x1, y1: wd.y1 }, { label: wd.id, side: wd.side });
    W.tElems = [];
    W.total = Math.max(1, total);
    W.ready = true;
  }
  function addPropRegion(t, box, o = {}) {
    const id = W.props.length;
    let cnt = 0;
    for (let y = box.y0; y <= box.y1; y++) for (let x = box.x0; x <= box.x1; x++) {
      const i = y * W.w + x;
      if (mat[i] === SOLID && !pgid[i]) { pgid[i] = id; cnt++; if (o.button && kind[i] !== K_TEXT) mtl[i] = M.BUTTON; }
    }
    const p = { id, t, ...box, n: cnt, left: cnt, label: o.label || '', dead: false, hits: 0, o };
    W.props.push(p);
    return p;
  }
  function finalize() {
    let total = 0;
    for (let i = 0; i < W.n; i++) if (mat[i] === SOLID || mat[i] === ICE) total++;
    W.total = Math.max(1, total);
    for (const p of W.props) if (p) { let c = 0; for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) if (pgid[y * W.w + x] === p.id && mat[y * W.w + x] === SOLID) c++; p.n = c; p.left = c; }
    init = { mat: mat.slice(), col: col.slice(), back: back.slice(), code: code.slice(), bcol: bcol.slice(), kind: kind.slice(), gid: gid.slice(), pgid: pgid.slice(), mtl: mtl.slice(), flag: flag.slice(), src: src.slice(), ptex: ptex.slice() };
    W.init = init;
  }
  function cellBox(r) {
    return {
      x0: Math.max(0, Math.floor(r.x0 / CELL)), x1: Math.min(W.w - 1, Math.ceil(r.x1 / CELL) - 1),
      y0: Math.max(0, Math.floor(r.y0 / CELL)), y1: Math.min(W.h - 4, Math.ceil(r.y1 / CELL) - 1)
    };
  }
  function forRect(r, fn) {
    const b = cellBox({ x0: r.x, y0: r.y, x1: r.x + r.w, y1: r.y + r.h });
    for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) fn(y * W.w + x, x, y);
  }

  function reset() {
    mat.set(init.mat); col.set(init.col); back.set(init.back); code.set(init.code); bcol.set(init.bcol); kind.set(init.kind); gid.set(init.gid); pgid.set(init.pgid); mtl.set(init.mtl); flag.set(init.flag); src.set(init.src); ptex.set(init.ptex);
    burn.fill(0); under.fill(0); tgt.fill(0); dmg.fill(0);
    W.chunks = []; W.burning = []; W.smoulder = []; W.iceList = []; W.sand = []; W.rubbleN = 0;
    W.destroyed = 0; W.targets = [];
    for (const g of W.groups) if (g) g.dead = false;
    for (const p of W.props) if (p) { p.dead = false; p.left = p.n; p.hits = 0; p.state = null; p.t = 0; }
    for (let i = 0; i < W.n; i++) pix[i] = color(i);
    levelCtx.putImageData(img, 0, 0);
    dirtyTiles.fill(0); dirtyList = [];
    hiTiles.fill(0); hiList = [];
    WTP.deskRender?.invalidate?.();
  }
  function restoreArea(cx, cy, r) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(W.h - 4, Math.ceil(cy + r));
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const i = y * W.w + x;
      if (G()?.inPlayer?.(x, y) && init.mat[i] === SOLID) continue;
      if (mat[i] === RUBBLE || mat[i] === DEBRIS) W.rubbleN = Math.max(0, W.rubbleN - 1);
      const was = mat[i] === SOLID || mat[i] === ICE;
      mat[i] = init.mat[i]; col[i] = init.col[i]; back[i] = init.back[i]; code[i] = init.code[i]; bcol[i] = init.bcol[i]; kind[i] = init.kind[i]; gid[i] = init.gid[i]; mtl[i] = init.mtl[i]; flag[i] = init.flag[i]; src[i] = init.src[i]; ptex[i] = init.ptex[i];
      burn[i] = 0; dmg[i] = 0;
      if (mat[i] === SOLID && !was) { W.destroyed = Math.max(0, W.destroyed - 1); n++; }
      if (gid[i] && W.groups[gid[i]]) W.groups[gid[i]].dead = false;
      touch(i);
    }
    return n;
  }

  function iceCol(c, x, y) {
    const base = mix(c, P32.C, 0.62);
    const h = hash(x, y) & 15;
    return h === 0 ? P32['7'] : h < 3 ? shade(base, 1.12, 8) : base;
  }
  function paneColor(i) {
    const x = i % W.w, y = (i / W.w) | 0;
    const b = bcol[i];
    const edge = (x > 0 && !back[i - 1]) || (x < W.w - 1 && !back[i + 1]) || (i >= W.w && !back[i - W.w]) || (!back[i + W.w] && mat[i + W.w] !== ROCK);
    if (edge && (flag[i] & F_CHAR)) return shade(b, 0.55);
    if (edge) return (hash(x, y) & 1) ? shade(b, 1.05, 16) : shade(b, 0.82);
    if (flag[i] & F_CHAR) return (hash(x, y) & 3) ? shade(b, 0.82) : shade(b, 0.7);
    return b;
  }
  function wallEdge(i) {
    const x = i % W.w;
    return (x > 0 && !code[i - 1] && !back[i - 1]) || (x < W.w - 1 && !code[i + 1] && !back[i + 1]) || (i >= W.w && !code[i - W.w] && !back[i - W.w]) || (!code[i + W.w] && !back[i + W.w] && mat[i + W.w] !== ROCK);
  }
  function color(i) {
    const m = mat[i];
    if (m === ROCK || m === RUBBLE) return col[i];
    if (m === DEBRIS) return src[i] >= 0 ? 0 : col[i];
    if (m === SOLID) return src[i] >= 0 ? 0 : col[i];
    if (m === ICE) { const x = i % W.w, y = (i / W.w) | 0; return iceCol(col[i], x, y); }
    return 0;
  }
  function markHi(x, y) {
    const t = ((y / TILE) | 0) * TW + ((x / TILE) | 0);
    if (!hiTiles[t]) { hiTiles[t] = 1; hiList.push(t); }
  }
  function markFx(x, y) {
    const t = ((y / TILE) | 0) * TW + ((x / TILE) | 0);
    if (!dirtyTiles[t]) { dirtyTiles[t] = 1; dirtyList.push(t); }
  }
  function markTile(x, y) { markFx(x, y); markHi(x, y); }
  function touch(i) {
    const x = i % W.w, y = (i / W.w) | 0;
    pix[i] = color(i);
    markTile(x, y);
  }
  function touchEdges(i) {
    const x = i % W.w;
    for (let dy = -W.w; dy <= W.w; dy += W.w) for (let dx = -1; dx <= 1; dx++) {
      const j = i + dy + dx;
      if (j >= 0 && j < W.n && ptex[j] === 2 && Math.abs((j % W.w) - x) <= 1) { ptex[j] = 0; markHi(j % W.w, (j / W.w) | 0); }
    }
    for (const j of [i - 1, i + 1, i - W.w, i + W.w]) if (j >= 0 && j < W.n && Math.abs((j % W.w) - x) <= 1 && mat[j] !== SOLID) { pix[j] = color(j); markTile(j % W.w, (j / W.w) | 0); }
  }
  function takeHi() {
    const l = hiList;
    for (const t of l) hiTiles[t] = 0;
    hiList = [];
    return l;
  }
  function flush() {
    if (!dirtyList.length) return;
    if (dirtyList.length > 160) {
      let y0 = 1e9, y1 = -1;
      for (const t of dirtyList) { const ty = (t / TW) | 0; if (ty < y0) y0 = ty; if (ty > y1) y1 = ty; dirtyTiles[t] = 0; }
      levelCtx.putImageData(img, 0, 0, 0, y0 * TILE, W.w, (y1 - y0 + 1) * TILE);
    } else {
      dirtyList.sort((a, b) => a - b);
      let k = 0;
      while (k < dirtyList.length) {
        const t0 = dirtyList[k];
        let t1 = t0;
        while (k + 1 < dirtyList.length && dirtyList[k + 1] === t1 + 1 && ((dirtyList[k + 1] / TW) | 0) === ((t0 / TW) | 0)) { k++; t1 = dirtyList[k]; }
        const ty = (t0 / TW) | 0, tx0 = t0 % TW, tx1 = t1 % TW;
        levelCtx.putImageData(img, 0, 0, tx0 * TILE, ty * TILE, (tx1 - tx0 + 1) * TILE, TILE);
        for (let t = t0; t <= t1; t++) dirtyTiles[t] = 0;
        k++;
      }
    }
    dirtyList = [];
  }
  function cellSrc(cells, i) { (cells.src || (cells.src = [])).push(src[i]); }

  const isSolidM = (m) => m === SOLID || m === ROCK || m === RUBBLE || m === ICE || m === DEBRIS;
  const solid = (x, y) => {
    if (x < 0 || x >= W.w) return true;
    if (y < 0) return false;
    if (y >= W.h) return true;
    const i = y * W.w + x;
    return isSolidM(mat[i]) || (W.occ !== undefined && W.occ[i] !== 0);
  };
  const hardAt = (x, y) => {
    if (x < 0 || x >= W.w) return true;
    if (y < 0) return false;
    if (y >= W.h) return true;
    const m = mat[y * W.w + x];
    return m === SOLID || m === ROCK || m === ICE;
  };
  const solidI = (i) => isSolidM(mat[i]);
  const frontAt = (x, y) => x >= 0 && y >= 0 && x < W.w && y < W.h && (mat[y * W.w + x] === SOLID || mat[y * W.w + x] === ICE);

  const G = () => WTP.game;
  const FX = () => WTP.fx;
  const PR = () => WTP.props;
  const STR = () => WTP.structs;
  function counted(i, n = 1) {
    W.destroyed += n;
    if (WTP.hardcore && WTP.hardcore.on) WTP.hardcore.cellGone(i);
    if (rid[i]) STR()?.dirty?.(rid[i]);
    const t = tgt[i];
    if (t && W.targets[t]) { const T = W.targets[t]; T.left--; if (!T.done && T.left <= T.total * T.need) { T.done = true; G()?.targetDown?.(T); } }
    const p = pgid[i];
    if (p) { const pr = W.props[p]; if (pr && !pr.dead) { pr.left--; PR()?.cellGone?.(pr); } }
  }
  function matDebris(m, x, y, vx, vy, c, opt) {
    const F = FX();
    if (m === M.WOOD) F.splinter(x, y, vx, vy, c);
    else if (m === M.METAL) { if (Math.random() < 0.5) F.spark(x, y, vx * 1.4, vy * 1.4, Math.random() < 0.5 ? P32.y : P32['7'], 0.25); else F.debris(x, y, vx, vy, c, opt); }
    else if (m === M.PAPER && (hash(x | 0, y | 0) & 3) === 0) F.paper(x, y, vx * 0.6, vy * 0.6, c);
    else if (m === M.IMAGE) F.debris(x, y, vx * 0.5, vy * 0.5 - 20, c, opt);
    else if (m === M.STONE) { F.debris(x, y, vx, vy, c, opt); if (Math.random() < 0.15) F.dust(x, y); }
    else F.debris(x, y, vx, vy, c, opt);
  }
  function kill(i, x, y, cx, cy, chance, force, opt) {
    const m = mat[i];
    if (m === SOLID || m === ICE) {
      const c = m === ICE ? iceCol(col[i], x, y) : col[i];
      mat[i] = HOLE; burn[i] = 0; dmg[i] = 0;
      counted(i);
      if (chance > 0 && Math.random() < chance) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = force * (0.4 + Math.random());
        matDebris(mtl[i], x + 0.5, y + 0.5, (dx / d) * sp + rand(-20, 20), (dy / d) * sp - rand(20, 80), c, opt);
      }
      touch(i); touchEdges(i); wakeAbove(i);
      return 1;
    }
    if (m === RUBBLE || m === DEBRIS) {
      const c = col[i];
      clearRubble(i, x, y);
      if (chance > 0 && Math.random() < chance * 0.7) FX().debris(x + 0.5, y + 0.5, rand(-40, 40) + (x - cx) * 4, rand(-90, -20), c, { ns: true });
    }
    return 0;
  }
  function dent(i, x, y) {
    const m = mtl[i];
    flag[i] |= F_DENT;
    const h = hash(x, y) & 7;
    if (m === M.METAL) col[i] = h === 0 ? shade(col[i], 1.25, 20) : shade(col[i], 0.86);
    else if (m === M.WOOD) col[i] = h < 3 ? shade(col[i], 0.7) : shade(col[i], 0.93);
    else col[i] = h < 2 ? shade(col[i], 0.72) : shade(col[i], 0.92);
    if (!burn[i]) touch(i);
  }

  function carve(cx, cy, r, o = {}) {
    if (!W.ready) return 0;
    if (W.capsT > 0 && o.pop !== 0) o = { ...o, pop: 1, letters: (o.letters || 0) + 5 };
    const pm = W.powMul;
    if (pm !== 1 && !o.noPow) r *= 1 + (pm - 1) * 0.5;
    const chance = (o.debris ?? 0.35) * (W.quality >= 2 ? 1 : W.quality === 1 ? 0.6 : 0.35), force = o.force ?? 60;
    const pow = (o.pow ?? (1 + r * 0.22)) * pm;
    let n = 0;
    const R = Math.ceil(r + 3);
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(W.w - 1, Math.ceil(cx + R));
    const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(W.h - 4, Math.ceil(cy + R));
    const jit = Math.min(2.2, r * 0.35);
    const hitG = [], hitGlass = [], hitP = [];
    let iceHit = -1, dented = 0, metalHit = 0, hm = -1;
    const shape = o.square;
    const backR = o.back != null ? r * o.back : (r >= 6 && pow >= 3 ? r * 0.5 : 0);
    const codeR = o.code != null ? r * o.code : (r >= 13 ? r * 0.32 : 0);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const i = y * W.w + x;
        const m = mat[i];
        let inside, d2 = dx * dx + dy * dy;
        if (shape) inside = Math.abs(dx) <= r && Math.abs(dy) <= r;
        else { const jr = r + ((hash(x, y) & 7) / 7 - 0.5) * jit; inside = d2 <= jr * jr; }
        if (inside) {
          if (m === SOLID) {
            if (hm < 0) hm = mtl[i];
            if (pgid[i] && hitP.length < 8 && hitP.indexOf(pgid[i]) < 0) hitP.push(pgid[i]);
            if (kind[i] === K_GLASS) { if (hitGlass.indexOf(gid[i]) < 0) hitGlass.push(gid[i]); continue; }
            const t = TOUGH[mtl[i]];
            if (t > 1.05 && !W.rootPierce) {
              const pl = pow * (1 - 0.45 * Math.sqrt(d2) / (r + 0.01));
              const nd = dmg[i] + pl * 20;
              if (nd < t * 20) { dmg[i] = Math.min(255, nd); dent(i, x, y); dented++; if (mtl[i] === M.METAL) metalHit++; continue; }
            }
            if (kind[i] === K_TEXT && gid[i] && hitG.length < 24 && hitG.indexOf(gid[i]) < 0) hitG.push(gid[i]);
            n += kill(i, x, y, cx, cy, chance, force, o.dopt);
          } else if (m === ICE) { iceHit = i; }
          else if (W.occ && W.occ[i]) { n += STR().hitCell(i, cx, cy, force); continue; }
          else if (m === RUBBLE || m === DEBRIS) kill(i, x, y, cx, cy, o.clean ? 0 : chance, force);
          if (backR > 0 && (back[i] || code[i]) && mat[i] !== SOLID) {
            const fz = 0.8 + (hash(y, x) & 7) / 20;
            let ch = false;
            if (back[i] && d2 <= backR * backR * fz) { back[i] = 0; ch = true; if (rid[i]) STR()?.dirty?.(rid[i]); }
            if (!back[i] && code[i] && codeR > 0 && d2 <= codeR * codeR * fz) { code[i] = 0; ch = true; }
            if (ch) { pix[i] = color(i); markTile(x, y); touchEdges(i); }
          }
        } else if (o.scorch && m === SOLID && d2 <= (r + 2.2) * (r + 2.2) && !(flag[i] & F_CHAR) && (hash(x, y) & 1)) {
          col[i] = shade(col[i], 0.8); flag[i] |= F_CHAR; if (!burn[i]) touch(i);
        } else if (o.scorch && m === HOLE && back[i] && d2 <= (r + 1.5) * (r + 1.5) && !(flag[i] & F_CHAR) && (hash(x, y) & 3) === 0) {
          flag[i] |= F_CHAR; pix[i] = color(i); markTile(x, y);
        }
      }
    }
    W.lastHitMtl = hm;
    for (const g of hitGlass) n += shatterGlass(g, cx, cy);
    if (iceHit >= 0) n += shatterIce(iceHit, cx, cy, force);
    if (o.ignite) igniteRing(cx, cy, r, o.ignite);
    if (dented) {
      G()?.stat?.('cracks', dented);
      if (metalHit) { if (r < 5) WTP.audio.play('metalTick', r); else WTP.audio.play('clank', metalHit); for (let k = 0; k < Math.min(r < 5 ? 2 : 4, metalHit); k++) FX().spark(cx, cy, rand(-90, 90), rand(-110, -10), Math.random() < 0.5 ? P32['7'] : P32.y, 0.2); }
      else WTP.audio.play('thud', dented);
    }
    if (hitP.length) for (const p of hitP) PR()?.hit?.(W.props[p], cx, cy, pow, o);
    if (hitG.length && o.pop !== 0) {
      const pop = o.pop ?? (r < 5 ? 0.65 : 1);
      let got = 0;
      for (const g of hitG) if (Math.random() < pop) { const k = detachGlyph(g, (Math.random() - 0.5) * 60 + (o.vx || 0) * 0.15, -rand(30, 90) + (o.vy || 0) * 0.1); if (k) { n += k; got++; } }
      if (got) { G()?.stat?.('letters', got); if (got >= 3) WTP.audio.play('letters'); }
    }
    if (o.letters) n += letterRing(cx, cy, r, r + o.letters, force);
    if ((n || backR > 0) && !o.noCrumble) n += crumble(cx, cy, Math.max(0, r - 1), r + (o.crumbleR || 5));
    if (n) G()?.scored?.(n, cx, cy, o.cause);
    if (pow >= 2 && !o.noCrack) STR()?.impact?.(cx, cy, r, pow);
    W.lastHitMtl = hm;
    return n;
  }
  function letterRing(cx, cy, r0, r1, force) {
    const seen = [];
    const x0 = Math.max(0, Math.floor(cx - r1)), x1 = Math.min(W.w - 1, Math.ceil(cx + r1));
    const y0 = Math.max(0, Math.floor(cy - r1)), y1 = Math.min(W.h - 4, Math.ceil(cy + r1));
    for (let y = y0; y <= y1; y += 2) for (let x = x0; x <= x1; x += 2) {
      const i = y * W.w + x;
      if (mat[i] !== SOLID || kind[i] !== K_TEXT || !gid[i]) continue;
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 > r1 * r1 || d2 < r0 * r0 * 0.6) continue;
      if (seen.indexOf(gid[i]) < 0) seen.push(gid[i]);
      if (seen.length > 28) break;
    }
    let n = 0, got = 0;
    for (const g of seen) {
      const gr = W.groups[g];
      const gx = (gr.x0 + gr.x1) / 2 - cx, gy = (gr.y0 + gr.y1) / 2 - cy, d = Math.hypot(gx, gy) || 1;
      const sp = force * (0.7 + Math.random() * 0.8) * (1 - d / (r1 + 4));
      const k = detachGlyph(g, (gx / d) * sp, (gy / d) * sp - rand(40, 110));
      if (k) { n += k; got++; }
    }
    if (got) { G()?.stat?.('letters', got); if (got >= 8) G()?.event?.('LETTER STORM!', cx, cy); WTP.audio.play('letters'); }
    return n;
  }
  function detachGlyph(g, vx, vy) {
    const gr = W.groups[g];
    if (!gr || gr.dead) return 0;
    const cells = [];
    for (let y = gr.y0; y <= gr.y1; y++) for (let x = gr.x0; x <= gr.x1; x++) {
      const i = y * W.w + x;
      if (gid[i] === g && mat[i] === SOLID) { cells.push(x, y, burn[i] ? shade(col[i], 0.6) : col[i]); cellSrc(cells, i); }
    }
    gr.dead = true;
    if (cells.length < 9) { for (let k = 0; k < cells.length; k += 3) { const i = cells[k + 1] * W.w + cells[k]; kill(i, cells[k], cells[k + 1], cells[k], cells[k + 1], 1, 30); } return cells.length / 3; }
    for (let k = 0; k < cells.length; k += 3) {
      const i = cells[k + 1] * W.w + cells[k];
      mat[i] = HOLE; burn[i] = 0; counted(i); touch(i); touchEdges(i); wakeAbove(i);
    }
    makeChunk(cells, vx, vy, { letter: true, mtl: M.INK });
    return cells.length / 3;
  }
  function detachRegion(pred, x0, y0, x1, y1, vx, vy, o = {}) {
    const cells = [];
    for (let y = Math.max(0, y0); y <= Math.min(W.h - 4, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W.w - 1, x1); x++) {
      const i = y * W.w + x;
      if (mat[i] === SOLID && pred(i)) { cells.push(x, y, col[i]); cellSrc(cells, i); }
    }
    if (cells.length < 6) return null;
    for (let k = 0; k < cells.length; k += 3) {
      const i = cells[k + 1] * W.w + cells[k];
      mat[i] = HOLE; burn[i] = 0; counted(i); touch(i); touchEdges(i); wakeAbove(i);
    }
    return makeChunk(cells, vx, vy, o);
  }
  function shatterGlass(g, cx, cy) {
    const gr = W.groups[g];
    if (!gr || gr.dead) return 0;
    gr.dead = true;
    let n = 0;
    for (let y = gr.y0; y <= gr.y1; y++) for (let x = gr.x0; x <= gr.x1; x++) {
      const i = y * W.w + x;
      if (gid[i] !== g || mat[i] !== SOLID) continue;
      const c = col[i];
      mat[i] = HOLE; counted(i); touch(i); touchEdges(i); wakeAbove(i); n++;
      if (Math.random() < 0.45) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = rand(40, 160);
        FX().shard(x + 0.5, y + 0.5, (dx / d) * sp + rand(-30, 30), (dy / d) * sp - rand(40, 120), (hash(x, y) & 3) === 0 ? P32['7'] : (hash(x, y) & 3) === 1 ? P32.C : c);
      }
    }
    WTP.audio.play('glass');
    G()?.stat?.('glass', 1);
    G()?.event?.('SHATTERED!', (gr.x0 + gr.x1) / 2, gr.y0);
    crumble((gr.x0 + gr.x1) / 2, (gr.y0 + gr.y1) / 2, 0, Math.max(gr.x1 - gr.x0, gr.y1 - gr.y0) / 2 + 6);
    return n;
  }
  function shatterIce(i0, cx, cy, force = 80) {
    if (mat[i0] !== ICE) return 0;
    let qn = 0, h = 0, n = 0;
    qbuf[qn++] = i0; mat[i0] = 250;
    const list = [];
    while (h < qn && list.length < 6000) {
      const i = qbuf[h++];
      list.push(i);
      const x = i % W.w;
      const nb = [i - W.w, i + W.w, x > 0 ? i - 1 : -1, x < W.w - 1 ? i + 1 : -1];
      for (const j of nb) if (j >= 0 && j < W.n && mat[j] === ICE && qn < qbuf.length) { mat[j] = 250; qbuf[qn++] = j; }
    }
    for (const i of list) {
      const x = i % W.w, y = (i / W.w) | 0;
      const c = iceCol(col[i], x, y);
      mat[i] = HOLE; burn[i] = 0; counted(i); touch(i); touchEdges(i); wakeAbove(i); n++;
      if (Math.random() < 0.4) {
        const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, sp = rand(30, 140) * (force / 80);
        FX().shard(x + 0.5, y + 0.5, (dx / d) * sp + rand(-40, 40), (dy / d) * sp - rand(30, 110), c);
      }
    }
    for (let k = h; k < qn; k++) if (mat[qbuf[k]] === 250) mat[qbuf[k]] = ICE;
    if (n) { WTP.audio.play('ice'); G()?.stat?.('iced', n); if (n > 200) G()?.event?.('ICE BREAKER!', cx, cy); }
    return n;
  }
  function freezeAt(cx, cy, r) {
    let n = 0;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(W.h - 4, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      const i = y * W.w + x;
      if (mat[i] === SOLID && kind[i] !== K_GLASS && !pgid[i]) {
        mat[i] = ICE; burn[i] = 180 + (Math.random() * 60) | 0; W.iceList.push(i); touch(i); n++;
      }
    }
    return n;
  }
  function updateIce() {
    const L = W.iceList;
    if (!L.length) return;
    for (let k = L.length - 1; k >= 0; k--) {
      const i = L[k];
      if (mat[i] !== ICE) { L[k] = L[L.length - 1]; L.pop(); continue; }
      if (burn[i] > 0) burn[i]--;
      if (burn[i] === 0) {
        const x = i % W.w, y = (i / W.w) | 0;
        const n = shatterIce(i, x + 0.5, y - 2, 50);
        if (n) { G()?.scored?.(n, x, y, 'ice'); crumble(x, y, 0, 12); }
        L[k] = L[L.length - 1]; L.pop();
      } else if ((burn[i] & 31) === 0 && Math.random() < 0.02) {
        FX().spark(i % W.w + 0.5, ((i / W.w) | 0) + 0.5, rand(-5, 5), rand(-10, 0), P32['7'], 0.3);
      }
    }
  }
  function paintAt(cx, cy, r, c) {
    let n = 0;
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(W.h - 4, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, jr = r + ((hash(x, y) & 7) - 3.5) * 0.25;
      if (dx * dx + dy * dy > jr * jr) continue;
      const i = y * W.w + x;
      if (mat[i] === SOLID || mat[i] === DEBRIS || mat[i] === RUBBLE) {
        col[i] = mix(c, col[i], WTP.lum(col[i]) < 0.3 ? 0.35 : 0.12);
        if ((hash(x, y) & 7) === 0) col[i] = shade(col[i], 1.15, 10);
        if (!(flag[i] & F_PAINT)) { flag[i] |= F_PAINT; n++; }
        if (!burn[i]) touch(i);
      } else if (back[i] && mat[i] !== ICE) {
        bcol[i] = mix(c, bcol[i], 0.45); pix[i] = color(i); markTile(x, y);
      }
    }
    return n;
  }
  function corrode(i, x, y) {
    if (mat[i] !== SOLID && mat[i] !== DEBRIS && mat[i] !== RUBBLE && mat[i] !== ICE) return false;
    for (const j of [i - 1, i + 1, i + W.w]) if (j >= 0 && j < W.n && mat[j] === SOLID && !(flag[j] & F_ACID)) { col[j] = mix(col[j], P32.l, 0.35); flag[j] |= F_ACID; touch(j); }
    if (mat[i] === SOLID && mtl[i] === M.METAL && Math.random() < 0.6) { col[i] = mix(col[i], P32.G, 0.3); touch(i); return true; }
    const n = kill(i, x, y, x, y, 0, 0);
    if (n) G()?.scored?.(n, x, y, 'acid');
    return true;
  }

  function ignite(i, gen) {
    if (burn[i] || W.burning.length > 5000) return;
    if (mat[i] === ICE) { const x = i % W.w, y = (i / W.w) | 0; kill(i, x, y, x, y, 0, 0); FX().smoke(x, y, 6, P32['6']); WTP.audio.play('sizzle'); return; }
    if (mat[i] !== SOLID) return;
    const fl = FLAMMABLE[mtl[i]];
    if (!fl) { if (mtl[i] === M.METAL && !(flag[i] & F_CHAR) && Math.random() < 0.2) { col[i] = mix(col[i], P32.a, 0.25); flag[i] |= F_CHAR; touch(i); } return; }
    burn[i] = (fl === 2 ? 70 : 30) + ((Math.random() * 50) | 0);
    under[i] = Math.min(250, gen);
    W.burning.push(i);
  }
  function igniteRing(cx, cy, r, chance) {
    for (let k = 0; k < r * 3; k++) {
      if (Math.random() > chance) continue;
      const a = Math.random() * Math.PI * 2, rr = r + rand(-1, 3);
      const x = Math.floor(cx + Math.cos(a) * rr), y = Math.floor(cy + Math.sin(a) * rr);
      if (x >= 0 && x < W.w && y >= 0 && y < W.h - 3) ignite(y * W.w + x, 2);
    }
  }
  function igniteAt(x, y, spread = 10) {
    if (x < 0 || y < 0 || x >= W.w || y >= W.h - 3) return;
    ignite(y * W.w + x, 0);
    for (let z = 0; z < spread; z++) {
      const jx = x + ((Math.random() * 7) | 0) - 3, jy = y + ((Math.random() * 7) | 0) - 3;
      if (jx >= 0 && jx < W.w && jy >= 0 && jy < W.h - 3) ignite(jy * W.w + jx, 1);
    }
  }
  const FIRE = [P32.Y, P32.y, P32.a, P32.o, P32.e, P32.y];
  const EMBER = [P32.R, P32.r, P32['1'], P32.e];
  let burnAcc = 0;
  function updateBurn() {
    const B = W.burning;
    let any = 0, burned = 0;
    for (let k = B.length - 1; k >= 0; k--) {
      const i = B[k];
      const x = i % W.w, y = (i / W.w) | 0;
      if (mat[i] !== SOLID) { burn[i] = 0; B[k] = B[B.length - 1]; B.pop(); touch(i); continue; }
      const t = --burn[i];
      if (t <= 0) {
        burned++;
        B[k] = B[B.length - 1]; B.pop();
        if (mtl[i] === M.PLASTIC && Math.random() < 0.85) {
          const c = mix(col[i], P32.o, 0.25);
          mat[i] = HOLE; counted(i); any++;
          touch(i); touchEdges(i); wakeAbove(i);
          if (!placeRubble(x, y, shade(c, 0.8))) FX().lava(x + 0.5, y + 0.5, rand(-10, 10), rand(0, 30));
          if (Math.random() < 0.08) FX().smoke(x, y - 1, 1, P32['3']);
        }
        else if (Math.random() < 0.8) { const pm = mtl[i] === M.PAPER || mtl[i] === M.INK, c0 = col[i]; any += kill(i, x, y, x + 0.5, y + 1, 0.04, 20); if (Math.random() < 0.12) FX().smoke(x, y - 1, 1); if (pm && Math.random() < 0.08) FX().paper(x + 0.5, y, rand(-10, 10), rand(-30, -10), mix(c0, P32['1'], 0.75)); if (Math.random() < (pm ? 0.14 : 0.05)) FX().ash(x + 0.5, y); }
        else {
          col[i] = EMBER[hash(x, y) & 3]; flag[i] |= F_CHAR; touch(i);
          if (W.smoulder.length < 3000) W.smoulder.push(i, 60 + ((Math.random() * 160) | 0));
        }
        continue;
      }
      pix[i] = FIRE[(hash(x, y + t) >>> 3) % 6];
      markFx(x, y);
      if (under[i] < 16 && Math.random() < 0.1) {
        const d = (Math.random() * 5) | 0;
        const nx = x + (d === 0 ? 1 : d === 1 ? -1 : 0), ny = y + (d === 2 ? 1 : d >= 3 ? -1 : 0);
        if (nx >= 0 && nx < W.w && ny >= 0 && ny < W.h - 3) ignite(ny * W.w + nx, under[i] + 1);
      }
      if (Math.random() < 0.012 * (W.quality + 1) / 3) FX().flame(x + 0.5, y);
      if (Math.random() < 0.004 * (W.quality + 1)) FX().ember(x + 0.5, y);
    }
    const S = W.smoulder;
    for (let k = S.length - 2; k >= 0; k -= 2) {
      const i = S[k];
      if (mat[i] !== SOLID) { S[k] = S[S.length - 2]; S[k + 1] = S[S.length - 1]; S.length -= 2; continue; }
      const x = i % W.w, y = (i / W.w) | 0;
      if (--S[k + 1] <= 0) {
        S[k] = S[S.length - 2]; S[k + 1] = S[S.length - 1]; S.length -= 2;
        any += kill(i, x, y, x, y, 0, 0);
        if (Math.random() < 0.3) FX().ash(x + 0.5, y + 0.5);
        continue;
      }
      if ((S[k + 1] & 15) === 0) { const glow = (hash(x, y + S[k + 1]) & 7) < 2; pix[i] = glow ? P32.o : 0; markFx(x, y); }
      if (Math.random() < 0.0025 * W.quality) FX().smoke(x + 0.5, y, 1);
    }
    burnAcc += burned;
    if (any) G()?.scored?.(any, -1, -1, 'fire');
    if (burnAcc > 20) { G()?.stat?.('burned', burnAcc); burnAcc = 0; }
  }

  function placeRubble(x, y, c) {
    if (W.rubbleN >= 9000 || x < 0 || x >= W.w || y < 0 || y >= W.h - 3) return false;
    const i = y * W.w + x;
    const m = mat[i];
    if (m !== AIR && m !== HOLE) return false;
    if (G()?.inPlayer?.(x, y)) return false;
    under[i] = m;
    mat[i] = RUBBLE;
    col[i] = shade(c, 0.78 + (hash(x, y) & 7) * 0.025);
    W.rubbleN++;
    touch(i);
    W.sand.push(i);
    return true;
  }
  function clearRubble(i, x, y) {
    mat[i] = under[i] === AIR ? AIR : HOLE;
    W.rubbleN = Math.max(0, W.rubbleN - 1);
    touch(i);
    wakeAbove(i);
  }
  function wakeAbove(i) {
    if (i < W.w) return;
    for (let d = -1; d <= 1; d++) { const j = i - W.w + d; if (mat[j] === RUBBLE) W.sand.push(j); }
  }
  let sandGen = 0;
  function moveRubble(i, j) {
    under[j] = mat[j];
    mat[j] = RUBBLE; col[j] = col[i];
    mat[i] = under[i] === AIR ? AIR : HOLE;
    touch(i); touch(j);
    wakeAbove(i);
  }
  function updateSand() {
    if (!W.sand.length) return;
    sandGen++;
    const list = W.sand;
    W.sand = [];
    if (list.length > 1) list.sort((a, b) => b - a);
    const ip = G()?.inPlayer;
    for (const i0 of list) {
      if (mat[i0] !== RUBBLE || sandMark[i0] === sandGen) continue;
      let i = i0, moved = false;
      for (let s = 0; s < 2; s++) {
        const x = i % W.w, y = (i / W.w) | 0;
        if (y >= W.h - 4) break;
        const b = i + W.w;
        let j = -1;
        const em = (m) => m === AIR || m === HOLE;
        if (em(mat[b]) && !(ip && ip(x, y + 1))) j = b;
        else if (s === 0) {
          const d = (hash(x, y + sandGen) & 1) ? 1 : -1;
          for (const dd of [d, -d]) {
            const nx = x + dd;
            if (nx < 0 || nx >= W.w) continue;
            if (em(mat[b + dd]) && em(mat[i + dd]) && !(ip && ip(nx, y + 1))) { j = b + dd; break; }
          }
        }
        if (j < 0) break;
        moveRubble(i, j);
        i = j; moved = true;
      }
      sandMark[i] = sandGen;
      if (moved) W.sand.push(i);
    }
    if (W.sand.length > 12000) W.sand.length = 12000;
  }

  function crumble(cx, cy, r0, r1) {
    if (++visitGen > 4e9) { visit.fill(0); visitGen = 1; }
    const LIMIT = W.componentLimit;
    let dropped = 0;
    const x0 = Math.max(0, Math.floor(cx - r1)), x1 = Math.min(W.w - 1, Math.ceil(cx + r1));
    const y0 = Math.max(0, Math.floor(cy - r1)), y1 = Math.min(W.h - 4, Math.ceil(cy + r1));
    const w = W.w;
    let budget = 6;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i0 = y * w + x;
      const m0 = mat[i0];
      if ((m0 !== SOLID && m0 !== DEBRIS) || visit[i0] === visitGen) continue;
      const d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
      if (d2 > r1 * r1 || d2 < r0 * r0 * 0.5) continue;
      let qn = 0, glued = 0;
      qbuf[qn++] = i0;
      visit[i0] = visitGen;
      let anchored = false;
      for (let h = 0; h < qn; h++) {
        const i = qbuf[h];
        const ix = i % w;
        if (ix === 0 || ix === w - 1 || (flag[i] & F_PIN)) { anchored = true; break; }
        if (back[i] && mat[i] === SOLID) glued++;
        for (let dy = -w; dy <= w; dy += w) for (let dx = -1; dx <= 1; dx++) {
          const j = i + dy + dx;
          const mj = mat[j];
          if (mj === ROCK || mj === ICE) { anchored = true; continue; }
          if ((mj !== SOLID && mj !== DEBRIS) || visit[j] === visitGen) continue;
          visit[j] = visitGen;
          qbuf[qn++] = j;
        }
        if (qn > LIMIT) { anchored = true; break; }
      }
      if (anchored) continue;
      if (glued >= 40 && glued >= qn * 0.3) continue;
      if (--budget < 0) return dropped;
      const cells = [];
      let fronts = 0, mt = -1, mixed = false, bouncy = false;
      for (let k = 0; k < qn; k++) {
        const i = qbuf[k];
        const ix = i % w, iy = (i / w) | 0;
        cells.push(ix, iy, burn[i] ? shade(col[i], 0.55) : col[i]); cellSrc(cells, i);
        if (mat[i] === SOLID) { counted(i); fronts++; if (mt < 0) mt = mtl[i]; else if (mt !== mtl[i]) mixed = true; if (mtl[i] === M.RUBBER) bouncy = true; } else W.rubbleN = Math.max(0, W.rubbleN - 1);
        mat[i] = HOLE; burn[i] = 0; dmg[i] = 0; touch(i); touchEdges(i); wakeAbove(i);
      }
      dropped += fronts;
      if (qn >= 5) makeChunk(cells, rand(-12, 12) + (x - cx) * 2, rand(-30, 0), { mtl: mixed ? -1 : mt, bouncy });
      else for (let k = 0; k < cells.length; k += 3) FX().debris(cells[k] + 0.5, cells[k + 1] + 0.5, rand(-14, 14), rand(-30, 5), cells[k + 2]);
    }
    return dropped;
  }

  function makeChunk(cells, vx, vy, o = {}) {
    const n = cells.length / 3;
    let sx = 0, sy = 0;
    for (let k = 0; k < cells.length; k += 3) { sx += cells[k]; sy += cells[k + 1]; }
    const mx = sx / n + 0.5, my = sy / n + 0.5;
    const rel = new Float32Array(n * 2), cols = new Uint32Array(n), srcs = new Int32Array(n).fill(-1);
    if (cells.src) for (let j = 0; j < n; j++) srcs[j] = cells.src[j] ?? -1;
    let rad = 0;
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
    for (let k = 0, j = 0; k < cells.length; k += 3, j++) {
      const dx = cells[k] + 0.5 - mx, dy = cells[k + 1] + 0.5 - my;
      rel[j * 2] = dx; rel[j * 2 + 1] = dy; cols[j] = cells[k + 2];
      rad = Math.max(rad, Math.hypot(dx, dy));
      bx0 = Math.min(bx0, cells[k]); by0 = Math.min(by0, cells[k + 1]); bx1 = Math.max(bx1, cells[k]); by1 = Math.max(by1, cells[k + 1]);
    }
    const bw = bx1 - bx0 + 1, bh = by1 - by0 + 1;
    const mask = new Uint32Array(bw * bh);
    for (let k = 0; k < cells.length; k += 3) mask[(cells[k + 1] - by0) * bw + (cells[k] - bx0)] = cells[k + 2] || 0xff000001;
    const edge = [];
    for (let j = 0; j < n; j++) {
      const lx = Math.round(rel[j * 2] + mx - 0.5) - bx0, ly = Math.round(rel[j * 2 + 1] + my - 0.5) - by0;
      const at = (x, y) => x >= 0 && y >= 0 && x < bw && y < bh && mask[y * bw + x];
      if (!at(lx - 1, ly) || !at(lx + 1, ly) || !at(lx, ly - 1) || !at(lx, ly + 1)) edge.push(j);
    }
    const c = {
      srcs, tex: null, x: mx, y: my, vx, vy, a: 0, va: rand(-1.2, 1.2) * (o.letter ? 2 : 1), rel, cols, n, rad, edge: Int32Array.from(edge),
      ox: mx - bx0, oy: my - by0, bw, bh, mask, t: 0, rest: 0, hits: 0, letter: !!o.letter, held: !!o.held, thrown: false, dmg: o.dmg || 0,
      mtl: o.mtl ?? -1, bouncy: !!o.bouncy, drive: o.drive || 0, fuse: o.fuse || 0, prop: o.prop || null, life: o.life || 9
    };
    if (!o.held) {
      W.chunks.push(c);
      if (W.chunks.length > W.chunkLimit) settle(W.chunks.shift(), false);
      if (n > 260) { G()?.event?.('TIMBER!', mx, my); }
      G()?.stat?.('chunks', 1);
    }
    return c;
  }
  function chunkBlocked(c, x, y, a) {
    const cs = Math.cos(a), sn = Math.sin(a);
    const E = c.edge, R = c.rel;
    const step = E.length > 160 ? 3 : E.length > 60 ? 2 : 1;
    for (let k = 0; k < E.length; k += step) {
      const j = E[k];
      const dx = R[j * 2], dy = R[j * 2 + 1];
      if (solid(Math.floor(x + dx * cs - dy * sn), Math.floor(y + dx * sn + dy * cs))) return true;
    }
    return false;
  }
  function settle(c, loud = true, shatter = false) {
    const cs = Math.cos(c.a), sn = Math.sin(c.a);
    let placed = 0;
    const glassy = c.mtl === M.GLASS;
    for (let j = 0; j < c.n; j++) {
      const dx = c.rel[j * 2], dy = c.rel[j * 2 + 1];
      const x = Math.floor(c.x + dx * cs - dy * sn), y = Math.floor(c.y + dx * sn + dy * cs);
      const col0 = c.cols[j];
      if (!shatter && !glassy && x >= 0 && x < W.w && y >= 0 && y < W.h - 3) {
        const i = y * W.w + x;
        if ((mat[i] === AIR || mat[i] === HOLE) && !(G()?.inPlayer?.(x, y)) && W.rubbleN < 9000) {
          if (c.n > 120 && !c.letter) { under[i] = mat[i]; mat[i] = SOLID; col[i] = shade(col0, 0.9); src[i] = c.srcs ? c.srcs[j] : -1; flag[i] = F_PIN; kind[i] = 0; gid[i] = 0; rid[i] = 0; mtl[i] = c.mtl >= 0 ? c.mtl : M.PLASTIC; touch(i); placed++; continue; }
          under[i] = mat[i]; mat[i] = DEBRIS; col[i] = shade(col0, 0.88); src[i] = c.srcs ? c.srcs[j] : -1; W.rubbleN++; touch(i); placed++;
          continue;
        }
      }
      if (glassy) { if (Math.random() < 0.5) FX().shard(x + 0.5, y + 0.5, rand(-80, 80), rand(-120, -20), col0); }
      else if (Math.random() < (shatter ? 0.8 : 0.5)) matDebris(c.mtl, x + 0.5, y + 0.5, rand(-50, 50) + c.vx * 0.2, rand(-80, -10), col0);
    }
    if (loud) {
      const big = c.n;
      G()?.shake?.(Math.min(8, big / 40));
      for (let k = 0; k < Math.min(10, big / 8); k++) FX().dust(c.x + rand(-c.rad, c.rad), c.y + c.rad * 0.5);
      WTP.audio.play(glassy ? 'glass' : c.mtl === M.METAL ? 'clank' : c.mtl === M.WOOD ? 'wood' : 'crash', big);
    }
    return placed;
  }
  function updateChunks(dt) {
    const L = W.chunks;
    const P = WTP.player;
    for (let k = L.length - 1; k >= 0; k--) {
      const c = L[k];
      if (!c || c.held) continue;
      c.t += dt;
      if (c.drive) { c.vx = c.drive; c.va *= 0.8; c.a *= 0.9; if (Math.random() < 0.4) FX().smoke(c.x - Math.sign(c.drive) * c.rad, c.y + c.rad * 0.4, 1); }
      if (c.fuse) { c.fuse -= dt; if (c.fuse <= 0) { L.splice(k, 1); settle(c, false, true); WTP.weapons?.explode?.(c.x, c.y, 16 + Math.min(10, c.n / 60), { letters: 8 }); continue; } }
      c.vy = Math.min(360, c.vy + 560 * dt);
      const sp = Math.hypot(c.vx, c.vy);
      const steps = Math.max(1, Math.ceil((sp * dt) / 1.5));
      let hit = false;
      for (let s = 0; s < steps; s++) {
        const nx = c.x + (c.vx * dt) / steps, ny = c.y + (c.vy * dt) / steps, na = c.a + (c.va * dt) / steps;
        if (!chunkBlocked(c, nx, ny, na)) { c.x = nx; c.y = ny; c.a = na; continue; }
        hit = true;
        if (c.thrown && sp > 120) {
          L.splice(k, 1);
          const r = Math.min(16, 4 + Math.sqrt(c.n) * 0.6);
          WTP.weapons?.impactChunk?.(c, r);
          settle(c, true, true);
          break;
        }
        if (c.drive && chunkBlocked(c, nx, c.y, c.a)) {
          const hx = c.x + Math.sign(c.drive) * (c.rad + 1);
          carve(hx, c.y, Math.min(9, 3 + c.rad * 0.4), { debris: 0.5, force: 120, cause: 'car', pow: 3, noCrumble: true });
          c.hits++;
          if (c.hits > 30) { L.splice(k, 1); settle(c, false, true); WTP.weapons?.explode?.(c.x, c.y, 18, { letters: 8 }); break; }
          if (!chunkBlocked(c, c.x, ny, c.a)) c.y = ny;
          break;
        }
        if (glassImpact(c, sp)) { L.splice(k, 1); break; }
        const bk = c.bouncy ? 0.62 : 0.22;
        if (!chunkBlocked(c, nx, c.y, c.a)) { c.x = nx; c.vy = -c.vy * bk; }
        else if (!chunkBlocked(c, c.x, ny, c.a)) { c.y = ny; c.vx = -c.vx * (c.bouncy ? 0.7 : 0.4); }
        else { c.vy = -c.vy * (c.bouncy ? 0.5 : 0.25); c.vx *= 0.6; }
        c.va = c.va * 0.5 + (c.vx > 0 ? 1 : -1) * Math.min(2, sp / 120);
        c.hits++;
        if (c.hits === 1 && sp > 90) {
          WTP.audio.play(c.bouncy ? 'boing' : c.mtl === M.METAL ? 'clank' : c.mtl === M.WOOD ? 'wood' : 'crash', c.n * 0.6);
          G()?.shake?.(Math.min(6, c.n / 60));
          if (c.letter && Math.random() < 0.4) WTP.audio.play('tink');
          if (sp > 200 && c.n > 40) carve(c.x, c.y + c.rad, Math.min(7, 2 + c.n / 80), { debris: 0.4, force: 80, cause: 'impact', pow: 1 + c.n / 200, noCrumble: true, pop: 0.4 });
        }
        break;
      }
      if (!L[k] || L[k] !== c) continue;
      if (P && !P.dead) {
        const pc = P.center();
        const dx = pc.x - c.x, dy = pc.y - c.y, d = Math.hypot(dx, dy);
        if (d < c.rad * 0.8 + 4) {
          const csp = Math.hypot(c.vx, c.vy);
          if (csp > 150 && c.n > 25 && !c.thrown) P.hurt(1, c.x, { knock: 90 });
          if (Math.abs(P.vx) > 20) { c.vx += P.vx * 2 * dt * (40 / Math.max(20, c.n)); c.rest = 0; }
        }
      }
      if (hit) {
        if (!c.bouncy) c.vx *= 0.85;
        if (Math.abs(c.vy) < 30 && Math.abs(c.vx) < 25 && !c.drive) c.rest += dt; else c.rest = 0;
        if (c.rest > 0.12 || (c.hits > (c.bouncy ? 14 : 7) && !c.drive)) { L.splice(k, 1); settle(c, c.n > 30); continue; }
      }
      if (c.y > W.h + 20 || c.t > c.life) { L.splice(k, 1); settle(c, false); }
    }
  }
  function glassImpact(c, sp) {
    if (c.mtl !== M.GLASS || sp < 80) return false;
    settle(c, true, true);
    return true;
  }
  function grabDisk(cx, cy, r) {
    const cells = [];
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(W.h - 4, Math.ceil(cy + r));
    let n = 0;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, jr = r + ((hash(x, y) & 7) / 7 - 0.5) * 2.4;
      if (dx * dx + dy * dy > jr * jr) continue;
      const i = y * W.w + x;
      const m = mat[i];
      if (m === SOLID || m === DEBRIS || m === RUBBLE || m === ICE) {
        cells.push(x, y, m === ICE ? iceCol(col[i], x, y) : col[i]); cellSrc(cells, i);
        if (m === SOLID || m === ICE) { counted(i); n++; } else W.rubbleN = Math.max(0, W.rubbleN - 1);
        mat[i] = HOLE; burn[i] = 0; dmg[i] = 0; touch(i); touchEdges(i); wakeAbove(i);
      }
    }
    if (cells.length < 15) {
      for (let k = 0; k < cells.length; k += 3) FX().debris(cells[k], cells[k + 1], rand(-20, 20), rand(-40, 0), cells[k + 2]);
      if (n) G()?.scored?.(n, cx, cy);
      return null;
    }
    if (n) G()?.scored?.(n, cx, cy);
    crumble(cx, cy, r - 1, r + 6);
    return makeChunk(cells, 0, 0, { held: true });
  }
  function grabRect(x0, y0, x1, y1) {
    const cells = [];
    let n = 0;
    for (let y = Math.max(0, y0); y <= Math.min(W.h - 4, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W.w - 1, x1); x++) {
      const i = y * W.w + x;
      const m = mat[i];
      if (m === SOLID || m === DEBRIS || m === RUBBLE || m === ICE) {
        cells.push(x, y, m === ICE ? iceCol(col[i], x, y) : col[i]); cellSrc(cells, i);
        if (m === SOLID || m === ICE) { counted(i); n++; } else W.rubbleN = Math.max(0, W.rubbleN - 1);
        mat[i] = HOLE; burn[i] = 0; dmg[i] = 0; touch(i); touchEdges(i); wakeAbove(i);
      }
    }
    if (n) G()?.scored?.(n, (x0 + x1) / 2, (y0 + y1) / 2);
    if (cells.length < 15) return null;
    crumble((x0 + x1) / 2, (y0 + y1) / 2, 0, Math.max(x1 - x0, y1 - y0) / 2 + 6);
    return makeChunk(cells, 0, 0, { held: true });
  }
  function releaseChunk(c, vx, vy) {
    c.held = false; c.thrown = true; c.vx = vx; c.vy = vy; c.va = rand(-4, 4);
    W.chunks.push(c);
  }
  function eraseBack(cx, cy, r, deep) {
    const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W.w - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(W.h - 4, Math.ceil(cy + r));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W.w + x;
      if (!back[i] && !(deep && code[i])) continue;
      if (mat[i] === SOLID) continue;
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r * r) continue;
      if (back[i]) { back[i] = 0; if (rid[i]) STR()?.dirty?.(rid[i]); } else code[i] = 0;
      pix[i] = color(i); markTile(x, y); touchEdges(i);
    }
  }
  function setCell(x, y, c, m = M.METAL, fl = 0) {
    if (x < 0 || y < 0 || x >= W.w || y >= W.h - 3) return;
    const i = y * W.w + x;
    mat[i] = SOLID; col[i] = c; mtl[i] = m; kind[i] = 0; gid[i] = 0; flag[i] = fl; dmg[i] = 0; src[i] = -1;
    pix[i] = color(i); markTile(x, y);
  }
  function clearCell(x, y) {
    if (x < 0 || y < 0 || x >= W.w || y >= W.h - 3) return;
    const i = y * W.w + x;
    if (mat[i] === SOLID) { mat[i] = back[i] || code[i] ? HOLE : AIR; }
    kind[i] = 0; gid[i] = 0; pgid[i] = 0; flag[i] = 0;
    pix[i] = color(i);
  }
  function refreshAll() { for (let i = 0; i < W.n; i++) pix[i] = color(i); levelCtx.putImageData(img, 0, 0); dirtyTiles.fill(0); dirtyList = []; WTP.deskRender?.invalidate?.(); }
  function nearestSolid(x, y, maxR, pred) {
    let best = null, bd = 1e9;
    const step = maxR > 60 ? 4 : 3;
    for (let dy = -maxR; dy <= maxR; dy += step) for (let dx = -maxR; dx <= maxR; dx += step) {
      const d = dx * dx + dy * dy;
      if (d > maxR * maxR || d >= bd) continue;
      const xx = Math.floor(x + dx), yy = Math.floor(y + dy);
      if (!frontAt(xx, yy)) continue;
      if (pred && !pred(yy * W.w + xx, xx, yy)) continue;
      bd = d; best = [xx + 0.5, yy + 0.5];
    }
    return best;
  }
  function raycast(x, y, dx, dy, max, stepLen = 0.5) {
    if (solid(Math.floor(x), Math.floor(y))) return { x, y, hit: true };
    for (let s = 0; s < max / stepLen; s++) {
      x += dx * stepLen; y += dy * stepLen;
      if (x < 0 || x >= W.w || y < -200 || y >= W.h) return { x, y, hit: false };
      if (solid(Math.floor(x), Math.floor(y))) return { x, y, hit: true };
    }
    return { x, y, hit: false };
  }
  function setTargetsFromWords(list, need = 0.35) {
    W.targets = [null];
    for (const wd of list) {
      const id = W.targets.length;
      let cnt = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (const g of wd.ids) {
        const gr = W.groups[g];
        if (!gr) continue;
        for (let y = gr.y0; y <= gr.y1; y++) for (let x = gr.x0; x <= gr.x1; x++) {
          const i = y * W.w + x;
          if (gid[i] === g && mat[i] === SOLID) { tgt[i] = id; cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
      }
      if (cnt < 6) continue;
      W.targets.push({ id, label: wd.text, total: cnt, left: cnt, need, done: false, x0, y0, x1, y1 });
    }
    return W.targets.length - 1;
  }
  function setTargetsFromRects(list, need = 0.3) {
    W.targets = [null];
    for (const r of list) {
      const id = W.targets.length;
      let cnt = 0;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
        const i = y * W.w + x;
        if (mat[i] === SOLID && !tgt[i]) { tgt[i] = id; cnt++; }
      }
      if (cnt < 10) continue;
      W.targets.push({ id, label: r.label || 'target', total: cnt, left: cnt, need, done: false, x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1 });
    }
    return W.targets.length - 1;
  }
  function densityAround(x, y, r) {
    let n = 0, t = 0;
    for (let dy = -r; dy <= r; dy += 2) for (let dx = -r; dx <= r; dx += 2) { t++; if (frontAt(Math.floor(x + dx), Math.floor(y + dy))) n++; }
    return n / Math.max(1, t);
  }

  Object.assign(W, {
    buildDesk, finalize, reset, restoreArea, takeHi, markHi, markFx, markTile, paneColor, wallEdge, iceCol, counted, matDebris, wakeAbove, cellSrc, solid, hardAt, solidI, frontAt, carve, crumble, kill, detachGlyph, detachRegion, shatterGlass, shatterIce, freezeAt, updateIce, paintAt, corrode,
    ignite, igniteAt, igniteRing, updateBurn, placeRubble, updateSand, makeChunk, updateChunks, settle, grabDisk, grabRect, releaseChunk, eraseBack, nearestSolid,
    raycast, flush, touch, color, setTargetsFromWords, setTargetsFromRects, densityAround, letterRing, isSolidM, setCell, clearCell, refreshAll, addPropRegion, cellBox, forRect
  });
})();
