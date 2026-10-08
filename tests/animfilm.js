const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { launch } = require('./harness.js');
(async () => {
  const out = path.join(require('os').tmpdir(), 'wtd-anim');
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const h = await launch({ fixture: 'tiled3' });
  await h.wait('window.WTD && WTD.ready', 30000);
  await h.ev('WTP.save.settings.unlockAll = true; __wtd.step(60); WTP.game.stopLoop()');
  const frames = [];
  const snap = async (label) => {
    await h.ev('WTP.game.renderNow()');
    const p = await h.ev('({ x: WTP.player.x, y: WTP.player.y })');
    const f = path.join(out, `f${String(frames.length).padStart(2, '0')}.png`);
    await h.shot(f);
    frames.push({ f, x: Math.round((p.x + 4) * 4), y: Math.round((p.y + 11) * 4), label });
  };
  await h.ev("__wtd.select('pistol'); __wtd.tp(120, 360); __wtd.setAim(1, -0.1); __wtd.step(30)"); await snap('aim');
  await h.ev('__wtd.step(60); WTP.player.idleT = 9; WTP.rig.relax = 3'); await snap('lowered');
  await h.ev('WTP.rig.relax = 4.6'); await snap('look');
  await h.ev('WTP.rig.relax = 6.5'); await snap('stretch');
  await h.ev('WTP.rig.relax = 8.6'); await snap('scratch');
  await h.ev('WTP.rig.relax = 11'); await snap('sit'); await h.ev("(() => { const P = WTP.player, Wd = WTP.world; for (let y = 300; y < 330; y++) for (let x = 200; x < 240; x++) Wd.setCell(x, y, WTP.P32['5'], Wd.M.METAL, 0); __wtd.tp(240 - P.w + 1.5, 300 - P.h); P.face = 1; __wtd.step(20); P.idleT = 9; WTP.rig.relax = 11; })()"); await snap('sit edge');
  await h.ev("__wtd.select('revolver'); WTP.weapons.st.reload = 0.8; WTP.weapons.st.reloadFor = 'revolver'; __wtd.step(4)"); await snap('reload');
  await h.ev("__wtd.select('grenade'); WTP.weapons.st.cd = 0.1; __wtd.fire(true); WTP.weapons.st.cd = 0.06; WTP.rig.relax = 0"); await snap('windup'); await h.ev('__wtd.fire(false); __wtd.step(30)');
  await h.ev(`(() => { const Wd = WTP.world, P = WTP.player; for (let y = 230; y < 330; y++) for (let x = 400; x < 420; x++) Wd.setCell(x, y, WTP.P32['5'], Wd.M.METAL, 0); __wtd.tp(400 - P.w - 0.3, 250); P.vy = 40; P.ground = false; })()`);
  await h.S('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 });
  await h.ev('__wtd.step(6)'); await snap('wallslide');
  await h.ev(`(() => { const Wd = WTP.world, P = WTP.player; for (let y = 230; y < 245; y++) for (let x = 400; x < 420; x++) { const i = y * Wd.w + x; Wd.mat[i] = Wd.HOLE; Wd.touch(i); } __wtd.tp(400 - P.w - 0.3, 245 + 8 - P.h); P.vy = 0; P.ground = false; })()`);
  await h.ev('__wtd.step(5)'); await snap('mantle');
  await h.S('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyD', key: 'd', windowsVirtualKeyCode: 68 });
  const errs = await h.ev('WTD.errors');
  await h.close();
  fs.writeFileSync(path.join(out, 'frames.json'), JSON.stringify(frames));
  execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw
fr=json.load(open('${out}/frames.json'))
cols=5; S=240; rows=(len(fr)+cols-1)//cols
sheet=Image.new('RGB',(S*cols,S*rows),(40,40,40)); d=ImageDraw.Draw(sheet)
for i,f in enumerate(fr):
    im=Image.open(f['f']).convert('RGB')
    c=im.crop((f['x']-60,f['y']-70,f['x']+60,f['y']+50)).resize((S,S),Image.NEAREST)
    sheet.paste(c,((i%cols)*S,(i//cols)*S)); d.text(((i%cols)*S+4,(i//cols)*S+4),f['label'],fill=(255,80,80))
sheet.save('${out}/sheet.png')
`]);
  console.log('anim sheet', path.join(out, 'sheet.png'), 'errors', JSON.stringify(errs));
})();
