(() => {
  const WTP = window.WTP;
  const { P32, rand, pick } = WTP;
  const W = () => WTP.world, G = () => WTP.game, WP = () => WTP.weapons, DW = () => WTP.deskWeapons, A = (n, x) => WTP.audio.play(n, x);
  const D = {};
  WTP.disasters = D;
  function asAim(x, y, fn) {
    const I = WTP.input;
    const src = I.aim.src;
    I.aim.src = 'disaster';
    try { return fn({ x, y: Math.max(0, y - 60), ax: 0, ay: 1, hx: x, hy: y, bx: x, by: y }); } finally { I.aim.src = src; }
  }
  const rx = () => rand(30, W().w - 30), ry = () => rand(40, W().gh - 40);
  const LIST = {
    panic() { G().announce('KERNEL PANIC', 5); A('panic'); for (let k = 0; k < 6; k++) WP().later(k * 0.3, () => DW().rainLine(pick(['KERNEL PANIC - NOT SYNCING', 'OOPS: 0002 [#1] SMP', 'CALL TRACE:', 'END KERNEL PANIC']), rx(), { scale: 2 })); },
    bsod() { DW().bsod(false); },
    quake() { G().announce('EARTHQUAKE', 4); WP().FIRE.quake(); },
    meteors() { G().announce('METEOR SHOWER', 4); const x = rx(); asAim(x, ry(), (o) => WP().FIRE.meteor({ ...o, x, y: 0 })); },
    ddos() { G().announce('DDOS ATTACK', 4); const x = rx(), y = ry(); asAim(x, y, (o) => { o.y = y; WP().FIRE.ddos(o); }); },
    forks() { G().announce('FORK BOMB OUTBREAK', 4); for (let k = 0; k < 4; k++) WP().addShot({ t: 'fork', x: rx(), y: -4, vx: rand(-60, 60), vy: 40, life: 4, fuse: 1 + rand(0, 0.6), gen: 1, from: 'd' }); },
    tearing() { G().announce('SCREEN TEARING STORM', 4); for (let k = 0; k < 3; k++) WP().later(k * 0.4, () => { const x = rx(), y = ry(); asAim(x, y, (o) => { o.y = y; WTP.deskWeapons.tearAt(o, Math.random() < 0.4); }); }); },
    leak() {
      G().announce('MEMORY LEAK', 4); A('modem');
      const Wd = W();
      let level = 0;
      WP().K.ent({ life: 6, update() { const rows = Math.min(40, (this.t / 6) * 40); while (level < rows) { const y = Wd.gh - 1 - level; for (let x = 0; x < Wd.w; x += 1) if (Math.random() < 0.35) Wd.placeRubble(x, y - (Math.random() * 2 | 0), pick([P32.l, P32.G, P32.c, P32['0']])); level++; } } });
    },
    lightning() { G().announce('THUNDERSTORM', 4); for (let k = 0; k < 6; k++) WP().later(k * 0.35, () => DW().K.strike(rx())); },
    nuke() { G().announce('NUCLEAR LAUNCH DETECTED', 5); A('siren'); const x = rx(), y = ry(); WP().later(2, () => WP().explode(x, y, 34, { letters: 20, cause: 'nuke' })); WP().K.mark({ kind: 'ring', x, y, r: 34, life: 2, color: '#e8484f' }); }
  };
  D.LIST = LIST;
  let last = '';
  D.random = () => {
    const keys = Object.keys(LIST).filter((k) => k !== last && (k !== 'bsod' || Math.random() < 0.15) && (k !== 'nuke' || Math.random() < 0.4));
    const k = pick(keys);
    last = k;
    try { LIST[k](); } catch (e) { console.warn(e); }
    return k;
  };
})();
