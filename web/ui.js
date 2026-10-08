(() => {
  const WTP = window.WTP;
  const WTD = window.WTD;
  const { esc, fmtInt, fmtClock } = WTP;
  const G = WTP.game, WP = WTP.weapons, AU = WTP.audio, I = WTP.input, MD = WTP.modes;
  const S = () => WTP.save;
  const U = {};
  WTP.ui = U;
  const hud = document.getElementById('hud');
  hud.hidden = false;
  hud.innerHTML = `
    <div class="card stats" id="hStats">
      <div class="row"><span>wrecked</span><b id="hPct">0%</b></div>
      <div class="bar"><i id="hBar"></i><em id="hGoal" hidden></em></div>
      <div class="row" id="hTimeW"><span id="hTimeL">time</span><b id="hTime">0:00</b></div>
      <div class="row" id="hScoreW"><span>score</span><b id="hScore">0</b></div>
      <div class="row" id="hWaveW" hidden><span>wave</span><b id="hWave">0</b></div>
      <div class="row"><span>life</span><div class="hp" id="hHp"></div></div>
      <div class="row" id="hAmmoW" hidden><span>ammo</span><b id="hAmmo">0</b></div>
      <div class="row shards" id="hShardsW" hidden><span>shards</span><b><i class="shard"></i><em id="hShards">0</em></b></div>
    </div>
    <div class="combo" id="hCombo"><div class="n" id="hComboN"></div><div class="m" id="hComboM"></div><div class="t" id="hComboT"></div></div>
    <div class="fire-badge" id="hFire" hidden><i></i>FIRING <span>click or V to stop</span></div>
    <div class="card hotbar" id="hHot"></div>
    <div class="card wname" id="hName"></div>
    <div class="announce" id="hAnn"></div>
    <div class="toasts" id="hToasts"></div>
    <div class="wheel" id="hWheel" hidden>
      <div class="ring" id="hRing"></div>
      <div class="card winfo" id="hWInfo"></div>
      <div class="card wbar" id="hWBar"></div>
    </div>
    <div class="menu" id="hMenu" hidden><div class="card mwin"><nav class="mtabs" id="hTabs"></nav><section class="mbody" id="hBody"></section></div></div>
    <div class="menu" id="hRes" hidden><div class="card mwin res-win" id="hResP"></div></div>
  `;
  const $ = (id) => document.getElementById(id);
  const imgCache = new Map();
  function wImg(id, sc = 3, silhouette = false) {
    const skin = WTP.shop?.skinOf?.(id) || '';
    const k = `${id}|${sc}|${silhouette ? 's' : ''}|${skin}`;
    if (imgCache.has(k)) return imgCache.get(k);
    const d = WP.BY[id];
    if (!d || !d.sprite) return '';
    let f = sc;
    if (d.sprite.vector) { const b = d.sprite.base(), box = sc >= 3 ? [58, 30] : [40, 20]; f = Math.max(1, Math.floor(Math.min(box[0] / b.width, box[1] / b.height))); }
    const src = (!silhouette && WTP.shop?.skinCanvas?.(id, f)) || (d.sprite.vector ? d.sprite.icon(f) : d.sprite.cv);
    const c = document.createElement('canvas');
    c.width = d.sprite.vector ? src.width : d.sprite.w * sc; c.height = d.sprite.vector ? src.height : d.sprite.h * sc;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    if (silhouette) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#05050a'; g.fillRect(0, 0, c.width, c.height); }
    const url = c.toDataURL();
    imgCache.set(k, url);
    return url;
  }
  U.wImg = wImg;
  U.clearImgCache = () => imgCache.clear();
  function gImg(id) {
    const k = 'g:' + id;
    if (imgCache.has(k)) return imgCache.get(k);
    const d = WTP.gadgets.BY[id];
    const c = document.createElement('canvas');
    c.width = d.sprite.w * 3; c.height = d.sprite.h * 3;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(d.sprite.cv, 0, 0, c.width, c.height);
    const url = c.toDataURL(); imgCache.set(k, url); return url;
  }
  const locked = (id) => !!WTP.ach && !WTP.ach.weaponOwned(id);

  const LAYOUT_FR = { KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', KeyM: ',', Semicolon: 'M', Comma: ';', Period: ':', Slash: '!', Digit1: '1', Digit2: '2', Digit3: '3', Digit4: '4', Digit5: '5', Digit6: '6', Digit7: '7', Digit8: '8', Digit9: '9', Digit0: '0' };
  U.keyName = (code) => {
    if (!code) return '';
    if (code.startsWith('key:')) return code.slice(4).toUpperCase();
    const fr = String(WTD.session?.layout || '').startsWith('fr');
    if (fr && LAYOUT_FR[code]) return LAYOUT_FR[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return ({ ShiftLeft: 'Shift', ShiftRight: 'Shift R', ControlLeft: 'Ctrl', ControlRight: 'Ctrl R', Space: 'Space', Escape: 'Esc', ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down', Enter: 'Enter', Tab: 'Tab', AltLeft: 'Alt' })[code] || code;
  };
  const focusCanvas = () => document.getElementById('cv').focus({ preventScroll: true });

  let idleT = 0, lastHp = '';
  U.hudSetup = (run) => {
    const h = run.hud || {};
    $('hStats').style.display = h.minimal ? 'none' : '';
    $('hTimeW').hidden = !h.time;
    $('hTimeL').textContent = h.countdown ? 'time left' : 'time';
    $('hScoreW').hidden = !h.score;
    $('hWaveW').hidden = !run.mode.waves;
    $('hAmmoW').hidden = !WP.ammo();
    const goal = run.goal || h.goal;
    $('hGoal').hidden = !goal;
    if (goal) $('hGoal').style.left = `${goal}%`;
    lastHp = '';
    U.closeOverlays();
  };
  U.hud = (run) => {
    const pct = MD.pct();
    $('hPct').textContent = `${pct.toFixed(1)}%`;
    $('hBar').style.width = `${Math.min(100, pct)}%`;
    const t = run.mode.hud?.countdown ? Math.max(0, (run.limit || 60) - run.t) : run.t;
    $('hTime').textContent = fmtClock(t);
    $('hTime').classList.toggle('warn', !!run.mode.hud?.countdown && t <= 10);
    $('hScore').textContent = fmtInt(run.score);
    $('hWave').textContent = run.wave || 0;
    const P = WTP.player;
    const key = run.mode.noDamage ? 'inv' : `${P.hp}/${P.maxHp}`;
    if (key !== lastHp) {
      lastHp = key;
      $('hHp').innerHTML = run.mode.noDamage ? '<b class="inv">invulnerable</b>' : Array.from({ length: P.maxHp }, (_, k) => `<i class="${k < P.hp ? '' : 'off'}"></i>`).join('');
    }
    const ammo = WP.ammo();
    if (ammo) { const a = ammo[WP.st.cur]; $('hAmmo').textContent = a == null ? '-' : a; $('hAmmo').classList.toggle('warn', a != null && a <= 3); }
    if (WTP.shop) { $('hShardsW').hidden = false; $('hShards').textContent = fmtInt(WTP.shop.shards()); }
    const c = $('hCombo');
    const on = run.combo >= 5 && !run.ended && !run.hud?.minimal;
    c.classList.toggle('on', on);
    if (on) {
      $('hComboN').textContent = `${run.combo} HIT COMBO`;
      $('hComboM').textContent = `x${run.mult}`;
      $('hComboM').classList.toggle('pop', (run.comboPop || 0) > 0.4);
      $('hComboT').style.width = `${Math.round(140 * Math.max(0, run.comboT / 1.6))}px`;
    }
    $('hFire').hidden = !(I.firing() && (S().settings.toggleFire || I.fireLock)) || G.paused;
    const px = P.x * WTP.world.CP / devicePixelRatio, py = P.y * WTP.world.CP / devicePixelRatio;
    $('hStats').classList.toggle('dim', px > window.innerWidth - 280 && py < 280);
    idleT += 0.1;
    $('hHot').classList.toggle('idle', idleT > 3 && !(py > window.innerHeight - 160 && Math.abs(px - window.innerWidth / 2) < 360));
  };
  U.tick = () => { };

  function slotHtml(id, i, cur, opts = {}) {
    const num = (i + 1) % 10;
    if (!id) return `<button class="slot empty" data-slot="${i}" title="Empty slot ${num}: right click or drop a weapon here"><span class="k">${num}</span><span class="plus">+</span></button>`;
    const ammo = WP.ammo();
    const a = ammo ? ammo[id] : null;
    return `<button class="slot${id === cur ? ' cur' : ''}${locked(id) ? ' locked' : ''}" data-slot="${i}" data-w="${id}" draggable="${opts.drag ? 'true' : 'false'}" title="${esc(WP.BY[id].name)} (${num}), right click to change"><span class="k">${num}</span><img alt="" src="${wImg(id)}">${a != null ? `<span class="a${a <= 3 ? ' warn' : ''}">${a}</span>` : ''}</button>`;
  }
  function bindDrop(root, after) {
    root.querySelectorAll('[data-slot]').forEach((b) => {
      b.addEventListener('dragover', (e) => { e.preventDefault(); b.classList.add('drop'); });
      b.addEventListener('dragleave', () => b.classList.remove('drop'));
      b.addEventListener('drop', (e) => {
        e.preventDefault(); b.classList.remove('drop');
        const id = e.dataTransfer.getData('text/weapon');
        const from = e.dataTransfer.getData('text/slot');
        const slot = +b.dataset.slot;
        if (from !== '' && from != null && id) { const hb = S().hotbar; const other = hb[slot]; hb[slot] = id; hb[+from] = other || null; WTP.persist(); }
        else if (id) G.assignSlot(slot, id);
        AU.play('select');
        after && after();
        U.hudWeapons(G.slots(), WP.st.cur);
      });
      b.addEventListener('dragstart', (e) => { if (b.dataset.w) { e.dataTransfer.setData('text/weapon', b.dataset.w); e.dataTransfer.setData('text/slot', b.dataset.slot); } });
    });
  }
  U.hudWeapons = (slots, curId) => {
    idleT = 0;
    let html = '';
    for (let i = 0; i < 10; i++) html += slotHtml(slots[i], i, curId, { drag: true });
    if (curId && !slots.includes(curId)) html += `<button class="slot cur extra" data-w="${curId}"><span class="k">*</span><img alt="" src="${wImg(curId)}"></button>`;
    const hb = $('hHot');
    hb.innerHTML = html;
    hb.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => { G.selectWeapon(b.dataset.w); focusCanvas(); }));
    hb.querySelectorAll('[data-slot]').forEach((b) => {
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); U.wheel(true, +b.dataset.slot); });
      if (!b.dataset.w) b.addEventListener('click', () => U.wheel(true, +b.dataset.slot));
    });
    bindDrop(hb);
    if (U.wheelOpen()) renderWheelBar();
  };
  let nameT = 0;
  U.weaponName = (d) => { idleT = 0; const n = $('hName'); n.innerHTML = `<b>${esc(d.name)}</b><span>${esc(d.does || d.tip || '')}</span>`; n.classList.add('on'); clearTimeout(nameT); nameT = setTimeout(() => n.classList.remove('on'), 2000); };
  U.label = (text, ms = 1200) => { const n = $('hName'); n.innerHTML = `<span>${esc(text)}</span>`; n.classList.add('on'); clearTimeout(nameT); nameT = setTimeout(() => n.classList.remove('on'), ms); };
  let annT = 0;
  U.announce = (text, tier = 2) => {
    const a = $('hAnn');
    a.textContent = text;
    a.className = `announce on t${tier >= 6 ? 6 : tier >= 3 ? 3 : 1}`;
    clearTimeout(annT);
    annT = setTimeout(() => a.classList.remove('on'), 900 + tier * 120);
  };
  U.toast = (o) => {
    const box = $('hToasts');
    const el = document.createElement('div');
    el.className = `toast card ${o.kind || ''}`;
    el.innerHTML = `${o.icon ? `<div class="ti">${o.icon}</div>` : ''}<div class="tt"><b>${esc(o.title)}</b>${o.text ? `<span>${esc(o.text)}</span>` : ''}</div>${o.reward ? `<div class="tr">${esc(o.reward)}</div>` : ''}`;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    setTimeout(() => { el.classList.remove('on'); setTimeout(() => el.remove(), 400); }, o.ms || 3800);
    while (box.children.length > 4) box.firstChild.remove();
  };
  U.toggleMute = () => {
    const st = S().settings;
    st.muted = !st.muted;
    window.Curio.muted = st.muted || WTD.test;
    if (st.muted) AU.stopLoops();
    WTP.persist();
    U.label(st.muted ? 'SOUND OFF (M)' : 'SOUND ON (M)', 900);
  };
  window.Curio.muted = !!S().settings.muted || WTD.test || WTD.probe;

  const CATS = () => WP.CATS;
  let wheelCat = 0, wheelHover = null, wheelSlot = null;
  U.wheelOpen = () => !$('hWheel').hidden;
  U.wheel = (open, slot) => {
    const w = $('hWheel');
    if (!open) { w.hidden = true; wheelSlot = null; hud.classList.remove('overlay'); focusCanvas(); return; }
    hud.classList.add('overlay');
    if (!G.run || G.run.ended) return;
    I.pointerFire = false;
    w.hidden = false;
    wheelSlot = slot ?? null;
    const cur = WP.BY[wheelSlot != null ? (S().hotbar[wheelSlot] || WP.st.cur) : WP.st.cur];
    wheelCat = Math.max(0, CATS().findIndex((c) => c.id === cur?.cat));
    wheelHover = null;
    renderWheel();
    AU.play('select');
  };
  function infoHtml(d) {
    if (!d) return '';
    if (locked(d.id)) {
      const a = WTP.ach.goalFor(d.id);
      return `<div class="wi-name locked">${a && a.secret ? '???' : esc(d.name)}</div><div class="wi-lock"><i class="lock"></i>${a ? esc(a.secret ? `Secret: ${a.hint || 'keep playing to find out'}` : a.desc) : 'Locked'}</div>`;
    }
    const cat = CATS().find((c) => c.id === d.cat);
    return `<div class="wi-name">${esc(d.name)}<small>${esc(cat ? cat.name : '')}</small></div>
      <div class="wi-row"><b>Fire</b><span>${esc(d.does || d.tip || '')}</span></div>
      ${d.altDoes ? `<div class="wi-row"><b>Alt</b><span>${esc(d.altDoes)}</span></div>` : ''}
      ${d.tip && d.does ? `<div class="wi-tip">${esc(d.tip)}</div>` : ''}
      ${statsHtml(d)}`;
  }
  const STAT_NAMES = ['Power', 'Fire rate', 'Range', 'Chaos'];
  function statsHtml(d) {
    if (!Array.isArray(d.st)) return '';
    return `<div class="wi-stats">${STAT_NAMES.map((n, i) => { const v = Math.max(0, Math.min(5, d.st[i] | 0)); return `<div class="wi-stat"><span>${n}</span><i>${'<em class="on"></em>'.repeat(v)}${'<em></em>'.repeat(5 - v)}</i></div>`; }).join('')}</div>`;
  }
  function renderWheel() {
    const ring = $('hRing');
    const cats = CATS();
    const R = 258;
    let html = '';
    cats.forEach((c, k) => {
      const a = -Math.PI / 2 + (k / cats.length) * Math.PI * 2;
      const x = 300 + Math.cos(a) * R, y = 300 + Math.sin(a) * R;
      const first = WP.DEFS.find((d) => d.cat === c.id && !locked(d.id)) || WP.DEFS.find((d) => d.cat === c.id);
      const total = WP.DEFS.filter((d) => d.cat === c.id).length, own = WP.DEFS.filter((d) => d.cat === c.id && !locked(d.id)).length;
      html += `<div class="cat${k === wheelCat ? ' on' : ''}" data-k="${k}" style="left:${x}px;top:${y}px">${first ? `<img alt="" src="${wImg(first.id, 2, locked(first.id))}">` : ''}<span>${esc(c.name)}</span><em>${own}/${total}</em></div>`;
    });
    const list = WP.DEFS.filter((d) => d.cat === cats[wheelCat].id);
    const GD = WTP.gadgets;
    const gcur = GD.curId();
    html += `<div class="center"><div class="ctitle">${esc(cats[wheelCat].name)}</div><div class="items${list.length > 12 ? ' compact' : ''}">${list.map((d) => {
      const lk = locked(d.id);
      return `<button class="witem${d.id === WP.st.cur ? ' cur' : ''}${lk ? ' locked' : ''}" data-w="${d.id}" draggable="${lk ? 'false' : 'true'}"><img alt="" src="${wImg(d.id, 3, lk)}"><span>${esc(lk && WTP.ach.goalFor(d.id)?.secret ? '???' : d.name)}</span></button>`;
    }).join('')}</div><div class="sub">gadget (${esc(U.keyName(S().keys.gadget?.[0]))})</div><div class="gads">${GD.DEFS.map((g) => `<button class="slot gad${g.id === gcur ? ' cur' : ''}" data-g="${g.id}" title="${esc(g.name)}"><img alt="" src="${gImg(g.id)}"></button>`).join('')}</div></div>`;
    ring.innerHTML = html;
    $('hWInfo').innerHTML = infoHtml(WP.BY[wheelHover] || WP.BY[WP.st.cur]);
    renderWheelBar();
    ring.querySelectorAll('[data-g]').forEach((b) => {
      b.addEventListener('mouseenter', () => { const g = WTP.gadgets.BY[b.dataset.g]; $('hWInfo').innerHTML = `<div class="wi-name">${esc(g.name)}<small>gadget</small></div><div class="wi-row"><b>Use</b><span>${esc(g.tip)}</span></div>`; });
      b.addEventListener('click', () => { S().gadget = b.dataset.g; WTP.persist(); WTP.gadgets.reset?.(); AU.play('select'); renderWheel(); });
    });
    ring.querySelectorAll('.cat').forEach((el) => {
      el.addEventListener('mouseenter', () => { if (wheelCat !== +el.dataset.k) { wheelCat = +el.dataset.k; wheelHover = null; renderWheel(); AU.play('tick'); } });
      el.addEventListener('click', () => { wheelCat = +el.dataset.k; renderWheel(); });
    });
    ring.querySelectorAll('[data-w]').forEach((b) => {
      b.addEventListener('mouseenter', () => { wheelHover = b.dataset.w; $('hWInfo').innerHTML = infoHtml(WP.BY[wheelHover]); });
      b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/weapon', b.dataset.w); });
      b.addEventListener('click', () => {
        const id = b.dataset.w;
        if (locked(id)) { AU.play('deny'); return; }
        if (wheelSlot != null) { G.assignSlot(wheelSlot, id); U.label(`${WP.BY[id].name.toUpperCase()} ON SLOT ${(wheelSlot + 1) % 10}`, 900); AU.play('select'); G.selectWeapon(id, true); U.wheel(false); return; }
        G.selectWeapon(id); U.wheel(false);
      });
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); const id = b.dataset.w; if (locked(id)) return; const hb = S().hotbar; const free = hb.findIndex((x) => !x); G.assignSlot(free >= 0 ? free : 9, id); AU.play('select'); renderWheelBar(); });
    });
  }
  function renderWheelBar() {
    const bar = $('hWBar');
    const slots = G.slots();
    bar.innerHTML = `<div class="wb-hint">${wheelSlot != null ? `Pick a weapon for slot ${(wheelSlot + 1) % 10}` : 'Drag a weapon onto a slot, right click a weapon to add it, or hover one and press 1 to 0'}</div><div class="wb-slots">${slots.map((id, i) => slotHtml(id, i, WP.st.cur, { drag: true })).join('')}</div>`;
    bar.querySelectorAll('[data-slot]').forEach((b) => b.classList.toggle('target', +b.dataset.slot === wheelSlot));
    bar.querySelectorAll('[data-slot]').forEach((b) => {
      b.addEventListener('click', () => { wheelSlot = +b.dataset.slot; renderWheelBar(); });
      b.addEventListener('contextmenu', (e) => { e.preventDefault(); G.assignSlot(+b.dataset.slot, null); renderWheelBar(); });
    });
    bindDrop(bar, renderWheelBar);
  }

  window.addEventListener('keydown', (e) => {
    if (U.wheelOpen()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      const keys = S().keys;
      if (e.code === 'Escape' || (keys.wheel || []).includes(e.code)) { U.wheel(false); return; }
      if (/^Digit[0-9]$/.test(e.code) && wheelHover && !locked(wheelHover)) { const n = Number(e.code.slice(5)); G.assignSlot(n === 0 ? 9 : n - 1, wheelHover); U.label(`${WP.BY[wheelHover].name.toUpperCase()} ON SLOT ${n}`, 900); AU.play('select'); renderWheelBar(); return; }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { wheelCat = (wheelCat + (e.code === 'ArrowRight' ? 1 : -1) + CATS().length) % CATS().length; wheelHover = null; renderWheel(); }
      return;
    }
    if (!$('hMenu').hidden && rebinding == null) {
      e.stopImmediatePropagation();
      if (e.code === 'Escape') { e.preventDefault(); G.pause(false); }
      return;
    }
    if (!$('hRes').hidden) { e.stopImmediatePropagation(); }
  }, true);

  let rebinding = null;
  const ACTIONS = [['left', 'Move left'], ['right', 'Move right'], ['jump', 'Jump'], ['down', 'Crouch / drop'], ['dash', 'Dash'], ['roll', 'Roll'], ['melee', 'Kick'], ['gadget', 'Gadget'], ['pickup', 'Pick up / throw'], ['fire', 'Fire (hold)'], ['firelock', 'Fire on / off'], ['alt', 'Alt fire'], ['aimUp', 'Aim up'], ['aimDown', 'Aim down'], ['aimLeft', 'Aim left'], ['aimRight', 'Aim right'], ['wheel', 'Weapon wheel'], ['reset', 'Restart'], ['mute', 'Sound on / off'], ['fps', 'FPS counter'], ['next_level', 'Next workspace'], ['pause', 'Pause / menu']];
  const PRESETS = {
    mouse: { name: 'Mouse', desc: 'Aim with the mouse, hold left click to fire, right click for alt fire, wheel to switch weapons.', s: { toggleFire: false, autoAim: 0, autoFire: false, aimSmooth: 0, bigCross: false }, aim: [] },
    touchpad: { name: 'Touchpad', desc: 'Aim by moving the pointer, no click needed. Tap once to start firing, tap again to stop. Two finger tap is alt fire, two finger scroll switches weapons. Auto-aim locks onto enemies.', s: { toggleFire: true, autoAim: 2, autoFire: false, aimSmooth: 0.35, bigCross: true }, aim: [] },
    keyboard: { name: 'Keyboard only', desc: 'Arrow keys aim, K fires, L alt fire, ZQSD move. Auto-aim helps you hit things.', s: { toggleFire: false, autoAim: 2, autoFire: false, aimSmooth: 0, bigCross: true }, aim: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] },
    gamepad: { name: 'Gamepad', desc: 'Left stick moves, right stick aims, RT fires, LT alt fire, A jumps, B dashes, Y opens the wheel.', s: { toggleFire: false, autoAim: 1, autoFire: false, aimSmooth: 0, bigCross: false }, aim: [] }
  };
  U.applyPreset = (name) => {
    const p = PRESETS[name];
    if (!p) return;
    const st = S().settings;
    Object.assign(st, p.s, { controls: name });
    const keys = S().keys;
    const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
    for (const a of ['left', 'right', 'jump', 'down']) keys[a] = (keys[a] || []).filter((c) => !arrows.includes(c));
    if (name === 'keyboard') { keys.aimUp = ['ArrowUp']; keys.aimDown = ['ArrowDown']; keys.aimLeft = ['ArrowLeft']; keys.aimRight = ['ArrowRight']; keys.fire = ['KeyK', 'Enter']; keys.alt = ['KeyL', 'KeyG']; }
    else {
      keys.aimUp = []; keys.aimDown = []; keys.aimLeft = []; keys.aimRight = [];
      keys.left = [...new Set([...keys.left, 'ArrowLeft'])]; keys.right = [...new Set([...keys.right, 'ArrowRight'])]; keys.jump = [...new Set([...keys.jump, 'ArrowUp'])]; keys.down = [...new Set([...keys.down, 'ArrowDown'])];
    }
    I.pointerFire = false; I.fireLock = false;
    WTP.persist();
  };

  const row = (label, html, hint) => `<div class="srow"><div class="sl"><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</div><div class="sc">${html}</div></div>`;
  const slider = (id, v, min = 0, max = 1, step = 0.05, fmt) => `<div class="slw"><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"><output>${fmt ? fmt(v) : Math.round(v * 100) + '%'}</output></div>`;
  const toggle = (id, on) => `<button class="tg${on ? ' on' : ''}" data-tg="${id}" role="switch" aria-checked="${on}"><i></i></button>`;
  const choice = (id, cur, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-ch="${id}" data-v="${v}">${l}</button>`).join('')}</div>`;

  let tab = 'play';
  const TABS = () => [['play', 'Play'], ['loadout', 'Loadout'], ...(WTP.ach ? [['ach', 'Achievements']] : []), ...(WTP.shop ? [['skins', 'Skins'], ['crates', 'Crates']] : []), ['settings', 'Settings'], ['controls', 'Controls']];
  U.pauseMenu = (on) => {
    const o = $('hMenu');
    o.hidden = !on;
    hud.classList.toggle('overlay', on);
    if (!on) { rebinding = null; focusCanvas(); return; }
    tab = 'play';
    renderMenu();
  };
  U.openTab = (t) => { tab = t; renderMenu(); };
  function renderMenu() {
    $('hTabs').innerHTML = `<div class="mlogo">Wreck This<br>Desktop</div>${TABS().map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-t="${k}">${l}</button>`).join('')}<div class="mfoot">Esc resume<br>F12 quit instantly</div>`;
    $('hTabs').querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.t; rebinding = null; renderMenu(); AU.play('tick'); }));
    const body = $('hBody');
    const st = S().settings;
    const run = G.run;
    if (tab === 'play') {
      body.innerHTML = `<h2>Paused</h2>
        <div class="btns"><button class="b primary" data-a="resume">Resume</button><button class="b" data-a="restart">Restart this desktop</button><button class="b" data-a="finish">Finish and grade</button>${st.nextLevel ? '<button class="b" data-a="next">Next workspace</button>' : ''}<button class="b danger" data-a="quit">Quit to desktop</button></div>
        <h3>Mode</h3>
        <div class="modes">${MD.ORDER.map((m) => { const M = MD.MODES[m]; const best = M.bestKey ? WTP.getBest(M.bestKey({ goal: run.goal })) : null; return `<button class="mode${run.modeId === m ? ' on' : ''}" data-mode="${m}"><b>${esc(M.name)}</b><span>${esc(M.desc)}</span>${best != null ? `<em>best ${esc(M.fmt ? M.fmt(best) : fmtInt(best))}</em>` : ''}</button>`; }).join('')}</div>
        <h3>Quick settings</h3>
        ${row('Screen shake', slider('sShake', st.shake, 0, 1.5, 0.05))}
        ${row('Master volume', slider('sMaster', st.master))}
        ${row('Sound', toggle('muted', !st.muted))}`;
    } else if (tab === 'loadout') {
      const hb = G.slots();
      body.innerHTML = `<h2>Loadout</h2><p class="muted">Drag weapons onto the hotbar, or click a slot and then a weapon. Right click a slot to empty it.</p>
        <div class="lo-bar" id="loBar">${hb.map((id, i) => slotHtml(id, i, WP.st.cur, { drag: true })).join('')}</div>
        ${CATS().map((c) => `<h3>${esc(c.name)}</h3><div class="lo-grid">${WP.DEFS.filter((d) => d.cat === c.id).map((d) => { const lk = locked(d.id); return `<button class="witem${lk ? ' locked' : ''}" data-w="${d.id}" draggable="${lk ? 'false' : 'true'}" title="${esc(lk ? (WTP.ach.goalFor(d.id)?.secret ? 'Secret weapon' : WTP.ach.goalFor(d.id)?.desc || '') : (d.does || ''))}"><img alt="" src="${wImg(d.id, 3, lk)}"><span>${esc(lk && WTP.ach.goalFor(d.id)?.secret ? '???' : d.name)}</span></button>`; }).join('')}</div>`).join('')}
        <div class="btns"><button class="b" data-a="defbar">Reset hotbar</button></div>`;
      let pickSlot = null;
      const bar = body.querySelector('#loBar');
      bar.querySelectorAll('[data-slot]').forEach((b) => {
        b.addEventListener('click', () => { pickSlot = +b.dataset.slot; bar.querySelectorAll('[data-slot]').forEach((x) => x.classList.toggle('target', +x.dataset.slot === pickSlot)); });
        b.addEventListener('contextmenu', (e) => { e.preventDefault(); G.assignSlot(+b.dataset.slot, null); renderMenu(); });
      });
      bindDrop(bar, renderMenu);
      body.querySelectorAll('.lo-grid [data-w]').forEach((b) => {
        b.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/weapon', b.dataset.w));
        b.addEventListener('click', () => { if (locked(b.dataset.w)) { AU.play('deny'); return; } const hb2 = S().hotbar; const slot = pickSlot ?? Math.max(0, hb2.findIndex((x) => !x)); G.assignSlot(slot, b.dataset.w); AU.play('select'); renderMenu(); });
      });
    } else if (tab === 'settings') {
      body.innerHTML = `<h2>Settings</h2>
        <h3>Sound</h3>
        ${row('Sound', toggle('muted', !st.muted), 'M toggles it in game')}
        ${row('Master volume', slider('sMaster', st.master))}
        ${row('Effects', slider('sSfx', st.sfx))}
        ${row('Test', '<button class="b" data-a="testsnd">Play a sound</button>', WTD.audioOk === false ? 'No audio output was found. Install gst-plugins-good and restart the game.' : '')}
        <h3>Visuals</h3>
        ${row('Screen shake', slider('sShake', st.shake, 0, 1.5, 0.05))}
        ${row('Particles and effects', slider('sFx', st.fxAmount ?? 1, 0.2, 1, 0.05), 'Lower it if things get busy or slow')}
        ${row('Quality', choice('quality', st.quality, [['auto', 'Auto'], ['high', 'High'], ['medium', 'Medium'], ['low', 'Low'], ['battery', 'Battery']]), 'Auto follows your power mode')}
        ${row('Kill cam slow-mo', toggle('killcam', st.killcam))}
        ${row('Flashes', toggle('flashes', st.flashes))}
        ${row('FPS counter', toggle('fps', st.fps), 'F3')}
        <h3>Desktop merges</h3>
        ${row('Next workspace', toggle('nextLevel', st.nextLevel), 'Jump to your next workspace and wreck it too')}
        ${row('Live notifications', toggle('liveNotifs', st.liveNotifs), 'Real notifications become enemies')}
        ${row('Leave the wreckage', toggle('wreckage', st.wreckage), 'Keeps the wrecked screen as wallpaper until SUPER SHIFT ALT + K')}
        ${row('Real windows shake', toggle('shakeReal', st.shakeReal), 'Big blasts nudge real floating windows, put back on exit')}
        ${row('X-ray holes', toggle('xray', st.xray), 'Holes show your live desktop')}
        ${row('App gags', toggle('gags', st.gags))}
        ${WTP.ach ? `<details class="adv"><summary>Advanced</summary>${row('Unlock every weapon', toggle('unlockAll', st.unlockAll), 'Skips the achievements')}</details>` : ''}`;
    } else if (tab === 'controls') {
      const keys = S().keys;
      body.innerHTML = `<h2>Controls</h2>
        <h3>Preset</h3>
        <div class="presets">${Object.entries(PRESETS).map(([k, p]) => `<button class="mode${st.controls === k ? ' on' : ''}" data-preset="${k}"><b>${p.name}</b><span>${esc(p.desc)}</span></button>`).join('')}</div>
        <h3>Aiming and firing</h3>
        ${row('Click toggles firing', toggle('toggleFire', st.toggleFire), 'Tap once to fire, tap again to stop')}
        ${row('Auto-aim', choice('autoAim', st.autoAim | 0, [[0, 'Off'], [1, 'Light'], [2, 'Strong']]))}
        ${row('Auto-fire at enemies', toggle('autoFire', st.autoFire))}
        ${row('Aim smoothing', slider('sSmooth', st.aimSmooth || 0, 0, 0.9, 0.05))}
        ${row('Big crosshair', toggle('bigCross', st.bigCross))}
        <h3>Keys</h3><p class="muted">Click a key, then press the new one. Esc cancels. F12 always quits.</p>
        <div class="keys">${ACTIONS.map(([a, l]) => `<div class="kl">${esc(l)}</div><button data-rb="${a}" class="kb${rebinding === a ? ' wait' : ''}">${rebinding === a ? 'press a key' : esc((keys[a] || []).map(U.keyName).join(' / ') || 'none')}</button>`).join('')}</div>
        <div class="btns"><button class="b" data-a="defkeys">Reset keys</button></div>`;
    } else if (tab === 'ach' && WTP.ach) WTP.ach.renderTab(body);
    else if (tab === 'skins' && WTP.shop) WTP.shop.renderSkins(body);
    else if (tab === 'crates' && WTP.shop) WTP.shop.renderCrates(body);
    bindMenu(body);
  }
  function bindMenu(p) {
    const st = S().settings;
    p.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'resume') G.pause(false);
      else if (a === 'restart') { G.pause(false); G.restart(); }
      else if (a === 'finish') { G.pause(false); G.end('finish'); }
      else if (a === 'next') { G.pause(false); U.nextLevel(); }
      else if (a === 'quit') G.quit('menu');
      else if (a === 'testsnd') { window.Curio.audioContext?.(); AU.play('boom', 12); AU.play('coin'); }
      else if (a === 'defkeys') { S().keys = JSON.parse(JSON.stringify(WTP.DEFAULT_KEYS)); U.applyPreset(st.controls || 'mouse'); renderMenu(); }
      else if (a === 'defbar') { S().hotbar = WTP.progress.defaultHotbar().slice(); WTP.persist(); U.hudWeapons(G.slots(), WP.st.cur); renderMenu(); }
    }));
    p.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; WTP.persist(); G.pause(false); G.restart(); }));
    p.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => { U.applyPreset(b.dataset.preset); AU.play('select'); renderMenu(); }));
    p.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.ch, v = b.dataset.v;
      st[k] = /^\d+$/.test(v) ? +v : v;
      WTP.persist();
      if (k === 'quality') G.applyQuality?.();
      renderMenu();
    }));
    p.querySelectorAll('[data-tg]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.tg;
      if (k === 'muted') U.toggleMute();
      else { st[k] = !st[k]; WTP.persist(); WTP.merges?.changed?.(k); if (k === 'unlockAll') { U.clearImgCache(); WTP.ach?.changed?.(); } }
      renderMenu();
    }));
    const sl = (id, k) => { const el = p.querySelector('#' + id); if (el) el.addEventListener('input', () => { st[k] = +el.value; el.nextElementSibling.textContent = Math.round(+el.value * 100) + '%'; WTP.persist(); AU.setVolumes?.(); G.applyFx?.(); }); };
    sl('sMaster', 'master'); sl('sSfx', 'sfx'); sl('sShake', 'shake'); sl('sFx', 'fxAmount'); sl('sSmooth', 'aimSmooth');
    p.querySelectorAll('[data-rb]').forEach((b) => b.addEventListener('click', () => {
      rebinding = b.dataset.rb; renderMenu();
      I.capture = (code) => {
        const a = rebinding; rebinding = null;
        if (code !== 'Escape' && code !== 'F12') {
          const keys = S().keys;
          for (const k in keys) keys[k] = (keys[k] || []).filter((c) => c !== code);
          keys[a] = [code, ...(keys[a] || []).filter((c) => c !== code)].slice(0, 2);
          WTP.persist();
        }
        renderMenu();
      };
    }));
    p.querySelectorAll('.btns button, .mode, .tg, .seg button').forEach((b) => b.addEventListener('mouseenter', () => AU.play('tick')));
  }
  U.results = (r) => {
    const o = $('hRes');
    const p = $('hResP');
    const run = r.run;
    p.innerHTML = `<h2>${esc(run.mode.name)}</h2><div class="grade ${run.grade}">${run.grade}</div>
      <div class="res">${r.rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(String(v))}</b>`).join('')}${r.best ? `<span>Best</span><b>${r.best.isNew ? 'NEW ' : ''}${esc(run.mode.fmt ? run.mode.fmt(r.best.best) : fmtInt(r.best.best))}</b>` : ''}${r.shards ? `<span>Shards earned</span><b><i class="shard"></i>${fmtInt(r.shards)}</b>` : ''}</div>
      <div class="btns"><button class="b primary" data-a="again">Again on this desktop</button>${S().settings.nextLevel ? '<button class="b" data-a="next">Next workspace</button>' : ''}<button class="b" data-a="menu">Menu</button><button class="b danger" data-a="quit">Quit</button></div>`;
    o.hidden = false;
    hud.classList.add('overlay');
    p.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'again') { o.hidden = true; G.restart(); }
      else if (a === 'next') { o.hidden = true; U.nextLevel(); }
      else if (a === 'menu') { o.hidden = true; G.restart(); G.pause(true); }
      else G.quit('results');
    }));
  };
  U.showFinish = () => { };
  U.closeOverlays = () => { $('hMenu').hidden = true; $('hRes').hidden = true; $('hWheel').hidden = true; hud.classList.remove('overlay'); };
  let navIdx = 0;
  U.padNav = () => {
    const open = [$('hMenu'), $('hRes')].find((o) => !o.hidden);
    if (!open) return;
    const btns = [...open.querySelectorAll('button')];
    if (!btns.length) return;
    if (I.take('navDown') || I.take('navRight')) navIdx = (navIdx + 1) % btns.length;
    if (I.take('navUp') || I.take('navLeft')) navIdx = (navIdx - 1 + btns.length) % btns.length;
    btns.forEach((b, k) => b.classList.toggle('focus', k === navIdx));
    if (navIdx < btns.length) btns[navIdx].scrollIntoView({ block: 'nearest' });
    if (I.take('navOk')) { const b = btns[navIdx]; b.click(); }
    if (I.take('navBack') || I.take('pause')) { if (!$('hMenu').hidden) G.pause(false); }
  };
  U.padWheel = () => {
    if (!U.wheelOpen() || !I.gp) return;
    const ax = I.gpAxes[2], ay = I.gpAxes[3];
    if (Math.hypot(ax, ay) > 0.6) {
      const n = CATS().length;
      const a = (Math.atan2(ay, ax) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);
      const k = Math.round((a / (Math.PI * 2)) * n) % n;
      if (k !== wheelCat) { wheelCat = k; wheelHover = null; renderWheel(); AU.play('tick'); }
    }
    const list = WP.DEFS.filter((d) => d.cat === CATS()[wheelCat].id);
    let idx = Math.max(0, list.findIndex((d) => d.id === wheelHover));
    if (I.take('next')) { idx = (idx + 1) % list.length; wheelHover = list[idx].id; renderWheel(); }
    if (I.take('prev')) { idx = (idx - 1 + list.length) % list.length; wheelHover = list[idx].id; renderWheel(); }
    if (I.take('navOk') || I.take('jump')) { const id = wheelHover || list[0].id; if (!locked(id)) { G.selectWeapon(id); U.wheel(false); } }
    if (I.take('navBack') || I.take('wheel')) U.wheel(false);
  };
  U.nextLevel = () => {
    if (!S().settings.nextLevel) return;
    WTD.post({ t: 'next-level' });
  };
})();
