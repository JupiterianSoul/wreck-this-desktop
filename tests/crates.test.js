const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d !== undefined ? JSON.stringify(d) : ''); } else console.log('ok  ', m, d !== undefined ? JSON.stringify(d) : ''); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('__wtd.step(20); WTP.game.stopLoop(); true');

    // One crate per stickman category, each drawing only from its own pool
    const pools = await h.ev(`(() => {
      const S = WTP.shop, out = {};
      for (const c of S.CRATES.filter((c) => c.kind === 'player')) {
        const rs = {}, slots = new Set();
        for (let k = 0; k < 1500; k++) { const d = S.rollCrate(c); slots.add(d.slot); rs[d.rar] = (rs[d.rar] || 0) + 1; }
        out[c.id] = { slots: [...slots], rs };
      }
      return out;
    })()`);
    ok(pools.costume && pools.hat && pools.face && pools.trail && pools.colour, 'five stickman crates', Object.keys(pools));
    ok(pools.costume.slots.join() === 'costume' && pools.hat.slots.join() === 'hat' && pools.face.slots.join() === 'face' && pools.trail.slots.join() === 'trail' && pools.colour.slots.sort().join() === 'body,scarf', 'each crate keeps to its category', pools);
    ok(!pools.costume.rs[0] && (pools.trail.rs[4] || 0) > 0 && (pools.colour.rs[4] || 0) > 0, 'costumes never common, mythic animated items exist', { costume: pools.costume.rs, trail: pools.trail.rs });

    // Prices: collecting a whole category costs about what buying it used to
    const cost = await h.ev(`(() => {
      const S = WTP.shop, OLD = { costume: 36800, hat: 10000, face: 7000, trail: 9400, colour: 6000 }, out = {};
      for (const c of S.CRATES.filter((c) => c.kind === 'player')) {
        let tot = 0;
        for (let run = 0; run < 30; run++) {
          const have = new Set(), pool = S.pPool(c).map((x) => x.slot + ':' + x.id);
          while (have.size < pool.length) { const d = S.rollCrate(c), k = d.slot + ':' + d.id; tot += have.has(k) ? c.price * 0.6 : c.price; have.add(k); }
        }
        out[c.id] = Math.round((tot / 30) / OLD[c.id] * 100) / 100;
      }
      return out;
    })()`);
    ok(Object.values(cost).every((v) => v > 0.6 && v < 1.6), 'crate prices balanced against the old prices', cost);

    // No buying: locked items cannot be bought, owned ones from before stay owned, halo and crown stay achievements
    const wr = await h.ev(`(() => {
      const S = WTP.shop, sv = WTP.save; sv.shards = 5000; sv.pskin.own['hat:tophat'] = 1;
      const div = document.createElement('div'); S.renderSkins(div);
      const locked = div.querySelector('.ps[data-slot="hat"][data-id="viking"]'); locked.click();
      const kept = S.pOwned('hat', 'tophat');
      div.querySelector('.ps[data-slot="hat"][data-id="tophat"]').click();
      return { shards: sv.shards, viking: S.pOwned('hat', 'viking'), lockedCls: locked.className, tag: locked.textContent, kept, eq: S.pEq('hat'), crown: S.pOwned('hat', 'crown'), crownTag: div.querySelector('.ps[data-id="crown"]').textContent, sil: !!div.querySelector('.ps.locked .sil') };
    })()`);
    ok(wr.shards === 5000 && !wr.viking && /Hat Crate/.test(wr.tag) && wr.sil, 'locked items show their crate and cannot be bought', wr);
    ok(wr.kept && wr.eq === 'tophat' && !wr.crown && /Needs/.test(wr.crownTag), 'bought items stay owned, crown stays an achievement', wr);

    // Opening one crate: tease, spin, reveal; a click skips to the reveal
    await h.ev(`WTP.save.shards = 99999; WTP.game.pause(true); WTP.ui.openTab('crates'); document.querySelector('[data-open="face"][data-n="1"]').click(); true`);
    const s0 = await h.ev('({ st: WTP.crates.state(), shards: WTP.save.shards })');
    ok(s0.st.phase === 'intro' && s0.shards === 99999 - 160 && s0.st.items === 48, 'opening starts with the tease', s0);
    await sleep(1800);
    const s1 = await h.ev('WTP.crates.state().phase');
    ok(s1 === 'spin', 'roulette after the tease', s1);
    await h.ev(`document.querySelector('.copen').dispatchEvent(new MouseEvent('click', { bubbles: true })); true`);
    const s2 = await h.ev(`({ phase: WTP.crates.state().phase, name: document.querySelector('.co-name b')?.textContent, owned: (() => { const d = WTP.crates.state().drops[0]; return WTP.shop.pOwned(d.slot, d.id); })() })`);
    ok(s2.phase === 'reveal' && s2.name && s2.owned, 'click skips to the reveal and the drop is owned', s2);
    await sleep(300);
    const px = await h.ev(`(() => { const c = document.querySelector('.co-stick'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; })()`);
    ok(px > 300, 'the stickman shows the drop', px);
    await h.shot('/tmp/wtd-shots/crate-reveal.png');
    await h.ev(`document.querySelector('.co-reveal [data-eq]').click(); true`);
    const eq = await h.ev(`(() => { const d = WTP.crates.state().drops[0]; return WTP.shop.pEq(d.slot) === d.id; })()`);
    ok(eq, 'equip from the reveal');
    await h.ev(`document.querySelector('.co-reveal [data-close]').click(); true`);
    ok(!(await h.ev('WTP.crates.isOpen()')), 'close');

    // Open 5: one payment, five drops in a grid
    const b0 = await h.ev('WTP.save.shards');
    await h.ev(`document.querySelector('[data-open="colour"][data-n="5"]').click(); true`);
    await h.ev(`document.querySelector('.copen').dispatchEvent(new MouseEvent('click', { bubbles: true })); true`);
    await sleep(1200);
    const b5 = await h.ev(`({ cards: document.querySelectorAll('.co-grid .co-card').length, n: WTP.crates.state().drops.length, spent: ${b0} - WTP.save.shards })`);
    ok(b5.cards === 5 && b5.n === 5 && b5.spent <= 750 && b5.spent >= 750 - 5 * 60, 'open 5 shows five drops', b5);
    await h.shot('/tmp/wtd-shots/crate-five.png');
    await h.ev(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })); true`);
    ok(!(await h.ev('WTP.crates.isOpen()')), 'escape closes the opening');
    ok(!(await h.ev('WTD.errors.length')), 'no page errors', await h.ev('WTD.errors.slice(0, 3)'));
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();

  // Old saves: weapon skins move out of the shared skins object
  const o = await launch({ fixture: process.argv[2] || 'tiled3', save: { 'wtd-save': { v: 4, hotbar: [], skin: 'hero', skins: { hero: true, owned: { 'pistol|gold': 1 }, eq: { pistol: 'gold' } }, pskin: { own: { 'hat:cap': 1 }, eq: { hat: 'cap' } } } } });
  try {
    await o.wait('window.WTD && WTD.ready', 30000);
    const r = await o.ev(`({ ws: WTP.save.wskins, legacy: 'skins' in WTP.save || 'skin' in WTP.save, cap: WTP.shop.pOwned('hat', 'cap'), skin: WTP.shop.skinOf('pistol') })`);
    ok(r.ws.owned['pistol|gold'] === 1 && r.skin === 'gold' && !r.legacy && r.cap, 'old save splits weapon skins out and keeps bought items', r);
  } catch (e) { fail++; console.log('FAIL', e.message); }
  await o.close();
  console.log(fail ? 'CRATES FAIL' : 'CRATES OK');
  process.exit(fail ? 1 : 0);
})();
