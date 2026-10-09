const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; __wtd.step(30); WTP.game.stopLoop()');
    const fire = (id, frames, x = 150, y = 300, ax = 1, ay = -0.25) => h.ev(`(() => {
      WTP.game.restart(); __wtd.step(5);
      __wtd.select('${id}'); __wtd.tp(${x}, ${y}); __wtd.setAim(${ax}, ${ay}); __wtd.step(5);
      let peak = { shake: 0, chroma: 0, slow: 0, flash: 0 }, np = 0;
      __wtd.fire(true);
      for (let k = 0; k < ${frames}; k++) { __wtd.step(1); const s = WTP.game.fxState(); for (const q in peak) peak[q] = Math.max(peak[q], s[q]); np = Math.max(np, WTP.fx.np); if (k === 20) __wtd.fire(false); }
      __wtd.fire(false);
      return { ...peak, np };
    })()`);
    const pistol = await fire('pistol', 60);
    t('pistol: no screen flash', pistol.flash === 0, JSON.stringify(pistol));
    t('pistol: no chroma or slow motion', pistol.chroma === 0 && pistol.slow === 0);
    t('pistol: small shake', pistol.shake <= 3.01);
    const smg = await fire('smg', 60);
    t('smg: shake stays small under spam', smg.shake <= 3.01, JSON.stringify(smg));
    const rocket = await fire('rocket', 90, 150, 300, 1, 0.3);
    t('rocket: no flash, chroma or slow motion', rocket.flash === 0 && rocket.chroma === 0 && rocket.slow === 0, JSON.stringify(rocket));
    t('rocket: medium shake', rocket.shake > 1 && rocket.shake <= 9.01);
    const nuke = await fire('nuke', 240, 150, 200, 1, 0.5);
    t('nuke: flash and slow motion allowed', nuke.flash > 0.2 && nuke.slow > 0, JSON.stringify(nuke));
    const fin = await h.ev(`(() => {
      WTP.game.restart(); __wtd.step(5);
      const b0 = WTP.fx.beams.length, r0 = WTP.feel.rings.length;
      WTP.extras.finisher(60);
      const s = WTP.game.fxState();
      return { bolts: WTP.fx.beams.filter((b) => b.kind === 'bolt').length - b0, flash: s.flash, chroma: s.chroma, slow: s.slow, rings: WTP.feel.rings.length - r0 };
    })()`);
    t('finisher: no lightning, flash or chroma', fin.bolts <= 0 && fin.flash === 0 && fin.chroma === 0, JSON.stringify(fin));
    t('finisher: slow motion and a ring', fin.slow > 0 && fin.rings === 1);
    const spam = await h.ev(`(() => {
      WTP.game.restart(); __wtd.step(5);
      const st = WTP.budget.stats; st.asked = 0; st.kept = 0;
      for (let k = 0; k < 20; k++) { for (let q = 0; q < 6; q++) __wtd.explode(60 + q * 90, 120 + (k % 4) * 40, 14); __wtd.step(1); }
      return { asked: st.asked, kept: st.kept, booms: WTP.booms.list.length, np: WTP.fx.np };
    })()`);
    t('explosion spam gets thinned', spam.kept < spam.asked * 0.8 && spam.booms <= 18, JSON.stringify(spam));
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'BUDGET OK' : 'BUDGET FAIL');
  process.exit(ok ? 0 : 1);
})();
