const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { launch } = require('./harness.js');
(async () => {
  const ids = (process.argv[2] || 'zoom,captcha,cookies,theme,wsportal,peeler,deadpixel,pixelsort').split(',');
  const after = +(process.argv[3] || 40);
  const out = path.join(require('os').tmpdir(), 'wtd-desk');
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const h = await launch({ fixture: 'tiled3' });
  await h.wait('window.WTD && WTD.ready', 30000);
  await h.ev('__wtd.step(60); WTP.game.stopLoop(); WTP.game.allWeapons = () => true');
  const files = [];
  for (const id of ids) {
    await h.ev(`WTP.game.restart(); WTP.game.stopLoop(); __wtd.step(30); __wtd.select('${id}'); WTP.player.spawn(300, 150); __wtd.tp(300, 150); __wtd.setAim(1, 0.35); __wtd.step(10); __wtd.fire(true); __wtd.step(2); __wtd.fire(false); __wtd.step(${after}); WTP.game.renderNow(1/60)`);
    const f = path.join(out, id + '.png');
    await h.shot(f);
    files.push({ id, f });
  }
  const errs = await h.ev('WTD.errors');
  await h.close();
  fs.writeFileSync(path.join(out, 'files.json'), JSON.stringify(files));
  execFileSync('python3', ['-c', `
import json
from PIL import Image, ImageDraw
fs=json.load(open('${out}/files.json'))
cols=2; W,H=800,500; rows=(len(fs)+cols-1)//cols
sheet=Image.new('RGB',(W*cols,H*rows)); d=ImageDraw.Draw(sheet)
for i,f in enumerate(fs):
    im=Image.open(f['f']).convert('RGB').resize((W,H))
    sheet.paste(im,((i%cols)*W,(i//cols)*H)); d.text(((i%cols)*W+6,(i//cols)*H+40),f['id'],fill=(255,60,60))
sheet.save('${out}/sheet.png')
`]);
  console.log('desk sheet', path.join(out, 'sheet.png'), 'errors', JSON.stringify(errs));
})();
