(() => {
  const WTP = window.WTP = window.WTP || {};
  const C = window.Curio || {
    store: { get: (k, f) => f, set() {} }, muted: false, audioContext: () => null, toast() {}, confetti() {}, isDark: () => true,
    rand: (a, b) => a + Math.random() * (b - a), randInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick: (a) => a[Math.floor(Math.random() * a.length)], fmt: (n) => String(Math.round(n)), best: () => ({ best: 0, isNew: false }), getBest: () => null
  };
  WTP.C = C;

  const PAL = {
    '0': '#1a1226', '1': '#2b2238', '2': '#3f3550', '3': '#5c5270', '4': '#8a809a', '5': '#b9b0c4', '6': '#e2dcea', '7': '#fff8f0',
    r: '#5e1f2e', R: '#a8303f', e: '#e8484f', o: '#ff7f3f', a: '#ffb347', y: '#ffe066', Y: '#fff3b0',
    g: '#1f4a3a', G: '#2f8a4f', l: '#6fcf5a', L: '#c3f07a',
    n: '#1d2b5e', b: '#2f5bb7', c: '#4aa3ff', C: '#8fe3ff', t: '#20a39e',
    p: '#5b2a86', P: '#9a4dff', m: '#d07bff', k: '#ff5fa2', K: '#ffb3d9',
    w: '#4a2c22', W: '#8a5a3a', u: '#c98a5a', S: '#ffd0a8'
  };
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const pack = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  const packHex = (h) => { const [r, g, b] = hexRGB(h); return pack(r, g, b); };
  const P32 = {};
  for (const k in PAL) P32[k] = packHex(PAL[k]);
  const unR = (c) => c & 255, unG = (c) => (c >>> 8) & 255, unB = (c) => (c >>> 16) & 255;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const shade = (c, f, add = 0) => pack(clamp(unR(c) * f + add, 0, 255) | 0, clamp(unG(c) * f + add, 0, 255) | 0, clamp(unB(c) * f + add, 0, 255) | 0);
  const mix = (c1, c2, t) => pack((unR(c1) + (unR(c2) - unR(c1)) * t) | 0, (unG(c1) + (unG(c2) - unG(c1)) * t) | 0, (unB(c1) + (unB(c2) - unB(c1)) * t) | 0);
  const css32 = (c) => `rgb(${unR(c)},${unG(c)},${unB(c)})`;
  const lum = (c) => (unR(c) * 0.3 + unG(c) * 0.59 + unB(c) * 0.11) / 255;
  const PAL_LIST = Object.keys(PAL).map((k) => P32[k]);
  const nearest = (c) => {
    let best = PAL_LIST[0], bd = 1e9;
    const r = unR(c), g = unG(c), b = unB(c);
    for (const p of PAL_LIST) {
      const d = (unR(p) - r) ** 2 * 3 + (unG(p) - g) ** 2 * 4 + (unB(p) - b) ** 2 * 2;
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };

  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return (h ^ (h >>> 16)) >>> 0; };
  function rng(seed) {
    let s = seed >>> 0;
    const f = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    f.int = (a, b) => a + Math.floor(f() * (b - a + 1));
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    return f;
  }
  const strSeed = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
  const fmtTime = (s) => {
    if (s == null || !isFinite(s)) return '-';
    const m = Math.floor(s / 60);
    const sec = s - m * 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec.toFixed(1)}`;
  };
  const fmtClock = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60); const x = Math.floor(s % 60); return `${m}:${x < 10 ? '0' : ''}${x}`; };
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const SAVE_KEY = 'wtd-save';
  const SAVE_V = 4;
  const HOTBAR_N = 10;
  const DEFAULT_SETTINGS = { master: 0.8, muted: false, quality: 'auto', killcam: true, mode: 'free', nextLevel: true, liveNotifs: false, wreckage: false, shakeReal: false, xray: false, gags: true, shake: 1, particles: 2, music: 0.5, sfx: 0.8, colorblind: false, flashes: true, fps: false, adaptive: true, aimAssist: 1, haptics: true, toggleFire: false, radial: false, touchSize: 1, touchAlpha: 0.55, touchAim: 'auto', touchSwap: false };
  const DEFAULT_KEYS = {
    left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], jump: ['KeyW', 'Space', 'ArrowUp'], down: ['KeyS', 'ArrowDown'],
    dash: ['ShiftLeft', 'ShiftRight'], roll: ['ControlLeft'], fire: ['Enter'], alt: ['KeyG'], melee: ['KeyF'], gadget: ['KeyQ'], pickup: ['KeyE'], prev: [], next: [], wheel: ['Tab'], reset: ['KeyR'], pause: ['Escape'], mute: ['key:m'], fps: ['F3'], next_level: ['KeyN']
  };
  const freshSave = () => ({
    v: SAVE_V, scrap: 0, owned: {}, skin: 'hero', skins: { hero: true }, hotbar: new Array(HOTBAR_N).fill(null), achievements: {}, bests: {}, campaign: {}, daily: {}, puzzles: {}, seenPages: {},
    upg: {}, gadgets: { boots: true }, gadget: 'boots', secrets: {},
    stats: { pixels: 0, time: 0, shots: 0, explosions: 0, letters: 0, chunks: 0, burned: 0, iced: 0, glass: 0, kills: 0, deaths: 0, jumps: 0, dashes: 0, walljumps: 0, runs: 0, wins: 0, bestCombo: 0, painted: 0, portals: 0, throws: 0, bees: 0, nukes: 0, slowmos: 0, zenTime: 0, dailies: 0, scrapEarned: 0, weaponUse: {}, distance: 0, bestWave: 0, eaten: 0, kicks: 0, gadgetUse: 0, secrets: 0, buttons: 0, props: 0, cracks: 0 },
    settings: { ...DEFAULT_SETTINGS }, keys: JSON.parse(JSON.stringify(DEFAULT_KEYS)), intro: false
  });
  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  function normHotbar(h) {
    const out = new Array(HOTBAR_N).fill(null);
    if (!Array.isArray(h)) return out;
    const seen = new Set();
    for (let i = 0; i < HOTBAR_N; i++) { const id = h[i]; if (typeof id === 'string' && !seen.has(id)) { out[i] = id; seen.add(id); } }
    return out;
  }
  function loadSave() {
    let s = null;
    try { s = C.store.get(SAVE_KEY, null); } catch (e) { s = null; }
    const base = freshSave();
    if (!isObj(s) || !(s.v === 3 || s.v === SAVE_V)) {
      let old = null;
      try { old = C.store.get('wtp-career-v2', null); } catch (e) { old = null; }
      if (old && typeof old.pixels === 'number') {
        base.scrap = Math.min(20000, Math.floor(old.pixels / 25));
        base.stats.pixels = old.pixels;
        base.stats.bestCombo = old.bestCombo || 0;
      }
      return base;
    }
    const out = Object.assign(base, s);
    out.v = SAVE_V;
    out.stats = Object.assign(freshSave().stats, isObj(s.stats) ? s.stats : {});
    if (!isObj(out.stats.weaponUse)) out.stats.weaponUse = {};
    for (const k in out.stats) if (k !== 'weaponUse' && (typeof out.stats[k] !== 'number' || !isFinite(out.stats[k]))) out.stats[k] = 0;
    out.settings = Object.assign({ ...DEFAULT_SETTINGS }, isObj(s.settings) ? s.settings : {});
    const aa = out.settings.aimAssist;
    out.settings.aimAssist = aa === true ? 1 : aa === false ? 0 : [0, 1, 2].includes(aa) ? aa : 1;
    if (!['auto', 'stick'].includes(out.settings.touchAim)) out.settings.touchAim = 'auto';
    if (![0.8, 1, 1.25].includes(out.settings.touchSize)) out.settings.touchSize = 1;
    if (typeof out.settings.touchAlpha !== 'number' || !isFinite(out.settings.touchAlpha)) out.settings.touchAlpha = 0.55;
    const keys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
    if (isObj(s.keys)) for (const a in keys) if (Array.isArray(s.keys[a]) && s.keys[a].every((c) => typeof c === 'string')) keys[a] = s.keys[a].slice(0, 3);
    if (s.v === 3) { for (const a of ['melee', 'gadget']) { const want = DEFAULT_KEYS[a][0]; const clash = Object.keys(keys).some((b) => b !== a && keys[b].includes(want)); keys[a] = clash ? [] : [want]; } if (!keys.wheel.includes('KeyB') && !Object.values(keys).some((l) => l.includes('KeyB'))) keys.wheel.push('KeyB'); }
    out.keys = keys;
    for (const k of ['owned', 'skins', 'achievements', 'bests', 'campaign', 'daily', 'puzzles', 'seenPages', 'upg', 'gadgets', 'secrets']) if (!isObj(out[k])) out[k] = {};
    for (const k in out.upg) { const n = out.upg[k]; out.upg[k] = typeof n === 'number' && isFinite(n) ? Math.max(0, Math.min(3, n | 0)) : 0; }
    out.gadgets.boots = true;
    if (typeof out.gadget !== 'string' || !out.gadgets[out.gadget]) out.gadget = 'boots';
    out.hotbar = normHotbar(s.hotbar);
    if (typeof out.scrap !== 'number' || !isFinite(out.scrap)) out.scrap = 0;
    out.skins.hero = true;
    if (typeof out.skin !== 'string') out.skin = 'hero';
    return out;
  }
  const save = loadSave();
  let saveTimer = 0;
  const persist = (now) => {
    clearTimeout(saveTimer);
    if (now) { C.store.set(SAVE_KEY, save); return; }
    saveTimer = setTimeout(() => C.store.set(SAVE_KEY, save), 400);
  };
  const getBest = (key) => save.bests[key];
  const setBest = (key, val, higher = true) => {
    const cur = save.bests[key];
    const isNew = cur == null || (higher ? val > cur : val < cur);
    if (isNew) save.bests[key] = val;
    persist();
    return { best: isNew ? val : cur, isNew, prev: cur };
  };

  const listeners = {};
  const on = (ev, fn) => { (listeners[ev] = listeners[ev] || []).push(fn); };
  const emit = (ev, data) => { for (const fn of listeners[ev] || []) { try { fn(data); } catch (e) { console.warn(e); } } };

  const sem = () => save.settings.colorblind
    ? { good: P32.c, bad: P32.o, target: P32.y, target2: P32.b, goodHex: PAL.c, badHex: PAL.o, targetHex: PAL.y }
    : { good: P32.l, bad: P32.e, target: P32.y, target2: P32.e, goodHex: PAL.l, badHex: PAL.e, targetHex: PAL.y };

  const isTouchDevice = () => !!(window.matchMedia?.('(pointer: coarse)').matches) || (navigator.maxTouchPoints > 0 && !window.matchMedia?.('(pointer: fine)').matches);
  const reducedMotion = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const vibe = (ms) => { try { if (save.settings.haptics && navigator.vibrate && isTouchDevice()) navigator.vibrate(ms); } catch (e) { } };

  Object.assign(WTP, {
    PAL, P32, PAL_LIST, pack, packHex, hexRGB, unR, unG, unB, shade, mix, css32, lum, nearest, clamp, hash, rng, strSeed,
    rand, randInt, pick, fmtInt, fmtTime, fmtClock, todayKey, $, el, esc, save, persist, getBest, setBest, freshSave, normHotbar, HOTBAR_N,
    DEFAULT_KEYS, DEFAULT_SETTINGS, on, emit, sem, isTouchDevice, reducedMotion, vibe
  });
})();
