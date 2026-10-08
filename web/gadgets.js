(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand } = WTP;
  const SP = WTP.sprites;
  const S = SP.S;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, I = () => WTP.input, EN = () => WTP.enemies;
  const A = (n, x) => WTP.audio.play(n, x);
  const hard = (x, y) => { const Wd = W(); if (x < 0 || x >= Wd.w || y >= Wd.h) return true; if (y < 0) return false; const m = Wd.mat[y * Wd.w + x]; return m === 1 || m === 3 || m === 5; };

  const DEFS = [
    { id: 'boots', name: 'Spring Boots', price: 0, col: 'l', tip: 'An extra air jump. Press GADGET in the air to ground pound and crack the floor open.', spr: ['....', '.ll.', '.ll.', 'lLLl', 'l55l', '6666'] },
    { id: 'grapple', name: 'Grappling Hook', price: 900, col: 'c', tip: 'Fire it at anything solid and swing. Hold UP or DOWN to reel. Destroy the anchor and the hook rips out.', spr: ['.5.5.', '55.55', '.555.', '..4..', '..4..', '..4..', '..W..', '..W..'] },
    { id: 'jetpack', name: 'Jetpack', price: 1200, col: 'o', tip: 'Hold GADGET to fly. The exhaust scorches the page and lights it on fire.', spr: ['.33.33.', '3ee3ee3', '3ee3ee3', '3RR3RR3', '.33.33.', '.a...a.', '.y...y.'] },
    { id: 'glider', name: 'Paper Glider', price: 800, col: 'C', tip: 'Hold GADGET while falling to glide. Fires and explosions give you updrafts.', spr: ['7.......', '777.....', '7cc77...', '7777777.', '.556777.', '...5577.'] },
    { id: 'claws', name: 'Wall Claws', price: 1000, col: 'u', tip: 'Hold GADGET against a wall to climb it. Hold toward a wall to cling. The claws gouge footholds.', spr: ['7.7.7', '6.6.6', 'uuuuu', 'uWWWu', '.uuu.'] },
    { id: 'pads', name: 'Bounce Pads', price: 700, col: 'k', tip: 'Press GADGET to drop a spring pad (up to 3). Launches you, enemies and falling chunks.', spr: ['kkkkkk', '.5555.', '.4..4.', '..44..', '.4..4.', '333333'] },
    { id: 'blast', name: 'Blast Boots', price: 1600, col: 'e', tip: 'Press GADGET to set off an explosion under your feet. Free rocket jump, free crater.', spr: ['......', '.ee...', '.ee...', 'eRRe..', 'e33eee', 'yaoayo'] },
    { id: 'blink', name: 'Blink Drive', price: 2200, col: 'm', tip: 'Press GADGET to teleport toward your aim, through walls, punching out a pocket where you land.', spr: ['..m..', '.mKm.', 'mK7Km', '.mKm.', '..m..'] }
  ];
  const BY = {};
  for (const d of DEFS) { d.sprite = S(d.spr, { gx: 0, gy: 0 }); BY[d.id] = d; }

  const st = { cd: 0, fuel: 1, hook: null, pads: [], pound: false, claw: 0, gliding: false, jet: false, blinkFx: 0, flameT: 0 };
  const owned = (id) => !!BY[id] && (BY[id].price === 0 || !!WTP.save.gadgets[id]);
  const curId = () => { const f = WTP.gadgets?.force; return f && BY[f] ? f : owned(WTP.save.gadget) ? WTP.save.gadget : 'boots'; };
  const cur = () => BY[curId()];

  function reset() {
    st.cd = 0; st.fuel = 1; st.hook = null; st.pads = []; st.pound = false; st.claw = 0; st.gliding = false; st.jet = false;
    WTP.audio.loop('jet', false); WTP.audio.loop('glide', false);
  }
  function interrupt() {
    if (st.hook && st.hook.on) { st.hook = null; A('snap'); }
    st.pound = false;
  }
  function airJump(P) {
    if (curId() === 'boots') { for (let k = 0; k < 6; k++) FX().spark(P.x + P.w / 2 + rand(-3, 3), P.y + P.h, rand(-40, 40), rand(10, 60), P32.L, 0.2); A('spring'); }
  }
  function landed(P, vy) {
    if (st.pound) {
      st.pound = false;
      const x = P.x + P.w / 2, y = P.y + P.h + 2;
      W().carve(x, y, 8, { debris: 0.6, force: 160, cause: 'pound', pow: 4, letters: 6, crumbleR: 14 });
      EN()?.damageCircle?.(x, y - 4, 18, 40, 'pound');
      EN()?.push?.(x, y, 30, 0, -220);
      FX().anim('ring', 30, x, y, 0.25);
      for (let k = 0; k < 14; k++) FX().dust(x + rand(-12, 12), y - 1);
      G()?.shake?.(9); G()?.hitstop?.(0.04);
      A('pound');
      P.vy = -120; P.ground = false;
      WTP.vibe(40);
    }
  }
  function useStat() { G()?.stat?.('gadgetUse', 1); }

  function update(dt, P, c) {
    const In = I();
    const id = curId();
    st.cd = Math.max(0, st.cd - dt);
    P.extraJumps = id === 'boots' ? 1 : 0;
    const press = !c.ctl && In.take('gadget');
    const hold = !c.ctl && In.down('gadget');
    let res = null;
    if (id !== 'jetpack' && st.jet) { st.jet = false; WTP.audio.loop('jet', false); }
    if (id !== 'glider' && st.gliding) { st.gliding = false; WTP.audio.loop('glide', false); }
    if (id !== 'grapple' && st.hook) st.hook = null;
    if (id === 'boots') {
      if (press && !P.ground && !st.pound) { st.pound = true; P.vy = 430; P.vx *= 0.3; A('poundStart'); useStat(); }
      if (st.pound) { P.pose = 'pound'; P.vy = Math.max(P.vy, 430); P.maxFall = 460; if (Math.random() < 0.6) FX().trail(P.x + P.w / 2 + rand(-2, 2), P.y, P32.L, 0.2); res = { noJump: true }; }
    } else if (id === 'jetpack') {
      const thrust = hold && st.fuel > 0.01;
      if (thrust) {
        if (!st.jet) useStat();
        st.jet = true;
        P.ground = false;
        P.vy = Math.max(-150, P.vy - 1500 * dt);
        st.fuel = Math.max(0, st.fuel - dt / 1.8);
        P.pose = 'jet';
        WTP.audio.loop('jet', true);
        st.flameT -= dt;
        const fx = P.x + P.w / 2 - P.face * 3, fy = P.y + P.h - 3;
        for (let k = 0; k < 2; k++) FX().flame(fx + rand(-1, 1), fy + 2);
        if (Math.random() < 0.5) FX().spark(fx, fy + 3, rand(-20, 20), rand(60, 140), Math.random() < 0.5 ? P32.y : P32.o, 0.25);
        if (Math.random() < 0.25) FX().smoke(fx, fy + 6, 1);
        if (st.flameT <= 0) {
          st.flameT = 0.06;
          const Wd = W();
          for (let d = 2; d < 26; d++) {
            const yy = Math.floor(fy + d), xx = Math.floor(fx + rand(-1.5, 1.5));
            if (hard(xx, yy)) {
              Wd.carve(xx + 0.5, yy + 0.5, 1.4 + (26 - d) * 0.05, { debris: 0.3, force: 40, scorch: true, cause: 'jet', pow: 0.7, noCrumble: true, pop: 0.1 });
              if (Math.random() < 0.35) Wd.igniteAt(xx, yy, 3);
              EN()?.damageCircle?.(xx, yy, 5, 2, 'fire');
              break;
            }
          }
        }
      } else {
        if (st.jet) { st.jet = false; WTP.audio.loop('jet', false); }
        if (P.ground) st.fuel = Math.min(1, st.fuel + dt * 0.9); else st.fuel = Math.min(1, st.fuel + dt * 0.08);
      }
    } else if (id === 'glider') {
      const on = hold && !P.ground && P.vy > -20;
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
    } else if (id === 'claws') {
      const wd = P.wallNear();
      if (wd && !P.ground && (hold || c.mx === wd)) {
        P.pose = 'climb';
        if (hold) { P.vy = -72; st.claw -= dt; } else P.vy = Math.min(P.vy, 12);
        P.noGrav = true;
        if (st.claw <= 0) {
          st.claw = 0.09;
          const xx = wd > 0 ? Math.floor(P.x + P.w + 0.5) : Math.floor(P.x - 1);
          for (const yy of [Math.floor(P.y + 3), Math.floor(P.y + P.h - 3)]) W().carve(xx + 0.5, yy + 0.5, 1.2, { debris: 0.5, force: 30, cause: 'claw', pow: 1.5, noCrumble: true, pop: 0.3 });
          A('scratch');
          if (hold) useStat();
        }
      }
    } else if (id === 'pads') {
      if (press) dropPad(P);
    } else if (id === 'blast') {
      if (press && st.cd <= 0) {
        st.cd = 1.1;
        const x = P.x + P.w / 2, y = P.y + P.h + 1;
        WTP.weapons.explode(x, y + 2, 9, { noPush: true, cause: 'blast', letters: 4, fire: 0.05, sound: 'blastBoots' });
        P.vy = Math.min(P.vy, -340); P.ground = false; P.rocketJumpStart = P.rocketJumpStart ?? P.y;
        P.stretch = 1;
        useStat();
      }
    } else if (id === 'blink') {
      if (press && st.cd <= 0) blink(P);
    }
    if (id === 'grapple') res = grapple(dt, P, c, press, In) || res;
    updatePads(dt, P);
    return res;
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
  function grapple(dt, P, c, press, In) {
    const gun = P.gunPos || P.center();
    const aim = G()?.aim || { x: P.face, y: 0 };
    if (press) {
      if (st.hook && st.hook.on) {
        st.hook = null; P.vy -= 90; A('release');
      } else if (!st.hook) {
        st.hook = { x: gun.x, y: gun.y, vx: aim.x * 560, vy: aim.y * 560, on: false, t: 0 };
        A('hookFire'); useStat();
      } else st.hook = null;
    }
    const h = st.hook;
    if (!h) return null;
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
    const up = In.down('jump') || In.stickL.y < -0.5 || (In.gpAxes[1] < -0.5);
    const dn = c.down;
    if (up) h.len = Math.max(8, h.len - 110 * dt);
    if (dn) h.len = Math.min(160, h.len + 90 * dt);
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
    st.pads.push({ x, y, vy: P.ground ? 0 : 60, rest: false, t: 0, sq: 0, hp: 3 });
    A('padDrop'); useStat();
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
  function blink(P) {
    const aim = G()?.aim || { x: P.face, y: 0 };
    let tx = P.x + aim.x * 46, ty = P.y + aim.y * 46;
    const Wd = W();
    tx = Math.max(0, Math.min(Wd.w - P.w, tx)); ty = Math.max(-30, Math.min(Wd.h - 4 - P.h, ty));
    const from = P.center();
    Wd.carve(tx + P.w / 2, ty + P.h / 2, 8.5, { debris: 0.6, force: 140, cause: 'blink', pow: 5, letters: 4 });
    P.x = tx; P.y = ty; P.vx *= 0.5; P.vy = Math.min(P.vy, 0) - 40;
    P.unstick();
    P.iframes = Math.max(P.iframes, 0.3);
    st.cd = 1.2;
    const to = P.center();
    for (let k = 0; k < 18; k++) { FX().spark(from.x, from.y, rand(-90, 90), rand(-90, 90), Math.random() < 0.5 ? P32.m : P32.K, 0.35); FX().spark(to.x, to.y, rand(-120, 120), rand(-120, 120), Math.random() < 0.5 ? P32['7'] : P32.m, 0.35); }
    FX().beam([from.x, from.y, to.x, to.y], { kind: 'bolt', life: 0.12, c2: P32.m });
    EN()?.damageCircle?.(to.x, to.y, 10, 30, 'blink');
    A('blink'); G()?.shake?.(3); useStat();
  }
  function post() { }

  function draw(ctx, P, layer, f, dx, dy) {
    const id = curId();
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
    } else {
      if (id === 'boots' || id === 'blast') {
        const c1 = id === 'boots' ? (st.pound ? 'Y' : 'l') : (st.cd <= 0 ? ((performance.now() / 160 | 0) & 1 ? 'e' : 'o') : '3');
        px(7, 19, 3, 1, c1); px(10, 19, 3, 1, c1);
      } else if (id === 'claws') {
        px(13, 11, 1, 1, '7'); px(14, 10, 1, 1, '7'); px(14, 12, 1, 1, '6');
      }
      if (id === 'jetpack' && st.fuel < 0.999) {
        const w = 10, bx = Math.round(P.x + P.w / 2 - w / 2), by = Math.round(P.y - 9);
        ctx.fillStyle = PAL['0']; ctx.fillRect(bx - 1, by - 1, w + 2, 3);
        ctx.fillStyle = st.fuel < 0.25 ? PAL.e : PAL.a; ctx.fillRect(bx, by, Math.round(w * st.fuel), 1);
      }
    }
  }
  function drawWorld(ctx) {
    const h = st.hook;
    if (h) {
      const P = WTP.player, g = P.gunPos || P.center();
      const len = Math.hypot(h.x - g.x, h.y - g.y), n = Math.max(2, Math.ceil(len / 2));
      for (let k = 0; k <= n; k++) { const t = k / n; ctx.fillStyle = k & 1 ? PAL['5'] : PAL['4']; ctx.fillRect(Math.round(g.x + (h.x - g.x) * t), Math.round(g.y + (h.y - g.y) * t), 1, 1); }
      const a = Math.atan2(h.y - g.y, h.x - g.x);
      const r = HOOK.rotated(a, Math.cos(a) < 0);
      ctx.drawImage(r.cv, Math.round(h.x - r.ox), Math.round(h.y - r.oy));
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
  }
  const HOOK = S(['.55.', '5..5', '...5', '.555', '5...'], { gx: 1, gy: 2 });
  function buy(id) {
    const d = BY[id];
    if (!d || owned(id)) return true;
    if (WTP.save.scrap < d.price) return false;
    WTP.save.scrap -= d.price; WTP.save.gadgets[id] = true; WTP.persist();
    return true;
  }
  function equip(id) { if (!owned(id)) return false; WTP.save.gadget = id; WTP.persist(); reset(); return true; }

  WTP.gadgets = { DEFS, BY, st, update, post, draw, drawWorld, reset, interrupt, airJump, landed, owned, cur, curId, buy, equip, cooldown: () => st.cd, fuel: () => st.fuel };
})();
