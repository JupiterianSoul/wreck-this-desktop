const path = require('path');
const fs = require('fs');
const { launch } = require('./harness.js');
(async () => {
  const sheet = process.argv[2];
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    const r = await h.ev(`(() => {
      const out = [];
      for (const d of WTP.weapons.DEFS) {
        const s = d.sprite, p = d.pixelSprite;
        out.push({ id: d.id, vector: !!(s && s.vector), w: s && s.w, h: s && s.h, pw: p && p.w, ph: p && p.h });
      }
      return out;
    })()`);
    const missing = r.filter((x) => !x.vector).map((x) => x.id);
    if (missing.length) { ok = false; console.log('FAIL no recipe sprite:', missing.join(' ')); }
    const odd = r.filter((x) => x.vector && x.pw && (x.w < x.pw * 0.75 || x.w > x.pw * 1.6));
    for (const x of odd) console.log(`size ${x.id}: vector ${x.w}x${x.h} vs pixel ${x.pw}x${x.ph}`);
    console.log(`${r.length} weapons, ${r.length - missing.length} recipe sprites, ${odd.length} size outliers`);
    if (sheet) {
      const url = await h.ev(`(() => {
        const D = WTP.weapons.DEFS, cols = 10, cw = 150, ch = 90, c = document.createElement('canvas');
        c.width = cols * cw; c.height = Math.ceil(D.length / cols) * ch;
        const g = c.getContext('2d'); g.fillStyle = '#2a2d35'; g.fillRect(0, 0, c.width, c.height);
        D.forEach((d, i) => {
          const x = (i % cols) * cw, y = Math.floor(i / cols) * ch, ic = d.sprite.icon(3);
          const k = Math.min(1, (cw - 16) / ic.width, (ch - 26) / ic.height);
          g.imageSmoothingEnabled = false; g.drawImage(ic, x + (cw - ic.width * k) / 2, y + 6 + (ch - 26 - ic.height * k) / 2, ic.width * k, ic.height * k);
          if (d.pixelSprite) g.drawImage(d.pixelSprite.cv, x + 2, y + 2);
          g.fillStyle = '#ddd'; g.font = '12px sans-serif'; g.fillText(d.id, x + 4, y + ch - 6);
        });
        return c.toDataURL();
      })()`);
      fs.writeFileSync(sheet, Buffer.from(url.split(',')[1], 'base64'));
    }
    const errs = await h.ev('WTD.errors');
    if (errs && errs.length) { ok = false; console.log('errors', errs); }
  } finally { await h.close(); }
  console.log(ok ? 'PASS sprites' : 'FAIL sprites');
  process.exit(ok ? 0 : 1);
})();
