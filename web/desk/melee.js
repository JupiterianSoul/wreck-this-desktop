(() => {
  const WTP = window.WTP;
  const WP = WTP.weapons, st = WP.st;
  const W = () => WTP.world, PL = () => WTP.player, G = () => WTP.game, EN = () => WTP.enemies, FX = () => WTP.fx;
  const A = (n, x) => WTP.audio.play(n, x);
  const rand = (a, b) => a + Math.random() * (b - a);
  const dith = WTP.sprites.dith;
  const M = { smears: [], stars: [] };
  WTP.melee = M;
  let lastO = null;

  const ease = (k) => 1 - (1 - k) * (1 - k);
  function begin(id, spec) {
    const P = PL();
    st.ms = { id, t: 0, wind: 0.08, strike: 0.07, follow: 0.16, from: -1.4, to: 0.9, over: 1.15, dir: P.face, hitAt: 0.6, hit: null, done: false, smear: null, ...spec };
    if (st.ms.windSnd) A(st.ms.windSnd);
  }
  M.pose = () => {
    const s = st.ms;
    if (!s || s.id !== st.cur) return null;
    const { wind, strike, follow, from, to, over } = s;
    let a;
    if (s.t < wind) a = from * ease(s.t / wind);
    else if (s.t < wind + strike) a = from + (to - from) * ease((s.t - wind) / strike);
    else if (s.t < wind + strike + follow) { const k = (s.t - wind - strike) / follow; a = k < 0.35 ? to + (over - to) * (k / 0.35) : over * (1 - (k - 0.35) / 0.65); }
    else a = 0;
    return a * s.dir;
  };
  const oSwing = WP.swing;
  WP.swing = () => { const p = M.pose(); if (p != null) return p; if (st.hcharge > 0 && st.cur === 'hammer') return -Math.min(1, st.hcharge / 0.7) * 2.0 * PL().face; return oSwing(); };

  M.smear = (cx, cy, a0, a1, r0, r1, c1, c2, dur = 0.11) => {
    const pts = [];
    const seen = new Set();
    const span = a1 - a0;
    for (let r = r0; r <= r1; r += 0.6) {
      const step = 0.45 / Math.max(2, r);
      for (let a = 0; a <= 1; a += step / Math.max(0.01, Math.abs(span))) {
        const ang = a0 + span * a;
        const x = Math.round(cx + Math.cos(ang) * r), y = Math.round(cy + Math.sin(ang) * r);
        const key = x * 4096 + y;
        if (seen.has(key)) continue;
        seen.add(key);
        pts.push(x, y, a, (r - r0) / Math.max(0.1, r1 - r0));
      }
    }
    M.smears.push({ pts, t: 0, dur, c1, c2 });
    if (M.smears.length > 8) M.smears.shift();
  };
  M.impact = (x, y, size = 1, col = '#ffe9a0') => {
    M.stars.push({ x, y, t: 0, dur: 0.07 + size * 0.03, s: size, col, a0: Math.random() * 0.8 });
    if (M.stars.length > 10) M.stars.shift();
    WTP.feel?.parts?.push?.({ x, y, vx: 0, vy: 0, t: 0, dur: 0.1, c: '#ffffff', r: 0.5 });
  };
  function stop(t) { G()?.hitstop?.(t, true); }

  const cur = (o) => lastO || o;
  const hand = () => { const P = PL(); return P.gunPos || P.center(); };

  function katanaHit(o, idx) {
    const big = idx === 2;
    const dir = idx === 1 ? -1 : 1;
    st.katanaDir = dir;
    const base = Math.atan2(o.ay, o.ax);
    const Wd = W();
    let n = 0;
    const R = (PL().dashT > 0 ? 26 : 19) * (big ? 1.3 : 1);
    const span = big ? 1.55 : 1.1;
    for (let r = R - 3; r <= R; r += 1.5) {
      for (let a = -span; a <= span; a += 0.05) {
        const ang = base + a * dir;
        n += Wd.carve(o.x - o.ax * 6 + Math.cos(ang) * r, o.y - o.ay * 6 + Math.sin(ang) * r, big ? 1.2 : 0.9, { debris: 0.12, force: 60, noCrumble: true, pop: 0, cause: 'katana' });
      }
    }
    n += Wd.crumble(o.x, o.y, 0, R + 6);
    for (let k = 0; k < (big ? 7 : 4); k++) { const a = base + rand(-span, span); Wd.letterRing(o.x + Math.cos(a) * R * 0.6, o.y + Math.sin(a) * R * 0.6, 0, 5, 120); }
    const hit = EN()?.damageCircle?.(o.x + o.ax * 12, o.y + o.ay * 12, R, big ? 85 : 45, 'katana') || 0;
    const h = hand();
    M.smear(h.x, h.y, base - span * dir, base + span * dir, R * 0.55, R - 1, '#ffffff', big ? '#ffd23f' : '#9fd8ff', big ? 0.16 : 0.11);
    if (n || hit) {
      const tx = o.x + o.ax * R * 0.7, ty = o.y + o.ay * R * 0.7;
      M.impact(tx, ty, big ? 2 : 1, big ? '#ffd23f' : '#ffffff');
      stop(big ? 0.08 : 0.04);
      G()?.shake?.(big ? 6 : 3);
    }
    A(['katana1', 'katana2', 'katana3'][idx]);
    if (big) { G()?.event?.('ISSEN!', o.x + o.ax * 14, o.y - 10, 1); PL().vx += o.ax * 120; }
  }
  WP.FIRE.katana = (o) => {
    const now = st.clock || 0;
    st.kIdx = now - (st.kLast || -9) < 0.55 ? ((st.kIdx || 0) + 1) % 3 : 0;
    st.kLast = now;
    const idx = st.kIdx;
    begin('katana', { wind: 0.035, strike: 0.05, follow: idx === 2 ? 0.2 : 0.12, from: idx === 1 ? 1.1 : -1.3, to: idx === 1 ? -1.0 : 1.0, over: idx === 1 ? -1.3 : 1.35, dir: PL().face, hit: () => katanaHit(cur(o), idx), hitAt: 0.2 });
    if (idx === 2) st.cd = 0.14;
  };

  const HAM_FULL = 0.7;
  WP.BY.hammer.hold = true;
  WP.BY.hammer.does = 'Tap to smash, hold to wind up a charged slam. Smash the floor to pogo upward';
  WP.HOLD.hammer = (o, dt) => {
    if ((st.hcd || 0) > 0 || st.ms?.id === 'hammer') return;
    const was = st.hcharge || 0;
    st.hcharge = Math.min(HAM_FULL, was + dt);
    if (was === 0) A('hammerCharge');
    if (was < HAM_FULL && st.hcharge >= HAM_FULL) { A('hammerReady'); M.impact(o.hx, o.hy - 6, 0.6, '#ffffff'); }
    if (st.hcharge >= HAM_FULL && Math.random() < 0.4) FX().spark(o.x + rand(-3, 3), o.y + rand(-3, 3), rand(-20, 20), rand(-40, -10), WTP.P32.Y, 0.2);
  };
  WP.RELEASE.hammer = (o) => {
    const c = Math.min(1, (st.hcharge || 0) / HAM_FULL);
    st.hcharge = 0;
    if ((st.hcd || 0) > 0 || st.ms?.id === 'hammer') return;
    st.hcd = 0.3 + c * 0.3;
    G()?.stat?.('shots', 1);
    G()?.weaponUsed?.('hammer');
    begin('hammer', { wind: c > 0.15 ? 0.02 : 0.07, strike: 0.06, follow: 0.18, from: -2.0, to: 1.0, over: 1.2, hit: () => hammerHit(cur(o), c), hitAt: 0.5, windSnd: 'heave' });
  };
  function hammerHit(o, c) {
    const Wd = W();
    const cx = o.x + o.ax * 7, cy = o.y + o.ay * 7;
    const r = 12.5 * (1 + c * 0.8);
    const n = Wd.carve(cx, cy, r, { debris: 0.55, force: 150 + c * 120, cause: 'hammer', letters: 6 + c * 10 });
    const hit = EN()?.damageCircle?.(cx, cy, r + 2, 50 + c * 90, 'hammer') || 0;
    const h = hand(), base = Math.atan2(o.ay, o.ax), dir = PL().face;
    M.smear(h.x, h.y, base - 1.6 * dir, base + 0.4 * dir, 6, 11, '#ffffff', '#a8b0bd', 0.12);
    if (n || hit) {
      M.impact(cx, cy, 1 + c * 2);
      stop(0.05 + c * 0.06);
      G()?.shake?.(6 + c * 6);
      A(c > 0.5 ? 'hammerSlam' : 'hammer');
      const P = PL();
      if (o.ay > 0.45) { P.vy = Math.min(P.vy, -230 - c * 140); P.ground = false; P.jumps = 1; }
      else P.vx -= o.ax * (70 + c * 60);
      if (c > 0.5) {
        WP.shockwave(cx, cy, 30 + c * 40, true);
        WTP.feel?.ring?.(cx, cy, 20 + c * 30, { dur: 0.35, c: '#e8ecf2', c2: '#ffffff' });
        if (c >= 0.99) G()?.event?.('SLAM!', cx, cy - 10, 2);
      } else FX().anim('ring', 32, cx, cy, 0.2);
      WTP.vibe(30 + c * 50);
    } else A('swoosh');
  }

  const oGlove = WP.FIRE.glove;
  WP.FIRE.glove = (o) => {
    begin('glove', { wind: 0.07, strike: 0.04, follow: 0.12, from: -0.5, to: 0.15, over: 0.2, hit: () => { const q = cur(o); oGlove(q); const x = q.x + q.ax * 9, y = q.y + q.ay * 9; M.impact(x, y, 1.4, '#ff8a7a'); stop(0.05); A('glovePunch'); }, hitAt: 0.5, windSnd: 'spring' });
    st.glove = 0.22;
  };
  const oStamp = WP.FIRE.stamp;
  WP.FIRE.stamp = (o) => {
    begin('stamp', { wind: 0.09, strike: 0.05, follow: 0.15, from: -1.7, to: 0.5, over: 0.6, hit: () => { const q = cur(o); oStamp(q); const x = q.x + q.ax * 12, y = q.y + q.ay * 12; M.impact(x, y, 1.5, '#ff6a5a'); stop(0.06); G()?.shake?.(5); A('stampSlam'); const h = hand(), b = Math.atan2(q.ay, q.ax), d = PL().face; M.smear(h.x, h.y, b - 1.5 * d, b + 0.3 * d, 5, 9, '#ffd0c8', '#d9493c', 0.1); }, hitAt: 0.6, windSnd: 'heave' });
  };

  WP.EXT.updates.push((dt, o, d, want) => {
    lastO = o;
    st.hcd = Math.max(0, (st.hcd || 0) - dt);
    if (d.id !== 'hammer' && st.hcharge) st.hcharge = 0;
    const s = st.ms;
    if (s) {
      s.t += dt;
      if (!s.done && s.t >= s.wind + s.strike * s.hitAt) { s.done = true; try { s.hit?.(); } catch (e) { console.warn(e); } }
      if (s.t > s.wind + s.strike + s.follow || s.id !== d.id) st.ms = null;
    }
    if ((d.id === 'chainsaw' || d.id === 'drill') && want) {
      st.revT = (st.revT || 0) + dt;
      if (st.revT === dt) A(d.id === 'chainsaw' ? 'chainsawRev' : 'drill');
    } else st.revT = 0;
    for (const m of M.smears) m.t += dt;
    M.smears = M.smears.filter((m) => m.t < m.dur);
    for (const s2 of M.stars) s2.t += dt;
    M.stars = M.stars.filter((s2) => s2.t < s2.dur);
  });
  const oSw2 = WP.swing;
  WP.swing = () => {
    const base = oSw2();
    const r = st.revT || 0;
    if (r > 0 && (st.cur === 'chainsaw' || st.cur === 'drill')) return base + Math.sin(r * 70) * (st.cur === 'chainsaw' ? 0.05 : 0.03) + (r < 0.25 ? -0.25 * (1 - r / 0.25) * PL().face : 0);
    return base;
  };
  WP.EXT.resets.push(() => { M.smears = []; M.stars = []; st.ms = null; st.hcharge = 0; st.hcd = 0; st.kIdx = 0; });

  WP.EXT.after.push((ctx) => {
    for (const m of M.smears) {
      const k = m.t / m.dur;
      for (let i = 0; i < m.pts.length; i += 4) {
        const x = m.pts[i], y = m.pts[i + 1], along = m.pts[i + 2], rr = m.pts[i + 3];
        const a = (1 - k) * (0.25 + 0.75 * along);
        if (!dith(x, y, a)) continue;
        ctx.fillStyle = rr > 0.6 ? m.c1 : m.c2;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    for (const s of M.stars) {
      const k = s.t / s.dur, cx = Math.round(s.x), cy = Math.round(s.y);
      const L = Math.round((2 + s.s * 3) * (k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6)) + 1;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - 1, 3, 3);
      for (let q = 0; q < 8; q++) {
        const a = s.a0 + q * Math.PI / 4, len = q % 2 ? L * 0.55 : L;
        for (let d = 2; d <= len; d++) { ctx.fillStyle = d > len * 0.6 ? s.col : '#ffffff'; ctx.fillRect(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), 1, 1); }
      }
    }
  });
})();
