(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand, pick, shade, mix } = WTP;
  const SP = WTP.sprites;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player;
  const A = (n, x) => WTP.audio.play(n, x);
  const list = [], bullets = [], pickups = [];

  const ADS = [
    ['YOU WON!', 'y', 'e', '0', 'gift', 'CLAIM', 'l'], ['HOT DEALS', 'o', 'R', '7', 'fire', 'SHOP', 'y'], ['1 WEIRD TRICK', '7', 'b', '0', 'star', 'LEARN', 'e'],
    ['FREE TABLET', 'C', 'b', '0', 'gift', 'GET IT', 'l'], ['DOWNLOAD RAM', 'l', 'G', '0', 'ram', 'INSTALL', 'y'], ['VIRUS FOUND!', 'e', 'r', '7', 'warn', 'FIX NOW', 'y'],
    ['MEET CATS', 'K', 'k', '0', 'cat', 'MEOW', 'P'], ['CHEAP FLIGHTS', 'c', 'n', '7', 'plane', 'BOOK', 'y'], ['LUXURY WATCH', '1', 'a', 'y', 'watch', 'BUY', 'a'],
    ['CAR LOAN 0%', '6', 'e', '0', 'car', 'APPLY', 'e'], ['HAIR FOREVER', 'u', 'w', '7', 'star', 'ORDER', 'l'], ['BITCOIN?', 'a', 'o', '0', 'money', 'INVEST', 'l'],
    ['PLAY NOW', 'p', 'P', 'y', 'sword', 'PLAY', 'e'], ['SINGLE PIXELS', 'm', 'p', '7', 'heart', 'CHAT', 'k'], ['SALE 90% OFF', 'e', 'y', '7', 'money', 'SAVE', 'y'], ['BIG PRIZE', 'L', 'l', '0', 'gift', 'SPIN', 'e']
  ];
  const ICON = {
    gift: ['.e.e.', 'eeeee', 'yyeyy', 'yyeyy', 'yyeyy'], fire: ['..o..', '.oyo.', 'oyYyo', 'oyYyo', '.ooo.'], star: ['..y..', 'yyyyy', '.yyy.', 'y...y', '.....'],
    ram: ['lllll', 'l7l7l', 'lllll', 'y.y.y', '.....'], warn: ['..y..', '.y0y.', '.y0y.', 'yyyyy', 'yy0yy'], cat: ['a...a', 'aaaaa', 'a0a0a', 'aakaa', '.aaa.'],
    plane: ['..7..', '.777.', '77777', '..7..', '.777.'], watch: ['.aaa.', 'a777a', 'a707a', 'a777a', '.aaa.'], car: ['.eee.', 'e77ee', 'eeeee', '0...0', '.....'],
    money: ['.lll.', 'l.l..', '.lll.', '..l.l', '.lll.'], sword: ['....7', '...7.', 'u.7..', '.u...', 'u.u..'], heart: ['ee.ee', 'eeeee', 'eeeee', '.eee.', '..e..']
  };
  const T = {
    ad: { name: 'Pop-up Ad', hp: 42, w: 26, h: 18, score: 150, fly: true, desc: 'Floats after you and spits homing coins. Comes in sixteen flavours of lie.' },
    captcha: { name: 'Captcha', hp: 30, w: 14, h: 14, score: 120, desc: 'Hops around and throws check marks. Prove you are not a robot by deleting it.' },
    cookie: { name: 'Cookie Banner', hp: 85, w: 46, h: 12, score: 220, fly: true, desc: 'Slides along the top of the screen bombing you with cookies.' },
    cursor: { name: 'Cursor Drone', hp: 11, w: 7, h: 11, score: 60, fly: true, desc: 'Comes in swarms and dive-clicks at you.' },
    chat: { name: 'Chat Bot', hp: 50, w: 16, h: 13, score: 180, fly: true, desc: 'Hi! Need help? Fires bursts of message bubbles.' },
    bell: { name: 'Notification Bell', hp: 34, w: 12, h: 12, score: 140, fly: true, desc: 'Rings and releases homing red badges.' },
    spinner: { name: 'Loading Spinner', hp: 60, w: 13, h: 13, score: 200, desc: 'Rolls at you. Shielded while spinning fast, so stop it first.' },
    video: { name: 'Autoplay Video', hp: 70, w: 24, h: 16, score: 240, fly: true, desc: 'Charges across the screen at full volume, blasting sound rings.' },
    ghost: { name: '404 Ghost', hp: 45, w: 14, h: 16, score: 210, fly: true, ghost: true, desc: 'Floats through walls. Only solid, and hittable, when it fades in.' },
    tracker: { name: 'Pixel Tracker', hp: 40, w: 10, h: 10, score: 230, burrow: true, desc: 'Burrows through the page and pops out to fire a tracking beam. Explosions reach it underground.' },
    paywall: { name: 'Paywall', hp: 180, w: 18, h: 26, score: 320, shield: true, desc: 'A walking wall. Shots from the front bounce off. Hit it from behind or above.' },
    spam: { name: 'Spam', hp: 36, w: 13, h: 10, score: 90, split: true, desc: 'Splits into smaller spam when popped. Twice.' },
    update: { name: 'Update Popup', hp: 55, w: 18, h: 13, score: 260, fly: true, healer: true, desc: 'Patches nearby enemies back to health and shields them. Pop it first.' },
    crawler: { name: 'Web Crawler', hp: 38, w: 13, h: 8, score: 170, crawl: true, desc: 'A spider that walks on walls and ceilings and drops on your head.' },
    virus: { name: 'Trojan', hp: 48, w: 12, h: 12, score: 250, fly: true, desc: 'Teleports around corrupting the page. Explodes into glitches.' },
    survey: { name: 'Survey Popup', hp: 46, w: 22, h: 16, score: 200, fly: true, desc: 'How was your wrecking today? Fans out bouncing stars. Rate it zero.' },
    progress: { name: 'Loading Bar', hp: 64, w: 28, h: 9, score: 260, fly: true, desc: 'Fills up while you watch. At 100% it unloads a beam. Break it before it finishes.' },
    scroll: { name: 'Infinite Scroll', hp: 90, w: 9, h: 9, score: 300, burrow: true, desc: 'A feed that never ends. Its head tunnels through the page with its posts in tow. Hit the head.' },
    clip: { name: 'Paperclip Helper', hp: 52, w: 14, h: 18, score: 240, fly: true, desc: 'It looks like you are wrecking a page! Throws spinning paperclips and tips nobody asked for.' },
    notif: { name: 'Badge', hp: 6, w: 5, h: 5, score: 20, fly: true, tiny: true, desc: '' },
    modal: { name: 'The Newsletter', hp: 1100, w: 54, h: 30, score: 2500, fly: true, boss: true, desc: 'Boss. Fills the sky with mail and summons cursor drones. Do you want to subscribe?' },
    algo: { name: 'The Algorithm', hp: 1500, w: 36, h: 36, score: 3500, fly: true, boss: true, desc: 'Boss. A giant eye that sweeps lasers and recommends you more enemies.' }
  };
  const ORDER = ['ad', 'captcha', 'cookie', 'cursor', 'chat', 'bell', 'spinner', 'video', 'ghost', 'tracker', 'paywall', 'spam', 'update', 'crawler', 'virus', 'survey', 'progress', 'scroll', 'clip', 'modal', 'algo'];
  const SURVEYS = [['RATE US', 'y'], ['HOW DID WE DO?', 'c'], ['ENJOYING IT?', 'l'], ['1 TO 10?', 'k'], ['QUICK SURVEY', 'o']];
  const TIPS = ['WRECKING? I CAN HELP', 'TRY CTRL+Z', 'NEED A HAND?', 'SAVE YOUR WORK!', 'DID YOU MEAN: STOP?'];

  function grid(w, h) { return { w, h, px: new Uint32Array(w * h) }; }
  const C = (k) => (typeof k === 'number' ? k : P32[k]);
  function set(g, x, y, c) { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.px[y * g.w + x] = C(c); }
  function rect(g, x, y, w, h, c) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) set(g, xx, yy, c); }
  function rows(g, r, x, y, map) { r.forEach((row, ry) => [...row].forEach((ch, rx) => { if (ch !== '.') set(g, x + rx, y + ry, map && map[ch] ? map[ch] : ch); })); }
  const textCache = new Map();
  function text(g, str, x, y, c, center) {
    let t = textCache.get(str);
    if (!t) { const tc = WTP.font.textCanvas(str, { color: '7', outline: null }); const d = tc.cv.getContext('2d').getImageData(0, 0, tc.w, tc.h).data; t = { w: tc.w, h: tc.h, on: [] }; for (let i = 0; i < tc.w * tc.h; i++) if (d[i * 4 + 3] > 100) t.on.push(i); textCache.set(str, t); }
    const ox = center ? Math.round(x - t.w / 2) : x;
    for (const i of t.on) set(g, ox + (i % t.w), y + ((i / t.w) | 0), c);
    return t.w;
  }
  const textW = (str) => { text(grid(1, 1), str, 0, 0, '0'); return textCache.get(str).w; };
  function finish(g) {
    const o = SP.outline(g);
    const cv = SP.toCanvas(o);
    return { cv, w: o.w, h: o.h, g: o, white: null, ice: null };
  }
  const sprCache = new Map();
  function sprite(type, v, f) {
    const key = `${type}|${v}|${f}`;
    let s = sprCache.get(key);
    if (s) return s;
    s = finish(PAINT[type](v, f));
    sprCache.set(key, s);
    return s;
  }
  const whiteOf = (s) => s.white || (s.white = SP.toCanvas(SP.tint(s.g, P32['7'])));
  const iceOf = (s) => s.ice || (s.ice = SP.toCanvas({ w: s.g.w, h: s.g.h, px: s.g.px.map((c) => (c ? (c === P32['0'] ? c : mix(c, P32.C, 0.6)) : 0)) }));

  const PAINT = {
    ad(v, f) {
      const [title, bg, bar, tc, ic, cta, cc] = ADS[v % ADS.length];
      const tw = Math.max(textW(title) + 6, 30);
      const w = tw, h = 22;
      const g = grid(w, h);
      rect(g, 0, 0, w, h, bg);
      rect(g, 0, 0, w, 5, bar);
      rect(g, 0, 5, w, 1, shade(C(bar), 0.6));
      set(g, w - 4, 1, '7'); set(g, w - 2, 1, '7'); set(g, w - 3, 2, '7'); set(g, w - 4, 3, '7'); set(g, w - 2, 3, '7');
      rect(g, 2, 2, 3, 1, shade(C(bar), 1.4, 30));
      text(g, title, w / 2, 7, tc, true);
      rows(g, ICON[ic], 3, 14);
      const cw = textW(cta) + 4, cx = w - cw - 2;
      rect(g, cx, 14, cw, 7, f & 1 ? shade(C(cc), 1.2, 20) : cc);
      rect(g, cx, 20, cw, 1, shade(C(cc), 0.6));
      text(g, cta, cx + cw / 2, 15, '0', true);
      if (f & 1) { set(g, 9, 15, '7'); set(g, 10, 17, 'y'); }
      return g;
    },
    captcha(v, f) {
      const g = grid(14, 15);
      const sq = f === 1 ? 1 : 0;
      rect(g, 0, sq, 14, 13 - sq, '6'); rect(g, 1, 1 + sq, 12, 11 - sq, '7');
      if (v === 0) { rect(g, 2, 3 + sq, 5, 5, '5'); rect(g, 3, 4 + sq, 3, 3, '7'); if (f === 2) { set(g, 3, 5 + sq, 'l'); set(g, 4, 6 + sq, 'l'); set(g, 5, 5 + sq, 'l'); set(g, 6, 4 + sq, 'l'); } rect(g, 8, 4 + sq, 4, 1, '4'); rect(g, 8, 6 + sq, 3, 1, '4'); rect(g, 8, 9 + sq, 4, 2, 'c'); }
      else if (v === 1) { for (let k = 0; k < 9; k++) { const x = 2 + (k % 3) * 3, y = 2 + sq + ((k / 3) | 0) * 3; rect(g, x, y, 2, 2, k === 4 || k === 2 ? 'e' : k === 6 ? 'y' : 'l'); } rect(g, 11, 3 + sq, 1, 7, 'c'); }
      else { const s = 'xK7'; text(g, s, 7, 3 + sq, f & 1 ? 'P' : 'b', true); rect(g, 2, 9 + sq, 10, 1, '4'); set(g, 4, 10 + sq, '4'); set(g, 9, 8 + sq, '4'); }
      set(g, 3, 13, '3'); set(g, 4, 13, '3'); set(g, 9, 13, '3'); set(g, 10, 13, '3');
      if (f === 2) { set(g, 2, 14, '3'); set(g, 11, 14, '3'); }
      return g;
    },
    cookie(v, f) {
      const msgs = ['WE VALUE YOUR PRIVACY', 'ACCEPT ALL COOKIES?', 'COOKIES HELP US', 'WE USE TRACKERS'];
      const m = msgs[v % msgs.length];
      const w = Math.max(48, textW(m) + 14), h = 13;
      const g = grid(w, h);
      rect(g, 0, 0, w, h, '7'); rect(g, 0, h - 1, w, 1, '5'); rect(g, 0, 0, w, 1, '6');
      rows(g, ['.ww.', 'wuWu', 'uWuu', '.uu.'], 2, 2);
      if (f & 1) set(g, 3, 3, 'a');
      text(g, m, 8, 2, '2');
      rect(g, w - 26, 7, 12, 5, 'c'); text(g, 'OK', w - 20, 7, '7', true);
      rect(g, w - 12, 7, 10, 5, '5'); text(g, 'NO', w - 7, 7, '2', true);
      return g;
    },
    cursor(v, f) {
      const g = grid(9, 12);
      if (v === 0) rows(g, ['7......', '77.....', '767....', '7667...', '76667..', '766667.', '7666777', '767.67.', '77..67.', '7....67', '.....7.'], 0, 0);
      else if (v === 1) rows(g, ['...7....', '..767...', '..767...', '..7677..', '7.766777', '77766767', '76666667', '.7666667', '..766667', '...7777.'], 0, 1);
      else if (v === 2) rows(g, ['7777777', '.76667.', '.7yyy7.', '..7y7..', '..7y7..', '.7yyy7.', '.76667.', '7777777'], 1, 2);
      else rows(g, ['77.77', '..7..', '..7..', '..7..', '..7..', '..7..', '..7..', '77.77'], 2, 2);
      if (f & 1) set(g, 8, 11, 'c');
      return g;
    },
    chat(v, f) {
      const cols = ['c', 'l', 'k', 'P'];
      const c = cols[v % 4];
      const g = grid(17, 15);
      rect(g, 1, 0, 15, 11, c); rect(g, 0, 1, 17, 9, c); rect(g, 2, 1, 13, 1, shade(C(c), 1.3, 20));
      rect(g, 3, 11, 3, 2, c); set(g, 2, 13, c);
      const blink = f === 2;
      rect(g, 4, 3, 3, blink ? 1 : 3, '7'); rect(g, 10, 3, 3, blink ? 1 : 3, '7');
      if (!blink) { set(g, 5, 4, '0'); set(g, 11, 4, '0'); }
      if (f === 1) { set(g, 5, 8, '7'); set(g, 8, 8, '7'); set(g, 11, 8, '7'); } else rect(g, 6, 7, 5, 2, '0');
      set(g, 15, 0, 'e'); set(g, 16, 1, 'e'); set(g, 15, 1, 'e');
      return g;
    },
    bell(v, f) {
      const g = grid(14, 14);
      const sw = f === 1 ? -1 : f === 2 ? 1 : 0;
      rows(g, ['....yy....', '...yYYy...', '..yYYYYy..', '..yYyyYy..', '.yYyyyyYy.', '.yYyyyyYy.', 'yYyyyyyyYy', 'aaaaaaaaaa', '....aa....'], 2 + sw, 2);
      rect(g, 9, 0, 5, 5, 'e'); text(g, String((v % 9) + 1), 11, 0, '7', true);
      return g;
    },
    spinner(v, f) {
      const g = grid(13, 13);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + f * (Math.PI / 4);
        const x = 6 + Math.cos(a) * 4.6, y = 6 + Math.sin(a) * 4.6;
        const c = k === 0 ? '7' : k < 3 ? 'C' : k < 5 ? 'c' : 'b';
        rect(g, Math.round(x) - 1, Math.round(y) - 1, 2, 2, v === 1 ? (k < 3 ? 'Y' : k < 5 ? 'y' : 'a') : c);
      }
      rect(g, 5, 5, 3, 3, '1'); set(g, 5, 5, 'e'); set(g, 7, 5, 'e');
      return g;
    },
    video(v, f) {
      const g = grid(26, 18);
      rect(g, 0, 0, 26, 16, '0'); rect(g, 1, 1, 24, 12, v & 1 ? 'n' : '1');
      const ph = f;
      if (v % 3 === 0) { rows(g, ['a.a.', 'aaaa', 'a0a0', 'aaaa', '.aa.'], 4 + ph * 2, 6); }
      else if (v % 3 === 1) { for (let k = 0; k < 20; k++) set(g, 2 + ((k * 7 + ph * 5) % 22), 2 + ((k * 3 + ph) % 10), '7'); }
      else { rect(g, 9, 4, 8, 6, 'e'); rows(g, ['7..', '77.', '777', '77.', '7..'], 12, 4); }
      rect(g, 1, 13, 24, 2, '2'); rect(g, 1, 13, 4 + ph * 5, 1, 'e');
      set(g, 22, 3, f & 1 ? 'e' : '1'); text(g, 'LIVE', 6, 2, f & 1 ? 'e' : '1', true);
      rect(g, 6, 16, 2, 2, '3'); rect(g, 18, 16, 2, 2, '3');
      return g;
    },
    ghost(v, f) {
      const g = grid(15, 17);
      const wav = f & 1;
      rows(g, ['....77777....', '..777777777..', '.77777777777.', '.77000700077.', '7770007000777', '7777777777777', '7777700077777', '7777700077777', '7777777777777', '7777777777777', '777777777777' + (wav ? '7' : '.'), wav ? '7.777.777.77.' : '77.777.777.77', wav ? '..7...7...7..' : '.7...7...7...'], 1, 1, { 7: v ? 'C' : '6', 0: '2' });
      text(g, '404', 7, 10, v ? 'c' : '4', true);
      return g;
    },
    tracker(v, f) {
      const g = grid(11, 11);
      rows(g, ['..eeeee..', '.eRRRRRe.', 'eRR777RRe', 'eR77077Re', 'eR70007Re', 'eR77077Re', 'eRR777RRe', '.eRRRRRe.', '..eeeee..'], 1, 1);
      if (f === 1) rect(g, 3, 4, 5, 1, 'R');
      return g;
    },
    paywall(v, f) {
      const g = grid(20, 28);
      rect(g, 1, 0, 18, 24, '3'); rect(g, 2, 1, 16, 22, v ? 'b' : 'R');
      for (let y = 3; y < 22; y += 4) rect(g, 2, y, 16, 1, shade(C(v ? 'b' : 'R'), 0.7));
      text(g, 'PAY', 10, 4, 'y', true); text(g, 'WALL', 10, 11, '7', true);
      rect(g, 6, 17, 8, 4, 'y'); rect(g, 7, 15, 6, 2, 'y'); rect(g, 8, 16, 4, 1, '0'); set(g, 10, 18, '0'); set(g, 10, 19, '0');
      const lg = f & 1;
      rect(g, 4, 24, 3, 3 + lg, '2'); rect(g, 13, 24, 3, 4 - lg, '2');
      return g;
    },
    spam(v, f) {
      const s = v >= 2 ? 0.6 : v === 1 ? 0.8 : 1;
      const w = Math.round(13 * s), h = Math.round(10 * s);
      const g = grid(w + 1, h + 2);
      rect(g, 0, 0, w, h, 'Y'); rect(g, 0, 0, w, 1, 'a');
      for (let x = 0; x < w; x++) { const y = Math.round(Math.abs(x - (w - 1) / 2) * (h * 0.5 / w) * 2); set(g, x, Math.min(h - 1, (h * 0.55 | 0) - y + 1), 'o'); }
      if (s > 0.7) { text(g, 'SPAM', w / 2, h - 5, 'e', true); }
      if (f & 1) { set(g, w, 1, 'e'); set(g, w, 2, 'e'); }
      set(g, 1, h, '3'); set(g, w - 2, h + (f & 1), '3');
      return g;
    },
    update(v, f) {
      const g = grid(20, 15);
      rect(g, 0, 0, 20, 13, '7'); rect(g, 0, 0, 20, 4, 'c'); text(g, 'UPDATE', 10, 0, '7', true);
      rect(g, 2, 6, 16, 3, '5'); rect(g, 2, 6, 3 + ((f * 4) % 14), 3, 'l');
      rows(g, ['.l.', 'lll', '.l.'], 8, 9);
      set(g, 3, 12, '4'); set(g, 16, 12, '4');
      if (f & 1) { set(g, 19, 0, 'l'); set(g, 18, 1, 'l'); }
      return g;
    },
    crawler(v, f) {
      const g = grid(15, 10);
      rect(g, 4, 2, 7, 5, v ? 'p' : '1'); rect(g, 5, 1, 5, 1, v ? 'p' : '1');
      set(g, 6, 3, 'e'); set(g, 8, 3, 'e'); set(g, 7, 4, 'e');
      rect(g, 5, 6, 5, 1, v ? 'P' : '2');
      const L = f & 1;
      for (let k = 0; k < 4; k++) { const lx = 4 - k + (k & 1 ? L : -L); set(g, lx, 3 + (k >> 1) * 2, '3'); set(g, lx - 1, 4 + (k >> 1) * 2 + L, '3'); const rx = 10 + k - (k & 1 ? L : -L); set(g, rx, 3 + (k >> 1) * 2, '3'); set(g, rx + 1, 4 + (k >> 1) * 2 + L, '3'); }
      text(g, 'www', 7, 0, v ? 'm' : 'c', true);
      return g;
    },
    virus(v, f) {
      const g = grid(13, 13);
      const c = f & 1 ? 'l' : 'G';
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + (f & 1) * 0.3; rect(g, Math.round(6 + Math.cos(a) * 5.5) - (k & 1 ? 0 : 0), Math.round(6 + Math.sin(a) * 5.5), 1, 1, 'L'); }
      for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y < 18) set(g, 6 + x, 6 + y, x * x + y * y < 6 ? 'g' : c);
      set(g, 4, 5, '7'); set(g, 8, 5, '7'); set(g, 4, 6, '0'); set(g, 8, 6, '0'); rect(g, 5, 8, 3, 1, '0');
      return g;
    },
    survey(v, f) {
      const [q, c] = SURVEYS[v % SURVEYS.length];
      const w = Math.max(26, textW(q) + 6), g = grid(w, 18);
      rect(g, 0, 0, w, 17, '7'); rect(g, 0, 0, w, 6, c); rect(g, 0, 6, w, 1, shade(C(c), 0.6));
      text(g, q, w / 2, 0, '0', true);
      for (let k = 0; k < 5; k++) { const lit = k < ((f + v) % 6); rows(g, ['..y..', 'yyyyy', '.yyy.', 'y...y'], 2 + k * Math.floor((w - 6) / 5), 9, lit ? null : { y: '5' }); }
      set(g, 3, 17, '4'); set(g, w - 4, 17, '4');
      return g;
    },
    progress(v, f) {
      const cols = ['l', 'c', 'k', 'y'];
      const g = grid(30, 11);
      rect(g, 0, 0, 30, 9, '1'); rect(g, 1, 1, 28, 7, '2');
      const fill = Math.round(((f % 8) / 7) * 26);
      rect(g, 2, 2, fill, 5, cols[v % 4]); rect(g, 2, 2, fill, 1, shade(C(cols[v % 4]), 1.3, 20));
      for (let x = 2; x < 2 + fill; x += 4) set(g, x, 5, shade(C(cols[v % 4]), 0.75));
      text(g, `${Math.round(((f % 8) / 7) * 99)}%`, 15, 1, '7', true);
      set(g, 6, 9, '3'); set(g, 23, 9, '3'); set(g, 6, 10, '3'); set(g, 23, 10, '3');
      return g;
    },
    scroll(v, f) {
      const g = grid(11, 11);
      const c = ['c', 'k', 'l'][v % 3];
      rows(g, ['..666..', '.67776.', '6777776', '67007c6', '6777776', '.6c7c6.', '..666..'], 2, 2, { c });
      if (f & 1) { set(g, 1, 4, '4'); set(g, 9, 6, '4'); } else { set(g, 1, 6, '4'); set(g, 9, 4, '4'); }
      return g;
    },
    clip(v, f) {
      const g = grid(16, 20);
      const c = v % 2 ? 'C' : '5';
      for (let y = 2; y < 18; y++) { set(g, 3, y, c); set(g, 12, y, c); if (y > 5) { set(g, 6, y, c); set(g, 9, y, c); } }
      for (let x = 3; x <= 12; x++) { set(g, x, 1, c); if (x >= 6 && x <= 9) set(g, x, 4, c); }
      for (let x = 6; x <= 12; x++) set(g, x, 18, c);
      const b = f === 1 ? 1 : 0;
      rect(g, 4, 6, 2, 3 - b, '7'); rect(g, 10, 6, 2, 3 - b, '7');
      if (!b) { set(g, 5, 7, '0'); set(g, 11, 7, '0'); }
      set(g, 4, 5, '0'); set(g, 5, 4, '0'); set(g, 10, 4, '0'); set(g, 11, 5, '0');
      if (f === 2) { set(g, 7, 11, '0'); set(g, 8, 11, '0'); }
      return g;
    },
    notif() { const g = grid(5, 5); rows(g, ['.eee.', 'ee7ee', 'eee7e', 'ee7ee', '.eee.']); return g; },
    modal(v, f) {
      const g = grid(60, 32);
      const hot = v === 1;
      rect(g, 0, 0, 60, 32, '2'); rect(g, 1, 1, 58, 4, hot ? 'e' : 'P'); rect(g, 1, 4, 58, 1, hot ? 'R' : 'p');
      set(g, 54, 2, '7'); set(g, 56, 2, '7'); set(g, 55, 3, '7');
      rect(g, 1, 5, 58, 26, hot ? 'K' : '7');
      text(g, hot ? 'LAST CALL' : 'SUBSCRIBE', 34, 7, hot ? 'R' : '0', true);
      rect(g, 14, 15, 36, 5, '6'); rect(g, 15, 16, 34, 3, '7'); text(g, 'your@email', 32, 15, '4', true);
      rect(g, 12, 22, 40, 7, hot ? (f & 1 ? 'e' : 'R') : (f & 1 ? 'K' : 'k')); text(g, hot ? 'SUBSCRIBE' : 'YES PLEASE', 32, 23, '7', true);
      rows(g, ['7777777', '7k777k7', '77kkk77', '7777777'], 3, 7, hot ? { 7: 'y', k: 'e' } : null);
      return g;
    },
    algo(v, f) {
      const g = grid(38, 38);
      for (let y = -17; y <= 17; y++) for (let x = -17; x <= 17; x++) { const d = Math.hypot(x, y); if (d < 17) set(g, 19 + x, 19 + y, d > 15.5 ? '2' : d > 13 ? (((Math.atan2(y, x) * 6 / Math.PI + f) | 0) & 1 ? 'p' : 'P') : '7'); }
      const lx = [0, 3, -3, 2][f & 3], ly = [0, 1, -1, 2][f & 3];
      for (let y = -8; y <= 8; y++) for (let x = -8; x <= 8; x++) { const d = Math.hypot(x, y); if (d < 8) set(g, 19 + lx + x, 19 + ly + y, d < 4 ? '0' : d < 6 ? (v ? 'e' : 'm') : (v ? 'R' : 'P')); }
      set(g, 17 + lx, 17 + ly, '7'); set(g, 16 + lx, 17 + ly, '7');
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + f * 0.3; set(g, 19 + Math.round(Math.cos(a) * 18), 19 + Math.round(Math.sin(a) * 18), 'y'); }
      return g;
    }
  };
  const VARIANTS = { survey: SURVEYS.length, progress: 4, scroll: 3, clip: 2, ad: ADS.length, captcha: 3, cookie: 4, cursor: 4, chat: 4, bell: 9, spinner: 2, video: 3, ghost: 2, tracker: 1, paywall: 2, spam: 3, update: 1, crawler: 2, virus: 1, notif: 1, modal: 2, algo: 2 };
  const FRAMES = { survey: 6, progress: 8, scroll: 2, clip: 3, ad: 2, captcha: 3, cookie: 2, cursor: 2, chat: 3, bell: 3, spinner: 8, video: 4, ghost: 2, tracker: 2, paywall: 2, spam: 2, update: 4, crawler: 2, virus: 2, notif: 1, modal: 2, algo: 4 };

  function spawn(type, x, y, o = {}) {
    const D = T[type];
    if (!D) return null;
    const v = o.v ?? (type === 'spam' ? 0 : (Math.random() * VARIANTS[type]) | 0);
    const sm = type === 'spam' ? [1, 0.55, 0.32][v] : 1;
    const hpm = (o.hpMul || 1) * (o.weak ? 0.5 : 1) * sm;
    const s0 = sprite(type, v, 0);
    const e = {
      type, T: D, x, y, vx: 0, vy: 0, hp: D.hp * hpm, maxHp: D.hp * hpm, t: rand(0, 2), cd: rand(1, 2.5), flash: 0, dead: false, freeze: 0, burn: 0, stun: 0, ground: false,
      v, w: s0.w - 2, h: s0.h - 2, dir: x < PL().x ? 1 : -1, phase: 0, mode: null, spawnT: 0.5, alpha: 1, shieldT: 0, shielded: 0, inside: false, gen: v, ft: 0, fr: 0,
      damage(d, cause, fx) {
        if (this.dead || this.spawnT > 0.2) return false;
        if (this.type === 'ghost' && this.alpha < 0.55) return false;
        if (this.type === 'tracker' && this.inside && cause !== 'boom' && cause !== 'nuke' && cause !== 'quake' && cause !== 'orbital' && cause !== 'hole') return false;
        let mul = (WTP.weapons?.dmgMul || 1) * (this.freeze > 0 ? 1.5 : 1);
        if (this.shielded > 0) mul *= 0.3;
        if (this.type === 'spinner' && Math.abs(this.vx) > 70 && !/boom|freeze|kick|pound|slam|lightning/.test(cause || '')) { mul *= 0.2; if (Math.random() < 0.3) { FX().spark(this.x, this.y, rand(-60, 60), rand(-60, 0), P32['7'], 0.2); A('ricochet'); } }
        if (this.type === 'paywall' && fx != null && Math.sign(fx - this.x) === this.dir && !/boom|kick|pound|slam|lightning|orbital|nuke|quake|fire|acid/.test(cause || '')) { mul *= 0.1; if (Math.random() < 0.4) { A('clank'); FX().spark(this.x + this.dir * 8, this.y, this.dir * 60, rand(-60, 0), P32.y, 0.2); } }
        const dd = d * mul;
        this.hp -= dd;
        this.flash = 0.08;
        if (dd >= 8) FX().pop(this.x + rand(-4, 4), this.y - this.h / 2 - 2, `${Math.round(dd)}`, { scale: 1, ramp: mul < 0.5 ? ['5', '4'] : ['7', 'Y', 'y'], life: 0.6, vy: -40 });
        if (this.hp <= 0) kill(this, cause);
        return true;
      }
    };
    list.push(e);
    for (let k = 0; k < 14; k++) FX().spark(x + rand(-e.w / 2, e.w / 2), y + rand(-e.h / 2, e.h / 2), rand(-40, 40), rand(-40, 40), P32['7'], 0.3);
    if (!D.tiny) A(type === 'algo' || type === 'modal' ? 'bossIn' : type === 'ghost' ? 'ghostIn' : 'popup');
    if (type === 'tracker') e.inside = true;
    return e;
  }
  function kill(e, cause) {
    if (e.dead) return;
    e.dead = true;
    const D = e.T;
    const sp = sprite(e.type, e.v, e.fr);
    const out = sp.g;
    const x0 = Math.round(e.x - out.w / 2), y0 = Math.round(e.y - out.h / 2);
    const step = out.w * out.h > 800 ? 2 : 1;
    for (let y = 0; y < out.h; y += step) for (let x = 0; x < out.w; x += step) {
      const c = out.px[y * out.w + x];
      if (!c || Math.random() > 0.5) continue;
      const dx = x - out.w / 2, dy = y - out.h / 2, d = Math.hypot(dx, dy) || 1;
      if (Math.random() < 0.25) FX().paper(x0 + x, y0 + y, (dx / d) * rand(40, 120), (dy / d) * rand(40, 120) - 60, c);
      else FX().debris(x0 + x, y0 + y, (dx / d) * rand(40, 140), (dy / d) * rand(40, 140) - 60, c, { ns: Math.random() < 0.5 });
    }
    if (!D.tiny) FX().explosion(e.x, e.y, D.boss ? 30 : 9, e.type === 'virus' ? 'plasma' : 'fire');
    if (D.boss) { G()?.slowmo?.(0.3, 1.2); G()?.chroma?.(1); FX().flash(0.8, '#ff5fa2'); for (let k = 0; k < 6; k++) WTP.props.later(k * 0.15, () => WTP.weapons.explode(e.x + rand(-25, 25), e.y + rand(-15, 15), 14, { noPush: true })); }
    if (e.type === 'virus') for (let k = 0; k < 2; k++) WTP.props.later(0.1 + k * 0.15, () => WTP.weapons.glitchAt(e.x + rand(-12, 12), e.y + rand(-12, 12)));
    if (e.type === 'spam' && e.gen < 2) for (let k = 0; k < 2; k++) { const c = spawn('spam', e.x + (k ? 6 : -6), e.y, { v: e.gen + 1, hpMul: 1 }); if (c) { c.spawnT = 0.15; c.vx = (k ? 1 : -1) * 120; c.vy = -160; } }
    A(D.tiny ? 'pop' : D.boss ? 'bossDie' : 'enemyDie');
    G()?.shake?.(D.boss ? 20 : D.tiny ? 1 : 5);
    if (!D.tiny) G()?.enemyKilled?.(e, cause);
    if (D.tiny) return;
    if (Math.random() < (D.boss ? 1 : 0.12)) pickups.push({ t: 'heart', x: e.x, y: e.y, vx: rand(-40, 40), vy: -120, life: 12 });
    const n = D.boss ? 20 : 2 + ((Math.random() * 4) | 0);
    for (let k = 0; k < n; k++) pickups.push({ t: 'scrap', x: e.x, y: e.y, vx: rand(-90, 90), vy: rand(-160, -60), life: 10 });
  }
  function shoot(e, ang, sp, kind, o = {}) {
    if (bullets.length > 260) return;
    bullets.push({ x: e.x + (o.ox || 0), y: e.y + (o.oy || 0), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, kind, life: o.life || 4, homing: o.homing || 0, g: o.g || 0, boom: o.boom || 0, t: 0, r: o.r || 0, bounce: o.bounce || 0 });
    if (!o.quiet) A(o.snd || 'enemyShot');
  }
  function bombDrop(x, y, kind = 'cookie') { bullets.push({ x, y, vx: rand(-20, 20), vy: 30, kind, life: 6, g: 320, boom: 7, t: 0 }); }

  const hardAt = (x, y) => W().hardAt(Math.floor(x), Math.floor(y));
  function box(x, y, e) {
    const s = W().solid;
    const x0 = Math.floor(x - e.w / 2), x1 = Math.floor(x + e.w / 2), y0 = Math.floor(y - e.h / 2), y1 = Math.floor(y + e.h / 2);
    for (let yy = y0; yy <= y1; yy += 2) for (let xx = x0; xx <= x1; xx += 2) if (s(xx, yy)) return true;
    for (let xx = x0; xx <= x1; xx += 2) if (s(xx, y1)) return true;
    return false;
  }
  function fly(e, tx, ty, k, dt, slow) { e.vx += ((tx - e.x) * k - e.vx) * dt * 2 * slow; e.vy += ((ty - e.y) * k - e.vy) * dt * 2 * slow; }

  function update(dt) {
    const P = PL(), pc = P.center();
    const Wd = W();
    const v = G()?.view?.() || { x: 0, y: 0, w: 300, h: 200 };
    const healers = list.filter((e) => !e.dead && e.T.healer);
    for (const e of list) e.shielded = Math.max(0, e.shielded - dt);
    for (const h of healers) for (const o of list) if (o !== h && !o.dead && !o.T.boss && Math.hypot(o.x - h.x, o.y - h.y) < 70) { o.shielded = 0.3; if (o.hp < o.maxHp) o.hp = Math.min(o.maxHp, o.hp + 8 * dt); h.healing = o; }
    for (let k = list.length - 1; k >= 0; k--) {
      const e = list[k];
      if (e.dead) { list.splice(k, 1); continue; }
      const D = e.T;
      e.t += dt; e.flash = Math.max(0, e.flash - dt); e.spawnT = Math.max(0, e.spawnT - dt); e.stun = Math.max(0, e.stun - dt);
      e.ft += dt;
      const fps = e.type === 'spinner' ? 4 + Math.abs(e.vx) * 0.12 : e.type === 'algo' ? 3 : 6;
      e.fr = ((e.ft * fps) | 0) % FRAMES[e.type];
      const slow = (e.freeze > 0 ? 0.35 : 1) * (e.stun > 0 ? 0.15 : 1);
      e.freeze = Math.max(0, e.freeze - dt);
      if (e.burn > 0) { e.burn -= dt; e.damage(12 * dt, 'fire'); if (Math.random() < 0.3) FX().flame(e.x + rand(-e.w / 2, e.w / 2), e.y); }
      e.cd -= dt * slow;
      const dx = pc.x - e.x, dy = pc.y - e.y, d = Math.hypot(dx, dy) || 1;
      let walk = false, noCollide = false, grav = 0;
      switch (e.type) {
        case 'ad': {
          fly(e, pc.x + Math.sin(e.t * 0.7 + e.v) * 60, pc.y - 45 + Math.sin(e.t * 1.3) * 12, 1.2, dt, slow);
          if (e.cd <= 0) { e.cd = rand(1.8, 2.6); for (let q = -1; q <= 1; q++) shoot(e, Math.atan2(dy, dx) + q * 0.25, 75, 'coin', { homing: 0.6 }); }
          break;
        }
        case 'captcha': {
          walk = true; grav = 520;
          if (e.ground && e.cd <= 0) {
            e.cd = rand(1.4, 2.2);
            if (Math.random() < 0.55) { e.vy = -rand(170, 240); e.vx = Math.sign(dx) * rand(40, 80); A('hop'); }
            else for (let q = -2; q <= 2; q++) shoot(e, Math.atan2(dy - 10, dx) + q * 0.18, 120, 'check', { g: 80 });
          }
          if (e.ground) e.vx *= Math.pow(0.02, dt);
          break;
        }
        case 'cookie': {
          noCollide = true;
          e.vx = e.dir * 32 * slow;
          e.vy = ((v.y + 36) - e.y) * 2;
          if ((e.x < v.x + 26 && e.dir < 0) || (e.x > v.x + v.w - 26 && e.dir > 0)) e.dir *= -1;
          if (e.cd <= 0) { e.cd = rand(0.9, 1.4); bombDrop(e.x + rand(-14, 14), e.y + 6, 'cookie'); A('throw'); }
          break;
        }
        case 'cursor': {
          e.phase += dt;
          if (e.mode === 'dash') { if (e.phase > 0.5) { e.mode = null; e.phase = 0; } }
          else {
            fly(e, pc.x + Math.cos(e.t * 2 + e.v * 1.7) * 30, pc.y - 30 + Math.sin(e.t * 2.6 + e.v) * 14, 2, dt * 1.5, slow);
            for (const o of list) if (o !== e && o.type === 'cursor') { const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy); if (od < 9 && od > 0) { e.vx += (ox / od) * 200 * dt; e.vy += (oy / od) * 200 * dt; } }
            if (e.cd <= 0 && d < 110) { e.cd = rand(1.6, 2.6); e.mode = 'dash'; e.phase = 0; e.vx = (dx / d) * 230; e.vy = (dy / d) * 230; A('click'); }
          }
          noCollide = true;
          break;
        }
        case 'chat': {
          fly(e, pc.x - Math.sign(dx || 1) * 70, pc.y - 30 + Math.sin(e.t) * 18, 1, dt, slow);
          if (e.cd <= 0) { e.mode = 'burst'; e.burst = 4; e.cd = rand(2.4, 3.2); }
          if (e.mode === 'burst' && (e.bt = (e.bt || 0) - dt) <= 0) { e.bt = 0.16; shoot(e, Math.atan2(dy, dx) + rand(-0.1, 0.1), 95, 'bubble', { snd: 'blip' }); if (--e.burst <= 0) e.mode = null; }
          noCollide = true;
          break;
        }
        case 'bell': {
          fly(e, pc.x + Math.cos(e.t * 0.9 + e.v) * 80, pc.y - 55, 1, dt, slow);
          if (e.cd <= 0) { e.cd = rand(2.2, 3); A('bell'); for (let q = 0; q < 3; q++) { const c = spawn('notif', e.x, e.y, { hpMul: 1 }); if (c) { c.vx = rand(-90, 90); c.vy = rand(-90, -30); c.spawnT = 0.1; } } }
          noCollide = true;
          break;
        }
        case 'notif': {
          fly(e, pc.x, pc.y, 2.6, dt, slow);
          const sp = Math.hypot(e.vx, e.vy); if (sp > 110) { e.vx *= 110 / sp; e.vy *= 110 / sp; }
          if (e.t > 7) kill(e, 'time');
          noCollide = true;
          break;
        }
        case 'spinner': {
          walk = true; grav = 520;
          if (e.ground) { e.vx += Math.sign(dx) * 260 * dt * slow; e.vx = Math.max(-150, Math.min(150, e.vx)); if (e.cd <= 0 && Math.abs(dy) < 30) { e.cd = rand(2, 3); e.vy = -150; } }
          if (Math.abs(e.vx) > 70 && Math.random() < 0.3) FX().spark(e.x - Math.sign(e.vx) * 6, e.y + 5, -e.vx * 0.3, -20, P32.C, 0.15);
          if (e.ground && Math.abs(e.vx) > 60) W().carve(e.x + Math.sign(e.vx) * 7, e.y + 3, 1.8, { pow: 1.4, debris: 0.4, force: 50, cause: 'enemy', noCrumble: true, pop: 0.3 });
          break;
        }
        case 'video': {
          noCollide = true;
          if (e.mode === 'charge') {
            e.vx = e.dir * 220 * slow; e.vy *= 0.9;
            if ((e.ring = (e.ring || 0) - dt) <= 0) { e.ring = 0.22; bullets.push({ x: e.x, y: e.y, vx: 0, vy: 0, kind: 'ring', life: 0.7, t: 0, r: 2 }); A('blare'); }
            if ((e.dir > 0 && e.x > v.x + v.w + 20) || (e.dir < 0 && e.x < v.x - 20)) { e.mode = null; e.cd = rand(1.5, 2.5); e.dir *= -1; }
          } else {
            fly(e, e.dir > 0 ? v.x - 10 : v.x + v.w + 10, pc.y - 4, 1.2, dt, slow);
            if (e.cd <= 0 && Math.abs(dy) < 40) { e.mode = 'charge'; e.y += (pc.y - e.y) * 0.5; A('autoplay'); }
          }
          break;
        }
        case 'ghost': {
          noCollide = true;
          e.alpha = 0.35 + 0.65 * Math.max(0, Math.sin(e.t * 1.6 + e.v));
          fly(e, pc.x, pc.y - 6, 0.45, dt, slow);
          const sp = Math.hypot(e.vx, e.vy); if (sp > 55) { e.vx *= 55 / sp; e.vy *= 55 / sp; }
          if (e.alpha > 0.9 && e.cd <= 0 && d < 100) { e.cd = rand(2, 3); for (let q = 0; q < 5; q++) shoot(e, (q / 5) * Math.PI * 2 + e.t, 60, 'boo', { snd: 'boo' }); }
          break;
        }
        case 'tracker': {
          noCollide = true;
          if (e.inside) {
            const tx = pc.x + Math.cos(e.t) * 40, ty = pc.y + 30;
            fly(e, tx, ty, 0.8, dt, slow);
            const sp = Math.hypot(e.vx, e.vy); if (sp > 70) { e.vx *= 70 / sp; e.vy *= 70 / sp; }
            if ((e.dig = (e.dig || 0) - dt) <= 0) { e.dig = 0.12; W().carve(e.x, e.y, 3.2, { pow: 2, debris: 0.4, force: 50, cause: 'enemy', noCrumble: true, pop: 0.2 }); }
            if (Math.random() < 0.2) FX().dust(e.x, e.y);
            if (e.cd <= 0 && d < 120) { e.inside = false; e.cd = 1.4; e.mode = 'aim'; e.phase = 0; e.vx = 0; e.vy = -60; A('popOut'); }
          } else {
            e.phase += dt; e.vx *= 0.9; e.vy *= 0.9;
            if (e.phase < 0.7) { e.aim = Math.atan2(dy, dx); FX().beam([e.x, e.y, e.x + Math.cos(e.aim) * 160, e.y + Math.sin(e.aim) * 160], { kind: 'sight', life: 0.03, c1: P32.e }); }
            else if (!e.fired) { e.fired = true; A('trackBeam'); const r = W().raycast(e.x, e.y, Math.cos(e.aim), Math.sin(e.aim), 200, 1); FX().beam([e.x, e.y, r.x, r.y], { kind: 'rail', life: 0.25, c1: P32['7'], c2: P32.e, c3: P32.R, w: 2 }); if (segHit(e.x, e.y, r.x, r.y, pc.x, pc.y, 5)) P.hurt(1, e.x); }
            if (e.phase > 1.6) { e.inside = true; e.fired = false; e.cd = rand(2, 3); }
          }
          break;
        }
        case 'paywall': {
          walk = true; grav = 520;
          e.dir = dx > 0 ? 1 : -1;
          if (e.ground) e.vx += (e.dir * 30 - e.vx) * dt * 3 * slow;
          if (e.ground && box(e.x + e.dir * 3, e.y - 2, e)) W().carve(e.x + e.dir * (e.w / 2 + 2), e.y, 4, { pow: 2.5, debris: 0.5, force: 80, cause: 'enemy', noCrumble: true });
          if (e.cd <= 0 && d < 60) { e.cd = rand(2, 3); shoot(e, Math.atan2(dy, dx), 90, 'invoice', { snd: 'stampE' }); }
          break;
        }
        case 'spam': {
          walk = true; grav = 520;
          if (e.ground && e.cd <= 0) { e.cd = rand(0.6, 1.2); e.vy = -rand(140, 210); e.vx = Math.sign(dx) * rand(50, 100); A('squish'); }
          if (e.ground) e.vx *= Math.pow(0.05, dt);
          break;
        }
        case 'update': {
          noCollide = true;
          const away = d < 80 ? -1 : 0.3;
          const tx = Math.max(v.x + 20, Math.min(v.x + v.w - 20, e.x - dx * away * 0.5 + Math.sin(e.t) * 20));
          fly(e, tx, Math.max(v.y + 30, pc.y - 60), 0.9, dt, slow);
          break;
        }
        case 'crawler': {
          noCollide = true;
          if (e.mode === 'drop') {
            e.vy += 600 * dt; e.vx *= 0.98;
            if (box(e.x, e.y + 2, e)) { e.mode = null; e.vy = 0; }
          } else {
            let sx = 0, sy = 0;
            for (const [ox, oy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) if (hardAt(e.x + ox * (e.w / 2 + 1.5), e.y + oy * (e.h / 2 + 1.5))) { sx += ox; sy += oy; }
            if (!sx && !sy) { e.vy += 520 * dt; e.vx *= 0.95; }
            else {
              e.normal = [sx, sy];
              const tx = -sy, ty = sx;
              const want = Math.sign((pc.x - e.x) * tx + (pc.y - e.y) * ty) || 1;
              e.vx = tx * want * 50 * slow + sx * 20; e.vy = ty * want * 50 * slow + sy * 20;
              if (sy < 0 && Math.abs(dx) < 8 && dy > 0 && e.cd <= 0) { e.mode = 'drop'; e.cd = 2; A('drop'); }
            }
            if (e.cd <= 0 && d < 90) { e.cd = rand(1.6, 2.4); shoot(e, Math.atan2(dy, dx), 110, 'web', { snd: 'spit' }); }
          }
          const nx = e.x + e.vx * dt, ny = e.y + e.vy * dt;
          if (!box(nx, e.y, e)) e.x = nx; else e.vx = 0;
          if (!box(e.x, ny, e)) e.y = ny; else e.vy = 0;
          e.vx2 = e.vx; e.vx = 0; e.vy2 = e.vy; e.vy = 0;
          break;
        }
        case 'virus': {
          noCollide = true;
          fly(e, pc.x + Math.cos(e.t * 1.3) * 50, pc.y - 30 + Math.sin(e.t * 2) * 20, 1, dt, slow);
          if (e.cd <= 0) {
            e.cd = rand(2.2, 3.2);
            FX().explosion(e.x, e.y, 4, 'plasma');
            e.x = Math.max(v.x + 20, Math.min(v.x + v.w - 20, pc.x + rand(-90, 90))); e.y = Math.max(v.y + 20, pc.y - rand(20, 70));
            A('teleport');
            WTP.weapons.glitchAt(e.x, e.y + 14);
            for (let q = 0; q < 4; q++) shoot(e, Math.atan2(dy, dx) + (q - 1.5) * 0.2, 80, 'glitch', { quiet: q > 0 });
          }
          break;
        }
        case 'survey': {
          fly(e, pc.x + Math.sin(e.t * 0.6 + e.v) * 70, pc.y - 50 + Math.cos(e.t * 1.1) * 10, 1, dt, slow);
          if (e.cd <= 0) { e.cd = rand(2.2, 3); for (let q = 0; q < 5; q++) shoot(e, -Math.PI / 2 + (q - 2) * 0.32 + (dx > 0 ? 0.25 : -0.25), 110, 'star', { g: 220, bounce: 2, quiet: q > 0, snd: 'blip' }); }
          noCollide = true;
          break;
        }
        case 'progress': {
          noCollide = true;
          fly(e, pc.x + (e.v & 1 ? 60 : -60), pc.y - 36 + Math.sin(e.t * 1.7) * 6, 0.9, dt, slow);
          e.load = (e.load || 0) + dt * slow * 0.22;
          e.ft = e.load * (8 / 6);
          if (e.load >= 1) {
            e.load = 0; e.ft = 0;
            A('trackBeam');
            const a0 = Math.atan2(dy, dx);
            for (let q = -1; q <= 1; q++) { const a = a0 + q * 0.12; const r = W().raycast(e.x, e.y, Math.cos(a), Math.sin(a), 220, 1); FX().beam([e.x, e.y, r.x, r.y], { kind: 'rail', life: 0.3, c1: P32['7'], c2: P32.l, c3: P32.G, w: 2 }); W().carve(r.x, r.y, 4, { pow: 3, debris: 0.5, force: 90, cause: 'enemy', scorch: true }); if (segHit(e.x, e.y, r.x, r.y, pc.x, pc.y, 4)) P.hurt(1, e.x); }
            G()?.event?.('DOWNLOAD COMPLETE', e.x, e.y - 10, 1);
          }
          break;
        }
        case 'scroll': {
          noCollide = true;
          e.trail = e.trail || [];
          const tx = pc.x + Math.cos(e.t * 0.8) * 30, ty = pc.y + Math.sin(e.t * 1.1) * 26;
          fly(e, tx, ty, 0.7, dt, slow);
          const sp = Math.hypot(e.vx, e.vy); const cap = 62 + Math.min(40, e.t * 3); if (sp > cap) { e.vx *= cap / sp; e.vy *= cap / sp; }
          if ((e.dig = (e.dig || 0) - dt) <= 0) { e.dig = 0.08; W().carve(e.x, e.y, 4.2, { pow: 2.4, debris: 0.5, force: 60, cause: 'enemy', noCrumble: Math.random() < 0.7, pop: 0.4 }); }
          const last = e.trail[0];
          if (!last || Math.hypot(last.x - e.x, last.y - e.y) > 6) { e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 9) e.trail.pop(); }
          for (let q = 1; q < e.trail.length; q++) { const s2 = e.trail[q]; if (Math.abs(pc.x - s2.x) < 5 && Math.abs(pc.y - s2.y) < 7) P.hurt(1, s2.x); }
          if (Math.random() < 0.08) A('munch');
          break;
        }
        case 'clip': {
          noCollide = true;
          fly(e, pc.x - Math.sign(dx || 1) * 50 + Math.sin(e.t * 2) * 8, pc.y - 40 + Math.sin(e.t * 3) * 4, 1.1, dt, slow);
          if (e.cd <= 0) {
            e.cd = rand(1.8, 2.6);
            if (Math.random() < 0.35) G()?.label?.(`PAPERCLIP: ${pick(TIPS)}`, 1300);
            for (let q = 0; q < 2; q++) shoot(e, Math.atan2(dy, dx) + (q ? 0.15 : -0.15), 120, 'clipb', { spin: true, quiet: q > 0, snd: 'boomerang' });
          }
          break;
        }
        case 'modal': {
          noCollide = true;
          fly(e, v.x + v.w / 2 + Math.sin(e.t * 0.5) * v.w * 0.25, v.y + 44 + Math.sin(e.t) * 8, 0.5, dt, slow);
          const ph = e.hp < e.maxHp * 0.5 ? 2 : 1;
          if (ph === 2 && e.v === 0) { e.v = 1; G()?.announce?.('LAST CHANCE TO SUBSCRIBE!', 5); }
          if (e.cd <= 0) {
            e.cd = ph === 2 ? 1.3 : 2.1;
            const n = ph === 2 ? 16 : 10, off = e.t;
            for (let q = 0; q < n; q++) shoot(e, (q / n) * Math.PI * 2 + off, 70, 'mail', { life: 5, quiet: q > 0 });
            if (Math.random() < 0.45 && list.length < 14) { spawn('cursor', e.x - 22, e.y); spawn('cursor', e.x + 22, e.y); }
            if (ph === 2 && Math.random() < 0.4) spawn(pick(['ad', 'spam', 'bell']), e.x, e.y + 20);
          }
          break;
        }
        case 'algo': {
          noCollide = true;
          fly(e, v.x + v.w / 2 + Math.sin(e.t * 0.4) * v.w * 0.3, v.y + 50 + Math.sin(e.t * 0.8) * 14, 0.5, dt, slow);
          const ph = e.hp < e.maxHp * 0.5 ? 2 : 1;
          if (ph === 2 && e.v === 0) { e.v = 1; G()?.announce?.('THE ALGORITHM IS ANGRY', 5); }
          if (e.mode === 'laser') {
            e.phase += dt;
            const a = e.la0 + (e.la1 - e.la0) * Math.min(1, e.phase / 1.6);
            const r = W().raycast(e.x, e.y, Math.cos(a), Math.sin(a), 260, 1);
            FX().beam([e.x, e.y, r.x, r.y], { kind: 'laser', life: 0.03, c1: P32['7'], c2: ph === 2 ? P32.e : P32.m });
            W().carve(r.x, r.y, 3, { pow: 3, debris: 0.4, force: 60, cause: 'enemy', scorch: true, noCrumble: Math.random() < 0.6 });
            if (segHit(e.x, e.y, r.x, r.y, pc.x, pc.y, 4)) P.hurt(1, e.x);
            if (e.phase > 1.6) { e.mode = null; e.cd = ph === 2 ? 1.2 : 2; }
          } else if (e.cd <= 0) {
            if (Math.random() < 0.55) { e.mode = 'laser'; e.phase = 0; const base = Math.atan2(dy, dx); e.la0 = base - 0.9; e.la1 = base + 0.9; if (Math.random() < 0.5) { const t = e.la0; e.la0 = e.la1; e.la1 = t; } A('laserCharge'); }
            else { e.cd = 2.4; G()?.label?.('RECOMMENDED FOR YOU', 900); for (let q = 0; q < (ph === 2 ? 3 : 2); q++) spawn(pick(['ad', 'cursor', 'video', 'bell', 'spam', 'chat']), e.x + rand(-30, 30), e.y + 20); }
          }
          break;
        }
        default: break;
      }
      if (e.type === 'crawler') { e.vx = e.vx2 || 0; e.vy = e.vy2 || 0; }
      else if (walk) {
        e.vy += grav * dt;
        const steps = Math.max(1, Math.ceil(Math.hypot(e.vx, e.vy) * dt));
        e.ground = false;
        for (let s = 0; s < steps; s++) {
          const nx = e.x + (e.vx * dt) / steps, ny = e.y + (e.vy * dt) / steps;
          if (box(nx, e.y, e)) { let up = 0; for (up = 1; up <= 4; up++) if (!box(nx, e.y - up, e)) break; if (up <= 4 && e.ground !== null) { e.x = nx; e.y -= up; } else e.vx = -e.vx * 0.3; } else e.x = nx;
          if (box(e.x, ny, e)) { if (e.vy > 0) e.ground = true; e.vy = 0; } else e.y = ny;
        }
        let g = 0; while (box(e.x, e.y, e) && g++ < 20) e.y -= 1;
      } else { e.x += e.vx * dt; e.y += e.vy * dt; }
      if (e.type !== 'video' && (e.y > Wd.h + 40 || e.x < -60 || e.x > Wd.w + 60)) { e.dead = true; continue; }
      const touchR = 3;
      if (!(e.type === 'ghost' && e.alpha < 0.6) && !(e.type === 'tracker' && e.inside) && Math.abs(pc.x - e.x) < e.w / 2 + touchR && Math.abs(pc.y - e.y) < e.h / 2 + 6) {
        if (P.dashT > 0 && !D.boss) e.damage(30, 'dash');
        else if (P.hurt(1, e.x)) { if (e.type === 'cursor' || e.type === 'notif') { e.vx *= -1; e.vy = -100; } if (e.type === 'notif') kill(e, 'touch'); }
      }
    }
    for (let k = bullets.length - 1; k >= 0; k--) {
      const b = bullets[k];
      b.life -= dt; b.t += dt;
      let dead = b.life <= 0;
      if (b.kind === 'ring') {
        b.r += 70 * dt;
        if (Math.abs(Math.hypot(pc.x - b.x, pc.y - b.y) - b.r) < 4) { P.hurt(1, b.x); }
        if (dead) bullets.splice(k, 1);
        continue;
      }
      if (b.homing) { const dx = pc.x - b.x, dy = pc.y - b.y, d = Math.hypot(dx, dy) || 1; b.vx += (dx / d) * 90 * b.homing * dt; b.vy += (dy / d) * 90 * b.homing * dt; }
      b.vy += b.g * dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.kind === 'bubble' && b.t > 0.9 && !b.split) { b.split = true; for (let q = -1; q <= 1; q += 2) bullets.push({ x: b.x, y: b.y, vx: b.vx * 0.8 + q * 40, vy: b.vy * 0.8 + q * 30, kind: 'dot', life: 1.5, g: 0, t: 0 }); }
      if (!dead && Math.abs(pc.x - b.x) < 4 && Math.abs(pc.y - b.y) < 8) {
        if (P.hurt(1, b.x) && b.kind === 'web') P.vx *= 0.2;
        dead = true;
      }
      if (!dead && b.bounce > 0 && Wd.solid(Math.floor(b.x), Math.floor(b.y))) { b.bounce--; b.y -= b.vy * dt; b.vy = -Math.abs(b.vy) * 0.8; continue; }
      if (!dead && b.kind !== 'boo' && Wd.solid(Math.floor(b.x), Math.floor(b.y))) {
        dead = true;
        if (b.boom) WTP.weapons.explode(b.x, b.y, b.boom, { noPush: true, letters: 3, dmg: 0, sound: 'impact' });
        else if (b.kind === 'glitch') WTP.weapons.glitchAt(b.x, b.y);
        else FX().spark(b.x, b.y, rand(-30, 30), rand(-40, 0), P32.y, 0.2);
      }
      if (dead) bullets.splice(k, 1);
    }
    for (let k = pickups.length - 1; k >= 0; k--) {
      const p = pickups[k];
      p.life -= dt;
      const dx = pc.x - p.x, dy = pc.y - p.y, d = Math.hypot(dx, dy);
      if (d < 44 && p.life < (p.t === 'heart' ? 11.5 : 9.7)) { p.vx += (dx / (d || 1)) * 900 * dt; p.vy += (dy / (d || 1)) * 900 * dt; p.vx *= 0.92; p.vy *= 0.92; }
      else { p.vy = Math.min(200, p.vy + 400 * dt); p.vx *= 0.98; }
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (Wd.solid(Math.floor(nx), Math.floor(p.y))) p.vx *= -0.4; else p.x = nx;
      if (Wd.solid(Math.floor(p.x), Math.floor(ny))) { p.vy *= -0.3; p.vx *= 0.8; } else p.y = ny;
      if (d < 7) {
        if (p.t === 'heart') { if (P.hp < P.maxHp) { P.hp++; A('heal'); FX().pop(p.x, p.y - 6, '+1 HP', { ramp: ['K', 'k', 'e'] }); } else G()?.bonus?.(200, p.x, p.y); }
        else { A('coin'); G()?.scrap?.(2); }
        pickups.splice(k, 1); continue;
      }
      if (p.life <= 0) pickups.splice(k, 1);
    }
  }
  function segHit(x0, y0, x1, y1, px, py, r) {
    const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L));
    return Math.hypot(x0 + dx * t - px, y0 + dy * t - py) < r;
  }
  const BUL = {
    coin: ['.yy.', 'ya7y', 'yaay', '.yy.'], cookie: ['.ww.', 'wuWu', 'uWuu', '.uu.'], check: ['...l', 'l.l.', '.l..'], mail: ['77777', '76667', '77777'],
    star: ['..y..', 'yyYyy', '.yyy.', 'y...y'], clipb: ['555.', '5..5', '5.55', '5..5', '.55.'],
    bubble: ['.ccc.', 'c777c', 'c777c', '.ccc.', '.c...'], dot: ['c7', '7c'], boo: ['.66.', '6006', '6666', '6.6.'], invoice: ['7777', '7447', '7777', '7447', '7777'], web: ['7.7', '.7.', '7.7'], glitch: ['kC', 'Ck']
  };
  const bulCache = {};
  const bulSprite = (k) => bulCache[k] || (bulCache[k] = SP.S(BUL[k], { gx: 0, gy: 0 }));
  function draw(ctx) {
    for (const e of list) {
      if (e.spawnT > 0 && ((e.spawnT * 20) | 0) % 2) continue;
      if (e.type === 'scroll' && e.trail) {
        for (let q = e.trail.length - 1; q >= 1; q--) {
          const s2 = e.trail[q], sx = Math.round(s2.x), sy = Math.round(s2.y);
          ctx.fillStyle = PAL['0']; ctx.fillRect(sx - 5, sy - 4, 11, 9);
          ctx.fillStyle = q & 1 ? PAL['7'] : PAL['6']; ctx.fillRect(sx - 4, sy - 3, 9, 7);
          ctx.fillStyle = PAL['4']; ctx.fillRect(sx - 3, sy - 2, 3, 3); ctx.fillStyle = PAL['5']; ctx.fillRect(sx + 1, sy - 2, 3, 1); ctx.fillRect(sx + 1, sy, 2, 1);
          ctx.fillStyle = [PAL.c, PAL.k, PAL.l][e.v % 3]; ctx.fillRect(sx - 3, sy + 2, 2, 1);
        }
      }
      if (e.type === 'tracker' && e.inside) {
        if (((e.t * 6) | 0) & 1) { ctx.fillStyle = PAL.e; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1); }
        continue;
      }
      const sp = sprite(e.type, e.v, e.fr);
      const x = Math.round(e.x - sp.w / 2), y = Math.round(e.y - sp.h / 2);
      const img = e.flash > 0 ? whiteOf(sp) : e.freeze > 0 ? iceOf(sp) : sp.cv;
      const flip = (e.type === 'cursor' && e.vx < 0) || (e.type === 'paywall' && e.dir < 0) || (e.type === 'crawler' && (e.vx2 || 0) < 0) || (e.type === 'spam' && e.vx < 0);
      if (e.type === 'ghost') ctx.globalAlpha = e.alpha;
      if (e.type === 'crawler' && e.normal && e.normal[1] < 0) { ctx.save(); ctx.translate(x, y + sp.h); ctx.scale(flip ? -1 : 1, -1); ctx.drawImage(img, flip ? -sp.w : 0, 0); ctx.restore(); }
      else if (flip) { ctx.save(); ctx.translate(x + sp.w, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore(); }
      else {
        const wob = e.type === 'ad' && e.flash <= 0 ? Math.round(Math.sin(e.t * 9) * 0.6) : 0;
        ctx.drawImage(img, x + wob, y);
      }
      ctx.globalAlpha = 1;
      if (e.shielded > 0) { ctx.fillStyle = PAL.l; for (let q = 0; q < 12; q++) { const a = (q / 12) * Math.PI * 2 + e.t * 3; ctx.fillRect(Math.round(e.x + Math.cos(a) * (e.w / 2 + 3)), Math.round(e.y + Math.sin(a) * (e.h / 2 + 3)), 1, 1); } }
      if (e.T.healer && e.healing && !e.healing.dead && ((e.t * 10) | 0) & 1) FX().beam([e.x, e.y, e.healing.x, e.healing.y], { kind: 'tractor', life: 0.03, c1: P32.l, c2: P32.L });
      if (e.type === 'cursor' && e.mode === 'dash') { ctx.fillStyle = PAL.c; ctx.fillRect(x + 2, y + sp.h, 2, 1); }
      if (e.stun > 0 && !e.T.boss) { ctx.fillStyle = PAL.y; const a = e.t * 8; ctx.fillRect(Math.round(e.x + Math.cos(a) * 4), y - 3, 1, 1); ctx.fillRect(Math.round(e.x - Math.cos(a) * 4), y - 3, 1, 1); }
      if ((e.T.boss || e.hp < e.maxHp) && !e.T.tiny) {
        const w = Math.min(44, Math.max(12, e.w)), bx = Math.round(e.x - w / 2), by = y - 4;
        ctx.fillStyle = PAL['0']; ctx.fillRect(bx - 1, by - 1, w + 2, 3);
        ctx.fillStyle = e.shielded > 0 ? PAL.l : PAL.e; ctx.fillRect(bx, by, Math.max(0, Math.round((w * e.hp) / e.maxHp)), 1);
      }
    }
    for (const b of bullets) {
      if (b.kind === 'ring') { const n = Math.ceil(b.r * 3); ctx.fillStyle = b.life > 0.35 ? PAL.k : PAL.m; for (let q = 0; q < n; q++) { if (q & 1) continue; const a = (q / n) * Math.PI * 2; ctx.fillRect(Math.round(b.x + Math.cos(a) * b.r), Math.round(b.y + Math.sin(a) * b.r), 1, 1); } continue; }
      const sp = bulSprite(b.kind);
      if (!sp) continue;
      if (b.kind === 'boo') ctx.globalAlpha = 0.75;
      if (b.kind === 'clipb') { const r = sp.rotated ? sp.rotated(b.t * 14, false) : null; if (r) ctx.drawImage(r.cv, Math.round(b.x - r.ox), Math.round(b.y - r.oy)); else ctx.drawImage(sp.cv, Math.round(b.x - sp.w / 2), Math.round(b.y - sp.h / 2)); }
      else ctx.drawImage(sp.cv, Math.round(b.x - sp.w / 2), Math.round(b.y - sp.h / 2));
      ctx.globalAlpha = 1;
    }
    for (const p of pickups) {
      if (p.life < 2 && ((p.life * 10) | 0) % 2) continue;
      const sp = p.t === 'heart' ? SP.ENEMY.heart : SP.ENEMY.scrap;
      const bob = Math.round(Math.sin(p.life * 6) * 1);
      ctx.drawImage(sp.cv, Math.round(p.x - sp.w / 2), Math.round(p.y - sp.h / 2) + bob);
    }
  }
  function at(x, y, r) {
    for (const e of list) {
      if (e.dead || e.spawnT > 0.2) continue;
      if (e.type === 'ghost' && e.alpha < 0.55) continue;
      if (e.type === 'tracker' && e.inside) continue;
      if (Math.abs(x - e.x) < e.w / 2 + r && Math.abs(y - e.y) < e.h / 2 + r) return e;
    }
    return null;
  }
  function damageCircle(x, y, r, dmg, cause) {
    let hit = 0;
    for (const e of list) {
      if (e.dead) continue;
      const dx = Math.max(Math.abs(x - e.x) - e.w / 2, 0), dy = Math.max(Math.abs(y - e.y) - e.h / 2, 0);
      if (dx * dx + dy * dy < r * r) { if (dmg > 0) e.damage(dmg, cause, x); hit++; if (cause === 'freeze') e.freeze = 2; }
    }
    if (cause !== 'enemy' && dmg > 0) for (let k = bullets.length - 1; k >= 0; k--) { const b = bullets[k]; if (b.kind !== 'ring' && Math.hypot(b.x - x, b.y - y) < r) bullets.splice(k, 1); }
    return hit;
  }
  function rayHit(x, y, dx, dy, max) {
    for (let d = 0; d < max; d += 2) { const e = at(x + dx * d, y + dy * d, 1); if (e) return { enemy: e, x: x + dx * d, y: y + dy * d }; }
    return null;
  }
  function nearest(x, y, R, ang, cone) {
    let best = null, bd = R;
    for (const e of list) {
      if (e.dead || (e.type === 'tracker' && e.inside) || (e.type === 'ghost' && e.alpha < 0.55)) continue;
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
      if (d > bd) continue;
      if (ang != null) { let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; if (Math.abs(da) > cone) continue; }
      bd = d; best = e;
    }
    return best;
  }
  function pull(x, y, R, f) { for (const e of list) { const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy) || 1; if (d < R && !e.T.boss) { e.vx += (dx / d) * f; e.vy += (dy / d) * f; } } }
  function push(x, y, R, vx, vy) { for (const e of list) if (Math.hypot(e.x - x, e.y - y) < R && !e.T.boss) { e.vx += vx; e.vy += vy; } }
  function spawnEdge(type, o) {
    const v = G()?.view?.() || { x: 0, y: 0, w: 300, h: 200 };
    const P = PL();
    let x, y;
    const side = Math.random();
    const D = T[type];
    if (!D) return null;
    if (type === 'captcha' || type === 'paywall' || type === 'spam' || type === 'spinner') { x = P.x + (Math.random() < 0.5 ? -1 : 1) * rand(50, 110); x = Math.max(10, Math.min(W().w - 10, x)); y = v.y + 10; }
    else if (type === 'crawler') { x = Math.max(10, Math.min(W().w - 10, P.x + rand(-80, 80))); y = v.y + 12; }
    else if (type === 'tracker' || type === 'scroll') { x = P.x + rand(-60, 60); y = P.y + rand(30, 60); }
    else if (type === 'cookie') { x = side < 0.5 ? v.x + 24 : v.x + v.w - 24; y = v.y + 24; }
    else if (type === 'modal' || type === 'algo') { x = v.x + v.w / 2; y = v.y + 30; }
    else if (type === 'video') { x = side < 0.5 ? v.x - 10 : v.x + v.w + 10; y = P.y; }
    else { x = side < 0.33 ? v.x + 8 : side < 0.66 ? v.x + v.w - 8 : v.x + rand(10, v.w - 10); y = side < 0.66 ? v.y + rand(20, v.h * 0.5) : v.y + 10; }
    const e = spawn(type, x, y, o);
    if (e && type === 'video') e.dir = x < P.x ? 1 : -1;
    return e;
  }
  function drop(t, x, y, n = 1) { for (let k = 0; k < n; k++) pickups.push({ t, x, y, vx: rand(-90, 90), vy: rand(-180, -60), life: t === 'heart' ? 12 : 10 }); }
  function reset() { list.length = 0; bullets.length = 0; pickups.length = 0; }
  const portrait = (type, scale = 3) => {
    const s = sprite(type, 0, 0);
    const c = document.createElement('canvas');
    c.width = s.w * scale; c.height = s.h * scale;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(s.cv, 0, 0, c.width, c.height);
    return c.toDataURL();
  };
  WTP.enemies = { TYPES: T, ORDER, ADS, list, bullets, pickups, spawn, spawnEdge, update, draw, at, damageCircle, rayHit, nearest, pull, push, reset, drop, bombDrop, sprite, portrait, count: () => list.filter((e) => !e.dead && !e.T.tiny).length };
})();
