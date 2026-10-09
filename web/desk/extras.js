(() => {
  const WTP = window.WTP;
  const WP = WTP.weapons, G = WTP.game, AU = WTP.audio, MD = WTP.modes;
  const W = () => WTP.world, PL = () => WTP.player, ST = () => WTP.structs, EN = () => WTP.enemies, FX = () => WTP.fx;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const X = {};
  WTP.extras = X;

  const dayKey = () => new Date().toISOString().slice(0, 10);
  const seedOf = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const CAT_NAMES = { side: 'Sidearms', auto: 'Automatics', shot: 'Shotguns', boom: 'Explosives', melee: 'Melee', desk: 'Desktop', energy: 'Energy', chem: 'Chemical', gadget: 'Tools' };
  function daily() {
    const r = seedOf(dayKey()), pickN = (a) => a[r % a.length];
    const kind = r % 6;
    const n = (lo, hi) => lo + ((r >>> 8) % (hi - lo + 1));
    if (kind === 0) { const p = n(30, 50); return { id: `free${p}`, text: `Wreck ${p}% of the desktop in Free Wreck`, mode: 'free', test: (run) => run.modeId === 'free' && MD.pct() >= p }; }
    if (kind === 1) {
      const cats = ['side', 'shot', 'boom', 'melee', 'desk'].filter((c) => WP.DEFS.some((d) => d.cat === c && WTP.ach?.weaponOwned?.(d.id) !== false));
      const c = cats.length ? pickN(cats) : 'side', p = n(15, 30);
      return { id: `cat${c}${p}`, text: `Wreck ${p}% using only ${CAT_NAMES[c]} weapons`, test: (run) => { const u = Object.keys(run.stats.weaponUse || {}); return u.length > 0 && u.every((id) => WP.BY[id]?.cat === c) && MD.pct() >= p; } };
    }
    if (kind === 2) { const p = n(25, 40); return { id: `time${p}`, text: `Wreck ${p}% in Time Attack`, mode: 'time', test: (run) => run.modeId === 'time' && MD.pct() >= p }; }
    if (kind === 3) { const w = n(5, 9); return { id: `surv${w}`, text: `Reach wave ${w} in Survival`, mode: 'survival', test: (run) => run.modeId === 'survival' && (run.wave || 0) >= w }; }
    if (kind === 4) { const k = n(12, 25); return { id: `melee${k}`, text: `Defeat ${k} enemies in one run using only melee weapons`, test: (run) => { const u = Object.keys(run.stats.weaponUse || {}); return (run.kills || 0) >= k && u.every((id) => WP.BY[id]?.cat === 'melee'); } }; }
    const k = n(3, 5);
    return { id: `win${k}`, text: `Bring down ${k} windows in one run`, test: (run) => (run.achWins || 0) >= k };
  }
  const DAILY_REWARD = 150;
  const dailyDone = () => WTP.save.daily?.day === dayKey() && WTP.save.daily?.done;
  X.daily = daily;
  X.dailyHtml = () => { const d = daily(); return `<div class="daily${dailyDone() ? ' done' : ''}"><b>Daily challenge</b><span>${esc(d.text)}</span><em>${dailyDone() ? 'Done today' : `<i class="shard"></i>${DAILY_REWARD}`}</em></div>`; };

  const oEnd = G.end;
  G.end = (reason) => {
    const run = G.run;
    const fresh = run && !run.ended;
    if (fresh && !dailyDone()) {
      let ok = false;
      try { ok = daily().test(run); } catch (e) { ok = false; }
      if (ok) {
        WTP.save.daily = { day: dayKey(), done: true };
        WTP.save.shards = (WTP.save.shards || 0) + DAILY_REWARD;
        WTP.ui?.toast?.({ kind: 'ach', icon: '<i class="trophy"></i>', title: 'Daily challenge', text: daily().text, reward: `+${DAILY_REWARD}` });
        AU.play('unlock');
        WTP.persist();
      }
    }
    oEnd(reason);
  };

  let introShown = false;
  function intro(run) {
    if (introShown || WTD.test) return;
    introShown = true;
    const hud = document.getElementById('hud');
    if (!hud) return;
    const wins = (ST()?.wins || []).filter((w) => w && w.reg?.type !== 'bar').length;
    const M = run.mode, best = M.bestKey ? WTP.getBest(M.bestKey(run)) : null;
    const el = document.createElement('div');
    el.className = 'intro card';
    el.innerHTML = `<b>WRECK THIS DESKTOP</b><span class="im">${esc(M.name)}${best != null ? `<em>best ${esc(M.fmt ? M.fmt(best) : best)}</em>` : ''}</span><span>${wins} window${wins === 1 ? '' : 's'}, ${(W().words?.length || 0).toLocaleString('en-US')} words to break</span>${X.dailyHtml()}<small>Tab weapons, Esc menu, F2 photo, F12 quit</small>`;
    hud.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    const kill = () => { el.classList.remove('on'); setTimeout(() => el.remove(), 500); };
    setTimeout(kill, 7000);
    const onAct = () => { if (WTP.input.wantFire?.()) { kill(); return; } requestAnimationFrame(onAct); };
    setTimeout(onAct, 1200);
  }

  const golds = [];
  function placeGolds() {
    golds.length = 0;
    const Wd = W();
    let tries = 0;
    while (golds.length < 4 && tries++ < 4000) {
      const x = 4 + Math.floor(Math.random() * (Wd.w - 8)), y = 16 + Math.floor(Math.random() * (Wd.gh - 24));
      const i = y * Wd.w + x;
      if (Wd.mat[i] !== Wd.SOLID || !Wd.rid[i]) continue;
      const w = ST()?.wins?.[Wd.rid[i]];
      if (!w || w.reg?.type === 'bar') continue;
      if (golds.some((g) => Math.abs(g.x - x) + Math.abs(g.y - y) < 60)) continue;
      golds.push({ x, y, i, st: 0, t: 0 });
    }
  }
  X.golds = golds;

  const holes = [];
  if (WTP.feel) {
    const oImp = WTP.feel.impact;
    WTP.feel.impact = (x, y, col, big) => { if (oImp(x, y, col, big) === false) return false; holes.push({ x, y, t: 0, dur: big ? 1.6 : 1 }); if (holes.length > 80) holes.shift(); };
  }

  const seenSlabs = new Map();
  let lastRun = null, acc = 0;
  WP.EXT.updates.push((dt) => {
    const run = G.run;
    if (!run) return;
    if (run !== lastRun) { lastRun = run; run.finisherAt = 50; placeGolds(); seenSlabs.clear(); intro(run); }
    for (const h of holes) h.t += dt;
    while (holes.length && holes[0].t > holes[0].dur) holes.shift();
    if (run.combo >= (run.finisherAt || 50) && !run.ended) { run.finisherAt = (run.finisherAt || 50) + 50; finisher(run.combo); }
    const P = PL(), pc = P.center();
    for (const g of golds) {
      g.t += dt;
      if (g.st === 0 && W().mat[g.i] !== W().SOLID) { g.st = 1; AU.play('achieve'); FX().pop(g.x, g.y - 6, 'GOLDEN PIXEL', { scale: 1, ramp: ['Y', 'y', 'o'], life: 1 }); }
      if (g.st === 1 && Math.hypot(pc.x - g.x, pc.y - g.y) < 9) {
        g.st = 2;
        WTP.save.shards = (WTP.save.shards || 0) + 25;
        WTP.ach?.stats && (WTP.ach.stats().golden = (WTP.ach.stats().golden || 0) + 1);
        WTP.ui?.toast?.({ kind: 'ach', icon: '<i class="gpx"></i>', title: 'Golden pixel', text: `${golds.filter((q) => q.st === 2).length} of ${golds.length} found`, reward: '+25' });
        AU.play('coin'); G.bonus?.(500, g.x, g.y - 8);
        WTP.persist();
      }
    }
    if ((acc += dt) < 0.1) return;
    acc = 0;
    const live = new Set();
    for (const s of ST()?.slabs || []) { if (s.dead) continue; live.add(s); seenSlabs.set(s, { x: s.x, y: s.y, w: s.bw || s.w || 20, h: s.bh || s.h || 12 }); }
    for (const [s, b] of seenSlabs) if (!live.has(s)) { seenSlabs.delete(s); dust(b.x, b.y + b.h / 2, b.w); }
  });

  function dust(x, y, w) {
    if (!WTP.feel) return;
    const n = Math.min(40, 8 + w / 3);
    for (let k = 0; k < n; k++) {
      const dx = (Math.random() - 0.5) * w, dir = dx < 0 ? -1 : 1;
      WTP.feel.parts.push({ x: x + dx, y: y - Math.random() * 2, vx: dir * (30 + Math.random() * 70), vy: -Math.random() * 18, t: 0, dur: 0.8 + Math.random() * 0.6, c: Math.random() < 0.5 ? '#a9adb5' : '#c9ccd2', r: 1.2, grow: 2.5, a: 0.38, g: -6, drag: 2.2 });
    }
    AU.play('creak');
  }
  X.dust = dust;
  X.showIntro = () => { introShown = false; const t = WTD.test; WTD.test = false; intro(G.run); WTD.test = t; };

  function finisher(combo) {
    const P = PL(), pc = P.center();
    G.announce?.('COMBO FINISHER!', 7);
    G.slowmo?.(0.35, 0.7, true);
    WP.shockwave(pc.x, pc.y, 90, true);
    WTP.feel?.ring?.(pc.x, pc.y, 90, { dur: 0.55 });
    for (const e of EN()?.list || []) if (!e.dead) e.damage(40 + combo * 0.4, 'finisher');
    AU.play('finisher');
  }
  X.finisher = finisher;

  WP.EXT.draws.push((ctx) => {
    for (const h of holes) {
      const k = 1 - h.t / h.dur;
      const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 2.2);
      g.addColorStop(0, `rgba(255,190,90,${0.85 * k})`); g.addColorStop(0.5, `rgba(255,90,30,${0.5 * k})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 2.2, 0, Math.PI * 2); ctx.fill();
    }
    const now = performance.now() / 1000;
    for (const g of golds) {
      if (g.st !== 1) continue;
      const y = g.y - 2 + Math.sin(now * 3 + g.x) * 1.2;
      const gl = ctx.createRadialGradient(g.x + 0.5, y + 0.5, 0, g.x + 0.5, y + 0.5, 5);
      gl.addColorStop(0, 'rgba(255,220,90,.75)'); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(g.x + 0.5, y + 0.5, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0b0e'; ctx.fillRect(Math.floor(g.x) - 1, Math.floor(y) - 1, 4, 4);
      ctx.fillStyle = '#f4c542'; ctx.fillRect(Math.floor(g.x), Math.floor(y), 2, 2);
      if (((now * 4) | 0) % 3 === 0) { ctx.fillStyle = '#fffbe0'; ctx.fillRect(Math.floor(g.x), Math.floor(y), 1, 1); }
    }
  });

  let photo = false, hint = null;
  function setPhoto(on) {
    photo = on;
    const hud = document.getElementById('hud');
    if (on) {
      G.pause(true);
      hud?.classList.add('photo');
      hint = document.createElement('div');
      hint.className = 'photohint';
      hint.textContent = 'PHOTO MODE   F2 save   Esc cancel';
      document.body.appendChild(hint);
    } else {
      hud?.classList.remove('photo');
      hint?.remove(); hint = null;
      G.pause(false);
    }
  }
  function snap() {
    const shot = document.getElementById('shot'), cv = document.getElementById('cv');
    const w = shot.naturalWidth || cv.width, h = shot.naturalHeight || cv.height;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    if (shot.naturalWidth) g.drawImage(shot, 0, 0, w, h);
    g.drawImage(cv, 0, 0, w, h);
    const png = c.toDataURL('image/png');
    WTD.post({ t: 'photo', png });
    X.lastPhoto = png.length;
    const fl = document.createElement('div');
    fl.className = 'camflash';
    document.body.appendChild(fl);
    setTimeout(() => fl.remove(), 450);
    AU.play('shutter');
  }
  X.photo = (on) => { if (on === undefined) on = !photo; if (on && !photo) setPhoto(true); else if (!on && photo) setPhoto(false); };
  X.snap = snap;
  WTD.onPhoto = (path) => WTP.ui?.toast?.({ kind: 'ach', icon: '<i class="trophy"></i>', title: 'Photo saved', text: String(path).split('/').slice(-2).join('/') });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F2') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!G.run || G.run.ended) return;
      if (!photo) setPhoto(true);
      else { hint && (hint.style.display = 'none'); requestAnimationFrame(() => { snap(); setPhoto(false); }); }
    } else if (photo && e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); setPhoto(false); }
  }, true);
})();
