const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { launch } = require('./harness.js');
(async () => {
  const [fixture = 'tiled3', script = 'altf4-term', every = '8', count = '12'] = process.argv.slice(2);
  const out = path.join(require('os').tmpdir(), 'wtd-film');
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  const h = await launch({ fixture });
  await h.wait('window.WTD && WTD.ready', 30000);
  await h.ev('__wtd.step(120); WTP.game.stopLoop()');
  const SCRIPTS = {
    'altf4-term': `(() => { const w = WTP.structs.wins.find((w) => w && w.reg.app === 'terminal'); WTP.weapons.closeWindow(w.id, 300, 0); })()`,
    'altf4-editor': `(() => { const w = WTP.structs.wins.find((w) => w && w.reg.app === 'editor'); WTP.weapons.closeWindow(w.id, 300, 0); })()`,
    'altf4-browser': `(() => { const w = WTP.structs.wins.find((w) => w && w.reg.app === 'browser'); WTP.weapons.closeWindow(w.id, 300, 0); })()`,
    'nuke': `__wtd.explode(320, 200, 40)`,
    'bar': `(() => { WTP.world.carve(320, 5, 8, { pow: 99 }); })()`
  };
  await h.ev(SCRIPTS[script] || script);
  for (let k = 0; k < +count; k++) {
    await h.ev(`__wtd.step(${every}); WTP.game.renderNow && WTP.game.renderNow()`);
    await h.shot(path.join(out, `f${String(k).padStart(2, '0')}.png`));
  }
  const errs = await h.ev('WTD.errors');
  await h.close();
  execFileSync('python3', ['-c', `
import glob,sys
from PIL import Image
fs=sorted(glob.glob('${out}/f*.png'))
cols=4; rows=(len(fs)+cols-1)//cols
W,H=640,400
sheet=Image.new('RGB',(W*cols,H*rows))
for i,f in enumerate(fs):
    sheet.paste(Image.open(f).convert('RGB').resize((W,H)),((i%cols)*W,(i//cols)*H))
sheet.save('${out}/sheet.png')
`]);
  console.log('sheet', path.join(out, 'sheet.png'), 'errors', errs.length, errs.slice(0, 2));
})();
