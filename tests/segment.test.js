const assert = require('assert');
const { segment } = require('../web/desk/segment.js');
const { session } = require('./load.js');
let fail = 0;
function check(name, fn) { try { fn(); console.log('ok  ', name); } catch (e) { fail++; console.log('FAIL', name, e.message); } }
for (const name of ['tiled3', 'floating', 'fullscreen', 'single']) {
  const f = session(name);
  const r = segment({ shot: f.shot, monitor: f.monitor, session: f.sess });
  const wins = r.regions.filter((x) => x.type === 'window');
  const solid = r.cells.mat.reduce((a, b) => a + b, 0);
  console.log(`${name}: ${r.ms}ms grid ${r.gw}x${r.gh} windows ${wins.length} glyphs ${r.glyphs.length} words ${r.words.length} lines ${r.lines.length} widgets ${r.widgets.length} solid ${solid} imgTiles ${r.images}`);
  for (const w of wins) console.log(`   ${w.app} ${w.cls} cells ${w.x0},${w.y0}-${w.x1},${w.y1} title ${w.titleH} bolts ${w.bolts ? w.bolts.length : 0} lines ${r.lines.filter((l) => l.rid === w.id).length}`);
  check(name + ' grid', () => { assert.strictEqual(r.gw, 640); assert.strictEqual(r.gh, 400); });
  check(name + ' windows', () => assert.strictEqual(wins.length, JSON.parse(require('fs').readFileSync(f.dir + '/clients.json')).length));
  if (f.truth.term_lines) check(name + ' terminal lines', () => { const t = wins.find((w) => w.app === 'terminal'); const n = r.lines.filter((l) => l.rid === t.id).length; assert.ok(Math.abs(n - f.truth.term_lines) <= 2, `got ${n} want ${f.truth.term_lines}`); });
  if (f.truth.editor_lines) check(name + ' editor lines', () => { const t = wins.find((w) => w.app === 'editor'); const n = r.lines.filter((l) => l.rid === t.id && l.x1 * r.CP > (t.px.x + 330 * 1.6)).length; assert.ok(Math.abs(n - f.truth.editor_lines) <= 3, `got ${n} want ${f.truth.editor_lines}`); });
  if (f.truth.browser_words) check(name + ' browser words', () => { const t = wins.find((w) => w.app === 'browser'); const n = r.words.filter((l) => l.rid === t.id && l.y0 * r.CP > t.px.y + 90 * 1.6).length; assert.ok(Math.abs(n - f.truth.browser_words) <= f.truth.browser_words * 0.15, `got ${n} want ${f.truth.browser_words}`); });
  if (f.truth.image) check(name + ' image solid', () => { const [x, y, w, h] = f.truth.image.map((v) => Math.round(v * 1.6 / r.CP)); let k = 0, t = 0; for (let yy = y + 2; yy < y + h - 2; yy++) for (let xx = x + 2; xx < x + w - 2; xx++) { t++; if (r.cells.kind[yy * r.gw + xx] === 2) k++; } assert.ok(k / t > 0.6, `img frac ${(k / t).toFixed(2)}`); });
  if (name !== 'fullscreen') check(name + ' bar widgets', () => assert.ok(r.widgets.length >= 8, `got ${r.widgets.length}: ${r.widgets.map((w) => w.id).join(',')}`));
}
process.exit(fail ? 1 : 0);
