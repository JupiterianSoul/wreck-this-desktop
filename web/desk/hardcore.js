(() => {
  const WTP = window.WTP;
  const { rand, pick } = WTP;
  const W = () => WTP.world, WP = () => WTP.weapons, EN = () => WTP.enemies, G = () => WTP.game, PL = () => WTP.player, A = (n, x) => WTP.audio.play(n, x);
  const H = { on: false, caches: new Set() };
  WTP.hardcore = H;
  const BIG = new Set(['nuke', 'bsod', 'orbital', 'airstrike', 'meteor', 'quake', 'tornado', 'altf4', 'tiler', 'panic', 'ddos', 'zipbomb', 'forkbomb', 'superq', 'overclock']);
  H.unit = (id) => {
    const d = WP().BY[id];
    if (!d) return 0;
    if (BIG.has(id)) return 1;
    if (d.hold) return 12;
    return Math.max(2, Math.min(30, Math.round(3 / Math.max(0.05, d.rate || 0.3))));
  };
  H.start = (run) => {
    H.on = true;
    const ammo = {};
    for (const d of WP().DEFS) ammo[d.id] = 0;
    for (const id of G().slots()) if (id) ammo[id] = H.unit(id) * 3;
    WP().setAmmo(ammo);
    WTP.ui?.hudSetup?.(run);
    run.supplies = 0;
    run.dropT = 12;
    H.caches = new Set();
    const Wd = W();
    let tries = 0;
    while (H.caches.size < 8 && tries++ < 5000) {
      const x = (Math.random() * Wd.w) | 0, y = 20 + ((Math.random() * (Wd.gh - 30)) | 0);
      const i = y * Wd.w + x;
      if (Wd.mat[i] === Wd.SOLID && Wd.rid[i] > 1) H.caches.add(i);
    }
    G().ammoChanged();
  };
  H.stop = () => { H.on = false; H.caches = new Set(); };
  H.give = (id, n) => {
    const a = WP().ammo();
    if (!a || a[id] == null) return;
    a[id] += n;
  };
  H.pickAmmo = (p) => {
    const slots = G().slots().filter(Boolean);
    const cur = WP().st.cur;
    const got = [];
    const give = (id, mul) => { const n = Math.max(1, Math.round(H.unit(id) * mul)); H.give(id, n); got.push(`${WP().BY[id].name} +${n}`); };
    give(cur, p.big ? 2 : 1);
    const others = slots.filter((x) => x !== cur);
    for (let k = 0; k < (p.big ? 3 : 1) && others.length; k++) give(others.splice((Math.random() * others.length) | 0, 1)[0], p.big ? 1.5 : 0.6);
    A('reload'); A('coin');
    WTP.fx.pop(p.x, p.y - 8, p.big ? 'SUPPLY DROP' : 'AMMO', { scale: 1, ramp: ['Y', 'y', 'a'], life: 0.9 });
    WTP.ui?.label?.(got.join('   '), 1600);
    if (G().run) G().run.supplies = (G().run.supplies || 0) + 1;
    G().ammoChanged();
  };
  H.tick = (run, dt) => {
    if (!H.on) return;
    run.dropT -= dt;
    if (run.dropT <= 0) {
      run.dropT = rand(16, 24);
      const x = rand(20, W().w - 20);
      EN().pickups.push({ t: 'ammo', big: true, para: true, x, y: -6, vx: 0, vy: 20, life: 40 });
      G().announce('SUPPLY DROP', 2);
      A('siren');
    }
    if (Math.random() < dt * 0.6 && H.caches.size) {
      const i = pick([...H.caches]);
      const Wd = W();
      if (Wd.mat[i] !== Wd.SOLID) H.caches.delete(i);
      else WTP.fx.spark((i % Wd.w) + 0.5, ((i / Wd.w) | 0) + 0.5, rand(-10, 10), rand(-20, -5), WTP.P32.y, 0.4);
    }
    const a = WP().ammo();
    if (a && WTP.input.wantFire() && (a[WP().st.cur] | 0) <= 0) {
      const next = G().slots().find((id) => id && a[id] > 0);
      if (next && (H.swapT = (H.swapT || 0) - dt) <= 0) { H.swapT = 0.6; G().selectWeapon(next); WTP.ui?.label?.(`OUT OF AMMO, SWITCHED TO ${WP().BY[next].name.toUpperCase()}`, 1200); }
    }
  };
  H.cellGone = (i) => {
    if (!H.on || !H.caches.has(i)) return;
    H.caches.delete(i);
    const Wd = W();
    const x = (i % Wd.w) + 0.5, y = ((i / Wd.w) | 0) + 0.5;
    EN().pickups.push({ t: 'ammo', x, y, vx: rand(-40, 40), vy: -140, life: 20 });
    WTP.fx.pop(x, y - 6, 'CACHE FOUND', { scale: 1, ramp: ['Y', 'y'], life: 1 });
    A('kaching');
  };
  H.onKill = (e) => { if (H.on && Math.random() < (e.T.boss ? 1 : 0.45)) EN().pickups.push({ t: 'ammo', big: !!e.T.boss, x: e.x, y: e.y, vx: rand(-40, 40), vy: -120, life: 20 }); };
})();
