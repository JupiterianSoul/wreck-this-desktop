const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d !== undefined ? JSON.stringify(d) : ''); } else console.log('ok  ', m, d !== undefined ? JSON.stringify(d) : ''); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; WTP.game.stopLoop(); __wtd.step(30); true');

    // Hotbar: hidden and click-through, flashes on a weapon change, gone again after 1.2 s
    const hb0 = await h.ev(`(() => { const s = getComputedStyle(document.getElementById('hHot')); return { op: +s.opacity, pe: s.pointerEvents, btnPe: getComputedStyle(document.querySelector('#hHot .slot')).pointerEvents }; })()`);
    ok(hb0.op === 0 && hb0.pe === 'none' && hb0.btnPe === 'none', 'hotbar hidden and click-through', hb0);
    await h.ev(`WTP.game.selectWeapon('shotgun'); WTP.game.selectWeapon('smg'); true`);
    await sleep(150);
    ok(await h.ev(`document.getElementById('hHot').classList.contains('show') && +getComputedStyle(document.getElementById('hHot')).opacity > 0.5`), 'hotbar shows on switch');
    await h.shot('/tmp/wtd-shots/hotbar.png');
    await sleep(1600);
    ok(await h.ev(`!document.getElementById('hHot').classList.contains('show')`), 'hotbar fades after the delay');
    const ammoTick = await h.ev(`(() => { WTP.game.ammoChanged(); return document.getElementById('hHot').classList.contains('show'); })()`);
    ok(!ammoTick, 'hotbar refresh without a switch stays hidden');

    // Scroll: one step per notch with no re-arm wait, small touchpad deltas add up
    const wh = await h.ev(`(() => { const I = WTP.input, t = 1e7; const f0 = I.wheelState.fired; I.wheelStep(0, 100, 0, t); I.wheelStep(0, 100, 0, t + 12); I.wheelStep(0, 100, 0, t + 24); const notches = I.wheelState.fired - f0; const f1 = I.wheelState.fired; for (let k = 0; k < 7; k++) I.wheelStep(0, 10, 0, t + 1000 + k * 8); return { notches, pad: I.wheelState.fired - f1 }; })()`);
    ok(wh.notches === 3 && wh.pad === 1, 'one step per notch', wh);

    // Last weapon swap, raise animation, per-weapon cooldowns
    const lw = await h.ev(`(() => { WTP.input.clear(); const G = WTP.game; G.selectWeapon('pistol'); G.selectWeapon('shotgun'); __wtd.press('lastWeapon'); __wtd.step(1); const a = WTP.weapons.st.cur; __wtd.press('lastWeapon'); __wtd.step(1); return [a, WTP.weapons.st.cur]; })()`);
    ok(lw[0] === 'pistol' && lw[1] === 'shotgun', 'last weapon key swaps back and forth', lw);
    const ra = await h.ev(`(() => { WTP.game.selectWeapon('smg'); const r0 = WTP.weapons.st.raise; __wtd.step(5); return [r0, WTP.weapons.st.raise]; })()`);
    ok(ra[0] > 0.05 && ra[1] === 0, 'raise lasts 60 ms', ra);
    const cd = await h.ev(`(() => { const G = WTP.game, st = WTP.weapons.st; G.selectWeapon('rocket'); st.cd = 0; __wtd.setAim(1, 0); __wtd.fire(true); __wtd.step(2); __wtd.fire(false); const rk = st.cd; G.selectWeapon('pistol'); const pi = st.cd; G.selectWeapon('rocket'); return { rk, pi, back: st.cd }; })()`);
    ok(cd.rk > 0.1 && cd.pi === 0 && cd.back > 0.05, 'switching never blocks firing and keeps cooldowns', cd);

    // Digits: every pair differs by several pixels in both canvas sets
    const dist = await h.ev(`(() => { const g = WTP.font.glyphs, D = '0123456789'; let min = 99, pair = ''; for (const a of D) for (const b of D) { if (a >= b) continue; const A = g.get(a).rows.join(''), B = g.get(b).rows.join(''); let d = 0; for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) d++; if (d < min) { min = d; pair = a + b; } } return { min, pair, widths: [...D].map((c) => g.get(c).w) }; })()`);
    ok(dist.min >= 4 && dist.widths.every((w) => w === 5), 'small digits are far apart and the same width', dist);

    // WreckPix: loaded, digits only, tabular in the HUD
    const wf = await h.ev(`(async () => { await WTP.fontReady; await document.fonts.ready; const sp = document.createElement('span'); sp.style.cssText = 'position:absolute;font:700 18px var(--font);white-space:pre'; document.getElementById('hud').appendChild(sp); const w = (t) => { sp.textContent = t; return sp.getBoundingClientRect().width; }; const r = { ready: WTP.font.ready, check: document.fonts.check('18px WreckPix', '8'), w1: w('1111'), w8: w('8888'), letters: w('ABC') > 0 }; sp.remove(); return r; })()`);
    ok(wf.ready && wf.check && Math.abs(wf.w1 - wf.w8) < 0.5 && wf.letters, 'WreckPix digits are tabular', wf);
    await h.ev(`WTP.game.run.score = 1234567890; WTP.ui.hud(WTP.game.run); true`);
    await h.shot('/tmp/wtd-shots/digits.png');
    ok(!(await h.ev('WTD.errors.length')), 'no page errors', await h.ev('WTD.errors.slice(0, 3)'));
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();
  console.log(fail ? 'SWITCH FAIL' : 'SWITCH OK');
  process.exit(fail ? 1 : 0);
})();
