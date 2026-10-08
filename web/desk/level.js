(() => {
  const WTP = window.WTP;
  const L = {};
  WTP.level = L;
  const hex = (h, d) => (typeof h === 'string' && /^#[0-9a-f]{6}/i.test(h) ? h.slice(0, 7) : d);

  function applyTheme(t) {
    const th = {};
    for (const k in t || {}) th[k] = hex(t[k], null);
    WTP.deskTheme = th;
    const root = document.documentElement.style;
    root.setProperty('--bg', th.background || '#121213');
    root.setProperty('--bg2', th.dark_background || '#0b0b0c');
    root.setProperty('--fg', th.foreground || '#cccccc');
    root.setProperty('--fg2', th.dark_foreground || '#6e7076');
    root.setProperty('--accent', th.accent || '#d8d8d8');
    root.setProperty('--sel', th.selection || '#3a3b3e');
    root.setProperty('--warn', th.yellow || '#e0b050');
    root.setProperty('--bad', th.red || '#e05050');
    WTP.pixui?.apply?.(th);

  }

  L.start = (seg) => {
    const WTD = window.WTD;
    applyTheme(WTD.session.theme);
    WTP.world.buildDesk(seg);
    WTP.structs.init();
    WTP.world.finalize();
    WTP.deskRender.init(WTD.shot, null);
    WTP.game.start({ seg, session: WTD.session, monitor: WTD.monitor });
  };

  window.WTD.onWallpaper = (name) => {
    if (!name) return;
    const im = new Image();
    im.onload = () => { WTP.deskRender.setWallpaper(im); };
    im.onerror = () => window.WTD.log('wallpaper failed ' + name);
    im.src = 'session/' + name;
  };
})();
