(() => {
  const WTP = window.WTP;
  const { P32, rand, pick, mix } = WTP;
  const WP = WTP.weapons, DW = WTP.deskWeapons, K = WP.K;
  const W = () => WTP.world, FX = () => WTP.fx, G = () => WTP.game, PL = () => WTP.player, EN = () => WTP.enemies, ST = () => WTP.structs;
  const A = (n, x) => WTP.audio.play(n, x);
  const st = WP.st;
  const reg = K.reg;
  const font = (ctx, text, x, y, color = '7', scale = 1) => WTP.font.draw(ctx, text, Math.round(x), Math.round(y), { align: 'center', color, outline: '0', scale });
  const pc = () => { const P = PL(); return { x: P.x + P.w / 2, y: P.y }; };
  const inDisc = (cx, cy, r, fn) => {
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = Math.floor(cx + dx), y = Math.floor(cy + dy);
      if (K.inGrid(x, y)) fn(x, y, y * W().w + x, dx, dy);
    }
  };
  let aimO = null;
  WP.EXT.updates.push((dt, o) => { aimO = o; });

  const sudoTarget = () => { const l = st.lastFired; return l && WP.FIRE[l] && l !== 'sudo' && WP.BY[l] ? l : null; };
  function rootBeam(o) {
    const Wd = W();
    const hit = K.beam(o, 260, () => false);
    FX().beam([o.x, o.y, hit.x, hit.y], { kind: 'rail', life: 0.3, w: 2, c1: P32['7'], c2: P32.l, c3: P32.L });
    const n = Math.ceil(hit.d / 3);
    for (let k = 1; k <= n; k++) { const t = k / n; K.later(k * 0.004, () => Wd.carve(o.x + (hit.x - o.x) * t, o.y + (hit.y - o.y) * t, 2.6, { debris: 0.5, force: 90, cause: 'sudo', pow: 9, noCrumble: true })); }
    EN()?.damageCircle?.(hit.x, hit.y, 6, 80, 'sudo');
    G()?.shake?.(5);
  }
  reg({ id: 'sudo', name: 'sudo !!', rate: 0.9, snd: 'sudo', st: [4, 2, 4, 4], does: 'Fires the last weapon you used again, twice, at double power. Its icon floats above you so you know what runs next. With no history it fires a root beam that cuts through metal', altDoes: 'sudo -s: your next five shots, with any weapon, run as root and punch through metal', tip: 'With great power comes great wreckage.' }, {
    fire(o) {
      const last = sudoTarget();
      K.mark({ kind: 'text', text: last ? `sudo ${WP.BY[last].name}` : 'sudo rm -rf', x: o.x, y: o.y - 10, life: 0.9, color: 'l' });
      if (!last) { rootBeam(o); return; }
      const Wd = W(), d = WP.BY[last];
      if (d.hold) {
        let lastO = o;
        K.ent({
          life: 1,
          update(dt, o2) { lastO = o2 || lastO; const pm = Wd.powMul; Wd.powMul = pm * 2; try { WP.HOLD[last](lastO, dt); } finally { Wd.powMul = pm; } },
          end() { WP.RELEASE[last]?.(lastO); }
        });
      } else {
        const pm = Wd.powMul;
        Wd.powMul = pm * 2;
        try { WP.FIRE[last](o); K.later(0.12, () => { const p2 = Wd.powMul; Wd.powMul = p2 * 2; try { WP.FIRE[last](aimO || o); } finally { Wd.powMul = p2; } }); } finally { Wd.powMul = pm; }
      }
      st.lastFired = last;
    },
    alt() { st.rootShots = 5; A('sudo'); G()?.label?.('ROOT FOR 5 SHOTS', 1200); }
  });

  function grepMatches(wd) {
    const Wd = W();
    const hits = Wd.words.filter((w) => w.sig === wd.sig);
    return hits.length > 1 ? hits : Wd.words.filter((w) => w.ids.length === wd.ids.length && Math.abs(w.w - wd.w) <= 1 && Math.abs(w.h - wd.h) <= 1);
  }
  const grepPrev = { t: 0, wd: null, list: [] };
  reg({ id: 'grep', name: 'grep', rate: 1.3, snd: 'grep', st: [3, 2, 5, 4], does: 'Aim at a word: every copy of it on screen lights up in yellow. Fire and lightning strikes every match', altDoes: 'grep -v: blasts every word around your aim except the one you point at', tip: 'Pattern matching, with lightning.' }, {
    fire(o) {
      const tp = WP.aimPoint(o);
      const wd = DW.wordAt(tp.x, tp.y);
      if (!wd) { A('deny'); G()?.label?.('AIM AT A WORD', 700); return false; }
      const list = grepMatches(wd);
      K.mark({ kind: 'text', text: `grep: ${list.length} MATCH${list.length === 1 ? '' : 'ES'}`, x: tp.x, y: tp.y - 12, life: 1.2, color: 'y' });
      list.slice(0, 40).forEach((w, k) => K.later(0.12 + k * 0.08, () => {
        const cx = w.x + w.w / 2;
        FX().beam([cx, -8, cx, w.y + w.h / 2], { kind: 'bolt', life: 0.15, c2: P32.y });
        DW.popWord(w, 0.01, -120);
        W().carve(cx, w.y + w.h / 2, 2.5, { debris: 0.5, cause: 'grep', pow: 2, scorch: true, noCrack: true });
        A('thunder');
      }));
    },
    alt(o) {
      if (!K.cooldown('grep', 3)) return;
      const tp = WP.aimPoint(o);
      const wd = DW.wordAt(tp.x, tp.y);
      let n = 0;
      for (const w of W().words) {
        if (wd && w.sig === wd.sig) continue;
        if (Math.hypot(w.x + w.w / 2 - tp.x, w.y + w.h / 2 - tp.y) > 34) continue;
        K.later(n * 0.02, () => DW.popWord(w, 0.01, -60));
        n++;
      }
      A('grep');
      K.mark({ kind: 'text', text: `grep -v: ${n}`, x: tp.x, y: tp.y - 12, life: 1, color: 'y' });
    }
  });
  WP.EXT.updates.push((dt, o) => {
    if (st.cur !== 'grep') { grepPrev.wd = null; return; }
    if ((grepPrev.t -= dt) > 0) return;
    grepPrev.t = 0.15;
    const tp = WP.aimPoint(o);
    const wd = DW.wordAt(tp.x, tp.y);
    grepPrev.wd = wd; grepPrev.list = wd ? grepMatches(wd).slice(0, 40) : [];
  });
  WP.EXT.draws.push((ctx) => {
    if (st.cur !== 'grep' || !grepPrev.wd) return;
    const pulse = 0.55 + Math.sin(performance.now() / 120) * 0.3;
    ctx.strokeStyle = `rgba(255,224,102,${pulse})`; ctx.lineWidth = 0.7;
    for (const w of grepPrev.list) ctx.strokeRect(w.x - 1, w.y - 1, w.w + 2, w.h + 2);
    const w = grepPrev.wd;
    font(ctx, `${grepPrev.list.length} MATCH${grepPrev.list.length === 1 ? '' : 'ES'}`, w.x + w.w / 2, w.y - 9, 'y');
  });

  const CLIP_W = 18, CLIP_H = 12, CLIP_USES = 6;
  reg({ id: 'copypaste', name: 'Ctrl+C / Ctrl+V', rate: 0.5, snd: 'copy', st: [3, 3, 4, 3], does: 'First shot copies the dashed box under your aim. Every shot after hurls a heavy pasted copy of it. The clipboard empties after six pastes', altDoes: 'Paste the copy as a solid platform where you aim', tip: 'Duplicate content is bad for SEO and great for demolition.' }, {
    fire(o) {
      if (!st.clip) {
        const tp = WP.aimPoint(o);
        const x0 = Math.round(tp.x - CLIP_W / 2), y0 = Math.round(tp.y - CLIP_H / 2);
        const c = DW.copyRect(x0, y0, x0 + CLIP_W, y0 + CLIP_H);
        if (c.cells.length < 20) { A('deny'); G()?.label?.('NOTHING TO COPY THERE', 800); return false; }
        st.clip = c; st.clipUses = CLIP_USES;
        K.mark({ kind: 'rect', x0, y0, x1: x0 + CLIP_W, y1: y0 + CLIP_H, life: 0.6, color: '#8fe3ff' });
        G()?.label?.('COPIED', 700);
        A('copy');
        return;
      }
      const c = st.clip;
      const pts = []; pts.src = [];
      const bx = Math.round(o.x + o.ax * 10 - c.w / 2), by = Math.round(o.y + o.ay * 10 - c.h / 2);
      for (const q of c.cells) { pts.push(bx + q.dx, by + q.dy, q.col); pts.src.push(q.src); }
      const ch = W().makeChunk(pts, o.ax * 420, o.ay * 420 - 40, { mtl: W().M.METAL, life: 6 });
      if (ch) { ch.thrown = true; ch.va = rand(-2, 2); }
      A('paste');
      if (--st.clipUses <= 0) { st.clip = null; G()?.label?.('CLIPBOARD EMPTY, FIRE TO COPY AGAIN', 900); }
    },
    alt(o) {
      const c = st.clip;
      if (!c) { A('deny'); G()?.label?.('COPY SOMETHING FIRST', 700); return; }
      const Wd = W();
      const tp = WP.aimPoint(o);
      const bx = Math.round(tp.x - c.w / 2), by = Math.round(tp.y - c.h / 2);
      for (const q of c.cells) {
        const x = bx + q.dx, y = by + q.dy;
        if (!K.inGrid(x, y) || PL().inside(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID) continue;
        Wd.setCell(x, y, q.col, Wd.M.PLASTIC, 0);
        Wd.src[i] = q.src;
        Wd.touch(i);
      }
      A('paste'); K.mark({ kind: 'rect', x0: bx, y0: by, x1: bx + c.w, y1: by + c.h, life: 0.4 });
      if (--st.clipUses <= 0) st.clip = null;
    }
  });
  WP.EXT.draws.push((ctx) => {
    if (st.cur !== 'copypaste' || !aimO) return;
    if (!st.clip) {
      const tp = WP.aimPoint(aimO);
      ctx.strokeStyle = 'rgba(143,227,255,.85)'; ctx.lineWidth = 0.6; ctx.setLineDash([1.5, 1]);
      ctx.strokeRect(Math.round(tp.x - CLIP_W / 2), Math.round(tp.y - CLIP_H / 2), CLIP_W, CLIP_H); ctx.setLineDash([]);
      return;
    }
    const p = pc(), c = st.clip, x0 = Math.round(p.x - c.w / 4), y0 = Math.round(p.y - c.h / 2 - 6);
    ctx.fillStyle = 'rgba(8,9,12,.75)'; ctx.fillRect(x0 - 1, y0 - 1, c.w / 2 + 2, c.h / 2 + 2);
    for (const q of c.cells) { if ((q.dx | q.dy) & 1) continue; ctx.fillStyle = WTP.css32(q.col); ctx.fillRect(x0 + q.dx / 2, y0 + q.dy / 2, 1, 1); }
    font(ctx, `x${st.clipUses}`, x0 + c.w / 2 + 4, y0 + 1, 'c');
  });

  function pixelSort(o, rows) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const R = 20;
    const lum = (c) => (c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11;
    const dark = [];
    let any = 0;
    for (let a = -R; a <= R; a++) {
      const cells = [];
      for (let b = -R; b <= R; b++) {
        const x = Math.floor(rows ? tp.x + b : tp.x + a), y = Math.floor(rows ? tp.y + a : tp.y + b);
        if (!K.inGrid(x, y)) continue;
        const i = y * Wd.w + x;
        if (Wd.mat[i] === Wd.SOLID) cells.push(i);
      }
      if (!cells.length) continue;
      any += cells.length;
      const vals = cells.map((i) => ({ col: Wd.col[i], src: Wd.src[i], mtl: Wd.mtl[i] })).sort((p, q) => lum(q.col) - lum(p.col));
      cells.forEach((i, k) => { Wd.col[i] = vals[k].col; Wd.src[i] = -1; Wd.mtl[i] = vals[k].mtl; Wd.gid[i] = 0; Wd.kind[i] = 0; Wd.touch(i); });
      const cut = Math.floor(cells.length * 0.55);
      for (let k = cells.length - 1; k >= cut; k--) dark.push(cells[k]);
    }
    if (!any) { A('deny'); G()?.label?.('NOTHING TO SORT HERE', 700); return false; }
    A('sort');
    K.mark({ kind: 'rect', x0: tp.x - R, y0: tp.y - R, x1: tp.x + R, y1: tp.y + R, life: 0.9, color: '#d07bff' });
    dark.sort((i, j) => (rows ? (i % Wd.w) - (j % Wd.w) : Math.floor(j / Wd.w) - Math.floor(i / Wd.w)));
    let k = 0;
    K.ent({
      life: 3,
      update() {
        for (let n = 0; n < 60 && k < dark.length; n++, k++) {
          const i = dark[k];
          if (Wd.mat[i] !== Wd.SOLID) continue;
          const x = i % Wd.w, y = (i / Wd.w) | 0;
          Wd.kill(i, x, y, x, y - 1, 1, rows ? 60 : 20, undefined);
        }
        if (k % 120 < 60) A('sort');
        return k >= dark.length;
      },
      end() { Wd.crumble(tp.x, tp.y, 0, R + 6); }
    });
  }
  reg({ id: 'pixelsort', name: 'Pixel Sorter', rate: 1.3, snd: 'sort', st: [3, 2, 3, 4], does: 'Sorts every column in a square by brightness, then the dark half pours out of the bottom like sand', altDoes: 'Row sort: dark pixels stream out sideways', tip: 'Glitch art, but structural.' }, {
    fire(o) { return pixelSort(o, false); },
    alt(o) { if (!K.cooldown('pixelsort', 1)) return; pixelSort(o, true); }
  });

  function deadPixel(o, hot) {
    const tp = WP.aimPoint(o);
    const Wd = W();
    const seen = new Set();
    const order = [];
    const front = [[Math.floor(tp.x), Math.floor(tp.y)]];
    const cols = hot ? [P32.o, P32.y, P32.e] : [P32.m, P32.l, P32.c, P32.k];
    K.ent({
      life: 1.8,
      update() {
        for (let k = 0; k < 16 && front.length; k++) {
          const [x, y] = front[(Math.random() * front.length) | 0];
          const nx = x + pick([-1, 0, 1]), ny = y + pick([-1, 0, 1]);
          if (!K.inGrid(nx, ny)) continue;
          const i = ny * Wd.w + nx;
          if (seen.has(i)) continue;
          seen.add(i);
          if (Wd.mat[i] === Wd.SOLID) { Wd.col[i] = pick(cols); Wd.src[i] = -1; Wd.touch(i); if (hot) Wd.igniteAt(nx, ny, 1); order.push(i); }
          else if (Wd.back[i]) { Wd.bcol[i] = pick(cols); Wd.ptex[i] = 0; Wd.touch(i); order.push(i); }
          front.push([nx, ny]);
        }
        if (Math.random() < 0.2) A('deadpx');
      },
      end() {
        let k = 0;
        A('glitch');
        K.ent({
          life: 2,
          update() {
            for (let n = 0; n < 90 && k < order.length; n++, k++) {
              const i = order[k], x = i % Wd.w, y = (i / Wd.w) | 0;
              if (Wd.mat[i] === Wd.SOLID) Wd.kill(i, x, y, tp.x, tp.y, 0.6, 90);
              else if (Wd.back[i]) Wd.eraseBack(x + 0.5, y + 0.5, 0.8);
            }
            return k >= order.length;
          },
          end() { WP.explode(tp.x, tp.y, 5, { letters: 4, cause: 'deadpixel', kind: hot ? 'fire' : 'plasma' }); }
        });
      },
      draw(ctx) { if ((this.t * 8 | 0) & 1) { ctx.fillStyle = hot ? '#ffe066' : '#ff3ad1'; ctx.fillRect(Math.floor(tp.x), Math.floor(tp.y), 1, 1); } }
    });
  }
  reg({ id: 'deadpixel', name: 'Dead Pixel', rate: 0.9, snd: 'deadpx', st: [3, 2, 3, 4], does: 'A stuck pixel that infects whatever it touches in random colours, then every infected pixel dies. The shape it grew is the hole you get', altDoes: 'Hot pixel: the infection burns as it spreads', tip: 'Warranty void.' }, {
    fire(o) { deadPixel(o, false); },
    alt(o) { if (!K.cooldown('deadpixel', 1.2)) return; deadPixel(o, true); }
  });

  const THEMES = [
    { name: 'NORD', pal: ['#2e3440', '#3b4252', '#4c566a', '#88c0d0', '#81a1c1', '#d8dee9', '#eceff4', '#8fbcbb'], acc: '#88c0d0', does: 'freezes', fx(x, y, R) { W().freezeAt(x, y, R * 0.9); A('freezeHit'); } },
    { name: 'GRUVBOX', pal: ['#282828', '#3c3836', '#665c54', '#d65d0e', '#af3a03', '#fe8019', '#b57614', '#fabd2f'], acc: '#fe8019', does: 'rusts', fx(x, y, R) { const Wd = W(); inDisc(x, y, R, (cx, cy, i) => { if (Wd.mat[i] === Wd.SOLID && (Wd.mtl[i] === Wd.M.METAL || Math.random() < 0.45)) Wd.kill(i, cx, cy, x, y, 0.5, 40); }); Wd.crumble(x, y, 0, R + 6); A('acid'); } },
    { name: 'TOKYO NIGHT', pal: ['#1a1b26', '#24283b', '#414868', '#7aa2f7', '#bb9af7', '#7dcfff', '#f7768e', '#c0caf5'], acc: '#bb9af7', does: 'electrifies', fx(x, y, R) { for (let k = 0; k < 6; k++) FX().bolt(x, y, x + rand(-R, R), y + rand(-R, R)); WP.conduct(Math.floor(x), Math.floor(y)); EN()?.damageCircle?.(x, y, R * 1.3, 70, 'lightning'); W().carve(x, y, 4, { debris: 0.5, cause: 'theme', pow: 3, scorch: true }); A('tesla'); } },
    { name: 'CATPPUCCIN', pal: ['#f5c2e7', '#cba6f7', '#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#94e2d5', '#89b4fa'], acc: '#f5c2e7', does: 'turns to rubber', fx(x, y, R) { const Wd = W(); inDisc(x, y, R, (cx, cy, i) => { if (Wd.mat[i] === Wd.SOLID) Wd.mtl[i] = Wd.M.RUBBER; }); Wd.letterRing(x, y, 0, R, 160); A('ball'); } },
    { name: 'ROSE PINE', pal: ['#191724', '#26233a', '#eb6f92', '#f6c177', '#ebbcba', '#31748f', '#9ccfd8', '#c4a7e7'], acc: '#eb6f92', does: 'ignites', fx(x, y, R) { for (let k = 0; k < 9; k++) W().igniteAt(x + rand(-R, R) * 0.8, y + rand(-R, R) * 0.8, 14); A('flare'); } },
    { name: 'KANAGAWA', pal: ['#1f1f28', '#2a2a37', '#54546d', '#7e9cd8', '#7fb4ca', '#957fb8', '#c0a36e', '#dcd7ba'], acc: '#7fb4ca', does: 'sends a wave', fx(x, y, R) { WP.shockwave(x, y, R * 1.8); A('sound'); } }
  ];
  st.themeIdx = 0;
  reg({ id: 'theme', name: 'Theme Switcher', rate: 1, snd: 'theme', st: [3, 2, 3, 5], does: 'Each shot paints an area in the next Omarchy theme, and every theme is an element: Nord freezes, Gruvbox rusts, Tokyo Night electrifies, Catppuccin turns things to rubber, Rose Pine burns, Kanagawa sends a wave. The next theme shows above you', altDoes: 'Theme roulette: the whole screen cycles colours for five seconds', tip: 'omarchy theme set, but weaponised.' }, {
    fire(o) {
      const th = THEMES[st.themeIdx % THEMES.length];
      st.themeIdx++;
      const tp = WP.aimPoint(o);
      const Wd = W();
      const pal = th.pal.map((h) => WTP.packHex(h));
      const R = 15;
      const pickC = (c) => pal[Math.min(pal.length - 1, Math.floor(WTP.lum(c) * pal.length))];
      inDisc(tp.x, tp.y, R, (x, y, i) => {
        if (Wd.mat[i] === Wd.SOLID) { Wd.col[i] = mix(Wd.col[i], pickC(Wd.col[i]), 0.85); Wd.src[i] = -1; Wd.touch(i); }
        else if (Wd.back[i]) { Wd.bcol[i] = mix(Wd.bcol[i], pickC(Wd.bcol[i]), 0.85); Wd.ptex[i] = 0; Wd.touch(i); }
      });
      K.mark({ kind: 'ring', x: tp.x, y: tp.y, r: R, life: 0.5, color: th.acc });
      K.mark({ kind: 'text', text: `${th.name}: ${th.does.toUpperCase()}`, x: tp.x, y: tp.y - R - 4, life: 1.1, color: '7' });
      K.later(0.15, () => th.fx(tp.x, tp.y, R));
    },
    alt() {
      if (!K.cooldown('theme', 10)) return;
      G()?.forceFull?.(5.2);
      K.ent({ life: 5, update() { document.getElementById('cv').style.filter = `hue-rotate(${Math.round(this.t * 220)}deg) saturate(1.6)`; }, end() { document.getElementById('cv').style.filter = ''; } });
      A('theme');
      G()?.announce?.('THEME ROULETTE', 3);
    }
  });
  WP.EXT.draws.push((ctx) => {
    if (st.cur !== 'theme') return;
    const th = THEMES[st.themeIdx % THEMES.length], p = pc();
    ctx.fillStyle = th.acc; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 12, 3, 3);
    font(ctx, th.name, p.x, p.y - 20, '7');
  });

  function defrag(o) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const cols = [];
    for (let k = 0; k < 5000 && cols.length < 600; k++) {
      const x = Math.floor(tp.x + rand(-60, 60)), y = Math.floor(tp.y + rand(-45, 45));
      if (!K.inGrid(x, y)) continue;
      const i = y * Wd.w + x;
      if (Wd.mat[i] === Wd.RUBBLE || Wd.mat[i] === Wd.DEBRIS) { const c = Wd.col[i]; cols.push(c); Wd.kill(i, x, y, x, y, 0, 0); FX().suck(x + 0.5, y + 0.5, 0, 0, c, tp.x, tp.y, 0.6); }
    }
    if (cols.length < 40) inDisc(tp.x, tp.y, 9, (x, y, i) => { if (Wd.mat[i] === Wd.SOLID && !PL().inside(x, y)) { cols.push(Wd.col[i]); Wd.kill(i, x, y, tp.x, tp.y, 0, 0); FX().suck(x + 0.5, y + 0.5, rand(-40, 40), rand(-40, 40), Wd.col[i], tp.x, tp.y, 0.5); } });
    if (cols.length < 20) { A('deny'); G()?.label?.('NOTHING TO DEFRAG HERE', 800); return false; }
    cols.sort((a, b) => WTP.lum(a) - WTP.lum(b));
    const side = Math.ceil(Math.sqrt(cols.length));
    const x0 = Math.round(tp.x - side / 2), y0 = Math.round(tp.y - side / 2);
    const placed = [];
    cols.forEach((c, k) => {
      const x = x0 + (k % side) + Math.floor((k % side) / 6), y = y0 + Math.floor(k / side) + Math.floor(Math.floor(k / side) / 6);
      if (!K.inGrid(x, y) || PL().inside(x, y)) return;
      const i = y * Wd.w + x;
      if (Wd.mat[i] === Wd.SOLID) return;
      Wd.setCell(x, y, c, Wd.M.PLASTIC, 0); placed.push(i);
    });
    st.defragBlocks = placed;
    A('defrag');
    const bar = { t: 0 };
    K.ent({ life: 1.1, update(dt) { bar.t += dt; }, draw(ctx) { const w = side + 8, k = Math.min(1, bar.t / 1); ctx.fillStyle = 'rgba(8,9,12,.85)'; ctx.fillRect(x0 - 4, y0 - 9, w, 4); ctx.fillStyle = '#4cc6ec'; ctx.fillRect(x0 - 3, y0 - 8, Math.round((w - 2) * k), 2); } });
    K.later(1.1, () => { WP.explode(tp.x, tp.y, Math.min(18, 6 + side * 0.6), { letters: 8, cause: 'defrag' }); K.mark({ kind: 'text', text: 'DEFRAGMENTED', x: tp.x, y: y0 - 14, life: 1, color: 'c' }); });
  }
  reg({ id: 'defrag', name: 'Defrag', rate: 2, snd: 'defrag', st: [4, 1, 3, 4], does: 'Sucks up rubble around your aim (or shreds the spot itself) into one tidy sorted block, fills a progress bar, then blows the block up', altDoes: 'Fragment: scatters every block it made', tip: 'Optimizing drive C: with explosives.' }, {
    fire(o) { return defrag(o); },
    alt() {
      const Wd = W();
      const b = st.defragBlocks || [];
      if (!b.length) { A('deny'); return; }
      for (const i of b) if (Wd.mat[i] === Wd.SOLID) { const x = i % Wd.w, y = (i / Wd.w) | 0; FX().debris(x, y, rand(-200, 200), rand(-260, 0), Wd.col[i]); Wd.kill(i, x, y, x, y, 0, 0); }
      st.defragBlocks = [];
      A('crash', 100);
    }
  });

  function peel(o, big) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const len = big ? 110 : 64, wid = big ? 40 : 7;
    const a = Math.atan2(o.ay, o.ax);
    const pts = [];
    const glyphs = new Set();
    const panes = new Set();
    let n = 0;
    for (let d = 0; d < len; d++) for (let q = -wid / 2; q <= wid / 2; q++) {
      const x = Math.floor(tp.x + Math.cos(a) * (d - len / 2) - Math.sin(a) * q), y = Math.floor(tp.y + Math.sin(a) * (d - len / 2) + Math.cos(a) * q);
      if (!K.inGrid(x, y) || PL().inside(x, y)) continue;
      const i = y * Wd.w + x;
      if (Wd.mat[i] === Wd.SOLID) { if (Wd.gid[i] && Wd.kind[i] === Wd.K_TEXT) glyphs.add(Wd.gid[i]); continue; }
      if (Wd.back[i]) {
        if ((x + y) % 3 === 0) pts.push(x, y, Wd.bcol[i]);
        Wd.back[i] = 0; if (Wd.rid[i]) panes.add(Wd.rid[i]); Wd.touch(i); n++;
      } else if (Wd.code[i]) {
        if ((x + y) % 3 === 0) pts.push(x, y, Wd.ocol[i] || P32['2']);
        Wd.code[i] = 0; Wd.touch(i); n++;
      }
    }
    for (const r of panes) ST().dirty(r);
    let k = 0;
    for (const g of glyphs) { if (k++ > 80) break; Wd.detachGlyph(g, o.ax * 60 + rand(-20, 20), -rand(20, 80)); }
    if (pts.length >= 12) { const c = Wd.makeChunk(pts, o.ax * 120, -170, { mtl: Wd.M.PAPER, life: 6 }); if (c) c.va = rand(-3, 3); }
    A('peel');
    if (!n) { A('deny'); G()?.label?.('NOTHING LEFT TO PEEL THERE', 800); return false; }
    G()?.scored?.(n, tp.x, tp.y, 'peel');
  }
  reg({ id: 'peeler', name: 'Peeler', rate: 0.7, snd: 'peel', st: [2, 3, 3, 4], does: 'Peels the surface you aim at off in a long curling strip: window backgrounds first, the wallpaper under them next. Text on a peeled window falls off', altDoes: 'Peels a whole sheet at once', tip: 'Behind the wallpaper there is only void.' }, {
    fire(o) { return peel(o, false); },
    alt(o) { if (!K.cooldown('peeler', 2)) return; peel(o, true); }
  });

  reg({ id: 'wsportal', name: 'Move to Workspace', rate: 1.2, snd: 'portalWs', recoil: 3, shake: 4, st: [5, 1, 4, 5], does: 'Super+Shift+number: the window you hit is thrown sideways to another workspace. It flies across the screen and rams everything in its path', altDoes: 'Workspace swipe: everything loose on screen slides sideways at once', tip: 'Super+Shift+2, physically.' }, {
    fire(o) {
      const hit = K.beam(o, 900, (r) => K.liveWin(r));
      FX().beam([o.x, o.y, hit.x, hit.y], { kind: 'rail', life: 0.18, w: 1.5, c1: P32.c, c2: P32.C, c3: P32.m });
      const w = hit.rid && ST().wins[hit.rid];
      if (!w || w.reg.type === 'bar') { A('deny'); G()?.label?.('AIM AT A WINDOW', 700); return false; }
      const dir = o.ax >= 0 ? 1 : -1;
      const n = 2 + ((Math.random() * 8) | 0);
      FX().pop((w.reg.x0 + w.reg.x1) / 2, w.reg.y0 + 6, `${dir > 0 ? '>>' : '<<'} ${n}`, { scale: 3, ramp: ['7', 'C', 'c'], life: 1, vy: -10 });
      A('portalWs'); G()?.shake?.(6);
      K.later(0.12, () => ST().collapse(hit.rid, { vx: dir * 620, vy: -90, va: dir * 0.15 }));
    },
    alt(o) {
      if (!K.cooldown('wsportal', 5)) return;
      const dir = o.ax >= 0 ? 1 : -1;
      for (const s of ST().slabs) if (!s.dead && !s.held) { s.vx = (s.vx || 0) + dir * 480; s.vy = (s.vy || 0) - 90; s.rest = 0; s.pivot = null; if (s.win) s.win.state = 'falling'; }
      for (const c of W().chunks) { c.vx += dir * 420; c.vy -= 80; c.rest = 0; }
      for (const e of EN()?.list || []) if (!e.T.boss) { e.vx += dir * 300; e.vy -= 100; }
      W().crumble(PL().x, PL().y, 0, 200);
      G()?.shake?.(10); G()?.chroma?.(0.8);
      G()?.announce?.(`WORKSPACE ${dir > 0 ? 'NEXT' : 'PREVIOUS'}`, 2);
      A('portalWs');
    }
  });

  const zoomKeys = () => DW.CELL_KEYS;
  function zoom(o, out) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const R = 13, r = R / 2;
    const keys = zoomKeys();
    const snap = {};
    for (const k of keys) snap[k] = new Map();
    const cx = Math.floor(tp.x), cy = Math.floor(tp.y);
    inDisc(cx, cy, R, (x, y, i) => { for (const k of keys) snap[k].set(i, Wd[k][i]); });
    const get = (k, x, y) => { const i = y * Wd.w + x; return snap[k].has(i) ? snap[k].get(i) : Wd[k][i]; };
    inDisc(cx, cy, R, (x, y, i, dx, dy) => {
      if (PL().inside(x, y)) return;
      if (!out) {
        const sx = cx + Math.round(dx / 2), sy = cy + Math.round(dy / 2);
        for (const k of keys) Wd[k][i] = get(k, sx, sy);
        if (Wd.mat[i] === Wd.SOLID) Wd.gid[i] = 0;
      } else if (dx * dx + dy * dy <= r * r) {
        const sx = cx + dx * 2, sy = cy + dy * 2;
        if (K.inGrid(sx, sy)) for (const k of keys) Wd[k][i] = get(k, sx, sy);
        if (Wd.mat[i] === Wd.SOLID) Wd.gid[i] = 0;
      } else {
        if (Wd.mat[i] === Wd.SOLID) Wd.kill(i, x, y, cx, cy, 0.3, 60);
        Wd.back[i] = 0; Wd.code[i] = 0;
      }
      if (Wd.mat[i] === Wd.ROCK) Wd.mat[i] = Wd.HOLE;
      Wd.touch(i);
    });
    for (const w of ST().wins) if (w && w.state === 'static') ST().dirty(w.id);
    K.mark({ kind: 'ring', x: cx + 0.5, y: cy + 0.5, r: R, life: 0.5, color: out ? '#ff8a5a' : '#8fe3ff' });
    K.mark({ kind: 'text', text: out ? 'CTRL -' : 'CTRL +', x: cx, y: cy - R - 4, life: 0.8, color: out ? 'o' : 'c' });
    K.later(0.4, () => { ST().impact(cx, cy, R, 5); Wd.crumble(cx, cy, 0, R + 4); });
    A(out ? 'zoomOut' : 'zoomIn');
    G()?.shake?.(3);
  }
  reg({ id: 'zoom', name: 'Zoom', rate: 0.8, snd: null, st: [3, 2, 3, 4], does: 'Ctrl +: magnifies a circle of the screen to twice its size. The giant pixels crack, crowd out what was around them and fall apart', altDoes: 'Ctrl -: shrinks a circle to half its size, leaving a ring of void that lets it drop', tip: 'Accessibility settings, maximum.' }, {
    fire(o) { zoom(o, false); },
    alt(o) { if (!K.cooldown('zoom', 1)) return; zoom(o, true); }
  });

  function banner(x, vx, vy, text, col, bg) {
    const c = DW.rainLine(text, x, { col, bg });
    if (c) { c.vx = vx; c.vy = vy; }
    return c;
  }
  reg({ id: 'cookies', name: 'Cookie Banner', rate: 2.2, snd: 'cookie', st: [5, 1, 4, 4], does: 'A huge WE USE COOKIES banner drops from the top of the screen and crushes everything under it', altDoes: 'Reject all: a banner slides in from the side at your aim height and sweeps the line', tip: 'We value your privacy. Please hold still.' }, {
    fire(o) {
      const tp = WP.aimPoint(o);
      banner(tp.x, rand(-10, 10), 260, 'WE USE COOKIES [ACCEPT ALL]', P32['0'], WTP.packHex('#f3e6c4'));
      A('cookie'); G()?.event?.('ACCEPT ALL', tp.x, 20, 1);
    },
    alt(o) {
      if (!K.cooldown('cookies', 3)) return;
      const tp = WP.aimPoint(o);
      const dir = o.ax >= 0 ? 1 : -1;
      const c = banner(tp.x, dir * 520, -40, '[REJECT ALL]', P32['7'], WTP.packHex('#c8372d'));
      if (c) { c.x = dir > 0 ? -30 : W().w + 30; c.y = tp.y; }
      A('cookie');
    }
  });

  function captcha(o) {
    const Wd = W();
    const tp = WP.aimPoint(o);
    const N = 4, S = 8;
    const x0 = Math.round(tp.x - (N * S) / 2), y0 = Math.round(tp.y - (N * S) / 2);
    const pickN = 5 + ((Math.random() * 3) | 0);
    const sq = [];
    for (let k = 0; k < N * N; k++) sq.push(k);
    sq.sort(() => Math.random() - 0.5);
    const sel = new Set(sq.slice(0, pickN));
    const shown = new Set();
    const order = [...sel];
    A('captcha');
    K.ent({
      life: 0.6 + order.length * 0.18 + 0.4,
      update() {
        const k = Math.floor((this.t - 0.6) / 0.18);
        while (shown.size <= k && shown.size < order.length) {
          const q = order[shown.size];
          shown.add(q);
          const qx = x0 + (q % N) * S, qy = y0 + Math.floor(q / N) * S;
          for (let y = qy; y < qy + S; y++) for (let x = qx; x < qx + S; x++) {
            if (!K.inGrid(x, y) || PL().inside(x, y)) continue;
            const i = y * Wd.w + x;
            if (Wd.mat[i] === Wd.SOLID) Wd.kill(i, x, y, qx + S / 2, qy + S / 2, 0.5, 90);
            else if (Wd.back[i]) { Wd.back[i] = 0; Wd.touch(i); }
          }
          EN()?.damageCircle?.(qx + S / 2, qy + S / 2, S * 0.75, 60, 'captcha');
          A('click');
        }
      },
      end() { for (const w of ST().wins) if (w && w.state === 'static') ST().dirty(w.id); Wd.crumble(tp.x, tp.y, 0, N * S); },
      draw(ctx) {
        ctx.lineWidth = 0.5;
        const hw = Math.max(N * S, 76); ctx.fillStyle = 'rgba(66,133,244,.92)'; ctx.fillRect(x0 + (N * S - hw) / 2, y0 - 8, hw, 7);
        font(ctx, 'SELECT ALL SQUARES', x0 + (N * S) / 2, y0 - 7, '7');
        for (let q = 0; q < N * N; q++) {
          const qx = x0 + (q % N) * S, qy = y0 + Math.floor(q / N) * S;
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.strokeRect(qx + 0.25, qy + 0.25, S - 0.5, S - 0.5);
          if (shown.has(q)) { ctx.fillStyle = 'rgba(66,133,244,.45)'; ctx.fillRect(qx, qy, S, S); ctx.fillStyle = '#ffffff'; ctx.fillRect(qx + S - 3, qy + 1, 2, 2); }
        }
      }
    });
  }
  reg({ id: 'captcha', name: 'Captcha', rate: 1.6, snd: null, st: [4, 2, 3, 4], does: 'Drops a 4 by 4 captcha grid where you aim, then picks five to seven squares one by one. Every picked square is cut clean out', altDoes: 'I am not a robot: every enemy near you is stunned and shocked', tip: 'Select all squares with demolition.' }, {
    fire(o) { captcha(o); },
    alt() {
      if (!K.cooldown('captcha', 6)) return;
      const p = pc();
      let n = 0;
      for (const e of EN()?.list || []) if (Math.hypot(e.x - p.x, e.y - p.y) < 90) { e.stun = 3; e.damage(30, 'captcha'); FX().bolt(p.x, p.y - 4, e.x, e.y); n++; }
      K.mark({ kind: 'text', text: `I AM NOT A ROBOT  ${n ? n + ' STUNNED' : ''}`, x: p.x, y: p.y - 14, life: 1.2, color: 'c' });
      A('captcha');
    }
  });

  const DESK_ST = {
    altf4: [5, 1, 5, 4], superq: [5, 1, 4, 4], rmrf: [3, 1, 4, 5], ctrlz: [1, 3, 3, 2], kill9: [5, 1, 5, 2], forkbomb: [4, 1, 3, 5], dragdrop: [3, 5, 4, 4],
    screenshot: [2, 2, 3, 3], cursors: [3, 1, 3, 4], bsod: [5, 1, 5, 5], tiler: [4, 1, 4, 4], panic: [4, 1, 5, 4], segfault: [2, 4, 3, 3], zipbomb: [4, 1, 3, 4],
    ddos: [3, 1, 5, 4], caps: [2, 2, 3, 3], tearing: [3, 1, 5, 5], usb: [4, 2, 3, 3], battery: [4, 2, 3, 4], scroll: [3, 2, 4, 3], notifspam: [3, 3, 3, 3], overclock: [2, 1, 1, 3]
  };
  for (const [id, v] of Object.entries(DESK_ST)) if (WP.BY[id] && !WP.BY[id].st) WP.BY[id].st = v;
})();
