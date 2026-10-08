(() => {
  const WTP = window.WTP;
  const R = { ready: false };
  WTP.deskRender = R;
  let PW = 0, PH = 0, CP = 4, TILE = 32;
  let shot32 = null, wall32 = null, hiCv = null, hiCtx = null, hiImg = null, hpix = null;
  let wallImg = null;
  const W = () => WTP.world;

  const clamp8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  function addDelta(p, dr, dg, db, k) {
    let r = p & 255, g = (p >>> 8) & 255, b = (p >>> 16) & 255;
    if (k !== 1) { r *= k; g *= k; b *= k; }
    return ((255 << 24) | (clamp8(b + db) << 16) | (clamp8(g + dg) << 8) | clamp8(r + dr)) >>> 0;
  }

  R.init = (shot, wall) => {
    const Wd = W();
    PW = shot.w; PH = shot.h; CP = Wd.CP; TILE = Wd.TILE;
    shot32 = new Uint32Array(shot.data.buffer, shot.data.byteOffset, PW * PH);
    hiCv = document.createElement('canvas');
    hiCv.width = PW; hiCv.height = PH;
    hiCtx = hiCv.getContext('2d');
    hiImg = hiCtx.createImageData(PW, PH);
    hpix = new Uint32Array(hiImg.data.buffer);
    R.hiCv = hiCv;
    buildWall(wall);
    paintAll();
    R.ready = true;
  };

  function buildWall(img) {
    const Wd = W();
    const c = document.createElement('canvas');
    c.width = PW; c.height = PH;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (img && img.naturalWidth) {
      const k = Math.max(PW / img.naturalWidth, PH / img.naturalHeight);
      const w = img.naturalWidth * k, h = img.naturalHeight * k;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, (PW - w) / 2, (PH - h) / 2, w, h);
    } else {
      const th = WTP.deskTheme || {};
      const bg = th.background || '#121213';
      const gr = g.createLinearGradient(0, 0, PW * 0.3, PH);
      gr.addColorStop(0, bg); gr.addColorStop(1, th.dark_background || '#0b0b0c');
      g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
      let sr = 0, sg = 0, sb = 0, sn = 0;
      for (let i = 0; i < Wd.gh * Wd.w; i += 7) if (Wd.wvis[i]) { const v = Wd.ocol[i]; sr += v & 255; sg += (v >>> 8) & 255; sb += (v >>> 16) & 255; sn++; }
      if (sn > 50) { g.globalAlpha = 0.85; g.fillStyle = `rgb(${(sr / sn) | 0},${(sg / sn) | 0},${(sb / sn) | 0})`; g.fillRect(0, 0, PW, PH); g.globalAlpha = 1; }
      g.globalAlpha = 0.06;
      for (let k = 0; k < 40; k++) { g.strokeStyle = k & 1 ? '#fff' : '#000'; g.lineWidth = 2 + (k % 5) * 3; g.beginPath(); g.arc(((k * 7919) % PW), ((k * 104729) % PH), 80 + (k * 37) % 400, 0, Math.PI * 2); g.stroke(); }
      g.globalAlpha = 1;
    }
    wall32 = new Uint32Array(g.getImageData(0, 0, PW, PH).data.buffer);
    const w = Wd.w;
    for (let cy = 0; cy < Wd.gh; cy++) for (let cx = 0; cx < w; cx++) {
      const i = cy * w + cx;
      if (!Wd.wvis[i]) continue;
      const px0 = cx * CP, py0 = cy * CP;
      for (let dy = 0; dy < CP && py0 + dy < PH; dy++) {
        const o = (py0 + dy) * PW + px0;
        for (let dx = 0; dx < CP && px0 + dx < PW; dx++) wall32[o + dx] = shot32[o + dx];
      }
    }
  }
  R.setWallpaper = (img) => {
    wallImg = img;
    if (!R.ready) return;
    buildWall(img);
    paintAll();
  };

  function paintCell(i, cx, cy) {
    const Wd = W();
    const m = Wd.mat[i];
    const px0 = cx * CP, py0 = cy * CP;
    if (px0 >= PW || py0 >= PH) return;
    const ex = Math.min(CP, PW - px0), ey = Math.min(CP, PH - py0);
    let mode = 0, s = -1, flat = 0, dr = 0, dg = 0, db = 0, k = 1;
    if (m === 1 || m === 6 || m === 5) {
      s = Wd.src[i];
      if (s >= 0) {
        mode = 1;
        const c = Wd.col[i], o = Wd.ocol[s];
        if (c !== o) { dr = (c & 255) - (o & 255); dg = ((c >>> 8) & 255) - ((o >>> 8) & 255); db = ((c >>> 16) & 255) - ((o >>> 16) & 255); }
      } else { mode = 2; flat = Wd.col[i]; }
    } else if (m === 4 || m === 3) { mode = 2; flat = Wd.col[i]; }
    else if (Wd.back[i]) {
      if (Wd.ptex[i] && Wd.bcol[i] === Wd.obcol[i] && !(Wd.flag[i] & 1)) {
        const x = cx, w = Wd.w;
        const edge = (x > 0 && !Wd.back[i - 1]) || (x < w - 1 && !Wd.back[i + 1]) || (i >= w && !Wd.back[i - w]) || !Wd.back[i + w];
        if (edge) { mode = 2; flat = Wd.paneColor(i); } else { mode = 1; s = i; }
      } else { mode = 2; flat = Wd.paneColor(i); }
    } else if (Wd.code[i]) {
      mode = 3;
      if (Wd.wallEdge(i)) k = 0.55;
      else if (Wd.flag[i] & 1) k = (WTP.hash(cx, cy) & 3) ? 0.7 : 0.55;
    }
    if (mode === 0) {
      const v = R.xray ? 0 : 0xff000000;
      for (let dy = 0; dy < ey; dy++) hpix.fill(v, (py0 + dy) * PW + px0, (py0 + dy) * PW + px0 + ex);
      return;
    }
    if (mode === 2) {
      const f = (flat | 0xff000000) >>> 0;
      for (let dy = 0; dy < ey; dy++) hpix.fill(f, (py0 + dy) * PW + px0, (py0 + dy) * PW + px0 + ex);
      return;
    }
    let sbase, buf;
    if (mode === 3) { buf = wall32; sbase = py0 * PW + px0; }
    else { buf = shot32; const sw = Wd.w; const sx = (s % sw) * CP, sy = ((s / sw) | 0) * CP; sbase = sy * PW + sx; if (sx >= PW || sy >= PH) { for (let dy = 0; dy < ey; dy++) hpix.fill(0xff000000, (py0 + dy) * PW + px0, (py0 + dy) * PW + px0 + ex); return; } }
    const plain = !dr && !dg && !db && k === 1;
    for (let dy = 0; dy < ey; dy++) {
      const o = (py0 + dy) * PW + px0, so = sbase + dy * PW;
      if (plain) { for (let dx = 0; dx < ex; dx++) hpix[o + dx] = buf[so + dx] | 0xff000000; }
      else for (let dx = 0; dx < ex; dx++) hpix[o + dx] = addDelta(buf[so + dx], dr, dg, db, k);
    }
  }
  let touched = null;
  function paintTile(t) {
    const Wd = W();
    if (touched) touched[t] = 1;
    const tx = t % Wd.TW, ty = (t / Wd.TW) | 0;
    const x0 = tx * TILE, y0 = ty * TILE, x1 = Math.min(Wd.w, x0 + TILE), y1 = Math.min(Wd.gh, y0 + TILE);
    if (y0 >= Wd.gh) return;
    for (let cy = y0; cy < y1; cy++) for (let cx = x0; cx < x1; cx++) paintCell(cy * Wd.w + cx, cx, cy);
    const px = x0 * CP, py = y0 * CP;
    hiCtx.putImageData(hiImg, 0, 0, px, py, Math.min(PW - px, TILE * CP), Math.min(PH - py, TILE * CP));
  }
  function paintAll() {
    const Wd = W();
    for (let cy = 0; cy < Wd.gh; cy++) for (let cx = 0; cx < Wd.w; cx++) paintCell(cy * Wd.w + cx, cx, cy);
    hiCtx.putImageData(hiImg, 0, 0);
    Wd.takeHi();
  }
  R.invalidate = () => { if (R.ready) { paintAll(); if (touched) touched.fill(0); } };
  R.drawLevel = (ctx, full) => {
    const Wd = W();
    if (!touched || touched.length !== Wd.TW * Wd.TH) touched = new Uint8Array(Wd.TW * Wd.TH);
    if (full || !window.WTD.under) { ctx.drawImage(hiCv, 0, 0); return; }
    const T = TILE * CP;
    for (let ty = 0; ty < Wd.TH; ty++) {
      let tx = 0;
      while (tx < Wd.TW) {
        if (!touched[ty * Wd.TW + tx]) { tx++; continue; }
        let tx1 = tx;
        while (tx1 + 1 < Wd.TW && touched[ty * Wd.TW + tx1 + 1]) tx1++;
        const x = tx * T, y = ty * T, w = Math.min(PW - x, (tx1 - tx + 1) * T), h = Math.min(PH - y, T);
        if (w > 0 && h > 0) ctx.drawImage(hiCv, x, y, w, h, x, y, w, h);
        tx = tx1 + 1;
      }
    }
  };
  R.flush = () => {
    if (!R.ready) return 0;
    const l = W().takeHi();
    for (const t of l) paintTile(t);
    return l.length;
  };

  R.chunkTex = (c) => {
    if (c.tex) return c.tex;
    const Wd = W();
    const bw = c.bw, bh = c.bh;
    const cv = document.createElement('canvas');
    cv.width = bw * CP; cv.height = bh * CP;
    const g = cv.getContext('2d');
    const im = g.createImageData(cv.width, cv.height);
    const p32 = new Uint32Array(im.data.buffer);
    const cw = cv.width;
    for (let j = 0; j < c.n; j++) {
      const lx = Math.round(c.rel[j * 2] + c.ox - 0.5), ly = Math.round(c.rel[j * 2 + 1] + c.oy - 0.5);
      if (lx < 0 || ly < 0 || lx >= bw || ly >= bh) continue;
      const s = c.srcs ? c.srcs[j] : -1;
      const colr = c.cols[j];
      const ox = lx * CP, oy = ly * CP;
      if (s >= 0 && shot32) {
        const o = Wd.ocol[s];
        const dr = (colr & 255) - (o & 255), dg = ((colr >>> 8) & 255) - ((o >>> 8) & 255), db = ((colr >>> 16) & 255) - ((o >>> 16) & 255);
        const sx = (s % Wd.w) * CP, sy = ((s / Wd.w) | 0) * CP;
        for (let dy = 0; dy < CP; dy++) {
          if (sy + dy >= PH) break;
          const so = (sy + dy) * PW + sx, d = (oy + dy) * cw + ox;
          for (let dx = 0; dx < CP && sx + dx < PW; dx++) p32[d + dx] = (dr || dg || db) ? addDelta(shot32[so + dx], dr, dg, db, 1) : (shot32[so + dx] | 0xff000000) >>> 0;
        }
      } else {
        const f = colr === 0xff000001 ? 0xff1a1226 : (colr | 0xff000000) >>> 0;
        for (let dy = 0; dy < CP; dy++) p32.fill(f, (oy + dy) * cw + ox, (oy + dy) * cw + ox + CP);
      }
    }
    g.putImageData(im, 0, 0);
    c.tex = cv;
    return cv;
  };
  R.drawChunk = (ctx, c, shadow) => {
    const tex = R.chunkTex(c);
    ctx.save();
    ctx.translate(c.x * CP, c.y * CP);
    ctx.rotate(c.a);
    if (shadow) { ctx.globalAlpha = 0.35; ctx.filter = 'brightness(0)'; ctx.drawImage(tex, -c.ox * CP + 3, -c.oy * CP + 5); ctx.filter = 'none'; ctx.globalAlpha = 1; }
    ctx.drawImage(tex, -c.ox * CP, -c.oy * CP);
    ctx.restore();
  };

  const sparks = [];
  const isVoid = (x, y) => {
    const Wd = W();
    const cx = (x / CP) | 0, cy = (y / CP) | 0;
    if (cx < 0 || cy < 0 || cx >= Wd.w || cy >= Wd.gh) return false;
    const i = cy * Wd.w + cx;
    const m = Wd.mat[i];
    return (m === 0 || m === 2) && !Wd.back[i] && !Wd.code[i];
  };
  R.drawVoid = (ctx, dt, w, h) => {
    if (W().destroyed < 50) return;
    if (sparks.length < 900) for (let k = 0; k < 12; k++) sparks.push({ x: Math.random() * w, y: h + Math.random() * 40, vx: (Math.random() - 0.5) * 12, vy: -(10 + Math.random() * 40), life: 4 + Math.random() * 8, t: 0, s: 1 + Math.random() * 2.5, hue: Math.random() });
    for (let k = sparks.length - 1; k >= 0; k--) {
      const p = sparks[k];
      p.t += dt; p.x += (p.vx + Math.sin(p.t * 1.7 + k) * 8) * dt; p.y += p.vy * dt;
      if (p.t > p.life || p.y < -10) { sparks.splice(k, 1); continue; }
      if (!isVoid(p.x, p.y)) continue;
      const a = Math.min(1, p.t * 2) * (1 - p.t / p.life);
      ctx.globalAlpha = a * 0.9;
      ctx.fillStyle = p.hue < 0.6 ? '#ff8a3d' : p.hue < 0.85 ? '#ffd27a' : '#ff4d2e';
      ctx.fillRect(p.x, p.y, p.s, p.s);
    }
    ctx.globalAlpha = 1;
  };
  R.size = () => ({ PW, PH, CP });
})();
