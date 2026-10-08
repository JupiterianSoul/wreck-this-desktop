const fs = require('fs');
const path = require('path');
const { launch } = require('../tests/harness.js');

const ARGS = { boom: 20, crash: 50, wood: 30, clank: 4, creak: 1, combo: 3, announce: 3, metalTick: 2, winSlam: 1 };
const write = process.argv.includes('--write');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const OUT = path.join(__dirname, '..', 'web', 'desk', 'sfx-levels.js');

(async () => {
  const h = await launch({ fixture: 'single' });
  await h.wait('window.WTD && WTD.ready', 30000);
  await h.ev('WTP.game.stopLoop(); 1');
  const list = await h.ev(`Object.entries(WTP.audio.META).map(([k, m]) => ({ k, cat: m.cat, target: m.target }))`);
  const rows = [];
  for (const { k, cat, target } of list) {
    if (only.length && !only.includes(k)) continue;
    const loop = k.startsWith('loop:');
    const name = loop ? k.slice(5) : k;
    const arg = ARGS[name] ?? null;
    const res = await h.ev(`(async () => { const out = []; for (let i = 0; i < 3; i++) { out.push(await WTP.audio.measure(${JSON.stringify(name)}, ${JSON.stringify(arg)}, ${loop}, null, true)); out.push(await WTP.audio.measure(${JSON.stringify(name)}, ${JSON.stringify(arg)}, ${loop}, null, false)); } return out; })()`);
    const raw = res.filter((_, i) => i % 2 === 0), cur = res.filter((_, i) => i % 2 === 1);
    const avg = (a, f) => a.reduce((s, x) => s + x[f], 0) / a.length;
    const loud = avg(raw, 'loud'), peak = Math.max(...raw.map((r) => r.peak));
    let trim = Math.max(-24, Math.min(24, target - loud));
    if (peak + trim > -1) trim = -1 - peak;
    rows.push({ k, cat, target, loud, peak, len: avg(raw, 'len'), zcr: avg(raw, 'zcr'), trim: Math.round(trim * 10) / 10, now: avg(cur, 'loud') });
  }
  await h.close();
  const pad = (s, n) => String(s).padEnd(n);
  const num = (x, n = 6) => (x <= -119 ? 'silent' : x.toFixed(1)).padStart(n);
  console.log(pad('sound', 18), pad('cat', 7), 'target', '  loud', '  peak', '   len', '   bright', '  trim', '   now');
  for (const r of rows.sort((a, b) => (a.cat === b.cat ? a.k.localeCompare(b.k) : a.cat.localeCompare(b.cat)))) {
    console.log(pad(r.k, 18), pad(r.cat, 7), num(r.target), num(r.loud), num(r.peak), r.len.toFixed(2).padStart(6), String(Math.round(r.zcr)).padStart(8), num(r.trim), num(r.now));
  }
  const bad = rows.filter((r) => r.loud <= -119 || r.len < 0.005);
  if (bad.length) console.log('SILENT', bad.map((r) => r.k).join(' '));
  const cats = {};
  for (const r of rows) (cats[r.cat] = cats[r.cat] || []).push(r.now);
  for (const [c, v] of Object.entries(cats)) { const s = v.filter((x) => x > -119); if (!s.length) continue; console.log('spread', pad(c, 7), `${Math.min(...s).toFixed(1)} .. ${Math.max(...s).toFixed(1)} dB over ${s.length}`); }
  if (write) {
    let prev = {};
    if (only.length) { try { const t = fs.readFileSync(OUT, 'utf8'); prev = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (e) { prev = {}; } }
    const lv = { ...prev };
    for (const r of rows) if (r.loud > -119) lv[r.k] = r.trim;
    const keys = Object.keys(lv).sort();
    fs.writeFileSync(OUT, `window.WTP.SFX_LEVELS = {\n${keys.map((k) => `  ${JSON.stringify(k)}: ${lv[k]}`).join(',\n')}\n};\n`);
    console.log('wrote', OUT, keys.length, 'levels');
  }
})().catch((e) => { console.error(e); process.exit(1); });
