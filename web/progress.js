(() => {
  const WTP = window.WTP;
  const DEFAULT = ['pistol', 'shotgun', 'rocket', 'flame', 'altf4', 'smg', 'grenade', 'katana', 'gravity', 'nuke'];
  const isOwned = (id) => !!WTP.weapons.BY[id];
  function defaultHotbar() { return DEFAULT.map((id) => (WTP.weapons.BY[id] ? id : null)); }
  WTP.progress = { ACH: [], check: () => [], isOwned, defaultHotbar, ownedCount: () => WTP.weapons.DEFS.length, queue: [] };
})();
