(async () => {
  const WTD = window.WTD;
  const log = (msg) => WTD.post({ t: 'log', msg: String(msg) });
  WTD.log = log;
  WTD.errors = [];
  window.addEventListener('error', (e) => { const m = `${e.message} ${e.filename || ''}:${e.lineno || ''}`; WTD.errors.push(m); log('error ' + m); });
  window.addEventListener('unhandledrejection', (e) => { const m = 'rejection ' + ((e.reason && e.reason.stack) || e.reason); WTD.errors.push(m); log(m); });
  WTD.quit = (why) => { try { WTP.audio?.stopLoops?.(); } catch (e) { } WTD.post({ t: 'quit', why: why || 'quit' }); };
  window.addEventListener('keydown', (e) => { if (e.code === 'F12') { e.preventDefault(); WTD.quit('panic'); } }, true);

  const getJSON = async (u, d) => { try { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) return d; return await r.json(); } catch (e) { return d; } };
  const [session, saved] = await Promise.all([getJSON('session/session.json', null), getJSON('session/save.json', {})]);
  if (!session) { log('no session'); WTD.quit('no-session'); return; }
  WTD.session = session;
  WTD.monitor = session.monitors.find((m) => m.name === WTD.mon) || session.monitors.find((m) => m.focused) || session.monitors[0];

  const store = new Map(Object.entries(saved || {}));
  let saveT = 0;
  let actx = null;
  window.Curio = {
    store: {
      get: (k, f) => (store.has(k) ? store.get(k) : f),
      set: (k, v) => { store.set(k, v); clearTimeout(saveT); saveT = setTimeout(() => WTD.post({ t: 'save', data: Object.fromEntries(store) }), 400); }
    },
    muted: WTD.test || WTD.probe,
    audioContext: () => {
      if (window.Curio.muted) return null;
      if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' }); } catch (e) { actx = null; } }
      if (actx && actx.state === 'suspended') actx.resume().catch(() => { });
      return actx;
    },
    toast() { }, confetti() { }, isDark: () => true,
    rand: (a, b) => a + Math.random() * (b - a), randInt: (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick: (a) => a[Math.floor(Math.random() * a.length)],
    fmt: (n) => String(Math.round(n)), best: () => ({ best: 0, isNew: false }), getBest: () => null
  };

  const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('load ' + src)); document.body.appendChild(s); });
  const SCRIPTS = ['core.js', 'font.js', 'sprites.js', 'audio.js', 'desk/sfx.js', 'desk/sfx-levels.js', 'world.js', 'fx.js', 'desk/budget.js', 'input.js', 'player.js', 'rig.js', 'gadgets.js', 'weapons.js', 'props.js', 'enemies.js', 'modes.js', 'progress.js', 'desk/segment.js', 'desk/render.js', 'desk/booms.js', 'desk/structures.js', 'desk/gags.js', 'desk/weapons-desk.js', 'desk/weapons-desk2.js', 'desk/alts.js', 'desk/vsprites.js', 'desk/pixctx.js', 'desk/feel.js', 'desk/enemies-desk.js', 'desk/disasters.js', 'desk/hardcore.js', 'desk/merges.js', 'desk/level.js', 'desk/pixui.js', 'game.js', 'desk/ach.js', 'desk/shop.js', 'desk/extras.js', 'ui.js'];

  const shotImg = document.getElementById('shot');
  const shotReady = shotImg.complete && shotImg.naturalWidth ? Promise.resolve() : new Promise((r) => { shotImg.addEventListener('load', r, { once: true }); shotImg.addEventListener('error', r, { once: true }); });
  const scripts = (async () => { for (const s of SCRIPTS) await load(s); })();
  await shotReady;
  const PW = shotImg.naturalWidth, PH = shotImg.naturalHeight;
  const sc = document.createElement('canvas');
  sc.width = PW; sc.height = PH;
  const sctx = sc.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(shotImg, 0, 0);
  const shotData = sctx.getImageData(0, 0, PW, PH);
  WTD.shot = { w: PW, h: PH, data: shotData.data, canvas: sc };

  const segInput = { shot: { w: PW, h: PH, data: new Uint8ClampedArray(shotData.data) }, monitor: WTD.monitor, session };
  const tSeg = performance.now();
  const seg = await new Promise((resolve) => {
    let done = false;
    const local = async () => { await scripts; if (done) return; done = true; resolve(window.WTDSegment.segment(segInput)); };
    try {
      const wk = new Worker('desk/segment.js');
      wk.onmessage = (e) => { if (done) return; done = true; wk.terminate(); resolve(e.data); };
      wk.onerror = (e) => { log('worker failed, segmenting inline'); wk.terminate(); local(); };
      wk.postMessage(segInput, [segInput.shot.data.buffer]);
    } catch (e) { local(); }
  });
  log(`segmented in ${Math.round(performance.now() - tSeg)} ms (worker ${seg.ms} ms): ${seg.regions.filter((r) => r.type === 'window').length} windows, ${seg.glyphs.length} glyphs, ${seg.widgets.length} widgets`);
  await scripts;
  WTD.seg = seg;
  WTP.level.start(seg);
  WTD.post({ t: 'want-wallpaper' });
  WTD.ready = true;
  if (!WTD.test && !WTD.probe) setTimeout(() => {
    try {
      const ac = window.Curio.audioContext();
      if (!ac) return;
      const t0 = ac.currentTime;
      setTimeout(() => { WTD.audioOk = ac.currentTime > t0 || ac.state === 'running'; if (!WTD.audioOk) WTP.ui?.label?.('NO SOUND OUTPUT FOUND, SEE SETTINGS', 3000); }, 1200);
    } catch (e) { WTD.audioOk = false; }
  }, 500);
  if (WTD.probe) load('desk/probe.js');
})();
