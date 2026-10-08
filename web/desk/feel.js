(() => {
  const WTP = window.WTP;
  const WP = WTP.weapons, V = WTP.vsprites, FX = WTP.fx;
  const G = () => WTP.game;
  const F = { flashes: [], hits: [], parts: [] };
  WTP.feel = F;

  const T = (c, g, w, len, extra = {}) => ({ k: 'tracer', c, g, w, len, ...extra });
  const LOOK = {
    pistol: T('#fff6cf', '#ffb43f', 1.1, 0.017, { hit: '#ffd56a' }),
    revolver: T('#ffe7b5', '#ff6a2a', 2.1, 0.024, { hit: '#ff9a3a', big: 1 }),
    dual: T('#fff3a6', '#f2c13b', 1.0, 0.015, { hit: '#ffe07a' }),
    nailgun: { k: 'nail', c: '#d6dce6', g: '#9aa4b4', w: 0.6, len: 0.006, hit: '#c9d1dd' },
    smg: T('#fff9d8', '#ffcf4a', 0.9, 0.012, { hit: '#ffe58a' }),
    rifle: T('#ffffff', '#ff8c33', 1.3, 0.022, { hit: '#ffb25a' }),
    minigun: T('#ffeeb0', '#ff7d2a', 1.0, 0.03, { hit: '#ffb04a' }),
    shotgun: { k: 'pellet', c: '#fff1c4', g: '#ff8a3a', w: 0.9, len: 0.01, hit: '#ffb36a' },
    double: { k: 'pellet', c: '#ffe0a0', g: '#ff5a2a', w: 1.1, len: 0.012, hit: '#ff8a4a' },
    flak: { k: 'flak', c: '#3f4450', g: '#ffb03a', hit: '#ffcf6a' },
    flare: { k: 'flare', c: '#ff5a3a', g: '#ffb04a', hit: '#ff7a3a' },
    rocket: { k: 'rocket', c: '#5cbf5a', g: '#ffb03a', smoke: 1, hit: '#ffd06a' },
    homing: { k: 'missile', c: '#cfd5df', g: '#ff7a3a', smoke: 0.6, hit: '#ffb06a' },
    plasma: { k: 'orb', c: '#f3d6ff', g: '#a35cff', r: 2.6, hit: '#d39bff' },
    crossbow: { k: 'bolt', c: '#cfd5df', g: '#ffffff', hit: '#e6e9ef' },
    harpoon: { k: 'harpoon', c: '#cfd5df', g: '#4cc6ec', hit: '#9fe3f6' },
    firework: { k: 'firework', c: '#d9493c', g: '#ffd34a', hit: '#ffe07a' },
    nuke: { k: 'warhead', c: '#f4d03f', g: '#ff8a2e', smoke: 1.4, hit: '#fff3b0' },
    lava: { k: 'blob', c: '#ffd04a', g: '#ff5a1a', r: 1.8, hit: '#ff8a2a' },
    saw: { k: 'saw', c: '#dfe4ec', g: '#ffffff', hit: '#ffffff' },
    ballgun: { k: 'ball', hit: '#ffffff' },
    grenade: { k: 'icon', rec: 'grenade', sc: 0.75, arc: '#7fd07a' },
    cluster: { k: 'icon', rec: 'cluster', sc: 0.75, arc: '#f4d03f' },
    sticky: { k: 'icon', rec: 'sticky', sc: 0.75, arc: '#a6e05a' },
    mine: { k: 'icon', rec: 'mine', sc: 0.7, upright: 1 },
    snowball: { k: 'icon', rec: 'snowball', sc: 0.75, arc: '#d6eef8', hit: '#e8f6ff' },
    banana: { k: 'icon', rec: 'banana', sc: 0.7, arc: '#f4d03f' },
    bowling: { k: 'icon', rec: 'bowling', sc: 0.85 },
    termites: { k: 'icon', rec: 'termites', sc: 0.6, arc: '#f3e6c4' },
    orbital: { k: 'icon', rec: 'orbital', sc: 0.6, upright: 1, beep: '#4cc6ec' },
    airstrike: { k: 'flare', c: '#ff3a3a', g: '#ff7a3a', smoke: 0.8 },
    antigrav: { k: 'icon', rec: 'antigrav', sc: 0.7, arc: '#9b5de5' },
    boomerang: { k: 'icon', rec: 'boomerang', sc: 0.85, ghost: 1 },
    blackhole: null,
    meteor: { k: 'meteor', c: '#6b4a2f', g: '#ff7a2a', smoke: 1, hit: '#ffb04a' },
    bees: { k: 'bee' },
    flame: { k: 'fire' }
  };
  const BY_TYPE = { mini: { k: 'icon', rec: 'cluster', sc: 0.42, arc: '#f4d03f' }, bomb: { k: 'warhead', c: '#3f4450', g: '#ff8a2e', small: 1, smoke: 0.4 }, aflare: LOOK.airstrike, beacon: LOOK.orbital, jar: LOOK.termites, agrav: LOOK.antigrav, bowl: LOOK.bowling, bee: LOOK.bees, missile: LOOK.homing };
  F.LOOK = LOOK;
  const SPR_LOOK = { bigbullet: 'revolver', pellet: 'shotgun', nail: 'nailgun', bullet: 'pistol', flak: 'flak', flare: 'flare', rocket: 'rocket', plasma: 'plasma', bolt: 'crossbow', harpoon: 'harpoon', firework: 'firework', nuke: 'nuke', grenade: 'grenade', cluster: 'cluster', sticky: 'sticky', mine: 'mine', snowball: 'snowball', banana: 'banana', bowl: 'bowling', jar: 'termites', beacon: 'orbital', agrav: 'antigrav', boomerang: 'boomerang', meteor: 'meteor', bee: 'bees', ball: 'ballgun', bomblet: null, missile: 'homing' };
  const TYPE_OK = new Set(['flame', 'bullet', 'flak', 'flare', 'aflare', 'rocket', 'missile', 'plasma', 'bolt', 'harpoon', 'firework', 'nuke', 'lavab', 'saw', 'ball', 'grenade', 'cluster', 'mini', 'sticky', 'mine', 'snow', 'banana', 'bowl', 'jar', 'beacon', 'agrav', 'boomerang', 'meteor', 'bee', 'bomb']);

  function lookOf(s) {
    if (s._lk !== undefined) return s._lk;
    let L = null;
    if (TYPE_OK.has(s.t)) {
      if (s.t === 'flame') L = LOOK.flame;
      else if (s.t === 'bullet' && s.crit) L = LOOK.revolver;
      else if (s.t === 'bullet') L = LOOK[s.w] && LOOK[s.w].k !== 'icon' && ['tracer', 'pellet', 'nail'].includes(LOOK[s.w].k) ? LOOK[s.w] : LOOK[SPR_LOOK[s.spr] || 'pistol'];
      else if (s.t === 'lavab') L = LOOK.lava;
      else if (s.t === 'saw') L = LOOK.saw;
      else if (BY_TYPE[s.t]) L = BY_TYPE[s.t];
      else if (s.spr && SPR_LOOK[s.spr]) L = LOOK[SPR_LOOK[s.spr]];
      else if (s.t === 'snow') L = LOOK.snowball;
      else if (s.t === 'ball') L = LOOK.ballgun;
    }
    s._lk = L || null;
    return s._lk;
  }
  F.lookOf = lookOf;

  const icons = new Map();
  function rec(id, sc) { const k = id + '|' + sc; if (!icons.has(k)) icons.set(k, V.R[id] ? V.make(V.R[id], sc) : null); return icons.get(k); }
  function drawIcon(ctx, id, x, y, ang, sc) { const sp = rec(id, sc); if (sp) sp.drawC(ctx, x, y, ang); }
  const pcache = new Map();
  function pv(ctx, parts, x, y, ang) {
    const k = JSON.stringify(parts);
    let sp = pcache.get(k);
    if (!sp) { sp = V.make({ parts }); pcache.set(k, sp); }
    sp.draw(ctx, x, y, ang, false);
  }
  const glow = (ctx, x, y, r, col, a = 1) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  };
  const OUT = 'rgba(8,9,12,.9)';

  function trailPush(s, L, n) {
    const tr = s._tr || (s._tr = []);
    tr.push(s.x, s.y);
    if (tr.length > n * 2) tr.splice(0, tr.length - n * 2);
  }
  function drawTrail(ctx, s, L) {
    const tr = s._tr;
    if (!tr || tr.length < 4) return;
    const n = tr.length / 2;
    if (L.smoke) {
      for (let i = 0; i < n; i++) {
        const k = i / n, x = tr[i * 2], y = tr[i * 2 + 1];
        const r = (0.8 + (1 - k) * 2.6) * L.smoke * (L.small ? 0.6 : 1);
        ctx.globalAlpha = k * 0.38;
        ctx.fillStyle = i % 3 ? '#9aa0aa' : '#c3c8cf';
        ctx.beginPath(); ctx.arc(x + Math.sin(i * 1.7) * 0.6, y - (1 - k) * 2, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      return;
    }
    const col = L.arc || L.g || '#ffffff';
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 1; i < n; i++) {
      const k = i / n;
      ctx.globalAlpha = k * (L.arc ? 0.35 : 0.55);
      ctx.lineWidth = L.arc ? 0.6 : (L.r || 1) * k * 1.4;
      ctx.beginPath(); ctx.moveTo(tr[(i - 1) * 2], tr[(i - 1) * 2 + 1]); ctx.lineTo(tr[i * 2], tr[i * 2 + 1]); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function tracer(ctx, s, L) {
    const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
    const len = Math.min(sp * L.len, 4 + s.age * sp);
    const tx = s.x - ux * len, ty = s.y - uy * len;
    const g = ctx.createLinearGradient(tx, ty, s.x, s.y);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.6, L.g); g.addColorStop(1, L.c);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(8,9,12,.55)'; ctx.lineWidth = L.w + 0.8;
    ctx.beginPath(); ctx.moveTo(s.x - ux * len * 0.5, s.y - uy * len * 0.5); ctx.lineTo(s.x, s.y); ctx.stroke();
    ctx.strokeStyle = g; ctx.lineWidth = L.w;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
    glow(ctx, s.x, s.y, L.w * 2.6, L.g, 0.55);
    ctx.fillStyle = L.c; ctx.beginPath(); ctx.arc(s.x, s.y, L.w * 0.62, 0, Math.PI * 2); ctx.fill();
  }

  function look(ctx, s) {
    if (s.from && s.from !== 'p') return false;
    const L = lookOf(s);
    if (!L) return false;
    const ang = Math.atan2(s.vy, s.vx);
    drawTrail(ctx, s, L);
    switch (L.k) {
      case 'tracer': case 'pellet': tracer(ctx, s, L); return true;
      case 'fire': {
        const k = Math.min(1, s.age / 0.45), r = 1.1 + k * 3.4;
        const col = k < 0.2 ? 'rgba(255,250,210,.95)' : k < 0.5 ? 'rgba(255,190,60,.8)' : k < 0.8 ? 'rgba(255,100,30,.6)' : 'rgba(110,100,100,.35)';
        ctx.globalCompositeOperation = k < 0.8 ? 'lighter' : 'source-over';
        glow(ctx, s.x, s.y, r, col, 1);
        ctx.globalCompositeOperation = 'source-over';
        return true;
      }
      case 'nail': {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0.6, 0); ctx.stroke();
        ctx.strokeStyle = L.c; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(0.8, 0); ctx.stroke();
        ctx.fillStyle = L.g; ctx.fillRect(-3.4, -0.9, 0.7, 1.8);
        ctx.restore(); return true;
      }
      case 'flak': {
        glow(ctx, s.x, s.y, 4, L.g, 0.5 + 0.3 * Math.sin(s.age * 40));
        pv(ctx, [['r', -2, -1.2, 4, 2.4, L.c, 0.8], ['r', 0.6, -1.2, 0.6, 2.4, '#e3b94b', 0]], s.x, s.y, ang);
        return true;
      }
      case 'flare': {
        glow(ctx, s.x, s.y, 7 + Math.sin(s.age * 30) * 1.2, L.g, 0.6);
        pv(ctx, [['r', -2.2, -0.8, 3.6, 1.6, L.c, 0.6]], s.x, s.y, s.stuck ? -Math.PI / 2 : ang);
        ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.arc(s.x, s.y, 0.9, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.6) F.parts.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 30, t: 0, dur: 0.35, c: Math.random() < 0.5 ? '#ffd04a' : L.c, r: 0.5, g: 60 });
        return true;
      }
      case 'rocket': case 'missile': case 'warhead': case 'firework': {
        const small = L.k === 'missile' || L.small, fw = L.k === 'firework';
        let body;
        const flick = 0.75 + Math.random() * 0.5;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
        if (L.k !== 'warhead' || !L.small) {
          const fl = (small ? 2.4 : 3.6) * flick;
          ctx.fillStyle = '#ff7a2a'; ctx.beginPath(); ctx.moveTo(-3.4 * (small ? 0.6 : 1), -0.9); ctx.lineTo(-3.4 * (small ? 0.6 : 1) - fl * 1.6, 0); ctx.lineTo(-3.4 * (small ? 0.6 : 1), 0.9); ctx.fill();
          ctx.fillStyle = '#fff1a0'; ctx.beginPath(); ctx.moveTo(-3.4 * (small ? 0.6 : 1), -0.5); ctx.lineTo(-3.4 * (small ? 0.6 : 1) - fl * 0.8, 0); ctx.lineTo(-3.4 * (small ? 0.6 : 1), 0.5); ctx.fill();
        }
        if (L.k === 'rocket') body = [['r', -3.6, -1.1, 6, 2.2, L.c, 0.8], ['p', [2.2, -1.1, 4.2, 0, 2.2, 1.1], '#d9493c'], ['p', [-3.6, -1.1, -4.6, -2.2, -2.4, -1.1], '#3f4450'], ['p', [-3.6, 1.1, -4.6, 2.2, -2.4, 1.1], '#3f4450']];
        else if (L.k === 'missile') body = [['r', -2.2, -0.7, 3.8, 1.4, L.c, 0.6], ['p', [1.4, -0.7, 2.8, 0, 1.4, 0.7], '#d9493c'], ['p', [-2.2, -0.7, -2.8, -1.5, -1.4, -0.7], '#3f4450'], ['p', [-2.2, 0.7, -2.8, 1.5, -1.4, 0.7], '#3f4450']];
        else if (fw) body = [['l', -5, 0, -1.6, 0, 0.4, '#b07a4f'], ['r', -2.2, -1.0, 4, 2.0, L.c, 0.3], ['p', [1.6, -1.1, 3.4, 0, 1.6, 1.1], '#f4d03f']];
        else if (L.small) body = [['p', [-2.6, -1.2, 1.2, -1.2, 2.6, 0, 1.2, 1.2, -2.6, 1.2], L.c], ['p', [-2.6, -1.2, -3.6, -2.0, -3.6, 2.0, -2.6, 1.2], '#24272e']];
        else body = [['p', [-4.2, -1.8, 1.6, -1.8, 4.4, 0, 1.6, 1.8, -4.2, 1.8], L.c], ['p', [-4.2, -1.8, -5.6, -3.0, -5.6, 3.0, -4.2, 1.8], '#24272e'], ['c', -0.6, 0, 1.0, '#24272e']];
        ctx.restore();
        pv(ctx, body, s.x, s.y, ang);
        if (fw && Math.random() < 0.9) F.parts.push({ x: s.x - Math.cos(ang) * 4, y: s.y - Math.sin(ang) * 4, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40 + 10, t: 0, dur: 0.4, c: ['#ffd34a', '#ff6aa8', '#4cc6ec', '#ffffff'][(Math.random() * 4) | 0], r: 0.45, g: 40 });
        return true;
      }
      case 'orb': {
        const pulse = 1 + Math.sin(s.age * 26) * 0.12;
        glow(ctx, s.x, s.y, L.r * 3 * pulse, L.g, 0.75);
        ctx.fillStyle = L.g; ctx.beginPath(); ctx.arc(s.x, s.y, L.r * pulse, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = L.c; ctx.beginPath(); ctx.arc(s.x - 0.3, s.y - 0.3, L.r * 0.55, 0, Math.PI * 2); ctx.fill();
        return true;
      }
      case 'blob': {
        glow(ctx, s.x, s.y, 4.2, L.g, 0.6);
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(s.x, s.y, L.r + 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = L.g; ctx.beginPath(); ctx.arc(s.x, s.y, L.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = L.c; ctx.beginPath(); ctx.arc(s.x - 0.4, s.y - 0.5, L.r * 0.5, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.3) F.parts.push({ x: s.x, y: s.y, vx: 0, vy: 10, t: 0, dur: 0.4, c: '#ff8a2a', r: 0.5, g: 200 });
        return true;
      }
      case 'bolt': case 'harpoon': {
        let body;
        if (L.k === 'bolt') body = [['l', -6, 0, 1.4, 0, 0.5, '#b07a4f'], ['p', [-6.4, -1.4, -4.2, 0, -6.4, 1.4, -5.6, 0], '#d9493c'], ['p', [1.0, -0.9, 3.2, 0, 1.0, 0.9], L.c]];
        else body = [['l', -7, 0, 2, 0, 0.6, '#9aa1ae'], ['p', [1.6, -1.6, 4.4, 0, 1.6, 1.6, 2.4, 0], L.c], ['l', 1.6, -1.6, 0.4, -0.4, 0.3, '#9aa1ae'], ['l', 1.6, 1.6, 0.4, 0.4, 0.3, '#9aa1ae']];
        pv(ctx, body, s.x, s.y, ang);
        return true;
      }
      case 'saw': {
        const r = 3.2, n = 10;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin || s.age * 30);
        ctx.beginPath();
        for (let k = 0; k < n * 2; k++) { const a = (k / (n * 2)) * Math.PI * 2, rr = k & 1 ? r * 0.78 : r + 0.6; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fillStyle = OUT; ctx.lineWidth = 0.8; ctx.strokeStyle = OUT; ctx.stroke();
        const g = ctx.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, L.c); g.addColorStop(1, '#7b818c');
        ctx.fillStyle = g; ctx.fill();
        ctx.fillStyle = '#3f4450'; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (s.grind > 0 && Math.random() < 0.7) F.parts.push({ x: s.x, y: s.y + 2, vx: (Math.random() - 0.5) * 80, vy: -Math.random() * 60, t: 0, dur: 0.3, c: '#ffe07a', r: 0.4, g: 200 });
        return true;
      }
      case 'ball': {
        const hue = s._hue ?? (s._hue = (Math.random() * 360) | 0);
        const r = 1.9;
        ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(s.x, s.y, r + 0.5, 0, Math.PI * 2); ctx.fill();
        const g = ctx.createRadialGradient(s.x - 0.7, s.y - 0.7, 0.2, s.x, s.y, r);
        g.addColorStop(0, `hsl(${hue},90%,82%)`); g.addColorStop(0.5, `hsl(${hue},85%,58%)`); g.addColorStop(1, `hsl(${hue},80%,38%)`);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        return true;
      }
      case 'meteor': {
        glow(ctx, s.x, s.y, 9, L.g, 0.55);
        const fl = 1 + Math.random() * 0.3;
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(ang);
        ctx.fillStyle = 'rgba(255,140,40,.8)'; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-10 * fl, 0); ctx.lineTo(0, 3); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,170,.9)'; ctx.beginPath(); ctx.moveTo(0, -1.6); ctx.lineTo(-6 * fl, 0); ctx.lineTo(0, 1.6); ctx.fill();
        ctx.restore();
        const body = [['p', [-2.8, -1.2, -1.2, -3, 1.8, -2.6, 3, -0.4, 2.2, 2.4, -0.6, 3, -2.8, 1.6], L.c], ['c', 0.6, -0.6, 0.8, '#3a2a1c'], ['c', -1.2, 1.0, 0.5, '#3a2a1c']];
        pv(ctx, body, s.x, s.y, ang + Math.round(s.age * 5 / 0.4) * 0.4);
        return true;
      }
      case 'bee': {
        const fx = s.vx < 0 ? -1 : 1, fl = Math.sin(s.age * 90) > 0;
        ctx.save(); ctx.translate(s.x, s.y); ctx.scale(fx, 1);
        ctx.fillStyle = 'rgba(230,245,255,.75)'; ctx.beginPath(); ctx.ellipse(-0.2, -1.4, 1.1, fl ? 0.9 : 0.4, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        const body = [['r', -1.6, -0.9, 3.2, 1.8, '#f4c03f', 0.9], ['l', -0.4, -0.9, -0.4, 0.9, 0.4, '#24272e'], ['l', 0.6, -0.9, 0.6, 0.9, 0.4, '#24272e']];
        pv(ctx, body, s.x, s.y, fx < 0 ? Math.PI : 0);
        return true;
      }
      case 'icon': {
        const a = L.upright ? 0 : s.t === 'bowl' ? (s.roll || 0) : (s.spin || 0) + (s.t === 'boomerang' ? 0 : 0);
        drawIcon(ctx, L.rec, s.x, s.y, a, L.sc);
        if (s.t === 'mine' && s.arm <= 0 && ((performance.now() / 250) | 0) % 2) glow(ctx, s.x, s.y - 1.6, 2.4, 'rgba(255,60,60,.9)');
        if (L.beep && ((performance.now() / 300) | 0) % 2) glow(ctx, s.x, s.y - 2.4, 3, 'rgba(110,220,255,.9)');
        if (s.fuse != null && s.fuse < 0.6 && ((s.fuse * 12) | 0) % 2) glow(ctx, s.x, s.y, 4.2, 'rgba(255,240,200,.8)');
        return true;
      }
    }
    return false;
  }
  WP.EXT.look = look;

  const FLASH = {
    small: { L: 4.2, c: '#fff4c4', g: '#ffb43f' },
    big: { L: 7, c: '#fff1c0', g: '#ff8a2e', side: 1 },
    fire: { L: 6.6, c: '#ffe08a', g: '#ff5a1a', side: 1, smoke: 1 },
    pink: { L: 5, c: '#ffe0f2', g: '#ef6aa8' },
    energy: { L: 6, c: '#e6fbff', g: '#4cc6ec', ring: 1 }
  };
  const PER = {
    revolver: { L: 8.5, side: 1, smoke: 1 }, sniper: { L: 9, side: 1, smoke: 1 }, double: { L: 9.5, side: 1, smoke: 1 }, shotgun: { L: 8, side: 1, smoke: 1 },
    minigun: { L: 5.4 }, smg: { L: 4 }, dual: { L: 3.6, c: '#fff6c8', g: '#f2c13b' }, nailgun: { L: 2.6, c: '#ffffff', g: '#9aa4b4' }, railgun: { L: 10, ring: 1, c: '#ffffff', g: '#7fe3ff' },
    plasma: { c: '#f7e0ff', g: '#a35cff', ring: 1 }, glitch: { c: '#a6ffcf', g: '#ff3ad1' }, ballgun: { L: 3.6, c: '#ffe0f2', g: '#ff6aa8' }, confetti: { L: 6, c: '#fff5a0', g: '#ff6aa8', side: 1 }, portal: { c: '#e6fbff', g: '#4cc6ec', ring: 1 }, flak: { L: 7.5, side: 1, smoke: 1 }, rocket: { L: 6, smoke: 1.4 }, nuke: { L: 8, smoke: 2 }
  };
  F.FLASH = FLASH;
  const oldFlash = FX.flashSprite;
  FX.flashSprite = (kind, x, y, ang) => {
    const id = WP.st.cur, base = FLASH[kind];
    if (!base) return oldFlash(kind, x, y, ang);
    const f = { ...base, ...(PER[id] || {}), x, y, ang, t: 0, dur: 0.075, rot: (Math.random() - 0.5) * 0.3, sp: 0.8 + Math.random() * 0.4 };
    F.flashes.push(f);
    if (f.smoke) for (let k = 0; k < 3 * f.smoke; k++) F.parts.push({ x: x + Math.cos(ang) * 2, y: y + Math.sin(ang) * 2, vx: Math.cos(ang) * 30 + (Math.random() - 0.5) * 20, vy: Math.sin(ang) * 30 - 12 - Math.random() * 10, t: 0, dur: 0.5 + Math.random() * 0.3, c: '#aab0b9', r: 1.2, grow: 3, a: 0.32, g: -10, drag: 3 });
    if (F.flashes.length > 24) F.flashes.shift();
  };
  function drawFlash(ctx, f) {
    const k = f.t / f.dur, L = f.L * f.sp * (k < 0.3 ? 0.7 + k : 1.1 - (k - 0.3) * 0.6), a = 1 - k * 0.7;
    ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang + f.rot);
    glow(ctx, L * 0.25, 0, L * 0.9, f.g, a * 0.7);
    const star = (sc, col) => {
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(-0.5, -1.0 * sc); ctx.lineTo(L * 0.42, -0.9 * sc);
      if (f.side) { ctx.lineTo(L * 0.25, -L * 0.36 * sc); ctx.lineTo(L * 0.58, -0.6 * sc); }
      ctx.lineTo(L * sc, 0);
      if (f.side) { ctx.lineTo(L * 0.58, 0.6 * sc); ctx.lineTo(L * 0.25, L * 0.36 * sc); }
      ctx.lineTo(L * 0.42, 0.9 * sc); ctx.lineTo(-0.5, 1.0 * sc); ctx.closePath(); ctx.fill();
    };
    ctx.globalAlpha = a; star(1, f.g); star(0.62, f.c);
    if (f.ring) { ctx.strokeStyle = f.g; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(L * 0.3, 0, 0.8 + k * 1.6, 1.8 + k * 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore(); ctx.globalAlpha = 1;
  }

  F.impact = (x, y, col, big) => {
    F.hits.push({ x, y, c: col, t: 0, dur: big ? 0.22 : 0.14, r: big ? 5 : 3, a0: Math.random() * 6 });
    const n = big ? 7 : 4;
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 70; F.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: 0, dur: 0.18 + Math.random() * 0.2, c: Math.random() < 0.4 ? '#ffffff' : col, r: 0.42, g: 260, streak: 1 }); }
    if (F.hits.length > 60) F.hits.shift();
  };
  function drawHit(ctx, h) {
    const k = h.t / h.dur;
    ctx.globalAlpha = 1 - k;
    glow(ctx, h.x, h.y, h.r * (0.6 + k), h.c, 0.8);
    ctx.strokeStyle = h.c; ctx.lineWidth = 0.6 * (1 - k) + 0.2; ctx.lineCap = 'round';
    for (let q = 0; q < 5; q++) {
      const a = h.a0 + q * 1.2566, r0 = h.r * (0.25 + k * 0.6), r1 = h.r * (0.6 + k * 0.9);
      ctx.beginPath(); ctx.moveTo(h.x + Math.cos(a) * r0, h.y + Math.sin(a) * r0); ctx.lineTo(h.x + Math.cos(a) * r1, h.y + Math.sin(a) * r1); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function drawPart(ctx, p) {
    const k = p.t / p.dur, r = p.r * (1 + (p.grow || 0) * k);
    ctx.globalAlpha = (p.a ?? 1) * (1 - k);
    if (p.streak) { ctx.strokeStyle = p.c; ctx.lineWidth = r * 1.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); ctx.stroke(); }
    else { ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  const live = new Map();
  const TRAIL_N = { tracer: 0, pellet: 0, nail: 0, rocket: 22, missile: 14, warhead: 26, firework: 6, orb: 10, blob: 5, flare: 0, icon: 10, meteor: 16, bolt: 0, harpoon: 0, saw: 0, ball: 6, bee: 0, flak: 0 };
  function step(dt) {
    const seen = new Set();
    for (const s of WP.shots) {
      if (!s || s.delay > 0) continue;
      if (s.w === undefined) s.w = s.from === 'p' || !s.from ? WP.st.cur : '';
      seen.add(s);
      const L = lookOf(s);
      if (!L || (s.from && s.from !== 'p')) continue;
      const n = L.smoke ? Math.round(16 * L.smoke) : L.arc ? TRAIL_N.icon : TRAIL_N[L.k] || 0;
      if (n) trailPush(s, L, n);
      live.set(s, s);
    }
    for (const s of live.keys()) {
      if (seen.has(s)) continue;
      live.delete(s);
      const L = lookOf(s);
      if (L && L.hit && s.life > 0.001) F.impact(s.x, s.y, L.hit, L.big);
    }
    for (const f of F.flashes) f.t += dt;
    F.flashes = F.flashes.filter((f) => f.t < f.dur);
    for (const h of F.hits) h.t += dt;
    F.hits = F.hits.filter((h) => h.t < h.dur);
    const Wd = WTP.world;
    for (const p of F.parts) {
      p.t += dt; p.vy += (p.g || 0) * dt;
      if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; }
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.streak && Wd.solid(Math.floor(nx), Math.floor(ny))) { if (Wd.solid(Math.floor(p.x), Math.floor(ny))) p.vy *= -0.45; else p.vx *= -0.5; p.vx *= 0.8; continue; }
      p.x = nx; p.y = ny;
    }
    F.parts = F.parts.filter((p) => p.t < p.dur);
    if (F.parts.length > 500) F.parts.splice(0, F.parts.length - 500);
  }
  F.step = step;
  WP.EXT.updates.push((dt) => step(dt));
  WP.EXT.after.push((ctx) => {
    for (const p of F.parts) drawPart(ctx, p);
    for (const h of F.hits) drawHit(ctx, h);
    for (const f of F.flashes) drawFlash(ctx, f);
  });
  WP.EXT.resets.push(() => { F.flashes = []; F.hits = []; F.parts = []; live.clear(); });
})();
