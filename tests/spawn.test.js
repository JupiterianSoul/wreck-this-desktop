const path = require('path');
const fs = require('fs');
const { launch } = require('./harness.js');
const OUT = process.env.WTD_SHOTS || path.join(require('os').tmpdir(), 'wtd-shots');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  let fail = 0;
  const t = (name, ok, info) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} ${info === undefined ? '' : JSON.stringify(info)}`); if (!ok) fail++; };
  for (const fixture of ['tiled3', 'floating', 'single', 'fullscreen']) {
    const h = await launch({ fixture });
    try {
      await h.wait('window.WTD && WTD.ready', 30000);
      const at = await h.ev('({ x: WTP.player.x, y: WTP.player.y, gh: WTP.world.gh, w: WTP.world.w })');
      t(`${fixture} spawns in the middle band`, at.y > at.gh * 0.25 && at.y < at.gh * 0.7, at);
      await h.ev('__wtd.step(90)');
      const st = await h.ev('__wtd.stats');
      // The fullscreen fixture has no ledge, so the player falls from mid height to the bottom edge
      t(`${fixture} lands near where it spawned`, st.P.ground && (fixture === 'fullscreen' || st.P.y - at.y < 30), { y: st.P.y, ground: st.P.ground });
      await h.shot(path.join(OUT, `spawn-${fixture}.png`));
      if (fixture === 'tiled3') {
        await h.ev('WTP.game.playerDied()');
        await new Promise((r) => setTimeout(r, 1700));
        const re = await h.ev('({ y: WTP.player.y, gh: WTP.world.gh })');
        t('respawn after death is in the middle band', re.y > re.gh * 0.25 && re.y < re.gh * 0.7, re);
      }
      const errs = await h.ev('WTD.errors');
      t(`${fixture} no page errors`, !errs.length, errs.slice(0, 3));
    } catch (e) { t(fixture, false, e.message); }
    await h.close();
  }
  console.log(fail ? 'SPAWN FAIL' : 'SPAWN OK', OUT);
  process.exit(fail ? 1 : 0);
})();
