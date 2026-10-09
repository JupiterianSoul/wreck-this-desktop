(() => {
  // Whip and Wrecking Ball: both are real verlet ropes (a leather whip, a steel chain) driven by animated attacks
  const WTP = window.WTP;
  const WP = WTP.weapons;
  const { P32, PAL, rand } = WTP;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, EN = () => WTP.enemies, PL = () => WTP.player;
  const A = (n, x) => WTP.audio.play(n, x);
  const TAU = Math.PI * 2;
  const wrapA = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  const solid = (x, y) => W().solid(Math.floor(x), Math.floor(y));
  const hard = (x, y) => W().hardAt(Math.floor(x), Math.floor(y));

  // ---- Rope: points with verlet integration, distance constraints, an optional pinned start, world collision ----
  function rope(n, seg, x, y, ang) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const px = x + Math.cos(ang) * seg * i, py = y + Math.sin(ang) * seg * i; pts.push({ x: px, y: py, px, py, w: 1 }); }
    return { pts, seg, n };
  }
  function ropeStep(r, dt, o = {}) {
    const pts = r.pts, g = (o.g ?? 520) * dt * dt, damp = o.damp ?? 0.985;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (i === 0 && o.pin) continue;
      if (p.fixed) continue;
      const vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + g;
    }
    if (o.pin) { pts[0].x = o.pin.x; pts[0].y = o.pin.y; pts[0].px = o.pin.x; pts[0].py = o.pin.y; }
    const it = o.iter || 6, seg = o.seg ?? r.seg;
    for (let k = 0; k < it; k++) {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const wa = (i === 0 && o.pin) || a.fixed ? 0 : a.w, wb = b.fixed ? 0 : b.w;
        if (!wa && !wb) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1e-6;
        const L = i === pts.length - 2 && o.lastSeg ? o.lastSeg : seg;
        const diff = (d - L) / d / (wa + wb);
        a.x += dx * diff * wa; a.y += dy * diff * wa;
        b.x -= dx * diff * wb; b.y -= dy * diff * wb;
      }
      // The rope catches on corners and drapes over things: points never stay inside solid cells
      if (o.collide !== false) for (let i = 1; i < pts.length; i++) {
        const p = pts[i];
        if (p.fixed || p.nc || !solid(p.x, p.y)) continue;
        if (!solid(p.px, p.py)) { p.x = p.px; p.y = p.py; }
        else if (!solid(p.x, p.y - 1)) p.y -= 1;
      }
    }
  }
  const vel = (p, dt) => ({ x: (p.x - p.px) / dt, y: (p.y - p.py) / dt });

  // ---------------------------------------------------------------------------------------------------------
  // WHIP: a tapering leather rope with a cracker. Crack, sidearm crack, spin lash. Hold after a crack to wrap.
  const WH = { r: null, move: null, combo: 0, comboT: 0, wrap: null, prevWant: false, cracks: 0, pop: 0, popAt: null, holdAfter: 0 };
  const WN = 18, WSEG = 2.7;
  // Angles relative to the aim (mirrored with the facing): overhead from behind and above, sidearm from behind and below, spin a full turn
  const MOVES = {
    crack: { wind: 0.1, lash: 0.12, follow: 0.13, s0: -2.3, s1: 0 },
    side: { wind: 0.07, lash: 0.13, follow: 0.12, s0: 2.4, s1: -0.25, sweep: true },
    spin: { wind: 0.05, lash: 0.34, follow: 0.12, s0: -Math.PI, s1: Math.PI, sweep: true, spin: true }
  };
  function whipStart(kind, o, P) {
    WH.move = { kind, M: MOVES[kind], t: 0, ang: Math.atan2(o.ay, o.ax), dir: P.face, cracked: false, hit: new Set(), tipHit: null };
    A(kind === 'spin' ? 'swoosh' : 'whipWind');
  }
  // The angle the rope is driven toward, for a point at fraction s along it: later points lag, so the lash rolls out to the tip
  function moveAngle(m, s) {
    const M = m.M;
    if (m.t < M.wind) return m.ang + m.dir * M.s0 * (m.t / M.wind);
    const k = Math.max(0, Math.min(1, (m.t - M.wind - s * 0.05) / M.lash));
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return m.ang + m.dir * (M.s0 + (M.s1 - M.s0) * e);
  }
  function whipUpdate(dt, o, want) {
    const P = PL(), Wd = W();
    const hand = { x: o.hx, y: o.hy };
    if (!WH.r) WH.r = rope(WN, WSEG, hand.x, hand.y, Math.PI / 2 + P.face * 0.4);
    const press = want && !WH.prevWant;
    WH.prevWant = want;
    WH.comboT -= dt;
    WH.pop = Math.max(0, WH.pop - dt);
    // Hold: keep the wrap while the button stays down
    if (WH.wrap && !want) { if (WH.wrap.kind === 'ledge' && !P.ground) { P.vy -= 80; P.vx += P.face * 40; } WH.wrap = null; A('release'); }
    if (press && !WH.wrap && (!WH.move || WH.move.t > WH.move.M.wind + WH.move.M.lash * 0.9)) {
      WH.combo = WH.comboT > 0 ? (WH.combo + 1) % 3 : 0;
      whipStart(['crack', 'side', 'spin'][WH.combo], o, P);
    }
    const m = WH.move;
    const pts = WH.r.pts;
    if (m) {
      m.t += dt;
      const M = m.M;
      // Drive every point toward the line of the current attack angle; the delay per point makes the lash roll along
      const TIP_LAG = 0.06, inLash = m.t >= M.wind && m.t <= M.wind + M.lash + TIP_LAG;
      const k = m.t < M.wind ? 0.22 : inLash ? 0.55 : 0.12;
      for (let i = 1; i <= WN; i++) {
        const s = i / WN, a = moveAngle(m, s);
        const reach = i * WSEG * (m.t < M.wind ? 0.55 + 0.3 * s : 1);
        const tx = hand.x + Math.cos(a) * reach, ty = hand.y + Math.sin(a) * reach;
        const p = pts[i];
        p.x += (tx - p.x) * k * (0.4 + 0.6 * s); p.y += (ty - p.y) * k * (0.4 + 0.6 * s);
      }
      if (inLash && M.sweep) sweepHit(m, pts, M.spin ? 22 : 20);
      // The crack comes when the wave reaches the tip, not when the arm stops
      if (!m.cracked && m.t >= M.wind + M.lash + TIP_LAG) crack(m, pts[WN], o);
      if (M.spin && inLash && Math.random() < 0.5) Wd.carve(pts[WN].x, pts[WN].y, 1.6, { pow: 1.6, debris: 0.5, force: 90, cause: 'whip', noCrumble: true });
      if (m.t > M.wind + M.lash + TIP_LAG + M.follow) { WH.move = null; WH.comboT = 0.45; if (want && m.tipHit) beginWrap(m.tipHit, P); }
    }
    if (WH.wrap) wrapUpdate(dt, hand, P);
    ropeStep(WH.r, dt, { pin: hand, g: 520, damp: 0.97, iter: 8 });
    if (WH.wrap && WH.wrap.at) { const t = pts[WN]; t.x = WH.wrap.at.x; t.y = WH.wrap.at.y; t.px = t.x; t.py = t.y; }
  }
  // Supersonic snap: a white ring, a sharp crack, a hit-stop, and damage only at the tip
  function crack(m, tip, o) {
    m.cracked = true;
    WH.cracks++;
    const Wd = W();
    WH.pop = 0.08; WH.popAt = { x: tip.x, y: tip.y };
    A('whipCrack');
    FX().anim('ring', 12, tip.x, tip.y, 0.12);
    for (let q = 0; q < 10; q++) FX().spark(tip.x, tip.y, rand(-110, 110), rand(-110, 110), Math.random() < 0.5 ? P32['7'] : P32.Y, 0.16);
    let hitAny = false;
    for (const e of EN()?.list || []) {
      if (e.dead || Math.hypot(e.x - tip.x, e.y - tip.y) > e.w / 2 + 5) continue;
      e.damage(m.kind === 'spin' ? 30 : 42, 'whip', tip.x); e.stun = Math.max(e.stun || 0, 0.5); hitAny = true;
      m.tipHit = m.tipHit || { kind: 'enemy', e };
    }
    // What the outer rope touches: walk it from the middle to the tip (a fast lash can slip past thin things)
    let ledge = null, chunk = null;
    const pts = WH.r.pts;
    for (let i = WN >> 1; i < WN && !ledge; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let k = 0; k <= L && !ledge; k++) { const x = a.x + (b.x - a.x) * k / L, y = a.y + (b.y - a.y) * k / L; if (hard(x, y)) ledge = { kind: 'ledge', x: Math.floor(x) + 0.5, y: Math.floor(y) + 0.5 }; }
      if (!chunk) for (const c of Wd.chunks) if (Math.hypot(c.x - b.x, c.y - b.y) < c.rad + 3) { chunk = { kind: 'chunk', c }; break; }
    }
    const air = !PL().ground;
    if (!m.tipHit) m.tipHit = (air && ledge) || chunk || ledge;
    // A crack held in the air wraps the ledge instead of breaking it
    const wrapping = m.tipHit?.kind === 'ledge' && air && WTP.input.wantFire();
    if (!wrapping && Wd.carve(tip.x, tip.y, 3, { pow: 3, debris: 0.6, force: 170, cause: 'crack' })) hitAny = true;
    G()?.hitstop?.(hitAny ? 0.05 : 0.025, true);
    G()?.shake?.(hitAny ? 3 : 1.5);
    WTP.melee?.impact?.(tip.x, tip.y, hitAny ? 1.2 : 0.7, '#ffffff');
  }
  function sweepHit(m, pts, dmg) {
    for (let i = WN >> 1; i <= WN; i += 2) {
      const p = pts[i];
      const e = EN()?.at?.(p.x, p.y, 3);
      if (e && !m.hit.has(e)) { m.hit.add(e); e.damage(dmg, 'whip', p.x); e.stun = Math.max(e.stun || 0, 0.4); if (!e.T.boss) { e.vx += m.dir * 160; e.vy -= 80; } A('whipHit'); }
    }
  }
  function beginWrap(hit, P) {
    if (hit.kind === 'enemy' && hit.e.dead) return;
    WH.wrap = { ...hit, t: 0 };
    if (hit.kind === 'ledge') {
      const pc = P.center();
      if (P.ground) {
        // On the ground, pulling a ledge rips a piece of it loose and drags that in
        const c = W().grabDisk(hit.x, hit.y, 4.5);
        if (c) { c.held = false; W().chunks.push(c); WH.wrap = { kind: 'chunk', c, t: 0 }; A('yank'); }
        else WH.wrap = null;
        return;
      }
      WH.wrap.len = Math.max(10, Math.hypot(pc.x - hit.x, pc.y - hit.y));
      G()?.label?.('SWING!', 500);
    }
    A('hookHit');
  }
  function wrapUpdate(dt, hand, P) {
    const w = WH.wrap;
    w.t += dt;
    const pc = P.center();
    if (w.kind === 'enemy') {
      const e = w.e;
      if (e.dead) { WH.wrap = null; return; }
      w.at = { x: e.x, y: e.y };
      const dx = pc.x - e.x, dy = pc.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (!e.T.boss) { e.vx = (dx / d) * 260; e.vy = (dy / d) * 260 - 30; e.stun = 0.3; }
      else { P.vx -= (dx / d) * 160 * dt * 4; }
      if (d < 14 || w.t > 1.2) { e.damage(18, 'whip', pc.x); WH.wrap = null; A('whipHit'); }
    } else if (w.kind === 'chunk') {
      let c = w.c;
      // A piece that settled back into the world is pulled loose again
      if (!W().chunks.includes(c)) {
        const g = w.regrabbed ? null : W().grabDisk(c.x, c.y, Math.max(3, c.rad));
        if (!g) { WH.wrap = null; return; }
        g.held = false; W().chunks.push(g); w.c = c = g; w.regrabbed = true;
      }
      w.at = { x: c.x, y: c.y };
      const dx = pc.x - c.x, dy = pc.y - c.y, d = Math.hypot(dx, dy) || 1;
      c.vx = (dx / d) * 300; c.vy = (dy / d) * 300 - 60; c.rest = 0;
      if (d < 16 || w.t > 1.2) WH.wrap = null;
    } else if (w.kind === 'ledge') {
      if (!hard(w.x, w.y) || P.ground) { if (!hard(w.x, w.y)) A('snap'); WH.wrap = null; return; }
      w.at = { x: w.x, y: w.y };
      // Swing like a rope from the ledge
      const dx = pc.x - w.x, dy = pc.y - w.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
      if (d > w.len) { const vr = P.vx * nx + P.vy * ny; if (vr > 0) { P.vx -= vr * nx; P.vy -= vr * ny; } P.vx -= nx * (d - w.len) * 14; P.vy -= ny * (d - w.len) * 14; }
      w.len = Math.max(10, w.len - 14 * dt);
      P.vx += P.face * 90 * dt;
      P.pose = 'swing';
    }
  }
  // Alt: a spin lash right away
  function whipAlt(o) { const P = PL(); WH.combo = 2; WH.wrap = null; whipStart('spin', o, P); }
  function whipDraw(ctx) {
    if (!WH.r || WP.st.cur !== 'whip') return;
    const pts = WH.r.pts;
    for (let i = 0; i < WN; i++) {
      const a = pts[i], b = pts[i + 1], th = i < WN * 0.3 ? 2 : 1;
      const len = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let k = 0; k <= len; k++) {
        const x = Math.round(a.x + (b.x - a.x) * (k / len)), y = Math.round(a.y + (b.y - a.y) * (k / len));
        ctx.fillStyle = PAL['0']; ctx.fillRect(x - (th > 1 ? 1 : 0), y - (th > 1 ? 1 : 0), th + 1, th + 1);
      }
    }
    for (let i = 0; i < WN; i++) {
      const a = pts[i], b = pts[i + 1], th = i < WN * 0.3 ? 2 : 1;
      const len = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y)));
      for (let k = 0; k <= len; k++) {
        const x = Math.round(a.x + (b.x - a.x) * (k / len)), y = Math.round(a.y + (b.y - a.y) * (k / len));
        ctx.fillStyle = (i + k) % 3 === 0 ? '#946d4b' : '#6b4a2f';
        ctx.fillRect(x - (th > 1 ? 1 : 0), y - (th > 1 ? 1 : 0), th, th);
      }
    }
    const t = pts[WN], t2 = pts[WN - 1];
    ctx.fillStyle = '#f1e3c0'; ctx.fillRect(Math.round(t.x), Math.round(t.y), 1, 1); ctx.fillRect(Math.round((t.x + t2.x) / 2), Math.round((t.y + t2.y) / 2), 1, 1);
    if (WH.pop > 0 && WH.popAt) { const x = Math.round(WH.popAt.x), y = Math.round(WH.popAt.y), r = WH.pop > 0.04 ? 3 : 5; ctx.fillStyle = PAL['7']; ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1); }
  }
  // Arm pose: drawn back on the wind-up, thrown through on the lash
  function whipSwing() {
    const m = WH.move;
    if (!m) return WH.wrap ? 0 : 0;
    const M = m.M, d = PL().face;
    if (M.spin) return d * (m.t / (M.wind + M.lash)) * TAU * 0.5;
    if (m.t < M.wind) return -d * 1.5 * (m.t / M.wind);
    const k = Math.min(1, (m.t - M.wind) / M.lash);
    if (m.t < M.wind + M.lash) return -d * 1.5 + d * 2.1 * k;
    return d * 0.6 * (1 - (m.t - M.wind - M.lash) / M.follow);
  }

  // ---------------------------------------------------------------------------------------------------------
  // WRECKING BALL: a steel chain and a heavy ball. Tap to slam, hold to swing, keep holding to spin, alt to let go.
  const WB = { r: null, mode: 'idle', holdT: 0, pressT: 0, prevWant: false, slamT: 0, spinA: 0, spinW: 0, len: 3.2, stuck: null, yank: 0, flyT: 0, restT: 0, hitCd: new Map(), impacts: 0, lastSp: 0 };
  const CN = 9, CSEG = 3.2, BALL_R = 4.5, BALL_W = 0.12;
  function ball() { return WB.r.pts[CN]; }
  function wbEnsure(o) {
    if (WB.r) return;
    WB.r = rope(CN, CSEG, o.hx, o.hy, Math.PI / 2);
    WB.r.pts[CN].w = BALL_W; WB.r.pts[CN].nc = true;
    WB.mode = 'idle'; WB.len = CSEG;
  }
  function wbClear() { WB.r = null; WB.mode = 'idle'; WB.stuck = null; WB.holdT = 0; WB.prevWant = false; }
  function wbUpdate(dt, o, want) {
    const P = PL();
    wbEnsure(o);
    const press = want && !WB.prevWant, rel = !want && WB.prevWant;
    WB.prevWant = want;
    const hand = { x: o.hx, y: o.hy };
    const b = ball();
    for (const [e, t] of WB.hitCd) { if (t - dt <= 0) WB.hitCd.delete(e); else WB.hitCd.set(e, t - dt); }
    if (WB.mode === 'flying') {
      WB.flyT += dt;
      if (press || WB.flyT > 4) { WB.mode = 'reel'; WB.reelLen = Math.hypot(b.x - hand.x, b.y - hand.y) / CN; A('chainReel'); }
      ropeStep(WB.r, dt, { g: 560, damp: 0.995, iter: 6, seg: CSEG });
      ballImpacts(dt, P);
      return;
    }
    if (WB.mode === 'reel') {
      WB.reelLen = Math.max(CSEG, WB.reelLen - 60 * dt);
      ropeStep(WB.r, dt, { pin: hand, g: 300, damp: 0.96, iter: 8, seg: WB.reelLen });
      if (WB.reelLen <= CSEG + 0.01) WB.mode = 'idle';
      return;
    }
    if (WB.stuck) { stuckUpdate(dt, hand, want, P); return; }
    if (press) { WB.pressT = 0; }
    if (want) { WB.pressT += dt; WB.holdT += dt; } else WB.holdT = 0;
    // A tap is a slam, holding swings, holding on spins
    if (rel && WB.pressT < 0.18 && WB.mode !== 'spin') { WB.mode = 'slam'; WB.slamT = 0; A('heave'); }
    else if (want && WB.pressT >= 0.18 && WB.mode !== 'slam') WB.mode = WB.holdT > 1.0 ? 'spin' : 'swing';
    else if (!want && (WB.mode === 'swing' || WB.mode === 'spin')) WB.mode = 'idle';
    let seg = CSEG;
    if (WB.mode === 'swing') {
      const L = CN * CSEG, tx = hand.x + o.ax * L, ty = hand.y + o.ay * L;
      const bv = vel(b, dt);
      const ax = (tx - b.x) * 30 - bv.x * 1.5, ay = (ty - b.y) * 30 - bv.y * 1.5;
      b.x += ax * dt * dt * 18; b.y += ay * dt * dt * 18;
      // Momentum from the run feeds the swing
      b.x += P.vx * dt * 0.35;
    } else if (WB.mode === 'spin') {
      const k = Math.min(1, (WB.holdT - 1) / 2.5);
      WB.spinW = 6 + k * 10;
      if (WB.spinA === 0 || !WB.spinOn) { WB.spinA = Math.atan2(b.y - hand.y, b.x - hand.x); WB.spinOn = true; A('swoosh'); }
      WB.spinA += WB.spinW * dt * P.face;
      seg = CSEG * (1 + k * 0.35);
      const R = CN * seg, pc = P.center();
      const tx = pc.x + Math.cos(WB.spinA) * R, ty = pc.y - 2 + Math.sin(WB.spinA) * R * 0.8;
      b.x += (tx - b.x) * 0.5; b.y += (ty - b.y) * 0.5;
      if ((WB.whT = (WB.whT || 0) - dt) <= 0) { WB.whT = Math.max(0.14, 0.5 - k * 0.3); A('swoosh'); }
    } else if (WB.mode === 'slam') {
      WB.slamT += dt;
      const up = { x: hand.x - P.face * 4, y: hand.y - CN * CSEG * 0.95 }, down = { x: hand.x + P.face * CN * CSEG * 0.6, y: hand.y + CN * CSEG * 0.85 };
      const tgt = WB.slamT < 0.16 ? up : down, kk = WB.slamT < 0.16 ? 0.35 : 0.6;
      b.x += (tgt.x - b.x) * kk; b.y += (tgt.y - b.y) * kk;
      if (WB.slamT > 0.42) WB.mode = 'idle';
    }
    if (WB.mode !== 'spin') WB.spinOn = false;
    ropeStep(WB.r, dt, { pin: hand, g: 560, damp: 0.99, iter: 8, seg });
    ballImpacts(dt, P);
  }
  // Damage scales with speed: a slow ball nudges, a fast one demolishes; debris follows the swing
  function ballImpacts(dt, P) {
    const Wd = W(), b = ball();
    const v = vel(b, dt), sp = Math.hypot(v.x, v.y);
    WB.lastSp = sp;
    for (const e of EN()?.list || []) {
      if (e.dead || WB.hitCd.has(e)) continue;
      if (Math.hypot(e.x - b.x, e.y - b.y) > BALL_R + e.w / 2) continue;
      WB.hitCd.set(e, 0.25);
      if (sp < 60) { if (!e.T.boss) { e.vx += v.x * 0.3; e.vy += v.y * 0.3; } continue; }
      e.damage(Math.min(140, sp * 0.18), 'wrecking', b.x);
      if (!e.T.boss) { e.vx += v.x * 0.6; e.vy += v.y * 0.6 - 60; e.stun = Math.max(e.stun || 0, 0.4); }
      A('wreckHit', sp); G()?.shake?.(Math.min(6, sp / 80));
    }
    let inside = 0;
    for (let a = 0; a < TAU; a += TAU / 12) if (solid(b.x + Math.cos(a) * BALL_R, b.y + Math.sin(a) * BALL_R)) inside++;
    if (!inside) return;
    const n = Math.hypot(v.x, v.y) || 1, nx = v.x / n, ny = v.y / n;
    // Driven deep into something hard at full speed: the ball buries itself (always in metal and stone, sometimes elsewhere)
    if (sp > 320 && inside >= 6 && (WB.mode === 'swing' || WB.mode === 'slam' || WB.mode === 'flying')) {
      const Wd = W(), i = Math.floor(b.y) * Wd.w + Math.floor(b.x), mt = Wd.mtl[i];
      if (mt === Wd.M.METAL || mt === Wd.M.STONE || Math.random() < 0.35) {
        Wd.carve(b.x, b.y, BALL_R, { pow: 6, debris: 0.6, force: sp * 0.4, cause: 'wrecking', noCrumble: true });
        WB.stuck = { x: b.x, y: b.y, t: 0 }; WB.mode = 'stuck'; WB.yank = 0;
        b.fixed = true; b.px = b.x; b.py = b.y;
        A('wreckHit', sp); A('clank'); G()?.shake?.(6); G()?.hitstop?.(0.06, true); G()?.label?.('STUCK! KEEP PULLING', 900);
        WB.impacts++;
        return;
      }
    }
    if (sp < 70) {
      // A nudge: no damage, the ball just rests against it
      b.x = b.px; b.y = b.py;
      return;
    }
    const r = 2.5 + Math.min(6, sp / 85), pow = Math.min(8, sp / 110);
    const got = Wd.carve(b.x - nx * 1.5 + nx * BALL_R * 0.6, b.y - ny * 1.5 + ny * BALL_R * 0.6, r, { pow, debris: 0.55, force: sp * 0.6, cause: 'wrecking' });
    WB.impacts++;
    if (got || sp > 160) {
      A('wreckHit', sp);
      G()?.shake?.(Math.min(8, sp / 70));
      if (sp > 220) G()?.hitstop?.(Math.min(0.07, sp / 6000), true);
      WTP.melee?.impact?.(b.x + nx * BALL_R, b.y + ny * BALL_R, Math.min(2.5, sp / 200), '#c8ced8');
    }
    // Bounce, losing speed into the wall
    const keep = got ? 0.45 : 0.3;
    b.x = b.px; b.y = b.py;
    b.px = b.x + v.x * dt * keep; b.py = b.y + v.y * dt * keep;
  }
  function stuckUpdate(dt, hand, want, P) {
    const s = WB.stuck, b = ball();
    s.t += dt;
    ropeStep(WB.r, dt, { pin: hand, g: 560, damp: 0.98, iter: 8 });
    // The chain is a tether while the ball is buried: you can swing from it
    const pc = P.center(), L = CN * CSEG + 6;
    const dx = pc.x - b.x, dy = pc.y - b.y, d = Math.hypot(dx, dy) || 1;
    if (d > L) { const nx = dx / d, ny = dy / d, vr = P.vx * nx + P.vy * ny; if (vr > 0) { P.vx -= vr * nx; P.vy -= vr * ny; } P.vx -= nx * (d - L) * 12; P.vy -= ny * (d - L) * 12; }
    // Free again once the wall around it is gone
    let hold = 0;
    for (let a = 0; a < TAU; a += TAU / 12) if (solid(b.x + Math.cos(a) * (BALL_R + 1.5), b.y + Math.sin(a) * (BALL_R + 1.5))) hold++;
    if (hold < 3) { unstick(b, P, 120); return; }
    if (want) {
      WB.yank += dt * (d > L - 3 ? 1.6 : 0.8);
      if (Math.random() < 0.3) FX().dust(b.x + rand(-3, 3), b.y + rand(-3, 3));
      if (WB.yank > 0.9) {
        W().carve(b.x, b.y, BALL_R + 2, { pow: 4, debris: 0.8, force: 200, cause: 'wrecking' });
        unstick(b, P, 280);
      }
    } else WB.yank = Math.max(0, WB.yank - dt);
  }
  function unstick(b, P, speed) {
    b.fixed = false;
    const pc = P.center(), dx = pc.x - b.x, dy = pc.y - b.y, d = Math.hypot(dx, dy) || 1;
    b.px = b.x - (dx / d) * speed / 60; b.py = b.y - (dy / d) * speed / 60;
    WB.stuck = null; WB.mode = 'idle'; WB.yank = 0;
    A('wreckHit', 300); G()?.shake?.(5); G()?.hitstop?.(0.04, true);
    for (let k = 0; k < 12; k++) FX().dust(b.x + rand(-4, 4), b.y + rand(-4, 4));
  }
  // Alt: let go of the chain, the ball flies with the chain trailing behind
  function wbAlt() {
    if (!WB.r || WB.stuck || WB.mode === 'flying' || WB.mode === 'reel') { A('deny'); return; }
    WB.mode = 'flying'; WB.flyT = 0;
    const b = ball(), v = vel(b, 1 / 60);
    if (Math.hypot(v.x, v.y) < 120) { const a = G()?.aim || { x: PL().face, y: 0 }; b.px = b.x - a.x * 5; b.py = b.y - a.y * 5 + 2; }
    A('throw');
  }
  function wbDraw(ctx) {
    if (!WB.r) return;
    const pts = WB.r.pts;
    for (let i = 1; i < CN; i++) {
      const p = pts[i], q = pts[i - 1], a = Math.atan2(p.y - q.y, p.x - q.x);
      const x = Math.round(p.x), y = Math.round(p.y);
      ctx.fillStyle = PAL['0']; ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = i & 1 ? '#b5bdc9' : '#858e9c';
      if ((i & 1) ^ (Math.abs(Math.cos(a)) > 0.7 ? 1 : 0)) ctx.fillRect(x - 1, y, 3, 1); else ctx.fillRect(x, y - 1, 1, 3);
    }
    const b = pts[CN], x = Math.round(b.x), y = Math.round(b.y);
    ctx.fillStyle = PAL['0']; ctx.beginPath(); ctx.arc(x, y, BALL_R + 1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#434a57'; ctx.beginPath(); ctx.arc(x, y, BALL_R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#677182'; ctx.fillRect(x - 3, y - 3, 3, 2); ctx.fillRect(x - 3, y - 1, 1, 1);
    ctx.fillStyle = '#2c313b'; ctx.fillRect(x + 1, y + 2, 3, 1);
    ctx.fillStyle = '#b5bdc9'; ctx.fillRect(x - 1, y - BALL_R - 1, 2, 2);
    if (WB.stuck) { ctx.fillStyle = PAL.y; for (let k = 0; k < 4; k++) { const a = k * 1.57 + WB.stuck.t * 4; ctx.fillRect(Math.round(b.x + Math.cos(a) * 7), Math.round(b.y + Math.sin(a) * 7), 1, 1); } }
  }
  // The stickman leans away from the pull of a fast ball and points his arm down the chain
  function wbLean() {
    if (!WB.r || WP.st.cur !== 'wrecking' || WB.mode === 'flying') return 0;
    const P = PL(), b = ball(), sp = WB.lastSp;
    const dx = b.x - (P.x + P.w / 2);
    const pull = WB.stuck ? 0.4 : Math.min(0.4, sp / 900);
    return -Math.sign(dx) * pull;
  }
  function wbSwing() {
    if (!WB.r || WB.mode === 'flying') return 0;
    const P = PL(), b = ball(), aim = G()?.aim;
    if (!aim) return 0;
    const hx = P.x + P.w / 2, hy = P.y + 7;
    return wrapA(Math.atan2(b.y - hy, b.x - hx) - Math.atan2(aim.y, aim.x)) * 0.8;
  }

  // ---- Registration ----
  WP.register({ id: 'whip', name: 'Bullwhip', cat: 'melee', price: 0, hold: true, melee: true, rate: 0.36, st: [3, 3, 4, 4], snd: 'whipWind',
    does: 'Crack, crack, spin lash. Only the tip hurts, and it cracks hard',
    tip: 'Hold after a crack to wrap the tip around a chunk, an enemy or a ledge: pull it in, or swing from it in the air.',
    altDoes: 'Spin lash: a full circle of whip around you' }, { hold: () => { }, alt: whipAlt });
  WP.register({ id: 'wrecking', name: 'Wrecking Ball', cat: 'melee', price: 2600, hold: true, loop: 'chain', melee: true, st: [5, 2, 2, 4],
    does: 'A heavy ball on a real chain. Tap to slam, hold to swing, keep holding to spin',
    tip: 'Speed is damage: a slow ball nudges, a fast one demolishes. A buried ball holds you like a rope, keep pulling to yank it out.',
    altDoes: 'Let go of the chain: the ball flies, fire reels it back' }, { hold: () => { }, alt: wbAlt });
  WP.BY.whip.altDoes = 'Spin lash: a full circle of whip around you';
  WP.BY.wrecking.altDoes = 'Let go of the chain: the ball flies, fire reels it back';

  WP.EXT.updates.push((dt, o, d, want) => {
    if (d.id === 'whip') whipUpdate(dt, o, want);
    else if (WH.r) { WH.r = null; WH.move = null; WH.wrap = null; }
    if (d.id === 'wrecking') wbUpdate(dt, o, want);
    else if (WB.r) wbClear();
  });
  WP.EXT.draws.push((ctx) => { whipDraw(ctx); wbDraw(ctx); });
  WP.EXT.resets.push(() => { WH.r = null; WH.move = null; WH.wrap = null; WH.combo = 0; WH.comboT = 0; WH.prevWant = false; wbClear(); });
  const oSwing = WP.swing;
  WP.swing = () => { const id = WP.st.cur; if (id === 'whip') return whipSwing(); if (id === 'wrecking') return wbSwing(); return oSwing(); };
  WP.lean = () => (WP.st.cur === 'wrecking' ? wbLean() : 0);
  WTP.flails = { WH, WB, ball: () => (WB.r ? ball() : null), whipTip: () => (WH.r ? WH.r.pts[WN] : null), whipStart, wbAlt, whipAlt };
})();
