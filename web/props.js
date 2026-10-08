(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand, pick, hash, shade, mix } = WTP;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player, EN = () => WTP.enemies;
  const A = (n, x) => WTP.audio.play(n, x);
  const ents = [];
  const timers = [];
  const R = { ents, playing: [] };
  WTP.props = R;
  R.popRegion = (...a) => popRegion(...a);

  const BTN_FX = [
    [/(buy|cart|shop|order|checkout|deal|sale|price|\$|pay|bid|add to)/i, 'coins'],
    [/(like|heart|love|fav|♥|❤|follow|kudos|upvote|thanks)/i, 'hearts'],
    [/(play|watch|video|listen|▶|stream|trailer)/i, 'play'],
    [/(download|install|get the|get it|update|upgrade)/i, 'virus'],
    [/(delete|remove|clear|cancel|unsubscribe|close|reject|deny|discard|skip)/i, 'delete'],
    [/(search|find|go\b|look|explore|browse)/i, 'scan'],
    [/(accept|agree|allow|cookie|consent)/i, 'cookies'],
    [/(submit|send|post|reply|log ?in|sign ?in|continue|next|ok\b|yes|apply|confirm|save|launch|start)/i, 'launch'],
    [/(subscribe|sign ?up|newsletter|join|register|notify)/i, 'spam']
  ];
  const btnKind = (label) => { for (const [re, k] of BTN_FX) if (re.test(label)) return k; return 'pop'; };

  function hit(p, cx, cy, pow, o) {
    if (!p || p.dead) return;
    p.hits++;
    const t = p.t;
    if (t === 'btn') pressButton(p, cx, cy, o);
    else if (t === 'video') { if (!p.state) { p.state = 'play'; p.t0 = 0; R.playing.push(p); A('tvOn'); G()?.event?.('NOW PLAYING', (p.x0 + p.x1) / 2, p.y0 - 4, 1); } if (p.hits > 8 || p.left < p.n * 0.55) breakVideo(p); }
    else if (t === 'car') driveOff(p, cx);
    else if (t === 'rocket') launchProp(p);
    else if (t === 'barrel') { if (!p.state) { p.state = 'lit'; p.fuse = 0.35 + Math.random() * 0.2; A('fuse'); } }
    else if (t === 'slider') slide(p, cx);
    else if (t === 'widget') WTP.deskGags?.widgetHit?.(p, cx, cy, pow, o);
    else if (t === 'bell') { A('bell'); for (let k = 0; k < 6; k++) FX().spark((p.x0 + p.x1) / 2, p.y0, rand(-60, 60), rand(-80, -20), P32.y, 0.3); if (p.hits > 4) popRegion(p, 'bell'); }
  }
  function cellGone(p) {
    if (p.dead) return;
    if ((p.t === 'crate' || p.t === 'safe' || p.t === 'gift' || p.t === 'piggy') && p.left < p.n * (p.t === 'safe' ? 0.5 : 0.62)) breakLoot(p);
    else if (p.t === 'barrel' && !p.state) { p.state = 'lit'; p.fuse = 0.2; }
    else if (p.t === 'video' && p.left < p.n * 0.55) breakVideo(p);
    else if (p.t === 'widget' && p.left < p.n * 0.6) WTP.deskGags?.widgetBreak?.(p);
  }
  const center = (p) => ({ x: (p.x0 + p.x1) / 2 + 0.5, y: (p.y0 + p.y1) / 2 + 0.5 });
  function popRegion(p, why, vx = rand(-80, 80), vy = -rand(120, 200), extra = {}) {
    p.dead = true;
    const Wd = W();
    const c = Wd.detachRegion((i) => Wd.pgid[i] === p.id, p.x0, p.y0, p.x1, p.y1, vx, vy, { mtl: extra.mtl ?? Wd.M.BUTTON, bouncy: extra.bouncy ?? true, drive: extra.drive || 0, fuse: extra.fuse || 0, prop: p, life: extra.life || 9 });
    if (c) c.va = rand(-5, 5);
    return c;
  }
  function pressButton(p, cx, cy, o) {
    const k = btnKind(p.label || '');
    const c = center(p);
    const label = (p.label || 'BUTTON').toUpperCase().slice(0, 18);
    G()?.stat?.('buttons', 1);
    A('click');
    FX().pop(c.x, p.y0 - 3, `${label}!`, { scale: 1, ramp: ['7', 'C', 'c'], life: 0.9 });
    const dir = cx < c.x ? 1 : -1;
    popRegion(p, 'btn', dir * rand(60, 140), -rand(140, 230));
    G()?.bonus?.(120, c.x, c.y - 6);
    if (k === 'coins') { EN()?.drop?.('scrap', c.x, c.y, 8); A('kaching'); }
    else if (k === 'hearts') { for (let q = 0; q < 10; q++) FX().star(c.x, c.y, rand(-90, 90), rand(-160, -60), Math.random() < 0.5 ? P32.k : P32.K); EN()?.drop?.('heart', c.x, c.y, 1); A('heal'); }
    else if (k === 'play') { let any = false; for (const v of W().props) if (v && v.t === 'video' && !v.dead) { if (!v.state) { v.state = 'play'; v.t0 = 0; R.playing.push(v); } any = true; } A(any ? 'tvOn' : 'jingle'); G()?.event?.(any ? 'PLAYING!' : 'NOTHING TO PLAY', c.x, c.y - 10, 1); }
    else if (k === 'virus') { G()?.event?.('DOWNLOADING VIRUS.EXE', c.x, c.y - 12, 1); A('download'); later(1.2, () => { WTP.weapons.explode(c.x, c.y, 20, { letters: 10, kind: 'plasma', sound: 'glitchBoom' }); for (let q = 0; q < 3; q++) later(0.15 * q, () => WTP.weapons.glitchAt?.(c.x + rand(-30, 30), c.y + rand(-20, 20))); }); }
    else if (k === 'delete') { G()?.event?.('DELETED', c.x, c.y - 10, 2); A('delete'); deleteRow(c.y, p.y1 - p.y0 + 6); }
    else if (k === 'scan') { G()?.event?.('SEARCHING...', c.x, c.y - 10, 1); A('scan'); R.scans = R.scans || []; R.scans.push({ y: c.y, t: 0, x: c.x }); }
    else if (k === 'cookies') { G()?.event?.('COOKIES ACCEPTED', c.x, c.y - 10, 1); A('throw'); for (let q = 0; q < 8; q++) later(q * 0.12, () => EN()?.bombDrop?.(c.x + rand(-50, 50), c.y - 80, 'cookie')); }
    else if (k === 'launch') { G()?.event?.('SUBMITTED', c.x, c.y - 10, 1); A('launch'); const ch = W().chunks[W().chunks.length - 1]; if (ch && ch.prop === p) { ch.vy = -420; ch.vx *= 0.3; ch.fuse = 0.9; ch.bouncy = false; } }
    else if (k === 'spam') { G()?.event?.('THANKS FOR SUBSCRIBING!', c.x, c.y - 12, 1); A('popup'); for (let q = 0; q < 3; q++) later(0.2 + q * 0.25, () => EN()?.spawn?.(pick(['ad', 'spam', 'notif']), c.x + rand(-30, 30), c.y - 20 - rand(0, 20), { weak: true })); }
    else { for (let q = 0; q < 16; q++) FX().confetti(c.x, c.y, rand(-120, 120), rand(-200, -40)); A('confetti'); }
  }
  function deleteRow(y, h) {
    const Wd = W();
    const y0 = Math.max(0, Math.floor(y - h / 2)), y1 = Math.min(Wd.h - 4, Math.ceil(y + h / 2));
    R.deletes = R.deletes || [];
    R.deletes.push({ y0, y1, x: Wd.PX1 - 1, speed: 260 });
  }
  function driveOff(p, cx) {
    const c = center(p);
    const dir = cx < c.x ? 1 : -1;
    const ch = popRegion(p, 'car', dir * 60, -40, { mtl: W().M.METAL, bouncy: false, drive: dir * 150, life: 12 });
    if (ch) { A('honk'); G()?.event?.('BEEP BEEP!', c.x, c.y - 12, 1); }
  }
  function launchProp(p) {
    const c = center(p);
    const ch = popRegion(p, 'rocket', 0, -300, { mtl: W().M.METAL, bouncy: false, fuse: 1.4 });
    if (ch) { ch.rocket = true; A('rocket'); G()?.event?.('LIFTOFF!', c.x, c.y - 12, 1); }
  }
  function breakVideo(p) {
    if (p.dead) return;
    p.dead = true;
    const Wd = W();
    const c = center(p);
    let n = 0;
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
      const i = y * Wd.w + x;
      if (Wd.pgid[i] !== p.id || Wd.mat[i] !== Wd.SOLID) continue;
      const col = Wd.col[i];
      n += Wd.kill(i, x, y, c.x, c.y, 0, 0);
      if (Math.random() < 0.18) FX().pix(x + 0.5, y + 0.5, (x - c.x) * rand(2, 6), (y - c.y) * rand(2, 6) - 40, (hash(x, y) & 1) ? P32['7'] : col, rand(0.4, 1.2));
    }
    if (n) G()?.scored?.(n, c.x, c.y, 'video');
    WTP.weapons.explode(c.x, c.y, 8, { kind: 'plasma', noPush: true, sound: 'tvBreak', letters: 6 });
    G()?.event?.('SIGNAL LOST', c.x, c.y - 10, 2);
    G()?.stat?.('props', 1);
  }
  function breakLoot(p) {
    p.dead = true;
    const c = center(p);
    const Wd = W();
    let n = 0;
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
      const i = y * Wd.w + x;
      if (Wd.pgid[i] !== p.id || Wd.mat[i] !== Wd.SOLID) continue;
      n += Wd.kill(i, x, y, c.x, c.y, 0.5, 90);
    }
    if (n) G()?.scored?.(n, c.x, c.y, 'loot');
    const amt = p.t === 'safe' ? 22 : p.t === 'piggy' ? 14 : 7;
    EN()?.drop?.('scrap', c.x, c.y, amt);
    if (p.t !== 'safe' && Math.random() < 0.35) EN()?.drop?.('heart', c.x, c.y, 1);
    A(p.t === 'safe' ? 'vault' : p.t === 'piggy' ? 'oink' : 'wood');
    G()?.event?.(p.t === 'safe' ? 'VAULT CRACKED!' : p.t === 'piggy' ? 'OINK!' : 'LOOT!', c.x, c.y - 12, 1);
    G()?.stat?.('props', 1);
  }
  function slide(p, cx) {
    const s = p.o.slider;
    if (!s) return;
    const c = center(p);
    s.v = Math.max(0, Math.min(1, s.v + (cx < c.x ? 0.25 : -0.25) * (s.v >= 1 || s.v <= 0 ? 1 : 1)));
    drawSlider(p);
    A('tick');
    if (s.v >= 1 && !s.maxed) {
      s.maxed = true;
      if (s.kind === 'volume') { G()?.event?.('VOLUME 100%', c.x, c.y - 10, 2); A('sound'); WTP.weapons.shockwave?.(c.x, c.y, 70); }
      else if (s.kind === 'bright') { G()?.event?.('BRIGHTNESS 100%', c.x, c.y - 10, 2); FX().flash(0.9, '#ffffff'); for (const e of EN()?.list || []) e.stun = 2; }
      else { G()?.event?.('MAXED OUT', c.x, c.y - 10, 2); WTP.weapons.explode(c.x, c.y, 12, { noPush: true }); }
    } else if (s.v < 1) s.maxed = false;
  }
  function drawSlider(p) {
    const s = p.o.slider, Wd = W();
    const w = p.x1 - p.x0 + 1;
    const kx = p.x0 + 2 + Math.round((w - 7) * s.v);
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
      const i = y * Wd.w + x;
      if (Wd.pgid[i] !== p.id || Wd.mat[i] !== Wd.SOLID) continue;
      const mid = Math.abs(y - (p.y0 + p.y1) / 2) < 1.2;
      let c = mid ? (x < kx ? s.col : P32['4']) : 0;
      if (x >= kx - 1 && x <= kx + 2) c = (x === kx - 1 || y === p.y0) ? P32['7'] : P32['6'];
      if (!c) c = s.bg;
      Wd.col[i] = c; Wd.touch(i);
    }
  }
  function later(t, fn) { timers.push({ t, fn }); }
  R.later = later;

  const CAT = ['....0.0.', '...0000.', '...0y0y.', '0..0000.', '.0.0000.', '.0000000', '.0000000', '.0.0..0.'];
  function animVideo(p, dt) {
    p.t0 += dt;
    p.acc = (p.acc || 0) + dt;
    if (p.acc < 0.12) return;
    p.acc = 0;
    const Wd = W();
    const f = (p.t0 * 8) | 0;
    const w = p.x1 - p.x0 + 1, h = p.y1 - p.y0 + 1;
    const scene = (p.id % 3);
    const catX = Math.round(((p.t0 * 22) % (w + 30)) - 15), catY = Math.round(h * 0.55);
    const cs = Math.max(1, Math.round(h / 22));
    for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
      const i = y * Wd.w + x;
      if (Wd.pgid[i] !== p.id || Wd.mat[i] !== Wd.SOLID) continue;
      const lx = x - p.x0, ly = y - p.y0;
      let c;
      if (ly >= h - 3) c = lx < (w * ((p.t0 / 20) % 1)) ? P32.e : P32['3'];
      else if (scene === 0) {
        c = ly > h * 0.7 ? (((lx + f) >> 2) & 1 ? P32.W : P32.w) : ly > h * 0.66 ? P32.u : mix(P32.C, P32.c, ly / h);
        const cx = Math.floor((lx - catX) / cs), cy = Math.floor((ly - catY + 8 * cs) / cs);
        if (cx >= 0 && cx < 8 && cy >= 0 && cy < 8 && CAT[cy][cx] !== '.') c = CAT[cy][cx] === 'y' ? P32.y : P32.a;
        const vx = Math.round(w * 0.7), vy = Math.round(h * 0.55);
        if (lx >= vx && lx < vx + 3 * cs && ly >= vy && ly < vy + 4 * cs && !(p.t0 % 6 > 3)) c = P32.k;
      } else if (scene === 1) {
        const v = hash(x + f * 31, y + f * 17) & 7;
        c = v < 3 ? P32['7'] : v < 5 ? P32['5'] : P32['2'];
        if (Math.abs(ly - ((f * 3) % h)) < 2) c = P32['6'];
      } else {
        const ang = Math.atan2(ly - h / 2, lx - w / 2) + p.t0 * 2;
        c = [P32.k, P32.y, P32.c, P32.l, P32.P, P32.o][((ang * 3 / Math.PI) & 7) % 6];
        if (Math.hypot(lx - w / 2, ly - h / 2) < h * 0.18) c = P32['7'];
      }
      Wd.col[i] = c; Wd.touch(i);
      Wd.touch(i);
    }
    if (Math.random() < 0.15) A('tvBlip');
  }

  function addEntity(t, x, y, o = {}) {
    const e = { t, x, y, w: o.w || 8, h: o.h || 8, hp: o.hp ?? 30, t0: rand(0, 3), dead: false, dir: o.dir || 1, o, cd: 0, id: o.id };
    ents.push(e);
    return e;
  }
  R.addEntity = addEntity;
  function reset() {
    ents.length = 0; timers.length = 0; R.playing = []; R.deletes = []; R.scans = [];
    for (const p of W().props) if (p && p.t === 'slider' && p.o.slider) { p.o.slider.v = p.o.slider.v0; p.o.slider.maxed = false; drawSlider(p); }
  }
  R.reset = reset;
  R.resetEnts = (list) => { ents.length = 0; for (const e of list) addEntity(e.t, e.x, e.y, { ...e.o }); };

  function solidAround(x, y, r) {
    const Wd = W();
    let open = 0;
    for (let a = 0; a < 8; a++) { const xx = Math.floor(x + Math.cos(a * 0.785) * r), yy = Math.floor(y + Math.sin(a * 0.785) * r); if (!Wd.solid(xx, yy)) open++; }
    return open;
  }
  function update(dt) {
    for (let k = timers.length - 1; k >= 0; k--) { const t = timers[k]; t.t -= dt; if (t.t <= 0) { timers.splice(k, 1); try { t.fn(); } catch (e) { } } }
    for (let k = R.playing.length - 1; k >= 0; k--) { const p = R.playing[k]; if (p.dead) { R.playing.splice(k, 1); continue; } animVideo(p, dt); }
    for (const p of W().props) {
      if (!p || p.dead || p.t !== 'barrel' || p.state !== 'lit') continue;
      p.fuse -= dt;
      const c = center(p);
      if (Math.random() < 0.6) FX().spark(c.x + rand(-2, 2), p.y0, rand(-30, 30), rand(-80, -20), P32.y, 0.2);
      if (p.fuse <= 0) {
        p.dead = true;
        const Wd = W();
        for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) { const i = y * Wd.w + x; if (Wd.pgid[i] === p.id && Wd.mat[i] === Wd.SOLID) Wd.kill(i, x, y, c.x, c.y, 0.6, 150); }
        WTP.weapons.explode(c.x, c.y, p.o.big ? 26 : 19, { letters: 12, fire: 0.35, cause: 'barrel' });
        G()?.stat?.('props', 1);
      }
    }
    if (R.deletes) for (let k = R.deletes.length - 1; k >= 0; k--) {
      const d = R.deletes[k];
      const Wd = W();
      const nx = d.x - d.speed * dt;
      let n = 0;
      for (let x = Math.floor(d.x); x > Math.floor(nx) && x >= Wd.PX0; x--) for (let y = d.y0; y <= d.y1; y++) { const i = y * Wd.w + x; if (Wd.mat[i] === Wd.SOLID && Wd.mtl[i] !== Wd.M.METAL) { const c = Wd.col[i]; n += Wd.kill(i, x, y, x, y, 0, 0); if (Math.random() < 0.1) FX().pix(x, y, rand(-40, 10), rand(-30, 30), c, 0.4); } }
      if (n) G()?.scored?.(n, d.x, (d.y0 + d.y1) / 2, 'delete');
      FX().beam([d.x, d.y0 - 1, d.x, d.y1 + 1], { kind: 'laser', life: 0.03, c1: P32['7'], c2: P32.e });
      d.x = nx;
      if (d.x < Wd.PX0) R.deletes.splice(k, 1);
    }
    if (R.scans) for (let k = R.scans.length - 1; k >= 0; k--) {
      const s = R.scans[k];
      s.t += dt;
      const Wd = W();
      const y = s.y + s.t * 160;
      if (s.t > 1.6) { R.scans.splice(k, 1); continue; }
      FX().beam([Wd.PX0, y, Wd.PX1, y], { kind: 'sight', life: 0.03, c1: P32.l });
      for (let q = 0; q < 6; q++) { const x = Wd.PX0 + Math.random() * (Wd.PX1 - Wd.PX0); const i = Math.floor(y) * Wd.w + Math.floor(x); if (Wd.kind[i] === Wd.K_TEXT && Wd.gid[i]) Wd.detachGlyph(Wd.gid[i], rand(-40, 40), rand(-80, -20)); }
    }
    const P = PL(), pc = P.center();
    const Wd = W();
    for (let k = ents.length - 1; k >= 0; k--) {
      const e = ents[k];
      if (e.dead) continue;
      e.t0 += dt; e.cd = Math.max(0, e.cd - dt);
      if (e.t === 'spring') {
        const below = Wd.hardAt(Math.floor(e.x), Math.floor(e.y + 2)) || Wd.hardAt(Math.floor(e.x - 3), Math.floor(e.y + 2)) || Wd.hardAt(Math.floor(e.x + 3), Math.floor(e.y + 2));
        if (!below) { e.vy = Math.min(300, (e.vy || 0) + 600 * dt); e.y += e.vy * dt; if (e.y > Wd.h) e.dead = true; } else e.vy = 0;
        e.sq = Math.max(0, (e.sq || 0) - dt * 4);
        if (Math.abs(pc.x - e.x) < (e.o.hidden ? 12 : 7) && P.y + P.h > e.y - 3 && P.y + P.h < e.y + 3 && P.vy >= -10) { P.vy = -(e.o.power || 430); P.ground = false; P.stretch = 1; e.sq = 1; P.jumps = 1 + P.extraJumps; A('boing'); P.rocketJumpStart = P.rocketJumpStart ?? P.y; }
        for (const ch of Wd.chunks) if (Math.abs(ch.x - e.x) < ch.rad + 4 && Math.abs(ch.y + ch.rad * 0.6 - e.y) < 6 && ch.vy > 0) { ch.vy = -460; ch.rest = 0; e.sq = 1; A('boing'); }
      } else if (e.t === 'fan') {
        e.spin = (e.spin || 0) + dt * 20;
        const reach = e.o.reach || 60, dir = e.dir;
        if (Math.random() < 0.5) FX().pix(e.x + dir * rand(4, reach), e.y + rand(-4, 4), dir * 120, rand(-6, 6), P32['6'], 0.25);
        const dx = (pc.x - e.x) * dir, dy = Math.abs(pc.y - e.y);
        if (dx > 0 && dx < reach && dy < 10) { P.vx += dir * 900 * dt * (1 - dx / reach); }
        for (const ch of Wd.chunks) { const qx = (ch.x - e.x) * dir; if (qx > 0 && qx < reach && Math.abs(ch.y - e.y) < 12) { ch.vx += dir * 500 * dt; ch.rest = 0; } }
        if (!Wd.hardAt(Math.floor(e.x), Math.floor(e.y + 6)) && !Wd.hardAt(Math.floor(e.x - dir * 6), Math.floor(e.y))) { e.y += 120 * dt; }
      } else if (e.t === 'wire') {
        e.zap = (e.zap || 0) - dt;
        const ax = e.x, ay = e.y, len = e.o.len || 30;
        const sway = Math.sin(e.t0 * 1.6) * 4;
        const tx = ax + sway, ty = ay + len;
        e.tip = { x: tx, y: ty };
        if (!Wd.hardAt(Math.floor(ax), Math.floor(ay - 1)) && !Wd.hardAt(Math.floor(ax - 1), Math.floor(ay - 1)) && !Wd.hardAt(Math.floor(ax + 1), Math.floor(ay - 1))) { e.dead = true; FX().explosion(tx, ty, 5, 'plasma'); A('zap'); continue; }
        if (e.zap <= 0) {
          e.zap = rand(0.7, 1.6);
          FX().bolt(tx, ty, tx + rand(-14, 14), ty + rand(4, 16), { c2: P32.y });
          if (Math.hypot(pc.x - tx, pc.y - ty) < 14) { P.hurt(1, tx, { knock: 140 }); A('zap'); }
          EN()?.damageCircle?.(tx, ty, 14, 25, 'zap');
          if (Math.random() < 0.6) A('spark');
        }
      } else if (e.t === 'shards') {
        if (P.ground && Math.abs(pc.x - e.x) < e.w / 2 + 2 && Math.abs(P.y + P.h - e.y) < 3) { P.hurt(1, e.x - P.face * 4, { knock: 80 }); }
        if (!Wd.hardAt(Math.floor(e.x), Math.floor(e.y + 1))) e.dead = true;
      } else if (e.t === 'steam') {
        const per = e.o.period || 2.6, ph = e.t0 % per, on = ph > per - 0.8;
        e.on = on;
        if (!Wd.solid(Math.floor(e.x), Math.floor(e.y + 1))) { e.dead = true; continue; }
        if (on) {
          if (Math.random() < 0.7) FX().smoke(e.x + rand(-1.5, 1.5), e.y - 2, 1, Math.random() < 0.5 ? P32['7'] : P32['6']);
          if (Math.random() < 0.15) A('steam');
          if (Math.abs(pc.x - e.x) < 5 && pc.y < e.y && e.y - pc.y < 40) { P.vy = Math.min(P.vy, -260); P.ground = false; }
          for (const ch of Wd.chunks) if (Math.abs(ch.x - e.x) < ch.rad + 3 && ch.y < e.y && e.y - ch.y < 44) { ch.vy -= 900 * dt; ch.rest = 0; }
          for (const en of EN()?.list || []) if (!en.dead && !en.T.boss && Math.abs(en.x - e.x) < 6 && en.y < e.y && e.y - en.y < 40) { en.vy -= 700 * dt; en.damage(10 * dt, 'steam'); }
        }
      } else if (e.t === 'blink') {
      } else if (e.t === 'secret') {
        if (!e.found) {
          e.open = solidAround(e.x, e.y, 4);
          if (e.open >= 2 && Math.hypot(pc.x - e.x, pc.y - e.y) < 9) collect(e);
          if (e.open >= 2 && !e.shown) { e.shown = true; A('secretHint'); FX().pop(e.x, e.y - 8, 'SECRET!', { scale: 1, ramp: ['7', 'Y', 'y'], life: 1.2 }); }
        }
      }
    }
  }
  function collect(e) {
    e.found = true; e.dead = true;
    const run = G()?.run;
    const pid = run?.page?.id || 'x';
    const S = WTP.save;
    S.secrets[pid] = S.secrets[pid] || {};
    const fresh = !S.secrets[pid][e.o.idx];
    S.secrets[pid][e.o.idx] = true;
    if (fresh) { S.stats.secrets = (S.stats.secrets || 0) + 1; G()?.scrap?.(150); }
    WTP.persist();
    G()?.bonus?.(fresh ? 1500 : 300, e.x, e.y - 8);
    G()?.announce?.(fresh ? 'SECRET FOUND!' : 'SECRET (AGAIN)', 5);
    A('secret');
    for (let k = 0; k < 24; k++) FX().star(e.x, e.y, rand(-120, 120), rand(-180, -40), Math.random() < 0.5 ? P32.y : P32['7']);
    if (run) run.secrets = (run.secrets || 0) + 1;
  }
  function damageAt(x, y, r, d) {
    for (const e of ents) {
      if (e.dead || e.t === 'secret' || e.t === 'shards' || e.t === 'blink' || e.t === 'steam') continue;
      if (Math.abs(e.x - x) < r + e.w / 2 && Math.abs(e.y - y) < r + e.h / 2) {
        e.hp -= d;
        if (e.hp <= 0) { e.dead = true; FX().explosion(e.x, e.y, 6); A(e.t === 'wire' ? 'zap' : 'crash', 30); for (let k = 0; k < 10; k++) FX().debris(e.x, e.y, rand(-80, 80), rand(-120, -20), e.t === 'spring' ? P32.k : P32['4']); }
      }
    }
  }
  R.damageAt = damageAt;
  function draw(ctx) {
    const now = performance.now();
    for (const e of ents) {
      if (e.dead) continue;
      const x = Math.round(e.x), y = Math.round(e.y);
      if (e.t === 'spring' && e.o.hidden) continue;
      if (e.t === 'blink') {
        const on = ((now / (500 * (e.o.rate || 1)) + e.x) | 0) % 2 === 0;
        ctx.fillStyle = PAL['0']; ctx.fillRect(x - 1, Math.round(e.y) - 1, 3, 3);
        ctx.fillStyle = on ? PAL[e.o.c || 'e'] : PAL['2']; ctx.fillRect(x, Math.round(e.y), 1, 1);
        if (on) { ctx.globalAlpha = 0.35; ctx.fillRect(x - 1, Math.round(e.y), 3, 1); ctx.fillRect(x, Math.round(e.y) - 1, 1, 3); ctx.globalAlpha = 1; }
        continue;
      }
      if (e.t === 'steam') {
        ctx.fillStyle = PAL['0']; ctx.fillRect(x - 3, Math.round(e.y) - 1, 7, 3);
        ctx.fillStyle = e.on ? PAL['7'] : PAL['4']; ctx.fillRect(x - 2, Math.round(e.y), 5, 1);
        if (e.on) { ctx.globalAlpha = 0.4; ctx.fillStyle = PAL['7']; for (let q = 0; q < 6; q++) ctx.fillRect(x - 1 + ((q * 3 + ((now / 60) | 0)) % 3) - 1, Math.round(e.y) - 4 - q * 6, 3, 3); ctx.globalAlpha = 1; }
        continue;
      }
      if (e.t === 'spring') {
        const sq = e.sq > 0 ? Math.round(e.sq * 3) : 0;
        ctx.fillStyle = PAL['0']; ctx.fillRect(x - 6, y - 5 + sq, 12, 7 - sq);
        ctx.fillStyle = PAL['3']; ctx.fillRect(x - 5, y, 10, 1);
        ctx.fillStyle = PAL['5']; for (let k = 0; k < 4 - sq; k++) ctx.fillRect(x - 3 + (k & 1) * 4, y - 1 - k + sq, 3, 1);
        ctx.fillStyle = PAL.l; ctx.fillRect(x - 5, y - 4 + sq, 10, 1);
        ctx.fillStyle = PAL.L; ctx.fillRect(x - 4, y - 4 + sq, 4, 1);
      } else if (e.t === 'fan') {
        const d = e.dir;
        ctx.fillStyle = PAL['0']; ctx.fillRect(x - 4, y - 7, 8, 14);
        ctx.fillStyle = PAL['4']; ctx.fillRect(x - 3, y - 6, 6, 12);
        ctx.fillStyle = PAL['2']; ctx.fillRect(x - 1, y + 6, 2, 3);
        const ph = ((e.spin || 0) | 0) % 3;
        ctx.fillStyle = PAL['6'];
        for (let k = -5; k <= 5; k++) if (((k + 6 + ph) % 3) === 0) ctx.fillRect(x + d * 2, y + k, 1, 2);
        ctx.fillStyle = PAL.c; ctx.fillRect(x - d * 2, y - 1, 1, 2);
      } else if (e.t === 'wire') {
        const tip = e.tip || { x: e.x, y: e.y + 20 };
        const n = Math.ceil(Math.hypot(tip.x - e.x, tip.y - e.y));
        for (let k = 0; k <= n; k++) { const t = k / n; const sag = Math.sin(t * Math.PI) * 2; ctx.fillStyle = k % 4 === 0 ? PAL['3'] : PAL['1']; ctx.fillRect(Math.round(e.x + (tip.x - e.x) * t + sag), Math.round(e.y + (tip.y - e.y) * t), 1, 1); }
        ctx.fillStyle = PAL['0']; ctx.fillRect(Math.round(tip.x) - 2, Math.round(tip.y) - 1, 4, 4);
        ctx.fillStyle = PAL.a; ctx.fillRect(Math.round(tip.x) - 1, Math.round(tip.y), 2, 2);
        if (((now / 90) | 0) % 5 === 0) { ctx.fillStyle = PAL.Y; ctx.fillRect(Math.round(tip.x) + ((now / 30) & 3) - 2, Math.round(tip.y) + 3, 1, 2); }
      } else if (e.t === 'shards') {
        for (let k = 0; k < e.w; k += 3) { const hh = 2 + ((hash(k, e.x | 0) & 3)); ctx.fillStyle = PAL['0']; ctx.fillRect(x - e.w / 2 + k, y - hh - 1, 3, hh + 1); ctx.fillStyle = (k / 3) & 1 ? PAL.C : PAL['7']; ctx.fillRect(x - e.w / 2 + k + 1, y - hh, 1, hh); }
      } else if (e.t === 'secret') {
        if (e.open >= 2) {
          const bob = Math.round(Math.sin(now / 200) * 1.5);
          const s = WTP.sprites.PROJ.floppy;
          if (s) ctx.drawImage(s.cv, x - (s.w >> 1), y - (s.h >> 1) + bob);
          if (((now / 120) | 0) % 6 === 0) { ctx.fillStyle = PAL['7']; ctx.fillRect(x + 4, y - 5 + bob, 1, 1); }
        } else if (((now / 100 + e.x) | 0) % 37 === 0) { ctx.fillStyle = PAL.Y; ctx.fillRect(x, y, 1, 1); ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      }
    }
  }
  R.update = update; R.draw = draw; R.hit = hit; R.cellGone = cellGone; R.drawSlider = drawSlider; R.btnKind = btnKind;
  R.secretsLeft = () => ents.filter((e) => e.t === 'secret' && !e.found).length;
})();
