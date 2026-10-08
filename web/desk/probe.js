(() => {
  const WTD = window.WTD;
  document.documentElement.style.opacity = '0.01';
  const frames = [];
  let last = performance.now(), t0 = last;
  const tick = (t) => { frames.push(t - last); last = t; if (t - t0 < 12000) requestAnimationFrame(tick); else done(); };
  requestAnimationFrame(tick);
  let k = 0;
  const iv = setInterval(() => {
    k++;
    const W = WTP.world;
    if (k % 3 === 0) __wtd.explode(40 + Math.random() * (W.w - 80), 30 + Math.random() * (W.gh - 60), 10 + Math.random() * 12);
    if (k === 10) { __wtd.select('flame'); __wtd.setAim(1, 0.3); __wtd.fire(true); }
    if (k === 40) { __wtd.fire(false); __wtd.select('minigun'); __wtd.setAim(-1, 0.1); __wtd.fire(true); }
    if (k === 70) __wtd.fire(false);
    if (k === 75) { const w = WTP.structs.wins.find((w) => w && w.reg.app === 'terminal'); if (w) WTP.weapons.closeWindow(w.id, 300, 0); }
    if (k === 90) WTP.deskWeapons.bsod(false);
  }, 100);
  function done() {
    clearInterval(iv);
    const s = frames.slice(20).sort((a, b) => a - b);
    const pct = (p) => s[Math.min(s.length - 1, Math.floor(s.length * p))].toFixed(1);
    const avg = s.reduce((a, b) => a + b, 0) / s.length;
    const st = __wtd.stats;
    WTD.post({ t: 'log', msg: `PROBE frames ${s.length} avg ${avg.toFixed(2)}ms fps ${(1000 / avg).toFixed(1)} p50 ${pct(0.5)} p95 ${pct(0.95)} p99 ${pct(0.99)} max ${s[s.length - 1].toFixed(1)} work ${st.workMs.toFixed(2)} workMax ${st.workMax.toFixed(1)} q${st.quality} dpr ${devicePixelRatio} inner ${innerWidth}x${innerHeight} cv ${document.getElementById('cv').width} pct ${st.pct.toFixed(1)} chunks ${st.chunks} fx ${st.parts}` });
    setTimeout(() => WTD.quit('probe'), 200);
  }
})();
