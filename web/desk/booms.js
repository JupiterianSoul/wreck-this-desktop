(() => {
  const WTP = window.WTP;
  const B = { list: [] };
  WTP.booms = B;
  const KINDS = {
    fire: { core: [255, 250, 225], hot: [255, 200, 80], mid: [255, 110, 40], cool: [170, 40, 30], smoke: [60, 56, 58] },
    plasma: { core: [255, 240, 255], hot: [240, 140, 255], mid: [160, 80, 255], cool: [80, 30, 140], smoke: [50, 40, 70] },
    ice: { core: [255, 255, 255], hot: [200, 245, 255], mid: [120, 200, 255], cool: [60, 110, 200], smoke: [150, 170, 190] },
    acid: { core: [250, 255, 220], hot: [210, 255, 110], mid: [110, 220, 70], cool: [40, 120, 50], smoke: [60, 80, 60] }
  };
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const ramp = (K, t) => (t < 0.15 ? mix(K.core, K.hot, t / 0.15) : t < 0.4 ? mix(K.hot, K.mid, (t - 0.15) / 0.25) : t < 0.7 ? mix(K.mid, K.cool, (t - 0.4) / 0.3) : mix(K.cool, K.smoke, (t - 0.7) / 0.3));
  const rand = (a, b) => a + Math.random() * (b - a);

  B.add = (x, y, r0, kind = 'fire') => {
    const r = r0 * 1.3;
    for (const e of B.list) {
      if (e.t > 0.12 || Math.hypot(e.x - x, e.y - y) > Math.max(e.r, r) * 0.7) continue;
      if (r > e.r) { e.x = (e.x + x) / 2; e.y = (e.y + y) / 2; }
      e.r = Math.min(Math.max(e.r, r) * 1.08, Math.max(e.r, r) + 6);
      e.dur = 0.45 + e.r * 0.012; e.life = 1.4 + e.r * 0.04; e.ring = e.r >= 8;
      return;
    }
    const K = KINDS[kind] || KINDS.fire;
    const q = WTP.world.quality;
    const blobs = [];
    const nb = Math.min(14, 4 + Math.round(r / 3)) * (q >= 1 ? 1 : 0.6);
    for (let k = 0; k < nb; k++) {
      const a = rand(0, Math.PI * 2), d = rand(0, r * 0.55);
      blobs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.8, r0: rand(0.25, 0.45) * r, r1: rand(0.55, 0.85) * r, vx: Math.cos(a) * rand(2, 8), vy: Math.sin(a) * rand(2, 6) - rand(4, 12), delay: rand(0, 0.08) });
    }
    const smokes = [];
    const ns = Math.min(12, 3 + Math.round(r / 4)) * (q >= 1 ? 1 : 0.5);
    for (let k = 0; k < ns; k++) {
      const a = rand(0, Math.PI * 2), d = rand(0, r * 0.7);
      smokes.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7, r0: rand(0.3, 0.5) * r, r1: rand(0.8, 1.3) * r, vx: Math.cos(a) * rand(2, 10) + rand(-3, 3), vy: -rand(6, 16), delay: rand(0.12, 0.3) });
    }
    B.list.push({ x, y, r, K, t: 0, dur: 0.45 + r * 0.012, life: 1.4 + r * 0.04, blobs, smokes, ring: r >= 8 });
    if (B.list.length > 18) B.list.shift();
  };
  B.clear = () => { B.list.length = 0; };
  B.draw = (ctx, dt) => {
    for (let k = B.list.length - 1; k >= 0; k--) {
      const e = B.list[k];
      e.t += dt;
      if (e.t > e.life) { B.list.splice(k, 1); continue; }
      const t = e.t;
      for (const s of e.smokes) {
        const lt = t - s.delay;
        if (lt <= 0) continue;
        const u = lt / (e.life - s.delay);
        if (u >= 1) continue;
        const r = s.r0 + (s.r1 - s.r0) * Math.min(1, u * 1.6);
        const x = e.x + s.x + s.vx * lt, y = e.y + s.y + s.vy * lt - lt * lt * 4;
        const a = 0.55 * Math.min(1, u * 5) * (1 - u) * (1 - u);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(e.K.smoke, a));
        g.addColorStop(0.6, rgba(e.K.smoke, a * 0.55));
        g.addColorStop(1, rgba(e.K.smoke, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalCompositeOperation = 'lighter';
      if (t < e.dur) {
        const u = t / e.dur;
        for (const b of e.blobs) {
          const lt = t - b.delay;
          if (lt <= 0) continue;
          const v = Math.min(1, lt / (e.dur - b.delay));
          const r = b.r0 + (b.r1 - b.r0) * Math.sqrt(v);
          const x = e.x + b.x + b.vx * lt, y = e.y + b.y + b.vy * lt;
          const c = ramp(e.K, v);
          const a = (1 - v) * (1 - v) * 0.5;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, rgba(mix(c, e.K.core, 0.25 * (1 - v)), a));
          g.addColorStop(0.45, rgba(c, a * 0.75));
          g.addColorStop(1, rgba(c, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
        if (u < 0.3) {
          const a = (1 - u / 0.3) * 0.7, r = e.r * (0.5 + u * 1.2);
          const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
          g.addColorStop(0, rgba(e.K.core, a));
          g.addColorStop(0.35, rgba(e.K.hot, a * 0.6));
          g.addColorStop(1, rgba(e.K.hot, 0));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      if (e.ring && t < 0.45) {
        const u = t / 0.45;
        ctx.strokeStyle = rgba(e.K.hot, (1 - u) * 0.55);
        ctx.lineWidth = Math.max(0.4, (1 - u) * e.r * 0.12);
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (0.6 + u * 1.9), 0, Math.PI * 2); ctx.stroke();
      }
    }
  };
})();
