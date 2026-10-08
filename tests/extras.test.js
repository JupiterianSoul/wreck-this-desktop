const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; __wtd.step(30); WTP.game.stopLoop()');
    const r = await h.ev(`(() => {
      const X = WTP.extras, out = {};
      out.daily = X.daily().text;
      out.dailyHtml = X.dailyHtml().includes('Daily challenge');
      out.golds = X.golds.length;
      const g = X.golds[0], Wd = WTP.world;
      const sh0 = WTP.save.shards || 0;
      Wd.mat[g.i] = Wd.HOLE; __wtd.step(2); for (let y = g.y - 16; y <= g.y + 14; y++) for (let x = g.x - 8; x <= g.x + 8; x++) if (x >= 0 && y >= 0 && x < Wd.w && y < Wd.gh) Wd.mat[y * Wd.w + x] = Wd.HOLE;
      out.revealed = g.st === 1;
      const P = WTP.player; for (let k = 0; k < 10 && g.st !== 2; k++) { __wtd.tp(g.x - P.w / 2, g.y - P.h / 2); __wtd.step(1); }
      out.collected = g.st === 2 && (WTP.save.shards || 0) - sh0 >= 25 && WTP.ach.stats().golden >= 1;
      const run = WTP.game.run; run.combo = 55; __wtd.step(2);
      out.finisher = run.finisherAt === 100;
      X.photo(true);
      out.photoHud = document.getElementById('hud').classList.contains('photo') && WTP.game.paused;
      X.snap(); X.photo(false);
      const msg = (window.__wtdOut || []).find((m) => m.t === 'photo');
      out.photoMsg = !!msg && msg.png.startsWith('data:image/png;base64,') && msg.png.length > 10000;
      out.photoOff = !document.getElementById('hud').classList.contains('photo') && !WTP.game.paused;
      return out;
    })()`);
    t('daily challenge', !!r.daily && r.dailyHtml, r.daily);
    t('golden pixels hidden in windows', r.golds >= 3, r.golds);
    t('golden pixel revealed when uncovered', r.revealed);
    t('golden pixel collected for 25 shards', r.collected);
    t('combo finisher at 50', r.finisher);
    t('photo mode hides HUD and pauses', r.photoHud);
    t('photo sends a full PNG to the host', r.photoMsg);
    t('photo mode exits', r.photoOff);
    const m0 = await h.ev(`(() => {
      const P = WTP.player, Wd = WTP.world;
      const x0 = 250, top = 200;
      for (let y = top; y < top + 40; y++) for (let x = x0; x < x0 + 30; x++) Wd.setCell(x, y, WTP.P32['5'], Wd.M.METAL, 0);
      for (let y = top - 30; y < top; y++) for (let x = x0 - 14; x < x0 + 30; x++) if (Wd.mat[y * Wd.w + x] === Wd.SOLID) Wd.setCell(x, y, 0, 0, 0), Wd.mat[y * Wd.w + x] = Wd.HOLE;
      __wtd.tp(x0 - P.w - 0.5, top + 9 - P.h); P.vy = 0; P.ground = false;
      return { top, x0 };
    })()`);
    await h.S('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 });
    await h.ev('__wtd.step(20)');
    await h.S('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 });
    await h.ev('__wtd.step(10)');
    const m1 = await h.ev('({ x: WTP.player.x, feet: WTP.player.y + WTP.player.h })');
    t('ledge mantle climbs a 9 cell ledge', m1.feet <= m0.top + 0.5 && m1.x > m0.x0 - 2, JSON.stringify(m1));
    const e = await h.ev(`(() => {
      const FX = WTP.fx, Wd = WTP.world, out = {};
      for (let y = 330; y < 336; y++) for (let x = 100; x < 140; x++) Wd.setCell(x, y, WTP.P32['5'], Wd.M.METAL, 0);
      const n0 = FX.np;
      const i = FX.shard(110.5, 320, 0, 40, WTP.P32.C);
      for (let k = 0; k < 90; k++) FX.update ? FX.update(1 / 60) : __wtd.step(1);
      out.shardKept = FX.np > 0;
      const s0 = FX.np; WTP.budget.with('nuke', () => FX.steam(120, 300, 4)); out.steam = FX.np - s0 === 4;
      let arcs = 0; const ob = FX.bolt; FX.bolt = (...a) => { arcs++; return ob(...a); }; WTP.weapons.conduct(110, 333); __wtd.step(30); FX.bolt = ob; out.arcs = arcs > 0;
      const P = WTP.player; P.idleT = 9; WTP.rig.relax = 3; WTP.game.renderNow(); const a = WTP.rig.lastPose.aimA; out.lowered = Math.abs(Math.cos(a)) < 0.7 && Math.sin(a) > 0.5;
      WTP.rig.relax = 0;
      return out;
    })()`);
    t('glass shards settle', e.shardKept);
    t('steam puffs', e.steam);
    t('metal conducts with arcs', e.arcs);
    t('weapon lowers when idle', e.lowered);
    const errs = await h.ev('WTD.errors');
    t('no page errors', !errs.length, JSON.stringify(errs).slice(0, 300));
  } finally { await h.close(); }
  console.log(ok ? 'EXTRAS OK' : 'EXTRAS FAIL');
  process.exit(ok ? 0 : 1);
})();
