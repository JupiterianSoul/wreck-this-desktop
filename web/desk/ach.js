(() => {
  const WTP = window.WTP;
  const WP = WTP.weapons, G = WTP.game, W = () => WTP.world, PL = () => WTP.player, ST = () => WTP.structs;
  const AU = WTP.audio;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const STARTERS = ['pistol', 'smg', 'shotgun', 'grenade', 'hammer', 'altf4'];

  const CHAINS = [
    ['pistol', 'revolver', 'dual', 'nailgun', 'flare', 'saw'],
    ['smg', 'rifle'],
    ['shotgun', 'double', 'flak', 'confetti'],
    ['@kills:20', 'sniper', 'crossbow', 'harpoon'],
    ['@destroyed:15000', 'laser', 'plasma', 'tesla', 'freeze', 'sound', 'eraser', 'backspace'],
    ['@pct:25', 'flame', 'acid', 'paint', 'lava', 'water', 'termites'],
    ['grenade', 'rocket', 'homing', 'cluster', 'sticky', 'mine', 'firework', 'bowling', 'antigrav'],
    ['hammer', 'chainsaw', 'katana', 'drill', 'whip', 'glove', 'stamp'],
    ['@runs:3', 'portal', 'gravity', 'magnet', 'ballgun', 'boomerang', 'snowball', 'banana', 'cutter', 'vacuum', 'pen', 'blower'],
    ['@wave:survival:5', 'airstrike', 'meteor', 'lightning', 'quake'],
    ['altf4', 'superq', 'rmrf', 'ctrlz', 'dragdrop', 'screenshot', 'cursors', 'tiler', 'panic'],
    ['@windows:10', 'segfault', 'zipbomb', 'ddos', 'caps', 'tearing', 'usb', 'battery', 'scroll', 'notifspam'],
    ['@destroyed:60000', 'sudo', 'grep', 'copypaste', 'pixelsort', 'deadpixel', 'theme', 'defrag', 'peeler', 'wsportal', 'zoom', 'cookies']
  ];
  const SECRET = {
    minigun: { k: 'combo', n: 50, desc: 'Reach a 50 combo', hint: 'Never stop firing.' },
    railgun: { k: 'pct', n: 75, desc: 'Wreck 75% of a desktop in one run', hint: 'Leave almost nothing standing.' },
    glitch: { k: 'dw:tearing', n: 3000, desc: 'Destroy 3,000 pixels with Screen Tearing', hint: 'Some pictures are already broken.' },
    lens: { k: 'play', n: 3600, desc: 'Play for one hour in total', hint: 'Patience burns brighter.' },
    nuke: { k: 'wave:chaos', n: 10, desc: 'Reach wave 10 in Chaos', hint: 'Chaos rewards the stubborn.' },
    wrecking: { k: 'windows', n: 50, desc: 'Bring down 50 windows', hint: 'Knock down a lot of windows.' },
    blackhole: { k: 'winrun', n: 5, desc: 'Bring down 5 windows in one run', hint: 'Clear the desktop in one go.' },
    bees: { k: 'kills', n: 300, desc: 'Defeat 300 enemies', hint: 'The swarm comes to those who swarm.' },
    orbital: { k: 'bosses', n: 3, desc: 'Defeat 3 bosses', hint: 'Look up after a big fight.' },
    tornado: { k: 'wave:survival', n: 15, desc: 'Reach wave 15 in Survival', hint: 'Weather the storm.' },
    kill9: { k: 'kw:sniper', n: 25, desc: 'Defeat 25 enemies with the Sniper Rifle', hint: 'Termination is a skill.' },
    forkbomb: { k: 'explosions', n: 500, desc: 'Cause 500 explosions', hint: 'Boom, then more boom.' },
    bsod: { k: 'wave:hardcore', n: 10, desc: 'Reach wave 10 in Hardcore Survival', hint: 'Only the hardest crash.' },
    captcha: { k: 'runs', n: 25, desc: 'Play 25 runs', hint: 'Prove you are human, repeatedly.' },
    overclock: { k: 'time', n: 60, desc: 'Wreck 60% in Time Attack', hint: 'Faster than the clock.' }
  };
  const name = (id) => WP.BY[id]?.name || id;
  const GLOBAL_DESC = {
    kills: (n) => `Defeat ${fmt(n)} enemies`, destroyed: (n) => `Destroy ${fmt(n)} pixels in total`, pct: (n) => `Wreck ${n}% of a desktop in one run`,
    runs: (n) => `Play ${n} runs`, windows: (n) => `Bring down ${n} windows`, 'wave:survival': (n) => `Reach wave ${n} in Survival`
  };

  const ACH = [];
  const BY = {};
  const add = (a) => { ACH.push(a); BY[a.id] = a; };
  const WEAPON_GOAL = {};
  for (const ch of CHAINS) {
    let prev = null, idx = 0;
    for (const item of ch) {
      if (item[0] === '@') { const p = item.slice(1).split(':'); const n = +p.pop(); prev = { k: p.join(':'), n }; continue; }
      if (STARTERS.includes(item)) { prev = item; idx = 0; continue; }
      if (SECRET[item]) continue;
      idx++;
      let goal;
      if (prev && typeof prev === 'object') { goal = { k: prev.k, n: prev.n, desc: GLOBAL_DESC[prev.k](prev.n) }; }
      else if (idx % 3 === 0) { const n = 6 + idx * 3; goal = { k: `kw:${prev}`, n, desc: `Defeat ${n} enemies with the ${name(prev)}` }; }
      else { const n = Math.round((1200 * (1 + idx * 0.35)) / 100) * 100; goal = { k: `dw:${prev}`, n, desc: `Destroy ${fmt(n)} pixels with the ${name(prev)}` }; }
      WEAPON_GOAL[item] = goal;
      prev = item;
    }
  }
  for (const [id, g] of Object.entries(SECRET)) WEAPON_GOAL[id] = { ...g, secret: true };
  for (const d of WP.DEFS) {
    if (STARTERS.includes(d.id)) continue;
    const g = WEAPON_GOAL[d.id] || { k: 'destroyed', n: 30000, desc: 'Destroy 30,000 pixels in total' };
    WEAPON_GOAL[d.id] = g;
    add({ id: `w:${d.id}`, weapon: d.id, name: g.secret ? `Secret: ${d.name}` : `Unlock: ${d.name}`, desc: g.desc, k: g.k, n: g.n, secret: !!g.secret, hint: g.hint, reward: g.secret ? 150 : 40 });
  }
  const GEN = [
    ['destroyed', [[1000, 'First Crack', 25], [10000, 'Renovation', 50], [50000, 'Demolition Crew', 100], [200000, 'Urban Decay', 200], [1000000, 'Heat Death', 500]], (n) => `Destroy ${fmt(n)} pixels in total`],
    ['pct', [[10, 'Scratched', 25], [25, 'Dented', 50], [50, 'Half Gone', 100], [75, 'Mostly Rubble', 200], [90, 'Wallpaper Only', 300], [99, 'Format C:', 500]], (n) => `Wreck ${n}% of a desktop in one run`],
    ['kills', [[1, 'First Blood', 25], [50, 'Pest Control', 50], [250, 'Antivirus', 150], [1000, 'Firewall', 400]], (n) => `Defeat ${fmt(n)} enemies`],
    ['bosses', [[1, 'Process Terminated', 100], [5, 'Task Killer', 200], [20, 'Root Cause', 500]], (n) => `Defeat ${n} boss${n === 1 ? '' : 'es'}`],
    ['windows', [[1, 'Window Closed', 25], [10, 'Tiling Manager', 50], [50, 'Defenestration', 150], [200, 'No Windows Left', 400]], (n) => `Bring down ${n} window${n === 1 ? '' : 's'}`],
    ['winrun', [[3, 'Clean Sweep', 75], [6, 'Empty Workspace', 200]], (n) => `Bring down ${n} windows in one run`],
    ['explosions', [[10, 'Kaboom', 25], [100, 'Pyrotechnics', 75], [1000, 'Michael Bay', 300]], (n) => `Cause ${fmt(n)} explosions`],
    ['combo', [[10, 'Combo Starter', 25], [25, 'On a Roll', 75], [50, 'Unstoppable', 150], [100, 'Stack Overflow', 400]], (n) => `Reach a ${n} combo`],
    ['wave:survival', [[3, 'Survivor', 50], [10, 'Holdout', 150], [20, 'Last Process Standing', 400]], (n) => `Reach wave ${n} in Survival`],
    ['wave:chaos', [[3, 'Agent of Chaos', 50], [10, 'Entropy', 200], [20, 'Heat Wave', 500]], (n) => `Reach wave ${n} in Chaos`],
    ['wave:hardcore', [[3, 'Hardened', 75], [8, 'Scavenger', 200], [15, 'Iron Will', 500]], (n) => `Reach wave ${n} in Hardcore Survival`],
    ['time', [[20, 'Quick Job', 50], [40, 'Speed Demolition', 150], [60, 'Against the Clock', 300]], (n) => `Wreck ${n}% in Time Attack`],
    ['runs', [[1, 'Hello Desktop', 25], [10, 'Regular', 75], [50, 'Daily Driver', 200], [100, 'Uptime', 400]], (n) => `Play ${n} run${n === 1 ? '' : 's'}`],
    ['play', [[600, 'Ten Minutes', 50], [3600, 'One Hour', 150], [18000, 'Five Hours', 400]], (n) => `Play for ${n >= 3600 ? `${n / 3600} hour${n > 3600 ? 's' : ''}` : `${n / 60} minutes`} in total`],
    ['owned', [[10, 'Armed', 50], [25, 'Arsenal', 100], [50, 'Armory', 250], [WP.DEFS.length, 'Every Tool', 1000]], (n) => n >= WP.DEFS.length ? 'Own every weapon' : `Own ${n} weapons`],
    ['shots', [[1000, 'Trigger Happy', 50], [10000, 'Ammo Budget', 200]], (n) => `Fire ${fmt(n)} times`],
    ['throws', [[25, 'Yeet', 50]], (n) => `Throw ${n} chunks`],
    ['slowmos', [[10, 'Bullet Time', 50]], (n) => `Trigger slow motion ${n} times`],
    ['deaths', [[1, 'Blue Screen of You', 25], [10, 'Reboot Loop', 75]], (n) => `Get knocked out ${n} time${n === 1 ? '' : 's'}`]
  ];
  for (const [k, tiers, desc] of GEN) for (const [n, nm, r] of tiers) add({ id: `g:${k}:${n}`, name: nm, desc: desc(n), k, n, reward: r });

  const S = () => {
    const s = WTP.save;
    if (!s.ach || typeof s.ach !== 'object') s.ach = {};
    s.ach.done = s.ach.done || {};
    s.ach.s = s.ach.s || {};
    if (typeof s.shards !== 'number') s.shards = 0;
    return s.ach;
  };
  const stats = () => S().s;
  const unlockAll = () => !!WTP.save.settings.unlockAll;
  const weaponOwned = (id) => unlockAll() || STARTERS.includes(id) || !!S().done[`w:${id}`];
  const ownedCount = () => WP.DEFS.filter((d) => weaponOwned(d.id)).length;
  const earnedCount = () => WP.DEFS.filter((d) => STARTERS.includes(d.id) || !!S().done[`w:${d.id}`]).length;
  const val = (k) => (k === 'owned' ? earnedCount() : stats()[k] || 0);
  // While unlock-all is on, nothing progresses: borrowed weapons must not earn real unlocks
  const bump = (k, n) => { if (unlockAll()) return; const s = stats(); s[k] = (s[k] || 0) + n; };
  const max = (k, v) => { if (unlockAll()) return; const s = stats(); if (v > (s[k] || 0)) s[k] = v; };

  const icon = (a) => a.weapon ? `<img alt="" src="${WTP.ui?.wImg?.(a.weapon, 3) || ''}">` : '<i class="trophy"></i>';
  let dirty = false;
  function unlock(a) {
    const A = S();
    if (A.done[a.id] || unlockAll()) return;
    A.done[a.id] = Date.now();
    WTP.save.shards += a.reward;
    dirty = true;
    WTP.ui?.clearImgCache?.();
    WTP.ui?.toast?.({ kind: 'ach', icon: icon(a), title: a.weapon ? 'New weapon' : 'Achievement', text: a.weapon ? name(a.weapon) : a.name, reward: `+${a.reward}` });
    AU.play(a.weapon ? 'unlock' : 'achieve');
    if (a.weapon) WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur);
    WTP.ui?.shardsChanged?.();
  }
  function check() {
    if (unlockAll()) return;
    const A = S();
    for (const a of ACH) if (!A.done[a.id] && val(a.k) >= a.n) unlock(a);
    if (dirty) { dirty = false; WTP.persist(); }
  }

  const oStat = G.stat;
  G.stat = (k, n) => { oStat(k, n); if (G.run) bump(k, n); };
  const oKilled = G.enemyKilled;
  G.enemyKilled = (e) => { oKilled(e); bump(`kw:${WP.st.cur}`, 1); if (e.T?.boss) bump('bosses', 1); };
  const oSel = G.selectWeapon;
  let lastOwned = null;
  G.selectWeapon = (id, quiet) => {
    if (id && WP.BY[id] && (STARTERS.includes(id) || S().done[`w:${id}`])) lastOwned = id;
    if (id && WP.BY[id] && !weaponOwned(id)) {
      if (!quiet) { AU.play('deny'); const g = WEAPON_GOAL[id]; G.label?.(g?.secret ? 'SECRET WEAPON' : `LOCKED: ${(g?.desc || '').toUpperCase()}`, 1400); }
      return false;
    }
    return oSel(id, quiet);
  };
  const oEnd = G.end;
  G.end = (reason) => {
    const run = G.run;
    const fresh = run && !run.ended;
    oEnd(reason);
    if (!fresh) return;
    if (!run.continues) bump('runs', 1);
    if (run.modeId === 'time') max('time', Math.floor(WTP.modes.pct()));
    check();
    WTP.persist();
  };

  let lastD = null, lastRun = null, wasDead = false, acc = 0, saveT = 0, winSeen = new Set();
  WP.EXT.updates.push((dt) => {
    const run = G.run;
    if (!run || run.ended) return;
    const Wd = W();
    if (run !== lastRun) {
      lastRun = run; lastD = Wd.destroyed; winSeen = new Set(); run.achWins = 0;
      if (!weaponOwned(WP.st.cur)) { const f = STARTERS.find((id) => WP.BY[id]); if (f) oSel(f, true); }
    }
    const d = Wd.destroyed - lastD;
    lastD = Wd.destroyed;
    if (d > 0) { bump('destroyed', d); bump(`dw:${WP.st.cur}`, d); }
    bump('play', dt);
    const P = PL();
    if (P.dead && !wasDead) bump('deaths', 1);
    wasDead = !!P.dead;
    if ((acc += dt) < 0.5) return;
    acc = 0;
    for (const w of ST()?.wins || []) {
      if (!w || w.state === 'static' || winSeen.has(w.id) || w.reg?.type === 'bar') continue;
      winSeen.add(w.id); bump('windows', 1); run.achWins++;
    }
    max('winrun', run.achWins);
    max('pct', Math.floor(WTP.modes.pct()));
    max('combo', run.maxCombo || 0);
    if (run.wave) max(`wave:${run.modeId}`, run.wave);
    check();
    if ((saveT += 0.5) >= 20) { saveT = 0; WTP.persist(); }
  });

  function goalFor(id) {
    const g = WEAPON_GOAL[id];
    if (!g) return null;
    return { desc: g.desc, secret: !!g.secret, hint: g.hint, cur: Math.min(g.n, val(g.k)), n: g.n };
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  let filter = 'all';
  function renderTab(body) {
    const A = S();
    const done = ACH.filter((a) => A.done[a.id]).length;
    const list = ACH.filter((a) => filter === 'all' || (filter === 'weapons' ? a.weapon : filter === 'general' ? !a.weapon : !A.done[a.id]));
    const prog = (a) => (A.done[a.id] ? 2 : Math.min(1, val(a.k) / a.n) - (a.secret ? 0.5 : 0));
    list.sort((a, b) => (A.done[a.id] ? 1 : 0) - (A.done[b.id] ? 1 : 0) || prog(b) - prog(a));
    const card = (a) => {
      const ok = !!A.done[a.id];
      const cur = Math.min(a.n, val(a.k));
      const hide = a.secret && !ok;
      const title = hide ? 'Secret weapon' : a.name;
      const desc = hide ? a.hint : a.desc;
      const pic = a.weapon ? `<img alt="" src="${WTP.ui.wImg(a.weapon, 3, !ok)}">` : '<i class="trophy"></i>';
      return `<div class="ach${ok ? ' done' : ''}${hide ? ' secret' : ''}"><div class="ai">${pic}</div><div class="at"><b>${esc(title)}</b><span>${esc(desc || '')}</span>${ok ? '' : `<div class="ap"><i style="width:${Math.round((cur / a.n) * 100)}%"></i></div><small>${hide ? '???' : `${fmt(cur)} / ${fmt(a.n)}`}</small>`}</div><div class="ar"><i class="shard"></i>${a.reward}</div></div>`;
    };
    body.innerHTML = `<h2>Achievements</h2>
      <div class="ach-head"><span><b>${done}</b> / ${ACH.length} done</span><span><b>${ownedCount()}</b> / ${WP.DEFS.length} weapons</span><span><i class="shard"></i><b>${fmt(WTP.save.shards || 0)}</b> shards</span></div>
      <div class="ach-filter">${[['all', 'All'], ['todo', 'To do'], ['weapons', 'Weapons'], ['general', 'General']].map(([k, l]) => `<button class="b${filter === k ? ' on' : ''}" data-af="${k}">${l}</button>`).join('')}</div>
      <div class="ach-grid">${list.map(card).join('')}</div>`;
    body.querySelectorAll('[data-af]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.af; renderTab(body); }));
  }
  function changed() { check(); WTP.ui?.clearImgCache?.(); WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur); }
  // Unlock-all is reversible: turning it on snapshots achievements, unlocks and the hotbar, turning it off puts them back.
  // Shards earned in between are kept.
  const snapshot = () => ({ ach: JSON.parse(JSON.stringify(S())), hotbar: WTP.save.hotbar.slice() });
  function setUnlockAll(on) {
    const sv = WTP.save;
    if (!!on === unlockAll()) return;
    if (on) { sv.unlockSnap = snapshot(); sv.settings.unlockAll = true; }
    else {
      sv.settings.unlockAll = false;
      const snap = sv.unlockSnap;
      if (snap) { sv.ach = snap.ach; sv.hotbar = WTP.normHotbar(snap.hotbar); }
      delete sv.unlockSnap;
      sv.hotbar = sv.hotbar.map((id) => (id && weaponOwned(id) ? id : null));
      if (!sv.hotbar.some(Boolean)) sv.hotbar = WTP.progress.defaultHotbar().slice();
      if (WP.st.cur && !weaponOwned(WP.st.cur)) {
        const back = [lastOwned, ...sv.hotbar, ...STARTERS].find((id) => id && WP.BY[id] && weaponOwned(id));
        if (back) oSel(back, true);
      }
    }
    WTP.persist(true);
    WTP.ui?.clearImgCache?.();
    WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur);
  }
  // A save from before the snapshot existed: take it now so turning the switch off still restores something sane
  if (unlockAll() && !WTP.save.unlockSnap) WTP.save.unlockSnap = snapshot();

  WTP.ach = { ACH, BY, STARTERS, WEAPON_GOAL, weaponOwned, ownedCount, goalFor, renderTab, changed, check, stats, val, unlock, setUnlockAll };
  WTP.progress.isOwned = weaponOwned;
  WTP.progress.ownedCount = ownedCount;
  WTP.progress.defaultHotbar = () => ['pistol', 'smg', 'shotgun', 'grenade', 'hammer', 'altf4', null, null, null, null].map((id) => (id && WP.BY[id] ? id : null));
})();
