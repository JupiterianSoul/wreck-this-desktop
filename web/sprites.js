(() => {
  const WTP = window.WTP;
  const { P32, PAL } = WTP;
  const OUT = P32['0'];

  function grid(rows, map) {
    const h = rows.length;
    const w = Math.max(...rows.map((r) => r.length));
    const px = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) {
      const r = rows[y];
      for (let x = 0; x < r.length; x++) {
        let ch = r[x];
        if (ch === '.' || ch === ' ') continue;
        if (map && map[ch] != null) ch = map[ch];
        const c = P32[ch];
        if (c != null) px[y * w + x] = c;
      }
    }
    return { w, h, px };
  }
  function outline(g, col = OUT, diag = false) {
    const W = g.w + 2, H = g.h + 2;
    const px = new Uint32Array(W * H);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) px[(y + 1) * W + x + 1] = g.px[y * g.w + x];
    const res = px.slice();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (px[i]) continue;
      let n = (x > 0 && px[i - 1]) || (x < W - 1 && px[i + 1]) || (y > 0 && px[i - W]) || (y < H - 1 && px[i + W]);
      if (!n && diag) n = (x > 0 && y > 0 && px[i - W - 1]) || (x < W - 1 && y > 0 && px[i - W + 1]) || (x > 0 && y < H - 1 && px[i + W - 1]) || (x < W - 1 && y < H - 1 && px[i + W + 1]);
      if (n) res[i] = col;
    }
    return { w: W, h: H, px: res };
  }
  function toCanvas(g) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, g.w); cv.height = Math.max(1, g.h);
    const c = cv.getContext('2d');
    const img = c.createImageData(cv.width, cv.height);
    new Uint32Array(img.data.buffer).set(g.px.subarray(0, cv.width * cv.height));
    c.putImageData(img, 0, 0);
    return cv;
  }
  function flipX(g) { const px = new Uint32Array(g.w * g.h); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) px[y * g.w + (g.w - 1 - x)] = g.px[y * g.w + x]; return { w: g.w, h: g.h, px }; }
  function flipY(g) { const px = new Uint32Array(g.w * g.h); for (let y = 0; y < g.h; y++) px.set(g.px.subarray(y * g.w, y * g.w + g.w), (g.h - 1 - y) * g.w); return { w: g.w, h: g.h, px }; }
  function tint(g, col, keepOutline) { const px = g.px.map((c) => (c ? (keepOutline && c === OUT ? c : col) : 0)); return { w: g.w, h: g.h, px }; }
  function scale2x(g) {
    const W = g.w * 2, H = g.h * 2, s = g.px, w = g.w, h = g.h;
    const px = new Uint32Array(W * H);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : s[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P = s[y * w + x], A = at(x, y - 1), B = at(x + 1, y), Cc = at(x - 1, y), D = at(x, y + 1);
      let e0 = P, e1 = P, e2 = P, e3 = P;
      if (Cc === A && Cc !== D && A !== B) e0 = A;
      if (A === B && A !== Cc && B !== D) e1 = B;
      if (D === Cc && D !== B && Cc !== A) e2 = Cc;
      if (B === D && B !== A && D !== Cc) e3 = D;
      const o = y * 2 * W + x * 2;
      px[o] = e0; px[o + 1] = e1; px[o + W] = e2; px[o + W + 1] = e3;
    }
    return { w: W, h: H, px };
  }
  function rotate(g, ang, cx, cy) {
    const up = scale2x(scale2x(g));
    const k = 4;
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const corners = [[0, 0], [g.w, 0], [0, g.h], [g.w, g.h]].map(([x, y]) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos]);
    const x0 = Math.floor(Math.min(...corners.map((c) => c[0]))), x1 = Math.ceil(Math.max(...corners.map((c) => c[0])));
    const y0 = Math.floor(Math.min(...corners.map((c) => c[1]))), y1 = Math.ceil(Math.max(...corners.map((c) => c[1])));
    const W = x1 - x0, H = y1 - y0;
    const px = new Uint32Array(Math.max(1, W * H));
    for (let oy = 0; oy < H; oy++) for (let ox = 0; ox < W; ox++) {
      const wx = x0 + ox + 0.5 - cx, wy = y0 + oy + 0.5 - cy;
      const sx = cx + wx * cos + wy * sin, sy = cy - wx * sin + wy * cos;
      const ux = Math.floor(sx * k), uy = Math.floor(sy * k);
      if (ux < 0 || uy < 0 || ux >= up.w || uy >= up.h) continue;
      px[oy * W + ox] = up.px[uy * up.w + ux];
    }
    return { g: { w: W, h: H, px }, ox: cx - x0, oy: cy - y0 };
  }

  const ANG = 32;
  class Sprite {
    constructor(rows, o = {}) {
      this.raw = grid(rows, o.map);
      this.gx = o.gx ?? 0; this.gy = o.gy ?? 0;
      this.mx = o.mx ?? this.raw.w; this.my = o.my ?? this.raw.h / 2;
      this.noOutline = !!o.noOutline;
      this.out = this.noOutline ? this.raw : outline(this.raw);
      this.cv = toCanvas(this.out);
      this.w = this.out.w; this.h = this.out.h;
      this.rot = new Map();
    }
    rotated(ang, flip) {
      const step = Math.round(((ang % (Math.PI * 2)) + Math.PI * 2) / (Math.PI * 2 / ANG)) % ANG;
      const key = step * 2 + (flip ? 1 : 0);
      let r = this.rot.get(key);
      if (r) return r;
      const a = step * (Math.PI * 2 / ANG);
      const src = flip ? flipY(this.raw) : this.raw;
      const gy = flip ? this.raw.h - this.gy - 1 : this.gy;
      const res = rotate(src, a, this.gx + 0.5, gy + 0.5);
      const g = this.noOutline ? res.g : outline(res.g);
      r = { cv: toCanvas(g), ox: res.ox + (this.noOutline ? 0 : 1), oy: res.oy + (this.noOutline ? 0 : 1), a };
      this.rot.set(key, r);
      return r;
    }
    muzzle(ang, flip) {
      const dx = this.mx - this.gx, dy = (flip ? -(this.my - this.gy) : this.my - this.gy);
      const c = Math.cos(ang), s = Math.sin(ang);
      return [dx * c - dy * s, dx * s + dy * c];
    }
  }
  const S = (rows, o) => new Sprite(rows, o);

  const W = {};
  W.pistol = S([
    '.555555.',
    '34444446',
    '3333333.',
    '.332....',
    '.33.....',
    '.32.....'
  ], { gx: 2, gy: 4, mx: 8, my: 1 });
  W.revolver = S([
    '.2..........',
    '.36666666666',
    '345555555555',
    '3444y4......',
    '.Wu2........',
    'WWw.........',
    'Ww..........'
  ], { gx: 1, gy: 5, mx: 12, my: 2 });
  W.dual = S([
    '.yyyyyy.',
    'aYYYYYY7',
    'aaaaaaa.',
    '.aaw....',
    '.Ww.....',
    '.Ww.....'
  ], { gx: 2, gy: 4, mx: 8, my: 1 });
  W.smg = S([
    '.55555555...',
    '344444444446',
    '33333333....',
    '..332.2.....',
    '..33..2.....',
    '......2.....'
  ], { gx: 3, gy: 4, mx: 12, my: 1 });
  W.rifle = S([
    '......2....2....',
    '33..55555555555.',
    '3433444444444446',
    '3333333333332...',
    '.3...332.33.....',
    '.....33..33.....',
    '.........33.....'
  ], { gx: 6, gy: 4, mx: 16, my: 2 });
  W.minigun = S([
    '....5555555555555.',
    '..3344444444444446',
    '2333555555555555..',
    '2333444444444446..',
    '..33333333333333..',
    '...ee3....3.......',
    '...e33............'
  ], { gx: 4, gy: 5, mx: 18, my: 2 });
  W.shotgun = S([
    '.............2..',
    'WW..555555555555',
    'WuW344444444444.',
    'wWWW33333WWWWW..',
    '.www3.2..wwww...',
    '....33..........'
  ], { gx: 5, gy: 5, mx: 16, my: 1.5 });
  W.double = S([
    'uW.............',
    'WuW.55555555556',
    'wWWW44444444444',
    '.wWW33333333336',
    '..ww332........',
    '.....33........'
  ], { gx: 5, gy: 5, mx: 15, my: 2 });
  W.flak = S([
    '..G.....LLLL......',
    'GGLLLLLGLLLLGGGG5.',
    'gGGGGGGGGGGGG444446',
    'ggGGgggggggg333333.',
    '...gg3e.....g.....',
    '....33..........'
  ], { gx: 5, gy: 5, mx: 19, my: 2 });
  W.sniper = S([
    '......2222222.......',
    '.....3C66665c3......',
    'WW....2333332.......',
    'WuWW55555555555555556',
    'wWWWW444444444444444.',
    '.wwWW332.2..........',
    '...ww33.............'
  ], { gx: 6, gy: 6, mx: 21, my: 3 });
  W.railgun = S([
    '....3333333333......',
    '..33CCCCCCCCCC33....',
    '2234c4c4c4c4c4c4555C',
    '2233bbbbbbbbbbbb4447',
    '..33333333333333....',
    '...332..............',
    '....33..............'
  ], { gx: 4, gy: 5, mx: 20, my: 2.5 });
  W.crossbow = S([
    '.........W.....',
    '.........Ww....',
    'ww.......W.w...',
    'wWWWWWWWWWuuu57',
    'wwWWwwwwwW.w...',
    '...ww....Ww....',
    '.........W.....'
  ], { gx: 4, gy: 4, mx: 15, my: 3 });
  W.laser = S([
    '...3333333....',
    '..3kkkkkk43...',
    '.33KK6666667K.',
    '3334444444443k',
    '.33333333333..',
    '..332.........',
    '..33..........'
  ], { gx: 3, gy: 5, mx: 14, my: 2.5 });
  W.plasma = S([
    '....PPPPPPP....',
    '..PPmmmmmmmPP..',
    '3PPmK7KKKK7mPP3',
    '3pPPmmmmmmmPPp3',
    '..pppPPPPPppp..',
    '...33..........',
    '...32..........'
  ], { gx: 3, gy: 5, mx: 15, my: 2.5 });
  W.tesla = S([
    '.......yC......',
    '......CcC.y....',
    '.33333bCb333...',
    '3444bcCCCcb4447',
    '33333bcCcb3333.',
    '..332.bbb......',
    '..33...........'
  ], { gx: 3, gy: 5, mx: 15, my: 3 });
  W.freeze = S([
    '.....CCCC.....',
    '..666CC7C666..',
    '6667CCCCCC7666',
    '5555c55555c55C',
    '.555ccccccc5..',
    '..552.........',
    '..55..........'
  ], { gx: 3, gy: 5, mx: 14, my: 2.5 });
  W.sound = S([
    '......kkkk..',
    '..33.kKKKKk.',
    '3343kK7777Kk',
    '3333kK7..7Kk',
    '..33.kKKKKk.',
    '..32..kkkk..',
    '..33........'
  ], { gx: 2, gy: 5, mx: 12, my: 3 });
  W.eraser = S([
    '.......KKKKK',
    '...3333KKKKK',
    '3344444KkkkK',
    '.333333kkkkk',
    '...332......',
    '...33.......'
  ], { gx: 4, gy: 4, mx: 12, my: 2 });
  W.flame = S([
    '..eeeee.......',
    '.eoooooe......',
    '.eaaaaoe555556',
    '.eoooooe44444o',
    '..eeeee33333..',
    '......332.....',
    '......33......'
  ], { gx: 7, gy: 5, mx: 14, my: 3 });
  W.acid = S([
    '..lLLl........',
    '.lLLLLl.......',
    '.llllll3333336',
    '.GGGGGG444444l',
    '..gggg.3333...',
    '.......332....',
    '.......33.....'
  ], { gx: 8, gy: 5, mx: 14, my: 3 });
  W.paint = S([
    '...kyc......',
    '..kkyycc....',
    '...333333336',
    '..34444444k.',
    '..33333333..',
    '...332......',
    '...33.......'
  ], { gx: 4, gy: 5, mx: 12, my: 2.5 });
  W.rocket = S([
    '.......2........',
    'GGLLLLLLLLLLLLG.',
    'GGGGGGGGGGGGGGG2',
    'gGGGGGGGGGGGGGG2',
    'gggggggggggggg..',
    '.....g32.3......',
    '.....g33........'
  ], { gx: 6, gy: 5, mx: 16, my: 2.5 });
  W.homing = S([
    '..3.333........',
    '.36666666666...',
    '.355e5e5e5e553.',
    '3344444444444CC',
    '.333333333333..',
    '...332.........',
    '...33..........'
  ], { gx: 4, gy: 5, mx: 15, my: 3 });
  W.grenade = S([
    '..55.',
    '.4.4.',
    '.GLG.',
    'GLLGg',
    'GGGGg',
    '.ggg.'
  ], { gx: 2, gy: 3, mx: 3, my: 3 });
  W.cluster = S([
    '..55..',
    '.4..4.',
    '.eaoe.',
    'eaaooR',
    'eooooR',
    '.RRRR.'
  ], { gx: 2, gy: 3, mx: 3, my: 3 });
  W.sticky = S([
    '.ll...',
    'lLLl..',
    'lL7lG.',
    'lLLlG.',
    '.GGG..',
    '..e...'
  ], { gx: 2, gy: 3, mx: 3, my: 3 });
  W.mine = S([
    '..ee...',
    '.5ee5..',
    '5666665',
    '4444444',
    '.33333.'
  ], { gx: 3, gy: 3, mx: 4, my: 2 });
  W.nuke = S([
    '...yyyyyyyyy....',
    '.yy000yyy000yy..',
    'yyy0y0yyy0y0yyy2',
    'aay000yyy000aa22',
    '.aaaaaaaaaaaa...',
    '...a32..........',
    '....33..........'
  ], { gx: 4, gy: 5, mx: 16, my: 2.5 });
  W.blackhole = S([
    '..mm..',
    '.mPPm.',
    'mP00Pm',
    'mP00Pp',
    '.pPPp.',
    '..pp..'
  ], { gx: 2, gy: 3, mx: 3, my: 3 });
  W.chainsaw = S([
    '.....5.5.5.5.5.5.',
    '..aaa66666666666.',
    '.ayyya4444444444',
    'aayyyaa55555555.',
    'a333aaa.5.5.5.5.',
    '.3..3a..........',
    '..33............'
  ], { gx: 3, gy: 5, mx: 16, my: 2.5 });
  W.katana = S([
    '...................7',
    '................776.',
    '0e0e....666666665...',
    '0e0e3y556666665.....',
    '........55555.......'
  ], { gx: 2, gy: 3, mx: 19, my: 1 });
  W.hammer = S([
    '..........333.',
    '.........35553',
    '.........34443',
    'wWWWWWWWWW4443',
    '.wwwwwwwww3333',
    '..........333.',
    '..........333.'
  ], { gx: 2, gy: 3, mx: 12, my: 3 });
  W.wrecking = S([
    '..3.......',
    '.343.2222.',
    '..3.255552',
    '...2566652',
    '...2555552',
    '....22222.'
  ], { gx: 1, gy: 2, mx: 6, my: 3 });
  W.drill = S([
    '..aaaa77......',
    '.ayyyy7655....',
    'aay333y66545..',
    'a3y333y565455.',
    'aay333y66545..',
    '.a3yy336655...',
    '..33..........'
  ], { gx: 2, gy: 5, mx: 14, my: 3 });
  W.portal = S([
    '...5555......',
    '..566665.ooo.',
    '33566665ocCco',
    '3444444obCCbo',
    '.333333.occo.',
    '..332...ooo..',
    '..33.........'
  ], { gx: 3, gy: 5, mx: 13, my: 3 });
  W.gravity = S([
    '..aaaa........',
    '.a3333aa4.....',
    'a3666663a4.3..',
    'a34444443aa3oo',
    'a3333333a4.3..',
    '.aa332aa4.....',
    '...33.........'
  ], { gx: 4, gy: 5, mx: 14, my: 3 });
  W.magnet = S([
    '.....eeeee..',
    '...ee77eeee.',
    '33ee5....777',
    '3444.......5',
    '33ee5....777',
    '..3eeeeeee..',
    '..33.eeee...'
  ], { gx: 2, gy: 5, mx: 12, my: 3 });
  W.ballgun = S([
    '..kkk..cc.....',
    '.kKKKkcCCc....',
    '.kKKKkc555555.',
    '33kkk3344444..',
    '.3333333333...',
    '...332........',
    '...33.........'
  ], { gx: 4, gy: 5, mx: 13, my: 2.5 });
  W.boomerang = S([
    'WW.....',
    'Wuu....',
    '.WuW...',
    '..WuW..',
    '...WuWW',
    '....Wuu'
  ], { gx: 1, gy: 1, mx: 6, my: 5 });
  W.airstrike = S([
    '...e7e..',
    '..eee77.',
    '.33333..',
    '3eeeee3.',
    '3e777e3.',
    '.33333..',
    '..332...'
  ], { gx: 3, gy: 6, mx: 4, my: 1 });
  W.orbital = S([
    '....C.C...',
    '...cCcC...',
    '..3c7cc3..',
    '.3355553..',
    '3334444333',
    '..33..33..',
    '..32......'
  ], { gx: 2, gy: 6, mx: 5, my: 1 });
  W.meteor = S([
    '...aoo..',
    '..ayoee.',
    '.ayyoo3.',
    '.aoo332.',
    '..e3322.',
    '...222..'
  ], { gx: 3, gy: 4, mx: 4, my: 2 });
  W.bees = S([
    '..yyyy..',
    '.y0y0yy.',
    'ayyyyyya',
    'a0aaaa0a',
    '.aaaaaa.',
    '..W..W..',
    '..WWWW..'
  ], { gx: 2, gy: 6, mx: 6, my: 2 });
  W.tornado = S([
    '666666666',
    '.5666665.',
    '..56665..',
    '...565...',
    '....5....',
    '...3.....',
    '..33.....'
  ], { gx: 3, gy: 6, mx: 6, my: 1 });
  W.quake = S([
    '...3333...',
    '..355553..',
    '.35666653.',
    '.34eeee43.',
    '..344443..',
    '...3333...',
    '....W.....',
    '....W.....'
  ], { gx: 4, gy: 7, mx: 5, my: 3 });
  W.nailgun = S([
    '..eeeeeee....',
    '.eRRRRRRe5556',
    '.eeeeeeee444.',
    '...R33.......',
    '...e3........',
    '...e3........'
  ], { gx: 3, gy: 4, mx: 13, my: 1.5 });
  W.harpoon = S([
    '..............6.',
    'WW.3333333333366',
    'WuW444444444445.',
    'wWWW33333333336.',
    '.www332.......6.',
    '....33..........'
  ], { gx: 5, gy: 5, mx: 16, my: 2 });
  W.lava = S([
    '..RRRR........',
    '.RoaaoR.......',
    '.Roayao33333.',
    '.RoaaoR444446',
    '..RRRR.3333..',
    '.......332...',
    '.......33....'
  ], { gx: 8, gy: 5, mx: 13, my: 3 });
  W.firework = S([
    '........k.y.c.',
    '..PPPPPPPPPPPm',
    '3PmmmmmmmmmmPm',
    '3PPPPPPPPPPPP.',
    '..pp332.......',
    '....33........'
  ], { gx: 5, gy: 4, mx: 14, my: 2 });
  W.confetti = S([
    '.k.y......',
    'c..eekkyyc',
    '..e7KK7KYy',
    '33eKKKKKYy',
    '33.eekkyyc',
    '..332.....',
    '..33......'
  ], { gx: 2, gy: 5, mx: 10, my: 2.5 });
  W.flare = S([
    '....eee.',
    '..eeR7Re',
    '33eRRRRe',
    '3444eee.',
    '.332....',
    '.33.....'
  ], { gx: 2, gy: 4, mx: 8, my: 2 });
  W.water = S([
    '...cccc.......',
    '..cCCCCc......',
    '..cCCCCc555556',
    '..bcccc644444c',
    '...bbbb.3333..',
    '.......332....',
    '.......33.....'
  ], { gx: 8, gy: 5, mx: 14, my: 3 });
  W.snowball = S([
    '.666.',
    '67776',
    '67766',
    '66665',
    '.555.'
  ], { gx: 2, gy: 2, mx: 3, my: 2 });
  W.banana = S([
    '......w',
    '.....yy',
    '....yya',
    '..yyya.',
    'yyyaa..',
    '.aa....'
  ], { gx: 2, gy: 4, mx: 5, my: 2 });
  W.glitch = S([
    '.kCkCkCkC.',
    'kCPkPCkPCk',
    'CPk7Pk7PkC',
    'kCPkCPkCPk',
    '.CkCkCkCk.',
    '..332.....',
    '..33......'
  ], { gx: 2, gy: 5, mx: 10, my: 2.5 });

  W.whip = S([
    '.....WWw...',
    '...Ww...w..',
    '.uW......w.',
    'uWWu......y',
    'wwW........',
    '.w.........'
  ], { gx: 1, gy: 3, mx: 10, my: 3 });
  W.glove = S([
    '.......eee.',
    '.5.5.5eeYee',
    '5.5.5.eeeee',
    '.5.5.5eeeeR',
    '33.....eRR.'
  ], { gx: 1, gy: 3, mx: 10, my: 2 });
  W.saw = S([
    '....7.7.7..',
    '.33.56565.',
    '3443565656',
    '3a4a.56565',
    '.3a3..7.7.',
    '..33......'
  ], { gx: 2, gy: 4, mx: 9, my: 2 });
  W.backspace = S([
    '666666666',
    '6555e5556',
    '655ee7756',
    '6555e5556',
    '666666666',
    '..33.....',
    '..33.....'
  ], { gx: 3, gy: 5, mx: 8, my: 2 });
  W.cutter = S([
    '7.....7..',
    '.7...7...',
    '..7.7....',
    '...6.....',
    '..e.e....',
    '.e...e...',
    '.e...e...',
    '..eee....'
  ], { gx: 4, gy: 6, mx: 4, my: 0 });
  W.vacuum = S([
    '..cccccc.....',
    '.cCCCCCc44444',
    'ccCC7Ccc555554',
    'ccccccc.4444.',
    '.c3..3c......',
    '..33.........'
  ], { gx: 3, gy: 4, mx: 13, my: 2 });
  W.pen = S([
    '........77',
    '......nnb7',
    '....nnbb..',
    '..nnbbn...',
    '.5nbbn....',
    '565n......',
    '.5........'
  ], { gx: 3, gy: 4, mx: 0, my: 6 });
  W.lens = S([
    '....5555..',
    '...5CCC75.',
    '..5CC77C75',
    '..5CCCC7C5',
    '..5CCCCCC5',
    '...5CCCC5.',
    '..u.5555..',
    '.uW.......',
    'uW........'
  ], { gx: 1, gy: 7, mx: 10, my: 4 });
  W.stamp = S([
    '..WWW....',
    '..uWu....',
    '..WWW....',
    '...w.....',
    '.eeeeeee.',
    '.RRRRRRR.',
    '.eReReRe.'
  ], { gx: 3, gy: 2, mx: 4, my: 6 });
  W.blower = S([
    '...aaaa.......',
    '..aYYYaa55555.',
    '.aa0YaaaC6666C',
    '.aaaaaa.55555.',
    '..3..3........',
    '..33..........'
  ], { gx: 3, gy: 4, mx: 14, my: 2 })
  ;
  W.bowling = S([
    '..1111..',
    '.122221.',
    '12P2P221',
    '1222P221',
    '12222221',
    '.122221.',
    '..1111..'
  ], { gx: 3, gy: 3, mx: 4, my: 3 });
  W.lightning = S([
    '..........y.',
    '.........yY.',
    'wwWWWWWWuyy.',
    '.wwwwwwwwyY.',
    '.........y..',
    '..........y.'
  ], { gx: 2, gy: 3, mx: 11, my: 1 });
  W.termites = S([
    '.5555.',
    '.4444.',
    'C7CCCC',
    'Cw7wCC',
    'CCwCwC',
    'CwCCwC',
    '.CCCC.'
  ], { gx: 2, gy: 4, mx: 3, my: 2 });
  W.antigrav = S([
    '..55..',
    '.4..4.',
    '.mKKm.',
    'mK7KKp',
    'mKKKKp',
    '.pppp.'
  ], { gx: 2, gy: 3, mx: 3, my: 3 });
  const PROJ = {
    bullet: S(['y7'], { noOutline: true, gx: 1, gy: 0 }),
    bigbullet: S(['ay7', 'ay7'], { noOutline: true, gx: 2, gy: 1 }),
    rocket: S(['.GG.....', 'eGLLLLL7', 'eGGGGGG5', '.gg.....'], { gx: 4, gy: 1.5 }),
    missile: S(['e555c', 'e4444'], { gx: 2, gy: 1 }),
    grenade: W.grenade, cluster: W.cluster, sticky: W.sticky, mine: W.mine,
    bomblet: S(['.e.', 'eoe', '.e.'], { gx: 1, gy: 1 }),
    bomb: S(['.33.', '3443', '3443', '3443', '.33.', 'e33e'], { gx: 2, gy: 3 }),
    nuke: S(['..3333..', '.3yyyy3e', '3y0yy0yee', '.3yyyy3e', '..3333..'], { gx: 4, gy: 2 }),
    plasma: S(['.mm.', 'mK7m', 'm77m', '.mm.'], { gx: 2, gy: 2 }),
    ball: S(['.kk.', 'kK7k', 'kKKk', '.kk.'], { gx: 2, gy: 2 }),
    boomerang: W.boomerang,
    bolt: S(['www5557', '.....6.'], { gx: 3, gy: 0 }),
    harpoon: S(['WW55556', '....6..'], { gx: 3, gy: 0 }),
    nail: S(['556'], { noOutline: true, gx: 1, gy: 0 }),
    bee: S(['.66.', 'y0y0', 'yyya'], { gx: 2, gy: 1 }),
    meteor: S(['..oaa.', '.oayYa', 'oayYY7', 'oaayYa', '.ooaa.', '..oo..'], { gx: 3, gy: 3 }),
    flare: S(['7e', 'ee', 'RR'], { gx: 1, gy: 1 }),
    blackhole: W.blackhole,
    beacon: S(['.c.', 'cCc', '333'], { gx: 1, gy: 1 }),
    snowball: W.snowball,
    banana: W.banana,
    firework: S(['k.....', 'PPPPmy', 'k.....'], { gx: 3, gy: 1 }),
    flak: S(['.G.', 'GLG', '.G.'], { gx: 1, gy: 1 }),
    pellet: S(['a'], { noOutline: true, gx: 0, gy: 0 }),
    portalB: S(['.cc.', 'cCCc', 'cCCc', '.cc.'], { gx: 2, gy: 2 }),
    portalO: S(['.oo.', 'oaao', 'oaao', '.oo.'], { gx: 2, gy: 2 }),
    coin: S(['.yy.', 'ya7y', 'yaay', '.yy.'], { gx: 2, gy: 2 }),
    cookie: S(['.ww.', 'wuWu', 'uWuu', '.uu.'], { gx: 2, gy: 2 }),
    check: S(['...l', 'l.l.', '.l..'], { gx: 2, gy: 1 }),
    mail: S(['77777', '76667', '77777'], { gx: 2, gy: 1 }),
    click: S(['.7.', '7c7', '.7.'], { gx: 1, gy: 1 }),
    bowl: S(['.111.', '12221', '1P2P1', '12221', '.111.'], { gx: 2, gy: 2 }),
    jar: W.termites,
    agrav: W.antigrav,
    floppy: S(['bbbbbbb.', 'b7777bbb', 'b7777b.b', 'bbbbbbbb', 'bnyyyynb', 'bnyyyynb', 'bbbbbbbb'], { gx: 4, gy: 3 })
  };

  const HEAD = [
    '...w..w.',
    '..wWwwWw',
    '.wWWWWWw',
    'Reeeeeee',
    'wwSSS0S.',
    'wSSSS0SS',
    '.uSSSSu.'
  ];
  const HEAD_BLINK = [
    '...w..w.',
    '..wWwwWw',
    '.wWWWWWw',
    'Reeeeeee',
    'wwSSSSS.',
    'wSSSS0SS',
    '.uSSSSu.'
  ];
  const HEAD_HURT = [
    '...w..w.',
    '..wWwwWw',
    '.wWWWWWw',
    'Reeeeeee',
    'wwSS0S0.',
    'wSSSS0SS',
    '.uSS0Su.'
  ];
  const HEAD_HAPPY = [
    '...w..w.',
    '..wWwwWw',
    '.wWWWWWw',
    'Reeeeeee',
    'wwSS0.0.',
    'wSSSSSSS',
    '.uS00Su.'
  ];
  const TORSO = [
    '.ccbbb.',
    'cbbbbbn',
    'cbbbbbn',
    'bbbbbnn',
    '.nnnnn.'
  ];
  const LEGS = {
    stand: ['.22.22.', '.22.22.', '.32.32.', '.77.77.'],
    run0: ['.22.22.', '22...22', '32....3', '77....7'],
    run1: ['.2222..', '.22.22.', '.32..3.', '.77..77'],
    run2: ['..222..', '..222..', '..322..', '..777..'],
    run3: ['..2222.', '.22.22.', '.3..32.', '77..77.'],
    run4: ['.22.22.', '22...22', '3....23', '7....77'],
    run5: ['..22...', '..222..', '..322..', '..777..'],
    jump: ['.2222..', '.2.22..', '.77.32.', '....77.'],
    fall: ['.22.22.', '22...22', '7.....3', '......7'],
    wall: ['.2222..', '..2.22.', '.77.32.', '....77.'],
    land: ['2222222', '22...22', '32...23', '77...77'],
    dash: ['22222..', '322....', '77.....', '.......'],
    hurt: ['.22.22.', '.22..22', '.32...3', '.77...7'],
    skid: ['..222..', '.22.22.', '32...22', '7.....77'],
    kick0: ['.2222..', '.22.2..', '.32.77.', '.77....'],
    kick1: ['.22222222', '.22...377', '.32......', '.77......'],
    stomp: ['.2222..', '.22.22.', '.22.22.', '.77.77.'],
    tuck: ['.2222..', '.22222.', '..7777.', '.......'],
    climb0: ['.2222..', '.22..2.', '.32..3.', '.77..7.'],
    climb1: ['..222..', '.22.22.', '.3..32.', '7...77.'],
    glide: ['.22.22.', '..2.2..', '..3.3..', '..7.7..'],
    jet: ['..222..', '..2.2..', '..2.3..', '..7.7..']
  };
  const BACKARM = { hang: [[0, 0], [0, 1], [0, 2], [0, 3]], fwd: [[0, 0], [1, 1], [1, 2], [2, 3]], back: [[0, 0], [-1, 1], [-1, 2], [-2, 3]], up: [[0, 0], [0, -1], [0, -2], [0, -3]], wide: [[0, 0], [-1, 0], [-2, 1], [-3, 1]] };
  const TAILS = [
    [[-1, 0, 'e'], [-2, 0, 'e'], [-3, 1, 'R'], [-1, 1, 'R'], [-2, 2, 'e']],
    [[-1, 0, 'e'], [-2, 1, 'e'], [-3, 1, 'e'], [-1, 1, 'R'], [-4, 2, 'R']],
    [[-1, 0, 'e'], [-2, 0, 'e'], [-3, 0, 'R'], [-4, 1, 'e'], [-2, 1, 'R']],
    [[-1, 0, 'e'], [-2, -1, 'e'], [-3, -1, 'R'], [-4, -2, 'e'], [-1, 1, 'R']],
    [[-1, 0, 'e'], [-1, 1, 'R'], [-1, 2, 'e'], [-2, 3, 'R'], [-2, 2, 'e']]
  ];
  const FW = 18, FH = 21;
  function composeFrame(o) {
    const g = [];
    for (let y = 0; y < FH; y++) g.push(new Array(FW).fill('.'));
    const put = (x, y, ch) => { if (x >= 0 && y >= 0 && x < FW && y < FH && ch !== '.') g[y][x] = ch; };
    const stamp = (rows, ox, oy) => rows.forEach((r, y) => [...r].forEach((ch, x) => put(ox + x, oy + y, ch)));
    const bx = 6 + (o.lean || 0), by = (o.bob || 0);
    const legs = LEGS[o.legs || 'stand'];
    const legY = FH - 4;
    const torsoY = legY - 5 + by + (o.squash || 0);
    const headY = torsoY - 7 + (o.headBob || 0) + (o.squash ? 1 : 0);
    const arm = BACKARM[o.arm || 'hang'];
    const body = o.part !== 'head', headP = o.part !== 'body';
    if (body) {
      for (const [dx, dy] of arm) put(bx + 1 + dx, torsoY + 1 + dy, dy === arm[arm.length - 1][1] && dx === arm[arm.length - 1][0] ? 'u' : 'n');
      stamp(legs, bx, legY);
      stamp(TORSO, bx, torsoY);
    }
    if (headP) {
      stamp(o.head || HEAD, bx + (o.headX || 0), headY);
      for (const [dx, dy, ch] of TAILS[o.tails || 0]) put(bx + (o.headX || 0) + dx, headY + 3 + dy, ch);
      if (o.acc) for (const [dx, dy, ch] of o.acc) put(bx + (o.headX || 0) + dx, headY + dy, ch);
    }
    return { rows: g.map((r) => r.join('')), shoulder: [bx + 4, torsoY + 1] };
  }
  const ANIMS = {
    idle: [{ tails: 0 }, { tails: 0 }, { tails: 1, headBob: 1 }, { tails: 1, headBob: 1, head: HEAD_BLINK }],
    run: [{ legs: 'run0', arm: 'fwd', tails: 2 }, { legs: 'run1', arm: 'hang', bob: -1, tails: 1 }, { legs: 'run2', arm: 'back', tails: 2, bob: -1 }, { legs: 'run3', arm: 'back', tails: 3 }, { legs: 'run4', arm: 'hang', bob: -1, tails: 2 }, { legs: 'run5', arm: 'fwd', tails: 1, bob: -1 }],
    jump: [{ legs: 'jump', arm: 'up', tails: 4, bob: -1 }, { legs: 'jump', arm: 'up', tails: 4 }],
    fall: [{ legs: 'fall', arm: 'wide', tails: 3 }, { legs: 'fall', arm: 'wide', tails: 1 }],
    wall: [{ legs: 'wall', arm: 'up', tails: 0, lean: -1 }, { legs: 'wall', arm: 'up', tails: 1, lean: -1 }],
    land: [{ legs: 'land', squash: 2, arm: 'wide', tails: 4 }, { legs: 'land', squash: 1, arm: 'hang', tails: 0 }],
    hurt: [{ legs: 'hurt', head: HEAD_HURT, arm: 'up', tails: 3, headX: -1 }, { legs: 'hurt', head: HEAD_HURT, arm: 'wide', tails: 2 }],
    victory: [{ legs: 'stand', head: HEAD_HAPPY, arm: 'up', tails: 0 }, { legs: 'jump', head: HEAD_HAPPY, arm: 'up', tails: 4, bob: -2 }, { legs: 'jump', head: HEAD_HAPPY, arm: 'up', tails: 4, bob: -3 }, { legs: 'stand', head: HEAD_HAPPY, arm: 'up', tails: 1, bob: -1 }],
    dash: [{ legs: 'dash', arm: 'back', tails: 2, lean: 1, headX: 1 }, { legs: 'dash', arm: 'back', tails: 3, lean: 1, headX: 1 }],
    idle2: [{ tails: 0, head: HEAD_BLINK }, { tails: 1, headX: 1 }, { tails: 1, headX: 1 }, { tails: 2, headX: 1, headBob: 1 }, { tails: 0 }, { tails: 0, headX: -1 }, { tails: 1, headX: -1 }, { tails: 0 }],
    idle3: [{ legs: 'stand', arm: 'up', tails: 0, bob: -1 }, { legs: 'stand', arm: 'up', tails: 1, bob: -1, head: HEAD_BLINK }, { legs: 'land', arm: 'wide', tails: 2, squash: 1 }, { tails: 0 }],
    apex: [{ legs: 'tuck', arm: 'wide', tails: 4, bob: -1 }],
    skid: [{ legs: 'skid', arm: 'wide', tails: 2, lean: -1, headX: -1 }],
    kick: [{ legs: 'kick0', arm: 'back', tails: 2, lean: -1 }, { legs: 'kick1', arm: 'back', tails: 3, lean: -1 }, { legs: 'kick1', arm: 'back', tails: 4, lean: -1 }, { legs: 'kick0', arm: 'hang', tails: 2 }],
    stomp: [{ legs: 'tuck', arm: 'up', tails: 4, bob: -1 }, { legs: 'stomp', arm: 'up', tails: 3 }, { legs: 'stomp', arm: 'wide', tails: 3 }],
    uppercut: [{ legs: 'land', arm: 'back', tails: 1, squash: 1 }, { legs: 'jump', arm: 'up', tails: 4, bob: -2 }, { legs: 'jump', arm: 'up', tails: 4, bob: -2 }],
    pound: [{ legs: 'tuck', arm: 'up', tails: 4, bob: -1 }, { legs: 'tuck', arm: 'up', tails: 0, bob: -1 }],
    jet: [{ legs: 'jet', arm: 'wide', tails: 4, bob: -1 }, { legs: 'jet', arm: 'wide', tails: 3 }],
    glide: [{ legs: 'glide', arm: 'up', tails: 1 }, { legs: 'glide', arm: 'up', tails: 2 }],
    climb: [{ legs: 'climb0', arm: 'up', tails: 0, lean: 1 }, { legs: 'climb1', arm: 'fwd', tails: 1, lean: 1 }],
    swing: [{ legs: 'jump', arm: 'up', tails: 3 }, { legs: 'fall', arm: 'up', tails: 2 }]
  };
  const SKINS = [
    { id: 'hero', name: 'Wrecker', desc: 'The original. Hoodie, headband, zero regrets.', map: {}, need: { type: 'free' } },
    { id: 'ninja', name: 'Shadow', desc: 'Silent, deadly, still very loud.', map: { c: '3', b: '2', n: '1', w: '1', W: '2', '2': '1', '3': '2', '7': '3' }, need: { type: 'stars', n: 6 } },
    { id: 'frog', name: 'Ribbit', desc: 'Licks pixels for fun.', map: { c: 'L', b: 'l', n: 'G', w: 'G', W: 'l', S: 'L', u: 'l', e: 'k', R: 'p', '7': 'y' }, need: { type: 'scrap', n: 1500 } },
    { id: 'robot', name: 'Unit 404', desc: 'Built to destroy pages. Literally.', map: { c: '6', b: '5', n: '4', w: '3', W: '4', S: '5', u: '4', '0': 'C', e: 'c', R: 'b', '2': '3', '3': '4', '7': '6' }, need: { type: 'ach', n: 8 } },
    { id: 'royal', name: 'Monarch', desc: 'All pages are subjects. All subjects are rubble.', map: { c: 'm', b: 'P', n: 'p', e: 'y', R: 'a', '7': 'y' }, acc: [[2, -2, 'y'], [4, -2, 'y'], [6, -2, 'y'], [2, -1, 'a'], [3, -1, 'y'], [4, -1, 'a'], [5, -1, 'y'], [6, -1, 'a']], need: { type: 'stars', n: 18 } },
    { id: 'hazmat', name: 'Hazmat', desc: 'Acid-proof. Fun-proof? Never.', map: { c: 'Y', b: 'y', n: 'a', w: 'a', W: 'y', e: '2', R: '1', '2': '2', '7': '2' }, need: { type: 'scrap', n: 4000 } },
    { id: 'cat', name: 'Knocker', desc: 'Pushes things off tables. And pages.', map: { c: 'a', b: 'o', n: 'R', w: 'o', W: 'a', e: 'K', R: 'k' }, acc: [[1, -1, 'o'], [2, -2, 'o'], [2, -1, 'K'], [6, -2, 'o'], [6, -1, 'K'], [7, -1, 'o']], need: { type: 'ach', n: 15 } },
    { id: 'ghost', name: 'Phantom', desc: 'Already deleted. Came back anyway.', map: { c: '7', b: '6', n: '5', w: '6', W: '7', S: '7', u: '6', '2': '5', '3': '6', '7': '6', e: 'C', R: 'c' }, need: { type: 'wave', n: 8 } },
    { id: 'gold', name: 'Golden', desc: 'For people who finished everything.', map: { c: 'Y', b: 'y', n: 'a', w: 'a', W: 'y', S: 'Y', u: 'y', e: '7', R: 'Y', '2': 'a', '3': 'y', '7': 'Y' }, need: { type: 'stars', n: 36 } },
    { id: 'glitch', name: 'Glitch', desc: 'Corrupted save file in human form.', map: { c: 'C', b: 'k', n: 'p', w: 'P', W: 'c', e: 'l', R: 'G', '7': 'C' }, need: { type: 'pixels', n: 2000000 } },
    { id: 'dave', name: 'Dave 98', desc: 'Best viewed in 800x600.', map: { c: 'l', b: 'G', n: 'g', e: 'c', R: 'b' }, acc: [[1, 0, 'e'], [2, 0, 'e'], [3, -1, 'e'], [4, -1, 'e'], [5, -1, 'e'], [6, 0, 'e'], [7, 0, 'e'], [8, 0, 'R'], [9, 0, 'R']], need: { type: 'page', n: 'retro' } },
    { id: 'lava', name: 'Magma', desc: 'Leaves scorch marks on everything.', map: { c: 'a', b: 'e', n: 'R', w: '1', W: '2', e: 'y', R: 'a', '7': 'o' }, need: { type: 'burn', n: 50000 } }
  ];
  const skinCache = new Map();
  function playerFrames(skinId) {
    if (skinCache.has(skinId)) return skinCache.get(skinId);
    const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
    const out = {};
    for (const k in ANIMS) {
      out[k] = ANIMS[k].map((def) => {
        const f = composeFrame({ ...def, acc: skin.acc });
        const g = outline(grid(f.rows, skin.map));
        const gl = flipX(g);
        const gb = outline(grid(composeFrame({ ...def, acc: skin.acc, part: 'body' }).rows, skin.map));
        const gh = outline(grid(composeFrame({ ...def, acc: skin.acc, part: 'head' }).rows, skin.map));
        return { r: toCanvas(g), l: toCanvas(gl), bodyR: toCanvas(gb), bodyL: toCanvas(flipX(gb)), headR: toCanvas(gh), headL: toCanvas(flipX(gh)), w: g.w, h: g.h, shoulder: [f.shoulder[0] + 1, f.shoulder[1] + 1], white: toCanvas(tint(g, P32['7'])), whiteL: toCanvas(tint(gl, P32['7'])) };
      });
    }
    const armRows = ['bbbS'];
    const arm = new Sprite(armRows, { map: skin.map, gx: 0, gy: 0, mx: 3, my: 0 });
    const res = { anims: out, arm, skin };
    skinCache.set(skinId, res);
    return res;
  }

  function sheet(frames, size, painter) {
    const cvs = [];
    for (let f = 0; f < frames; f++) {
      const g = { w: size, h: size, px: new Uint32Array(size * size) };
      painter(g, f, frames);
      cvs.push(toCanvas(g));
    }
    return cvs;
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const dith = (x, y, t) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < t;
  const FIRE_RAMP = ['7', 'Y', 'y', 'a', 'o', 'e', 'R', 'r'].map((k) => P32[k]);
  const SMOKE_RAMP = ['5', '4', '3', '2'].map((k) => P32[k]);
  const ICE_RAMP = ['7', 'C', 'c', 'b'].map((k) => P32[k]);
  const PURP_RAMP = ['7', 'K', 'm', 'P', 'p'].map((k) => P32[k]);
  const GREEN_RAMP = ['Y', 'L', 'l', 'G', 'g'].map((k) => P32[k]);
  function explosionSheet(size, ramp = FIRE_RAMP, smoke = SMOKE_RAMP, seed = 1) {
    const N = 9;
    const lobes = [];
    const r = WTP.rng(seed * 977 + size);
    for (let i = 0; i < 7; i++) lobes.push({ a: r() * Math.PI * 2, d: 0.25 + r() * 0.35, s: 0.35 + r() * 0.3 });
    return sheet(N, size, (g, f) => {
      const t = f / (N - 1);
      const c = size / 2;
      const R = c * (0.35 + 0.65 * Math.min(1, t * 2.2));
      const heat = 1 - t;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - c, dy = y + 0.5 - c;
        let v = 0;
        const base = Math.hypot(dx, dy) / R;
        v = Math.max(v, 1 - base);
        for (const L of lobes) {
          const lx = c + Math.cos(L.a) * L.d * R * (0.6 + t), ly = c + Math.sin(L.a) * L.d * R * (0.6 + t) - t * R * 0.25;
          const lr = L.s * R * (0.8 + t * 0.5);
          v = Math.max(v, 1 - Math.hypot(x + 0.5 - lx, y + 0.5 - ly) / lr);
        }
        if (v <= 0) continue;
        if (t > 0.45) {
          const hole = (t - 0.45) * 1.8;
          if (v < hole * 0.6 && !dith(x, y, 0.5)) continue;
        }
        let k = (1 - v) * 0.9 + (1 - heat) * 0.9;
        if (k < 0) k = 0;
        const fireN = ramp.length;
        const total = fireN + smoke.length;
        let idx = k * total * 0.62;
        const fl = Math.floor(idx), fr = idx - fl;
        let ci = fl + (dith(x, y, fr) ? 1 : 0);
        if (ci >= total) continue;
        if (t > 0.7 && ci < fireN && dith(x + 1, y, (t - 0.7) * 3)) ci = fireN + Math.min(smoke.length - 1, ci % smoke.length);
        g.px[y * size + x] = ci < fireN ? ramp[ci] : smoke[ci - fireN];
      }
    });
  }
  const EXPL = {};
  function explosions() {
    if (EXPL.fire) return EXPL;
    EXPL.fire = [16, 24, 32, 48, 64, 96].map((s, i) => ({ size: s, frames: explosionSheet(s, FIRE_RAMP, SMOKE_RAMP, i + 1) }));
    EXPL.ice = [16, 32, 48].map((s, i) => ({ size: s, frames: explosionSheet(s, ICE_RAMP, ['6', '5', '4'].map((k) => P32[k]), i + 3) }));
    EXPL.plasma = [16, 32, 48].map((s, i) => ({ size: s, frames: explosionSheet(s, PURP_RAMP, ['m', 'p', '2'].map((k) => P32[k]), i + 5) }));
    EXPL.acid = [16, 32].map((s, i) => ({ size: s, frames: explosionSheet(s, GREEN_RAMP, ['G', 'g', '2'].map((k) => P32[k]), i + 7) }));
    EXPL.ring = [32, 64, 128].map((s) => ({
      size: s, frames: sheet(7, s, (g, f, n) => {
        const t = (f + 1) / n, c = s / 2, R = c * t, th = Math.max(1, 3 * (1 - t) * (s / 32));
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
          if (Math.abs(d - R + th / 2) < th / 2 + 0.3 && dith(x, y, 1.2 - t)) g.px[y * s + x] = t < 0.5 ? P32['7'] : P32['6'];
        }
      })
    }));
    EXPL.smoke = [8, 12, 16].map((s) => ({
      size: s, frames: sheet(6, s, (g, f, n) => {
        const t = f / (n - 1), c = s / 2, R = c * (0.6 + t * 0.4);
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
          const d = Math.hypot(x + 0.5 - c, y + 0.5 - c) / R;
          if (d > 1) continue;
          if (!dith(x, y, 1.05 - t * 0.9)) continue;
          g.px[y * s + x] = d < 0.45 && y < c ? P32['5'] : d < 0.8 ? P32['4'] : P32['3'];
        }
      })
    }));
    EXPL.flash = {};
    const flashShapes = {
      small: { s: 9, rays: 4, len: 0.9, ramp: ['7', 'Y', 'y', 'a'] },
      big: { s: 15, rays: 6, len: 1, ramp: ['7', 'Y', 'y', 'a', 'o'] },
      energy: { s: 11, rays: 4, len: 0.8, ramp: ['7', 'C', 'c', 'b'] },
      pink: { s: 11, rays: 4, len: 0.8, ramp: ['7', 'K', 'k', 'P'] },
      green: { s: 11, rays: 5, len: 0.8, ramp: ['Y', 'L', 'l', 'G'] },
      fire: { s: 13, rays: 3, len: 1, ramp: ['Y', 'y', 'a', 'o', 'e'] }
    };
    for (const k in flashShapes) {
      const F = flashShapes[k];
      EXPL.flash[k] = sheet(3, F.s, (g, f) => {
        const s = F.s, cy = s / 2, k2 = 1 - f * 0.3;
        for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
          const dx = x + 0.5, dy = y + 0.5 - cy;
          const a = Math.atan2(dy, dx);
          const ray = Math.pow(Math.abs(Math.cos(a * F.rays / 2)), 3);
          const reach = (s * 0.35 + ray * s * 0.65 * F.len) * k2 * (Math.abs(a) < 1.25 ? 1 : 0.35);
          const d = Math.hypot(dx, dy);
          if (d > reach) continue;
          const q = d / reach;
          const idx = Math.min(F.ramp.length - 1, Math.floor(q * F.ramp.length + f * 0.6));
          g.px[y * s + x] = P32[F.ramp[idx]];
        }
      });
    }
    EXPL.slash = sheet(4, 32, (g, f) => {
      const c = 16, R = 14 - f;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - c, dy = y + 0.5 - c, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
        const span = 1.6 - f * 0.25;
        if (a < -span || a > span) continue;
        const thick = (1 - Math.abs(a) / span) * (4 - f);
        if (d > R || d < R - thick) continue;
        g.px[y * 32 + x] = d > R - 1 ? P32['7'] : d > R - 2.5 ? P32['C'] : P32['c'];
      }
    });
    return EXPL;
  }

  const ENEMY = {
    ad: S([
      'bbbbbbbbbbbbbbbbbbbbbb',
      'bcccccccccccccccce7e7b',
      'bCCCCCCCCCCCCCCCCe7e6b',
      'byyyyyyyyyyyyyyyyyyyyb',
      'byyyyyyyyyyyyyyyyyyyyb',
      'byyyyyyyyyyyyyyyyyyyyb',
      'byyyyyyyyyyyyyyyyyyyyb',
      'byyyyyyyyyyyyyyyyyyyyb',
      'byyyyyyyyyyyyyyyyyyyyb',
      'b777777llllllll777777b',
      'b777777lL7L7LLl777777b',
      'b777777llllllll777777b',
      'b77777777777777777777b',
      'bbbbbbbbbbbbbbbbbbbbbb'
    ], { gx: 11, gy: 7 }),
    captcha: S([
      '6666666666666',
      '6777777777776',
      '6766676777776',
      '6766676c7c7c6',
      '6766676777776',
      '6777777777776',
      '6745777777776',
      '6744777C7c776',
      '6777777777776',
      '6777777777776',
      '6666666666666',
      '..33.....33..'
    ], { gx: 6, gy: 6 }),
    cookie: S([
      '6666666666666666666666666666666666666',
      '67777777777777777777777777777777777y6',
      '67www7u7u777777uuuu777777777777777y76',
      '67wuWw7777777u7u7u7u77777cccccccc7776',
      '67uWuu7777777u7u7u7u7777cbbbbbbbbc776',
      '67.uu77777777777777777777cccccccc7776',
      '67777777777777777777777777777777777776',
      '6666666666666666666666666666666666666'
    ], { gx: 18, gy: 4 }),
    cursor: S([
      '7......',
      '77.....',
      '767....',
      '7667...',
      '76667..',
      '766667.',
      '7666777',
      '767.67.',
      '77..67.',
      '7....67',
      '.....7.'
    ], { gx: 3, gy: 4 }),
    modal: S([
      '22222222222222222222222222222222222222222222',
      '2PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP7P7P2',
      '2mmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmP7P72',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777777777777777777777777777777777777777772',
      '27777666666666666666666666666666666666677772',
      '27777677777777777777777777777777777777677772',
      '27777666666666666666666666666666666666677772',
      '27777777777777777777777777777777777777777772',
      '277777777kkkkkkkkkkkkkkkkkkkkkkkkkk777777772',
      '277777777kkkkkkkkkkkkkkkkkkkkkkkkkk777777772',
      '277777777kkkkkkkkkkkkkkkkkkkkkkkkkk777777772',
      '277777777kkkkkkkkkkkkkkkkkkkkkkkkkk777777772',
      '277777777kkkkkkkkkkkkkkkkkkkkkkkkkk777777772',
      '27777777777777777777777777777777777777777772',
      '22222222222222222222222222222222222222222222'
    ], { gx: 22, gy: 11 }),
    heart: S(['.ee.ee.', 'eKeeeee', 'eeeeeee', '.eeeee.', '..eee..', '...e...'], { gx: 3, gy: 3 }),
    scrap: S(['.4.', '465', '.5.'], { gx: 1, gy: 1 })
  };

  const ICON_ROWS = {
    play: ['.7.....', '.77....', '.777...', '.7777..', '.777...', '.77....', '.7.....'],
    gear: ['...7...', '.77777.', '.7...7.', '77.7.77', '.7...7.', '.77777.', '...7...'],
    trophy: ['7777777', '7.777.7', '.77777.', '..777..', '...7...', '..777..', '.77777.'],
    stats: ['......7', '....7.7', '....7.7', '..7.7.7', '..7.7.7', '7.7.7.7', '7777777'],
    gun: ['.......', '7777777', '777777.', '.77.7..', '.77....', '.7.....', '.......'],
    shirt: ['.77.77.', '7777777', '7777777', '.77777.', '.77777.', '.77777.', '.......'],
    help: ['.77777.', '77...77', '....77.', '...77..', '...7...', '.......', '...7...'],
    back: ['...7...', '..77...', '.777777', '7777777', '.777777', '..77...', '...7...'],
    star: ['...7...', '...7...', '..777..', '7777777', '.77777.', '.77.77.', '77...77'],
    lock: ['..777..', '.7...7.', '.7...7.', '7777777', '777.777', '777.777', '7777777'],
    heart: ['.77.77.', '7777777', '7777777', '.77777.', '..777..', '...7...', '.......'],
    scrap: ['...7...', '.77777.', '77.7.77', '7.....7', '77.7.77', '.77777.', '...7...'],
    clock: ['.77777.', '7..7..7', '7..7..7', '7..777.', '7.....7', '7.....7', '.77777.'],
    target: ['.77777.', '7.....7', '7.777.7', '7.7.7.7', '7.777.7', '7.....7', '.77777.'],
    skull: ['.77777.', '7777777', '7..7..7', '7777777', '.77.77.', '.77777.', '.7.7.7.'],
    calendar: ['7.....7', '7777777', '7.....7', '7.7.7.7', '7.....7', '7.7.7.7', '7777777'],
    flag: ['7777...', '777777.', '7777777', '777777.', '7......', '7......', '7......'],
    zen: ['...7...', '..777..', '.7.7.7.', '7..7..7', '.7.7.7.', '..777..', '7777777'],
    puzzle: ['..77...', '..77...', '777777.', '77777..', '7777777', '77777..', '777777.'],
    bolt: ['....77.', '...77..', '..77...', '.77777.', '...77..', '..77...', '.77....'],
    page: ['77777..', '7...77.', '7.....7', '7.777.7', '7.....7', '7.777.7', '7777777'],
    dice: ['7777777', '7.....7', '7.7.7.7', '7.....7', '7.7.7.7', '7.....7', '7777777'],
    pen: ['.....77', '....777', '...777.', '..777..', '.777...', '77.....', '7......'],
    pause: ['77.77..', '77.77..', '77.77..', '77.77..', '77.77..', '77.77..', '.......'],
    reset: ['..7777.', '.7....7', '7......', '7...7..', '7....77', '.7..777', '..7777.'],
    home: ['...7...', '..777..', '.77777.', '7777777', '.7...7.', '.7.7.7.', '.7.7.7.'],
    check: ['......7', '.....77', '7...77.', '77.77..', '.777...', '..7....', '.......'],
    cross: ['7.....7', '77...77', '.77.77.', '..777..', '.77.77.', '77...77', '7.....7'],
    music: ['..77777', '..7...7', '..7...7', '..7...7', '777.777', '777.777', '.......'],
    eye: ['.......', '.77777.', '7..7..7', '7.777.7', '7..7..7', '.77777.', '.......'],
    keys: ['7777777', '7.7.7.7', '7777777', '77.7.77', '7777777', '7.....7', '7777777'],
    wheel: ['..777..', '.7.7.7.', '7..7..7', '7777777', '7..7..7', '.7.7.7.', '..777..'],
    dash: ['.......', '77..77.', '.77..77', '..77..7', '.77..77', '77..77.', '.......'],
    jump: ['...7...', '..777..', '.77777.', '...7...', '...7...', '.......', '7777777'],
    alt: ['.77777.', '7.....7', '7.777.7', '7.7.7.7', '7.777.7', '7.....7', '.77777.'],
    grid: ['77.77.7', '77.77.7', '.......', '77.77.7', '77.77.7', '.......', '77.77.7'],
    kick: ['..77...', '..77...', '.777...', '.77.777', '.77..77', '.7.....', '77.....'],
    up: ['...7...', '..777..', '.77777.', '7777777', '..777..', '..777..', '..777..'],
    gadget: ['..777..', '.7...7.', '7..7..7', '7.777.7', '7..7..7', '.7...7.', '..777..'],
    bug: ['.7...7.', '..7.7..', '.77777.', '7777777', '.77777.', '7.777.7', '.7...7.']
  };
  const iconCache = new Map();
  function iconURL(name, color = '7', scale = 2, shadow = '0') {
    const key = `${name}|${color}|${scale}|${shadow}`;
    if (iconCache.has(key)) return iconCache.get(key);
    const rows = ICON_ROWS[name] || ICON_ROWS.help;
    const g0 = grid(rows, { 7: color });
    const g = { w: g0.w + 1, h: g0.h + 1, px: new Uint32Array((g0.w + 1) * (g0.h + 1)) };
    for (let y = 0; y < g0.h; y++) for (let x = 0; x < g0.w; x++) {
      const c = g0.px[y * g0.w + x];
      if (!c) continue;
      if (shadow) g.px[(y + 1) * g.w + x + 1] = P32[shadow];
    }
    for (let y = 0; y < g0.h; y++) for (let x = 0; x < g0.w; x++) { const c = g0.px[y * g0.w + x]; if (c) g.px[y * g.w + x] = c; }
    const cv = toCanvas(g);
    const big = document.createElement('canvas');
    big.width = g.w * scale; big.height = g.h * scale;
    const bc = big.getContext('2d');
    bc.imageSmoothingEnabled = false;
    bc.drawImage(cv, 0, 0, big.width, big.height);
    const url = big.toDataURL();
    iconCache.set(key, url);
    return url;
  }
  function spriteURL(sp, scale = 3) {
    const big = document.createElement('canvas');
    big.width = sp.w * scale; big.height = sp.h * scale;
    const bc = big.getContext('2d');
    bc.imageSmoothingEnabled = false;
    bc.drawImage(sp.cv, 0, 0, big.width, big.height);
    return big.toDataURL();
  }
  function frameURL(skinId, anim = 'idle', idx = 0, scale = 4) {
    const f = playerFrames(skinId).anims[anim][idx];
    const big = document.createElement('canvas');
    big.width = f.w * scale; big.height = f.h * scale;
    const bc = big.getContext('2d');
    bc.imageSmoothingEnabled = false;
    bc.drawImage(f.r, 0, 0, big.width, big.height);
    return big.toDataURL();
  }

  WTP.sprites = {
    grid, outline, toCanvas, flipX, flipY, tint, scale2x, Sprite, S, WEAPON: W, PROJ, ENEMY, SKINS, playerFrames, explosions,
    iconURL, spriteURL, frameURL, ICON_ROWS, FIRE_RAMP, SMOKE_RAMP, dith, BAYER, FW, FH
  };
})();
