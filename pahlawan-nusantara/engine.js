/* ============================================================
   engine.js — jantung permainan.
   Simulasi langkah tetap 1/60 detik: gerak, pukulan, hitbox,
   ronde, kamera, dan efek.
   ============================================================ */
(() => {
'use strict';

const A = window.PN.Audio;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sign = (v) => v < 0 ? -1 : 1;

const STEP = 1 / 60;
const GRAVITY = 1900;
const STAGE_W = 1900;
const WALL = 70;
const ROUND_TIME = 60;
const ROUNDS_TO_WIN = 2;
const ULT_COST = 100;

/* ---------------- membuat petarung ---------------- */
function makeFighter(def, side, opts) {
  const f = {
    def, side, isCPU: !!(opts && opts.cpu),
    x: side === 0 ? STAGE_W * 0.5 - 210 : STAGE_W * 0.5 + 210,
    y: 0, vx: 0, vy: 0, facing: side === 0 ? 1 : -1,
    homeX: side === 0 ? STAGE_W * 0.5 - 210 : STAGE_W * 0.5 + 210,
    state: 'idle', stateTime: 0, action: null, animPhase: 0,
    health: def.stats.health, healthGhost: def.stats.health, meter: 0,
    cooldowns: { skill1: 0, skill2: 0 },
    onGround: true, airJumps: 0, jumpsUsed: 0,
    hitstun: 0, blockstun: 0, hitFlash: 0, invulnT: 0, armorT: 0, reflectT: 0,
    combo: 0, comboTimer: 0, knocked: false,
    hitbox: { x: 0, y: 0, w: 0, h: 0 }, hitboxOn: false, lastHitIndex: -1,
    blocking: false, blockHold: 0,
    lastTapDir: 0, lastTapT: 0, runDir: 0, _upPrev: false,
    chainQueued: false, attackIndex: 0,
    totalHits: 0, dmgDealt: 0, bestCombo: 0, bestComboRun: 0,
    input: { mx: 0, up: false, down: false, atk: false, s1: false, s2: false, ult: false },
    seen: { atk: false, s1: false, s2: false, ult: false },
  };
  return f;
}

/* ---------------- kotak tubuh (hurtbox) ---------------- */
function hurtbox(f) {
  const b = f.def.build;
  let h = b.h, w = b.cw;
  if (f.state === 'crouch') h *= 0.64;
  if (f.state === 'down' || f.state === 'ko') { h = b.cw * 1.05; w = b.h * 0.62; }
  return { x: f.x - w / 2, y: f.y + 1, w, h };
}
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ---------------- partikel ---------------- */
function spawnParticles(list, n, fn) { for (let i = 0; i < n; i++) list.push(fn(i)); }

function hitBurst(state, x, y, color, power, dir) {
  state.shake = Math.max(state.shake, 4 + power * 0.5);
  // kilatan bintang
  spawnParticles(state.particles, 5, () => ({
    type: 'star', x, y,
    vx: dir * (60 + Math.random() * 220), vy: (Math.random() - .4) * 260,
    life: .30, max: .30, size: 5 + Math.random() * power * .5,
    color: Math.random() < .5 ? '#fff8d0' : color, rot: Math.random() * 6,
  }));
  // percikan
  spawnParticles(state.particles, 8, () => ({
    type: 'spark', x, y,
    vx: dir * (120 + Math.random() * 420), vy: (Math.random() - .3) * 420,
    life: .26, max: .26, size: 3 + Math.random() * 3,
    color: Math.random() < .35 ? '#ffffff' : color,
  }));
  // gelombang
  state.particles.push({ type: 'ring', x, y, vx: 0, vy: 0, r: 16, life: .26, max: .26, color, alpha: .9 });
  // debu
  spawnParticles(state.particles, 4, () => ({
    type: 'dust', x, y: y * .2, vx: (Math.random() - .5) * 200, vy: 40 + Math.random() * 120,
    life: .5, max: .5, size: 6 + Math.random() * 9, color: 'rgba(255,255,255,.34)',
  }));
}

function blockBurst(state, x, y, color) {
  state.shake = Math.max(state.shake, 3);
  spawnParticles(state.particles, 7, () => ({
    type: 'spark', x, y,
    vx: (Math.random() - .5) * 320, vy: (Math.random() - .5) * 320,
    life: .22, max: .22, size: 2.5 + Math.random() * 2,
    color: Math.random() < .5 ? '#cfe6ff' : color,
  }));
  state.particles.push({ type: 'ring', x, y, vx: 0, vy: 0, r: 20, life: .2, max: .2, color: '#bfd8ff', alpha: .8 });
}

function updateParticles(state, dt) {
  const ps = state.particles;
  for (let i = ps.length - 1; i >= 0; i--) {
    const p = ps[i];
    p.life -= dt;
    if (p.life <= 0) { ps.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.type === 'spark' || p.type === 'star') { p.vy -= 900 * dt; p.vx *= 0.94; }
    else if (p.type === 'dust') { p.vy -= 120 * dt; p.vx *= 0.9; }
  }
  if (state.ambientT !== undefined) {
    state.ambientT -= dt;
    if (state.ambientT <= 0) {
      state.ambientT = 0.10;
      const rx = state.cam.x + (Math.random() - .5) * 900;
      state.particles.push({
        type: 'dust', x: rx, y: Math.random() * 320,
        vx: (Math.random() - .5) * 26, vy: 12 + Math.random() * 24,
        life: 2.6, max: 2.6, size: 1.6 + Math.random() * 2.4,
        color: state.arena.dust, alpha: .7,
      });
    }
  }
}

/* ---------------- ronde ---------------- */
function resetRound(state, keepWins) {
  state.fighters.forEach((f, i) => {
    f.x = f.homeX; f.y = 0; f.vx = 0; f.vy = 0;
    f.facing = i === 0 ? 1 : -1;
    f.health = f.def.stats.health; f.healthGhost = f.health;
    f.state = 'idle'; f.stateTime = 0; f.action = null;
    f.hitstun = 0; f.blockstun = 0; f.hitFlash = 0; f.invulnT = 0; f.armorT = 0; f.reflectT = 0;
    f.combo = 0; f.comboTimer = 0; f.knocked = false;
    f.onGround = true; f.airJumps = 0; f.jumpsUsed = 0;
    f.cooldowns.skill1 = 0; f.cooldowns.skill2 = 0;
    f.chainQueued = false; f.attackIndex = 0;
    f.hitboxOn = false; f.lastHitIndex = -1;
    f.blocking = false; f.runDir = 0; f.lastTapDir = 0; f._upPrev = false;
  });
  if (!keepWins) { state.wins = [0, 0]; }
  state.projectiles.length = 0;
  state.particles.length = 0;
  state.timer = ROUND_TIME;
  state.phase = 'intro'; state.phaseT = 0;
  state.slowmo = 1; state.hitstop = 0;
  state.cutin = null; state.cutinT = 0;
  state._saidGo = false;
  announce(state, state.mode === 'train' ? 'LATIHAN' : 'RONDE ' + (state.wins[0] + state.wins[1] + 1),
    state.mode === 'train' ? 1.2 : 1.5, '#f2c14e', '#e8503a');
  state.cam.x = STAGE_W / 2;
  A.sfx('roundStart');
}

function announce(state, text, dur, c1, c2) {
  state.announce = text;
  state.announceT = dur; state.announceMax = dur;
  state.announceColor = c1; state.announceColor2 = c2;
}

/* waktu ronde habis: yang darahnya lebih banyak menang ronde ini */
function timeUp(state) {
  if (state.phase !== 'fight') return;
  state.phase = 'ko'; state.phaseT = 0;
  const h1 = state.fighters[0].health, h2 = state.fighters[1].health;
  if (h1 === h2) { state.wins[0]++; state.wins[1]++; }   // seri: keduanya dapat satu
  else state.wins[h1 > h2 ? 0 : 1]++;
  announce(state, 'WAKTU HABIS', 2.2, '#fff2b0', '#e8503a');
  state.slowmo = 0.5;
  A.sfx('ko');
}

function createMatch(opts) {
  const defs = opts.defs;
  const state = {
    mode: opts.mode || 'cpu',
    arena: opts.arena,
    fighters: [
      makeFighter(defs[0], 0, { cpu: false }),
      makeFighter(defs[1], 1, { cpu: opts.mode === 'cpu' }),
    ],
    controllers: opts.controllers,
    timer: ROUND_TIME, wins: [0, 0], roundsToWin: ROUNDS_TO_WIN,
    phase: 'intro', phaseT: 0,
    announce: '', announceT: 0, announceMax: 1, announceColor: '#f2c14e', announceColor2: '#e8503a',
    cutin: null, cutinT: 0, cutinMax: 1.15,
    particles: [], projectiles: [],
    cam: { x: STAGE_W / 2, scale: 1, stageW: STAGE_W },
    hitstop: 0, shake: 0, slowmo: 1, time: 0,
    ambientT: 0,
    paused: false, over: false, winner: -1,
    debugHitbox: false,
    _in: null, _fresh: false,
  };
  state.fighters.forEach(f => { f.hurtbox = () => hurtbox(f); });
  resetRound(state, false);
  state.wins = [0, 0];
  return state;
}

/* ---------------- pukulan ---------------- */
function moveAllowed(f, name, o) {
  const M = f.def.moves;
  if (f.state === 'down' || f.state === 'ko') return false;
  if (f.state === 'hurt' && f.hitstun > 0.08) return false;
  if (f.action) {
    // jurus boleh membatalkan serangan dasar, tapi tidak sebaliknya
    if (!(f.action.type === 'attack' && name !== 'attack')) return false;
  }
  if (name === 'skill1' && f.cooldowns.skill1 > 0) return false;
  if (name === 'skill2' && f.cooldowns.skill2 > 0) return false;
  if (name === 'ultimate') {
    if (f.meter < ULT_COST) return false;
    if (f.action) return false;
  }
  const mv = name === 'attack' ? M.attacks[Math.min(f.attackIndex, M.attacks.length - 1)] : M[name];
  if (!mv) return false;
  if (!f.onGround && !mv.canAir && name !== 'attack') return false;
  return mv;
}

function startMove(state, f, name) {
  const M = f.def.moves;
  let mv, idx = 0;
  if (name === 'attack') {
    idx = clamp(f.attackIndex, 0, M.attacks.length - 1);
    mv = M.attacks[idx];
  } else mv = M[name];

  const a = Object.assign({}, mv);
  a.type = name;
  a.index = idx;
  a.t = 0;
  a.duration = mv.duration;
  a.facing = f.facing;
  a.didHit = false;

  f.action = a;
  f.state = 'attack';
  f.stateTime = 0;
  f.hitboxOn = false;
  f.lastHitIndex = -1;
  f.chainQueued = false;
  if (name === 'attack') { f.attackIndex = idx + 1; if (f.attackIndex >= M.attacks.length) f.attackIndex = 0; }
  else f.attackIndex = 0;

  if (name === 'ultimate') {
    f.meter -= ULT_COST;
    state.cutin = f; state.cutinT = state.cutinMax; state.slowmo = 0.22;
    A.sfx('ultimate');
  } else if (name === 'skill1') { f.cooldowns.skill1 = mv.cooldown; A.sfx('whoosh'); }
  else if (name === 'skill2') { f.cooldowns.skill2 = mv.cooldown; A.sfx(mv.reflect ? 'reflect' : 'whoosh'); }
  else A.sfx('whoosh');

  if (mv.armor) f.armorT = Math.max(f.armorT, mv.armor);
  if (mv.invuln) f.invulnT = Math.max(f.invulnT, mv.invuln);
  if (mv.reflect) f.reflectT = Math.max(f.reflectT, mv.duration);

  // peluru
  if (mv.proj) {
    a.projSpawned = false;
  }
  return a;
}

/* jendela hitbox aktif: mengembalikan indeks pukulan (-1 = tidak aktif) */
function hitboxWindow(a) {
  const t0 = a.duration * a.hitAt;
  const act = a.active || 0.10;
  const hits = a.hits || 1;
  const gap = a.gap || act;
  if (a.t < t0) return -1;
  const idx = Math.floor((a.t - t0) / gap);
  if (idx >= hits) return -1;
  if ((a.t - t0) - idx * gap > act) return -1;
  return idx;
}

function updateHitbox(f) {
  const a = f.action;
  if (!a || !a.reach) { f.hitboxOn = false; return -1; }
  const w = hitboxWindow(a);
  f.hitboxOn = w >= 0;
  if (w >= 0) {
    const reach = a.reach, h = a.hitH;
    f.hitbox = {
      x: f.facing > 0 ? f.x - 6 : f.x - reach + 6,
      y: f.y + a.hitY - h / 2,
      w: reach, h,
    };
  }
  return w;
}

function applyHit(state, atk, def, opts) {
  const move = opts.move || atk.action || opts;
  const dir = sign(def.x - atk.x) || atk.facing;
  const power = move.damage || 0;

  // apakah lawan menangkis? (menahan arah menjauh dari penyerang)
  const away = -dir;
  const canBlock = def.onGround && def.blocking && !def.action &&
    def.state !== 'hurt' && def.state !== 'down' && def.state !== 'ko' && def.hitstun <= 0;
  const blocked = canBlock && !move.unblockable && !move.ult;

  const hp = opts.proj
    ? { x: opts.proj.x, y: opts.proj.y }
    : { x: atk.hitbox.x + atk.hitbox.w * (atk.facing > 0 ? 1 : 0), y: atk.hitbox.y + atk.hitbox.h / 2 };

  if (blocked) {
    const chip = power * 0.14;
    def.health = Math.max(0, def.health - chip);
    def.blockstun = 0.18;
    def.state = 'block';
    def.stateTime = 0;
    def.vx = away * (70 + power * 6);
    atk.meter = Math.min(ULT_COST, atk.meter + power * 0.35);
    def.meter = Math.min(ULT_COST, def.meter + power * 0.45);
    blockBurst(state, hp.x, hp.y, atk.def.colors.accent);
    A.sfx('block');
    state.hitstop = Math.max(state.hitstop, 0.035);
    return;
  }

  // Kombo panjang meluruh: kerusakan mengecil, lawan lebih cepat pulih,
  // dan dorongan makin jauh — supaya tidak ada kombo tanpa akhir.
  const dmgScale = clamp(1 - atk.combo * 0.085, 0.22, 1);
  const stunScale = clamp(1 - atk.combo * 0.07, 0.30, 1);
  const pushScale = 1 + atk.combo * 0.13;

  const dmg = power * dmgScale;
  def.health = Math.max(0, def.health - dmg);
  // di mode latihan, boneka tidak pernah tumbang
  if (state.mode === 'train' && def.side === 1) def.health = Math.max(1, def.health);
  def.hitstun = (move.hitstun || .25) * stunScale;
  def.state = 'hurt';
  def.stateTime = 0;
  def.action = null;
  def.blocking = false;
  def.hitFlash = 0.09;
  def.attackIndex = 0;
  const w = def.def.stats.weight;
  def.vx = dir * (move.kbX || 80) * pushScale / w * 1.5;
  if (move.kbY) { def.vy = move.kbY / w; def.onGround = false; }
  if ((move.kbY || 0) * pushScale > 130) def.knocked = true;

  atk.combo++; atk.comboTimer = 0.95;
  atk.totalHits++; atk.dmgDealt += dmg;
  if (atk.combo > atk.bestCombo) atk.bestCombo = atk.combo;
  atk.meter = Math.min(ULT_COST, atk.meter + dmg * 0.85);
  def.meter = Math.min(ULT_COST, def.meter + dmg * 0.5);

  const big = dmg >= 13;
  hitBurst(state, hp.x, hp.y, atk.def.aura, big ? 3 : 1.4, dir);
  state.hitstop = Math.max(state.hitstop, 0.045 + Math.min(dmg, 30) * 0.0035);
  A.sfx(move.ult ? 'hitUlt' : big ? 'hitHeavy' : 'hitLight');

  if (def.health <= 0) koFighter(state, def, atk);
}

function koFighter(state, def, atk) {
  def.state = 'ko'; def.stateTime = 0; def.action = null;
  def.vx = sign(def.x - atk.x) * 340;
  def.vy = 300;
  def.knocked = true; def.onGround = false;
  state.shake = 22;
  state.slowmo = 0.32;
  state.hitstop = 0.14;
  announce(state, 'K.O.!', 1.9, '#fff2b0', '#e8503a');
  A.sfx('ko');
  spawnParticles(state.particles, 16, () => ({
    type: 'spark', x: def.x, y: def.y + def.def.build.h / 2,
    vx: (Math.random() - .5) * 700, vy: (Math.random() - .2) * 620,
    life: .5, max: .5, size: 3 + Math.random() * 4, color: atk.def.aura,
  }));
  state.phase = 'ko'; state.phaseT = 0;
}

/* ---------------- input petarung ---------------- */
function readController(state, i, dt) {
  const f = state.fighters[i];
  const ctrl = state.controllers[i];
  let inp = { mx: 0, up: false, down: false, atk: false, s1: false, s2: false, ult: false };
  if (ctrl) inp = ctrl(state, i, dt) || inp;
  // hanya ujung (edge) dipakai sekali per frame
  if (!state._fresh) { inp = Object.assign({}, inp, { atk: false, s1: false, s2: false, ult: false }); }
  f.input = inp;
  return inp;
}

/* ---------------- langkah satu petarung ---------------- */
function stepFighter(state, f, o, dt) {
  const inp = readController(state, f.side, dt);
  const st = f.def.stats;

  // timers
  f.stateTime += dt;
  f.hitFlash = Math.max(0, f.hitFlash - dt);
  f.invulnT = Math.max(0, f.invulnT - dt);
  f.armorT = Math.max(0, f.armorT - dt);
  f.reflectT = Math.max(0, f.reflectT - dt);
  f.cooldowns.skill1 = Math.max(0, f.cooldowns.skill1 - dt);
  f.cooldowns.skill2 = Math.max(0, f.cooldowns.skill2 - dt);
  if (f.comboTimer > 0) { f.comboTimer -= dt; if (f.comboTimer <= 0) f.combo = 0; }
  f.hitstun = Math.max(0, f.hitstun - dt);
  f.blockstun = Math.max(0, f.blockstun - dt);

  // hadapi lawan saat di darat & tidak menyerang
  if (f.onGround && !f.action && f.state !== 'hurt' && f.state !== 'down' && f.state !== 'ko') {
    const want = sign(o.x - f.x) || f.facing;
    f.facing = want;
  }

  /* ----- keadaan khusus ----- */
  if (f.state === 'ko') {
    f.x += f.vx * dt; f.vy -= GRAVITY * dt; f.y += f.vy * dt;
    if (f.y <= 0) { f.y = 0; f.vy = 0; f.vx *= 0.7; if (Math.abs(f.vx) < 30) f.vx = 0; f.onGround = true; }
    f.x = clamp(f.x, WALL, STAGE_W - WALL);
    return;
  }

  if (f.state === 'down') {
    if (f.stateTime > 1.1) { f.state = 'idle'; f.stateTime = 0; f.invulnT = 0.5; }
    f.x += f.vx * dt; f.vx *= 0.86;
    f.x = clamp(f.x, WALL, STAGE_W - WALL);
    return;
  }

  if (f.state === 'hurt') {
    f.x += f.vx * dt; f.vx *= f.onGround ? 0.82 : 0.965;
    f.vy -= GRAVITY * dt; f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0;
      if (f.knocked && f.hitstun > 0) {
        f.state = 'down'; f.stateTime = 0; f.knocked = false;
        f.vx *= 0.5; f.vy = 0; f.onGround = true;
        state.shake = Math.max(state.shake, 8);
        A.sfx('land');
        spawnParticles(state.particles, 8, () => ({
          type: 'dust', x: f.x + (Math.random() - .5) * 40, y: 4,
          vx: (Math.random() - .5) * 260, vy: 60 + Math.random() * 150,
          life: .5, max: .5, size: 7 + Math.random() * 10, color: 'rgba(255,255,255,.4)',
        }));
        return;
      }
      f.vy = 0; f.onGround = true;
    }
    if (f.hitstun <= 0) { f.state = 'idle'; f.stateTime = 0; f.attackIndex = 0; }
    f.x = clamp(f.x, WALL, STAGE_W - WALL);
    return;
  }

  if (f.state === 'block') {
    f.x += f.vx * dt; f.vx *= 0.84;
    if (f.blockstun <= 0) { f.state = 'idle'; f.stateTime = 0; }
    f.x = clamp(f.x, WALL, STAGE_W - WALL);
    return;
  }

  /* ----- sedang melakukan jurus ----- */
  if (f.action) {
    const a = f.action;
    a.t += dt;

    // rantai serangan dasar: tekan serang lagi untuk menyambung
    if (state._fresh && inp.atk && a.type === 'attack' && a.index < f.def.moves.attacks.length - 1) {
      f.chainQueued = true;
    }

    // lompatan maju
    if (a.dash && a.t <= (a.dashTime || .3)) {
      const k = 1 - a.t / (a.dashTime || .3);
      f.vx = a.facing * a.dash * (0.35 + 0.65 * k);
    }

    // peluru
    if (a.proj && !a.projSpawned && a.t >= a.duration * a.hitAt) {
      a.projSpawned = true;
      state.projectiles.push({
        owner: f.side, x: f.x + f.facing * 42, y: f.y + a.hitY,
        vx: f.facing * a.proj.speed, vy: 0, dir: f.facing,
        r: a.proj.r, life: a.proj.life, color: f.def.aura, vfx: a.proj.vfx,
        damage: a.proj.damage, kbX: a.proj.kbX, kbY: a.proj.kbY, hitstun: a.proj.hitstun,
      });
      A.sfx('whoosh');
    }

    updateHitbox(f);

    // kena?
    const wi = hitboxWindow(a);
    if (wi >= 0 && wi !== f.lastHitIndex) {
      const box = f.hitbox;
      const hu = hurtbox(o);
      if (o.invulnT <= 0 && overlap(box, hu)) {
        f.lastHitIndex = wi;
        const isLast = a.hits ? (wi === a.hits - 1) : true;
        const move = isLast && a.lastKbX ? Object.assign({}, a, { kbX: a.lastKbX, kbY: a.lastKbY }) : a;
        applyHit(state, f, o, { proj: null, move });
      }
    }

    // selesai
    if (a.t >= a.duration) {
      if (a.type === 'attack' && f.chainQueued) {
        f.chainQueued = false;
        f.action = null;
        startMove(state, f, 'attack');
        return;
      }
      f.action = null;
      f.hitboxOn = false;
      f.state = f.onGround ? 'idle' : 'air';
      f.stateTime = 0;
      f.attackIndex = 0;
    }
  } else {
    /* ----- gerak bebas ----- */
    if (state._fresh) {
      if (inp.ult && f.meter >= ULT_COST && moveAllowed(f, 'ultimate', o)) {
        startMove(state, f, 'ultimate'); return;
      }
      if (inp.s1 && moveAllowed(f, 'skill1', o)) { startMove(state, f, 'skill1'); return; }
      if (inp.s2 && moveAllowed(f, 'skill2', o)) { startMove(state, f, 'skill2'); return; }
      if (inp.atk) {
        f.attackIndex = 0;
        if (moveAllowed(f, 'attack', o)) { startMove(state, f, 'attack'); return; }
      }
    }

    const mx = inp.mx;
    // menahan arah menjauh dari lawan = siap menangkis
    f.blocking = f.onGround && !inp.down && mx !== 0 && mx === -sign(o.x - f.x);

    // lompat: hanya saat tombol baru ditekan
    const upPressed = inp.up && !f._upPrev;
    f._upPrev = inp.up;

    if (f.onGround) {
      if (inp.down) {
        f.state = 'crouch'; f.vx *= 0.6;
      } else if (mx !== 0) {
        // lari: ketuk dua kali arah yang sama
        if (mx === f.lastTapDir && (state.time - f.lastTapT) < 0.30) f.runDir = mx;
        if (mx !== f.lastTapDir) { f.lastTapDir = mx; f.lastTapT = state.time; }
        const running = f.runDir === mx;
        const spd = running ? st.run : st.walk;
        f.vx = mx * spd;
        f.state = running ? 'run' : 'walk';
        f.animPhase += (running ? 13 : 8.5) * dt;
      } else {
        f.state = 'idle'; f.vx *= 0.72; f.runDir = 0;
      }
      if (upPressed) {
        f.vy = st.jump; f.onGround = false; f.jumpsUsed = 1;
        f.state = 'air'; f.stateTime = 0;
        A.sfx('jump');
        spawnParticles(state.particles, 5, () => ({
          type: 'dust', x: f.x + (Math.random() - .5) * 26, y: 2,
          vx: (Math.random() - .5) * 160, vy: 30 + Math.random() * 90,
          life: .35, max: .35, size: 5 + Math.random() * 7, color: 'rgba(255,255,255,.34)',
        }));
      }
    } else {
      // di udara: lompatan tambahan
      if (upPressed && f.jumpsUsed < st.airJumps) {
        f.vy = st.jump * 0.88; f.jumpsUsed++;
        A.sfx('jump');
        state.particles.push({ type: 'ring', x: f.x, y: f.y + 10, vx: 0, vy: 0, r: 22, life: .28, max: .28, color: '#ffffff', alpha: .6 });
      }
      if (inp.down) f.vy -= 2600 * dt;           // jatuh cepat
      if (mx !== 0) f.vx += mx * (st.run * 2.4) * dt;
      f.vx = clamp(f.vx, -st.run, st.run);
      f.state = 'air';
    }
  }

  /* ----- fisika ----- */
  if (!f.onGround) {
    f.vy -= GRAVITY * dt;
    // Gatotkaca melayang: turunnya diperlambat
    if (f.def.stats.hover && f.vy < -170 && !f.input.down) f.vy = -170;
    f.vx *= 0.995;
  }
  f.x += f.vx * dt;
  f.y += f.vy * dt;

  if (f.y <= 0) {
    if (!f.onGround) {
      const hard = f.vy < -420;
      A.sfx('land');
      if (hard) {
        state.shake = Math.max(state.shake, 6);
        spawnParticles(state.particles, 8, () => ({
          type: 'dust', x: f.x + (Math.random() - .5) * 46, y: 3,
          vx: (Math.random() - .5) * 300, vy: 60 + Math.random() * 160,
          life: .45, max: .45, size: 6 + Math.random() * 10, color: 'rgba(255,255,255,.4)',
        }));
      }
      if (!f.action) { f.state = 'land'; f.stateTime = 0; }
    }
    f.y = 0; f.vy = 0; f.onGround = true; f.jumpsUsed = 0;
  }
  if (f.state === 'land' && f.stateTime > 0.09 && !f.action) f.state = 'idle';
  if (!f.onGround && !f.action) f.state = 'air';

  f.x = clamp(f.x, WALL, STAGE_W - WALL);
}

/* ---------------- dorong badan agar tidak tumpang tindih ---------------- */
function separate(a, b) {
  const minD = (a.def.build.cw + b.def.build.cw) * 0.5 * 0.98;
  const d = b.x - a.x;
  const ad = Math.abs(d);
  if (ad < minD && ad > 0.001) {
    const push = (minD - ad) * 0.5;
    const dir = sign(d);
    a.x -= dir * push; b.x += dir * push;
  } else if (ad <= 0.001) {
    a.x -= minD * 0.5; b.x += minD * 0.5;
  }
  a.x = clamp(a.x, WALL, STAGE_W - WALL);
  b.x = clamp(b.x, WALL, STAGE_W - WALL);
}

/* ---------------- ronde & kamera ---------------- */
function stepMatch(state, dt) {
  state.time += dt;
  state.phaseT += dt;
  state.shake = Math.max(0, state.shake - dt * 46);

  // kesehatan "bayangan" untuk animasi bar
  state.fighters.forEach(f => {
    if (f.healthGhost > f.health) f.healthGhost = Math.max(f.health, f.healthGhost - dt * f.def.stats.health * 0.55);
    else f.healthGhost = f.health;
  });

  if (state.cutinT > 0) {
    state.cutinT -= dt;
    if (state.cutinT < state.cutinMax - 0.42) state.slowmo = 1;
    if (state.cutinT <= 0) { state.cutin = null; state.slowmo = 1; }
  }

  switch (state.phase) {
    case 'intro':
      if (state.phaseT > 0.75 && !state._saidGo) {
        state._saidGo = true;
        announce(state, 'MULAI!', 0.85, '#fff2b0', '#e8503a');
        A.sfx('fight');
      }
      if (state.phaseT > 1.7) { state.phase = 'fight'; state.phaseT = 0; state._saidGo = false; }
      break;

    case 'fight': {
      if (state.mode !== 'train') {
        state.timer = Math.max(0, state.timer - dt);
        if (state.timer <= 0) timeUp(state);
      }
      break;
    }

    case 'ko':
      state.slowmo = Math.min(1, state.slowmo + dt * 0.8);
      if (state.phaseT > 2.0) {
        const dead = state.fighters.find(f => f.health <= 0);
        if (dead) {
          const wi = dead.side === 0 ? 1 : 0;
          if (state.mode !== 'train') state.wins[wi]++;
        }
        if (state.mode === 'train' || state.wins[0] >= state.roundsToWin || state.wins[1] >= state.roundsToWin) {
          state.phase = 'matchend'; state.phaseT = 0;
          const w = state.wins[0] > state.wins[1] ? 0 : state.wins[1] > state.wins[0] ? 1 : -1;
          state.winner = w;
          if (w >= 0) {
            state.fighters[w].state = 'win'; state.fighters[w].stateTime = 0;
            state.fighters[w].action = null;
            announce(state, 'PEMAIN ' + (w + 1) + ' MENANG!', 2.6, '#fff8e6', '#f2c14e');
            A.sfx('win');
          }
          state.slowmo = 1;
        } else {
          const keep = state.fighters.slice();
          resetRound(state, true);
          keep.forEach((f, i) => { state.fighters[i].meter = f.meter; });
        }
      }
      break;

    case 'matchend':
      if (state.phaseT > 2.2) state.over = true;
      break;
  }

  // kamera
  const [p1, p2] = state.fighters;
  const mid = (p1.x + p2.x) / 2;
  const dist = Math.abs(p1.x - p2.x);
  const target = clamp(960 / (dist + 640), 0.80, 1.14);
  state.cam.scale = lerp(state.cam.scale, target, 1 - Math.pow(0.004, dt));
  const half = (960 / 2) / state.cam.scale;
  state.cam.x = lerp(state.cam.x, clamp(mid, half, STAGE_W - half), 1 - Math.pow(0.0015, dt));
}

/* ---------------- langkah utama ---------------- */
function step(state, dt) {
  if (state.paused || state.over) return;

  const [p1, p2] = state.fighters;

  // pengumuman ("RONDE 1", "MULAI!", "K.O.") berjalan dengan waktu
  if (state.announceT > 0) {
    state.announceT = Math.max(0, state.announceT - dt);
    if (state.announceT === 0) state.announce = '';
  }

  // hitstop: semua beku sebentar supaya pukulan terasa "berat"
  if (state.hitstop > 0) {
    state.hitstop -= dt;
    // jam tetap berjalan supaya waktu ronde cocok dengan waktu nyata
    if (state.phase === 'fight' && state.mode !== 'train') {
      state.timer = Math.max(0, state.timer - dt);
      if (state.timer <= 0) timeUp(state);
    }
    updateParticles(state, dt * 0.25);
    state.phaseT += dt;
    return;
  }

  if (state.phase === 'fight' || state.phase === 'intro') {
    const canAct = state.phase === 'fight' || state.phaseT > 0.9;

    if (canAct) {
      stepFighter(state, p1, p2, dt);
      stepFighter(state, p2, p1, dt);
    } else {
      // masih hitungan mundur: input tetap dibaca untuk arah hadap
      readController(state, 0, dt); readController(state, 1, dt);
    }
    separate(p1, p2);
    updateProjectiles(state, dt);
  } else {
    // ronde selesai: fisika tetap jalan supaya jatuh dengan mulus
    stepFighterPassive(state, p1, p2, dt);
    stepFighterPassive(state, p2, p1, dt);
    separate(p1, p2);
    updateProjectiles(state, dt);
  }

  updateParticles(state, dt);
  stepMatch(state, dt);
  state._fresh = false;
}

/* saat ronde berakhir, petarung hanya jatuh/berdiri (tanpa input) */
function stepFighterPassive(state, f, o, dt) {
  f.stateTime += dt;
  f.hitFlash = Math.max(0, f.hitFlash - dt);
  if (f.state === 'ko' || f.state === 'down' || f.state === 'hurt') {
    f.x += f.vx * dt; f.vx *= f.onGround ? 0.86 : 0.97;
    f.vy -= GRAVITY * dt; f.y += f.vy * dt;
    if (f.y <= 0) {
      f.y = 0; f.vy = 0; f.onGround = true;
      if (f.state === 'ko' && f.stateTime > 0.4 && f.vx > 40) {
        spawnParticles(state.particles, 3, () => ({
          type: 'dust', x: f.x, y: 3, vx: (Math.random() - .5) * 220, vy: 40,
          life: .4, max: .4, size: 6, color: 'rgba(255,255,255,.35)',
        }));
      }
      f.vx *= 0.7;
    }
  }
  if (f.state === 'hurt' && f.hitstun > 0) f.hitstun -= dt;
  f.x = clamp(f.x, WALL, STAGE_W - WALL);
  updateHitbox(f);
}

/* ---------------- peluru ---------------- */
function updateProjectiles(state, dt) {
  for (let i = state.projectiles.length - 1; i >= 0; i--) {
    const p = state.projectiles[i];
    p.x += p.vx * dt;
    p.life -= dt;

    const target = state.fighters[p.owner === 0 ? 1 : 0];
    const attacker = state.fighters[p.owner];

    if (p.life <= 0 || p.x < -60 || p.x > STAGE_W + 60) { state.projectiles.splice(i, 1); continue; }

    // pantulan oleh pelindung Barong
    if (target.reflectT > 0) {
      const hu = hurtbox(target);
      if (overlap({ x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 }, hu)) {
        p.owner = target.side;
        p.vx = -p.vx * 1.15;
        p.damage *= 0.6;
        p.color = '#ffd479';
        A.sfx('reflect');
        spawnParticles(state.particles, 10, () => ({
          type: 'spark', x: p.x, y: p.y, vx: (Math.random() - .5) * 400, vy: (Math.random() - .5) * 400,
          life: .3, max: .3, size: 3, color: '#ffe9a8',
        }));
        continue;
      }
    }

    const hu = hurtbox(target);
    const box = { x: p.x - p.r, y: p.y - p.r, w: p.r * 2, h: p.r * 2 };
    if (target.invulnT <= 0 && overlap(box, hu)) {
      applyHit(state, attacker, target, {
        move: { damage: p.damage, kbX: p.kbX, kbY: p.kbY, hitstun: p.hitstun, vfx: p.vfx },
        proj: { x: p.x, y: p.y },
      });
      state.projectiles.splice(i, 1);
      continue;
    }
  }
}

/* ---------------- render ---------------- */
function render(state, c, W, H, t) {
  const R = window.PN.Render;
  c.save();
  // goyangan layar
  if (state.shake > 0.2) {
    const s = state.shake;
    c.translate((Math.random() - .5) * s, (Math.random() - .5) * s);
  }

  R.drawArenaBand(c, W, H, state.arena, state.cam, t);

  c.save();
  R.worldTransform(c, state.cam, W, H);

  R.drawFloor(c, state.cam, state.arena, t);

  const [p1, p2] = state.fighters;
  R.drawShadow(c, p1); R.drawShadow(c, p2);

  // yang lebih belakang digambar dulu (berdasarkan y agar terlihat benar)
  const order = p1.y >= p2.y ? [p2, p1] : [p1, p2];
  order.forEach(f => {
    if (f.invulnT > 0 && Math.floor(t * 30) % 2 === 0 && f.state !== 'ko') c.globalAlpha = 0.45;
    R.drawCharacter(c, f, t);
    c.globalAlpha = 1;
  });

  state.projectiles.forEach(p => R.drawProjectile(c, p, t));
  R.drawParticles(c, state.particles);

  if (state.debugHitbox) {
    state.fighters.forEach(f => R.drawHitboxDebug(c, f));
  }

  c.restore();

  R.drawHUD(c, W, H, state, t);
  c.restore();
}

window.PN = window.PN || {};
window.PN.Engine = {
  createMatch, step, render, resetRound, STAGE_W, ROUND_TIME, ROUNDS_TO_WIN, ULT_COST, STEP,
  announce,
};
})();
