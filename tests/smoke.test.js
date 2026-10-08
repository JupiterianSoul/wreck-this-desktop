const path = require('path');
const fs = require('fs');
const { launch } = require('./harness.js');
const OUT = process.env.WTD_SHOTS || path.join(require('os').tmpdir(), 'wtd-shots');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const fixture = process.argv[2] || 'tiled3';
  const h = await launch({ fixture, query: process.env.WTD_Q || '' });
  let fail = 0;
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true');
    await h.wait('window.WTP && WTP.game && WTP.game.shownCanvas', 10000);
    await h.shot(path.join(OUT, `${fixture}-0-start.png`));
    await h.ev('__wtd.step(150)');
    let st = await h.ev('__wtd.stats');
    console.log('after drop', JSON.stringify(st.P), 'errors', st.errors);
    if (!st.P.ground) { console.log('FAIL player not grounded'); fail++; }
    await h.ev(`(() => { __wtd.select('rocket'); __wtd.setAim(0.3, 1); __wtd.fire(true); __wtd.step(40); __wtd.fire(false); __wtd.step(60); })()`);
    await h.ev(`(() => { __wtd.select('flame'); __wtd.setAim(1, 0.2); __wtd.fire(true); __wtd.step(60); __wtd.fire(false); __wtd.step(30); })()`);
    await h.ev(`(() => { for (let k = 0; k < 6; k++) __wtd.explode(80 + k * 90, 120 + (k % 3) * 70, 14); __wtd.step(90); })()`);
    await new Promise((r) => setTimeout(r, 400));
    await h.shot(path.join(OUT, `${fixture}-1-wrecked.png`));
    st = await h.ev('__wtd.stats');
    console.log('stats', JSON.stringify({ pct: st.pct, chunks: st.chunks, burning: st.burning, rubble: st.rubble, parts: st.parts, errors: st.errors }));
    if (st.pct <= 1) { console.log('FAIL nothing destroyed'); fail++; }
    const errs = await h.ev('WTD.errors');
    if (errs.length) { console.log('FAIL page errors', errs.slice(0, 5)); fail++; }
  } catch (e) { console.log('FAIL', e.message); fail++; }
  console.log(h.logs.filter((l) => !/^\[/.test(l)).slice(0, 30).join('\n'));
  await h.close();
  console.log(fail ? 'SMOKE FAIL' : 'SMOKE OK', OUT);
  process.exit(fail ? 1 : 0);
})();
