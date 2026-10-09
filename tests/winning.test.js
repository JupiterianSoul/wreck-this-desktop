const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d !== undefined ? JSON.stringify(d) : ''); } else console.log('ok  ', m, d !== undefined ? JSON.stringify(d) : ''); };
  const mode = (m) => h.ev(`WTP.save.settings.mode = '${m}'; WTP.game.restart(); WTP.game.stopLoop(); WTP.player.maxHp = 999; WTP.player.hp = 999; true`);
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true');

    // % counts each original cell once, even after slabs fall, settle and get blown up again
    await mode('free');
    const pc = await h.ev(`(() => {
      const W = WTP.world, gone0 = W.init.gone.reduce((a, b) => a + b, 0);
      const wins = (WTP.structs.wins || []).filter((w) => w && w.reg?.type !== 'bar');
      for (const w of wins.slice(0, 2)) { for (let x = w.reg.x0; x <= w.reg.x1; x += 6) W.carve(x, w.reg.y0 + 2, 5, { pow: 9 }); }
      for (let k = 0; k < 40; k++) { WTP.player.hp = 999; __wtd.step(30); }
      for (let y = 20; y < W.gh; y += 30) for (let x = 20; x < W.w; x += 30) W.carve(x, y, 9, { pow: 9 });
      for (let k = 0; k < 20; k++) __wtd.step(30);
      const marked = W.gone.reduce((a, b) => a + b, 0) - gone0;
      return { pct: WTP.modes.pct(), destroyed: W.destroyed, marked, total: W.total };
    })()`);
    ok(pc.pct <= 100 && pc.destroyed === pc.marked && pc.destroyed <= pc.total, 'each cell counted once', pc);

    // 100% in Free Wreck opens the win screen, Continue keeps the run going
    const fw = await h.ev(`(() => {
      const W = WTP.world;
      for (let pass = 0; pass < 8 && !WTP.game.run.ended; pass++) {
        for (let y = 4; y < W.gh; y += 14) for (let x = 4; x < W.w; x += 14) W.carve(x, y, 12, { pow: 30, debris: 0 });
        for (let k = 0; k < 40 && !WTP.game.run.ended; k++) __wtd.step(10);
      }
      const r = WTP.game.run;
      return { ended: r.ended, reason: r.reason, kind: r.winKind, pct: WTP.modes.pct(), t: r.t, score: r.score };
    })()`);
    ok(fw.ended && fw.reason === 'win' && fw.kind === 'clear' && fw.pct === 100, 'free wreck wins at 100%', fw);
    await h.wait(`!document.getElementById('hRes').hidden && document.querySelector('.win-win')`, 4000);
    const btns = await h.ev(`[...document.querySelectorAll('#hResP button')].map((b) => b.dataset.a + (b.classList.contains('focus') ? '*' : ''))`);
    ok(btns.join(',') === 'continue*,again,menu', 'win screen buttons, continue focused', btns);
    await h.shot('/tmp/wtd-shots/win-clear.png');
    const cont = await h.ev(`(() => { document.querySelector('#hResP [data-a="continue"]').click(); __wtd.step(60); const r = WTP.game.run; return { ended: r.ended, endless: r.endless, hidden: document.getElementById('hRes').hidden, score: r.score, t: r.t }; })()`);
    ok(!cont.ended && cont.endless && cont.hidden && cont.score >= fw.score && cont.t > fw.t, 'continue resumes the same run', cont);
    const runs = await h.ev(`(() => { const s0 = WTP.save.stats.runs; __wtd.end('finish'); return { d: WTP.save.stats.runs - s0, reason: WTP.game.run.reason }; })()`);
    ok(runs.d === 0 && runs.reason === 'finish', 'finishing a continued run does not count a second run', runs);

    // Time Attack: 100% before the clock runs out ends with a time bonus
    await mode('time');
    const ta = await h.ev(`(() => {
      const W = WTP.world; __wtd.step(60);
      for (let pass = 0; pass < 8 && !WTP.game.run.ended; pass++) {
        for (let y = 4; y < W.gh; y += 14) for (let x = 4; x < W.w; x += 14) W.carve(x, y, 12, { pow: 30, debris: 0 });
        for (let k = 0; k < 40 && !WTP.game.run.ended; k++) __wtd.step(10);
      }
      const r = WTP.game.run;
      return { reason: r.reason, bonus: r.timeBonus, rows: r.mode.rows(r).map((x) => x[0]) };
    })()`);
    ok(ta.reason === 'win' && ta.bonus > 0 && ta.rows.includes('Time bonus'), 'time attack clear gives a time bonus', ta);

    // Survival: the wave 5 boss wins the run, Continue makes it endless and later bosses only celebrate
    await mode('survival');
    await h.ev(`document.getElementById('hRes').hidden = true; true`);
    const sv = await h.ev(`(() => {
      const G = WTP.game, EN = WTP.enemies, r = G.run;
      r.wave = 5; r.spawnQ = []; r.waveT = 99;
      const b = EN.spawn(EN.BOSSES ? EN.BOSSES[0] : 'algo', WTP.world.w / 2, 60); b.spawnT = 0;
      b.damage(1e9, 'boom'); __wtd.step(5);
      return { ended: r.ended, reason: r.reason, kind: r.winKind };
    })()`);
    ok(sv.ended && sv.reason === 'win' && sv.kind === 'boss', 'survival wave 5 boss wins', sv);
    await h.wait(`!document.getElementById('hRes').hidden && document.querySelector('.win-win')`, 4000);
    await h.shot('/tmp/wtd-shots/win-boss.png');
    const sv2 = await h.ev(`(() => {
      const G = WTP.game, EN = WTP.enemies; G.continueRun(); const r = G.run;
      r.wave = 10; const b = EN.spawn(EN.BOSSES ? EN.BOSSES[0] : 'algo', WTP.world.w / 2, 60); b.spawnT = 0; b.damage(1e9, 'boom'); __wtd.step(5);
      return { ended: r.ended, endless: r.endless };
    })()`);
    ok(!sv2.ended && sv2.endless, 'boss after continue does not end the run', sv2);

    // Chaos never ends on a boss
    await mode('chaos');
    const ch = await h.ev(`(() => { const EN = WTP.enemies, r = WTP.game.run; r.wave = 5; const b = EN.spawn(EN.BOSSES ? EN.BOSSES[0] : 'algo', WTP.world.w / 2, 60); b.spawnT = 0; b.damage(1e9, 'boom'); __wtd.step(5); return { ended: r.ended }; })()`);
    ok(!ch.ended, 'chaos boss only celebrates', ch);

    // A failing spawn keeps its place and retries, an unknown type is dropped after a while
    await mode('survival');
    const sp = await h.ev(`(() => {
      const EN = WTP.enemies, r = WTP.game.run, o = EN.spawnEdge;
      let n = 0; EN.spawnEdge = (t, opt) => { if (n++ < 3) throw new Error('boom'); return o(t, opt); };
      r.wave = 1; r.spawnQ = ['nonexistent', 'ad']; r.spawnT = 0;
      for (let k = 0; k < 150; k++) __wtd.step(1);
      EN.spawnEdge = o;
      return { q: r.spawnQ.length, ads: EN.list.filter((e) => e.type === 'ad' && !e.dead).length, calls: n };
    })()`);
    ok(sp.q === 0 && sp.ads === 1, 'spawn retries instead of losing the enemy', sp);

    // Enemies spawn inside the screen and out of solid cells
    const inb = await h.ev(`(() => {
      const EN = WTP.enemies, W = WTP.world; let bad = [];
      for (const t of EN.ORDER) { if (t === 'video' || t === 'tracker' || t === 'daemon') continue; for (let k = 0; k < 4; k++) { const e = EN.spawnEdge(t, {}); if (!e) continue; if (e.x < 0 || e.x > W.w || e.y < 0 || e.y > W.gh) bad.push(t + ' out'); e.dead = true; } }
      __wtd.step(1); return bad;
    })()`);
    ok(!inb.length, 'spawns stay on screen', inb);

    // Stall watchdog: pulled into the open at 20 s, timed out for no score at 50 s
    const st = await h.ev(`(() => {
      const EN = WTP.enemies, r = WTP.game.run, W = WTP.world;
      for (const e of EN.list) e.dead = true; __wtd.step(1);
      r.spawnQ = []; r.waveT = 999;
      const e = EN.spawn('daemon', -40, W.gh / 2); e.spawnT = 0; e.inside = true;
      const score0 = r.score, kills0 = r.kills;
      for (let k = 0; k < 21 * 6; k++) { WTP.player.hp = 999; e.inside = e.inside && !e.marked; __wtd.step(10); }
      const pulled = { x: e.x, marked: !!e.marked, inside: e.inside, left: WTP.modes.enemiesLeft(r) };
      for (let k = 0; k < 31 * 6; k++) { WTP.player.hp = 999; __wtd.step(10); }
      return { pulled, dead: e.dead, score: r.score - score0, kills: r.kills - kills0, onScreen: pulled.x > 0 && pulled.x < W.w };
    })()`);
    ok(st.pulled.marked && st.onScreen && st.dead && st.kills === 0, 'stall watchdog pulls then times out', st);
    ok(await h.ev(`!document.getElementById('hLeftW').hidden`), 'enemies left counter shown in wave modes');

    ok(!(await h.ev('WTD.errors.length')), 'no page errors', await h.ev('WTD.errors.slice(0, 3)'));
    await h.ev(`WTP.save.settings.mode = 'free'`);
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();
  console.log(fail ? 'WINNING FAIL' : 'WINNING OK');
  process.exit(fail ? 1 : 0);
})();
