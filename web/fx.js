(() => {
  const WTP = window.WTP;
  const { P32, rand, shade, mix, hash } = WTP;
  const Wd = () => WTP.world;
  const CAP = 9000;
  const px = new Float32Array(CAP), py = new Float32Array(CAP), vx = new Float32Array(CAP), vy = new Float32Array(CAP);
  const life = new Float32Array(CAP), maxl = new Float32Array(CAP), aux = new Float32Array(CAP), aux2 = new Float32Array(CAP);
  const pc = new Uint32Array(CAP), pk = new Uint8Array(CAP), pf = new Uint8Array(CAP);
  const K = { DEBRIS: 0, SHARD: 1, SPARK: 2, SMOKE: 3, FLAME: 4, DUST: 5, SHELL: 6, ACID: 7, LAVA: 8, PAINT: 9, SUCK: 10, CONFETTI: 11, WATER: 12, EMBER: 13, MAG: 14, STAR: 15, PIX: 16, TRAIL: 17, SPLINTER: 18, PAPER: 19, ASH: 20, RING: 21 };
  const FX = { K, np: 0, cap: 6000, anims: [], beams: [], pops: [], rings: [], flashA: 0, flashC: '#fff', decals: [] };
  WTP.fx = FX;
  const PRIORITY_LOW = new Set([K.DUST, K.SMOKE, K.EMBER, K.TRAIL, K.SPARK, K.ASH, K.PAPER]);

  function add(k, x, y, ivx, ivy, c, l, a = 0, b = 0, f = 0) {
    let i = FX.np;
    if (i >= FX.cap) {
      if (PRIORITY_LOW.has(k)) return -1;
      i = (Math.random() * FX.np) | 0;
      if (pk[i] === K.ACID || pk[i] === K.LAVA) return -1;
    } else FX.np++;
    px[i] = x; py[i] = y; vx[i] = ivx; vy[i] = ivy; pc[i] = c; life[i] = l; maxl[i] = l; pk[i] = k; aux[i] = a; aux2[i] = b; pf[i] = f;
    return i;
  }
  function remove(i) {
    const j = --FX.np;
    if (i !== j) { px[i] = px[j]; py[i] = py[j]; vx[i] = vx[j]; vy[i] = vy[j]; life[i] = life[j]; maxl[i] = maxl[j]; pc[i] = pc[j]; pk[i] = pk[j]; aux[i] = aux[j]; aux2[i] = aux2[j]; pf[i] = pf[j]; }
  }
  const q = () => Wd().quality;
  FX.debris = (x, y, ivx, ivy, c, o) => add(K.DEBRIS, x, y, ivx, ivy, c, rand(1.2, 2.6), 0, 0, o && o.ns ? 1 : 0);
  FX.shard = (x, y, ivx, ivy, c) => add(K.SHARD, x, y, ivx, ivy, c, rand(0.7, 1.6));
  FX.spark = (x, y, ivx, ivy, c = P32.y, l = rand(0.12, 0.35)) => add(K.SPARK, x, y, ivx, ivy, c, l);
  FX.smoke = (x, y, n = 1, c) => { for (let k = 0; k < n; k++) add(K.SMOKE, x + rand(-2, 2), y + rand(-2, 2), rand(-10, 10), rand(-22, -6), c || (Math.random() < 0.5 ? P32['4'] : P32['3']), rand(0.8, 2), rand(1, 2.5)); };
  FX.flame = (x, y) => add(K.FLAME, x + rand(-0.5, 0.5), y, rand(-6, 6), rand(-34, -16), P32.y, rand(0.3, 0.7));
  FX.dust = (x, y) => { if (q() > 0) add(K.DUST, x + rand(-3, 3), y + rand(-3, 1), rand(-12, 12), rand(-18, -4), Math.random() < 0.5 ? P32['5'] : P32['6'], rand(3, 9), rand(0, 6.28)); };
  FX.shell = (x, y, dir, c = P32.a) => add(K.SHELL, x, y, -dir * rand(30, 70), rand(-90, -50), c, rand(1.6, 2.6), rand(0, 6.28));
  FX.acid = (x, y, ivx, ivy) => add(K.ACID, x, y, ivx, ivy, Math.random() < 0.5 ? P32.l : P32.L, rand(2.5, 4), 0, 3 + ((Math.random() * 4) | 0));
  FX.lava = (x, y, ivx, ivy) => add(K.LAVA, x, y, ivx, ivy, Math.random() < 0.5 ? P32.o : P32.a, rand(3, 5), 0, 4 + ((Math.random() * 5) | 0));
  FX.paint = (x, y, ivx, ivy, c) => add(K.PAINT, x, y, ivx, ivy, c, rand(1.2, 2.2));
  FX.suck = (x, y, ivx, ivy, c, hx, hy, l = 2) => add(K.SUCK, x, y, ivx, ivy, c, l, hx, hy);
  FX.confetti = (x, y, ivx, ivy) => add(K.CONFETTI, x, y, ivx, ivy, P32[WTP.pick(['e', 'y', 'l', 'c', 'k', 'P', 'o', 'C'])], rand(2.5, 4.5), rand(0, 6.28));
  FX.water = (x, y, ivx, ivy) => add(K.WATER, x, y, ivx, ivy, Math.random() < 0.6 ? P32.c : P32.C, rand(0.6, 1.2));
  FX.ember = (x, y) => add(K.EMBER, x, y, rand(-20, 20), rand(-60, -10), Math.random() < 0.5 ? P32.a : P32.o, rand(0.5, 1.4));
  FX.mag = (x, y, c) => add(K.MAG, x, y, rand(-20, 20), rand(-20, 20), c, 1.6);
  FX.star = (x, y, ivx, ivy, c) => add(K.STAR, x, y, ivx, ivy, c, rand(0.6, 1.1));
  FX.pix = (x, y, ivx, ivy, c, l = 0.6) => add(K.PIX, x, y, ivx, ivy, c, l);
  FX.trail = (x, y, c, l = 0.25) => add(K.TRAIL, x, y, 0, 0, c, l);
  FX.splinter = (x, y, ivx, ivy, c) => add(K.SPLINTER, x, y, ivx, ivy, (Math.random() < 0.3 ? shade(c, 1.2, 10) : c), rand(1.2, 2.4), rand(0, 6.28), rand(-14, 14));
  FX.paper = (x, y, ivx, ivy, c) => add(K.PAPER, x, y, ivx, ivy, c, rand(2.2, 3.6), rand(0, 6.28));
  FX.ash = (x, y) => add(K.ASH, x, y, rand(-6, 6), rand(-18, -6), Math.random() < 0.5 ? P32['3'] : P32['2'], rand(1, 2.4), rand(0, 6.28));
  FX.clear = () => { FX.np = 0; FX.anims = []; FX.beams = []; FX.pops = []; FX.rings = []; FX.flashA = 0; };
  FX.count = () => FX.np;

  FX.anim = (type, size, x, y, dur = 0.5, o = {}) => {
    const E = WTP.sprites.explosions();
    const set = E[type];
    if (!set) return;
    let best = set[0];
    for (const s of set) if (Math.abs(s.size - size) < Math.abs(best.size - size)) best = s;
    FX.anims.push({ frames: best.frames, size: best.size, x, y, t: -(o.delay || 0), dur, flip: Math.random() < 0.5, layer: o.layer || 1 });
    if (FX.anims.length > 60) FX.anims.shift();
  };
  FX.flashSprite = (kind, x, y, ang) => { FX.anims.push({ flash: kind, x, y, t: 0, dur: 0.07, ang }); };
  FX.beam = (pts, o) => { FX.beams.push({ pts, t: 0, life: o.life ?? 0.05, ...o }); };
  FX.pop = (x, y, text, o = {}) => { FX.pops.push({ x, y, text, t: 0, life: o.life || 1.1, scale: o.scale || 1, ramp: o.ramp, vy: o.vy ?? -26 }); if (FX.pops.length > 18) FX.pops.shift(); };
  FX.flash = (a, c = '#fff') => { if (!WTP.save.settings.flashes) a *= 0.25; FX.flashA = Math.max(FX.flashA, a); FX.flashC = c; };

  FX.explosion = (x, y, r, kind = 'fire') => {
    const size = r * 2.6;
    FX.anim(kind, size, x, y, 0.42 + r * 0.008);
    if (r > 14) FX.anim('ring', r * 3.2, x, y, 0.3);
    const n = Math.min(40, r * 1.5) * (q() + 1) / 3;
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, s = rand(60, 200); FX.spark(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, Math.random() < 0.5 ? P32.y : P32.a, rand(0.15, 0.5)); }
    for (let k = 0; k < Math.min(18, r * 0.8) * (q() + 1) / 3; k++) FX.smoke(x + rand(-r / 2, r / 2), y + rand(-r / 2, r / 2), 1);
    for (let k = 0; k < Math.min(12, r * 0.5); k++) FX.dust(x + rand(-r, r), y + rand(-r, r));
    if (kind === 'fire') for (let k = 0; k < Math.min(10, r * 0.4); k++) FX.ember(x + rand(-r / 2, r / 2), y + rand(-r / 2, r / 2));
  };

  function update(dt) {
    const W = Wd();
    const solid = W.solid;
    let n = FX.np;
    for (let i = n - 1; i >= 0; i--) {
      life[i] -= dt;
      if (life[i] <= 0) { remove(i); continue; }
      const k = pk[i];
      if (k === K.DEBRIS || k === K.SHARD || k === K.SHELL || k === K.CONFETTI || k === K.STAR || k === K.PIX || k === K.SPLINTER || k === K.PAPER) {
        if (k === K.SPLINTER) aux[i] += aux2[i] * dt;
        if (k === K.PAPER) { aux[i] += dt * 5; vy[i] = Math.min(vy[i] + 120 * dt, 26); vx[i] = vx[i] * 0.96 + Math.sin(aux[i]) * 50 * dt; }
        else if (k === K.CONFETTI) { aux[i] += dt * 8; vy[i] = Math.min(vy[i] + 160 * dt, 38); vx[i] = vx[i] * 0.97 + Math.sin(aux[i]) * 40 * dt; }
        else { vy[i] = Math.min(vy[i] + 430 * dt, 320); }
        const nx = px[i] + vx[i] * dt, ny = py[i] + vy[i] * dt;
        if (solid(Math.floor(nx), Math.floor(py[i]))) { vx[i] = -vx[i] * 0.4; if (k === K.STAR) { starHit(i, nx, py[i]); continue; } } else px[i] = nx;
        if (solid(Math.floor(px[i]), Math.floor(ny))) {
          if (k === K.STAR) { starHit(i, px[i], ny); continue; }
          if (k === K.SHELL && vy[i] > 40 && !pf[i]) { pf[i] = 1; WTP.audio.play('tink'); }
          vy[i] = -vy[i] * (k === K.SHELL ? 0.45 : 0.32); vx[i] *= 0.7;
          if (Math.abs(vy[i]) < 14) {
            vy[i] = 0;
            if (k === K.DEBRIS && !pf[i] && Math.random() < 0.55 && W.placeRubble(Math.floor(px[i]), Math.floor(py[i]), pc[i])) { remove(i); continue; }
            if (k === K.DEBRIS) pf[i] = 1;
            if (k === K.CONFETTI || k === K.PAPER) { vx[i] = 0; aux2[i] = 1; }
            if (k === K.SPLINTER) { aux2[i] = 0; if (!pf[i] && Math.random() < 0.3 && W.placeRubble(Math.floor(px[i]), Math.floor(py[i]), pc[i])) { remove(i); continue; } pf[i] = 1; }
          }
        } else py[i] = ny;
      } else if (k === K.ACID || k === K.LAVA || k === K.PAINT || k === K.WATER) {
        vy[i] = Math.min(vy[i] + 380 * dt, 220);
        const steps = Math.max(1, Math.ceil(Math.hypot(vx[i], vy[i]) * dt));
        let dead = false;
        for (let s = 0; s < steps && !dead; s++) {
          const nx = px[i] + (vx[i] * dt) / steps, ny = py[i] + (vy[i] * dt) / steps;
          const ix = Math.floor(nx), iy = Math.floor(ny);
          if (ix < 0 || ix >= W.w || iy >= W.h - 3) { dead = true; break; }
          if (iy >= 0 && solid(ix, iy)) {
            const idx = iy * W.w + ix;
            if (k === K.ACID || k === K.LAVA) {
              if (W.mat[idx] === W.ROCK) { dead = true; break; }
              W.corrode(idx, ix, iy);
              if (k === K.LAVA) { if (Math.random() < 0.25) W.igniteAt(ix, iy - 1, 2); if (Math.random() < 0.1) FX.smoke(ix, iy, 1); }
              else if (Math.random() < 0.05) FX.smoke(ix, iy, 1, P32.L);
              aux2[i]--;
              vx[i] *= 0.3; vy[i] = 20;
              if (aux2[i] <= 0) dead = true;
            } else if (k === K.PAINT) { const n2 = W.paintAt(nx, ny, 2.2, pc[i]); if (n2) WTP.game?.stat?.('painted', n2); dead = true; }
            else {
              if (W.burn[idx]) { W.burn[idx] = 0; FX.smoke(ix, iy, 1, P32['6']); }
              vx[i] = rand(-30, 30); vy[i] = -vy[i] * 0.2;
              if (Math.random() < 0.3) dead = true;
            }
            break;
          }
          px[i] = nx; py[i] = ny;
        }
        if (dead) { remove(i); continue; }
      } else if (k === K.ASH) {
        aux[i] += dt * 2; vx[i] = vx[i] * 0.98 + Math.sin(aux[i]) * 8 * dt; vy[i] = vy[i] * 0.98 + 4 * dt;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      } else if (k === K.SMOKE || k === K.FLAME || k === K.EMBER) {
        vx[i] *= 0.97; vy[i] = vy[i] * 0.97 - (k === K.EMBER ? -40 : 14) * dt;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      } else if (k === K.DUST) {
        aux[i] += dt;
        vx[i] = vx[i] * 0.95 + Math.sin(aux[i] * 0.9 + i) * 3 * dt; vy[i] = vy[i] * 0.95 + 3 * dt;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      } else if (k === K.SUCK) {
        const dx = aux[i] - px[i], dy = aux2[i] - py[i], d = Math.hypot(dx, dy) || 1;
        if (d < 1.6) { remove(i); continue; }
        vx[i] += ((dx / d) * 900 - (dy / d) * 140) * dt; vy[i] += ((dy / d) * 900 + (dx / d) * 140) * dt;
        vx[i] *= 0.95; vy[i] *= 0.95;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      } else if (k === K.MAG) {
        const o = WTP.player?.gun?.();
        if (!o || !WTP.weapons?.magnetOn?.()) { pk[i] = K.DEBRIS; continue; }
        const dx = o.x - px[i], dy = o.y - py[i], d = Math.hypot(dx, dy) || 1;
        if (d < 3) { remove(i); if (Math.random() < 0.06) WTP.audio.play('tink'); continue; }
        vx[i] += (dx / d) * 1500 * dt; vy[i] += (dy / d) * 1500 * dt;
        vx[i] *= 0.9; vy[i] *= 0.9;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      } else if (k !== K.TRAIL) {
        vy[i] += 220 * dt; px[i] += vx[i] * dt; py[i] += vy[i] * dt;
      }
    }
    for (let a = FX.anims.length - 1; a >= 0; a--) { FX.anims[a].t += dt; if (FX.anims[a].t >= FX.anims[a].dur) FX.anims.splice(a, 1); }
    for (let b = FX.beams.length - 1; b >= 0; b--) { FX.beams[b].t += dt; if (FX.beams[b].t >= FX.beams[b].life) FX.beams.splice(b, 1); }
    for (let p = FX.pops.length - 1; p >= 0; p--) { FX.pops[p].t += dt; if (FX.pops[p].t >= FX.pops[p].life) FX.pops.splice(p, 1); }
    FX.flashA = Math.max(0, FX.flashA - dt * 5);
  }
  function starHit(i, x, y) {
    const W = Wd();
    W.carve(x, y, 1.6, { debris: 0.4, force: 40, cause: 'star', pop: 0.3 });
    W.igniteAt(Math.floor(x), Math.floor(y), 1);
    remove(i);
  }
  FX.suckAll = (hx, hy, R, t = 1.5) => {
    for (let i = 0; i < FX.np; i++) {
      const k = pk[i];
      if (k !== K.DEBRIS && k !== K.SMOKE && k !== K.SHARD && k !== K.DUST && k !== K.CONFETTI && k !== K.SPARK) continue;
      const dx = hx - px[i], dy = hy - py[i];
      if (dx * dx + dy * dy < R * R) { pk[i] = K.SUCK; aux[i] = hx; aux2[i] = hy; life[i] = Math.max(life[i], t); }
    }
  };
  FX.magnetize = (ox, oy, ax, ay, R) => {
    for (let i = 0; i < FX.np; i++) {
      if (pk[i] !== K.DEBRIS && pk[i] !== K.SHARD) continue;
      const dx = ox - px[i], dy = oy - py[i], d = Math.hypot(dx, dy);
      if (d < R && (dx * ax + dy * ay) < 0) { pk[i] = K.MAG; life[i] = 1.4; }
    }
  };
  FX.fling = (ax, ay, sp) => { for (let i = 0; i < FX.np; i++) if (pk[i] === K.MAG) { pk[i] = K.DEBRIS; vx[i] = ax * sp + rand(-40, 40); vy[i] = ay * sp + rand(-40, 40); pf[i] = 0; } };
  FX.blast = (x, y, R, force) => {
    for (let i = 0; i < FX.np; i++) {
      const dx = px[i] - x, dy = py[i] - y, d2 = dx * dx + dy * dy;
      if (d2 > R * R) continue;
      const d = Math.sqrt(d2) || 1, f = (1 - d / R) * force;
      vx[i] += (dx / d) * f; vy[i] += (dy / d) * f - f * 0.3;
    }
  };

  let bufB = null, bufF = null, imgB = null, imgF = null, cvB = null, cvF = null, bw = 0, bh = 0;
  function ensure(w, h) {
    if (w === bw && h === bh && cvB) return;
    bw = w; bh = h;
    cvB = document.createElement('canvas'); cvB.width = w; cvB.height = h;
    cvF = document.createElement('canvas'); cvF.width = w; cvF.height = h;
    imgB = cvB.getContext('2d').createImageData(w, h); imgF = cvF.getContext('2d').createImageData(w, h);
    bufB = new Uint32Array(imgB.data.buffer); bufF = new Uint32Array(imgF.data.buffer);
  }
  const SMOKE_C = [P32['6'], P32['5'], P32['4'], P32['3'], P32['2']];
  const FLAME_C = [P32['7'], P32.Y, P32.y, P32.a, P32.o, P32.e, P32.R, P32['3']];
  const DITH = WTP.sprites.dith;
  function plot(buf, x, y, c) { if (x >= 0 && y >= 0 && x < bw && y < bh) buf[y * bw + x] = c; }
  function disc(buf, cx, cy, r, c, t) {
    const r2 = r * r;
    for (let y = -Math.ceil(r); y <= r; y++) for (let x = -Math.ceil(r); x <= r; x++) {
      if (x * x + y * y > r2) continue;
      const X = cx + x, Y = cy + y;
      if (t < 1 && !DITH(X, Y, t)) continue;
      plot(buf, X, Y, c);
    }
  }
  function line(buf, x0, y0, x1, y1, c, thick = 0, dith = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, n = 0;
    for (;;) {
      if (dith >= 1 || DITH(x0, y0, dith)) {
        if (thick) { for (let a = -thick; a <= thick; a++) for (let b = -thick; b <= thick; b++) if (a * a + b * b <= thick * thick + 0.5) plot(buf, x0 + a, y0 + b, c); }
        else plot(buf, x0, y0, c);
      }
      if ((x0 === x1 && y0 === y1) || ++n > 4000) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  FX.line = line;
  function drawChunk(buf, c, ox, oy) {
    const cs = Math.cos(c.a), sn = Math.sin(c.a);
    const R = Math.ceil(c.rad) + 1;
    const cx = c.x - ox, cy = c.y - oy;
    const x0 = Math.floor(cx - R), x1 = Math.ceil(cx + R), y0 = Math.floor(cy - R), y1 = Math.ceil(cy + R);
    if (x1 < 0 || y1 < 0 || x0 >= bw || y0 >= bh) return;
    const sh = q() >= 1 ? P32['0'] : 0;
    for (let pass = sh ? 0 : 1; pass < 2; pass++) {
      const off = pass === 0 ? 1 : 0;
      for (let y = Math.max(0, y0); y <= Math.min(bh - 1, y1); y++) {
        for (let x = Math.max(0, x0); x <= Math.min(bw - 1, x1); x++) {
          const wx = x + 0.5 - off - cx, wy = y + 0.5 - off - cy;
          const lx = wx * cs + wy * sn + c.ox, ly = -wx * sn + wy * cs + c.oy;
          const ix = Math.floor(lx), iy = Math.floor(ly);
          if (ix < 0 || iy < 0 || ix >= c.bw || iy >= c.bh) continue;
          const v = c.mask[iy * c.bw + ix];
          if (!v) continue;
          if (pass === 0) { if (!bufB[y * bw + x]) bufB[y * bw + x] = sh; }
          else bufB[y * bw + x] = v === 0xff000001 ? P32['0'] : v;
        }
      }
    }
  }
  function render(ctx, cam, vw, vh) {
    const ox = Math.floor(cam.x) - 1, oy = Math.floor(cam.y) - 1;
    const w = Math.ceil(vw) + 3, h = Math.ceil(vh) + 3;
    ensure(w, h);
    bufB.fill(0); bufF.fill(0);
    const W = Wd();
    if (!WTP.deskRender?.ready) {
      for (const c of W.chunks) drawChunk(bufB, c, ox, oy);
      const held = WTP.weapons?.heldChunk?.();
      if (held) drawChunk(bufB, held, ox, oy);
    }
    for (let i = 0; i < FX.np; i++) {
      const X = Math.floor(px[i]) - ox, Y = Math.floor(py[i]) - oy;
      if (X < -4 || Y < -4 || X >= w + 4 || Y >= h + 4) continue;
      const k = pk[i], t = life[i] / maxl[i];
      switch (k) {
        case K.DEBRIS: case K.PIX: plot(bufB, X, Y, pc[i]); break;
        case K.SHARD: plot(bufB, X, Y, ((i + (performance.now() / 80) | 0) & 3) === 0 ? P32['7'] : pc[i]); break;
        case K.SHELL: plot(bufB, X, Y, pc[i]); if (Math.abs(vx[i]) > 5 || Math.abs(vy[i]) > 5 || (i & 1)) plot(bufB, X + 1, Y, shade(pc[i], 0.75)); else plot(bufB, X, Y - 1, shade(pc[i], 0.75)); break;
        case K.CONFETTI: plot(bufF, X, Y, pc[i]); if (Math.sin(aux[i] * 2) > 0) plot(bufF, X + 1, Y, shade(pc[i], 0.7)); break;
        case K.SPLINTER: { const ca = Math.cos(aux[i]), sa = Math.sin(aux[i]); plot(bufB, X, Y, pc[i]); plot(bufB, Math.round(X + ca), Math.round(Y + sa), shade(pc[i], 0.8)); if (aux2[i]) plot(bufB, Math.round(X - ca), Math.round(Y - sa), shade(pc[i], 1.1, 6)); break; }
        case K.PAPER: { const fl = Math.sin(aux[i]); plot(bufB, X, Y, fl > 0 ? pc[i] : shade(pc[i], 0.8)); if (Math.abs(fl) > 0.4) plot(bufB, X + 1, Y, shade(pc[i], 0.9)); if (fl > 0.2 && t > 0.3) plot(bufB, X, Y + 1, shade(pc[i], 0.75)); break; }
        case K.ASH: if (DITH(X, Y, Math.min(1, t * 1.6))) plot(bufF, X, Y, pc[i]); break;
        case K.ACID: case K.LAVA: plot(bufB, X, Y, pc[i]); plot(bufB, X, Y - 1, shade(pc[i], 0.75)); if (k === K.LAVA) plot(bufF, X, Y, (i & 3) ? pc[i] : P32.Y); break;
        case K.PAINT: case K.WATER: plot(bufB, X, Y, pc[i]); if (k === K.WATER) plot(bufB, X - Math.sign(vx[i]), Y - 1, shade(pc[i], 0.8)); break;
        case K.SPARK: {
          plot(bufF, X, Y, t > 0.5 ? P32['7'] : pc[i]);
          const tx = Math.floor(px[i] - vx[i] * 0.02) - ox, ty = Math.floor(py[i] - vy[i] * 0.02) - oy;
          if (tx !== X || ty !== Y) plot(bufF, tx, ty, shade(pc[i], 0.7));
          break;
        }
        case K.STAR: plot(bufF, X, Y, pc[i]); plot(bufF, X - Math.sign(vx[i]), Y - Math.sign(vy[i]), shade(pc[i], 0.6)); break;
        case K.SMOKE: {
          const r = aux2[i] * (1.4 - t * 0.6);
          disc(bufF, X, Y, r, SMOKE_C[Math.min(4, ((1 - t) * 3 + 1) | 0)], 0.25 + t * 0.6);
          break;
        }
        case K.FLAME: {
          const ci = Math.min(7, ((1 - t) * 7.5) | 0);
          if (ci < 3) disc(bufF, X, Y, 1, FLAME_C[ci + 1], 0.7); else plot(bufF, X, Y, FLAME_C[ci]);
          plot(bufF, X, Y, FLAME_C[ci]);
          break;
        }
        case K.EMBER: if ((i + ((performance.now() / 100) | 0)) & 1) plot(bufF, X, Y, pc[i]); break;
        case K.DUST: if (DITH(X, Y, Math.min(1, t * 2) * 0.7)) plot(bufF, X, Y, pc[i]); break;
        case K.SUCK: case K.MAG: plot(bufF, X, Y, pc[i]); break;
        case K.TRAIL: if (DITH(X, Y, t)) plot(bufF, X, Y, pc[i]); break;
        default: plot(bufF, X, Y, pc[i]);
      }
    }
    for (const b of FX.beams) drawBeam(b, ox, oy);
    cvB.getContext('2d').putImageData(imgB, 0, 0);
    cvF.getContext('2d').putImageData(imgF, 0, 0);
    return { back: cvB, front: cvF, ox, oy };
  }
  function drawBeam(b, ox, oy) {
    const k = b.t / b.life;
    const P = b.pts;
    if (b.kind === 'laser') {
      for (let s = 0; s < P.length - 2; s += 2) {
        line(bufF, P[s] - ox, P[s + 1] - oy, P[s + 2] - ox, P[s + 3] - oy, b.c2 || P32.k, 1);
      }
      for (let s = 0; s < P.length - 2; s += 2) line(bufF, P[s] - ox, P[s + 1] - oy, P[s + 2] - ox, P[s + 3] - oy, b.c1 || P32['7'], 0);
      const ex = P[P.length - 2] - ox, ey = P[P.length - 1] - oy;
      disc(bufF, Math.round(ex), Math.round(ey), 2 + (Math.random() < 0.5 ? 1 : 0), b.c2 || P32.k, 1);
      disc(bufF, Math.round(ex), Math.round(ey), 1, P32['7'], 1);
    } else if (b.kind === 'bolt') {
      for (let s = 0; s < P.length - 2; s += 2) line(bufF, P[s] - ox, P[s + 1] - oy, P[s + 2] - ox, P[s + 3] - oy, b.c2 || P32.c, 1, 0.6);
      for (let s = 0; s < P.length - 2; s += 2) line(bufF, P[s] - ox, P[s + 1] - oy, P[s + 2] - ox, P[s + 3] - oy, (Math.random() < 0.5 ? P32['7'] : P32.C), 0);
    } else if (b.kind === 'rail') {
      const th = Math.max(0, Math.round((1 - k) * (b.w || 3)));
      line(bufF, P[0] - ox, P[1] - oy, P[2] - ox, P[3] - oy, b.c2 || P32.c, th + 1, 1 - k * 0.6);
      line(bufF, P[0] - ox, P[1] - oy, P[2] - ox, P[3] - oy, b.c1 || P32['7'], th > 1 ? 1 : 0, 1 - k);
      const len = Math.hypot(P[2] - P[0], P[3] - P[1]), ux = (P[2] - P[0]) / (len || 1), uy = (P[3] - P[1]) / (len || 1);
      for (let d = 0; d < len; d += 2) { const wv = Math.sin(d * 0.45 + b.t * 30) * (2 + k * 6); plot(bufF, Math.round(P[0] + ux * d - uy * wv - ox), Math.round(P[1] + uy * d + ux * wv - oy), b.c3 || P32.C); }
    } else if (b.kind === 'column') {
      const x = P[0] - ox, w = b.w * (1 - Math.max(0, k - 0.8) * 5);
      for (let y = 0; y < bh; y++) {
        const yy = y + oy;
        if (yy > P[1]) break;
        const wob = Math.sin(yy * 0.3 + b.t * 40) * 1.5;
        for (let x2 = -w; x2 <= w; x2++) {
          const a = Math.abs(x2) / w;
          plot(bufF, Math.round(x + x2 + wob), y, a < 0.3 ? P32['7'] : a < 0.6 ? P32.C : a < 0.85 ? P32.c : P32.b);
        }
      }
    } else if (b.kind === 'wave') {
      const [x, y, ang] = P;
      const R = b.r * k;
      for (let a = -b.spread; a <= b.spread; a += 0.02) {
        const X = Math.round(x + Math.cos(ang + a) * R - ox), Y = Math.round(y + Math.sin(ang + a) * R - oy);
        plot(bufF, X, Y, k < 0.5 ? P32.K : P32.k);
        if (k < 0.6) plot(bufF, Math.round(x + Math.cos(ang + a) * (R - 3) - ox), Math.round(y + Math.sin(ang + a) * (R - 3) - oy), P32.m);
      }
    } else if (b.kind === 'select') {
      const [x0, y0, x1, y1] = P;
      const off = ((b.t * 30) | 0);
      for (let x = Math.round(x0); x <= Math.round(x1); x++) { const on = ((x + off) >> 1) & 1; plot(bufF, x - ox, Math.round(y0) - oy, on ? P32['7'] : P32['0']); plot(bufF, x - ox, Math.round(y1) - oy, on ? P32['0'] : P32['7']); }
      for (let y = Math.round(y0); y <= Math.round(y1); y++) { const on = ((y + off) >> 1) & 1; plot(bufF, Math.round(x0) - ox, y - oy, on ? P32['0'] : P32['7']); plot(bufF, Math.round(x1) - ox, y - oy, on ? P32['7'] : P32['0']); }
    } else if (b.kind === 'cone') {
      const [x, y, ang] = P;
      for (let q = 0; q < 26; q++) {
        const a = ang + (Math.random() * 2 - 1) * b.spread, d = Math.random() * b.r;
        const ph = (d + performance.now() / 8) % 12;
        if (ph > 2) continue;
        plot(bufF, Math.round(x + Math.cos(a) * d - ox), Math.round(y + Math.sin(a) * d - oy), P32['6']);
      }
    } else if (b.kind === 'rope') {
      line(bufF, P[0] - ox, P[1] - oy, P[2] - ox, P[3] - oy, b.c1 || P32['5'], 0);
    } else if (b.kind === 'sight') {
      line(bufF, P[0] - ox, P[1] - oy, P[2] - ox, P[3] - oy, b.c1 || P32.e, 0, 0.35);
    } else if (b.kind === 'tractor') {
      const len = Math.hypot(P[2] - P[0], P[3] - P[1]), ux = (P[2] - P[0]) / (len || 1), uy = (P[3] - P[1]) / (len || 1);
      for (let d = 0; d < len; d += 1) {
        const wv = Math.sin(d * 0.35 - performance.now() / 60) * (1 + d * 0.08);
        if ((d | 0) % 2 === 0) plot(bufF, Math.round(P[0] + ux * d - uy * wv - ox), Math.round(P[1] + uy * d + ux * wv - oy), b.c1 || P32.a);
        if ((d | 0) % 3 === 0) plot(bufF, Math.round(P[0] + ux * d + uy * wv - ox), Math.round(P[1] + uy * d - ux * wv - oy), b.c2 || P32.y);
      }
    }
  }
  FX.bolt = (x0, y0, x1, y1, o = {}) => {
    const pts = [x0, y0];
    const len = Math.hypot(x1 - x0, y1 - y0), segs = Math.max(2, Math.ceil(len / 6));
    const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
    for (let s = 1; s < segs; s++) { const t = s / segs, j = rand(-1, 1) * Math.min(6, len * 0.12); pts.push(x0 + (x1 - x0) * t + nx * j, y0 + (y1 - y0) * t + ny * j); }
    pts.push(x1, y1);
    FX.beam(pts, { kind: 'bolt', life: o.life || 0.09, c2: o.c2 });
  };
  FX.drawAnims = (ctx, layer) => {
    for (const a of FX.anims) {
      if (a.t < 0) continue;
      if (a.flash) {
        const fr = WTP.sprites.explosions().flash[a.flash];
        if (!fr) continue;
        const f = fr[Math.min(fr.length - 1, Math.floor((a.t / a.dur) * fr.length))];
        ctx.save();
        ctx.translate(Math.round(a.x), Math.round(a.y));
        const step = Math.round(a.ang / (Math.PI / 8)) * (Math.PI / 8);
        ctx.rotate(step);
        ctx.drawImage(f, 0, -Math.floor(f.height / 2));
        ctx.restore();
        continue;
      }
      if (a.slash || !a.frames || (a.layer || 1) !== layer) continue;
      const idx = Math.min(a.frames.length - 1, Math.floor((a.t / a.dur) * a.frames.length));
      const fr = a.frames[idx];
      const x = Math.round(a.x - a.size / 2), y = Math.round(a.y - a.size / 2);
      if (a.flip) { ctx.save(); ctx.translate(x + a.size, y); ctx.scale(-1, 1); ctx.drawImage(fr, 0, 0); ctx.restore(); }
      else ctx.drawImage(fr, x, y);
    }
  };
  FX.update = update;
  FX.render = render;
  FX.disc = (x, y, r, c) => disc(bufF, x, y, r, c, 1);
})();
