(() => {
  const WTP = window.WTP;
  const { rand, pick } = WTP;
  const G = () => WTP.game, Wd = () => WTP.world, EN = () => WTP.enemies, PL = () => WTP.player;
  const pct = (force) => Math.min(100, (Wd().lost(force) / Wd().total) * 100);
  const gradeBy = (v, s, a, b, c, lower) => lower ? (v <= s ? 'S' : v <= a ? 'A' : v <= b ? 'B' : v <= c ? 'C' : 'D') : (v >= s ? 'S' : v >= a ? 'A' : v >= b ? 'B' : v >= c ? 'C' : 'D');
  const par = (goal) => Math.round(Math.max(30, Math.min(150, (Wd().total / 1800) * (goal / 50))));
  const deskKey = () => { const r = (Wd().regions || []).filter((x) => x.type === 'window').map((x) => x.cls).sort().join('+'); return r || 'empty'; };

  const MODES = {
    free: {
      name: 'Free Wreck', short: 'Free', respawn: true, noDamage: true,
      desc: 'No clock, no rules. Wreck your desktop however you like, finish when you want a grade.',
      hud: { pct: true, time: true, score: true, goal: 80 },
      setup(run) { run.goal = 80; run.enT = 35; G().label('WRECK THIS DESKTOP', 2200); },
      tick(run, dt) {
        if (!run.goalHit && pct() >= run.goal) { run.goalHit = true; G().announce('DESKTOP FLATTENED!', 4); }
        clearTick(run);
      },
      grade() { return gradeBy(pct(), 90, 70, 45, 20); },
      bestKey: () => `free:${deskKey()}`, bestVal: (run) => Math.round(run.score), higher: true,
      rows(run) { return [['Destroyed', `${pct().toFixed(1)}%`], ['Time', WTP.fmtTime(run.t)], ['Score', WTP.fmtInt(run.score)], ['Best combo', run.maxCombo]]; }
    },
    time: {
      name: 'Time Attack', short: 'Time', respawn: true, noDamage: true,
      desc: 'Sixty seconds on the clock. Destroy as much of the screen as you can before it hits zero.',
      hud: { pct: true, time: true, score: true, countdown: true, big: 'time' },
      setup(run) { run.limit = 60; G().label('60 SECONDS. WRECK EVERYTHING.', 2200); G().startTimer(); },
      tick(run) {
        if (run.endless) { clearTick(run); return; }
        const left = run.limit - run.t;
        if (clearTick(run, () => { run.timeBonus = Math.ceil(Math.max(0, left)) * 100; run.score += run.timeBonus; })) return;
        if (left <= 5 && Math.ceil(left) !== run.lastBeep) { run.lastBeep = Math.ceil(left); WTP.audio.play('countdown'); if (left > 0) G().announce(String(Math.ceil(left)), 3); }
        if (left <= 0) G().end('time');
      },
      grade() { return gradeBy(pct(), 60, 40, 25, 12); },
      bestKey: () => `time:${deskKey()}`, bestVal: () => Math.round(pct() * 10) / 10, higher: true, fmt: (v) => `${v}%`,
      rows(run) { return [['Destroyed', `${pct().toFixed(1)}%`], ...(run.timeBonus ? [['Cleared in', WTP.fmtTime(run.clearT)], ['Time bonus', `+${WTP.fmtInt(run.timeBonus)}`]] : []), ['Score', WTP.fmtInt(run.score)], ['Best combo', run.maxCombo]]; }
    },
    zen: {
      name: 'Zen', short: 'Zen', respawn: true, noHp: true, noDamage: true, infinite: true,
      desc: 'No enemies, infinite ammo, no pressure. Just you and a desktop slowly falling apart.',
      hud: { minimal: true },
      setup() { G().label('BREATHE IN. BREATHE OUT. WRECK.', 2600); },
      tick(run) { clearTick(run); },
      grade() { return 'S'; },
      rows(run) { return [['Destroyed', `${pct().toFixed(1)}%`], ['Time relaxing', WTP.fmtClock(run.t)]]; }
    },
    survival: {
      name: 'Survival', short: 'Survival', respawn: false, waves: true,
      desc: 'Endless waves of desktop annoyances, no disasters. Each wave is bigger and tougher. How long can you last?',
      hud: { pct: true, time: true, score: true, hp: true },
      setup(run) { waveSetup(run, 6); G().label('SURVIVE THE DESKTOP', 2200); },
      tick(run, dt) { waveTick(run, dt); },
      grade(run) { return gradeBy(run.wave, 15, 10, 6, 3); },
      bestKey: () => 'survival', bestVal: (run) => run.wave, higher: true, fmt: (v) => `wave ${v}`,
      rows(run) { return [['Wave reached', run.wave], ['Kills', run.kills || 0], ['Destroyed', `${pct().toFixed(1)}%`], ['Time', WTP.fmtTime(run.t)]]; }
    },
    chaos: {
      name: 'Chaos', short: 'Chaos', respawn: false, waves: true,
      desc: 'Endless waves and a disaster every few seconds. Everything gets faster and meaner the longer you last.',
      hud: { pct: true, time: true, score: true, hp: true },
      setup(run) { waveSetup(run, 8); run.disT = 5; G().label('CHAOS: THE DESKTOP FIGHTS BACK', 2400); },
      tick(run, dt) {
        run.disT -= dt;
        if (run.disT <= 0) { run.disT = Math.max(2.5, rand(7, 10) - run.wave * 0.45); WTP.disasters?.random?.(run.wave); }
        waveTick(run, dt);
      },
      grade(run) { return gradeBy(run.wave * 2 + pct() / 10, 30, 20, 12, 6); },
      bestKey: () => 'chaos', bestVal: (run) => run.wave, higher: true, fmt: (v) => `wave ${v}`,
      rows(run) { return [['Wave reached', run.wave], ['Kills', run.kills || 0], ['Destroyed', `${pct().toFixed(1)}%`], ['Time', WTP.fmtTime(run.t)]]; }
    },
    hardcore: {
      name: 'Hardcore Survival', short: 'Hardcore', respawn: false, waves: true,
      desc: 'Survival with limited ammo. Grab supply drops, enemy drops and the caches hidden inside your windows.',
      hud: { pct: true, time: true, score: true, hp: true },
      setup(run) { waveSetup(run, 6); WTP.hardcore.start(run); G().label('HARDCORE: EVERY BULLET COUNTS', 2400); },
      tick(run, dt) { waveTick(run, dt); WTP.hardcore.tick(run, dt); },
      grade(run) { return gradeBy(run.wave, 12, 8, 5, 2); },
      bestKey: () => 'hardcore', bestVal: (run) => run.wave, higher: true, fmt: (v) => `wave ${v}`,
      rows(run) { return [['Wave reached', run.wave], ['Kills', run.kills || 0], ['Supplies found', run.supplies || 0], ['Time', WTP.fmtTime(run.t)]]; }
    }
  };
  // The screen counts as gone once only a few stray cells are left: those crumble so the count really reaches 100%
  function clearTick(run, before) {
    if (run.clearWon || run.endless) return false;
    const w = Wd(), left = w.total - w.lost();
    if (left > Math.max(24, w.total * 0.003)) return false;
    run.clearWon = true; run.clearT = run.t;
    w.finishOff();
    before && before();
    G().win('clear');
    return true;
  }
  function waveSetup(run, hp) { run.wave = 0; run.waveT = 3; run.kills = 0; PL().maxHp = hp; PL().hp = hp; G().startTimer(); }
  const STALL_PULL = 20, STALL_KILL = 50;
  function waveTick(run, dt) {
    const alive = EN().count();
    if (run.spawnQ && run.spawnQ.length) {
      run.spawnT -= dt;
      if (run.spawnT <= 0) {
        // A spawn that throws or returns nothing keeps its place in the queue and retries next tick
        let e = null;
        try { e = EN().spawnEdge(run.spawnQ[0], { hpMul: 1 + run.wave * 0.12 }); } catch (err) { console.warn('spawn failed', run.spawnQ[0], err && err.message); }
        if (e || (run.spawnFail = (run.spawnFail || 0) + 1) > 30) { run.spawnQ.shift(); run.spawnFail = 0; run.spawnT = Math.max(0.25, 1.1 - run.wave * 0.05); }
        else run.spawnT = 0;
      }
      run.stallT = 0;
    } else if (alive > 0) {
      const h = EN().hits();
      if (h !== run.lastHits) { run.lastHits = h; run.stallT = 0; run.pulled = false; }
      else run.stallT = (run.stallT || 0) + dt;
      if (run.stallT >= STALL_PULL && !run.pulled) { run.pulled = true; if (EN().unstick()) G().label('STRAGGLERS PULLED INTO THE OPEN', 1600); }
      if (run.stallT >= STALL_KILL) { run.stallT = 0; run.pulled = false; if (EN().timeout()) G().label('UNREACHABLE ENEMIES TIMED OUT', 1600); }
    }
    else if (alive === 0) {
      if (run.wave > 0 && !run.cleared) { run.cleared = true; G().announce(`WAVE ${run.wave} CLEARED`, 3); G().bonus(150 * run.wave, PL().x, PL().y - 20); if (run.wave % 2 === 0) EN().drop('heart', PL().x + 10, PL().y - 30); }
      run.waveT -= dt;
      if (run.waveT <= 0) { startWave(run); run.waveT = 4; run.cleared = false; }
    }
  }
  function startWave(run) {
    run.wave++;
    const pool = WTP.enemies.WAVE_TYPES || Object.keys(WTP.enemies.TYPES).filter((k) => !WTP.enemies.TYPES[k].boss);
    const q = [];
    const boss = run.wave % 5 === 0;
    if (boss) q.push(pick(WTP.enemies.BOSSES || Object.keys(WTP.enemies.TYPES).filter((k) => WTP.enemies.TYPES[k].boss)));
    const n = 3 + Math.floor(run.wave * 1.5);
    if (boss && run.wave >= 10) q.push(pick(WTP.enemies.BOSSES || ['tray']));
    while (q.length < n) q.push(pick(pool));
    run.spawnQ = q; run.spawnT = 0.5; run.spawnFail = 0; run.stallT = 0; run.pulled = false;
    G().announce(boss ? 'BOSS INCOMING' : `WAVE ${run.wave}`, boss ? 4 : 2);
    WTP.audio.play('alarm');
  }
  // Enemies still to beat this wave: alive plus queued
  const enemiesLeft = (run) => EN().count() + (run.spawnQ ? run.spawnQ.length : 0);
  WTP.modes = { MODES, pct, startWave, enemiesLeft, STALL_PULL, STALL_KILL, ORDER: ['free', 'time', 'zen', 'survival', 'chaos', 'hardcore'] };
})();
