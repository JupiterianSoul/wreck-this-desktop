(() => {
  const WTP = window.WTP;
  const C = WTP.C;
  let roomBus = null, ac = null, master = null, sfxBus = null, musBus = null, musFilter = null, noiseBuf = null, pulse25 = null, pulse12 = null, comp = null;
  const loops = {};
  const last = {};
  const muted = () => !!C.muted;
  function ctx() {
    if (muted()) return null;
    const a = C.audioContext && C.audioContext();
    if (!a) return null;
    if (a !== ac) {
      ac = a;
      comp = a.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = a.createGain(); master.gain.value = 0.9 * (WTP.save.settings.master ?? 0.8);
      sfxBus = a.createGain(); sfxBus.gain.value = WTP.save.settings.sfx;
      musBus = a.createGain(); musBus.gain.value = WTP.save.settings.music * 0.5;
      musFilter = a.createBiquadFilter(); musFilter.type = 'lowpass'; musFilter.frequency.value = 18000; musFilter.Q.value = 0.7;
      musBus.connect(musFilter).connect(master);
      sfxBus.connect(comp).connect(master);
      roomBus = a.createGain(); roomBus.gain.value = 0.22;
      const dl = a.createDelay(0.5); dl.delayTime.value = 0.085;
      const fb = a.createGain(); fb.gain.value = 0.32;
      const rlp = a.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 1800;
      roomBus.connect(dl); dl.connect(rlp); rlp.connect(fb); fb.connect(dl); rlp.connect(comp);
      master.connect(a.destination);
      noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const mkPulse = (duty) => {
        const n = 40, re = new Float32Array(n), im = new Float32Array(n);
        for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
        return a.createPeriodicWave(re, im);
      };
      pulse25 = mkPulse(0.25); pulse12 = mkPulse(0.125);
    }
    return ac;
  }
  function setVolumes() {
    if (!ac) return;
    const t = ac.currentTime;
    sfxBus.gain.setTargetAtTime(WTP.save.settings.sfx, t, 0.05);
    master.gain.setTargetAtTime(0.9 * (WTP.save.settings.master ?? 0.8), t, 0.05);
    musBus.gain.setTargetAtTime(WTP.save.settings.music * 0.5, t, 0.05);
  }
  function osc(type, f0, f1, dur, vol, o = {}) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (o.delay || 0);
    const s = a.createOscillator();
    if (type === 'p25') s.setPeriodicWave(pulse25); else if (type === 'p12') s.setPeriodicWave(pulse12); else s.type = type;
    s.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) s.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = s;
    if (o.lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    if (o.hp) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; node.connect(f); node = f; }
    if (o.vib) { const l = a.createOscillator(); l.frequency.value = o.vib; const lg = a.createGain(); lg.gain.value = o.vibA || 20; l.connect(lg).connect(s.frequency); l.start(t); l.stop(t + dur + 0.05); }
    node.connect(g).connect(o.bus || sfxBus);
    if (o.room) g.connect(roomBus);
    s.start(t); s.stop(t + dur + 0.05);
  }
  function fm(fc, fmod, index, dur, vol, o = {}) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (o.delay || 0);
    const c = a.createOscillator(), m = a.createOscillator(), mg = a.createGain();
    c.frequency.setValueAtTime(fc, t); m.frequency.setValueAtTime(fmod, t);
    if (o.f1) { c.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + dur); m.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1 * (fmod / fc)), t + dur); }
    mg.gain.setValueAtTime(index * fmod, t); mg.gain.exponentialRampToValueAtTime(Math.max(1, index * fmod * 0.05), t + dur);
    m.connect(mg).connect(c.frequency);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    c.connect(g).connect(sfxBus);
    if (o.room) g.connect(roomBus);
    c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
  }
  function thump(f0, f1, dur, vol, o) { osc('sine', f0, f1, dur, vol, o); }
  function noise(dur, f0, f1, vol, type = 'lowpass', q = 0.8, o = {}) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + (o.delay || 0);
    const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const fl = a.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(Math.max(30, f0), t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = a.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(o.bus || sfxBus);
    if (o.room) g.connect(roomBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  const throttle = (k, ms) => { const now = performance.now(); if (last[k] && now - last[k] < ms) return false; last[k] = now; return true; };
  const vary = (f) => f * (0.94 + Math.random() * 0.12);

  const SFX = {
    pistol() { noise(0.05, 5000, 1200, 0.5, 'highpass', 0.7); thump(vary(240), 90, 0.07, 0.3); osc('square', vary(1900), 900, 0.018, 0.04); noise(0.12, 1800, 300, 0.12, 'lowpass', 0.7, { room: 1, delay: 0.01 }); },
    revolver() { noise(0.3, 2600, 120, 0.85, 'lowpass', 0.7, { room: 1 }); thump(150, 36, 0.32, 0.55); noise(0.03, 7000, 4000, 0.4, 'highpass', 1); fm(vary(2400), 3700, 2, 0.25, 0.03, { delay: 0.16 }); },
    dual(i) { const k = (SFX.dualK = (SFX.dualK || 0) ^ 1); noise(0.035, k ? 3600 : 2900, 1400, 0.36, 'bandpass', 1.2); osc('square', vary(k ? 520 : 430), 160, 0.03, 0.05); thump(k ? 200 : 170, 90, 0.04, 0.18); },
    nail() { if (!throttle('nail', 45)) return; noise(0.022, 6500, 5000, 0.28, 'bandpass', 5); osc('square', vary(1900), 600, 0.022, 0.05); noise(0.06, 9000, 7000, 0.06, 'highpass', 0.5, { delay: 0.015 }); },
    smg() { if (!throttle('smg', 42)) return; noise(0.04, 2600, 900, 0.32, 'bandpass', 1.1); osc('square', vary(330), 140, 0.028, 0.05); thump(vary(160), 80, 0.03, 0.14); },
    rifle() { if (!throttle('rifle', 50)) return; noise(0.025, 8000, 5000, 0.35, 'highpass', 1); noise(0.11, 3800, 260, 0.45, 'lowpass', 0.8, { room: 1 }); thump(vary(130), 48, 0.11, 0.3); },
    minigun() { if (!throttle('mini', 90)) return; noise(0.02, 7000, 4500, 0.08, 'highpass', 0.8); fm(vary(2400), 3500, 1.2, 0.03, 0.012); },
    minigunStop() { osc('sawtooth', 160, 40, 0.7, 0.06, { lp: 900 }); noise(0.5, 900, 200, 0.12, 'bandpass', 2); },
    shotgun() { noise(0.38, 3200, 90, 0.95, 'lowpass', 0.7, { room: 1 }); thump(100, 32, 0.32, 0.6); noise(0.05, 6000, 3000, 0.3, 'highpass'); setTimeout(() => SFX.rack(), 300); },
    rack() { noise(0.035, 2600, 1900, 0.14, 'bandpass', 4); fm(900, 1350, 3, 0.05, 0.04); noise(0.05, 1900, 1300, 0.14, 'bandpass', 4, { delay: 0.09 }); fm(700, 1050, 3, 0.06, 0.04, { delay: 0.09 }); },
    double() { noise(0.45, 2400, 70, 1, 'lowpass', 0.7, { room: 1 }); noise(0.4, 2000, 60, 0.7, 'lowpass', 0.7, { delay: 0.018 }); thump(85, 26, 0.42, 0.7); },
    flak() { thump(260, 80, 0.12, 0.35); noise(0.2, 1400, 120, 0.55, 'bandpass', 0.8); osc('triangle', 330, 110, 0.12, 0.08); },
    confetti() { noise(0.06, 2500, 1500, 0.45, 'bandpass', 2); osc('sine', 500, 1800, 0.22, 0.08, { delay: 0.02 }); noise(0.35, 7000, 9000, 0.14, 'highpass', 0.6, { delay: 0.05 }); },
    sniper() { noise(0.04, 9000, 5000, 0.6, 'highpass', 1); noise(0.9, 4000, 120, 0.7, 'lowpass', 0.6, { room: 1 }); thump(110, 30, 0.6, 0.55); osc('square', 2200, 300, 0.05, 0.04); },
    rail() { osc('sawtooth', 2600, 60, 0.5, 0.11); fm(3200, 4800, 4, 0.3, 0.05); noise(0.6, 8000, 200, 0.55, 'highpass', 0.5, { room: 1 }); thump(80, 22, 0.7, 0.6); },
    charge() { osc('sawtooth', 200, 1800, 0.45, 0.05, { lp: 3000 }); osc('sine', 400, 2400, 0.45, 0.03); },
    twang() { osc('triangle', vary(196), 120, 0.3, 0.14, { vib: 30, vibA: 12 }); noise(0.02, 3000, 2000, 0.3, 'bandpass', 3); noise(0.12, 1200, 3000, 0.08, 'bandpass', 2, { delay: 0.02 }); },
    harpoon() { thump(180, 70, 0.1, 0.4); noise(0.2, 3000, 500, 0.35, 'bandpass', 1); osc('sawtooth', 340, 110, 0.18, 0.05); noise(0.3, 600, 1600, 0.06, 'bandpass', 3, { delay: 0.05 }); },
    plasma() { fm(vary(700), 350, 6, 0.24, 0.1, { f1: 180 }); osc('sine', 500, 90, 0.2, 0.14); },
    tesla() { if (!throttle('tesla', 70)) return; noise(0.12, 5200, 2200, 0.34, 'bandpass', 2); osc('sawtooth', vary(110), 70, 0.1, 0.07, { vib: 60, vibA: 40 }); fm(1800, 37, 40, 0.08, 0.03); },
    sound() { osc('sine', 70, 34, 0.6, 0.75, { vib: 9, vibA: 18 }); osc('square', 140, 45, 0.45, 0.08, { lp: 700 }); noise(0.45, 500, 70, 0.45, 'lowpass', 0.8, { room: 1 }); },
    paint() { if (!throttle('paint', 60)) return; noise(0.07, 900, 300, 0.3, 'lowpass', 1); thump(vary(220), 120, 0.06, 0.12); },
    lava() { if (!throttle('lava', 80)) return; osc('sine', vary(140), 50, 0.16, 0.26); noise(0.18, 500, 140, 0.25, 'lowpass', 1); osc('sine', vary(320), 200, 0.06, 0.05, { delay: 0.08 }); },
    glitch() { if (!throttle('glitch', 50)) return; for (let i = 0; i < 4; i++) osc('square', 200 + Math.random() * 2400, 100 + Math.random() * 3000, 0.035, 0.04, { delay: i * 0.025 }); noise(0.05, 6000, 2000, 0.15, 'bandpass', 8, { delay: 0.05 }); },
    rocket() { noise(0.06, 1200, 400, 0.4, 'lowpass', 1); noise(0.6, 300, 2800, 0.42, 'bandpass', 1.3); osc('sawtooth', 80, 55, 0.5, 0.07, { lp: 500 }); },
    launch() { for (let i = 0; i < 4; i++) { noise(0.12, 900, 3200, 0.22, 'bandpass', 2, { delay: i * 0.05 }); osc('square', 320 + i * 60, 760, 0.08, 0.03, { delay: i * 0.05 }); } },
    pin() { fm(vary(2600), 3900, 2, 0.18, 0.05); noise(0.14, 800, 2400, 0.16, 'bandpass', 1.5, { delay: 0.08 }); },
    rattle() { for (let i = 0; i < 5; i++) noise(0.025, 3000 + i * 300, 2000, 0.14, 'bandpass', 4, { delay: i * 0.03 }); noise(0.14, 800, 2400, 0.14, 'bandpass', 1.5, { delay: 0.12 }); },
    squelch() { osc('sine', vary(380), 140, 0.14, 0.18, { vib: 40, vibA: 60 }); noise(0.12, 900, 400, 0.18, 'bandpass', 2); },
    clankMine() { fm(vary(620), 1430, 5, 0.25, 0.08, { room: 1 }); noise(0.05, 3000, 1500, 0.2, 'bandpass', 2); },
    warpThrow() { osc('sine', 600, 90, 0.5, 0.14, { vib: 12, vibA: 80 }); osc('triangle', 1200, 200, 0.4, 0.04); },
    flarePop() { thump(300, 120, 0.06, 0.25); noise(0.3, 900, 3000, 0.18, 'bandpass', 2); osc('square', 1400, 1400, 0.05, 0.04, { delay: 0.2 }); osc('square', 1400, 1400, 0.05, 0.04, { delay: 0.32 }); },
    snowThrow() { noise(0.12, 4000, 1500, 0.12, 'bandpass', 1); },
    throw() { noise(0.12, 900, 2500, 0.16, 'bandpass', 1.5); osc('triangle', vary(400), 250, 0.08, 0.06); },
    beep() { osc('square', 1500, 1500, 0.05, 0.05); },
    nukeLaunch() { osc('sawtooth', 60, 220, 1.1, 0.12, { lp: 900 }); noise(1, 200, 1200, 0.3); osc('square', 880, 880, 0.12, 0.04, { delay: 0.1 }); osc('square', 880, 880, 0.12, 0.04, { delay: 0.4 }); },
    slash() { noise(0.12, 7000, 1800, 0.35, 'highpass', 0.7); fm(vary(2600), 3640, 1.5, 0.22, 0.05); },
    hammer() { thump(140, 38, 0.28, 0.65); noise(0.22, 900, 80, 0.6, 'lowpass', 0.7, { room: 1 }); fm(220, 310, 4, 0.12, 0.05); },
    steam() { if (!throttle('steam', 400)) return; noise(0.5, 6000, 2500, 0.1, 'highpass', 0.5); },
    stampW() { thump(130, 50, 0.16, 0.6); noise(0.12, 1200, 200, 0.45, 'lowpass', 1); osc('square', 180, 120, 0.06, 0.05, { delay: 0.03 }); },
    heave() { noise(0.22, 180, 900, 0.3, 'bandpass', 1.2); osc('sine', 90, 60, 0.2, 0.12); },
    tornadoCall() { noise(1.2, 200, 1400, 0.35, 'bandpass', 1.5); osc('sine', 120, 400, 1, 0.05, { vib: 4, vibA: 60 }); },
    swoosh() { noise(0.18, 400, 2600, 0.2, 'bandpass', 1.4); },
    portal() { osc('sine', 300, 1200, 0.25, 0.1, { vib: 18, vibA: 50 }); osc('p12', 600, 2400, 0.2, 0.04); },
    portalOut() { osc('sine', 1200, 300, 0.25, 0.1, { vib: 18, vibA: 50 }); },
    grab() { osc('sine', 120, 400, 0.2, 0.2); noise(0.15, 300, 1500, 0.15, 'bandpass', 2); },
    fling() { noise(0.2, 400, 3000, 0.35, 'bandpass', 1); thump(300, 60, 0.25, 0.3); },
    ball() { if (!throttle('ball', 35)) return; osc('sine', vary(700), 280, 0.09, 0.14); osc('square', vary(1000), 600, 0.025, 0.03); },
    boomerang() { if (!throttle('boomr', 110)) return; noise(0.16, 1400, 500, 0.12, 'bandpass', 5); },
    harpoonHit() { thump(200, 80, 0.1, 0.3); },
    firework() { osc('sine', 600, 2400, 0.55, 0.06); noise(0.6, 900, 4200, 0.16, 'bandpass', 2); },
    sparkle() { for (let i = 0; i < 6; i++) osc('square', 1500 + Math.random() * 2400, 1200, 0.05, 0.03, { delay: i * 0.05 + Math.random() * 0.03 }); noise(0.4, 6000, 3000, 0.25, 'highpass', 0.5, { room: 1 }); },
    flare() { thump(260, 120, 0.05, 0.2); noise(0.3, 800, 3000, 0.22, 'bandpass', 2); },
    water() { if (!throttle('water', 60)) return; noise(0.1, 1500, 700, 0.2, 'bandpass', 1); },
    snow() { noise(0.1, 2500, 1200, 0.16, 'bandpass', 2); thump(200, 140, 0.05, 0.08); },
    banana() { osc('triangle', 300, 700, 0.12, 0.12, { vib: 20, vibA: 40 }); },
    impact() { if (!throttle('impact', 35)) return; noise(0.05, 2000, 500, 0.16, 'bandpass', 1.2); },
    tink() { if (!throttle('tink', 45)) return; fm(vary(3200), 4500, 1.5, 0.06, 0.025); },
    boom(r = 20) {
      if (!throttle('boom' + Math.round(r / 10), 40)) return;
      const big = Math.min(1, r / 60);
      noise(0.45 + r * 0.025, 1500, 50, 0.7 + big * 0.3, 'lowpass', 0.8, { room: 1 });
      noise(0.04, 6000, 2000, 0.3, 'highpass', 0.7);
      thump(100 - big * 40, 25, 0.45 + big * 0.6, 0.6 + big * 0.4);
      if (r > 30) noise(1.4 * big + 0.4, 300, 40, 0.5, 'lowpass', 0.5, { delay: 0.05 });
    },
    nuke() { noise(3.2, 2400, 30, 1, 'lowpass', 0.7, { room: 1 }); thump(70, 18, 3, 1); osc('sawtooth', 50, 25, 2.5, 0.12, { lp: 300 }); },
    crash(n = 50) { if (!throttle('crash', 70)) return; noise(0.2 + Math.min(0.35, n / 600), 1100, 110, Math.min(0.55, 0.14 + n / 500)); thump(90, 40, 0.15, Math.min(0.3, n / 800)); },
    glass() { if (!throttle('glass', 60)) return; for (let i = 0; i < 6; i++) fm(2400 + Math.random() * 3200, 3500 + Math.random() * 2000, 1, 0.12 + Math.random() * 0.15, 0.03, { delay: Math.random() * 0.12 }); noise(0.25, 8000, 3000, 0.35, 'highpass', 0.5); },
    ice() { if (!throttle('ice', 60)) return; for (let i = 0; i < 4; i++) osc('sine', 3000 + Math.random() * 3000, 2500, 0.1, 0.04, { delay: Math.random() * 0.08 }); noise(0.18, 9000, 4000, 0.25, 'highpass'); },
    freezeHit() { if (!throttle('fz', 90)) return; osc('sine', vary(1800), 2600, 0.12, 0.03); },
    sizzle() { if (!throttle('sizzle', 120)) return; noise(0.3, 5000, 3000, 0.08, 'highpass'); },
    letters() { if (!throttle('letters', 90)) return; for (let i = 0; i < 3; i++) osc('square', 600 + i * 220 + Math.random() * 80, 300, 0.05, 0.025, { delay: i * 0.03 }); },
    whistle() { osc('sine', 1600, 500, 0.7, 0.05); },
    siren() { osc('sawtooth', 500, 900, 0.45, 0.05, { lp: 2000 }); osc('sawtooth', 500, 900, 0.45, 0.05, { lp: 2000, delay: 0.5 }); },
    hole() { osc('sine', 60, 25, 2.4, 0.5); noise(2.2, 220, 50, 0.3); },
    orbital() { osc('sawtooth', 80, 1600, 1.2, 0.08, { lp: 4000 }); },
    beam() { noise(1.6, 400, 4000, 0.6, 'bandpass', 0.6); thump(55, 30, 1.8, 0.7); },
    quake() { noise(2.6, 120, 40, 0.8, 'lowpass', 0.5); thump(40, 25, 2.5, 0.8); },
    meteor() { noise(0.8, 3000, 300, 0.2, 'bandpass', 1); },
    buzz() { if (!throttle('buzz', 300)) return; osc('sawtooth', vary(220), 240, 0.25, 0.03, { lp: 1200 }); },
    whipWind() { noise(0.2, 300, 1800, 0.12, 'bandpass', 2); },
    whipCrack() { noise(0.025, 9000, 6000, 1, 'highpass', 0.6, { room: 1 }); osc('square', 3200, 800, 0.02, 0.12); noise(0.12, 4000, 900, 0.2, 'bandpass', 1, { delay: 0.012 }); },
    whipHit() { if (!throttle('whiphit', 60)) return; thump(260, 110, 0.06, 0.25); noise(0.05, 3000, 1000, 0.2, 'bandpass', 2); },
    yank() { osc('sine', 200, 700, 0.12, 0.12); noise(0.1, 600, 2400, 0.12, 'bandpass', 2); },
    springPunch() { osc('triangle', 200, 900, 0.14, 0.1, { vib: 25, vibA: 80 }); },
    punch() { thump(160, 50, 0.14, 0.55); noise(0.08, 2000, 300, 0.45, 'lowpass', 1); },
    sawShot() { osc('sawtooth', 900, 1600, 0.18, 0.05, { lp: 3000 }); noise(0.1, 4000, 2000, 0.18, 'bandpass', 2); },
    sawHit() { fm(1200, 1700, 3, 0.12, 0.06); noise(0.1, 5000, 2500, 0.25, 'bandpass', 2); },
    sawGrind() { if (!throttle('grind', 90)) return; osc('sawtooth', vary(320), 280, 0.09, 0.05, { lp: 2400, vib: 80, vibA: 30 }); noise(0.09, 4500, 3000, 0.12, 'bandpass', 3); },
    backspace() { osc('square', 1200, 1200, 0.03, 0.05); noise(0.03, 5000, 4000, 0.15, 'bandpass', 4); osc('square', 800, 400, 0.06, 0.03, { delay: 0.03 }); },
    keyTap() { if (!throttle('key', 30)) return; noise(0.018, vary(5000), 3000, 0.16, 'bandpass', 5); osc('square', vary(1500), 1500, 0.012, 0.02); },
    cut() { noise(0.02, 6000, 4000, 0.3, 'bandpass', 4); noise(0.02, 6000, 4000, 0.3, 'bandpass', 4, { delay: 0.06 }); noise(0.18, 3000, 800, 0.18, 'bandpass', 1, { delay: 0.08 }); },
    paste() { thump(300, 120, 0.08, 0.3); osc('p25', 660, 990, 0.08, 0.05); },
    slurp() { if (!throttle('slurp', 80)) return; osc('sine', vary(300), 900, 0.07, 0.06); },
    blowOut() { noise(0.5, 400, 2500, 0.4, 'bandpass', 1); thump(180, 60, 0.2, 0.3); },
    junkShot() { if (!throttle('junk', 50)) return; noise(0.04, 1500, 600, 0.2, 'bandpass', 1); },
    bowlThrow() { thump(120, 60, 0.18, 0.4); noise(0.12, 600, 300, 0.2, 'lowpass', 1); },
    bowlRoll() { if (!throttle('roll', 120)) return; noise(0.14, 260, 200, 0.18, 'lowpass', 2); thump(vary(60), 55, 0.12, 0.08); },
    bowlHit() { thump(150, 60, 0.12, 0.4); noise(0.08, 1200, 300, 0.25, 'lowpass', 1); },
    pins() { if (!throttle('pins', 80)) return; for (let i = 0; i < 4; i++) fm(vary(900), 1300, 2, 0.12, 0.05, { delay: i * 0.03 }); },
    strike() { [523, 659, 784, 1046].forEach((f, i) => osc('p25', f, f, 0.12, 0.06, { delay: i * 0.06 })); },
    thunder() { noise(0.05, 9000, 4000, 0.9, 'highpass', 0.5); noise(1.6, 900, 40, 0.8, 'lowpass', 0.6, { room: 1, delay: 0.04 }); thump(60, 24, 1.4, 0.7, { delay: 0.04 }); },
    jar() { fm(vary(1800), 2700, 1.5, 0.15, 0.05); noise(0.12, 800, 2400, 0.14, 'bandpass', 1.5); },
    jarBreak() { SFX.glass(); osc('square', 900, 1400, 0.1, 0.03, { delay: 0.1 }); },
    munch() { if (!throttle('munch', 60)) return; noise(0.03, 1800, 900, 0.1, 'bandpass', 3); },
    agravThrow() { osc('sine', 200, 900, 0.3, 0.08, { vib: 10, vibA: 60 }); },
    warp() { osc('sine', 900, 120, 0.8, 0.2, { vib: 7, vibA: 90 }); osc('triangle', 1800, 300, 0.6, 0.04); },
    slam() { thump(110, 30, 0.4, 0.6); noise(0.4, 900, 80, 0.6, 'lowpass', 0.7, { room: 1 }); },
    kick() { noise(0.09, 500, 2400, 0.16, 'bandpass', 1.4); },
    kickHit() { thump(180, 60, 0.1, 0.45); noise(0.08, 1800, 300, 0.4, 'lowpass', 1); },
    plow() { if (!throttle('plow', 90)) return; noise(0.08, 1200, 500, 0.12, 'lowpass', 1); },
    slide() { if (!throttle('slide', 140)) return; noise(0.12, 3000, 2500, 0.05, 'bandpass', 3); },
    clank(n = 1) { if (!throttle('clank', 70)) return; fm(vary(520), 1250, 6, 0.22, 0.07 + Math.min(0.06, n * 0.004), { room: 1 }); noise(0.04, 4000, 2000, 0.18, 'bandpass', 2); },
    thud(n = 1) { if (!throttle('thud', 70)) return; thump(vary(130), 70, 0.08, 0.18); noise(0.06, 700, 200, 0.12, 'lowpass', 1); },
    wood(n = 30) { if (!throttle('wood', 70)) return; fm(vary(260), 610, 2, 0.12, 0.08); noise(0.12, 1600, 500, 0.25, 'bandpass', 2); },
    boing() { if (!throttle('boing', 70)) return; osc('sine', 180, 520, 0.22, 0.2, { vib: 22, vibA: 60 }); },
    spring() { osc('triangle', 300, 1100, 0.14, 0.08, { vib: 30, vibA: 50 }); },
    poundStart() { osc('sine', 700, 200, 0.18, 0.08); noise(0.15, 1500, 500, 0.12, 'bandpass', 2); },
    pound() { thump(120, 30, 0.35, 0.7); noise(0.3, 900, 60, 0.6, 'lowpass', 0.7, { room: 1 }); },
    hookFire() { noise(0.12, 1500, 4000, 0.15, 'bandpass', 2); fm(1500, 2300, 1, 0.06, 0.03); },
    hookHit() { fm(vary(900), 2100, 4, 0.14, 0.07); thump(200, 90, 0.05, 0.2); },
    hookMiss() { osc('square', 600, 300, 0.08, 0.03); },
    release() { noise(0.12, 2000, 600, 0.12, 'bandpass', 2); },
    snap() { noise(0.06, 3000, 900, 0.3, 'bandpass', 1.5); osc('square', 900, 200, 0.12, 0.05); },
    glideOpen() { noise(0.2, 2000, 800, 0.16, 'bandpass', 1); },
    padDrop() { thump(220, 110, 0.06, 0.25); osc('triangle', 500, 800, 0.08, 0.05); },
    blastBoots() { SFX.boom(9); osc('square', 220, 660, 0.1, 0.04); },
    blink() { osc('sine', 1800, 200, 0.25, 0.1, { vib: 40, vibA: 200 }); noise(0.15, 6000, 1500, 0.2, 'highpass', 0.5); },
    scratch() { if (!throttle('scratch', 90)) return; noise(0.05, 5000, 3500, 0.12, 'bandpass', 4); },
    click() { osc('square', 1800, 1800, 0.015, 0.05); noise(0.02, 4000, 3000, 0.12, 'bandpass', 4); },
    kaching() { fm(1318, 1977, 2, 0.3, 0.06); fm(1760, 2640, 2, 0.4, 0.06, { delay: 0.08 }); },
    download() { [400, 500, 600, 700, 800].forEach((f, i) => osc('square', f, f, 0.06, 0.03, { delay: i * 0.08 })); },
    delete() { osc('sawtooth', 900, 120, 0.4, 0.06, { lp: 2500 }); noise(0.3, 4000, 800, 0.15, 'bandpass', 1); },
    scan() { osc('sine', 400, 1600, 0.6, 0.05); osc('sine', 1600, 400, 0.6, 0.05, { delay: 0.6 }); },
    glitchBoom() { SFX.boom(20); SFX.glitch(); },
    tvOn() { noise(0.4, 6000, 3000, 0.18, 'highpass', 0.6); osc('sine', 15600 / 2, 15600 / 2, 0.3, 0.008); },
    tvBlip() { if (!throttle('tvb', 400)) return; osc('p25', vary(660), 660, 0.06, 0.02); },
    tvBreak() { noise(0.6, 8000, 1000, 0.4, 'highpass', 0.5); SFX.glass(); },
    honk() { osc('square', 330, 330, 0.18, 0.06, { lp: 1800 }); osc('square', 415, 415, 0.18, 0.05, { lp: 1800 }); osc('square', 330, 330, 0.25, 0.06, { lp: 1800, delay: 0.24 }); osc('square', 415, 415, 0.25, 0.05, { lp: 1800, delay: 0.24 }); },
    fuse() { noise(0.4, 6000, 4000, 0.1, 'highpass', 0.6); },
    vault() { fm(300, 690, 5, 0.6, 0.1, { room: 1 }); SFX.kaching(); },
    oink() { osc('sawtooth', 300, 200, 0.18, 0.06, { lp: 900, vib: 30, vibA: 40 }); },
    bell() { fm(1320, 3700, 3, 0.5, 0.06, { room: 1 }); fm(1760, 4900, 3, 0.4, 0.04, { delay: 0.12 }); },
    zap() { if (!throttle('zap', 80)) return; noise(0.12, 6000, 2000, 0.3, 'bandpass', 2); osc('sawtooth', 120, 80, 0.12, 0.08, { vib: 60, vibA: 40 }); },
    spark() { if (!throttle('spark', 150)) return; noise(0.05, 7000, 5000, 0.12, 'highpass', 1); },
    secretHint() { [1046, 1318, 1568].forEach((f, i) => osc('triangle', f, f, 0.12, 0.05, { delay: i * 0.08 })); },
    secret() { [784, 988, 1175, 1568, 1976].forEach((f, i) => osc('p25', f, f, 0.16, 0.06, { delay: i * 0.07 })); osc('triangle', 392, 392, 0.6, 0.1, { delay: 0.35 }); },
    jingle() { [523, 659, 784].forEach((f, i) => osc('p25', f, f, 0.1, 0.05, { delay: i * 0.07 })); },
    ricochet() { if (!throttle('ric', 60)) return; osc('sine', vary(2600), 1200, 0.18, 0.05); },
    hop() { if (!throttle('hop', 90)) return; osc('p25', 300, 600, 0.06, 0.04); },
    blip() { if (!throttle('blip', 60)) return; osc('sine', vary(900), 1400, 0.05, 0.05); },
    autoplay() { osc('square', 440, 440, 0.12, 0.05); osc('square', 554, 554, 0.12, 0.05, { delay: 0.12 }); osc('square', 659, 659, 0.2, 0.05, { delay: 0.24 }); },
    blare() { if (!throttle('blare', 200)) return; osc('sawtooth', vary(220), 200, 0.18, 0.05, { lp: 1500 }); },
    boo() { if (!throttle('boo', 300)) return; osc('sine', 300, 200, 0.4, 0.06, { vib: 6, vibA: 30 }); },
    ghostIn() { osc('sine', 200, 600, 0.5, 0.06, { vib: 5, vibA: 40 }); },
    popOut() { osc('p25', 200, 700, 0.1, 0.05); noise(0.12, 900, 300, 0.2, 'lowpass', 1); },
    trackBeam() { osc('sawtooth', 1600, 400, 0.25, 0.07); noise(0.2, 7000, 3000, 0.25, 'highpass', 0.6); },
    stampE() { thump(160, 60, 0.12, 0.3); },
    squish() { if (!throttle('squish', 90)) return; osc('sine', vary(260), 120, 0.1, 0.1); },
    drop() { osc('sine', 800, 200, 0.2, 0.05); },
    spit() { noise(0.08, 2500, 1200, 0.18, 'bandpass', 2); },
    teleport() { osc('sine', 300, 1500, 0.15, 0.06); osc('sine', 1500, 300, 0.15, 0.06, { delay: 0.15 }); },
    laserCharge() { osc('sawtooth', 100, 1200, 0.6, 0.05, { lp: 2500 }); },
    pop() { if (!throttle('popt', 60)) return; osc('sine', 900, 1500, 0.04, 0.05); },
    bossIn() { osc('sawtooth', 110, 55, 1.2, 0.1, { lp: 800 }); noise(1, 300, 60, 0.3, 'lowpass', 1); },
    bossDie() { SFX.boom(50); [392, 330, 262, 196].forEach((f, i) => osc('square', f, f / 2, 0.3, 0.06, { delay: 0.2 + i * 0.18 })); },
    jump() { osc('p25', 330, 640, 0.09, 0.06); },
    djump() { osc('p25', 480, 980, 0.1, 0.06); noise(0.08, 1500, 4000, 0.06, 'bandpass', 2); },
    walljump() { osc('p25', 420, 820, 0.08, 0.06); noise(0.05, 800, 400, 0.1); },
    dash() { noise(0.18, 600, 5000, 0.3, 'bandpass', 1.2); osc('sine', 200, 500, 0.1, 0.08); },
    land() { if (!throttle('land', 120)) return; noise(0.06, 600, 150, 0.2); },
    step() { if (!throttle('step', 140)) return; noise(0.025, 900, 400, 0.05, 'bandpass', 2); },
    hurt() { osc('square', 400, 90, 0.25, 0.12); noise(0.2, 1500, 300, 0.3); },
    die() { osc('square', 600, 60, 0.9, 0.12); osc('square', 400, 40, 0.9, 0.08, { delay: 0.15 }); },
    pickup() { osc('p25', 880, 880, 0.06, 0.06); osc('p25', 1320, 1320, 0.1, 0.06, { delay: 0.06 }); },
    coin() { osc('p25', 1046, 1046, 0.05, 0.05); osc('p25', 1568, 1568, 0.12, 0.05, { delay: 0.05 }); },
    heal() { [523, 659, 784].forEach((f, i) => osc('triangle', f, f, 0.12, 0.08, { delay: i * 0.06 })); },
    select() { osc('p25', 660, 660, 0.04, 0.05); osc('p25', 990, 990, 0.06, 0.05, { delay: 0.04 }); },
    hover() { if (!throttle('hover', 50)) return; osc('p12', 1200, 1200, 0.025, 0.025); },
    back() { osc('p25', 660, 440, 0.08, 0.05); },
    deny() { osc('square', 180, 120, 0.15, 0.06); },
    unlock() { [660, 880, 990, 1320].forEach((f, i) => osc('p25', f, f, 0.16, 0.07, { delay: i * 0.08 })); },
    buy() { [523, 784, 1046, 1568].forEach((f, i) => osc('p25', f, f, 0.1, 0.06, { delay: i * 0.05 })); noise(0.2, 3000, 6000, 0.1, 'highpass', 1, { delay: 0.2 }); },
    achievement() { [784, 988, 1175, 1568].forEach((f, i) => osc('p25', f, f, 0.18, 0.06, { delay: i * 0.09 })); osc('triangle', 392, 392, 0.5, 0.1, { delay: 0.27 }); },
    combo(tier = 1) { const b = 440 * Math.pow(2, Math.min(tier, 12) / 12); osc('p25', b, b, 0.07, 0.06); osc('p25', b * 1.5, b * 1.5, 0.1, 0.06, { delay: 0.06 }); },
    announce(tier = 1) { const b = 220 * Math.pow(2, Math.min(tier, 8) / 8); osc('sawtooth', b, b * 2, 0.25, 0.06, { lp: 2500 }); osc('p25', b * 2, b * 2, 0.3, 0.05, { delay: 0.1 }); noise(0.3, 2000, 8000, 0.12, 'highpass', 0.7); },
    tick() { osc('p12', 1800, 1800, 0.02, 0.03); },
    tally() { if (!throttle('tally', 45)) return; osc('p25', 1200 + Math.random() * 200, 1200, 0.03, 0.035); },
    stamp() { osc('sine', 160, 50, 0.3, 0.6); noise(0.25, 1200, 100, 0.6); },
    gradeS() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => osc('p25', f, f, 0.2, 0.06, { delay: i * 0.07 })); },
    countdown() { osc('p25', 880, 880, 0.1, 0.07); },
    go() { osc('p25', 1760, 1760, 0.3, 0.08); },
    alarm() { osc('square', 880, 660, 0.15, 0.06); osc('square', 880, 660, 0.15, 0.06, { delay: 0.2 }); },
    enemyShot() { if (!throttle('es', 60)) return; osc('square', vary(700), 300, 0.08, 0.04); },
    enemyDie() { noise(0.25, 2000, 200, 0.35); osc('square', 500, 80, 0.25, 0.06); },
    popup() { osc('p25', 1046, 1046, 0.06, 0.05); osc('p25', 1318, 1318, 0.08, 0.05, { delay: 0.06 }); },
    title() { [262, 330, 392, 523].forEach((f, i) => osc('p25', f, f, 0.12, 0.06, { delay: i * 0.05 })); }
  };
  function play(name, arg) {
    if (muted()) return;
    const f = SFX[name];
    if (f) { try { f(arg); } catch (e) { } }
  }
  function loop(kind, on, intensity = 1) {
    const cur = loops[kind];
    if (!on || muted()) {
      if (cur) {
        const t = cur.a.currentTime;
        cur.g.gain.cancelScheduledValues(t); cur.g.gain.setTargetAtTime(0.0001, t, 0.05);
        cur.nodes.forEach((n) => { try { n.stop(t + 0.3); } catch (e) { } });
        delete loops[kind];
      }
      return;
    }
    if (cur) { if (cur.setI) cur.setI(intensity); return; }
    const a = ctx(); if (!a) return;
    const g = a.createGain(); g.gain.value = 0.0001;
    const nodes = [];
    let out = g, vol = 0.1, setI = null;
    const mkNoise = (type, f, q) => { const s = a.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; s.connect(fl).connect(g); nodes.push(s); return fl; };
    const mkOsc = (type, f, lfoF = 0, lfoA = 0, lp = 0) => {
      const o = a.createOscillator();
      if (type === 'p25') o.setPeriodicWave(pulse25); else o.type = type;
      o.frequency.value = f;
      if (lfoF) { const l = a.createOscillator(); l.frequency.value = lfoF; const lg = a.createGain(); lg.gain.value = lfoA; l.connect(lg).connect(o.frequency); nodes.push(l); }
      let n = o;
      if (lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
      n.connect(g); nodes.push(o); return o;
    };
    if (kind === 'laser') { mkOsc('sawtooth', 880, 22, 60, 2600); mkOsc('sine', 220, 7, 10); vol = 0.06; }
    else if (kind === 'flame') { mkNoise('bandpass', 700, 0.6); mkNoise('lowpass', 200, 0.7); vol = 0.28; }
    else if (kind === 'acid') { mkNoise('bandpass', 2500, 1.5); mkOsc('sine', 300, 13, 120); vol = 0.1; }
    else if (kind === 'freeze') { mkNoise('highpass', 5000, 0.7); mkOsc('sine', 1600, 9, 300); vol = 0.06; }
    else if (kind === 'saw') { mkOsc('sawtooth', 95, 31, 40, 1600); mkNoise('bandpass', 1800, 2); vol = 0.1; }
    else if (kind === 'drill') { mkOsc('square', 70, 45, 20, 900); mkNoise('bandpass', 900, 3); vol = 0.1; }
    else if (kind === 'magnet') { mkOsc('sine', 70, 6, 18); mkOsc('sine', 140, 6, 30); vol = 0.22; }
    else if (kind === 'grav') { mkOsc('sine', 110, 3, 20); mkOsc('p25', 220, 5, 8, 800); vol = 0.1; }
    else if (kind === 'spin') { const o = mkOsc('sawtooth', 50, 30, 20, 900); const o2 = mkOsc('square', 25, 0, 0, 300); vol = 0.09; setI = (i) => { o.frequency.setTargetAtTime(50 + i * 90, a.currentTime, 0.05); o2.frequency.setTargetAtTime(25 + i * 45, a.currentTime, 0.05); }; }
    else if (kind === 'brrt') {
      const amp = a.createGain(); amp.gain.value = 0.55;
      const lfo = a.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 34;
      const lg = a.createGain(); lg.gain.value = 0.5; lfo.connect(lg).connect(amp.gain); nodes.push(lfo);
      const ns = a.createBufferSource(); ns.buffer = noiseBuf; ns.loop = true;
      const bp = a.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = 1400; bp.Q.value = 1.2;
      ns.connect(bp).connect(amp); nodes.push(ns);
      const body = a.createOscillator(); body.type = 'sawtooth'; body.frequency.value = 68;
      const bl = a.createBiquadFilter(); bl.type = 'lowpass'; bl.frequency.value = 420;
      body.connect(bl).connect(amp); nodes.push(body);
      const sub = a.createOscillator(); sub.type = 'sine'; sub.frequency.value = 34; sub.connect(amp); nodes.push(sub);
      amp.connect(g);
      vol = 0.42;
      setI = (i) => { lfo.frequency.setTargetAtTime(28 + i * 10, a.currentTime, 0.05); };
    }
    else if (kind === 'chain') { mkNoise('bandpass', 3400, 6); mkOsc('square', 9, 0, 0, 2400); vol = 0.06; }
    else if (kind === 'lens') { mkNoise('highpass', 6000, 0.7); mkOsc('sine', 2400, 5, 120); vol = 0.04; }
    else if (kind === 'blower') { mkNoise('bandpass', 900, 0.9); mkNoise('lowpass', 300, 0.8); mkOsc('sawtooth', 110, 7, 6, 600); vol = 0.22; }
    else if (kind === 'eraser') { mkNoise('bandpass', 3200, 2); mkOsc('triangle', 180, 25, 40); vol = 0.12; }
    else if (kind === 'water') { mkNoise('bandpass', 1300, 0.8); vol = 0.25; }
    else if (kind === 'beam') { mkOsc('sawtooth', 55, 9, 6, 500); mkNoise('lowpass', 500, 1); vol = 0.4; }
    else if (kind === 'wind') { mkNoise('bandpass', 500, 1.5); mkNoise('lowpass', 150, 1); vol = 0.4; }
    else if (kind === 'rumble') { mkNoise('lowpass', 90, 1); mkOsc('sine', 32, 3, 6); vol = 0.7; }
    else if (kind === 'bees') { mkOsc('sawtooth', 220, 17, 15, 1500); mkOsc('sawtooth', 233, 13, 12, 1500); vol = 0.04; }
    else if (kind === 'tesla') { mkNoise('bandpass', 4000, 3); mkOsc('sawtooth', 120, 40, 50, 2000); vol = 0.09; }
    else if (kind === 'hole') { mkOsc('sine', 45, 0.5, 8); mkNoise('lowpass', 180, 1); vol = 0.35; }
    else if (kind === 'jet') { mkNoise('lowpass', 700, 0.8); mkNoise('bandpass', 2200, 1.2); mkOsc('sawtooth', 70, 13, 8, 400); vol = 0.32; }
    else if (kind === 'glide') { mkNoise('bandpass', 900, 0.7); vol = 0.12; }
    else if (kind === 'vacuum') { mkNoise('bandpass', 1800, 1.5); mkOsc('sawtooth', 160, 3, 20, 1400); vol = 0.16; }
    else if (kind === 'pen') { mkNoise('bandpass', 4500, 3); mkOsc('triangle', 600, 17, 60); vol = 0.05; }
    else { mkNoise('bandpass', 1000, 1); }
    g.connect(sfxBus);
    nodes.forEach((n) => n.start());
    g.gain.setTargetAtTime(vol, a.currentTime, 0.04);
    loops[kind] = { a, g, nodes, setI };
  }
  function stopLoops() { for (const k of Object.keys(loops)) loop(k, false); }

  const NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const midi = (n) => { const m = /^([A-G][#b]?)(\d)$/.exec(n); return m ? 12 * (Number(m[2]) + 1) + NOTE[m[1]] : null; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const chord = (root, kind) => { const r = midi(root); const iv = { m: [0, 3, 7], M: [0, 4, 7], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], 7: [0, 4, 7, 10] }[kind]; return iv.map((x) => r + x); };
  const SONGS = {
    title: {
      bpm: 132, lead: 'p25', leadVol: 0.05,
      lead1: ['G4 . G4 Eb4 . C4 Eb4 . G4 - C5 - Bb4 - G4 .', 'Ab4 . Ab4 C5 . Eb5 - C5 Ab4 - G4 - F4 - Eb4 .', 'G4 . Bb4 G4 . Eb4 G4 . Bb4 - Eb5 - D5 - Bb4 .', 'F4 . Bb4 D5 . F5 - D5 C5 - Bb4 - D5 - - .'],
      chords: [chord('C3', 'm'), chord('Ab2', 'M'), chord('Eb3', 'M'), chord('Bb2', 'M')],
      bass: 'R..R..R.R..R.OR.', arp: 'x.x.x.x.x.x.x.x.',
      K: 'x...x...x...x...', Sn: '....x.......x...', H: 'x.x.x.x.x.x.x.x.'
    },
    wreck: {
      bpm: 150, lead: 'p25', leadVol: 0.045,
      lead1: ['A4 A4 . C5 . A4 E5 . D5 . C5 . A4 - G4 .', 'F4 F4 . A4 . C5 F5 . E5 . C5 . A4 - C5 .', 'E5 - D5 C5 . G4 . C5 E5 - G5 - E5 . C5 .', 'D5 - B4 G4 . D5 . G5 F#5 - D5 - B4 - A4 .'],
      chords: [chord('A2', 'm'), chord('F2', 'M'), chord('C3', 'M'), chord('G2', 'M')],
      bass: 'R.RO.RR.R.RO.RRO', arp: 'xxxxxxxxxxxxxxxx',
      K: 'x..x..x.x..x..x.', Sn: '....x.......x..x', H: 'xxxxxxxxxxxxxxxx'
    },
    wreck2: {
      bpm: 156, lead: 'square', leadVol: 0.032,
      lead1: ['E5 . E5 D5 E5 . G5 . E5 . D5 . C5 . D5 .', 'C5 . C5 B4 C5 . E5 . C5 . B4 . A4 . B4 .', 'A4 . C5 . E5 . A5 . G5 . E5 . C5 . E5 .', 'B4 - - . D5 - - . G5 - F#5 - E5 - D5 .'],
      chords: [chord('E2', 'm'), chord('C2', 'M'), chord('A2', 'm'), chord('B2', 'M')],
      bass: 'RORORORORORORORO', arp: 'x.xx.xx.x.xx.xx.',
      K: 'x...x...x...x.x.', Sn: '....x.......x...', H: '..x...x...x...xx'
    },
    survival: {
      bpm: 168, lead: 'p25', leadVol: 0.045,
      lead1: ['D5 . D5 . A4 . D5 F5 E5 . D5 . C5 . A4 .', 'Bb4 . Bb4 . F4 . Bb4 D5 C5 . Bb4 . A4 . F4 .', 'C5 . E5 . G5 . E5 C5 D5 . E5 . G5 - - .', 'A4 . C#5 . E5 . A5 - G5 . E5 . C#5 . A4 .'],
      chords: [chord('D2', 'm'), chord('Bb1', 'M'), chord('C2', 'M'), chord('A1', 'M')],
      bass: 'RRORRORRRRORRORF', arp: 'x.x.x.x.x.x.x.x.',
      K: 'x.x.x.x.x.x.x.xx', Sn: '....x..x....x.x.', H: 'x.xxx.xxx.xxx.xx'
    },
    zen: {
      bpm: 78, lead: 'triangle', leadVol: 0.07,
      lead1: ['A4 - - - C5 - - - E5 - - - D5 - - -', 'G4 - - - B4 - - - D5 - - - . . . .', 'F4 - - - A4 - - - C5 - - - E5 - - -', 'E4 - - - G4 - - - B4 - - - . . . .'],
      chords: [chord('F2', 'M7'), chord('E2', 'm7'), chord('D2', 'm7'), chord('C2', 'M7')],
      bass: 'R.......F.......', arp: 'x..x..x..x..x..x', arpWave: 'triangle',
      K: 'x.........x.....', Sn: '................', H: '..x...x...x...x.'
    },
    boss: {
      bpm: 176, lead: 'sawtooth', leadVol: 0.03,
      lead1: ['E5 E5 . E5 . G5 . E5 D5 . C5 . B4 . C5 .', 'F5 F5 . F5 . A5 . F5 E5 . D5 . C5 . D5 .', 'E5 E5 . E5 . G5 . E5 D5 . C5 . B4 . G4 .', 'A4 . B4 . C5 . D5 . E5 - - . E5 - - .'],
      chords: [chord('E2', 'm'), chord('F2', 'M'), chord('E2', 'm'), chord('A2', 'm')],
      bass: 'RRRRRRRRRRRRRROO', arp: 'xxxxxxxxxxxxxxxx',
      K: 'x.x.x.x.x.x.x.x.', Sn: '....x.......x.xx', H: 'xxxxxxxxxxxxxxxx'
    }
  };
  for (const k in SONGS) SONGS[k].leadN = SONGS[k].lead1.map((bar) => bar.split(/\s+/));
  const mus = { song: null, step: 0, next: 0, timer: 0, name: null, muffled: false, paused: false };
  function playNote(type, f, t, dur, vol, bus) {
    const o = ac.createOscillator();
    if (type === 'p25') o.setPeriodicWave(pulse25); else if (type === 'p12') o.setPeriodicWave(pulse12); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(kind, t) {
    if (kind === 'K') {
      const o = ac.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const g = ac.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g).connect(musBus); o.start(t); o.stop(t + 0.2);
    } else {
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const f = ac.createBiquadFilter(); f.type = kind === 'H' ? 'highpass' : 'bandpass'; f.frequency.value = kind === 'H' ? 7000 : 1800; f.Q.value = kind === 'H' ? 0.7 : 0.9;
      const g = ac.createGain(); const v = kind === 'H' ? 0.06 : 0.22, d = kind === 'H' ? 0.04 : 0.13;
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f).connect(g).connect(musBus); s.start(t, Math.random()); s.stop(t + d + 0.02);
    }
  }
  function schedule() {
    if (!mus.song || mus.paused) return;
    if (muted() || document.hidden) { mus.next = 0; return; }
    const a = ctx(); if (!a) return;
    const S = mus.song;
    const stepDur = 60 / S.bpm / 4;
    if (!mus.next || mus.next < a.currentTime - 0.2) mus.next = a.currentTime + 0.06;
    while (mus.next < a.currentTime + 0.15) {
      const t = mus.next;
      const st = mus.step % 64, bar = Math.floor(st / 16), s16 = st % 16;
      const ch = S.chords[bar];
      const tok = S.leadN[bar][s16];
      if (tok && tok !== '.' && tok !== '-') {
        let len = 1;
        while (S.leadN[bar][s16 + len] === '-') len++;
        const m = midi(tok);
        if (m) {
          const alt = mus.step % 128 >= 64 && S.lead !== 'triangle';
          playNote(S.lead, hz(m), t, stepDur * len * 0.95, S.leadVol, musBus);
          if (alt) playNote('p12', hz(m + 12), t, stepDur * len * 0.6, S.leadVol * 0.35, musBus);
        }
      }
      const b = S.bass[s16];
      if (b && b !== '.') {
        const root = ch[0] - 12 + (b === 'O' ? 12 : 0) + (b === 'F' ? 7 : 0);
        playNote('triangle', hz(root), t, stepDur * 0.9, 0.16, musBus);
      }
      if (S.arp[s16] === 'x') {
        const tone = ch[(mus.step) % ch.length] + 12 + (Math.floor(mus.step / 4) % 2 ? 12 : 0);
        playNote(S.arpWave || 'p12', hz(tone), t, stepDur * 0.7, S.arpWave ? 0.03 : 0.018, musBus);
      }
      if (S.K[s16] === 'x') drum('K', t);
      if (S.Sn[s16] === 'x') drum('S', t);
      if (S.H[s16] === 'x') drum('H', t);
      mus.step++;
      mus.next += stepDur;
    }
  }
  function music(name) {
    if (mus.name === name) return;
    mus.name = name;
    mus.song = name ? SONGS[name] : null;
    mus.step = 0; mus.next = 0;
    if (!mus.timer) mus.timer = setInterval(schedule, 40);
    if (!name) { clearInterval(mus.timer); mus.timer = 0; }
  }
  function muffle(on) {
    mus.muffled = on;
    if (!ac || !musFilter) return;
    musFilter.frequency.setTargetAtTime(on ? 700 : 18000, ac.currentTime, 0.15);
  }
  function jingle(kind) {
    const a = ctx(); if (!a) return;
    const t0 = a.currentTime + 0.05;
    const seqs = {
      win: [[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.12], [1046, 0.36, 0.4], [988, 0.8, 0.12], [1046, 0.92, 0.6]],
      lose: [[392, 0, 0.25], [370, 0.28, 0.25], [349, 0.56, 0.25], [330, 0.84, 0.7]],
      start: [[392, 0, 0.1], [523, 0.1, 0.1], [659, 0.2, 0.1], [784, 0.3, 0.3]]
    };
    for (const [f, d, l] of seqs[kind] || []) { playNote('p25', f, t0 + d, l, 0.07, sfxBus); playNote('triangle', f / 2, t0 + d, l, 0.12, sfxBus); }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopLoops(); if (ac && ac.state === 'running') { try { ac.suspend(); } catch (e) { } } } else if (ac && !muted()) { try { ac.resume(); } catch (e) { } } });
  setInterval(() => { if (muted()) stopLoops(); }, 500);
  WTP.audio = { play, loop, stopLoops, music, muffle, jingle, setVolumes, ctx, SFX, synth: { osc, fm, thump, noise, vary, throttle, ctx, get sfxBus() { return sfxBus; }, get noiseBuf() { return noiseBuf; } }, get song() { return mus.name; } };
})();
