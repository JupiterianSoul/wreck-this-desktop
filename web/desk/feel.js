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
  const dith = WTP.sprites.dith;
  function pxLine(ctx, x0, y0, x1, y1, th, colAt) {
    let ax = Math.floor(x0), ay = Math.floor(y0);
    const bx = Math.floor(x1), by = Math.floor(y1);
    const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
    const N = Math.max(1, Math.max(dx, -dy));
    let err = dx + dy;
    for (let n = 0; n <= 256; n++) {
      const c = colAt(n / N, ax, ay);
      if (c) { ctx.fillStyle = c; ctx.fillRect(ax, ay, 1 + th, 1 + th); }
      if (ax === bx && ay === by) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; ax += sx; }
      if (e2 <= dx) { err += dx; ay += sy; }
    }
  }
  F.pxLine = pxLine;
  function pxDisc(ctx, x, y, r, col, dens) {
    const cx = Math.floor(x), cy = Math.floor(y), R = Math.ceil(r);
    ctx.fillStyle = col;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      if (dx * dx + dy * dy > r * r + 0.3) continue;
      if (dens < 1 && !dith(cx + dx, cy + dy, dens)) continue;
      ctx.fillRect(cx + dx, cy + dy, 1, 1);
    }
  }
  F.pxDisc = pxDisc;
  function drawTrail(ctx, s, L) {
    const tr = s._tr;
    if (!tr || tr.length < 4) return;
    const n = tr.length / 2;
    if (L.smoke) {
      for (let i = 0; i < n; i++) {
        const k = i / n, x = tr[i * 2], y = tr[i * 2 + 1];
        const r = (0.6 + (1 - k) * 2.2) * L.smoke * (L.small ? 0.6 : 1);
        pxDisc(ctx, x + Math.sin(i * 1.7) * 0.6, y - (1 - k) * 2, r, k > 0.7 ? '#c3c8cf' : '#8e949e', 0.15 + k * 0.45);
      }
      return;
    }
    const col = L.arc || L.g || '#ffffff';
    for (let i = 1; i < n; i++) {
      const k = i / n;
      pxLine(ctx, tr[(i - 1) * 2], tr[(i - 1) * 2 + 1], tr[i * 2], tr[i * 2 + 1], 0, (t, x, y) => (dith(x, y, k * (L.arc ? 0.45 : 0.8)) ? col : null));
    }
  }

  function tracer(ctx, s, L) {
    const sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp;
    const len = Math.min(sp * L.len, 4 + s.age * sp);
    const th = L.w >= 1.6 ? 1 : 0;
    glow(ctx, s.x, s.y, 2 + L.w * 1.6, L.g, 0.4);
    pxLine(ctx, s.x - ux * len, s.y - uy * len, s.x, s.y, th, (t, x, y) => (t < 0.45 && !dith(x, y, t / 0.45) ? null : t > 0.8 ? L.c : L.g));
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
        const k = Math.min(1, s.age / 0.45), r = 0.6 + k * 2.6;
        const col = k < 0.2 ? '#fffad2' : k < 0.45 ? '#ffd34a' : k < 0.75 ? '#ff7a2a' : '#6e6464';
        if (k < 0.6) glow(ctx, s.x, s.y, r + 2, 'rgba(255,150,40,.35)', 1);
        pxDisc(ctx, s.x, s.y, r, col, k < 0.75 ? 0.85 : 0.35);
        if (k < 0.45) pxDisc(ctx, s.x, s.y, r * 0.45, '#fffad2', 1);
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
  const flashCache = new Map();
  function flashSprite(f, stage, step) {
    const key = `${f.L.toFixed(1)}|${f.side ? 1 : 0}|${f.ring ? 1 : 0}|${f.c}|${f.g}|${stage}|${step}`;
    let cv = flashCache.get(key);
    if (cv) return cv;
    const L = f.L * [0.75, 1.05, 0.85][stage];
    const pc = new WTP.PixCtx(44, 44);
    pc.begin(-22, -22);
    pc.rotate(step * (Math.PI / 16));
    const star = (sc, col) => {
      pc.fillStyle = col; pc.beginPath();
      pc.moveTo(-0.5, -1.2 * sc); pc.lineTo(L * 0.42, -1.0 * sc);
      if (f.side) { pc.lineTo(L * 0.25, -L * 0.38 * sc); pc.lineTo(L * 0.6, -0.7 * sc); }
      pc.lineTo(L * sc, 0);
      if (f.side) { pc.lineTo(L * 0.6, 0.7 * sc); pc.lineTo(L * 0.25, L * 0.38 * sc); }
      pc.lineTo(L * 0.42, 1.0 * sc); pc.lineTo(-0.5, 1.2 * sc); pc.closePath(); pc.fill();
    };
    if (stage < 2) { star(1, f.g); star(0.6, f.c); }
    else { star(0.8, f.g); }
    if (f.ring && stage > 0) { pc.strokeStyle = f.g; pc.lineWidth = 1; pc.beginPath(); pc.ellipse(L * 0.3, 0, 1 + stage, 2 + stage * 2, 0, 0, Math.PI * 2); pc.stroke(); }
    cv = pc.toImage(null, document.createElement('canvas'));
    if (flashCache.size > 600) flashCache.clear();
    flashCache.set(key, cv);
    return cv;
  }
  function drawFlash(ctx, f) {
    const k = f.t / f.dur, stage = k < 0.34 ? 0 : k < 0.67 ? 1 : 2;
    const ang = f.ang + f.rot, step = ((Math.round(ang / (Math.PI / 16)) % 32) + 32) % 32;
    glow(ctx, f.x + Math.cos(ang) * f.L * 0.3, f.y + Math.sin(ang) * f.L * 0.3, f.L * 0.9, f.g, 0.5 * (1 - k));
    const cv = flashSprite({ ...f, L: Math.round(f.L * f.sp * 2) / 2 }, stage, step);
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, Math.round(f.x) - 22, Math.round(f.y) - 22, 44, 44);
    ctx.imageSmoothingEnabled = sm;
  }

  F.impact = (x, y, col, big) => {
    F.hits.push({ x, y, c: col, t: 0, dur: big ? 0.22 : 0.14, r: big ? 5 : 3, a0: Math.random() * 6 });
    const n = big ? 7 : 4;
    for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 70; F.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, t: 0, dur: 0.18 + Math.random() * 0.2, c: Math.random() < 0.4 ? '#ffffff' : col, r: 0.42, g: 260, streak: 1 }); }
    if (F.hits.length > 60) F.hits.shift();
  };
  function drawHit(ctx, h) {
    const k = h.t / h.dur;
    glow(ctx, h.x, h.y, h.r * (0.6 + k), h.c, 0.6 * (1 - k));
    for (let q = 0; q < 5; q++) {
      const a = h.a0 + q * 1.2566, r0 = h.r * (0.25 + k * 0.6), r1 = h.r * (0.6 + k * 0.9);
      pxLine(ctx, h.x + Math.cos(a) * r0, h.y + Math.sin(a) * r0, h.x + Math.cos(a) * r1, h.y + Math.sin(a) * r1, 0, (t, x, y) => (dith(x, y, 1 - k) ? (t > 0.5 ? h.c : '#ffffff') : null));
    }
  }
  const c32cache = new Map();
  const c32 = (c) => {
    let v = c32cache.get(c);
    if (v != null) return v;
    if (c[0] === '#') v = WTP.packHex(c);
    else { const m = /rgba?\(([^)]+)\)/.exec(c); const q = m ? m[1].split(',').map((x) => +x) : [255, 255, 255]; v = WTP.pack(q[0] | 0, q[1] | 0, q[2] | 0); }
    if (c32cache.size > 400) c32cache.clear();
    c32cache.set(c, v);
    return v;
  };
  function part(p) {
    const FXo = WTP.fx, c = c32(p.c || '#ffffff');
    if (p.grow) FXo.puff(p.x, p.y, p.vx || 0, p.vy || 0, c, p.dur || 0.6, (p.r || 1) * (1 + p.grow * 0.4));
    else FXo.spark(p.x, p.y, p.vx || 0, p.vy || 0, c, p.dur || 0.3);
  }
  F.part = part;
  F.parts = { push: part };

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
  }
  F.step = step;
  WP.EXT.updates.push((dt) => step(dt));
  WP.EXT.after.push((ctx) => {
    for (const h of F.hits) drawHit(ctx, h);
    for (const f of F.flashes) drawFlash(ctx, f);
  });
  WP.EXT.resets.push(() => { F.flashes = []; F.hits = []; live.clear(); });
})();
