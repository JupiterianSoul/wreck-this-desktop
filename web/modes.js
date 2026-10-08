(() => {
  const WTP = window.WTP;
  const { rand, pick } = WTP;
  const G = () => WTP.game, Wd = () => WTP.world, EN = () => WTP.enemies, PL = () => WTP.player;
  const pct = () => (Wd().destroyed / Wd().total) * 100;
  const gradeBy = (v, s, a, b, c, lower) => lower ? (v <= s ? 'S' : v <= a ? 'A' : v <= b ? 'B' : v <= c ? 'C' : 'D') : (v >= s ? 'S' : v >= a ? 'A' : v >= b ? 'B' : v >= c ? 'C' : 'D');
  const par = (goal) => Math.round(Math.max(30, Math.min(150, (Wd().total / 1800) * (goal / 50))));
  const deskKey = () => { const r = (Wd().regions || []).filter((x) => x.type === 'window').map((x) => x.cls).sort().join('+'); return r || 'empty'; };

  const MODES = {
    free: {
      name: 'Free Wreck', short: 'Free', music: 'wreck', respawn: true,
      desc: 'No clock, no rules. Wreck your desktop however you like, finish when you want a grade.',
      hud: { pct: true, time: true, score: true, goal: 80 },
      setup(run) { run.goal = 80; G().label('WRECK THIS DESKTOP', 2200); EN().schedule?.({ light: true }); },
      tick(run) { if (!run.goalHit && pct() >= run.goal) { run.goalHit = true; G().announce('DESKTOP FLATTENED!', 4); G().showFinish(true); } },
      grade() { return gradeBy(pct(), 90, 70, 45, 20); },
      bestKey: () => `free:${deskKey()}`, bestVal: (run) => Math.round(run.score), higher: true,
      rows(run) { return [['Destroyed', `${pct().toFixed(1)}%`], ['Time', WTP.fmtTime(run.t)], ['Score', WTP.fmtInt(run.score)], ['Best combo', run.maxCombo]]; }
    },
    speed: {
      name: 'Speedrun', short: 'Speed', music: 'wreck2', respawn: true,
      desc: 'Destroy a share of the screen as fast as you can. The clock starts with your first hit.',
      hud: { pct: true, time: true, score: false, big: 'time' },
      setup(run) { run.goal = WTP.save.settings.speedGoal || 50; run.goalPar = par(run.goal); run.hud = { ...this.hud, goal: run.goal }; G().label(`${run.goal}% AS FAST AS YOU CAN, PAR ${run.goalPar}s`, 2400); },
      tick(run) { if (pct() >= run.goal) G().end('goal'); },
      grade(run) { return run.reason !== 'goal' ? 'D' : gradeBy(run.t, run.goalPar * 0.6, run.goalPar, run.goalPar * 1.5, run.goalPar * 2.2, true); },
      bestKey: (run) => `speed:${run.goal}:${deskKey()}`, bestVal: (run) => run.reason === 'goal' ? Math.round(run.t * 10) / 10 : null, higher: false, fmt: (v) => WTP.fmtTime(v),
      rows(run) { return [['Goal', `${run.goal}%`], ['Time', run.reason === 'goal' ? WTP.fmtTime(run.t) : 'DNF'], ['Par', `${run.goalPar}s`]]; }
    },
    zen: {
      name: 'Zen', short: 'Zen', music: 'zen', respawn: true, noHp: true, infinite: true,
      desc: 'No enemies, infinite ammo, no pressure. Just you and a desktop slowly falling apart.',
      hud: { minimal: true },
      setup() { G().label('BREATHE IN. BREATHE OUT. WRECK.', 2600); },
      tick() { },
      grade() { return 'S'; },
      rows(run) { return [['Destroyed', `${pct().toFixed(1)}%`], ['Time relaxing', WTP.fmtClock(run.t)]]; }
    },
    chaos: {
      name: 'Chaos', short: 'Chaos', music: 'survival', respawn: true,
      desc: 'A disaster every few seconds and waves of desktop annoyances. Survive and wreck.',
      hud: { pct: true, time: true, score: true, hp: true },
      setup(run) { run.disT = 4; run.wave = 0; run.waveT = 3; PL().maxHp = 8; PL().hp = 8; G().label('CHAOS MODE: THE DESKTOP FIGHTS BACK', 2400); G().startTimer(); },
      tick(run, dt) {
        run.disT -= dt;
        if (run.disT <= 0) { run.disT = rand(6, 10); WTP.disasters?.random?.(); }
        const alive = EN().count();
        if (run.spawnQ && run.spawnQ.length) { run.spawnT -= dt; if (run.spawnT <= 0) { EN().spawnEdge(run.spawnQ.shift(), { hpMul: 1 + run.wave * 0.08 }); run.spawnT = Math.max(0.35, 1.2 - run.wave * 0.06); } }
        else if (alive === 0) { run.waveT -= dt; if (run.waveT <= 0) { startWave(run); run.waveT = 6; } }
      },
      grade(run) { return gradeBy(pct() + run.wave * 4, 100, 75, 50, 25); },
      bestKey: () => 'chaos', bestVal: (run) => Math.round(run.score), higher: true,
      rows(run) { return [['Destroyed', `${pct().toFixed(1)}%`], ['Waves', run.wave], ['Kills', run.kills || 0], ['Time', WTP.fmtTime(run.t)]]; }
    }
  };
  function startWave(run) {
    run.wave++;
    const pool = WTP.enemies.WAVE_TYPES || Object.keys(WTP.enemies.TYPES).filter((k) => !WTP.enemies.TYPES[k].boss);
    const q = [];
    const boss = run.wave % 5 === 0;
    if (boss) q.push(pick(WTP.enemies.BOSSES || Object.keys(WTP.enemies.TYPES).filter((k) => WTP.enemies.TYPES[k].boss)));
    const n = 2 + Math.floor(run.wave * 1.3);
    while (q.length < n) q.push(pick(pool));
    run.spawnQ = q; run.spawnT = 0.5;
    G().announce(boss ? 'BOSS INCOMING' : `WAVE ${run.wave}`, boss ? 4 : 2);
    WTP.audio.play('alarm');
  }
  WTP.modes = { MODES, pct, startWave, ORDER: ['free', 'speed', 'zen', 'chaos'] };
})();
