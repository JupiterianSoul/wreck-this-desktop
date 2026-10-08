(function (root) {
  const M = { PAPER: 0, INK: 1, GLASS: 2, METAL: 3, WOOD: 4, IMAGE: 5, BUTTON: 6, STONE: 7, PLASTIC: 8, GOLD: 9, RUBBER: 10, INKPEN: 11 };
  const K_BOX = 0, K_TEXT = 1, K_IMG = 2, K_GLASS = 3;
  const F_PIN = 8, F_FRAME = 32, F_TITLE = 64, F_BOLT = 128;
  const R_WALL = 0, R_BAR = 1;

  const APPS = [
    [/(alacritty|kitty|ghostty|foot|wezterm|konsole|gnome-terminal|xterm|terminal|tmux|herdr)/i, 'terminal', { frame: M.METAL, pane: M.GLASS, ink: M.GLASS }],
    [/(code|vscodium|zed|neovide|jetbrains|idea|pycharm|sublime|kate|gedit|helix|lapce|cursor)/i, 'editor', { frame: M.METAL, pane: M.PLASTIC, ink: M.INK }],
    [/(mpv|vlc|celluloid|netflix|youtube|imv|feh|loupe|eog|gwenview|swayimg|spotify|totem|showtime|photos)/i, 'media', { frame: M.METAL, pane: M.IMAGE, ink: M.IMAGE }],
    [/(chrom|firefox|brave|zen|librewolf|vivaldi|epiphany|qutebrowser|obsidian|typora|libreoffice|okular|zathura|evince|papers|notion|discord|signal|whatsapp|telegram|slack)/i, 'browser', { frame: M.METAL, pane: M.PAPER, ink: M.INK }],
    [/(nautilus|thunar|dolphin|nemo|files|settings|control|pavucontrol|blueman|gnome|org\.|kde|qt|gtk)/i, 'app', { frame: M.METAL, pane: M.PLASTIC, ink: M.INK }]
  ];
  function appKind(cls, title) {
    const s = `${cls || ''} ${title || ''}`;
    for (const [re, k, m] of APPS) if (re.test(cls || '')) return { kind: k, mats: m };
    for (const [re, k, m] of APPS) if (re.test(s)) return { kind: k, mats: m };
    return { kind: 'unknown', mats: { frame: M.METAL, pane: M.PAPER, ink: M.INK } };
  }

  const pack = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

  function insideRound(px, py, x, y, w, h, r) {
    if (px < x || py < y || px >= x + w || py >= y + h) return false;
    if (r <= 0) return true;
    const cx = px < x + r ? x + r : px > x + w - r ? x + w - r : px;
    const cy = py < y + r ? y + r : py > y + h - r ? y + h - r : py;
    const dx = px - cx, dy = py - cy;
    return dx * dx + dy * dy <= r * r;
  }

  function segment(opt) {
    const t0 = Date.now();
    const shot = opt.shot;
    const PW = shot.w, PH = shot.h;
    const u32 = new Uint32Array(shot.data.buffer, shot.data.byteOffset, PW * PH);
    const mon = opt.monitor, sess = opt.session || {};
    const s = mon.scale || 1;
    const CP = opt.cell || Math.max(2, Math.round(2.5 * s));
    const gw = Math.ceil(PW / CP), gh = Math.ceil(PH / CP), n = gw * gh;
    const border = Math.round((sess.border ?? 2) * s);
    const rounding = Math.round((sess.rounding ?? 0) * s);
    const L = (v) => Math.round(v * s);

    const rid = new Uint16Array(n);
    const mat = new Uint8Array(n), back = new Uint8Array(n), kind = new Uint8Array(n), mtl = new Uint8Array(n), flag = new Uint8Array(n), ptex = new Uint8Array(n), wvis = new Uint8Array(n);
    const col = new Uint32Array(n), bcol = new Uint32Array(n), gid = new Int32Array(n);
    const fgc = new Uint8Array(n);
    mtl.fill(M.STONE);

    const regions = [{ id: 0, type: 'wall' }, { id: 1, type: 'bar', present: false }];
    const clients = (mon.clients || []).slice();
    const anyFull = clients.some((c) => c.fullscreen > 0);
    const zkey = (c) => (c.fullscreen > 0 ? 3 : c.floating ? 2 : 1) * 1e6 - (c.focusHistoryID ?? 0);
    clients.sort((a, b) => zkey(a) - zkey(b));

    const rects = [];
    for (const c of clients) {
      const x = Math.round((c.at[0] - mon.x) * s), y = Math.round((c.at[1] - mon.y) * s);
      const w = Math.round(c.size[0] * s), h = Math.round(c.size[1] * s);
      const full = c.fullscreen > 0;
      const b = full ? 0 : border, r = full ? 0 : rounding;
      const ak = appKind(c.class, c.title);
      const reg = {
        id: regions.length, type: 'window', address: c.address, cls: c.class || '', title: c.title || '', app: ak.kind, mats: ak.mats,
        floating: !!c.floating, fullscreen: full, px: { x, y, w, h, b, r }, focus: c.focusHistoryID ?? 0
      };
      regions.push(reg);
      rects.push({ reg, ox: x - b, oy: y - b, ow: w + 2 * b, oh: h + 2 * b, or: r ? r + b : 0, ix: x, iy: y, iw: w, ih: h, ir: r });
    }
    const popups = [];
    let barRect = null;
    for (const l of mon.layers || []) {
      const ns = String(l.namespace || '');
      if (ns === 'wreck-this-desktop' || l.level < 2) continue;
      const x = Math.round(l.x * s), y = Math.round(l.y * s), w = Math.round(l.w * s), h = Math.round(l.h * s);
      if (w * h <= 0 || w * h > PW * PH * 0.6) continue;
      if (/bar|waybar|panel/i.test(ns) && h < L(80) && !barRect) {
        if (anyFull && l.level < 3) continue;
        barRect = { x, y, w, h };
        regions[1].present = true;
        regions[1].px = { x, y, w, h, b: 0, r: 0 };
        regions[1].ns = ns;
        regions[1].mats = { frame: M.METAL, pane: M.METAL, ink: M.METAL };
        continue;
      }
      const reg = { id: regions.length, type: 'popup', ns, cls: ns, title: ns, app: 'popup', mats: { frame: M.PLASTIC, pane: M.PLASTIC, ink: M.INK }, px: { x, y, w, h, b: 0, r: 0 } };
      regions.push(reg);
      popups.push({ reg, ox: x, oy: y, ow: w, oh: h, or: 0, ix: x, iy: y, iw: w, ih: h, ir: 0 });
    }
    const half = CP / 2;
    const paint = (R) => {
      const cx0 = Math.max(0, Math.floor(R.ox / CP)), cx1 = Math.min(gw - 1, Math.ceil((R.ox + R.ow) / CP));
      const cy0 = Math.max(0, Math.floor(R.oy / CP)), cy1 = Math.min(gh - 1, Math.ceil((R.oy + R.oh) / CP));
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const px = cx * CP + half, py = cy * CP + half;
        if (!insideRound(px, py, R.ox, R.oy, R.ow, R.oh, R.or)) continue;
        const i = cy * gw + cx;
        rid[i] = R.reg.id;
        const inner = insideRound(px, py, R.ix, R.iy, R.iw, R.ih, R.ir);
        flag[i] = inner ? 0 : F_FRAME;
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      }
      R.reg.x0 = x0; R.reg.y0 = y0; R.reg.x1 = x1; R.reg.y1 = y1;
    };
    for (const R of rects) paint(R);
    for (const R of popups) paint(R);
    if (barRect) {
      const R = { reg: regions[1], ox: barRect.x, oy: barRect.y, ow: barRect.w, oh: barRect.h, or: 0, ix: barRect.x, iy: barRect.y, iw: barRect.w, ih: barRect.h, ir: 0 };
      paint(R);
    }
    for (const reg of regions) if (reg.x0 == null) { reg.x0 = 0; reg.y0 = 0; reg.x1 = -1; reg.y1 = -1; }

    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      let r = 0, g = 0, b = 0, k = 0;
      const py0 = cy * CP, px0 = cx * CP;
      for (let dy = 0; dy < CP; dy++) {
        const py = py0 + dy;
        if (py >= PH) break;
        let o = py * PW + px0;
        for (let dx = 0; dx < CP; dx++, o++) {
          if (px0 + dx >= PW) break;
          const v = u32[o];
          r += v & 255; g += (v >>> 8) & 255; b += (v >>> 16) & 255; k++;
        }
      }
      const i = cy * gw + cx;
      col[i] = k ? pack((r / k) | 0, (g / k) | 0, (b / k) | 0) : pack(0, 0, 0);
    }

    const TS = 16 * CP;
    const tw = Math.ceil(PW / TS), th = Math.ceil(PH / TS);
    const bg1 = new Uint32Array(tw * th * 64), bg2 = new Uint32Array(tw * th * 64);
    const tileBusy = new Uint8Array(tw * th * 64);
    const tileKey = (tx, ty, r) => (ty * tw + tx) * 64 + (r & 63);
    const hist = new Uint32Array(4096), sumR = new Float64Array(4096), sumG = new Float64Array(4096), sumB = new Float64Array(4096);
    const touched = [];
    const regBg = new Map();
    function tileStats(tx, ty, r) {
      touched.length = 0;
      let total = 0;
      const ex = Math.min(PW, (tx + 1) * TS), ey = Math.min(PH, (ty + 1) * TS);
      for (let py = ty * TS; py < ey; py += 2) {
        const crow = ((py / CP) | 0) * gw;
        for (let px = tx * TS; px < ex; px += 2) {
          const ci = crow + ((px / CP) | 0);
          if (rid[ci] !== r || (flag[ci] & F_FRAME)) continue;
          const v = u32[py * PW + px];
          const q = ((v >>> 4) & 15) | (((v >>> 12) & 15) << 4) | (((v >>> 20) & 15) << 8);
          if (!hist[q]) touched.push(q);
          hist[q]++; sumR[q] += v & 255; sumG[q] += (v >>> 8) & 255; sumB[q] += (v >>> 16) & 255;
          total++;
        }
      }
      let b1 = -1, b2 = -1;
      for (const q of touched) { if (b1 < 0 || hist[q] > hist[b1]) { b2 = b1; b1 = q; } else if (b2 < 0 || hist[q] > hist[b2]) b2 = q; }
      const res = { total, f1: 0, f2: 0, c1: 0, c2: 0, uniq: touched.length };
      if (b1 >= 0) { res.f1 = hist[b1] / total; res.c1 = pack((sumR[b1] / hist[b1]) | 0, (sumG[b1] / hist[b1]) | 0, (sumB[b1] / hist[b1]) | 0); }
      if (b2 >= 0) { res.f2 = hist[b2] / total; res.c2 = pack((sumR[b2] / hist[b2]) | 0, (sumG[b2] / hist[b2]) | 0, (sumB[b2] / hist[b2]) | 0); }
      for (const q of touched) { hist[q] = 0; sumR[q] = 0; sumG[q] = 0; sumB[q] = 0; }
      return res;
    }
    const near = (a, b, t) => Math.abs((a & 255) - (b & 255)) <= t && Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255)) <= t && Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255)) <= t;
    const regionsInTile = new Map();
    for (let i = 0; i < n; i++) {
      const r = rid[i];
      if (!r) continue;
      const cx = i % gw, cy = (i / gw) | 0;
      const tx = ((cx * CP) / TS) | 0, ty = ((cy * CP) / TS) | 0;
      const key = tileKey(tx, ty, r);
      if (!regionsInTile.has(key)) regionsInTile.set(key, [tx, ty, r]);
    }
    for (const [key, [tx, ty, r]] of regionsInTile) {
      const st = tileStats(tx, ty, r);
      if (st.total < 24) { tileBusy[key] = 2; continue; }
      bg1[key] = st.c1;
      bg2[key] = st.f2 > 0.3 ? st.c2 : st.c1;
      tileBusy[key] = st.f1 < 0.22 && st.uniq > 40 ? 1 : 0;
      const rb = regBg.get(r) || { w: 0, c: st.c1 };
      if (st.total * st.f1 > rb.w) regBg.set(r, { w: st.total * st.f1, c: st.c1 });
    }
    for (const [key, [tx, ty, r]] of regionsInTile) {
      if (tileBusy[key] !== 2) continue;
      let found = 0;
      for (let d = 1; d <= 2 && !found; d++) for (let oy = -d; oy <= d && !found; oy++) for (let ox = -d; ox <= d && !found; ox++) {
        const k2 = tileKey(tx + ox, ty + oy, r);
        if (tx + ox >= 0 && ty + oy >= 0 && tx + ox < tw && ty + oy < th && regionsInTile.has(k2) && tileBusy[k2] !== 2) { bg1[key] = bg1[k2]; bg2[key] = bg2[k2]; found = 1; }
      }
      if (!found) { const rb = regBg.get(r); bg1[key] = rb ? rb.c : 0; bg2[key] = bg1[key]; }
      tileBusy[key] = 0;
    }

    const T = opt.threshold || 30;
    const fg = new Uint8Array(PW * PH);
    const tFg = new Float64Array(tw * th * 64), tTot = new Float64Array(tw * th * 64);
    for (let cy = 0; cy < gh; cy++) {
      for (let cx = 0; cx < gw; cx++) {
        const i = cy * gw + cx;
        const r = rid[i];
        if (!r || (flag[i] & F_FRAME)) continue;
        const tx = ((cx * CP) / TS) | 0, ty = ((cy * CP) / TS) | 0;
        const key = tileKey(tx, ty, r);
        const c1 = bg1[key], c2 = bg2[key];
        const rg = regions[r];
        if (rg.px && rg.px.r) {
          const p = rg.px, cr = p.r + p.b + CP * 2;
          const px = cx * CP + half, py = cy * CP + half;
          const nx = px < p.x + cr ? p.x : px > p.x + p.w - cr ? p.x + p.w : -1;
          const ny = py < p.y + cr ? p.y : py > p.y + p.h - cr ? p.y + p.h : -1;
          if (nx >= 0 && ny >= 0) { bcol[i] = c1; continue; }
        }
        bcol[i] = c1;
        if (tileBusy[key] === 1) continue;
        let cnt = 0;
        const py0 = cy * CP, px0 = cx * CP;
        for (let dy = 0; dy < CP; dy++) {
          const py = py0 + dy;
          if (py >= PH) break;
          let o = py * PW + px0;
          for (let dx = 0; dx < CP && px0 + dx < PW; dx++, o++) {
            const v = u32[o];
            if (!near(v, c1, T) && !near(v, c2, T)) { fg[o] = 1; cnt++; }
          }
        }
        fgc[i] = cnt;
        tFg[key] += cnt; tTot[key] += CP * CP;
        if (c2 !== c1 && !near(col[i], c1, 14) && near(col[i], c2, 14)) bcol[i] = c2;
      }
    }

    for (const [key] of regionsInTile) {
      if (tileBusy[key] === 0 && tTot[key] > CP * CP * 24 && tFg[key] / tTot[key] > 0.42) tileBusy[key] = 1;
    }
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      const i = cy * gw + cx, r = rid[i];
      if (!r || !fgc[i]) continue;
      const key = tileKey(((cx * CP) / TS) | 0, ((cy * CP) / TS) | 0, r);
      if (tileBusy[key] !== 1) continue;
      fgc[i] = 0;
      for (let dy = 0; dy < CP; dy++) { const o = (cy * CP + dy) * PW + cx * CP; if (cy * CP + dy < PH) fg.fill(0, o, Math.min(o + CP, (cy * CP + dy + 1) * PW)); }
    }
    const dense = new Uint8Array(n);
    for (let cy = 0; cy < gh; cy++) for (let cx = 0; cx < gw; cx++) {
      const i = cy * gw + cx, r = rid[i];
      if (!r || (flag[i] & F_FRAME)) continue;
      const rb = regBg.get(r);
      if (!rb) continue;
      let k = 0;
      for (let dy = 0; dy < CP; dy++) { const o = (cy * CP + dy) * PW + cx * CP; for (let dx = 0; dx < CP; dx++) if (!near(u32[o + dx], rb.c, T)) k++; }
      if (k >= CP * CP - 1) dense[i] = 1;
    }
    const seen = new Uint8Array(n), q = new Int32Array(n);
    const imgRects = [];
    for (let i0 = 0; i0 < n; i0++) {
      if (!dense[i0] || seen[i0]) continue;
      let qn = 0, h = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      q[qn++] = i0; seen[i0] = 1;
      while (h < qn) {
        const i = q[h++], x = i % gw, y = (i / gw) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        for (const j of [i - 1, i + 1, i - gw, i + gw]) if (j >= 0 && j < n && dense[j] && !seen[j] && rid[j] === rid[i0] && Math.abs((j % gw) - x) <= 1) { seen[j] = 1; q[qn++] = j; }
      }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (qn >= 60 && bw >= 6 && bh >= 6 && qn / (bw * bh) > 0.45) {
        const rg = regions[rid[i0]];
        const area = (rg.x1 - rg.x0 + 1) * (rg.y1 - rg.y0 + 1);
        if (bw * bh > area * 0.45) { rg.imagePane = true; (rg.paneRects = rg.paneRects || []).push({ x0, y0, x1, y1 }); }
        else imgRects.push({ x0, y0, x1, y1, rid: rid[i0] });
      }
    }
    const isImg = new Uint8Array(n);
    for (const R of imgRects) for (let y = R.y0; y <= R.y1; y++) for (let x = R.x0; x <= R.x1; x++) {
      const i = y * gw + x;
      if (rid[i] !== R.rid || (flag[i] & F_FRAME)) continue;
      isImg[i] = 1;
      fgc[i] = 0;
      for (let dy = 0; dy < CP; dy++) { const o = (y * CP + dy) * PW + x * CP; if (y * CP + dy < PH) fg.fill(0, o, Math.min(o + CP, (y * CP + dy + 1) * PW)); }
    }
    const parent = new Int32Array(PW * PH);
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const unite = (a, b) => { a = find(a); b = find(b); if (a !== b) { if (a < b) parent[b] = a; else parent[a] = b; } };
    for (let y = 0; y < PH; y++) {
      const row = y * PW;
      for (let x = 0; x < PW; x++) {
        const o = row + x;
        if (!fg[o]) continue;
        parent[o] = o;
        if (x > 0 && fg[o - 1]) unite(o, o - 1);
        if (y > 0) {
          const up = o - PW;
          if (fg[up]) unite(o, up);
          if (x > 0 && fg[up - 1]) unite(o, up - 1);
          if (x < PW - 1 && fg[up + 1]) unite(o, up + 1);
        }
      }
    }
    const comp = new Map();
    for (let y = 0; y < PH; y++) {
      const row = y * PW;
      for (let x = 0; x < PW; x++) {
        const o = row + x;
        if (!fg[o]) continue;
        const r = find(o);
        let c = comp.get(r);
        if (!c) { c = { x0: x, y0: y, x1: x, y1: y, n: 0, rid: rid[((y / CP) | 0) * gw + ((x / CP) | 0)] }; comp.set(r, c); }
        if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
        c.n++;
      }
    }
    const maxGH = L(34), maxGW = L(40), minGH = Math.max(2, L(1.5));
    const glyphs = [];
    const compGlyph = new Map();
    for (const [r, c] of comp) {
      const h = c.y1 - c.y0 + 1, w = c.x1 - c.x0 + 1;
      if (h <= maxGH && w <= maxGW && (h >= minGH || w >= minGH) && c.n >= 2) {
        c.g = glyphs.length;
        glyphs.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, n: c.n, rid: c.rid, parts: [r] });
        compGlyph.set(r, c.g);
      } else c.g = -1;
    }
    const byRid = new Map();
    glyphs.forEach((g, k) => { if (!byRid.has(g.rid)) byRid.set(g.rid, []); byRid.get(g.rid).push(k); });
    const lines = [], words = [];
    const dead = new Uint8Array(glyphs.length);
    for (const [r, list] of byRid) {
      list.sort((a, b) => glyphs[a].x0 - glyphs[b].x0);
      const hs = list.map((k) => glyphs[k].y1 - glyphs[k].y0 + 1).sort((a, b) => a - b);
      const medH = hs[hs.length >> 1] || L(10);
      for (const k of list) {
        const g = glyphs[k];
        const h = g.y1 - g.y0 + 1;
        if (h > medH * 0.4) continue;
        let best = -1, bd = 1e9;
        for (const k2 of list) {
          if (k2 === k || dead[k2]) continue;
          const g2 = glyphs[k2];
          if (g2.y1 - g2.y0 + 1 <= h) continue;
          if (g.x1 < g2.x0 - 1 || g.x0 > g2.x1 + 1) continue;
          const gap = g2.y0 - g.y1;
          if (gap >= -1 && gap < medH * 0.6 && gap < bd) { bd = gap; best = k2; }
        }
        if (best >= 0) {
          const g2 = glyphs[best];
          g2.x0 = Math.min(g2.x0, g.x0); g2.y0 = Math.min(g2.y0, g.y0); g2.x1 = Math.max(g2.x1, g.x1); g2.y1 = Math.max(g2.y1, g.y1); g2.n += g.n;
          g2.parts.push(...g.parts);
          dead[k] = 1;
        }
      }
      const alive = list.filter((k) => !dead[k]).sort((a, b) => glyphs[a].x0 - glyphs[b].x0);
      const open = [];
      for (const k2 of alive) {
        const g2 = glyphs[k2];
        const h2 = g2.y1 - g2.y0 + 1;
        let cur = null, bo = 0;
        for (const l of open) {
          if (g2.x0 - l.x1 > medH * 7) continue;
          const ov = Math.min(l.by1, g2.y1) - Math.max(l.by0, g2.y0) + 1;
          const need = Math.min(h2, l.by1 - l.by0 + 1) * 0.4;
          if (ov >= need && ov > bo) { bo = ov; cur = l; }
        }
        if (!cur) {
          cur = { rid: r, x0: g2.x0, y0: g2.y0, x1: g2.x1, y1: g2.y1, by0: g2.y0, by1: g2.y1, glyphs: [], wcur: null, idx: lines.length };
          lines.push(cur); open.push(cur);
        }
        let wcur = cur.wcur;
        if (wcur && g2.x0 - wcur.x1 > medH * 0.42) wcur = null;
        if (!wcur) { wcur = { rid: r, x0: g2.x0, y0: g2.y0, x1: g2.x1, y1: g2.y1, glyphs: [], line: cur.idx }; words.push(wcur); cur.wcur = wcur; }
        cur.glyphs.push(k2); wcur.glyphs.push(k2);
        cur.x1 = Math.max(cur.x1, g2.x1); cur.y0 = Math.min(cur.y0, g2.y0); cur.y1 = Math.max(cur.y1, g2.y1);
        if (h2 >= medH * 0.6) { cur.by0 = Math.min(cur.by0, g2.y0); cur.by1 = Math.max(cur.by1, g2.y1); }
        wcur.x1 = Math.max(wcur.x1, g2.x1); wcur.y0 = Math.min(wcur.y0, g2.y0); wcur.y1 = Math.max(wcur.y1, g2.y1);
        g2.line = cur.idx; g2.word = words.length - 1;
        for (let q = open.length - 1; q >= 0; q--) if (g2.x0 - open[q].x1 > medH * 7) open.splice(q, 1);
      }
    }
    for (const l of lines) { delete l.wcur; delete l.by0; delete l.by1; delete l.idx; }
    const remap = new Int32Array(glyphs.length).fill(-1);
    const outGlyphs = [];
    glyphs.forEach((g, k) => {
      if (dead[k]) return;
      remap[k] = outGlyphs.length;
      outGlyphs.push(g);
    });
    for (const [r, c] of comp) if (c.g >= 0) { let g = c.g; if (dead[g]) { for (const k of byRid.get(c.rid) || []) if (!dead[k] && glyphs[k].parts.includes(r)) { g = k; break; } } c.g = dead[g] ? -1 : remap[g]; }
    for (const l of lines) l.glyphs = l.glyphs.map((k) => remap[k]).filter((k) => k >= 0);
    for (const w of words) w.glyphs = w.glyphs.map((k) => remap[k]).filter((k) => k >= 0);

    for (const g of outGlyphs) {
      const sw = 6, sh = 8;
      let sig = 0;
      const gw2 = g.x1 - g.x0 + 1, gh2 = g.y1 - g.y0 + 1;
      for (let yy = 0; yy < sh; yy++) for (let xx = 0; xx < sw; xx++) {
        const px = g.x0 + Math.floor(((xx + 0.5) * gw2) / sw), py = g.y0 + Math.floor(((yy + 0.5) * gh2) / sh);
        if (fg[py * PW + px]) sig = (Math.imul(sig, 31) + (yy * sw + xx + 1)) | 0;
      }
      g.sig = (Math.imul(sig, 131) + Math.round((gw2 / gh2) * 8)) >>> 0;
      delete g.parts;
    }

    const imgTiles = [];
    for (const [key, [tx, ty, r]] of regionsInTile) if (tileBusy[key] === 1) imgTiles.push([tx, ty, r]);
    for (let i = 0; i < n; i++) {
      const r = rid[i];
      const cx = i % gw, cy = (i / gw) | 0;
      if (!r) { mtl[i] = M.STONE; wvis[i] = 1; continue; }
      const reg = regions[r];
      const mats = reg.mats || { frame: M.METAL, pane: M.PAPER, ink: M.INK };
      back[i] = 1;
      if (flag[i] & F_FRAME) { mat[i] = 1; kind[i] = K_BOX; mtl[i] = mats.frame; bcol[i] = col[i]; continue; }
      const tx = ((cx * CP) / TS) | 0, ty = ((cy * CP) / TS) | 0;
      const key = tileKey(tx, ty, r);
      if (reg.paneRects && reg.paneRects.some((q) => cx >= q.x0 && cx <= q.x1 && cy >= q.y0 && cy <= q.y1)) { mtl[i] = M.IMAGE; ptex[i] = 1; bcol[i] = col[i]; continue; }
      if (tileBusy[key] === 1 || isImg[i]) {
        mat[i] = 1; kind[i] = K_IMG; mtl[i] = M.IMAGE; bcol[i] = col[i]; ptex[i] = 0;
        continue;
      }
      mtl[i] = mats.pane;
      if (fgc[i] >= 3) {
        mat[i] = 1;
        let lab = -1, best = 0;
        const py0 = cy * CP, px0 = cx * CP;
        for (let dy = 0; dy < CP && lab < 0; dy++) for (let dx = 0; dx < CP; dx++) {
          const o = (py0 + dy) * PW + px0 + dx;
          if (py0 + dy < PH && px0 + dx < PW && fg[o]) { const cc = comp.get(find(o)); if (cc && cc.g >= 0) { lab = cc.g; break; } best++; }
        }
        if (lab >= 0) { gid[i] = lab + 1; kind[i] = K_TEXT; mtl[i] = mats.ink; }
        else { kind[i] = K_BOX; mtl[i] = mats.pane === M.GLASS ? M.GLASS : mats.pane === M.METAL ? M.METAL : M.PLASTIC; }
      } else ptex[i] = fgc[i] ? 2 : 1;
    }

    for (const reg of regions) {
      if (reg.type !== 'window' || reg.fullscreen) continue;
      const p = reg.px;
      const top = Math.max(0, Math.floor((p.y - p.b) / CP));
      const bolts = [];
      const span = reg.x1 - reg.x0;
      const nb = Math.max(2, 1 + Math.round(span / (600 / 2.5)));
      for (let k = 0; k < nb; k++) {
        const bx = Math.round(reg.x0 + 3 + ((span - 6) * k) / (nb - 1));
        let by = top;
        for (let yy = top; yy < top + 4 && yy < gh; yy++) if (rid[yy * gw + bx] === reg.id && (flag[yy * gw + bx] & F_FRAME)) { by = yy; break; }
        bolts.push({ x: bx, y: by });
        for (let dy = 0; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = bx + dx, yy = by + dy;
          if (xx < 0 || yy < 0 || xx >= gw || yy >= gh) continue;
          const i = yy * gw + xx;
          if (rid[i] === reg.id && mat[i]) { flag[i] |= F_PIN | F_BOLT; mtl[i] = M.METAL; }
        }
      }
      reg.bolts = bolts;
      let tb = 0;
      const inner0 = Math.ceil(p.y / CP), maxTb = Math.round(L(60) / CP);
      const rowBg = (cy) => {
        const tx = (((reg.x0 + reg.x1) / 2 * CP) / TS) | 0, ty = ((cy * CP) / TS) | 0;
        return bcol[cy * gw + Math.round((reg.x0 + reg.x1) / 2)] || bg1[tileKey(tx, ty, reg.id)];
      };
      const b0 = rowBg(inner0 + 1);
      for (let cy = inner0 + 1; cy < Math.min(gh, inner0 + maxTb); cy++) {
        if (!near(rowBg(cy), b0, 6)) { tb = cy - inner0; break; }
      }
      if (tb >= Math.round(L(18) / CP)) {
        reg.titleH = tb;
        for (let cy = inner0; cy < inner0 + tb; cy++) for (let cx = reg.x0; cx <= reg.x1; cx++) { const i = cy * gw + cx; if (rid[i] === reg.id && !(flag[i] & F_FRAME)) flag[i] |= F_TITLE; }
      } else reg.titleH = 0;
    }

    const widgets = [];
    const bar = regions[1];
    if (bar.present) {
      const gl = outGlyphs.map((g, k) => ({ g, k })).filter((o) => o.g.rid === 1).sort((a, b) => a.g.x0 - b.g.x0);
      const clusters = [];
      const gapMax = L(11);
      for (const o of gl) {
        const last = clusters[clusters.length - 1];
        if (last && o.g.x0 - last.x1 <= gapMax) { last.x1 = Math.max(last.x1, o.g.x1); last.y0 = Math.min(last.y0, o.g.y0); last.y1 = Math.max(last.y1, o.g.y1); last.glyphs.push(o.k); }
        else clusters.push({ x0: o.g.x0, x1: o.g.x1, y0: o.g.y0, y1: o.g.y1, glyphs: [o.k] });
      }
      for (const [r, c] of comp) if (c.rid === 1 && c.g < 0 && c.n > 6) clusters.push({ x0: c.x0, x1: c.x1, y0: c.y0, y1: c.y1, glyphs: [] });
      clusters.sort((a, b) => a.x0 - b.x0);
      const merged = [];
      for (const c of clusters) { const last = merged[merged.length - 1]; if (last && c.x0 - last.x1 <= gapMax) { last.x1 = Math.max(last.x1, c.x1); last.y0 = Math.min(last.y0, c.y0); last.y1 = Math.max(last.y1, c.y1); last.glyphs.push(...c.glyphs); } else merged.push({ ...c, glyphs: c.glyphs.slice() }); }
      const lay = sess.bar || { left: [], center: [], right: [] };
      const sides = { left: [], center: [], right: [] };
      for (const c of merged) { const mx = (c.x0 + c.x1) / 2; (mx < PW * 0.36 ? sides.left : mx > PW * 0.64 ? sides.right : sides.center).push(c); }
      for (const side of ['left', 'center', 'right']) {
        const ids = (lay[side] || []).slice();
        const cs = sides[side];
        const names = side === 'right' ? ids.slice(-cs.length) : ids.slice(0, cs.length);
        if (side === 'right') while (names.length < cs.length) names.unshift('');
        cs.forEach((c, k) => widgets.push({
          id: names[k] || `${side}-${k}`, side,
          x0: Math.max(0, Math.floor(c.x0 / CP) - 1), x1: Math.min(gw - 1, Math.ceil(c.x1 / CP) + 1),
          y0: Math.max(bar.y0, Math.floor(c.y0 / CP) - 1), y1: Math.min(bar.y1, Math.ceil(c.y1 / CP) + 1)
        }));
      }
    }

    const cellGlyphs = outGlyphs.map((g) => ({
      x0: Math.floor(g.x0 / CP), y0: Math.floor(g.y0 / CP), x1: Math.floor(g.x1 / CP), y1: Math.floor(g.y1 / CP),
      px: [g.x0, g.y0, g.x1 - g.x0 + 1, g.y1 - g.y0 + 1], rid: g.rid, sig: g.sig, line: g.line ?? -1, word: g.word ?? -1
    }));
    const toCells = (o) => ({ rid: o.rid, glyphs: o.glyphs, x0: Math.floor(o.x0 / CP), y0: Math.floor(o.y0 / CP), x1: Math.floor(o.x1 / CP), y1: Math.floor(o.y1 / CP), line: o.line });
    return {
      CP, gw, gh, PW, PH,
      cells: { rid, mat, back, kind, mtl, flag, ptex, wvis, col, bcol, gid, fgc },
      regions, glyphs: cellGlyphs, words: words.map(toCells), lines: lines.map(toCells), widgets, images: imgTiles.length, imgRects,
      ms: Date.now() - t0
    };
  }

  const api = { segment, appKind, M, K_BOX, K_TEXT, K_IMG, K_GLASS, F_PIN, F_FRAME, F_TITLE, F_BOLT };
  root.WTDSegment = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof document === 'undefined' && typeof module === 'undefined') {
    self.onmessage = (e) => {
      const r = segment(e.data);
      const c = r.cells;
      self.postMessage(r, Object.values(c).map((a) => a.buffer));
    };
  }
})(typeof self !== 'undefined' ? self : globalThis);
