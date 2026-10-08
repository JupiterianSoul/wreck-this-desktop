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
      <div class="row" id="hTimeW"><span>time</span><b id="hTime">0:00</b></div>
      <div class="row" id="hScoreW"><span>score</span><b id="hScore">0</b></div>
      <div class="row" id="hWaveW" hidden><span>wave</span><b id="hWave">0</b></div>
      <div class="hp" id="hHp" hidden></div>
    </div>
    <div class="combo" id="hCombo"><div class="n" id="hComboN"></div><div class="m" id="hComboM"></div><div class="t" id="hComboT"></div></div>
    <div class="card hotbar" id="hHot"></div>
    <div class="card wname" id="hName"></div>
    <div class="announce" id="hAnn"></div>
    <div class="wheel" id="hWheel" hidden><div class="ring" id="hRing"></div><div class="hint">move the mouse over a category, click a weapon to pick it, press 1-0 on a weapon to put it on that slot, Tab or Esc to close</div></div>
    <div class="ovl" id="hPause" hidden><div class="card panel" id="hPauseP"></div></div>
    <div class="ovl" id="hRes" hidden><div class="card panel" id="hResP"></div></div>
  `;
  const $ = (id) => document.getElementById(id);
  const imgCache = new Map();
  function wImg(id, sc = 3) {
    const k = id + sc;
    if (imgCache.has(k)) return imgCache.get(k);
    const d = WP.BY[id];
    if (!d || !d.sprite) return '';
    const c = document.createElement('canvas');
    c.width = d.sprite.w * sc; c.height = d.sprite.h * sc;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(d.sprite.cv, 0, 0, c.width, c.height);
    const url = c.toDataURL();
    imgCache.set(k, url);
    return url;
  }
  U.wImg = wImg;
  function gImg(id) {
    const k = 'g:' + id;
    if (imgCache.has(k)) return imgCache.get(k);
    const d = WTP.gadgets.BY[id];
    const c = document.createElement('canvas');
    c.width = d.sprite.w * 3; c.height = d.sprite.h * 3;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(d.sprite.cv, 0, 0, c.width, c.height);
    const url = c.toDataURL(); imgCache.set(k, url); return url;
  }

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

  let idleT = 0;
  U.hudSetup = (run) => {
    const h = run.hud || {};
    $('hStats').style.display = h.minimal ? 'none' : '';
    $('hTimeW').hidden = !h.time;
    $('hScoreW').hidden = !h.score;
    $('hWaveW').hidden = run.modeId !== 'chaos';
    $('hHp').hidden = !h.hp;
    const goal = run.goal || h.goal;
    $('hGoal').hidden = !goal;
    if (goal) $('hGoal').style.left = `${goal}%`;
    U.closeOverlays();
  };
  let lastHp = -1;
  U.hud = (run) => {
    const pct = MD.pct();
    $('hPct').textContent = `${pct.toFixed(1)}%`;
    $('hBar').style.width = `${Math.min(100, pct)}%`;
    const t = run.mode.hud?.countdown ? Math.max(0, (run.limit || 60) - run.t) : run.t;
    $('hTime').textContent = fmtClock(t);
    $('hScore').textContent = fmtInt(run.score);
    $('hWave').textContent = run.wave || 0;
    if (!$('hHp').hidden && lastHp !== WTP.player.hp) {
      lastHp = WTP.player.hp;
      $('hHp').innerHTML = Array.from({ length: WTP.player.maxHp }, (_, k) => `<i class="${k < WTP.player.hp ? '' : 'off'}"></i>`).join('');
    }
    const c = $('hCombo');
    const on = run.combo >= 5 && !run.ended && !run.hud?.minimal;
    c.classList.toggle('on', on);
    if (on) {
      $('hComboN').textContent = `${run.combo} HIT COMBO`;
      $('hComboM').textContent = `x${run.mult}`;
      $('hComboM').classList.toggle('pop', (run.comboPop || 0) > 0.4);
      $('hComboT').style.width = `${Math.round(120 * Math.max(0, run.comboT / 1.6))}px`;
    }
    const P = WTP.player;
    const px = P.x * WTP.world.CP / devicePixelRatio, py = P.y * WTP.world.CP / devicePixelRatio;
    $('hStats').classList.toggle('dim', px > window.innerWidth - 260 && py < 240);
    idleT += 0.1;
    $('hHot').classList.toggle('idle', idleT > 2.5 && !(py > window.innerHeight - 140 && Math.abs(px - window.innerWidth / 2) < 340) ? true : false);
  };
  U.tick = () => { };
  U.hudWeapons = (slots, curId) => {
    idleT = 0;
    const ammo = WP.ammo();
    let html = '';
    for (let i = 0; i < 10; i++) {
      const id = slots[i];
      const num = (i + 1) % 10;
      if (!id) { html += `<button class="slot empty" data-slot="${i}"><span class="k">${num}</span></button>`; continue; }
      const a = ammo ? ammo[id] : null;
      html += `<button class="slot${id === curId ? ' cur' : ''}" data-w="${id}" title="${esc(WP.BY[id].name)}"><span class="k">${num}</span><img alt="" src="${wImg(id)}">${a != null ? `<span class="a">${a}</span>` : ''}</button>`;
    }
    if (curId && !slots.includes(curId)) html += `<button class="slot cur" data-w="${curId}"><span class="k">*</span><img alt="" src="${wImg(curId)}"></button>`;
    const hb = $('hHot');
    hb.innerHTML = html;
    hb.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => { G.selectWeapon(b.dataset.w); focusCanvas(); }));
    hb.querySelectorAll('.empty').forEach((b) => b.addEventListener('click', () => U.wheel(true)));
  };
  const focusCanvas = () => document.getElementById('cv').focus({ preventScroll: true });
  let nameT = 0;
  U.weaponName = (d) => { idleT = 0; const n = $('hName'); n.innerHTML = `<b>${esc(d.name)}</b>  ${esc(d.does || d.tip || '')}`; n.classList.add('on'); clearTimeout(nameT); nameT = setTimeout(() => n.classList.remove('on'), 1800); };
  U.label = (text, ms = 1200) => { const n = $('hName'); n.textContent = text; n.classList.add('on'); clearTimeout(nameT); nameT = setTimeout(() => n.classList.remove('on'), ms); };
  let annT = 0;
  U.announce = (text, tier = 2) => {
    const a = $('hAnn');
    a.textContent = text;
    a.className = `announce on t${tier >= 6 ? 6 : tier >= 3 ? 3 : 1}`;
    clearTimeout(annT);
    annT = setTimeout(() => a.classList.remove('on'), 900 + tier * 120);
  };
  U.toggleMute = () => {
    const st = S().settings;
    st.muted = !st.muted;
    window.Curio.muted = st.muted || WTD.test;
    if (st.muted) AU.stopLoops(); else AU.music(G.run?.mode.music);
    WTP.persist();
    U.label(st.muted ? 'MUTED (M)' : 'SOUND ON (M)', 900);
  };
  window.Curio.muted = !!S().settings.muted || WTD.test || WTD.probe;

  const CATS = () => WP.CATS;
  let wheelCat = 0, wheelHover = null;
  U.wheelOpen = () => !$('hWheel').hidden;
  U.wheel = (open) => {
    const w = $('hWheel');
    if (!open) { w.hidden = true; focusCanvas(); return; }
    if (!G.run || G.run.ended) return;
    I.pointerFire = false;
    w.hidden = false;
    const cur = WP.BY[WP.st.cur];
    wheelCat = Math.max(0, CATS().findIndex((c) => c.id === cur?.cat));
    renderWheel();
    AU.play('select');
  };
  function renderWheel() {
    const ring = $('hRing');
    const cats = CATS();
    const R = 330;
    let html = '';
    cats.forEach((c, k) => {
      const a = -Math.PI / 2 + (k / cats.length) * Math.PI * 2;
      const x = 380 + Math.cos(a) * R, y = 380 + Math.sin(a) * R;
      const first = WP.DEFS.find((d) => d.cat === c.id);
      html += `<div class="cat${k === wheelCat ? ' on' : ''}" data-k="${k}" style="left:${x}px;top:${y}px">${first ? `<img alt="" src="${wImg(first.id, 2)}">` : ''}<span>${esc(c.name)}</span></div>`;
    });
    const list = WP.DEFS.filter((d) => d.cat === cats[wheelCat].id);
    const hov = WP.BY[wheelHover] || WP.BY[WP.st.cur];
    const GD = WTP.gadgets;
    const gcur = GD.curId();
    const gadgets = `<div class="gads">${GD.DEFS.map((g) => `<button class="slot gad${g.id === gcur ? ' cur' : ''}" data-g="${g.id}" title="${esc(g.name)}"><img alt="" src="${gImg(g.id)}"></button>`).join('')}</div>`;
    html += `<div class="center"><div class="nm">${esc(hov ? hov.name : '')}</div><div class="ds">${esc(hov ? hov.does || '' : '')}${hov && hov.altDoes ? `<br>Alt: ${esc(hov.altDoes)}` : ''}</div><div class="items">${list.map((d) => `<button class="slot${d.id === WP.st.cur ? ' cur' : ''}" data-w="${d.id}" title="${esc(d.name)}"><img alt="" src="${wImg(d.id)}"></button>`).join('')}</div><div class="sub">gadget, key ${esc(U.keyName(S().keys.gadget?.[0]))}</div>${gadgets}</div>`;
    ring.innerHTML = html;
    ring.querySelectorAll('[data-g]').forEach((b) => {
      b.addEventListener('mouseenter', () => { const g = WTP.gadgets.BY[b.dataset.g]; ring.querySelector('.center .nm').textContent = g.name; ring.querySelector('.center .ds').textContent = g.tip; });
      b.addEventListener('click', () => { S().gadget = b.dataset.g; WTP.persist(); WTP.gadgets.reset?.(); AU.play('select'); renderWheel(); });
    });
    ring.querySelectorAll('.cat').forEach((el) => el.addEventListener('mouseenter', () => { if (wheelCat !== +el.dataset.k) { wheelCat = +el.dataset.k; wheelHover = null; renderWheel(); AU.play('tick'); } }));
    ring.querySelectorAll('[data-w]').forEach((b) => {
      b.addEventListener('mouseenter', () => { wheelHover = b.dataset.w; const c = ring.querySelector('.center .nm'); const d = WP.BY[wheelHover]; c.textContent = d.name; ring.querySelector('.center .ds').innerHTML = esc(d.does || '') + (d.altDoes ? `<br>Alt: ${esc(d.altDoes)}` : ''); });
      b.addEventListener('click', () => { G.selectWeapon(b.dataset.w); U.wheel(false); });
    });
  }
  window.addEventListener('keydown', (e) => {
    if (U.wheelOpen()) {
      e.preventDefault();
      if (e.code === 'Tab' || e.code === 'Escape') { U.wheel(false); return; }
      if (/^Digit[0-9]$/.test(e.code) && wheelHover) { const n = Number(e.code.slice(5)); G.assignSlot(n === 0 ? 9 : n - 1, wheelHover); U.label(`${WP.BY[wheelHover].name.toUpperCase()} ON SLOT ${n}`, 900); AU.play('select'); return; }
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { wheelCat = (wheelCat + (e.code === 'ArrowRight' ? 1 : -1) + CATS().length) % CATS().length; wheelHover = null; renderWheel(); }
      return;
    }
    if (!$('hPause').hidden && rebinding == null) {
      if (e.code === 'Escape') { e.preventDefault(); G.pause(false); }
    }
  }, true);

  let rebinding = null;
  const ACTIONS = [['left', 'Left'], ['right', 'Right'], ['jump', 'Jump'], ['down', 'Crouch / down'], ['dash', 'Dash'], ['roll', 'Roll'], ['melee', 'Kick'], ['gadget', 'Gadget'], ['pickup', 'Pick up / throw'], ['alt', 'Alt fire'], ['fire', 'Fire'], ['wheel', 'Weapon wheel'], ['reset', 'Restart'], ['mute', 'Mute'], ['fps', 'FPS counter'], ['next_level', 'Next workspace'], ['pause', 'Pause']];
  function setRow(label, html) { return `<label>${label}</label><div>${html}</div>`; }
  function slider(id, v, min = 0, max = 1, step = 0.05) { return `<input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}">`; }
  function toggle(id, on, a = 'On', b = 'Off') { return `<button class="b${on ? ' on' : ''}" data-tg="${id}">${on ? a : b}</button>`; }
  let pauseTab = 'main';
  U.pauseMenu = (on) => {
    const o = $('hPause');
    o.hidden = !on;
    if (!on) { rebinding = null; focusCanvas(); return; }
    renderPause();
  };
  function renderPause() {
    const p = $('hPauseP');
    const st = S().settings;
    const run = G.run;
    if (pauseTab === 'main') {
      p.innerHTML = `<h2>Paused</h2><p>${esc(run.mode.name)}: ${esc(run.mode.desc)}</p>
        <div class="btns"><button class="b" data-a="resume">Resume</button><button class="b" data-a="restart">Restart this desktop</button><button class="b" data-a="finish">Finish and grade</button>${st.nextLevel ? '<button class="b" data-a="next">Next workspace</button>' : ''}</div>
        <div class="btns">${MD.ORDER.map((m) => `<button class="b${run.modeId === m ? ' on' : ''}" data-mode="${m}">${esc(MD.MODES[m].name)}</button>`).join('')}</div>
        ${run.modeId === 'speed' ? `<div class="btns">${[25, 50, 75, 90].map((g) => `<button class="b${(st.speedGoal || 50) === g ? ' on' : ''}" data-goal="${g}">${g}%</button>`).join('')}</div>` : ''}
        <div class="set">${setRow('Master volume', slider('sMaster', st.master))}${setRow('Music', slider('sMusic', st.music))}${setRow('Effects', slider('sSfx', st.sfx))}${setRow('Sound', toggle('muted', !st.muted, 'On', 'Muted'))}</div>
        <div class="btns"><button class="b" data-tab="settings">Settings</button><button class="b" data-tab="keys">Controls</button><button class="b" data-a="quit">Quit to desktop</button></div>`;
    } else if (pauseTab === 'settings') {
      p.innerHTML = `<h2>Settings</h2><div class="set">
        ${setRow('Quality', ['auto', 'high', 'medium', 'low', 'battery'].map((q) => `<button class="b${st.quality === q ? ' on' : ''}" data-q="${q}">${q}</button>`).join(' '))}
        ${setRow('Screen shake', slider('sShake', st.shake, 0, 1.5, 0.1))}
        ${setRow('Kill cam slow-mo', toggle('killcam', st.killcam))}
        ${setRow('Flashes', toggle('flashes', st.flashes))}
        ${setRow('FPS counter (F3)', toggle('fps', st.fps))}
        ${setRow('Next level', toggle('nextLevel', st.nextLevel))}
        ${setRow('Live notifications', toggle('liveNotifs', st.liveNotifs))}
        ${setRow('Leave the wreckage', toggle('wreckage', st.wreckage))}
        ${setRow('Real windows shake', toggle('shakeReal', st.shakeReal))}
        ${setRow('X-ray holes', toggle('xray', st.xray))}
        ${setRow('App gags', toggle('gags', st.gags))}
        </div><div class="btns"><button class="b" data-tab="main">Back</button></div>`;
    } else {
      const keys = S().keys;
      p.innerHTML = `<h2>Controls</h2><p>Click an action, then press the new key. Esc cancels. Mouse: left fire, right alt fire, wheel switch weapon. F12 quits instantly.</p>
        <div class="keys">${ACTIONS.map(([a, l]) => `<div>${esc(l)}</div><button data-rb="${a}" class="${rebinding === a ? 'wait' : ''}">${rebinding === a ? 'press a key' : esc((keys[a] || []).map(U.keyName).join(' / ') || '-')}</button><div></div>`).join('')}</div>
        <div class="btns"><button class="b" data-a="defkeys">Reset to defaults</button><button class="b" data-tab="main">Back</button></div>`;
    }
    bindPause(p);
  }
  function bindPause(p) {
    const st = S().settings;
    p.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'resume') G.pause(false);
      else if (a === 'restart') { G.pause(false); G.restart(); }
      else if (a === 'finish') { G.pause(false); G.end('finish'); }
      else if (a === 'next') { G.pause(false); U.nextLevel(); }
      else if (a === 'quit') G.quit('menu');
      else if (a === 'defkeys') { S().keys = JSON.parse(JSON.stringify(WTP.DEFAULT_KEYS)); WTP.persist(); renderPause(); }
    }));
    p.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { pauseTab = b.dataset.tab; rebinding = null; renderPause(); }));
    p.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => { st.mode = b.dataset.mode; WTP.persist(); G.pause(false); G.restart(); }));
    p.querySelectorAll('[data-goal]').forEach((b) => b.addEventListener('click', () => { st.speedGoal = +b.dataset.goal; WTP.persist(); G.pause(false); G.restart(); }));
    p.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => { st.quality = b.dataset.q; WTP.persist(); G.start(G.opts); }));
    p.querySelectorAll('[data-tg]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.tg;
      if (k === 'muted') { U.toggleMute(); } else { st[k] = !st[k]; WTP.persist(); WTP.merges?.changed?.(k); }
      renderPause();
    }));
    const sl = (id, k) => { const el = p.querySelector('#' + id); if (el) el.addEventListener('input', () => { st[k] = +el.value; WTP.persist(); AU.setVolumes?.(); }); };
    sl('sMaster', 'master'); sl('sMusic', 'music'); sl('sSfx', 'sfx'); sl('sShake', 'shake');
    p.querySelectorAll('[data-rb]').forEach((b) => b.addEventListener('click', () => {
      rebinding = b.dataset.rb; renderPause();
      I.capture = (code) => {
        const a = rebinding; rebinding = null;
        if (code !== 'Escape' && code !== 'F12') {
          const keys = S().keys;
          for (const k in keys) keys[k] = keys[k].filter((c) => c !== code);
          keys[a] = [code, ...(keys[a] || []).filter((c) => c !== code)].slice(0, 2);
          WTP.persist();
        }
        renderPause();
      };
    }));
  }
  U.results = (r) => {
    const o = $('hRes');
    const p = $('hResP');
    const run = r.run;
    p.innerHTML = `<h2>${esc(run.mode.name)}</h2><div class="grade ${run.grade}">${run.grade}</div>
      <div class="res">${r.rows.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(String(v))}</b>`).join('')}${r.best ? `<span>Best</span><b>${r.best.isNew ? 'NEW ' : ''}${esc(run.mode.fmt ? run.mode.fmt(r.best.best) : fmtInt(r.best.best))}</b>` : ''}</div>
      <div class="btns"><button class="b" data-a="again">Again on this desktop</button>${S().settings.nextLevel ? '<button class="b" data-a="next">Next workspace</button>' : ''}<button class="b" data-a="quit">Quit</button></div>`;
    o.hidden = false;
    p.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'again') { o.hidden = true; G.restart(); }
      else if (a === 'next') { o.hidden = true; U.nextLevel(); }
      else G.quit('results');
    }));
  };
  U.showFinish = () => { };
  U.closeOverlays = () => { $('hPause').hidden = true; $('hRes').hidden = true; $('hWheel').hidden = true; };
  U.padNav = () => {
    if (I.take('pause')) G.pause(false);
  };
  U.nextLevel = () => {
    if (!S().settings.nextLevel) return;
    WTD.post({ t: 'next-level' });
  };
})();
