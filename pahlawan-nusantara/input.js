/* ============================================================
   input.js — papan tombol (keyboard 2 pemain) + tombol sentuh.
   Pemain 1 : A D W S + Spasi / I / O / P
   Pemain 2 : panah + 1 / 2 / 3 / 4
   ============================================================ */
(() => {
'use strict';

const KEYS = [
  { left: 'a', right: 'd', up: 'w', down: 's', atk: ' ', s1: 'i', s2: 'o', ult: 'p' },
  { left: 'arrowleft', right: 'arrowright', up: 'arrowup', down: 'arrowdown',
    atk: '1', s1: '2', s2: '3', ult: '4' },
];

const held = new Set();
const justPressed = new Set();
let snapshot = new Set();
const touchHeld = {};
const touchPressed = {};
let isTouch = false;
let touchRoot = null;

/* ---------- keyboard ---------- */
function keyName(e) {
  return (e.key || '').toLowerCase();
}
function onDown(e) {
  const k = keyName(e);
  if (!k) return;
  if (!held.has(k)) justPressed.add(k);
  held.add(k);
  // cegah halaman ikut menggulir saat bermain
  if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
  window.PN.Audio.unlock();
}
function onUp(e) {
  held.delete(keyName(e));
}
function onBlur() { held.clear(); }

/* ---------- tombol sentuh ---------- */
function mkVirtual(name, style) {
  const b = document.createElement('div');
  b.className = 'tbtn' + (style.cls ? ' ' + style.cls : '');
  b.textContent = style.label || '';
  b.style.cssText = style.css + ';touch-action:none;';
  const down = (ev) => {
    ev.preventDefault();
    if (!touchHeld[name]) { touchPressed[name] = true; }
    touchHeld[name] = true;
    b.classList.add('hit');
    window.PN.Audio.unlock();
  };
  const up = (ev) => {
    ev.preventDefault();
    touchHeld[name] = false;
    b.classList.remove('hit');
  };
  b.addEventListener('pointerdown', down);
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('contextmenu', e => e.preventDefault());
  return b;
}

function buildTouch(root) {
  const S = (extra) => `position:absolute;${extra}`;
  const N = 'width:11vmin;height:11vmin;font-size:3.6vmin';
  const B = 'width:15vmin;height:15vmin;font-size:5vmin';
  const parts = [
    mkVirtual('left',  { label: '◀', css: S(`left:3%;bottom:26%;${N}`) }),
    mkVirtual('right', { label: '▶', css: S(`left:17%;bottom:26%;${N}`) }),
    mkVirtual('up',    { label: '▲', css: S(`left:10%;bottom:45%;${N}`) }),
    mkVirtual('down',  { label: '▼', css: S(`left:10%;bottom:7%;${N}`) }),
    mkVirtual('atk',   { label: 'A', css: S(`right:4%;bottom:11%;${B}`), cls: 'hit' }),
    mkVirtual('s1',    { label: '1', css: S(`right:17%;bottom:29%;${N}`), cls: 'skill' }),
    mkVirtual('s2',    { label: '2', css: S(`right:4%;bottom:37%;${N}`), cls: 'skill' }),
    mkVirtual('ult',   { label: '★', css: S(`right:17%;bottom:5%;${N}`), cls: 'ult' }),
  ];
  parts.forEach(p => root.appendChild(p));
}

/* ---------- gabungan ---------- */
function sample(playerIndex, fighterIndex, state) {
  if (isTouch && playerIndex === 0) {
    const inp = {
      mx: (touchHeld.right ? 1 : 0) - (touchHeld.left ? 1 : 0),
      up: !!touchHeld.up, down: !!touchHeld.down,
      atk: !!snapshotTouch('atk'), s1: !!snapshotTouch('s1'),
      s2: !!snapshotTouch('s2'), ult: !!snapshotTouch('ult'),
    };
    return inp;
  }
  const K = KEYS[playerIndex] || KEYS[1];
  return {
    mx: (held.has(K.right) ? 1 : 0) - (held.has(K.left) ? 1 : 0),
    up: held.has(K.up),
    down: held.has(K.down),
    atk: snapshot.has(K.atk),
    s1: snapshot.has(K.s1),
    s2: snapshot.has(K.s2),
    ult: snapshot.has(K.ult),
  };
}

let touchSnap = {};
function snapshotTouch(name) { return touchSnap[name]; }

/* dipanggil sekali per frame gambar, sebelum simulasi */
function beginFrame() {
  snapshot = new Set(justPressed);
  justPressed.clear();
  touchSnap = Object.assign({}, touchPressed);
  for (const k in touchPressed) touchPressed[k] = false;
}

function init(touchRootEl) {
  touchRoot = touchRootEl;
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);

  isTouch = ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            window.matchMedia('(pointer: coarse)').matches;
  if (isTouch && touchRoot) {
    document.body.classList.add('touch-mode');
    buildTouch(touchRoot);
  }
  return isTouch;
}

/* apakah tombol mentah sedang ditekan (dipakai menu untuk Esc / R / H) */
function isDown(k) { return held.has(k); }
function anyPressed(list) { return list.some(k => snapshot.has(k)); }
function consume(k) { snapshot.delete(k); justPressed.delete(k); held.delete(k); }

window.PN = window.PN || {};
window.PN.Input = { init, sample, beginFrame, isDown, anyPressed, consume, isTouch: () => isTouch };
})();
