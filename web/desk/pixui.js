(() => {
  const WTP = window.WTP;
  const P = {};
  WTP.pixui = P;

  const rgb = (h) => { const m = /^#?([0-9a-f]{6})/i.exec(h || ''); const n = m ? parseInt(m[1], 16) : 0x808080; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
  const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  const dark = (c, k) => mix(c, [0, 0, 0], k);
  const light = (c, k) => mix(c, [255, 255, 255], k);

  const FRAME = [
    '..OOOOOOOO..',
    '.OLLLLLLLLO.',
    'OLLHHHHHHLLO',
    'OLHFFFFFFSLO',
    'OLHFFFFFFSLO',
    'OLHFFFFFFSLO',
    'OLHFFFFFFSLO',
    'OLHFFFFFFSLO',
    'OLHFFFFFFSLO',
    'OLLSSSSSSLLO',
    '.OLLLLLLLLO.',
    '..OOOOOOOO..'
  ];
  function paint(rows, cols, scale = 1) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w * scale; c.height = h * scale;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = rows[y][x], v = cols[k];
      if (!v) continue;
      g.fillStyle = v.length === 4 ? `rgba(${v[0]},${v[1]},${v[2]},${v[3]})` : `rgb(${v[0]},${v[1]},${v[2]})`;
      g.fillRect(x * scale, y * scale, scale, scale);
    }
    return c.toDataURL('image/png');
  }
  const frame = (o) => paint(FRAME, { O: o.O, L: o.L, H: o.H, S: o.S, F: o.F });

  const ICONS = {
    heart: ['.RR.RR.', 'RWRRRRR', 'RRRRRRR', 'RRRRRRD', '.RRRRD.', '..RRD..', '...D...'],
    heartOff: ['.GG.GG.', 'GGGGGGG', 'GGGGGGG', 'GGGGGGG', '.GGGGG.', '..GGG..', '...G...'],
    shard: ['..W..', '.WCC.', 'WCCCB', 'CCCBB', '.CCB.', '.CB..', '..B..'],
    lock: ['.YYY.', 'Y...Y', 'Y...Y', 'YYYYY', 'YYDYY', 'YYDYY', 'YYYYY'],
    trophy: ['YYYYYYYY', 'YWYYYYDY', '.YYYYYD.', '..YYYD..', '...YD...', '...YD...', '..YYYD..', '.YYYYYD.'],
    gpx: ['YYY', 'YWY', 'YYY'],
    star: ['...Y...', '..YYY..', 'YYYYYYY', '.YYYYY.', '..YYY..', '.YY.YY.', 'Y.....Y'],
    gear: ['..G.G..', '.GGGGG.', 'GGG.GGG', 'GG...GG', 'GGG.GGG', '.GGGGG.', '..G.G..'],
    arrow: ['A....', 'AA...', 'AAA..', 'AAAA.', 'AAA..', 'AA...', 'A....'],
    skull: ['.WWWWW.', 'WWWWWWW', 'W..W..W', 'WWWWWWW', '.WW.WW.', '.W.W.W.'],
    check: ['......G', '.....GG', 'G...GG.', 'GG.GG..', '.GGG...', '..G....']
  };
  P.icons = {};
  const CRATE = [
    '..................',
    '.OOOOOOOOOOOOOOOO.',
    '.OHHHHHHHHHHHHHHO.',
    '.OLLLLLLLLLLLLLLO.',
    '.OOOOOOOOOOOOOOOO.',
    '..OFFFFFFOOFFFFFO.',
    '..OFHFFFOKKOFFHFO.',
    '..OFFFFFOKKOFFFFO.',
    '..OFFFFFFOOFFFFFO.',
    '..ODDDDDDDDDDDDDO.',
    '..OFFFFFFFFFFFFFO.',
    '..OFFHFFFFFFFHFFO.',
    '..OSSSSSSSSSSSSSO.',
    '..OOOOOOOOOOOOOOO.',
    '..................'
  ];
  const crates = new Map();
  P.crate = (col) => {
    if (crates.has(col)) return crates.get(col);
    const c = rgb(col), ink = [10, 11, 14];
    const url = paint(CRATE, { O: ink, F: c, H: light(c, 0.35), L: light(c, 0.15), D: dark(c, 0.3), S: dark(c, 0.45), K: light(c, 0.7) });
    crates.set(col, url);
    return url;
  };

  P.apply = (th = {}) => {
    const bg = rgb(th.background || '#121213'), bg2 = rgb(th.dark_background || '#0b0b0c'), fg = rgb(th.foreground || '#cccccc');
    const acc = rgb(th.accent || '#d8d8d8'), warn = rgb(th.yellow || '#e0b050'), red = rgb(th.red || '#e05050'), good = rgb(th.green || '#6fcf8a'), cyan = rgb(th.cyan || '#6fe3ff');
    const isDark = lum(bg) < 0.5;
    const ink = isDark ? dark(bg2, 0.6) : dark(bg, 0.75);
    const A = (c, a) => [...c, a];
    const base = { O: ink, L: mix(bg, fg, 0.3), H: mix(bg, fg, 0.12), S: dark(bg, 0.35), F: bg };
    const hiOf = (c) => ({ O: ink, L: c, H: mix(bg, c, 0.3), S: dark(bg, 0.35), F: mix(bg, c, 0.1) });
    const accText = lum(acc) > 0.55 ? dark(bg2, 0.5) : light(acc, 0.92);
    const frames = {
      panel: frame(base),
      panel2: frame({ ...base, F: bg2 }),
      hi: frame(hiOf(acc)),
      warn: frame(hiOf(warn)),
      bad: frame({ O: ink, L: red, H: mix(red, [255, 255, 255], 0.25), S: dark(red, 0.5), F: dark(red, 0.78) }),
      good: frame(hiOf(good)),
      btn: frame({ O: ink, L: mix(bg, fg, 0.32), H: mix(bg, fg, 0.2), S: dark(bg, 0.4), F: mix(bg, fg, 0.07) }),
      btnHi: frame({ O: ink, L: acc, H: mix(bg, acc, 0.35), S: dark(bg, 0.4), F: mix(bg, acc, 0.14) }),
      btnPri: frame({ O: ink, L: light(acc, 0.25), H: light(acc, 0.35), S: dark(acc, 0.3), F: acc }),
      btnBad: frame({ O: ink, L: red, H: mix(bg, red, 0.35), S: dark(bg, 0.4), F: mix(bg, red, 0.14) }),
      inset: frame({ O: ink, L: mix(bg, fg, 0.22), H: dark(bg2, 0.4), S: mix(bg, fg, 0.14), F: A(bg2, 0.82) }),
      insetHi: frame({ O: ink, L: acc, H: dark(bg2, 0.3), S: mix(bg, acc, 0.3), F: A(mix(bg2, acc, 0.16), 0.9) }),
      insetWarn: frame({ O: ink, L: warn, H: dark(bg2, 0.3), S: mix(bg, warn, 0.3), F: A(mix(bg2, warn, 0.16), 0.9) })
    };
    const icols = { R: red, W: [255, 255, 255], D: dark(red, 0.45), G: mix(bg, fg, 0.3), C: cyan, B: dark(cyan, 0.45), Y: warn, A: acc };
    const iconsOf = {};
    for (const [k, rows] of Object.entries(ICONS)) {
      const cols = { ...icols };
      if (k === 'shard') cols.W = light(cyan, 0.7);
      if (k === 'gpx') { cols.Y = [244, 197, 66]; cols.W = [255, 251, 224]; }
      if (k === 'trophy') { cols.W = light(warn, 0.6); cols.D = dark(warn, 0.35); }
      if (k === 'lock') cols.D = ink;
      if (k === 'check') cols.G = good;
      iconsOf[k] = paint(rows, cols);
    }
    P.icons = iconsOf;
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(frames)) root.setProperty(`--f-${k}`, `url("${v}")`);
    for (const [k, v] of Object.entries(iconsOf)) root.setProperty(`--i-${k}`, `url("${v}")`);
    root.setProperty('--ink', `rgb(${ink.join(',')})`);
    root.setProperty('--acc-text', `rgb(${accText.join(',')})`);
    root.setProperty('--good', `rgb(${good.join(',')})`);
    root.setProperty('--shard', `rgb(${cyan.join(',')})`);
  };
  P.apply({});
})();
