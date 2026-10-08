(() => {
  const WTP = window.WTP;
  const { rand, P32 } = WTP;
  const P = {
    x: 0, y: 0, vx: 0, vy: 0, w: 6, h: 14, ground: false, wall: 0, face: 1, jumps: 1, airDash: 1, coyote: 0, buffer: 0,
    dashT: 0, dashCd: 0, dashDir: 1, wallLock: 0, land: 0, landV: 0, hurtT: 0, iframes: 0, hp: 6, maxHp: 6, dead: false, anim: 'idle', animT: 0,
    ghosts: [], recoil: 0, swing: 0, swingDir: 1, victory: false, peakY: 0, rocketJumpStart: null, stepT: 0, frames: null, skin: 'hero', lastGround: 0, blink: 0,
    kickT: 0, kickDir: 0, idleT: 0, skidT: 0, stuckT: 0, gravMul: 1, maxFall: 330, ctrl: 1, pose: null, squash: 0, stretch: 0, airT: 0, extraJumps: 0
  };
  WTP.player = P;
  const W = () => WTP.world;
  const I = () => WTP.input;
  const GD = () => WTP.gadgets;
  const hardM = (m) => m === 1 || m === 3 || m === 5;
  const softM = (m) => m === 4 || m === 6;
  function cellM(xx, yy) {
    const Wd = W();
    if (xx < 0 || xx >= Wd.w) return 3;
    if (yy < 0) return 0;
    if (yy >= Wd.h) return 3;
    return Wd.mat[yy * Wd.w + xx];
  }
  const collide = (x, y, w, h) => {
    const x0 = Math.floor(x), x1 = Math.floor(x + w - 0.001), y0 = Math.floor(y), y1 = Math.floor(y + h - 0.001);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) if (hardM(cellM(xx, yy))) return true;
    return false;
  };
  const collideAny = (x, y, w, h) => {
    const x0 = Math.floor(x), x1 = Math.floor(x + w - 0.001), y0 = Math.floor(y), y1 = Math.floor(y + h - 0.001);
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const m = cellM(xx, yy); if (hardM(m) || softM(m)) return true; }
    return false;
  };
  const softRow = (x, w, yy) => {
    const x0 = Math.floor(x), x1 = Math.floor(x + w - 0.001);
    for (let xx = x0; xx <= x1; xx++) { const m = cellM(xx, yy); if (softM(m) || hardM(m)) return true; }
    return false;
  };
  P.collide = collide;
  P.collideAny = collideAny;
  P.inside = (x, y) => x >= Math.floor(P.x) && x <= Math.floor(P.x + P.w - 0.001) && y >= Math.floor(P.y) && y <= Math.floor(P.y + P.h - 0.001);
  P.center = () => ({ x: P.x + P.w / 2, y: P.y + P.h / 2 });
  P.spawn = (x, y) => {
    Object.assign(P, { x, y, vx: 0, vy: 0, ground: false, wall: 0, jumps: 1, airDash: 1, coyote: 0, buffer: 0, dashT: 0, dashCd: 0, land: 0, hurtT: 0, iframes: 0, hp: P.maxHp, dead: false, victory: false, ghosts: [], recoil: 0, swing: 0, kickT: 0, idleT: 0, stuckT: 0, gravMul: 1, maxFall: 330, ctrl: 1, pose: null, squash: 0, stretch: 0, airT: 0 });
    P.setSkin(WTP.save.skin);
    GD()?.reset?.();
  };
  P.setSkin = (id) => { P.skin = id; P.frames = WTP.sprites.playerFrames(id); };
  P.impulse = (ix, iy) => { P.vx += ix; P.vy += iy; if (iy < -40) { P.ground = false; P.rocketJumpStart = P.rocketJumpStart ?? P.y; } };
  P.hurt = (dmg, fromX, o = {}) => {
    if (P.iframes > 0 || P.dead || P.dashT > 0 || P.victory) return false;
    const hp = WTP.game?.run?.hud?.hp;
    if (hp) P.hp -= dmg;
    P.hurtT = 0.35; P.iframes = hp ? 1.1 : 0.6;
    P.vx = (P.x + P.w / 2 < fromX ? -1 : 1) * (o.knock || 120); P.vy = -150; P.ground = false;
    WTP.audio.play('hurt');
    WTP.game?.shake?.(8); WTP.game?.hitstop?.(0.06);
    WTP.fx.flash(0.35, '#e8484f');
    WTP.vibe(80);
    GD()?.interrupt?.();
    if (P.hp <= 0) { P.dead = true; WTP.audio.play('die'); WTP.game?.playerDied?.(); }
    return true;
  };

  function kickSoft(x0, y0, x1, y1, dirx, diry) {
    const Wd = W();
    let n = 0;
    for (let yy = Math.max(0, y0); yy <= Math.min(Wd.h - 4, y1); yy++) for (let xx = Math.max(0, x0); xx <= Math.min(Wd.w - 1, x1); xx++) {
      const i = yy * Wd.w + xx;
      if (!softM(Wd.mat[i])) continue;
      const c = Wd.col[i];
      Wd.kill(i, xx, yy, xx, yy, 0, 0);
      if (Math.random() < 0.8) WTP.fx.debris(xx + 0.5, yy + 0.5, dirx * rand(40, 110) + rand(-30, 30), diry * rand(30, 90) - rand(40, 110), c, { ns: true });
      n++;
    }
    if (n > 2) WTP.audio.play('plow');
    return n;
  }
  P.kickSoft = kickSoft;
  function unstick() {
    if (!collide(P.x, P.y, P.w, P.h)) { P.stuckT = 0; return; }
    let best = null, bd = 1e9;
    for (let dy = -18; dy <= 8; dy++) for (let dx = -10; dx <= 10; dx++) {
      const d = dx * dx * 1.2 + dy * dy * (dy > 0 ? 3 : 1);
      if (d >= bd) continue;
      if (!collide(P.x + dx, P.y + dy, P.w, P.h)) { bd = d; best = [dx, dy]; }
    }
    if (best) { P.x += best[0]; P.y += best[1]; if (best[1] < 0) P.vy = Math.min(P.vy, 0); return; }
    const c = P.center();
    W().carve(c.x, c.y, 9, { debris: 0.6, force: 120, cause: 'unstick', pow: 99, back: 0 });
    WTP.audio.play('kick');
    WTP.game?.label?.('BUSTED OUT!', 700);
  }
  P.unstick = unstick;

  P.update = (dt, ctl) => {
    const In = I();
    const gd = GD();
    const mx = ctl ? 0 : In.moveX();
    const down = !ctl && In.downHeld();
    if (!ctl) {
      if (In.take('jump')) P.buffer = 0.13;
      if (In.take('dash')) tryDash(mx);
    }
    const held = !ctl && In.jumpHeld();
    P.buffer = Math.max(0, P.buffer - dt);
    P.dashCd = Math.max(0, P.dashCd - dt);
    P.iframes = Math.max(0, P.iframes - dt);
    P.hurtT = Math.max(0, P.hurtT - dt);
    P.wallLock = Math.max(0, P.wallLock - dt);
    P.kickT = Math.max(0, P.kickT - dt);
    P.skidT = Math.max(0, P.skidT - dt);
    P.squash *= Math.pow(0.0004, dt); P.stretch *= Math.pow(0.0004, dt);
    P.recoil *= Math.pow(0.0005, dt);
    P.swing = Math.max(0, P.swing - dt);
    P.gravMul = 1; P.maxFall = 330; P.ctrl = 1; P.pose = null; P.noGrav = false;
    if (P.dead) { P.vy += 600 * dt; P.vx *= 0.95; move(dt); return; }

    if (P.dashT > 0) {
      P.dashT -= dt;
      P.vx = P.dashDir * 300; P.vy = 0;
      if (Math.random() < 0.9) P.ghosts.push({ x: P.x, y: P.y, face: P.face, t: 0.22, anim: 'dash' });
      if (P.dashT <= 0) { P.vx = P.dashDir * 110; }
      move(dt);
      return;
    }
    const gctl = gd ? gd.update(dt, P, { mx, down, held, ctl }) : null;
    if (gctl && gctl.skip) { move(dt); afterMove(dt, P.ground, P.vy); return; }
    const RUN = 84;
    const accel = (P.ground ? 1100 : 640) * P.ctrl;
    const target = mx * RUN;
    if (P.wallLock <= 0) {
      if (P.ground && mx && Math.sign(mx) !== Math.sign(P.vx) && Math.abs(P.vx) > 60) { P.skidT = 0.12; if (Math.random() < 0.5) WTP.fx.dust(P.x + P.w / 2, P.y + P.h - 1); }
      if (Math.abs(P.vx) > RUN * 1.05 && Math.sign(P.vx) === Math.sign(target || P.vx)) P.vx += (target - P.vx) * Math.min(1, dt * (P.ground ? 9 : 1.2));
      else if (P.vx < target) P.vx = Math.min(target, P.vx + accel * dt);
      else if (P.vx > target) P.vx = Math.max(target, P.vx - accel * dt * (P.ground && !mx ? 1.4 : 1));
    }
    if (mx) P.face = mx > 0 ? 1 : -1;

    if (!P.noGrav) P.vy += (down ? 1150 : 680) * dt * P.gravMul;
    if (!held && P.vy < -70 && !P.boosted && !P.noGrav) P.vy += 900 * dt;
    const sliding = !P.ground && P.wall !== 0 && mx === P.wall && P.vy > 0;
    if (sliding) {
      P.vy = Math.min(P.vy, 48);
      if (Math.random() < 0.35) WTP.fx.dust(P.x + (P.wall > 0 ? P.w : 0), P.y + P.h - 3);
      if (Math.random() < 0.12) WTP.audio.play('slide');
    }
    P.sliding = sliding;
    if (P.vy > P.maxFall) P.vy = P.maxFall;
    P.coyote = P.ground ? 0.1 : Math.max(0, P.coyote - dt);
    if (P.buffer > 0 && !(gctl && gctl.noJump)) {
      if (P.ground || P.coyote > 0) { P.vy = -222; P.ground = false; P.coyote = 0; P.buffer = 0; P.stretch = 1; WTP.audio.play('jump'); puff(5); WTP.game?.stat?.('jumps', 1); }
      else if (P.wall !== 0 || wallNear()) {
        const wd = P.wall || wallNear();
        P.vy = -212; P.vx = -wd * 150; P.face = -wd; P.wall = 0; P.buffer = 0; P.wallLock = 0.12; P.jumps = 1 + P.extraJumps; P.airDash = 1; P.stretch = 1;
        WTP.audio.play('walljump'); puff(4); WTP.game?.stat?.('walljumps', 1);
      } else if (P.jumps > 0) { P.jumps--; P.vy = -198; P.buffer = 0; P.stretch = 1; WTP.audio.play('djump'); ring(); WTP.game?.stat?.('jumps', 1); gd?.airJump?.(P); }
    }
    P.boosted = P.vy < -280;
    const wasGround = P.ground;
    const vyBefore = P.vy;
    move(dt);
    afterMove(dt, wasGround, vyBefore);
  };
  function afterMove(dt, wasGround, vyBefore) {
    if (P.ground && !wasGround) {
      if (vyBefore > 140) { P.land = 0.16; P.squash = Math.min(1, vyBefore / 330); puff(Math.round(3 + vyBefore / 60)); WTP.audio.play('land', vyBefore); if (vyBefore > 320) WTP.game?.shake?.(2); }
      if (P.rocketJumpStart != null) { const hgt = P.rocketJumpStart - P.peakY; if (hgt > 25) WTP.game?.rocketJump?.(hgt); P.rocketJumpStart = null; }
      GD()?.landed?.(P, vyBefore);
    }
    if (!P.ground) { P.peakY = Math.min(P.peakY, P.y); P.airT += dt; } else { P.peakY = P.y; P.airT = 0; }
    if (P.ground) { P.jumps = 1 + P.extraJumps; P.airDash = 1; P.lastGround = performance.now(); }
    if (P.wall !== 0) P.airDash = 1;
    P.land = Math.max(0, P.land - dt);
    if (P.ground && Math.abs(P.vx) > 20) {
      P.stepT += dt * Math.abs(P.vx) / 84;
      if (P.stepT > 0.28) { P.stepT = 0; WTP.audio.play('step'); if (Math.random() < 0.4) WTP.fx.dust(P.x + P.w / 2, P.y + P.h - 1); }
      WTP.game?.stat?.('distance', Math.abs(P.vx) * dt);
    }
    if (P.ground && Math.abs(P.vx) < 5 && !P.kickT) P.idleT += dt; else P.idleT = 0;
    const boxed = collide(P.x - 1, P.y, P.w, P.h) && collide(P.x + 1, P.y, P.w, P.h) && collide(P.x, P.y - 1, P.w, P.h) && !P.ground;
    if (boxed) { P.stuckT += dt; if (P.stuckT > 0.5) { P.stuckT = 0; const c = P.center(); W().carve(c.x, c.y - 1, 8.5, { debris: 0.6, force: 100, cause: 'unstick', pow: 99 }); WTP.audio.play('kick'); } }
    else P.stuckT = 0;
  }
  function wallNear() {
    if (collide(P.x - 1.2, P.y + 2, P.w, P.h - 5)) return -1;
    if (collide(P.x + 1.2, P.y + 2, P.w, P.h - 5)) return 1;
    return 0;
  }
  P.wallNear = wallNear;
  function tryDash(mx) {
    if (P.dashCd > 0 || P.dead) return;
    if (!P.ground && P.airDash <= 0) return;
    if (!P.ground) P.airDash--;
    GD()?.interrupt?.();
    P.dashDir = mx ? Math.sign(mx) : P.face;
    P.face = P.dashDir;
    P.dashT = 0.14; P.dashCd = 0.42; P.iframes = Math.max(P.iframes, 0.2);
    WTP.audio.play('dash');
    puff(4);
    WTP.game?.stat?.('dashes', 1);
  }
  function move(dt) {
    P.wall = 0;
    const dx = P.vx * dt;
    const sx = Math.max(1, Math.ceil(Math.abs(dx) / 0.5));
    for (let s = 0; s < sx; s++) {
      const nx = P.x + dx / sx;
      if (!collide(nx, P.y, P.w, P.h)) {
        if (collideAny(nx, P.y, P.w, P.h)) {
          let climbed = false;
          if (P.ground || P.vy >= 0) for (let up = 1; up <= 5; up++) if (!collideAny(nx, P.y - up, P.w, P.h) && !collide(nx, P.y - up, P.w, P.h)) { P.x = nx; P.y -= up; climbed = true; break; }
          if (!climbed) {
            const dir = Math.sign(dx);
            kickSoft(Math.floor(nx), Math.floor(P.y), Math.floor(nx + P.w - 0.001), Math.floor(P.y + P.h - 0.001) - (P.ground ? 1 : 0), dir, 0);
            P.x = nx;
            P.vx *= 0.97;
          }
        } else P.x = nx;
        continue;
      }
      let stepped = false;
      if (P.ground || P.vy >= 0 || P.dashT > 0) for (let up = 1; up <= 5; up++) if (!collide(nx, P.y - up, P.w, P.h)) { P.x = nx; P.y -= up; stepped = true; break; }
      if (!stepped) { P.wall = Math.sign(dx); if (P.dashT > 0) P.dashT = 0; P.vx = 0; break; }
    }
    const dy = P.vy * dt;
    const sy = Math.max(1, Math.ceil(Math.abs(dy) / 0.5));
    P.ground = false;
    for (let s = 0; s < sy; s++) {
      const ny = P.y + dy / sy;
      if (dy > 0) {
        const oldRow = Math.floor(P.y + P.h - 0.001), newRow = Math.floor(ny + P.h - 0.001);
        const softHit = newRow > oldRow && softRow(P.x, P.w, newRow);
        if (!collide(P.x, ny, P.w, P.h) && !softHit) { P.y = ny; continue; }
        P.ground = true; P.vy = 0;
        break;
      }
      if (!collide(P.x, ny, P.w, P.h)) {
        if (collideAny(P.x, ny, P.w, P.h)) kickSoft(Math.floor(P.x), Math.floor(ny), Math.floor(P.x + P.w - 0.001), Math.floor(ny) + 1, 0, -1);
        P.y = ny; continue;
      }
      let nudged = false;
      for (const k of [1, -1, 2, -2, 3, -3]) if (!collide(P.x + k, ny, P.w, P.h)) { P.x += k; P.y = ny; nudged = true; break; }
      if (nudged) continue;
      P.vy = 0;
      break;
    }
    if (!P.ground && P.vy >= 0 && (collide(P.x, P.y + 0.3, P.w, P.h) || softRow(P.x, P.w, Math.floor(P.y + P.h + 0.3 - 0.001)))) P.ground = true;
    if (P.wall === 0 && !P.ground) {
      if (collide(P.x - 0.5, P.y + 1, P.w, P.h - 4)) P.wall = -1;
      else if (collide(P.x + 0.5, P.y + 1, P.w, P.h - 4)) P.wall = 1;
    }
    unstick();
    if (collideAny(P.x, P.y, P.w, P.h - 1)) kickSoft(Math.floor(P.x), Math.floor(P.y), Math.floor(P.x + P.w - 0.001), Math.floor(P.y + P.h - 1.001), Math.sign(P.vx) || P.face, -1);
    if (P.x < 0) P.x = 0;
    if (P.x > W().w - P.w) P.x = W().w - P.w;
  }
  P.move = move;
  function puff(n) { for (let k = 0; k < n; k++) WTP.fx.smoke(P.x + P.w / 2 + rand(-3, 3), P.y + P.h - 1, 1, P32['6']); }
  function ring() { for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; WTP.fx.spark(P.x + P.w / 2, P.y + P.h, Math.cos(a) * 60, Math.sin(a) * 25, P32['7'], 0.18); } }
  P.puff = puff;

  P.pickAnim = () => {
    if (P.victory) return 'victory';
    if (P.hurtT > 0 || P.dead) return 'hurt';
    if (P.dashT > 0) return 'dash';
    if (P.kickT > 0) return P.kickDir > 0.5 ? 'stomp' : P.kickDir < -0.5 ? 'uppercut' : 'kick';
    if (P.pose) return P.pose;
    if (P.land > 0) return 'land';
    if (!P.ground && P.sliding) return 'wall';
    if (!P.ground) return P.vy < -40 ? 'jump' : P.vy < 40 ? 'apex' : 'fall';
    if (P.skidT > 0) return 'skid';
    if (Math.abs(P.vx) > 12) return 'run';
    if (P.idleT > 5) return ((P.idleT / 3) | 0) % 2 ? 'idle2' : 'idle3';
    return 'idle';
  };
  P.frame = (t) => {
    const a = P.pickAnim();
    if (a !== P.anim) { P.anim = a; P.animT = 0; }
    P.animT += t;
    const fr = P.frames.anims[a] || P.frames.anims.idle;
    const speed = a === 'run' ? 0.075 * 84 / Math.max(30, Math.abs(P.vx)) : a === 'idle' ? 0.38 : a === 'idle2' || a === 'idle3' ? 0.22 : a === 'victory' ? 0.16 : a === 'kick' || a === 'stomp' || a === 'uppercut' ? 0.07 : a === 'jet' || a === 'glide' ? 0.1 : 0.12;
    let idx = Math.floor(P.animT / speed) % fr.length;
    if (a === 'land' || a === 'kick' || a === 'stomp' || a === 'uppercut') idx = Math.min(fr.length - 1, Math.floor(P.animT / (a === 'land' ? 0.07 : 0.06)));
    return fr[idx];
  };
  P.drawPos = (f) => {
    const cx = Math.round(P.x + P.w / 2), fy = Math.round(P.y + P.h);
    const ax = P.face > 0 ? 10 : f.w - 10;
    return [cx - ax, fy - 22];
  };
  P.shoulder = (f) => {
    const [dx, dy] = P.drawPos(f);
    const sx = P.face > 0 ? f.shoulder[0] : f.w - 1 - f.shoulder[0];
    return { x: dx + sx + 0.5, y: dy + f.shoulder[1] + 1.5 };
  };
  P.gun = () => P.gunPos || { x: P.x + P.w / 2, y: P.y + 5 };

  function drawSquashed(ctx, img, dx, dy, w, h) {
    const sq = P.squash > 0.15 ? P.squash : 0, st = P.stretch > 0.2 && !P.ground ? P.stretch : 0;
    if (!sq && !st) { ctx.drawImage(img, dx, dy); return; }
    const kx = 1 + sq * 0.22 - st * 0.12, ky = 1 - sq * 0.2 + st * 0.14;
    const nw = Math.round(w * kx), nh = Math.round(h * ky);
    const cx = dx + w / 2, by = dy + h;
    ctx.drawImage(img, Math.round(cx - nw / 2), by - nh, nw, nh);
  }
  P.draw = (ctx, dt, weaponSprite, aim, opts = {}) => {
    for (let k = P.ghosts.length - 1; k >= 0; k--) {
      const g = P.ghosts[k];
      g.t -= dt;
      if (g.t <= 0) { P.ghosts.splice(k, 1); continue; }
      const fr = P.frames.anims.dash[0];
      if (WTP.sprites.dith(Math.round(g.x), Math.round(g.y), g.t * 4)) {
        const cx = Math.round(g.x + P.w / 2), fy = Math.round(g.y + P.h);
        const ax = g.face > 0 ? 10 : fr.w - 10;
        ctx.globalAlpha = Math.min(1, g.t * 4) * 0.6;
        ctx.drawImage(g.face > 0 ? fr.white : fr.whiteL, cx - ax, fy - 22);
        ctx.globalAlpha = 1;
      }
    }
    const f = P.frame(dt);
    const [dx, dy] = P.drawPos(f);
    const blink = P.iframes > 0 && !P.victory && (Math.floor(performance.now() / 70) & 1);
    const sh = P.shoulder(f);
    const ang = Math.atan2(aim.y, aim.x);
    const flip = aim.x < 0;
    GD()?.draw?.(ctx, P, 'back', f, dx, dy);
    const drawArm = () => {
      if (!weaponSprite || P.victory || P.dead) { P.gunPos = { x: sh.x + aim.x * 4, y: sh.y + aim.y * 4 }; P.muzzle = { x: sh.x + aim.x * 6, y: sh.y + aim.y * 6 }; return; }
      let a = ang;
      if (opts.swing) a += opts.swing;
      const ca = Math.cos(a), sa = Math.sin(a);
      const rk = P.recoil;
      const reach = 4 - rk;
      const hx = sh.x + ca * reach, hy = sh.y + sa * reach;
      const arm = P.frames.arm.rotated(a, flip);
      ctx.drawImage(arm.cv, Math.round(sh.x - arm.ox), Math.round(sh.y - arm.oy));
      const r = weaponSprite.rotated(a, flip);
      ctx.drawImage(r.cv, Math.round(hx - r.ox), Math.round(hy - r.oy));
      const [mx, my] = weaponSprite.muzzle(a, flip);
      P.gunPos = { x: hx, y: hy };
      P.muzzle = { x: hx + mx, y: hy + my };
    };
    const behind = aim.y < -0.85;
    if (behind) drawArm();
    if (blink) { ctx.drawImage(P.face > 0 ? f.white : f.whiteL, dx, dy); if (!behind) drawArm(); GD()?.draw?.(ctx, P, 'front', f, dx, dy); return; }
    drawSquashed(ctx, P.face > 0 ? f.bodyR : f.bodyL, dx, dy, f.w, f.h);
    if (!behind) drawArm();
    drawSquashed(ctx, P.face > 0 ? f.headR : f.headL, dx, dy, f.w, f.h);
    GD()?.draw?.(ctx, P, 'front', f, dx, dy);
  };
})();
