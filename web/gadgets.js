(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand } = WTP;
  const SP = WTP.sprites;
  const S = SP.S;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, I = () => WTP.input, EN = () => WTP.enemies;
  const A = (n, x) => WTP.audio.play(n, x);
  const hard = (x, y) => { const Wd = W(); if (x < 0 || x >= Wd.w || y >= Wd.h) return true; if (y < 0) return false; const m = Wd.mat[y * Wd.w + x]; return m === 1 || m === 3 || m === 5; };

  // Two slots: a movement gadget that lives on the movement keys, and a tool gadget on the GADGET key
  const DEFS = [
    { id: 'boots', slot: 'move', name: 'Spring Boots', col: 'l', tip: 'An extra air jump. Press DOWN in the air to ground pound and crack the floor open.', spr: ['....', '.ll.', '.ll.', 'lLLl', 'l55l', '6666'] },
    { id: 'jetpack', slot: 'move', name: 'Jetpack', col: 'o', tip: 'Hold JUMP in the air once your jumps are used. The flame scorches whatever is below. Fuel refills on the ground.', spr: ['.33.33.', '3ee3ee3', '3ee3ee3', '3RR3RR3', '.33.33.', '.a...a.', '.y...y.'] },
    { id: 'glider', slot: 'move', name: 'Paper Glider', col: 'C', tip: 'Hold JUMP while falling to glide. Fires and explosions below give you updrafts.', spr: ['7.......', '777.....', '7cc77...', '7777777.', '.556777.', '...5577.'] },
    { id: 'claws', slot: 'move', name: 'Wall Claws', col: 'u', tip: 'Push into a wall to cling. Hold JUMP toward the wall to climb, JUMP away from it to kick off.', spr: ['7.7.7', '6.6.6', 'uuuuu', 'uWWWu', '.uuu.'] },
    { id: 'grapple', slot: 'tool', name: 'Grappling Hook', col: 'c', tip: 'Hold GADGET to fire at your aim and swing, let go to drop. JUMP reels in, DOWN lets out rope.', spr: ['.5.5.', '55.55', '.555.', '..4..', '..4..', '..4..', '..W..', '..W..'] },
    { id: 'blink', slot: 'tool', name: 'Blink Drive', col: 'm', cd: 1.2, tip: 'GADGET, or double tap a direction, to teleport a short hop, punching out a pocket where you land.', spr: ['..m..', '.mKm.', 'mK7Km', '.mKm.', '..m..'] },
    { id: 'pads', slot: 'tool', name: 'Bounce Pads', col: 'k', charges: 3, tip: 'GADGET drops a spring pad, three at a time. Launches you, enemies and falling chunks.', spr: ['kkkkkk', '.5555.', '.4..4.', '..44..', '.4..4.', '333333'] },
    { id: 'shock', slot: 'tool', name: 'Shockwave', col: 'e', cd: 2.2, tip: 'GADGET sets off a ring blast around you that throws enemies back. On the ground it also launches you.', spr: ['..e..', '.eye.', 'eyRye', '.eye.', '..e..', 'e...e'] },
    { id: 'hookpull', slot: 'tool', name: 'Hookshot Pull', col: 'a', cd: 0.8, tip: 'GADGET fires a hook that yanks a loose chunk, a piece of wall or an enemy toward you.', spr: ['55...', '5.5..', '..5..', '..44.', '...44', '....W'] },
    { id: 'shield', slot: 'tool', name: 'Bubble Shield', col: 'K', cd: 14, waves: true, tip: 'GADGET for 2.5 seconds of invulnerability. Wave modes only.', spr: ['.KKK.', 'K...K', 'K.7.K', 'K...K', '.KKK.'] },
    { id: 'slowtime', slot: 'tool', name: 'Slow Time', col: 'y', cd: 25, tip: 'GADGET for two seconds of bullet time. Long cooldown.', spr: ['.yyy.', 'y.5.y', 'y.55y', 'y...y', '.yyy.'] }
  ];
  const BY = {};
  for (const d of DEFS) { d.sprite = S(d.spr, { gx: 0, gy: 0 }); BY[d.id] = d; }
  const MOVES = DEFS.filter((d) => d.slot === 'move').map((d) => d.id), TOOLS = DEFS.filter((d) => d.slot === 'tool').map((d) => d.id);

  const st = { cds: {}, fuel: 1, hook: null, pull: null, pads: [], pound: false, claw: 0, cling: 0, gliding: false, jet: false, flameT: 0, shieldT: 0, poseT: 0, castPose: null, downPrev: false, tapT: { left: -9, right: -9 }, now: 0 };
  const moveId = () => (BY[WTP.save.gadgetMove]?.slot === 'move' ? WTP.save.gadgetMove : 'boots');
  const toolId = () => (BY[WTP.save.gadgetTool]?.slot === 'tool' ? WTP.save.gadgetTool : 'grapple');
  const cd = (id) => st.cds[id] || 0;
  const wavesOnly = () => !G()?.run?.mode?.waves;

  function equip(id) {
    const d = BY[id];
    if (!d) return false;
    if (d.slot === 'move') WTP.save.gadgetMove = id; else WTP.save.gadgetTool = id;
    WTP.persist();
    reset(true);
    return true;
  }
  function cycleTool(dir = 1) {
    const i = TOOLS.indexOf(toolId());
    const id = TOOLS[(i + dir + TOOLS.length) % TOOLS.length];
    equip(id);
    G()?.label?.(`${BY[id].name.toUpperCase()}`, 900);
    A('gadgetCycle');
    return id;
  }
  function reset(keepCds) {
    if (!keepCds) st.cds = {};
    st.fuel = 1; st.hook = null; st.pull = null; st.pads = []; st.pound = false; st.claw = 0; st.cling = 0; st.gliding = false; st.jet = false; st.shieldT = 0; st.poseT = 0;
    WTP.audio.loop('jet', false); WTP.audio.loop('glide', false);
  }
  function interrupt() {
    if (st.hook && st.hook.on) { st.hook = null; A('snap'); }
    st.pound = false;
  }
  function airJump(P) {
    if (moveId() === 'boots') { for (let k = 0; k < 6; k++) FX().spark(P.x + P.w / 2 + rand(-3, 3), P.y + P.h, rand(-40, 40), rand(10, 60), P32.L, 0.2); A('spring'); }
  }
  function landed(P, vy) {
    if (!st.pound) return;
    st.pound = false;
    const x = P.x + P.w / 2, y = P.y + P.h + 2;
    W().carve(x, y, 8, { debris: 0.6, force: 160, cause: 'pound', pow: 4, crumbleR: 14 });
    EN()?.damageCircle?.(x, y - 4, 18, 40, 'pound');
    EN()?.push?.(x, y, 30, 0, -220);
    FX().anim('ring', 30, x, y, 0.25);
    for (let k = 0; k < 14; k++) FX().dust(x + rand(-12, 12), y - 1);
    G()?.shake?.(9); G()?.hitstop?.(0.04);
    A('pound');
    P.vy = -120; P.ground = false;
    WTP.vibe(40);
  }
  const useStat = () => G()?.stat?.('gadgetUse', 1);
  const cast = (pose, t = 0.22) => { st.castPose = pose; st.poseT = t; };

  function update(dt, P, c) {
    const In = I();
    st.now += dt;
    for (const k in st.cds) st.cds[k] = Math.max(0, st.cds[k] - dt);
    st.shieldT = Math.max(0, st.shieldT - dt);
    st.poseT = Math.max(0, st.poseT - dt);
    const mv = moveId(), tl = toolId();
    P.extraJumps = mv === 'boots' ? 1 : 0;
    let res = moveGadget(mv, dt, P, c);
    if (!c.ctl && In.take('gadgetCycle')) cycleTool(1);
    const press = !c.ctl && In.take('gadget');
    const hold = !c.ctl && In.down('gadget');
    res = toolGadget(tl, dt, P, c, press, hold, In) || res;
    if (tl !== 'grapple' && st.hook) st.hook = null;
    updatePads(dt, P);
    updatePull(dt, P);
    if (!P.pose && st.poseT > 0) P.pose = st.castPose;
    return res;
  }

  function moveGadget(mv, dt, P, c) {
    let res = null;
    if (mv !== 'jetpack' && st.jet) { st.jet = false; WTP.audio.loop('jet', false); }
    if (mv !== 'glider' && st.gliding) { st.gliding = false; WTP.audio.loop('glide', false); }
    const downEdge = c.down && !st.downPrev;
    st.downPrev = c.down;
    if (mv === 'boots') {
      if (downEdge && !c.ctl && !P.ground && !st.pound && !st.hook?.on) { st.pound = true; P.vy = 430; P.vx *= 0.3; A('poundStart'); useStat(); }
      if (st.pound) { P.pose = 'pound'; P.vy = Math.max(P.vy, 430); P.maxFall = 460; if (Math.random() < 0.6) FX().trail(P.x + P.w / 2 + rand(-2, 2), P.y, P32.L, 0.2); res = { noJump: true }; }
    } else if (mv === 'jetpack') {
      const thrust = !c.ctl && c.held && !P.ground && P.jumps === 0 && st.fuel > 0.01 && !st.hook?.on;
      if (thrust) {
        if (!st.jet) { useStat(); A('jetStart'); }
        st.jet = true;
        P.flipT = 0;
        P.vy = Math.max(-150, P.vy - 1500 * dt);
        st.fuel = Math.max(0, st.fuel - dt / 1.8);
        P.pose = 'jet';
        WTP.audio.loop('jet', true);
        const fx = P.x + P.w / 2 - P.face * 3, fy = P.y + P.h - 3;
        for (let k = 0; k < 2; k++) FX().flame(fx + rand(-1, 1), fy + 2);
        if (Math.random() < 0.5) FX().spark(fx, fy + 3, rand(-20, 20), rand(60, 140), Math.random() < 0.5 ? P32.y : P32.o, 0.25);
        if (Math.random() < 0.25) FX().smoke(fx, fy + 6, 1);
        if ((st.flameT -= dt) <= 0) {
          st.flameT = 0.06;
          const Wd = W();
          for (let d = 2; d < 26; d++) {
            const yy = Math.floor(fy + d), xx = Math.floor(fx + rand(-1.5, 1.5));
            if (!hard(xx, yy)) continue;
            Wd.carve(xx + 0.5, yy + 0.5, 1.4 + (26 - d) * 0.05, { debris: 0.3, force: 40, scorch: true, cause: 'jet', pow: 0.7, noCrumble: true });
            if (Math.random() < 0.35) Wd.igniteAt(xx, yy, 3);
            EN()?.damageCircle?.(xx, yy, 5, 2, 'fire');
            break;
          }
        }
      } else {
        if (st.jet) { st.jet = false; WTP.audio.loop('jet', false); }
        st.fuel = Math.min(1, st.fuel + dt * (P.ground ? 0.9 : 0.04));
      }
    } else if (mv === 'glider') {
      const on = !c.ctl && c.held && !P.ground && P.vy > -20 && !st.hook?.on;
      if (on) {
        if (!st.gliding) { A('glideOpen'); useStat(); }
        st.gliding = true;
        P.maxFall = 42;
        P.pose = 'glide';
        const want = (c.mx || P.face) * 120;
        P.vx += (want - P.vx) * Math.min(1, dt * 2.5);
        const up = updraft(P);
        if (up > 0) { P.vy -= up * dt; if (Math.random() < 0.3) FX().pix(P.x + rand(-4, 10), P.y + P.h + rand(0, 10), rand(-10, 10), -60, P32.Y, 0.3); }
        P.vy = Math.max(-160, P.vy);
        WTP.audio.loop('glide', true);
      } else if (st.gliding) { st.gliding = false; WTP.audio.loop('glide', false); }
    } else if (mv === 'claws') {
      const wd = P.wallNear();
      const cling = wd && !P.ground && !c.ctl && c.mx === wd && !st.hook?.on;
      if (cling) {
        if (!st.cling) { A('clawGrab'); for (let k = 0; k < 4; k++) FX().dust(P.x + (wd > 0 ? P.w : 0), P.y + rand(2, P.h - 2)); }
        st.cling = wd;
        P.noGrav = true; P.pose = 'climb';
        P.jumps = 1 + P.extraJumps; P.airDash = 1;
        if (c.held) { P.vy = -72; st.claw -= dt; res = { noJump: true }; }
        else P.vy = P.vy < 0 ? P.vy * 0.8 : 0;
        if (c.held && st.claw <= 0) {
          st.claw = 0.09;
          const xx = wd > 0 ? Math.floor(P.x + P.w + 0.5) : Math.floor(P.x - 1);
          for (const yy of [Math.floor(P.y + 3), Math.floor(P.y + P.h - 3)]) W().carve(xx + 0.5, yy + 0.5, 1.2, { debris: 0.5, force: 30, cause: 'claw', pow: 1.5, noCrumble: true });
          A('scratch');
          useStat();
        }
      } else st.cling = 0;
    }
    return res;
  }

  function toolGadget(tl, dt, P, c, press, hold, In) {
    const d = BY[tl];
    if (tl === 'grapple') return grapple(dt, P, c, press, hold);
    // Blink also fires on a double tap of left or right
    if (tl === 'blink' && !c.ctl) for (const dir of ['left', 'right']) {
      if (!In.take(dir)) continue;
      if (st.now - st.tapT[dir] < 0.25 && cd(tl) <= 0) { blink(P, dir === 'left' ? -1 : 1, 0); st.tapT[dir] = -9; }
      else st.tapT[dir] = st.now;
    }
    if (!press) return null;
    if (cd(tl) > 0) { A('deny'); return null; }
    if (d.waves && wavesOnly()) { G()?.label?.(`${d.name.toUpperCase()}: WAVE MODES ONLY`, 1100); A('deny'); return null; }
    if (tl === 'blink') { const aim = G()?.aim || { x: P.face, y: 0 }; blink(P, aim.x, aim.y); }
    else if (tl === 'pads') dropPad(P);
    else if (tl === 'shock') shock(P);
    else if (tl === 'hookpull') firePull(P);
    else if (tl === 'shield') shield(P);
    else if (tl === 'slowtime') slowTime(P);
    if (d.cd) st.cds[tl] = d.cd;
    return null;
  }

  function updraft(P) {
    const Wd = W();
    const cx = P.x + P.w / 2, by = P.y + P.h;
    let heat = 0;
    const B = Wd.burning;
    for (let k = 0; k < B.length && heat < 900; k += Math.max(1, (B.length / 400) | 0)) {
      const i = B[k];
      const x = i % Wd.w, y = (i / Wd.w) | 0;
      if (Math.abs(x - cx) < 14 && y > by && y - by < 90) heat += 40;
    }
    for (const t of WTP.weapons.st.thermals || []) if (Math.abs(t.x - cx) < t.r * 1.5 && t.y > by - 10 && t.y - by < 120) heat += 1400 * t.k;
    return Math.min(1800, heat);
  }

  function grapple(dt, P, c, press, hold) {
    const gun = P.gunPos || P.center();
    const aim = G()?.aim || { x: P.face, y: 0 };
    if (press && !st.hook) { st.hook = { x: gun.x, y: gun.y, vx: aim.x * 560, vy: aim.y * 560, on: false, t: 0 }; A('hookFire'); useStat(); cast('cast', 0.15); }
    const h = st.hook;
    if (!h) return null;
    // Letting go of the key drops the rope, with a little hop if you were swinging
    if (!hold) { if (h.on) { P.vy -= 90; A('release'); } st.hook = null; return null; }
    const Wd = W();
    if (!h.on) {
      h.t += dt;
      const steps = Math.ceil(Math.hypot(h.vx, h.vy) * dt / 0.7);
      for (let s = 0; s < steps; s++) {
        h.x += (h.vx * dt) / steps; h.y += (h.vy * dt) / steps;
        const ix = Math.floor(h.x), iy = Math.floor(h.y);
        const e = EN()?.at?.(h.x, h.y, 2);
        if (e) {
          e.damage(12, 'hook');
          const pc = P.center(), dx = pc.x - e.x, dy = pc.y - e.y, d = Math.hypot(dx, dy) || 1;
          if (!e.T.boss) { e.vx = (dx / d) * 260; e.vy = (dy / d) * 260 - 60; }
          A('yank'); st.hook = null; return null;
        }
        if (iy >= 0 && hard(ix, iy)) {
          h.on = true; h.ax = ix; h.ay = iy; h.x = ix + 0.5; h.y = iy + 0.5;
          const pc = P.center();
          h.len = Math.max(10, Math.hypot(pc.x - h.x, pc.y - h.y));
          A('hookHit'); G()?.shake?.(1.5);
          for (let k = 0; k < 6; k++) FX().spark(h.x, h.y, rand(-60, 60), rand(-60, 60), P32['7'], 0.2);
          break;
        }
      }
      if (!h.on && (h.t > 0.32 || Math.hypot(h.x - gun.x, h.y - gun.y) > 170)) { st.hook = null; A('hookMiss'); }
      return null;
    }
    if (!hard(h.ax, h.ay)) {
      st.hook = null; A('snap'); G()?.label?.('ANCHOR DESTROYED!', 700);
      for (let k = 0; k < 10; k++) FX().spark(h.x, h.y, rand(-80, 80), rand(-80, 40), P32.y, 0.3);
      return null;
    }
    if (c.held) h.len = Math.max(8, h.len - 110 * dt);
    if (c.down) h.len = Math.min(160, h.len + 90 * dt);
    const pc = P.center();
    const dx = pc.x - h.x, dy = pc.y - h.y, d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    if (d > h.len) {
      const vr = P.vx * nx + P.vy * ny;
      if (vr > 0) { P.vx -= vr * nx; P.vy -= vr * ny; }
      P.vx -= nx * (d - h.len) * 14; P.vy -= ny * (d - h.len) * 14;
    }
    if (c.mx) P.vx += c.mx * 260 * dt;
    P.ctrl = 0.2;
    P.pose = 'swing';
    P.ground = false;
    return { noJump: true };
  }

  function dropPad(P) {
    if (st.pads.length >= 3) { const o = st.pads.shift(); FX().smoke(o.x, o.y, 3); }
    const x = P.x + P.w / 2 + P.face * (P.ground ? 6 : 0), y = P.y + P.h - 2;
    st.pads.push({ x, y, vy: P.ground ? 0 : 60, t: 0, sq: 0 });
    A('padDrop'); useStat(); cast('cast', 0.15);
  }
  function updatePads(dt, P) {
    const Wd = W();
    for (let k = st.pads.length - 1; k >= 0; k--) {
      const p = st.pads[k];
      p.t += dt; p.sq = Math.max(0, p.sq - dt * 4);
      const below = hard(Math.floor(p.x - 2), Math.floor(p.y + 3)) || hard(Math.floor(p.x + 2), Math.floor(p.y + 3)) || hard(Math.floor(p.x), Math.floor(p.y + 3));
      const soft = (() => { const yy = Math.floor(p.y + 3), xx = Math.floor(p.x); if (yy < 0 || yy >= Wd.h) return false; const m = Wd.mat[yy * Wd.w + xx]; return m === 4 || m === 6; })();
      if (!below && !soft) { p.vy = Math.min(300, p.vy + 600 * dt); p.y += p.vy * dt; if (p.y > Wd.h) { st.pads.splice(k, 1); continue; } }
      else { p.vy = 0; while (hard(Math.floor(p.x), Math.floor(p.y + 2)) && p.y > 0) p.y -= 1; }
      const pc = P.center();
      if (Math.abs(pc.x - p.x) < 7 && P.y + P.h > p.y - 2 && P.y + P.h < p.y + 4 && P.vy >= -20) {
        P.vy = -390; P.ground = false; P.stretch = 1; P.jumps = 1 + P.extraJumps; P.rocketJumpStart = P.rocketJumpStart ?? P.y; p.sq = 1;
        A('boing'); for (let q = 0; q < 6; q++) FX().spark(p.x + rand(-4, 4), p.y, rand(-40, 40), rand(-90, -30), P32.K, 0.25);
      }
      for (const e of EN()?.list || []) if (!e.dead && !e.T.fly && Math.abs(e.x - p.x) < 8 && Math.abs(e.y + e.T.h / 2 - p.y) < 5) { e.vy = -380; p.sq = 1; A('boing'); }
      for (const ch of Wd.chunks) if (Math.abs(ch.x - p.x) < ch.rad + 4 && Math.abs(ch.y + ch.rad * 0.6 - p.y) < 6 && ch.vy > 0) { ch.vy = -440; ch.va += rand(-3, 3); ch.rest = 0; p.sq = 1; A('boing'); }
    }
  }

  function blink(P, ax, ay) {
    const m = Math.hypot(ax, ay) || 1;
    ax /= m; ay /= m;
    let tx = P.x + ax * 46, ty = P.y + ay * 46;
    const Wd = W();
    tx = Math.max(0, Math.min(Wd.w - P.w, tx)); ty = Math.max(-30, Math.min(Wd.h - 4 - P.h, ty));
    const from = P.center();
    Wd.carve(tx + P.w / 2, ty + P.h / 2, 8.5, { debris: 0.6, force: 140, cause: 'blink', pow: 5 });
    P.ghosts.push({ x: P.x, y: P.y, face: P.face, t: 0.3, anim: 'dash' });
    P.x = tx; P.y = ty; P.vx *= 0.5; P.vy = Math.min(P.vy, 0) - 40;
    P.unstick();
    P.iframes = Math.max(P.iframes, 0.3);
    st.cds.blink = BY.blink.cd;
    const to = P.center();
    for (let k = 0; k < 18; k++) { FX().spark(from.x, from.y, rand(-90, 90), rand(-90, 90), Math.random() < 0.5 ? P32.m : P32.K, 0.35); FX().spark(to.x, to.y, rand(-120, 120), rand(-120, 120), Math.random() < 0.5 ? P32['7'] : P32.m, 0.35); }
    FX().beam([from.x, from.y, to.x, to.y], { kind: 'bolt', life: 0.12, c2: P32.m });
    EN()?.damageCircle?.(to.x, to.y, 10, 30, 'blink');
    A('blink'); G()?.shake?.(3); useStat(); cast('cast', 0.18);
  }

  function shock(P) {
    const x = P.x + P.w / 2, y = P.y + P.h - 4, R = 34;
    for (const e of EN()?.list || []) {
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, d = Math.hypot(dx, dy);
      if (d > R + e.w / 2) continue;
      e.damage(18, 'shock', x);
      if (!e.T.boss) { e.vx += (dx / (d || 1)) * 320; e.vy -= 180; e.stun = Math.max(e.stun || 0, 0.6); }
    }
    for (const ch of W().chunks) { const dx = ch.x - x, dy = ch.y - y, d = Math.hypot(dx, dy); if (d < R) { ch.vx += (dx / (d || 1)) * 260; ch.vy -= 200; ch.rest = 0; ch.thrown = true; } }
    P.iframes = Math.max(P.iframes, 0.3);
    W().crumble?.(x, y, 0, R * 0.5);
    W().carve(x, P.y + P.h + 2, 5, { debris: 0.5, force: 120, cause: 'shock', pow: 2, noCrumble: true });
    if (P.ground || hard(Math.floor(x), Math.floor(P.y + P.h + 2))) { P.vy = Math.min(P.vy, -320); P.boosted = true; P.ground = false; P.stretch = 1; P.rocketJumpStart = P.rocketJumpStart ?? P.y; }
    FX().anim('ring', 40, x, y, 0.3);
    FX().blast?.(x, y, R, 220);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; FX().spark(x + Math.cos(a) * 6, y + Math.sin(a) * 4, Math.cos(a) * 160, Math.sin(a) * 110, k & 1 ? P32.e : P32.y, 0.3); }
    G()?.shake?.(6); G()?.hitstop?.(0.03);
    A('shock'); useStat(); cast('shock', 0.25);
    WTP.vibe(30);
  }

  // Hookshot Pull: a hook that drags what it hits back to you
  function firePull(P) {
    const gun = P.gunPos || P.center(), aim = G()?.aim || { x: P.face, y: 0 };
    st.pull = { x: gun.x, y: gun.y, vx: aim.x * 620, vy: aim.y * 620, t: 0, back: null };
    A('pullFire'); useStat(); cast('cast', 0.2);
  }
  function updatePull(dt, P) {
    const h = st.pull;
    if (!h) return;
    const Wd = W(), pc = P.center();
    h.t += dt;
    if (h.back) {
      const dx = pc.x - h.x, dy = pc.y - h.y, d = Math.hypot(dx, dy);
      const sp = 700 * dt;
      if (d < sp + 4 || h.t > 1.2) { st.pull = null; return; }
      h.x += (dx / d) * sp; h.y += (dy / d) * sp;
      const t = h.back;
      if (t.chunk && Wd.chunks.includes(t.chunk)) { t.chunk.x = h.x; t.chunk.y = h.y; t.chunk.vx = (dx / d) * 300; t.chunk.vy = (dy / d) * 300 - 40; t.chunk.rest = 0; }
      return;
    }
    const steps = Math.ceil(Math.hypot(h.vx, h.vy) * dt / 0.8);
    for (let s = 0; s < steps; s++) {
      h.x += (h.vx * dt) / steps; h.y += (h.vy * dt) / steps;
      const e = EN()?.at?.(h.x, h.y, 3);
      if (e) {
        e.damage(8, 'hook', h.x);
        const dx = pc.x - e.x, dy = pc.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (!e.T.boss) { e.vx = (dx / d) * 340; e.vy = (dy / d) * 340 - 80; e.stun = Math.max(e.stun || 0, 0.4); }
        h.back = {}; A('pullYank'); G()?.shake?.(2); return;
      }
      for (const ch of Wd.chunks) if (Math.hypot(ch.x - h.x, ch.y - h.y) < ch.rad + 3) { h.back = { chunk: ch }; A('pullYank'); G()?.shake?.(2); return; }
      if (hard(Math.floor(h.x), Math.floor(h.y))) {
        const ch = Wd.grabDisk(h.x + h.vx * 0.006, h.y + h.vy * 0.006, 5.5);
        if (ch) { ch.held = false; Wd.chunks.push(ch); h.back = { chunk: ch }; A('pullYank'); G()?.shake?.(3); for (let k = 0; k < 8; k++) FX().dust(h.x, h.y); }
        else { h.back = {}; A('hookMiss'); }
        return;
      }
    }
    if (h.t > 0.3) h.back = {};
  }

  function shield(P) {
    st.shieldT = 2.5;
    P.iframes = Math.max(P.iframes, 2.5);
    A('shieldUp'); useStat(); cast('cast', 0.25);
    FX().anim('ring', 26, P.x + P.w / 2, P.y + P.h / 2, 0.25);
  }
  function slowTime(P) {
    G()?.slowmo?.(0.3, 2, true);
    G()?.chroma?.(0.6, true);
    A('slowIn'); useStat(); cast('cast', 0.3);
    WTP.props?.later?.(2, () => A('slowOut'));
  }

  // Pose targets for the rig, in world pixels; K is the rig's size unit
  function rigPose(anim, b, K) {
    const { hipX, hipY, shX, shY, nx, hy, face } = b;
    const t = performance.now() / 1000;
    const P = WTP.player;
    if (anim === 'jet') return { legs: [[hipX - face * 0.9 * K, hipY + 5.3 * K], [hipX - face * 0.2 * K, hipY + 4.9 * K]], back: [shX - face * 0.4 * K, shY + 2.2 * K] };
    if (anim === 'glide') return { legs: [[hipX - face * 2.6 * K, hipY + 4.2 * K], [hipX - face * 3.3 * K, hipY + 3.6 * K]], back: [nx - face * 0.4 * K, hy - 2.6 * K], front: [nx + face * 0.6 * K, hy - 2.6 * K] };
    if (anim === 'climb') {
      const wd = st.cling || P.wallNear?.() || face, ph = Math.sin(t * 12);
      return { legs: [[hipX + wd * 1.5 * K, hipY + (3.4 + ph * 0.8) * K], [hipX + wd * 2.1 * K, hipY + (5 - ph * 0.8) * K]], back: [shX + wd * 2.4 * K, shY - (2.2 + ph * 1.2) * K] };
    }
    if (anim === 'pound') return { legs: [[hipX + face * 1.5 * K, hipY + 2.2 * K], [hipX + face * 0.6 * K, hipY + 2.6 * K]], back: [shX - face * 0.6 * K, shY - 3.4 * K] };
    if (anim === 'swing' && st.hook) {
      const dx = st.hook.x - shX, dy = st.hook.y - shY, d = Math.hypot(dx, dy) || 1;
      const s = Math.sign(P.vx) || face;
      return { legs: [[hipX - s * 1.4 * K, hipY + 5 * K], [hipX - s * 0.6 * K, hipY + 5.3 * K]], back: [shX + (dx / d) * 3.6 * K, shY + (dy / d) * 3.6 * K] };
    }
    if (anim === 'shock') return { legs: [[hipX + 2.2 * K, hipY + 5 * K], [hipX - 2.2 * K, hipY + 5 * K]], back: [shX - face * 0.8 * K, hipY + 3 * K] };
    if (anim === 'cast') return { back: [shX + face * 3.2 * K, shY - 1.6 * K] };
    return null;
  }

  function draw(ctx, P, layer, f, dx, dy) {
    const id = moveId();
    const face = P.face;
    const px = (x, y, w, h, c) => { ctx.fillStyle = PAL[c] || c; ctx.fillRect(face > 0 ? dx + x : dx + f.w - x - w, dy + y, w, h); };
    if (layer === 'back') {
      if (id === 'jetpack') {
        px(3, 8, 4, 7, '0'); px(4, 9, 2, 5, st.jet ? 'e' : '3'); px(4, 9, 1, 5, st.jet ? 'o' : '4');
        if (st.jet) { const fl = (performance.now() / 40) | 0; px(4, 15, 2, 2 + (fl & 1), 'y'); px(4, 17 + (fl & 1), 2, 1, 'o'); }
      } else if (id === 'glider' && st.gliding) {
        const bob = Math.round(Math.sin(performance.now() / 120));
        px(1, -3 + bob, 18, 1, '0'); px(2, -4 + bob, 16, 1, '7'); px(3, -5 + bob, 13, 1, '7'); px(5, -6 + bob, 8, 1, '6'); px(6, -4 + bob, 2, 1, 'c'); px(12, -4 + bob, 2, 1, 'c'); px(9, -3 + bob, 1, 4, '5');
      }
    } else if (id === 'boots') { const c1 = st.pound ? 'Y' : 'l'; px(7, 19, 3, 1, c1); px(10, 19, 3, 1, c1); }
    else if (id === 'claws') { px(13, 11, 1, 1, '7'); px(14, 10, 1, 1, '7'); px(14, 12, 1, 1, '6'); }
  }
  function drawWorld(ctx) {
    const P = WTP.player;
    const h = st.hook;
    if (h) {
      const g = P.gunPos || P.center();
      const len = Math.hypot(h.x - g.x, h.y - g.y), n = Math.max(2, Math.ceil(len / 2));
      for (let k = 0; k <= n; k++) { const t = k / n; ctx.fillStyle = k & 1 ? PAL['5'] : PAL['4']; ctx.fillRect(Math.round(g.x + (h.x - g.x) * t), Math.round(g.y + (h.y - g.y) * t), 1, 1); }
      const a = Math.atan2(h.y - g.y, h.x - g.x);
      const r = HOOK.rotated(a, Math.cos(a) < 0);
      ctx.drawImage(r.cv, Math.round(h.x - r.ox), Math.round(h.y - r.oy));
    }
    const pl = st.pull;
    if (pl) {
      const g = P.gunPos || P.center();
      const len = Math.hypot(pl.x - g.x, pl.y - g.y), n = Math.max(2, Math.ceil(len / 2));
      for (let k = 0; k <= n; k++) { const t = k / n; ctx.fillStyle = k & 1 ? PAL.a : PAL['4']; ctx.fillRect(Math.round(g.x + (pl.x - g.x) * t), Math.round(g.y + (pl.y - g.y) * t), 1, 1); }
      ctx.fillStyle = PAL['0']; ctx.fillRect(Math.round(pl.x) - 2, Math.round(pl.y) - 2, 4, 4);
      ctx.fillStyle = PAL['6']; ctx.fillRect(Math.round(pl.x) - 1, Math.round(pl.y) - 1, 2, 2);
    }
    for (const p of st.pads) {
      const x = Math.round(p.x), y = Math.round(p.y);
      const sq = p.sq > 0 ? Math.round(p.sq * 2) : 0;
      ctx.fillStyle = PAL['0']; ctx.fillRect(x - 5, y - 3 + sq, 10, 6 - sq);
      ctx.fillStyle = PAL['3']; ctx.fillRect(x - 4, y + 1, 8, 1);
      ctx.fillStyle = PAL['5']; for (let k = 0; k < 3 - sq; k++) ctx.fillRect(x - 3 + (k & 1) * 4, y - k + sq, 2, 1);
      ctx.fillStyle = PAL.k; ctx.fillRect(x - 4, y - 3 + sq, 8, 1);
      ctx.fillStyle = PAL.K; ctx.fillRect(x - 3, y - 3 + sq, 3, 1);
    }
    if (st.shieldT > 0) {
      const cx = Math.round(P.x + P.w / 2), cy = Math.round(P.y + P.h / 2), r = 15 + Math.sin(performance.now() / 90) * 0.6;
      const n = 48, blinkOut = st.shieldT < 0.6 && ((performance.now() / 80) | 0) & 1;
      if (!blinkOut) for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; ctx.fillStyle = k % 6 === 0 ? PAL['7'] : PAL.K; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 1.1), 1, 1); }
    }
    // Jetpack fuel under the stickman's feet while it is not full
    if (moveId() === 'jetpack' && st.fuel < 0.999 && !P.dead) {
      const w = 10, bx = Math.round(P.x + P.w / 2 - w / 2), by = Math.round(P.y + P.h + 3);
      ctx.fillStyle = PAL['0']; ctx.fillRect(bx - 1, by - 1, w + 2, 3);
      ctx.fillStyle = st.fuel < 0.25 ? PAL.e : PAL.a; ctx.fillRect(bx, by, Math.round(w * st.fuel), 1);
    }
  }
  const HOOK = S(['.55.', '5..5', '...5', '.555', '5...'], { gx: 1, gy: 2 });

  // For the HUD card: fuel, cooldown and charges of both slots
  function hudInfo() {
    const mv = moveId(), tl = toolId(), d = BY[tl];
    const tool = { id: tl, name: d.name, ready: cd(tl) <= 0, k: d.cd ? 1 - cd(tl) / d.cd : 1 };
    if (tl === 'pads') { tool.charges = 3 - st.pads.length; tool.k = tool.charges / 3; }
    if (d.waves && wavesOnly()) { tool.off = true; tool.ready = false; }
    if (tl === 'shield' && st.shieldT > 0) tool.active = st.shieldT / 2.5;
    return { move: { id: mv, name: BY[mv].name, k: mv === 'jetpack' ? st.fuel : null }, tool };
  }

  WTP.gadgets = { DEFS, BY, MOVES, TOOLS, st, update, draw, drawWorld, rigPose, reset, interrupt, airJump, landed, equip, cycleTool, moveId, toolId, hudInfo, cooldown: (id) => cd(id || toolId()), fuel: () => st.fuel };
})();
