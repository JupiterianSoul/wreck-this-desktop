(() => {
  const WTP = window.WTP;
  const P = WTP.player;
  const W = () => WTP.world;
  const R = { phase: 0, crouchK: 0, lean: 0, look: 0, blinkT: 2, blink: 0, scarf: null, rag: null, ghosts: [], roll: 0, land: 0, idleKind: 0, swayT: 0, lastPose: null, sitK: 0 };
  WTP.rig = R;
  const K = 22 / 14;
  const TH = 3.15 * K, SH = 3.15 * K, UA = 2.35 * K, FA = 2.35 * K, TORSO = 4.5 * K, HEAD = 1.6 * K;
  const LW = 1.55 * 1.35, FW = 0.78 * 1.4;
  R.K = K;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  function solid(x, y) { const Wd = W(); return Wd.solid(Math.floor(x), Math.floor(y)); }
  function groundAt(x, y0, y1) {
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) if (solid(x, y)) return y;
    return null;
  }
  function ik(ax, ay, bx, by, l1, l2, bendSign) {
    let dx = bx - ax, dy = by - ay;
    let d = Math.hypot(dx, dy);
    const max = l1 + l2 - 0.02;
    if (d > max) { bx = ax + (dx / d) * max; by = ay + (dy / d) * max; dx = bx - ax; dy = by - ay; d = max; }
    d = Math.max(0.01, d);
    const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const base = Math.atan2(dy, dx);
    const ang = base + a * bendSign;
    return { jx: ax + Math.cos(ang) * l1, jy: ay + Math.sin(ang) * l1, ex: bx, ey: by };
  }

  function pose(dt, aim, weaponSprite, opts) {
    const face = P.face;
    const anim = P.pickAnim();
    const cx = P.x + P.w / 2;
    const base = P.y + P.h;
    const sp = Math.abs(P.vx);
    const ground = P.ground;
    R.crouchK = lerp(R.crouchK, P.crouch || P.rollT > 0 ? 1 : 0, Math.min(1, dt * 14));
    let targetLean = 0;
    if (ground && sp > 12) targetLean = Math.min(0.28, sp / 470) * Math.sign(P.vx) * face;
    if (P.dashT > 0) targetLean = 0.55;
    if (R.crouchK > 0.5) targetLean = 0.3;
    if (!ground && P.vy < -60) targetLean = -0.1;
    R.lean = lerp(R.lean, targetLean, Math.min(1, dt * 10));
    if (ground && sp > 6) R.phase += dt * sp * 0.27;
    else if (ground) R.phase = lerp(R.phase, Math.round(R.phase / Math.PI) * Math.PI, Math.min(1, dt * 8));
    const idle = ground && sp < 6 && P.idleT > 0.4;
    const WPs = WTP.weapons?.st || {}, firing = !!WTP.input?.wantFire?.();
    const aim0 = Math.atan2(aim.y, aim.x);
    const quiet = performance.now() - (WTP.input?.lastInput || 0) > 150;
    if (idle && quiet && !firing && !P.carry && !P.victory && Math.abs(aim0 - (R.aimLast ?? aim0)) < 0.04 && !(WPs.reload > 0)) R.relax = (R.relax || 0) + dt; else R.relax = 0;
    R.aimLast = aim0;
    const relax = R.relax;
    const lib = relax > 10 ? idleLib(dt) : (R.lib = null);
    if (lib && lib.kind !== 'sit') return idlePose(lib, cx, base, face, opts);
    const iSet = lib ? 3 : relax > 4 ? Math.floor((relax - 4) / 2) % 3 : -1;
    let edge = false;
    if (iSet === 3) edge = groundAt(cx + face * 3.2 * K, base - 1, base + 3) == null;
    R.swayT += dt;
    const breathe = Math.sin(R.swayT * 2.2) * (idle ? 0.18 : 0.08) * K;
    const stepBob = ground && sp > 12 ? Math.abs(Math.cos(R.phase)) * 0.55 * K : 0;
    const legReach = TH + SH;
    const crouchDrop = R.crouchK * 2.6 * K;
    const landDrop = Math.max(0, P.land) * 6 * K;
    let hipY = base - legReach * 0.93 + crouchDrop + landDrop + stepBob * 0.6 - breathe * 0.3;
    if (iSet === 3) hipY = base - (edge ? 0.2 : 1.4) * K;
    if (!ground) hipY = base - legReach * 0.9 + (P.vy < -40 ? 0.8 * K : 0);
    if (P.hurtT > 0) hipY += 0.8 * K;
    const hipX = cx - face * 0.2 * K;
    const flinch = P.hurtT > 0 ? -0.35 * face : 0;
    const lean = R.lean * face + flinch + (iSet === 1 ? -0.18 * face * Math.sin(Math.min(1, (relax % 2) / 1) * Math.PI) : 0);
    const nx = hipX + Math.sin(lean) * TORSO, ny = hipY - Math.cos(lean) * TORSO + breathe * 0.2;
    const lookY = clamp(aim.y, -0.8, 0.8) * 0.5 * K;
    const lookAround = iSet === 0 ? Math.sin(relax * 2.4) * 0.45 * K : 0;
    const hx = nx + Math.sin(lean) * HEAD * 1.05 + face * 0.15 * K + lookAround, hy = ny - Math.cos(lean) * HEAD * 1.05 + lookY * 0.3 - (iSet === 0 ? Math.abs(Math.sin(relax * 1.2)) * 0.2 * K : 0);
    const shX = lerp(nx, hipX, 0.14), shY = lerp(ny, hipY, 0.14);
    const legs = [];
    for (let k = 0; k < 2; k++) {
      const side = k === 0 ? 1 : -1;
      let fx, fy;
      const ph = R.phase + (k ? Math.PI : 0);
      if (iSet === 3) {
        if (edge) { fx = hipX + face * (2.4 + k * 0.5) * K; fy = hipY + (3.6 + Math.sin(R.swayT * 2 + k * 2) * 0.5) * K; }
        else { fx = hipX + face * (3.2 + k * 0.6) * K; fy = base - 0.1; }
      } else if (P.flipT > 0 && !ground) {
        fx = hipX + face * (k ? 1.4 : 0.9) * K; fy = hipY + (k ? 2.4 : 2.9) * K;
      } else if (P.mantle) {
        fx = hipX + P.mantle.dir * (k ? 1.6 : 0.6) * K; fy = hipY + (k ? 4.8 : 2.6) * K;
      } else if (P.kickT > 0 && k === 0) {
        const kk = 1 - P.kickT / 0.22;
        const dir = P.kickDir || 0;
        fx = hipX + face * Math.sin(kk * Math.PI) * 5.2 * K;
        fy = hipY + (dir > 0.5 ? 6 : dir < -0.5 ? -2.5 : 2.2) * K - Math.sin(kk * Math.PI) * (dir < -0.5 ? 2 : 1) * K;
      } else if (ground) {
        if (sp > 6) {
          const stride = Math.min(2.8, 0.9 + sp / 70) * K;
          fx = hipX + Math.sin(ph) * stride * Math.sign(P.vx);
          const lift = Math.max(0, -Math.cos(ph)) * Math.min(2, 0.6 + sp / 90) * K;
          const g = groundAt(fx, base - 4, base + 4);
          fy = (g != null ? g : base) - lift;
        } else {
          fx = hipX + side * (0.9 + R.crouchK * 0.6) * K + face * 0.3 * K;
          const g = groundAt(fx, base - 4, base + 4);
          fy = g != null ? g : base;
          if (idle && R.idleKind === 1 && k === 0) fy -= Math.max(0, Math.sin(R.swayT * 7)) * 0.5 * K;
        }
      } else if (P.sliding || P.wall) {
        const wd = P.wall || P.wallNear?.() || face;
        const scr = Math.sin(R.swayT * 16 + k * Math.PI) * 0.7 * K;
        fx = hipX + wd * (k ? 2.2 : 1.2) * K;
        fy = hipY + (k ? 3.5 : 5.4) * K + scr;
      } else if (P.vy < -40) {
        fx = hipX + (side * 0.6 + face * (k ? -0.4 : 0.9)) * K;
        fy = hipY + (k ? 3.6 : 4.6) * K;
      } else {
        fx = hipX + (side * 1.4 - face * 0.2 + Math.sin(R.swayT * 9 + k) * 0.25) * K;
        fy = hipY + 5.6 * K;
      }
      const s = ik(hipX, hipY, fx, fy, TH, SH, face > 0 ? -1 : 1);
      legs.push(s);
    }
    let aimA = Math.atan2(aim.y, aim.x) + (opts.swing || 0);
    const dCur = WTP.weapons?.BY?.[WPs.cur];
    if (relax > 2.5 && iSet !== 1) aimA = face > 0 ? 0.95 : Math.PI - 0.95;
    if (iSet === 1) aimA = face > 0 ? 1.2 : Math.PI - 1.2;
    if (WPs.reload > 0) aimA = (face > 0 ? -1.05 : Math.PI + 1.05) + Math.sin(R.swayT * 14) * 0.08;
    let cock = 0;
    if (dCur?.throw && firing && WPs.cd > 0) cock = Math.max(0, Math.min(1, 1 - WPs.cd / 0.28));
    if (cock > 0) aimA -= face * cock * 2.1;
    const rec = P.recoil || 0;
    if (rec > 0 && !dCur?.melee) aimA -= face * Math.min(0.35, rec * 0.045);
    let fhx, fhy, bhx, bhy;
    const holding = !!P.carry;
    if (holding) {
      fhx = nx + face * 0.6 * K; fhy = ny - 3.2 * K; bhx = nx - face * 0.6 * K; bhy = ny - 3.2 * K;
    } else if (P.victory) {
      fhx = shX + face * 1.2 * K; fhy = shY - 4.2 * K; bhx = shX - face * 1.2 * K; bhy = shY - 4.2 * K;
    } else if (P.hurtT > 0 && !weaponSprite) {
      fhx = shX - face * 1.5 * K; fhy = shY - 2.5 * K; bhx = shX - face * 2 * K; bhy = shY - 1 * K;
    } else if (weaponSprite && !P.dead) {
      const reach = (3.7 - rec * 0.6 - cock * 0.8) * K;
      fhx = shX + Math.cos(aimA) * reach; fhy = shY + Math.sin(aimA) * reach;
      const two = !opts.oneHand;
      if (two) { bhx = shX + Math.cos(aimA) * (reach + 1.6 * K) - face * 0.2 * K; bhy = shY + Math.sin(aimA) * (reach + 1.6 * K) + 0.4 * K; }
      else { bhx = shX + (-face * 1 + Math.sin(R.phase) * 1.2) * K; bhy = shY + 3.8 * K; }
    } else {
      fhx = shX + face * 1.3 * K; fhy = shY + 3.6 * K;
      bhx = shX + (-face * 1.1 + Math.sin(R.phase) * 1.4) * K; bhy = shY + 3.6 * K;
    }
    if (!ground && !holding && !P.victory && P.vy < -60 && !weaponSprite && !(P.flipT > 0)) { bhy -= 3 * K; fhy -= 3 * K; }
    if (P.flipT > 0 && !ground && !holding && !weaponSprite) { fhx = hipX + face * 1.6 * K; fhy = hipY + 1.6 * K; bhx = hipX + face * 1.0 * K; bhy = hipY + 1.9 * K; }
    if (!holding && !P.victory && !P.dead && weaponSprite) {
      if (WPs.reload > 0) { bhx = fhx + Math.cos(aimA) * 1.2 * K + Math.sin(R.swayT * 14) * 0.5 * K; bhy = fhy + Math.sin(aimA) * 1.2 * K + 0.6 * K; }
      else if (iSet === 1) { const st2 = Math.sin(Math.min(1, (relax % 2) / 1) * Math.PI); bhx = shX - face * 0.6 * K; bhy = shY - (2 + st2 * 2.6) * K; }
      else if (iSet === 2) { bhx = hx + (-face * 0.6 + Math.sin(R.swayT * 18) * 0.35) * K; bhy = hy - 1.2 * K; }
      else if (iSet === 3) { bhx = hipX - face * 1.4 * K; bhy = hipY + 0.2 * K; }
      else if (P.mantle) { const m = P.mantle; bhx = cx + m.dir * 3 * K; bhy = m.y1 + P.h - 0.6; }
      else if (!ground && (P.sliding || P.wall)) { const wd = P.wall || P.wallNear?.() || face; bhx = shX + wd * 2.6 * K; bhy = shY - 1.6 * K + Math.sin(R.swayT * 10) * 0.5 * K; }
      else if (ground && sp > 85 && opts.oneHand) { bhy = shY + (3.2 - Math.cos(R.phase) * 1.4) * K; }
    }
    const armF = ik(shX, shY, fhx, fhy, UA, FA, face > 0 ? 1 : -1);
    const armB = ik(shX, shY, bhx, bhy, UA, FA, face > 0 ? 1 : -1);
    return { hipX, hipY, nx, ny, hx, hy, shX, shY, legs, armF, armB, aimA, face, anim };
  }


  const IDLES = ['bop', 'disco', 'robot', 'guitar', 'pushups', 'phone', 'juggle', 'sleep', 'watch', 'wave', 'sit'];
  const IDLE_DUR = { sleep: 40, sit: 9 };
  function idleLib(dt) {
    if (!R.lib) {
      const pool = IDLES.filter((k) => k !== R.lastLib);
      R.lib = { kind: R.forceIdle || pool[(Math.random() * pool.length) | 0], t: 0 };
      R.lib.dur = IDLE_DUR[R.lib.kind] || 6 + Math.random() * 3;
      R.lastLib = R.lib.kind;
    }
    R.lib.t += dt;
    if (R.lib.t > R.lib.dur && !R.forceIdle) { R.lib = null; return idleLib(0); }
    return R.lib;
  }
  R.idleNow = () => (R.lib ? R.lib.kind : null);
  function idlePose(L, cx, base, face, opts) {
    const t = L.t, S = Math.sin, PI2 = Math.PI * 2;
    const gnd = (x) => { const g = groundAt(x, base - 4, base + 4); return g != null ? g : base; };
    let hipX = cx - face * 0.2 * K, hipY = base - (TH + SH) * 0.93 + Math.sin(R.swayT * 2.2) * 0.05 * K, lean = 0, hdx = 0, hdy = 0;
    let feet = [[hipX + (0.9 + 0.3 * face) * K, null], [hipX + (-0.9 + 0.3 * face) * K, null]];
    let hands = null, aimA = face > 0 ? 0.95 : Math.PI - 0.95, hide = true, eye = 0, extra = null, bend = face > 0 ? -1 : 1;
    const torso = () => { const nx = hipX + Math.sin(lean) * TORSO, ny = hipY - Math.cos(lean) * TORSO; return { nx, ny, shX: lerp(nx, hipX, 0.14), shY: lerp(ny, hipY, 0.14) }; };
    let T;
    switch (L.kind) {
      case 'bop': {
        const b = Math.abs(S(t * PI2 * 2)), sw = S(t * Math.PI * 2);
        hipY += b * 0.9 * K; lean = sw * 0.12 * face; hipX += sw * 0.6 * K;
        feet = [[hipX + 1.1 * K, base - Math.max(0, S(t * PI2 * 2)) * 0.6 * K], [hipX - 1.1 * K, null]];
        T = torso();
        hands = [[T.shX + face * 1.5 * K, T.shY - (1.2 + 2.6 * b) * K], [hipX - face * 1.2 * K, hipY - 0.4 * K]];
        hdy = b * 0.3 * K;
        break;
      }
      case 'disco': {
        const ph = Math.floor(t * 2) % 2;
        lean = (ph ? 0.2 : -0.16) * face; hipX += (ph ? 0.5 : -0.5) * K;
        feet = [[hipX + 1.2 * K, ph ? base - 0.7 * K : null], [hipX - 1.0 * K, null]];
        T = torso();
        hands = [ph ? [T.shX + face * 2.6 * K, T.shY - 5 * K] : [T.shX - face * 2.2 * K, T.shY + 4 * K], [hipX + face * 0.6 * K, hipY - 0.5 * K]];
        hdx = (ph ? 0.4 : -0.2) * face * K;
        break;
      }
      case 'robot': {
        const i = Math.floor(t / 0.42) % 4;
        const A = [[[2.8, 0], [0.4, -3.6]], [[0.4, -3.6], [2.8, 0]], [[2.6, 2.2], [-2.4, 2.2]], [[1.6, -2.8], [-1.6, -2.8]]][i];
        hipY += (i % 2) * 0.5 * K; lean = (i === 2 ? 0.1 : 0) * face;
        T = torso();
        hands = [[T.shX + face * A[0][0] * K, T.shY + A[0][1] * K], [T.shX + face * A[1][0] * K, T.shY + A[1][1] * K]];
        hdx = (i % 2 ? 0.35 : -0.35) * face * K;
        break;
      }
      case 'guitar': {
        hide = false;
        lean = -0.22 * face; hipY += 0.9 * K;
        feet = [[hipX + 1.7 * K, null], [hipX - 1.5 * K, null]];
        T = torso();
        aimA = face > 0 ? -0.55 : Math.PI + 0.55;
        hands = [[T.shX + Math.cos(aimA) * 3.9 * K, T.shY + Math.sin(aimA) * 3.9 * K], [T.shX + face * 0.5 * K, T.shY + (2.7 + S(t * 22) * 0.7) * K]];
        const bang = Math.abs(S(t * 7));
        hdy = bang * 0.8 * K; hdx = bang * 0.5 * K * face;
        break;
      }
      case 'pushups': {
        const c = (S(t * Math.PI * 1.4) + 1) / 2;
        lean = face * 1.32; hipX = cx - face * 1.6 * K; hipY = base - (1.5 + c * 1.9) * K;
        feet = [[hipX - face * (TH + SH) * 0.9, null], [hipX - face * (TH + SH) * 0.86, null]];
        T = torso();
        hands = [[T.shX + face * 0.3 * K, null], [T.shX - face * 0.2 * K, null]];
        hdx = face * 0.4 * K; bend = face > 0 ? 1 : -1;
        break;
      }
      case 'phone': {
        lean = 0.08 * face; hdy = 0.55 * K; hdx = face * 0.25 * K;
        feet = [[hipX + 1.0 * K, null], [hipX - 0.7 * K, null]];
        T = torso();
        const sc = S(t * 5) * 0.15 * K;
        hands = [[T.shX + face * 1.5 * K, T.shY + 0.7 * K + sc], [T.shX + face * 1.1 * K, T.shY + 1.4 * K]];
        extra = (g) => {
          const x = Math.round(hands[0][0]) - 1, y = Math.round(hands[0][1]) - 3;
          g.fillStyle = '#0a0b0e'; g.fillRect(x - 1, y - 1, 4, 6);
          g.fillStyle = '#2c313b'; g.fillRect(x, y, 2, 4);
          g.fillStyle = Math.floor(t * 3) % 2 ? '#8fd3ff' : '#cfeeff'; g.fillRect(x, y + ((Math.floor(t * 4)) % 3), 2, 1);
        };
        break;
      }
      case 'juggle': {
        hdy = -0.3 * K;
        T = torso();
        const a = S(t * PI2 * 1.5) * 0.6 * K;
        const h0 = [T.shX + face * 2.0 * K, T.shY + 1.6 * K + a], h1 = [T.shX + face * 0.1 * K, T.shY + 1.6 * K - a];
        hands = [h0, h1];
        extra = (g) => {
          const cols = ['#e05050', '#f4d03f', '#4cc6ec'];
          for (let i = 0; i < 3; i++) {
            const ph = (t * 1.2 + i / 3) % 1, fwd = ph < 0.5;
            const k2 = fwd ? ph * 2 : (ph - 0.5) * 2;
            const ax = fwd ? h1[0] : h0[0], bx = fwd ? h0[0] : h1[0];
            const x = Math.round(lerp(ax, bx, k2)), y = Math.round(lerp(h0[1], h1[1], 0.5) - 1.5 - Math.sin(k2 * Math.PI) * (fwd ? 6 : 2.5) * K);
            g.fillStyle = '#0a0b0e'; g.fillRect(x - 1, y - 1, 3, 3);
            g.fillStyle = cols[i]; g.fillRect(x, y, 1, 1);
          }
        };
        break;
      }
      case 'sleep': {
        if (t < 2.4) {
          const k = Math.min(1, t / 0.6) * (t > 1.9 ? 1 - (t - 1.9) / 0.5 : 1);
          lean = -0.16 * face * k; hdy = -0.4 * K * k;
          T = torso();
          hands = [[T.shX + face * 0.9 * K, T.shY - (1 + 5 * k) * K], [T.shX - face * 0.7 * K, T.shY - (1 + 5 * k) * K]];
          eye = k > 0.5 ? 2 : 0;
        } else {
          hipY = base - 1.1 * K; lean = -0.32 * face;
          feet = [[hipX + face * 3.4 * K, null], [hipX + face * 4.0 * K, null]];
          T = torso();
          hands = [[hipX + face * 2.2 * K, hipY - 0.6 * K], [hipX + face * 1.6 * K, hipY - 0.2 * K]];
          hdx = face * 0.9 * K; hdy = 0.7 * K + Math.sin(t * 1.6) * 0.12 * K; eye = 2;
          extra = (g) => {
            for (let i = 0; i < 3; i++) {
              const ph = ((t - 2.4) * 0.45 + i / 3) % 1;
              const x = Math.round(T.nx + face * (2 + ph * 4) * K + Math.sin(ph * 6) * 1.5), y = Math.round(T.ny - (3 + ph * 9) * K);
              if (ph > 0.85 && (i + Math.floor(t * 8)) % 2) continue;
              WTP.font?.draw?.(g, i === 2 ? 'Z' : 'z', x, y, { color: '7', outline: '0', scale: 1 });
            }
          };
        }
        break;
      }
      case 'watch': {
        hdy = 0.5 * K; hdx = face * 0.2 * K;
        feet = [[hipX + 1.0 * K, base - Math.max(0, S(t * 9)) * 0.5 * K], [hipX - 0.8 * K, null]];
        T = torso();
        hands = [[T.shX + face * 1.4 * K, T.shY + 1.1 * K], [T.shX + face * 1.8 * K, T.shY + 0.6 * K]];
        extra = (g) => { const x = Math.round(hands[0][0]), y = Math.round(hands[0][1]); g.fillStyle = '#e3b94b'; g.fillRect(x - 1, y - 1, 2, 1); };
        break;
      }
      case 'wave': {
        eye = 1; hdy = Math.abs(S(t * 3)) * -0.2 * K;
        T = torso();
        hands = [[T.shX + face * (2.6 + S(t * 9) * 1.5) * K, T.shY - (4.2 - Math.abs(S(t * 9)) * 0.6) * K], [hipX - face * 1.0 * K, hipY + 0.2 * K]];
        break;
      }
    }
    T = T || torso();
    const legs = feet.map(([fx, fy], k) => ik(hipX, hipY, fx, fy == null ? gnd(fx) : fy, TH, SH, bend));
    const hx = T.nx + Math.sin(lean) * HEAD * 1.05 + hdx, hy = T.ny - Math.cos(lean) * HEAD * 1.05 + hdy;
    const hh = hands.map(([x, y]) => [x, y == null ? gnd(x) : y]);
    const armF = ik(T.shX, T.shY, hh[0][0], hh[0][1], UA, FA, face > 0 ? 1 : -1);
    const armB = ik(T.shX, T.shY, hh[1][0], hh[1][1], UA, FA, face > 0 ? 1 : -1);
    return { hipX, hipY, nx: T.nx, ny: T.ny, hx, hy, shX: T.shX, shY: T.shY, legs, armF, armB, aimA, face, anim: 'idle', hide, eye, extra };
  }
  function rotatePose(p, cx, cy, a) {
    const c = Math.cos(a), s = Math.sin(a);
    const r = (o, kx, ky) => { const x = o[kx] - cx, y = o[ky] - cy; o[kx] = cx + x * c - y * s; o[ky] = cy + x * s + y * c; };
    r(p, 'hipX', 'hipY'); r(p, 'nx', 'ny'); r(p, 'hx', 'hy'); r(p, 'shX', 'shY');
    for (const L of [...p.legs, p.armF, p.armB]) { r(L, 'jx', 'jy'); r(L, 'ex', 'ey'); }
    p.aimA += a;
  }

  function updateScarf(dt, p) {
    const n = 7;
    if (!R.scarf) { R.scarf = []; for (let k = 0; k < n; k++) R.scarf.push({ x: p.nx, y: p.ny + k * 0.6, px: p.nx, py: p.ny + k * 0.6 }); }
    const S = R.scarf;
    S[0].x = p.nx - p.face * 0.2; S[0].y = p.ny + 0.3;
    const wind = -P.vx * 0.004;
    for (let k = 1; k < n; k++) {
      const q = S[k];
      const vx = (q.x - q.px) * 0.9 + wind + Math.sin(R.swayT * 6 + k) * 0.01, vy = (q.y - q.py) * 0.9;
      q.px = q.x; q.py = q.y;
      q.x += vx; q.y += vy + 9 * dt * dt * 10;
    }
    for (let it = 0; it < 3; it++) for (let k = 1; k < n; k++) {
      const a = S[k - 1], b = S[k];
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
      const L = 1.15;
      const f = (d - L) / d;
      b.x -= dx * f; b.y -= dy * f;
    }
  }

  function startRag(vx, vy) {
    const p = R.lastPose;
    if (!p) return;
    const pts = [
      [p.hx, p.hy], [p.nx, p.ny], [p.hipX, p.hipY],
      [p.legs[0].jx, p.legs[0].jy], [p.legs[0].ex, p.legs[0].ey], [p.legs[1].jx, p.legs[1].jy], [p.legs[1].ex, p.legs[1].ey],
      [p.armF.jx, p.armF.jy], [p.armF.ex, p.armF.ey], [p.armB.jx, p.armB.jy], [p.armB.ex, p.armB.ey]
    ].map(([x, y]) => ({ x, y, px: x - vx / 60 + (Math.random() - 0.5) * 0.4, py: y - vy / 60 + (Math.random() - 0.5) * 0.4 }));
    const L = (a, b) => [a, b, Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y)];
    R.rag = { pts, links: [L(0, 1), L(1, 2), L(2, 3), L(3, 4), L(2, 5), L(5, 6), L(1, 7), L(7, 8), L(1, 9), L(9, 10), L(0, 2), L(4, 6)], t: 0 };
  }
  R.startRag = startRag;
  function stepRag(dt) {
    const rg = R.rag;
    rg.t += dt;
    const g = 640 * dt * dt;
    for (const q of rg.pts) {
      const vx = (q.x - q.px) * 0.985, vy = (q.y - q.py) * 0.985;
      q.px = q.x; q.py = q.y;
      q.x += vx; q.y += vy + g;
      if (solid(q.x, q.y)) { q.x = q.px; q.y = q.py; q.px = q.x + vx * 0.4; q.py = q.y - vy * 0.3; }
    }
    for (let it = 0; it < 4; it++) for (const [a, b, L] of rg.links) {
      const A = rg.pts[a], B = rg.pts[b];
      const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 0.001;
      const f = (d - L) / d * 0.5;
      A.x += dx * f; A.y += dy * f; B.x -= dx * f; B.y -= dy * f;
    }
    const hip = rg.pts[2];
    const cx = P.x + P.w / 2, cy = P.y + P.h * 0.55;
    const ex = cx - hip.x, ey = cy - hip.y;
    for (const q of rg.pts) { q.x += ex * 0.25; q.y += ey * 0.25; }
  }

  function strokeSet(ctx, segs, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath();
    for (const s of segs) { ctx.moveTo(s[0], s[1]); for (let k = 2; k < s.length; k += 2) ctx.lineTo(s[k], s[k + 1]); }
    ctx.stroke();
  }
  function sat(hex) {
    if (!hex || hex.length < 7) return 0;
    const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx ? (mx - mn) / mx : 0;
  }
  function scarfColor(th) {
    for (const k of ['accent', 'red', 'magenta', 'yellow', 'cyan']) if (sat(th[k]) > 0.35) return th[k];
    return '#c8372d';
  }
  function colors() {
    const th = WTP.deskTheme || {};
    const pix = !!R.target;
    const flash = P.iframes > 0 && !P.victory && (Math.floor(performance.now() / 70) & 1);
    return {
      fg: flash ? '#ffffff' : (P.hurtT > 0 ? '#ff6a5a' : (WTP.shop?.bodyColor?.() || th.bright_foreground || th.light_foreground || '#ececec')),
      out: pix ? 'rgba(0,0,0,0)' : (th.darker_background || '#060607'),
      scarf: WTP.shop?.scarfColor?.() || scarfColor(th),
      eye: th.background || '#121213'
    };
  }
  function drawBody(ctx, p, c, alpha = 1) {
    const segs = [
      [p.hipX, p.hipY, p.nx, p.ny],
      [p.hipX, p.hipY, p.legs[0].jx, p.legs[0].jy, p.legs[0].ex, p.legs[0].ey],
      [p.hipX, p.hipY, p.legs[1].jx, p.legs[1].jy, p.legs[1].ex, p.legs[1].ey],
      [p.shX, p.shY, p.armB.jx, p.armB.jy, p.armB.ex, p.armB.ey]
    ];
    const front = [[p.shX, p.shY, p.armF.jx, p.armF.jy, p.armF.ex, p.armF.ey]];
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokeSet(ctx, segs, LW, c.out);
    ctx.fillStyle = c.out; ctx.beginPath(); ctx.arc(p.hx, p.hy, HEAD + 0.6, 0, Math.PI * 2); ctx.fill();
    strokeSet(ctx, segs, FW, c.fg);
    ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(p.hx, p.hy, HEAD, 0, Math.PI * 2); ctx.fill();
    if (p.eye === 1 && !R.blink) { ctx.fillStyle = c.eye; ctx.beginPath(); ctx.arc(p.hx - 0.7, p.hy - 0.2, 0.5, 0, Math.PI * 2); ctx.arc(p.hx + 0.7, p.hy - 0.2, 0.5, 0, Math.PI * 2); ctx.fill(); }
    else if (p.eye === 2) { ctx.fillStyle = c.eye; ctx.fillRect(p.hx + p.face * 1.15 - 0.6, p.hy + 0.1, 1.2, 0.35); }
    else if (!R.blink) { ctx.fillStyle = c.eye; ctx.beginPath(); ctx.arc(p.hx + p.face * 1.15, p.hy - 0.2 + Math.sin(p.aimA) * 0.5, 0.55, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.fillStyle = c.eye; ctx.fillRect(p.hx + p.face * 1.15 - 0.6, p.hy - 0.15, 1.2, 0.35); }
    ctx.globalAlpha = 1;
    return front;
  }
  function drawScarf(ctx, c) {
    const S = R.scarf;
    if (!S) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pts = [];
    for (const q of S) pts.push(q.x, q.y);
    strokeSet(ctx, [pts], 2.1, c.out);
    strokeSet(ctx, [pts], 1.15, c.scarf);
  }

  R.draw = (ctx, dt, weaponSprite, aim, opts = {}) => {
    const c = colors();
    R.blinkT -= dt;
    if (R.blinkT <= 0) { R.blink = 0.12; R.blinkT = 2 + Math.random() * 4; }
    if (R.blink > 0) R.blink = Math.max(0, R.blink - dt);
    if (P.idleT > 3 && Math.random() < dt * 0.3) R.idleKind = (R.idleKind + 1) % 3;
    if (R.rag) {
      stepRag(dt);
      const q = R.rag.pts;
      const segs = [[q[0].x, q[0].y, q[1].x, q[1].y, q[2].x, q[2].y], [q[2].x, q[2].y, q[3].x, q[3].y, q[4].x, q[4].y], [q[2].x, q[2].y, q[5].x, q[5].y, q[6].x, q[6].y], [q[1].x, q[1].y, q[7].x, q[7].y, q[8].x, q[8].y], [q[1].x, q[1].y, q[9].x, q[9].y, q[10].x, q[10].y]];
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokeSet(ctx, segs.slice(1), LW, c.out);
      strokeSet(ctx, [[q[1].x, q[1].y, q[2].x, q[2].y]], LW, c.out);
      strokeSet(ctx, segs.slice(1), FW, c.fg);
      strokeSet(ctx, [[q[1].x, q[1].y, q[2].x, q[2].y]], FW, c.fg);
      ctx.fillStyle = c.out; ctx.beginPath(); ctx.arc(q[0].x, q[0].y, HEAD + 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(q[0].x, q[0].y, HEAD, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = c.eye; ctx.lineWidth = 0.25; ctx.beginPath(); ctx.moveTo(q[0].x - 0.5, q[0].y - 0.5); ctx.lineTo(q[0].x + 0.5, q[0].y + 0.5); ctx.moveTo(q[0].x + 0.5, q[0].y - 0.5); ctx.lineTo(q[0].x - 0.5, q[0].y + 0.5); ctx.stroke();
      if (R.scarf) { R.scarf[0].x = q[1].x; R.scarf[0].y = q[1].y; }
      P.gunPos = { x: q[8].x, y: q[8].y }; P.muzzle = { x: q[8].x, y: q[8].y };
      if (!P.ragdoll) { R.rag = null; }
      return;
    }
    if (P.rollT > 0) {
      R.roll += dt * 16 * P.face;
      const cx = P.x + P.w / 2, cy = P.y + P.h - 3.2 * K;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(R.roll); ctx.scale(K, K);
      ctx.lineCap = 'round';
      const segs = [[0, 0, 1.6, 1.6, 0.2, 2.6], [0, 0, -1.4, 1.8, 0.4, 2.4], [0, 0, 2.2, -0.4]];
      strokeSet(ctx, segs, LW, c.out); strokeSet(ctx, segs, FW, c.fg);
      ctx.fillStyle = c.out; ctx.beginPath(); ctx.arc(0.8, -1.6, 1.6 + 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.fg; ctx.beginPath(); ctx.arc(0.8, -1.6, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      P.gunPos = { x: cx, y: cy }; P.muzzle = { x: cx, y: cy };
      return;
    }
    R.roll = 0;
    const p = pose(dt, aim, weaponSprite, opts);
    if (P.flipT > 0 && !P.ground && !p.extra) {
      const k = 1 - P.flipT / (P.flipDur || 0.46), e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
      rotatePose(p, P.x + P.w / 2, P.y + P.h * 0.55, (P.flipDir || p.face) * Math.PI * 2 * e);
    }
    if (p.hide) weaponSprite = null;
    R.lastPose = p;
    updateScarf(dt, p);
    const sq = P.squash > 0.15 ? P.squash : 0, st = P.stretch > 0.2 && !P.ground ? P.stretch : 0;
    const kx = 1 + sq * 0.2 - st * 0.1, ky = 1 - sq * 0.18 + st * 0.12;
    const fx = P.x + P.w / 2, fy = P.y + P.h;
    ctx.save();
    ctx.translate(fx, fy); ctx.scale(kx, ky); ctx.translate(-fx, -fy);
    for (let k = P.ghosts.length - 1; k >= 0; k--) {
      const gh = P.ghosts[k];
      gh.t -= dt;
      if (gh.t <= 0 || !gh.pose) { P.ghosts.splice(k, 1); continue; }
      drawBody(ctx, gh.pose, { ...c, fg: c.scarf, out: 'rgba(0,0,0,0)' }, R.target ? 1 : Math.min(1, gh.t * 4) * 0.45);
    }
    if (R.target && P.ghosts.length) R.flush(0.4);
    if (P.dashT > 0 && P.ghosts.length) { const gh = P.ghosts[P.ghosts.length - 1]; if (!gh.pose) gh.pose = JSON.parse(JSON.stringify(p)); }
    drawScarf(ctx, c);
    WTP.rigGadgets?.draw?.(ctx, p, 'back', c);
    const front = drawBody(ctx, p, c);
    if (P.carry) {
      const ch = P.carry;
      ch.x = (p.armF.ex + p.armB.ex) / 2; ch.y = Math.min(p.armF.ey, p.armB.ey) - ch.rad * 0.7; ch.a = 0;
    }
    if (weaponSprite && !P.victory && !P.dead && !P.carry) {
      const a = p.aimA;
      const flip = aim.x < 0;
      const hx = p.armF.ex, hy = p.armF.ey;
      const T = R.target || ctx;
      const wx = R.target ? fx + (hx - fx) * kx : hx, wy = R.target ? fy + (hy - fy) * ky : hy;
      if (R.target) R.flush();
      if (weaponSprite.vector) weaponSprite.draw(T, wx, wy, a, flip, WTP.shop?.skinFor?.(WTP.weapons.st.cur), WTP.weapons.animState?.());
      else {
        const r = weaponSprite.rotated(a, flip);
        T.imageSmoothingEnabled = false;
        T.drawImage(r.cv, Math.round((wx - r.ox) * 4) / 4, Math.round((wy - r.oy) * 4) / 4);
      }
      const [mx, my] = weaponSprite.muzzle(a, flip);
      P.gunPos = { x: hx, y: hy };
      P.muzzle = { x: hx + mx, y: hy + my };
    } else {
      P.gunPos = { x: p.armF.ex, y: p.armF.ey };
      P.muzzle = { x: p.armF.ex + Math.cos(p.aimA) * 1.5, y: p.armF.ey + Math.sin(p.aimA) * 1.5 };
    }
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    strokeSet(ctx, front, LW, c.out);
    strokeSet(ctx, front, FW, c.fg);
    WTP.rigGadgets?.draw?.(ctx, p, 'front', c);
    WTP.shop?.drawHat?.(ctx, p, c, HEAD);
    ctx.restore();
    if (p.extra) { if (R.target) R.flush(); p.extra(R.target || ctx); }
  };
  const PB = { p: null, ox: 0, oy: 0, pool: [], pi: 0 };
  R.flush = (alpha = 1) => {
    const T = R.target;
    if (PB.pool.length < 12) PB.pool.push(document.createElement('canvas'));
    const q = PB.pool[PB.pi++ % PB.pool.length];
    PB.p.toImage(R.outC, q);
    T.save(); T.globalAlpha = alpha; T.imageSmoothingEnabled = false;
    T.drawImage(q, PB.ox, PB.oy, q.width, q.height);
    T.restore();
    PB.p.clear();
  };
  P.draw = (ctx, dt, ws, aim, opts) => {
    if (!WTP.PixCtx) return R.draw(ctx, dt, ws, aim, opts);
    const SZ = 80;
    if (!PB.p) PB.p = new WTP.PixCtx(SZ, SZ);
    const cx = R.rag ? R.rag.pts[2].x : P.x + P.w / 2, cy = R.rag ? R.rag.pts[2].y : P.y + P.h / 2;
    PB.ox = Math.round(cx) - SZ / 2; PB.oy = Math.round(cy) - SZ / 2;
    PB.p.begin(PB.ox, PB.oy);
    const c = colors();
    R.outC = WTP.vsprites.rgbOf(c.out);
    R.target = ctx;
    try { R.draw(PB.p, dt, ws, aim, opts); R.flush(); } finally { R.target = null; }
  };
  WTP.rigGadgets = {
    draw(ctx, p, layer, c) {
      const GD = WTP.gadgets;
      if (!GD) return;
      const id = GD.curId(), st = GD.st;
      const t = performance.now() / 1000;
      if (layer === 'back' && id === 'jetpack') {
        const bx = p.nx - p.face * 1.4, by = p.ny + 0.6;
        ctx.fillStyle = c.out; ctx.fillRect(bx - 1.1, by - 0.2, 2.2, 3.6);
        ctx.fillStyle = '#c84a3a'; ctx.fillRect(bx - 0.8, by, 1.6, 3.2);
        if (st.jet) { ctx.fillStyle = (t * 20 | 0) & 1 ? '#ffe066' : '#ff7f3f'; ctx.beginPath(); ctx.moveTo(bx - 0.7, by + 3.4); ctx.lineTo(bx + 0.7, by + 3.4); ctx.lineTo(bx, by + 5.5 + Math.random() * 1.5); ctx.fill(); }
      } else if (layer === 'back' && id === 'glider' && st.gliding) {
        const y = p.hy - 3.2 + Math.sin(t * 8) * 0.3;
        ctx.strokeStyle = c.out; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.nx - 7, y + 1); ctx.quadraticCurveTo(p.nx, y - 2.5, p.nx + 7, y + 1); ctx.stroke();
        ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 0.6; ctx.stroke();
        ctx.lineWidth = 0.2; ctx.beginPath(); ctx.moveTo(p.armF.ex, p.armF.ey); ctx.lineTo(p.nx + 3, y); ctx.moveTo(p.armB.ex, p.armB.ey); ctx.lineTo(p.nx - 3, y); ctx.stroke();
      } else if (layer === 'front' && (id === 'boots' || id === 'blast')) {
        ctx.fillStyle = id === 'boots' ? (st.pound ? '#fff3b0' : '#6fcf5a') : (st.cd <= 0 ? '#e8484f' : '#5c5270');
        for (const l of p.legs) { ctx.beginPath(); ctx.arc(l.ex, l.ey - 0.2, 0.55, 0, Math.PI * 2); ctx.fill(); }
      } else if (layer === 'front' && id === 'claws') {
        ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 0.25;
        for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(p.armF.ex, p.armF.ey); ctx.lineTo(p.armF.ex + p.face * 0.9, p.armF.ey + k * 0.5); ctx.stroke(); }
      }
    }
  };
  R.reset = () => { R.scarf = null; R.rag = null; R.lastPose = null; R.crouchK = 0; R.lean = 0; };
})();
