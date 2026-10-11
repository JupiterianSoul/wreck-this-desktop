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
      <div class="ua-tag" id="hUA" hidden title="Achievements and unlocks are paused">UNLOCK ALL</div>
      <div class="row"><span>wrecked</span><b id="hPct">0%</b></div>
      <div class="bar"><i id="hBar"></i><em id="hGoal" hidden></em></div>
      <div class="row" id="hTimeW"><span id="hTimeL">time</span><b id="hTime">0:00</b></div>
      <div class="row" id="hScoreW"><span>score</span><b id="hScore">0</b></div>
      <div class="row" id="hWaveW" hidden><span>wave</span><b id="hWave">0</b></div>
      <div class="row" id="hLeftW" hidden><span>enemies left</span><b id="hLeft">0</b></div>
      <div class="row"><span>life</span><div class="hp" id="hHp"></div></div>
      <div class="row" id="hAmmoW" hidden><span>ammo</span><b id="hAmmo">0</b></div>
      <div class="row gcard" id="hGad"><span>gadgets</span><div class="gslots"><i class="gs" id="hGadM"><img alt=""><b></b></i><i class="gs" id="hGadT"><img alt=""><b></b><em></em></i></div></div>
      <div class="row shards" id="hShardsW" hidden><span>shards</span><b><i class="shard"></i><em id="hShards">0</em></b></div>
    </div>
    <div class="combo" id="hCombo"><div class="n" id="hComboN"></div><div class="m" id="hComboM"></div><div class="t" id="hComboT"></div></div>
    <div class="root-badge" id="hRoot" hidden><b>ROOT</b><span id="hRootT">8.0</span><i id="hRootB"></i></div>
    <div class="fire-badge" id="hFire" hidden><i></i>FIRING <span>click or V to stop</span></div>
    <div class="card hotbar" id="hHot"></div>
    <div class="card wname" id="hName"></div>
    <div class="announce" id="hAnn"></div>
    <div class="toasts" id="hToasts"></div>
    <div class="wheel" id="hWheel" hidden>
      <div class="wbox">
        <div class="card wcats" id="hCats"></div>
        <div class="card wpanel"><div class="wtitle" id="hWTitle"></div><div class="wgrid" id="hGrid"></div><div class="wgads" id="hGads"></div></div>
        <div class="card winfo" id="hWInfo"></div>
      </div>
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
  const PAD_NAMES = ['Pad A', 'Pad B', 'Pad X', 'Pad Y', 'Pad LB', 'Pad RB', 'Pad LT', 'Pad RT', 'Pad Back', 'Pad Start', 'Pad LS', 'Pad RS', 'Pad Up', 'Pad Down', 'Pad Left', 'Pad Right', 'Pad Home'];
  const MOUSE_NAMES = ['Left click', 'Middle click', 'Right click', 'Mouse back', 'Mouse fwd'];
  U.keyName = (code) => {
    if (!code) return '';
    if (/^Mouse\d$/.test(code)) return MOUSE_NAMES[+code.slice(5)] || code;
    if (code === 'WheelUp') return 'Wheel up';
    if (code === 'WheelDown') return 'Wheel down';
    if (WTP.isPad(code)) return PAD_NAMES[+code.slice(3)] || code;
    if (code === 'BracketLeft') return '[';
    if (code === 'BracketRight') return ']';
    if (code.startsWith('key:')) return code.slice(4).toUpperCase();
    const fr = String(WTD.session?.layout || '').startsWith('fr');
    if (fr && LAYOUT_FR[code]) return LAYOUT_FR[code];
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return ({ ShiftLeft: 'Shift', ShiftRight: 'Shift R', ControlLeft: 'Ctrl', ControlRight: 'Ctrl R', Space: 'Space', Escape: 'Esc', ArrowLeft: 'Left', ArrowRight: 'Right', ArrowUp: 'Up', ArrowDown: 'Down', Enter: 'Enter', Tab: 'Tab', AltLeft: 'Alt' })[code] || code;
  };
  const focusCanvas = () => document.getElementById('cv').focus({ preventScroll: true });

  let lastHp = '';
  U.hudSetup = (run) => {
    const h = run.hud || {};
    $('hStats').style.display = h.minimal ? 'none' : '';
    $('hTimeW').hidden = !h.time;
    $('hTimeL').textContent = h.countdown ? 'time left' : 'time';
    $('hScoreW').hidden = !h.score;
    $('hWaveW').hidden = !run.mode.waves;
    $('hLeftW').hidden = !run.mode.waves;
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
    const cd = !!run.hud?.countdown;
    const t = cd ? Math.max(0, (run.limit || 60) - run.t) : run.t;
    $('hTimeL').textContent = cd ? 'time left' : 'time';
    $('hTime').textContent = fmtClock(t);
    $('hTime').classList.toggle('warn', cd && t <= 10);
    $('hScore').textContent = fmtInt(run.score);
    $('hWave').textContent = run.wave || 0;
    if (run.mode.waves) { const n = MD.enemiesLeft(run); $('hLeft').textContent = n; $('hLeft').classList.toggle('warn', n > 0 && n <= 3); }
    const P = WTP.player;
    const key = run.mode.noDamage ? 'inv' : `${P.hp}/${P.maxHp}`;
    if (key !== lastHp) {
      lastHp = key;
      $('hHp').innerHTML = run.mode.noDamage ? '<b class="inv">invulnerable</b>' : Array.from({ length: P.maxHp }, (_, k) => `<i class="heart${k < P.hp ? '' : ' off'}"></i>`).join('');
    }
    const ammo = WP.ammo();
    if (ammo) { const a = ammo[WP.st.cur]; $('hAmmo').textContent = a == null ? '-' : a; $('hAmmo').classList.toggle('warn', a != null && a <= 3); }
    $('hUA').hidden = !S().settings.unlockAll || !WTP.ach;
    hudGadgets();
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
    const ru = WP.root?.() || 0;
    $('hRoot').hidden = !(ru > 0) || G.paused;
    if (ru > 0) { $('hRootT').textContent = `${ru.toFixed(1)}s`; $('hRootB').style.width = `${Math.round((ru / 8) * 100)}%`; $('hRoot').classList.toggle('low', ru < 2); }
    $('hFire').hidden = !(I.firing() && (S().settings.toggleFire || I.fireLock)) || G.paused;
    const px = P.x * WTP.world.CP / devicePixelRatio, py = P.y * WTP.world.CP / devicePixelRatio;
    $('hStats').classList.toggle('dim', px > window.innerWidth - 280 && py < 280);
  };
  U.tick = () => { };
  // Gadget card: movement slot (with jetpack fuel) and tool slot (cooldown, charges, or off outside wave modes)
  function hudGadgets() {
    const GD = WTP.gadgets, h = GD.hudInfo();
    const set = (el, id, k, cls, title) => {
      const img = el.querySelector('img');
      if (el.dataset.g !== id) { el.dataset.g = id; img.src = gImg(id); }
      el.title = title;
      el.querySelector('b').style.width = k == null ? '0' : `${Math.round(Math.max(0, Math.min(1, k)) * 100)}%`;
      el.className = `gs ${cls}`;
    };
    set($('hGadM'), h.move.id, h.move.k, h.move.k != null && h.move.k < 0.25 ? 'low' : '', h.move.name);
    const t = h.tool;
    set($('hGadT'), t.id, t.active ?? (t.ready && t.charges == null ? null : t.k), t.off ? 'off' : t.active ? 'on' : t.ready ? 'ready' : 'cd', `${t.name} (${U.keyName(S().keys.gadget?.[0])})`);
    $('hGadT').querySelector('em').textContent = t.charges != null ? t.charges : '';
  }

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
  // The hotbar is display only during play: hidden, flashed for a moment when the weapon changes. Editing lives in the wheel.
  const HOT_SHOW_MS = 1200;
  let hotCur = null, hotT = 0;
  U.flashHotbar = () => { const hb = $('hHot'); hb.classList.add('show'); clearTimeout(hotT); hotT = setTimeout(() => hb.classList.remove('show'), HOT_SHOW_MS); };
  U.hudWeapons = (slots, curId) => {
    if (curId !== hotCur) { if (hotCur !== null) U.flashHotbar(); hotCur = curId; }
    let html = '';
    for (let i = 0; i < 10; i++) html += slotHtml(slots[i], i, curId);
    if (curId && !slots.includes(curId)) html += `<div class="slot cur extra"><span class="k">*</span><img alt="" src="${wImg(curId)}"></div>`;
    const hb = $('hHot');
    if (hb.__h !== html) { hb.__h = html; hb.innerHTML = html; }
    if (U.wheelOpen()) renderWheelBar();
  };
  let nameT = 0;
  U.weaponName = (d) => { const n = $('hName'); n.innerHTML = `<b>${esc(d.name)}</b><span>${esc(d.does || d.tip || '')}</span>`; n.classList.add('on'); clearTimeout(nameT); nameT = setTimeout(() => n.classList.remove('on'), 2000); };
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
  let wheelCat = 0, wheelHover = null, wheelSlot = null, shownCat = -1;
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
    shownCat = -1;
    renderWheel();
    AU.play('select');
  };
  const secretName = (d) => (locked(d.id) && WTP.ach.goalFor(d.id)?.secret ? '???' : d.name);
  function infoHtml(d) {
    if (!d) return '';
    const cat = CATS().find((c) => c.id === d.cat);
    if (locked(d.id)) {
      const a = WTP.ach.goalFor(d.id);
      return `<div class="wi-name">${esc(secretName(d))}</div><div class="wi-cat">${esc(cat ? cat.name : '')}, locked</div><div class="wi-body"><div class="wi-lock"><i class="lock"></i><span>${a ? esc(a.secret ? `Secret: ${a.hint || 'keep playing to find out'}` : a.desc) : 'Locked'}</span></div></div><div></div>`;
    }
    return `<div class="wi-name">${esc(d.name)}</div><div class="wi-cat">${esc(cat ? cat.name : '')}</div>
      <div class="wi-body"><div class="wi-row"><b>Fire</b><span>${esc(d.does || d.tip || '')}</span></div>
      ${d.altDoes ? `<div class="wi-row"><b>Alt</b><span>${esc(d.altDoes)}</span></div>` : ''}
      ${d.tip && d.does ? `<div class="wi-tip">${esc(d.tip)}</div>` : ''}</div>
      ${statsHtml(d)}`;
  }
  function catInfoHtml(k) {
    const c = CATS()[k];
    const list = WP.DEFS.filter((d) => d.cat === c.id);
    const own = list.filter((d) => !locked(d.id));
    return `<div class="wi-name">${esc(c.name)}</div><div class="wi-cat">${own.length} of ${list.length} unlocked</div>
      <div class="wi-body"><div class="wi-list">${esc(list.map(secretName).join(', '))}</div></div>
      <div class="wi-tip">Hover a weapon for details. Click to equip, right click to add it to the hotbar.</div>`;
  }
  const STAT_NAMES = ['Power', 'Fire rate', 'Range', 'Chaos'];
  function statsHtml(d) {
    if (!Array.isArray(d.st)) return '<div></div>';
    return `<div class="wi-stats">${STAT_NAMES.map((n, i) => { const v = Math.max(0, Math.min(5, d.st[i] | 0)); return `<div class="wi-stat"><span>${n}</span><i>${'<em class="on"></em>'.repeat(v)}${'<em></em>'.repeat(5 - v)}</i></div>`; }).join('')}</div>`;
  }
  function setInfo(html) { const el = $('hWInfo'); if (el.__h !== html) { el.__h = html; el.innerHTML = html; } }
  function renderWheel() {
    const cats = CATS();
    const box = $('hCats');
    if (box.childElementCount !== cats.length) {
      box.innerHTML = cats.map((c, k) => {
        const first = WP.DEFS.find((d) => d.cat === c.id && !locked(d.id)) || WP.DEFS.find((d) => d.cat === c.id);
        const total = WP.DEFS.filter((d) => d.cat === c.id).length, own = WP.DEFS.filter((d) => d.cat === c.id && !locked(d.id)).length;
        return `<div class="wcat" data-k="${k}">${first ? `<img alt="" src="${wImg(first.id, 2, locked(first.id))}">` : '<i></i>'}<span>${esc(c.name)}</span><em>${own}/${total}</em></div>`;
      }).join('');
    }
    box.querySelectorAll('.wcat').forEach((el) => el.classList.toggle('on', +el.dataset.k === wheelCat));
    if (shownCat !== wheelCat) {
      shownCat = wheelCat;
      const list = WP.DEFS.filter((d) => d.cat === cats[wheelCat].id);
      $('hWTitle').innerHTML = `<span>${esc(cats[wheelCat].name)}</span><small>${list.length} weapons</small>`;
      $('hGrid').innerHTML = list.map((d) => { const lk = locked(d.id); return `<button class="witem${lk ? ' locked' : ''}" data-w="${d.id}" draggable="${lk ? 'false' : 'true'}"><img alt="" src="${wImg(d.id, 3, lk)}"><span>${esc(secretName(d))}</span></button>`; }).join('');
    }
    $('hGrid').querySelectorAll('[data-w]').forEach((b) => { b.classList.toggle('cur', b.dataset.w === WP.st.cur); b.classList.toggle('hov', b.dataset.w === wheelHover); });
    const GD = WTP.gadgets, mv = GD.moveId(), tl = GD.toolId();
    const gbtn = (g, on) => `<button class="slot gad${on ? ' cur' : ''}${g.waves && !G.run?.mode?.waves ? ' off' : ''}" data-g="${g.id}" title="${esc(g.name)}"><img alt="" src="${gImg(g.id)}"></button>`;
    $('hGads').innerHTML = `<small>move</small>${GD.MOVES.map((id) => gbtn(GD.BY[id], id === mv)).join('')}<small class="gsep">tool (${esc(U.keyName(S().keys.gadget?.[0]))}, ${esc(U.keyName(S().keys.gadgetCycle?.[0]))} cycles)</small>${GD.TOOLS.map((id) => gbtn(GD.BY[id], id === tl)).join('')}`;
    setInfo(wheelHover ? infoHtml(WP.BY[wheelHover]) : (WP.BY[WP.st.cur]?.cat === cats[wheelCat].id ? infoHtml(WP.BY[WP.st.cur]) : catInfoHtml(wheelCat)));
    renderWheelBar();
  }
  function pickWeapon(id) {
    if (locked(id)) { AU.play('deny'); return; }
    if (wheelSlot != null) { G.assignSlot(wheelSlot, id); U.label(`${WP.BY[id].name.toUpperCase()} ON SLOT ${(wheelSlot + 1) % 10}`, 900); AU.play('select'); G.selectWeapon(id, true); U.wheel(false); return; }
    G.selectWeapon(id); U.wheel(false);
  }
  (() => {
    const cats = $('hCats'), grid = $('hGrid'), gads = $('hGads');
    cats.addEventListener('mouseover', (e) => { const el = e.target.closest('.wcat'); if (!el) return; const k = +el.dataset.k; if (k !== wheelCat) { wheelCat = k; wheelHover = null; renderWheel(); AU.play('tick'); } });
    cats.addEventListener('click', (e) => { const el = e.target.closest('.wcat'); if (el) { wheelCat = +el.dataset.k; renderWheel(); } });
    grid.addEventListener('mouseover', (e) => { const b = e.target.closest('[data-w]'); if (!b || b.dataset.w === wheelHover) return; wheelHover = b.dataset.w; grid.querySelectorAll('[data-w]').forEach((x) => x.classList.toggle('hov', x === b)); setInfo(infoHtml(WP.BY[wheelHover])); AU.play('hover'); });
    grid.addEventListener('dragstart', (e) => { const b = e.target.closest('[data-w]'); if (b) e.dataTransfer.setData('text/weapon', b.dataset.w); });
    grid.addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (b) pickWeapon(b.dataset.w); });
    grid.addEventListener('contextmenu', (e) => { const b = e.target.closest('[data-w]'); if (!b) return; e.preventDefault(); const id = b.dataset.w; if (locked(id)) return; const hb = S().hotbar; const free = hb.findIndex((x) => !x); G.assignSlot(free >= 0 ? free : 9, id); AU.play('select'); renderWheelBar(); });
    gads.addEventListener('mouseover', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; const g = WTP.gadgets.BY[b.dataset.g]; setInfo(`<div class="wi-name">${esc(g.name)}</div><div class="wi-cat">${g.slot === 'move' ? 'movement gadget, on the movement keys' : 'tool gadget, on the gadget key'}</div><div class="wi-body"><div class="wi-row"><b>Use</b><span>${esc(g.tip)}</span></div>${g.cd ? `<div class="wi-tip">Cooldown ${g.cd} s</div>` : ''}</div><div></div>`); });
    gads.addEventListener('click', (e) => { const b = e.target.closest('[data-g]'); if (!b) return; WTP.gadgets.equip(b.dataset.g); AU.play('select'); renderWheel(); });
  })();
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
      const slotA = I.actionsFor(e.code).find((a) => /^slot\d+$/.test(a));
      if (slotA && wheelHover && !locked(wheelHover)) { const n = +slotA.slice(4); G.assignSlot(n - 1, wheelHover); U.label(`${WP.BY[wheelHover].name.toUpperCase()} ON SLOT ${n % 10}`, 900); AU.play('select'); renderWheelBar(); return; }
      if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.code)) { wheelCat = (wheelCat + (e.code === 'ArrowRight' || e.code === 'ArrowDown' ? 1 : -1) + CATS().length) % CATS().length; wheelHover = null; renderWheel(); AU.play('tick'); }
      return;
    }
    if (!$('hMenu').hidden && rebinding == null) {
      e.stopImmediatePropagation();
      if (e.code === 'Escape') { e.preventDefault(); if (WTP.crates?.isOpen?.()) WTP.crates.close(); else G.pause(false); }
      return;
    }
    if (!$('hRes').hidden) {
      e.stopImmediatePropagation();
      const bs = [...$('hResP').querySelectorAll('button')];
      if (e.code === 'Enter') { e.preventDefault(); (bs.find((b) => b.classList.contains('focus')) || bs[0])?.click(); }
      else if (/^Arrow/.test(e.code) || e.code === 'Tab') { e.preventDefault(); navIdx = (navIdx + (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.shiftKey ? -1 : 1) + bs.length) % bs.length; bs.forEach((b, k) => b.classList.toggle('focus', k === navIdx)); }
    }
  }, true);

  let rebinding = null;
  const ACTIONS = [['left', 'Move left'], ['right', 'Move right'], ['jump', 'Jump'], ['down', 'Crouch / drop'], ['dash', 'Dash'], ['roll', 'Roll'], ['melee', 'Kick'], ['gadget', 'Tool gadget'], ['gadgetCycle', 'Cycle tool gadget'], ['pickup', 'Pick up / throw'], ['fire', 'Fire (hold)'], ['firelock', 'Fire on / off'], ['alt', 'Alt fire'], ['aimUp', 'Aim up'], ['aimDown', 'Aim down'], ['aimLeft', 'Aim left'], ['aimRight', 'Aim right'], ['wheel', 'Weapon wheel'], ['reset', 'Restart'], ['mute', 'Sound on / off'], ['fps', 'FPS counter'], ['next_level', 'Next workspace'], ['lastWeapon', 'Last weapon'], ['prev', 'Previous weapon'], ['next', 'Next weapon'], ['pause', 'Pause / menu'],
    ...Array.from({ length: 10 }, (_, k) => [`slot${k + 1}`, `Hotbar slot ${(k + 1) % 10}`])];
  const ACT_NAME = Object.fromEntries(ACTIONS);
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
    const keepPad = (a) => (keys[a] || []).filter((c) => WTP.isPad(c) || /^Mouse/.test(c));
    if (name === 'keyboard') { keys.aimUp = ['ArrowUp']; keys.aimDown = ['ArrowDown']; keys.aimLeft = ['ArrowLeft']; keys.aimRight = ['ArrowRight']; keys.fire = [...new Set(['KeyK', 'Enter', ...keepPad('fire')])]; keys.alt = [...new Set(['KeyL', 'KeyG', ...keepPad('alt')])]; }
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
    if (!on) { rebinding = null; WTP.crates?.close?.(); focusCanvas(); return; }
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
        ${WTP.extras?.dailyHtml?.() || ''}
        <div class="btns"><button class="b primary" data-a="resume">Resume</button><button class="b" data-a="restart">Restart this desktop</button><button class="b" data-a="finish">Finish and grade</button>${st.nextLevel && !WTD.portable ? '<button class="b" data-a="next">Next workspace</button>' : ''}<button class="b danger" data-a="quit">Quit to desktop</button></div>
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
        <h3>${WTD.portable ? 'Desktop' : 'Desktop merges'}</h3>
        ${WTD.portable ? '' : `${row('Next workspace', toggle('nextLevel', st.nextLevel), 'Jump to your next workspace and wreck it too')}
        ${row('Live notifications', toggle('liveNotifs', st.liveNotifs), 'Real notifications become enemies')}
        ${row('Leave the wreckage', toggle('wreckage', st.wreckage), 'Keeps the wrecked screen as wallpaper until SUPER SHIFT ALT + K')}
        ${row('Real windows shake', toggle('shakeReal', st.shakeReal), 'Big blasts nudge real floating windows, put back on exit')}
        ${row('X-ray holes', toggle('xray', st.xray), 'Holes show your live desktop')}`}
        ${row('App gags', toggle('gags', st.gags))}
        ${WTP.ach ? `<details class="adv"${advOpen ? ' open' : ''}><summary>Advanced</summary>${row('Unlock every weapon', toggle('unlockAll', st.unlockAll), 'Achievements pause while it is on. Turning it off puts your real unlocks and hotbar back')}${row('Reset progress', resetHtml(), 'Wipes achievements, weapon unlocks, Shards, skins, crates, the hotbar and best scores. Settings and keys stay')}</details>` : ''}`;
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
        <h3>Keys</h3><p class="muted">Press + then a key, mouse button, wheel or gamepad button. One input can do several things. Esc cancels, F12 always quits.</p>
        <div class="keys">${ACTIONS.map(([a]) => keyRow(a, keys)).join('')}</div>
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
      else if (k === 'unlockAll') { WTP.ach.setUnlockAll(!st.unlockAll); WTP.ach.changed(); }
      else { st[k] = !st[k]; WTP.persist(); WTP.merges?.changed?.(k); }
      renderMenu();
    }));
    const sl = (id, k) => { const el = p.querySelector('#' + id); if (el) el.addEventListener('input', () => { st[k] = +el.value; el.nextElementSibling.textContent = Math.round(+el.value * 100) + '%'; WTP.persist(); AU.setVolumes?.(); G.applyFx?.(); }); };
    sl('sMaster', 'master'); sl('sSfx', 'sfx'); sl('sShake', 'shake'); sl('sFx', 'fxAmount'); sl('sSmooth', 'aimSmooth');
    p.querySelectorAll('[data-rb]').forEach((b) => b.addEventListener('click', () => {
      rebinding = b.dataset.rb; renderMenu();
      I.capture = (code) => { const a = rebinding; rebinding = null; if (code !== 'Escape' && code !== 'F12') U.bindKey(a, code); renderMenu(); };
    }));
    p.querySelectorAll('[data-unbind]').forEach((b) => b.addEventListener('click', () => { U.unbindKey(b.dataset.unbind, b.dataset.code); AU.play('tick'); renderMenu(); }));
    const adv = p.querySelector('details.adv');
    if (adv) adv.addEventListener('toggle', () => { advOpen = adv.open; });
    bindReset(p);
    p.querySelectorAll('.btns button, .mode, .tg, .seg button').forEach((b) => b.addEventListener('mouseenter', () => AU.play('tick')));
  }
  // Reset progress asks twice: a first click arms it, then a button that has to be held down
  let advOpen = false, resetArmed = false;
  const HOLD_MS = 1500;
  const resetHtml = () => resetArmed
    ? `<div class="reset-arm"><button class="b danger hold" data-reset="hold"><i></i><span>Hold to wipe everything</span></button><button class="b" data-reset="cancel">Cancel</button></div>`
    : '<button class="b danger" data-reset="arm">Reset progress</button>';
  function bindReset(p) {
    const arm = p.querySelector('[data-reset="arm"]'), cancel = p.querySelector('[data-reset="cancel"]'), hold = p.querySelector('[data-reset="hold"]');
    if (arm) arm.addEventListener('click', () => { resetArmed = true; AU.play('deny'); renderMenu(); });
    if (cancel) cancel.addEventListener('click', () => { resetArmed = false; renderMenu(); });
    if (!hold) return;
    let t0 = 0, raf = 0;
    const fill = hold.querySelector('i');
    const stop = () => { cancelAnimationFrame(raf); t0 = 0; fill.style.width = '0'; };
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / HOLD_MS);
      fill.style.width = `${Math.round(k * 100)}%`;
      if (k >= 1) { stop(); resetArmed = false; U.resetProgress(); return; }
      raf = requestAnimationFrame(tick);
    };
    hold.addEventListener('pointerdown', (e) => { e.preventDefault(); t0 = performance.now(); raf = requestAnimationFrame(tick); });
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) hold.addEventListener(ev, stop);
  }
  U.resetProgress = () => {
    WTP.resetProgress();
    WTP.save.hotbar = WTP.progress.defaultHotbar().slice();
    WTP.persist(true);
    U.clearImgCache();
    G.restart();
    G.pause(true);
    U.openTab('settings');
    U.toast({ kind: 'ach', title: 'Progress reset', text: 'A fresh start. Settings and keys were kept.' });
  };
  // Several keys per action (up to MAX_KEYS keyboard and mouse inputs, gamepad buttons on top); a key may be shared
  const countsToCap = (c) => !WTP.isPad(c);
  U.bindKey = (a, code) => {
    const keys = S().keys, list = keys[a] || (keys[a] = []);
    if (list.includes(code)) return false;
    if (countsToCap(code) && list.filter(countsToCap).length >= WTP.MAX_KEYS) { U.label(`UP TO ${WTP.MAX_KEYS} KEYS PER ACTION, REMOVE ONE FIRST`, 1600); AU.play('deny'); return false; }
    list.push(code);
    WTP.persist();
    return true;
  };
  U.unbindKey = (a, code) => { const keys = S().keys; keys[a] = (keys[a] || []).filter((c) => c !== code); WTP.persist(); };
  function keyRow(a, keys) {
    const list = keys[a] || [];
    const also = [...new Set(list.flatMap((c) => I.actionsFor(c)).filter((o) => o !== a && ACT_NAME[o]))].map((o) => ACT_NAME[o]);
    const chips = list.map((c) => `<span class="kchip">${esc(U.keyName(c))}<button data-unbind="${a}" data-code="${esc(c)}" title="Remove">×</button></span>`).join('');
    const add = `<button class="kadd${rebinding === a ? ' wait' : ''}" data-rb="${a}" title="Add a key">${rebinding === a ? 'press…' : '+'}</button>`;
    return `<div class="kl">${esc(ACT_NAME[a])}${also.length ? `<small>also: ${esc(also.join(', '))}</small>` : ''}</div><div class="kbs">${chips || '<span class="knone">none</span>'}${add}</div>`;
  }
  U.results = (r) => {
    const o = $('hRes');
    const p = $('hResP');
    const run = r.run;
    p.className = 'card mwin res-win';
    navIdx = 0;
    p.innerHTML = `<h2>${esc(run.mode.name)}</h2><div class="grade ${run.grade}">${run.grade}</div>
      <div class="res">${r.rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(String(v))}</b>`).join('')}${r.best ? `<span>Best</span><b>${r.best.isNew ? 'NEW ' : ''}${esc(run.mode.fmt ? run.mode.fmt(r.best.best) : fmtInt(r.best.best))}</b>` : ''}${r.shards ? `<span>Shards earned</span><b><i class="shard"></i>${fmtInt(r.shards)}</b>` : ''}</div>
      <div class="btns"><button class="b primary" data-a="again">Again on this desktop</button>${S().settings.nextLevel && !WTD.portable ? '<button class="b" data-a="next">Next workspace</button>' : ''}<button class="b" data-a="menu">Menu</button><button class="b danger" data-a="quit">Quit</button></div>`;
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
  // Win screen: its own layout, Continue first and focused so the run can go on where it stopped
  const WIN_TITLES = { boss: ['YOU WIN', 'The wave 5 boss is down. The desktop is yours.'], clear: ['DESKTOP DESTROYED', 'Not a single pixel left standing.'] };
  U.winScreen = (r) => {
    const o = $('hRes'), p = $('hResP');
    const run = r.run;
    const [title, sub] = WIN_TITLES[run.winKind] || WIN_TITLES.clear;
    const cont = run.mode.waves ? 'Continue (endless)' : 'Continue breaking';
    const shards = run.shardsEarned;
    p.className = 'card mwin res-win win-win';
    p.innerHTML = `<div class="win-mode">${esc(run.mode.name)}</div><h1 class="win-title">${esc(title)}</h1><p class="win-sub">${esc(sub)}</p>
      <div class="res">${r.rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(String(v))}</b>`).join('')}${r.best ? `<span>Best</span><b>${r.best.isNew ? 'NEW ' : ''}${esc(run.mode.fmt ? run.mode.fmt(r.best.best) : fmtInt(r.best.best))}</b>` : ''}${shards ? `<span>Shards earned</span><b><i class="shard"></i>${fmtInt(shards)}</b>` : ''}</div>
      <div class="btns win-btns"><button class="b primary focus" data-a="continue">${cont}</button><button class="b" data-a="again">Restart</button><button class="b" data-a="menu">Menu</button></div>`;
    o.hidden = false;
    hud.classList.add('overlay');
    navIdx = 0;
    p.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      o.hidden = true; p.className = 'card mwin res-win';
      if (a === 'continue') { hud.classList.remove('overlay'); G.continueRun(); }
      else if (a === 'again') G.restart();
      else { G.restart(); G.pause(true); }
    }));
    p.querySelector('[data-a="continue"]').focus({ preventScroll: true });
  };
  U.closeOverlays = () => { $('hResP').className = 'card mwin res-win'; $('hMenu').hidden = true; $('hRes').hidden = true; $('hWheel').hidden = true; hud.classList.remove('overlay'); };
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
    if (!S().settings.nextLevel || WTD.portable) return;
    WTD.post({ t: 'next-level' });
  };
})();
