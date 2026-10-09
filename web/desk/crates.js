(() => {
  const WTP = window.WTP;
  const AU = WTP.audio, WP = WTP.weapons, G = WTP.game;
  const S = () => WTP.shop;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ---- Crate art: a lid, a body with a category emblem and rarity trim, and two latches, all hand pixelled ----
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mixc = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const LID = [
    '..OOOOOOOOOOOOOOOOOOOO..',
    '.OHHHHHHHHHHHHHHHHHHHHO.',
    '.OHLLLLLLLLLLLLLLLLLLSO.',
    '.OLLLLLLLLLLLLLLLLLLLSO.',
    '.OTTTTTTTTTTTTTTTTTTTTO.',
    '.OSSSSSSSSSSSSSSSSSSSSO.',
    '.OOOOOOOOOOOOOOOOOOOOOO.'
  ];
  const BODY = [
    '.OHFFFFFFFFFFFFFFFFFFSO.',
    '.OHKFFFFFFFFFFFFFFFFKSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHFFFFFDDDDDDDDDFFFFSO.',
    '.OHKFFFFFFFFFFFFFFFFKSO.',
    '.OTTTTTTTTTTTTTTTTTTTTO.',
    '.OSSSSSSSSSSSSSSSSSSSSO.',
    '..OOOOOOOOOOOOOOOOOOOO..'
  ];
  const LATCH = ['OOOO', 'OKKO', 'OKWO', 'OKKO', 'OOOO'];
  const EMBLEM = {
    costume: ['.W...W.', 'WWW.WWW', 'WWWWWWW', '.WWAWW.', '.WWAWW.', '.WWWWW.', '.WWWWW.'],
    hat: ['..WWW..', '..WWW..', '..WWW..', '..AAA..', '..WWW..', 'WWWWWWW', '.......'],
    face: ['.......', 'WWW.WWW', 'WAW.WAW', 'WWWWWWW', 'W.....W', '.......', '.......'],
    trail: ['...A...', '...A...', '.AAWAA.', 'AAWWWAA', '.AAWAA.', '...A...', '...A...'],
    colour: ['...A...', '..AAA..', '.AAAAA.', 'AWWAAAA', 'AWAAAAA', '.AAAAA.', '..AAA..'],
    gun: ['.......', 'WWWWWW.', 'WWWWWWA', '..WW...', '..W....', '.WW....', '.......'],
    window: ['WWWWWWW', 'WAAAA.W', 'W.....W', 'W.....W', 'W.....W', 'WWWWWWW', '.......'],
    glitch: ['WW.A..W', '..WWA..', 'A..WW.W', '.WA..W.', 'W..AW..', '.W..WWA', 'A.W...W'],
    omarchy: ['WWWWWWW', 'W.....W', 'W.WWW.W', 'W.W.W.W', 'W.WWW.W', 'W.....W', 'WWWWWWW'],
    star: ['...W...', '..WWW..', 'WWWAWWW', '.WWAWW.', '..WWW..', '.WW.WW.', 'W.....W']
  };
  const cache = new Map();
  function paint(rows, pal, stamp) {
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), im = g.createImageData(w, h);
    const put = (x, y, ch) => { const v = pal[ch]; if (!v) return; const o = (y * w + x) * 4; im.data[o] = v[0]; im.data[o + 1] = v[1]; im.data[o + 2] = v[2]; im.data[o + 3] = 255; };
    rows.forEach((r, y) => [...r].forEach((ch, x) => put(x, y, ch)));
    if (stamp) stamp.rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && put(stamp.x + x, stamp.y + y, ch)));
    g.putImageData(im, 0, 0);
    return c;
  }
  // Trim in the colour of the best rarity the crate can drop
  const bestRar = (cr) => { let i = cr.w.length - 1; while (i > 0 && !cr.w[i]) i--; return i; };
  function art(cr) {
    if (cache.has(cr.id)) return cache.get(cr.id);
    const c = hex(cr.col), ink = [10, 11, 14], white = [244, 244, 244];
    const trim = hex(S().RAR[bestRar(cr)].col);
    const pal = { O: ink, F: c, H: mixc(c, white, 0.35), L: mixc(c, white, 0.15), S: mixc(c, ink, 0.35), D: mixc(c, ink, 0.55), T: trim, K: [201, 206, 216], W: white, A: mixc(c, white, 0.55) };
    const lid = paint(LID, pal), body = paint(BODY, pal, { rows: EMBLEM[cr.emblem] || EMBLEM.star, x: 9, y: 3 }), latch = paint(LATCH, pal);
    const whole = document.createElement('canvas'); whole.width = 24; whole.height = 22;
    const g = whole.getContext('2d');
    g.drawImage(body, 0, 7); g.drawImage(lid, 0, 0); g.drawImage(latch, 4, 5); g.drawImage(latch, 16, 5);
    const a = { lid: lid.toDataURL(), body: body.toDataURL(), latch: latch.toDataURL(), whole: whole.toDataURL() };
    cache.set(cr.id, a);
    return a;
  }

  // ---- The stickman wearing an item (or holding a weapon with a finish), drawn by the real rig ----
  function drawStick(ctx, ov = {}, o = {}) {
    const P = WTP.player, sv = WTP.save, eq = sv.pskin.eq, weq = sv.wskins.eq;
    const keepEq = { ...eq }, keepW = { ...weq };
    const keep = { x: P.x, y: P.y, vx: P.vx, vy: P.vy, ground: P.ground, victory: P.victory, face: P.face, dead: P.dead, pose: P.pose, crouch: P.crouch, ghosts: P.ghosts, land: P.land, kickT: P.kickT, dashT: P.dashT, hurtT: P.hurtT };
    Object.assign(eq, ov);
    if (o.w) { if (o.fin) weq[o.w] = o.fin; else delete weq[o.w]; }
    Object.assign(P, { x: 100, y: 100, vx: 0, vy: 0, ground: true, victory: !!o.victory, face: 1, dead: false, pose: null, crouch: false, ghosts: [], land: 0, kickT: 0, dashT: 0, hurtT: 0 });
    const s = o.scale || 4, cw = ctx.canvas.width, chh = ctx.canvas.height;
    ctx.save();
    ctx.setTransform(s, 0, 0, s, cw / 2 - (P.x + P.w / 2) * s, chh * 0.62 - (P.y + P.h / 2) * s);
    ctx.imageSmoothingEnabled = false;
    try {
      const sp = o.w ? WP.BY[o.w]?.sprite : null;
      P.draw(ctx, o.dt ?? 0.016, sp, { x: 1, y: o.w ? -0.15 : 0.4 }, { oneHand: false });
      const tr = ov.trail || (o.trail ? S().pEq('trail') : null);
      if (tr && tr !== 'none') trailDots(ctx, P, tr, o.t || 0);
    } catch (e) { console.warn('stickman preview', e && e.message); }
    finally {
      ctx.restore();
      Object.assign(P, keep);
      for (const k of Object.keys(eq)) if (!(k in keepEq)) delete eq[k];
      Object.assign(eq, keepEq);
      for (const k of Object.keys(weq)) if (!(k in keepW)) delete weq[k];
      Object.assign(weq, keepW);
    }
  }
  function trailDots(ctx, P, id, t) {
    const it = S().pItem('trail', id), ext = WTP.costumes?.TRAILS?.[id];
    const cols = ext ? ext.cols : it?.[3] || null;
    for (let k = 0; k < 14; k++) {
      const a = k / 14, x = P.x - 3 - a * 18 + Math.sin(t * 6 + k) * 0.8, y = P.y + P.h * (0.35 + 0.5 * ((k * 37) % 10) / 10) - a * 4;
      ctx.globalAlpha = 1 - a * 0.8;
      ctx.fillStyle = cols ? cols[k % cols.length] : `hsl(${(t * 200 + k * 26) % 360},90%,60%)`;
      const r = id === 'smoke' ? 1.2 : 0.7;
      ctx.fillRect(Math.round(x), Math.round(y), r, r);
    }
    ctx.globalAlpha = 1;
  }
  const iconCache = new Map();
  function stickIcon(ov, scale = 2) {
    const k = JSON.stringify(ov) + scale;
    if (iconCache.has(k)) return iconCache.get(k);
    const c = document.createElement('canvas'); c.width = 32 * scale * 2; c.height = 36 * scale * 2;
    drawStick(c.getContext('2d'), ov, { scale: scale * 2 });
    const url = c.toDataURL();
    iconCache.set(k, url);
    return url;
  }

  // ---- Describing a drop ----
  const rarOf = (d) => S().RAR[d.rar];
  function dropName(d) { const sh = S(); if (d.slot) return sh.pItem(d.slot, d.id)?.[1] || d.id; return `${WP.BY[d.w].name} | ${sh.F[d.fin].name}`; }
  function dropKind(d) { const sh = S(); if (d.slot) return sh.SLOT_NAME[d.slot]; return 'Weapon finish'; }
  const animated = (d) => (d.slot ? S().ANIMATED.has(`${d.slot}:${d.id}`) : S().F[d.fin].anim);
  function dropIcon(d, big) {
    const sh = S();
    if (d.slot === 'costume') return WTP.costumes?.preview?.(d.id, big ? 5 : 3) || '';
    if (d.slot) return stickIcon({ [d.slot]: d.id }, big ? 3 : 2);
    return sh.skinIcon(d.w, d.fin, big ? [200, 90] : [92, 44]);
  }

  // ---- Crates tab: a shelf with category filters and visible odds ----
  let filter = 'all';
  function render(body) {
    const sh = S(), sv = WTP.save;
    const list = sh.CRATES.filter((c) => filter === 'all' || (filter === 'player' ? c.kind === 'player' : c.kind === 'weapon'));
    const odds = (c) => { const tot = c.w.reduce((a, b) => a + b, 0); return sh.RAR.map((r, i) => c.w[i] ? `<span style="color:${r.col}">${r.name} ${(c.w[i] / tot * 100).toFixed(c.w[i] / tot < 0.02 ? 1 : 0)}%</span>` : '').join(''); };
    const owned = (c) => { if (c.kind !== 'player') return ''; const pool = sh.pPool(c); return `<small class="cown">${pool.filter((x) => sh.pOwned(x.slot, x.id)).length} / ${pool.length} owned</small>`; };
    body.innerHTML = `<h2>Crates</h2>
      <div class="ach-head"><span><i class="shard"></i><b>${fmt(sv.shards)}</b> shards</span><span>Duplicates refund 40%</span></div>
      <div class="ach-filter">${[['all', 'All'], ['player', 'Stickman'], ['weapon', 'Weapon finishes']].map(([k, l]) => `<button class="b${filter === k ? ' on' : ''}" data-cf="${k}">${l}</button>`).join('')}</div>
      <div class="shelf">${list.map((c) => `<div class="crate2" style="--cc:${c.col}"><img class="cimg" alt="" src="${art(c).whole}"><b>${esc(c.name)}</b>${owned(c)}<div class="codds">${odds(c)}</div><div class="cbtns"><button class="b" data-open="${c.id}" data-n="1"${sv.shards < c.price ? ' disabled' : ''}><i class="shard"></i>${fmt(c.price)}</button><button class="b" data-open="${c.id}" data-n="5"${sv.shards < c.price * 5 ? ' disabled' : ''}>Open 5</button></div></div>`).join('')}</div>`;
    body.querySelectorAll('[data-cf]').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.cf; render(body); AU.play('tick'); }));
    body.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => open(b.dataset.open, +b.dataset.n, () => render(body))));
  }

  // ---- Opening ----
  let cur = null;
  const hud = () => document.getElementById('hud');
  const reduced = () => !!WTP.reducedMotion?.();
  function close() {
    if (!cur) return;
    cur.alive = false;
    cancelAnimationFrame(cur.raf);
    cur.el.remove();
    const done = cur.after;
    cur = null;
    done && done();
  }
  function open(cid, n = 1, after) {
    const sh = S();
    if (cur) return false;
    const cr = sh.CRATES.find((c) => c.id === cid);
    if (!cr || !sh.spend(cr.price * n)) { AU.play('deny'); return false; }
    // Drops are rolled and granted up front, so closing early never loses anything
    const drops = Array.from({ length: n }, () => { const d = sh.rollCrate(cr); d.crate = cid; d.g = sh.grant(d); return d; });
    const el = document.createElement('div');
    el.className = 'copen';
    const a = art(cr);
    el.innerHTML = `<div class="co-dim"></div><div class="co-stage">
      <div class="co-crate" style="--glow:${sh.RAR[Math.max(...drops.map((d) => d.rar))].col}"><i class="co-glow"></i><img class="co-body" alt="" src="${a.body}"><img class="co-lid" alt="" src="${a.lid}"><img class="co-latch l" alt="" src="${a.latch}"><img class="co-latch r" alt="" src="${a.latch}"></div>
      <div class="co-strip" hidden><div class="co-track"></div><i class="co-mark"></i></div>
      <div class="co-reveal" hidden></div></div><div class="co-skip">Click to skip</div>`;
    hud().appendChild(el);
    cur = { el, cr, drops, n, after, alive: true, phase: 'intro', t0: performance.now(), raf: 0 };
    el.addEventListener('click', (e) => { if (e.target.closest('button')) return; if (cur && (cur.phase === 'intro' || cur.phase === 'spin' || cur.phase === 'hold')) skip(); });
    if (n === 1) buildStrip();
    AU.play('crateShake');
    cur.raf = requestAnimationFrame(tick);
    return true;
  }
  const IW = 112, N = 48, WIN = 42;
  function buildStrip() {
    const sh = S(), win = cur.drops[0], cr = cur.cr;
    const items = Array.from({ length: N }, (_, i) => (i === WIN ? win : sh.rollCrate(cr)));
    // Most spins creep past something rarer right before stopping
    const tease = win.rar < 4 && Math.random() < 0.7;
    if (tease) { for (let k = 0; k < 40; k++) { const d = sh.rollCrate(cr); if (d.rar > win.rar) { items[WIN - 1] = d; break; } } }
    cur.items = items;
    cur.tease = tease && items[WIN - 1].rar > win.rar;
    const track = cur.el.querySelector('.co-track');
    track.innerHTML = items.map((d) => `<div class="co-card" style="--rc:${rarOf(d).col}"><img alt="" src="${dropIcon(d)}"><span>${esc(dropName(d))}</span></div>`).join('');
  }
  const INTRO = 1500, SPIN = 4600;
  function tick(now) {
    if (!cur || !cur.alive) return;
    const t = now - cur.t0, el = cur.el;
    if (cur.phase === 'intro') {
      const crate = el.querySelector('.co-crate');
      const k = Math.min(1, t / INTRO);
      const amp = reduced() ? 0 : 1 + k * 4;
      crate.style.transform = `translate(${Math.round(rnd(-amp, amp))}px, ${Math.round(rnd(-amp, amp) * 0.5)}px) rotate(${(rnd(-1, 1) * amp * 0.6).toFixed(1)}deg)`;
      if (t > 500 && !cur.l1) { cur.l1 = true; el.querySelector('.co-latch.l').classList.add('pop'); AU.play('latchPop'); }
      if (t > 800 && !cur.l2) { cur.l2 = true; el.querySelector('.co-latch.r').classList.add('pop'); AU.play('latchPop'); }
      if (t > 1100 && !cur.crack) { cur.crack = true; crate.classList.add('crack'); AU.play('lidCrack'); }
      if (t >= INTRO) {
        if (cur.n === 1) { cur.phase = 'spin'; cur.t0 = now; crate.classList.add('away'); el.querySelector('.co-strip').hidden = false; el.classList.add('dim'); startSpin(); }
        else { crate.classList.add('away'); showBatch(); }
      }
    } else if (cur.phase === 'spin') {
      const k = Math.min(1, t / SPIN);
      spinAt(k);
      if (k >= 1) {
        const r = cur.drops[0].rar;
        if (r >= 3 && !reduced()) { cur.phase = 'hold'; cur.t0 = now; el.classList.add('hold'); AU.play('crateHold'); }
        else showReveal();
      }
    } else if (cur.phase === 'hold') {
      if (t > 750) showReveal();
    } else if (cur.phase === 'reveal' && cur.stick) {
      const c = cur.stick, g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      const d = cur.drops[cur.showIdx || 0];
      const ov = d.slot ? { [d.slot]: d.id } : {};
      drawStick(g, ov, { scale: 6, victory: !d.w || (t % 1800) > 1100, w: d.w, fin: d.fin, dt: 1 / 60, t: t / 1000 });
    }
    cur.raf = requestAnimationFrame(tick);
  }
  function startSpin() {
    const strip = cur.el.querySelector('.co-strip');
    const bw = strip.clientWidth || 900;
    const into = cur.tease ? rnd(0.04, 0.12) : rnd(0.18, 0.82);
    cur.target = WIN * IW + into * IW - bw / 2;
    cur.bw = bw; cur.lastIdx = -1;
  }
  // Fast start, a long slow tail where every card counts
  const ease = (k) => 1 - Math.pow(1 - k, 4.2);
  function spinAt(k) {
    const x = cur.target * ease(k);
    cur.el.querySelector('.co-track').style.transform = `translateX(${-Math.round(x)}px)`;
    const idx = Math.floor((x + cur.bw / 2) / IW);
    if (idx !== cur.lastIdx) { cur.lastIdx = idx; AU.play('crateTick', k); }
  }
  function skip() {
    if (cur.n > 1) { if (cur.phase === 'intro') { cur.el.querySelector('.co-crate').classList.add('away'); showBatch(); } return; }
    if (cur.phase === 'intro') { cur.el.querySelector('.co-crate').classList.add('away'); cur.el.querySelector('.co-strip').hidden = false; startSpin(); }
    spinAt(1);
    showReveal();
  }
  function burst(box, col, big) {
    const parts = [];
    for (let k = 0; k < (big ? 34 : 18); k++) { const a = rnd(0, Math.PI * 2), d = rnd(90, big ? 340 : 220); parts.push(`<i class="co-shard" style="--dx:${Math.round(Math.cos(a) * d)}px;--dy:${Math.round(Math.sin(a) * d)}px;--rot:${Math.round(rnd(-300, 300))}deg;animation-delay:${Math.round(rnd(0, 80))}ms"></i>`); }
    if (big) for (let k = 0; k < 46; k++) parts.push(`<i class="co-conf" style="left:${Math.round(rnd(0, 100))}%;--c:${['#ff5f8f', '#ffd34a', '#4cc6ec', '#a6e05a', '#a78bfa', col][k % 6]};animation-delay:${Math.round(rnd(0, 600))}ms;--sw:${Math.round(rnd(-60, 60))}px"></i>`);
    box.insertAdjacentHTML('afterbegin', `<div class="co-fx" style="--rc:${col}">${big && WTP.save.settings.flashes !== false ? '<i class="co-ray"></i>' : ''}<i class="co-burst"></i>${parts.join('')}</div>`);
  }
  function showReveal() {
    if (cur.phase === 'reveal') return;
    cur.phase = 'reveal'; cur.t0 = performance.now();
    const d = cur.drops[0], r = rarOf(d), el = cur.el;
    el.classList.remove('hold');
    el.classList.add('revealed');
    el.querySelector('.co-skip').hidden = true;
    const rv = el.querySelector('.co-reveal');
    rv.hidden = false;
    rv.style.setProperty('--rc', r.col);
    rv.innerHTML = `<canvas class="co-stick" width="280" height="300"></canvas><div class="co-name"><b>${esc(dropName(d))}</b><span>${r.name}${animated(d) ? ', animated' : ''} · ${esc(dropKind(d))}${d.g.dup ? ` · duplicate: +${d.g.refund} shards` : ' · new'}</span></div>
      <div class="btns"><button class="b primary" data-eq>Equip</button><button class="b" data-again>Open another</button><button class="b" data-close>Close</button></div>`;
    burst(rv, r.col, d.rar >= 3);
    cur.stick = rv.querySelector('.co-stick');
    AU.play('crateSting', d.rar);
    WTP.ui?.shardsChanged?.();
    bindButtons(rv, d);
  }
  function bindButtons(rv, d) {
    const sh = S(), cid = cur.cr.id, n = cur.n;
    const eq = rv.querySelector('[data-eq]');
    if (eq) eq.addEventListener('click', () => { sh.equipDrop(d); AU.play('select'); eq.textContent = 'Equipped'; eq.disabled = true; });
    const again = rv.querySelector('[data-again]');
    if (WTP.save.shards < cur.cr.price * n) again.disabled = true;
    again.addEventListener('click', () => { const after = cur.after; cur.after = null; close(); after && after(); open(cid, n, after); });
    rv.querySelector('[data-close]').addEventListener('click', () => { AU.play('tick'); close(); });
  }
  function showBatch() {
    cur.phase = 'reveal'; cur.t0 = performance.now();
    const el = cur.el, rv = el.querySelector('.co-reveal');
    el.classList.add('dim');
    el.querySelector('.co-skip').hidden = true;
    const best = cur.drops.reduce((a, d, i) => (d.rar > cur.drops[a].rar ? i : a), 0);
    rv.hidden = false;
    rv.style.setProperty('--rc', rarOf(cur.drops[best]).col);
    rv.innerHTML = `<div class="co-grid">${cur.drops.map((d, i) => `<button class="co-card big" data-i="${i}" style="--rc:${rarOf(d).col};animation-delay:${i * 160}ms"><img alt="" src="${dropIcon(d)}"><span>${esc(dropName(d))}</span><em>${rarOf(d).name}${d.g.dup ? ` · +${d.g.refund}` : ' · new'}</em></button>`).join('')}</div>
      <div class="co-name"><span>Click a drop to equip it</span></div><div class="btns"><button class="b" data-again>Open 5 more</button><button class="b" data-close>Close</button></div>`;
    burst(rv, rarOf(cur.drops[best]).col, cur.drops[best].rar >= 3);
    cur.drops.forEach((d, i) => setTimeout(() => cur && cur.alive && AU.play('crateTick', 0.2 + i * 0.15), i * 160));
    setTimeout(() => cur && cur.alive && AU.play('crateSting', cur.drops[best].rar), cur.drops.length * 160);
    rv.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => { S().equipDrop(cur.drops[+b.dataset.i]); AU.play('select'); b.classList.add('eq'); }));
    bindButtons(rv, cur.drops[best]);
  }

  WTP.crates = { render, open, close, art, stickIcon, drawStick, isOpen: () => !!cur, state: () => cur && { phase: cur.phase, n: cur.n, drops: cur.drops.map((d) => ({ ...d })), tease: cur.tease, items: cur.items?.length } };
})();
