(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand, pick, hash, shade, mix } = WTP;
  const WP = WTP.weapons, SP = WTP.sprites;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player, EN = () => WTP.enemies, ST = () => WTP.structs;
  const A = (n, x) => WTP.audio.play(n, x);
  if (!WP.CATS.find((c) => c.id === 'desk')) WP.CATS.push({ id: 'desk', short: 'Desk', name: 'Desktop', icon: 'grid', col: 'c' });
  const S = (rows, o) => SP.S(rows, o);
  const st = WP.st;

  const textCache = new Map();
  function textPixels(text, color = '7') {
    const key = `${text}|${color}`;
    if (textCache.has(key)) return textCache.get(key);
    const t = WTP.font.textCanvas(text, { color, outline: null });
    const d = t.cv.getContext('2d').getImageData(0, 0, t.w, t.h).data;
    const out = { w: t.w, h: t.h, on: new Uint8Array(t.w * t.h) };
    for (let i = 0; i < t.w * t.h; i++) out.on[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    textCache.set(key, out);
    return out;
  }
  WTP.levels = WTP.levels || {};
  WTP.levels.textPixels = textPixels;

  const ents = [];
  const queue = [];
  const marks = [];
  const K = {};
  WP.K = K;
  K.later = (t, fn) => queue.push({ t, fn });
  WP.later = K.later;
  K.ent = (e) => { e.t = 0; ents.push(e); return e; };
  K.ents = ents;
  K.mark = (m) => { m.t = 0; marks.push(m); };
  K.rot = (o, da) => { const a = Math.atan2(o.ay, o.ax) + da; return { ...o, ax: Math.cos(a), ay: Math.sin(a) }; };
  K.inGrid = (x, y) => { const Wd = W(); return x >= 0 && y >= 0 && x < Wd.w && y < Wd.gh; };
  K.regionAt = (x, y) => {
    const Wd = W();
    const cx = Math.floor(x), cy = Math.floor(y);
    if (!K.inGrid(cx, cy)) return 0;
    const s = ST().slabAt(cx, cy);
    if (s) return s.win.id;
    return Wd.rid[cy * Wd.w + cx];
  };
  K.beam = (o, range, stopAt) => {
    const Wd = W();
    let x = o.x, y = o.y;
    const r0 = K.regionAt(o.x, o.y);
    for (let d = 0; d < range; d += 0.6) {
      x += o.ax * 0.6; y += o.ay * 0.6;
      if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) return { x, y, rid: 0, d };
      const r = K.regionAt(x, y);
      if (r && r === r0 && !(d > 4 && Wd.solid(Math.floor(x), Math.floor(y)))) continue;
      if (stopAt(r, Math.floor(x), Math.floor(y))) return { x, y, rid: r, d };
    }
    return { x, y, rid: 0, d: range };
  };
  K.liveWin = (r) => { const w = r && ST().wins[r]; return !!w && (w.state === 'static' || w.state === 'hanging'); };
  K.cooldown = (id, sec) => {
    const now = performance.now();
    st.altCd = st.altCd || {};
    if ((st.altCd[id] || 0) > now) { A('deny'); G()?.label?.(`RECHARGING ${Math.ceil((st.altCd[id] - now) / 1000)}s`, 600); return false; }
    st.altCd[id] = now + sec * 1000;
    return true;
  };
  K.pre = [];
  function wrapFire(id) {
    const f = WP.FIRE[id];
    if (!f || f.__wrapped) return;
    const g = function (o) {
      let restore = null;
      for (const h of K.pre) { const r = h(id, o); if (typeof r === 'function') restore = r; }
      let res;
      try { res = f(o); } finally { if (restore) restore(); }
      if (res !== false && id !== 'sudo') st.lastFired = id;
      return res;
    };
    g.__wrapped = true;
    WP.FIRE[id] = g;
  }
  K.wrapFire = wrapFire;
  for (const id of Object.keys(WP.FIRE)) wrapFire(id);

  WP.EXT.resets.push(() => { marks.length = 0; queue.length = 0; ents.length = 0; st.clip = null; st.overT = 0; st.rootShots = 0; st.capsT = 0; st.drag = null; st.lastFired = null; st.minigunHold = false; W().capsT = 0; });
  WP.EXT.updates.push((dt, o, d, want) => {
    for (let k = marks.length - 1; k >= 0; k--) { const m = marks[k]; m.t += dt; if (m.t > m.life) marks.splice(k, 1); }
    for (let k = queue.length - 1; k >= 0; k--) { const q = queue[k]; q.t -= dt; if (q.t <= 0) { queue.splice(k, 1); try { q.fn(); } catch (e) { console.warn(e); } } }
    for (let k = ents.length - 1; k >= 0; k--) { const e = ents[k]; e.t += dt; let done = false; try { done = e.update(dt, o) === true; } catch (er) { console.warn(er); done = true; } if (done || (e.life && e.t > e.life)) { ents.splice(k, 1); try { e.end?.(); } catch (er) { console.warn(er); } } }
    if (st.overT > 0) {
      st.overT -= dt;
      st.cd = Math.max(0, st.cd - dt);
      const P = PL();
      if (Math.random() < 0.5) FX().ember(P.x + rand(0, P.w), P.y + rand(0, P.h));
      if ((st.overHeat = (st.overHeat || 0) - dt) <= 0) { st.overHeat = 0.25; const a = rand(0, Math.PI * 2); W().carve(P.x + 3 + Math.cos(a) * 9, P.y + 7 + Math.sin(a) * 9, 2.5, { debris: 0.2, force: 30, scorch: true, ignite: 0.4, cause: 'overclock', pow: 1.5, noCrumble: true, noCrack: true }); }
    }
    if (st.capsT > 0) { st.capsT -= dt; W().capsT = st.capsT; }
    if (st.minigunHold) { if (d.id !== 'minigun') st.minigunHold = false; else st.spin = 1; }
    if (st.drag) {
      const s = st.drag;
      if (s.dead || d.id !== 'dragdrop') { if (!s.dead) ST().release(s, 0, 0); st.drag = null; }
      else {
        const tp = WP.aimPoint(o);
        ST().dragTo(s, tp.x, Math.min(tp.y, W().gh - s.bh / 2));
        FX().beam([o.x, o.y, s.x, s.y], { kind: 'tractor', life: 0.03, c1: P32.c, c2: P32.C });
        if (!want) {
          const vx = (s.x - s.px) * 60, vy = (s.y - s.py) * 60;
          ST().release(s, vx * 1.4, vy * 1.4 - 40);
          st.drag = null;
          A('drop'); G()?.shake?.(4);
        }
      }
    }
  });
  WP.EXT.draws.push((ctx) => {
    for (const e of ents) e.draw?.(ctx);
    for (const m of marks) {
      const k = m.t / m.life;
      if (m.kind === 'x') {
        const s = 7 * (k < 0.15 ? k / 0.15 : 1), x = m.x, y = m.y;
        ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        ctx.fillStyle = '#e04a3f'; ctx.fillRect(x - s, y - s * 0.75, s * 2, s * 1.5);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.4); ctx.lineTo(x + s * 0.45, y + s * 0.4); ctx.moveTo(x + s * 0.45, y - s * 0.4); ctx.lineTo(x - s * 0.45, y + s * 0.4); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (m.kind === 'text') {
        ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 3));
        WTP.font.draw(ctx, m.text, Math.round(m.x), Math.round(m.y - k * 6), { align: 'center', color: m.color || '7', outline: '0', scale: m.scale || 1 });
        ctx.globalAlpha = 1;
      } else if (m.kind === 'ring') {
        ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = m.color || '#8fe3ff'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r * (0.2 + k * 0.8), 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      } else if (m.kind === 'rect') {
        ctx.globalAlpha = Math.max(0, 1 - k); ctx.strokeStyle = m.color || '#ffffff'; ctx.lineWidth = 0.6; ctx.setLineDash([1.5, 1]);
        ctx.strokeRect(m.x0, m.y0, m.x1 - m.x0, m.y1 - m.y0); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
    }
  });
  const shotType = (t, def) => { WP.EXT.shots[t] = def; };
  const solidAt = (x, y) => W().solid(Math.floor(x), Math.floor(y));
  K.shotType = shotType;

  function closeWindow(rid, fromX, fromY, opts = {}) {
    const w = ST().wins[rid];
    if (!w || (w.state !== 'static' && w.state !== 'hanging')) return false;
    const r = w.reg;
    K.mark({ kind: 'x', x: r.x1 - 6, y: r.y0 + 4, life: 0.9 });
    FX().pop((r.x0 + r.x1) / 2, r.y0 + 6, 'ALT+F4', { scale: 3, ramp: ['7', 'K', 'k', 'e'], life: 1.1, vy: -10 });
    A('altf4');
    G()?.shake?.(8);
    G()?.chroma?.(0.6);
    K.later(0.18, () => {
      ST().collapse(rid, { vy: -80, vx: (((r.x0 + r.x1) / 2) - fromX) * 0.25, va: rand(-0.6, 0.6), shatter: opts.shatter });
      W().carve(r.x1 - 6, r.y0 + 4, 5, { debris: 0.8, force: 140, cause: 'altf4', pow: 6, noCrack: true });
    });
    return true;
  }
  WP.closeWindow = closeWindow;

  function strike(x, opts = {}) {
    const Wd = W();
    x = Math.max(1, Math.min(Wd.w - 2, x));
    let y = 0;
    while (y < Wd.gh - 1 && !Wd.solid(Math.floor(x), y) && !(EN()?.at?.(x, y, 2))) y++;
    const pts = [x + rand(-3, 3), -10];
    let cx = pts[0];
    for (let yy = 0; yy < y; yy += rand(6, 12)) { cx += rand(-5, 5); pts.push(cx, yy); }
    pts.push(x, y);
    FX().beam(pts, { kind: 'bolt', life: 0.2, c2: opts.c2 || P32.C });
    const e = EN()?.at?.(x, y, 4);
    if (e) e.damage(opts.dmg || 90, 'lightning');
    Wd.carve(x, y + 2, opts.r || 6, { debris: 0.6, force: 150, cause: 'lightning', pow: 4, scorch: true, ignite: 0.25, letters: 6 });
    WP.conduct?.(Math.floor(x), Math.min(Wd.gh - 1, y + 1));
    A('thunder');
    G()?.shake?.(5);
    return { x, y };
  }
  K.strike = strike;

  function wordAt(x, y) {
    const Wd = W();
    let best = null, bd = 1e9;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const cx = Math.floor(x + dx), cy = Math.floor(y + dy);
      if (!K.inGrid(cx, cy)) continue;
      const g = Wd.gid[cy * Wd.w + cx];
      if (!g || Wd.mat[cy * Wd.w + cx] !== Wd.SOLID) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = g; }
    }
    if (!best) return null;
    const gr = Wd.groups[best];
    if (gr.word == null || gr.word < 0) return null;
    return Wd.words[gr.word] || null;
  }
  function popWord(wd, delay = 0.02, vy = -80) {
    const Wd = W();
    let k = 0;
    for (const g of wd.ids) { const gr = Wd.groups[g]; if (!gr || gr.dead) continue; K.later(k * delay, () => { Wd.detachGlyph(g, rand(-50, 50), vy - rand(0, 60)); }); k++; }
    return k;
  }
  K.wordAt = wordAt;
  K.popWord = popWord;

  const SPR = {
    altf4: ['.66666666666.', '6555555555556', '65e5e5555o556', '655e55555o556', '65e5e555oo556', '6555555555556', '.666.33......', '.....33......'],
    fist: ['...6666...', '..677776..', '.67777776.', '6777777776', '6777777776', '.67777776o', '..666666oa', '....33.oay'],
    rmrf: ['000000000000', '0ll0l0ll0000', '0l00ll0l0000', '0l00l00l0e00', '000000000000', '.33.........', '.33.........'],
    ctrlz: ['.444444444.', '45555555554', '45c55cc5554', '455c5c55c54', '45c55cc5554', '45555555554', '.444.33....', '....33.....'],
    kill9: ['...........e', '33333333333e', '2444444444ee', '.2RR2.......', '.22.........', '.22.........'],
    fork: ['..a.a..', '.aRRRa.', 'aRe0eRa', 'aR0e0Ra', 'aRe0eRa', '.aRRRa.', '..a.a..'],
    dragdrop: ['..7.......', '..77......', '..777.....', '..7777....', '..77777...', '..777777..', '..7777....', '..7..77...', '33....77..', '33........'],
    wsportal: ['.bbbbb..ooooo.', 'bc777bccoaYYao', 'bc717bccoa2Yao', 'bc777bccoaYYao', '.bbbbb..ooooo.', '......33......'],
    screenshot: ['..3333.....', '.355553333.', '35555555553', '3550005553.', '355070555y3', '3550005553.', '35555555553', '.333333333.'],
    cursors: ['7......7..', '77.....77.', '777....777', '7777...77.', '77.....7..', '7.7.......', '33........', '33........'],
    bsod: ['.nnnnnnnnn.', 'nbbbbbbbbbn', 'nb7bbb77bbn', 'nbbbbbbbbbn', 'nb77777bbbn', 'nbbbbbbbbbn', '.nnn33nnnn.', '....33.....'],
    tiler: ['5555.5555', '5cc5.5cc5', '5555.5555', '.........', '5555.5555', '5cc5.5cc5', '5555.5555', '..33.....'],
    sudo: ['.0000000000.', '0lll0l0l0ll0', '0l000l0l0l00', '0lll0l0l0ll0', '000l0l0l0l00', '0lll0lll0l00', '.000033000..', '.....33.....'],
    panic: ['000000000000', '07707707070.', '07007007770.', '07707707070.', '000000000000', '.33.........'],
    segv: ['..eeee....', '.e0000e...', 'e0e00e0e..', 'e000000eee', 'e0e00e0e..', '.e0000e...', '..e33e....'],
    zip: ['.yyyyyy.', 'yaaYYaay', 'ya0YY0ay', 'yaaYYaay', 'ya0YY0ay', 'yaaYYaay', '.yyyyyy.'],
    ddos: ['..c.c.c...', '.ccccccc..', 'cC7C7C7Cc.', '.ccccccc.c', '..c.c.c...', '..33......'],
    grep: ['.666......', '6...6.....', '6.e.6.....', '6...6.....', '.6666.....', '....66....', '.....66...', '......66..'],
    caps: ['.44444444.', '4555555554', '4557777554', '4557557554', '4557777554', '4557557554', '4555555554', '.44433444.'],
    copypaste: ['.5555....', '.57775555', '.5777577.', '.577757.5', '.5555575.', '...57775.', '...55555.', '..33.....'],
    tear: ['ccccccccc...', '.....ccccccc', 'kkkkkkk.....', '....kkkkkkkk', 'lllllll.....', '..33........'],
    pixelsort: ['0123456777', '0123456777', '0123456777', '0123456777', '.33.......'],
    deadpx: ['.333.', '3m3l3', '3303.', '3l3m3', '.333.'],
    theme: ['eoayl', 'eoayl', 'cbPkm', 'cbPkm', '.33..'],
    usb: ['......5555', '333333577.', '3444445555', '333333577.', '......5555'],
    battery: ['.33.', '3ll3', '3ll3', '3ll3', '3333', '3443', '3333'],
    scroll: ['..5555..', '.566665.', '56677665', '56700765', '56700765', '56677665', '.566665.', '..5555..'],
    notifspam: ['.55555555555.', '5677777777765', '56c7777777765', '5677777777765', '.55555555555.', '...33........'],
    defrag: ['cceeyyll', 'cceeyyll', 'bbkkooPP', 'bbkkooPP', '..33....'],
    overclock: ['..e.e.e..', '.3333333.', 'e3RRRRR3e', '.3R777R3.', 'e3R777R3e', '.3RRRRR3.', 'e3333333e', '..e33e.e.'],
    peeler: ['.....uuu', '....uWWu', '...uWWu.', '..uWWu..', '.uWWu...', '33uu....', '33......']
  };
  const spr = (k, o) => S(SPR[k], o);

  const reg = (def, impl) => { const d = WP.register({ price: 0, cat: 'desk', ...def }, impl); wrapFire(d.id); return d; };
  K.reg = reg;

  reg({ id: 'altf4', name: 'Alt+F4', rate: 1.1, recoil: 3, shake: 4, kick: 30, does: 'A beam: the window it hits loses its bolts, folds and collapses', altDoes: 'Alt+F4 every window on screen, one after another', tip: 'The most honest key combo ever made.' }, {
    sprite: spr('altf4', { gx: 5, gy: 6, mx: 13, my: 3 }),
    fire(o) {
      const hit = K.beam(o, 900, (r) => K.liveWin(r));
      FX().beam([o.x, o.y, hit.x, hit.y], { kind: 'rail', life: 0.22, w: 2, c1: P32['7'], c2: P32.e, c3: P32.k });
      for (let k = 0; k < 14; k++) FX().spark(hit.x, hit.y, rand(-140, 140), rand(-140, 60), k & 1 ? P32.e : P32['7'], 0.3);
      if (hit.rid) closeWindow(hit.rid, o.x, o.y);
      else { W().carve(hit.x, hit.y, 4, { debris: 0.6, force: 90, cause: 'altf4', pow: 3 }); A('usbNo'); }
    },
    alt(o) {
      if (!K.cooldown('altf4', 12)) return;
      const wins = ST().wins.filter((w) => w && w.state === 'static' && w.reg.type !== 'bar');
      if (!wins.length) { A('deny'); return; }
      A('closeAll');
      G()?.announce?.('CLOSE ALL WINDOWS', 4);
      wins.sort((a, b) => a.reg.y0 - b.reg.y0 || a.reg.x0 - b.reg.x0);
      wins.forEach((w, k) => K.later(0.4 + k * 0.45, () => closeWindow(w.id, o.x, o.y)));
    }
  });

  shotType('fist', {
    step(s, dt) {
      s.vx *= 1 + dt * 1.5; s.vy *= 1 + dt * 1.5;
      if (Math.random() < 0.8) FX().smoke(s.x - s.vx * 0.02, s.y - s.vy * 0.02, 1, P32['5']);
      if (Math.random() < 0.5) FX().flame(s.x - s.vx * 0.02, s.y);
      return WP.travel(s, dt, (x, y, isE, e) => {
        if (isE) { e.damage(s.big ? 260 : 140, 'fist'); if (!e.T.boss) { e.vx = s.vx * 0.8; e.vy = -200; } }
        const r = K.regionAt(x + s.vx * 0.01, y + s.vy * 0.01);
        const w = r && ST().wins[r];
        if (w && (w.state === 'static' || w.state === 'hanging') && w.reg.type !== 'bar') {
          K.later(0.05, () => ST().collapse(r, { vx: Math.sign(s.vx) * (s.big ? 420 : 260), vy: -160, va: Math.sign(s.vx) * rand(0.8, 1.6) }));
          G()?.event?.('KNOCKOUT!', x, y - 6, 2);
        }
        WP.explode(x, y, s.big ? 15 : 9, { letters: 10, cause: 'fist', sound: 'punch', fire: 0 });
        G()?.killcam?.(x, y, 10);
        return true;
      });
    },
    draw(ctx, s) {
      const a = Math.atan2(s.vy, s.vx), k = s.big ? 1.4 : 1;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.scale(k, k);
      ctx.fillStyle = PAL['0']; ctx.fillRect(-5, -3.5, 9, 7);
      ctx.fillStyle = PAL['6']; ctx.fillRect(-4, -2.5, 7, 5);
      ctx.fillStyle = PAL['7']; ctx.fillRect(1, -2.5, 2, 5);
      ctx.fillStyle = PAL.o; ctx.fillRect(-7, -1.5, 3, 3);
      ctx.fillStyle = PAL.y; ctx.fillRect(-8 - Math.random() * 2, -0.8, 2, 1.6);
      ctx.restore();
    }
  });
  reg({ id: 'superq', name: 'Super+Q Fist', rate: 1.2, recoil: 6, shake: 6, kick: 90, snd: 'punch', does: 'A giant rocket fist that punches a window clean off its bolts', altDoes: 'Charged double punch', tip: 'Quit, but physically.' }, {
    sprite: spr('fist', { gx: 4, gy: 7, mx: 10, my: 4 }),
    fire(o) { WP.addShot({ t: 'fist', x: o.x, y: o.y, vx: o.ax * 260, vy: o.ay * 260, life: 3, dmg: 0, rad: 4 }); },
    alt(o) {
      if (!K.cooldown('superq', 4)) return;
      for (let k = 0; k < 2; k++) K.later(k * 0.22, () => { WP.addShot({ t: 'fist', x: o.x, y: o.y + (k ? 2 : -2), vx: o.ax * 300, vy: o.ay * 300, life: 3, rad: 5, big: true }); PL().vx -= o.ax * 120; A('punch'); G()?.shake?.(6); });
    }
  });

  function rmrfCrawl(startG, opts = {}) {
    const Wd = W();
    const seen = new Set([startG]);
    const q = [startG];
    let n = 0;
    return K.ent({
      acc: 0,
      update(dt) {
        this.acc += dt * (opts.speed || 90);
        while (this.acc >= 1 && q.length) {
          this.acc -= 1;
          const g = q.shift();
          const gr = Wd.groups[g];
          if (!gr || gr.dead) continue;
          const cx = (gr.x0 + gr.x1) / 2, cy = (gr.y0 + gr.y1) / 2;
          for (let y = gr.y0; y <= gr.y1; y++) for (let x = gr.x0; x <= gr.x1; x++) { const i = y * Wd.w + x; if (Wd.gid[i] === g && Wd.mat[i] === Wd.SOLID) { const c = Wd.col[i]; Wd.kill(i, x, y, x, y, 0, 0); if (Math.random() < 0.3) FX().pix(x + 0.5, y + 0.5, rand(-20, 20), rand(-40, -10), (hash(x, y) & 1) ? P32.l : c, 0.5); } }
          gr.dead = true;
          n++;
          if (n % 3 === 0) A('rmrf');
          if ((n & 31) === 0) FX().pop(cx, cy - 4, 'rm', { scale: 1, ramp: ['L', 'l', 'G'], life: 0.5 });
          for (let y = gr.y0 - 3; y <= gr.y1 + 3; y++) for (let x = gr.x0 - 4; x <= gr.x1 + 4; x++) {
            if (!K.inGrid(x, y)) continue;
            const g2 = Wd.gid[y * Wd.w + x];
            if (g2 && !seen.has(g2) && Wd.mat[y * Wd.w + x] === Wd.SOLID) { seen.add(g2); q.push(g2); }
          }
          if (n > (opts.max || 700)) { q.length = 0; break; }
        }
        return q.length === 0;
      },
      end() { if (n > 20) G()?.event?.(`${n} FILES REMOVED`, PL().x, PL().y - 20, 1); if (n) G()?.scored?.(n * 6, -1, -1, 'rmrf'); }
    });
  }
  reg({ id: 'rmrf', name: 'rm -rf', rate: 1.4, recoil: 1, shake: 2, snd: 'keyclack', does: 'A deletion wave that crawls through connected text, letter after letter, recursively', altDoes: '--no-preserve-root: crawls through everything, wallpaper included', tip: 'Are you sure? It did not ask.' }, {
    sprite: spr('rmrf', { gx: 2, gy: 5, mx: 12, my: 2 }),
    fire(o) {
      const Wd = W();
      const r = Wd.raycast(o.x, o.y, o.ax, o.ay, 260, 0.5);
      FX().beam([o.x, o.y, r.x, r.y], { kind: 'sight', life: 0.15, c1: P32.l });
      let g = 0;
      for (let d = 0; d < 8 && !g; d++) { const x = Math.floor(r.x + o.ax * d), y = Math.floor(r.y + o.ay * d); if (K.inGrid(x, y) && Wd.mat[y * Wd.w + x] === Wd.SOLID) g = Wd.gid[y * Wd.w + x]; }
      if (!g) { const wd = wordAt(r.x, r.y); if (wd) g = wd.ids[0]; }
      if (!g) { Wd.carve(r.x, r.y, 4, { debris: 0.5, cause: 'rmrf', pow: 2 }); A('usbNo'); return; }
      K.mark({ kind: 'text', text: '$ rm -rf', x: r.x, y: r.y - 6, life: 1.2, color: 'l' });
      rmrfCrawl(g);
    },
    alt(o) {
      if (!K.cooldown('rmrf', 10)) return;
      const Wd = W();
      const tp = WP.aimPoint(o);
      K.mark({ kind: 'text', text: '--no-preserve-root', x: tp.x, y: tp.y - 8, life: 1.6, color: 'e' });
      A('panic');
      let front = [[Math.floor(tp.x), Math.floor(tp.y)]];
      const seen = new Uint8Array(Wd.n);
      K.ent({
        life: 4.5,
        update() {
          const next = [];
          let k = 0;
          for (const [x, y] of front) {
            if (k++ > 260) { next.push([x, y]); continue; }
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy;
              if (!K.inGrid(nx, ny)) continue;
              const i = ny * Wd.w + nx;
              if (seen[i]) continue;
              seen[i] = 1;
              if (Math.random() < 0.18) continue;
              if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.DEBRIS || Wd.mat[i] === Wd.RUBBLE) Wd.kill(i, nx, ny, nx, ny, 0.1, 30);
              if (Wd.back[i] || Wd.code[i]) { Wd.back[i] = 0; Wd.code[i] = 0; Wd.touch(i); }
              next.push([nx, ny]);
              if (Math.random() < 0.01) FX().spark(nx, ny, rand(-30, 30), rand(-60, 0), P32.l, 0.3);
            }
          }
          front = next.length > 3000 ? next.filter(() => Math.random() < 0.6) : next;
          if (Math.random() < 0.3) A('rmrf');
          return front.length === 0;
        }
      });
    }
  });

  reg({ id: 'ctrlz', name: 'Ctrl+Z', rate: 0.8, recoil: 1, shake: 1, snd: 'rewind', does: 'Rewinds a small area back to how it looked at the start', altDoes: 'Ctrl+Y: re-applies the wreckage there twice as hard', tip: 'Undo. Then redo. Harder.' }, {
    sprite: spr('ctrlz', { gx: 4, gy: 6, mx: 11, my: 3 }),
    fire(o) {
      const tp = WP.aimPoint(o);
      const Wd = W();
      const n = Wd.restoreArea(tp.x, tp.y, 13);
      for (const c of Wd.chunks.slice()) if (Math.hypot(c.x - tp.x, c.y - tp.y) < 15 && !c.thrown) Wd.chunks.splice(Wd.chunks.indexOf(c), 1);
      K.mark({ kind: 'ring', x: tp.x, y: tp.y, r: 14, life: 0.5, color: '#8fe3ff' });
      K.mark({ kind: 'text', text: n ? 'UNDO' : 'NOTHING TO UNDO', x: tp.x, y: tp.y - 15, life: 0.9, color: 'C' });
      G()?.chroma?.(0.4);
      for (let k = 0; k < 20; k++) FX().pix(tp.x + rand(-13, 13), tp.y + rand(-13, 13), rand(-10, 10), rand(-10, 10), k & 1 ? P32.C : P32.k, 0.4);
      st.lastUndo = { x: tp.x, y: tp.y };
    },
    alt(o) {
      if (!K.cooldown('ctrlz', 3)) return;
      const p = st.lastUndo || WP.aimPoint(o);
      A('sigkill');
      K.mark({ kind: 'text', text: 'CTRL+Y', x: p.x, y: p.y - 16, life: 1, color: 'e', scale: 2 });
      WP.explode(p.x, p.y, 15, { letters: 10, cause: 'redo' });
      K.later(0.25, () => WP.explode(p.x + rand(-4, 4), p.y + rand(-4, 4), 15, { letters: 10, cause: 'redo' }));
    }
  });

  reg({ id: 'kill9', name: 'kill -9', rate: 1.2, recoil: 7, shake: 8, kick: 80, snd: 'sigkill', flash: 'big', does: 'One-shot sniper: kills anything, pierces the whole screen, leaves a SIGKILL tag', altDoes: 'kill -STOP: freezes an enemy or a falling window in mid air', tip: 'No cleanup. No goodbye.' }, {
    sprite: spr('kill9', { gx: 2, gy: 4, mx: 12, my: 1 }),
    fire(o) {
      const Wd = W();
      let x = o.x, y = o.y;
      const hitE = new Set();
      for (let d = 0; d < 1200; d += 0.7) {
        x += o.ax * 0.7; y += o.ay * 0.7;
        if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) break;
        const e = EN()?.at?.(x, y, 3);
        if (e && !hitE.has(e)) { hitE.add(e); e.damage(99999, 'kill9'); K.mark({ kind: 'text', text: 'SIGKILL', x: e.x, y: e.y - 10, life: 1.2, color: 'e' }); }
        if (((d / 0.7) | 0) % 2 === 0 && Wd.solid(Math.floor(x), Math.floor(y))) Wd.carve(x, y, 1.6, { debris: 0.5, force: 120, cause: 'kill9', pow: 8, noCrumble: true, pop: 1, noCrack: true });
      }
      FX().beam([o.x, o.y, x, y], { kind: 'rail', life: 0.3, w: 1, c1: P32['7'], c2: P32.e, c3: P32.R });
      K.mark({ kind: 'text', text: 'SIGKILL', x: (o.x + x) / 2, y: (o.y + y) / 2 - 4, life: 0.8, color: 'e' });
      W().crumble((o.x + x) / 2, (o.y + y) / 2, 0, 30);
    },
    alt(o) {
      const Wd = W();
      const tp = WP.aimPoint(o);
      const e = EN()?.nearest?.(tp.x, tp.y, 30);
      if (e) { e.stun = 6; e.vx = 0; e.vy = 0; K.mark({ kind: 'text', text: 'SIGSTOP', x: e.x, y: e.y - 10, life: 1.5, color: 'C' }); A('freezeHit'); return; }
      const s = ST().slabAt(Math.floor(tp.x), Math.floor(tp.y));
      if (s) { ST().stop(s, 4); K.mark({ kind: 'text', text: 'SIGSTOP', x: s.x, y: s.y, life: 1.5, color: 'C', scale: 2 }); A('freezeHit'); return; }
      for (const c of Wd.chunks) if (Math.hypot(c.x - tp.x, c.y - tp.y) < c.rad + 6) { Wd.chunks.splice(Wd.chunks.indexOf(c), 1); Wd.settle(c, false); A('freezeHit'); return; }
      A('deny');
    }
  });

  shotType('fork', {
    step(s, dt) {
      s.vy += 520 * dt; s.fuse -= dt;
      const dead = WP.travel(s, dt, (x, y, isE) => { if (isE) return false; s.vy = -Math.abs(s.vy) * 0.45; s.vx *= 0.7; s.y -= 1; return false; });
      if (s.fuse <= 0 || dead) {
        WP.explode(s.x, s.y, 5 + Math.max(0, 3 - s.gen), { letters: 4, cause: 'fork', sound: 'boom' });
        A('fork');
        if (s.gen < 5) for (let k = 0; k < 2; k++) WP.addShot({ t: 'fork', x: s.x, y: s.y - 1, vx: rand(-140, 140), vy: -rand(140, 240), life: 4, fuse: 0.45 + Math.random() * 0.3, gen: s.gen + 1 });
        return true;
      }
      return false;
    },
    draw(ctx, s) { ctx.fillStyle = PAL['0']; ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); ctx.fillStyle = (s.gen & 1) ? PAL.e : PAL.a; ctx.fillRect(s.x - 1, s.y - 1, 2, 2); if ((performance.now() / 90 | 0) & 1) { ctx.fillStyle = PAL.y; ctx.fillRect(s.x - 0.5, s.y - 2, 1, 1); } }
  });
  reg({ id: 'forkbomb', name: 'Fork Bomb', rate: 1.4, throw: true, snd: 'fork', does: 'Splits in two, and its children split again, five generations deep', altDoes: 'Fork them all right now', tip: ':(){ :|:& };:' }, {
    sprite: spr('fork', { gx: 3, gy: 6, mx: 7, my: 3 }),
    fire(o) { WP.addShot({ t: 'fork', x: o.x, y: o.y, vx: o.ax * 260, vy: o.ay * 260 - 40, life: 4, fuse: 0.8, gen: 0 }); },
    alt() { let n = 0; for (const s of WP.shots) if (s.t === 'fork') { s.fuse = 0; n++; } A(n ? 'fork' : 'deny'); }
  });

  reg({ id: 'dragdrop', name: 'Drag and Drop', hold: true, loop: 'beam', does: 'Hold to grab a whole window by its frame and drag it, release to fling', altDoes: 'Snap: slam the held window to the nearest screen edge', tip: 'Super+click, but with consequences.' }, {
    sprite: spr('dragdrop', { gx: 1, gy: 8, mx: 9, my: 5 }),
    hold(o) {
      if (st.drag && !st.drag.dead) return;
      const hit = K.beam(o, 600, (r, x, y) => r > 0 && (K.liveWin(r) || !!ST().slabAt(x, y)));
      FX().beam([o.x, o.y, hit.x, hit.y], { kind: 'tractor', life: 0.03, c1: P32.c, c2: P32.C });
      if (!hit.rid) return;
      const sl = ST().slabAt(Math.floor(hit.x), Math.floor(hit.y));
      const s = sl ? ST().grabSlab(sl) : ST().grab(hit.rid);
      if (s) { st.drag = s; A('drag'); G()?.event?.('DRAG', s.x, s.y - s.bh / 2, 1); }
    },
    alt() {
      const s = st.drag;
      if (!s || s.dead) { A('deny'); return; }
      const Wd = W();
      const dd = [[s.x, 0], [Wd.w - s.x, 1], [Wd.gh - s.y, 2]].sort((a, b) => a[0] - b[0])[0][1];
      ST().release(s, dd === 0 ? -900 : dd === 1 ? 900 : 0, dd === 2 ? 900 : -80);
      st.drag = null;
      A('winSlam'); G()?.event?.('SNAP!', s.x, s.y, 2);
    }
  });

  reg({ id: 'wsportal', name: 'Workspace Portal', rate: 0.35, snd: 'portalWs', does: 'Two linked portals labelled with workspace numbers; debris and enemies go through', altDoes: 'Swap: exchanges the contents of the two portal discs', tip: 'Super+1, Super+2, physically.' }, {
    sprite: spr('wsportal', { gx: 6, gy: 5, mx: 14, my: 2 }),
    fire(o) { return WP.FIRE.portal(o); },
    alt() {
      const P2 = st.portals || [];
      if (P2.length < 2 || !P2[0] || !P2[1]) { A('deny'); G()?.label?.('PLACE BOTH PORTALS FIRST', 800); return; }
      const [a, b] = P2;
      const Wd = W();
      const R = 9;
      const keys = ['mat', 'col', 'src', 'mtl', 'kind', 'gid', 'back', 'code', 'bcol', 'flag', 'rid', 'ptex'];
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const ax = Math.floor(a.x + dx), ay = Math.floor(a.y + dy), bx = Math.floor(b.x + dx), by = Math.floor(b.y + dy);
        if (!K.inGrid(ax, ay) || !K.inGrid(bx, by)) continue;
        const i = ay * Wd.w + ax, j = by * Wd.w + bx;
        for (const k of keys) { const arr = Wd[k]; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
        Wd.touch(i); Wd.touch(j);
      }
      A('portalWs'); G()?.event?.('SWAPPED', (a.x + b.x) / 2, Math.min(a.y, b.y) - 10, 1);
    }
  });
  WP.EXT.draws.push((ctx) => {
    if (WP.st.cur !== 'wsportal') return;
    (st.portals || []).forEach((p, k) => p && WTP.font.draw(ctx, String(k + 1), Math.round(p.x), Math.round(p.y - 12), { align: 'center', color: k ? 'o' : 'c', outline: '0' }));
  });

  reg({ id: 'screenshot', name: 'Screenshot Flash', rate: 0.9, snd: 'shutter', recoil: 1, shake: 2, does: 'Print key flash: freezes an area into ice with a camera shutter', altDoes: 'Region capture: freezes a whole rectangle at once', tip: 'Say cheese. Then shatter.' }, {
    sprite: spr('screenshot', { gx: 3, gy: 7, mx: 11, my: 4 }),
    fire(o) {
      const tp = WP.aimPoint(o);
      const n = W().freezeAt(tp.x, tp.y, 15);
      FX().flash(0.5, '#ffffff');
      K.mark({ kind: 'ring', x: tp.x, y: tp.y, r: 16, life: 0.4, color: '#ffffff' });
      EN()?.damageCircle?.(tp.x, tp.y, 16, 20, 'freeze');
      for (const e of EN()?.list || []) if (Math.hypot(e.x - tp.x, e.y - tp.y) < 18) e.stun = 2.5;
      if (n) A('freezeHit');
    },
    alt(o) {
      if (!K.cooldown('screenshot', 4)) return;
      const tp = WP.aimPoint(o);
      const x0 = Math.round(tp.x - 40), y0 = Math.round(tp.y - 24), x1 = x0 + 80, y1 = y0 + 48;
      K.mark({ kind: 'rect', x0, y0, x1, y1, life: 0.6 });
      A('shutter'); FX().flash(0.6, '#ffffff');
      K.later(0.15, () => { for (let y = y0; y <= y1; y += 8) for (let x = x0; x <= x1; x += 8) W().freezeAt(x + 4, y + 4, 6.2); A('freezeHit'); });
    }
  });

  shotType('mcur', {
    step(s, dt) {
      const tx = s.hover ? s.hx : s.tx, ty = s.hover ? s.hy : s.ty;
      const dx = tx - s.x + Math.sin(s.age * 5 + s.ph) * 8, dy = ty - s.y + Math.cos(s.age * 4 + s.ph) * 6;
      const d = Math.hypot(dx, dy) || 1;
      s.vx += (dx / d) * 500 * dt; s.vy += (dy / d) * 500 * dt;
      s.vx *= 0.94; s.vy *= 0.94;
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.cd -= dt;
      if (s.cd <= 0) {
        s.cd = rand(0.15, 0.35);
        const e = EN()?.at?.(s.x, s.y, 3);
        if (e) e.damage(6, 'cursor');
        if (solidAt(s.x, s.y)) { W().carve(s.x, s.y, 1.6, { debris: 0.4, force: 40, cause: 'click', pow: 1.4, noCrumble: Math.random() < 0.7, pop: 0.6, noCrack: true }); A('click'); }
      }
      return s.life <= 0;
    },
    draw(ctx, s) {
      const x = s.x, y = s.y;
      ctx.fillStyle = PAL['0']; ctx.beginPath(); ctx.moveTo(x - 0.5, y - 0.5); ctx.lineTo(x + 3.2, y + 3.2); ctx.lineTo(x + 1.5, y + 3.3); ctx.lineTo(x - 0.5, y + 4.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = s.busy ? PAL.c : PAL['7']; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2.4, y + 2.6); ctx.lineTo(x + 1.2, y + 2.7); ctx.lineTo(x, y + 3.6); ctx.closePath(); ctx.fill();
    }
  });
  reg({ id: 'cursors', name: 'Cursor Swarm', rate: 1.5, snd: 'click', does: 'A cloud of mouse cursors that click-drill everything they touch', altDoes: 'Busy cursors: the swarm spins and hovers where it is', tip: 'Every click is a tiny crater.' }, {
    sprite: spr('cursors', { gx: 1, gy: 7, mx: 10, my: 3 }),
    fire(o) {
      const tp = WP.aimPoint(o);
      for (let k = 0; k < 36; k++) WP.addShot({ t: 'mcur', x: o.x + rand(-3, 3), y: o.y + rand(-3, 3), vx: o.ax * 200 + rand(-80, 80), vy: o.ay * 200 + rand(-80, 80), life: 5.5, tx: tp.x + rand(-12, 12), ty: tp.y + rand(-8, 8), ph: rand(0, 6), cd: rand(0, 0.3) });
    },
    alt() { let n = 0; for (const s of WP.shots) if (s.t === 'mcur') { s.hover = !s.hover; s.busy = s.hover; s.hx = s.x; s.hy = s.y; s.life = Math.max(s.life, 3); n++; } A(n ? 'beachball' : 'deny'); }
  });

  function bsod(green) {
    const Wd = W();
    A('bsod');
    G()?.announce?.(green ? ':) GREEN SCREEN' : ':( BLUE SCREEN', 6);
    G()?.forceFull?.(2.2);
    K.ent({
      life: 2.1,
      update() {
        if (this.t > 1.2 && !this.boom) {
          this.boom = true;
          if (green) { for (const e of EN()?.list || []) if (!e.dead) e.damage(99999, 'bsod'); }
          else {
            for (let k = 0; k < 10; k++) K.later(k * 0.05, () => WP.explode(rand(20, Wd.w - 20), rand(14, Wd.gh - 14), rand(12, 20), { letters: 14, cause: 'bsod', kind: 'plasma' }));
            for (const w of ST().wins) if (w && w.state === 'static' && w.reg.type !== 'bar' && Math.random() < 0.7) K.later(rand(0.1, 0.5), () => ST().collapse(w.id, { vy: -200, va: rand(-1, 1), shatter: true }));
            G()?.killcam?.(Wd.w / 2, Wd.gh / 2, 40);
          }
        }
      },
      draw(ctx) {
        const k = this.t;
        const a = k < 1.2 ? Math.min(0.85, k * 1.2) : Math.max(0, 0.85 - (k - 1.2) * 1.6);
        ctx.globalAlpha = a;
        ctx.fillStyle = green ? '#0a7d3c' : '#0b5bd3';
        ctx.fillRect(0, 0, Wd.w, Wd.gh);
        ctx.globalAlpha = Math.min(1, a * 1.2);
        if (k < 1.3) {
          WTP.font.draw(ctx, ':(', 40, Math.round(Wd.gh * 0.28), { color: '7', scale: 8 });
          WTP.font.draw(ctx, 'YOUR DESKTOP RAN INTO A PROBLEM AND NEEDS TO BE WRECKED.', 40, Math.round(Wd.gh * 0.5), { color: '7', scale: 2 });
          WTP.font.draw(ctx, `${Math.min(100, Math.round((k / 1.2) * 100))}% COMPLETE`, 40, Math.round(Wd.gh * 0.58), { color: '7', scale: 2 });
          WTP.font.draw(ctx, 'STOP CODE: CRITICAL_PROCESS_WRECKED', 40, Math.round(Wd.gh * 0.7), { color: '7', scale: 1 });
        }
        ctx.globalAlpha = 1;
      }
    });
  }
  reg({ id: 'bsod', name: 'Blue Screen', rate: 6, does: 'Nuke: the screen glitches blue, a stop code appears, then everything shatters', altDoes: 'Green screen: same show, but it only kills enemies', tip: 'Your desktop ran into a problem.' }, {
    sprite: spr('bsod', { gx: 4, gy: 7, mx: 11, my: 3 }),
    fire() { bsod(false); },
    alt() { if (!K.cooldown('bsodg', 8)) return; bsod(true); }
  });

  reg({ id: 'tiler', name: 'Window Tiler', rate: 1.6, snd: 'tile', recoil: 2, shake: 3, does: 'Slices the window you hit into a grid of tiles that fall apart', altDoes: 'Dwindle: recursive slices, smaller each time', tip: 'Tiling window manager, literally.' }, {
    sprite: spr('tiler', { gx: 2, gy: 7, mx: 9, my: 3 }),
    fire(o) {
      const hit = K.beam(o, 900, (r) => r > 0 && ST().wins[r] && ST().wins[r].state === 'static');
      FX().beam([o.x, o.y, hit.x, hit.y], { kind: 'sight', life: 0.25, c1: P32['7'] });
      if (!hit.rid) { A('deny'); return; }
      const r = ST().wins[hit.rid].reg;
      const cols = Math.max(2, Math.round((r.x1 - r.x0) / 70)), rows = Math.max(2, Math.round((r.y1 - r.y0) / 60));
      for (let gx = 1; gx < cols; gx++) { const x = r.x0 + (gx * (r.x1 - r.x0)) / cols; FX().beam([x, r.y0, x, r.y1], { kind: 'sight', life: 0.25, c1: P32['7'] }); }
      for (let gy = 1; gy < rows; gy++) { const y = r.y0 + (gy * (r.y1 - r.y0)) / rows; FX().beam([r.x0, y, r.x1, y], { kind: 'sight', life: 0.25, c1: P32['7'] }); }
      K.later(0.2, () => { ST().detachGrid(hit.rid, cols, rows, false); A('tile'); G()?.shake?.(8); G()?.event?.('TILED!', (r.x0 + r.x1) / 2, r.y0, 2); });
    },
    alt(o) {
      if (!K.cooldown('tiler', 2)) return;
      const hit = K.beam(o, 900, (r) => r > 0 && ST().wins[r] && ST().wins[r].state === 'static');
      if (!hit.rid) { A('deny'); return; }
      const r = ST().wins[hit.rid].reg;
      K.later(0.15, () => { ST().detachGrid(hit.rid, 0, 0, true); A('tile'); G()?.shake?.(8); G()?.event?.('DWINDLE!', (r.x0 + r.x1) / 2, r.y0, 2); });
    }
  });

  K.pre.push((id) => {
    if (st.rootShots > 0 && id !== 'sudo') {
      st.rootShots--;
      const Wd = W();
      const pm = Wd.powMul;
      Wd.powMul = pm * 2.2;
      if (!st.rootShots) G()?.label?.('ROOT SESSION ENDED', 700);
      return () => { Wd.powMul = pm; };
    }
    return null;
  });
  reg({ id: 'sudo', name: 'sudo !!', rate: 0.9, snd: 'sudo', does: 'Repeats the last weapon you fired at double power', altDoes: 'sudo: your next five shots run as root and punch through metal', tip: 'With great power comes great wreckage.' }, {
    sprite: spr('sudo', { gx: 5, gy: 7, mx: 12, my: 3 }),
    fire(o) {
      const last = st.lastFired;
      if (!last || !WP.FIRE[last] || last === 'sudo' || WP.BY[last]?.hold) { G()?.label?.('NOTHING TO REPEAT, FIRE ANOTHER WEAPON FIRST', 1000); A('deny'); return false; }
      const Wd = W();
      const pm = Wd.powMul;
      Wd.powMul = pm * 2;
      K.mark({ kind: 'text', text: `sudo ${WP.BY[last].name}`, x: o.x, y: o.y - 10, life: 0.9, color: 'l' });
      try { WP.FIRE[last](o); WP.FIRE[last](K.rot(o, 0.08)); } finally { Wd.powMul = pm; }
      st.lastFired = last;
    },
    alt() { st.rootShots = 5; A('sudo'); G()?.label?.('[sudo] password for desktop: ******  ROOT FOR 5 SHOTS', 1400); }
  });

  function rainLine(text, x, opts = {}) {
    const tp = textPixels(text, '7');
    const sc = opts.scale || 1;
    const pts = [];
    const x0 = Math.round(x - (tp.w * sc) / 2), y0 = -tp.h * sc - 4;
    for (let ty = -1; ty <= tp.h; ty++) for (let tx = -1; tx <= tp.w; tx++) {
      const on = tx >= 0 && ty >= 0 && tx < tp.w && ty < tp.h && tp.on[ty * tp.w + tx];
      for (let sy = 0; sy < sc; sy++) for (let sx = 0; sx < sc; sx++) pts.push(x0 + tx * sc + sx, y0 + ty * sc + sy, on ? (opts.col || P32['7']) : (opts.bg || P32['0']));
    }
    const c = W().makeChunk(pts, rand(-20, 20), 120, { mtl: W().M.METAL, life: 8 });
    c.thrown = true;
    c.va = rand(-0.4, 0.4);
    return c;
  }
  const PANIC = ['KERNEL PANIC - NOT SYNCING', 'ATTEMPTED TO KILL INIT!', 'END KERNEL PANIC', 'CPU: 0 PID: 1 COMM: SWAPPER', 'CALL TRACE:', 'DO_EXIT+0X1F2/0XA90', 'OOPS: 0002 [#1] PREEMPT SMP'];
  reg({ id: 'panic', name: 'Kernel Panic', rate: 2.2, snd: 'panic', does: 'Rains solid panic text lines that crush whatever they land on', altDoes: 'Stack trace: one enormous falling line', tip: 'Not syncing. Not sorry.' }, {
    sprite: spr('panic', { gx: 1, gy: 5, mx: 12, my: 2 }),
    fire(o) {
      const tp = WP.aimPoint(o);
      for (let k = 0; k < 4; k++) K.later(k * 0.35, () => rainLine(pick(PANIC), tp.x + rand(-40, 40), { scale: 2 }));
      G()?.chroma?.(0.5);
    },
    alt(o) {
      if (!K.cooldown('panic', 5)) return;
      const tp = WP.aimPoint(o);
      rainLine('TRACE: ' + PANIC.slice(0, 4).join(' / '), tp.x, { scale: 3, col: P32.e });
      A('panic');
    }
  });

  shotType('segv', {
    step(s, dt) {
      return WP.travel(s, dt, (x, y, isE, e) => {
        if (isE) e.damage(30, 'segv');
        const Wd = W();
        Wd.carve(x, y, 2.5, { square: true, debris: 0.4, force: 60, cause: 'segv', pow: 2, pop: 1 });
        A('segv');
        let n = 0;
        const spread = () => { if (n++ > 6) return; const nx = x + rand(-6, 6), ny = y + rand(-6, 6); Wd.carve(nx, ny, rand(1.5, 2.8), { square: true, debris: 0.3, force: 40, cause: 'segv', pow: 2, noCrumble: true }); for (let q = 0; q < 3; q++) FX().pix(nx, ny, rand(-20, 20), rand(-20, 20), pick([P32.k, P32.l, P32.c, P32['0']]), 0.4); K.later(0.07, spread); };
        K.later(0.06, spread);
        return true;
      });
    },
    draw(ctx, s) { ctx.fillStyle = PAL['0']; ctx.fillRect(s.x - 1, s.y - 1, 2, 2); ctx.fillStyle = (s.age * 20 | 0) & 1 ? PAL.k : PAL.l; ctx.fillRect(s.x - 0.5, s.y - 0.5, 1, 1); }
  });
  reg({ id: 'segfault', name: 'Segfault', rate: 0.22, recoil: 1, shake: 1, snd: 'segv', does: 'Shots punch square memory holes that spread for a moment', altDoes: 'Core dump: drops a heap of rubble', tip: 'Address 0x0 is not mapped. It is now.' }, {
    sprite: spr('segv', { gx: 3, gy: 6, mx: 10, my: 3 }),
    fire(o) { WP.addShot({ t: 'segv', x: o.x, y: o.y, vx: o.ax * 480 + rand(-20, 20), vy: o.ay * 480 + rand(-20, 20), life: 1.5, dmg: 30 }); },
    alt(o) {
      if (!K.cooldown('segfault', 2)) return;
      const tp = WP.aimPoint(o);
      const Wd = W();
      K.mark({ kind: 'text', text: 'CORE DUMPED', x: tp.x, y: tp.y - 14, life: 1, color: 'e' });
      for (let k = 0; k < 500; k++) Wd.placeRubble(Math.floor(tp.x + rand(-10, 10)), Math.floor(tp.y + rand(-14, 2)), pick([P32['0'], P32['1'], P32.l, P32.k, P32['3']]));
      A('crash', 200);
    }
  });

  shotType('zip', {
    step(s, dt) {
      if (s.phase === 0) {
        s.vy += 520 * dt;
        s.fuse -= dt;
        WP.travel(s, dt, (x, y, isE) => { if (isE) return false; s.vy = -Math.abs(s.vy) * 0.35; s.vx *= 0.6; return false; });
        if (s.fuse <= 0) {
          s.phase = 1;
          const Wd = W();
          const pts = [];
          let k = 0;
          const R = 14;
          for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
            if (dx * dx + dy * dy > R * R) continue;
            const x = Math.floor(s.x + dx), y = Math.floor(s.y + dy);
            if (!K.inGrid(x, y)) continue;
            const i = y * Wd.w + x;
            if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.DEBRIS || Wd.mat[i] === Wd.RUBBLE) { const c = Wd.col[i]; Wd.kill(i, x, y, x, y, 0, 0); FX().suck(x + 0.5, y + 0.5, 0, 0, c, s.x, s.y, 0.5); k++; }
            if (Wd.back[i]) { Wd.back[i] = 0; Wd.touch(i); }
          }
          s.k = k;
          const side = Math.max(3, Math.min(9, Math.round(Math.sqrt(k) / 3)));
          for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) pts.push(Math.floor(s.x) - (side >> 1) + x, Math.floor(s.y) - (side >> 1) + y, (x + y) & 1 ? P32.y : P32.a);
          s.cube = W().makeChunk(pts, 0, -60, { mtl: W().M.GOLD, life: 9 });
          A('zip');
          G()?.event?.('COMPRESSED', s.x, s.y - 10, 1);
          s.t2 = 1.2;
          if (s.keep) { const c = s.cube; W().chunks.splice(W().chunks.indexOf(c), 1); c.held = true; PL().carry = c; return true; }
        }
        return false;
      }
      s.t2 -= dt;
      if (s.cube) { s.x = s.cube.x; s.y = s.cube.y; if (Math.random() < 0.4) FX().spark(s.x, s.y, rand(-40, 40), rand(-60, 0), P32.y, 0.2); }
      if (s.t2 <= 0) {
        if (s.cube) { const i = W().chunks.indexOf(s.cube); if (i >= 0) W().chunks.splice(i, 1); }
        A('unzip');
        WP.explode(s.x, s.y, 14 + Math.min(14, (s.k || 0) / 60), { letters: 16, cause: 'unzip' });
        for (let q = 0; q < 60; q++) FX().debris(s.x, s.y, rand(-260, 260), rand(-300, 40), pick([P32.y, P32.a, P32['7']]));
        return true;
      }
      return false;
    },
    draw(ctx, s) { if (s.phase) return; ctx.fillStyle = PAL['0']; ctx.fillRect(s.x - 2, s.y - 2, 4, 4); ctx.fillStyle = PAL.y; ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); ctx.fillStyle = PAL.a; ctx.fillRect(s.x - 0.5, s.y - 1.5, 1, 3); }
  });
  reg({ id: 'zipbomb', name: 'Zip Bomb', rate: 1.6, throw: true, snd: 'throw', does: 'Compresses an area into a tiny cube, then decompresses violently', altDoes: 'Keep the cube: compress an area and carry it to throw later', tip: '42 kilobytes. 4.5 petabytes of pain.' }, {
    sprite: spr('zip', { gx: 3, gy: 6, mx: 8, my: 3 }),
    fire(o) { WP.addShot({ t: 'zip', x: o.x, y: o.y, vx: o.ax * 250, vy: o.ay * 250 - 40, life: 9, fuse: 0.9, phase: 0 }); },
    alt(o) { if (PL().carry) { A('deny'); return; } WP.addShot({ t: 'zip', x: o.x, y: o.y, vx: o.ax * 220, vy: o.ay * 220 - 40, life: 9, fuse: 0.6, phase: 0, keep: true }); }
  });

  shotType('packet', {
    step(s, dt) {
      if (s.ping) { s.trail = s.trail || []; s.trail.push(s.x, s.y); if (s.trail.length > 16) s.trail.splice(0, 2); }
      return WP.travel(s, dt, (x, y, isE, e) => {
        if (isE) { e.damage(s.ping ? 25 : 5, 'packet'); return !s.ping; }
        W().carve(x, y, s.ping ? 2 : 1.3, { debris: 0.3, force: 40, cause: 'ddos', pow: 1.6, noCrumble: Math.random() < 0.8, pop: 0.5, noCrack: true });
        A('ping');
        if (s.ping) {
          const vertical = !solidAt(x, y - Math.sign(s.vy) * 1.2);
          if (vertical) s.vy = -s.vy; else s.vx = -s.vx;
          s.x += s.vx * 0.01; s.y += s.vy * 0.01;
          return false;
        }
        return true;
      });
    },
    draw(ctx, s) {
      if (s.trail && s.trail.length > 2) { ctx.strokeStyle = PAL.C; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(s.trail[0], s.trail[1]); for (let k = 2; k < s.trail.length; k += 2) ctx.lineTo(s.trail[k], s.trail[k + 1]); ctx.stroke(); }
      ctx.fillStyle = s.ping ? PAL['7'] : ((s.age * 30 | 0) & 1 ? PAL.c : PAL.C); ctx.fillRect(s.x - 0.6, s.y - 0.6, 1.2, 1.2);
    }
  });
  reg({ id: 'ddos', name: 'DDoS', rate: 2.5, snd: 'modem', does: 'Hundreds of tiny packets fly in from the screen edges toward your aim', altDoes: 'A single ping that bounces forever', tip: 'Distributed. Denial. Of service.' }, {
    sprite: spr('ddos', { gx: 2, gy: 5, mx: 10, my: 2 }),
    fire(o) {
      const Wd = W();
      const tp = WP.aimPoint(o);
      for (let k = 0; k < 140; k++) {
        const side = k % 4;
        const x = side === 0 ? -4 : side === 1 ? Wd.w + 4 : rand(0, Wd.w), y = side === 2 ? -4 : side === 3 ? Wd.gh + 2 : rand(0, Wd.gh);
        const dx = tp.x + rand(-20, 20) - x, dy = tp.y + rand(-14, 14) - y, d = Math.hypot(dx, dy) || 1;
        const sp = rand(260, 380);
        WP.addShot({ t: 'packet', x, y, vx: (dx / d) * sp, vy: (dy / d) * sp, life: d / sp + 0.6, delay: rand(0, 1.5), dmg: 5 });
      }
      G()?.event?.('DDOS!', tp.x, tp.y - 14, 2);
    },
    alt(o) { WP.addShot({ t: 'packet', ping: true, x: o.x, y: o.y, vx: o.ax * 320, vy: o.ay * 320, life: 14, dmg: 25 }); A('ping'); }
  });

  reg({ id: 'grep', name: 'grep', rate: 1.3, snd: 'grep', does: 'Lock onto a word: every copy of that word on screen gets struck', altDoes: 'grep -v: blasts every word around your aim except that one', tip: 'Pattern matching, with lightning.' }, {
    sprite: spr('grep', { gx: 2, gy: 6, mx: 9, my: 3 }),
    fire(o) {
      const tp = WP.aimPoint(o);
      const wd = wordAt(tp.x, tp.y);
      if (!wd) { A('deny'); G()?.label?.('AIM AT A WORD', 700); return false; }
      const Wd = W();
      const hits = Wd.words.filter((w) => w.sig === wd.sig);
      const list = hits.length > 1 ? hits : Wd.words.filter((w) => w.ids.length === wd.ids.length && Math.abs(w.w - wd.w) <= 1 && Math.abs(w.h - wd.h) <= 1);
      K.mark({ kind: 'text', text: `grep: ${list.length} MATCH${list.length === 1 ? '' : 'ES'}`, x: tp.x, y: tp.y - 12, life: 1.2, color: 'y' });
      list.slice(0, 40).forEach((w, k) => K.later(0.12 + k * 0.08, () => {
        const cx = w.x + w.w / 2;
        FX().beam([cx, -8, cx, w.y + w.h / 2], { kind: 'bolt', life: 0.15, c2: P32.y });
        K.mark({ kind: 'rect', x0: w.x - 1, y0: w.y - 1, x1: w.x + w.w + 1, y1: w.y + w.h + 1, life: 0.4, color: '#ffe066' });
        popWord(w, 0.01, -120);
        W().carve(cx, w.y + w.h / 2, 2.5, { debris: 0.5, cause: 'grep', pow: 2, scorch: true, noCrack: true });
        A('thunder');
      }));
    },
    alt(o) {
      if (!K.cooldown('grep', 3)) return;
      const tp = WP.aimPoint(o);
      const wd = wordAt(tp.x, tp.y);
      const Wd = W();
      let n = 0;
      for (const w of Wd.words) {
        if (wd && w.sig === wd.sig) continue;
        if (Math.hypot(w.x + w.w / 2 - tp.x, w.y + w.h / 2 - tp.y) > 34) continue;
        K.later(n * 0.02, () => popWord(w, 0.01, -60));
        n++;
      }
      A('grep');
      K.mark({ kind: 'text', text: `grep -v: ${n}`, x: tp.x, y: tp.y - 12, life: 1, color: 'y' });
    }
  });

  reg({ id: 'caps', name: 'Caps Lock', rate: 1.1, snd: 'caps', recoil: 2, shake: 5, does: 'A shout cone: letters get heavy and drop', altDoes: 'Toggle: for 10 s every hit knocks letters loose', tip: 'WHY IS EVERYONE SHOUTING' }, {
    sprite: spr('caps', { gx: 4, gy: 7, mx: 10, my: 3 }),
    fire(o) {
      const Wd = W();
      const base = Math.atan2(o.ay, o.ax);
      const seen = new Set();
      for (let k = 0; k < 500; k++) {
        const a = base + rand(-0.45, 0.45), d = rand(3, 90);
        const x = Math.floor(o.x + Math.cos(a) * d), y = Math.floor(o.y + Math.sin(a) * d);
        if (!K.inGrid(x, y)) continue;
        const g = Wd.gid[y * Wd.w + x];
        if (g && Wd.mat[y * Wd.w + x] === Wd.SOLID && !seen.has(g)) seen.add(g);
        if (seen.size > 60) break;
      }
      let n = 0;
      for (const g of seen) { Wd.detachGlyph(g, Math.cos(base) * 120 + rand(-30, 30), 80 + rand(0, 80)); const c = Wd.chunks[Wd.chunks.length - 1]; if (c && c.letter) { c.vy = 200; c.thrown = Math.random() < 0.3; } n++; }
      FX().beam([o.x, o.y, base], { kind: 'wave', life: 0.4, r: 90, spread: 0.45 });
      EN()?.damageCircle?.(o.x + o.ax * 30, o.y + o.ay * 30, 30, 25, 'caps');
      if (n) K.mark({ kind: 'text', text: 'AAAAA', x: o.x + o.ax * 20, y: o.y - 10, life: 0.7, color: 'e', scale: 2 });
    },
    alt() { st.capsT = 10; W().capsT = 10; A('caps'); G()?.label?.('CAPS LOCK ON', 1000); }
  });

  function copyRect(x0, y0, x1, y1) {
    const Wd = W();
    const cells = [];
    for (let y = Math.max(0, y0); y <= Math.min(Wd.gh - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(Wd.w - 1, x1); x++) {
      const i = y * Wd.w + x;
      if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.DEBRIS) cells.push({ dx: x - x0, dy: y - y0, col: Wd.col[i], src: Wd.src[i] });
      else if (Wd.back[i]) cells.push({ dx: x - x0, dy: y - y0, col: Wd.bcol[i], src: Wd.ptex[i] === 1 ? i : -1 });
    }
    return { cells, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  reg({ id: 'copypaste', name: 'Ctrl+C / Ctrl+V', rate: 0.5, snd: 'copy', does: 'First shot copies a block of the screen, then every shot fires heavy copies of it', altDoes: 'Paste the copy as a solid platform where you aim', tip: 'Duplicate content is bad for SEO and great for demolition.' }, {
    sprite: spr('copypaste', { gx: 3, gy: 7, mx: 9, my: 3 }),
    fire(o) {
      if (!st.clip) {
        const tp = WP.aimPoint(o);
        const x0 = Math.round(tp.x - 9), y0 = Math.round(tp.y - 6);
        const c = copyRect(x0, y0, x0 + 18, y0 + 12);
        if (c.cells.length < 20) { A('deny'); return false; }
        st.clip = c;
        K.mark({ kind: 'rect', x0, y0, x1: x0 + 18, y1: y0 + 12, life: 0.6, color: '#8fe3ff' });
        G()?.label?.('COPIED. FIRE TO PASTE IT AT THINGS', 900);
        A('copy');
        return;
      }
      const c = st.clip;
      const pts = []; pts.src = [];
      const bx = Math.round(o.x + o.ax * 10 - c.w / 2), by = Math.round(o.y + o.ay * 10 - c.h / 2);
      for (const q of c.cells) { pts.push(bx + q.dx, by + q.dy, q.col); pts.src.push(q.src); }
      const ch = W().makeChunk(pts, o.ax * 420, o.ay * 420 - 40, { mtl: W().M.METAL, life: 6 });
      ch.thrown = true; ch.va = rand(-2, 2);
      A('paste');
    },
    alt(o) {
      const c = st.clip;
      if (!c) { A('deny'); return; }
      const Wd = W();
      const tp = WP.aimPoint(o);
      const bx = Math.round(tp.x - c.w / 2), by = Math.round(tp.y - c.h / 2);
      for (const q of c.cells) {
        const x = bx + q.dx, y = by + q.dy;
        if (!K.inGrid(x, y) || PL().inside(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID) continue;
        Wd.setCell(x, y, q.col, Wd.M.PLASTIC, 0);
        Wd.src[i] = q.src;
        Wd.touch(i);
      }
      A('paste'); K.mark({ kind: 'rect', x0: bx, y0: by, x1: bx + c.w, y1: by + c.h, life: 0.4 });
    }
  });

  const CELL_KEYS = ['mat', 'col', 'src', 'mtl', 'kind', 'gid', 'back', 'code', 'bcol', 'flag', 'rid', 'ptex', 'burn'];
  function shiftBand(horizontal, a0, a1, off) {
    const Wd = W();
    const N = horizontal ? Wd.w : Wd.gh;
    const tmp = {};
    for (let a = a0; a <= a1; a++) {
      for (const k of CELL_KEYS) tmp[k] = new Array(N);
      for (let b = 0; b < N; b++) { const i = horizontal ? a * Wd.w + b : b * Wd.w + a; for (const k of CELL_KEYS) tmp[k][b] = Wd[k][i]; }
      for (let b = 0; b < N; b++) {
        const sb = b - off;
        const i = horizontal ? a * Wd.w + b : b * Wd.w + a;
        if (WTP.player.inside(horizontal ? b : a, horizontal ? a : b)) continue;
        if (sb < 0 || sb >= N) { if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.DEBRIS || Wd.mat[i] === Wd.RUBBLE) Wd.mat[i] = Wd.HOLE; Wd.back[i] = 0; Wd.code[i] = 0; }
        else for (const k of CELL_KEYS) Wd[k][i] = tmp[k][sb];
        if (Wd.mat[i] === Wd.ROCK) Wd.mat[i] = Wd.HOLE;
        Wd.touch(i);
      }
    }
  }
  function tearAt(o, vertical) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const bands = 4 + ((Math.random() * 3) | 0);
    let pos = vertical ? Math.round(tp.x - 40) : Math.round(tp.y - 30);
    A('tear');
    G()?.chroma?.(1); G()?.shake?.(6);
    for (let k = 0; k < bands; k++) {
      const h = (vertical ? 10 : 6) + ((Math.random() * 10) | 0);
      const a0 = Math.max(0, pos), a1 = Math.min((vertical ? Wd.w : Wd.gh) - 1, pos + h);
      const off = Math.round(rand(8, 40)) * (Math.random() < 0.5 ? -1 : 1);
      if (a1 > a0) shiftBand(!vertical, a0, a1, off);
      pos += h + 1;
    }
    for (const w of ST().wins) if (w && w.state === 'static') ST().dirty(w.id);
    Wd.crumble(tp.x, tp.y, 0, 60);
    G()?.event?.('SCREEN TEARING', tp.x, tp.y - 30, 2);
  }
  reg({ id: 'tearing', name: 'Screen Tearing', rate: 1.8, does: 'Slices the screen into horizontal bands and shifts them sideways', altDoes: 'Vertical tear', tip: 'Vsync: off. Desktop: also off.' }, {
    sprite: spr('tear', { gx: 3, gy: 5, mx: 12, my: 2 }),
    fire(o) { tearAt(o, false); },
    alt(o) { if (!K.cooldown('tearing', 1.5)) return; tearAt(o, true); }
  });

  function pixelSort(o, rows) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const R = 22;
    const lum = (c) => (c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11;
    for (let a = -R; a <= R; a++) {
      const cells = [];
      for (let b = -R; b <= R; b++) {
        const x = Math.floor(rows ? tp.x + b : tp.x + a), y = Math.floor(rows ? tp.y + a : tp.y + b);
        if (!K.inGrid(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID) cells.push(i);
      }
      const vals = cells.map((i) => ({ col: Wd.col[i], src: Wd.src[i], mtl: Wd.mtl[i] })).sort((p, q) => lum(p.col) - lum(q.col));
      cells.forEach((i, k) => { Wd.col[i] = vals[k].col; Wd.src[i] = vals[k].src; Wd.mtl[i] = vals[k].mtl; Wd.gid[i] = 0; Wd.kind[i] = 0; Wd.touch(i); });
      if (cells.length && (a & 3) === 0) A('sort');
    }
    K.mark({ kind: 'rect', x0: tp.x - R, y0: tp.y - R, x1: tp.x + R, y1: tp.y + R, life: 0.8, color: '#d07bff' });
    K.later(0.8, () => { for (let k = 0; k < 8; k++) Wd.carve(tp.x + rand(-R, R), tp.y + rand(-R, R), rand(3, 6), { debris: 0.8, cause: 'sort', pow: 2.5, noCrack: true }); Wd.crumble(tp.x, tp.y, 0, R + 8); });
  }
  reg({ id: 'pixelsort', name: 'Pixel Sorter', rate: 1.3, snd: 'sort', does: 'Sorts a block of pixel columns by brightness, then they crumble', altDoes: 'Row sort', tip: 'Glitch art, but structural.' }, {
    sprite: spr('pixelsort', { gx: 2, gy: 4, mx: 10, my: 2 }),
    fire(o) { pixelSort(o, false); },
    alt(o) { if (!K.cooldown('pixelsort', 1)) return; pixelSort(o, true); }
  });

  function deadPixel(o, hot) {
    const tp = WP.aimPoint(o);
    const Wd = W();
    const cells = [[Math.floor(tp.x), Math.floor(tp.y)]];
    const cols = hot ? [P32.o, P32.y, P32.e] : [P32.m, P32.l, P32['0'], P32.c];
    K.ent({
      life: 2.4,
      update() {
        for (let k = 0; k < 6; k++) {
          const [x, y] = pick(cells);
          const nx = x + pick([-1, 0, 1]), ny = y + pick([-1, 0, 1]);
          if (!K.inGrid(nx, ny)) continue;
          const i = ny * Wd.w + nx;
          if (Wd.mat[i] === Wd.SOLID) { Wd.col[i] = pick(cols); Wd.src[i] = -1; Wd.touch(i); if (hot) Wd.igniteAt(nx, ny, 1); }
          else if (Wd.back[i]) { Wd.bcol[i] = pick(cols); Wd.ptex[i] = 0; Wd.touch(i); }
          cells.push([nx, ny]);
        }
        if (Math.random() < 0.2) A('deadpx');
      },
      end() { WP.explode(tp.x, tp.y, Math.min(16, 4 + Math.sqrt(cells.length)), { letters: 6, cause: 'deadpixel', kind: hot ? 'fire' : 'plasma' }); },
      draw(ctx) { if ((this.t * 8 | 0) & 1) { ctx.fillStyle = hot ? PAL.y : PAL.m; ctx.fillRect(tp.x - 0.5, tp.y - 0.5, 1, 1); } }
    });
  }
  reg({ id: 'deadpixel', name: 'Dead Pixel', rate: 0.9, snd: 'deadpx', does: 'A stuck pixel that spreads across whatever it touches, then pops', altDoes: 'Hot pixel: spreads fire instead', tip: 'Warranty void.' }, {
    sprite: spr('deadpx', { gx: 2, gy: 4, mx: 5, my: 2 }),
    fire(o) { deadPixel(o, false); },
    alt(o) { if (!K.cooldown('deadpixel', 1.2)) return; deadPixel(o, true); }
  });

  const THEMES = [
    ['#1e1e2e', '#313244', '#585b70', '#cba6f7', '#f38ba8', '#fab387', '#a6e3a1', '#89b4fa'],
    ['#1a1b26', '#24283b', '#414868', '#7aa2f7', '#bb9af7', '#f7768e', '#9ece6a', '#e0af68'],
    ['#282828', '#3c3836', '#665c54', '#fb4934', '#fabd2f', '#b8bb26', '#83a598', '#d3869b'],
    ['#2e3440', '#3b4252', '#4c566a', '#88c0d0', '#81a1c1', '#bf616a', '#a3be8c', '#ebcb8b'],
    ['#191724', '#26233a', '#403d52', '#eb6f92', '#f6c177', '#ebbcba', '#31748f', '#9ccfd8'],
    ['#1f1f28', '#2a2a37', '#54546d', '#c34043', '#76946a', '#c0a36e', '#7e9cd8', '#957fb8']
  ];
  reg({ id: 'theme', name: 'Theme Switcher', rate: 1, snd: 'theme', does: 'Repaints an area in another Omarchy theme palette, then cracks it', altDoes: 'Cycles the whole screen through themes for five seconds', tip: 'omarchy-theme-next, but weaponised.' }, {
    sprite: spr('theme', { gx: 1, gy: 4, mx: 5, my: 2 }),
    fire(o) {
      const tp = WP.aimPoint(o);
      const Wd = W();
      const pal = pick(THEMES).map((h) => WTP.packHex(h));
      const R = 18;
      const pickC = (c) => pal[Math.min(pal.length - 1, Math.floor(WTP.lum(c) * pal.length))];
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue;
        const x = Math.floor(tp.x + dx), y = Math.floor(tp.y + dy);
        if (!K.inGrid(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID) { Wd.col[i] = mix(Wd.col[i], pickC(Wd.col[i]), 0.8); Wd.touch(i); }
        else if (Wd.back[i]) { Wd.bcol[i] = mix(Wd.bcol[i], pickC(Wd.bcol[i]), 0.85); Wd.touch(i); }
      }
      K.mark({ kind: 'ring', x: tp.x, y: tp.y, r: R, life: 0.5, color: '#cba6f7' });
      K.later(0.6, () => ST().impact(tp.x, tp.y, 8, 5));
    },
    alt() {
      if (!K.cooldown('theme', 10)) return;
      G()?.forceFull?.(5.2);
      K.ent({ life: 5, update() { document.getElementById('cv').style.filter = `hue-rotate(${Math.round(this.t * 220)}deg) saturate(1.6)`; }, end() { document.getElementById('cv').style.filter = ''; } });
      A('theme');
      G()?.announce?.('THEME ROULETTE', 3);
    }
  });

  shotType('usb', {
    step(s, dt) {
      if (s.plugged) {
        s.pt -= dt;
        if (Math.random() < 0.3) FX().spark(s.x, s.y, rand(-30, 30), rand(-60, 0), P32.c, 0.2);
        if (s.pt <= 0) { WP.explode(s.x, s.y, 13, { letters: 10, cause: 'usb' }); return true; }
        return false;
      }
      s.vy += 520 * dt; s.spin = (s.spin || 0) + dt * 12;
      return WP.travel(s, dt, (x, y, isE, e) => {
        if (isE) { e.damage(20, 'usb'); return false; }
        s.tries = (s.tries || 0) + 1;
        if (s.tries < 3) { A('usbNo'); FX().pop(x, y - 4, s.tries === 1 ? 'NOPE' : 'FLIP', { scale: 1, ramp: ['7', '6'], life: 0.6 }); s.vy = -170; s.vx = -s.vx * 0.6; s.y -= 1; return false; }
        s.plugged = true; s.pt = 0.6; s.vx = 0; s.vy = 0; A('usb'); FX().pop(x, y - 4, 'PLUGGED IN', { scale: 1, ramp: ['L', 'l'], life: 0.8 });
        return false;
      });
    },
    draw(ctx, s) { ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.plugged ? 0 : s.spin); ctx.fillStyle = PAL['0']; ctx.fillRect(-2.5, -1.2, 5, 2.4); ctx.fillStyle = PAL['3']; ctx.fillRect(-2, -0.8, 3, 1.6); ctx.fillStyle = PAL['6']; ctx.fillRect(1, -0.6, 1.6, 1.2); ctx.restore(); }
  });
  reg({ id: 'usb', name: 'USB Stick', rate: 1, throw: true, snd: 'throw', does: 'Never fits the first time: it flips twice, plugs in, then explodes', altDoes: 'Format: wipes an area perfectly flat', tip: 'Superposition: both the wrong way and the other wrong way.' }, {
    sprite: spr('usb', { gx: 2, gy: 3, mx: 10, my: 2 }),
    fire(o) { WP.addShot({ t: 'usb', x: o.x, y: o.y, vx: o.ax * 280, vy: o.ay * 280 - 40, life: 8 }); },
    alt(o) {
      if (!K.cooldown('usb', 3)) return;
      const tp = WP.aimPoint(o);
      const Wd = W();
      const x0 = Math.round(tp.x - 24), y0 = Math.round(tp.y - 12);
      K.mark({ kind: 'rect', x0, y0, x1: x0 + 48, y1: y0 + 24, life: 0.6 });
      K.mark({ kind: 'text', text: 'FORMATTING...', x: tp.x, y: y0 - 6, life: 1, color: 'C' });
      let n = 0;
      for (let y = y0; y <= y0 + 24; y++) for (let x = x0; x <= x0 + 48; x++) {
        if (!K.inGrid(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.DEBRIS || Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.ICE) n += Wd.kill(i, x, y, x, y, 0, 0);
        if (Wd.back[i]) { Wd.back[i] = 0; Wd.touch(i); }
      }
      Wd.crumble(tp.x, tp.y, 0, 40);
      if (n) G()?.scored?.(n, tp.x, tp.y, 'format');
      A('modem');
    }
  });

  shotType('cell', {
    step(s, dt) {
      if (s.landed) {
        s.sw += dt;
        if (Math.random() < 0.4) FX().smoke(s.x, s.y - 2, 1, P32['4']);
        if (s.sw > 1.1 && Math.random() < 0.6) WP.addShot({ t: 'flame', x: s.x, y: s.y - 2, vx: rand(-60, 60), vy: rand(-220, -120), life: 0.5, dmg: 2 });
        if (s.sw > 1.8) { WP.explode(s.x, s.y, 14, { letters: 10, cause: 'battery', fire: 0.6 }); W().igniteAt(Math.floor(s.x), Math.floor(s.y), 30); return true; }
        return false;
      }
      s.vy += 520 * dt;
      return WP.travel(s, dt, (x, y, isE) => { if (isE) return false; s.landed = true; s.sw = 0; s.vx = 0; s.vy = 0; s.y -= 1; A('swell'); return false; });
    },
    draw(ctx, s) {
      const k = s.landed ? 1 + Math.min(1.2, s.sw * 0.7) + Math.sin(s.sw * 30) * 0.05 * s.sw : 1;
      ctx.save(); ctx.translate(s.x, s.y); ctx.scale(k, 1 + (k - 1) * 0.6);
      ctx.fillStyle = PAL['0']; ctx.fillRect(-1.8, -3.2, 3.6, 5.6);
      ctx.fillStyle = s.landed && s.sw > 1 ? PAL.e : PAL.l; ctx.fillRect(-1.3, -2.6, 2.6, 4.6);
      ctx.fillStyle = PAL['6']; ctx.fillRect(-0.6, -3.8, 1.2, 0.8);
      ctx.restore();
    }
  });
  reg({ id: 'battery', name: 'Battery Swell', rate: 1.2, throw: true, snd: 'throw', does: 'A lithium cell that swells, vents fire, then explodes', altDoes: 'Overcharge: nearby metal throws sparks and arcs', tip: 'Do not puncture. Do not heat. Definitely do not throw.' }, {
    sprite: spr('battery', { gx: 1, gy: 6, mx: 4, my: 3 }),
    fire(o) { WP.addShot({ t: 'cell', x: o.x, y: o.y, vx: o.ax * 240, vy: o.ay * 240 - 40, life: 9 }); },
    alt() {
      if (!K.cooldown('battery', 2)) return;
      const Wd = W();
      const P = PL();
      const cx = P.x + 3, cy = P.y + 7;
      let n = 0;
      for (let k = 0; k < 400 && n < 14; k++) {
        const x = Math.floor(cx + rand(-45, 45)), y = Math.floor(cy + rand(-35, 35));
        if (!K.inGrid(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID && Wd.mtl[i] === Wd.M.METAL) { FX().bolt(cx, cy, x, y); Wd.carve(x, y, 2.5, { debris: 0.5, cause: 'arc', pow: 4, scorch: true, ignite: 0.3, noCrack: true }); n++; }
      }
      EN()?.damageCircle?.(cx, cy, 45, 40, 'arc');
      A('tesla');
    }
  });

  shotType('wheel', {
    step(s, dt) {
      s.spin = (s.spin || 0) + dt * 25 * Math.sign(s.dir);
      s.vy += 600 * dt;
      const below = solidAt(s.x, s.y + 3);
      if (below) s.vx = s.dir * 210;
      const ahead = solidAt(s.x + s.dir * 3, s.y);
      if (ahead) { if (s.climb) s.vy = -200; else if (s.age > 0.2 && (s.turnT = (s.turnT || 0) - dt) <= 0) { s.dir = -s.dir; s.turnT = 0.3; s.bounce = (s.bounce || 0) + 1; } }
      W().carve(s.x, s.y + (below ? 1 : 0), 2.6, { debris: 0.5, force: 60, cause: 'scroll', pow: 2, noCrumble: Math.random() < 0.8, pop: 0.4, noCrack: true });
      if (Math.random() < 0.4) FX().spark(s.x, s.y + 2, -s.dir * rand(40, 120), rand(-90, -20), P32.y, 0.2);
      A('scroll');
      EN()?.damageCircle?.(s.x, s.y, 4, 60 * dt, 'saw');
      const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
      if (!solidAt(nx, ny + 2)) s.y = ny; else s.vy = 0;
      s.x = nx;
      return s.life <= 0 || s.x < -5 || s.x > W().w + 5 || s.y > W().h || (s.bounce || 0) > 4;
    },
    draw(ctx, s) {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin);
      ctx.fillStyle = PAL['0']; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PAL['5']; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = PAL['2']; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; ctx.fillRect(Math.cos(a) * 2.2 - 0.4, Math.sin(a) * 2.2 - 0.4, 0.8, 0.8); }
      ctx.restore();
    }
  });
  reg({ id: 'scroll', name: 'Scroll Wheel', rate: 0.9, snd: 'scroll', does: 'A rolling saw blade that rides along surfaces, carving as it goes', altDoes: 'Scroll up: a blade that climbs walls', tip: 'Infinite scroll, finite desktop.' }, {
    sprite: spr('scroll', { gx: 3, gy: 7, mx: 8, my: 4 }),
    fire(o) { WP.addShot({ t: 'wheel', x: o.x, y: o.y, vx: o.ax * 200, vy: o.ay * 200, life: 5, dir: o.ax >= 0 ? 1 : -1 }); },
    alt(o) { WP.addShot({ t: 'wheel', x: o.x, y: o.y, vx: o.ax * 200, vy: o.ay * 200, life: 5, dir: o.ax >= 0 ? 1 : -1, climb: true }); }
  });

  shotType('toastcard', {
    step(s, dt) {
      if (s.stuck) { s.st -= dt; if (s.st <= 0) { WP.explode(s.x, s.y, 6, { letters: 5, cause: 'toast' }); return true; } return false; }
      s.vy += 200 * dt;
      return WP.travel(s, dt, (x, y, isE, e) => { if (isE) e.damage(20, 'toast'); s.stuck = true; s.st = 1.6 + rand(0, 0.8); s.vx = 0; s.vy = 0; A('toast'); return false; });
    },
    draw(ctx, s) {
      const th = WTP.deskTheme || {};
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(s.x - 6, s.y - 2.6, 12.6, 5.6);
      ctx.fillStyle = th.background || '#1e1f21'; ctx.fillRect(s.x - 6.4, s.y - 3, 12.6, 5.6);
      ctx.fillStyle = th.accent || '#d8d8d8'; ctx.fillRect(s.x - 5.6, s.y - 2.2, 1.6, 1.6);
      ctx.fillStyle = th.foreground || '#cccccc'; ctx.fillRect(s.x - 3.4, s.y - 2, 8, 0.8); ctx.fillRect(s.x - 3.4, s.y - 0.4, 6, 0.6);
      if (s.stuck && (s.st * 6 | 0) & 1) { ctx.fillStyle = PAL.e; ctx.fillRect(s.x + 4.6, s.y - 3, 1.6, 1.6); }
    }
  });
  reg({ id: 'notifspam', name: 'Notification Spam', rate: 0.3, snd: 'notifPop', does: 'Fires toast cards that stick, stack up, then explode', altDoes: 'Do Not Disturb: a silence field that stuns every enemy around you', tip: 'You have 99+ unread explosions.' }, {
    sprite: spr('notifspam', { gx: 3, gy: 5, mx: 12, my: 2 }),
    fire(o) { WP.addShot({ t: 'toastcard', x: o.x, y: o.y, vx: o.ax * 340 + rand(-20, 20), vy: o.ay * 340 - 20, life: 6, rad: 4, dmg: 0 }); },
    alt() {
      if (!K.cooldown('notifspam', 6)) return;
      const P = PL();
      for (const e of EN()?.list || []) if (Math.hypot(e.x - P.x, e.y - P.y) < 70) e.stun = 4;
      K.mark({ kind: 'ring', x: P.x + 3, y: P.y + 7, r: 70, life: 0.8, color: '#9a4dff' });
      K.mark({ kind: 'text', text: 'DO NOT DISTURB', x: P.x + 3, y: P.y - 8, life: 1.2, color: 'P' });
      A('notifPop');
    }
  });

  reg({ id: 'defrag', name: 'Defrag', rate: 2, snd: 'defrag', does: 'Pulls loose rubble into neat colored blocks, then blows the blocks', altDoes: 'Fragment: scatters every block it made', tip: 'Optimizing drive C: with explosives.' }, {
    sprite: spr('defrag', { gx: 2, gy: 4, mx: 8, my: 2 }),
    fire(o) {
      const Wd = W();
      const tp = WP.aimPoint(o);
      const cols = [];
      for (let k = 0; k < 4000 && cols.length < 600; k++) {
        const x = Math.floor(tp.x + rand(-50, 50)), y = Math.floor(tp.y + rand(-40, 40));
        if (!K.inGrid(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) { const c = Wd.col[i]; cols.push(c); Wd.kill(i, x, y, x, y, 0, 0); FX().suck(x + 0.5, y + 0.5, 0, 0, c, tp.x, tp.y, 0.6); }
      }
      if (cols.length < 20) { A('deny'); G()?.label?.('NOTHING TO DEFRAG HERE', 800); return false; }
      cols.sort((a, b) => WTP.lum(a) - WTP.lum(b));
      const side = Math.ceil(Math.sqrt(cols.length));
      const x0 = Math.round(tp.x - side / 2), y0 = Math.round(tp.y - side / 2);
      const placed = [];
      cols.forEach((c, k) => {
        const x = x0 + (k % side) + Math.floor((k % side) / 6), y = y0 + Math.floor(k / side) + Math.floor(Math.floor(k / side) / 6);
        if (!K.inGrid(x, y) || PL().inside(x, y)) return;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID) return;
        Wd.setCell(x, y, c, Wd.M.PLASTIC, 0); placed.push(i);
      });
      st.defragBlocks = placed;
      A('defrag');
      K.mark({ kind: 'text', text: 'DEFRAGMENTED', x: tp.x, y: y0 - 6, life: 1, color: 'c' });
      K.later(1.1, () => WP.explode(tp.x, tp.y, Math.min(18, 6 + side * 0.6), { letters: 8, cause: 'defrag' }));
    },
    alt() {
      const Wd = W();
      const b = st.defragBlocks || [];
      if (!b.length) { A('deny'); return; }
      for (const i of b) if (Wd.mat[i] === Wd.SOLID) { const x = i % Wd.w, y = (i / Wd.w) | 0; FX().debris(x, y, rand(-200, 200), rand(-260, 0), Wd.col[i]); Wd.kill(i, x, y, x, y, 0, 0); }
      st.defragBlocks = [];
      A('crash', 100);
    }
  });

  reg({ id: 'overclock', name: 'Overclock', rate: 8, snd: 'overclock', does: 'A heat aura that melts what is around you and doubles your fire rate for a while', altDoes: 'Thermal throttle: a cooling burst that freezes everything around you', tip: '5.8 GHz, liquid cooling optional.' }, {
    sprite: spr('overclock', { gx: 3, gy: 7, mx: 9, my: 3 }),
    fire() { st.overT = 7; G()?.announce?.('OVERCLOCKED', 3); },
    alt() {
      if (!K.cooldown('overclock', 5)) return;
      const P = PL();
      const Wd = W();
      st.overT = 0;
      Wd.freezeAt(P.x + 3, P.y + 7, 20);
      for (const b of Wd.burning) Wd.burn[b] = 1;
      for (const e of EN()?.list || []) if (Math.hypot(e.x - P.x, e.y - P.y) < 26) e.stun = 2.5;
      K.mark({ kind: 'ring', x: P.x + 3, y: P.y + 7, r: 22, life: 0.6, color: '#8fe3ff' });
      A('freezeHit'); G()?.label?.('THERMAL THROTTLING', 800);
    }
  });

  function peel(o, big) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const len = big ? 120 : 70, wid = big ? 60 : 8;
    const a = Math.atan2(o.ay, o.ax);
    const pts = [];
    let n = 0;
    for (let d = 0; d < len; d++) for (let q = -wid / 2; q <= wid / 2; q++) {
      const x = Math.floor(tp.x + Math.cos(a) * (d - len / 2) - Math.sin(a) * q), y = Math.floor(tp.y + Math.sin(a) * (d - len / 2) + Math.cos(a) * q);
      if (!K.inGrid(x, y)) continue;
      const i = y * Wd.w + x;
      if (Wd.code[i] && !Wd.back[i] && Wd.mat[i] !== Wd.SOLID) {
        Wd.code[i] = 0;
        Wd.touch(i);
        if ((hash(x, y) & 3) === 0) pts.push(x, y, Wd.wvis[i] ? Wd.ocol[i] : shade(Wd.ocol[i] || P32['2'], 0.9));
        n++;
      }
    }
    if (pts.length >= 15) { const c = Wd.makeChunk(pts, o.ax * 120, -160, { mtl: Wd.M.PAPER, life: 6 }); c.va = rand(-3, 3); }
    A('peel');
    if (!n) { A('deny'); G()?.label?.('AIM AT BARE WALLPAPER', 800); }
    else G()?.scored?.(n, tp.x, tp.y, 'peel');
  }
  reg({ id: 'peeler', name: 'Wallpaper Peeler', rate: 0.7, snd: 'peel', does: 'Peels long strips of wallpaper off and flings them', altDoes: 'Peels a whole wallpaper sheet', tip: 'Behind the wallpaper there is only void.' }, {
    sprite: spr('peeler', { gx: 1, gy: 6, mx: 8, my: 1 }),
    fire(o) { peel(o, false); },
    alt(o) { if (!K.cooldown('peeler', 2)) return; peel(o, true); }
  });

  WTP.deskWeapons = { K, closeWindow, strike, wordAt, popWord, rainLine, textPixels };
})();
