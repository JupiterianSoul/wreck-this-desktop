const path = require('path');
const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('__wtd.step(60); WTP.game.stopLoop(); WTP.player.maxHp = 999; WTP.player.hp = 999');
    const types = await h.ev('WTP.enemies.ORDER.slice()');
    console.log('enemy types', types.length, types.join(','));
    for (const t of types) {
      const r = await h.ev(`(() => { const b = WTD.errors.length; const e = WTP.enemies.spawnEdge('${t}', {}); WTP.player.hp = 999; __wtd.step(90); const alive = WTP.enemies.list.filter((x) => x.type === '${t}' && !x.dead); for (const x of alive) x.damage(99999, 'boom'); __wtd.step(30); return { spawned: !!e, err: WTD.errors.slice(b) }; })()`);
      ok(r.spawned && !r.err.length, `${t} ${r.err.slice(0, 1).join('')}`);
    }
    const dis = await h.ev('Object.keys(WTP.disasters.LIST)');
    for (const d of dis) {
      const r = await h.ev(`(() => { const b = WTD.errors.length; WTP.disasters.LIST['${d}'](); __wtd.step(240); return WTD.errors.slice(b); })()`);
      ok(!r.length, `disaster ${d} ${r.slice(0, 1).join('')}`);
    }
    await h.ev(`WTP.save.settings.mode = 'chaos'; WTP.game.restart(); WTP.game.stopLoop(); WTP.player.maxHp = 999; WTP.player.hp = 999`);
    const r = await h.ev(`(() => { const b = WTD.errors.length; for (let k = 0; k < 40; k++) { WTP.player.hp = 999; __wtd.step(60); } return { err: WTD.errors.slice(b), wave: WTP.game.run.wave, pct: __wtd.stats.pct, en: WTP.enemies.count() }; })()`);
    console.log('chaos', JSON.stringify({ wave: r.wave, pct: r.pct, en: r.en }));
    ok(!r.err.length && r.wave >= 1, 'chaos mode 40s ' + r.err.slice(0, 2).join(' | '));
    for (const md of ['survival', 'hardcore']) {
      await h.ev(`WTP.save.settings.mode = '${md}'; WTP.game.restart(); WTP.game.stopLoop(); WTP.player.maxHp = 999; WTP.player.hp = 999`);
      const r2 = await h.ev(`(() => { const b = WTD.errors.length; for (let k = 0; k < 30; k++) { WTP.player.hp = 999; __wtd.select(WTP.game.slots()[0]); __wtd.setAim(1, 0.2); __wtd.fire(true); __wtd.step(60); for (const e of WTP.enemies.list) e.damage(9999, 'boom'); } __wtd.fire(false); return { err: WTD.errors.slice(b), wave: WTP.game.run.wave, ammo: WTP.weapons.ammo(), pick: WTP.enemies.pickups.filter((p) => p.t === 'ammo').length }; })()`);
      console.log(md, JSON.stringify({ wave: r2.wave, ammoPickups: r2.pick, ammoCur: r2.ammo ? Object.values(r2.ammo).reduce((a, b) => a + b, 0) : null }));
      ok(!r2.err.length && r2.wave >= 2, `${md} mode ` + r2.err.slice(0, 2).join(' | '));
    }
    await h.ev(`WTP.save.settings.mode = 'free'`);
    await h.shot('/tmp/wtd-shots/chaos.png');
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();
  console.log(fail ? 'ENEMIES FAIL' : 'ENEMIES OK');
  process.exit(fail ? 1 : 0);
})();
