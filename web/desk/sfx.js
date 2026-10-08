(() => {
  const WTP = window.WTP;
  const AU = WTP.audio;
  const { osc, fm, noise, vary } = AU.synth;
  const SFX = AU.SFX, META = AU.META, LOOPS = AU.LOOPS;
  const R = Math.random, rr = (a, b) => a + R() * (b - a);
  const D = (o, d) => ({ ...o, delay: (o.delay || 0) + d });

  const CATS = {
    ui: { target: -30, gap: 25, max: 4 },
    reward: { target: -25, gap: 40, max: 3, vip: true },
    move: { target: -31, gap: 60, max: 3 },
    gunS: { target: -21, gap: 28, max: 6, vip: true },
    gunL: { target: -15, gap: 60, max: 3, vip: true },
    energy: { target: -20, gap: 35, max: 5, vip: true },
    throw: { target: -27, gap: 50, max: 3 },
    melee: { target: -18, gap: 50, max: 4, vip: true },
    boom: { target: -13, gap: 35, max: 4, win: 220 },
    big: { target: -10, gap: 120, max: 2, vip: true, win: 400 },
    impact: { target: -31, gap: 30, max: 4, win: 120 },
    break: { target: -23, gap: 55, max: 3, win: 200 },
    enemy: { target: -26, gap: 50, max: 3 },
    desk: { target: -21, gap: 40, max: 4, vip: true },
    gag: { target: -26, gap: 60, max: 3 },
    loop: { target: -27 },
    loopL: { target: -19 }
  };
  AU.CATS = CATS;
  const S = (cat, name, fn, m = {}) => { SFX[name] = fn; META[name] = { cat, ...CATS[cat], ...m }; };
  const LP = (cat, kind, fn) => { LOOPS[kind] = fn; META['loop:' + kind] = { cat, ...CATS[cat] }; };

  const crack = (v, f = 7000, d = 0.014, o = {}) => noise(d, f, f * 0.7, v, 'highpass', 0.7, o);
  const body = (d, f0, f1, v, o = {}) => noise(d, f0, f1, v, 'lowpass', 0.9, o);
  const sub = (f0, f1, d, v, o = {}) => osc('sine', f0, f1, d, v, o);
  const tail = (d, f, v, o = {}) => noise(d, f, 70, v, 'lowpass', 0.6, { room: 1, attack: 0.012, ...o });
  const tick = (v, f = 2600, d = 0.012, o = {}) => noise(d, f, f * 0.85, v, 'bandpass', 6, o);
  const mech = (v, f = 2400, gap = 0.05, o = {}) => { tick(v, f, 0.012, o); tick(v * 0.8, f * 0.72, 0.014, D(o, gap)); };
  const whoosh = (d, f0, f1, v, o = {}) => noise(d, f0, f1, v, 'bandpass', 1.3, { attack: d * 0.4, ...o });
  const rumble = (d, v, f = 220, o = {}) => noise(d, f, 40, v, 'lowpass', 0.6, { attack: 0.03, ...o });
  const crackle = (n, spread, v, f = 3000, o = {}) => { for (let k = 0; k < n; k++) noise(0.006 + R() * 0.012, f * rr(0.6, 1.4), f * 0.5, v * rr(0.4, 1), 'bandpass', 2.5, D(o, R() * spread)); };
  const MODES = {
    metal: [[1, 1, 0.5], [2.76, 0.55, 0.34], [5.4, 0.32, 0.2], [8.93, 0.18, 0.12]],
    plate: [[1, 1, 0.9], [1.59, 0.7, 0.7], [2.14, 0.5, 0.5], [2.65, 0.4, 0.4], [3.16, 0.3, 0.3]],
    glass: [[1, 1, 0.55], [2.32, 0.6, 0.42], [4.25, 0.42, 0.3], [6.63, 0.3, 0.2], [9.38, 0.2, 0.14]],
    wood: [[1, 1, 0.08], [2.42, 0.5, 0.055], [3.9, 0.25, 0.035]],
    plastic: [[1, 1, 0.05], [1.9, 0.55, 0.04], [3.2, 0.3, 0.025]],
    bell: [[1, 1, 1.1], [2.0, 0.6, 0.85], [2.4, 0.45, 0.7], [3.0, 0.3, 0.5], [4.5, 0.2, 0.35]],
    stone: [[1, 1, 0.05], [1.7, 0.6, 0.035]]
  };
  const modal = (mat, f, v, o = {}) => { const dm = o.decay || 1; for (const [r, a, d] of MODES[mat]) osc('sine', f * r, f * r * (o.bend || 1), d * dm, v * a, o); };
  const blip = (f, d, v, type = 'p25', o = {}) => osc(type, f, f, d, v, o);
  const arp = (fs, step, d, v, type = 'p25', o = {}) => fs.forEach((f, i) => osc(type, f, f, d, v, D(o, i * step)));
  const zap = (f0, f1, d, v, o = {}) => osc('sawtooth', f0, f1, d, v, { lp: 3500, ...o });
  const gun = (c, o = {}) => {
    crack(c.cv, c.cf || 7000, c.cd || 0.014, o);
    body(c.bd, c.bf, c.bf * 0.18, c.bv, { drive: c.drive, ...o });
    sub(c.sf, c.sf * 0.35, c.sd, c.sv, o);
    if (c.tail) tail(c.tail, c.tf || 1500, c.tv, D(o, 0.015));
    if (c.mech) mech(c.mech, c.mf || 2600, 0.045, D(o, c.md || 0.06));
  };
  const CAL = {
    tiny: { cv: 0.22, cf: 9000, bd: 0.03, bf: 3800, bv: 0.16, sf: 320, sd: 0.03, sv: 0.08 },
    small: { cv: 0.38, cf: 7500, bd: 0.07, bf: 2800, bv: 0.42, sf: 210, sd: 0.08, sv: 0.32, tail: 0.18, tv: 0.06, drive: 1.5 },
    smg: { cv: 0.3, cf: 7000, bd: 0.05, bf: 2500, bv: 0.36, sf: 170, sd: 0.05, sv: 0.24, drive: 1.6 },
    rifle: { cv: 0.48, cf: 7000, bd: 0.12, bf: 3200, bv: 0.55, sf: 140, sd: 0.12, sv: 0.4, tail: 0.35, tv: 0.12, drive: 2 },
    mini: { cv: 0.2, cf: 6000, bd: 0.035, bf: 2200, bv: 0.26, sf: 110, sd: 0.04, sv: 0.2, drive: 2 },
    cannon: { cv: 0.6, cf: 6500, bd: 0.3, bf: 2400, bv: 0.85, sf: 105, sd: 0.36, sv: 0.6, tail: 0.75, tv: 0.2, drive: 2.4 },
    shot: { cv: 0.5, cf: 5000, bd: 0.36, bf: 2000, bv: 0.95, sf: 88, sd: 0.36, sv: 0.66, tail: 0.85, tv: 0.24, drive: 2.6 },
    sniper: { cv: 0.7, cf: 9000, cd: 0.01, bd: 0.24, bf: 3600, bv: 0.7, sf: 98, sd: 0.5, sv: 0.6, tail: 1.6, tf: 1100, tv: 0.22, drive: 2.2 }
  };
  const MAT = ['paper', 'ink', 'glass', 'metal', 'wood', 'image', 'button', 'stone', 'plastic', 'gold', 'rubber', 'inkpen'];
  function matHit(m, s = 1) {
    const v = Math.min(1.3, 0.55 + s * 0.15);
    switch (m) {
      case 'metal': case 'gold': modal(m === 'gold' ? 'bell' : 'metal', vary(1900 / Math.sqrt(s), 0.08), 0.05 * v, { decay: 0.35 }); tick(0.12 * v, 5000, 0.01); break;
      case 'wood': modal('wood', vary(520, 0.1), 0.2 * v); noise(0.035, 1100, 600, 0.22 * v, 'bandpass', 2); break;
      case 'glass': modal('glass', vary(3400, 0.1), 0.03 * v, { decay: 0.4 }); noise(0.05, 7000, 4000, 0.12 * v, 'highpass', 0.7); break;
      case 'stone': sub(170, 80, 0.06, 0.25 * v); noise(0.06, 1400, 500, 0.22 * v, 'lowpass', 1); crackle(3, 0.05, 0.1 * v, 2200); break;
      case 'plastic': case 'button': case 'inkpen': modal('plastic', vary(950, 0.1), 0.12 * v); tick(0.18 * v, 3200, 0.012); break;
      case 'rubber': osc('sine', vary(240), 420, 0.08, 0.18 * v, { vib: 30, vibA: 30 }); break;
      default: noise(0.03, 2200, 900, 0.22 * v, 'bandpass', 1.1); crackle(3, 0.05, 0.08 * v, 5200);
    }
  }
  WTP.sfxMat = (i) => MAT[i] || 'paper';

  S('gunS', 'pistol', () => gun(CAL.small));
  S('gunS', 'perfect', () => { gun(CAL.small); fm(vary(2600, 0.02), 3900, 1.2, 0.14, 0.035, { delay: 0.02 }); });
  S('gunS', 'dual', () => { const k = (SFX.dualK = (SFX.dualK || 0) ^ 1); gun({ ...CAL.small, bf: k ? 3000 : 2500, sf: k ? 230 : 190, tail: 0.12 }); });
  S('gunS', 'nail', () => { gun(CAL.tiny); tick(0.14, vary(4200), 0.01, { delay: 0.008 }); osc('square', vary(1600), 700, 0.018, 0.025, { lp: 3000 }); });
  S('gunS', 'smg', () => gun({ ...CAL.smg, bf: vary(2500, 0.08) }));
  S('gunS', 'rifle', () => gun(CAL.rifle));
  S('gunS', 'burst', () => gun({ ...CAL.rifle, tail: 0.2, tv: 0.08 }));
  S('gunS', 'minigun', () => gun({ ...CAL.mini, sf: vary(110, 0.1) }), { gap: 40, max: 8 });
  S('gunS', 'minigunStop', () => { osc('sawtooth', 150, 40, 0.75, 0.05, { lp: 700 }); noise(0.6, 900, 200, 0.08, 'bandpass', 2); mech(0.08, 1800, 0.3, { delay: 0.4 }); });
  S('gunL', 'revolver', () => { gun(CAL.cannon); mech(0.07, 2100, 0.03, { delay: 0.32 }); });
  S('gunL', 'shotgun', () => { gun(CAL.shot); SFX.rack({ delay: 0.32 }); });
  S('gunS', 'rack', (o) => { o = o || {}; noise(0.04, 2400, 1800, 0.16, 'bandpass', 4, o); modal('metal', 1400, 0.03, D({ decay: 0.15 }, o.delay || 0)); noise(0.05, 1800, 1200, 0.18, 'bandpass', 4, D(o, 0.1)); modal('metal', 1050, 0.035, D({ decay: 0.18 }, (o.delay || 0) + 0.1)); });
  S('gunL', 'double', () => { gun({ ...CAL.shot, sf: 75, sd: 0.45, sv: 0.8, tail: 1.1 }); body(0.38, 1700, 260, 0.6, { delay: 0.016, drive: 2.6 }); });
  S('gunL', 'sniper', () => { gun(CAL.sniper); mech(0.1, 2000, 0.09, { delay: 0.5 }); });
  S('gunL', 'flak', () => { gun({ ...CAL.cannon, bf: 1800, tail: 0.4 }); osc('triangle', 320, 110, 0.12, 0.06); });
  S('gunS', 'confetti', () => { sub(220, 90, 0.08, 0.3); noise(0.07, 2600, 1500, 0.35, 'bandpass', 1.5); osc('sine', 500, 1700, 0.2, 0.05, { delay: 0.02 }); crackle(10, 0.3, 0.06, 7000, { delay: 0.05 }); });
  S('gunS', 'paint', () => { noise(0.06, 900, 300, 0.32, 'lowpass', 1); sub(vary(240), 120, 0.05, 0.16); osc('sine', vary(700), 260, 0.06, 0.04, { delay: 0.01 }); });
  S('gunS', 'ball', () => { osc('sine', vary(650), 260, 0.08, 0.16); tick(0.1, 2200, 0.01); }, { gap: 35 });
  S('gunS', 'sawShot', () => { gun(CAL.small); osc('sawtooth', vary(900), 1700, 0.2, 0.035, { lp: 3200, delay: 0.02 }); });
  S('gunS', 'flare', () => { sub(260, 110, 0.06, 0.25); noise(0.04, 3000, 1500, 0.3, 'bandpass', 1); whoosh(0.35, 800, 3200, 0.18, { delay: 0.02 }); });
  S('gunS', 'twang', () => { osc('triangle', vary(196), 118, 0.32, 0.16, { vib: 28, vibA: 10 }); tick(0.25, 2400, 0.02); whoosh(0.14, 1200, 3200, 0.07, { delay: 0.02 }); });
  S('gunS', 'harpoon', () => { sub(170, 70, 0.12, 0.42); noise(0.12, 2600, 500, 0.35, 'bandpass', 1); osc('sawtooth', 320, 100, 0.2, 0.04, { lp: 1600 }); whoosh(0.3, 500, 1600, 0.08, { delay: 0.05 }); });
  S('gunS', 'harpoonHit', () => { matHit('metal', 2); sub(200, 80, 0.1, 0.3); });
  S('gunL', 'rocket', () => { sub(110, 50, 0.18, 0.5); noise(0.06, 1400, 400, 0.45, 'lowpass', 1); whoosh(0.65, 300, 2600, 0.38); osc('sawtooth', 80, 52, 0.5, 0.05, { lp: 500 }); });
  S('gunL', 'launch', () => { for (let i = 0; i < 4; i++) { whoosh(0.16, 800, 3000, 0.2, { delay: i * 0.055 }); sub(180, 90, 0.05, 0.18, { delay: i * 0.055 }); } });
  S('gunL', 'nukeLaunch', () => { osc('sawtooth', 55, 200, 1.1, 0.09, { lp: 800 }); whoosh(1.1, 200, 1400, 0.3); blip(880, 0.1, 0.04, 'square', { delay: 0.1 }); blip(880, 0.1, 0.04, 'square', { delay: 0.4 }); });
  S('gunS', 'lava', () => { sub(vary(130), 48, 0.18, 0.3); noise(0.18, 520, 140, 0.26, 'lowpass', 1); osc('sine', vary(340), 200, 0.07, 0.06, { delay: 0.08 }); });
  S('gunS', 'firework', () => { sub(200, 90, 0.06, 0.2); whoosh(0.6, 900, 4200, 0.18); osc('sine', 700, 2600, 0.55, 0.04); });

  S('energy', 'plasma', () => { fm(vary(700), 350, 6, 0.24, 0.1, { f1: 180 }); sub(480, 90, 0.18, 0.16); noise(0.05, 4000, 1500, 0.12, 'bandpass', 2); });
  S('energy', 'rail', () => { crack(0.4, 9000, 0.02); zap(2600, 60, 0.5, 0.09); fm(3200, 4800, 4, 0.3, 0.04); tail(0.7, 3000, 0.25); sub(80, 22, 0.6, 0.55); });
  S('energy', 'charge', () => { zap(180, 1800, 0.45, 0.045); osc('sine', 400, 2400, 0.45, 0.03); });
  S('energy', 'tesla', () => { noise(0.1, 5200, 2200, 0.3, 'bandpass', 2); osc('sawtooth', vary(110), 70, 0.1, 0.06, { vib: 60, vibA: 40, lp: 3000 }); crackle(4, 0.08, 0.12, 6000); });
  S('energy', 'sound', () => { osc('sine', 70, 34, 0.6, 0.7, { vib: 9, vibA: 18 }); osc('square', 140, 45, 0.45, 0.07, { lp: 700 }); rumble(0.5, 0.4, 500); });
  S('energy', 'glitch', () => { for (let i = 0; i < 4; i++) osc('square', rr(200, 2600), rr(100, 3100), 0.035, 0.035, { delay: i * 0.025, lp: 5000 }); noise(0.05, 6000, 2000, 0.14, 'bandpass', 8, { delay: 0.05 }); });
  S('energy', 'laserZap', () => { zap(1800, 300, 0.25, 0.06); noise(0.2, 5000, 2000, 0.13, 'bandpass', 2); });
  S('energy', 'laserCharge', () => zap(100, 1200, 0.6, 0.05));
  S('energy', 'backspace', () => { tick(0.2, 4600, 0.015); blip(1200, 0.03, 0.04, 'square'); osc('square', 800, 400, 0.06, 0.025, { delay: 0.03, lp: 3000 }); });
  S('energy', 'portal', () => { osc('sine', 300, 1200, 0.25, 0.1, { vib: 18, vibA: 50 }); osc('p12', 600, 2400, 0.2, 0.03); });
  S('energy', 'portalOut', () => osc('sine', 1200, 300, 0.25, 0.1, { vib: 18, vibA: 50 }));
  S('energy', 'blink', () => { osc('sine', 1800, 200, 0.25, 0.08, { vib: 40, vibA: 200 }); noise(0.15, 6000, 1500, 0.16, 'highpass', 0.5); });
  S('energy', 'teleport', () => { osc('sine', 300, 1500, 0.15, 0.06); osc('sine', 1500, 300, 0.15, 0.06, { delay: 0.15 }); });
  S('energy', 'trackBeam', () => { zap(1600, 400, 0.25, 0.06); noise(0.2, 7000, 3000, 0.2, 'highpass', 0.6); });
  S('energy', 'zap', () => { noise(0.1, 6000, 2000, 0.26, 'bandpass', 2); osc('sawtooth', 120, 80, 0.12, 0.06, { vib: 60, vibA: 40, lp: 3000 }); });
  S('energy', 'warp', () => { osc('sine', 900, 120, 0.8, 0.18, { vib: 7, vibA: 90 }); osc('triangle', 1800, 300, 0.6, 0.035); });
  S('energy', 'scan', () => { osc('sine', 400, 1600, 0.6, 0.05); osc('sine', 1600, 400, 0.6, 0.05, { delay: 0.6 }); });

  S('throw', 'throw', () => { whoosh(0.14, 700, 2400, 0.2); tick(0.08, 1800, 0.012); });
  S('throw', 'pin', () => { modal('metal', vary(2600), 0.03, { decay: 0.4 }); whoosh(0.14, 800, 2400, 0.16, { delay: 0.08 }); });
  S('throw', 'rattle', () => { for (let i = 0; i < 5; i++) tick(0.14, 3000 + i * 300, 0.02, { delay: i * 0.03 }); whoosh(0.14, 800, 2400, 0.14, { delay: 0.12 }); });
  S('throw', 'squelch', () => { osc('sine', vary(380), 140, 0.14, 0.16, { vib: 40, vibA: 60 }); noise(0.12, 900, 400, 0.16, 'bandpass', 2); });
  S('throw', 'clankMine', () => { modal('metal', vary(620), 0.06, { decay: 0.5 }); tick(0.18, 3000, 0.02); });
  S('throw', 'warpThrow', () => { osc('sine', 600, 90, 0.5, 0.12, { vib: 12, vibA: 80 }); osc('triangle', 1200, 200, 0.4, 0.035); });
  S('throw', 'flarePop', () => { sub(300, 120, 0.06, 0.22); whoosh(0.3, 900, 3000, 0.16); blip(1400, 0.05, 0.035, 'square', { delay: 0.2 }); blip(1400, 0.05, 0.035, 'square', { delay: 0.32 }); });
  S('throw', 'snowThrow', () => whoosh(0.12, 1500, 4000, 0.14));
  S('throw', 'banana', () => osc('triangle', 300, 700, 0.12, 0.1, { vib: 20, vibA: 40 }));
  S('throw', 'beep', () => blip(1500, 0.05, 0.045, 'square'));
  S('throw', 'boomerang', () => whoosh(0.16, 1400, 500, 0.14, { attack: 0.03 }), { gap: 110 });
  S('throw', 'bowlThrow', () => { sub(120, 60, 0.18, 0.36); noise(0.12, 600, 300, 0.18, 'lowpass', 1); });
  S('throw', 'agravThrow', () => osc('sine', 200, 900, 0.3, 0.07, { vib: 10, vibA: 60 }));
  S('throw', 'jar', () => { modal('glass', vary(1800), 0.03, { decay: 0.4 }); whoosh(0.12, 800, 2400, 0.12); });
  S('throw', 'tornadoCall', () => { whoosh(1.2, 200, 1400, 0.3); osc('sine', 120, 400, 1, 0.04, { vib: 4, vibA: 60 }); });
  S('throw', 'buzz', () => osc('sawtooth', vary(220), 240, 0.25, 0.025, { lp: 1200 }), { gap: 300 });
  S('throw', 'hookFire', () => { whoosh(0.12, 1500, 4000, 0.14); fm(1500, 2300, 1, 0.06, 0.025); });
  S('throw', 'hookHit', () => { matHit('metal', 1.5); sub(200, 90, 0.05, 0.18); });
  S('throw', 'hookMiss', () => osc('square', 600, 300, 0.08, 0.025, { lp: 2000 }));
  S('throw', 'release', () => noise(0.12, 2000, 600, 0.12, 'bandpass', 2));
  S('throw', 'glideOpen', () => whoosh(0.2, 2000, 800, 0.14, { attack: 0.02 }));
  S('throw', 'fling', () => { whoosh(0.2, 400, 3000, 0.3); sub(300, 60, 0.25, 0.26); });
  S('throw', 'grab', () => { osc('sine', 120, 400, 0.2, 0.18); whoosh(0.15, 300, 1500, 0.14); });
  S('throw', 'yank', () => { osc('sine', 200, 700, 0.12, 0.1); whoosh(0.1, 600, 2400, 0.12); });
  S('throw', 'slurp', () => osc('sine', vary(300), 900, 0.07, 0.05), { gap: 80 });
  S('throw', 'blowOut', () => { whoosh(0.5, 400, 2500, 0.36); sub(180, 60, 0.2, 0.26); });
  S('throw', 'junkShot', () => { noise(0.04, 1500, 600, 0.2, 'bandpass', 1); crackle(2, 0.03, 0.08, 2500); }, { gap: 50 });
  S('throw', 'spring', () => osc('triangle', 300, 1100, 0.14, 0.07, { vib: 30, vibA: 50 }));
  S('throw', 'padDrop', () => { sub(220, 110, 0.06, 0.22); osc('triangle', 500, 800, 0.08, 0.04); });
  S('throw', 'snap', () => { noise(0.06, 3000, 900, 0.28, 'bandpass', 1.5); osc('square', 900, 200, 0.12, 0.035, { lp: 2500 }); });
  S('throw', 'fuse', () => noise(0.4, 6000, 4000, 0.1, 'highpass', 0.6));
  S('throw', 'swoosh', () => whoosh(0.18, 400, 2600, 0.2));

  S('melee', 'slash', () => { whoosh(0.13, 2200, 8000, 0.32, { attack: 0.02 }); fm(vary(2600), 3640, 1.5, 0.2, 0.03, { delay: 0.04 }); });
  S('melee', 'katana', () => { whoosh(0.12, 3000, 9000, 0.36, { attack: 0.015 }); osc('sine', 2400, 1200, 0.15, 0.04); });
  S('melee', 'hammer', () => { sub(140, 38, 0.28, 0.62); body(0.22, 900, 80, 0.55, { room: 1 }); matHit('wood', 2); });
  S('melee', 'heave', () => { whoosh(0.24, 180, 900, 0.3); osc('sine', 90, 60, 0.2, 0.1); });
  S('melee', 'stampW', () => { whoosh(0.12, 400, 1400, 0.2); sub(130, 50, 0.16, 0.5, { delay: 0.05 }); body(0.12, 1200, 200, 0.4, { delay: 0.05 }); });
  S('melee', 'stamp', () => { sub(160, 50, 0.3, 0.55); body(0.25, 1200, 100, 0.5); modal('wood', 300, 0.15); });
  S('throw', 'whipWind', () => whoosh(0.2, 300, 1800, 0.25));
  S('melee', 'whipCrack', () => { crack(0.55, 9000, 0.02, { room: 1 }); osc('square', 3200, 800, 0.02, 0.08); noise(0.12, 4000, 900, 0.18, 'bandpass', 1, { delay: 0.012 }); });
  S('melee', 'whipHit', () => { sub(260, 110, 0.06, 0.22); noise(0.05, 3000, 1000, 0.18, 'bandpass', 2); }, { gap: 60 });
  S('melee', 'springPunch', () => { osc('triangle', 200, 900, 0.14, 0.08, { vib: 25, vibA: 80 }); whoosh(0.12, 600, 2400, 0.14); });
  S('melee', 'punch', () => { sub(160, 50, 0.14, 0.5); body(0.08, 2000, 300, 0.42); });
  S('throw', 'kick', () => whoosh(0.1, 500, 2400, 0.3));
  S('melee', 'kickHit', () => { sub(180, 60, 0.1, 0.42); body(0.08, 1800, 300, 0.36); });
  S('melee', 'sawHit', () => { fm(1200, 1700, 3, 0.12, 0.05); noise(0.1, 5000, 2500, 0.22, 'bandpass', 2); });
  S('melee', 'sawGrind', () => { osc('sawtooth', vary(320), 280, 0.09, 0.04, { lp: 2400, vib: 80, vibA: 30 }); noise(0.09, 4500, 3000, 0.1, 'bandpass', 3); }, { gap: 90 });
  S('melee', 'chainsawRev', () => osc('sawtooth', 90, 260, 0.35, 0.08, { lp: 1600, vib: 30, vibA: 20 }));
  S('melee', 'drill', () => osc('square', 160, 220, 0.25, 0.05, { lp: 1200, vib: 40, vibA: 30 }));
  S('melee', 'poundStart', () => { osc('sine', 700, 200, 0.18, 0.07); whoosh(0.15, 1500, 500, 0.12); });
  S('melee', 'pound', () => { sub(120, 30, 0.35, 0.66); body(0.3, 900, 60, 0.55, { room: 1 }); crackle(6, 0.2, 0.1, 1800); });
  S('melee', 'slam', () => { sub(110, 30, 0.4, 0.6); body(0.4, 900, 80, 0.55, { room: 1 }); crackle(5, 0.25, 0.1, 1600); });
  S('melee', 'bowlHit', () => { sub(150, 60, 0.12, 0.38); body(0.08, 1200, 300, 0.24); });
  S('melee', 'bowlRoll', () => { noise(0.14, 260, 200, 0.16, 'lowpass', 2); sub(vary(60), 55, 0.12, 0.07); }, { gap: 120 });
  S('melee', 'pins', () => { for (let i = 0; i < 4; i++) modal('wood', vary(900, 0.15), 0.12, { delay: i * 0.03 }); }, { gap: 80 });
  S('throw', 'plow', () => noise(0.09, 1200, 500, 0.3, 'lowpass', 1), { gap: 90 });

  function boom(r = 20) {
    const s = Math.min(1, Math.max(0, r / 60)), v = 0.7 + s * 0.5;
    crack(0.32 + s * 0.2, 5200 - s * 2400, 0.02);
    sub(92 - s * 48, 26, 0.32 + s * 1.2, 0.68 * v);
    body(0.24 + s * 1.1, 2400 - s * 1300, 60, 0.72 * v, { drive: 1.4 + s * 1.6 });
    rumble(0.55 + s * 2.2, (0.3 + s * 0.3) * v, 320, { delay: 0.04 });
    crackle(Math.round(4 + s * 14), 0.15 + s * 0.6, 0.11, 2800, { delay: 0.04 });
    if (r > 12) tail(0.6 + s * 1.8, 900, 0.22 * v);
  }
  S('boom', 'boom', boom, { gap: 40 });
  S('boom', 'blastBoots', () => { boom(8); osc('square', 220, 660, 0.1, 0.03, { lp: 2000 }); });
  S('boom', 'glitchBoom', () => { boom(18); SFX.glitch(); });
  S('boom', 'unzip', () => { zap(80, 2400, 0.25, 0.06); boom(30); });
  S('throw', 'missile', () => { whoosh(0.3, 1200, 3000, 0.4); osc('sawtooth', 300, 900, 0.3, 0.03, { lp: 3000 }); });
  S('boom', 'meteor', () => { whoosh(0.8, 3000, 300, 0.22); rumble(0.6, 0.14, 300, { delay: 0.2 }); });
  S('boom', 'meteorFall', () => { whoosh(1.2, 300, 1800, 0.3); osc('sine', 400, 80, 1.2, 0.05); });
  S('boom', 'whistle', () => osc('sine', 1600, 500, 0.7, 0.045));
  S('boom', 'siren', () => { osc('sawtooth', 500, 900, 0.45, 0.04, { lp: 2000 }); osc('sawtooth', 500, 900, 0.45, 0.04, { lp: 2000, delay: 0.5 }); });
  S('big', 'nuke', () => { crack(0.6, 4000, 0.03); sub(70, 18, 3, 0.9); body(2.4, 2200, 30, 0.9, { drive: 3, room: 1 }); rumble(3.6, 0.6, 260, { delay: 0.1 }); crackle(30, 1.6, 0.1, 2200, { delay: 0.1 }); osc('sawtooth', 50, 25, 2.5, 0.08, { lp: 300 }); }, { max: 1 });
  S('big', 'hole', () => { osc('sine', 60, 25, 2.4, 0.45); rumble(2.2, 0.3, 220); });
  S('big', 'orbital', () => { zap(80, 1600, 1.2, 0.07, { lp: 4000 }); rumble(1.2, 0.2, 400); });
  S('big', 'beam', () => { whoosh(1.6, 400, 4000, 0.5); sub(55, 30, 1.8, 0.65); crackle(16, 1.4, 0.08, 4000); });
  S('big', 'quake', () => { rumble(2.6, 0.75, 120); sub(40, 25, 2.5, 0.75); crackle(24, 2.2, 0.08, 1400); });
  S('big', 'thunder', () => { crack(0.9, 9000, 0.05); body(1.6, 900, 40, 0.75, { room: 1, delay: 0.04 }); sub(60, 24, 1.4, 0.65, { delay: 0.04 }); crackle(10, 0.5, 0.12, 5000); });
  S('big', 'bsod', () => { osc('sine', 523, 523, 0.5, 0.1); osc('sine', 659, 659, 0.5, 0.09, { delay: 0.12 }); osc('sine', 392, 392, 0.9, 0.1, { delay: 0.3 }); rumble(1.2, 0.4, 300, { delay: 0.9, room: 1 }); sub(60, 25, 1.4, 0.5, { delay: 0.9 }); });
  S('big', 'bluescreen', () => SFX.bsod());
  S('big', 'bossDie', () => { boom(50); arp([392, 330, 262, 196], 0.18, 0.3, 0.05, 'square', { delay: 0.2, lp: 2400 }); });
  S('big', 'bossIn', () => { osc('sawtooth', 110, 55, 1.2, 0.08, { lp: 800 }); rumble(1, 0.3, 300); });

  S('impact', 'impact', (m) => matHit(typeof m === 'number' ? MAT[m] : m || 'paper', 1), { gap: 30 });
  S('impact', 'hit', (o) => matHit(MAT[o?.m] || o?.m || 'paper', o?.s || 1), { gap: 30 });
  S('impact', 'metalTick', (r = 2) => matHit('metal', Math.max(0.6, r / 2.5)), { gap: 55 });
  S('impact', 'tink', () => modal('metal', vary(3400, 0.1), 0.025, { decay: 0.15 }), { gap: 45 });
  S('impact', 'tinkle', () => modal('glass', rr(2600, 5000), 0.016, { decay: 0.2 }), { gap: 35 });
  S('impact', 'ricochet', () => { osc('sine', vary(2800), 1100, 0.2, 0.045); tick(0.12, 5000, 0.01); }, { gap: 60 });
  S('impact', 'thud', (n = 1) => { sub(vary(130), 70, 0.08, 0.2); noise(0.06, 700, 200, 0.14, 'lowpass', 1); }, { gap: 70 });
  S('move', 'step', () => noise(0.035, 900, 400, 0.18, 'bandpass', 2), { gap: 140 });
  S('impact', 'scratch', () => noise(0.05, 5000, 3500, 0.1, 'bandpass', 4), { gap: 90 });
  S('impact', 'munch', () => { noise(0.03, 1800, 900, 0.1, 'bandpass', 3); crackle(2, 0.03, 0.05, 3000); }, { gap: 60 });
  S('impact', 'harpoonHit', () => matHit('metal', 2));
  S('impact', 'snow', () => { noise(0.1, 2500, 1200, 0.16, 'bandpass', 2); sub(200, 140, 0.05, 0.07); });
  S('impact', 'water', () => noise(0.1, 1500, 700, 0.18, 'bandpass', 1), { gap: 60 });
  S('impact', 'splash', () => { noise(0.18, 1800, 600, 0.22, 'bandpass', 1); crackle(5, 0.12, 0.06, 4000); }, { gap: 80 });
  S('impact', 'acid', () => { noise(0.2, 5000, 2600, 0.08, 'highpass', 0.6); osc('sine', vary(900), 1400, 0.04, 0.02, { delay: 0.05 }); }, { gap: 120 });
  S('impact', 'sizzle', () => noise(0.3, 5000, 3000, 0.08, 'highpass'), { gap: 120 });
  S('impact', 'steam', () => noise(0.5, 6000, 2500, 0.09, 'highpass', 0.5), { gap: 400 });
  S('impact', 'freezeHit', () => { osc('sine', vary(1800), 2600, 0.12, 0.025); modal('glass', 4200, 0.01, { decay: 0.2 }); }, { gap: 90 });
  S('impact', 'spark', () => { noise(0.05, 7000, 5000, 0.1, 'highpass', 1); crackle(2, 0.04, 0.05, 7000); }, { gap: 150 });

  S('break', 'glass', () => { for (let i = 0; i < 7; i++) modal('glass', rr(2200, 5200), 0.022, { delay: R() * 0.18, decay: rr(0.4, 0.9) }); noise(0.12, 9000, 4000, 0.3, 'highpass', 0.7); crackle(12, 0.35, 0.07, 6500, { delay: 0.05 }); }, { gap: 60 });
  S('break', 'ice', () => { for (let i = 0; i < 4; i++) modal('glass', rr(3200, 6200), 0.02, { delay: R() * 0.08, decay: 0.3 }); noise(0.16, 9000, 4000, 0.22, 'highpass', 0.6); crackle(6, 0.12, 0.08, 4000); }, { gap: 60 });
  S('break', 'crash', (n = 50) => { const k = Math.min(1, n / 400); sub(110 - k * 40, 40, 0.15 + k * 0.2, 0.25 + k * 0.25); body(0.2 + k * 0.3, 1400, 110, 0.35 + k * 0.25); crackle(Math.round(4 + k * 10), 0.12 + k * 0.3, 0.1, 2400, { delay: 0.03 }); }, { gap: 70 });
  S('break', 'wood', (n = 30) => { const k = Math.min(1, n / 300); for (let i = 0; i < 2 + Math.round(k * 3); i++) modal('wood', rr(260, 620), 0.18, { delay: R() * 0.06 * (1 + k) }); noise(0.12, 1600, 500, 0.22, 'bandpass', 2); sub(140, 60, 0.12, 0.2 * (0.5 + k)); }, { gap: 70 });
  S('break', 'clank', (n = 1) => { const k = Math.min(1, n / 40); modal('plate', vary(420 - k * 120, 0.08), 0.05 + k * 0.03, { decay: 0.4 + k * 0.4 }); noise(0.05, 3500, 1800, 0.14, 'bandpass', 2); sub(160, 70, 0.08, 0.15 + k * 0.15); }, { gap: 90 });
  S('break', 'letters', () => { for (let i = 0; i < 3; i++) tick(0.5, 2600 + i * 600 + R() * 300, 0.012, { delay: i * 0.035 }); }, { gap: 90 });
  S('break', 'creak', (k) => { k = k || 1; osc('sawtooth', vary(120), 70, 0.5, 0.05 * k, { lp: 600, vib: 7, vibA: 18 }); noise(0.4, 400, 120, 0.1 * k, 'bandpass', 4, { room: 1 }); }, { gap: 160 });
  S('break', 'winSlam', (n = 1) => { sub(90, 28, 0.6, 0.75); body(0.7, 900, 60, 0.5, { room: 1 }); noise(0.25, 5000, 1200, 0.18 * Math.min(1, n), 'highpass', 0.8, { delay: 0.03 }); crackle(8, 0.3, 0.1, 2000); });
  S('break', 'jarBreak', () => { SFX.glass(); osc('square', 900, 1400, 0.1, 0.025, { delay: 0.1, lp: 3000 }); });
  S('break', 'tvBreak', () => { noise(0.6, 8000, 1000, 0.32, 'highpass', 0.5); SFX.glass(); });
  S('break', 'boing', () => osc('sine', 180, 520, 0.22, 0.18, { vib: 22, vibA: 60 }), { gap: 70 });
  S('break', 'land', () => { noise(0.06, 600, 150, 0.2); sub(120, 60, 0.05, 0.12); }, { gap: 120 });

  S('move', 'jump', () => { whoosh(0.08, 700, 1800, 0.1); osc('sine', 260, 420, 0.06, 0.05); });
  S('move', 'djump', () => { whoosh(0.1, 1000, 3200, 0.12); osc('sine', 380, 700, 0.08, 0.05); });
  S('move', 'walljump', () => { tick(0.12, 1600, 0.015); whoosh(0.08, 900, 2200, 0.1); });
  S('move', 'dash', () => { whoosh(0.18, 600, 5000, 0.28); osc('sine', 200, 500, 0.1, 0.06); });
  S('move', 'slide', () => noise(0.12, 3000, 2500, 0.05, 'bandpass', 3), { gap: 140 });
  S('move', 'hop', () => osc('p25', 300, 600, 0.06, 0.035), { gap: 90 });
  S('move', 'hurt', () => { osc('square', 400, 90, 0.25, 0.09, { lp: 2400 }); noise(0.2, 1500, 300, 0.26); sub(150, 60, 0.12, 0.3); });
  S('move', 'die', () => { osc('square', 600, 60, 0.9, 0.09, { lp: 2400 }); osc('square', 400, 40, 0.9, 0.06, { delay: 0.15, lp: 2000 }); });
  S('move', 'thump', () => sub(140, 50, 0.15, 0.36));

  S('ui', 'click', () => { tick(0.18, 4200, 0.01); blip(vary(2200), 0.012, 0.025, 'square'); }, { gap: 25 });
  S('ui', 'tick', () => blip(1800, 0.03, 0.05, 'p12'));
  S('ui', 'hover', () => blip(1200, 0.03, 0.045, 'p12'), { gap: 50 });
  S('ui', 'select', () => { blip(660, 0.04, 0.04); blip(990, 0.06, 0.04, 'p25', { delay: 0.04 }); });
  S('ui', 'back', () => osc('p25', 660, 440, 0.08, 0.04));
  S('ui', 'deny', () => osc('square', 180, 120, 0.15, 0.05, { lp: 1600 }));
  S('ui', 'popup', () => { blip(1046, 0.06, 0.04); blip(1318, 0.08, 0.04, 'p25', { delay: 0.06 }); });
  S('ui', 'countdown', () => blip(880, 0.1, 0.06));
  S('ui', 'go', () => blip(1760, 0.3, 0.06));
  S('ui', 'tally', () => blip(1200 + R() * 200, 0.03, 0.03), { gap: 45 });
  S('ui', 'alarm', () => { osc('square', 880, 660, 0.15, 0.05, { lp: 3000 }); osc('square', 880, 660, 0.15, 0.05, { delay: 0.2, lp: 3000 }); });
  S('ui', 'reload', () => { tick(0.2, 3000, 0.04); blip(1000, 0.03, 0.03, 'square', { delay: 0.06 }); tick(0.18, 2300, 0.05, { delay: 0.12 }); });
  S('ui', 'shutter', () => { tick(0.4, 8000, 0.02); tick(0.3, 4200, 0.03, { delay: 0.06 }); osc('sine', 2200, 2200, 0.05, 0.035, { delay: 0.01 }); });
  S('ui', 'announce', (tier = 1) => { const b = 220 * Math.pow(2, Math.min(tier, 8) / 8); osc('sawtooth', b, b * 2, 0.25, 0.05, { lp: 2500 }); blip(b * 2, 0.3, 0.04, 'p25', { delay: 0.1 }); whoosh(0.3, 2000, 6000, 0.08, { delay: 0.05 }); });
  S('ui', 'title', () => arp([262, 330, 392, 523], 0.05, 0.12, 0.05));
  S('ui', 'toast', () => { osc('sine', 880, 880, 0.08, 0.04); osc('sine', 1320, 1320, 0.12, 0.04, { delay: 0.08 }); });
  S('ui', 'notifPop', () => { osc('sine', 1046, 1046, 0.07, 0.04); osc('sine', 1568, 1568, 0.1, 0.04, { delay: 0.07 }); });
  S('ui', 'blip', () => osc('sine', vary(900), 1400, 0.05, 0.04), { gap: 60 });
  S('ui', 'pop', () => osc('sine', 900, 1500, 0.04, 0.04), { gap: 60 });
  S('ui', 'zoomIn', () => { osc('sine', 300, 1200, 0.25, 0.06); osc('triangle', 600, 2400, 0.2, 0.03, { delay: 0.05 }); });
  S('ui', 'zoomOut', () => { osc('sine', 1200, 260, 0.28, 0.06); whoosh(0.25, 2000, 300, 0.1); });

  S('reward', 'coin', () => { blip(1046, 0.05, 0.045); blip(1568, 0.14, 0.045, 'p25', { delay: 0.05 }); });
  S('reward', 'pickup', () => { blip(880, 0.06, 0.05); blip(1320, 0.1, 0.05, 'p25', { delay: 0.06 }); });
  S('reward', 'heal', () => arp([523, 659, 784], 0.06, 0.12, 0.06, 'triangle'));
  S('reward', 'combo', (tier = 1) => { const b = 440 * Math.pow(2, Math.min(tier, 12) / 12); blip(b, 0.07, 0.045); blip(b * 1.5, 0.1, 0.045, 'p25', { delay: 0.06 }); });
  S('reward', 'achieve', () => arp([784, 988, 1175], 0.08, 0.16, 0.06, 'triangle'));
  S('reward', 'achievement', () => { arp([784, 988, 1175, 1568], 0.09, 0.18, 0.05); osc('triangle', 392, 392, 0.5, 0.08, { delay: 0.27 }); });
  S('reward', 'unlock', () => { arp([523, 659, 784, 1046], 0.06, 0.1, 0.045, 'square', { lp: 4000 }); osc('triangle', 1568, 1568, 0.35, 0.045, { delay: 0.26 }); });
  S('reward', 'buy', () => { arp([523, 784, 1046, 1568], 0.05, 0.1, 0.05); noise(0.2, 3000, 6000, 0.08, 'highpass', 1, { delay: 0.2 }); });
  S('reward', 'kaching', () => { modal('bell', 1318, 0.04, { decay: 0.4 }); modal('bell', 1760, 0.04, { delay: 0.08, decay: 0.4 }); });
  S('reward', 'gradeS', () => arp([523, 659, 784, 1046, 1318, 1568], 0.07, 0.2, 0.05));
  S('reward', 'secretHint', () => arp([1046, 1318, 1568], 0.08, 0.12, 0.04, 'triangle'));
  S('reward', 'secret', () => { arp([784, 988, 1175, 1568, 1976], 0.07, 0.16, 0.05); osc('triangle', 392, 392, 0.6, 0.08, { delay: 0.35 }); });
  S('reward', 'jingle', () => arp([523, 659, 784], 0.07, 0.1, 0.045));
  S('reward', 'strike', () => arp([523, 659, 784, 1046], 0.06, 0.12, 0.05));
  S('reward', 'finisher', () => { sub(110, 38, 0.45, 0.42); whoosh(0.5, 400, 2400, 0.12); arp([523, 784, 1046], 0.06, 0.18, 0.03, 'triangle', { delay: 0.05 }); });
  S('reward', 'jingle_win', () => { const s = [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1046, 0.36, 0.4], [988, 0.8, 0.12], [1046, 0.92, 0.6]]; for (const [f, d, l] of s) { blip(f, l, 0.05, 'p25', { delay: d + 0.05 }); osc('triangle', f / 2, f / 2, l, 0.08, { delay: d + 0.05 }); } });
  S('reward', 'jingle_lose', () => { const s = [[392, 0, 0.25], [370, 0.28, 0.25], [349, 0.56, 0.25], [330, 0.84, 0.7]]; for (const [f, d, l] of s) { blip(f, l, 0.05, 'p25', { delay: d + 0.05 }); osc('triangle', f / 2, f / 2, l, 0.08, { delay: d + 0.05 }); } });
  S('reward', 'jingle_start', () => arp([392, 523, 659, 784], 0.1, 0.12, 0.05));

  S('enemy', 'enemyShot', () => { osc('square', vary(700), 300, 0.08, 0.035, { lp: 3000 }); tick(0.08, 3000, 0.01); }, { gap: 60 });
  S('enemy', 'enemyDie', () => { body(0.22, 2000, 200, 0.3); osc('square', 500, 80, 0.25, 0.045, { lp: 2400 }); crackle(4, 0.12, 0.08, 3000); });
  S('enemy', 'beachball', () => fm(vary(400), 800, 2, 0.15, 0.025), { gap: 120 });
  S('enemy', 'polkit', () => { blip(440, 0.06, 0.04, 'square', { lp: 2500 }); blip(330, 0.12, 0.04, 'square', { delay: 0.08, lp: 2500 }); });
  S('enemy', 'cpuHum', () => osc('sawtooth', vary(55), 55, 0.5, 0.05, { lp: 300 }));
  S('enemy', 'spotifyGlitch', () => { [220, 277, 330, 415, 330, 277].forEach((f, k) => osc('sawtooth', f * rr(0.95, 1.05), f * 0.5, 0.18, 0.045, { delay: k * 0.09, lp: 1400, vib: 14, vibA: 40 })); });
  S('enemy', 'boo', () => osc('sine', 300, 200, 0.4, 0.05, { vib: 6, vibA: 30 }), { gap: 300 });
  S('enemy', 'ghostIn', () => osc('sine', 200, 600, 0.5, 0.05, { vib: 5, vibA: 40 }));
  S('enemy', 'popOut', () => { osc('p25', 200, 700, 0.1, 0.04); noise(0.12, 900, 300, 0.16, 'lowpass', 1); });
  S('enemy', 'stampE', () => sub(160, 60, 0.12, 0.28));
  S('enemy', 'squish', () => osc('sine', vary(260), 120, 0.1, 0.08), { gap: 90 });
  S('enemy', 'spit', () => noise(0.08, 2500, 1200, 0.16, 'bandpass', 2));
  S('enemy', 'blare', () => osc('sawtooth', vary(220), 200, 0.18, 0.04, { lp: 1500 }), { gap: 200 });
  S('enemy', 'autoplay', () => arp([440, 554, 659], 0.12, 0.14, 0.04, 'square', { lp: 2500 }));
  S('enemy', 'oink', () => osc('sawtooth', 300, 200, 0.18, 0.05, { lp: 900, vib: 30, vibA: 40 }));
  S('enemy', 'drop', () => osc('sine', 800, 200, 0.2, 0.04));

  S('gag', 'bell', () => { modal('bell', 1320, 0.05, { room: 1 }); modal('bell', 1760, 0.035, { delay: 0.12 }); });
  S('gag', 'vault', () => { modal('plate', 300, 0.08, { room: 1 }); SFX.kaching(); });
  S('gag', 'honk', () => { osc('square', 330, 330, 0.18, 0.05, { lp: 1800 }); osc('square', 415, 415, 0.18, 0.04, { lp: 1800 }); osc('square', 330, 330, 0.25, 0.05, { lp: 1800, delay: 0.24 }); osc('square', 415, 415, 0.25, 0.04, { lp: 1800, delay: 0.24 }); });
  S('gag', 'download', () => arp([400, 500, 600, 700, 800], 0.08, 0.06, 0.025, 'square', { lp: 3000 }));
  S('gag', 'delete', () => { zap(900, 120, 0.4, 0.05, { lp: 2500 }); noise(0.3, 4000, 800, 0.12, 'bandpass', 1); });
  S('gag', 'tvOn', () => { noise(0.4, 6000, 3000, 0.16, 'highpass', 0.6); osc('sine', 7800, 7800, 0.3, 0.006); });
  S('gag', 'tvBlip', () => blip(vary(660), 0.08, 0.05), { gap: 400 });
  S('gag', 'sparkle', () => { for (let i = 0; i < 6; i++) modal('glass', rr(1500, 3900), 0.015, { delay: i * 0.05 + R() * 0.03, decay: 0.3 }); noise(0.4, 6000, 3000, 0.12, 'highpass', 0.5, { room: 1 }); });

  S('desk', 'altf4', () => { tick(0.4, 4800, 0.03); blip(1320, 0.09, 0.05, 'square', { lp: 4000 }); osc('square', 990, 330, 0.14, 0.045, { delay: 0.08, lp: 3000 }); sub(220, 40, 0.35, 0.45, { delay: 0.05 }); fm(vary(880), 1760, 3, 0.4, 0.04, { delay: 0.12 }); });
  S('desk', 'closeAll', () => { for (let k = 0; k < 4; k++) osc('square', 1500 - k * 260, 400, 0.08, 0.04, { delay: k * 0.07, lp: 3500 }); });
  S('desk', 'keyclack', () => { tick(0.28, vary(4000, 0.1), 0.015); sub(vary(300), 120, 0.03, 0.12); }, { gap: 30 });
  S('desk', 'keyTap', () => { tick(0.5, vary(5000), 0.022); blip(vary(1500), 0.016, 0.04, 'square'); }, { gap: 30 });
  S('desk', 'spacebar', () => { noise(0.04, 1800, 600, 0.35, 'bandpass', 2); sub(160, 60, 0.08, 0.26); });
  S('desk', 'rmrf', () => { tick(0.16, 2400, 0.05); osc('square', vary(180), 90, 0.04, 0.025, { lp: 2000 }); }, { gap: 40 });
  S('desk', 'rewind', () => { zap(200, 1600, 0.45, 0.045, { lp: 3000 }); noise(0.45, 2000, 6000, 0.12, 'bandpass', 2); });
  S('desk', 'sigkill', () => { crack(0.5, 8000, 0.08); sub(180, 30, 0.4, 0.55); osc('square', 1760, 110, 0.25, 0.045, { delay: 0.02, lp: 4000 }); });
  S('desk', 'fork', () => { osc('square', vary(660), vary(990), 0.06, 0.04, { lp: 4000 }); osc('square', vary(990), vary(1320), 0.05, 0.035, { delay: 0.05, lp: 4000 }); });
  S('desk', 'drag', () => { osc('sine', 200, 420, 0.25, 0.07, { vib: 9, vibA: 30 }); noise(0.2, 800, 2000, 0.07, 'bandpass', 2); });
  S('desk', 'portalWs', () => { fm(vary(330), 660, 4, 0.5, 0.05); osc('sine', 220, 880, 0.4, 0.045, { delay: 0.05 }); });
  S('desk', 'tile', () => { for (let k = 0; k < 6; k++) tick(0.18, 4500 - k * 200, 0.03, { delay: k * 0.04 }); });
  S('desk', 'sudo', () => { blip(220, 0.12, 0.07, 'triangle'); blip(330, 0.12, 0.07, 'triangle', { delay: 0.1 }); blip(440, 0.25, 0.08, 'triangle', { delay: 0.2 }); });
  S('desk', 'sudoSu', () => { osc('square', 110, 110, 0.1, 0.05, { lp: 1800 }); osc('square', 165, 165, 0.1, 0.05, { delay: 0.09, lp: 1800 }); osc('square', 220, 440, 0.35, 0.06, { delay: 0.18, lp: 2400 }); sub(90, 40, 0.3, 0.32, { delay: 0.18 }); });
  S('desk', 'sudoEnd', () => osc('square', 330, 110, 0.25, 0.04, { lp: 1500 }));
  S('desk', 'panic', () => { for (let k = 0; k < 10; k++) blip(880, 0.05, 0.035, 'square', { delay: k * 0.12, lp: 3000 }); });
  S('desk', 'segv', () => { noise(0.05, 1200, 200, 0.26, 'lowpass', 2); osc('square', vary(70), 40, 0.1, 0.06, { lp: 900 }); }, { gap: 50 });
  S('desk', 'zip', () => { zap(2000, 80, 0.4, 0.06, { lp: 4000 }); noise(0.35, 6000, 300, 0.18, 'bandpass', 2); });
  S('desk', 'ping', () => osc('sine', vary(2200), vary(2000), 0.05, 0.035), { gap: 25 });
  S('desk', 'grep', () => { blip(1200, 0.03, 0.045, 'square', { lp: 4000 }); blip(1600, 0.03, 0.045, 'square', { delay: 0.04, lp: 4000 }); });
  S('desk', 'caps', () => { osc('sawtooth', 110, 90, 0.4, 0.08, { lp: 900 }); body(0.4, 600, 200, 0.36); tick(0.2, 2000, 0.02); });
  S('desk', 'copy', () => osc('triangle', 880, 1320, 0.07, 0.05));
  S('desk', 'paste', () => { sub(300, 120, 0.08, 0.26); osc('p25', 660, 990, 0.08, 0.04); });
  S('desk', 'cut', () => { tick(0.28, 6000, 0.02); tick(0.28, 6000, 0.02, { delay: 0.06 }); noise(0.18, 3000, 800, 0.16, 'bandpass', 1, { delay: 0.08 }); });
  S('desk', 'tear', () => { noise(0.35, 7000, 600, 0.4, 'bandpass', 1.2); osc('sawtooth', 60, 40, 0.3, 0.04, { lp: 400 }); crackle(8, 0.3, 0.08, 5000); });
  S('desk', 'sort', () => blip(vary(400 + R() * 1200), 0.04, 0.06, 'square', { lp: 3000 }), { gap: 40 });
  S('desk', 'deadpx', () => blip(3000, 0.05, 0.05, 'square'));
  S('desk', 'theme', () => { fm(vary(523), 1046, 2, 0.4, 0.045); osc('sine', 784, 784, 0.3, 0.035, { delay: 0.1 }); });
  S('desk', 'usb', () => { osc('triangle', 660, 880, 0.08, 0.05); osc('triangle', 880, 1320, 0.1, 0.05, { delay: 0.1 }); });
  S('desk', 'usbNo', () => osc('square', 300, 200, 0.12, 0.04, { lp: 2000 }));
  S('desk', 'swell', () => { osc('sine', 60, 140, 0.8, 0.1, { vib: 12, vibA: 20 }); noise(0.8, 800, 3000, 0.12, 'bandpass', 2); });
  S('desk', 'scroll', () => tick(0.7, 3000, 0.018), { gap: 35 });
  S('desk', 'defrag', () => { tick(0.4, 2000, 0.03); blip(vary(300), 0.04, 0.06, 'square', { lp: 2000 }); }, { gap: 60 });
  S('desk', 'overclock', () => { zap(100, 900, 0.6, 0.06, { lp: 2500 }); whoosh(0.6, 300, 3000, 0.12); });
  S('desk', 'peel', () => whoosh(0.4, 1200, 5000, 0.28));
  S('desk', 'modem', () => { for (let k = 0; k < 8; k++) osc(k & 1 ? 'square' : 'sawtooth', rr(600, 3000), rr(400, 2400), 0.09, 0.028, { delay: k * 0.07, lp: 4500 }); noise(0.6, 3000, 2500, 0.07, 'bandpass', 2); });
  S('desk', 'cookie', () => { noise(0.08, 1800, 900, 0.22, 'bandpass', 2); osc('square', 220, 110, 0.18, 0.04, { lp: 2000 }); sub(70, 40, 0.2, 0.32); });
  S('desk', 'captcha', () => [660, 880].forEach((f, i) => osc('triangle', f, f, 0.08, 0.05, { delay: i * 0.07 })));
  S('desk', 'erase', () => noise(0.18, 3000, 1500, 0.18, 'bandpass', 2));

  LP('loop', 'laser', ({ mkOsc }) => { mkOsc('sawtooth', 880, 22, 60, 2600); mkOsc('sine', 220, 7, 10); return { vol: 0.06 }; });
  LP('loop', 'flame', ({ mkNoise }) => { mkNoise('bandpass', 700, 0.6); mkNoise('lowpass', 200, 0.7); return { vol: 0.24 }; });
  LP('loop', 'acid', ({ mkNoise, mkOsc }) => { mkNoise('bandpass', 2500, 1.5); mkOsc('sine', 300, 13, 120, 0, 0.6); return { vol: 0.1 }; });
  LP('loop', 'freeze', ({ mkNoise, mkOsc }) => { mkNoise('highpass', 5000, 0.7); mkOsc('sine', 1600, 9, 300, 0, 0.5); return { vol: 0.06 }; });
  LP('loop', 'saw', ({ mkNoise, mkOsc }) => { mkOsc('sawtooth', 95, 31, 40, 1600); mkNoise('bandpass', 1800, 2, 0.8); return { vol: 0.1 }; });
  LP('loop', 'drill', ({ mkNoise, mkOsc }) => { mkOsc('square', 70, 45, 20, 900); mkNoise('bandpass', 900, 3); return { vol: 0.1 }; });
  LP('loop', 'magnet', ({ mkOsc }) => { mkOsc('sine', 70, 6, 18); mkOsc('sine', 140, 6, 30, 0, 0.6); return { vol: 0.2 }; });
  LP('loop', 'grav', ({ mkOsc }) => { mkOsc('sine', 110, 3, 20); mkOsc('p25', 220, 5, 8, 800, 0.5); return { vol: 0.1 }; });
  LP('loop', 'spin', ({ a, mkOsc }) => { const o = mkOsc('sawtooth', 50, 30, 20, 900); const o2 = mkOsc('square', 25, 0, 0, 300); return { vol: 0.08, setI: (i) => { o.frequency.setTargetAtTime(50 + i * 90, a.currentTime, 0.05); o2.frequency.setTargetAtTime(25 + i * 45, a.currentTime, 0.05); } }; });
  LP('loopL', 'brrt', ({ a, G, nodes, g }) => {
    const amp = a.createGain(); amp.gain.value = 0.55;
    const lfo = a.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 34;
    const lg = a.createGain(); lg.gain.value = 0.5; lfo.connect(lg).connect(amp.gain); nodes.push(lfo);
    const ns = a.createBufferSource(); ns.buffer = G.noiseBuf; ns.loop = true;
    const bp = a.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 1400; bp.Q.value = 1.2;
    ns.connect(bp).connect(amp); nodes.push(ns);
    const bd = a.createOscillator(); bd.type = 'sawtooth'; bd.frequency.value = 68;
    const bl = a.createBiquadFilter(); bl.type = 'lowpass'; bl.frequency.value = 420;
    bd.connect(bl).connect(amp); nodes.push(bd);
    const sb = a.createOscillator(); sb.type = 'sine'; sb.frequency.value = 34; sb.connect(amp); nodes.push(sb);
    amp.connect(g);
    return { vol: 0.36, setI: (i) => { lfo.frequency.setTargetAtTime(28 + i * 10, a.currentTime, 0.05); } };
  });
  LP('loop', 'chain', ({ mkNoise, mkOsc }) => { mkNoise('bandpass', 3400, 6); mkOsc('square', 9, 0, 0, 2400, 0.5); return { vol: 0.06 }; });
  LP('loop', 'lens', ({ mkNoise, mkOsc }) => { mkNoise('highpass', 6000, 0.7); mkOsc('sine', 2400, 5, 120, 0, 0.4); return { vol: 0.04 }; });
  LP('loop', 'blower', ({ mkNoise, mkOsc }) => { mkNoise('bandpass', 900, 0.9); mkNoise('lowpass', 300, 0.8); mkOsc('sawtooth', 110, 7, 6, 600, 0.5); return { vol: 0.2 }; });
  LP('loop', 'eraser', ({ mkNoise, mkOsc }) => { mkNoise('bandpass', 3200, 2); mkOsc('triangle', 180, 25, 40, 0, 0.5); return { vol: 0.1 }; });
  LP('loop', 'water', ({ mkNoise }) => { mkNoise('bandpass', 1300, 0.8); mkNoise('highpass', 4000, 0.7, 0.3); return { vol: 0.22 }; });
  LP('loopL', 'beam', ({ mkNoise, mkOsc }) => { mkOsc('sawtooth', 55, 9, 6, 500); mkNoise('lowpass', 500, 1); return { vol: 0.36 }; });
  LP('loopL', 'wind', ({ mkNoise }) => { mkNoise('bandpass', 500, 1.5); mkNoise('lowpass', 150, 1); return { vol: 0.36 }; });
  LP('loopL', 'rumble', ({ mkNoise, mkOsc }) => { mkNoise('lowpass', 90, 1); mkOsc('sine', 32, 3, 6); return { vol: 0.6 }; });
  LP('loop', 'bees', ({ mkOsc }) => { mkOsc('sawtooth', 220, 17, 15, 1500); mkOsc('sawtooth', 233, 13, 12, 1500); return { vol: 0.035 }; });
  LP('loop', 'tesla', ({ mkNoise, mkOsc }) => { mkNoise('bandpass', 4000, 3); mkOsc('sawtooth', 120, 40, 50, 2000, 0.6); return { vol: 0.08 }; });
  LP('loopL', 'hole', ({ mkNoise, mkOsc }) => { mkOsc('sine', 45, 0.5, 8); mkNoise('lowpass', 180, 1); return { vol: 0.3 }; });
  LP('loopL', 'jet', ({ mkNoise, mkOsc }) => { mkNoise('lowpass', 700, 0.8); mkNoise('bandpass', 2200, 1.2, 0.6); mkOsc('sawtooth', 70, 13, 8, 400, 0.6); return { vol: 0.28 }; });
  LP('loop', 'glide', ({ mkNoise }) => { mkNoise('bandpass', 900, 0.7); return { vol: 0.1 }; });
  LP('loop', 'vacuum', ({ mkNoise, mkOsc }) => { mkNoise('bandpass', 1800, 1.5); mkOsc('sawtooth', 160, 3, 20, 1400, 0.6); return { vol: 0.14 }; });
  LP('loop', 'pen', ({ mkNoise, mkOsc }) => { mkNoise('bandpass', 4500, 3); mkOsc('triangle', 600, 17, 60, 0, 0.5); return { vol: 0.045 }; });
  LP('loop', 'default', ({ mkNoise }) => { mkNoise('bandpass', 1000, 1); return { vol: 0.08 }; });
})();
