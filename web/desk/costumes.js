(() => {
  const WTP = window.WTP;
  const C = {};
  WTP.costumes = C;
  const K = 22 / 14;

  function seg(ctx, pts, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]); ctx.stroke();
  }
  const poly = (ctx, pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]); ctx.closePath(); ctx.fill(); };
  const disc = (ctx, x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
  const rect = (ctx, x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const along = (p, t) => [lerp(p.hipX, p.nx, t), lerp(p.hipY, p.ny, t)];
  const limb = (L, ax, ay, upTo = 1) => upTo >= 1 ? [ax, ay, L.jx, L.jy, L.ex, L.ey] : [ax, ay, L.jx, L.jy, lerp(L.jx, L.ex, upTo), lerp(L.jy, L.ey, upTo)];
  const kneeY = (p) => (p.legs[0].jy + p.legs[1].jy) / 2;
  const footY = (p) => Math.max(p.legs[0].ey, p.legs[1].ey);

  function torso(ctx, p, w, col, top = 1) { const [x, y] = along(p, top); seg(ctx, [p.hipX, p.hipY, x, y], w, col); }
  function pants(ctx, p, col, w = 1.6) { for (const L of p.legs) seg(ctx, limb(L, p.hipX, p.hipY, 0.85), w, col); seg(ctx, [p.hipX - 0.6, p.hipY, p.hipX + 0.6, p.hipY], w + 0.4, col); }
  function shoes(ctx, p, col) { for (const L of p.legs) disc(ctx, L.ex + p.face * 0.4, L.ey - 0.4, 0.9, col); }
  function sleeve(ctx, p, L, col, w = 1.5, upTo = 0.8) { seg(ctx, limb(L, p.shX, p.shY, upTo), w, col); }
  function gloves(ctx, L, col) { disc(ctx, L.ex, L.ey, 0.8, col); }
  function skirt(ctx, p, col, len, flare) {
    const y1 = lerp(p.hipY, footY(p), len), dx = (p.legs[0].ex - p.legs[1].ex) * 0.25;
    poly(ctx, [p.hipX - 1.4, p.hipY - 0.6, p.hipX + 1.4, p.hipY - 0.6, p.hipX + flare + dx, y1, p.hipX - flare + dx, y1], col);
  }
  const headTop = (p, HEAD) => [p.hx, p.hy - HEAD];

  const D = {};
  const def = (id, name, price, o) => { D[id] = { id, name, price, ...o }; };

  def('hoodie', 'Hoodie', 1500, { sw: ['#55607a', '#8a96b0'], head: false,
    back(ctx, p, H) { disc(ctx, p.hx - p.face * 0.6, p.hy + 0.2, H + 0.7, '#48526a'); },
    body(ctx, p) { torso(ctx, p, 3.0, '#55607a', 1.05); sleeve(ctx, p, p.armB, '#4a5468'); pants(ctx, p, '#2c3245'); const [x, y] = along(p, 0.45); rect(ctx, x - 1, y, 2, 1, '#48526a'); rect(ctx, p.nx + p.face * 0.3, p.ny + 0.4, 0.4, 1.6, '#e8e8e8'); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#55607a'); } });
  def('leather', 'Leather Jacket', 1800, { sw: ['#1d1d22', '#3a6fb0'],
    body(ctx, p) { pants(ctx, p, '#3a6fb0'); shoes(ctx, p, '#2a2a30'); torso(ctx, p, 3.0, '#1d1d22', 1.02); const [a, b] = along(p, 0.15), [c2, d] = along(p, 0.95); seg(ctx, [a, b, c2, d], 0.4, '#9aa1ae'); seg(ctx, [p.nx - 1, p.ny - 0.2, p.nx, p.ny + 1, p.nx + 1, p.ny - 0.2], 0.6, '#2c2c34'); sleeve(ctx, p, p.armB, '#16161a', 1.6, 0.9); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#1d1d22', 1.6, 0.9); } });
  def('suit', 'Suit and Tie', 2500, { sw: ['#1e2747', '#d83a32'],
    body(ctx, p) { pants(ctx, p, '#1a2140'); shoes(ctx, p, '#0e0e12'); torso(ctx, p, 3.1, '#1e2747', 1.02); poly(ctx, [p.nx - 0.9, p.ny, p.nx + 0.9, p.ny, along(p, 0.55)[0], along(p, 0.55)[1]], '#f2f2f2'); seg(ctx, [p.nx, p.ny + 0.3, ...along(p, 0.45)], 0.6, '#d83a32'); sleeve(ctx, p, p.armB, '#18203c', 1.6, 0.92); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#1e2747', 1.6, 0.92); } });
  def('labcoat', 'Lab Coat', 2200, { sw: ['#f2f4f6', '#3e70d9'],
    body(ctx, p) { pants(ctx, p, '#3b3f4a'); shoes(ctx, p, '#22252c'); skirt(ctx, p, '#e4e8ee', 0.62, 2.2); torso(ctx, p, 3.0, '#f2f4f6', 1.02); const [x, y] = along(p, 0.7); rect(ctx, x + p.face * 0.4, y, 0.5, 1.3, '#3e70d9'); rect(ctx, x + p.face * 1.0, y, 0.5, 1.3, '#d83a32'); sleeve(ctx, p, p.armB, '#dfe3ea', 1.6, 0.92); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#f2f4f6', 1.6, 0.92); } });
  def('ninja', 'Ninja', 3000, { sw: ['#15151a', '#d83a32'], head: true,
    back(ctx, p) { const t = performance.now() / 160; seg(ctx, [p.hx - p.face * 1.8, p.hy - 0.6, p.hx - p.face * (4 + Math.sin(t) * 0.5), p.hy + 0.6 + Math.cos(t) * 0.6], 0.6, '#d83a32'); },
    body(ctx, p) { pants(ctx, p, '#15151a', 1.7); shoes(ctx, p, '#0b0b0e'); torso(ctx, p, 2.9, '#1b1b21', 1.02); { const [bx, by] = along(p, 0.14); seg(ctx, [bx - 1.5, by, bx + 1.5, by], 0.8, '#d83a32'); } sleeve(ctx, p, p.armB, '#141418', 1.5, 1); },
    head(ctx, p, H) { disc(ctx, p.hx, p.hy, H + 0.15, '#15151a'); rect(ctx, p.hx - (p.face > 0 ? 0 : 2.2), p.hy - 0.7, 2.2, 0.9, '#f0d7c0'); rect(ctx, p.hx + p.face * 1.1 - 0.3, p.hy - 0.5, 0.6, 0.5, '#101014'); rect(ctx, p.hx - H, p.hy - 1.6, H * 2, 0.6, '#d83a32'); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#1b1b21', 1.5, 1); } });
  def('robot', 'Robot', 3500, { sw: ['#9aa1ae', '#4cc6ec'], head: true, hat: true,
    body(ctx, p) { for (const L of p.legs) { seg(ctx, limb(L, p.hipX, p.hipY), 1.5, '#6c727f'); disc(ctx, L.jx, L.jy, 0.8, '#3f4450'); } const [x, y] = along(p, 0.55); rect(ctx, x - 2, y - 3.2, 4, 6, '#9aa1ae'); rect(ctx, x - 1.4, y - 2.4, 2.8, 1.6, '#3f4450'); rect(ctx, x - 1, y - 2, 0.6, 0.6, (performance.now() / 300 | 0) % 2 ? '#e05050' : '#5cbf5a'); rect(ctx, x + 0.2, y - 2, 0.6, 0.6, '#f4d03f'); seg(ctx, limb(p.armB, p.shX, p.shY), 1.3, '#6c727f'); disc(ctx, p.armB.jx, p.armB.jy, 0.7, '#3f4450'); },
    head(ctx, p, H) { rect(ctx, p.hx - 2.1, p.hy - 2.1, 4.2, 4, '#b5bdc9'); rect(ctx, p.hx - (p.face > 0 ? -0.2 : 2.0), p.hy - 0.9, 1.8, 0.9, '#4cc6ec'); seg(ctx, [p.hx, p.hy - 2.1, p.hx, p.hy - 3.4], 0.4, '#6c727f'); disc(ctx, p.hx, p.hy - 3.6, 0.5, '#e05050'); },
    front(ctx, p) { seg(ctx, limb(p.armF, p.shX, p.shY), 1.3, '#9aa1ae'); disc(ctx, p.armF.jx, p.armF.jy, 0.7, '#3f4450'); } });
  def('astronaut', 'Astronaut', 4000, { sw: ['#eceff4', '#f08a2e'], head: true, hat: true,
    back(ctx, p) { const [x, y] = along(p, 0.65); rect(ctx, x - p.face * 2.6 - 1, y - 2.4, 2, 4.4, '#c8ced8'); },
    body(ctx, p) { pants(ctx, p, '#dde2ea', 1.9); shoes(ctx, p, '#9aa1ae'); torso(ctx, p, 3.4, '#eceff4', 1.02); const [x, y] = along(p, 0.62); rect(ctx, x - 0.9, y - 0.6, 1.8, 1.2, '#3e70d9'); rect(ctx, x - 0.5, y - 0.3, 0.4, 0.4, '#e05050'); rect(ctx, ...along(p, 0.85), 0.8, 0.6, '#f08a2e'); sleeve(ctx, p, p.armB, '#dde2ea', 1.8, 0.9); },
    head(ctx, p, H) { disc(ctx, p.hx, p.hy, H + 1.3, '#d6eef8'); disc(ctx, p.hx, p.hy, H + 0.7, '#3a6d86'); disc(ctx, p.hx + p.face * 0.3, p.hy + 0.2, H - 0.2, '#f0d7c0'); rect(ctx, p.hx - p.face * 0.9 - 0.4, p.hy - H - 0.2, 0.8, 0.8, '#ffffff'); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#eceff4', 1.8, 0.9); gloves(ctx, p.armF, '#c8ced8'); } });
  def('knight', 'Knight Armour', 4500, { sw: ['#b5bdc9', '#d83a32'], head: true, hat: true,
    body(ctx, p) { pants(ctx, p, '#858e9c', 1.8); shoes(ctx, p, '#565d6a'); torso(ctx, p, 3.4, '#b5bdc9', 1.02); seg(ctx, [...along(p, 0.3), ...along(p, 0.32)], 3.5, '#858e9c'); seg(ctx, [...along(p, 0.6), ...along(p, 0.62)], 3.5, '#858e9c'); disc(ctx, p.shX - p.face * 0.6, p.shY, 1.4, '#9aa1ae'); sleeve(ctx, p, p.armB, '#858e9c', 1.6, 0.95); },
    head(ctx, p, H) { disc(ctx, p.hx, p.hy, H + 0.4, '#b5bdc9'); rect(ctx, p.hx - (p.face > 0 ? -0.2 : 2.2), p.hy - 0.5, 2.0, 0.5, '#24272e'); seg(ctx, [p.hx, p.hy - H - 0.3, p.hx - p.face * 1.6, p.hy - H - 1.8, p.hx - p.face * 3, p.hy - H - 1.2], 0.9, '#d83a32'); },
    front(ctx, p) { disc(ctx, p.shX + p.face * 0.2, p.shY, 1.4, '#cbd1da'); sleeve(ctx, p, p.armF, '#b5bdc9', 1.6, 0.95); gloves(ctx, p.armF, '#858e9c'); } });
  def('wizard', 'Wizard Robe', 4200, { sw: ['#4b2a8a', '#f4d03f'], head: true, hat: true,
    body(ctx, p) { skirt(ctx, p, '#3d2170', 0.98, 2.8); torso(ctx, p, 3.0, '#4b2a8a', 1.02); for (let k = 0; k < 3; k++) { const [x, y] = along(p, 0.2 + k * 0.25); rect(ctx, x + (k - 1) * 0.8, y, 0.5, 0.5, '#f4d03f'); } seg(ctx, limb(p.armB, p.shX, p.shY, 0.95), 2.0, '#3d2170'); },
    head(ctx, p, H) { const [x, y] = headTop(p, H); poly(ctx, [x - 3.2, y + 0.6, x + 3.2, y + 0.6, x - p.face * 0.8, y - 6], '#4b2a8a'); rect(ctx, x - 3.2, y + 0.2, 6.4, 0.8, '#3d2170'); rect(ctx, x - p.face * 0.4, y - 2.6, 0.6, 0.6, '#f4d03f'); seg(ctx, [p.hx + p.face * 0.6, p.hy + 1.2, p.hx + p.face * 0.9, p.hy + 4.4], 1.4, '#e8e8e8'); },
    front(ctx, p) { seg(ctx, limb(p.armF, p.shX, p.shY, 0.95), 2.0, '#4b2a8a'); } });
  def('hacker', 'Hacker Trench Coat', 3800, { sw: ['#14201a', '#3fdc6a'],
    body(ctx, p) { pants(ctx, p, '#101412'); shoes(ctx, p, '#08090a'); skirt(ctx, p, '#14201a', 0.72, 2.4); torso(ctx, p, 3.1, '#18261f', 1.02); seg(ctx, [p.nx - 1.2, p.ny + 0.2, p.nx - 1.1, p.ny - 1.4], 0.8, '#18261f'); seg(ctx, [p.nx + 1.2, p.ny + 0.2, p.nx + 1.1, p.ny - 1.4], 0.8, '#18261f'); sleeve(ctx, p, p.armB, '#121c16', 1.6, 0.92); const t = performance.now() / 120 | 0; for (let k = 0; k < 2; k++) { const [x, y] = along(p, 0.3 + k * 0.3); rect(ctx, x + ((t + k * 3) % 3) - 1, y, 0.4, 0.4, '#3fdc6a'); } },
    head(ctx, p) { rect(ctx, p.hx - (p.face > 0 ? -0.1 : 2.1), p.hy - 0.6, 2.0, 0.7, '#0a0f0b'); rect(ctx, p.hx + (p.face > 0 ? 0.5 : -1.1), p.hy - 0.5, 0.6, 0.3, '#3fdc6a'); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#18261f', 1.6, 0.92); } });
  def('chef', 'Chef', 2000, { sw: ['#f6f6f2', '#d83a32'], head: true, hat: true,
    body(ctx, p) { pants(ctx, p, '#2e2e34'); shoes(ctx, p, '#18181c'); torso(ctx, p, 3.1, '#f6f6f2', 1.02); for (let k = 0; k < 3; k++) { const [x, y] = along(p, 0.35 + k * 0.2); rect(ctx, x - 0.8, y, 0.4, 0.4, '#9aa1ae'); rect(ctx, x + 0.4, y, 0.4, 0.4, '#9aa1ae'); } seg(ctx, [p.nx - 0.9, p.ny + 0.3, p.nx + 0.9, p.ny + 0.3], 0.9, '#d83a32'); sleeve(ctx, p, p.armB, '#e6e6e0', 1.6, 0.85); },
    head(ctx, p, H) { const [x, y] = headTop(p, H); rect(ctx, x - 2.0, y - 1, 4, 1.4, '#f6f6f2'); disc(ctx, x - 1.1, y - 2.4, 1.5, '#ffffff'); disc(ctx, x + 1.1, y - 2.4, 1.5, '#ffffff'); disc(ctx, x, y - 3.2, 1.6, '#ffffff'); },
    front(ctx, p) { sleeve(ctx, p, p.armF, '#f6f6f2', 1.6, 0.85); } });
  def('builder', 'Construction Worker', 1600, { sw: ['#ff8a1e', '#f4d03f'], head: true, hat: true,
    body(ctx, p) { pants(ctx, p, '#3a6fb0'); shoes(ctx, p, '#5a3a22'); torso(ctx, p, 3.0, '#6c727f', 1.0); torso(ctx, p, 3.3, '#ff8a1e', 0.92); seg(ctx, [...along(p, 0.35), ...along(p, 0.37)], 3.4, '#e8ecf2'); seg(ctx, [...along(p, 0.65), ...along(p, 0.67)], 3.4, '#e8ecf2'); },
    head(ctx, p, H) { const [x, y] = headTop(p, H); disc(ctx, x, y + 0.8, 2.4, '#f4d03f'); rect(ctx, x - 3, y + 0.6, 6, 0.8, '#d8b628'); rect(ctx, x - 0.3, y - 1.4, 0.6, 1.6, '#fff1a0'); },
    front(ctx, p) { gloves(ctx, p.armF, '#c8a46a'); } });

  C.D = D;
  C.list = () => Object.values(D);
  C.current = () => D[WTP.shop?.pEq?.('costume')] || null;
  C.draw = (ctx, p, stage, HEAD) => {
    const d = C.current();
    if (!d) return;
    const f = d[stage];
    if (f) f(ctx, p, HEAD);
  };
  C.hidesHat = () => { const d = C.current(); return !!(d && d.hat); };
  C.hasHead = () => { const d = C.current(); return !!(d && d.head); };

  const HATS = {
    beanie(ctx, x, y, f, R) { R(-2.4, -1.2, 4.8, 1.8, '#3e70d9'); R(-2.6, 0.2, 5.2, 0.7, '#2b4aa8'); R(-0.5, -2.0, 1, 0.9, '#f2f2f2'); },
    cowboy(ctx, x, y, f, R) { R(-4.0, -0.1, 8, 0.8, '#7a4a2a'); R(-1.9, -2.8, 3.8, 2.8, '#946d4b'); R(-1.9, -0.9, 3.8, 0.5, '#2b1d13'); },
    viking(ctx, x, y, f, R) { R(-2.4, -1.4, 4.8, 1.9, '#9aa1ae'); R(-3.4, -2.6, 1, 1.6, '#f3e6c4'); R(2.4, -2.6, 1, 1.6, '#f3e6c4'); R(-0.4, -1.4, 0.8, 1.9, '#6c727f'); },
    propeller(ctx, x, y, f, R) { R(-2.4, -1.2, 4.8, 1.6, '#e05050'); R(-0.8, -1.2, 1.6, 1.6, '#f4d03f'); R(-0.2, -2.4, 0.4, 1.2, '#24272e'); const t = (performance.now() / 60 | 0) % 2; R(t ? -2.4 : -1.2, -2.6, t ? 4.8 : 2.4, 0.4, '#4cc6ec'); },
    beret(ctx, x, y, f, R) { R(-2.6, -1.0, 4.4, 1.4, '#d83a32'); R(-0.2, -1.6, 0.4, 0.6, '#d83a32'); },
    bunny(ctx, x, y, f, R) { R(-1.8, -5.0, 1.1, 4.4, '#f2f2f2'); R(0.7, -5.4, 1.1, 4.8, '#f2f2f2'); R(-1.5, -4.4, 0.5, 3, '#ff9ac6'); R(1.0, -4.8, 0.5, 3.2, '#ff9ac6'); },
    santa(ctx, x, y, f, R) { R(-2.5, -0.2, 5, 1, '#f2f2f2'); R(-2.0, -2.2, 3.6, 2, '#d83a32'); R(-1.0 - f * 0, -3.2, 2.4, 1.2, '#d83a32'); R(-3.0, -2.4, 1.2, 1.2, '#f2f2f2'); },
    pixel(ctx, x, y, f, R) { R(-2.6, -0.4, 5.2, 0.8, '#16181d'); R(-1.6, -2.6, 3.2, 2.2, '#16181d'); R(-1.6, -1.2, 3.2, 0.6, '#9b5de5'); }
  };
  C.hat = (id, ctx, x, y, f, R) => { const h = HATS[id]; if (h) h(ctx, x, y, f, R); };

  const FACES = {
    shades(ctx, p, R) { R(0.2, -0.8, 2.2, 0.9, '#0b0b0e'); R(-1.2, -0.6, 1.4, 0.3, '#0b0b0e'); },
    nerd(ctx, p, R) { R(0.4, -0.9, 1.4, 1.2, '#24272e'); R(0.6, -0.7, 1.0, 0.8, '#bfe8ff'); R(-1.2, -0.5, 1.6, 0.3, '#24272e'); },
    threed(ctx, p, R) { R(0.2, -0.8, 1.0, 0.9, '#e05050'); R(1.2, -0.8, 1.0, 0.9, '#4cc6ec'); R(-1.2, -0.6, 1.4, 0.3, '#f2f2f2'); },
    monocle(ctx, p, R) { R(0.6, -1.0, 1.2, 1.2, '#e3b94b'); R(0.8, -0.8, 0.8, 0.8, '#d6eef8'); R(1.1, 0.2, 0.3, 2.0, '#e3b94b'); },
    deal(ctx, p, R) { R(-1.0, -0.8, 3.6, 0.6, '#0b0b0e'); R(0.2, -0.2, 1.0, 0.5, '#0b0b0e'); R(1.6, -0.2, 1.0, 0.5, '#0b0b0e'); R(0.4, -0.7, 0.3, 0.3, '#ffffff'); },
    patch(ctx, p, R) { R(0.6, -0.9, 1.2, 1.2, '#0b0b0e'); R(-1.6, -1.6, 3.4, 0.3, '#0b0b0e'); },
    mustache(ctx, p, R) { R(0.6, 0.6, 1.8, 0.6, '#3a2618'); R(0.4, 1.0, 0.5, 0.4, '#3a2618'); R(2.2, 1.0, 0.5, 0.4, '#3a2618'); },
    clown(ctx, p, R) { R(2.0, -0.2, 1.0, 1.0, '#e03030'); },
    gasmask(ctx, p, R) { R(0.0, -0.2, 2.4, 2.2, '#3f4450'); R(0.6, -0.9, 1.4, 0.9, '#9fd8ff'); R(1.6, 1.0, 1.2, 1.2, '#24272e'); }
  };
  C.face = (ctx, p, HEAD) => {
    const id = WTP.shop?.pEq?.('face');
    if (!id || id === 'none' || !FACES[id] || C.hasHead()) return;
    const f = p.face || 1;
    const R = (dx, dy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(p.hx + (f > 0 ? dx : -dx - w), p.hy + dy, w, h); };
    FACES[id](ctx, p, R);
  };
  C.TRAILS = {
    hearts: { cols: ['#ff5f8f', '#ff9ac6'], g: -20 },
    code: { cols: ['#3fdc6a', '#9cf5b0'], g: 60 },
    fire: { cols: ['#ff9a2e', '#ffd34a', '#d9491c'], g: -40 },
    snow: { cols: ['#ffffff', '#d6eef8'], g: 20 },
    bubbles: { cols: ['#9fd8ff', '#d6eef8'], g: -30 },
    confetti: { cols: ['#ff6aa8', '#f4d03f', '#4cc6ec', '#a6e05a'], g: 80 },
    glitch: { cols: ['#ff3ad1', '#3dfff0', '#ffffff'], g: 0 }
  };

  C.preview = (id, scale = 3) => {
    const PX = WTP.PixCtx;
    if (!PX) return '';
    const H = 1.6 * K, TORSO = 4.5 * K, TH = 3.15 * K, UA = 2.35 * K;
    const hipX = 0, hipY = 0, nx = 0, ny = -TORSO, hx = 0.2, hy = ny - H * 1.05;
    const shX = 0, shY = ny + (hipY - ny) * 0.14;
    const L = (ax, ay, jx, jy, ex, ey) => ({ jx, jy, ex, ey });
    const p = { hipX, hipY, nx, ny, hx, hy, shX, shY, face: 1, aimA: 0.9,
      legs: [L(0, 0, 0.9, TH, 1.3, TH * 2), L(0, 0, -0.7, TH, -1.1, TH * 2)],
      armF: L(0, 0, 1.6, shY + UA * 0.9, 2.3, shY + UA * 1.8), armB: L(0, 0, -1.4, shY + UA * 0.9, -1.8, shY + UA * 1.8) };
    const pc = new PX(28, 34);
    pc.begin(-14, -22);
    WTP.shop?.pEq?.('costume');
    const save = WTP.save.pskin.eq.costume;
    WTP.save.pskin.eq.costume = id;
    try {
      C.draw(pc, p, 'back', H);
      const segs = [[hipX, hipY, nx, ny], [hipX, hipY, p.legs[0].jx, p.legs[0].jy, p.legs[0].ex, p.legs[0].ey], [hipX, hipY, p.legs[1].jx, p.legs[1].jy, p.legs[1].ex, p.legs[1].ey], [shX, shY, p.armB.jx, p.armB.jy, p.armB.ex, p.armB.ey], [shX, shY, p.armF.jx, p.armF.jy, p.armF.ex, p.armF.ey]];
      for (const s of segs) seg(pc, s, 1.1, '#ececec');
      disc(pc, hx, hy, H, '#ececec');
      C.draw(pc, p, 'body', H);
      C.draw(pc, p, 'head', H);
      C.draw(pc, p, 'front', H);
    } finally { if (save === undefined) delete WTP.save.pskin.eq.costume; else WTP.save.pskin.eq.costume = save; }
    const c = pc.toImage([10, 11, 14], document.createElement('canvas'));
    const out = document.createElement('canvas');
    out.width = c.width * scale; out.height = c.height * scale;
    const g = out.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(c, 0, 0, out.width, out.height);
    return out.toDataURL();
  };
})();
