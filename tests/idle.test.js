const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('__wtd.step(30); WTP.game.stopLoop(); 1');
    await h.ev(`(() => { const W = WTP.world; for (let y = 100; y < 395; y += 2) { let ok = true; for (let x = 270; x < 330; x++) if (W.mat[y * W.w + x] !== W.SOLID) { ok = false; break; } if (ok) { let air = true; for (let yy = y - 40; yy < y; yy++) for (let x = 270; x < 330; x++) if (W.mat[yy * W.w + x] === W.SOLID) air = false; if (air) { window.__spot = [296, y - 22]; return; } } } window.__spot = [300, 300]; })()`);
    const r = await h.ev(`(() => {
      __wtd.tp(__spot[0], __spot[1]); __wtd.step(60);
      const seen = new Set(); let at = null;
      for (let k = 0; k < 60 * 40; k++) { __wtd.step(1); WTP.game.renderNow(1 / 60); const n = WTP.rig.idleNow(); if (n) { seen.add(n); if (at == null) at = k / 60; } }
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' })); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' }));
      WTP.game.renderNow(1 / 60);
      const after = WTP.rig.idleNow();
      return { at, seen: [...seen], after };
    })()`);
    t('idle library starts after 10 seconds without input', r.at != null && r.at >= 9 && r.at <= 11.5, JSON.stringify(r));
    t('idles are picked from the library', r.seen.length >= 3 || (r.seen.includes('sleep') && r.seen.length >= 1), r.seen.join(' '));
    t('any input snaps out of the idle', r.after === null);
    const flip = await h.ev(`(() => {
      __wtd.tp(__spot[0], __spot[1]); __wtd.step(30);
      WTP.input.press('jump'); __wtd.step(10);
      const first = WTP.player.flipT > 0;
      let mid = false;
      for (let j = 0; j < 4 && WTP.player.jumps > 0; j++) { WTP.input.press('jump'); __wtd.step(1); if (WTP.player.jumps > 0 && WTP.player.flipT > 0) mid = true; if (WTP.player.jumps > 0) __wtd.step(8); }
      const startT = mid ? -1 : WTP.player.flipT;
      let flipped = false;
      for (let k = 0; k < 24; k++) { __wtd.step(1); WTP.game.renderNow(1 / 60); const p = WTP.rig.lastPose; if (p && p.hy > p.hipY) flipped = true; }
      return { first, startT, flipped };
    })()`);
    t('first jump is not a flip', !flip.first, JSON.stringify(flip));
    t('last air jump is a front flip', flip.startT > 0.3 && flip.flipped);
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'IDLE OK' : 'IDLE FAIL');
  process.exit(ok ? 0 : 1);
})();
