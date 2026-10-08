const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; __wtd.step(10); WTP.game.stopLoop(); 1');
    const r = await h.ev(`(async () => {
      const bad = [], errs = [], loud = [];
      for (const k of Object.keys(WTP.audio.META)) {
        const loop = k.startsWith('loop:'), name = loop ? k.slice(5) : k;
        try { const m = await WTP.audio.measure(name, null, loop, 2); if (m.loud < -60) bad.push(k); if (m.peak > 3) loud.push(k + ' ' + m.peak.toFixed(1)); } catch (e) { errs.push(k + ': ' + e.message); }
      }
      return { n: Object.keys(WTP.audio.META).length, bad, errs, loud };
    })()`);
    t('every sound renders', r.errs.length === 0, JSON.stringify(r.errs));
    t('no silent sounds', r.bad.length === 0, JSON.stringify(r.bad));
    t('no sound clips after trims', r.loud.length === 0, JSON.stringify(r.loud));
    t('all categories covered', r.n > 280, r.n);
    const lim = await h.ev(`(() => {
      Curio.muted = false;
      const A = WTP.audio, f = A.SFX.boom, g = A.SFX.impact;
      let nb = 0, ni = 0;
      A.SFX.boom = (x) => { nb++; };
      A.SFX.impact = (x) => { ni++; };
      for (let k = 0; k < 30; k++) A.play('boom', 20);
      for (let k = 0; k < 30; k++) A.play('impact', 0);
      A.SFX.boom = f; A.SFX.impact = g;
      Curio.muted = true;
      return { nb, ni, ctx: !!A.ctx() || 'muted' };
    })()`);
    t('explosion spam is rate limited', lim.nb >= 1 && lim.nb <= 4, JSON.stringify(lim));
    t('impact spam is rate limited', lim.ni >= 1 && lim.ni <= 4);
    const mat = await h.ev(`(() => {
      const W = WTP.world; let wi = -1;
      for (let i = 0; i < W.w * W.gh; i++) if (W.mat[i] === W.SOLID && W.TOUGH[W.mtl[i]] <= 1.05 && W.kind[i] !== W.K_GLASS) { wi = i; break; }
      const m0 = W.mtl[wi];
      W.carve(wi % W.w + 0.5, ((wi / W.w) | 0) + 0.5, 1.2, {});
      return W.lastHitMtl === m0 && wi >= 0 ? 'same' : [wi, m0, W.lastHitMtl];
    })()`);
    t('carve reports the material it hit', mat === 'same', JSON.stringify(mat));
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'SOUND OK' : 'SOUND FAIL');
  process.exit(ok ? 0 : 1);
})();
