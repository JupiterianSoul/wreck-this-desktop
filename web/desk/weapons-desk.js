(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand } = WTP;
  const WP = WTP.weapons, SP = WTP.sprites;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player, EN = () => WTP.enemies, ST = () => WTP.structs;
  const A = (n, x) => WTP.audio.play(n, x);
  if (!WP.CATS.find((c) => c.id === 'desk')) WP.CATS.push({ id: 'desk', short: 'Desk', name: 'Desktop', icon: 'grid', col: 'c' });
  const S = (rows, o) => SP.S(rows, o);
  const marks = [];
  WP.EXT.resets.push(() => { marks.length = 0; queue.length = 0; });
  WP.EXT.updates.push((dt) => {
    for (let k = marks.length - 1; k >= 0; k--) { const m = marks[k]; m.t += dt; if (m.t > m.life) marks.splice(k, 1); }
    for (let k = queue.length - 1; k >= 0; k--) { const q = queue[k]; q.t -= dt; if (q.t <= 0) { queue.splice(k, 1); q.fn(); } }
  });
  const queue = [];
  WP.later = (t, fn) => queue.push({ t, fn });
  WP.EXT.draws.push((ctx) => {
    for (const m of marks) {
      const k = m.t / m.life;
      if (m.kind === 'x') {
        const s = 7 * (k < 0.15 ? k / 0.15 : 1), x = m.x, y = m.y;
        ctx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
        ctx.fillStyle = '#e04a3f'; ctx.fillRect(x - s, y - s * 0.75, s * 2, s * 1.5);
        ctx.fillStyle = '#fff';
        for (let d = -s * 0.5; d <= s * 0.5; d += 0.5) { ctx.fillRect(x + d - 0.5, y + d * 0.75 - 0.5, 1, 1); ctx.fillRect(x + d - 0.5, y - d * 0.75 - 0.5, 1, 1); }
        ctx.globalAlpha = 1;
      }
    }
  });
  const regionOf = (x, y) => {
    const Wd = W();
    const cx = Math.floor(x), cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= Wd.w || cy >= Wd.gh) return 0;
    const s = ST().slabAt(cx, cy);
    if (s) return s.win.id;
    return Wd.rid[cy * Wd.w + cx];
  };
  function beamTo(o, range, stopAt) {
    const Wd = W();
    let x = o.x, y = o.y;
    const r0 = regionOf(o.x, o.y);
    for (let d = 0; d < range; d += 0.6) {
      x += o.ax * 0.6; y += o.ay * 0.6;
      if (x < 0 || y < 0 || x >= Wd.w || y >= Wd.gh) return { x, y, rid: 0 };
      const r = regionOf(x, y);
      if (r && r === r0 && !(d > 4 && Wd.solid(Math.floor(x), Math.floor(y)))) continue;
      if (stopAt(r, Math.floor(x), Math.floor(y))) return { x, y, rid: r };
    }
    return { x, y, rid: 0 };
  }
  function closeWindow(rid, fromX, fromY, opts = {}) {
    const w = ST().wins[rid];
    const Wd = W();
    if (!w || (w.state !== 'static' && w.state !== 'hanging')) return false;
    const r = w.reg;
    marks.push({ kind: 'x', x: r.x1 - 6, y: r.y0 + 4, t: 0, life: 0.9 });
    FX().pop((r.x0 + r.x1) / 2, r.y0 + 6, 'ALT+F4', { scale: 3, ramp: ['7', 'K', 'k', 'e'], life: 1.1, vy: -10 });
    A('altf4');
    G()?.shake?.(8);
    G()?.chroma?.(0.6);
    WP.later(0.18, () => {
      ST().collapse(rid, { vy: -80, vx: (((r.x0 + r.x1) / 2) - fromX) * 0.4, va: rand(-0.6, 0.6), shatter: opts.shatter });
      Wd.carve(r.x1 - 6, r.y0 + 4, 5, { debris: 0.8, force: 140, cause: 'altf4', pow: 6, noCrack: true });
      G()?.stat?.('windows', 1);
    });
    return true;
  }
  WP.closeWindow = closeWindow;

  WP.register({ id: 'altf4', name: 'Alt+F4', cat: 'desk', price: 0, rate: 1.1, snd: null, recoil: 3, shake: 4, kick: 30, does: 'A beam: the window it hits loses its bolts, folds and collapses', altDoes: 'Alt+F4 every window on screen, one after another', tip: 'The most honest key combo ever made.' }, {
    sprite: S([
      '.66666666666.',
      '6555555555556',
      '65e5e5555o556',
      '655e55555o556',
      '65e5e555oo556',
      '6555555555556',
      '.666.33......',
      '.....33......'
    ], { gx: 5, gy: 6, mx: 13, my: 3 }),
    fire(o) {
      const hit = beamTo(o, 900, (r) => r > 0 && ST().wins[r] && (ST().wins[r].state === 'static' || ST().wins[r].state === 'hanging'));
      FX().beam([o.x, o.y, hit.x, hit.y], { kind: 'rail', life: 0.22, w: 2, c1: P32['7'], c2: P32.e, c3: P32.k });
      for (let k = 0; k < 14; k++) FX().spark(hit.x, hit.y, rand(-140, 140), rand(-140, 60), k & 1 ? P32.e : P32['7'], 0.3);
      if (hit.rid) closeWindow(hit.rid, o.x, o.y);
      else { W().carve(hit.x, hit.y, 4, { debris: 0.6, force: 90, cause: 'altf4', pow: 3 }); A('usbNo'); }
    },
    alt(o) {
      if (performance.now() < (WP.st.altf4Cd || 0)) { A('deny'); G()?.label?.('ALT+F4 ALL IS RECHARGING', 700); return; }
      WP.st.altf4Cd = performance.now() + 12000;
      const wins = ST().wins.filter((w) => w && w.state === 'static');
      if (!wins.length) { A('deny'); return; }
      A('closeAll');
      G()?.announce?.('CLOSE ALL WINDOWS', 4);
      wins.sort((a, b) => a.reg.y0 - b.reg.y0 || a.reg.x0 - b.reg.x0);
      wins.forEach((w, k) => WP.later(0.4 + k * 0.45, () => closeWindow(w.id, o.x, o.y)));
    }
  });
})();
