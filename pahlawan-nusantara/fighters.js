/* ============================================================
   fighters.js — data 4 pahlawan.
   Semua angka ada di sini; engine hanya menjalankan aturannya.
   Menambah pahlawan baru = menambah satu blok di bawah ini.
   ============================================================ */
(() => {
'use strict';

/* keterangan medan gerak (move):
   damage     : besar kerusakan
   duration   : lama gerakan (detik)
   hitAt      : kapan pukulan aktif (0..1 dari duration)
   active     : lama hitbox menyala (detik)
   reach      : jauhnya jangkauan ke depan (unit)
   hitY/hitH  : tinggi titik tengah & tinggi kotak pukulan
   kbX/kbY    : dorongan lawan (mendatar / ke atas)
   hitstun    : lama lawan kaku setelah kena (detik)
   dash       : lompatan maju saat gerakan dimulai (unit/detik)
   dashTime   : lama lompatan maju
   hits/gap   : pukulan beruntun (jumlah & jeda antar pukulan)
   invuln     : kebal sementara
   armor      : tahan tidak terhenti sementara
   reflect    : memantulkan serangan jarak jauh
   proj       : jadi peluru jarak jauh
   vfx        : gaya efek visual
*/

const F = {};

/* ---------------- GATOTKACA ---------------- */
F.gatotkaca = {
  id: 'gatotkaca', name: 'GATOTKACA', title: 'Otot Kawat Tulang Besi',
  role: 'Petarung Udara', side: 'Ksatria',
  tag: 'Terbang melayang, hujam dari langit',
  aura: '#5b9dff',
  cutin: 'OTOT KAWAT TULANG BESI!',
  build: { h: 150, cw: 58, headR: 27, bodyW: 38, bodyH: 40, limb: 20, leg: 22, prop: 'wings', costume: 'armor', face: 'hero' },
  colors: { primary: '#2f6fd0', secondary: '#cfdcea', accent: '#f2c14e', skin: '#e0b183', dark: '#1a3a6d' },
  stats: { health: 1000, walk: 205, run: 325, jump: 640, airJumps: 2, weight: 1.05, hover: true },
  moves: {
    attacks: [
      { name: 'PUKUL 1', damage: 7,  duration: .34, hitAt: .42, reach: 92,  hitY: 78, hitH: 46, kbX: 90,  kbY: 0,   hitstun: .22, vfx: 'slash' },
      { name: 'PUKUL 2', damage: 9,  duration: .38, hitAt: .40, reach: 102, hitY: 82, hitH: 52, kbX: 130, kbY: 0,   hitstun: .26, vfx: 'slash' },
      { name: 'HUJAM',   damage: 13, duration: .50, hitAt: .44, reach: 120, hitY: 88, hitH: 62, kbX: 250, kbY: 120, hitstun: .34, vfx: 'smash', sfx: 'hitHeavy' },
    ],
    skill1: {
      name: 'KAPURANTA', hint: 'Terjang ke atas, bikin lawan melayang',
      damage: 15, duration: .52, hitAt: .34, reach: 132, hitY: 96, hitH: 70,
      kbX: 150, kbY: 340, hitstun: .38, dash: 430, dashTime: .30, canAir: true,
      vfx: 'dash', cooldown: 3,
    },
    skill2: {
      name: 'OTOT KAWAT', hint: 'Kulit jadi besi: tahan serangan 1,6 detik',
      damage: 0, duration: .55, hitAt: 1, reach: 0, hitY: 0, hitH: 0,
      kbX: 0, kbY: 0, hitstun: 0, armor: 1.6, vfx: 'aura', cooldown: 7,
    },
    ultimate: {
      name: 'JABANG BAYI', damage: 32, duration: 1.55, hitAt: .56, active: .30,
      reach: 250, hitY: 120, hitH: 150, kbX: 400, kbY: 240, hitstun: .70,
      dash: 120, dashTime: .5, canAir: true, vfx: 'slam', ult: true, cooldown: 0,
    },
  },
};

/* ---------------- BARONG ---------------- */
F.barong = {
  id: 'barong', name: 'BARONG', title: 'Penjaga Hutan',
  role: 'Kuat & Tahan', side: 'Penjaga',
  tag: 'Lambat tapi tebal, bisa menangkis',
  aura: '#ff7a45',
  cutin: 'AKU PENJAGA HUTAN!',
  build: { h: 162, cw: 76, headR: 30, bodyW: 48, bodyH: 44, limb: 22, leg: 22, prop: 'mane', costume: 'fur', face: 'fierce' },
  colors: { primary: '#e8503a', secondary: '#fff3d6', accent: '#f2c14e', skin: '#c98a5e', dark: '#7d1f14' },
  stats: { health: 1150, walk: 175, run: 270, jump: 545, airJumps: 1, weight: 1.32 },
  moves: {
    attacks: [
      { name: 'TARING 1', damage: 10, duration: .37, hitAt: .44, reach: 100, hitY: 74, hitH: 54, kbX: 115, kbY: 0,   hitstun: .26, vfx: 'slash' },
      { name: 'TARING 2', damage: 12, duration: .41, hitAt: .42, reach: 116, hitY: 78, hitH: 60, kbX: 155, kbY: 0,   hitstun: .30, vfx: 'slash' },
      { name: 'GIGITAN',  damage: 17, duration: .58, hitAt: .48, reach: 138, hitY: 80, hitH: 72, kbX: 295, kbY: 155, hitstun: .40, vfx: 'smash', sfx: 'hitHeavy' },
    ],
    skill1: {
      name: 'TARING BARONG', hint: 'Menyeruduk jauh ke depan',
      damage: 17, duration: .60, hitAt: .38, reach: 150, hitY: 78, hitH: 76,
      kbX: 250, kbY: 60, hitstun: .42, dash: 300, dashTime: .28,
      vfx: 'dash', cooldown: 3.5,
    },
    skill2: {
      name: 'SAYAP PELINDUNG', hint: 'Pelindung: tahan & pantulkan serangan jauh',
      damage: 0, duration: .70, hitAt: 1, reach: 0, hitY: 0, hitH: 0,
      kbX: 0, kbY: 0, hitstun: 0, armor: 1.3, reflect: true, vfx: 'guard', cooldown: 7,
    },
    ultimate: {
      name: 'BARONG RANGDA', damage: 5, duration: 1.70, hitAt: .30, active: .95,
      hits: 6, gap: .15, reach: 170, hitY: 82, hitH: 130, kbX: 60, kbY: 90,
      hitstun: .22, lastKbX: 420, lastKbY: 240, armor: 1.7, vfx: 'spin', ult: true, cooldown: 0,
    },
  },
};

/* ---------------- SRIKANDI ---------------- */
F.srikandi = {
  id: 'srikandi', name: 'SRIKANDI', title: 'Pendekar Keris',
  role: 'Cepat & Gesit', side: 'Ksatria',
  tag: 'Paling cepat, keris bertubi-tubi',
  aura: '#c77dff',
  cutin: 'TARIAN PEDANGKU TAK TERBENDUNG!',
  build: { h: 142, cw: 52, headR: 26, bodyW: 34, bodyH: 38, limb: 19, leg: 21, prop: 'keris', costume: 'kebaya', face: 'elegant' },
  colors: { primary: '#7c4dff', secondary: '#f7d9ff', accent: '#f2c14e', skin: '#e8bf95', dark: '#3b1e8f' },
  stats: { health: 880, walk: 245, run: 385, jump: 605, airJumps: 1, weight: .88 },
  moves: {
    attacks: [
      { name: 'TUSUK 1', damage: 5,  duration: .26, hitAt: .40, reach: 86,  hitY: 76, hitH: 42, kbX: 70,  kbY: 0,   hitstun: .18, vfx: 'stab' },
      { name: 'TUSUK 2', damage: 7,  duration: .30, hitAt: .38, reach: 94,  hitY: 80, hitH: 46, kbX: 95,  kbY: 0,   hitstun: .20, vfx: 'stab' },
      { name: 'TEBAS',   damage: 10, duration: .42, hitAt: .44, reach: 110, hitY: 82, hitH: 54, kbX: 220, kbY: 90,  hitstun: .30, vfx: 'slash' },
    ],
    skill1: {
      name: 'KERIS KILAT', hint: 'Tiga tusukan super cepat',
      damage: 6, duration: .64, hitAt: .28, active: .34, hits: 3, gap: .10,
      reach: 128, hitY: 80, hitH: 60, kbX: 55, kbY: 0, hitstun: .30,
      lastKbX: 240, vfx: 'stab', cooldown: 3,
    },
    skill2: {
      name: 'SELENDANG ANGIN', hint: 'Melesat menembus lawan, kebal sebentar',
      damage: 11, duration: .46, hitAt: .30, active: .22, reach: 96, hitY: 80, hitH: 70,
      kbX: 200, kbY: 80, hitstun: .30, dash: 640, dashTime: .30, invuln: .32,
      vfx: 'wind', cooldown: 6,
    },
    ultimate: {
      name: 'TARI PEDANG', damage: 3.6, duration: 1.75, hitAt: .26, active: 1.05,
      hits: 8, gap: .13, reach: 145, hitY: 84, hitH: 140, kbX: 40, kbY: 40,
      hitstun: .20, lastKbX: 430, lastKbY: 260, invuln: .9, vfx: 'dance', ult: true, cooldown: 0,
    },
  },
};

/* ---------------- HANUMAN ---------------- */
F.hanuman = {
  id: 'hanuman', name: 'HANUMAN', title: 'Kera Putih Sakti',
  role: 'Jarak Menengah', side: 'Penjaga',
  tag: 'Ekor panjang & bola api',
  aura: '#ffb703',
  cutin: 'GADA SAKTI, HANCURKAN!',
  build: { h: 146, cw: 58, headR: 27, bodyW: 38, bodyH: 40, limb: 20, leg: 22, prop: 'tail', costume: 'monkey', face: 'cheerful' },
  colors: { primary: '#f4a261', secondary: '#fff8e7', accent: '#e8503a', skin: '#f0d3b0', dark: '#a35a20' },
  stats: { health: 950, walk: 218, run: 345, jump: 665, airJumps: 2, weight: .95 },
  moves: {
    attacks: [
      { name: 'PUKUL 1', damage: 6,  duration: .32, hitAt: .42, reach: 90,  hitY: 78, hitH: 46, kbX: 85,  kbY: 0,   hitstun: .20, vfx: 'slash' },
      { name: 'PUKUL 2', damage: 8,  duration: .36, hitAt: .40, reach: 100, hitY: 82, hitH: 50, kbX: 120, kbY: 0,   hitstun: .24, vfx: 'slash' },
      { name: 'SAMBAR EKOR', damage: 12, duration: .48, hitAt: .46, reach: 158, hitY: 84, hitH: 58, kbX: 250, kbY: 110, hitstun: .34, vfx: 'tail', sfx: 'hitHeavy' },
    ],
    skill1: {
      name: 'EKOR API', hint: 'Lemparkan bola api dari ekor',
      damage: 14, duration: .48, hitAt: .50, reach: 60, hitY: 84, hitH: 40,
      kbX: 180, kbY: 40, hitstun: .32, vfx: 'fire',
      proj: { speed: 640, damage: 14, r: 20, life: 1.7, kbX: 180, kbY: 40, hitstun: .32, vfx: 'fire' },
      cooldown: 3,
    },
    skill2: {
      name: 'LANGKAH KERA', hint: 'Lompat jauh lalu hantam dari atas',
      damage: 14, duration: .62, hitAt: .46, reach: 110, hitY: 74, hitH: 76,
      kbX: 200, kbY: 210, hitstun: .36, dash: 350, dashTime: .32,
      vfx: 'dash', cooldown: 6,
    },
    ultimate: {
      name: 'GADA HANUMAN', damage: 31, duration: 1.55, hitAt: .58, active: .28,
      reach: 210, hitY: 100, hitH: 160, kbX: 380, kbY: 250, hitstun: .68,
      dash: 260, dashTime: .34, vfx: 'slam', ult: true, cooldown: 0,
    },
  },
};

const ORDER = ['gatotkaca', 'barong', 'srikandi', 'hanuman'];

window.PN = window.PN || {};
window.PN.Fighters = F;
window.PN.FighterOrder = ORDER;
})();
