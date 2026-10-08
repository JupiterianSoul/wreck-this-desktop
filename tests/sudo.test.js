const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; __wtd.step(30); WTP.game.stopLoop()');
    await h.ev(`window.__count = (id, frames, x, y, ax, ay, hold = 1) => {
      WTP.game.restart(); __wtd.step(3);
      __wtd.select(id); __wtd.tp(x, y); __wtd.setAim(ax, ay); __wtd.step(3);
      __wtd.fire(true); __wtd.step(hold); __wtd.fire(false); __wtd.step(Math.ceil(WTP.weapons.BY[id].rate * 60) + 2);
      __wtd.select('sudo'); __wtd.step(2);
      const seen = new Set(); let shots = 0, first = -1, roots = 0, rad = 0, slowest = 0;
      const S = WTP.weapons.shots;
      for (const s of S) seen.add(s);
      const st0 = WTP.game.run.stats.shots;
      __wtd.fire(true); __wtd.step(1); __wtd.fire(false);
      for (let k = 0; k < frames; k++) {
        for (const s of S) if (!seen.has(s)) { seen.add(s); if (s.from === 'p') { shots++; if (first < 0) first = k; if (s.root) { roots++; rad = s.root.rad; } } }
        if (k === 0) slowest = WTP.weapons.shown()?.id;
        __wtd.step(1);
      }
      return { shots, first, roots, rad, shown: slowest, fired: WTP.game.run.stats.shots - st0 };
    }; 1`);
    const smg = await h.ev(`__count('smg', 100, 150, 300, 1, -0.2)`);
    t('sudo smg is a hose', smg.shots >= 40, JSON.stringify(smg));
    t('burst shots carry root double radius', smg.roots === smg.shots && smg.rad === 2);
    t('held sprite shows the repeated weapon', smg.shown === 'smg');
    const rocket = await h.ev(`__count('rocket', 100, 150, 300, 1, -0.2)`);
    t('sudo rocket fires two rockets', rocket.shots === 2, JSON.stringify(rocket));
    const mini = await h.ev(`__count('minigun', 30, 150, 300, 1, -0.2, 50)`);
    t('sudo minigun skips spin up', mini.first >= 0 && mini.first <= 1 && mini.shots >= 25, JSON.stringify(mini));
    const rail = await h.ev(`__count('railgun', 60, 150, 300, 1, -0.2, 40)`);
    t('sudo railgun fires without charging', rail.shown === 'railgun' && rail.fired === 3, JSON.stringify(rail));
    const flame = await h.ev(`__count('flame', 60, 150, 300, 1, -0.2, 10)`);
    t('sudo flamethrower runs as a hold burst', flame.shots >= 20, JSON.stringify(flame));
    const blast = await h.ev(`(() => {
      WTP.game.restart(); __wtd.step(3);
      const W = WTP.world;
      let px = 0, py = 0;
      for (let y = 40; y < W.gh - 40 && !px; y += 4) for (let x = 40; x < W.w - 40; x += 4) { let all = true; for (let q = -16; q <= 16 && all; q += 2) for (let r = -16; r <= 16; r += 2) if (W.mat[(y + q) * W.w + x + r] !== W.SOLID) { all = false; break; } if (all) { px = x; py = y; break; } }
      const holes = () => { let n = 0; for (let y = py - 30; y <= py + 30; y++) for (let x = px - 30; x <= px + 30; x++) if (W.mat[y * W.w + x] === W.HOLE) n++; return n; };
      const h0 = holes(); WTP.weapons.explode(px, py, 6, { noPush: true }); const a = holes() - h0;
      WTP.game.restart(); __wtd.step(3);
      const h1 = holes(); WTP.weapons.st.rootNow = WTP.weapons.ROOT_BURST; WTP.weapons.explode(px, py, 6, { noPush: true }); WTP.weapons.st.rootNow = null; const b = holes() - h1;
      return { a, b };
    })()`);
    t('root burst doubles blast radius', blast.b > blast.a * 2.5, JSON.stringify(blast));
    const su = await h.ev(`(() => {
      WTP.game.restart(); __wtd.step(3);
      __wtd.select('sudo'); __wtd.step(2); __wtd.alt(); __wtd.step(2);
      const r0 = WTP.weapons.root();
      WTP.ui.hud(WTP.game.run);
      const badge = !document.getElementById('hRoot').hidden;
      const W = WTP.world;
      let mi = -1;
      for (let i = 0; i < W.w * W.gh; i++) if (W.mat[i] === W.SOLID && W.mtl[i] === W.M.METAL) { mi = i; break; }
      const mx = mi % W.w, my = (mi / W.w) | 0;
      WTP.weapons.st.rootNow = WTP.weapons.ROOT_SU; WTP.weapons.setPow(0);
      W.carve(mx + 0.5, my + 0.5, 1.5, { pow: 1 });
      WTP.weapons.st.rootNow = null; WTP.weapons.setPow(0);
      const cut = W.mat[mi] !== W.SOLID;
      __wtd.select('pistol'); __wtd.setAim(1, -0.3); const n0 = WTP.game.run.stats.shots; __wtd.fire(true); __wtd.step(120); __wtd.fire(false); const fast = WTP.game.run.stats.shots - n0;
      __wtd.step(60 * 7);
      const after = WTP.weapons.root();
      __wtd.select('sudo'); __wtd.step(2); __wtd.alt(); __wtd.step(2);
      const again = WTP.weapons.root();
      return { r0, badge, cut, fast, after, again };
    })()`);
    t('sudo su gives 8 seconds of root', su.r0 > 7.8 && su.r0 <= 8, JSON.stringify(su));
    t('ROOT badge on the HUD', su.badge);
    t('root cuts metal', su.cut);
    t('root fires 1.5x faster', su.fast >= 16, su.fast);
    t('root ends and has a cooldown', su.after === 0 && su.again === 0);
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'SUDO OK' : 'SUDO FAIL');
  process.exit(ok ? 0 : 1);
})();
