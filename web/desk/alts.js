(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand, pick } = WTP;
  const WP = WTP.weapons;
  const K = WP.K;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player, EN = () => WTP.enemies, ST = () => WTP.structs;
  const A = (n, x) => WTP.audio.play(n, x);
  const st = WP.st;
  const F = WP.FIRE;
  const fire = (id, o) => { const d = WP.BY[id]; const r = F[id](o); if (d && d.snd) A(d.snd); if (d && d.flash) FX().flashSprite(d.flash, o.x, o.y, Math.atan2(o.ay, o.ax)); return r; };
  const shots = (t) => WP.shots.filter((s) => s.t === t);
  const ALT = {};
  const DOES = {};
  const def = (id, does, cd, fn) => { DOES[id] = does; ALT[id] = (o) => { if (cd && !K.cooldown('alt-' + id, cd)) return; fn(o); }; };

  K.shotType('xbolt', {
    step(s, dt) {
      s.vy += 60 * dt;
      return WP.travel(s, dt, (x, y, isE, e) => { if (isE) e.damage(40, 'bolt'); WP.explode(x, y, 9, { letters: 8, cause: 'xbolt' }); return true; });
    },
    draw(ctx, s) { const a = Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.fillStyle = PAL['0']; ctx.fillRect(-5, -1, 7, 2); ctx.fillStyle = PAL.W; ctx.fillRect(-4.5, -0.5, 6, 1); ctx.fillStyle = PAL.e; ctx.fillRect(1.5, -1, 1.6, 2); ctx.restore(); }
  });
  K.shotType('bigplasma', {
    step(s, dt) {
      if (Math.random() < 0.6) FX().spark(s.x, s.y, rand(-40, 40), rand(-40, 40), P32.m, 0.2);
      return WP.travel(s, dt, (x, y, isE, e) => { if (isE) e.damage(120, 'plasma'); WP.explode(x, y, 13, { letters: 10, cause: 'plasma', kind: 'plasma', fire: 0 }); return true; });
    },
    draw(ctx, s) { const r = 2.6 + Math.sin(s.age * 30) * 0.4; ctx.fillStyle = PAL.p; ctx.beginPath(); ctx.arc(s.x, s.y, r + 1, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAL.m; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAL['7']; ctx.beginPath(); ctx.arc(s.x - 0.6, s.y - 0.6, r * 0.4, 0, Math.PI * 2); ctx.fill(); }
  });
  K.shotType('napalm', {
    step(s, dt) {
      s.vy += 380 * dt;
      if (Math.random() < 0.7) FX().flame(s.x, s.y);
      return WP.travel(s, dt, (x, y, isE, e) => { if (isE) e.damage(30, 'fire'); WP.explode(x, y, 6, { letters: 4, cause: 'napalm', fire: 0.9 }); W().igniteAt(Math.floor(x), Math.floor(y), 40); for (let k = 0; k < 10; k++) FX().lava(x, y, rand(-80, 80), rand(-120, -20)); return true; });
    },
    draw(ctx, s) { ctx.fillStyle = PAL.o; ctx.fillRect(s.x - 1.5, s.y - 1.5, 3, 3); ctx.fillStyle = PAL.Y; ctx.fillRect(s.x - 0.5, s.y - 1, 1, 1); }
  });
  K.shotType('grocket', {
    step(s, dt) {
      const tp = WP.aimPoint({ x: s.x, y: s.y, ax: s.vx, ay: s.vy });
      const want = Math.atan2(tp.y - s.y, tp.x - s.x), cur = Math.atan2(s.vy, s.vx);
      let da = want - cur; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      const a = cur + Math.max(-4 * dt, Math.min(4 * dt, da));
      const sp = Math.min(260, Math.hypot(s.vx, s.vy) + 200 * dt);
      s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp;
      if (Math.random() < 0.9) FX().smoke(s.x - s.vx * 0.02, s.y - s.vy * 0.02, 1);
      return WP.travel(s, dt, (x, y, isE, e) => { if (isE) e.damage(80, 'rocket'); WP.explode(x, y, 12, { letters: 10, cause: 'rocket' }); return true; });
    },
    draw(ctx, s) { const a = Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.fillStyle = PAL['0']; ctx.fillRect(-3, -1.5, 6, 3); ctx.fillStyle = PAL.e; ctx.fillRect(-2.5, -1, 5, 2); ctx.fillStyle = PAL.y; ctx.fillRect(-4.5, -0.6, 1.5 + Math.random(), 1.2); ctx.fillStyle = PAL['7']; ctx.fillRect(1.5, -1, 1, 2); ctx.restore(); }
  });
  K.shotType('bit', {
    step(s, dt) {
      s.dist = (s.dist || 0) + Math.hypot(s.vx, s.vy) * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      W().carve(s.x, s.y, 3, { debris: 0.4, force: 60, cause: 'drill', pow: 3, noCrumble: Math.random() < 0.8, pop: 0.6, noCrack: true });
      EN()?.damageCircle?.(s.x, s.y, 4, 120 * dt, 'drill');
      if (Math.random() < 0.6) FX().spark(s.x, s.y, -s.vx * 0.3 + rand(-30, 30), -s.vy * 0.3 + rand(-30, 30), P32['6'], 0.2);
      return s.dist > 180 || s.x < -5 || s.y < -20 || s.x > W().w + 5 || s.y > W().gh + 5;
    },
    draw(ctx, s) { const a = Math.atan2(s.vy, s.vx); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a); ctx.fillStyle = PAL['0']; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-2, -2); ctx.lineTo(-2, 2); ctx.fill(); ctx.fillStyle = PAL['6']; ctx.beginPath(); ctx.moveTo(3, 0); ctx.lineTo(-1.5, -1.4); ctx.lineTo(-1.5, 1.4); ctx.fill(); ctx.restore(); }
  });
  K.shotType('bigmeteor', {
    step(s, dt) {
      s.vy += 200 * dt;
      for (let k = 0; k < 3; k++) FX().flame(s.x + rand(-3, 3), s.y - 3);
      if (Math.random() < 0.5) FX().smoke(s.x, s.y - 6, 1);
      return WP.travel(s, dt, (x, y, isE) => { if (isE) return false; WP.explode(x, y, 28, { letters: 20, cause: 'meteor', fire: 0.5 }); G()?.killcam?.(x, y, 30); W().igniteAt(Math.floor(x), Math.floor(y), 50); return true; });
    },
    draw(ctx, s) { ctx.fillStyle = PAL['0']; ctx.beginPath(); ctx.arc(s.x, s.y, 5.4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAL.w; ctx.beginPath(); ctx.arc(s.x, s.y, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAL.o; ctx.fillRect(s.x - 2, s.y + 1, 3, 2); }
  });
  K.shotType('para', {
    step(s, dt) {
      s.vy = Math.min(s.vy + 300 * dt, 18); s.vx *= 0.98;
      s.x += s.vx * dt + Math.sin(s.age * 2) * 0.1; s.y += s.vy * dt;
      if ((s.ig = (s.ig || 0) - dt) <= 0) { s.ig = 0.25; const r = W().raycast(s.x, s.y, 0, 1, 60); if (r.hit) W().igniteAt(Math.floor(r.x + rand(-6, 6)), Math.floor(r.y), 6); }
      if (Math.random() < 0.6) FX().spark(s.x, s.y + 1, rand(-20, 20), rand(10, 40), P32.e, 0.4);
      st.thermals.push({ x: s.x, y: s.y + 20, r: 10, k: 0.4 }); if (st.thermals.length > 12) st.thermals.shift();
      return s.life <= 0 || W().solid(Math.floor(s.x), Math.floor(s.y));
    },
    draw(ctx, s) { ctx.strokeStyle = PAL['6']; ctx.lineWidth = 0.3; ctx.beginPath(); ctx.moveTo(s.x - 4, s.y - 5); ctx.lineTo(s.x, s.y); ctx.lineTo(s.x + 4, s.y - 5); ctx.stroke(); ctx.fillStyle = PAL['7']; ctx.beginPath(); ctx.arc(s.x, s.y - 5, 4.5, Math.PI, 0); ctx.fill(); ctx.fillStyle = (s.age * 12 | 0) & 1 ? PAL.y : PAL.e; ctx.fillRect(s.x - 0.8, s.y - 0.8, 1.6, 1.6); }
  });

  def('pistol', 'Fan the hammer: three quick shots', 0, (o) => { for (let k = 0; k < 3; k++) K.later(k * 0.06, () => fire('pistol', K.rot(o, rand(-0.06, 0.06)))); });
  def('revolver', 'Ricochet round that bounces three times', 0.8, (o) => { WP.bullet(o, 0.003, 760, 5, 45, { ric: 3, pierce: 10, spr: 'bigbullet' }); A('revolver'); });
  def('dual', 'Both barrels at once', 0.3, (o) => { for (let k = 0; k < 4; k++) WP.bullet(K.rot(o, (k - 1.5) * 0.06), 0.02, 580, 3.1, 9, { ric: 1 }); A('dual'); A('dual'); });
  def('nailgun', 'Nail the chunk you aim at to the spot, frozen in mid air', 0.4, (o) => {
    const Wd = W();
    let best = null, bd = 1e9;
    for (const c of Wd.chunks) { const dx = c.x - o.x, dy = c.y - o.y; const along = dx * o.ax + dy * o.ay; if (along < 0) continue; const perp = Math.abs(dx * o.ay - dy * o.ax); if (perp < c.rad + 3 && along < bd) { bd = along; best = c; } }
    if (!best) { for (let k = 0; k < 6; k++) fire('nailgun', K.rot(o, (k - 2.5) * 0.08)); return; }
    Wd.chunks.splice(Wd.chunks.indexOf(best), 1); Wd.settle(best, false);
    FX().beam([o.x, o.y, best.x, best.y], { kind: 'sight', life: 0.1, c1: P32['6'] });
    FX().pop(best.x, best.y - best.rad - 3, 'NAILED', { scale: 1, ramp: ['7', '6'], life: 0.7 }); A('nail');
  });
  def('flare', 'Parachute flare that drifts down and sets fires below it', 1.2, (o) => { WP.addShot({ t: 'para', x: o.x, y: o.y, vx: o.ax * 120, vy: Math.min(-150, o.ay * 200), life: 9 }); A('flare'); });
  def('saw', 'Recall every blade back toward you, grinding all the way', 0.8, () => {
    const P = PL(); let n = 0;
    for (const s of shots('saw')) { const dx = P.x + 3 - s.x, dy = P.y + 7 - s.y, d = Math.hypot(dx, dy) || 1; s.stuck = 0; s.vx = (dx / d) * 380; s.vy = (dy / d) * 380; s.life = Math.min(s.life, d / 380 + 0.4); n++; }
    A(n ? 'sawHit' : 'deny');
  });
  def('smg', 'Six round burst, every round pops letters', 0.45, (o) => { for (let k = 0; k < 6; k++) K.later(k * 0.035, () => fire('smg', o)); });
  def('rifle', 'Underbarrel grenade', 1.2, (o) => { WP.lob(o, 'grenade', 360, { fuse: 0.9, spr: 'grenade', g: 520, bounce: 0.3 }); A('thump'); });
  def('minigun', 'Keep the barrels spinning without firing', 0, () => { st.minigunHold = !st.minigunHold; G()?.label?.(st.minigunHold ? 'SPIN LOCK ON' : 'SPIN LOCK OFF', 700); });
  def('shotgun', 'A single heavy slug', 0.6, (o) => { WP.bullet(o, 0.002, 700, 6, 70, { pierce: 8, spr: 'bigbullet' }); PL().impulse(-o.ax * 90, -o.ay * 90); A('shotgun'); G()?.shake?.(5); });
  def('double', 'Just one barrel', 0, (o) => { fire('shotgun', o); PL().impulse(-o.ax * 120, -o.ay * 120); G()?.shake?.(6); });
  def('flak', 'Burst every shell in the air right now', 0, () => { let n = 0; for (const s of shots('flak')) { s.life = 0.001; n++; } A(n ? 'flak' : 'deny'); });
  def('confetti', 'Confetti bomb: a burst of paint and party', 1, (o) => {
    const tp = WP.aimPoint(o);
    const cols = ['e', 'y', 'l', 'c', 'k', 'P', 'o'];
    for (let k = 0; k < 80; k++) FX().confetti(tp.x, tp.y, rand(-220, 220), rand(-260, 60));
    for (let k = 0; k < 7; k++) W().paintAt(tp.x + rand(-10, 10), tp.y + rand(-8, 8), rand(3, 6), P32[pick(cols)]);
    WP.explode(tp.x, tp.y, 6, { letters: 8, cause: 'confetti', fire: 0 }); A('confetti');
  });
  def('sniper', 'Scope in: slow motion for a perfect shot', 3, () => { G()?.slowmo?.(0.3, 1.6, true); G()?.label?.('SCOPED', 800); A('rack'); });
  def('railgun', 'Overcharge: a wider beam through everything', 3, (o) => { WP.hitscan(o, 2000, 6, 99999, 400, P32.m, true); G()?.shake?.(18); G()?.chroma?.(1); A('rail'); PL().impulse(-o.ax * 260, -o.ay * 200); });
  def('crossbow', 'Explosive bolt', 1, (o) => { WP.addShot({ t: 'xbolt', x: o.x, y: o.y, vx: o.ax * 520, vy: o.ay * 520, life: 2 }); A('twang'); });
  def('harpoon', 'Reel yourself to whatever you hit', 0.6, (o) => {
    const r = W().raycast(o.x, o.y, o.ax, o.ay, 160, 0.6);
    FX().beam([o.x, o.y, r.x, r.y], { kind: 'rope', life: 0.25 });
    if (!r.hit) { A('deny'); return; }
    const P = PL(); const dx = r.x - o.x, dy = r.y - o.y, d = Math.hypot(dx, dy) || 1;
    P.vx = (dx / d) * Math.min(420, 120 + d * 4); P.vy = (dy / d) * Math.min(420, 120 + d * 4) - 60; P.ground = false; A('harpoon');
  });
  def('laser', 'A wide melting fan', 1.2, (o) => {
    for (let k = -3; k <= 3; k++) { const oo = K.rot(o, k * 0.09); const r = W().raycast(oo.x, oo.y, oo.ax, oo.ay, 220, 0.5); FX().beam([oo.x, oo.y, r.x, r.y], { kind: 'laser', life: 0.12, c1: P32['7'], c2: P32.k }); if (r.hit) W().carve(r.x, r.y, 3.5, { debris: 0.3, scorch: true, ignite: 0.1, cause: 'laser', pop: 0.4 }); }
    A('laserZap');
  });
  def('plasma', 'Charged plasma ball', 1.2, (o) => { WP.addShot({ t: 'bigplasma', x: o.x, y: o.y, vx: o.ax * 200, vy: o.ay * 200, life: 3 }); A('plasma'); });
  def('tesla', 'Drop a tesla node that zaps everything around it', 2.5, (o) => {
    const tp = WP.aimPoint(o);
    const r = W().raycast(tp.x, tp.y - 2, 0, 1, 60);
    const nx = r.x, ny = r.y - 2;
    K.ent({ life: 7, zap: 0, update(dt) { this.zap -= dt; if (this.zap <= 0) { this.zap = 0.25; const e = EN()?.nearest?.(nx, ny, 50); if (e) { FX().bolt(nx, ny - 3, e.x, e.y); e.damage(30, 'tesla'); } else { const tx = nx + rand(-30, 30), ty = ny + rand(-30, 10); FX().bolt(nx, ny - 3, tx, ty); W().carve(tx, ty, 2, { debris: 0.3, cause: 'tesla', pow: 2, scorch: true, noCrack: true }); } A('tesla'); } }, draw(ctx) { ctx.fillStyle = PAL['0']; ctx.fillRect(nx - 1.5, ny - 4, 3, 5); ctx.fillStyle = PAL.c; ctx.fillRect(nx - 1, ny - 3.5, 2, 4); ctx.fillStyle = (this.t * 10 | 0) & 1 ? PAL['7'] : PAL.C; ctx.fillRect(nx - 1, ny - 5, 2, 1.5); } });
  });
  def('freeze', 'An ice wall you can stand on', 1.5, (o) => {
    const Wd = W(); const tp = WP.aimPoint(o);
    for (let y = -14; y <= 4; y++) for (let x = -2; x <= 2; x++) { const cx = Math.floor(tp.x + x), cy = Math.floor(tp.y + y); if (!K.inGrid(cx, cy) || PL().inside(cx, cy)) continue; const i = cy * Wd.w + cx; if (Wd.mat[i] === Wd.SOLID || Wd.mat[i] === Wd.ROCK) continue; Wd.setCell(cx, cy, P32.C, Wd.M.GLASS, 0); Wd.mat[i] = Wd.ICE; Wd.burn[i] = 220 + ((Math.random() * 60) | 0); Wd.iceList.push(i); Wd.touch(i); }
    A('freezeHit');
  });
  def('sound', 'Bass drop: a radial pulse around you', 1.5, () => { const P = PL(); WP.shockwave(P.x + 3, P.y + 7, 34); A('boom', 10); G()?.shake?.(10); });
  def('eraser', 'Erase only the window panes along your aim (x-ray)', 0.4, (o) => { const tp = WP.aimPoint(o); for (let k = 0; k < 10; k++) W().eraseBack(o.x + (tp.x - o.x) * (k / 9), o.y + (tp.y - o.y) * (k / 9), 5); A('erase'); });
  def('glitch', 'Datamosh: smears a block of pixels along your aim', 0.8, (o) => {
    const Wd = W(); const tp = WP.aimPoint(o); const sh = Math.round(o.ax * 6), sv = Math.round(o.ay * 6);
    for (let y = -10; y <= 10; y++) for (let x = -16; x <= 16; x++) { const cx = Math.floor(tp.x + x), cy = Math.floor(tp.y + y); const sx = cx - sh, sy = cy - sv; if (!K.inGrid(cx, cy) || !K.inGrid(sx, sy)) continue; const i = cy * Wd.w + cx, j = sy * Wd.w + sx; if (Wd.mat[i] === Wd.SOLID && Wd.mat[j] === Wd.SOLID) { Wd.col[i] = Wd.col[j]; Wd.src[i] = Wd.src[j]; Wd.touch(i); } }
    G()?.chroma?.(0.7); A('glitch');
  });
  def('backspace', 'Ctrl+Backspace: deletes whole words along your aim', 0.5, (o) => {
    const Wd = W(); const tp = WP.aimPoint(o); let n = 0;
    for (let k = 0; k < 12; k++) { const x = o.x + (tp.x - o.x) * (k / 11), y = o.y + (tp.y - o.y) * (k / 11); const wd = K.wordAt(x, y); if (wd && !wd.gone) { wd.gone = true; K.later(n * 0.08, () => { for (const g of wd.ids) { const gr = Wd.groups[g]; if (!gr || gr.dead) continue; for (let yy = gr.y0; yy <= gr.y1; yy++) for (let xx = gr.x0; xx <= gr.x1; xx++) { const i = yy * Wd.w + xx; if (Wd.gid[i] === g && Wd.mat[i] === Wd.SOLID) Wd.kill(i, xx, yy, xx, yy, 0.2, 20); } gr.dead = true; } A('keyclack'); }); n++; } }
    if (!n) A('deny');
  });
  def('flame', 'Napalm glob that splashes burning goo', 0.9, (o) => { WP.addShot({ t: 'napalm', x: o.x, y: o.y, vx: o.ax * 300, vy: o.ay * 300 - 30, life: 3 }); A('flare'); });
  def('acid', 'An acid puddle that spreads sideways', 1, (o) => { const r = W().raycast(o.x, o.y, o.ax, o.ay, 120); for (let k = 0; k < 60; k++) FX().acid(r.x + rand(-2, 2), r.y - 1, rand(-120, 120), rand(-40, 10)); A('sizzle'); });
  def('paint', 'Bucket fill: repaints the whole connected area', 0.8, (o) => {
    const Wd = W(); const tp = WP.aimPoint(o); const x0 = Math.floor(tp.x), y0 = Math.floor(tp.y);
    if (!K.inGrid(x0, y0)) return;
    const i0 = y0 * Wd.w + x0; const solid = Wd.mat[i0] === Wd.SOLID; const ref = solid ? Wd.col[i0] : Wd.bcol[i0];
    const c = P32[pick(['k', 'c', 'y', 'l', 'P', 'o', 'e', 't'])];
    const seen = new Set([i0]); const q = [i0]; let n = 0;
    const near = (a) => Math.abs((a & 255) - (ref & 255)) + Math.abs(((a >>> 8) & 255) - ((ref >>> 8) & 255)) + Math.abs(((a >>> 16) & 255) - ((ref >>> 16) & 255)) < 50;
    while (q.length && n < 4000) {
      const i = q.shift(); n++;
      if (solid) { Wd.col[i] = WTP.mix(c, Wd.col[i], 0.25); } else { Wd.bcol[i] = WTP.mix(c, Wd.bcol[i], 0.3); Wd.ptex[i] = 0; }
      Wd.touch(i);
      const x = i % Wd.w;
      for (const j of [i - 1, i + 1, i - Wd.w, i + Wd.w]) { if (j < 0 || j >= Wd.w * Wd.gh || seen.has(j) || Math.abs((j % Wd.w) - x) > 1) continue; if (solid ? Wd.mat[j] === Wd.SOLID && near(Wd.col[j]) : (Wd.back[j] && Wd.mat[j] !== Wd.SOLID && near(Wd.bcol[j]))) { seen.add(j); q.push(j); } }
    }
    A('paint'); G()?.stat?.('painted', n);
  });
  def('lava', 'A lava wave rolling along the ground', 1.5, (o) => { const P = PL(); const dir = P.face; for (let k = 0; k < 12; k++) K.later(k * 0.07, () => WP.lob({ x: P.x + 3 + dir * (4 + k * 5), y: P.y + 4, ax: dir * 0.2, ay: -1 }, 'lavab', 120, { life: 3, g: 420, dmg: 20 })); A('lava'); });
  def('water', 'Steam burst: puts out fires and shoves everything back', 1.2, (o) => {
    const tp = WP.aimPoint(o); const Wd = W();
    for (const b of Wd.burning) if (Math.hypot((b % Wd.w) - tp.x, ((b / Wd.w) | 0) - tp.y) < 22) Wd.burn[b] = 1;
    for (let k = 0; k < 30; k++) FX().smoke(tp.x + rand(-12, 12), tp.y + rand(-8, 8), 1, P32['6']);
    for (const c of Wd.chunks) { const dx = c.x - tp.x, dy = c.y - tp.y, d = Math.hypot(dx, dy) || 1; if (d < 30) { c.vx += (dx / d) * 300; c.vy += (dy / d) * 300 - 100; } }
    EN()?.push?.(tp.x, tp.y, 30, 300, -200); A('sizzle');
  });
  def('termites', 'Termite queen: a nest that keeps spawning termites', 4, (o) => { const tp = WP.aimPoint(o); K.ent({ life: 8, sp: 0, update(dt) { this.sp -= dt; if (this.sp <= 0) { this.sp = 0.8; WP.lob({ x: tp.x, y: tp.y - 2, ax: rand(-0.5, 0.5), ay: -1 }, 'jar', 40, { life: 4, spr: 'jar', g: 520 }); } }, draw(ctx) { ctx.fillStyle = PAL.w; ctx.beginPath(); ctx.arc(tp.x, tp.y, 3 + Math.sin(this.t * 4) * 0.3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAL.W; ctx.fillRect(tp.x - 1, tp.y - 1, 2, 2); } }); A('jar'); });
  def('lens', 'A wide beam that dries and cracks everything it crosses', 1, (o) => { const r = W().raycast(o.x, o.y, o.ax, o.ay, 120, 0.6); for (let k = 0; k < 6; k++) { const x = o.x + (r.x - o.x) * (k / 5), y = o.y + (r.y - o.y) * (k / 5); W().carve(x, y, 2.5, { debris: 0.1, scorch: true, cause: 'lens', pow: 1.2, noCrumble: true }); } ST().impact(r.x, r.y, 4, 4); A('sizzle'); });
  def('grenade', 'Cooked grenade: short fuse', 0.7, (o) => { WP.lob(o, 'grenade', 260, { fuse: 0.35, spr: 'grenade', g: 520, bounce: 0.5 }); A('throw'); });
  def('rocket', 'Guided rocket that follows your cursor', 1.4, (o) => { WP.addShot({ t: 'grocket', x: o.x, y: o.y, vx: o.ax * 120, vy: o.ay * 120, life: 6 }); A('rocket'); });
  def('homing', 'Lock on to up to eight targets', 2.5, (o) => {
    const Wd = W(); const P = PL(); const targets = (EN()?.list || []).filter((e) => !e.dead).slice(0, 8).map((e) => ({ x: e.x, y: e.y }));
    while (targets.length < 8) { const x = rand(10, Wd.w - 10); targets.push({ x, y: K.firstSolid ? 0 : rand(20, Wd.gh - 20) }); }
    targets.forEach((t, k) => WP.addShot({ t: 'missile', x: o.x, y: o.y, vx: rand(-80, 80), vy: -160, life: 5, spr: 'missile', tx: t.x, ty: t.y, delay: k * 0.07, dmg: 40 }));
    A('missile'); void P;
  });
  def('cluster', 'Split every cluster bomb right now', 0, () => { let n = 0; for (const s of shots('cluster')) { s.fuse = 0; s.age = Math.max(s.age, 0.2); n++; } A(n ? 'beep' : 'deny'); });
  def('firework', 'Finale: a volley of eight fireworks', 3, (o) => { for (let k = 0; k < 8; k++) K.later(k * 0.12, () => WP.addShot({ t: 'firework', x: o.x, y: o.y, vx: Math.cos(-Math.PI / 2 + (k - 3.5) * 0.18) * 230, vy: Math.sin(-Math.PI / 2 + (k - 3.5) * 0.18) * 230, life: 0.85 + rand(0, 0.3), spr: 'firework', dmg: 20 })); A('firework'); });
  def('nuke', 'Delayed nuke: a beacon with a three second countdown', 8, (o) => {
    const tp = WP.aimPoint(o);
    K.ent({ life: 3.1, update() { const s = Math.ceil(3 - this.t); if (s !== this.s) { this.s = s; if (s > 0) { A('countdown'); G()?.announce?.(String(s), 4); } } }, end() { WP.explode(tp.x, tp.y, 44, { letters: 30, cause: 'nuke' }); G()?.killcam?.(tp.x, tp.y, 50); }, draw(ctx) { ctx.fillStyle = (this.t * 6 | 0) & 1 ? PAL.e : PAL.y; ctx.beginPath(); ctx.arc(tp.x, tp.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = PAL.e; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(tp.x, tp.y, 44 * (1 - this.t / 3.1), 0, Math.PI * 2); ctx.stroke(); } });
  });
  def('bowling', 'Strike: a faster, heavier ball', 1, (o) => { WP.lob(o, 'bowl', 380, { life: 7, spr: 'bowl', g: 620, dmg: 120, hits: 0, roll: 0 }); A('throw'); });
  def('antigrav', 'Float bubble: everything loose near your aim floats for a while', 3, (o) => {
    const tp = WP.aimPoint(o);
    K.ent({ life: 3, update(dt) { for (const c of W().chunks) if (Math.hypot(c.x - tp.x, c.y - tp.y) < 50) { c.vy = Math.min(c.vy, -30) - 300 * dt; c.vx *= 0.98; c.rest = 0; c.va += rand(-0.1, 0.1); } for (const e of EN()?.list || []) if (!e.T.boss && Math.hypot(e.x - tp.x, e.y - tp.y) < 50) e.vy = -40; }, draw(ctx) { ctx.globalAlpha = 0.3; ctx.strokeStyle = PAL.P; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.arc(tp.x, tp.y, 50, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; } });
    A('agravThrow');
  });
  def('hammer', 'Ground pound shockwave', 1.4, () => { const P = PL(); const x = P.x + 3, y = P.y + P.h; W().carve(x, y + 2, 9, { debris: 0.7, force: 160, cause: 'hammer', pow: 5, letters: 8 }); WP.shockwave(x, y, 30); P.vy = -160; A('hammer'); G()?.shake?.(12); });
  def('chainsaw', 'Rev dash: charge forward carving everything', 1.2, (o) => { K.ent({ life: 0.35, update() { const P = PL(); P.vx = o.ax * 320; P.vy = Math.min(P.vy, o.ay * 200); W().carve(P.x + 3 + o.ax * 6, P.y + 6 + o.ay * 6, 5.5, { debris: 0.5, force: 90, cause: 'saw', pop: 0.5, noCrack: true }); EN()?.damageCircle?.(P.x + 3 + o.ax * 6, P.y + 6, 8, 12, 'saw'); } }); A('chainsawRev'); });
  def('katana', 'Iaido: dash slash straight through whatever is ahead', 1.2, (o) => {
    const Wd = W(); const P = PL(); const sx = P.x + 3, sy = P.y + 6; const len = 46;
    for (let d = 0; d < len; d += 0.5) { const x = sx + o.ax * d, y = sy + o.ay * d; Wd.carve(x, y, 0.9, { debris: 0.2, force: 20, cause: 'katana', pow: 9, noCrumble: true, noCrack: true }); EN()?.damageCircle?.(x, y, 4, 8, 'katana'); }
    let ex = sx + o.ax * len, ey = sy + o.ay * len;
    for (let d = len; d > 0; d -= 1) { if (!P.collide(sx + o.ax * d - 3, sy + o.ay * d - 6, P.w, P.h)) { ex = sx + o.ax * d; ey = sy + o.ay * d; break; } }
    P.x = ex - 3; P.y = ey - 6; P.vx = o.ax * 100; P.vy = o.ay * 100;
    FX().beam([sx, sy, ex, ey], { kind: 'rail', life: 0.25, w: 1, c1: P32['7'], c2: P32.C, c3: P32['6'] });
    K.later(0.12, () => Wd.crumble((sx + ex) / 2, (sy + ey) / 2, 0, len / 2 + 6));
    A('katana'); G()?.hitstop?.(0.06);
  });
  def('drill', 'Fire the drill bit as a tunnelling projectile', 1, (o) => { WP.addShot({ t: 'bit', x: o.x, y: o.y, vx: o.ax * 220, vy: o.ay * 220, life: 3 }); A('drill'); });
  def('wrecking', 'Let go of the chain: the ball keeps flying', 1, (o) => {
    const b = st.ball;
    if (!b) { A('deny'); return; }
    WP.lob({ x: b.x, y: b.y, ax: (b.vx || o.ax * 200) / 300, ay: (b.vy || -100) / 300 }, 'bowl', Math.max(200, Math.hypot(b.vx || 0, b.vy || 0)), { life: 6, spr: 'bowl', g: 620, dmg: 120, hits: 0, roll: 0 });
    st.ball = null; A('throw');
  });
  def('whip', 'Crack: stuns everything near you', 1.5, () => { const P = PL(); for (const e of EN()?.list || []) if (Math.hypot(e.x - P.x, e.y - P.y) < 40) { e.stun = 2; e.damage(15, 'whip'); } K.mark({ kind: 'ring', x: P.x + 3, y: P.y + 7, r: 40, life: 0.4, color: '#ffe066' }); A('whipCrack'); G()?.shake?.(4); });
  def('glove', 'Uppercut: launches you and whatever is above', 1, (o) => { const P = PL(); const c = W().grabDisk(P.x + 3, P.y - 4, 6); if (c) W().releaseChunk(c, rand(-40, 40), -560); else W().carve(P.x + 3, P.y - 3, 5, { debris: 0.6, force: 160, pow: 3, cause: 'glove', pop: 1 }); P.vy = -260; A('punch'); G()?.shake?.(5); });
  def('stamp', 'APPROVED stamp: pastes letters back as solid platforms', 1, (o) => {
    const Wd = W(); const tp = WTP.levels.textPixels('APPROVED', '7'); const sc = 2;
    const cx = o.x + o.ax * 22, cy = o.y + o.ay * 22; const x0 = Math.round(cx - (tp.w * sc) / 2), y0 = Math.round(cy - (tp.h * sc) / 2);
    for (let ty = 0; ty < tp.h; ty++) for (let tx = 0; tx < tp.w; tx++) { if (!tp.on[ty * tp.w + tx]) continue; for (let sy = 0; sy < sc; sy++) for (let sx = 0; sx < sc; sx++) { const x = x0 + tx * sc + sx, y = y0 + ty * sc + sy; if (!K.inGrid(x, y) || PL().inside(x, y)) continue; if (Wd.mat[y * Wd.w + x] === Wd.SOLID) continue; Wd.setCell(x, y, P32.G, Wd.M.RUBBER, 0); } }
    FX().pop(cx, y0 - 4, 'APPROVED!', { scale: 1, ramp: ['7', 'L', 'l'], life: 0.8 }); A('stampW');
  });
  def('gravity', 'Pull: drags every small loose piece toward you', 1.2, () => { const P = PL(); for (const c of W().chunks) { const dx = P.x + 3 - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1; if (d < 110 && c.n < 600) { c.vx += (dx / d) * 380; c.vy += (dy / d) * 380 - 100; c.rest = 0; } } FX().suckAll?.(P.x + 3, P.y + 6, 100, 1); A('grab'); });
  def('magnet', 'Repel: blasts loose pieces and enemies away', 1.2, () => { const P = PL(); for (const c of W().chunks) { const dx = c.x - P.x - 3, dy = c.y - P.y - 7, d = Math.hypot(dx, dy) || 1; if (d < 100) { c.vx += (dx / d) * 500; c.vy += (dy / d) * 500 - 100; c.rest = 0; } } for (const e of EN()?.list || []) { if (e.T.boss) continue; const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1; if (d < 90) { e.vx += (dx / d) * 400; e.vy -= 200; } } FX().fling(1, 0, 300); A('fling'); });
  def('ballgun', 'Ball pit: five balls in a fan', 1.2, (o) => { for (let k = 0; k < 5; k++) fire('ballgun', K.rot(o, (k - 2) * 0.15)); });
  def('boomerang', 'Throw two at once', 1.5, (o) => { st.boomers = 0; for (const s of [-0.3, 0.3]) { st.boomers++; WP.addShot({ t: 'boomerang', x: o.x, y: o.y, vx: K.rot(o, s).ax * 340, vy: K.rot(o, s).ay * 340, life: 3, spr: 'boomerang', out: 0.45, dmg: 25, spin: 0 }); } A('boomerang'); });
  def('blackhole', 'White hole: a burst that throws everything outward', 2, (o) => { const tp = WP.aimPoint(o); WP.shockwave(tp.x, tp.y, 46); FX().flash(0.4, '#ffffff'); for (const c of W().chunks) { const dx = c.x - tp.x, dy = c.y - tp.y, d = Math.hypot(dx, dy) || 1; if (d < 70) { c.vx += (dx / d) * 600; c.vy += (dy / d) * 600; } } A('portalOut'); });
  def('snowball', 'Snowman: builds an icy snowman you can stand on', 2, (o) => {
    const Wd = W(); const tp = WP.aimPoint(o); const gy = K.inGrid(Math.floor(tp.x), Math.floor(tp.y)) ? tp.y : Wd.gh - 4;
    for (const [oy, r] of [[0, 5], [-8, 3.6], [-14, 2.6]]) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (dx * dx + dy * dy > r * r) continue; const x = Math.floor(tp.x + dx), y = Math.floor(gy + oy + dy - 5); if (!K.inGrid(x, y) || PL().inside(x, y)) continue; const i = y * Wd.w + x; if (Wd.mat[i] === Wd.SOLID) continue; Wd.setCell(x, y, (dx * dx + dy * dy < 1 && oy === -14) ? P32.o : P32['7'], Wd.M.GLASS, 0); Wd.mat[i] = Wd.ICE; Wd.burn[i] = 240; Wd.iceList.push(i); Wd.touch(i); }
    A('freezeHit'); FX().pop(tp.x, gy - 24, 'SNOWMAN', { scale: 1, ramp: ['7', 'C'], life: 0.8 });
  });
  def('banana', 'Three bananas in a fan', 1.5, (o) => { for (let k = -1; k <= 1; k++) WP.lob(K.rot(o, k * 0.2), 'banana', 240, { fuse: 1.6, spr: 'banana', g: 520, bounce: 0.35, big: true }); A('throw'); });
  def('pen', 'Eraser end: rubs out the ink you drew', 0, (o) => { const Wd = W(); const tp = WP.aimPoint(o); for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) { const x = Math.floor(tp.x + dx), y = Math.floor(tp.y + dy); if (!K.inGrid(x, y)) continue; const i = y * Wd.w + x; if (Wd.mat[i] === Wd.SOLID && Wd.mtl[i] === Wd.M.INKPEN) Wd.kill(i, x, y, x, y, 0.3, 20); } A('erase'); });
  def('blower', 'Suction: pulls rubble and pieces toward you', 0, (o) => { const P = PL(); const Wd = W(); for (const c of Wd.chunks) { const dx = P.x + 3 - c.x, dy = P.y - c.y, d = Math.hypot(dx, dy) || 1; if (d < 90) { c.vx += (dx / d) * 250; c.vy += (dy / d) * 250; c.rest = 0; } } for (let k = 0; k < 200; k++) { const x = Math.floor(o.x + o.ax * rand(4, 70) + rand(-10, 10)), y = Math.floor(o.y + o.ay * rand(4, 70) + rand(-10, 10)); if (!K.inGrid(x, y)) continue; const i = y * Wd.w + x; if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) { const c = Wd.col[i]; Wd.kill(i, x, y, x, y, 0, 0); FX().suck(x, y, 0, 0, c, o.x, o.y, 0.6); } } A('slurp'); });
  def('airstrike', 'Carpet run across the whole screen', 6, () => {
    const Wd = W(); const dir = PL().face; G()?.announce?.('CARPET BOMBING', 4); A('siren');
    for (let k = 0; k < 24; k++) K.later(0.6 + k * 0.08, () => { const x = dir > 0 ? 10 + k * (Wd.w - 20) / 23 : Wd.w - 10 - k * (Wd.w - 20) / 23; let y = 0; while (y < Wd.gh - 1 && !Wd.solid(Math.floor(x), y)) y++; WP.explode(x, y, 10, { letters: 8, cause: 'airstrike' }); });
  });
  def('orbital', 'Sweep: the orbital column slides sideways', 5, (o) => { const tp = WP.aimPoint(o); const dir = PL().face; st.orb.push({ x: tp.x, t: -0.4, life: 2.6, sweep: dir * 70 }); A('beam'); G()?.event?.('SWEEP!', tp.x, tp.y - 20, 2); });
  WP.EXT.updates.push((dt) => { for (const O of st.orb || []) if (O.sweep) O.x = Math.max(2, Math.min(W().w - 2, O.x + O.sweep * dt)); });
  def('meteor', 'One huge meteor', 4, (o) => { const tp = WP.aimPoint(o); WP.addShot({ t: 'bigmeteor', x: tp.x - 40, y: -30, vx: 60, vy: 200, life: 8 }); G()?.event?.('INCOMING!', tp.x, 20, 2); A('meteorFall'); });
  def('bees', 'Hive: keeps releasing bees for a while', 4, (o) => { const tp = WP.aimPoint(o); K.ent({ life: 8, sp: 0, update(dt) { this.sp -= dt; if (this.sp <= 0) { this.sp = 0.5; WP.addShot({ t: 'bee', x: tp.x, y: tp.y, vx: rand(-80, 80), vy: rand(-80, 0), life: 8, spr: 'bee', tx: null, eat: 0, dmg: 6 }); WTP.audio.loop('bees', true); } }, draw(ctx) { ctx.fillStyle = PAL.a; ctx.beginPath(); ctx.ellipse(tp.x, tp.y, 3, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAL.w; ctx.fillRect(tp.x - 3, tp.y - 1, 6, 0.8); ctx.fillRect(tp.x - 3, tp.y + 1.2, 6, 0.8); } }); });
  def('tornado', 'Fire tornado', 4, (o) => { const tp = WP.aimPoint(o); st.tornados.push({ x: tp.x, y: tp.y, dir: o.ax >= 0 ? 1 : -1, t: 0, life: 5.5, fire: true }); G()?.event?.('FIRE TORNADO!', tp.x, tp.y - 30); });
  WP.EXT.updates.push(() => { for (const t of st.tornados || []) if (t.fire && Math.random() < 0.5) { W().igniteAt(Math.floor(t.x + rand(-6, 6)), Math.floor(t.y + rand(-20, 4)), 3); FX().flame(t.x + rand(-6, 6), t.y + rand(-30, 0)); } });
  def('lightning', 'Storm cloud that follows you and strikes on its own', 6, () => { K.ent({ life: 8, sp: 0.5, update(dt) { this.sp -= dt; if (this.sp <= 0) { this.sp = 0.9; const P = PL(); const e = EN()?.nearest?.(P.x, P.y, 120); K.strike(e ? e.x : P.x + rand(-60, 60)); } }, draw(ctx) { const P = PL(); const x = P.x + 3, y = 6; ctx.fillStyle = '#5c5270'; for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(x - 8 + k * 4, y + Math.sin(this.t * 3 + k) * 0.6, 3.5, 0, Math.PI * 2); ctx.fill(); } } }); A('thunder'); });
  def('quake', 'Aftershock that knocks bolts loose and tilts windows', 6, () => {
    WP.FIRE.quake();
    for (const w of ST().wins) { if (!w || w.state !== 'static' || w.reg.type === 'bar') continue; const alive = w.bolts.filter((b) => b.alive); if (alive.length > 1) { const b = pick(alive); for (const i of b.cells) { const Wd = W(); if (Wd.mat[i] === Wd.SOLID) Wd.kill(i, i % Wd.w, (i / Wd.w) | 0, b.x, b.y, 1, 100); } ST().dirty(w.id); } }
    G()?.announce?.('AFTERSHOCK', 4);
  });

  for (const id of Object.keys(ALT)) {
    if (!WP.BY[id]) continue;
    if (WP.ALT[id] && ['sticky', 'mine', 'portal', 'cutter', 'vacuum'].includes(id)) continue;
    WP.ALT[id] = ALT[id];
    WP.BY[id].altDoes = DOES[id];
  }
  const OLD = { sticky: 'Detonate every sticky bomb', mine: 'Detonate every mine', portal: 'Clear both portals', cutter: 'Drop the cut piece where it is', vacuum: 'Blow everything in the tank back out' };
  for (const id in OLD) if (WP.BY[id]) WP.BY[id].altDoes = OLD[id];
  WTP.deskAlts = { ALT, DOES };
})();
