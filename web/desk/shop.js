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

  // Weapon crates drop finishes; stickman crates each cover one category of the wardrobe.
  // Stickman crate prices are set so collecting a category costs about what buying it outright used to (duplicates refund 40%).
  const CRATES = [
    { id: 'costume', kind: 'player', slots: ['costume'], name: 'Costume Crate', price: 600, col: '#e05a8a', emblem: 'costume', w: [0, 50, 35, 15, 0] },
    { id: 'hat', kind: 'player', slots: ['hat'], name: 'Hat Crate', price: 140, col: '#d0a040', emblem: 'hat', w: [55, 28, 12, 5, 0] },
    { id: 'face', kind: 'player', slots: ['face'], name: 'Face Crate', price: 160, col: '#5ac8e0', emblem: 'face', w: [55, 28, 12, 5, 0] },
    { id: 'trail', kind: 'player', slots: ['trail'], name: 'Trail Crate', price: 200, col: '#ff7a3a', emblem: 'trail', w: [50, 28, 14, 5, 3] },
    { id: 'colour', kind: 'player', slots: ['body', 'scarf'], name: 'Colour Crate', price: 150, col: '#9b6bff', emblem: 'colour', w: [55, 25, 12, 5, 3] },
    { id: 'wreck', kind: 'weapon', name: 'Wreck Crate', price: 100, col: '#c8372d', emblem: 'gun', w: [70, 22, 6, 1.6, 0.4], fins: ['olive', 'desert', 'crimson', 'camo', 'tiger', 'chrome', 'toxic', 'gold', 'holo'] },
    { id: 'desktop', kind: 'weapon', name: 'Desktop Crate', price: 150, col: '#4cc6ec', emblem: 'window', w: [62, 26, 8, 3, 1], fins: ['slate', 'arctic', 'carbon', 'ocean', 'neon', 'candy', 'galaxy', 'rainbow'] },
    { id: 'glitch', kind: 'weapon', name: 'Glitch Crate', price: 250, col: '#ff3ad1', emblem: 'glitch', w: [45, 32, 14, 6.5, 2.5], fins: ['crimson', 'slate', 'carbon', 'neon', 'toxic', 'lava', 'galaxy', 'glitch', 'holo'] },
    { id: 'omarchy', kind: 'weapon', name: 'Omarchy Crate', price: 350, col: '#7fd07a', emblem: 'omarchy', w: [40, 34, 16, 7, 3], fins: ['woodgrain', 'blueprint', 'pixelcamo', 'zebra', 'sakura', 'circuit', 'marble', 'omarchy', 'damascus', 'sunset', 'terminal', 'void'] },
    { id: 'golden', kind: 'weapon', name: 'Golden Crate', price: 500, col: '#e3b94b', emblem: 'star', w: [0, 50, 30, 14, 6], fins: ['camo', 'ocean', 'chrome', 'candy', 'gold', 'lava', 'galaxy', 'damascus', 'holo', 'rainbow', 'glitch', 'void'] }
  ];

  // Wardrobe items: [id, name, rarity (null: free default), extra]. Halo and Crown are achievement rewards, not in any crate.
  const costumeRar = (p) => (p <= 1800 ? 'rare' : p <= 2500 ? 'epic' : 'legendary');
  const PLAYER = {
    costume: [['none', 'Default', null], ...(WTP.costumes ? WTP.costumes.list().map((d) => [d.id, d.name, costumeRar(d.price), d.sw]) : [])],
    body: [['theme', 'Theme', null, null], ['snow', 'Snow', null, '#f4f4f4'], ['cyan', 'Cyan', 'common', '#5ad4f0'], ['pink', 'Pink', 'common', '#ff7ab8'], ['lime', 'Lime', 'common', '#a6e05a'], ['ember', 'Ember', 'rare', '#ff7a3a'], ['shadow', 'Shadow', 'epic', '#55586a'], ['violet', 'Violet', 'epic', '#a78bfa'], ['gold', 'Gold', 'legendary', '#f0c850']],
    scarf: [['theme', 'Theme', null, null], ['none', 'No scarf', null, 'rgba(0,0,0,0)'], ['red', 'Red', 'common', '#d83a32'], ['blue', 'Blue', 'common', '#3e70d9'], ['green', 'Green', 'common', '#3fae5a'], ['purple', 'Purple', 'rare', '#9b5de5'], ['white', 'White', 'rare', '#f2f2f2'], ['black', 'Black', 'rare', '#16181d'], ['rainbow', 'Rainbow', 'mythic', 'rainbow']],
    hat: [['none', 'None', null], ['cap', 'Cap', 'common'], ['beanie', 'Beanie', 'common'], ['party', 'Party Hat', 'rare'], ['beret', 'Beret', 'rare'], ['headphones', 'Headphones', 'rare'], ['bunny', 'Bunny Ears', 'rare'], ['propeller', 'Propeller Cap', 'epic'], ['santa', 'Santa Hat', 'epic'], ['tophat', 'Top Hat', 'epic'], ['horns', 'Horns', 'epic'], ['cowboy', 'Cowboy Hat', 'epic'], ['pixel', 'Pixel Fedora', 'legendary'], ['viking', 'Viking Helmet', 'legendary'], ['halo', 'Halo', 'legendary', 'g:wave:hardcore:8'], ['crown', 'Crown', 'legendary', 'g:bosses:5']],
    face: [['none', 'None', null], ['mustache', 'Mustache', 'common'], ['clown', 'Clown Nose', 'common'], ['shades', 'Sunglasses', 'common'], ['nerd', 'Nerd Glasses', 'rare'], ['patch', 'Eye Patch', 'rare'], ['threed', '3D Glasses', 'rare'], ['monocle', 'Monocle', 'epic'], ['gasmask', 'Gas Mask', 'legendary'], ['deal', 'Pixel Shades', 'legendary']],
    trail: [['none', 'None', null], ['smoke', 'Smoke', 'common', ['#9aa0aa', '#c3c8cf']], ['sparks', 'Sparks', 'common', ['#ffd34a', '#ff8a2e']], ['snow', 'Snowflakes', 'common', null], ['bubbles', 'Bubbles', 'common', null], ['hearts', 'Hearts', 'rare', null], ['pixels', 'Pixels', 'rare', ['#4cc6ec', '#ff6aa8', '#a6e05a']], ['code', 'Source Code', 'epic', null], ['confetti', 'Confetti', 'epic', null], ['fire', 'Fire', 'epic', null], ['glitch', 'Glitch', 'mythic', null], ['rainbow', 'Rainbow', 'mythic', null]]
  };
  const SLOT_NAME = { costume: 'Costume', body: 'Body colour', scarf: 'Scarf', hat: 'Hat', face: 'Glasses and masks', trail: 'Trail' };
  const ANIMATED = new Set(['scarf:rainbow', 'trail:glitch', 'trail:rainbow']);

  const SV = () => {
    const s = WTP.save;
    if (typeof s.shards !== 'number') s.shards = 0;
    if (!s.wskins || typeof s.wskins !== 'object') s.wskins = {};
    s.wskins.owned = s.wskins.owned || {};
    s.wskins.eq = s.wskins.eq || {};
    if (!s.pskin || typeof s.pskin !== 'object') s.pskin = {};
    s.pskin.own = s.pskin.own || {};
    s.pskin.eq = s.pskin.eq || {};
    return s;
  };
  const shards = () => SV().shards;
  const spend = (n) => { const s = SV(); if (s.shards < n) return false; s.shards -= n; WTP.persist(); return true; };
  const earn = (n) => { if (n <= 0) return; SV().shards += Math.round(n); WTP.persist(); };

  const skinOf = (id) => SV().wskins.eq[id] || '';
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
  const pReq = (slot, id) => { const it = pItem(slot, id); return it && slot === 'hat' && typeof it[3] === 'string' ? it[3] : null; };
  // Things bought before crates replaced the shop stay owned (save.pskin.own)
  const pOwned = (slot, id) => { const it = pItem(slot, id); if (!it) return false; const req = pReq(slot, id); if (req) return !!WTP.save.ach?.done?.[req] || !!SV().pskin.own[`${slot}:${id}`]; return !it[2] || !!SV().pskin.own[`${slot}:${id}`]; };
  const crateFor = (slot) => CRATES.find((c) => c.kind === 'player' && c.slots.includes(slot));
  const pPool = (cr) => cr.slots.flatMap((slot) => PLAYER[slot].filter((it) => it[2] && !pReq(slot, it[0])).map((it) => ({ slot, id: it[0], rar: it[2] })));
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

  const rollRarity = (cr) => {
    const tot = cr.w.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot, ri = 0;
    for (; ri < cr.w.length - 1; ri++) { if (r < cr.w[ri]) break; r -= cr.w[ri]; }
    return ri;
  };
  // A drop: { w, fin } from a weapon crate, { slot, id } from a stickman crate; rar is its rarity index
  function rollCrate(cr) {
    const ri = rollRarity(cr);
    if (cr.kind === 'player') {
      const all = pPool(cr);
      let pool = all.filter((x) => RI[x.rar] === ri);
      for (let d = 1; !pool.length && d < 5; d++) pool = all.filter((x) => Math.abs(RI[x.rar] - ri) === d);
      const it = pool[(Math.random() * pool.length) | 0];
      return { slot: it.slot, id: it.id, rar: RI[it.rar] };
    }
    let pool = cr.fins.filter((f) => RI[F[f].rar] === ri);
    for (let d = 1; !pool.length && d < 5; d++) pool = cr.fins.filter((f) => Math.abs(RI[F[f].rar] - ri) === d);
    const fin = pool[(Math.random() * pool.length) | 0];
    const ws = WP.DEFS.filter((d) => d.sprite?.vector);
    const owned = ws.filter((d) => WTP.ach?.weaponOwned?.(d.id) ?? true);
    const pickFrom = Math.random() < 0.75 && owned.length ? owned : ws;
    const w = pickFrom[(Math.random() * pickFrom.length) | 0].id;
    return { w, fin, rar: RI[F[fin].rar] };
  }
  function grant(r) {
    const s = SV();
    let dup;
    if (r.slot) { const k = `${r.slot}:${r.id}`; dup = pOwned(r.slot, r.id); s.pskin.own[k] = 1; }
    else { const k = `${r.w}|${r.fin}`; dup = !!s.wskins.owned[k]; s.wskins.owned[k] = (s.wskins.owned[k] || 0) + 1; }
    let refund = 0;
    if (dup) { const cr = CRATES.find((c) => c.id === r.crate); refund = Math.round((cr?.price || 100) * 0.4); s.shards += refund; }
    WTP.persist();
    return { dup, refund };
  }

  const renderCrates = (body) => WTP.crates?.render?.(body);

  // The Skins tab is a wardrobe: everything you own, equipped here; locked things show as silhouettes with the crate they come from
  let skinFilter = 'player';
  const rarTag = (rar) => (rar ? `<em class="rtag" style="--rc:${RAR[RI[rar]].col}">${RAR[RI[rar]].name}</em>` : '');
  function itemArt(slot, id, it, own) {
    if (slot === 'costume' && id !== 'none') return `<img class="cprev${own ? '' : ' sil'}" alt="" src="${WTP.costumes?.preview?.(id, 3) || ''}">`;
    if (slot === 'body' || slot === 'scarf') return `<i class="sw${own ? '' : ' sil'}" style="background:${it[3] === 'rainbow' ? 'linear-gradient(90deg,#f55,#fd5,#5f5,#5df,#a5f)' : it[3] || 'var(--accent)'}"></i>`;
    const src = WTP.crates?.stickIcon?.({ [slot]: id }, 2);
    return src ? `<img class="pprev${own ? '' : ' sil'}" alt="" src="${src}">` : '';
  }
  function renderSkins(body) {
    const s = SV();
    const tabs = `<div class="ach-filter">${[['player', 'Stickman'], ['weapons', 'Weapon skins']].map(([k, l]) => `<button class="b${skinFilter === k ? ' on' : ''}" data-sf="${k}">${l}</button>`).join('')}</div>`;
    let inner = '';
    if (skinFilter === 'weapons') {
      const by = {};
      for (const k of Object.keys(s.wskins.owned)) { const [w, f] = k.split('|'); if (WP.BY[w] && F[f]) (by[w] = by[w] || []).push(f); }
      const ids = Object.keys(by).sort((a, b) => WP.BY[a].idx - WP.BY[b].idx);
      inner = ids.length ? `<div class="skin-grid">${ids.map((w) => `<div class="skw"><b>${esc(WP.BY[w].name)}</b><div class="skrow"><button class="sk${!s.wskins.eq[w] ? ' on' : ''}" data-w="${w}" data-f=""><img alt="" src="${skinIcon(w, '')}"><span>Default</span></button>${by[w].sort((a, b) => RI[F[b].rar] - RI[F[a].rar]).map((f) => `<button class="sk${s.wskins.eq[w] === f ? ' on' : ''}" data-w="${w}" data-f="${f}" style="--rc:${RAR[RI[F[f].rar]].col}"><img alt="" src="${skinIcon(w, f)}"><span>${esc(F[f].name)}</span></button>`).join('')}</div></div>`).join('')}</div>` : '<p class="muted">No weapon skins yet. Weapon crates drop them.</p>';
    } else {
      inner = Object.keys(PLAYER).map((slot) => {
        const list = PLAYER[slot], own = list.filter((it) => pOwned(slot, it[0])).length;
        return `<h3>${SLOT_NAME[slot]} <small>${own} / ${list.length}</small></h3><div class="pskins">${list.map((it) => {
          const [id, nm, rar] = it;
          const ok = pOwned(slot, id), eq = pEq(slot) === id, req = pReq(slot, id);
          const tag = eq ? 'Equipped' : ok ? 'Equip' : req ? `Needs: ${esc(WTP.ach?.BY?.[req]?.name || 'achievement')}` : `From the ${esc(crateFor(slot)?.name || 'crates')}`;
          return `<button class="ps${eq ? ' on' : ''}${ok ? '' : ' locked'}" data-slot="${slot}" data-id="${id}"${ok ? '' : ' aria-disabled="true"'}>${itemArt(slot, id, it, ok)}<b>${ok || !rar ? esc(nm) : '???'}</b>${rarTag(rar)}<span>${tag}</span></button>`;
        }).join('')}</div>`;
      }).join('');
    }
    body.innerHTML = `<h2>Wardrobe</h2><div class="ach-head"><span><i class="shard"></i><b>${fmt(s.shards)}</b> shards</span><span>Open crates in the Crates tab to fill it</span></div>${tabs}${inner}`;
    body.querySelectorAll('[data-sf]').forEach((b) => b.addEventListener('click', () => { skinFilter = b.dataset.sf; renderSkins(body); }));
    body.querySelectorAll('.sk').forEach((b) => b.addEventListener('click', () => { const w = b.dataset.w, f = b.dataset.f; if (f) s.wskins.eq[w] = f; else delete s.wskins.eq[w]; WTP.persist(); WTP.ui?.clearImgCache?.(); WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur); AU.play('select'); renderSkins(body); }));
    body.querySelectorAll('.ps').forEach((b) => b.addEventListener('click', () => {
      const slot = b.dataset.slot, id = b.dataset.id;
      if (!pOwned(slot, id)) { AU.play('deny'); return; }
      AU.play('select');
      s.pskin.eq[slot] = id;
      WTP.persist();
      renderSkins(body);
    }));
  }
  const equipDrop = (r) => { const s = SV(); if (r.slot) s.pskin.eq[r.slot] = r.id; else { s.wskins.eq[r.w] = r.fin; WTP.ui?.clearImgCache?.(); WTP.ui?.hudWeapons?.(G.slots(), WP.st.cur); } WTP.persist(); };

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
    // A continued run is paid only the difference since its last end
    earn(Math.max(0, run.shardsEarned - (run.shardsBanked || 0)));
    run.shardsBanked = Math.max(run.shardsBanked || 0, run.shardsEarned);
    const U = WTP.ui;
    if (U && !U.__shopResults) {
      U.__shopResults = true;
      const oRes = U.results;
      U.results = (r) => { if (r?.run?.shardsEarned) r.shards = r.run.shardsEarned; return oRes(r); };
    }
  };

  WTP.shop = { pEq, pOwned, pItem, pPool, F, RAR, RI, CRATES, PLAYER, SLOT_NAME, ANIMATED, shards, earn, spend, skinOf, skinFor, skinCanvas, skinIcon, renderCrates, renderSkins, drawHat, bodyColor, scarfColor, rollCrate, grant, equipDrop, runShards };
})();
