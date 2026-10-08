(() => {
  const WTP = window.WTP;
  const { P32, rand, pick } = WTP;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, A = (n, x) => WTP.audio.play(n, x);
  const GG = {};
  WTP.deskGags = GG;
  const kindOf = (label) => {
    const l = String(label || '').toLowerCase();
    if (/calendar|clock|time/.test(l)) return 'clock';
    if (/workspace/.test(l)) return 'workspaces';
    if (/spotify|music|media|player/.test(l)) return 'spotify';
    if (/battery|power/.test(l)) return 'battery';
    if (/network|wifi|bluetooth/.test(l)) return 'network';
    if (/games/.test(l)) return 'games';
    if (/notification/.test(l)) return 'notif';
    if (/weather/.test(l)) return 'weather';
    if (/menu/.test(l)) return 'menu';
    if (/settings|omasettings/.test(l)) return 'settings';
    return 'other';
  };
  const center = (p) => ({ x: (p.x0 + p.x1) / 2 + 0.5, y: (p.y0 + p.y1) / 2 + 0.5 });
  const gagsOn = () => WTP.save.settings.gags !== false;

  GG.widgetHit = (p, cx, cy, pow) => {
    const now = performance.now();
    if (p.gagT && now - p.gagT < 350) return;
    p.gagT = now;
    const k = kindOf(p.label);
    const c = center(p);
    p.whits = (p.whits || 0) + 1;
    if (!gagsOn()) { A('clank', 1); if (p.whits >= 4) GG.widgetBreak(p); return; }
    if (k === 'clock') {
      A('tick'); A('clank', 1);
      for (let q = 0; q < 6; q++) FX().pop(c.x + rand(-8, 8), c.y - 2, String((Math.random() * 10) | 0), { scale: 1, ramp: ['7', '6'], life: 0.6, vy: -30 });
      if (p.whits === 1) G()?.event?.('TIME FLIES', c.x, c.y + 6, 1);
    } else if (k === 'workspaces') {
      A('coin');
      const Wd = W();
      const ids = new Set();
      for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) { const i = y * Wd.w + x; if (Wd.gid[i] && Wd.mat[i] === Wd.SOLID) ids.add(Wd.gid[i]); }
      const list = [...ids];
      const g = list[(Math.random() * list.length) | 0];
      if (g) { Wd.detachGlyph(g, rand(-80, 80), -rand(160, 260)); const ch = Wd.chunks[Wd.chunks.length - 1]; if (ch) { ch.bouncy = true; ch.va = rand(-8, 8); } }
    } else if (k === 'spotify') {
      A('spotifyGlitch');
      for (let q = 0; q < 5; q++) FX().pop(c.x + rand(-14, 14), c.y, pick(['♪', '♫']), { scale: 1, ramp: ['7', 'm', 'P'], life: 1, vy: -26 });
      if (p.whits === 1) G()?.event?.('NOW PLAYING: STATIC', c.x, c.y + 7, 1);
    } else if (k === 'battery') {
      A('sizzle');
      for (let q = 0; q < 14; q++) FX().acid(c.x + rand(-3, 3), p.y1 + 1, rand(-20, 20), rand(0, 40));
      if (p.whits === 1) G()?.event?.('LOW BATTERY', c.x, c.y + 7, 1);
    } else if (k === 'network') {
      A('tesla');
      for (let q = 0; q < 3; q++) FX().bolt(c.x, c.y, c.x + rand(-40, 40), c.y + rand(10, 50));
      if (p.whits === 1) G()?.event?.('NO SIGNAL', c.x, c.y + 7, 1);
    } else if (k === 'games') {
      A('confetti');
      for (let q = 0; q < 40; q++) FX().confetti(c.x, c.y, rand(-120, 120), rand(-200, -40));
    } else if (k === 'notif') {
      A('notifPop');
      FX().pop(c.x, c.y + 6, 'DO NOT DISTURB', { scale: 1, ramp: ['7', 'K', 'k'], life: 0.9 });
    } else if (k === 'weather') {
      A('splash');
      for (let q = 0; q < 24; q++) FX().water(c.x + rand(-6, 6), c.y + 2, rand(-30, 30), rand(20, 90));
    } else {
      A('clank', 2);
      for (let q = 0; q < 6; q++) FX().spark(c.x, c.y, rand(-90, 90), rand(-120, 20), P32.y, 0.3);
    }
    if (p.whits >= 4) GG.widgetBreak(p);
  };
  GG.widgetBreak = (p) => {
    if (p.dead) return;
    const k = kindOf(p.label);
    const c = center(p);
    const ch = WTP.props.popRegion(p, 'widget', rand(-120, 120), -rand(160, 260), { mtl: W().M.METAL, bouncy: true, life: 9 });
    if (ch) ch.va = k === 'clock' ? rand(10, 16) * (Math.random() < 0.5 ? -1 : 1) : rand(-6, 6);
    A('clank', 3);
    G()?.bonus?.(150, c.x, c.y - 4);
    const name = { clock: 'CLOCK STOPPED', workspaces: 'WORKSPACES SCATTERED', spotify: 'SKIPPED', battery: 'BATTERY DEAD', network: 'DISCONNECTED', games: 'GAME OVER', notif: 'NOTIFICATIONS CLEARED', weather: 'FORECAST: DEBRIS', menu: 'MENU CLOSED', settings: 'SETTINGS RESET' }[k] || 'WIDGET DOWN';
    G()?.event?.(name, c.x, c.y + 8, 1);
  };
  GG.kindOf = kindOf;
  WTP.structs.hooks.push((w) => {
    if (!gagsOn() || w.reg.type !== 'window') return false;
    const Wd = W();
    const app = w.reg.app;
    if (app === 'terminal') {
      const lines = (Wd.lines || []).filter((l) => l.rid === w.id).sort((a, b) => b.y0 - a.y0);
      lines.forEach((l, k) => {
        const ids = new Set(l.ids);
        const ch = Wd.detachRegion((i) => ids.has(Wd.gid[i]), l.x0, l.y0, l.x1, l.y1, rand(-60, 60), -rand(20, 120), { mtl: Wd.M.GLASS, life: 8 });
        if (ch) { ch.va = rand(-0.6, 0.6); ch.vy += k * 4; }
      });
      if (lines.length) { G()?.event?.('STDOUT SPILLED', (w.reg.x0 + w.reg.x1) / 2, w.reg.y0 + 8, 1); A('keyclack'); }
      return false;
    }
    if (app === 'browser') {
      for (let y = w.reg.y0; y <= w.reg.y1; y++) for (let x = w.reg.x0; x <= w.reg.x1; x++) { const i = y * Wd.w + x; if (Wd.rid[i] === w.id && (Wd.flag[i] & Wd.F_TITLE) && Math.random() < 0.08) Wd.igniteAt(x, y, 2); }
      G()?.event?.('TAB ON FIRE', (w.reg.x0 + w.reg.x1) / 2, w.reg.y0 + 4, 1);
      return false;
    }
    if (app === 'media') {
      const n = WTP.structs.detachGrid(w.id, 6, 4, false);
      if (n) { G()?.event?.('BUFFERING...', (w.reg.x0 + w.reg.x1) / 2, (w.reg.y0 + w.reg.y1) / 2, 2); A('glitch'); return true; }
    }
    return false;
  });
})();
