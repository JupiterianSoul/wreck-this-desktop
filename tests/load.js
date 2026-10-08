const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const FIX = path.join(__dirname, 'fixtures');
function loadPng(file) {
  const buf = execFileSync('python3', [path.join(__dirname, 'rgba.py'), file], { maxBuffer: 1 << 26 });
  const w = buf.readUInt32LE(0), h = buf.readUInt32LE(4);
  return { w, h, data: new Uint8ClampedArray(buf.buffer, buf.byteOffset + 8, w * h * 4) };
}
function session(name) {
  const d = path.join(FIX, name);
  const j = (f) => JSON.parse(fs.readFileSync(path.join(d, f + '.json'), 'utf8'));
  const mons = j('monitors'), clients = j('clients'), layers = j('layers'), opts = j('options'), shell = j('shell');
  const m = mons[0];
  const s = m.scale;
  const layList = [];
  for (const [lvl, items] of Object.entries(layers[m.name].levels)) for (const it of items) layList.push({ ...it, level: +lvl });
  const monitor = { id: 0, name: m.name, x: 0, y: 0, w: Math.round(m.width / s), h: Math.round(m.height / s), pw: m.width, ph: m.height, scale: s, clients, layers: layList, focused: true, workspace: m.activeWorkspace };
  const bar = {}; for (const k of ['left', 'center', 'right']) bar[k] = shell.bar.layout[k].map((x) => x.id);
  const sess = { border: opts['general:border_size'], rounding: opts['decoration:rounding'], gaps: opts['general:gaps_out'], bar, monitors: [monitor], focused: m.name };
  return { sess, monitor, truth: j('truth'), shot: loadPng(path.join(d, 'shot-' + m.name + '.png')), dir: d };
}
module.exports = { loadPng, session, FIX };
