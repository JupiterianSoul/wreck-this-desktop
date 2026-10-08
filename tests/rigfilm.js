const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { launch } = require('./harness.js');
(async () => {
  const fixture = process.argv[2] || 'tiled3';
  const out = path.join(require('os').tmpdir(), 'wtd-rig');
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const h = await launch({ fixture });
  await h.wait('window.WTD && WTD.ready', 30000);
  await h.ev('__wtd.step(60); WTP.game.stopLoop(); __wtd.tp(120, 380); __wtd.step(30)');
  const key = async (type, code, k) => h.S('Input.dispatchKeyEvent', { type, code, key: k, windowsVirtualKeyCode: 0 });
  const frames = [];
  const snap = async (label) => {
    await h.ev('WTP.game.renderNow()');
    const p = await h.ev('({ x: WTP.player.x, y: WTP.player.y })');
    const f = path.join(out, `f${String(frames.length).padStart(2, '0')}.png`);
    await h.shot(f);
    frames.push({ f, x: Math.round((p.x + 3) * 4), y: Math.round((p.y + 7) * 4), label });
  };
  await h.ev('__wtd.setAim(1, -0.2); __wtd.step(30)'); await snap('idle');
  await key('keyDown', 'KeyD', 'd');
  for (let k = 0; k < 4; k++) { await h.ev('__wtd.step(5)'); await snap('run' + k); }
  await key('keyDown', 'Space', ' '); await h.ev('__wtd.step(6)'); await key('keyUp', 'Space', ' '); await snap('jump');
  await h.ev('__wtd.step(18)'); await snap('fall');
  await key('keyUp', 'KeyD', 'd'); await h.ev('__wtd.step(40)');
  await key('keyDown', 'KeyS', 's'); await h.ev('__wtd.step(10)'); await snap('crouch');
  await key('keyDown', 'ControlLeft', 'Control'); await h.ev('__wtd.step(6)'); await snap('roll'); await key('keyUp', 'ControlLeft', 'Control');
  await key('keyUp', 'KeyS', 's'); await h.ev('__wtd.step(30)');
  await h.ev('WTP.player.ragdollStart(-200, -300); __wtd.step(12)'); await snap('ragdoll');
  await h.ev('__wtd.step(80)'); await snap('getup');
  const errs = await h.ev('WTD.errors');
  await h.close();
  fs.writeFileSync(path.join(out, 'frames.json'), JSON.stringify(frames));
  execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw
fr=json.load(open('${out}/frames.json'))
cols=5; rows=(len(fr)+cols-1)//cols; S=260
sheet=Image.new('RGB',(S*cols,S*rows),(40,40,40))
d=ImageDraw.Draw(sheet)
for i,f in enumerate(fr):
    im=Image.open(f['f']).convert('RGB')
    c=im.crop((f['x']-130,f['y']-150,f['x']+130,f['y']+110))
    sheet.paste(c,((i%cols)*S,(i//cols)*S))
    d.text(((i%cols)*S+4,(i//cols)*S+4),f['label'],fill=(255,80,80))
sheet.save('${out}/sheet.png')
`]);
  console.log('rig sheet', path.join(out, 'sheet.png'), 'errors', errs);
})();
