/* ============================================================
   ai.js — otak lawan komputer.
   CPU mengamati jarak, keadaan lawan, dan cooldown-nya sendiri,
   lalu memilih: maju, tangkis, serang, atau lepas jurus.
   ============================================================ */
(() => {
'use strict';

/* tingkat kesulitan: makin tinggi, makin cepat bereaksi & makin pintar */
const DIFF = {
  easy:   { react: .44, block: .14, aggr: .40, skill: .30, ult: .20, jump: .06, punish: .10 },
  normal: { react: .28, block: .42, aggr: .62, skill: .55, ult: .55, jump: .12, punish: .40 },
  hard:   { react: .16, block: .70, aggr: .80, skill: .76, ult: .82, jump: .16, punish: .75 },
  expert: { react: .09, block: .90, aggr: .92, skill: .90, ult: .96, jump: .18, punish: .95 },
};

const sign = (v) => v < 0 ? -1 : 1;

function makeAI(level) {
  const cfg = DIFF[level] || DIFF.normal;
  const mem = {
    think: 0, order: 'wait', orderT: 0, tick: 0,
    press: null, pressT: 0, jumpT: 0, retreatT: 0,
  };

  return function ai(state, i, dt) {
    const f = state.fighters[i];
    const o = state.fighters[1 - i];
    const inp = { mx: 0, up: false, down: false, atk: false, s1: false, s2: false, ult: false };
    mem.tick++;

    if (state.phase !== 'fight') return inp;
    if (f.state === 'ko' || f.state === 'down') return inp;

    const dist = Math.abs(o.x - f.x);
    const toward = sign(o.x - f.x);
    const away = -toward;

    /* ---------- berpikir (dengan jeda reaksi) ---------- */
    mem.think -= dt;
    mem.orderT -= dt;
    if (mem.think <= 0) {
      mem.think = cfg.react * (0.65 + Math.random() * 0.7);
      decide(state, f, o, cfg, mem, dist, toward, away);
    }

    /* ---------- menjalankan perintah ---------- */
    // tombol yang ditekan hanya sesaat
    if (mem.pressT > 0) {
      mem.pressT -= dt;
      if (mem.press) inp[mem.press] = true;
      if (mem.pressT <= 0) mem.press = null;
    }

    switch (mem.order) {
      case 'block':
        inp.mx = away;
        break;

      case 'approach': {
        // lari: ketuk dua kali arah yang sama
        if (f.runDir === toward) inp.mx = toward;
        else inp.mx = (mem.tick % 3 === 1) ? 0 : toward;
        if (dist < 105) { mem.order = 'wait'; mem.orderT = 0.12; }
        // lompati lawan yang jauh di bawah kadang-kadang
        if (o.y > 60 && dist < 150 && mem.jumpT <= 0) { inp.up = true; mem.jumpT = 0.7; }
        break;
      }

      case 'retreat':
        inp.mx = away;
        if (mem.orderT <= 0) mem.order = 'wait';
        break;

      case 'attack': {
        inp.mx = dist > 88 ? toward : 0;
        if (!f.action && dist < 132) press(mem, 'atk', 0.14);
        // sambung rantai
        else if (f.action && f.action.type === 'attack' &&
                 f.action.index < f.def.moves.attacks.length - 1 &&
                 f.action.t > f.action.duration * 0.45 && Math.random() < cfg.aggr) {
          press(mem, 'atk', 0.1);
        }
        if (mem.orderT <= 0) mem.order = 'wait';
        break;
      }

      case 'skill1':
        inp.mx = dist > 110 ? toward : 0;
        press(mem, 's1', 0.14);
        mem.order = 'wait'; mem.orderT = 0.2;
        break;

      case 'skill2':
        inp.mx = toward;
        press(mem, 's2', 0.14);
        mem.order = 'wait'; mem.orderT = 0.2;
        break;

      case 'ult':
        inp.mx = dist > 150 ? toward : 0;
        press(mem, 'ult', 0.16);
        mem.order = 'wait'; mem.orderT = 0.3;
        break;

      default: // wait
        inp.mx = 0;
        if (o.y > 30 && dist < 170 && Math.random() < 0.02) mem.order = 'attack';
        break;
    }

    mem.jumpT -= dt;
    return inp;
  };
}

function press(mem, btn, dur) {
  mem.press = btn; mem.pressT = dur;
}

/* ---------- memilih apa yang dilakukan ---------- */
function decide(state, f, o, cfg, mem, dist, toward, away) {
  const M = f.def.moves;
  const canS1 = f.cooldowns.skill1 <= 0 && f.onGround;
  const canS2 = f.cooldowns.skill2 <= 0;
  const safe = !f.action && f.state !== 'hurt';

  // 1. menghadapi serangan lawan -> tahan arah menjauh (tangkis)
  const oAttacking = o.action && o.action.t <= o.action.duration * 0.75;
  if (oAttacking && dist < 210 && Math.random() < cfg.block) {
    mem.order = 'block'; mem.orderT = 0.32; return;
  }

  // 1b. waspada: lawan sudah dekat dan kita belum menyerang
  if (safe && dist < 118 && !o.hitstun && o.state !== 'down' && Math.random() < cfg.block * 0.45) {
    mem.order = 'block'; mem.orderT = 0.22; return;
  }

  // 2. meter penuh -> ultimate (dan sering saat lawan sedang kaku)
  if (f.meter >= 100 && !f.action && dist < 250 && Math.random() < cfg.ult) {
    const good = o.hitstun > 0 || o.state === 'down' || dist < 190;
    if (good || Math.random() < 0.4) { mem.order = 'ult'; return; }
  }

  // 3. menghukum lawan yang salah (habis menyerang & kosong)
  if (safe && o.action && o.action.t > o.action.duration * 0.62 && dist < 175 && Math.random() < cfg.punish) {
    mem.order = 'attack'; mem.orderT = 0.5; return;
  }

  // 4. serang serangan udara (anti-air)
  if (safe && canS1 && o.y > 70 && dist < 190 && Math.random() < cfg.skill) {
    mem.order = 'skill1'; return;
  }

  // 5. lawan sedang kaku di dekat kita -> serang
  if (safe && dist < 130 && (o.hitstun > 0 || o.state === 'down')) {
    mem.order = 'attack'; mem.orderT = 0.5; return;
  }

  // 6. jarak dekat -> rantai serangan
  if (safe && dist < 118 && Math.random() < cfg.aggr) {
    mem.order = 'attack'; mem.orderT = 0.55; return;
  }

  // 7. jurus jarak menengah
  if (safe && dist < 230 && dist > 100 && canS1 && Math.random() < cfg.skill) {
    mem.order = 'skill1'; return;
  }
  if (safe && dist < 290 && canS2 && Math.random() < cfg.skill * 0.75) {
    mem.order = 'skill2'; return;
  }

  // 8. sesekali mundur sebentar supaya tidak terlalu agresif
  if (dist < 150 && Math.random() < (1 - cfg.aggr) * 0.5) {
    mem.order = 'retreat'; mem.orderT = 0.3; return;
  }

  // 9. terlalu jauh -> dekati
  if (dist > 130) { mem.order = 'approach'; return; }

  mem.order = 'wait'; mem.orderT = 0.2;
}

/* ---------- boneka latihan: diam saja ---------- */
function makeDummy() {
  return function () { return { mx: 0, up: false, down: false, atk: false, s1: false, s2: false, ult: false }; };
}

/* ---------- pemain manusia: dibaca oleh input.js ---------- */
function humanController(index) {
  return function (state, i, dt) {
    return window.PN.Input.sample(index, i, state);
  };
}

window.PN = window.PN || {};
window.PN.AI = { makeAI, makeDummy, humanController, DIFF };
})();
