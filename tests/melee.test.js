const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; __wtd.step(30); WTP.game.stopLoop(); 1');
    await h.ev(`(() => { const W = WTP.world; for (let y = 60; y < 380; y += 4) for (let x = 40; x < 560; x += 4) { let solid = 0, air = 0; for (let q = 0; q < 16; q++) for (let r = 0; r < 6; r++) { if (W.mat[(y + q - 8) * W.w + x + 12 + r] === W.SOLID) solid++; } for (let q = -12; q < 4; q++) for (let r = -4; r < 8; r++) if (W.mat[(y + q) * W.w + x + r] !== W.SOLID) air++; if (solid > 80 && air > 180) { window.__spot = [x - 3, y - 8]; return; } } window.__spot = [150, 300]; })()`);
    const kat = await h.ev(`(() => {
      WTP.game.restart(); __wtd.step(3); __wtd.select('katana'); __wtd.tp(__spot[0], __spot[1]); __wtd.setAim(1, 0); __wtd.step(3);
      const idx = [], poses = []; let smears = 0, stars = 0;
      for (let k = 0; k < 3; k++) { __wtd.fire(true); __wtd.step(1); __wtd.fire(false); idx.push(WTP.weapons.st.kIdx); for (let q = 0; q < 17; q++) { __wtd.step(1); poses.push(WTP.weapons.swing()); smears = Math.max(smears, WTP.melee.smears.length); stars = Math.max(stars, WTP.melee.stars.length); } }
      return { idx, swingRange: Math.max(...poses) - Math.min(...poses), smears, stars };
    })()`);
    t('katana runs a 3 hit combo', JSON.stringify(kat.idx) === '[0,1,2]', JSON.stringify(kat));
    t('katana swings through wind-up and follow-through', kat.swingRange > 1.5);
    t('swings leave pixel smears and impact stars', kat.smears > 0 && kat.stars > 0);
    const ham = (frames) => h.ev(`(() => {
      WTP.game.restart(); __wtd.step(3); __wtd.select('hammer'); __wtd.tp(__spot[0], __spot[1]); __wtd.setAim(1, 0.2); __wtd.step(3);
      const W = WTP.world, d0 = W.destroyed; let maxC = 0, ring = 0, raised = 0;
      __wtd.fire(true); for (let k = 0; k < ${frames}; k++) { __wtd.tp(__spot[0], __spot[1]); __wtd.step(1); maxC = Math.max(maxC, WTP.weapons.st.hcharge || 0); raised = Math.min(raised, WTP.weapons.swing() * WTP.player.face); }
      __wtd.tp(__spot[0], __spot[1]); __wtd.fire(false); for (let k = 0; k < 30; k++) { __wtd.step(1); ring = Math.max(ring, WTP.feel.rings.length); }
      return { maxC, destroyed: W.destroyed - d0, ring, raised };
    })()`);
    const tap = await ham(2), slam = await ham(60);
    t('hammer tap still smashes', tap.destroyed > 0, JSON.stringify(tap));
    t('hammer hold winds up to a full charge', slam.maxC >= 0.69 && slam.raised < -1.5, JSON.stringify(slam));
    t('charged slam is bigger and sends a shockwave ring', slam.destroyed > tap.destroyed * 1.5 && slam.ring > 0);
    for (const id of ['glove', 'stamp']) {
      const r = await h.ev(`(() => {
        WTP.game.restart(); __wtd.step(3); __wtd.select('${id}'); __wtd.tp(__spot[0], __spot[1]); __wtd.setAim(1, 0); __wtd.step(3);
        const W = WTP.world, d0 = W.destroyed; __wtd.fire(true); __wtd.step(1); __wtd.fire(false);
        const early = W.destroyed - d0; for (let k = 0; k < 20; k++) __wtd.step(1);
        return { early, total: W.destroyed - d0 };
      })()`);
      t(`${id} hits after a wind-up`, r.early === 0 && r.total > 0, JSON.stringify(r));
    }
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'MELEE OK' : 'MELEE FAIL');
  process.exit(ok ? 0 : 1);
})();
