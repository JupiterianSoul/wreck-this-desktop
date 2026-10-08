(() => {
  const WTP = window.WTP;
  const WTD = window.WTD;
  const { P32, PAL, rand } = WTP;
  const Wd = WTP.world, FX = WTP.fx, PL = WTP.player, WP = WTP.weapons, EN = WTP.enemies, I = WTP.input, AU = WTP.audio, MD = WTP.modes, DR = WTP.deskRender;
  const STEP = 1 / 60;
  const G = { run: null, playing: false, paused: false };
  WTP.game = G;
  let cv, ctx, S = 4, PW = 0, PH = 0;
  const cam = { x: 0, y: 0 };
  let fullT = 0;
  let shakeT = 0, hitstopT = 0, timeScale = 1, slowT = 0, chromaT = 0, zoomT = 0, zoomX = 0, zoomY = 0;
  let raf = 0, last = 0, acc = 0, hudT = 0, pendingSlot = null, lastRender = 0;
  let frameMs = 16, slowFrames = 0, fastFrames = 0, quality = 2, workMs = 4, workMax = 4, maxQ = 2, capFps = 0;
  const aim = { x: 1, y: 0, ang: 0 };
  let loadout = [];
  const prevP = { x: 0, y: 0 };

  G.init = () => {
    cv = document.getElementById('cv');
    ctx = cv.getContext('2d', { alpha: true, desynchronized: true });
    I.bindCanvas(cv);
    window.addEventListener('keydown', (e) => {
      if (!G.playing || e.repeat) return;
      if (!G.paused && /^Digit[0-9]$/.test(e.code)) pendingSlot = Number(e.code.slice(5));
    });
  };
  const viewW = () => Wd.w, viewH = () => Wd.gh;
  G.view = () => ({ x: 0, y: 0, w: viewW(), h: viewH() });
  G.camTop = () => 0;
  G.mouseWorld = () => ({ x: (I.mouse.x * PW) / (window.innerWidth * S), y: (I.mouse.y * PH) / (window.innerHeight * S) });
  G.inPlayer = (x, y) => PL.inside(x, y);
  G.shake = (n) => { shakeT = Math.min(34, Math.max(shakeT, shakeT * 0.6 + n)); if (n >= 10) WTP.merges?.nudge?.(Math.min(1, n / 30)); };
  G.hitstop = (t) => { hitstopT = Math.max(hitstopT, t); };
  G.slowmo = (scale, dur) => { timeScale = scale; slowT = dur; G.stat('slowmos', 1); };
  G.killcam = (x, y, power) => {
    if (!WTP.save.settings.killcam || slowT > 0) return;
    G.slowmo(0.22, 0.5 + Math.min(0.6, power * 0.02));
    zoomT = 0.9; zoomX = x; zoomY = y;
    G.chroma(1);
  };
  G.forceFull = (t) => { fullT = Math.max(fullT, t); };
  G.chroma = (a) => { if (!WTP.save.settings.flashes) return; chromaT = Math.max(chromaT, 0.1 + a * 0.18); };
  G.label = (text, ms = 1200) => WTP.ui?.label?.(text, ms);
  G.announce = (text, tier = 2) => { WTP.ui?.announce?.(text, tier); AU.play('announce', tier); };
  G.event = (text, x, y, scale = 2) => { FX.pop(x, y, text, { scale, ramp: ['7', 'Y', 'y', 'a', 'o', 'e'], life: 1.3, vy: -18 }); if (text === 'TIMBER!' && G.run) G.run.timber = true; };
  G.allWeapons = () => true;
  G.startTimer = () => { if (G.run && !G.run.timerOn) G.run.timerOn = true; };
  G.stat = (k, n) => { if (!G.run) return; G.run.stats[k] = (G.run.stats[k] || 0) + n; };
  G.weaponUsed = (id, dt) => { if (!G.run) return; const u = G.run.stats.weaponUse = G.run.stats.weaponUse || {}; u[id] = (u[id] || 0) + (dt || 1); };
  G.ammoChanged = () => WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur);
  G.scrap = (n) => { if (G.run) G.run.bonusScrap += n; };
  G.bonus = (pts, x, y) => { if (!G.run) return; G.run.score += pts; FX.pop(x, y, `+${WTP.fmtInt(pts)}`, { scale: 1, ramp: ['Y', 'y', 'a'] }); };
  G.rocketJump = (h) => { if (G.run) G.run.rocketJump = Math.max(G.run.rocketJump || 0, h); if (h > 45) FX.pop(PL.x + 3, PL.y - 10, 'ROCKET JUMP!', { scale: 1, ramp: ['7', 'C', 'c'] }); };
  G.targetDown = (T) => {
    const run = G.run; if (!run) return;
    run.targetsDown = (run.targetsDown || 0) + 1;
    G.bonus(300, (T.x0 + T.x1) / 2, T.y0);
    AU.play('coin'); AU.play('combo', 6);
    G.shake(4);
  };
  G.enemyKilled = (e) => {
    const run = G.run; if (!run) return;
    run.kills = (run.kills || 0) + 1;
    G.bonus(e.T.score, e.x, e.y - 10);
    WTP.hardcore?.onKill?.(e);
    G.stat('kills', 1);
    if (e.T.boss) { run.bossKilled = true; G.announce('PROCESS TERMINATED!', 6); }
    G.comboBump(8);
  };
  G.playerDied = () => { if (G.run && !G.run.ended) setTimeout(() => { if (G.run && G.run.mode.respawn !== false) { PL.spawn(PL.x, -26); PL.hp = PL.maxHp; } else G.end('dead'); }, 1400); };

  const TIERS = [[10, 'NICE!'], [25, 'GREAT!'], [50, 'WRECKED!'], [100, 'DEVASTATING!'], [200, 'CATASTROPHIC!'], [350, 'UNSTOPPABLE!'], [500, 'SEGMENTATION FAULT!'], [750, 'KERNEL PANIC!'], [1000, 'DESKTOP DESTROYER!'], [1500, 'BLUE SCREEN!'], [2500, 'rm -rf /']];
  G.comboBump = (n) => {
    const run = G.run;
    if (!run || run.ended) return;
    run.combo += n; run.comboT = 1.6;
    if (run.combo > run.maxCombo) run.maxCombo = run.combo;
    for (let k = 0; k < TIERS.length; k++) {
      const [t, txt] = TIERS[k];
      if (run.combo >= t && run.comboShown < t) { run.comboShown = t; G.announce(txt, Math.min(8, k + 1)); if (k >= 3) G.shake(4); }
    }
  };
  G.scored = (n, x, y) => {
    const run = G.run;
    if (!run || run.ended) return;
    G.startTimer();
    if (n <= 0) return;
    G.comboBump(1 + Math.floor(n / 60));
    const mult = 1 + Math.min(9, Math.floor(run.combo / 15));
    if (mult > (run.mult || 1)) { run.comboPop = 1; AU.play('combo', mult); }
    run.score += n * mult;
    run.mult = mult;
    if (x >= 0 && n >= 80) FX.pop(x, y, `+${WTP.fmtInt(n * mult)}`, { scale: 1, ramp: n >= 400 ? ['7', 'Y', 'y', 'o'] : ['7', '6', '5'] });
    if (n >= 900 && x >= 0) G.killcam(x, y, n / 100);
  };

  function setLoadout(list) {
    loadout = list.map((id) => (id && WP.BY[id] ? id : null));
    if (!loadout.some(Boolean)) loadout = ['pistol', ...new Array(WTP.HOTBAR_N - 1).fill(null)];
    WP.select(loadout.find(Boolean));
    WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur);
  }
  G.loadout = () => loadout.filter(Boolean);
  G.slots = () => WTP.save.hotbar.map((id) => (id && WP.BY[id] ? id : null));
  G.available = () => WP.DEFS.map((d) => d.id);
  G.selectWeapon = (id, quiet) => {
    if (!id || !WP.BY[id]) { if (!quiet) AU.play('deny'); return false; }
    if (WP.st.cur !== id) {
      WP.select(id);
      if (!quiet) { AU.play('select'); WTP.ui?.weaponName?.(WP.BY[id]); }
    }
    WTP.ui?.hudWeapons?.(G.slots(), id);
    return true;
  };
  G.assignSlot = (slot, id) => {
    if (slot < 0 || slot >= WTP.HOTBAR_N) return false;
    const hb = WTP.save.hotbar;
    if (id) { const k = hb.indexOf(id); if (k >= 0) hb[k] = hb[slot] && k !== slot ? hb[slot] : null; }
    hb[slot] = id || null;
    WTP.persist();
    WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur);
    return true;
  };
  G.cycle = (d) => {
    let ring = G.slots().filter(Boolean);
    if (ring.length < 2) ring = G.available();
    let i = ring.indexOf(WP.st.cur);
    if (i < 0) i = d > 0 ? -1 : 0;
    i = (i + d + ring.length) % ring.length;
    G.selectWeapon(ring[i]);
  };
  G.slotKey = (n) => { const idx = n === 0 ? 9 : n - 1; const id = G.slots()[idx]; if (id) G.selectWeapon(id); else { G.label(`SLOT ${n} IS EMPTY, OPEN THE WHEEL (TAB) TO FILL IT`, 1400); AU.play('deny'); } };

  function resize() {
    const sz = DR.size();
    PW = sz.PW; PH = sz.PH; S = sz.CP;
    if (cv.width !== PW || cv.height !== PH) { cv.width = PW; cv.height = PH; }
  }
  G.resize = resize;

  G.start = (opts) => {
    G.init();
    resize();
    const bat = String(opts.session.battery || '');
    const pref = WTP.save.settings.quality;
    const saver = bat === 'saver' || bat === 'ultra' || bat === 'power-saver';
    maxQ = pref === 'low' ? 0 : pref === 'medium' ? 1 : pref === 'high' ? 2 : saver ? 1 : 2;
    capFps = pref === 'battery' || (pref === 'auto' && saver) ? 60 : 0;
    G.battery = saver;
    setQuality(maxQ);
    G.opts = opts;
    if (!WTP.save.hotbar.some(Boolean)) WTP.save.hotbar = WTP.progress.defaultHotbar().slice();
    G.prepare(opts);
    WTP.merges?.apply?.();
    WTD.post({ t: 'log', msg: `game started ${PW}x${PH} cell ${S} dpr ${window.devicePixelRatio} inner ${window.innerWidth}x${window.innerHeight} battery ${bat} q${maxQ} cap ${capFps}` });
  };
  G.prepare = (opts) => {
    const modeId = WTP.save.settings.mode && MD.MODES[WTP.save.settings.mode] ? WTP.save.settings.mode : 'free';
    const mode = MD.MODES[modeId];
    Wd.reset();
    WTP.structs.reset();
    WTP.hardcore?.stop?.();
    FX.clear(); WP.reset(); EN.reset(); WP.setAmmo(null);
    WTP.props.reset();
    const run = G.run = {
      opts, mode, modeId, params: {}, t: 0, timerOn: false, score: 0, combo: 0, comboT: 0, comboShown: 0, maxCombo: 0, mult: 1,
      stats: { letters: 0, explosions: 0, shots: 0, chunks: 0, glass: 0, burned: 0, iced: 0, painted: 0, kills: 0, jumps: 0, walljumps: 0, dashes: 0, portals: 0, throws: 0, bees: 0, eaten: 0, nukes: 0, distance: 0, slowmos: 0, windows: 0 },
      ended: false, bonusScrap: 0, allWeapons: true, hud: mode.hud, kills: 0, noHit: true, wave: 0, frame: 0, page: { id: 'desktop', site: 'desktop' }
    };
    setLoadout(WTP.save.hotbar.slice());
    PL.maxHp = 6;
    const sp = spawnPoint(opts);
    PL.spawn(sp.x - 3, sp.y);
    prevP.x = PL.x; prevP.y = PL.y;
    mode.setup(run);
    AU.music(mode.music);
    AU.muffle(false);
    WTP.ui?.hudSetup?.(run);
    G.playing = true; G.paused = false;
    timeScale = 1; slowT = 0; hitstopT = 0; shakeT = 0; chromaT = 0; zoomT = 0;
    I.enabled = true; I.clear(); I.fireLock = false;
    last = performance.now(); acc = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
    cv.focus({ preventScroll: true });
  };
  function spawnPoint(opts) {
    const regs = Wd.regions || [];
    const act = regs.find((r) => r.type === 'window' && r.address === opts.session.active) || regs.find((r) => r.type === 'window');
    const cx = act ? Math.round((act.x0 + act.x1) / 2) : Math.round(Wd.w / 2);
    const firstSolid = (x) => { for (let y = 0; y < Wd.gh; y++) for (let dx = -5; dx <= 5; dx++) if (Wd.solid(x + dx, y)) return y; return Wd.gh; };
    let best = cx, bs = -1;
    for (let d = 0; d < Wd.w / 2; d += 2) {
      for (const x of [cx + d, cx - d]) {
        if (x < 8 || x > Wd.w - 8) continue;
        const y = firstSolid(x);
        const score = Math.min(y, 40) * 4 - d * 0.35;
        if (y >= 22 && score > bs) { bs = score; best = x; }
      }
      if (bs > 120) break;
    }
    return { x: best, y: -26 };
  }
  G.restart = () => { if (!G.run) return; WTP.ui?.closeOverlays?.(); G.prepare(G.opts); };
  G.stopLoop = () => { G.playing = false; cancelAnimationFrame(raf); AU.stopLoops(); };
  G.pause = (on) => {
    if (!G.run || G.run.ended) return;
    G.paused = on;
    I.pointerFire = false;
    AU.muffle(on);
    if (on) AU.stopLoops();
    else { last = performance.now(); cv.focus({ preventScroll: true }); }
    WTP.ui?.pauseMenu?.(on);
  };
  G.quit = (why) => { G.stopLoop(); WTP.merges?.beforeQuit?.(); WTD.quit(why || 'quit'); };
  G.showFinish = (on) => WTP.ui?.showFinish?.(on);

  G.end = (reason) => {
    const run = G.run;
    if (!run || run.ended) return;
    run.ended = true; run.reason = reason;
    I.pointerFire = false; I.fireLock = false;
    AU.stopLoops();
    const pct = MD.pct();
    run.won = reason !== 'dead';
    run.grade = run.mode.grade(run);
    const v = run.mode.bestVal ? run.mode.bestVal(run) : null;
    const best = v != null && run.mode.bestKey ? WTP.setBest(run.mode.bestKey(run), v, run.mode.higher) : null;
    const s = WTP.save.stats;
    s.pixels += Wd.destroyed; s.time += run.t; s.runs++; s.bestCombo = Math.max(s.bestCombo, run.maxCombo);
    WTP.persist(true);
    PL.victory = run.won;
    AU.jingle(run.won ? 'win' : 'lose');
    AU.music(null);
    setTimeout(() => { if (G.run === run) { AU.muffle(true); WTP.ui?.results?.({ run, pct, best, rows: run.mode.rows(run) }); } }, 900);
  };

  function updateAim(dt) {
    const o = PL.center();
    const oy = PL.y + 7;
    let tx = null, ty = null;
    const setT = (x, y) => { const m = Math.hypot(x, y); if (m > 0.01) { tx = x / m; ty = y / m; } };
    const st = WTP.save.settings;
    const src = I.aim.src;
    const ka = I.keyAim();
    if (ka) setT(ka[0], ka[1]);
    else if (I.gp && Math.hypot(I.gpAxes[2], I.gpAxes[3]) > 0.3) setT(I.gpAxes[2], I.gpAxes[3]);
    else if (src === 'mouse' && I.mouse.in) { const m = G.mouseWorld(); setT(m.x - o.x, m.y - oy); }
    else if (src === 'test') { tx = aim.x; ty = aim.y; }
    else if (src === 'keys') { tx = aim.x; ty = aim.y; }
    else {
      const e = EN.nearest(o.x, oy, 160);
      if (e) setT(e.x - o.x, e.y - oy); else setT(PL.face, 0);
    }
    const assist = st.autoAim | 0;
    if (tx != null && assist) {
      const cone = assist >= 2 ? 0.55 : 0.28;
      const e = EN.nearest(o.x, oy, assist >= 2 ? 220 : 170, Math.atan2(ty, tx), cone);
      if (e) { const ex = e.x - o.x, ey = e.y - oy, m = Math.hypot(ex, ey) || 1; const k = assist >= 2 ? 0.8 : 0.45; setT(tx * (1 - k) + (ex / m) * k, ty * (1 - k) + (ey / m) * k); }
      else if (assist >= 2 && src !== 'mouse') {
        const r = Wd.nearestSolid(o.x + tx * 40, oy + ty * 40, 24);
        if (r) { const ex = r[0] - o.x, ey = r[1] - oy, m = Math.hypot(ex, ey) || 1; setT(tx * 0.6 + (ex / m) * 0.4, ty * 0.6 + (ey / m) * 0.4); }
      }
    }
    if (tx != null) {
      const want = Math.atan2(ty, tx);
      const smooth = st.aimSmooth || 0;
      if (src === 'mouse' && !ka && !smooth) aim.ang = want;
      else { let da = want - aim.ang; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; aim.ang += da * Math.min(1, dt * (src === 'mouse' ? 30 * (1 - smooth * 0.8) : ka ? 14 : 12)); }
      aim.x = Math.cos(aim.ang); aim.y = Math.sin(aim.ang);
    }
    if (Math.abs(aim.x) > 0.08 && PL.dashT <= 0) PL.face = aim.x > 0 ? 1 : -1;
    I.autoFire = false;
    if (st.autoFire && !PL.dead) {
      const e = EN.nearest(o.x, oy, 200, aim.ang, 0.22);
      if (e) I.autoFire = true;
      else { const r = Wd.raycast(o.x, oy, aim.x, aim.y, 70, 1); if (r.hit && I.firing()) I.autoFire = true; }
    }
  }

  function step(dt) {
    const run = G.run;
    if (I.take('pause')) { G.pause(true); return; }
    if (I.take('reset')) { G.restart(); return; }
    if (I.take('mute')) WTP.ui?.toggleMute?.();
    if (I.take('fps')) { WTP.save.settings.fps = !WTP.save.settings.fps; WTP.persist(); }
    if (WTP.ui?.wheelOpen?.()) { if (I.take('wheel') && !I.gp) WTP.ui.wheel(false); }
    else {
      if (I.take('wheel')) WTP.ui?.wheel?.(true);
      if (I.take('next')) G.cycle(1);
      if (I.take('prev')) G.cycle(-1);
    }
    if (I.take('next_level')) WTP.ui?.nextLevel?.();
    prevP.x = PL.x; prevP.y = PL.y;
    for (const c of Wd.chunks) { c.px = c.x; c.py = c.y; c.pa = c.a; }
    updateAim(dt);
    const ended = run.ended;
    PL.update(dt, ended);
    { const bx0 = PL.x + PL.w / 2, by0 = PL.y + 7; if (!PL.gunPos || Math.hypot(PL.gunPos.x - bx0, PL.gunPos.y - by0) > 14) { PL.gunPos = { x: bx0 + aim.x * 4, y: by0 + aim.y * 4 }; PL.muzzle = { x: bx0 + aim.x * 9, y: by0 + aim.y * 9 }; } }
    const hand = PL.gunPos || PL.gun();
    let gun = PL.muzzle || hand;
    const bx = PL.x + PL.w / 2, by = PL.y + 7;
    const gdx = gun.x - bx, gdy = gun.y - by, gd = Math.hypot(gdx, gdy);
    if (gd > 0.01) for (let t = 0; t <= gd; t += 0.5) { const x = bx + (gdx * t) / gd, y = by + (gdy * t) / gd; if (Wd.solid(Math.floor(x), Math.floor(y))) { gun = { x, y }; break; } }
    const wheelOpen = WTP.ui?.wheelOpen?.();
    let want = !ended && !wheelOpen && !PL.dead && !PL.ragdoll && I.wantFire();
    if (want && PL.carry) { PL.throwCarry(aim.x, aim.y); I.pointerFire = false; want = false; }
    const alt = !ended && I.take('alt');
    if (!ended && !PL.dead && I.take('melee')) WP.melee({ x: bx, y: PL.y + PL.h / 2, ax: aim.x, ay: aim.y });
    WP.update(dt, want, alt, { x: gun.x, y: gun.y, hx: hand.x, hy: hand.y, ax: aim.x, ay: aim.y, bx, by });
    WTP.props.update(dt);
    EN.update(dt);
    Wd.updateBurn();
    Wd.updateIce();
    Wd.updateChunks(dt);
    WTP.structs.update(dt);
    Wd.updateSand();
    if (quality >= 2 || (run.frame & 1)) Wd.updateSand();
    FX.update(dt);
    if (!ended) {
      if (run.timerOn) run.t += dt;
      run.comboT -= dt;
      run.comboPop = Math.max(0, (run.comboPop || 0) - dt * 3);
      if (run.comboT <= 0 && run.combo) { run.combo = 0; run.comboShown = 0; run.mult = 1; }
      run.mode.tick(run, dt);
      if (PL.y > Wd.h + 30) { PL.spawn(PL.x, -26); prevP.x = PL.x; prevP.y = PL.y; }
    }
    run.frame++;
  }

  function loop(t) {
    if (!G.playing) return;
    raf = requestAnimationFrame(loop);
    if (capFps && t - lastRender < 1000 / capFps - 2) return;
    lastRender = t;
    const t0 = performance.now();
    const dt = Math.max(0, Math.min(0.1, (t - last) / 1000));
    last = t;
    frameMs = frameMs * 0.92 + dt * 1000 * 0.08;
    adapt();
    I.pollPad();
    if (WTP.ui?.wheelOpen?.()) WTP.ui.padWheel?.();
    if (!G.paused && G.run) {
      if (pendingSlot != null) { G.slotKey(pendingSlot); pendingSlot = null; }
      if (slowT > 0) { slowT -= dt; timeScale = slowT <= 0 ? 1 : Math.min(1, timeScale + dt * 0.25); }
      const wheelSlow = WTP.ui?.wheelOpen?.() ? 0.12 : 1;
      if (hitstopT > 0) hitstopT -= dt;
      else {
        acc += dt * timeScale * wheelSlow;
        let n = 0;
        while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n++; }
        if (n === 5) acc = 0;
      }
      shakeT *= Math.pow(0.004, dt);
      chromaT = Math.max(0, chromaT - dt);
      zoomT = Math.max(0, zoomT - dt);
      fullT = Math.max(0, fullT - dt);
    } else if (G.paused) WTP.ui?.padNav?.();
    render(dt, Math.min(1, acc / STEP));
    const work = performance.now() - t0;
    workMs = workMs * 0.95 + work * 0.05;
    workMax = Math.max(workMax * 0.995, work);
    hudT -= dt;
    if (hudT <= 0 && G.run) { hudT = 0.1; WTP.ui?.hud?.(G.run); WTP.ui?.tick?.(); }
  }
  function adapt() {
    if (!WTP.save.settings.adaptive) { if (quality !== maxQ) setQuality(maxQ); return; }
    const budget = capFps ? 21 : 9;
    if (workMs > budget || frameMs > (capFps ? 22 : 18)) { slowFrames++; fastFrames = 0; if (slowFrames > 90 && quality > 0) { setQuality(quality - 1); slowFrames = 0; } }
    else if (workMs < budget * 0.55) { fastFrames++; slowFrames = 0; if (fastFrames > 400 && quality < maxQ) { setQuality(quality + 1); fastFrames = 0; } }
    if (quality > maxQ) setQuality(maxQ);
  }
  G.applyQuality = () => {
    const pref = WTP.save.settings.quality;
    const saver = G.battery;
    maxQ = pref === 'low' ? 0 : pref === 'medium' ? 1 : pref === 'high' ? 2 : pref === 'battery' ? 1 : saver ? 1 : 2;
    capFps = pref === 'battery' || (pref === 'auto' && saver) ? 60 : 0;
    setQuality(maxQ);
  };
  G.applyFx = () => setQuality(quality);
  function setQuality(q) {
    quality = q;
    Wd.quality = q;
    FX.cap = Math.round([2500, 5000, 8500][q] * (WTP.save.settings.fxAmount ?? 1));
    Wd.chunkLimit = [30, 50, 80][q];
    Wd.componentLimit = [500, 750, 1000][q];
  }
  G.quality = () => quality;
  G.frameMs = () => frameMs;

  function render(dt, alpha) {
    if (!G.run) return;
    DR.flush();
    Wd.flush();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, PW, PH);
    const intensity = WTP.save.settings.shake;
    const sh = shakeT * intensity;
    const sx = sh > 0.4 ? Math.round(rand(-sh, sh) * 0.5 * S) : 0, sy = sh > 0.4 ? Math.round(rand(-sh, sh) * 0.5 * S) : 0;
    let zs = 1, zx = 0, zy = 0;
    if (zoomT > 0) {
      const k = Math.sin(Math.min(1, zoomT / 0.9) * Math.PI);
      zs = 1 + 0.06 * k;
      zx = zoomX * S * (1 - zs); zy = zoomY * S * (1 - zs);
    }
    ctx.setTransform(zs, 0, 0, zs, sx + zx, sy + zy);
    DR.drawLevel(ctx, sx !== 0 || sy !== 0 || zs !== 1 || fullT > 0 || DR.xray);
    DR.drawVoid(ctx, dt, PW, PH);
    ctx.setTransform(S * zs, 0, 0, S * zs, sx + zx, sy + zy);
    ctx.drawImage(Wd.levelCv, 0, 0, Wd.w, Wd.gh, 0, 0, Wd.w, Wd.gh);
    ctx.setTransform(zs, 0, 0, zs, sx + zx, sy + zy);
    const q = quality;
    for (const c of Wd.chunks) {
      const ox = c.x, oy = c.y, oa = c.a;
      if (c.px != null) { c.x = c.px + (ox - c.px) * alpha; c.y = c.py + (oy - c.py) * alpha; c.a = c.pa + (oa - c.pa) * alpha; }
      DR.drawChunk(ctx, c, q >= 1 && c.n > 20);
      c.x = ox; c.y = oy; c.a = oa;
    }
    const held = WP.heldChunk?.();
    if (held) DR.drawChunk(ctx, held, false);
    WTP.structs.draw(ctx, alpha);
    ctx.setTransform(S * zs, 0, 0, S * zs, sx + zx, sy + zy);
    const fxr = FX.render(ctx, cam, viewW(), viewH());
    ctx.drawImage(fxr.back, fxr.ox, fxr.oy);
    WTP.props.draw(ctx);
    EN.draw(ctx);
    WP.draw(ctx);
    WTP.gadgets.drawWorld(ctx);
    const cur = WP.current();
    const rx = PL.x, ry = PL.y;
    PL.x = prevP.x + (rx - prevP.x) * alpha; PL.y = prevP.y + (ry - prevP.y) * alpha;
    PL.draw(ctx, dt, G.run.ended && G.run.won ? null : cur.sprite, aim, { swing: WP.swing(), oneHand: cur.melee || cur.throw || cur.cat === 'side' });
    PL.x = rx; PL.y = ry;
    if (PL.carry) { ctx.setTransform(zs, 0, 0, zs, sx + zx, sy + zy); DR.drawChunk(ctx, PL.carry, true); ctx.setTransform(S * zs, 0, 0, S * zs, sx + zx, sy + zy); }
    if (PL.muzzle && !G.run.ended) {
      if (cur.charge && WP.st.charge > 0) { const k = Math.min(1, WP.st.charge / cur.charge); ctx.fillStyle = k >= 1 ? PAL['7'] : PAL.C; const s2 = 1 + Math.round(k * 2); ctx.fillRect(Math.round(PL.muzzle.x) - (s2 >> 1), Math.round(PL.muzzle.y) - (s2 >> 1), s2, s2); }
      if (WP.st.reload > 0) WTP.font.draw(ctx, 'RELOAD', Math.round(PL.x + 3), Math.round(PL.y - 14), { align: 'center', color: 'y', outline: '0' });
    }
    FX.drawAnims(ctx, 1);
    WTP.booms.draw(ctx, dt * (G.paused ? 0 : timeScale));
    ctx.drawImage(fxr.front, fxr.ox, fxr.oy);
    for (const p of FX.pops) {
      const k = p.t / p.life;
      const sc = Math.max(1, Math.round(p.scale * (k < 0.1 ? 0.6 + k * 4 : 1)));
      if (k > 0.8 && !WTP.sprites.dith(Math.round(p.x), Math.round(p.y), (1 - k) * 5)) continue;
      WTP.font.draw(ctx, p.text, Math.round(p.x), Math.round(p.y + p.vy * p.t * (1 - k * 0.5)), { align: 'center', ramp: p.ramp || ['7'], outline: '0', scale: sc });
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (FX.flashA > 0.01) { ctx.globalAlpha = Math.min(0.85, FX.flashA); ctx.fillStyle = FX.flashC; ctx.fillRect(0, 0, PW, PH); ctx.globalAlpha = 1; }
    if (PL.hp <= 2 && G.run.hud?.hp && !G.run.ended) { const a = 0.2 + Math.sin(performance.now() / 160) * 0.08; ctx.globalAlpha = a; ctx.strokeStyle = PAL.e; ctx.lineWidth = 24; ctx.strokeRect(0, 0, PW, PH); ctx.globalAlpha = 1; }
    drawCrosshair();
    if (WTP.save.settings.fps) drawFps();
    const f = chromaT > 0 ? `drop-shadow(${Math.round(chromaT * 30)}px 0 0 rgba(255,95,162,.55)) drop-shadow(-${Math.round(chromaT * 30)}px 0 0 rgba(143,227,255,.55))` : '';
    if (cv.style.filter !== f) cv.style.filter = f;
    if (!G.shownCanvas) { G.shownCanvas = true; cv.style.visibility = 'visible'; requestAnimationFrame(() => { document.getElementById('shot').style.display = 'none'; }); }
  }
  function drawFps() {
    const txt = `${Math.round(1000 / Math.max(1, frameMs))} FPS  ${workMs.toFixed(1)} MS  Q${quality}${capFps ? ' CAP' + capFps : ''}  CH ${Wd.chunks.length}  FX ${FX.np}  BURN ${Wd.burning.length}`;
    WTP.font.draw(ctx, txt, 16, PH - 40, { color: 'l', outline: '0', scale: 3 });
  }
  function drawCrosshair() {
    if (G.run.ended || G.paused || PL.dead) return;
    let x, y;
    if (I.aim.src === 'mouse' && I.mouse.in) { x = Math.round((I.mouse.x * PW) / window.innerWidth); y = Math.round((I.mouse.y * PH) / window.innerHeight); }
    else { const m = PL.muzzle || PL.center(); const d = 46; x = Math.round((m.x + aim.x * d) * S); y = Math.round((m.y + aim.y * d) * S); }
    const fire = I.wantFire();
    const th = WTP.deskTheme || {};
    const c = fire ? (th.yellow || '#ffe066') : (th.accent || '#ffffff');
    const big = WTP.save.settings.bigCross ? 1.8 : 1;
    const g = (fire ? 5 : 8) * big, L = 9 * big;
    ctx.lineWidth = 6 * Math.sqrt(big); ctx.strokeStyle = 'rgba(0,0,0,.65)';
    ctx.beginPath();
    ctx.moveTo(x - g - L, y); ctx.lineTo(x - g, y); ctx.moveTo(x + g, y); ctx.lineTo(x + g + L, y);
    ctx.moveTo(x, y - g - L); ctx.lineTo(x, y - g); ctx.moveTo(x, y + g); ctx.lineTo(x, y + g + L);
    ctx.stroke();
    ctx.lineWidth = 2.5 * Math.sqrt(big); ctx.strokeStyle = c;
    ctx.stroke();
    ctx.fillStyle = c; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
  }

  G.renderNow = (dt = 0.016) => render(dt, 1);
  G.aim = aim;
  G.cam = cam;
  G.scale = () => S;

  window.__wtd = {
    get stats() { const r = G.run; return { W: Wd.w, H: Wd.gh, total: Wd.total, destroyed: Wd.destroyed, pct: MD.pct(), score: r?.score, t: r?.t, parts: FX.np, chunks: Wd.chunks.length, burning: Wd.burning.length, rubble: Wd.rubbleN, shots: WP.shots.length, weapon: WP.st.cur, ended: r?.ended, grade: r?.grade, enemies: EN.count(), hp: PL.hp, quality, frameMs, workMs, workMax, S, P: { x: PL.x, y: PL.y, ground: PL.ground }, errors: WTD.errors.length }; },
    select: (id) => G.selectWeapon(id, true),
    fire: (on) => { I.fireLock = on; },
    alt: () => I.press('alt'),
    setAim: (x, y) => { const m = Math.hypot(x, y) || 1; aim.x = x / m; aim.y = y / m; aim.ang = Math.atan2(aim.y, aim.x); I.aim.src = 'test'; },
    tp: (x, y) => { PL.x = x; PL.y = y; PL.vx = 0; PL.vy = 0; prevP.x = x; prevP.y = y; },
    explode: (x, y, r) => WP.explode(x, y, r),
    end: (r) => G.end(r),
    step: (n = 1) => { for (let k = 0; k < n; k++) step(STEP); },
    weapons: () => WP.DEFS.map((d) => d.id),
    press: (a) => I.press(a)
  };
})();
