const { launch } = require('./harness.js');
(async () => {
  const h = await launch({ fixture: process.argv[2] || 'tiled3' });
  let fail = 0;
  const ok = (c, m, d) => { if (!c) { fail++; console.log('FAIL', m, d !== undefined ? JSON.stringify(d) : ''); } else console.log('ok  ', m, d !== undefined ? JSON.stringify(d) : ''); };
  const key = (code, type = 'keydown') => h.ev(`window.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', key: '', bubbles: true })); true`);
  try {
    await h.wait('window.WTD && WTD.ready', 30000);
    await h.ev('WTP.save.settings.unlockAll = true; WTP.game.stopLoop(); __wtd.step(30); WTP.input.clear(); true');

    // One key, several actions
    await h.ev(`WTP.ui.bindKey('jump', 'KeyJ'); WTP.ui.bindKey('dash', 'KeyJ'); true`);
    await key('KeyJ');
    const both = await h.ev(`[WTP.input.take('jump'), WTP.input.take('dash')]`);
    await key('KeyJ', 'keyup');
    ok(both[0] && both[1], 'a shared key triggers both actions', both);

    // Controls tab: chips, "also" note, adding through capture keeps other bindings
    await h.ev(`WTP.game.pause(true); WTP.ui.openTab('controls'); true`);
    const also = await h.ev(`[...document.querySelectorAll('.keys .kl')].find((el) => el.textContent.startsWith('Jump'))?.querySelector('small')?.textContent || ''`);
    ok(/Dash/.test(also), 'shared key shows an also note', also);
    await h.ev(`document.querySelector('[data-rb="melee"]').click(); true`);
    await key('KeyP');
    const add = await h.ev(`({ melee: WTP.save.keys.melee.slice(), fire: WTP.save.keys.fire.slice() })`);
    ok(add.melee.includes('KeyP') && add.melee.includes('KeyF') && add.fire.includes('KeyK'), 'adding a key keeps the others', add);
    await h.ev(`document.querySelector('[data-rb="melee"]').click(); true`);
    await key('KeyK');
    const shared = await h.ev(`({ melee: WTP.save.keys.melee.includes('KeyK'), fire: WTP.save.keys.fire.includes('KeyK') })`);
    ok(shared.melee && shared.fire, 'binding a used key no longer unbinds it elsewhere', shared);
    await h.ev(`document.querySelector('[data-unbind="melee"][data-code="KeyK"]').click(); true`);
    ok(!(await h.ev(`WTP.save.keys.melee.includes('KeyK')`)), 'remove a single key');
    const cap = await h.ev(`(() => { const U = WTP.ui; WTP.save.keys.roll = []; for (const c of ['KeyZ', 'KeyU', 'KeyI', 'KeyO', 'KeyY']) U.bindKey('roll', c); U.bindKey('roll', 'Pad12'); return WTP.save.keys.roll.slice(); })()`);
    ok(cap.length === 5 && !cap.includes('KeyY') && cap.includes('Pad12'), 'up to 4 keys plus gamepad buttons', cap);

    // Mouse buttons and the wheel are bindable
    await h.ev(`document.querySelector('[data-rb="pickup"]').click(); true`);
    await h.ev(`window.dispatchEvent(new MouseEvent('mousedown', { button: 3, bubbles: true })); window.dispatchEvent(new MouseEvent('mouseup', { button: 3, bubbles: true })); true`);
    await new Promise((r) => setTimeout(r, 200));
    await h.ev(`document.querySelector('[data-rb="lastWeapon"]').click(); true`);
    await h.ev(`window.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true })); true`);
    const mw = await h.ev(`({ pickup: WTP.save.keys.pickup.slice(), last: WTP.save.keys.lastWeapon.slice() })`);
    ok(mw.pickup.includes('Mouse3') && mw.last.includes('WheelDown'), 'capture takes mouse buttons and the wheel', mw);
    await h.shot('/tmp/wtd-shots/controls.png');
    await h.ev(`WTP.game.pause(false); WTP.game.stopLoop(); WTP.input.clear(); true`);
    const play = await h.ev(`(() => {
      const I = WTP.input, cv = document.getElementById('cv');
      cv.dispatchEvent(new MouseEvent('mousedown', { button: 3, bubbles: true })); const pk = I.take('pickup'); window.dispatchEvent(new MouseEvent('mouseup', { button: 3, bubbles: true }));
      I.wheelStep(0, 120, 0, 2e7); const lw = I.take('lastWeapon'); I.take('next');
      return { pk, lw };
    })()`);
    ok(play.pk && play.lw, 'mouse button and wheel drive their actions in game', play);

    // Hotbar slots are actions
    const sl = await h.ev(`(() => { WTP.save.keys.slot3 = ['KeyH']; WTP.game.selectWeapon(WTP.game.slots()[0]); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', bubbles: true })); __wtd.step(1); window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyH', bubbles: true })); return [WTP.weapons.st.cur, WTP.game.slots()[2]]; })()`);
    ok(sl[0] === sl[1], 'slot keys are rebindable', sl);

    // Gamepad buttons go through the same bindings
    const gp = await h.ev(`(() => {
      const I = WTP.input, real = navigator.getGamepads;
      const pad = (on) => ({ connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, k) => ({ pressed: on.includes(k), value: on.includes(k) ? 1 : 0 })) });
      WTP.ui.bindKey('lastWeapon', 'Pad13');
      navigator.getGamepads = () => [pad([])]; I.pollPad();
      navigator.getGamepads = () => [pad([13])]; I.pollPad();
      const r = { last: I.take('lastWeapon'), held: I.down('lastWeapon') };
      navigator.getGamepads = () => [pad([])]; I.pollPad();
      navigator.getGamepads = real;
      return r;
    })()`);
    ok(gp.last && gp.held, 'gamepad buttons are rebindable', gp);
    ok(await h.ev(`WTP.DEFAULT_KEYS.prev.length > 0 && WTP.DEFAULT_KEYS.next.length > 0`), 'prev and next have default keys');
    ok(!(await h.ev('WTD.errors.length')), 'no page errors', await h.ev('WTD.errors.slice(0, 3)'));
  } catch (e) { fail++; console.log('FAIL', e.message, e.stack); }
  await h.close();
  // A v4 save (mouse, wheel and pad were hardcoded then) picks up the new defaults and keeps custom keys
  const old = await launch({ fixture: process.argv[2] || 'tiled3', save: { 'wtd-save': { v: 4, hotbar: [], keys: { fire: ['KeyL'], alt: ['KeyG'], prev: [], next: [], jump: ['Space'], melee: ['KeyF'] } } } });
  try {
    await old.wait('window.WTD && WTD.ready', 30000);
    const k = await old.ev(`({ v: WTP.save.v, fire: WTP.save.keys.fire, alt: WTP.save.keys.alt, next: WTP.save.keys.next, jump: WTP.save.keys.jump, slot1: WTP.save.keys.slot1 })`);
    ok(k.v === 5 && k.fire[0] === 'Mouse0' && k.fire.includes('KeyL') && k.alt[0] === 'Mouse2' && k.next.includes('WheelDown') && k.jump.includes('Space') && k.jump.includes('Pad0') && k.slot1[0] === 'Digit1', 'v4 save migrates to v5 bindings', k);
  } catch (e) { fail++; console.log('FAIL', e.message); }
  await old.close();
  console.log(fail ? 'KEYS FAIL' : 'KEYS OK');
  process.exit(fail ? 1 : 0);
})();
