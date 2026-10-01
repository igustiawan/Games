/* ============================================================
   audio.js — semua suara disintesis (WebAudio), tanpa file aset.
   Nada memakai tangga slendro (5 nada per oktaf) khas gamelan.
   ============================================================ */
(() => {
'use strict';

/* tangga slendro dalam cent dari nada dasar */
const SLENDRO = [0, 231, 474, 717, 955, 1200, 1431, 1674, 1917, 2155, 2400];

let ctx = null, master = null, musicGain = null, sfxGain = null;
let musicOn = true, sfxOn = true, started = false;
let timer = null, step = 0, nextTime = 0;

const BASE = 196; // G3-ish
function slendro(i) {
  const c = SLENDRO[((i % SLENDRO.length) + SLENDRO.length) % SLENDRO.length];
  const oct = Math.floor(i / SLENDRO.length);
  return BASE * Math.pow(2, (c + oct * 1200) / 1200);
}

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 0.85;
  master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = musicOn ? 0.16 : 0;
  musicGain.connect(master);
  sfxGain = ctx.createGain(); sfxGain.gain.value = sfxOn ? 0.7 : 0;
  sfxGain.connect(master);
  return true;
}

function resume() {
  if (!ensure()) return;
  if (ctx.state === 'suspended') ctx.resume();
}

/* ---------- dasar pembuat suara ---------- */

function noiseBuffer(dur) {
  const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/* bilah metalofon / bonang: parsial tak harmonis + peluruhan cepat */
function metallophone(freq, when, dur, vol, dest) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, when);
  out.gain.exponentialRampToValueAtTime(vol, when + 0.004);
  out.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  out.connect(dest || sfxGain);

  const parts = [[1, 1], [2.76, 0.34], [5.40, 0.13], [8.93, 0.05]];
  parts.forEach(([r, a]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * r, when);
    const g = ctx.createGain();
    g.gain.setValueAtTime(a, when);
    const d = dur * (r > 3 ? 0.35 : 1);
    g.gain.setValueAtTime(a, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + d);
    o.connect(g); g.connect(out);
    o.start(when); o.stop(when + dur + 0.05);
  });
}

/* gong ageng: rendah, panjang */
function gong(freq, when, dur, vol) {
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, when);
  out.gain.exponentialRampToValueAtTime(vol, when + 0.02);
  out.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  out.connect(sfxGain);

  [[1, 1], [1.51, 0.5], [2.32, 0.3], [3.9, 0.14]].forEach(([r, a]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * r, when);
    o.frequency.linearRampToValueAtTime(freq * r * 0.992, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(a, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur * (r > 2 ? 0.5 : 1));
    o.connect(g); g.connect(out);
    o.start(when); o.stop(when + dur + 0.1);
  });

  // gebrakan awal
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(0.12);
  const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 700;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.5, when);
  ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
  n.connect(nf); nf.connect(ng); ng.connect(sfxGain);
  n.start(when); n.stop(when + 0.14);
}

/* kendang / tabuh */
function drum(when, vol, pitch, dur) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(pitch, when);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.45, when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(sfxGain);
  o.start(when); o.stop(when + dur + 0.02);

  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(dur);
  const nf = ctx.createBiquadFilter(); nf.type = 'bandpass';
  nf.frequency.value = 1400; nf.Q.value = 0.8;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(vol * 0.55, when);
  ng.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.6);
  n.connect(nf); nf.connect(ng); ng.connect(sfxGain);
  n.start(when); n.stop(when + dur + 0.02);
}

/* desir angin / ayunan senjata */
function whoosh(when, vol, f0, f1, dur) {
  const n = ctx.createBufferSource(); n.buffer = noiseBuffer(dur);
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.3;
  f.frequency.setValueAtTime(f0, when);
  f.frequency.exponentialRampToValueAtTime(f1, when + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  n.connect(f); f.connect(g); g.connect(sfxGain);
  n.start(when); n.stop(when + dur + 0.02);
}

/* ---------- efek permainan ---------- */
const SFX = {
  hitLight() { if (!ok()) return; const t = ctx.currentTime;
    drum(t, 0.34, 300, 0.10); whoosh(t, 0.20, 900, 2600, 0.07); },
  hitHeavy() { if (!ok()) return; const t = ctx.currentTime;
    drum(t, 0.5, 190, 0.20); whoosh(t, 0.30, 500, 1800, 0.13);
    metallophone(slendro(7), t, 0.30, 0.14); },
  hitUlt()   { if (!ok()) return; const t = ctx.currentTime;
    gong(78, t, 1.6, 0.30); drum(t, 0.5, 150, 0.26); whoosh(t, 0.34, 400, 1500, 0.2); },
  block()    { if (!ok()) return; const t = ctx.currentTime;
    metallophone(slendro(4), t, 0.22, 0.20); drum(t, 0.20, 420, 0.06); },
  reflect()  { if (!ok()) return; const t = ctx.currentTime;
    metallophone(slendro(9), t, 0.5, 0.24); metallophone(slendro(6), t + 0.05, 0.5, 0.18); },
  whoosh()   { if (!ok()) return; whoosh(ctx.currentTime, 0.16, 1400, 420, 0.16); },
  jump()     { if (!ok()) return; const t = ctx.currentTime;
    metallophone(slendro(2), t, 0.16, 0.11); whoosh(t, 0.10, 700, 1800, 0.1); },
  land()     { if (!ok()) return; drum(ctx.currentTime, 0.16, 220, 0.09); },
  select()   { if (!ok()) return; metallophone(slendro(5), ctx.currentTime, 0.32, 0.20); },
  move()     { if (!ok()) return; metallophone(slendro(3), ctx.currentTime, 0.14, 0.09); },
  confirm()  { if (!ok()) return; metallophone(slendro(5), ctx.currentTime, 0.5, 0.20); },
  backSfx()  { if (!ok()) return; metallophone(slendro(1), ctx.currentTime, 0.35, 0.16); },
  meter()    { if (!ok()) return; metallophone(slendro(8), ctx.currentTime, 0.4, 0.16); },
  roundStart(){ if (!ok()) return; const t = ctx.currentTime;
    gong(98, t, 2.2, 0.34); metallophone(slendro(5), t + 0.32, 0.9, 0.20);
    metallophone(slendro(8), t + 0.64, 1.1, 0.20); },
  fight()    { if (!ok()) return; const t = ctx.currentTime;
    gong(130, t, 1.8, 0.36); drum(t, 0.42, 260, 0.2); drum(t + 0.14, 0.34, 200, 0.24); },
  ko()       { if (!ok()) return; const t = ctx.currentTime;
    gong(70, t, 3.4, 0.42); drum(t, 0.5, 140, 0.4); whoosh(t, 0.3, 300, 90, 0.7); },
  win()      { if (!ok()) return; const t = ctx.currentTime;
    [4, 6, 8, 10].forEach((n, i) => metallophone(slendro(n), t + i * 0.14, 0.9, 0.20)); },
  ultimate() { if (!ok()) return; const t = ctx.currentTime;
    gong(88, t, 2.6, 0.4);
    [5, 7, 9, 12].forEach((n, i) => metallophone(slendro(n), t + 0.1 + i * 0.09, 1.2, 0.22));
    whoosh(t, 0.3, 260, 3200, 0.5); },
};
function ok() { if (!ctx || !sfxOn) return false; if (ctx.state === 'suspended') ctx.resume(); return true; }

/* ---------- musik latar (gongan sederhana) ---------- */
const MELODY = [5, 5, 3, 2, 5, 5, 3, 2, 6, 6, 5, 3, 2, 2, 3, 5];
function schedule() {
  if (!ctx) return;
  while (nextTime < ctx.currentTime + 0.25) {
    const i = step % 16;
    const beat = 0.42; // detik per ketuk
    // balungan (melodi pokok)
    metallophone(slendro(MELODY[i] - 5), nextTime, 1.1, 0.20, musicGain);
    // bonang (hiasan sinkop)
    if (i % 2 === 1) metallophone(slendro(MELODY[i]), nextTime + beat * 0.5, 0.5, 0.09, musicGain);
    // kempul tiap 4, gong tiap 16
    if (i === 0) gong(88, nextTime, 3.0, 0.24);
    if (i === 8) gong(117, nextTime, 2.2, 0.18);
    // kendang
    if (i % 4 === 2) drum(nextTime, 0.16, 180, 0.16);
    if (i % 4 === 0) drum(nextTime + beat * 0.75, 0.10, 260, 0.1);
    nextTime += beat; step++;
  }
}
function startMusic() {
  if (!ensure()) return;
  if (started) return;
  started = true;
  nextTime = ctx.currentTime + 0.1; step = 0;
  timer = setInterval(schedule, 40);
  schedule();
}
function stopMusic() { if (timer) clearInterval(timer); timer = null; started = false; }

window.PN = window.PN || {};
window.PN.Audio = {
  resume,
  sfx: (name) => { const f = SFX[name]; if (f) f(); },
  startMusic: () => { startMusic(); if (musicGain) musicGain.gain.value = musicOn ? 0.16 : 0; },
  stopMusic,
  setMusicOn(v) { musicOn = v; if (musicGain) musicGain.gain.value = v ? 0.16 : 0;
    if (v) startMusic(); else stopMusic(); },
  setSfxOn(v) { sfxOn = v; if (sfxGain) sfxGain.gain.value = v ? 0.7 : 0; },
  isMusicOn: () => musicOn,
  isSfxOn: () => sfxOn,
  unlock() { resume(); },
};
})();
