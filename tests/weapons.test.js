const { launch } = require('./harness.js');
(async () => {
  const fixture = process.argv[2] || 'tiled3';
  const only = process.argv[3] ? process.argv[3].split(',') : null;
  const h = await launch({ fixture });
  let fail = 0;
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true');
    await h.ev('__wtd.step(60); WTP.game.stopLoop()');
    const ids = only || await h.ev('__wtd.weapons()');
    const noAlt = await h.ev(`__wtd.weapons().filter((id) => !WTP.weapons.ALT[id])`);
    console.log('weapons', ids.length, 'without alt:', noAlt.join(',') || 'none');
    if (noAlt.length) { fail++; console.log('FAIL weapons without alt fire'); }
    let k = 0;
    for (const id of ids) {
      if (k++ % 12 === 0) await h.ev('WTP.game.restart(); WTP.game.stopLoop(); __wtd.step(30)');
      const r = await h.ev(`(() => {
        const before = WTD.errors.length;
        const W = WTP.world;
        const d0 = W.destroyed;
        WTP.player.spawn(300, 150); WTP.player.hp = 99; __wtd.tp(300, 150); __wtd.step(2);
        __wtd.select(${JSON.stringify(id)});
        WTP.weapons.st.cd = 0;
        __wtd.setAim(0.8, 0.5);
        WTP.player.gunPos = null;
        __wtd.fire(true); __wtd.step(24); __wtd.fire(false); __wtd.step(30);
        for (const k in (WTP.weapons.st.altCd || {})) WTP.weapons.st.altCd[k] = 0;
        __wtd.alt(); __wtd.step(60);
        WTP.player.carry && WTP.player.throwCarry(1, 0);
        return { err: WTD.errors.slice(before), dd: Math.round(W.destroyed - d0), shots: WTP.weapons.shots.length };
      })()`);
      const bad = r.err.length;
      if (bad) { fail++; console.log('FAIL', id, r.err.slice(0, 2).join(' | ')); }
      else console.log('ok  ', id.padEnd(12), 'destroyed', r.dd);
    }
    await h.ev('__wtd.step(300)');
    const errs = await h.ev('WTD.errors');
    if (errs.length) { fail++; console.log('FAIL late errors', errs.slice(-3)); }
  } catch (e) { fail++; console.log('FAIL', e.message); }
  for (const l of h.logs.filter((l) => /EXC|Error/.test(l)).slice(0, 10)) console.log('  log', l);
  await h.close();
  console.log(fail ? `WEAPONS FAIL (${fail})` : 'WEAPONS OK');
  process.exit(fail ? 1 : 0);
})();
