/* ============================================================
   home.js — halaman utama "Dunia Kiya & Zhian"
   Tiap kartu punya pratinjau kecil yang benar-benar bergerak,
   digambar dengan Canvas (tanpa file gambar sama sekali).

   MENAMBAH GAME BARU: cukup tambah satu baris di daftar GAMES
   di bawah, lalu buat fungsi pratinjaunya (lihat PREVIEWS).
   ============================================================ */
(() => {
'use strict';

/* ---------------- daftar game ----------------
   cat  : 'main' = game seru, 'belajar' = belajar TK
   lvl  : tingkat kesulitan 1-3 (ditampilkan sebagai titik)
   prev : nama fungsi pratinjau di PREVIEWS                     */
const GAMES = [
  { id:'pahlawan-nusantara', href:'pahlawan-nusantara/', title:'Pahlawan Nusantara',
    desc:'Adu pahlawan, bisa 2 pemain!', cat:'main', lvl:2, badge:'BARU!', badgeCol:'#e8402a',
    c1:'#ffb703', c2:'#c1121f', prev:'duel' },

  { id:'susun-menara', href:'susun-menara/', title:'Susun Menara',
    desc:'Tumpuk balok setinggi mungkin!', cat:'main', lvl:1, badge:'BARU!', badgeCol:'#ca8a04',
    c1:'#facc15', c2:'#713f12', prev:'menara' },

  { id:'gelembung', href:'gelembung/', title:'Tembak Gelembung',
    desc:'Pecahkan gelembung, kejar skor!', cat:'main', lvl:1, badge:'BARU!', badgeCol:'#0284c7',
    c1:'#38bdf8', c2:'#075985', prev:'gelembung' },

  { id:'snake-game', href:'snake-game/', title:'Snake Arena',
    desc:'Makan ular lain, pilih skin naga!', cat:'main', lvl:2,
    c1:'#10b981', c2:'#065f46', prev:'snake' },

  { id:'war-race', href:'war-race/', title:'Zombie Survival',
    desc:'Tembak zombie, lawan bos!', cat:'main', lvl:3,
    c1:'#ef4444', c2:'#7f1d1d', prev:'zombie' },

  { id:'dino-run', href:'dino-run/', title:'Dino Run',
    desc:'Lompat ala Mario, kumpulin koin!', cat:'main', lvl:1,
    c1:'#8b5cf6', c2:'#3b0764', prev:'dino' },

  { id:'tetris', href:'tetris/', title:'Neon Tetris',
    desc:'Susun balok, hapus baris, combo!', cat:'main', lvl:2,
    c1:'#06b6d4', c2:'#0e4d5e', prev:'tetris' },

  { id:'suika', href:'suika/', title:'Suika Fruit',
    desc:'Jatuhkan buah, gabungkan yang sama!', cat:'main', lvl:1,
    c1:'#f59e0b', c2:'#92400e', prev:'suika' },

  { id:'hole-io', href:'hole-io/', title:'Hole.io',
    desc:'Lobang rakus, makan seisi kota!', cat:'main', lvl:1,
    c1:'#14b8a6', c2:'#064e3b', prev:'hole' },

  { id:'belajar-pola', href:'belajar-pola/', title:'Pola Warna',
    desc:'Tebak lanjutan polanya!', cat:'belajar', lvl:1, badge:'BARU!', badgeCol:'#7c3aed',
    c1:'#a78bfa', c2:'#5b21b6', prev:'pola' },

  { id:'belajar-bentuk', href:'belajar-bentuk/', title:'Tebak Bentuk',
    desc:'Kenali lingkaran, segitiga, bintang!', cat:'belajar', lvl:1, badge:'BARU!', badgeCol:'#1d4ed8',
    c1:'#60a5fa', c2:'#1e40af', prev:'bentuk' },

  { id:'belajar-pasangan', href:'belajar-pasangan/', title:'Cari Pasangan',
    desc:'Buka kartu, cari gambar yang sama!', cat:'belajar', lvl:1, badge:'BARU!', badgeCol:'#be185d',
    c1:'#f472b6', c2:'#9d174d', prev:'pasangan' },

  { id:'mewarnai', href:'mewarnai/', title:'Mewarnai Gambar',
    desc:'Warnai kucing, ikan, bunga, mobil!', cat:'belajar', lvl:1, badge:'BARU!', badgeCol:'#b45309',
    c1:'#fbbf24', c2:'#b45309', prev:'mewarnai' },

  { id:'belajar-huruf', href:'belajar-huruf/', title:'Isi Huruf',
    desc:'Tebak huruf yang hilang!', cat:'belajar', lvl:1,
    c1:'#ff6d00', c2:'#e65100', prev:'huruf' },

  { id:'belajar-angka', href:'belajar-angka/', title:'Hitung Angka',
    desc:'Hitung buahnya, pilih angkanya!', cat:'belajar', lvl:1,
    c1:'#43a047', c2:'#1b5e20', prev:'angka' },

  { id:'belajar-warna', href:'belajar-warna/', title:'Tebak Warna',
    desc:'Lihat warnanya, pilih namanya!', cat:'belajar', lvl:1,
    c1:'#e91e63', c2:'#880e4f', prev:'warna' },
];

/* ============================================================
   Alat gambar kecil
   ============================================================ */
const TAU = Math.PI * 2;
function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function starPath(c, cx, cy, R, n, inner) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / n;
    const r = i % 2 ? R * (inner || .42) : R;
    c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
}
/* petarung chibi sederhana untuk pratinjau duel */
function chibi(c, x, baseY, col, acc, dir, scale) {
  const s = scale || 1;
  c.save(); c.translate(x, baseY); c.scale(dir * s, s);
  c.lineCap = 'round';
  // kaki
  c.strokeStyle = col; c.lineWidth = 9;
  c.beginPath(); c.moveTo(-5, -22); c.lineTo(-7, 0); c.moveTo(5, -22); c.lineTo(8, 0); c.stroke();
  // badan
  c.fillStyle = col;
  rr(c, -14, -56, 28, 36, 12); c.fill();
  c.fillStyle = acc;
  rr(c, -14, -30, 28, 9, 4); c.fill();
  // lengan
  c.strokeStyle = col; c.lineWidth = 8;
  c.beginPath(); c.moveTo(-12, -50); c.lineTo(-20, -34); c.moveTo(12, -50); c.lineTo(22, -40); c.stroke();
  // kepala
  c.fillStyle = '#f0c9a0';
  c.beginPath(); c.arc(0, -74, 17, 0, TAU); c.fill();
  c.fillStyle = acc;
  c.beginPath();
  c.moveTo(-17, -80); c.lineTo(-9, -100); c.lineTo(0, -84); c.lineTo(9, -100); c.lineTo(17, -80);
  c.closePath(); c.fill();
  // mata
  c.fillStyle = '#2b1a3e';
  c.beginPath(); c.arc(5, -76, 2.6, 0, TAU); c.arc(-2, -76, 2.2, 0, TAU); c.fill();
  c.restore();
}

/* gambar satu bentuk pada kotak (x,y,ukuran s) */
function drawSh(c, shape, color, x, y, s) {
  const cx = x + s / 2, cy = y + s / 2, r = s / 2, k = s * 0.16;
  c.fillStyle = color;
  if (shape === 'circle') { c.beginPath(); c.arc(cx, cy, r * 0.94, 0, TAU); }
  else if (shape === 'square') {
    c.beginPath();
    if (c.roundRect) c.roundRect(x, y, s, s, k); else c.rect(x, y, s, s);
  }
  else if (shape === 'triangle') { c.beginPath(); c.moveTo(cx, y); c.lineTo(x + s, y + s); c.lineTo(x, y + s); c.closePath(); }
  else if (shape === 'star') { starPath(c, cx, cy, r, 5); }
  else if (shape === 'diamond') { c.beginPath(); c.moveTo(cx, y); c.lineTo(x + s, cy); c.lineTo(cx, y + s); c.lineTo(x, cy); c.closePath(); }
  else { c.beginPath(); c.arc(cx, cy, r * 0.94, 0, TAU); }
  c.fill();
}

/* ============================================================
   Pratinjau tiap game — (c, w, h, t)
   ============================================================ */
const PREVIEWS = {

  /* ---- Pahlawan Nusantara: dua petarung benturan ---- */
  duel(c, w, h, t) {
    const k = (t % 3.4) / 3.4;
    const app = Math.min(1, k * 3.0);
    const clash = k > .38;
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b1a5e'); g.addColorStop(.55, '#8a3f6e');
    g.addColorStop(.8, '#e8763a'); g.addColorStop(1, '#f7c26b');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,240,200,.85)';
    c.beginPath(); c.arc(w * .74, h * .58, h * .13, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,220,160,.22)';
    c.beginPath(); c.arc(w * .74, h * .58, h * .26, 0, TAU); c.fill();
    // stupa
    c.fillStyle = 'rgba(70,45,88,.72)';
    for (let i = 0; i < 6; i++) {
      const x = w * (.06 + i * .18);
      c.beginPath();
      c.moveTo(x - h * .06, h * .84);
      c.quadraticCurveTo(x - h * .05, h * .66, x, h * .63);
      c.quadraticCurveTo(x + h * .05, h * .66, x + h * .06, h * .84);
      c.closePath(); c.fill();
    }
    c.fillStyle = '#6b5a4a'; c.fillRect(0, h * .84, w, h * .16);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, h * .84, w, 3);
    // petarung
    const blink = clash && Math.floor(t * 18) % 2 ? .45 : 1;
    c.globalAlpha = blink;
    chibi(c, w * .30 + app * h * .09, h * .86, '#2f6fd0', '#f2c14e', 1, h / 250);
    chibi(c, w * .70 - app * h * .09, h * .86, '#e8503a', '#fff3d6', -1, h / 250);
    c.globalAlpha = 1;
    // kilat
    if (clash) {
      const s = Math.min(1, (k - .38) * 5);
      c.fillStyle = `rgba(255,246,190,${Math.max(0, 1 - s)})`;
      starPath(c, (w * .30 + w * .70) / 2, h * .60, h * (.12 + s * .28), 8);
      c.fill();
    }
  },

  /* ---- Snake Arena ---- */
  snake(c, w, h, t) {
    c.fillStyle = '#04231c'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(16,185,129,.18)'; c.lineWidth = 1;
    const gs = h / 7;
    for (let x = 0; x <= w; x += gs) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    for (let y = 0; y <= h; y += gs) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    // apel
    const ax = w * .70, ay = h * .34;
    c.fillStyle = '#ff4d4d';
    c.beginPath(); c.arc(ax, ay, h * .07, 0, TAU); c.fill();
    c.strokeStyle = '#2ecc71'; c.lineWidth = 2.5;
    c.beginPath(); c.moveTo(ax, ay - h * .07); c.lineTo(ax + 4, ay - h * .13); c.stroke();
    // ular
    const n = 9, sp = t * 1.5;
    for (let i = n - 1; i >= 0; i--) {
      const a = sp - i * .32;
      const x = w * .42 + Math.cos(a) * w * .20;
      const y = h * .5 + Math.sin(a * 1.4) * h * .22;
      const r = h * (.085 - i * .0035);
      c.fillStyle = i === 0 ? '#7dffb0' : `hsl(150,72%,${44 - i * 2}%)`;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      if (i === 0) {
        c.fillStyle = '#04231c';
        c.beginPath(); c.arc(x + r * .3, y - r * .25, r * .22, 0, TAU);
        c.arc(x - r * .35, y - r * .25, r * .19, 0, TAU); c.fill();
      }
    }
  },

  /* ---- Zombie Survival (tampak atas) ---- */
  zombie(c, w, h, t) {
    c.fillStyle = '#1a1420'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.05)';
    for (let i = 0; i < 26; i++) {
      const x = (i * 97) % w, y = (i * 53) % h;
      c.fillRect(x, y, 2, 2);
    }
    // zombie mendekat
    for (let i = 0; i < 5; i++) {
      const k = ((t * .22 + i * .21) % 1);
      const x = w * (.12 + i * .19) + Math.sin(t * 1.2 + i) * 9;
      const y = h * .1 + k * h * .62;
      const s = .7 + k * .5;
      c.fillStyle = i % 2 ? '#5fa855' : '#79c46a';
      c.beginPath(); c.arc(x, y, 9 * s, 0, TAU); c.fill();
      c.strokeStyle = i % 2 ? '#5fa855' : '#79c46a'; c.lineWidth = 4 * s; c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - 8 * s, y);
      c.lineTo(x - 15 * s, y - 7 * s);
      c.moveTo(x + 8 * s, y);
      c.lineTo(x + 15 * s, y - 7 * s);
      c.stroke();
      c.fillStyle = '#c0392b';
      c.beginPath(); c.arc(x - 3 * s, y - 2 * s, 1.6 * s, 0, TAU);
      c.arc(x + 3 * s, y - 2 * s, 1.6 * s, 0, TAU); c.fill();
    }
    // penembak di bawah
    const sy = h * .88;
    c.fillStyle = '#3f7fd8';
    c.beginPath(); c.arc(w * .5, sy, h * .10, 0, TAU); c.fill();
    c.fillStyle = '#e8c9a0';
    c.beginPath(); c.arc(w * .5, sy, h * .065, 0, TAU); c.fill();
    c.strokeStyle = '#8fa8c8'; c.lineWidth = h * .035; c.lineCap = 'round';
    c.beginPath(); c.moveTo(w * .5, sy - h * .05); c.lineTo(w * .5, sy - h * .20); c.stroke();
    // kilatan moncong
    if ((t * 3) % 1 < .18) {
      c.fillStyle = 'rgba(255,230,140,.95)';
      starPath(c, w * .5, sy - h * .22, h * .10, 6);
      c.fill();
    }
    // lingkaran bidik
    c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 2;
    c.beginPath(); c.arc(w * .5, sy, h * .30, 0, TAU); c.stroke();
  },

  /* ---- Dino Run ---- */
  dino(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3b0764'); g.addColorStop(1, '#8b5cf6');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.16)';
    c.beginPath(); c.arc(w * .78, h * .26, h * .10, 0, TAU); c.fill();
    // bukit
    c.fillStyle = 'rgba(35,8,70,.5)';
    for (let i = 0; i < 4; i++) {
      const x = ((i * w * .35 - t * 26) % (w + 120) + w + 120) % (w + 120) - 60;
      c.beginPath();
      c.moveTo(x - 70, h * .74); c.quadraticCurveTo(x, h * .40, x + 70, h * .74);
      c.closePath(); c.fill();
    }
    // tanah
    c.fillStyle = '#2a0b52'; c.fillRect(0, h * .74, w, h * .26);
    c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(0, h * .74, w, 3);
    // kaktus
    for (let i = 0; i < 3; i++) {
      const x = ((i * w * .42 - t * 90) % (w + 90) + w + 90) % (w + 90) - 45;
      const ch = h * .22, cy = h * .74;
      c.fillStyle = '#2ecc71';
      rr(c, x - 6, cy - ch, 12, ch, 5); c.fill();
      rr(c, x - 16, cy - ch * .7, 9, ch * .34, 4); c.fill();
      rr(c, x + 7, cy - ch * .85, 9, ch * .40, 4); c.fill();
    }
    // dino (satu siluet: ekor - punggung - leher - kepala - dada)
    const jump = Math.max(0, Math.sin(t * 2.2)) * h * .30;
    const by = h * .74 - jump, s = h / 250, bx = w * .22;
    const legPh = Math.sin(t * 11) * 6 * s;
    c.fillStyle = '#7dffb0';
    c.beginPath();
    c.moveTo(bx - 44 * s, by - 24 * s);
    c.quadraticCurveTo(bx - 30 * s, by - 48 * s, bx - 8 * s, by - 48 * s);
    c.quadraticCurveTo(bx + 6 * s, by - 48 * s, bx + 10 * s, by - 64 * s);
    c.quadraticCurveTo(bx + 14 * s, by - 78 * s, bx + 28 * s, by - 78 * s);
    c.quadraticCurveTo(bx + 46 * s, by - 78 * s, bx + 46 * s, by - 66 * s);
    c.quadraticCurveTo(bx + 46 * s, by - 56 * s, bx + 30 * s, by - 56 * s);
    c.quadraticCurveTo(bx + 28 * s, by - 42 * s, bx + 22 * s, by - 30 * s);
    c.quadraticCurveTo(bx + 6 * s, by - 22 * s, bx - 12 * s, by - 24 * s);
    c.quadraticCurveTo(bx - 28 * s, by - 26 * s, bx - 44 * s, by - 24 * s);
    c.closePath(); c.fill();
    // kaki
    c.strokeStyle = '#7dffb0'; c.lineWidth = 9 * s; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx - 6 * s, by - 24 * s); c.lineTo(bx - 6 * s - legPh, by);
    c.moveTo(bx + 12 * s, by - 24 * s); c.lineTo(bx + 12 * s + legPh, by);
    c.stroke();
    // lengan kecil
    c.lineWidth = 6 * s;
    c.beginPath(); c.moveTo(bx + 20 * s, by - 44 * s); c.lineTo(bx + 30 * s, by - 36 * s); c.stroke();
    // mata + senyum + lubang hidung
    c.fillStyle = '#04231c';
    c.beginPath(); c.arc(bx + 34 * s, by - 70 * s, 4.5 * s, 0, TAU); c.fill();
    c.beginPath(); c.arc(bx + 43 * s, by - 70 * s, 1.8 * s, 0, TAU); c.fill();
    c.strokeStyle = '#04231c'; c.lineWidth = 2.5 * s;
    c.beginPath();
    c.moveTo(bx + 28 * s, by - 62 * s);
    c.quadraticCurveTo(bx + 36 * s, by - 58 * s, bx + 44 * s, by - 63 * s);
    c.stroke();
    // koin berputar
    const coins = [[.52, .30], [.72, .20]];
    coins.forEach(([fx, fy], i) => {
      const x = ((fx * w - t * 90) % (w + 40) + w + 40) % (w + 40) - 20;
      const y = h * fy + Math.sin(t * 4 + i) * 5;
      const wob = Math.abs(Math.cos(t * 4 + i));
      c.fillStyle = '#b8801a';
      c.beginPath(); c.ellipse(x, y, h * .055 * wob + 1.5, h * .055, 0, 0, TAU); c.fill();
      c.fillStyle = '#ffd166';
      c.beginPath(); c.ellipse(x, y, h * .042 * wob + 1, h * .042, 0, 0, TAU); c.fill();
    });
  },

  /* ---- Neon Tetris ---- */
  tetris(c, w, h, t) {
    c.fillStyle = '#061b22'; c.fillRect(0, 0, w, h);
    const cols = 7, rows = 8;
    const cw = w / (cols + 2), ch = h / rows;
    const ox = cw;
    c.strokeStyle = 'rgba(6,182,212,.25)'; c.lineWidth = 1;
    for (let i = 0; i <= cols; i++) { c.beginPath(); c.moveTo(ox + i * cw, 0); c.lineTo(ox + i * cw, h); c.stroke(); }
    for (let j = 0; j <= rows; j++) { c.beginPath(); c.moveTo(ox, j * ch); c.lineTo(ox + cols * cw, j * ch); c.stroke(); }
    const COL = ['#06b6d4', '#f472b6', '#a78bfa', '#facc15'];
    // tumpukan bawah
    const stack = [[0, 4], [1, 4], [2, 4], [4, 4], [6, 4], [1, 5], [2, 5], [6, 5]];
    stack.forEach(([x, y]) => {
      c.fillStyle = COL[(x + y) % COL.length];
      rr(c, ox + x * cw + 2, y * ch + 2, cw - 4, ch - 4, 3); c.fill();
    });
    // balok jatuh
    const ph = (t * .55) % 1;
    const fy = Math.floor(ph * 4);
    [[3, fy], [4, fy], [5, fy], [5, fy + 1]].forEach(([x, y]) => {
      c.fillStyle = '#facc15';
      c.shadowColor = '#facc15'; c.shadowBlur = 12;
      rr(c, ox + x * cw + 2, y * ch + 2, cw - 4, ch - 4, 3); c.fill();
      c.shadowBlur = 0;
    });
    // baris bawah berkilat lalu hilang
    const blink = (t % 3) > 2.4;
    if (blink) {
      c.fillStyle = `rgba(255,255,255,${Math.abs(Math.sin(t * 16)) * .65})`;
      rr(c, ox + 2, 4 * ch + 2, cols * cw - 4, ch - 4, 3); c.fill();
    }
  },

  /* ---- Suika Fruit ---- */
  suika(c, w, h, t) {
    c.fillStyle = '#3a2508'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(w * .18, 0, w * .64, h);
    c.strokeStyle = 'rgba(255,209,102,.35)'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(w * .18, 0); c.lineTo(w * .18, h);
    c.moveTo(w * .82, 0); c.lineTo(w * .82, h); c.stroke();
    // buah menumpuk
    const fruits = [
      [.36, .94, .085, '#e74c3c'], [.52, .94, .085, '#e74c3c'],
      [.44, .80, .10, '#f39c12'], [.64, .94, .085, '#e74c3c'],
      [.55, .66, .115, '#8e44ad'],
    ];
    fruits.forEach(([fx, fy, fr, col]) => {
      c.fillStyle = col;
      c.beginPath(); c.arc(w * fx, h * fy, h * fr, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.28)';
      c.beginPath(); c.arc(w * fx - h * fr * .3, h * fy - h * fr * .3, h * fr * .22, 0, TAU); c.fill();
    });
    // buah baru jatuh
    const k = (t * .5) % 1;
    const dropY = h * .06 + k * h * .42;
    c.fillStyle = '#e74c3c';
    c.beginPath(); c.arc(w * .44, dropY, h * .085, 0, TAU); c.fill();
    // gabung: kilat saat menempel
    if (k > .8) {
      const s = (k - .8) * 5;
      c.strokeStyle = `rgba(255,246,190,${1 - s})`; c.lineWidth = 4;
      c.beginPath(); c.arc(w * .44, h * .66, h * (.10 + s * .22), 0, TAU); c.stroke();
    }
  },

  /* ---- Hole.io ---- */
  hole(c, w, h, t) {
    c.fillStyle = '#0b3b32'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(20,184,166,.22)'; c.fillRect(0, 0, w, h);
    const bx = w * .5 + Math.sin(t * .9) * w * .26;
    const by = h * .55 + Math.cos(t * .7) * h * .16;
    // gedung-gedung mengecil ke arah lobang
    const builds = [
      [.16, .28, .055, .16], [.34, .20, .07, .20], [.62, .30, .06, .14],
      [.80, .22, .075, .22], [.24, .74, .065, .18], [.70, .72, .07, .20],
    ];
    builds.forEach(([fx, fy, bw, bh], i) => {
      const x = w * fx, y = h * fy;
      const d = Math.hypot(x - bx, y - by) / w;
      const shrink = Math.max(0, 1 - d * 1.7);
      const s = .35 + shrink * .65;
      const alpha = .30 + shrink * .70;
      c.globalAlpha = alpha;
      c.fillStyle = '#7de3d0';
      rr(c, x - w * bw * s / 2, y - h * bh * s, w * bw * s, h * bh * s, 4); c.fill();
      c.fillStyle = 'rgba(255,255,255,.55)';
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
        c.globalAlpha = alpha * .7;
        c.fillRect(x - w * bw * s / 2 + w * bw * s * (.18 + a * .28),
                   y - h * bh * s + h * bh * s * (.14 + b * .28),
                   w * bw * s * .16, h * bh * s * .14);
      }
      c.globalAlpha = 1;
    });
    // lobang
    const r = h * (.10 + Math.sin(t * 1.6) * .012);
    const g = c.createRadialGradient(bx, by, r * .2, bx, by, r * 1.9);
    g.addColorStop(0, '#000'); g.addColorStop(.55, '#04140f'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.beginPath(); c.arc(bx, by, r * 1.9, 0, TAU); c.fill();
    c.fillStyle = '#000';
    c.beginPath(); c.arc(bx, by, r, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(125,227,208,.5)'; c.lineWidth = 3;
    c.beginPath(); c.arc(bx, by, r, 0, TAU); c.stroke();
  },

  /* ---- Isi Huruf ---- */
  huruf(c, w, h, t) {
    c.fillStyle = '#4a1a00'; c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,109,0,.35)'); g.addColorStop(1, 'rgba(230,81,0,.15)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const word = ['K', 'I', 'Y', '?', 'A'];
    const tw = w * .105, gap = w * .035;
    const total = word.length * tw + (word.length - 1) * gap;
    let x = (w - total) / 2;
    const fill = ['#fff3d6', '#ffd166', '#fff3d6', null, '#fff3d6'];
    word.forEach((ch, i) => {
      const bob = Math.sin(t * 2.4 + i * .5) * h * .035;
      const y = h * .30 + bob;
      const isQ = ch === '?';
      const glow = isQ ? .5 + Math.abs(Math.sin(t * 2.2)) * .5 : 1;
      c.globalAlpha = glow;
      c.fillStyle = isQ ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.13)';
      rr(c, x, y, tw, h * .38, 12); c.fill();
      c.strokeStyle = isQ ? '#ffd166' : 'rgba(255,243,214,.6)';
      c.lineWidth = isQ ? 4 : 2.5;
      rr(c, x, y, tw, h * .38, 12); c.stroke();
      c.globalAlpha = 1;
      c.fillStyle = isQ ? '#ffd166' : fill[i];
      c.font = `800 ${Math.round(h * .26)}px 'Baloo 2', Nunito, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(ch, x + tw / 2, y + h * .195);
      x += tw + gap;
    });
    // tanda centang muncul
    if ((t % 3) > 1.9) {
      c.strokeStyle = '#4ade80'; c.lineWidth = 8; c.lineCap = 'round';
      const k = Math.min(1, ((t % 3) - 1.9) * 4);
      c.beginPath();
      c.moveTo(w * .42, h * .84);
      c.lineTo(w * .42 + w * .05 * k, h * .84 + h * .05 * k);
      if (k > .5) c.lineTo(w * .42 + w * .15 * k, h * .84 - h * .09 * k);
      c.stroke();
    }
  },

  /* ---- Hitung Angka ---- */
  angka(c, w, h, t) {
    c.fillStyle = '#0e2b10'; c.fillRect(0, 0, w, h);
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(67,160,71,.5)'); g.addColorStop(1, 'rgba(27,94,32,.35)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // tiga buah muncul satu per satu
    const n = Math.min(3, Math.floor((t % 3.6) / .55) + 1);
    for (let i = 0; i < n; i++) {
      const k = Math.min(1, ((t % 3.6) - i * .55) * 5);
      const s = .6 + k * .4;
      const x = w * (.24 + i * .26), y = h * .44;
      c.save(); c.translate(x, y); c.scale(s, s);
      c.fillStyle = '#e74c3c';
      c.beginPath(); c.arc(0, 0, h * .11, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,.3)';
      c.beginPath(); c.arc(-h * .035, -h * .035, h * .028, 0, TAU); c.fill();
      c.strokeStyle = '#7dffb0'; c.lineWidth = 4; c.lineCap = 'round';
      c.beginPath(); c.moveTo(0, -h * .11); c.lineTo(h * .03, -h * .17); c.stroke();
      c.restore();
      // angka
      c.fillStyle = 'rgba(255,255,255,.9)';
      c.font = `800 ${Math.round(h * .13)}px 'Baloo 2', Nunito, sans-serif`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(String(i + 1), x, h * .72);
    }
    // pilihan jawaban
    const sel = Math.floor(t / 1.2) % 3;
    for (let i = 0; i < 3; i++) {
      const bw = w * .16, bh = h * .17;
      const x = w * .5 + (i - 1) * (bw + w * .05) - bw / 2;
      const on = i === sel;
      c.fillStyle = on ? '#ffd166' : 'rgba(255,255,255,.16)';
      rr(c, x, h * .78, bw, bh, 10); c.fill();
      c.fillStyle = on ? '#1b5e20' : 'rgba(255,255,255,.8)';
      c.font = `800 ${Math.round(h * .11)}px 'Baloo 2', Nunito, sans-serif`;
      c.fillText(String(i + 1), x + bw / 2, h * .78 + bh / 2);
    }
  },

  /* ---- Tebak Warna ---- */
  warna(c, w, h, t) {
    c.fillStyle = '#2a0518'; c.fillRect(0, 0, w, h);
    const cols = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71'];
    cols.forEach((col, i) => {
      const k = Math.min(1, ((t % 4) - i * .32) * 3);
      if (k <= 0) return;
      const x = w * (.20 + (i % 2) * .60);
      const y = h * (.32 + Math.floor(i / 2) * .42);
      const r = h * .17 * (.5 + k * .5);
      const g = c.createRadialGradient(x - r * .3, y - r * .3, r * .1, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.35, col); g.addColorStop(1, col);
      c.globalAlpha = k;
      c.fillStyle = g;
      c.beginPath();
      c.arc(x, y, r, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    });
    // kuas menggores
    const sx = w * .18, ex = w * .82;
    const px = sx + (ex - sx) * ((t * .5) % 1);
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, h * .90); c.lineTo(px, h * .90); c.stroke();
    c.fillStyle = '#ff9ff3';
    c.beginPath(); c.arc(px, h * .90, 9, 0, TAU); c.fill();
  },

  /* ---- Pola Warna: deret bentuk dengan tanda tanya ---- */
  pola(c, w, h, t) {
    c.fillStyle = '#2a1a52'; c.fillRect(0, 0, w, h);
    const SH = ['circle', 'square', 'triangle', 'star'];
    const CL = ['#f472b6', '#60a5fa', '#facc15', '#34d399'];
    const n = 6;
    const k = (t % 3.2) / 3.2;
    const revealed = k > 0.60;
    const size = Math.min(h * 0.21, w / 9);
    const gap = size * 0.36;
    let x = (w - (n * size + (n - 1) * gap)) / 2;
    const y = h * 0.40;
    for (let i = 0; i < n; i++) {
      const last = i === n - 1;
      if (last && !revealed) {
        c.fillStyle = 'rgba(255,255,255,.14)';
        rr(c, x, y, size, size, size * 0.22); c.fill();
        c.globalAlpha = 0.45 + Math.abs(Math.sin(t * 4)) * 0.55;
        c.fillStyle = '#ffd166';
        c.font = `800 ${Math.round(size * 0.72)}px 'Baloo 2', Nunito, sans-serif`;
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('?', x + size / 2, y + size / 2);
        c.globalAlpha = 1;
      } else {
        const pop = last ? Math.min(1, (k - 0.60) * 5) : 1;
        const s = size * (last ? 1 + (1 - pop) * 0.5 : 1);
        const sh = SH[i % 4], col = CL[i % 4];
        drawSh(c, sh, col, x + (size - s) / 2, y + (size - s) / 2, s);
      }
      x += size + gap;
    }
  },

  /* ---- Tebak Bentuk: satu bentuk besar berganti-ganti ---- */
  bentuk(c, w, h, t) {
    c.fillStyle = '#062b3f'; c.fillRect(0, 0, w, h);
    const S = [['circle', 'LINGKARAN', '#f87171'], ['triangle', 'SEGITIGA', '#facc15'],
               ['star', 'BINTANG', '#fbbf24'], ['square', 'PERSEGI', '#60a5fa']];
    const i = Math.floor(t / 1.15) % S.length;
    const en = S[i], k = (t % 1.15) / 1.15;
    const pop = Math.min(1, k * 4);
    const size = Math.min(h * 0.44, w * 0.30);
    const cx = w / 2, cy = h * 0.42;
    c.save();
    c.translate(cx, cy);
    c.scale(0.55 + pop * 0.45, 0.55 + pop * 0.45);
    c.rotate((1 - k) * 0.25);
    drawSh(c, en[0], en[2], -size / 2, -size / 2, size);
    c.restore();
    c.globalAlpha = pop;
    c.fillStyle = '#fff';
    c.font = `800 ${Math.round(h * 0.105)}px 'Baloo 2', Nunito, sans-serif`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(en[1], cx, h * 0.80);
    c.globalAlpha = 1;
  },

  /* ---- Cari Pasangan: kartu dibalik berpasangan ---- */
  pasangan(c, w, h, t) {
    c.fillStyle = '#3d1440'; c.fillRect(0, 0, w, h);
    const cols = 3, rows = 3, pad = w * 0.09;
    const cw = (w - pad * 2) / cols, ch = (h - pad * 2) / rows;
    const size = Math.min(cw, ch) * 0.84;
    const emo = ['🐶', '🐱', '🐰', '🐶', '🦁', '🐱', '🐸', '🐼', '🐝'];
    const k = (t % 4.2) / 4.2;
    for (let r = 0; r < rows; r++) {
      for (let q = 0; q < cols; q++) {
        const i = r * cols + q;
        const x = pad + q * cw + (cw - size) / 2;
        const y = pad + r * ch + (ch - size) / 2;
        let open = false, glow = false;
        if ((i === 0 || i === 3) && k > 0.10 && k < 0.55) { open = true; glow = true; }
        if ((i === 1 || i === 5) && k > 0.66) { open = true; }
        if (i === 4) open = true;
        c.fillStyle = open ? (glow ? '#d6ffe8' : '#fff4e0') : '#8b3fa0';
        rr(c, x, y, size, size, size * 0.2); c.fill();
        c.strokeStyle = glow ? '#4ade80' : 'rgba(255,255,255,.25)';
        c.lineWidth = glow ? 3.5 : 2; c.stroke();
        c.textAlign = 'center'; c.textBaseline = 'middle';
        if (open) {
          c.font = `${Math.round(size * 0.52)}px serif`;
          c.fillStyle = '#3d1440';
          c.fillText(emo[i], x + size / 2, y + size / 2 + 1);
        } else {
          c.fillStyle = 'rgba(255,255,255,.42)';
          c.font = `800 ${Math.round(size * 0.42)}px 'Baloo 2', Nunito, sans-serif`;
          c.fillText('?', x + size / 2, y + size / 2);
        }
      }
    }
  },

  /* ---- Mewarnai: kelopak bunga terisi satu per satu ---- */
  mewarnai(c, w, h, t) {
    c.fillStyle = '#fffdf7'; c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h * 0.44, R = Math.min(w, h) * 0.30;
    const cols = ['#f472b6', '#60a5fa', '#facc15', '#34d399', '#fb923c'];
    const k = (t % 4.2) / 4.2;
    // batang
    c.strokeStyle = '#22c55e'; c.lineWidth = 6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(cx, cy + R * 0.8); c.lineTo(cx, h * 0.94); c.stroke();
    // kelopak
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * TAU / 5;
      const px = cx + Math.cos(a) * R * 0.62, py = cy + Math.sin(a) * R * 0.62;
      const filled = k > (i + 1) * 0.14;
      c.beginPath(); c.arc(px, py, R * 0.44, 0, TAU);
      c.fillStyle = filled ? cols[i] : '#ffffff';
      c.fill();
      c.strokeStyle = '#3a2a4a'; c.lineWidth = 3.2; c.stroke();
    }
    // tengah
    c.beginPath(); c.arc(cx, cy, R * 0.34, 0, TAU);
    c.fillStyle = k > 0.78 ? '#fbbf24' : '#ffffff'; c.fill();
    c.strokeStyle = '#3a2a4a'; c.lineWidth = 3.2; c.stroke();
    // kuas
    const bx = w * 0.14, by = h * 0.87, wob = Math.sin(t * 5) * 3;
    c.fillStyle = '#8b5e3c'; c.fillRect(bx - 3, by + wob - 26, 6, 18);
    c.fillStyle = '#c084fc';
    c.beginPath(); c.arc(bx, by + wob, 9, 0, TAU); c.fill();
  },

  /* ---- Susun Menara: balok bertumpuk makin tinggi ---- */
  menara(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1b2f6b'); g.addColorStop(1, '#5a3a8a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const P = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7'];
    const bw = w * 0.40, bh = h * 0.115, base = h * 0.92;
    const k = (t % 4) / 4;
    const n = Math.min(6, Math.floor(k * 7) + 1);
    for (let i = 0; i < n; i++) {
      const y = base - i * bh;
      const off = (i === n - 1) ? Math.sin(t * 3.2) * w * 0.15 : 0;
      const x = w / 2 - bw / 2 + off;
      c.fillStyle = 'rgba(0,0,0,.25)';
      rr(c, x + 2, y - bh + 3, bw, bh - 3, 7); c.fill();
      c.fillStyle = P[i % P.length];
      rr(c, x, y - bh, bw, bh - 3, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.3)';
      rr(c, x + 5, y - bh + 4, bw - 10, 4, 2); c.fill();
    }
    if (k > 0.90) {
      c.fillStyle = `rgba(255,220,120,${(1 - k) * 6})`;
      c.fillRect(0, 0, w, h);
    }
  },

  /* ---- Tembak Gelembung: gelembung naik lalu pecah ---- */
  gelembung(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0e5f8f'); g.addColorStop(.6, '#0a3f66'); g.addColorStop(1, '#052034');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    // sinar cahaya
    c.globalAlpha = .09; c.fillStyle = '#bff0ff';
    for (let i = 0; i < 4; i++) {
      const x = w * (0.15 + i * 0.24) + Math.sin(t * 0.5 + i) * 8;
      c.beginPath();
      c.moveTo(x - 14, 0); c.lineTo(x + 14, 0); c.lineTo(x + 46, h); c.lineTo(x - 12, h);
      c.closePath(); c.fill();
    }
    c.globalAlpha = 1;
    for (let i = 0; i < 5; i++) {
      const k = ((t * (0.30 + i * 0.05)) + i * 0.37) % 1;
      const x = w * (0.13 + i * 0.19) + Math.sin(t * 1.4 + i) * 12;
      const y = h * 0.99 - k * h * 0.94;
      const r = h * (0.078 + (i % 3) * 0.022);
      const bintang = i === 2;
      if (k > 0.86) {                       // pecah
        const s = (k - 0.86) / 0.14;
        c.strokeStyle = `rgba(255,255,255,${Math.max(0, 1 - s)})`;
        c.lineWidth = 3 * (1 - s) + 1;
        c.beginPath(); c.arc(x, y, r * (1 + s * 1.4), 0, TAU); c.stroke();
      } else {
        const gr = c.createRadialGradient(x - r * .34, y - r * .34, r * .1, x, y, r);
        if (bintang) { gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,190,60,.62)'); }
        else { gr.addColorStop(0, 'rgba(255,255,255,.72)'); gr.addColorStop(1, 'rgba(125,211,252,.22)'); }
        c.fillStyle = gr;
        c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.strokeStyle = bintang ? 'rgba(255,240,180,.9)' : 'rgba(255,255,255,.5)';
        c.lineWidth = 2; c.stroke();
        c.fillStyle = 'rgba(255,255,255,.85)';
        c.beginPath(); c.ellipse(x - r * .32, y - r * .36, r * .16, r * .1, -0.6, 0, TAU); c.fill();
      }
    }
  },
};

/* ============================================================
   Suara (disintesis, tanpa file)
   ============================================================ */
const Sfx = (() => {
  let ac = null, on = true;
  const ready = () => {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ac = new AC();
    }
    if (ac.state === 'suspended') ac.resume();
    return true;
  };
  function note(freq, dur, vol, type) {
    if (!on) return;
    if (!ready()) return;
    const t0 = ac.currentTime;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  return {
    unlock: ready,
    tap() { note(880, .16, .22, 'triangle'); note(1320, .10, .09, 'sine'); },
    pick() { note(660, .22, .2, 'triangle'); },
    go() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => note(f, .22, .2, 'triangle'), i * 70)); },
    roll() { note(300 + Math.random() * 500, .06, .12, 'square'); },
    setOn(v) { on = v; },
    isOn: () => on,
  };
})();

/* ============================================================
   Riwayat main (localStorage)
   ============================================================ */
const STORE = 'dkz.plays.v1';
function loadPlays() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; }
}
function bumpPlay(id) {
  const p = loadPlays();
  p[id] = (p[id] || 0) + 1;
  try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) {}
}

/* ============================================================
   Membangun kartu
   ============================================================ */
const grid = document.getElementById('grid');
const recentGrid = document.getElementById('recent-grid');
const recentSect = document.getElementById('recent');
const emptyBox = document.getElementById('empty');
let filter = 'semua';
const cards = [];

function makeCard(g, mini) {
  const a = document.createElement('a');
  a.className = 'card' + (mini ? ' mini' : '');
  a.href = g.href;
  a.dataset.id = g.id;
  a.dataset.cat = g.cat;
  a.style.setProperty('--c1', g.c1);
  a.style.setProperty('--c2', g.c2);
  if (g.badge) a.style.setProperty('--badge', g.badgeCol || '#e8402a');

  const th = document.createElement('div');
  th.className = 'thumb';
  const cv = document.createElement('canvas');
  cv.width = 400; cv.height = 250;
  th.appendChild(cv);
  if (g.badge) {
    const b = document.createElement('span');
    b.className = 'badge'; b.textContent = g.badge;
    th.appendChild(b);
  }
  const lv = document.createElement('div');
  lv.className = 'level';
  for (let i = 1; i <= 3; i++) {
    const d = document.createElement('i');
    if (i <= g.lvl) d.className = 'on';
    lv.appendChild(d);
  }
  th.appendChild(lv);
  a.appendChild(th);

  const meta = document.createElement('div');
  meta.className = 'meta';
  const h3 = document.createElement('h3'); h3.textContent = g.title;
  const p = document.createElement('p'); p.textContent = g.desc;
  const pl = document.createElement('div'); pl.className = 'play'; pl.textContent = '▶  MAIN';
  meta.appendChild(h3); meta.appendChild(p); meta.appendChild(pl);
  a.appendChild(meta);

  a.addEventListener('pointerenter', () => Sfx.pick());
  a.addEventListener('click', () => { bumpPlay(g.id); Sfx.go(); });

  a._canvas = cv;
  a._ctx = cv.getContext('2d');
  a._prev = PREVIEWS[g.prev];
  a._phase = Math.random() * 4;
  a._visible = false;
  return a;
}

function build() {
  GAMES.forEach((g, i) => {
    const c = makeCard(g, false);
    c.style.animationDelay = (i * 0.045) + 's';
    grid.appendChild(c);
    c._prev(c._ctx, 400, 250, c._phase);   // gambar sekali di awal
    cards.push(c);
  });
}

function buildRecent() {
  const plays = loadPlays();
  const top = GAMES.filter(g => plays[g.id] > 0)
    .sort((a, b) => (plays[b.id] || 0) - (plays[a.id] || 0))
    .slice(0, 3);
  if (!top.length) { recentSect.classList.add('hide'); return; }
  recentSect.classList.remove('hide');
  recentGrid.innerHTML = '';
  top.forEach(g => {
    const c = makeCard(g, true);
    recentGrid.appendChild(c);
    c._prev(c._ctx, 400, 250, c._phase);   // gambar sekali di awal
  });
}

/* ============================================================
   Saringan kategori
   ============================================================ */
function applyFilter(f) {
  filter = f;
  document.querySelectorAll('.chip').forEach(ch => {
    ch.classList.toggle('on', ch.dataset.f === f);
  });
  let shown = 0;
  cards.forEach(c => {
    const ok = f === 'semua' || c.dataset.cat === f;
    c.classList.toggle('hide', !ok);
    if (ok) shown++;
  });
  emptyBox.classList.toggle('hide', shown > 0);
  // animasi masuk ulang
  cards.filter(c => !c.classList.contains('hide')).forEach((c, i) => {
    c.style.animation = 'none';
    void c.offsetWidth;
    c.style.animation = `pop .38s cubic-bezier(.34,1.56,.64,1) ${i * 0.03}s backwards`;
  });
}

/* ============================================================
   Gelung pratinjau
   ============================================================ */
let last = 0, acc = 0;
const FRAME = 1 / 30;        // 30 fps cukup untuk pratinjau kecil

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(.2, (now - last) / 1000) || 0;
  last = now;
  if (document.hidden) return;
  acc += dt;
  if (acc < FRAME) return;
  acc = 0;
  const t = now / 1000;
  // Hanya kartu yang terlihat yang digambar ulang; kartu di luar layar
  // menyimpan frame terakhirnya supaya tidak berkedip kosong.
  for (const c of cards) {
    if (!c._visible || c.classList.contains('hide')) continue;
    c._ctx.clearRect(0, 0, 400, 250);
    c._prev(c._ctx, 400, 250, t + c._phase);
  }
  for (const c of recentGrid.children) {
    if (!c._prev || !c._visible) continue;
    c._ctx.clearRect(0, 0, 400, 250);
    c._prev(c._ctx, 400, 250, t + c._phase);
  }
}

/* ============================================================
   Tombol Kejutan
   ============================================================ */
function surprise() {
  const pool = cards.filter(c => !c.classList.contains('hide'));
  if (!pool.length) return;
  const btn = document.getElementById('surprise');
  btn.classList.add('rolling');
  let i = 0, n = 0;
  const roll = setInterval(() => {
    pool.forEach(c => c.style.boxShadow = '');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    pick.style.boxShadow = '0 0 0 4px #ffd166, 0 18px 40px rgba(0,0,0,.5)';
    pick.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    Sfx.roll();
    if (++n > 11) {
      clearInterval(roll);
      btn.classList.remove('rolling');
      Sfx.go();
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      bumpPlay(chosen.dataset.id);
      setTimeout(() => { location.href = chosen.href; }, 260);
    }
    i++;
  }, 95);
}

/* ============================================================
   Nyalakan
   ============================================================ */
function boot() {
  build();
  buildRecent();
  applyFilter('semua');

  // suspensi animasi untuk kartu di luar layar
  const io = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.target._canvas) e.target._visible = e.isIntersecting; });
  }, { rootMargin: '150px' });
  cards.concat(Array.from(recentGrid.children)).forEach(c => io.observe(c));

  document.getElementById('surprise').addEventListener('click', surprise);

  document.querySelectorAll('.chip').forEach(ch => {
    ch.addEventListener('click', () => { Sfx.tap(); applyFilter(ch.dataset.f); });
  });

  // latar bergerak
  const sky = document.getElementById('sky');
  const palette = ['#ffd166', '#4ecdc4', '#ff9ff3', '#a0e7a0', '#ff6b6b'];
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('i');
    const sz = 3 + Math.random() * 7;
    s.style.width = sz + 'px';
    s.style.height = sz + 'px';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.background = palette[i % palette.length];
    s.style.animationDuration = (5 + Math.random() * 7) + 's';
    s.style.animationDelay = (-Math.random() * 8) + 's';
    if (i % 3 === 0) s.classList.add('twinkle');
    sky.appendChild(s);
  }

  // tombol suara
  const sb = document.getElementById('sound-btn');
  sb.addEventListener('click', () => {
    const on = !Sfx.isOn();
    Sfx.setOn(on);
    sb.textContent = on ? '🔊' : '🔇';
    if (on) Sfx.tap();
  });

  // buka kunci audio pada sentuhan pertama
  const kick = () => { Sfx.unlock(); window.removeEventListener('pointerdown', kick); };
  window.addEventListener('pointerdown', kick);

  last = performance.now();
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
})();
