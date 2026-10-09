const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, typeof info === 'string' ? info : JSON.stringify(info)); if (!cond) ok = false; };
  // A clear arena: open air, a stone floor, a metal wall on the right and a ceiling
  const arena = (id) => h.ev(`(() => {
    WTP.game.restart(); WTP.game.stopLoop(); WTP.input.clear(); __wtd.select('${id}');
    const W = WTP.world, P = WTP.player, x0 = 200, y0 = 300;
    for (let y = y0 - 140; y < y0 + 30; y++) for (let x = x0 - 80; x < x0 + 90; x++) if (W.mat[y * W.w + x] !== 0) { W.mat[y * W.w + x] = 2; W.touch(y * W.w + x); }
    for (let x = x0 - 80; x < x0 + 90; x++) for (let y = y0; y < y0 + 6; y++) W.setCell(x, y, WTP.P32['5'], W.M.STONE, 0);
    for (let x = x0 - 80; x < x0 + 90; x++) for (let y = y0 - 140; y < y0 - 134; y++) W.setCell(x, y, WTP.P32['5'], W.M.STONE, 0);
    for (let y = y0 - 134; y < y0; y++) for (let x = x0 + 60; x < x0 + 70; x++) W.setCell(x, y, WTP.P32['5'], W.M.PAPER, 0);
    __wtd.tp(x0, y0 - 24); P.hp = P.maxHp = 999; __wtd.setAim(1, 0); __wtd.step(30);
    return P.ground;
  })()`);
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; WTP.save.settings.mode = "free"; true');

    // Whip: crack, sidearm, spin lash; the crack only hurts at the tip
    t('arena', await arena('whip'));
    const combo = await h.ev(`(() => {
      const F = WTP.flails, EN = WTP.enemies, P = WTP.player;
      const kinds = [], cracks0 = F.WH.cracks, swings = [];
      for (let k = 0; k < 3; k++) { __wtd.fire(true); __wtd.step(1); __wtd.fire(false); kinds.push(F.WH.move && F.WH.move.kind); for (let q = 0; q < 32; q++) { __wtd.step(1); swings.push(WTP.weapons.swing()); } }
      return { kinds, cracks: F.WH.cracks - cracks0, range: Math.max(...swings) - Math.min(...swings), pts: F.WH.r.pts.length };
    })()`);
    t('whip combo: crack, sidearm, spin lash', combo.kinds.join() === 'crack,side,spin' && combo.cracks === 3, combo);
    t('whip is a 16 to 20 segment rope with an animated arm', combo.pts >= 17 && combo.pts <= 21 && combo.range > 2, combo);
    await h.ev('__wtd.step(40); true');
    const tip = await h.ev(`(() => {
      const F = WTP.flails, EN = WTP.enemies, P = WTP.player;
      for (const e of EN.list) e.dead = true; __wtd.step(1);
      const pc = P.center();
      const near = EN.spawn('cursor', pc.x + 12, P.y + 7), far = EN.spawn('cursor', pc.x + 46, P.y + 7);
      for (const e of [near, far]) { e.spawnT = 0; e.update = null; }
      const h0 = [near.hp, far.hp];
      let crackAt = null;
      __wtd.fire(true); __wtd.step(1); __wtd.fire(false);
      for (let q = 0; q < 24; q++) { near.x = pc.x + 12; near.y = P.y + 7; near.vx = near.vy = 0; far.x = pc.x + 46; far.y = P.y + 7; far.vx = far.vy = 0; __wtd.step(1); if (F.WH.move && F.WH.move.cracked && !crackAt) crackAt = { tip: { ...F.whipTip() } }; }
      return { near: h0[0] - near.hp, far: h0[1] - far.hp, crackAt };
    })()`);
    t('crack damages at the tip only', tip.far >= 40 && tip.near < 10, tip);

    // Hold after a crack: wrap a chunk and pull it in
    await arena('whip');
    const wrap = await h.ev(`(() => {
      const W = WTP.world, P = WTP.player, F = WTP.flails, pc = P.center();
      const c = W.grabDisk(260, 288, 4); c.held = false; W.chunks.push(c); c.x = pc.x + 44; c.y = pc.y; c.vx = 0; c.vy = 0;
      const d0 = Math.abs(c.x - pc.x);
      __wtd.fire(true); let kind = null, minD = d0;
      for (let q = 0; q < 70; q++) { __wtd.step(1); if (F.WH.wrap) kind = kind || F.WH.wrap.kind; const cc = (F.WH.wrap && F.WH.wrap.c) || c; minD = Math.min(minD, Math.abs(cc.x - P.center().x)); }
      __wtd.fire(false); __wtd.step(1);
      return { kind, d0, minD, after: !!F.WH.wrap };
    })()`);
    t('hold wraps a chunk and pulls it in', wrap.kind === 'chunk' && wrap.minD < wrap.d0 - 15 && !wrap.after, wrap);

    // In the air under a ledge: wrap it and swing like a rope
    await arena('whip');
    const sw = await h.ev(`(() => {
      const P = WTP.player, F = WTP.flails;
      __wtd.tp(200, 182); __wtd.setAim(0.15, -1); P.vx = 0; P.vy = 0;
      __wtd.fire(true); let kind = null, maxD = 0, ground = false;
      for (let q = 0; q < 90; q++) { __wtd.step(1); if (F.WH.wrap) { kind = kind || F.WH.wrap.kind; if (F.WH.wrap.kind === 'ledge') maxD = Math.max(maxD, Math.hypot(P.center().x - F.WH.wrap.x, P.center().y - F.WH.wrap.y) - F.WH.wrap.len); } ground = ground || P.ground; }
      __wtd.fire(false);
      return { kind, overshoot: maxD, ground };
    })()`);
    t('swing from a ledge in the air', sw.kind === 'ledge' && sw.overshoot < 6, sw);

    // The rope drapes and catches on the world: no point rests inside solid cells
    await arena('whip');
    const drape = await h.ev(`(() => { const W = WTP.world, F = WTP.flails; __wtd.tp(252, 220); for (let q = 0; q < 90; q++) __wtd.step(1); return F.WH.r.pts.slice(1).filter((p) => W.solid(Math.floor(p.x), Math.floor(p.y))).length; })()`);
    t('rope never rests inside walls', drape <= 1, drape);

    // Wrecking ball: tap slams, holding swings then spins faster and wider
    await arena('wrecking');
    const slam = await h.ev(`(() => {
      const F = WTP.flails, W = WTP.world, P = WTP.player;
      __wtd.step(30); const d0 = W.lost(true); let minY = 1e9, maxY = -1e9, mode = null;
      __wtd.fire(true); __wtd.step(2); __wtd.fire(false);
      for (let q = 0; q < 30; q++) { __wtd.step(1); const b = F.ball(); mode = mode || F.WB.mode; minY = Math.min(minY, b.y); maxY = Math.max(maxY, b.y); }
      return { mode, lift: P.y - minY, drop: maxY - P.y, destroyed: W.lost(true) - d0 };
    })()`);
    t('tap is an overhead slam that smashes down', slam.mode === 'slam' && slam.lift > 15 && slam.destroyed > 0, slam);
    await arena('wrecking');
    const spin = await h.ev(`(() => {
      const F = WTP.flails, P = WTP.player; __wtd.setAim(-1, -0.2);
      __wtd.fire(true); const modes = new Set(); let early = 0, late = 0, rEarly = 0, rLate = 0;
      for (let q = 0; q < 240; q++) {
        __wtd.tp(200, 276); __wtd.step(1); modes.add(F.WB.mode);
        const b = F.ball(), pc = P.center(), r = Math.hypot(b.x - pc.x, b.y - pc.y);
        if (q > 70 && q < 90) { early += F.WB.lastSp; rEarly = Math.max(rEarly, r); }
        if (q > 210) { late += F.WB.lastSp; rLate = Math.max(rLate, r); }
      }
      __wtd.fire(false);
      return { modes: [...modes], early: Math.round(early / 19), late: Math.round(late / 29), rEarly: Math.round(rEarly), rLate: Math.round(rLate), lean: WTP.weapons.lean() };
    })()`);
    t('hold swings, then spins faster and wider', spin.modes.includes('swing') && spin.modes.includes('spin') && spin.late > spin.early && spin.rLate >= spin.rEarly, spin);

    // Speed is damage: a slow ball nudges, a fast one demolishes
    await arena('wrecking');
    const speed = await h.ev(`(() => {
      const F = WTP.flails, W = WTP.world;
      const hit = (v) => { WTP.game.restart(); WTP.game.stopLoop(); __wtd.select('wrecking'); __wtd.tp(200, 276); __wtd.step(5); F.WB.mode = 'flying'; F.WB.flyT = 0; const b = F.ball(); b.x = 247.5; b.y = 250; b.px = b.x - v / 60; b.py = b.y; for (const p of F.WB.r.pts) { if (p === b) continue; p.x = b.x - 3; p.y = b.y; p.px = p.x - v / 60; p.py = p.y; } for (let y = 230; y < 270; y++) for (let x = 252; x < 262; x++) W.setCell(x, y, WTP.P32['5'], W.M.PAPER, 0); const cnt = () => { let n = 0; for (let y = 230; y < 270; y++) for (let x = 252; x < 262; x++) if (W.mat[y * W.w + x] === W.SOLID) n++; return n; }; const before = cnt(); for (let q = 0; q < (v < 100 ? 4 : 10); q++) __wtd.step(1); return before - cnt(); };
      return { slow: hit(40), fast: hit(600) };
    })()`);
    t('slow ball nudges, fast ball demolishes', speed.slow === 0 && speed.fast > 20, speed);

    // Alt lets go: the ball flies with the chain trailing, fire reels it back
    await arena('wrecking');
    const fly = await h.ev(`(() => {
      const F = WTP.flails, P = WTP.player; __wtd.setAim(1, -0.6);
      __wtd.fire(true); for (let q = 0; q < 30; q++) { __wtd.tp(200, 276); __wtd.step(1); } __wtd.fire(false);
      __wtd.press('alt'); __wtd.step(1); const mode = F.WB.mode;
      for (let q = 0; q < 20; q++) __wtd.step(1);
      const b = F.ball(), hand = F.WB.r.pts[0], pc = P.center();
      const far = Math.hypot(b.x - pc.x, b.y - pc.y), chainFree = Math.hypot(hand.x - pc.x, hand.y - pc.y) > 8;
      __wtd.fire(true); __wtd.step(1); __wtd.fire(false); const reel = F.WB.mode;
      for (let q = 0; q < 90; q++) __wtd.step(1);
      return { mode, far: Math.round(far), chainFree, reel, back: F.WB.mode };
    })()`);
    t('alt releases the ball with the chain trailing, fire reels it back', fly.mode === 'flying' && fly.far > 40 && fly.chainFree && fly.reel === 'reel' && fly.back === 'idle', fly);

    // A fast ball buries itself; keep pulling to yank it out
    await arena('wrecking');
    const stuck = await h.ev(`(() => {
      const F = WTP.flails, W = WTP.world;
      for (let y = 200; y < 300; y++) for (let x = 240; x < 280; x++) W.setCell(x, y, WTP.P32['5'], W.M.METAL, 0);
      F.WB.mode = 'flying'; const b = F.ball(); b.x = 236; b.y = 250; b.px = b.x - 12; b.py = b.y; for (const p of F.WB.r.pts) { if (p === b) continue; p.x = b.x - 3; p.y = b.y; p.px = p.x - 12; p.py = p.y; }
      let wasStuck = false; for (let q = 0; q < 10 && !F.WB.stuck; q++) { __wtd.step(1); } wasStuck = !!F.WB.stuck;
      __wtd.fire(true); let freed = false; for (let q = 0; q < 120; q++) { __wtd.tp(205, 276); __wtd.step(1); if (wasStuck && !F.WB.stuck) { freed = true; break; } } __wtd.fire(false);
      return { wasStuck, freed };
    })()`);
    t('a fast ball gets stuck and is yanked out', stuck.wasStuck && stuck.freed, stuck);
    await h.ev('WTP.game.renderNow(); true');
    await h.shot('/tmp/wtd-shots/flails.png');
    const desc = await h.ev(`[WTP.weapons.BY.whip.does, WTP.weapons.BY.whip.altDoes, WTP.weapons.BY.wrecking.does, WTP.weapons.BY.wrecking.altDoes]`);
    t('updated descriptions and alt fires', desc.every(Boolean) && /tip/.test(desc[0]) && /spin/i.test(desc[2]), desc);
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'FLAILS OK' : 'FLAILS FAIL');
  process.exit(ok ? 0 : 1);
})();
