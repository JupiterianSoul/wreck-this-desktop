(() => {
  const WTP = window.WTP;
  const C = WTP.C;
  const OUT_GAIN = 0.7;
  let live = null, force = null, cur = null;
  const loops = {};
  const last = {};
  const recent = new Map();
  const burst = { t: 0, n: 0 };
  const SFX = {};
  const META = {};
  const LOOPS = {};
  let raw = false;
  const lvl = (k) => (raw ? 0 : (WTP.SFX_LEVELS || {})[k] || 0);
  const muted = () => !!C.muted;
  const shapes = new Map();
  function shapeCurve(k) {
    let c = shapes.get(k);
    if (c) return c;
    c = new Float32Array(1024);
    const n = Math.tanh(k);
    for (let i = 0; i < c.length; i++) { const x = (i / (c.length - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / n; }
    shapes.set(k, c);
    return c;
  }
  function build(a, offline) {
    const g = { a };
    g.sfx = a.createGain();
    g.sfx.gain.value = offline ? 1 : WTP.save.settings.sfx;
    g.room = a.createGain(); g.room.gain.value = 0.22;
    const dl = a.createDelay(0.5); dl.delayTime.value = 0.085;
    const fb = a.createGain(); fb.gain.value = 0.32;
    const rlp = a.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 1800;
    g.room.connect(dl); dl.connect(rlp); rlp.connect(fb); fb.connect(dl);
    if (offline) {
      g.sfx.connect(a.destination); rlp.connect(a.destination);
    } else {
      const glue = a.createDynamicsCompressor();
      glue.threshold.value = -20; glue.knee.value = 10; glue.ratio.value = 2.5; glue.attack.value = 0.006; glue.release.value = 0.25;
      const lim = a.createDynamicsCompressor();
      lim.threshold.value = -5; lim.knee.value = 2; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.12;
      const clip = a.createWaveShaper(); clip.curve = shapeCurve(1.4); clip.oversample = '2x';
      g.master = a.createGain(); g.master.gain.value = OUT_GAIN * (WTP.save.settings.master ?? 0.6);
      g.sfx.connect(glue); rlp.connect(glue);
      glue.connect(lim).connect(clip).connect(g.master).connect(a.destination);
    }
    g.noiseBuf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate);
    const d = g.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const mkPulse = (duty) => {
      const n = 40, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      return a.createPeriodicWave(re, im);
    };
    g.pulse25 = mkPulse(0.25); g.pulse12 = mkPulse(0.125);
    return g;
  }
  function ctx() {
    if (force) return force.a;
    if (muted()) return null;
    const a = C.audioContext && C.audioContext();
    if (!a) return null;
    if (!live || live.a !== a) live = build(a, false);
    return a;
  }
  const gr = () => force || live;
  const outBus = (o) => o.bus || (cur && cur.bus) || gr().sfx;
  const roomBus = () => (cur && cur.room) || gr().room;
  function setVolumes() {
    if (!live) return;
    const t = live.a.currentTime;
    live.sfx.gain.setTargetAtTime(WTP.save.settings.sfx, t, 0.05);
    live.master.gain.setTargetAtTime(OUT_GAIN * (WTP.save.settings.master ?? 0.6), t, 0.05);
  }
  function chain(a, node, o) {
    if (o.lp) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; if (o.q) f.Q.value = o.q; node.connect(f); node = f; }
    if (o.hp) { const f = a.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; node.connect(f); node = f; }
    if (o.bp) { const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = o.bp; f.Q.value = o.bq || 1; node.connect(f); node = f; }
    if (o.drive) { const w = a.createWaveShaper(); w.curve = shapeCurve(o.drive); node.connect(w); node = w; }
    return node;
  }
  function env(a, g, t, vol, dur, o) {
    const at = o.attack || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + at);
    if (o.hold) g.gain.setValueAtTime(Math.max(0.0002, vol), t + at + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, at + (o.hold || 0) + 0.005));
  }
  function osc(type, f0, f1, dur, vol, o = {}) {
    const a = ctx(); if (!a) return;
    const G = gr();
    const t = a.currentTime + (o.delay || 0);
    const s = a.createOscillator();
    if (type === 'p25') s.setPeriodicWave(G.pulse25); else if (type === 'p12') s.setPeriodicWave(G.pulse12); else s.type = type;
    s.frequency.setValueAtTime(Math.max(20, f0), t);
    if (f1 !== f0) s.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + (o.glide || dur));
    if (o.detune) s.detune.value = o.detune;
    const g = a.createGain();
    env(a, g, t, vol, dur, o);
    if (o.vib) { const l = a.createOscillator(); l.frequency.value = o.vib; const lg = a.createGain(); lg.gain.value = o.vibA || 20; l.connect(lg).connect(s.frequency); l.start(t); l.stop(t + dur + 0.05); }
    chain(a, s, o).connect(g).connect(outBus(o));
    if (o.room) g.connect(roomBus());
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
    env(a, g, t, vol, dur, { attack: 0.003, ...o });
    chain(a, c, o).connect(g).connect(outBus(o));
    if (o.room) g.connect(roomBus());
    c.start(t); m.start(t); c.stop(t + dur + 0.05); m.stop(t + dur + 0.05);
  }
  function thump(f0, f1, dur, vol, o) { osc('sine', f0, f1, dur, vol, o); }
  function noise(dur, f0, f1, vol, type = 'lowpass', q = 0.8, o = {}) {
    const a = ctx(); if (!a) return;
    const G = gr();
    const t = a.currentTime + (o.delay || 0);
    const s = a.createBufferSource(); s.buffer = G.noiseBuf; s.loop = true;
    if (o.rate) s.playbackRate.value = o.rate;
    const fl = a.createBiquadFilter(); fl.type = type; fl.Q.value = q;
    fl.frequency.setValueAtTime(Math.max(30, f0), t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + (o.glide || dur));
    const g = a.createGain();
    env(a, g, t, vol, dur, { attack: 0.003, ...o });
    s.connect(fl);
    chain(a, fl, { drive: o.drive, hp: o.hp, lp: o.lp }).connect(g).connect(outBus(o));
    if (o.room) g.connect(roomBus());
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  const throttle = (k, ms) => { if (force) return true; const now = performance.now(); if (last[k] && now - last[k] < ms) return false; last[k] = now; return true; };
  const vary = (f, k = 0.06) => f * (1 - k + Math.random() * k * 2);
  const dbg = (db) => Math.pow(10, db / 20);

  function admit(name, m) {
    const now = performance.now();
    const gap = m.gap ?? 0, max = m.max ?? 6, win = m.win ?? 160;
    let r = recent.get(name);
    if (!r) { r = []; recent.set(name, r); }
    while (r.length && now - r[0] > win) r.shift();
    if (r.length >= max) return 0;
    if (r.length && now - r[r.length - 1] < gap) return 0;
    r.push(now);
    if (now - burst.t > 60) { burst.t = now; burst.n = 0; }
    burst.n++;
    if (burst.n > 14 && !m.vip) return 0;
    const stack = 1 / Math.sqrt(r.length);
    const crowd = burst.n > 6 && !m.vip ? 6 / burst.n : 1;
    return stack * crowd;
  }
  function play(name, arg) {
    const f = SFX[name];
    if (!f) return;
    const a = ctx(); if (!a) return;
    const m = META[name] || {};
    let k = 1;
    if (!force) { k = admit(name, m); if (!k) return; }
    const gain = dbg(lvl(name)) * k;
    const prev = cur;
    const G = gr();
    const bus = a.createGain(); bus.gain.value = gain; bus.connect(G.sfx);
    const room = a.createGain(); room.gain.value = gain; room.connect(G.room);
    cur = { bus, room };
    try { f(arg); } catch (e) { if (force) throw e; } finally { cur = prev; }
  }

  function loop(kind, on, intensity = 1) {
    const ex = loops[kind];
    if (!on || muted()) {
      if (ex) {
        const t = ex.a.currentTime;
        ex.g.gain.cancelScheduledValues(t); ex.g.gain.setTargetAtTime(0.0001, t, 0.05);
        ex.nodes.forEach((n) => { try { n.stop(t + 0.3); } catch (e) { } });
        delete loops[kind];
      }
      return;
    }
    if (ex) { if (ex.setI) ex.setI(intensity); return; }
    const a = ctx(); if (!a) return;
    const L = startLoop(a, gr(), kind);
    L.g.connect(gr().sfx);
    L.g.gain.setTargetAtTime(L.vol, a.currentTime, 0.04);
    if (L.setI) L.setI(intensity);
    loops[kind] = L;
  }
  function startLoop(a, G, kind) {
    const g = a.createGain(); g.gain.value = 0.0001;
    const nodes = [];
    const mkNoise = (type, f, q, v = 1) => { const s = a.createBufferSource(); s.buffer = G.noiseBuf; s.loop = true; const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const vg = a.createGain(); vg.gain.value = v; s.connect(fl).connect(vg).connect(g); nodes.push(s); return fl; };
    const mkOsc = (type, f, lfoF = 0, lfoA = 0, lp = 0, v = 1) => {
      const o = a.createOscillator();
      if (type === 'p25') o.setPeriodicWave(G.pulse25); else o.type = type;
      o.frequency.value = f;
      if (lfoF) { const l = a.createOscillator(); l.frequency.value = lfoF; const lg = a.createGain(); lg.gain.value = lfoA; l.connect(lg).connect(o.frequency); nodes.push(l); }
      let n = o;
      if (lp) { const fl = a.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); n = fl; }
      const vg = a.createGain(); vg.gain.value = v;
      n.connect(vg).connect(g); nodes.push(o); return o;
    };
    const mkAmp = (rate, depth, type = 'sine') => { const amp = a.createGain(); amp.gain.value = 1 - depth; const l = a.createOscillator(); l.type = type; l.frequency.value = rate; const lg = a.createGain(); lg.gain.value = depth; l.connect(lg).connect(amp.gain); nodes.push(l); amp.connect(g); return { amp, lfo: l }; };
    const L = { a, g, nodes, vol: 0.1, setI: null };
    const def = LOOPS[kind] || LOOPS.default;
    const r = def ? def({ a, G, mkNoise, mkOsc, mkAmp, nodes, g }) || {} : {};
    L.vol = (r.vol ?? 0.1) * dbg(lvl('loop:' + kind));
    L.setI = r.setI || null;
    nodes.forEach((n) => n.start());
    return L;
  }
  function stopLoops() { for (const k of Object.keys(loops)) loop(k, false); }

  function jingle(kind) { play('jingle_' + kind); }
  function music() { }
  function muffle() { }

  async function measure(name, arg, isLoop, secs, unTrimmed) {
    const sr = 44100, dur = secs || (isLoop ? 1.5 : 4.5);
    const off = new OfflineAudioContext(1, Math.ceil(sr * dur), sr);
    const prevF = force, prevC = cur;
    force = build(off, true);
    cur = null;
    raw = !!unTrimmed;
    for (const k of Object.keys(last)) delete last[k];
    try {
      if (isLoop) { const L = startLoop(off, force, name); L.g.connect(force.sfx); L.g.gain.value = L.vol; }
      else play(name, arg);
    } finally { force = prevF; cur = prevC; raw = false; }
    const buf = await off.startRendering();
    const d = buf.getChannelData(0);
    let peak = 0, end = 0;
    const thr = Math.pow(10, -60 / 20);
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; if (v > thr) end = i; }
    const win = Math.round(sr * 0.1), hop = Math.round(sr * 0.01);
    const sq = new Float64Array(d.length + 1);
    for (let i = 0; i < d.length; i++) sq[i + 1] = sq[i] + d[i] * d[i];
    let best = 0;
    for (let i = 0; i + win <= d.length || i === 0; i += hop) { const j = Math.min(d.length, i + win); const ms = (sq[j] - sq[i]) / win; if (ms > best) best = ms; if (j === d.length) break; }
    let zc = 0;
    for (let i = 1; i < Math.min(d.length, end + 1); i++) if ((d[i - 1] < 0) !== (d[i] < 0)) zc++;
    const db = (x) => (x > 0 ? 20 * Math.log10(x) : -120);
    return { name, peak: db(peak), loud: db(Math.sqrt(best)), len: end / sr, zcr: end ? Math.round((zc / (end / sr)) / 2) : 0 };
  }

  document.addEventListener('visibilitychange', () => { const a = live && live.a; if (document.hidden) { stopLoops(); if (a && a.state === 'running') { try { a.suspend(); } catch (e) { } } } else if (a && !muted()) { try { a.resume(); } catch (e) { } } });
  setInterval(() => { if (muted()) stopLoops(); }, 500);
  WTP.audio = { play, loop, stopLoops, music, muffle, jingle, setVolumes, ctx, SFX, META, LOOPS, measure, synth: { osc, fm, thump, noise, vary, throttle, ctx, dbg, get sfxBus() { return gr()?.sfx; }, get noiseBuf() { return gr()?.noiseBuf; } } };
})();
