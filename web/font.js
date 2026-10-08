(() => {
  const WTP = window.WTP;
  const G = {
    A: '.###./#...#/#...#/#####/#...#/#...#/#...#',
    B: '####./#...#/#...#/####./#...#/#...#/####.',
    C: '.###./#...#/#..../#..../#..../#...#/.###.',
    D: '####./#...#/#...#/#...#/#...#/#...#/####.',
    E: '#####/#..../#..../####./#..../#..../#####',
    F: '#####/#..../#..../####./#..../#..../#....',
    G: '.###./#...#/#..../#.###/#...#/#...#/.####',
    H: '#...#/#...#/#...#/#####/#...#/#...#/#...#',
    I: '###/.#./.#./.#./.#./.#./###',
    J: '..###/...#./...#./...#./#..#./#..#./.##..',
    K: '#...#/#..#./#.#../##.../#.#../#..#./#...#',
    L: '#..../#..../#..../#..../#..../#..../#####',
    M: '#...#/##.##/#.#.#/#.#.#/#...#/#...#/#...#',
    N: '#...#/##..#/#.#.#/#..##/#...#/#...#/#...#',
    O: '.###./#...#/#...#/#...#/#...#/#...#/.###.',
    P: '####./#...#/#...#/####./#..../#..../#....',
    Q: '.###./#...#/#...#/#...#/#.#.#/#..#./.##.#',
    R: '####./#...#/#...#/####./#.#../#..#./#...#',
    S: '.####/#..../#..../.###./....#/....#/####.',
    T: '#####/..#../..#../..#../..#../..#../..#..',
    U: '#...#/#...#/#...#/#...#/#...#/#...#/.###.',
    V: '#...#/#...#/#...#/#...#/#...#/.#.#./..#..',
    W: '#...#/#...#/#...#/#.#.#/#.#.#/##.##/#...#',
    X: '#...#/#...#/.#.#./..#../.#.#./#...#/#...#',
    Y: '#...#/#...#/.#.#./..#../..#../..#../..#..',
    Z: '#####/....#/...#./..#../.#.../#..../#####',
    a: '...../...../.###./....#/.####/#...#/.####',
    b: '#..../#..../####./#...#/#...#/#...#/####.',
    c: '..../..../.###/#.../#.../#.../.###',
    d: '....#/....#/.####/#...#/#...#/#...#/.####',
    e: '...../...../.###./#...#/#####/#..../.###.',
    f: '..##/.#../####/.#../.#../.#../.#..',
    g: '...../...../.####/#...#/#...#/#...#/.####/....#/.###.',
    h: '#..../#..../####./#...#/#...#/#...#/#...#',
    i: '#/./#/#/#/#/#',
    j: '..#/.../..#/..#/..#/..#/..#/#.#/.#.',
    k: '#.../#.../#..#/#.#./##../#.#./#..#',
    l: '#./#./#./#./#./#./.#',
    m: '...../...../##.#./#.#.#/#.#.#/#.#.#/#.#.#',
    n: '...../...../####./#...#/#...#/#...#/#...#',
    o: '...../...../.###./#...#/#...#/#...#/.###.',
    p: '...../...../####./#...#/#...#/#...#/####./#..../#....',
    q: '...../...../.####/#...#/#...#/#...#/.####/....#/....#',
    r: '..../..../#.##/##../#.../#.../#...',
    s: '...../...../.####/#..../.###./....#/####.',
    t: '.#../.#../####/.#../.#../.#../..##',
    u: '...../...../#...#/#...#/#...#/#...#/.####',
    v: '...../...../#...#/#...#/#...#/.#.#./..#..',
    w: '...../...../#...#/#...#/#.#.#/#.#.#/.#.#.',
    x: '...../...../#...#/.#.#./..#../.#.#./#...#',
    y: '...../...../#...#/#...#/#...#/#...#/.####/....#/.###.',
    z: '...../...../#####/...#./..#../.#.../#####',
    0: '.###./#...#/#..##/#.#.#/##..#/#...#/.###.',
    1: '.#./##./.#./.#./.#./.#./###',
    2: '.###./#...#/....#/...#./..#../.#.../#####',
    3: '####./....#/....#/.###./....#/....#/####.',
    4: '...#./..##./.#.#./#..#./#####/...#./...#.',
    5: '#####/#..../####./....#/....#/#...#/.###.',
    6: '.###./#..../#..../####./#...#/#...#/.###.',
    7: '#####/....#/...#./..#../..#../..#../..#..',
    8: '.###./#...#/#...#/.###./#...#/#...#/.###.',
    9: '.###./#...#/#...#/.####/....#/....#/.###.',
    '!': '#/#/#/#/#/./#',
    '?': '.###./#...#/....#/...#./..#../...../..#..',
    '.': '././././././#',
    ',': '../../../../../../.#/#.',
    ':': './././#/././#',
    ';': '../../.#/../../../.#/#.',
    "'": '#/#/./././././.',
    '"': '#.#/#.#/.../.../.../.../...',
    '-': '..../..../..../####/..../..../....',
    '+': '...../..#../..#../#####/..#../..#../.....',
    '=': '..../..../####/..../####/..../....',
    '/': '....#/....#/...#./..#../.#.../#..../#....',
    '\\': '#..../#..../.#.../..#../...#./....#/....#',
    '(': '..#/.#./#../#../#../.#./..#',
    ')': '#../.#./..#/..#/..#/.#./#..',
    '[': '###/#../#../#../#../#../###',
    ']': '###/..#/..#/..#/..#/..#/###',
    '{': '.##/.#./.#./#../.#./.#./.##',
    '}': '##./.#./.#./..#/.#./.#./##.',
    '*': '...../#.#.#/.###./#####/.###./#.#.#/.....',
    '#': '.#.#./.#.#./#####/.#.#./#####/.#.#./.#.#.',
    '%': '##..#/##..#/...#./..#../.#.../#..##/#..##',
    '&': '.##../#..#./#.#../.#.../#.#.#/#..#./.##.#',
    '_': '...../...../...../...../...../...../#####',
    '<': '...#/..#./.#../#.../.#../..#./...#',
    '>': '#.../.#../..#./...#/..#./.#../#...',
    '@': '.###./#...#/#.###/#.#.#/#.##./#..../.###.',
    '$': '..#../.####/#.#../.###./..#.#/####./..#..',
    '^': '..#../.#.#./#...#/...../...../...../.....',
    '~': '...../...../.#.../#.#.#/...#./...../.....',
    '|': '#/#/#/#/#/#/#',
    '`': '#./.#/../../../../..',
    '·': './././#/./././.',
    '•': '.../.../###/###/###/.../...',
    '×': '...../#...#/.#.#./..#../.#.#./#...#/.....',
    '←': '...../..#../.#.../#####/.#.../..#../.....',
    '→': '...../..#../...#./#####/...#./..#../.....',
    '↑': '..#../.###./#.#.#/..#../..#../..#../.....',
    '↓': '..#../..#../..#../#.#.#/.###./..#../.....',
    '★': '...#.../...#.../..###../#######/.#####./.##.##./##...##',
    '☆': '...#.../..#.#../..#.#../##...##/.#...#./.#.#.#./##.#.##',
    '♥': '.##.##./#######/#######/.#####./..###../...#.../.......',
    '✓': '....#/...##/#..#./##.#./.##../..#../.....',
    '…': '...../...../...../...../...../...../#.#.#',
    '©': '.###./#...#/#.#.#/##..#/#.#.#/#...#/.###.',
    '°': '.#./#.#/.#./.../.../.../...',
    'é': '..#../.#.../.###./#...#/#####/#..../.###.',
    'è': '.#.../..#../.###./#...#/#####/#..../.###.',
    'à': '.#.../..#../.###./....#/.####/#...#/.####',
    'ü': '.#.#./...../#...#/#...#/#...#/#...#/.####',
    'ö': '.#.#./...../.###./#...#/#...#/#...#/.###.',
    '⚙': '..#../#####/##.##/#...#/##.##/#####/..#..',
    '½': '#..../#...#/#..#./..#../.#.##/#...#/...##'
  };
  const glyphs = new Map();
  for (const ch in G) {
    const rows = G[ch].split('/');
    const w = Math.max(...rows.map((r) => r.length));
    glyphs.set(ch, { w, rows: rows.map((r) => r.padEnd(w, '.')) });
  }
  glyphs.set(' ', { w: 3, rows: [] });
  glyphs.set(' ', { w: 3, rows: [] });

  const B = {
    A: '.#####./##...##/##...##/##...##/#######/##...##/##...##/##...##/##...##',
    B: '######./##...##/##...##/######./##...##/##...##/##...##/##...##/######.',
    C: '.#####./##...##/##...../##...../##...../##...../##...../##...##/.#####.',
    D: '######./##...##/##...##/##...##/##...##/##...##/##...##/##...##/######.',
    E: '#######/##...../##...../######./##...../##...../##...../##...../#######',
    F: '#######/##...../##...../######./##...../##...../##...../##...../##.....',
    G: '.#####./##...##/##...../##...../##.####/##...##/##...##/##...##/.######',
    H: '##...##/##...##/##...##/##...##/#######/##...##/##...##/##...##/##...##',
    I: '######/..##../..##../..##../..##../..##../..##../..##../######',
    J: '..#####/.....##/.....##/.....##/.....##/##...##/##...##/##...##/.#####.',
    K: '##...##/##..##./##.##../####.../###..../####.../##.##../##..##./##...##',
    L: '##...../##...../##...../##...../##...../##...../##...../##...../#######',
    M: '##.....##/###...###/####.####/##.###.##/##..#..##/##.....##/##.....##/##.....##/##.....##',
    N: '##...##/###..##/####.##/##.####/##..###/##...##/##...##/##...##/##...##',
    O: '.#####./##...##/##...##/##...##/##...##/##...##/##...##/##...##/.#####.',
    P: '######./##...##/##...##/##...##/######./##...../##...../##...../##.....',
    Q: '.#####./##...##/##...##/##...##/##...##/##...##/##.#.##/##..##./.###.##',
    R: '######./##...##/##...##/##...##/######./##.##../##..##./##...##/##...##',
    S: '.#####./##...##/##...../###..../.#####./....###/.....##/##...##/.#####.',
    T: '########/...##.../...##.../...##.../...##.../...##.../...##.../...##.../...##...',
    U: '##...##/##...##/##...##/##...##/##...##/##...##/##...##/##...##/.#####.',
    V: '##...##/##...##/##...##/##...##/##...##/##...##/.##.##./..###../...#...',
    W: '##.....##/##.....##/##.....##/##.....##/##..#..##/##.###.##/####.####/###...###/##.....##',
    X: '##...##/##...##/.##.##./..###../..###../.##.##./##...##/##...##/##...##',
    Y: '##....##/##....##/.##..##./..####../...##.../...##.../...##.../...##.../...##...',
    Z: '#######/.....##/....##./...##../..##.../.##..../##...../##...../#######',
    0: '.#####./##...##/##..###/##.####/####.##/###..##/##...##/##...##/.#####.',
    1: '..##../.###../####../..##../..##../..##../..##../..##../######',
    2: '.#####./##...##/.....##/....##./...##../..##.../.##..../##...../#######',
    3: '######./.....##/.....##/..####./.....##/.....##/.....##/##...##/.#####.',
    4: '....##./...###./..####./.##.##./##..##./#######/....##./....##./....##.',
    5: '#######/##...../##...../######./.....##/.....##/.....##/##...##/.#####.',
    6: '.#####./##...../##...../######./##...##/##...##/##...##/##...##/.#####.',
    7: '#######/.....##/....##./...##../..##.../..##.../..##.../..##.../..##...',
    8: '.#####./##...##/##...##/.#####./##...##/##...##/##...##/##...##/.#####.',
    9: '.#####./##...##/##...##/##...##/.######/.....##/.....##/.....##/.#####.',
    '!': '##/##/##/##/##/##/../##/##',
    '?': '.#####./##...##/.....##/....##./...##../...##../......./...##../...##..',
    '.': '../../../../../../../##/##',
    ',': '../../../../../../../##/.#',
    ':': '../##/##/../../../##/##/..',
    "'": '##/##/.#/../../../../../..',
    '-': '....../....../....../######/######/....../....../....../......',
    '+': '....../....../..##../..##../######/######/..##../..##../......',
    '/': '.....##/....##./....##./...##../..##.../..##.../.##..../.##..../##.....',
    '%': '##...##/##..##./....##./...##../..##.../.##..../##..##./.##..##/##...##',
    '★': '....#..../...###.../...###.../#########/.#######./..#####../..##.##../.##...##./##.....##'
  };
  const bigGlyphs = new Map();
  for (const ch in B) { const rows = B[ch].split('/'); const w = Math.max(...rows.map((r) => r.length)); bigGlyphs.set(ch, { w, rows: rows.map((r) => r.padEnd(w, '.')) }); }
  bigGlyphs.set(' ', { w: 4, rows: [] });
  const ASC = 8, DESC = 2, LINE = 10;
  const glyphOf = (ch) => glyphs.get(ch) || glyphs.get(ch.toUpperCase()) || (ch.charCodeAt(0) > 255 ? null : glyphs.get('?'));

  function layout(text, bold, isBig) {
    const out = [];
    let x = 0;
    for (const ch of String(text)) {
      const g = isBig ? (bigGlyphs.get(ch.toUpperCase()) || glyphOf(ch)) : glyphOf(ch);
      if (!g) { x += 4; continue; }
      out.push({ g, x });
      x += g.w + 1 + (bold ? 1 : 0);
    }
    return { items: out, w: Math.max(0, x - 1) };
  }
  const measure = (text, scale = 1, bold = false, isBig = false) => layout(text, bold, isBig).w * scale;

  const cache = new Map();
  function textCanvas(text, o = {}) {
    const key = `${text}|${o.color || ''}|${o.ramp ? o.ramp.join(',') : ''}|${o.outline || ''}|${o.shadow || ''}|${o.bold ? 1 : 0}|${o.depth || 0}|${o.big ? 1 : 0}|${o.depthColor || ''}`;
    let hit = cache.get(key);
    if (hit) return hit;
    const L = layout(text, o.bold, o.big);
    const pad = o.outline ? 1 : 0;
    const depth = o.depth || 0;
    const sh = o.shadow ? 1 : 0;
    const w = L.w + pad * 2 + sh + 2;
    const h = (o.big ? 11 : LINE) + pad * 2 + sh + depth;
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, w); cv.height = Math.max(1, h);
    const g = cv.getContext('2d', { willReadFrequently: true });
    const img = g.createImageData(cv.width, cv.height);
    const u = new Uint32Array(img.data.buffer);
    const mask = new Uint8Array(cv.width * cv.height);
    const top = o.big ? 1 : ASC - 7;
    for (const it of L.items) {
      const rows = it.g.rows;
      for (let ry = 0; ry < rows.length; ry++) {
        const row = rows[ry];
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] !== '#') continue;
          const px = it.x + rx + pad, py = top + ry + pad - 1;
          if (py < 0 || py >= cv.height) continue;
          mask[py * cv.width + px] = 1;
          if (o.bold && px + 1 < cv.width) mask[py * cv.width + px + 1] = 1;
        }
      }
    }
    const P = WTP.P32;
    const col = (hex) => (hex && hex[0] === '#' ? WTP.packHex(hex) : P[hex] ?? P['7']);
    const fill = col(o.color || '7');
    const ramp = o.ramp ? o.ramp.map(col) : null;
    const W = cv.width;
    if (depth) {
      const dc = col(o.depthColor || '1');
      for (let d = depth; d >= 1; d--) for (let i = 0; i < mask.length; i++) if (mask[i]) { const j = i + d * W; if (j < u.length && !mask[j]) u[j] = dc; }
    }
    if (sh) { const sc = col(o.shadow); for (let i = 0; i < mask.length; i++) if (mask[i]) { const j = i + W + 1; if (j < u.length && !mask[j]) u[j] = sc; } }
    if (o.outline) {
      const oc = col(o.outline);
      const om = new Uint8Array(mask.length);
      for (let y = 0; y < cv.height; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (mask[i]) continue;
        if ((x > 0 && mask[i - 1]) || (x < W - 1 && mask[i + 1]) || (y > 0 && mask[i - W]) || (y < cv.height - 1 && mask[i + W])) om[i] = 1;
      }
      for (let d = 0; d <= depth; d++) for (let i = 0; i < om.length; i++) if (om[i]) { const j = i + d * W; if (j < u.length && !mask[j]) u[j] = oc; }
    }
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;
      u[i] = ramp ? ramp[Math.max(0, Math.min(ramp.length - 1, y - pad - top + 1))] : fill;
    }
    g.putImageData(img, 0, 0);
    hit = { cv, w: cv.width, h: cv.height, tw: L.w };
    if (cache.size > 400) cache.clear();
    cache.set(key, hit);
    return hit;
  }
  function draw(ctx, text, x, y, o = {}) {
    const t = textCanvas(text, o);
    const s = o.scale || 1;
    let dx = x;
    if (o.align === 'center') dx = x - (t.w * s) / 2;
    else if (o.align === 'right') dx = x - t.w * s;
    const dy = o.valign === 'middle' ? y - (t.h * s) / 2 : y;
    ctx.drawImage(t.cv, Math.round(dx), Math.round(dy), t.w * s, t.h * s);
    return t;
  }

  function buildTTF(bold) {
    const U = 100, EM = 1000;
    const chars = [...glyphs.keys()].filter((c) => c.length === 1 && c.codePointAt(0) < 0xffff && c !== ' ').sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    const list = [{ name: '.notdef', rects: [[0, -0, 4, 7]], adv: 6 }];
    const charToGid = new Map();
    for (const ch of chars) {
      const g = glyphs.get(ch);
      const bits = g.rows.map((r) => {
        const a = [...r].map((c) => c === '#');
        if (bold) { const b = a.slice(); b.push(false); for (let i = 0; i < a.length; i++) if (a[i]) b[i + 1] = true; return b; }
        return a;
      });
      const rects = [];
      const used = bits.map((r) => r.map(() => false));
      for (let y = 0; y < bits.length; y++) {
        let x = 0;
        while (x < bits[y].length) {
          if (!bits[y][x] || used[y][x]) { x++; continue; }
          let x2 = x;
          while (x2 + 1 < bits[y].length && bits[y][x2 + 1] && !used[y][x2 + 1]) x2++;
          let y2 = y;
          const rowMatch = (yy) => { if (yy >= bits.length) return false; for (let k = x; k <= x2; k++) if (!bits[yy][k] || used[yy][k]) return false; if (x > 0 && bits[yy][x - 1] && !used[yy][x - 1]) return false; if (x2 + 1 < bits[yy].length && bits[yy][x2 + 1] && !used[yy][x2 + 1]) return false; return true; };
          while (rowMatch(y2 + 1)) y2++;
          for (let yy = y; yy <= y2; yy++) for (let k = x; k <= x2; k++) used[yy][k] = true;
          rects.push([x, y, x2 + 1, y2 + 1]);
          x = x2 + 1;
        }
      }
      charToGid.set(ch, list.length);
      list.push({ name: ch, rects, adv: g.w + 1 + (bold ? 1 : 0) });
    }
    const glyfParts = [];
    const loca = [0];
    let off = 0;
    let maxPts = 0, maxCont = 0, xMaxAll = 0, yMinAll = 0, yMaxAll = 0;
    const metrics = [];
    for (const gl of list) {
      if (gl.name === '.notdef') {
        const rects = [[0, 0, 4, 7]];
        gl.rects = rects;
      }
      if (!gl.rects.length) { loca.push(off); metrics.push([gl.adv * U, 0]); continue; }
      const pts = [];
      const ends = [];
      let xMin = 1e9, yMin = 1e9, xMax = -1e9, yMax = -1e9;
      for (const [x0, r0, x1, r1] of gl.rects) {
        const X0 = x0 * U, X1 = x1 * U, YT = (7 - r0) * U, YB = (7 - r1) * U;
        pts.push([X0, YB], [X0, YT], [X1, YT], [X1, YB]);
        ends.push(pts.length - 1);
        xMin = Math.min(xMin, X0); xMax = Math.max(xMax, X1); yMin = Math.min(yMin, YB); yMax = Math.max(yMax, YT);
      }
      maxPts = Math.max(maxPts, pts.length); maxCont = Math.max(maxCont, ends.length);
      xMaxAll = Math.max(xMaxAll, xMax); yMinAll = Math.min(yMinAll, yMin); yMaxAll = Math.max(yMaxAll, yMax);
      const size = 10 + ends.length * 2 + 2 + pts.length + pts.length * 4;
      const padSize = (size + 3) & ~3;
      const b = new DataView(new ArrayBuffer(padSize));
      let p = 0;
      b.setInt16(p, ends.length); p += 2;
      b.setInt16(p, xMin); p += 2; b.setInt16(p, yMin); p += 2; b.setInt16(p, xMax); p += 2; b.setInt16(p, yMax); p += 2;
      for (const e of ends) { b.setUint16(p, e); p += 2; }
      b.setUint16(p, 0); p += 2;
      for (let i = 0; i < pts.length; i++) b.setUint8(p++, 1);
      let px = 0;
      for (const [x] of pts) { b.setInt16(p, x - px); p += 2; px = x; }
      let py = 0;
      for (const [, y] of pts) { b.setInt16(p, y - py); p += 2; py = y; }
      glyfParts.push(new Uint8Array(b.buffer));
      off += padSize;
      loca.push(off);
      metrics.push([gl.adv * U, xMin]);
    }
    const glyf = new Uint8Array(off);
    { let p = 0; for (const part of glyfParts) { glyf.set(part, p); p += part.length; } }
    const numGlyphs = list.length;
    const tables = {};
    const mk = (n, fn) => { const dv = new DataView(new ArrayBuffer(n)); fn(dv); return new Uint8Array(dv.buffer); };
    const ascent = 8 * U, descent = 2 * U;
    tables.head = mk(54, (d) => {
      d.setUint16(0, 1); d.setUint16(2, 0); d.setUint32(4, 0x00010000); d.setUint32(8, 0); d.setUint32(12, 0x5f0f3cf5);
      d.setUint16(16, 0x000b); d.setUint16(18, EM);
      d.setInt16(36, 0); d.setInt16(38, yMinAll); d.setInt16(40, xMaxAll); d.setInt16(42, yMaxAll);
      d.setUint16(44, bold ? 1 : 0); d.setUint16(46, 8); d.setInt16(48, 2); d.setInt16(50, 1); d.setInt16(52, 0);
    });
    const advMax = Math.max(...metrics.map((m) => m[0]));
    tables.hhea = mk(36, (d) => {
      d.setUint16(0, 1); d.setUint16(2, 0); d.setInt16(4, ascent); d.setInt16(6, -descent); d.setInt16(8, 0);
      d.setUint16(10, advMax); d.setInt16(12, 0); d.setInt16(14, 0); d.setInt16(16, xMaxAll); d.setInt16(18, 1); d.setInt16(20, 0); d.setInt16(22, 0);
      d.setInt16(32, 0); d.setUint16(34, numGlyphs);
    });
    tables.maxp = mk(32, (d) => {
      d.setUint32(0, 0x00010000); d.setUint16(4, numGlyphs); d.setUint16(6, maxPts); d.setUint16(8, maxCont);
      d.setUint16(14, 2);
    });
    tables.hmtx = mk(numGlyphs * 4, (d) => { metrics.forEach((m, i) => { d.setUint16(i * 4, m[0]); d.setInt16(i * 4 + 2, m[1]); }); });
    tables.loca = mk(loca.length * 4, (d) => { loca.forEach((v, i) => d.setUint32(i * 4, v)); });
    tables.glyf = glyf;
    const codes = chars.map((c) => c.charCodeAt(0));
    const segs = [];
    for (const c of codes) {
      const gid = charToGid.get(String.fromCharCode(c));
      const last = segs[segs.length - 1];
      if (last && c === last.end + 1 && gid === last.gid0 + (c - last.start)) last.end = c;
      else segs.push({ start: c, end: c, gid0: gid });
    }
    segs.push({ start: 0xffff, end: 0xffff, gid0: 1 });
    const segX2 = segs.length * 2;
    let sr = 1, es = 0; while (sr * 2 <= segs.length) { sr *= 2; es++; } sr *= 2;
    const sub = mk(16 + segs.length * 8, (d) => {
      d.setUint16(0, 4); d.setUint16(2, 16 + segs.length * 8); d.setUint16(4, 0); d.setUint16(6, segX2);
      d.setUint16(8, sr); d.setUint16(10, es); d.setUint16(12, segX2 - sr);
      let p = 14;
      for (const s of segs) { d.setUint16(p, s.end); p += 2; }
      d.setUint16(p, 0); p += 2;
      for (const s of segs) { d.setUint16(p, s.start); p += 2; }
      for (const s of segs) { d.setUint16(p, s.start === 0xffff ? 1 : ((s.gid0 - s.start) & 0xffff)); p += 2; }
      for (let i = 0; i < segs.length; i++) { d.setUint16(p, 0); p += 2; }
    });
    tables.cmap = new Uint8Array(12 + sub.length);
    { const d = new DataView(tables.cmap.buffer); d.setUint16(0, 0); d.setUint16(2, 1); d.setUint16(4, 3); d.setUint16(6, 1); d.setUint32(8, 12); tables.cmap.set(sub, 12); }
    tables.post = mk(32, (d) => { d.setUint32(0, 0x00030000); d.setInt16(8, -100); d.setInt16(10, 100); });
    const fam = 'WreckPix';
    const sty = bold ? 'Bold' : 'Regular';
    const names = [[1, fam], [2, sty], [3, `${fam}-${sty}`], [4, `${fam} ${sty}`], [5, 'Version 1.0'], [6, `${fam}-${sty}`]];
    const strs = names.map(([, s]) => { const a = new Uint8Array(s.length * 2); for (let i = 0; i < s.length; i++) { a[i * 2] = 0; a[i * 2 + 1] = s.charCodeAt(i); } return a; });
    const nameLen = 6 + names.length * 12 + strs.reduce((a, s) => a + s.length, 0);
    tables.name = mk(nameLen, (d) => {
      d.setUint16(0, 0); d.setUint16(2, names.length); d.setUint16(4, 6 + names.length * 12);
      let so = 0;
      names.forEach(([id], i) => {
        const p = 6 + i * 12;
        d.setUint16(p, 3); d.setUint16(p + 2, 1); d.setUint16(p + 4, 0x409); d.setUint16(p + 6, id); d.setUint16(p + 8, strs[i].length); d.setUint16(p + 10, so);
        so += strs[i].length;
      });
      let p = 6 + names.length * 12;
      for (const s of strs) for (const byte of s) d.setUint8(p++, byte);
    });
    const avg = Math.round(metrics.reduce((a, m) => a + m[0], 0) / metrics.length);
    tables['OS/2'] = mk(96, (d) => {
      d.setUint16(0, 4); d.setInt16(2, avg); d.setUint16(4, bold ? 700 : 400); d.setUint16(6, 5); d.setUint16(8, 0);
      d.setInt16(10, 500); d.setInt16(12, 500); d.setInt16(14, 0); d.setInt16(16, 100); d.setInt16(18, 500); d.setInt16(20, 500); d.setInt16(22, 0); d.setInt16(24, 400);
      d.setInt16(26, 100); d.setInt16(28, 300);
      d.setUint32(42, 1);
      d.setUint8(58, 87); d.setUint8(59, 84); d.setUint8(60, 80); d.setUint8(61, 32);
      d.setUint16(62, bold ? 0x20 : 0x40);
      d.setUint16(64, codes[0]); d.setUint16(66, codes[codes.length - 1]);
      d.setInt16(68, ascent); d.setInt16(70, -descent); d.setInt16(72, 0);
      d.setUint16(74, ascent); d.setUint16(76, descent);
      d.setUint32(78, 1); d.setUint32(82, 0);
      d.setInt16(86, 500); d.setInt16(88, 700); d.setUint16(90, 0); d.setUint16(92, 32); d.setUint16(94, 1);
    });
    const tags = Object.keys(tables).sort();
    const nT = tags.length;
    let srch = 1, ent = 0; while (srch * 2 <= nT) { srch *= 2; ent++; }
    const headerLen = 12 + nT * 16;
    let total = headerLen;
    const offs = {};
    for (const t of tags) { offs[t] = total; total += (tables[t].length + 3) & ~3; }
    const font = new Uint8Array(total);
    const dv = new DataView(font.buffer);
    dv.setUint32(0, 0x00010000); dv.setUint16(4, nT); dv.setUint16(6, srch * 16); dv.setUint16(8, ent); dv.setUint16(10, nT * 16 - srch * 16);
    const csum = (arr) => { const pad = new Uint8Array((arr.length + 3) & ~3); pad.set(arr); const v = new DataView(pad.buffer); let s = 0; for (let i = 0; i < pad.length; i += 4) s = (s + v.getUint32(i)) >>> 0; return s; };
    tags.forEach((t, i) => {
      const p = 12 + i * 16;
      for (let k = 0; k < 4; k++) dv.setUint8(p + k, t.charCodeAt(k));
      dv.setUint32(p + 4, csum(tables[t])); dv.setUint32(p + 8, offs[t]); dv.setUint32(p + 12, tables[t].length);
      font.set(tables[t], offs[t]);
    });
    const whole = csum(font);
    dv.setUint32(offs.head + 8, (0xb1b0afba - whole) >>> 0);
    return font.buffer;
  }

  let ready = false;
  async function install() {
    if (!('FontFace' in window) || !document.fonts) return false;
    try {
      const reg = new FontFace('WreckPix', buildTTF(false), { weight: '400' });
      const bold = new FontFace('WreckPix', buildTTF(true), { weight: '700' });
      await Promise.all([reg.load(), bold.load()]);
      document.fonts.add(reg); document.fonts.add(bold);
      ready = true;
      document.documentElement.classList.add('wtp-font');
      return true;
    } catch (e) {
      return false;
    }
  }
  WTP.font = { draw, textCanvas, measure, install, glyphs, LINE, get ready() { return ready; } };
})();
