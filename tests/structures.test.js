const path = require('path');
const fs = require('fs');
const { launch } = require('./harness.js');
const OUT = process.env.WTD_SHOTS || path.join(require('os').tmpdir(), 'wtd-shots');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const fixture = process.argv[2] || 'tiled3';
  const h = await launch({ fixture });
  let fail = 0;
  const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('__wtd.step(120)');
    const wins = await h.ev(`WTP.structs.wins.filter(Boolean).map((w) => ({ id: w.id, type: w.reg.type, app: w.reg.app, bolts: w.bolts.length, state: w.state, x0: w.reg.x0, y0: w.reg.y0, x1: w.reg.x1, y1: w.reg.y1 }))`);
    console.log(JSON.stringify(wins));
    ok(wins.every((w) => w.bolts >= 2), 'every structure has bolts');
    const term = wins.find((w) => w.app === 'terminal') || wins.find((w) => w.type === 'window');
    await h.ev(`__wtd.tp(${term.x0} + 30, ${term.y0} - 23); __wtd.select('altf4')`);
    await new Promise((r) => setTimeout(r, 300));
    await h.ev(`(() => { window.__log = []; const f = WTP.weapons.FIRE.altf4; WTP.weapons.FIRE.altf4 = (o) => { window.__log.push(JSON.stringify(o)); return f(o); }; const P = WTP.player; const t = ${JSON.stringify(term)}; const tx = (t.x0 + t.x1) / 2, ty = (t.y0 + t.y1) / 2; __wtd.setAim(tx - (P.x + 3), ty - (P.y + 5)); __wtd.fire(true); __wtd.step(2); __wtd.fire(false); })()`);
    await h.ev('__wtd.step(30)');
    let s = await h.ev(`({ slabs: WTP.structs.slabs.map((x) => x.win.id), state: WTP.structs.wins[${term.id}].state, term: ${term.id} })`);
    console.log('after altf4', JSON.stringify(s), await h.ev('JSON.stringify(window.__log)'));
    ok(s.slabs.length >= 1 || s.state !== 'static', 'alt+f4 knocked the window off');
    for (let k = 0; k < 6; k++) { await h.ev('__wtd.step(30)'); }
    await h.shot(path.join(OUT, `${fixture}-struct-fall.png`));
    await h.ev('__wtd.step(700)');
    s = await h.ev(`({ slabs: WTP.structs.slabs.filter((x) => !x.pivot).length, state: WTP.structs.wins[${term.id}].state, chunks: WTP.world.chunks.length, pct: __wtd.stats.pct })`);
    console.log('settled', JSON.stringify(s));
    ok(s.slabs === 0, 'slab settled or shattered');
    const ed = wins.find((w) => w.app === 'editor');
    if (ed) {
      await h.ev(`(() => { const S = WTP.structs; const w = S.wins[${ed.id}]; const b = w.bolts[0]; for (let k = 1; k < w.bolts.length; k++) { const bb = w.bolts[k]; WTP.world.carve(bb.x, bb.y, 3, { pow: 99, noCrack: true }); } })()`);
      await h.ev('__wtd.step(30)');
      s = await h.ev(`({ state: WTP.structs.wins[${ed.id}].state, slabs: WTP.structs.slabs.map((x) => ({ pivot: !!x.pivot, n: x.n })) })`);
      console.log('editor after bolts', JSON.stringify(s));
      ok(s.state === 'hanging', 'editor hangs by one bolt');
      await h.ev('__wtd.step(60)');
      await h.shot(path.join(OUT, `${fixture}-struct-hang.png`));
      await h.ev('__wtd.alt(); __wtd.step(1)');
    }
    await h.ev(`(() => { __wtd.select('altf4'); __wtd.alt(); __wtd.step(400); })()`);
    s = await h.ev(`({ states: WTP.structs.wins.filter(Boolean).map((w) => w.state), slabs: WTP.structs.slabs.length, pct: __wtd.stats.pct })`);
    console.log('close all', JSON.stringify(s));
    await h.shot(path.join(OUT, `${fixture}-struct-all.png`));
    const errs = await h.ev('WTD.errors');
    ok(!errs.length, 'no page errors ' + errs.slice(0, 3).join(' | '));
  } catch (e) { console.log('FAIL', e.message); fail++; }
  for (const l of h.logs.slice(0, 10)) console.log('  log', l);
  await h.close();
  console.log(fail ? 'STRUCT FAIL' : 'STRUCT OK');
  process.exit(fail ? 1 : 0);
})();
