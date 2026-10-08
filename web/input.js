(() => {
  const WTP = window.WTP;
  const C = WTP.C;
  const held = new Set();
  const pending = {};
  const I = {
    mouse: { x: 0, y: 0, in: false, lastMove: 0 },
    aim: { x: 1, y: 0, src: 'auto' },
    stickL: { x: 0, y: 0, id: null },
    stickR: { x: 0, y: 0, id: null },
    touchBtns: {},
    pointerFire: false, fireLock: false, gp: null, gpPrev: [], gpAxes: [0, 0, 0, 0], lastGp: 0, lastKey: 0,
    enabled: false, capture: null, isTouch: WTP.isTouchDevice(), wheelAcc: 0, zoomReq: 0
  };
  WTP.input = I;
  if (I.isTouch) document.body.classList.add('is-touch');
  window.addEventListener('touchstart', () => { if (!I.isTouch) { I.isTouch = true; document.body.classList.add('is-touch'); } }, { passive: true });

  const keymap = () => WTP.save.keys;
  const actionsFor = (code) => { const out = []; const m = keymap(); for (const a in m) if (m[a].includes(code)) out.push(a); return out; };
  I.down = (a) => { const codes = keymap()[a] || []; for (const c of codes) if (held.has(c)) return true; return !!I.touchBtns[a] || gpDown(a); };
  I.take = (a) => { const v = pending[a]; pending[a] = false; return !!v; };
  I.press = (a) => { pending[a] = true; };
  I.clear = () => { held.clear(); for (const k in pending) pending[k] = false; I.pointerFire = false; I.touchBtns = {}; };
  const AIMKEYS = { KeyI: [0, -1], KeyK: [0, 1], KeyJ: [-1, 0], KeyL: [1, 0] };
  const BLOCK = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'];

  window.addEventListener('keydown', (e) => {
    if (I.capture) { e.preventDefault(); const fn = I.capture; I.capture = null; fn(e.code); return; }
    if (!I.enabled) return;
    if (WTP.game?.paused || (WTP.ui?.wheelOpen?.())) return;
    const tg = e.target;
    if (tg && (tg.tagName === 'TEXTAREA' || tg.tagName === 'INPUT' || tg.tagName === 'SELECT')) return;
    if (BLOCK.includes(e.code) || AIMKEYS[e.code]) e.preventDefault();
    I.lastKey = performance.now();
    if (AIMKEYS[e.code]) I.aim.src = 'keys';
    if (e.repeat) { held.add(e.code); return; }
    held.add(e.code);
    for (const a of actionsFor(e.code)) pending[a] = true;
    if (e.key && e.key.length === 1) { const kk = 'key:' + e.key.toLowerCase(); held.add(kk); for (const a of actionsFor(kk)) pending[a] = true; }
    if (/^Digit[0-9]$/.test(e.code)) pending.slot = Number(e.code.slice(5));
    if (e.code === 'KeyV') { I.fireLock = !I.fireLock; WTP.game?.label?.(I.fireLock ? 'FIRE LOCK ON (V)' : 'FIRE LOCK OFF', 900); }
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); if (e.key && e.key.length === 1) held.delete('key:' + e.key.toLowerCase()); });
  window.addEventListener('blur', () => { held.clear(); I.pointerFire = false; });

  function keyAim() {
    let x = 0, y = 0;
    for (const c in AIMKEYS) if (held.has(c)) { x += AIMKEYS[c][0]; y += AIMKEYS[c][1]; }
    return x || y ? [x, y] : null;
  }
  I.keyAim = keyAim;

  let detach = null;
  I.bindCanvas = (cv) => {
    cv.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.pointerType === 'pen') { if (!cv.classList.contains('aiming')) cv.classList.add('aiming'); const r = cv.getBoundingClientRect(); I.mouse.x = e.clientX - r.left; I.mouse.y = e.clientY - r.top; I.mouse.in = true; I.mouse.lastMove = performance.now(); I.aim.src = 'mouse'; } });
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') I.mouse.in = I.pointerFire || I.mouse.in; });
    const toggleMode = () => WTP.save.settings.toggleFire && !C.touchpad;
    const startFire = (p) => {
      if (p.pointerType === 'touch') return;
      I.mouse.x = p.x; I.mouse.y = p.y; I.mouse.in = true; I.aim.src = 'mouse'; I.mouse.lastMove = performance.now();
      C.audioContext && C.audioContext();
      if (toggleMode()) I.pointerFire = !I.pointerFire; else I.pointerFire = true;
      cv.focus({ preventScroll: true });
    };
    const moveFire = (p) => { if (p.pointerType === 'touch') return; I.mouse.x = p.x; I.mouse.y = p.y; I.mouse.in = true; I.mouse.lastMove = performance.now(); };
    const endFire = () => { if (!toggleMode()) I.pointerFire = false; };
    if (C.drag) detach = C.drag(cv, { start: startFire, move: moveFire, end: endFire });
    else {
      cv.addEventListener('pointerdown', (e) => { if (e.button === 0) { const r = cv.getBoundingClientRect(); startFire({ x: e.clientX - r.left, y: e.clientY - r.top, pointerType: e.pointerType }); } });
      window.addEventListener('pointerup', () => endFire());
    }
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => { if (e.button === 2) pending.alt = true; });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) { I.zoomReq += e.deltaY; return; }
      I.wheelStep(e.deltaX, e.deltaY, e.deltaMode, performance.now());
    }, { passive: false });
  };

  const WH = { acc: 0, last: -1e9, armed: true, lastFire: -1e9, big: false, fired: 0 };
  I.wheelState = WH;
  I.wheelStep = (dx, dy, mode, now) => {
    let d = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
    if (mode === 1) d *= 40; else if (mode === 2) d *= 400;
    if (!d) return false;
    const gap = now - WH.last;
    WH.last = now;
    const big = Math.abs(d) >= 50;
    if (gap > 200) { WH.armed = true; WH.acc = 0; }
    else if (!WH.armed && big && WH.big && gap > 70) { WH.armed = true; WH.acc = 0; }
    WH.big = big;
    if (!WH.armed) return false;
    if (WH.acc && Math.sign(WH.acc) !== Math.sign(d)) WH.acc = 0;
    WH.acc += d;
    if (Math.abs(WH.acc) < 45 || now - WH.lastFire < 90) return false;
    pending[WH.acc > 0 ? 'next' : 'prev'] = true;
    WH.fired++;
    WH.acc = 0; WH.armed = false; WH.lastFire = now;
    return true;
  };
  function bindJoy(zone, joy, s, o = {}) {
    const knob = joy.querySelector('i');
    let cx = 0, cy = 0, R = 40;
    const upd = (e) => {
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R;
      const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; }
      s.x = dx; s.y = dy;
      knob.style.transform = `translate(${Math.round(dx * R * 0.7)}px, ${Math.round(dy * R * 0.7)}px)`;
    };
    zone.addEventListener('pointerdown', (e) => {
      if (s.id != null) return;
      e.preventDefault();
      s.id = e.pointerId;
      try { zone.setPointerCapture(e.pointerId); } catch (er) { }
      const zr = zone.getBoundingClientRect();
      R = (joy.offsetWidth || 90) / 2;
      cx = Math.max(zr.left + R, Math.min(zr.right - R, e.clientX)); cy = Math.max(zr.top + R, Math.min(zr.bottom - R, e.clientY));
      joy.style.left = `${cx - zr.left - R}px`; joy.style.top = `${cy - zr.top - R}px`;
      joy.classList.add('is-on');
      C.audioContext && C.audioContext();
      upd(e);
      o.down && o.down();
    });
    zone.addEventListener('pointermove', (e) => { if (e.pointerId === s.id) upd(e); });
    const end = (e) => { if (e.pointerId !== s.id) return; s.id = null; s.x = 0; s.y = 0; knob.style.transform = ''; joy.classList.remove('is-on'); o.up && o.up(); };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }
  function bindFire(el, s) {
    let cx = 0, cy = 0, moved = false;
    const R = () => Math.max(30, el.offsetWidth * 0.7);
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (s.id != null) return;
      s.id = e.pointerId; moved = false;
      try { el.setPointerCapture(e.pointerId); } catch (er) { }
      const r = el.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      I.touchBtns.fire = true; I.fireDrag = false; el.classList.add('is-on');
      C.audioContext && C.audioContext();
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== s.id) return;
      let dx = (e.clientX - cx) / R(), dy = (e.clientY - cy) / R();
      const m = Math.hypot(dx, dy);
      if (m > 0.25) { moved = true; I.fireDrag = true; I.aim.src = 'stick'; }
      if (m > 1) { dx /= m; dy /= m; }
      if (moved) { s.x = dx; s.y = dy; const k = el.querySelector('.tb-aim'); if (k) k.style.transform = `translate(${Math.round(dx * 18)}px, ${Math.round(dy * 18)}px)`; }
    });
    const end = (e) => { if (e.pointerId !== s.id) return; s.id = null; s.x = 0; s.y = 0; I.touchBtns.fire = false; I.fireDrag = false; el.classList.remove('is-on'); const k = el.querySelector('.tb-aim'); if (k) k.style.transform = ''; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }
  I.bindTouch = (els) => {
    bindJoy(els.moveZone, els.joyL, I.stickL);
    bindFire(els.fire, I.stickR);
    for (const [el, act] of els.buttons) {
      const dn = (e) => { e.preventDefault(); I.touchBtns[act] = true; pending[act] = true; el.classList.add('is-on'); C.audioContext && C.audioContext(); WTP.vibe(8); };
      const up = () => { I.touchBtns[act] = false; el.classList.remove('is-on'); };
      el.addEventListener('pointerdown', dn);
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
    }
  };
  const GP = { jump: [0], dash: [1], melee: [2], gadget: [10], pickup: [11], alt: [6], fire: [7], prev: [4], next: [5], wheel: [3], reset: [8], pause: [9] };
  function gpDown(a) {
    const g = I.gp;
    if (!g) return false;
    const b = GP[a];
    if (b) for (const k of b) if (g.buttons[k] && (g.buttons[k].pressed || g.buttons[k].value > 0.5)) return true;
    return false;
  }
  I.pollPad = () => {
    let pads = [];
    try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { pads = []; }
    let g = null;
    for (const p of pads || []) if (p && p.connected) { g = p; break; }
    I.gp = g;
    if (!g) return;
    const prev = I.gpPrev;
    const now = g.buttons.map((b) => b.pressed || b.value > 0.5);
    for (const a in GP) for (const k of GP[a]) if (now[k] && !prev[k]) pending[a] = true;
    if (now[12] && !prev[12]) pending.navUp = true;
    if (now[13] && !prev[13]) pending.navDown = true;
    if (now[14] && !prev[14]) pending.navLeft = true;
    if (now[15] && !prev[15]) pending.navRight = true;
    if (now[0] && !prev[0]) pending.navOk = true;
    if (now[1] && !prev[1]) pending.navBack = true;
    I.gpPrev = now;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    I.gpAxes = [dz(g.axes[0] || 0), dz(g.axes[1] || 0), dz(g.axes[2] || 0), dz(g.axes[3] || 0)];
    if (now.some(Boolean) || I.gpAxes.some((v) => v)) { I.lastGp = performance.now(); if (Math.hypot(I.gpAxes[2], I.gpAxes[3]) > 0.3) I.aim.src = 'pad'; }
  };
  I.moveX = () => {
    let mx = 0;
    if (I.down('left')) mx -= 1;
    if (I.down('right')) mx += 1;
    if (Math.abs(I.stickL.x) > 0.22) mx = Math.max(-1, Math.min(1, I.stickL.x * 1.4));
    if (Math.abs(I.gpAxes[0]) > 0.2) mx = I.gpAxes[0];
    if (I.gp && I.gp.buttons[14]?.pressed && !mx) mx = -1;
    if (I.gp && I.gp.buttons[15]?.pressed && !mx) mx = 1;
    return mx;
  };
  I.downHeld = () => I.down('down') || (I.stickL.id != null && I.stickL.y > 0.72) || I.gpAxes[1] > 0.7;
  I.jumpHeld = () => I.down('jump') || !!I.touchBtns.jump;
  I.wantFire = () => I.pointerFire || I.fireLock || I.down('fire') || held.has('Enter') || held.has('NumpadEnter') || !!I.touchBtns.fire;
  I.gpNav = (a) => I.take(a);
})();
