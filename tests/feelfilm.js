const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { launch } = require('./harness.js');
(async () => {
  const ids = (process.argv[2] || 'pistol,revolver,smg,rifle,minigun,shotgun,double,flak,rocket,homing,plasma,flame,lava,saw,crossbow,firework,grenade,ballgun,nuke,meteor').split(',');
  const frames = +(process.argv[3] || 7);
  const out = path.join(require('os').tmpdir(), 'wtd-feel');
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const h = await launch({ fixture: 'tiled3' });
  await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true');
  await h.ev('__wtd.step(60); WTP.game.stopLoop(); WTP.game.allWeapons = () => true');
  const shots = [];
  for (const id of ids) {
    await h.ev(`WTP.world.reset && 0; __wtd.select('${id}'); __wtd.tp(150, 300); __wtd.setAim(1, -0.25); __wtd.step(20); __wtd.fire(true); __wtd.step(${frames}); __wtd.fire(false); WTP.game.renderNow(1/60)`);
    const p = await h.ev('({ x: WTP.player.x, y: WTP.player.y, S: __wtd.stats.S })');
    const f = path.join(out, id + '.png');
    await h.shot(f);
    shots.push({ id, f, x: Math.round(p.x * 4), y: Math.round(p.y * 4) });
  }
  const errs = await h.ev('WTD.errors');
  await h.close();
  fs.writeFileSync(path.join(out, 'shots.json'), JSON.stringify(shots));
  execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw
fr=json.load(open('${out}/shots.json'))
cols=4; W,H=420,220; rows=(len(fr)+cols-1)//cols
sheet=Image.new('RGB',(W*cols,H*rows),(40,40,40)); d=ImageDraw.Draw(sheet)
for i,f in enumerate(fr):
    im=Image.open(f['f']).convert('RGB')
    sc=im.width/1600
    x,y=f['x'],f['y']
    c=im.crop((x-60,y-140,x-60+W,y-140+H))
    sheet.paste(c,((i%cols)*W,(i//cols)*H)); d.text(((i%cols)*W+4,(i//cols)*H+4),f['id'],fill=(255,80,80))
sheet.save('${out}/sheet.png')
`]);
  console.log('feel sheet', path.join(out, 'sheet.png'), 'errors', JSON.stringify(errs));
})();
