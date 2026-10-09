const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('__wtd.step(30); WTP.game.stopLoop()');
    const r = await h.ev(`(() => {
      const S = WTP.shop, out = {};
      out.fins = Object.keys(S.F).length;
      const counts = {};
      for (let k = 0; k < 4000; k++) { const x = S.rollCrate(S.CRATES.find((c) => c.id === 'wreck')); const rr = S.F[x.fin].rar; counts[rr] = (counts[rr] || 0) + 1; }
      out.counts = counts;
      out.goldenNoCommon = Array.from({ length: 500 }, () => S.rollCrate(S.CRATES.find((c) => c.id === 'golden'))).every((x) => S.F[x.fin].rar !== 'common');
      WTP.save.shards = 1000;
      out.spent = S.spend(500) && WTP.save.shards === 500;
      out.noOverspend = !S.spend(9999);
      const g1 = S.grant({ w: 'pistol', fin: 'gold', crate: 'wreck' }), g2 = S.grant({ w: 'pistol', fin: 'gold', crate: 'wreck' });
      out.dup = !g1.dup && g2.dup && g2.refund === 40;
      WTP.save.wskins.eq.pistol = 'gold';
      out.skin = !!S.skinFor('pistol');
      const c = document.createElement('canvas').getContext('2d'); c.canvas.width = 400; c.canvas.height = 300; c.scale(4, 4);
      WTP.weapons.BY.pistol.sprite.draw(c, 30, 30, 0.3, false, S.skinFor('pistol'));
      const d = c.getImageData(0, 0, 400, 300).data; let gold = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] && d[i] > 150 && d[i + 1] > 100 && d[i + 2] < 120) gold++;
      out.goldPx = gold;
      WTP.save.wskins.eq.rifle = 'holo';
      const s1 = S.skinFor('rifle');
      out.animated = S.F.holo.anim && s1.frame >= 0;
      const div = document.createElement('div'); S.renderCrates(div); out.crateCards = div.querySelectorAll('.crate2').length; out.crateN = S.CRATES.length;
      const div2 = document.createElement('div'); S.renderSkins(div2); div2.querySelector('[data-sf="weapons"]').click(); out.skinBtns = div2.querySelectorAll('.sk').length;
      WTP.save.pskin.eq.hat = 'crown'; WTP.save.pskin.eq.body = 'gold'; WTP.save.pskin.eq.trail = 'sparks';
      out.body = S.bodyColor();
      WTP.player.draw(c, 1 / 60, WTP.weapons.BY.pistol.sprite, { x: 1, y: 0 }, {});
      const run = WTP.game.run; run.kills = 10; run.maxCombo = 20;
      out.parts = S.runShards(run);
      return out;
    })()`);
    t('finishes', r.fins >= 18, r.fins);
    t('wreck crate mostly common, some rare drops', r.counts.common > 2000 && r.counts.rare > 500 && (r.counts.legendary || 0) + (r.counts.mythic || 0) > 0, JSON.stringify(r.counts));
    t('golden crate never common', r.goldenNoCommon);
    t('spend shards', r.spent);
    t('cannot overspend', r.noOverspend);
    t('duplicates refund 40%', r.dup);
    t('equipped skin recolours the sprite', r.skin && r.goldPx > 10, r.goldPx);
    t('mythic skins animate', r.animated);
    t('crates tab', r.crateCards === r.crateN && r.crateN === 10);
    t('skins tab lists owned skins', r.skinBtns >= 2, r.skinBtns);
    t('player body colour', r.body === '#f0c850');
    t('run shards breakdown', r.parts.length >= 2, JSON.stringify(r.parts));
    const errs = await h.ev('WTD.errors');
    t('no page errors', !errs.length, JSON.stringify(errs).slice(0, 300));
  } finally { await h.close(); }
  console.log(ok ? 'SHOP OK' : 'SHOP FAIL');
  process.exit(ok ? 0 : 1);
})();
