const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d !== undefined ? JSON.stringify(d) : ''); } else console.log('ok  ', m, d !== undefined ? JSON.stringify(d) : ''); };
  // Fresh run with the given gadgets; the player stands on open ground with room above, metal wall to the right and a ceiling
  const fresh = (mode, move, tool) => h.ev(`(() => {
    WTP.save.settings.mode = '${mode}'; WTP.save.gadgetMove = '${move}'; WTP.save.gadgetTool = '${tool}';
    WTP.game.restart(); WTP.game.stopLoop(); WTP.input.clear(); WTP.gadgets.reset();
    const W = WTP.world, P = WTP.player, x0 = 200, y0 = 300;
    for (let y = y0 - 140; y < y0 + 30; y++) for (let x = x0 - 60; x < x0 + 60; x++) if (W.mat[y * W.w + x] !== 0) { W.mat[y * W.w + x] = 2; W.touch(y * W.w + x); }
    for (let x = x0 - 60; x < x0 + 60; x++) for (let y = y0; y < y0 + 6; y++) W.setCell(x, y, WTP.P32['5'], W.M.STONE, 0);
    for (let x = x0 - 60; x < x0 + 60; x++) for (let y = y0 - 140; y < y0 - 134; y++) W.setCell(x, y, WTP.P32['5'], W.M.METAL, 0);
    for (let y = y0 - 140; y < y0; y++) for (let x = x0 + 40; x < x0 + 46; x++) W.setCell(x, y, WTP.P32['5'], W.M.METAL, 0);
    __wtd.tp(x0, y0 - 30); P.hp = P.maxHp = 999; __wtd.step(40);
    window.__k = (c, on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: c, bubbles: true }));
    return { ground: P.ground, y: P.y };
  })()`);
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; true');

    // Jetpack: hold Space once both jumps are used
    let f = await fresh('free', 'jetpack', 'grapple');
    ok(f.ground, 'test ground is solid', f);
    const jet = await h.ev(`(() => { const P = WTP.player, GD = WTP.gadgets; __k('Space', 1); __wtd.step(6); __k('Space', 0); __wtd.step(10); const before = GD.st.jet; __k('Space', 1); let seen = false, minVy = 0; for (let k = 0; k < 50; k++) { __wtd.step(1); seen = seen || GD.st.jet; } __k('Space', 0); return { before, seen, fuel: GD.st.fuel, jumps: P.jumps }; })()`);
    ok(!jet.before && jet.seen && jet.fuel < 0.9, 'jetpack fires on held jump after the jumps', jet);

    // Glider: hold Space while falling
    await fresh('free', 'glider', 'grapple');
    const gl = await h.ev(`(() => { const P = WTP.player, GD = WTP.gadgets; __k('Space', 1); let maxVy = -1e9, glided = false; for (let k = 0; k < 90; k++) { __wtd.step(1); if (GD.st.gliding) { glided = true; maxVy = Math.max(maxVy, P.vy); } } __k('Space', 0); return { glided, maxVy }; })()`);
    ok(gl.glided && gl.maxVy <= 45, 'glider slows the fall', gl);

    // Wall claws: cling by pushing into the wall, climb with jump held
    await fresh('free', 'claws', 'grapple');
    const cl = await h.ev(`(() => {
      const P = WTP.player, GD = WTP.gadgets; __wtd.tp(234 - P.w, 230); __wtd.step(1);
      __k('KeyD', 1); for (let k = 0; k < 20; k++) __wtd.step(1);
      const cling = { c: GD.st.cling, vy: P.vy, y: P.y };
      __k('Space', 1); for (let k = 0; k < 20; k++) __wtd.step(1); __k('Space', 0); __k('KeyD', 0);
      return { cling, climbed: cling.y - P.y };
    })()`);
    ok(cl.cling.c === 1 && Math.abs(cl.cling.vy) < 5 && cl.climbed > 8, 'claws cling and climb', cl);

    // Boots: Down in the air starts a ground pound
    await fresh('free', 'boots', 'grapple');
    const bo = await h.ev(`(() => { const GD = WTP.gadgets; __k('Space', 1); __wtd.step(8); __k('Space', 0); __k('KeyS', 1); __wtd.step(2); const p = GD.st.pound; __k('KeyS', 0); for (let k = 0; k < 60; k++) __wtd.step(1); return { p, after: GD.st.pound, extra: WTP.player.extraJumps }; })()`);
    ok(bo.p && !bo.after && bo.extra === 1, 'boots: extra jump and ground pound on down', bo);

    // Grapple: hold to fire and swing, release to drop
    await fresh('free', 'boots', 'grapple');
    const gr = await h.ev(`(() => { const GD = WTP.gadgets; __wtd.setAim(0.2, -1); __k('KeyQ', 1); for (let k = 0; k < 20; k++) __wtd.step(1); const on = !!GD.st.hook?.on; __k('KeyQ', 0); __wtd.step(1); return { on, after: !!GD.st.hook }; })()`);
    ok(gr.on && !gr.after, 'grapple holds on while the key is down', gr);

    // Blink: gadget key and double tap
    await fresh('free', 'boots', 'blink');
    const bl = await h.ev(`(() => { const P = WTP.player, GD = WTP.gadgets; __wtd.setAim(-1, 0); const x0 = P.x; __k('KeyQ', 1); __wtd.step(1); __k('KeyQ', 0); const d1 = x0 - P.x; for (let k = 0; k < 90; k++) __wtd.step(1); const x1 = P.x; __k('KeyD', 1); __wtd.step(1); __k('KeyD', 0); __wtd.step(3); __k('KeyD', 1); __wtd.step(1); __k('KeyD', 0); return { d1, d2: P.x - x1 }; })()`);
    ok(bl.d1 > 30 && bl.d2 > 30, 'blink on key and on double tap', bl);

    // Pads: three at a time
    await fresh('free', 'boots', 'pads');
    const pd = await h.ev(`(() => { for (let k = 0; k < 4; k++) { __k('KeyQ', 1); __wtd.step(1); __k('KeyQ', 0); __wtd.step(2); } return { n: WTP.gadgets.st.pads.length, charges: WTP.gadgets.hudInfo().tool.charges }; })()`);
    ok(pd.n === 3 && pd.charges === 0, 'bounce pads cap at three', pd);

    // Shockwave throws enemies back
    await fresh('free', 'boots', 'shock');
    const sh = await h.ev(`(() => { const P = WTP.player, EN = WTP.enemies; const e = EN.spawn('ad', P.x + P.w / 2 + 26, P.y + 6); e.spawnT = 0; const hp = e.hp; __k('KeyQ', 1); __wtd.step(1); __k('KeyQ', 0); return { vx: e.vx, hurt: hp - e.hp, cd: WTP.gadgets.cooldown(), vy: P.vy }; })()`);
    ok(sh.vx > 100 && sh.hurt > 0 && sh.cd > 2 && sh.vy < -200, 'shockwave pushes, hurts and launches', sh);

    // Hookshot Pull rips a piece of wall toward you
    await fresh('free', 'boots', 'hookpull');
    const hp = await h.ev(`(() => { const P = WTP.player, W = WTP.world; __wtd.tp(215, 270); __wtd.step(20); __wtd.setAim(1, 0); const n0 = W.chunks.length; __k('KeyQ', 1); __wtd.step(1); __k('KeyQ', 0); let got = null, dist = 1e9, start = null; for (let k = 0; k < 30; k++) { __wtd.step(1); got = got || WTP.gadgets.st.pull?.back?.chunk; if (got) { start = start ?? Math.abs(got.x - (P.x + P.w / 2)); dist = Math.min(dist, Math.abs(got.x - (P.x + P.w / 2))); } } return { got: !!got, start, dist }; })()`);
    ok(hp.got && hp.dist < 25, 'hookshot pull yanks a chunk out of the wall', hp);

    // Bubble shield: wave modes only
    await fresh('free', 'boots', 'shield');
    const s1 = await h.ev(`(() => { __k('KeyQ', 1); __wtd.step(1); __k('KeyQ', 0); return { t: WTP.gadgets.st.shieldT, off: WTP.gadgets.hudInfo().tool.off }; })()`);
    await fresh('survival', 'boots', 'shield');
    const s2 = await h.ev(`(() => { __k('KeyQ', 1); __wtd.step(1); __k('KeyQ', 0); return { t: WTP.gadgets.st.shieldT, ifr: WTP.player.iframes }; })()`);
    ok(s1.t === 0 && s1.off && s2.t > 2 && s2.ifr > 2, 'bubble shield works in wave modes only', { s1, s2 });

    // Slow time
    await fresh('free', 'boots', 'slowtime');
    const sl = await h.ev(`(() => { __k('KeyQ', 1); __wtd.step(1); __k('KeyQ', 0); return { slow: WTP.game.fxState().slow, cd: WTP.gadgets.cooldown() }; })()`);
    ok(sl.slow > 1.5 && sl.cd > 20, 'slow time triggers bullet time', sl);

    // Cycle key, HUD card, wheel rows
    const cy = await h.ev(`(() => { const t0 = WTP.gadgets.toolId(); __k('KeyC', 1); __wtd.step(1); __k('KeyC', 0); WTP.ui.hud(WTP.game.run); return { t0, t1: WTP.gadgets.toolId(), saved: WTP.save.gadgetTool, card: document.querySelector('#hGadT').dataset.g }; })()`);
    ok(cy.t1 !== cy.t0 && cy.saved === cy.t1 && cy.card === cy.t1, 'cycle key changes the tool and the HUD card follows', cy);
    const wh = await h.ev(`(() => { WTP.game.restart(); WTP.ui.wheel(true); const r = { move: document.querySelectorAll('#hGads .gad').length, sep: !!document.querySelector('#hGads .gsep') }; return r; })()`);
    await h.shot('/tmp/wtd-shots/gadget-wheel.png');
    await h.ev('WTP.ui.wheel(false); true');
    ok(wh.move === 11 && wh.sep, 'wheel shows movement and tool rows', wh);

    // No page wording left
    const words = await h.ev(`[...WTP.gadgets.DEFS.map((d) => d.tip), ...['magnet', 'blackhole', 'cutter'].flatMap((id) => [WTP.weapons.BY[id].does, WTP.weapons.BY[id].tip]), WTP.weapons.CATS.find((c) => c.id === 'gadget').name].filter((t) => /page|gizmo/i.test(t || ''))`);
    ok(!words.length, 'no page wording in gadgets and tools', words);
    ok(!(await h.ev('WTD.errors.length')), 'no page errors', await h.ev('WTD.errors.slice(0, 3)'));
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();

  // Old saves: one gadget pick becomes the matching slot
  for (const [old, key, want] of [['jetpack', 'gadgetMove', 'jetpack'], ['blast', 'gadgetTool', 'shock']]) {
    const o = await launch({ fixture: process.argv[2] || 'tiled3', save: { 'wtd-save': { v: 4, hotbar: [], gadget: old, gadgets: { boots: true, [old]: true } } } });
    try {
      await o.wait('window.WTD && WTD.ready', 30000);
      const r = await o.ev(`({ v: WTP.save['${key}'], legacy: 'gadget' in WTP.save || 'gadgets' in WTP.save })`);
      ok(r.v === want && !r.legacy, `old gadget ${old} migrates`, r);
    } catch (e) { fail++; console.log('FAIL', e.message); }
    await o.close();
  }
  console.log(fail ? 'GADGETS FAIL' : 'GADGETS OK');
  process.exit(fail ? 1 : 0);
})();
