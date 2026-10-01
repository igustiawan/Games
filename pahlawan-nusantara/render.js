/* ============================================================
   render.js — semua gambar dibuat dengan Canvas 2D (nol file aset).
   Berisi: kerangka karakter chibi (pose + IK kaki), prop tiap
   pahlawan, latar 3 arena, partikel, dan HUD pertandingan.
   ============================================================ */
(() => {
'use strict';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

/* ------------------------------------------------------------
   IK dua tulang: dapatkan posisi lutut/siku agar ujungnya pas
   ------------------------------------------------------------ */
function ik(x0, y0, tx, ty, l1, l2, bend) {
  let dx = tx - x0, dy = ty - y0;
  let d = Math.hypot(dx, dy);
  const maxD = (l1 + l2) * 0.999;
  if (d > maxD) { const k = maxD / (d || 1); tx = x0 + dx * k; ty = y0 + dy * k; }
  if (d < 1e-4) { d = 1e-4; dx = 1e-4; }
  const a = Math.atan2(ty - y0, tx - x0);
  const cosA = clamp((d * d + l1 * l1 - l2 * l2) / (2 * d * l1), -1, 1);
  const A = Math.acos(cosA);
  const ka = a + A * bend;
  const kx = x0 + Math.cos(ka) * l1, ky = y0 + Math.sin(ka) * l1;
  const fa = Math.atan2(ty - ky, tx - kx);
  return { kx, ky, fx: kx + Math.cos(fa) * l2, fy: ky + Math.sin(fa) * l2 };
}

/* ------------------------------------------------------------
   Pose: ubah keadaan petarung jadi sudut & posisi sendi
   ------------------------------------------------------------ */
function computePose(f, time) {
  const b = f.def.build;
  const headR = b.headR;
  const torsoH = b.bodyH;
  const legTotal = Math.max(28, b.h - 2 * headR - torsoH - 4);
  const leg = legTotal / 2;
  const armU = b.limb * 1.2, armL = b.limb * 1.15;
  const shW = b.bodyW * 0.5, hipW = b.bodyW * 0.36;

  let lean = 0, bodyDy = 0, crouch = 0, air = false;
  let footF = 9, footB = -9, footLiftF = 0, footLiftB = 0;
  let armF = [0.30, 0.32], armB = [-0.22, 0.30];
  let headTilt = 0, spin = 0, lie = 0, tailSwing = 0;

  const st = f.state;
  const A = f.action;
  const prog = A ? clamp(A.t / A.duration, 0, 1) : 0;

  if (st === 'idle') {
    const br = Math.sin(time * 2.4) * 0.5 + 0.5;
    bodyDy = br * 2.2;
    armF = [0.26 + br * 0.06, 0.34];
    armB = [-0.18 - br * 0.05, 0.30];
    tailSwing = Math.sin(time * 1.6) * 0.35;
  } else if (st === 'walk' || st === 'run') {
    const run = st === 'run';
    const spd = run ? 11 : 7.5;
    const ph = f.animPhase;
    const sw = run ? 0.85 : 0.52;
    lean = run ? 0.17 : 0.06;
    const s = Math.sin(ph), c = Math.cos(ph);
    footF = lerp(6, run ? 26 : 18, 1) * (0.55 + 0.45 * s);
    footB = -(run ? 22 : 15) * (0.55 + 0.45 * -s);
    footLiftF = Math.max(0, c) * (run ? 17 : 10);
    footLiftB = Math.max(0, -c) * (run ? 17 : 10);
    bodyDy = Math.abs(s) * (run ? 3.4 : 2);
    armF = [-s * sw * 0.8 + 0.15, 0.42];
    armB = [s * sw * 0.8 - 0.1, 0.38];
    tailSwing = Math.sin(ph * 0.5) * 0.5;
  } else if (st === 'crouch') {
    crouch = 1; lean = 0.20;
    footF = 20; footB = -18;
    armF = [0.55, 1.0]; armB = [-0.35, 0.9];
  } else if (st === 'air' || st === 'land') {
    air = true;
    const up = clamp(f.vy / 420, -1, 1);
    lean = 0.05 + up * 0.05;
    footF = lerp(-4, 16, (up + 1) / 2);
    footB = lerp(-14, -6, (up + 1) / 2);
    footLiftF = 16 + Math.max(0, up) * 8;
    footLiftB = 22 - Math.max(0, up) * 10;
    armF = [-0.85 - up * 0.25, 0.75];
    armB = [-1.0 - up * 0.2, 0.8];
    tailSwing = -0.5 + up * 0.4;
  } else if (st === 'block') {
    lean = -0.14;
    armF = [1.35, 1.35]; armB = [1.15, 1.5];
    footF = 15; footB = -16; crouch = 0.25;
  } else if (st === 'hurt') {
    lean = -0.34 * (1 - prog * 0.7);
    headTilt = -0.3;
    armF = [-0.75, 0.5]; armB = [-1.05, 0.6];
    footF = -6; footB = -14; footLiftB = 8;
    bodyDy = 2;
  } else if (st === 'down' || st === 'ko') {
    lie = 1;
  } else if (st === 'win') {
    const p = Math.sin(time * 5) * 0.1;
    armF = [-2.1 + p, 0.3]; armB = [-2.3 - p, 0.25];
    bodyDy = Math.abs(Math.sin(time * 5)) * 4;
    headTilt = -0.12;
  } else if (st === 'attack' && A) {
    const v = A.vfx;
    const swing = (a, b2) => lerp(a, b2, smooth(prog));
    if (v === 'stab') {
      const out = prog < A.hitAt ? prog / A.hitAt : 1;
      armF = [lerp(-0.5, 1.62, smooth(out)), lerp(1.5, 0.05, smooth(out))];
      armB = [lerp(-0.4, 0.35, smooth(out)), 0.9];
      lean = lerp(-0.12, 0.30, smooth(out));
      footF = 22; footB = -20;
    } else if (v === 'tail') {
      spin = smooth(prog) * TAU * 0.75;
      lean = 0.2;
      armF = [0.9, 0.6]; armB = [-0.9, 0.7];
      tailSwing = lerp(-1.4, 1.5, smooth(prog));
    } else if (v === 'fire') {
      const out = smooth(clamp(prog / 0.55, 0, 1));
      armF = [lerp(-1.6, 1.75, out), lerp(0.9, 0.05, out)];
      armB = [-0.5, 0.8];
      lean = lerp(-0.22, 0.26, out);
      tailSwing = -1.5;
    } else if (v === 'smash' || v === 'slam') {
      const wind = clamp(prog / Math.max(0.01, A.hitAt), 0, 1);
      const down = clamp((prog - A.hitAt) / Math.max(0.01, 1 - A.hitAt), 0, 1);
      armF = [lerp(0.3, -2.5, smooth(wind)), lerp(0.4, 0.15, smooth(wind) * (1 - down))];
      armB = [lerp(-0.2, -2.65, smooth(wind)), 0.25];
      armF[0] = lerp(armF[0], 1.5, smooth(down));
      armB[0] = lerp(armB[0], 1.35, smooth(down));
      lean = lerp(lerp(0.05, -0.35, smooth(wind)), 0.42, smooth(down));
      footF = 24; footB = -22;
      if (v === 'slam') bodyDy = lerp(0, 26, smooth(wind)) * (1 - smooth(down));
    } else if (v === 'dash' || v === 'wind') {
      lean = 0.42;
      armF = [1.55, 0.25]; armB = [-1.5, 0.3];
      footF = 26; footB = -24; footLiftB = 20;
      bodyDy = 6;
    } else if (v === 'spin' || v === 'dance') {
      spin = prog * TAU * (v === 'dance' ? 3.2 : 2.2);
      lean = 0.1;
      armF = [-1.35, 0.2]; armB = [-1.5, 0.25];
      footF = 20; footB = -20;
      if (v === 'dance') bodyDy = 8 + Math.sin(prog * TAU * 4) * 5;
    } else if (v === 'guard' || v === 'aura') {
      const p = smooth(clamp(prog / 0.3, 0, 1));
      armF = [lerp(0.3, 1.5, p), lerp(0.35, 1.35, p)];
      armB = [lerp(-0.2, 1.2, p), lerp(0.3, 1.5, p)];
      lean = lerp(0, -0.18, p);
      crouch = p * 0.5; footF = 18; footB = -18;
    } else { /* slash */
      const s = smooth(clamp(prog / (A.hitAt + 0.12), 0, 1));
      armF = [lerp(-1.9, 1.25, s), lerp(0.85, 0.12, s)];
      armB = [lerp(-0.2, -0.75, s), 0.7];
      lean = lerp(-0.16, 0.28, s);
      footF = 20; footB = -18;
    }
  }

  // jongkok menurunkan pinggul
  const hipDrop = crouch * legTotal * 0.34;
  const hipY = legTotal - hipDrop + bodyDy;

  // IK kaki
  const hipFx = hipW * 0.55, hipBx = -hipW * 0.55;
  const lf = ik(hipFx, hipY, hipFx + footF, footLiftF, leg, leg, 1);
  const lb = ik(hipBx, hipY, hipBx + footB, footLiftB, leg, leg, 1);

  const shoulderY = hipY + torsoH;
  const sx = Math.sin(lean) * torsoH;

  // lengan (FK dari sudut)
  function armAt(ang, side) {
    const shx = side * shW, shy = shoulderY;
    const ex = shx + Math.sin(ang[0]) * armU, ey = shy - Math.cos(ang[0]) * armU;
    const a2 = ang[0] + ang[1];
    const hx = ex + Math.sin(a2) * armL, hy = ey - Math.cos(a2) * armL;
    return { shx, shy, ex, ey, hx, hy, a2 };
  }

  return {
    headR, torsoH, legTotal, armU, armL, shW, hipW, hipFx, hipBx,
    hipY, shoulderY, lean, headTilt, spin, lie, air,
    kneeF: lf, kneeB: lb, footF: { x: lf.fx, y: lf.fy }, footB: { x: lb.fx, y: lb.fy },
    armF: armAt(armF, 1), armB: armAt(armB, -1),
    hipX: sx * 0.4, shX: sx, tailSwing,
  };
}
function smooth(t) { return t * t * (3 - 2 * t); }

/* ------------------------------------------------------------
   Gambar satu tulang (garis tebal berujung bulat)
   ------------------------------------------------------------ */
function bone(ctx, x0, y0, x1, y1, w, col, outline) {
  ctx.lineCap = 'round';
  if (outline) {
    ctx.strokeStyle = outline; ctx.lineWidth = w + 3.4;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function ball(ctx, x, y, r, col, outline) {
  if (outline) {
    ctx.fillStyle = outline;
    ctx.beginPath(); ctx.arc(x, y, r + 1.7, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/* ------------------------------------------------------------
   Karakter lengkap
   ------------------------------------------------------------ */
function drawCharacter(ctx, f, time) {
  const b = f.def.build, c = f.def.colors;
  const P = computePose(f, time);
  const outline = c.dark;
  const flash = f.hitFlash > 0;

  const legW = Math.max(8, b.limb * 0.52);
  const armW = Math.max(8, b.limb * 0.55);

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing, 1);
  // ilusi berputar untuk jurus berputar (tari pedang / barong rangda)
  if (P.spin) {
    const cs = Math.cos(P.spin);
    ctx.scale(Math.max(0.22, Math.abs(cs)) * (cs >= 0 ? 1 : -1), 1);
  }
  if (P.lie > 0) { ctx.translate(-8 * P.lie, 0); ctx.rotate(P.lie * 1.12); }

  ctx.save();
  ctx.translate(0, P.hipY);
  ctx.rotate(-P.lean * 0.35);          // +lean = condong ke depan
  ctx.translate(0, -P.hipY);

  const ab = P.armB, af = P.armF;

  // ---- PROP BELAKANG ----
  drawPropBack(ctx, f, P, time);

  // ---- kaki belakang ----
  bone(ctx, P.hipBx, P.hipY, P.kneeB.kx, P.kneeB.ky, legW,
    flash ? '#fff' : shade(c.primary, -.22), outline);
  bone(ctx, P.kneeB.kx, P.kneeB.ky, P.footB.x, P.footB.y, legW - 1,
    flash ? '#fff' : shade(c.primary, -.22), outline);
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(P.footB.x + 3, P.footB.y, 12, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : c.accent;
  ctx.beginPath(); ctx.ellipse(P.footB.x + 3, P.footB.y, 9, 5, 0, 0, TAU); ctx.fill();

  // ---- lengan belakang ----
  bone(ctx, ab.shx, ab.shy, ab.ex, ab.ey, armW, flash ? '#fff' : shade(c.primary, -.22), outline);
  bone(ctx, ab.ex, ab.ey, ab.hx, ab.hy, armW - 1, flash ? '#fff' : shade(c.primary, -.22), outline);
  ball(ctx, ab.hx, ab.hy, armW * .62, flash ? '#fff' : c.skin, outline);

  // ---- badan ----
  const bodyGrad = ctx.createLinearGradient(0, P.hipY, 0, P.shoulderY);
  bodyGrad.addColorStop(0, shade(c.primary, -.1));
  bodyGrad.addColorStop(.55, c.primary);
  bodyGrad.addColorStop(1, shade(c.primary, .12));
  const bw = b.bodyW * (1 - 0.06), tw = b.bodyW * (1 + 0.16);
  ctx.beginPath();
  ctx.moveTo(-bw / 2 - 3, P.hipY - 4);
  ctx.quadraticCurveTo(-tw / 2 - 2, (P.hipY + P.shoulderY) / 2, -tw / 2, P.shoulderY + 2);
  ctx.lineTo(tw / 2, P.shoulderY + 2);
  ctx.quadraticCurveTo(tw / 2 + 2, (P.hipY + P.shoulderY) / 2, bw / 2 + 3, P.hipY - 4);
  ctx.quadraticCurveTo(0, P.hipY - 12, -bw / 2 - 3, P.hipY - 4);
  ctx.closePath();
  ctx.strokeStyle = outline; ctx.lineWidth = 3.4; ctx.stroke();
  ctx.fillStyle = flash ? '#fff' : bodyGrad; ctx.fill();

  // sabuk / kain
  ctx.fillStyle = flash ? '#fff' : c.accent;
  ctx.beginPath();
  ctx.moveTo(-bw / 2 - 4, P.hipY - 5);
  ctx.quadraticCurveTo(0, P.hipY - 14, bw / 2 + 4, P.hipY - 5);
  ctx.lineTo(bw / 2 + 2, P.hipY + 5);
  ctx.quadraticCurveTo(0, P.hipY - 3, -bw / 2 - 2, P.hipY + 5);
  ctx.closePath(); ctx.fill();

  // ---- kaki depan ----
  bone(ctx, P.hipFx, P.hipY, P.kneeF.kx, P.kneeF.ky, legW, flash ? '#fff' : c.primary, outline);
  bone(ctx, P.kneeF.kx, P.kneeF.ky, P.footF.x, P.footF.y, legW - 1, flash ? '#fff' : c.primary, outline);
  ctx.fillStyle = outline;
  ctx.beginPath(); ctx.ellipse(P.footF.x + 3, P.footF.y, 12, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = flash ? '#fff' : c.accent;
  ctx.beginPath(); ctx.ellipse(P.footF.x + 3, P.footF.y, 9, 5, 0, 0, TAU); ctx.fill();

  // ---- lengan depan ----
  bone(ctx, af.shx, af.shy, af.ex, af.ey, armW, flash ? '#fff' : c.primary, outline);
  bone(ctx, af.ex, af.ey, af.hx, af.hy, armW - 1, flash ? '#fff' : c.primary, outline);

  // ---- PROP DEPAN ----
  drawPropFront(ctx, f, P, time);

  ball(ctx, af.hx, af.hy, armW * .64, flash ? '#fff' : c.skin, outline);

  // ---- kepala ----
  const hy = P.shoulderY + P.headR + 1;
  const hx = P.shX;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-(P.lean * 0.5 + P.headTilt));

  // rambut belakang / sanggul
  ctx.fillStyle = flash ? '#fff' : c.dark;
  ctx.beginPath(); ctx.arc(-P.headR * .28, P.headR * .12, P.headR * 1.0, 0, TAU); ctx.fill();

  ball(ctx, 0, 0, P.headR, flash ? '#fff' : c.skin, outline);

  drawHeadgear(ctx, f, P, time, flash);

  // ---- muka ----
  if (!flash) {
    const ex = P.headR * 0.34, ey = P.headR * 0.06;
    ctx.fillStyle = '#241634';
    const angry = (f.state === 'attack' || f.state === 'hurt' || f.state === 'win');
    const open = f.state === 'ko' || f.state === 'down' || f.state === 'hurt';
    const eo = open ? 0.35 : angry ? 0.16 : 0;
    // mata depan
    ctx.beginPath(); ctx.ellipse(ex + 2, ey, P.headR * .135, P.headR * (.20 + eo), 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex - 9, ey, P.headR * .115, P.headR * (.19 + eo), 0, 0, TAU); ctx.fill();
    // kilau mata
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.arc(ex + 4, ey - P.headR * .07, P.headR * .05, 0, TAU); ctx.fill();
    // pipi
    ctx.fillStyle = 'rgba(232,110,110,.45)';
    ctx.beginPath(); ctx.ellipse(ex - 4, P.headR * .34, P.headR * .19, P.headR * .12, 0, 0, TAU); ctx.fill();
    // mulut
    ctx.strokeStyle = '#241634'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath();
    if (open) { ctx.arc(ex - 2, P.headR * .48, P.headR * .17, 0, Math.PI); }
    else if (angry) { ctx.moveTo(ex - 9, P.headR * .5); ctx.quadraticCurveTo(ex - 1, P.headR * .62, ex + 6, P.headR * .46); }
    else { ctx.moveTo(ex - 7, P.headR * .48); ctx.quadraticCurveTo(ex - 1, P.headR * .58, ex + 5, P.headR * .48); }
    ctx.stroke();
  }
  ctx.restore();

  // ---- lengan depan (senjata) sudah; akhir grup ----
  ctx.restore();

  // ---- efek jurus ----
  drawMoveFx(ctx, f, P, time);
  ctx.restore();
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b2 = n & 255;
  const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
  r = Math.round(lerp(r, t, p)); g = Math.round(lerp(g, t, p)); b2 = Math.round(lerp(b2, t, p));
  return `rgb(${r},${g},${b2})`;
}

/* ---------- kepala khas tiap pahlawan ---------- */
function drawHeadgear(ctx, f, P, time, flash) {
  const c = f.def.colors, R = P.headR, prop = f.def.build.prop;
  if (flash) { ctx.fillStyle = '#fff'; }
  if (prop === 'wings') {
    // mahkota wayang bergerigi
    ctx.fillStyle = flash ? '#fff' : c.accent;
    ctx.beginPath();
    ctx.moveTo(-R * .95, -R * .3);
    ctx.lineTo(-R * .55, -R * 1.5);
    ctx.lineTo(-R * .2, -R * .95);
    ctx.lineTo(0, -R * 1.72);
    ctx.lineTo(R * .22, -R * .95);
    ctx.lineTo(R * .6, -R * 1.45);
    ctx.lineTo(R * .92, -R * .28);
    ctx.quadraticCurveTo(0, -R * .72, -R * .95, -R * .3);
    ctx.closePath();
    ctx.strokeStyle = c.dark; ctx.lineWidth = 2.4; ctx.stroke(); ctx.fill();
    // gelung rambut
    ctx.fillStyle = flash ? '#fff' : c.dark;
    ctx.beginPath(); ctx.arc(-R * .1, -R * 1.15, R * .42, 0, TAU); ctx.fill();
  } else if (prop === 'mane') {
    // surai Barong: bulu-bulu besar
    ctx.fillStyle = flash ? '#fff' : c.accent;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.12 - i * (Math.PI * 0.86 / 8);
      const rr = R * (1.62 + Math.sin(time * 8 + i) * .05);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * .95, Math.sin(a) * R * .95);
      ctx.lineTo(Math.cos(a - .16) * rr, Math.sin(a - .16) * rr);
      ctx.lineTo(Math.cos(a + .16) * rr, Math.sin(a + .16) * rr);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = c.dark; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(0, 0, R * 1.02, Math.PI * .75, Math.PI * 2.3); ctx.stroke();
    // giginya
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(R * .55, R * .42); ctx.lineTo(R * .95, R * .3);
    ctx.lineTo(R * .72, R * .68); ctx.closePath(); ctx.fill();
  } else if (prop === 'keris') {
    // sanggul + tusuk emas
    ctx.fillStyle = flash ? '#fff' : c.dark;
    ctx.beginPath(); ctx.arc(-R * .45, -R * .55, R * .58, 0, TAU); ctx.fill();
    ctx.strokeStyle = flash ? '#fff' : c.accent; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-R * .95, -R * .8); ctx.lineTo(-R * .2, -R * 1.05); ctx.stroke();
    // hiasan dahi
    ctx.fillStyle = flash ? '#fff' : c.accent;
    ctx.beginPath(); ctx.arc(R * .22, -R * .62, R * .16, 0, TAU); ctx.fill();
  } else if (prop === 'tail') {
    // mahkota daun + telinga kera
    ctx.fillStyle = flash ? '#fff' : c.skin;
    ctx.beginPath(); ctx.ellipse(-R * .08, -R * .12, R * 1.14, R * .62, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.dark; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = flash ? '#fff' : c.accent;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * R * .3 - R * .1, -R * .85);
      ctx.lineTo(i * R * .3 + R * .06, -R * 1.42 - Math.abs(i) * -R * .06);
      ctx.lineTo(i * R * .3 + R * .2, -R * .85);
      ctx.closePath(); ctx.fill();
    }
  }
}

/* ---------- prop di belakang badan ---------- */
function drawPropBack(ctx, f, P, time) {
  const c = f.def.colors, R = P.headR, prop = f.def.build.prop;
  const shY = P.shoulderY;
  if (prop === 'wings') {
    // sayap Gatotkaca: tiga lapis bulu yang mengipas
    const flap = Math.sin(time * 5) * .10 + (f.state === 'air' ? -.30 : 0);
    for (let w2 = 0; w2 < 2; w2++) {
      ctx.save();
      ctx.translate(2, shY - 5 - w2 * 7);
      ctx.rotate(-0.30 - flap + w2 * 0.20);
      for (let i = 0; i < 3; i++) {
        const len = 48 - i * 9, wid = 13 - i * 3;
        ctx.fillStyle = ['rgba(150,196,255,.78)', 'rgba(190,220,255,.62)', 'rgba(232,244,255,.46)'][i];
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-len * .50, wid * 1.35, -len, wid * .30);
        ctx.quadraticCurveTo(-len * .45, -wid * .85, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(242,193,78,.8)'; ctx.lineWidth = 1.3; ctx.stroke();
        ctx.rotate(0.24);
      }
      ctx.restore();
    }
  } else if (prop === 'tail') {
    // ekor Hanuman: melengkung ke belakang lalu naik, ujungnya berapi
    const sw = P.tailSwing;
    const hx0 = -6, hy0 = P.hipY + 6;
    const tx = -64 - sw * 12, ty = P.hipY + 74 + sw * 24;
    const curve = () => {
      ctx.beginPath();
      ctx.moveTo(hx0, hy0);
      ctx.bezierCurveTo(-48, hy0 - 12, -44 - sw * 10, hy0 + 42, tx, ty);
    };
    ctx.lineCap = 'round';
    ctx.strokeStyle = c.skin; ctx.lineWidth = 10; curve(); ctx.stroke();
    ctx.strokeStyle = c.dark; ctx.lineWidth = 2; curve(); ctx.stroke();
    // kobaran api di ujung ekor
    for (let i = 0; i < 3; i++) {
      const ph = time * 14 + i * 2.1;
      const r = 10 - i * 2.4 + Math.sin(ph) * 2;
      ctx.fillStyle = i === 0 ? 'rgba(255,120,40,.9)' : i === 1 ? 'rgba(255,190,60,.88)' : 'rgba(255,246,205,.92)';
      ctx.beginPath(); ctx.arc(tx - i * 3, ty + Math.sin(ph * .7) * 3, r, 0, TAU); ctx.fill();
    }
  } else if (prop === 'keris') {
    // selendang yang berkibar
    const fl = Math.sin(time * 4) * 8;
    ctx.fillStyle = 'rgba(199,125,255,.45)';
    ctx.beginPath();
    ctx.moveTo(-3, shY - 8);
    ctx.quadraticCurveTo(-26, shY - 20 + fl, -46, shY - 6 + fl * 1.5);
    ctx.quadraticCurveTo(-26, shY + 4 + fl, -3, shY + 4);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(242,193,78,.5)'; ctx.lineWidth = 1.6; ctx.stroke();
  } else if (prop === 'mane') {
    // ekor Barong
    const sw = Math.sin(time * 3) * .3;
    ctx.fillStyle = c.secondary;
    ctx.beginPath();
    ctx.moveTo(-6, P.hipY + 2);
    ctx.quadraticCurveTo(-34, P.hipY + 26 + sw * 14, -30, P.hipY + 52);
    ctx.quadraticCurveTo(-12, P.hipY + 40, -2, P.hipY + 16);
    ctx.closePath(); ctx.strokeStyle = c.dark; ctx.lineWidth = 2.2; ctx.stroke(); ctx.fill();
  }
}

/* ---------- prop di depan (senjata) ---------- */
function drawPropFront(ctx, f, P, time) {
  const c = f.def.colors, prop = f.def.build.prop;
  const h = P.armF, swing = P.armF.a2;
  const ang = swing;
  if (prop === 'keris') {
    ctx.save();
    ctx.translate(h.hx, h.hy);
    ctx.rotate(ang - Math.PI * 0.35);
    // bilah keris berkelok
    ctx.strokeStyle = '#e9eef7'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(12, 8, 24, 4);
    ctx.quadraticCurveTo(34, 0, 46, -6);
    ctx.stroke();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(2, 2); ctx.stroke();
    ctx.fillStyle = c.accent;
    ctx.beginPath(); ctx.ellipse(-4, 0, 6, 4, 0, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (prop === 'tail') {
    // gada (palu) milik Hanuman
    ctx.save();
    ctx.translate(h.hx, h.hy);
    ctx.rotate(ang - Math.PI * 0.3);
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.stroke();
    ctx.fillStyle = c.accent;
    ctx.beginPath();
    ctx.arc(36, 0, 13, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.dark; ctx.lineWidth = 2.4; ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      ctx.fillStyle = '#ffd479';
      ctx.beginPath(); ctx.arc(36 + Math.cos(a) * 12, Math.sin(a) * 12, 2.4, 0, TAU); ctx.fill();
    }
    ctx.restore();
  } else if (prop === 'mane') {
    // cakar Barong
    ctx.save();
    ctx.translate(h.hx, h.hy);
    ctx.rotate(ang - Math.PI * 0.2);
    ctx.fillStyle = '#fdf6e3';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 5 - 2.5);
      ctx.lineTo(16, i * 7);
      ctx.lineTo(0, i * 5 + 2.5);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

/* ---------- efek jurus ---------- */
function drawMoveFx(ctx, f, P, time) {
  const A = f.action;
  if (!A || !A.vfx) return;
  const c = f.def.colors, aura = f.def.aura;
  const prog = clamp(A.t / A.duration, 0, 1);
  const activeHit = f.hitboxOn;

  if ((A.vfx === 'slash' || A.vfx === 'stab' || A.vfx === 'tail') && (activeHit || prog < A.hitAt + .2)) {
    const h = P.armF;
    const k = activeHit ? 1 : 0.55;
    ctx.save();
    ctx.translate(h.hx || 0, h.hy || 0);
    ctx.rotate((h.a2 || 0) - Math.PI * 0.35);
    ctx.globalAlpha = .75 * k;
    const g = ctx.createLinearGradient(0, 0, A.reach * .8, 0);
    g.addColorStop(0, 'rgba(255,255,255,.1)');
    g.addColorStop(1, aura);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(A.reach * .55, -A.hitH * .5, A.reach * .82, -A.hitH * .12);
    ctx.quadraticCurveTo(A.reach * .5, A.hitH * .4, 0, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  if (A.vfx === 'smash' || A.vfx === 'slam') {
    const down = clamp((prog - A.hitAt) / Math.max(.01, 1 - A.hitAt), 0, 1);
    const k = clamp(prog / A.hitAt, 0, 1);
    // kilau di atas kepala saat ancang-ancang
    if (prog < A.hitAt + .1) {
      ctx.save();
      ctx.globalAlpha = .8;
      ctx.fillStyle = aura;
      ctx.beginPath(); ctx.arc(6, P.shoulderY + P.headR + 34, 10 + k * 16, 0, TAU); ctx.fill();
      ctx.globalAlpha = .35;
      ctx.beginPath(); ctx.arc(6, P.shoulderY + P.headR + 34, 20 + k * 26, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // gelombang hentakan
    if (down > 0 && down < .8) {
      const r = down * A.reach * .85;
      ctx.save();
      ctx.globalAlpha = (1 - down / .8) * .75;
      ctx.strokeStyle = aura; ctx.lineWidth = 9 * (1 - down);
      ctx.beginPath(); ctx.ellipse(A.reach * .28, 6, r, r * .34, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
  }

  if (A.vfx === 'aura' || A.vfx === 'guard') {
    ctx.save();
    const pulse = 1 + Math.sin(time * 16) * .06;
    ctx.globalAlpha = A.vfx === 'guard' ? .5 : .42;
    ctx.strokeStyle = aura; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(0, P.hipY * .9, (P.headR + 30) * pulse, (P.hipY + P.headR) * .78 * pulse, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = .18;
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.ellipse(0, P.hipY * .9, (P.headR + 30) * pulse, (P.hipY + P.headR) * .78 * pulse, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  if (A.vfx === 'dash' || A.vfx === 'wind') {
    ctx.save();
    ctx.globalAlpha = .5;
    for (let i = 0; i < 4; i++) {
      const y = 14 + i * 22;
      ctx.strokeStyle = i % 2 ? aura : '#fff';
      ctx.lineWidth = 4 - i * .6;
      ctx.beginPath();
      ctx.moveTo(-24 - i * 14, y);
      ctx.lineTo(-70 - i * 26, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (A.vfx === 'spin' || A.vfx === 'dance') {
    ctx.save();
    ctx.globalAlpha = .45;
    ctx.strokeStyle = aura; ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, P.hipY + P.headR, A.reach * .55, 16, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = .3;
    ctx.strokeStyle = c.accent; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, P.hipY + P.headR * .2, A.reach * .42, 13, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/* ------------------------------------------------------------
   ARENA
   ------------------------------------------------------------ */
function cacheCanvas(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(w); cv.height = Math.ceil(h);
  return cv;
}
const layerCache = {};

function getLayer(key, w, h, drawFn) {
  const ck = key + '|' + Math.round(w) + 'x' + Math.round(h);
  if (!layerCache[ck]) {
    const cv = cacheCanvas(w, h);
    const c2 = cv.getContext('2d');
    drawFn(c2, cv.width, cv.height);
    layerCache[ck] = cv;
  }
  return layerCache[ck];
}

/* --- stupa Borobudur --- */
function stupa(c, x, y, s, col, col2) {
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x - 34 * s, y);
  c.lineTo(x - 30 * s, y - 26 * s);
  c.quadraticCurveTo(x - 26 * s, y - 74 * s, x, y - 78 * s);
  c.quadraticCurveTo(x + 26 * s, y - 74 * s, x + 30 * s, y - 26 * s);
  c.lineTo(x + 34 * s, y);
  c.closePath(); c.fill();
  c.fillStyle = col2;
  c.beginPath();
  c.moveTo(x - 30 * s, y - 26 * s);
  c.lineTo(x + 30 * s, y - 26 * s);
  c.lineTo(x + 34 * s, y);
  c.lineTo(x - 34 * s, y);
  c.closePath(); c.fill();
  c.fillStyle = col2;
  c.beginPath(); c.arc(x, y - 78 * s, 5 * s, 0, TAU); c.fill();
}

const ARENAS = [
  {
    id: 'borobudur', name: 'Candi Borobudur', sky1: '#241a4d', sky2: '#7b3f6e', sky3: '#e8763a', sky4: '#f7c26b',
    floor: '#6b5a4a', floor2: '#4e4136', accent: '#f7c26b', dust: 'rgba(255,214,150,.5)',
    bg(c, W, H) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#241a4d'); g.addColorStop(.36, '#7b3f6e');
      g.addColorStop(.62, '#e8763a'); g.addColorStop(.78, '#f7c26b'); g.addColorStop(1, '#b98a4e');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // matahari
      c.fillStyle = 'rgba(255,240,200,.9)';
      c.beginPath(); c.arc(W * .62, H * .60, 46, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,220,150,.28)';
      c.beginPath(); c.arc(W * .62, H * .60, 96, 0, TAU); c.fill();
      // kabut
      for (let i = 0; i < 5; i++) {
        c.fillStyle = `rgba(255,220,180,${.10 - i * .015})`;
        c.beginPath();
        c.ellipse(W * (.2 + i * .18), H * (.58 + (i % 2) * .04), W * .28, 14, 0, 0, TAU);
        c.fill();
      }
      // baris stupa jauh
      c.save();
      for (let r = 0; r < 3; r++) {
        const y = H * (.70 + r * .055), s = .42 + r * .16;
        const col = `rgba(72,48,86,${.75 - r * .16})`;
        const col2 = `rgba(96,66,104,${.7 - r * .15})`;
        for (let i = -1; i < 14; i++) {
          const x = W * (.03 + i * .075) + (r % 2) * 26;
          stupa(c, x, y, s, col, col2);
        }
      }
      c.restore();
    },
    fg(c, W, H) {
      // stupa induk di tengah: bertingkat dengan puncak emas
      const cx = W * .5, by = H * .90, s = 1.55;
      c.save();
      c.fillStyle = 'rgba(74,52,92,.95)';
      for (let i = 0; i < 3; i++) {
        const w0 = (60 - i * 11) * s, y = by - i * 15 * s;
        c.fillRect(cx - w0 / 2, y - 16 * s, w0, 17 * s);
      }
      const kg = c.createLinearGradient(cx - 40 * s, 0, cx + 40 * s, 0);
      kg.addColorStop(0, 'rgba(96,70,116,.95)');
      kg.addColorStop(.42, 'rgba(128,96,150,.95)');
      kg.addColorStop(1, 'rgba(64,44,82,.95)');
      c.fillStyle = kg;
      c.beginPath();
      c.moveTo(cx - 40 * s, by - 45 * s);
      c.quadraticCurveTo(cx - 34 * s, by - 108 * s, cx, by - 114 * s);
      c.quadraticCurveTo(cx + 34 * s, by - 108 * s, cx + 40 * s, by - 45 * s);
      c.closePath(); c.fill();
      c.strokeStyle = 'rgba(242,193,78,.42)'; c.lineWidth = 2 * s;
      c.beginPath(); c.moveTo(cx - 38 * s, by - 54 * s); c.lineTo(cx + 38 * s, by - 54 * s); c.stroke();
      c.fillStyle = 'rgba(242,193,78,.92)';
      c.beginPath();
      c.moveTo(cx, by - 140 * s); c.lineTo(cx - 7 * s, by - 111 * s); c.lineTo(cx + 7 * s, by - 111 * s);
      c.closePath(); c.fill();
      c.restore();
    },
  },
  {
    id: 'pura', name: 'Pura Bali', sky1: '#080c2e', sky2: '#2a3a7a', sky3: '#d96b4f', sky4: '#f0a860',
    floor: '#4a4a52', floor2: '#33333b', accent: '#ffb703', dust: 'rgba(255,190,120,.5)',
    bg(c, W, H) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#080c2e'); g.addColorStop(.34, '#2a3a7a');
      g.addColorStop(.60, '#d96b4f'); g.addColorStop(.76, '#f0a860'); g.addColorStop(1, '#7c5433');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,235,190,.55)';
      c.beginPath(); c.arc(W * .30, H * .52, 26, 0, TAU); c.fill();
      // gunung Agung
      c.fillStyle = 'rgba(30,34,72,.9)';
      c.beginPath();
      c.moveTo(W * .30, H * .74);
      c.lineTo(W * .52, H * .28);
      c.lineTo(W * .78, H * .74);
      c.closePath(); c.fill();
      c.fillStyle = 'rgba(46,50,96,.85)';
      c.beginPath();
      c.moveTo(W * .04, H * .76);
      c.lineTo(W * .20, H * .48);
      c.lineTo(W * .40, H * .76);
      c.closePath(); c.fill();
      // menara meru bertingkat
      const mx = W * .74, my = H * .78;
      for (let i = 0; i < 7; i++) {
        const w0 = 80 - i * 8.5, h0 = 15, y = my - i * 15;
        c.fillStyle = i % 2 ? 'rgba(36,26,54,.95)' : 'rgba(26,18,42,.95)';
        c.beginPath();
        c.moveTo(mx - w0 / 2, y); c.lineTo(mx + w0 / 2, y);
        c.lineTo(mx + w0 / 2 - 8, y - h0); c.lineTo(mx - w0 / 2 + 8, y - h0);
        c.closePath(); c.fill();
      }
      c.fillStyle = 'rgba(240,190,90,.9)';
      c.beginPath(); c.arc(mx, my - 7 * 15 - 14, 7, 0, TAU); c.fill();
    },
    fg(c, W, H) {
      // candi bentar: gerbang terbelah yang membingkai arena
      for (const side of [-1, 1]) {
        c.save();
        c.translate(W * .5 + side * W * .26, H * .95);
        if (side > 0) c.scale(-1, 1);   // sisi kanan dicerminkan
        c.fillStyle = 'rgba(44,28,60,.96)';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-104, 0);
        c.lineTo(-104, -132);
        c.lineTo(-78, -168);
        c.lineTo(-78, -232);
        c.lineTo(-54, -266);
        c.lineTo(-54, -318);
        c.lineTo(-30, -348);
        c.lineTo(-30, -386);
        c.lineTo(0, -386);
        c.closePath();
        c.fill();
        c.fillStyle = 'rgba(24,15,38,.96)';
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(-86, 0);
        c.lineTo(-86, -134);
        c.lineTo(-62, -170);
        c.lineTo(-62, -234);
        c.lineTo(-40, -268);
        c.lineTo(-40, -320);
        c.lineTo(-18, -350);
        c.lineTo(-18, -386);
        c.lineTo(0, -386);
        c.closePath();
        c.fill();
        // pahatan emas
        c.strokeStyle = 'rgba(242,193,78,.5)'; c.lineWidth = 2.6;
        c.beginPath(); c.moveTo(-72, -40); c.quadraticCurveTo(-58, -180, -36, -372); c.stroke();
        c.fillStyle = 'rgba(242,193,78,.45)';
        c.beginPath(); c.arc(-9, -396, 7, 0, TAU); c.fill();
        c.restore();
      }
    },
  },
  {
    id: 'istana', name: 'Istana Kerajaan', sky1: '#1d0d06', sky2: '#63301a', sky3: '#a8602c', sky4: '#e0a55c',
    floor: '#5a3318', floor2: '#3d2210', accent: '#f2c14e', dust: 'rgba(255,200,120,.45)',
    bg(c, W, H) {
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1d0d06'); g.addColorStop(.44, '#63301a');
      g.addColorStop(.74, '#a8602c'); g.addColorStop(1, '#6b3a18');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // lengkung langit-langit
      c.fillStyle = 'rgba(30,14,8,.75)';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, H * .16);
      c.quadraticCurveTo(W * .5, H * .30, 0, H * .16); c.closePath(); c.fill();
      // pilar-pilar
      for (let i = 0; i < 6; i++) {
        const x = W * (.08 + i * .17);
        c.fillStyle = 'rgba(58,30,16,.85)';
        c.fillRect(x - 17, H * .18, 34, H * .68);
        c.fillStyle = 'rgba(88,50,26,.85)';
        c.fillRect(x - 11, H * .18, 10, H * .68);
        c.fillStyle = 'rgba(242,193,78,.7)';
        c.fillRect(x - 22, H * .18, 44, 11);
        c.fillRect(x - 22, H * .82, 44, 9);
      }
      // lampu gantung
      for (let i = 0; i < 5; i++) {
        const x = W * (.14 + i * .18), y = H * .22;
        c.strokeStyle = 'rgba(60,34,18,.9)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, H * .06); c.lineTo(x, y); c.stroke();
        c.fillStyle = 'rgba(255,190,90,.9)';
        c.beginPath(); c.ellipse(x, y + 12, 13, 17, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,220,150,.22)';
        c.beginPath(); c.arc(x, y + 12, 44, 0, TAU); c.fill();
      }
      // deretan gong di belakang
      c.fillStyle = 'rgba(52,28,14,.9)';
      c.fillRect(W * .18, H * .70, W * .64, 12);
      for (let i = 0; i < 7; i++) {
        const x = W * (.21 + i * .095);
        c.fillStyle = i % 2 ? 'rgba(196,150,50,.9)' : 'rgba(160,120,40,.9)';
        c.beginPath(); c.arc(x, H * .62, 20, 0, TAU); c.fill();
        c.fillStyle = 'rgba(242,193,78,.95)';
        c.beginPath(); c.arc(x, H * .62, 9, 0, TAU); c.fill();
      }
    },
    fg(c, W, H) {
      // kain merah di sisi panggung
      for (const side of [-1, 1]) {
        const x0 = W * .5 + side * W * .25 - W * .025;
        const x1 = x0 + W * .05;
        c.fillStyle = 'rgba(150,30,26,.85)';
        c.beginPath();
        c.moveTo(x0, 0); c.lineTo(x1, 0);
        c.lineTo(x1 + side * W * .012, H); c.lineTo(x0 + side * W * .012, H);
        c.closePath(); c.fill();
      }
    },
  },
];

function drawArenaBand(c, W, H, arena, cam, t) {
  // Langit + lapisan jauh digambar sekali lalu di-cache.
  // Lebar 1,5x layar supaya bisa digeser (parallax) tanpa celah.
  const lw = W * 1.5;
  const layer = getLayer(arena.id, lw, H, (c2, w2, h2) => {
    arena.bg(c2, w2, h2);
    arena.fg(c2, w2, h2);
  });
  const px = -(cam.x - (cam.stageW / 2)) * 0.14;
  c.drawImage(layer, (W - lw) / 2 + px, 0, layer.width, layer.height);
}

/* ------------------------------------------------------------
   Transform dunia
   ------------------------------------------------------------ */
function worldTransform(c, cam, W, H) {
  const groundY = H * 0.84;
  c.translate(W / 2, groundY);
  c.scale(cam.scale, -cam.scale);
  c.translate(-cam.x, 0);
  return groundY;
}

/* lantai arena digambar di ruang dunia */
function drawFloor(c, cam, arena, t) {
  const x0 = -600, x1 = cam.stageW + 600;
  const g = c.createLinearGradient(0, 0, 0, -420);
  g.addColorStop(0, arena.floor); g.addColorStop(1, arena.floor2);
  c.fillStyle = g;
  c.fillRect(x0, -420, x1 - x0, 420);
  // garis ubin
  c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 2;
  for (let x = Math.floor(x0 / 90) * 90; x < x1; x += 90) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x - 60, -420); c.stroke();
  }
  for (let i = 1; i <= 5; i++) {
    const y = -i * i * 9;
    c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke();
  }
  // garis tengah terang (tepi panggung)
  c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x0, 0); c.lineTo(x1, 0); c.stroke();
  // pita aksen
  c.fillStyle = arena.accent; c.globalAlpha = .5;
  c.fillRect(x0, 0, x1 - x0, 5);
  c.globalAlpha = 1;
}

/* ------------------------------------------------------------
   HUD (di ruang layar, tidak ikut ter-flip)
   ------------------------------------------------------------ */
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function drawHealthBar(c, x, y, w, h, ratio, ghost, col, flip) {
  c.save();
  c.fillStyle = 'rgba(0,0,0,.55)';
  roundRect(c, x - 3, y - 3, w + 6, h + 6, 7); c.fill();
  c.fillStyle = 'rgba(255,255,255,.10)';
  roundRect(c, x, y, w, h, 5); c.fill();
  const gw = w * clamp(ghost, 0, 1);
  c.fillStyle = 'rgba(255,90,80,.7)';
  if (flip) roundRect(c, x + w - gw, y, gw, h, 5); else roundRect(c, x, y, gw, h, 5);
  c.fill();
  const hw = w * clamp(ratio, 0, 1);
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, col[0]); g.addColorStop(1, col[1]);
  c.fillStyle = g;
  if (flip) roundRect(c, x + w - hw, y, hw, h, 5); else roundRect(c, x, y, hw, h, 5);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2;
  roundRect(c, x, y, w, h, 5); c.stroke();
  c.restore();
}

function drawMeter(c, x, y, w, h, ratio, ready, flip) {
  c.fillStyle = 'rgba(0,0,0,.6)';
  roundRect(c, x - 2, y - 2, w + 4, h + 4, 5); c.fill();
  c.fillStyle = 'rgba(255,255,255,.09)';
  roundRect(c, x, y, w, h, 4); c.fill();
  const mw = w * clamp(ratio, 0, 1);
  const g = c.createLinearGradient(x, y, x + w, y);
  if (ready) { g.addColorStop(0, '#fff2b0'); g.addColorStop(.5, '#f2c14e'); g.addColorStop(1, '#ff9a3c'); }
  else { g.addColorStop(0, '#5a7cff'); g.addColorStop(1, '#a86bff'); }
  c.fillStyle = g;
  if (flip) roundRect(c, x + w - mw, y, mw, h, 4); else roundRect(c, x, y, mw, h, 4);
  c.fill();
  if (ready) {
    c.strokeStyle = `rgba(255,240,170,${.5 + Math.sin(performance.now() / 130) * .35})`;
    c.lineWidth = 2.5;
    roundRect(c, x, y, w, h, 4); c.stroke();
  }
}

function drawHUD(c, W, H, st, t) {
  const p1 = st.fighters[0], p2 = st.fighters[1];
  if (st.mode === 'train') {
    drawTrainHUD(c, W, H, st, t);
    return;
  }
  const bw = W * 0.34, bh = 22;
  const pad = W * 0.035;
  // P1
  drawHealthBar(c, pad, 26, bw, bh, p1.health / p1.def.stats.health, p1.healthGhost / p1.def.stats.health,
    ['#ffe36b', '#e8503a'], false);
  drawMeter(c, pad, 54, bw * 0.62, 11, p1.meter / 100, p1.meter >= 100, false);
  // P2
  drawHealthBar(c, W - pad - bw, 26, bw, bh, p2.health / p2.def.stats.health, p2.healthGhost / p2.def.stats.health,
    ['#ffe36b', '#e8503a'], true);
  drawMeter(c, W - pad - bw * 0.62, 54, bw * 0.62, 11, p2.meter / 100, p2.meter >= 100, true);

  // nama
  c.font = '900 17px Nunito, sans-serif';
  c.textBaseline = 'top';
  c.textAlign = 'left';
  c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,.7)'; c.lineWidth = 4;
  c.strokeText(p1.def.name, pad, 74); c.fillText(p1.def.name, pad, 74);
  c.textAlign = 'right';
  c.strokeText(p2.def.name, W - pad, 74); c.fillText(p2.def.name, W - pad, 74);

  // timer
  const secs = Math.max(0, Math.ceil(st.timer));
  c.textAlign = 'center';
  c.font = '900 40px Nunito, sans-serif';
  c.fillStyle = secs <= 10 ? '#ff6b5a' : '#fff';
  c.strokeStyle = 'rgba(0,0,0,.75)'; c.lineWidth = 6;
  c.strokeText(String(secs).padStart(2, '0'), W / 2, 22);
  c.fillText(String(secs).padStart(2, '0'), W / 2, 22);

  // penanda ronde
  for (let i = 0; i < st.roundsToWin; i++) {
    const cx1 = pad + bw * 0.5 + i * 22 - (st.roundsToWin - 1) * 11;
    c.fillStyle = st.wins[0] > i ? '#f2c14e' : 'rgba(255,255,255,.22)';
    c.beginPath(); c.arc(cx1, 100, 7, 0, TAU); c.fill();
    const cx2 = W - pad - bw * 0.5 + i * 22 - (st.roundsToWin - 1) * 11;
    c.fillStyle = st.wins[1] > i ? '#f2c14e' : 'rgba(255,255,255,.22)';
    c.beginPath(); c.arc(cx2, 100, 7, 0, TAU); c.fill();
  }

  // combo
  drawCombo(c, W * 0.22, H * 0.36, p1, false);
  drawCombo(c, W * 0.78, H * 0.36, p2, true);

  // pengumuman besar
  if (st.announce && st.announceT > 0) {
    const a = st.announceT;
    const k = clamp(a / 0.25, 0, 1);
    const k2 = clamp((st.announceMax - a) / 0.18, 0, 1);
    const sc = lerp(1.7, 1, k) * lerp(1, 1.16, 1 - k2);
    c.save();
    c.translate(W / 2, H * 0.4);
    c.scale(sc, sc);
    c.globalAlpha = Math.min(k, k2);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 58px Nunito, sans-serif';
    const g = c.createLinearGradient(0, -34, 0, 34);
    g.addColorStop(0, '#fff8e6'); g.addColorStop(.55, st.announceColor || '#f2c14e');
    g.addColorStop(1, st.announceColor2 || '#e8503a');
    c.strokeStyle = 'rgba(20,8,30,.9)'; c.lineWidth = 12;
    c.strokeText(st.announce, 0, 0);
    c.fillStyle = g; c.fillText(st.announce, 0, 0);
    c.restore();
  }

  // cut-in ultimate
  if (st.cutin && st.cutinT > 0) drawCutin(c, W, H, st, t);
}

function drawCombo(c, x, y, f, right) {
  if (f.combo < 2 || f.comboTimer <= 0) return;
  c.save();
  c.translate(x, y);
  const k = clamp(f.comboTimer / .2, 0, 1);
  c.scale(lerp(1.35, 1, k), lerp(1.35, 1, k));
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '900 52px Nunito, sans-serif';
  c.strokeStyle = 'rgba(20,8,30,.9)'; c.lineWidth = 7;
  c.strokeText(f.combo, 0, -14);
  const g = c.createLinearGradient(0, -40, 0, 12);
  g.addColorStop(0, '#fff6d0'); g.addColorStop(1, '#ff9a3c');
  c.fillStyle = g; c.fillText(f.combo, 0, -14);
  c.font = '900 16px Nunito, sans-serif';
  c.strokeStyle = 'rgba(20,8,30,.9)'; c.lineWidth = 4;
  c.strokeText('COMBO!', 0, 20); 
  c.fillStyle = '#f2c14e'; c.fillText('COMBO!', 0, 20);
  c.restore();
}

function drawCutin(c, W, H, st, t) {
  const f = st.cutin;
  const k = clamp(st.cutinT / st.cutinMax, 0, 1);
  const slide = k > 0.75 ? (1 - k) / 0.25 : k < 0.25 ? k / 0.25 : 1;
  const dir = f.facing;
  c.save();
  c.globalAlpha = slide * 0.96;
  // pita diagonal
  c.translate(W / 2, H / 2);
  c.rotate(-0.13 * dir);
  const g = c.createLinearGradient(-W * .6, 0, W * .6, 0);
  g.addColorStop(0, 'rgba(10,4,22,.0)');
  g.addColorStop(.18, 'rgba(20,8,40,.97)');
  g.addColorStop(.5, 'rgba(48,16,66,.97)');
  g.addColorStop(.82, 'rgba(20,8,40,.97)');
  g.addColorStop(1, 'rgba(10,4,22,0)');
  c.fillStyle = g;
  c.fillRect(-W * .6, -78, W * 1.2, 156);
  // garis emas
  c.strokeStyle = f.def.colors.accent; c.lineWidth = 3;
  c.globalAlpha = slide * .9;
  c.beginPath(); c.moveTo(-W * .6, -78); c.lineTo(W * .6, -78); c.stroke();
  c.beginPath(); c.moveTo(-W * .6, 78); c.lineTo(W * .6, 78); c.stroke();
  // nama jurus
  c.globalAlpha = slide;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '900 52px Nunito, sans-serif';
  const tg = c.createLinearGradient(0, -30, 0, 30);
  tg.addColorStop(0, '#fff8e6'); tg.addColorStop(.6, f.def.aura); tg.addColorStop(1, f.def.colors.accent);
  c.strokeStyle = 'rgba(10,4,20,.9)'; c.lineWidth = 10;
  c.strokeText(f.def.moves.ultimate.name, 0, -12);
  c.fillStyle = tg; c.fillText(f.def.moves.ultimate.name, 0, -12);
  c.font = '900 19px Nunito, sans-serif';
  c.fillStyle = 'rgba(255,255,255,.85)';
  c.fillText(f.def.cutin, 0, 40);
  c.font = '900 15px Nunito, sans-serif';
  c.fillStyle = f.def.aura;
  c.fillText(f.def.name + ' — ' + f.def.title, 0, -56);
  c.restore();

  // kilatan warna
  c.save();
  c.globalAlpha = clamp((st.cutinT - st.cutinMax + .22) / .22, 0, 1) * .5;
  c.fillStyle = f.def.aura;
  c.fillRect(0, 0, W, H);
  c.restore();
}

function drawTrainHUD(c, W, H, st, t) {
  const p1 = st.fighters[0];
  c.save();
  c.fillStyle = 'rgba(0,0,0,.45)';
  roundRect(c, 14, 14, 244, 92, 12); c.fill();
  c.font = '900 15px Nunito, sans-serif';
  c.textBaseline = 'top'; c.textAlign = 'left';
  c.fillStyle = '#f2c14e'; c.fillText('MODE LATIHAN', 26, 22);
  c.fillStyle = '#fff';
  c.font = '800 13px Nunito, sans-serif';
  c.fillText('Total pukulan : ' + p1.totalHits, 26, 44);
  c.fillText('Total kerusakan : ' + Math.round(p1.dmgDealt), 26, 62);
  c.fillText('Combo terbaik : ' + p1.bestCombo, 26, 80);
  c.textAlign = 'right';
  c.fillStyle = 'rgba(255,255,255,.5)';
  c.fillText('H = lihat hitbox   R = ulang', W - 20, 22);
  c.restore();
}

/* ------------------------------------------------------------
   Partikel & efek dunia
   ------------------------------------------------------------ */
function drawParticles(c, parts) {
  for (const p of parts) {
    const k = clamp(p.life / p.max, 0, 1);
    c.save();
    c.globalAlpha = k * (p.alpha ?? 1);
    if (p.type === 'ring') {
      c.strokeStyle = p.color; c.lineWidth = 3 + 4 * k;
      c.beginPath(); c.arc(p.x, p.y, p.r * (1 - k) * 1.8 + p.r * .2, 0, TAU); c.stroke();
    } else if (p.type === 'spark') {
      c.strokeStyle = p.color; c.lineWidth = p.size * k;
      c.lineCap = 'round';
      c.beginPath(); c.moveTo(p.x, p.y);
      c.lineTo(p.x - p.vx * .04, p.y - p.vy * .04); c.stroke();
    } else if (p.type === 'star') {
      c.fillStyle = p.color;
      c.translate(p.x, p.y); c.rotate(p.rot || 0);
      const s = p.size * k;
      c.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU;
        c.lineTo(Math.cos(a) * s * 1.7, Math.sin(a) * s * 1.7);
        c.lineTo(Math.cos(a + .39) * s * .5, Math.sin(a + .39) * s * .5);
      }
      c.closePath(); c.fill();
    } else {
      c.fillStyle = p.color;
      c.beginPath(); c.arc(p.x, p.y, p.size * (p.grow ? (1 - k) : k), 0, TAU); c.fill();
    }
    c.restore();
  }
}

function drawProjectile(c, pr, time) {
  c.save();
  c.translate(pr.x, pr.y);
  const aura = pr.color;
  if (pr.vfx === 'fire') {
    for (let i = 3; i >= 0; i--) {
      const r = pr.r * (0.4 + i * 0.22) + Math.sin(time * 22 + i) * 2.5;
      c.globalAlpha = 0.30 + (3 - i) * 0.2;
      c.fillStyle = i === 0 ? '#fff6d0' : i === 1 ? '#ffd166' : i === 2 ? '#ff8c42' : 'rgba(255,80,30,.7)';
      c.beginPath(); c.arc(-i * 5 * pr.dir, 0, r, 0, TAU); c.fill();
    }
    c.globalAlpha = .5;
    c.fillStyle = '#ff9a3c';
    c.beginPath();
    c.moveTo(-pr.r * 3.4, 0); c.quadraticCurveTo(-pr.r * 1.6, -pr.r * 1.5, -pr.r * 3.4, -pr.r * 2.6);
    c.quadraticCurveTo(-pr.r * 2.2, -pr.r * 1.3, -pr.r * 3.4, 0);
    c.closePath(); c.fill();
  } else {
    c.fillStyle = aura;
    c.beginPath(); c.arc(0, 0, pr.r, 0, TAU); c.fill();
    c.fillStyle = '#fff';
    c.beginPath(); c.arc(0, 0, pr.r * .45, 0, TAU); c.fill();
  }
  c.restore();
}

function drawShadow(c, f) {
  const b = f.def.build;
  const h = clamp(1 - f.y / 300, .25, 1);
  c.save();
  c.globalAlpha = .34 * h;
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(f.x, 3, b.cw * .62 * h + 8, 9 * h, 0, 0, TAU);
  c.fill();
  c.restore();
}

function drawHitboxDebug(c, f) {
  if (f.hitboxOn) {
    c.save();
    c.globalAlpha = .35;
    c.fillStyle = '#ff2d55';
    c.fillRect(f.hitbox.x, f.hitbox.y, f.hitbox.w, f.hitbox.h);
    c.globalAlpha = .28;
    c.fillStyle = '#2dff88';
    const hu = f.hurtbox();
    c.fillRect(hu.x, hu.y, hu.w, hu.h);
    c.restore();
  } else {
    c.save();
    c.globalAlpha = .22;
    c.fillStyle = '#2dff88';
    const hu = f.hurtbox();
    c.fillRect(hu.x, hu.y, hu.w, hu.h);
    c.restore();
  }
}

/* ------------------------------------------------------------
   Potret untuk layar pilih karakter
   ------------------------------------------------------------ */
function drawPortrait(cv, def, t, opt) {
  const c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  const o = opt || {};
  const b = def.build;
  const scale = o.scale || Math.min(W / 130, H / (b.h + 30));
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,.10)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);

  // siluet aura
  c.save();
  c.globalAlpha = .3;
  const ag = c.createRadialGradient(W / 2, H * .58, 4, W / 2, H * .58, W * .62);
  ag.addColorStop(0, def.aura); ag.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = ag; c.fillRect(0, 0, W, H);
  c.restore();

  const fake = {
    def, x: 0, y: 0, facing: o.facing || 1,
    state: o.state || 'idle', action: o.action || null, animPhase: t * 4.5,
    vy: o.vy || 0, hitFlash: 0, hitboxOn: false,
  };
  c.save();
  c.translate(W / 2, H * 0.94);
  c.scale(scale, -scale);   // sumbu-y dibalik, sama seperti ruang dunia
  drawCharacter(c, fake, t);
  c.restore();
}

window.PN = window.PN || {};
window.PN.Render = {
  drawCharacter, drawArenaBand, worldTransform, drawFloor, drawHUD,
  drawParticles, drawProjectile, drawShadow, drawHitboxDebug, drawPortrait,
  ARENAS, clamp, lerp, shade, roundRect, cacheCanvas,
};
})();
