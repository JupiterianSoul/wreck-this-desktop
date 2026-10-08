const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: 'tiled3' });
  let ok = true;
  const t = (name, cond, info = '') => { console.log(cond ? 'ok  ' : 'FAIL', name, info); if (!cond) ok = false; };
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('__wtd.step(20); WTP.game.stopLoop(); 1');
    const font = await h.ev(`document.fonts.load('16px "Pixelify Sans"').then((f) => f.length > 0 && document.fonts.check('16px "Pixelify Sans"'))`);
    t('pixel font bundled and loaded', font);
    const frames = await h.ev(`['panel', 'btn', 'inset', 'hi'].every((k) => getComputedStyle(document.documentElement).getPropertyValue('--f-' + k).includes('data:image/png'))`);
    t('pixel frames generated from the theme', frames);
    const r = await h.ev(`(async () => {
      const wait = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      WTP.ui.wheel(true); await wait();
      const box = (el) => { const b = el.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height); };
      const cells = new Set(), info = new Set(), panel = new Set(), over = [];
      const catEl = document.querySelector('.wcat[data-k="0"]');
      for (let k = 0; k < WTP.weapons.CATS.length; k++) {
        document.querySelector('.wcat[data-k="' + k + '"]').dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
        await wait();
        info.add(box(document.getElementById('hWInfo')));
        panel.add(box(document.querySelector('.wpanel')));
        for (const b of document.querySelectorAll('#hGrid .witem')) {
          cells.add(box(b));
          const s = b.querySelector('span');
          if (s.scrollWidth > s.clientWidth + 1 && getComputedStyle(s).textOverflow !== 'ellipsis') over.push(b.dataset.w);
          b.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          info.add(box(document.getElementById('hWInfo')));
        }
        const g = document.getElementById('hGrid').getBoundingClientRect(), last = [...document.querySelectorAll('#hGrid .witem')].pop().getBoundingClientRect();
        if (last.bottom > g.bottom + 1 || last.right > g.right + 1) over.push('grid overflow ' + k);
      }
      for (const el of document.querySelectorAll('#hWInfo, #hWInfo *')) if (el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflow === 'visible') over.push('info ' + el.className);
      const same = document.querySelector('.wcat[data-k="0"]') === catEl;
      WTP.ui.wheel(false);
      return { cells: [...cells], info: [...info], panel: [...panel], over, same };
    })()`);
    t('every weapon cell is the same size', r.cells.length === 1, JSON.stringify(r.cells));
    t('category and weapon info cards are the same size', r.info.length === 1, JSON.stringify(r.info));
    t('weapon panel never changes size', r.panel.length === 1, JSON.stringify(r.panel));
    t('no text or cells overflow', r.over.length === 0, JSON.stringify(r.over));
    t('category list is not rebuilt on hover', r.same);
    const menu = await h.ev(`(async () => {
      const wait = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      WTP.game.pause(true); const out = {};
      for (const tab of ['play', 'loadout', 'ach', 'skins', 'crates', 'settings', 'controls']) { WTP.ui.openTab(tab); await wait(); const b = document.getElementById('hBody'); out[tab] = b.scrollWidth <= b.clientWidth + 1; }
      WTP.game.pause(false);
      return out;
    })()`);
    t('menu tabs have no sideways overflow', Object.values(menu).every(Boolean), JSON.stringify(menu));
    const errs = await h.ev('WTD.errors');
    t('no page errors', errs.length === 0, JSON.stringify(errs));
  } catch (e) { console.log('FAIL exception', e.message); ok = false; }
  await h.close();
  console.log(ok ? 'UI OK' : 'UI FAIL');
  process.exit(ok ? 0 : 1);
})();
