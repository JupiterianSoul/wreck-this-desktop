(() => {
  const WTP = window.WTP;
  const HEAVY = new Set(['nuke', 'bsod', 'orbital', 'meteor', 'airstrike', 'blackhole', 'quake', 'tornado', 'panic', 'zipbomb', 'overclock', 'boss']);
  const MEDIUM = new Set(['railgun', 'sniper', 'sound', 'revolver', 'hammer', 'wrecking', 'stamp', 'glove', 'superq', 'kill9', 'altf4', 'tiler', 'caps', 'battery', 'forkbomb', 'lightning', 'finisher', 'katana', 'chainsaw', 'drill', 'whip']);
  const MEDIUM_CATS = new Set(['boom', 'shot', 'disaster']);
  const B = { src: null, n: 0, lim: 170, stats: { asked: 0, kept: 0 } };
  WTP.budget = B;

  const cache = new Map();
  B.cls = (id) => {
    if (!id) return -1;
    let c = cache.get(id);
    if (c != null) return c;
    const d = WTP.weapons?.BY?.[id];
    c = HEAVY.has(id) ? 2 : MEDIUM.has(id) || (d && MEDIUM_CATS.has(d.cat)) ? 1 : 0;
    if (d || HEAVY.has(id) || MEDIUM.has(id)) cache.set(id, c);
    return c;
  };
  B.heavy = () => B.cls(B.src) === 2;
  B.shakeCap = () => [6, 3, 9, 34][B.cls(B.src) + 1];
  B.mult = () => [0.8, 0.55, 0.8, 1][B.cls(B.src) + 1];
  B.with = (src, fn) => { const p = B.src; B.src = src; try { return fn(); } finally { B.src = p; } };
  B.bind = (fn) => { const s = B.src; return s == null ? fn : () => B.with(s, fn); };
  B.frame = () => { B.n = 0; B.lim = [70, 120, 170][WTP.world?.quality ?? 2]; };

  let LOW = null, MID = null;
  B.admit = (k) => {
    if (!LOW) {
      const K = WTP.fx.K;
      LOW = new Set([K.SPARK, K.SMOKE, K.DUST, K.EMBER, K.TRAIL, K.ASH, K.FLAME]);
      MID = new Set([K.DEBRIS, K.SHARD, K.SPLINTER, K.PAPER, K.CONFETTI, K.PIX, K.SHELL]);
    }
    B.stats.asked++;
    const low = LOW.has(k);
    if (!low && !MID.has(k)) { B.stats.kept++; return 1; }
    B.n++;
    let p = low ? B.mult() : 1;
    const lim = low ? B.lim : B.lim * 2;
    if (B.n > lim) p *= lim / B.n;
    if (p >= 1) { B.stats.kept++; return 1; }
    if (Math.random() >= p) return 0;
    B.stats.kept++;
    return Math.min(1.8, 1 / Math.sqrt(p));
  };
})();
