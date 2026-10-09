const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d !== undefined ? JSON.stringify(d) : ''); } else console.log('ok  ', m, d !== undefined ? JSON.stringify(d) : ''); };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev(`WTP.save.settings.mode = 'free'; WTP.game.restart(); WTP.game.stopLoop(); __wtd.tp(20, 20); true`);

    // Images are front cells, no pane-only screenshot patches are left
    const seg = await h.ev(`(() => { const W = WTP.world; let img = 0, paneImg = 0; for (let i = 0; i < W.w * W.gh; i++) { if (W.mat[i] === 1 && W.kind[i] === W.K_IMG) img++; if (!W.mat[i] && W.back[i] && W.mtl[i] === W.M.IMAGE) paneImg++; } return { img, paneImg, total: W.total, front: W.frontTotal, panes: W.paneTotal }; })()`);
    ok(seg.img > 200 && seg.paneImg === 0, 'images are solid front cells', seg);
    ok(seg.total === seg.front + seg.panes, 'total counts front and panes', seg);

    // Shoot the middle of the biggest image: what is destroyed never shows its original pixels
    await h.shot('/tmp/wtd-shots/layers-before.png');
    const shot = await h.ev(`(() => {
      const W = WTP.world, R = WTP.deskRender, CP = W.CP;
      // A point well inside an image: every cell of a 13x13 box around it is image
      const isImg = (x, y) => W.mat[y * W.w + x] === 1 && W.kind[y * W.w + x] === W.K_IMG;
      let cx = -1, cy = -1;
      for (let y = 8; y < W.gh - 8 && cx < 0; y += 2) for (let x = 8; x < W.w - 8; x += 2) { let all = true; for (let dy = -6; dy <= 6 && all; dy++) for (let dx = -6; dx <= 6; dx++) if (!isImg(x + dx, y + dy)) { all = false; break; } if (all) { cx = x + 0.5; cy = y + 0.5; break; } }
      const before = WTP.modes.pct(true);
      const killed = [];
      for (let y = Math.floor(cy - 3); y <= cy + 3; y++) for (let x = Math.floor(cx - 3); x <= cx + 3; x++) if (W.mat[y * W.w + x] === 1) killed.push(y * W.w + x);
      W.carve(cx, cy, 4, { pow: 1.4 });
      W.flush(); R.flush();
      const hi = R.hiCv.getContext('2d').getImageData(0, 0, R.hiCv.width, R.hiCv.height).data, sh = R.shot32();
      let same = 0, checked = 0;
      for (const i of killed) {
        if (W.mat[i] === 1) continue;
        const x = (i % W.w) * CP + 1, y = ((i / W.w) | 0) * CP + 1, o = y * R.hiCv.width + x;
        const a = sh[o], r = hi[o * 4], g = hi[o * 4 + 1], b = hi[o * 4 + 2];
        checked++;
        if (Math.abs(r - (a & 255)) + Math.abs(g - ((a >>> 8) & 255)) + Math.abs(b - ((a >>> 16) & 255)) < 12) same++;
      }
      const i0 = Math.round(cy) * W.w + Math.round(cx);
      return { cx, cy, checked, same, php: W.php[i0], max: W.paneMax(i0), back: W.back[i0], before, after: WTP.modes.pct(true) };
    })()`);
    ok(shot.checked > 10 && shot.same / shot.checked < 0.2, 'destroyed image cells do not show their own pixels', shot);
    ok(shot.back === 1 && shot.php < shot.max, 'one shot wears the pane', shot);
    await h.shot('/tmp/wtd-shots/layers-shot.png');

    // Repeated hits: pane gone (wallpaper shows), then the wallpaper, then the void
    const wear = await h.ev(`(() => {
      const W = WTP.world, i0 = Math.round(${shot.cy}) * W.w + Math.round(${shot.cx});
      const steps = [];
      for (let k = 0; k < 12 && W.code[i0]; k++) { W.carve(${shot.cx}, ${shot.cy}, 4, { pow: 1.4 }); steps.push([W.back[i0], W.code[i0], W.php[i0]]); }
      return { steps, back: W.back[i0], code: W.code[i0], pct: WTP.modes.pct(true) };
    })()`);
    ok(wear.back === 0 && wear.code === 0 && wear.pct > shot.after, 'pane then wallpaper wear through to the void', wear);
    await h.ev('WTP.world.flush(); WTP.deskRender.flush(); WTP.game.renderNow(); true');
    await h.shot('/tmp/wtd-shots/layers-void.png');

    // Wearing a window's pane through along a line brings that part of the window down
    await h.ev(`WTP.game.restart(); WTP.game.stopLoop(); __wtd.tp(20, 20); true`);
    const fall = await h.ev(`(() => {
      const W = WTP.world, ST = WTP.structs;
      const w = ST.wins.filter((x) => x && x.reg?.type === 'window').sort((a, b) => (b.reg.x1 - b.reg.x0) * (b.reg.y1 - b.reg.y0) - (a.reg.x1 - a.reg.x0) * (a.reg.y1 - a.reg.y0))[0];
      const y = Math.round(w.reg.y0 + (w.reg.y1 - w.reg.y0) * 0.35);
      for (let pass = 0; pass < 8; pass++) for (let x = w.reg.x0 - 2; x <= w.reg.x1 + 2; x += 3) W.carve(x, y, 2.5, { pow: 1.4, debris: 0 });
      for (let k = 0; k < 30; k++) __wtd.step(4);
      return { state: w.state, slabs: ST.slabs.length };
    })()`);
    ok(fall.state !== 'static' || fall.slabs > 0, 'a worn-through pane drops the window', fall);
    ok(!(await h.ev('WTD.errors.length')), 'no page errors', await h.ev('WTD.errors.slice(0, 3)'));
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();
  console.log(fail ? 'LAYERS FAIL' : 'LAYERS OK');
  process.exit(fail ? 1 : 0);
})();
