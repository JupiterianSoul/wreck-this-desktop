const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('__wtd.step(20); WTP.game.stopLoop(); 1');
    const r = await h.ev(`(() => {
      const S = WTP.shop, PL = S.PLAYER;
      const paid = (slot) => PL[slot].filter((x) => x[2] > 0).map((x) => x[2]);
      const inRange = (a, lo, hi) => a.every((v) => v >= lo && v <= hi);
      const out = {
        costumes: PL.costume.length - 1, hats: PL.hat.length - 1, faces: PL.face.length - 1, trails: PL.trail.length - 1,
        colours: inRange([...paid('body'), ...paid('scarf')], 300, 800),
        accessories: inRange([...paid('hat'), ...paid('face'), ...paid('trail')], 500, 1500),
        costumePrices: inRange(paid('costume'), 1500, 5000),
        crates: S.CRATES.length, finishes: Object.keys(S.F).length,
        previews: PL.costume.slice(1).every((x) => WTP.costumes.preview(x[0]).startsWith('data:image/png'))
      };
      const names = ['hoodie', 'leather', 'suit', 'labcoat', 'ninja', 'robot', 'astronaut', 'knight', 'wizard', 'hacker', 'chef', 'builder'];
      out.allCostumes = names.every((n) => PL.costume.some((x) => x[0] === n));
      WTP.shop.pEq('costume');
      const cv = document.getElementById('cv'), g = cv.getContext('2d');
      const sample = () => { WTP.game.renderNow(1 / 60); const P = WTP.player, s = cv.width / WTP.world.w; const d = g.getImageData((P.x - 2) * s, (P.y - 6) * s, (P.w + 4) * s, (P.h + 8) * s).data; let h2 = 0; for (let i = 0; i < d.length; i += 16) h2 = (h2 * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) | 0; return h2; };
      __wtd.tp(300, 200); __wtd.step(2);
      WTP.save.pskin.eq.costume = 'none'; const a = sample();
      WTP.save.pskin.eq.costume = 'wizard'; const b = sample();
      out.drawsOnBody = a !== b;
      WTP.save.pskin.eq.costume = 'none';
      for (const c of S.CRATES) for (let k = 0; k < 20; k++) { const w = S.rollCrate(c); if (!S.F[w.fin] || !WTP.weapons.BY[w.w]) out.badRoll = c.id; }
      WTP.save.shards = 99999; WTP.game.pause(true); WTP.ui.openTab('skins'); document.querySelector('[data-sf="player"]').click();
      out.cards = document.querySelectorAll('#hBody .ps').length;
      out.previewImgs = document.querySelectorAll('#hBody .cprev').length;
      WTP.game.pause(false);
      return out;
    })()`);
    t('12 costumes that change the body', r.allCostumes && r.costumes === 12 && r.drawsOnBody, JSON.stringify(r));
    t('more hats, glasses, masks and trails', r.hats >= 14 && r.faces >= 8 && r.trails >= 10);
    t('colours priced 300 to 800', r.colours);
    t('accessories priced 500 to 1500', r.accessories);
    t('costumes priced 1500 to 5000', r.costumePrices);
    t('a fifth crate and more finishes', r.crates === 5 && r.finishes >= 30 && !r.badRoll);
    t('skins tab shows pixel costume previews', r.previews && r.previewImgs === 12 && r.cards > 60);
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'SKINS OK' : 'SKINS FAIL');
  process.exit(ok ? 0 : 1);
})();
