(() => {
  const WTP = window.WTP;
  const WP = WTP.weapons, G = WTP.game, AU = WTP.audio, PL = () => WTP.player;
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const lumOf = (r, g, b) => (r * 0.3 + g * 0.59 + b * 0.11) / 255;
  const lerp = (a, b, t) => a + (b - a) * t;
  const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const ramp = (stops, t) => { t = Math.max(0, Math.min(0.999, t)); const k = t * (stops.length - 1), i = Math.floor(k); return mixC(stops[i], stops[i + 1], k - i); };
  const tone = (h) => { const c = hexRGB(h); const st = [mixC(c, [8, 8, 12], 0.72), mixC(c, [8, 8, 12], 0.35), c, mixC(c, [255, 255, 255], 0.45)]; return (r, g, b) => ramp(st, lumOf(r, g, b) * 1.15); };
  const hsl = (h, s, l) => { h = ((h % 360) + 360) % 360 / 360; const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }; return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]; };
  const hash = (x, y, s = 0) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const noise = (x, y, s = 0) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi; const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return lerp(lerp(a, b, fx), lerp(c, d, fx), fy); };

  const RAR = [
    { id: 'common', name: 'Common', col: '#9fb3c8' },
    { id: 'rare', name: 'Rare', col: '#4b69ff' },
    { id: 'epic', name: 'Epic', col: '#8847ff' },
    { id: 'legendary', name: 'Legendary', col: '#eb4b4b' },
    { id: 'mythic', name: 'Mythic', col: '#e4ae39' }
  ];
  const RI = Object.fromEntries(RAR.map((r, i) => [r.id, i]));
  const F = {};
  const fin = (id, name, rar, fn, anim) => { F[id] = { id, name, rar, fn, anim: !!anim }; };
  fin('olive', 'Olive Drab', 'common', tone('#6b7a3a'));
  fin('desert', 'Desert', 'common', tone('#c8a46a'));
  fin('arctic', 'Arctic', 'common', tone('#d6e4f0'));
  fin('crimson', 'Crimson', 'common', tone('#b8323a'));
  fin('slate', 'Slate', 'common', tone('#5a6474'));
  fin('camo', 'Woodland Camo', 'rare', (r, g, b, x, y) => { const n = noise(x / 3.2, y / 3.2, 7), L = lumOf(r, g, b); const c = n < 0.38 ? [46, 52, 32] : n < 0.62 ? [75, 90, 42] : [122, 122, 69]; return mixC(c, [0, 0, 0], (0.55 - L) * 0.5); });
  fin('carbon', 'Carbon Fiber', 'rare', (r, g, b, x, y) => { const L = lumOf(r, g, b), k = ((x >> 1) + (y >> 1)) & 1 ? 1.25 : 0.85; const v = (22 + L * 70) * k; return [v, v, v * 1.08]; });
  fin('tiger', 'Tiger Tooth', 'rare', (r, g, b, x, y) => { const L = lumOf(r, g, b); return Math.sin(x * 1.1 + y * 0.55 + noise(x / 4, y / 4, 3) * 3) > 0.55 ? [24, 18, 14] : ramp([[120, 50, 10], [230, 120, 30], [255, 200, 110]], L * 1.2); });
  fin('ocean', 'Deep Ocean', 'rare', (r, g, b, x, y) => ramp([[10, 30, 70], [27, 79, 138], [76, 198, 236], [200, 240, 255]], lumOf(r, g, b) * 0.8 + (y % 8) * 0.03));
  fin('chrome', 'Chrome', 'epic', (r, g, b, x, y) => { const L = lumOf(r, g, b), v = 0.5 + 0.5 * Math.sin(L * 7 + y * 0.9); return ramp([[40, 44, 52], [150, 158, 170], [235, 240, 248], [255, 255, 255]], v); });
  fin('neon', 'Neon Rider', 'epic', (r, g, b, x, y) => { const L = lumOf(r, g, b); return L > 0.55 ? [255, 60, 220] : L > 0.3 ? [60, 230, 255] : [30, 10, 50]; });
  fin('candy', 'Candy Cane', 'epic', (r, g, b, x, y) => { const L = lumOf(r, g, b), s = ((x + y) >> 1) % 3; return mixC(s === 0 ? [255, 120, 170] : s === 1 ? [255, 250, 250] : [140, 230, 200], [0, 0, 0], (0.5 - L) * 0.4); });
  fin('toxic', 'Toxic', 'epic', (r, g, b, x, y) => { const L = lumOf(r, g, b); return hash(x, y, 9) > 0.9 ? [220, 255, 120] : ramp([[20, 40, 10], [90, 200, 40], [190, 255, 90]], L * 1.2); });
  fin('gold', 'Solid Gold', 'legendary', (r, g, b, x, y) => ramp([[90, 58, 14], [180, 120, 30], [227, 185, 75], [255, 242, 176]], lumOf(r, g, b) * 1.1 + ((x + y) % 5 === 0 ? 0.15 : 0)));
  fin('lava', 'Magma', 'legendary', (r, g, b, x, y) => { const n = Math.abs(noise(x / 2.5, y / 2.5, 5) - 0.5); return n < 0.08 ? [255, 200, 60] : n < 0.14 ? [240, 90, 20] : mixC([42, 26, 20], [70, 40, 30], lumOf(r, g, b)); });
  fin('galaxy', 'Galaxy', 'legendary', (r, g, b, x, y) => { if (hash(x, y, 4) > 0.93) return [255, 255, 255]; const n = noise(x / 4, y / 4, 2); return mixC([20, 10, 50], [110, 40, 160], n * 0.8 + lumOf(r, g, b) * 0.3); });
  fin('holo', 'Hologram', 'mythic', (r, g, b, x, y, t) => hsl(x * 14 + y * 9 + t * 60, 0.75, 0.35 + lumOf(r, g, b) * 0.45), true);
  fin('rainbow', 'Rainbow Road', 'mythic', (r, g, b, x, y, t) => hsl(x * 26 - t * 60, 0.9, 0.3 + lumOf(r, g, b) * 0.45), true);
  fin('glitch', 'Corrupted', 'mythic', (r, g, b, x, y, t) => { const row = hash(y, t, 11); if (row > 0.75) return hash(x, y + t, 12) > 0.5 ? [255, 40, 200] : [40, 255, 230]; return row > 0.6 ? [g, b, r] : tone('#2a2d35')(r, g, b); }, true);
  fin('sakura', 'Sakura', 'rare', (r, g, b, x, y) => { const L = lumOf(r, g, b); if (hash(x >> 1, y >> 1, 21) > 0.82) return [255, 190, 215]; return ramp([[60, 30, 40], [150, 80, 100], [240, 200, 210]], L * 1.1); });
  fin('woodgrain', 'Walnut', 'common', (r, g, b, x, y) => { const L = lumOf(r, g, b), k = Math.sin(y * 1.3 + noise(x / 6, y / 2, 8) * 4) * 0.12; return ramp([[50, 30, 18], [110, 66, 38], [176, 122, 79]], L + k); });
  fin('blueprint', 'Blueprint', 'common', (r, g, b, x, y) => (x % 4 === 0 || y % 4 === 0) ? [180, 210, 255] : ramp([[15, 40, 90], [30, 80, 160]], lumOf(r, g, b)));
  fin('zebra', 'Zebra', 'rare', (r, g, b, x, y) => Math.sin(x * 0.9 + Math.sin(y * 0.6) * 2) > 0.2 ? [20, 20, 24] : [235, 235, 230]);
  fin('circuit', 'Circuit Board', 'epic', (r, g, b, x, y) => { const h = hash(x >> 1, y >> 1, 31); if ((x % 6 === 0 && h > 0.4) || (y % 5 === 0 && h < 0.5)) return [220, 190, 80]; return ramp([[10, 40, 20], [30, 110, 50]], lumOf(r, g, b)); });
  fin('marble', 'Marble', 'epic', (r, g, b, x, y) => { const v = Math.abs(Math.sin(x * 0.4 + noise(x / 3, y / 3, 13) * 5)); return v < 0.12 ? [120, 120, 130] : ramp([[200, 200, 205], [245, 245, 248]], lumOf(r, g, b)); });
  fin('damascus', 'Damascus', 'legendary', (r, g, b, x, y) => { const v = Math.sin(x * 0.7 + Math.sin(y * 0.9 + x * 0.2) * 3); return ramp([[40, 44, 52], [120, 128, 140], [220, 226, 236]], 0.4 + v * 0.3 + lumOf(r, g, b) * 0.2); });
  fin('sunset', 'Synth Sunset', 'legendary', (r, g, b, x, y) => ramp([[40, 10, 80], [200, 40, 120], [255, 140, 60], [255, 230, 120]], (y % 12) / 12 * 0.7 + lumOf(r, g, b) * 0.3));
  fin('pixelcamo', 'Digital Camo', 'rare', (r, g, b, x, y) => { const n = hash(x >> 1, y >> 1, 41); return n < 0.33 ? [40, 46, 56] : n < 0.66 ? [80, 92, 108] : [140, 150, 160]; });
  fin('terminal', 'Terminal', 'mythic', (r, g, b, x, y, t) => ((y + t) % 3 === 0 ? [20, 60, 30] : ramp([[5, 20, 10], [40, 200, 90], [180, 255, 200]], lumOf(r, g, b) * 1.1 + (hash(x, y, t) > 0.95 ? 0.4 : 0))), true);
  fin('void', 'Void', 'mythic', (r, g, b, x, y, t) => { const d = Math.sin(x * 0.5 + y * 0.3 - t * 1.2); return mixC([10, 0, 20], [150, 60, 255], Math.max(0, d) * 0.7 + lumOf(r, g, b) * 0.2); }, true);
  fin('omarchy', 'Omarchy', 'epic', (r, g, b) => { const th = WTP.deskTheme || {}; const st = [hexRGB(th.dark_background || '#0b0b0c'), hexRGB(th.background || '#121213'), hexRGB(th.accent || '#d8d8d8'), hexRGB(th.bright_foreground || th.foreground || '#eaeaea')]; return ramp(st, lumOf(r, g, b) * 1.2); });
  const FRAMES = 6;

  const CRATES = [
    { id: 'wreck', name: 'Wreck Crate', price: 100, col: '#c8372d', w: [70, 22, 6, 1.6, 0.4], fins: ['olive', 'desert', 'crimson', 'camo', 'tiger', 'chrome', 'toxic', 'gold', 'holo'] },
    { id: 'desktop', name: 'Desktop Crate', price: 150, col: '#4cc6ec', w: [62, 26, 8, 3, 1], fins: ['slate', 'arctic', 'carbon', 'ocean', 'neon', 'candy', 'galaxy', 'rainbow'] },
    { id: 'glitch', name: 'Glitch Crate', price: 250, col: '#ff3ad1', w: [45, 32, 14, 6.5, 2.5], fins: ['crimson', 'slate', 'carbon', 'neon', 'toxic', 'lava', 'galaxy', 'glitch', 'holo'] },
    { id: 'omarchy', name: 'Omarchy Crate', price: 350, col: '#7fd07a', w: [40, 34, 16, 7, 3], fins: ['woodgrain', 'blueprint', 'pixelcamo', 'zebra', 'sakura', 'circuit', 'marble', 'omarchy', 'damascus', 'sunset', 'terminal', 'void'] },
    { id: 'golden', name: 'Golden Crate', price: 500, col: '#e3b94b', w: [0, 50, 30, 14, 6], fins: ['camo', 'ocean', 'chrome', 'candy', 'gold', 'lava', 'galaxy', 'damascus', 'holo', 'rainbow', 'glitch', 'void'] }
  ];

  const PLAYER = {
    costume: [['none', 'Default', 0], ...(WTP.costumes ? WTP.costumes.list().map((d) => [d.id, d.name, d.price, d.sw]) : [])],
    body: [['theme', 'Theme', 0, null], ['snow', 'Snow', 0, '#f4f4f4'], ['cyan', 'Cyan', 300, '#5ad4f0'], ['pink', 'Pink', 300, '#ff7ab8'], ['lime', 'Lime', 300, '#a6e05a'], ['ember', 'Ember', 400, '#ff7a3a'], ['shadow', 'Shadow', 500, '#55586a'], ['violet', 'Violet', 500, '#a78bfa'], ['gold', 'Gold', 800, '#f0c850']],
    scarf: [['theme', 'Theme', 0, null], ['none', 'No scarf', 0, 'rgba(0,0,0,0)'], ['red', 'Red', 300, '#d83a32'], ['blue', 'Blue', 300, '#3e70d9'], ['green', 'Green', 300, '#3fae5a'], ['purple', 'Purple', 400, '#9b5de5'], ['white', 'White', 400, '#f2f2f2'], ['black', 'Black', 400, '#16181d'], ['rainbow', 'Rainbow', 800, 'rainbow']],
    hat: [['none', 'None', 0], ['cap', 'Cap', 500], ['beanie', 'Beanie', 500], ['party', 'Party Hat', 600], ['beret', 'Beret', 600], ['headphones', 'Headphones', 700], ['bunny', 'Bunny Ears', 700], ['propeller', 'Propeller Cap', 800], ['santa', 'Santa Hat', 800], ['tophat', 'Top Hat', 900], ['horns', 'Horns', 900], ['cowboy', 'Cowboy Hat', 900], ['pixel', 'Pixel Fedora', 1000], ['viking', 'Viking Helmet', 1100], ['halo', 'Halo', 1200, 'g:wave:hardcore:8'], ['crown', 'Crown', 1500, 'g:bosses:5']],
    face: [['none', 'None', 0], ['mustache', 'Mustache', 500], ['clown', 'Clown Nose', 500], ['shades', 'Sunglasses', 500], ['nerd', 'Nerd Glasses', 600], ['patch', 'Eye Patch', 600], ['threed', '3D Glasses', 700], ['monocle', 'Monocle', 900], ['gasmask', 'Gas Mask', 1200], ['deal', 'Pixel Shades', 1500]],
    trail: [['none', 'None', 0], ['smoke', 'Smoke', 500, ['#9aa0aa', '#c3c8cf']], ['sparks', 'Sparks', 600, ['#ffd34a', '#ff8a2e']], ['snow', 'Snowflakes', 600, null], ['bubbles', 'Bubbles', 600, null], ['hearts', 'Hearts', 700, null], ['pixels', 'Pixels', 800, ['#4cc6ec', '#ff6aa8', '#a6e05a']], ['code', 'Source Code', 900, null], ['confetti', 'Confetti', 900, null], ['fire', 'Fire', 1000, null], ['glitch', 'Glitch', 1300, null], ['rainbow', 'Rainbow', 1500, null]]
  };

  const SV = () => {
    const s = WTP.save;
    if (typeof s.shards !== 'number') s.shards = 0;
    if (!s.skins || typeof s.skins !== 'object') s.skins = {};
    s.skins.owned = s.skins.owned || {};
    s.skins.eq = s.skins.eq || {};
    if (!s.pskin || typeof s.pskin !== 'object') s.pskin = {};
    s.pskin.own = s.pskin.own || {};
    s.pskin.eq = s.pskin.eq || {};
    return s;
  };
  const shards = () => SV().shards;
  const spend = (n) => { const s = SV(); if (s.shards < n) return false; s.shards -= n; WTP.persist(); return true; };
  const earn = (n) => { if (n <= 0) return; SV().shards += Math.round(n); WTP.persist(); };

  const skinOf = (id) => SV().skins.eq[id] || '';
  const frameNow = () => Math.floor(performance.now() / 140) % FRAMES;
  const skinFor = (id) => { const f = F[skinOf(id)]; return f ? { key: f.id, fn: f.fn, frame: f.anim ? frameNow() : 0 } : null; };
  const skinCanvas = (id, f) => {
    const fi = F[skinOf(id)], sp = WP.BY[id]?.sprite;
    if (!fi || !sp?.vector) return null;
    const b = sp.skinBase({ key: fi.id, fn: fi.fn, frame: 0 });
    const c = document.createElement('canvas');
    c.width = b.width * f; c.height = b.height * f;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(b, 0, 0, c.width, c.height);
    return c;
  };
  const skinIcon = (id, finId, box = [58, 30]) => {
    const fi = F[finId], sp = WP.BY[id]?.sprite;
    if (!sp?.vector) return '';
    const b = fi ? sp.skinBase({ key: fi.id, fn: fi.fn, frame: 0 }) : sp.base();
    const f = Math.max(1, Math.floor(Math.min(box[0] / b.width, box[1] / b.height)));
    const c = document.createElement('canvas');
    c.width = b.width * f; c.height = b.height * f;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(b, 0, 0, c.width, c.height);
    return c.toDataURL();
  };

  const pItem = (slot, id) => PLAYER[slot].find((x) => x[0] === id);
  const pEq = (slot) => SV().pskin.eq[slot] || PLAYER[slot][0][0];
  const pOwned = (slot, id) => { const it = pItem(slot, id); return !!it && (it[2] === 0 || !!SV().pskin.own[`${slot}:${id}`]); };
  const pReq = (slot, id) => { const it = pItem(slot, id); return it && slot === 'hat' ? it[3] : null; };
  const bodyColor = () => pItem('body', pEq('body'))?.[3] || null;
  const scarfColor = () => { const v = pItem('scarf', pEq('scarf'))?.[3]; if (v === 'rainbow') { const c = hsl(performance.now() / 8, 0.85, 0.55); return `rgb(${c.map(Math.round).join(',')})`; } return v || null; };

  function drawHat(ctx, p, c, HEAD) {
    WTP.costumes?.draw?.(ctx, p, 'head', HEAD);
    WTP.costumes?.face?.(ctx, p, HEAD);
    const id = pEq('hat');
    if (id === 'none' || PL().dead || WTP.costumes?.hidesHat?.()) return;
    const x = p.hx, y = p.hy - HEAD, f = p.face || 1;
    const R = (dx, dy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + (f > 0 ? dx : -dx - w), y + dy, w, h); };
    if (id === 'cap') { R(-2.5, -1.2, 5, 1.6, '#d83a32'); R(1.5, -0.2, 2.6, 0.8, '#a82a24'); }
    else if (id === 'party') { ctx.fillStyle = '#ff6aa8'; ctx.beginPath(); ctx.moveTo(x - 2, y + 0.3); ctx.lineTo(x + 2, y + 0.3); ctx.lineTo(x + f * 0.5, y - 4.5); ctx.closePath(); ctx.fill(); R(-0.5, -5.5, 1.2, 1.2, '#ffd34a'); R(-1.2, -1.5, 2.2, 0.8, '#4cc6ec'); }
    else if (id === 'headphones') { R(-3.2, 0.6, 1.4, 2.6, '#24272e'); R(2.0, 0.6, 1.4, 2.6, '#24272e'); R(-2.6, -1.0, 5.4, 0.9, '#3f4450'); }
    else if (id === 'tophat') { R(-2.6, -0.3, 5.4, 1, '#16181d'); R(-1.7, -4.2, 3.6, 4, '#16181d'); R(-1.7, -1.4, 3.6, 0.8, '#d83a32'); }
    else if (id === 'horns') { R(-2.6, -1.6, 1.2, 1.8, '#d83a32'); R(1.6, -1.6, 1.2, 1.8, '#d83a32'); R(-3.2, -2.6, 1, 1.2, '#d83a32'); R(2.4, -2.6, 1, 1.2, '#d83a32'); }
    else if (id === 'halo') { ctx.strokeStyle = '#ffe07a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y - 2.4, 2.8, 0.9, 0, 0, Math.PI * 2); ctx.stroke(); }
    else if (id === 'crown') { ctx.fillStyle = '#f0c850'; ctx.beginPath(); ctx.moveTo(x - 2.6, y + 0.4); ctx.lineTo(x - 2.6, y - 2.6); ctx.lineTo(x - 1.3, y - 1.2); ctx.lineTo(x, y - 3.2); ctx.lineTo(x + 1.3, y - 1.2); ctx.lineTo(x + 2.6, y - 2.6); ctx.lineTo(x + 2.6, y + 0.4); ctx.closePath(); ctx.fill(); R(-0.4, -1.2, 1, 1, '#d83a32'); }
    else WTP.costumes?.hat?.(id, ctx, x, y, f, R);
  }

  let trailAcc = 0;
  WP.EXT.updates.push((dt) => {
    const id = pEq('trail');
    if (id === 'none' || !WTP.feel) return;
    const P = PL();
    const sp = Math.hypot(P.vx, P.vy);
    if (sp < 60 || P.dead) return;
    if ((trailAcc += dt * Math.min(3, sp / 80) * 30) < 1) return;
    trailAcc = 0;
    const it = pItem('trail', id);
    const ext = WTP.costumes?.TRAILS?.[id];
    const col = ext ? ext.cols[(Math.random() * ext.cols.length) | 0] : it[3] ? it[3][(Math.random() * it[3].length) | 0] : `rgb(${hsl(performance.now() / 4, 0.9, 0.6).map(Math.round).join(',')})`;
    const big = id === 'smoke';
    WTP.feel.parts.push({ x: P.x + P.w / 2 + (Math.random() - 0.5) * 3, y: P.y + P.h * (0.4 + Math.random() * 0.5), vx: -P.vx * 0.05, vy: big ? -10 : 0, t: 0, dur: big ? 0.6 : 0.4, c: col, r: big ? 1 : 0.5, grow: big ? 2 : 0, a: big ? 0.35 : 1, g: id === 'sparks' ? 60 : 0 });
  });

  function rollCrate(cr) {
    const tot = cr.w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot, ri = 0;
    for (; ri < cr.w.length - 1; ri++) { if (r < cr.w[ri]) break; r -= cr.w[ri]; }
    let pool = cr.fins.filter((f) => RI[F[f].rar] === ri);
    for (let d = 1; !pool.length && d < 5; d++) pool = cr.fins.filter((f) => Math.abs(RI[F[f].rar] - ri) === d);
    const fin = pool[(Math.random() * pool.length) | 0];
    const ws = WP.DEFS.filter((d) => d.sprite?.vector);
    const owned = ws.filter((d) => WTP.ach?.weaponOwned?.(d.id) ?? true);
    const pickFrom = Math.random() < 0.75 && owned.length ? owned : ws;
    const w = pickFrom[(Math.random() * pickFrom.length) | 0].id;
    return { w, fin };
  }
  function grant(r) {
    const s = SV();
    const k = `${r.w}|${r.fin}`;
    const dup = !!s.skins.owned[k];
    s.skins.owned[k] = (s.skins.owned[k] || 0) + 1;
    let refund = 0;
    if (dup) { const cr = CRATES.find((c) => c.id === r.crate); refund = Math.round((cr?.price || 100) * 0.4); s.shards += refund; }
    WTP.persist();
    return { dup, refund };
  }

  let openState = null;
  function renderCrates(body) {
    const s = SV();
    body.innerHTML = `<h2>Crates</h2>
      <div class="ach-head"><span><i class="shard"></i><b>${fmt(s.shards)}</b> shards</span><span>Duplicates refund 40%</span></div>
      <div class="crates">${CRATES.map((c) => `<div class="crate" style="--cc:${c.col};--cimg:url(${WTP.pixui?.crate?.(c.col) || ''})"><div class="cbox"><i></i></div><b>${esc(c.name)}</b><div class="codds">${RAR.map((r, i) => c.w[i] ? `<span style="color:${r.col}">${r.name} ${(c.w[i] / c.w.reduce((a, b) => a + b, 0) * 100).toFixed(c.w[i] < 2 ? 1 : 0)}%</span>` : '').join('')}</div><button class="b" data-crate="${c.id}"${s.shards < c.price ? ' disabled' : ''}><i class="shard"></i>${c.price}</button></div>`).join('')}</div>
      <div class="roulette" id="shopRoll" hidden></div>`;
    body.querySelectorAll('[data-crate]').forEach((b) => b.addEventListener('click', () => openCrate(body, b.dataset.crate)));
  }
  function openCrate(body, cid) {
    if (openState) return;
    const cr = CRATES.find((c) => c.id === cid);
    if (!cr || !spend(cr.price)) { AU.play('deny'); return; }
    const win = rollCrate(cr); win.crate = cid;
    const N = 46, WIN = 40;
    const items = Array.from({ length: N }, (_, i) => (i === WIN ? win : rollCrate(cr)));
    const box = body.querySelector('#shopRoll');
    box.hidden = false;
    box.innerHTML = `<div class="rtrack">${items.map((it) => { const f = F[it.fin], r = RAR[RI[f.rar]]; return `<div class="ritem" style="--rc:${r.col}"><img alt="" src="${skinIcon(it.w, it.fin, [92, 44])}"><span>${esc(WP.BY[it.w].name)}</span><em>${esc(f.name)}</em></div>`; }).join('')}</div><i class="rmark"></i>`;
    const track = box.querySelector('.rtrack');
    const IW = 132, bw = box.clientWidth || 900;
    const target = WIN * IW - bw / 2 + IW / 2 + (Math.random() - 0.5) * (IW * 0.7);
    const dur = 5200, t0 = performance.now();
    openState = { t0 };
    let lastTick = -1;
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / dur), x = target * ease(k);
      track.style.transform = `translateX(${-x}px)`;
      const idx = Math.floor((x + bw / 2) / IW);
      if (idx !== lastTick) { lastTick = idx; AU.play('click'); }
      if (k < 1) requestAnimationFrame(step);
      else {
        const g = grant(win);
        const f = F[win.fin], r = RAR[RI[f.rar]];
        AU.play(RI[f.rar] >= 3 ? 'unlock' : 'achieve');
        box.insertAdjacentHTML('beforeend', `<div class="reveal" style="--rc:${r.col}"><img alt="" src="${skinIcon(win.w, win.fin, [200, 90])}"><b>${esc(WP.BY[win.w].name)} | ${esc(f.name)}</b><span>${r.name}${f.anim ? ', animated' : ''}${g.dup ? `, duplicate: +${g.refund} shards` : ''}</span><div><button class="b" data-eq>Equip</button><button class="b" data-again>Open another</button><button class="b" data-close>Close</button></div></div>`);
        box.querySelector('[data-eq]').addEventListener('click', () => { SV().skins.eq[win.w] = win.fin; WTP.persist(); WTP.ui?.clearImgCache?.(); WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur); AU.play('select'); box.querySelector('[data-eq]').textContent = 'Equipped'; });
        box.querySelector('[data-again]').addEventListener('click', () => { openState = null; renderCrates(body); openCrate(body, cid); });
        box.querySelector('[data-close]').addEventListener('click', () => { openState = null; renderCrates(body); });
        openState = { done: true };
        setTimeout(() => { if (openState?.done) openState = null; }, 0);
      }
    };
    requestAnimationFrame(step);
  }

  let skinFilter = 'weapons';
  function renderSkins(body) {
    const s = SV();
    const tabs = `<div class="ach-filter">${[['weapons', 'Weapon skins'], ['player', 'Stickman']].map(([k, l]) => `<button class="b${skinFilter === k ? ' on' : ''}" data-sf="${k}">${l}</button>`).join('')}</div>`;
    let inner = '';
    if (skinFilter === 'weapons') {
      const by = {};
      for (const k of Object.keys(s.skins.owned)) { const [w, f] = k.split('|'); if (WP.BY[w] && F[f]) (by[w] = by[w] || []).push(f); }
      const ids = Object.keys(by).sort((a, b) => WP.BY[a].idx - WP.BY[b].idx);
      inner = ids.length ? `<div class="skin-grid">${ids.map((w) => `<div class="skw"><b>${esc(WP.BY[w].name)}</b><div class="skrow"><button class="sk${!s.skins.eq[w] ? ' on' : ''}" data-w="${w}" data-f=""><img alt="" src="${skinIcon(w, '')}"><span>Default</span></button>${by[w].sort((a, b) => RI[F[b].rar] - RI[F[a].rar]).map((f) => `<button class="sk${s.skins.eq[w] === f ? ' on' : ''}" data-w="${w}" data-f="${f}" style="--rc:${RAR[RI[F[f].rar]].col}"><img alt="" src="${skinIcon(w, f)}"><span>${esc(F[f].name)}</span></button>`).join('')}</div></div>`).join('')}</div>` : '<p class="muted">No skins yet. Open crates to get some.</p>';
    } else {
      const lbl = { costume: 'Costume', body: 'Body colour', scarf: 'Scarf', hat: 'Hat', face: 'Glasses and masks', trail: 'Trail' };
      inner = Object.keys(PLAYER).map((slot) => `<h3>${lbl[slot]}</h3><div class="pskins">${PLAYER[slot].map((it) => {
        const [id, nm, price] = it;
        const own = pOwned(slot, id), eq = pEq(slot) === id, req = pReq(slot, id), reqOk = !req || !!WTP.save.ach?.done?.[req];
        const sw = slot === 'costume' && id !== 'none' ? `<img class="cprev" alt="" src="${WTP.costumes?.preview?.(id, 3) || ''}">` : slot === 'body' || slot === 'scarf' ? `<i class="sw" style="background:${it[3] === 'rainbow' ? 'linear-gradient(90deg,#f55,#fd5,#5f5,#5df,#a5f)' : it[3] || 'var(--accent)'}"></i>` : '';
        const tag = eq ? 'Equipped' : own ? 'Equip' : !reqOk ? `Needs: ${esc(WTP.ach?.BY?.[req]?.name || 'achievement')}` : `<i class="shard"></i>${price}`;
        return `<button class="ps${eq ? ' on' : ''}${!own && !reqOk ? ' needs' : ''}" data-slot="${slot}" data-id="${id}">${sw}<b>${esc(nm)}</b><span>${tag}</span></button>`;
      }).join('')}</div>`).join('');
    }
    body.innerHTML = `<h2>Skins</h2><div class="ach-head"><span><i class="shard"></i><b>${fmt(s.shards)}</b> shards</span></div>${tabs}${inner}`;
    body.querySelectorAll('[data-sf]').forEach((b) => b.addEventListener('click', () => { skinFilter = b.dataset.sf; renderSkins(body); }));
    body.querySelectorAll('.sk').forEach((b) => b.addEventListener('click', () => { const w = b.dataset.w, f = b.dataset.f; if (f) s.skins.eq[w] = f; else delete s.skins.eq[w]; WTP.persist(); WTP.ui?.clearImgCache?.(); WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur); AU.play('select'); renderSkins(body); }));
    body.querySelectorAll('.ps').forEach((b) => b.addEventListener('click', () => {
      const slot = b.dataset.slot, id = b.dataset.id, it = pItem(slot, id);
      if (!pOwned(slot, id)) {
        const req = pReq(slot, id);
        if (req && !WTP.save.ach?.done?.[req]) { AU.play('deny'); return; }
        if (!spend(it[2])) { AU.play('deny'); return; }
        s.pskin.own[`${slot}:${id}`] = 1;
        AU.play('coin');
      } else AU.play('select');
      s.pskin.eq[slot] = id;
      WTP.persist();
      renderSkins(body);
    }));
  }

  const dayKey = () => new Date().toISOString().slice(0, 10);
  function runShards(run) {
    const Wd = WTP.world;
    const parts = [];
    const add = (label, n) => { n = Math.round(n); if (n > 0) parts.push([label, n]); };
    add('Destruction', Wd.destroyed / 700);
    add('Kills', run.kills || 0);
    add('Bosses', run.bossKilled ? 25 : 0);
    add('Combo', (run.maxCombo || 0) / 5);
    add('Waves', (run.wave || 0) * 4);
    const s = SV();
    if (s.lastDaily !== dayKey() && Wd.destroyed > 200) { s.lastDaily = dayKey(); add('First wreck of the day', 50); }
    return parts;
  }
  const oEnd = G.end;
  G.end = (reason) => {
    const run = G.run;
    const fresh = run && !run.ended;
    oEnd(reason);
    if (!fresh) return;
    const parts = runShards(run);
    run.shardParts = parts;
    run.shardsEarned = parts.reduce((a, p) => a + p[1], 0);
    earn(run.shardsEarned);
    const U = WTP.ui;
    if (U && !U.__shopResults) {
      U.__shopResults = true;
      const oRes = U.results;
      U.results = (r) => { if (r?.run?.shardsEarned) r.shards = r.run.shardsEarned; return oRes(r); };
    }
  };

  WTP.shop = { pEq, F, RAR, CRATES, PLAYER, shards, earn, spend, skinOf, skinFor, skinCanvas, skinIcon, renderCrates, renderSkins, drawHat, bodyColor, scarfColor, rollCrate, grant, runShards };
})();
