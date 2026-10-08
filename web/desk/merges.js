(() => {
  const WTP = window.WTP;
  const WTD = window.WTD;
  const S = () => WTP.save.settings;
  const M = {};
  WTP.merges = M;
  M.apply = () => {
    WTD.post({ t: 'notify-watch', on: !!S().liveNotifs });
    const x = !!S().xray && WTD.under;
    if (WTP.deskRender.xray !== x) { WTP.deskRender.xray = x; WTP.deskRender.invalidate(); }
    WTD.post({ t: 'under', on: !x });
  };
  M.changed = (k) => { if (k === 'liveNotifs' || k === 'xray') M.apply(); };
  WTD.onNotify = (n) => {
    if (!S().liveNotifs || !WTP.game.run || WTP.game.run.modeId === 'zen') return;
    const text = [n.summary, n.body].filter(Boolean).join(': ') || n.app || 'NOTIFICATION';
    WTP.enemies.notify(text);
  };
  WTD.onNextLevel = (r) => { if (r === null) WTP.ui.label('NEXT WORKSPACE IS NOT AVAILABLE HERE', 1200); };
  M.nudge = (power) => { if (S().shakeReal) WTD.post({ t: 'nudge', power }); };
  M.beforeQuit = () => {
    if (!S().wreckage || !WTP.deskRender.ready) return;
    try { WTD.post({ t: 'wreckage', png: WTP.deskRender.hiCv.toDataURL('image/png') }); } catch (e) { WTD.log('wreckage failed ' + e); }
  };
})();
