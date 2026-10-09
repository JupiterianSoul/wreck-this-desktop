const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d !== undefined ? JSON.stringify(d) : ''); } else console.log('ok  ', m, d !== undefined ? JSON.stringify(d) : ''); };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.game.stopLoop(); true');

    // Unlock-all on: borrowed weapons usable, nothing progresses, HUD tag shown
    const on = await h.ev(`(() => {
      const A = WTP.ach, sv = WTP.save;
      sv.hotbar = WTP.progress.defaultHotbar().slice();
      const locked = WTP.weapons.DEFS.map((d) => d.id).filter((id) => !A.weaponOwned(id));
      const shards0 = sv.shards, done0 = Object.keys(sv.ach.done).length, kills0 = A.stats().kills || 0;
      A.setUnlockAll(true);
      const w = locked[0];
      WTP.game.assignSlot(7, w); __wtd.select(w);
      WTP.game.stat('kills', 50); A.check(); __wtd.step(40);
      WTP.ui.hud(WTP.game.run);
      return { w, owned: A.weaponOwned(w), cur: WTP.weapons.st.cur, kills: (A.stats().kills || 0) - kills0, done: Object.keys(sv.ach.done).length - done0, snap: !!sv.unlockSnap, tag: !document.getElementById('hUA').hidden, shards0 };
    })()`);
    ok(on.owned && on.cur === on.w && on.kills === 0 && on.done === 0 && on.snap && on.tag, 'unlock all freezes progress', on);

    // Off: snapshot restored, borrowed weapon leaves the hotbar, switch back to an owned weapon, shards kept
    const off = await h.ev(`(() => {
      const A = WTP.ach, sv = WTP.save;
      sv.shards += 77;
      A.setUnlockAll(false);
      WTP.ui.hud(WTP.game.run);
      return { owned: A.weaponOwned('${on.w}'), inBar: sv.hotbar.includes('${on.w}'), cur: WTP.weapons.st.cur, curOwned: A.weaponOwned(WTP.weapons.st.cur), shards: sv.shards, snap: !!sv.unlockSnap, tag: !document.getElementById('hUA').hidden };
    })()`);
    ok(!off.owned && !off.inBar && off.curOwned && off.cur !== on.w && off.shards === on.shards0 + 77 && !off.snap && !off.tag, 'unlock all off restores the snapshot', off);

    // Reset progress: two steps, the second a held button; settings and keys survive
    const pre = await h.ev(`(() => {
      const sv = WTP.save; sv.shards = 1234; sv.bests.survival = 9; sv.ach.done['w:laser'] = 1; sv.settings.shake = 0.42; sv.keys.jump = ['KeyJ'];
      WTP.persist(true); WTP.game.pause(true); WTP.ui.openTab('settings');
      document.querySelector('details.adv').open = true; return true;
    })()`);
    await h.ev(`document.querySelector('[data-reset="arm"]').click(); true`);
    const armed = await h.ev(`!!document.querySelector('[data-reset="hold"]')`);
    ok(armed && (await h.ev(`!!document.querySelector('details.adv').open`)), 'first click arms the held button');
    // A short press does nothing
    await h.ev(`(() => { const b = document.querySelector('[data-reset="hold"]'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return new Promise((r) => setTimeout(() => { b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); r(); }, 300)); })()`);
    ok((await h.ev('WTP.save.shards')) === 1234, 'short press does not reset');
    await h.ev(`(() => { const b = document.querySelector('[data-reset="hold"]'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return new Promise((r) => setTimeout(r, 1900)); })()`);
    const post = await h.ev(`(() => { const sv = WTP.save; return { shards: sv.shards || 0, bests: Object.keys(sv.bests).length, laser: WTP.ach.weaponOwned('laser'), shake: sv.settings.shake, jump: sv.keys.jump, hotbar: sv.hotbar.filter(Boolean).length, unlockAll: sv.settings.unlockAll }; })()`);
    ok(post.shards === 0 && post.bests === 0 && !post.laser && post.shake === 0.42 && post.jump[0] === 'KeyJ' && post.hotbar > 0 && !post.unlockAll, 'held button resets progress, keeps settings', post);
    await h.shot('/tmp/wtd-shots/reset.png');
    ok(!(await h.ev('WTD.errors.length')), 'no page errors', await h.ev('WTD.errors.slice(0, 3)'));
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();
  console.log(fail ? 'PROGRESS FAIL' : 'PROGRESS OK');
  process.exit(fail ? 1 : 0);
})();
