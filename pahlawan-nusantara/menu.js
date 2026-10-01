/* ============================================================
   menu.js — alur layar (judul, pilih pahlawan, arena, tanding)
   sekaligus gelung permainan utama.
   ============================================================ */
(() => {
'use strict';

const F = window.PN.Fighters;
const ORDER = window.PN.FighterOrder;
const R = window.PN.Render;
const E = window.PN.Engine;
const I = window.PN.Input;
const A = window.PN.Audio;

const App = {
  mode: 'cpu',
  difficulty: 'normal',
  pickStage: 0,          // 0 = P1 pilih, 1 = P2/CPU pilih, 2 = pilih arena
  sel: [null, null],
  arenaIdx: 0,
  cursor: 0,
  state: null,
  screen: 'title',
  acc: 0,
  last: 0,
  t: 0,
};

const el = (id) => document.getElementById(id);
function showScreen(name) {
  App.screen = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = el('screen-' + name);
  if (target) target.classList.add('active');
}

/* ------------------------------------------------------------
   Layar judul
   ------------------------------------------------------------ */
function initTitle() {
  document.querySelectorAll('[data-act]').forEach(btn => {
    btn.onclick = () => {
      A.unlock(); A.startMusic();
      A.sfx('confirm');
      const act = btn.dataset.act;
      if (act === 'help') { el('ov-help').hidden = false; return; }
      if (act === 'cpu') App.mode = 'cpu';
      else if (act === 'duo') App.mode = 'duo';
      else App.mode = 'train';
      startSelect();
    };
  });

  document.querySelectorAll('#diffs .chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('#diffs .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      App.difficulty = chip.dataset.diff;
      A.unlock(); A.sfx('move');
    };
  });

  const mBtn = el('toggle-music'), sBtn = el('toggle-sfx');
  mBtn.onclick = () => {
    A.unlock();
    const on = !A.isMusicOn();
    A.setMusicOn(on);
    mBtn.textContent = '🎵 Musik: ' + (on ? 'ON' : 'OFF');
    A.sfx('move');
  };
  sBtn.onclick = () => {
    A.unlock();
    const on = !A.isSfxOn();
    A.setSfxOn(on);
    sBtn.textContent = '🔊 Suara: ' + (on ? 'ON' : 'OFF');
    A.sfx('move');
  };

  el('help-close').onclick = () => { el('ov-help').hidden = true; A.sfx('backSfx'); };
}

/* ------------------------------------------------------------
   Layar pilih pahlawan
   ------------------------------------------------------------ */
function cardCanvas(def) {
  const cv = document.createElement('canvas');
  cv.width = 150; cv.height = 158;
  return cv;
}

function buildRoster() {
  const root = el('roster');
  root.innerHTML = '';
  App.cards = [];
  ORDER.forEach((id, idx) => {
    const def = F[id];
    const card = document.createElement('div');
    card.className = 'fcard';
    const cv = cardCanvas(def);
    card.appendChild(cv);
    const side = document.createElement('div');
    side.className = 'fside'; side.textContent = def.side;
    side.style.color = def.aura;
    card.appendChild(side);
    const nm = document.createElement('div');
    nm.className = 'fname'; nm.textContent = def.name;
    card.appendChild(nm);
    const tg = document.createElement('div');
    tg.className = 'ftag'; tg.textContent = def.role;
    card.appendChild(tg);
    card.onclick = () => pick(id);
    root.appendChild(card);
    App.cards.push({ card, cv, def, phase: Math.random() * 6 });
  });
  setCursor(0);
}

function buildArenas() {
  const root = el('arenas');
  root.innerHTML = '';
  R.ARENAS.forEach((ar, i) => {
    const card = document.createElement('div');
    card.className = 'acard';
    const cv = document.createElement('canvas');
    cv.width = 200; cv.height = 112;
    const c = cv.getContext('2d');
    c.save(); c.scale(200 / 420, 112 / 240);
    ar.bg(c, 420, 240); ar.fg(c, 420, 240);
    c.restore();
    card.appendChild(cv);
    const s = document.createElement('span');
    s.textContent = ar.name;
    card.appendChild(s);
    card.onclick = () => { App.arenaIdx = i; A.sfx('confirm'); startFight(); };
    root.appendChild(card);
  });
  el('arena-pick').hidden = true;
}

function setCursor(i) {
  App.cursor = (i + ORDER.length) % ORDER.length;
  App.cards.forEach((c, k) => c.card.classList.toggle('sel',
    k === App.cursor && App.pickStage < 2));
}

function startSelect() {
  App.pickStage = 0;
  App.sel = [null, null];
  buildRoster();
  buildArenas();
  el('picked-p1').querySelector('b').textContent = '—';
  el('picked-p2').querySelector('b').textContent = '—';
  if (App.mode === 'duo') {
    el('picked-p2').querySelector('.pl').textContent = 'P2';
    el('picked-p2').hidden = false;
  } else if (App.mode === 'cpu') {
    el('picked-p2').querySelector('.pl').textContent = 'CPU';
    el('picked-p2').hidden = false;
  } else {
    el('picked-p2').hidden = true;
  }
  updateSelectHead();
  showScreen('select');
}

function updateSelectHead() {
  const t = el('select-title'), h = el('select-hint');
  t.classList.remove('p1', 'p2');
  if (App.mode === 'train') {
    t.textContent = 'PILIH PAHLAWANMU';
    t.classList.add('p1');
  } else if (App.pickStage === 0) {
    t.textContent = 'PEMAIN 1 — PILIH PAHLAWAN';
    t.classList.add('p1');
  } else {
    t.textContent = (App.mode === 'duo' ? 'PEMAIN 2' : 'KOMPUTER') + ' — PILIH LAWAN';
    t.classList.add('p2');
  }
  h.textContent = App.pickStage < 2
    ? 'Klik pahlawan · atau ← → dan Enter'
    : 'Pilih arena, lalu bertanding!';
}

function pick(id) {
  if (App.pickStage >= 2) return;
  A.sfx('select');
  App.sel[App.pickStage] = id;
  const box = el(App.pickStage === 0 ? 'picked-p1' : 'picked-p2');
  box.querySelector('b').textContent = F[id].name;
  box.querySelector('b').style.color = F[id].aura;

  if (App.pickStage === 0) {
    App.pickStage = 1;
    if (App.mode === 'train') {
      // latihan: lawan otomatis dipilih acak
      App.sel[1] = ORDER[Math.floor(Math.random() * ORDER.length)];
      App.pickStage = 2;
      el('arena-pick').hidden = false;
    } else {
      // CPU memilih lawan sendiri kalau mode lawan komputer? pemain tetap memilih
      updateSelectHead();
    }
  } else if (App.pickStage === 1) {
    App.pickStage = 2;
    el('arena-pick').hidden = false;
    updateSelectHead();
  }
  App.cards.forEach((c, k) => c.card.classList.toggle('sel', k === App.cursor && App.pickStage < 2));
  if (App.pickStage >= 2) {
    App.cards.forEach(c => c.card.classList.remove('sel'));
    el('arena-pick').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

/* pilih lewat keyboard di layar pilih */
function selectKeys() {
  if (App.screen !== 'select') return;
  if (I.anyPressed(['arrowright', 'arrowdown', 'd'])) { setCursor(App.cursor + 1); A.sfx('move'); }
  if (I.anyPressed(['arrowleft', 'arrowup', 'a'])) { setCursor(App.cursor - 1); A.sfx('move'); }
  if (App.pickStage >= 2) {
    if (I.anyPressed(['arrowright', 'arrowdown', 'd'])) { App.arenaIdx = (App.arenaIdx + 1) % R.ARENAS.length; }
    if (I.anyPressed(['arrowleft', 'arrowup', 'a'])) { App.arenaIdx = (App.arenaIdx - 1 + R.ARENAS.length) % R.ARENAS.length; }
    if (I.anyPressed(['enter', ' '])) { A.sfx('confirm'); startFight(); }
  } else if (I.anyPressed(['enter', ' '])) {
    pick(ORDER[App.cursor]);
  }
  // sorot arena aktif
  document.querySelectorAll('.acard').forEach((c, i) => {
    c.style.borderColor = (App.pickStage >= 2 && i === App.arenaIdx) ? '#f2c14e' : 'rgba(255,255,255,.12)';
  });
}

/* ------------------------------------------------------------
   Mulai bertanding
   ------------------------------------------------------------ */
function startFight() {
  const defs = [F[App.sel[0]], F[App.sel[1]]];
  let controllers;
  if (App.mode === 'cpu') {
    controllers = [window.PN.AI.humanController(0), window.PN.AI.makeAI(App.difficulty)];
  } else if (App.mode === 'duo') {
    controllers = [window.PN.AI.humanController(0), window.PN.AI.humanController(1)];
  } else {
    controllers = [window.PN.AI.humanController(0), window.PN.AI.makeDummy()];
  }
  App.state = E.createMatch({
    mode: App.mode, defs, controllers, arena: R.ARENAS[App.arenaIdx],
  });
  App.acc = 0;
  el('ov-pause').hidden = true;
  el('ov-result').hidden = true;
  showScreen('fight');
  A.startMusic();
}

function togglePause() {
  const s = App.state;
  if (!s || s.over || App.screen !== 'fight') return;
  s.paused = !s.paused;
  el('ov-pause').hidden = !s.paused;
  A.sfx(s.paused ? 'backSfx' : 'confirm');
}

function showResult() {
  const s = App.state;
  if (el('ov-result').hidden === false) return;
  const w = s.winner;
  const who = w < 0 ? 'SERI!' : (s.mode === 'cpu' && w === 1) ? 'KOMPUTER MENANG!'
    : (s.mode === 'cpu' ? 'KAMU MENANG!' : 'PEMAIN ' + (w + 1) + ' MENANG!');
  el('result-title').textContent = who;
  el('result-title').style.color = w < 0 ? '#fff' : s.fighters[w].def.aura;
  el('result-sub').textContent = s.fighters.map(f => f.def.name).join('  vs  ') +
    '  ·  ' + s.arena.name;
  el('ov-result').hidden = false;
}

function initFightUI() {
  document.querySelectorAll('[data-pause-act]').forEach(b => {
    b.onclick = () => {
      const act = b.dataset.pauseAct;
      A.sfx('move');
      if (act === 'resume') togglePause();
      else if (act === 'restart') {
        App.state.paused = false; el('ov-pause').hidden = true;
        E.resetRound(App.state, App.state.mode !== 'train');
      } else {
        App.state = null; el('ov-pause').hidden = true; showScreen('title'); A.sfx('backSfx');
      }
    };
  });
  document.querySelectorAll('[data-result-act]').forEach(b => {
    b.onclick = () => {
      A.sfx('confirm');
      const act = b.dataset.resultAct;
      el('ov-result').hidden = true;
      if (act === 'again') startFight();
      else { App.state = null; showScreen('title'); }
    };
  });
}

/* ------------------------------------------------------------
   Gelung permainan
   ------------------------------------------------------------ */
const canvas = el('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

function drawSelectPortraits(dt) {
  if (App.screen !== 'select' || !App.cards) return;
  App.cards.forEach((c, i) => {
    const hero = (i === App.cursor && App.pickStage < 2);
    R.drawPortrait(c.cv, c.def, App.t + c.phase, {
      facing: 1,
      state: hero ? 'win' : 'idle',
      scale: hero ? 0.86 : 0.78,
    });
  });
}

function frame(now) {
  const dt = Math.min(0.25, (now - App.last) / 1000) || 0;
  App.last = now;
  App.t = now / 1000;

  I.beginFrame();

  if (App.screen === 'select') {
    selectKeys();
    drawSelectPortraits(dt);
  } else if (App.screen === 'fight' && App.state) {
    const s = App.state;
    if (I.anyPressed(['escape'])) togglePause();
    if (I.anyPressed(['r'])) {
      E.resetRound(s, s.mode !== 'train');
      el('ov-result').hidden = true;
    }
    if (I.anyPressed(['h'])) s.debugHitbox = !s.debugHitbox;

    if (!s.paused && !s.over) {
      s._fresh = true;
      App.acc += dt * s.slowmo;
      let guard = 0;
      while (App.acc >= E.STEP && guard++ < 8) {
        E.step(s, E.STEP);
        App.acc -= E.STEP;
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    E.render(s, ctx, W, H, App.t);

    if (s.over) showResult();
  }

  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------
   Nyalakan
   ------------------------------------------------------------ */
function boot() {
  I.init(el('touch-p1'));
  initTitle();
  initFightUI();
  App.last = performance.now();
  requestAnimationFrame(frame);

  // musik baru boleh mulai setelah ada sentuhan/klik
  const kick = () => { A.unlock(); A.startMusic(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick); };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

window.PN.App = App;
})();
