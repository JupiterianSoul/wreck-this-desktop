const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; __wtd.step(30); WTP.game.stopLoop(); 1');
    const keys = (id, hold, after) => h.ev(`(() => {
      WTP.game.restart(); __wtd.step(3);
      __wtd.select('${id}'); __wtd.tp(150, 300); __wtd.setAim(1, -0.2); __wtd.step(70);
      const sp = WTP.weapons.BY['${id}'].sprite, out = [sp.keyOf(WTP.weapons.animState())];
      __wtd.fire(true);
      for (let k = 0; k < ${hold}; k++) { __wtd.step(1); out.push(sp.keyOf(WTP.weapons.animState())); }
      __wtd.fire(false);
      for (let k = 0; k < ${after}; k++) { __wtd.step(1); out.push(sp.keyOf(WTP.weapons.animState())); }
      return { pixel: !!sp.pixel, n: new Set(out).size, first: out[0], last: out[out.length - 1] };
    })()`);
    const pistol = await keys('pistol', 2, 20);
    t('pistol slide cycles and returns', pistol.pixel && pistol.n >= 2 && pistol.first === pistol.last, JSON.stringify(pistol));
    const shotgun = await keys('shotgun', 2, 40);
    t('shotgun pump racks', shotgun.n >= 3, JSON.stringify(shotgun));
    const mini = await keys('minigun', 90, 0);
    t('minigun barrels spin', mini.n >= 3, JSON.stringify(mini));
    const rocket = await keys('rocket', 2, 5);
    t('rocket launcher shows the loaded rocket only when ready', rocket.first.includes('nose:0') && rocket.last.includes('nose:off'), JSON.stringify(rocket));
    const rail = await keys('railgun', 20, 0);
    t('railgun coils glow brighter while charging', rail.n >= 2, JSON.stringify(rail));
    const rev = await keys('revolver', 2, 2);
    t('revolver cylinder turns', rev.n >= 2, JSON.stringify(rev));
    const rot = await h.ev(`(() => { const sp = WTP.weapons.BY.rifle.sprite; const a = sp.rotated(0.4, false), b = sp.rotated(0.4, true); return a.cv.width > 0 && b.cv.width === a.cv.width; })()`);
    t('RotSprite rotations render', rot);
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'PXANIM OK' : 'PXANIM FAIL');
  process.exit(ok ? 0 : 1);
})();
