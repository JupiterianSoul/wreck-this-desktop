(() => {
  const WTP = window.WTP;
  const { P32, PAL, rand, pick, shade } = WTP;
  const EN = WTP.enemies;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player, WP = () => WTP.weapons;
  const A = (n, x) => WTP.audio.play(n, x);
  const H = EN.HELP;
  const th = () => WTP.deskTheme || {};
  const hexC = (h, d) => (h ? WTP.packHex(h) : P32[d]);

  let FH = 0;
  const fh = () => FH || (FH = WTP.font.textCanvas('AQ', { color: '7', outline: null }).h);
  function dialog(w, h, title, opts = {}) {
    const g = H.grid(w, h);
    const bg = opts.bg || hexC(th().background, '1');
    const bar = opts.bar || hexC(th().lighter_background, '2');
    H.rect(g, 0, 0, w, h, bg);
    const bh = fh() + 2;
    H.rect(g, 0, 0, w, bh, bar);
    H.rect(g, 0, bh, w, 1, shade(bar, 0.6));
    H.set(g, w - 5, 2, 'e'); H.set(g, w - 3, 2, 'e'); H.set(g, w - 4, 3, 'e'); H.set(g, w - 5, 4, 'e'); H.set(g, w - 3, 4, 'e');
    if (title) H.text(g, title, 3, 1, opts.tc || '7', false);
    return g;
  }
  const btn = (g, x, y, w, label, c) => { H.rect(g, x, y, w, fh() + 2, c); H.text(g, label, x + w / 2, y + 1, '0', true); };

  EN.register('restart', { name: 'Restart Prompt', hp: 60, w: 40, h: 22, score: 260, desc: 'Restart now? Counts down while it walks along your windows, then restarts you. Violently.' }, {
    frames: 6,
    paint(v, f) {
      const w = Math.max(H.textW('RESTART?') + 8, H.textW('UPDATE') + 14, 34);
      const L = fh() + 3;
      const g = dialog(w, L * 3 + 3, 'UPDATE');
      H.text(g, 'RESTART?', w / 2, L + 1, '7', true);
      btn(g, 2, L * 2 + 1, (w >> 1) - 3, 'NO', P32['4']);
      btn(g, (w >> 1) + 1, L * 2 + 1, (w >> 1) - 3, String(Math.max(0, 5 - (f % 6))), P32.e);
      return g;
    },
    update(e, dt, c) {
      e.count = (e.count ?? 6) - dt;
      e.ft = (6 - e.count) / 1;
      if (e.ground) e.vx = Math.sign(c.dx) * 26 * c.slow;
      if (e.count <= 0) { WP().explode(e.x, e.y, 13, { letters: 10, cause: 'restart' }); EN.kill(e, 'self'); G()?.event?.('RESTARTING...', e.x, e.y - 14, 1); }
      else if ((e.beep = (e.beep || 0) - dt) <= 0) { e.beep = 1; A('countdown'); }
      return { walk: true, grav: 520 };
    }
  });

  EN.register('beachball', { name: 'Frozen App', hp: 70, w: 14, h: 14, score: 240, desc: 'The spinning beachball of doom. Rolls at you and shrugs off bullets while it spins.' }, {
    frames: 8,
    paint(v, f) {
      const g = H.grid(15, 15);
      const cols = ['e', 'o', 'y', 'l', 'c', 'P'];
      for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
        const dx = x - 7, dy = y - 7, r = Math.hypot(dx, dy);
        if (r > 7) continue;
        const a = Math.atan2(dy, dx) + (f / 8) * Math.PI * 2;
        H.set(g, x, y, cols[((((a / (Math.PI * 2)) % 1) + 1) % 1 * 6) | 0]);
        if (r < 2.2 && dx < 0 && dy < 0) H.set(g, x, y, '7');
      }
      return g;
    },
    damageMul(e, cause) { return Math.abs(e.vx) > 60 && !/boom|freeze|kick|kill9|nuke|lightning|bsod/.test(cause || '') ? 0.2 : 1; },
    update(e, dt, c) {
      e.ft += Math.abs(e.vx) * dt * 0.05;
      if (e.ground) { e.vx += Math.sign(c.dx) * 140 * dt * c.slow; e.vx = Math.max(-150, Math.min(150, e.vx)); if (Math.random() < 0.01) { e.vy = -220; A('beachball'); } }
      if ((e.rest = (e.rest || 3) - dt) <= 0) { e.vx *= 0.1; e.rest = rand(2.5, 4); FX().pop(e.x, e.y - 10, 'NOT RESPONDING', { scale: 1, ramp: ['5', '4'], life: 0.8 }); }
      if (Math.abs(e.vx) > 60 && Math.random() < 0.3) A('beachball');
      return { walk: true, grav: 520 };
    }
  });

  EN.register('notresp', { name: 'Not Responding', hp: 80, w: 40, h: 26, score: 280, fly: true, desc: 'A grey ghost of a window that drifts through walls. Touch it and you freeze too.' }, {
    paint() {
      const w = Math.max(H.textW('NOT RESPONDING') + 14, H.textW('WAIT') + H.textW('KILL') + 14);
      const L = fh() + 3;
      const g = dialog(w, L * 3, 'NOT RESPONDING', { bg: P32['3'], bar: P32['4'], tc: '6' });
      btn(g, 3, L * 2 - 2, (w >> 1) - 4, 'WAIT', P32['5']); btn(g, (w >> 1) + 1, L * 2 - 2, (w >> 1) - 4, 'KILL', P32['5']);
      return g;
    },
    update(e, dt, c) {
      e.x += Math.sign(c.dx) * 18 * dt * c.slow; e.y += Math.sign(c.dy) * 12 * dt * c.slow + Math.sin(e.t * 2) * 6 * dt;
      e.vx = 0; e.vy = 0;
      if (Math.abs(c.dx) < e.w / 2 + 3 && Math.abs(c.dy) < e.h / 2 + 6 && PL().iframes <= 0) { PL().frozenT = 1.2; PL().vx = 0; G()?.label?.('YOU ARE NOT RESPONDING', 900); }
      return { noCollide: true };
    },
    draw(ctx, e) { if (((e.t * 2) | 0) & 1) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(e.x - e.w / 2, e.y - e.h / 2, e.w, e.h); } }
  });

  EN.register('polkit', { name: 'Password Prompt', hp: 160, w: 34, h: 22, score: 320, fly: true, desc: 'Authentication required. Its shield faces you: hit it from behind or with explosions.' }, {
    paint(v, f) {
      const L = fh() + 3;
      const g = dialog(Math.max(36, H.textW('SUDO') + 14), L + 12, 'SUDO');
      H.rows(g, ['.555.', '5...5', '5...5', 'yyyyy', 'yy0yy', 'yyyyy'], 3, L + 3);
      H.rect(g, 10, L + 4, 23, 6, P32['0']);
      for (let k = 0; k < 4; k++) H.set(g, 12 + k * 3, L + 7, f & 1 || k < 3 ? '7' : '0');
      return g;
    },
    damageMul(e, cause, fx) { return fx != null && Math.sign(fx - e.x) === Math.sign(PL().x - e.x) && !/boom|nuke|kill9|lightning|quake|orbital|bsod/.test(cause || '') ? 0.1 : 1; },
    update(e, dt, c) {
      e.vx += ((c.pc.x + Math.sin(e.t) * 40 - e.x) * 0.8 - e.vx) * dt * 2 * c.slow;
      e.vy += ((c.pc.y - 40 - e.y) * 0.8 - e.vy) * dt * 2 * c.slow;
      if (e.cd <= 0) { e.cd = rand(1.4, 2.2); for (let q = 0; q < 4; q++) EN.shoot(e, Math.atan2(c.dy, c.dx) + (q - 1.5) * 0.12, 110, 'dot'); A('polkit'); }
    },
    draw(ctx, e) { ctx.fillStyle = PAL.c; const s = Math.sign(PL().x - e.x) || 1; ctx.globalAlpha = 0.6; ctx.fillRect(e.x + s * (e.w / 2 + 1), e.y - e.h / 2, 1, e.h); ctx.globalAlpha = 1; }
  });

  EN.register('toast', { name: 'Notification', hp: 40, w: 50, h: 14, score: 150, fly: true, desc: 'A notification that slides in from the corner and fires badge bursts.' }, {
    variants: 1,
    paint(v, f, h, e) {
      const g = H.grid(56, 16);
      const bg = hexC(th().background, '1'), fg = hexC(th().foreground, '6');
      H.rect(g, 0, 0, 56, 16, bg); H.rect(g, 0, 0, 2, 16, hexC(th().accent, 'c'));
      H.rect(g, 5, 4, 7, 7, P32.c); H.text(g, 'NEW', 15, 3, '7', false);
      H.rect(g, 15, 10, 30, 1, fg); H.rect(g, 15, 12, 22, 1, shade(fg, 0.7));
      return g;
    },
    update(e, dt, c) {
      const tx = W().w - 40 - (e.slot || 0) * 4, ty = 20 + (e.slot || 0) * 18;
      if (!e.arrived) { e.x += (tx - e.x) * Math.min(1, dt * 5); e.y += (ty - e.y) * Math.min(1, dt * 5); if (Math.abs(tx - e.x) < 2) e.arrived = true; }
      else { e.vx += ((c.pc.x + 40 - e.x) * 0.5 - e.vx) * dt * 1.2 * c.slow; e.vy += ((c.pc.y - 50 - e.y) * 0.5 - e.vy) * dt * 1.2 * c.slow; e.x += e.vx * dt; e.y += e.vy * dt; }
      if (e.cd <= 0) { e.cd = rand(1.6, 2.6); for (let q = 0; q < 5; q++) EN.shoot(e, Math.atan2(c.dy, c.dx) + (q - 2) * 0.2, 100, 'dot'); A('notifPop'); }
      return { noCollide: true, manual: true };
    },
    draw(ctx, e) { if (e.text) WTP.font.draw(ctx, e.text.slice(0, 26).toUpperCase(), Math.round(e.x), Math.round(e.y + 11), { color: '7', outline: '0', align: 'center' }); }
  });

  EN.register('lowbat', { name: 'Low Battery', hp: 30, w: 16, h: 9, score: 160, fly: true, desc: 'Flies at you and drains your dash. Plug it into an explosion.' }, {
    frames: 2,
    paint(v, f) { const g = H.grid(18, 10); H.rect(g, 0, 0, 16, 10, '0'); H.rect(g, 16, 3, 2, 4, '0'); H.rect(g, 1, 1, 14, 8, '2'); H.rect(g, 2, 2, f ? 3 : 2, 6, 'e'); return g; },
    update(e, dt, c) {
      e.vx += ((c.pc.x - e.x) * 1.2 - e.vx) * dt * 1.8 * c.slow; e.vy += ((c.pc.y - e.y) * 1.2 - e.vy) * dt * 1.8 * c.slow;
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (Math.abs(c.dx) < 9 && Math.abs(c.dy) < 9) { PL().dashCd = 3; PL().airDash = 0; FX().pop(e.x, e.y - 8, 'BATTERY 1%', { scale: 1, ramp: ['e', 'R'], life: 0.8 }); A('usbNo'); EN.kill(e, 'touch'); }
      return { noCollide: true, manual: true };
    }
  });

  EN.register('zombie', { name: 'Zombie Process', hp: 50, w: 12, h: 16, score: 220, desc: 'Comes back to life unless you finish it with kill -9 or fire.' }, {
    frames: 2,
    paint(v, f) { const g = H.grid(14, 18); H.rows(g, ['..llll..', '.l0ll0l.', '.llllll.', '..l00l..', '...ll...', '.GGGGGG.', 'G.GGGG.G', '..GGGG..', '..G..G..', f ? '.G....G.' : '..G..G..'], 3, 2); H.text(g, 'Z', 11, 0, 'l', true); return g; },
    update(e, dt, c) { if (e.ground) e.vx = Math.sign(c.dx) * 22 * c.slow; return { walk: true, grav: 520 }; },
    die(e, cause) {
      if (/kill9|fire|flame|napalm|bsod|lava/.test(cause || '') || e.revived) { FX().pop(e.x, e.y - 12, 'REAPED', { scale: 1, ramp: ['l', 'G'], life: 0.8 }); return; }
      const x = e.x, y = e.y;
      WTP.weapons.later?.(3, () => { const z = EN.spawn('zombie', x, y, {}); if (z) { z.revived = true; FX().pop(x, y - 12, 'STILL RUNNING', { scale: 1, ramp: ['l', 'G'], life: 1 }); } });
    }
  });

  EN.register('daemon', { name: 'Daemon', hp: 35, w: 10, h: 10, score: 200, burrow: true, desc: 'A little horned process that hides inside windows and pops out to shoot.' }, {
    frames: 2,
    paint(v, f) { const g = H.grid(12, 12); H.rows(g, ['e......e', 'ee....ee', '.eeeeee.', '.e7ee7e.', '.eeeeee.', '..e00e..', '..eeee..', f ? '.e....e.' : '..e..e..'], 2, 2); return g; },
    update(e, dt, c) {
      e.hideT = (e.hideT ?? 2) - dt;
      if (e.inside) { e.vx = Math.sign(c.dx) * 30; e.vy = Math.sign(c.dy) * 20; e.x += e.vx * dt; e.y += e.vy * dt; if (e.hideT <= 0) { e.inside = false; e.hideT = 2.5; FX().pop(e.x, e.y - 8, 'SYSTEMCTL', { scale: 1, ramp: ['e'], life: 0.6 }); } }
      else { e.vx *= 0.9; e.vy *= 0.9; if (e.cd <= 0) { e.cd = 0.5; EN.shoot(e, Math.atan2(c.dy, c.dx), 140, 'dot'); } if (e.hideT <= 0) { e.inside = true; e.hideT = 2; } }
      return { noCollide: true, manual: true };
    },
    damageMul(e, cause) { return e.inside && !/boom|nuke|quake|orbital|rmrf|bsod/.test(cause || '') ? 0 : 1; },
    draw(ctx, e) { if (e.inside) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(e.x - 6, e.y - 6, 12, 12); } }
  });

  EN.register('cron', { name: 'Cron Job', hp: 90, w: 14, h: 14, score: 260, fly: true, desc: 'Sits still and spawns minions on a schedule. Every few seconds, like clockwork.' }, {
    frames: 4,
    paint(v, f) { const g = H.grid(16, 16); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const r = Math.hypot(x - 7.5, y - 7.5); if (r < 7.5) H.set(g, x, y, r > 6.3 ? '0' : '6'); } const a = (f / 4) * Math.PI * 2; for (let k = 0; k < 6; k++) H.set(g, 7.5 + Math.cos(a) * k * 0.9, 7.5 + Math.sin(a) * k * 0.9, '0'); for (let k = 0; k < 4; k++) H.set(g, 7.5, 7.5 - k, 'e'); return g; },
    update(e, dt, c) {
      e.vx = 0; e.vy = Math.sin(e.t) * 6;
      e.y += e.vy * dt;
      if ((e.tick = (e.tick ?? 4) - dt) <= 0) { e.tick = 5; for (let k = 0; k < 2; k++) { const m = EN.spawn(pick(['cursor', 'lowbat', 'daemon']), e.x + rand(-10, 10), e.y + 6, { weak: true }); if (m) m.spawnT = 0.3; } A('tick'); FX().pop(e.x, e.y - 12, '*/5 * * * *', { scale: 1, ramp: ['7', '6'], life: 0.8 }); }
      return { noCollide: true };
    }
  });

  EN.register('tray', { name: 'The System Tray', hp: 1600, w: 90, h: 12, score: 4000, fly: true, boss: true, desc: 'Boss. A strip of tray icons torn off your bar. Every icon is a turret.' }, {
    frames: 2,
    paint(v, f) {
      const g = H.grid(96, 14);
      H.rect(g, 0, 0, 96, 14, hexC(th().background, '1'));
      H.rect(g, 0, 13, 96, 1, '0');
      const icons = [['e', 'o'], ['c', 'C'], ['l', 'L'], ['y', 'a'], ['P', 'm'], ['k', 'K'], ['7', '6']];
      icons.forEach(([a, b], k) => { const x = 4 + k * 13; H.rect(g, x, 3, 8, 8, f && k % 2 ? b : a); H.rect(g, x + 2, 5, 4, 4, '0'); });
      return g;
    },
    update(e, dt, c) {
      e.vx += ((W().w / 2 + Math.sin(e.t * 0.5) * W().w * 0.3 - e.x) * 0.6 - e.vx) * dt * 1.5 * c.slow;
      e.vy += ((30 + Math.sin(e.t * 1.3) * 10 - e.y) * 0.6 - e.vy) * dt * 1.5 * c.slow;
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (e.cd <= 0) {
        e.cd = e.hp < e.maxHp / 2 ? 0.5 : 0.9;
        const k = (e.icon = ((e.icon || 0) + 1) % 7);
        const ix = e.x - 48 + 8 + k * 13;
        const ang = Math.atan2(c.pc.y - e.y, c.pc.x - ix);
        const kind = ['dot', 'coin', 'dot', 'check', 'dot', 'coin', 'dot'][k];
        EN.shoot({ x: ix, y: e.y + 4 }, ang, 120 + k * 8, kind, { homing: k === 5 ? 0.5 : 0 });
        if (k === 6 && Math.random() < 0.5) EN.spawn('toast', ix, e.y + 10, { weak: true });
      }
      return { noCollide: true, manual: true };
    }
  });

  EN.register('cpu', { name: '100% CPU', hp: 1900, w: 70, h: 12, score: 5000, fly: true, boss: true, desc: 'Boss. A red-hot process row. Sets fire to everything near it and overclocks every other enemy.' }, {
    frames: 4,
    paint(v, f) {
      const w = H.textW('100% CPU') + 12, h = fh() + 6;
      const g = H.grid(w, h);
      H.rect(g, 0, 0, w, h, f & 1 ? 'R' : 'e');
      H.rect(g, 0, 0, w, 1, 'o');
      H.text(g, '100% CPU', w / 2, 3, f & 2 ? 'Y' : '7', true);
      return g;
    },
    update(e, dt, c) {
      e.vx += ((c.pc.x + Math.sin(e.t * 0.7) * 80 - e.x) * 0.5 - e.vx) * dt * 1.2 * c.slow;
      e.vy += ((c.pc.y - 50 + Math.sin(e.t * 2) * 12 - e.y) * 0.5 - e.vy) * dt * 1.2 * c.slow;
      e.x += e.vx * dt; e.y += e.vy * dt;
      if (Math.random() < 0.5) W().igniteAt(Math.floor(e.x + rand(-40, 40)), Math.floor(e.y + rand(8, 30)), 2);
      if (Math.random() < 0.4) FX().ember(e.x + rand(-35, 35), e.y + 6);
      for (const o of EN.list) if (o !== e && !o.dead) o.cd -= dt * 0.6;
      if (e.cd <= 0) { e.cd = e.hp < e.maxHp / 2 ? 0.6 : 1.1; for (let q = -2; q <= 2; q++) EN.shoot(e, Math.atan2(c.dy, c.dx) + q * 0.15, 130, 'dot', { boom: 3 }); A('cpuHum'); }
      return { noCollide: true, manual: true };
    }
  });

  const LIGHT = ['restart', 'beachball', 'lowbat', 'toast', 'zombie', 'daemon', 'cursor', 'spinner'];
  EN.WAVE_TYPES = ['restart', 'beachball', 'notresp', 'polkit', 'toast', 'lowbat', 'zombie', 'daemon', 'cron', 'cookie', 'spinner', 'ad', 'captcha', 'virus', 'update', 'cursor', 'clip'];
  EN.BOSSES = ['tray', 'cpu'];
  EN.LIGHT = LIGHT;
  let toastSlot = 0;
  EN.notify = (text) => {
    const Wd = W();
    const e = EN.spawn('toast', Wd.w + 30, 20, {});
    if (!e) return null;
    e.text = String(text || '');
    e.slot = (toastSlot++) % 4;
    A('notifPop');
    return e;
  };
})();
