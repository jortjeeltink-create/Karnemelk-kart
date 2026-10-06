// Alle afbeeldingen worden in de browser getekend (geen externe plaatjes nodig).
import * as THREE from '../../vendor/three.module.min.js';
import { rng } from '../../shared/util.js';

const cache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(c, { repeat = false, srgb = true, aniso = 4 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = aniso;
  t.needsUpdate = true;
  return t;
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

function noise(ctx, w, h, colors, count, size, seed = 1) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const s = size * (0.5 + r());
    ctx.fillRect(r() * w, r() * h, s, s);
  }
}

// ---------- wegdek ----------
// style: asfalt | klinkers | zand | aarde | sneeuw | snoep | melk | beton
export function roadTexture(style) {
  return cached('road-' + style, () => {
    const W = 256, H = 256;
    const c = canvas(W, H);
    const g = c.getContext('2d');
    const base = {
      asfalt: '#5d6168', klinkers: '#8a5a4a', zand: '#d8b679', aarde: '#9a7550', sneeuw: '#e9f1f8',
      snoep: '#f3a6c8', melk: '#f4f1ea', beton: '#8e9399',
    }[style] || '#5d6168';
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    if (style === 'klinkers') {
      for (let y = 0; y < H; y += 16) {
        for (let x = (y / 16) % 2 ? -12 : 0; x < W; x += 24) {
          g.fillStyle = ['#9b6151', '#8c5546', '#a46a58', '#7f4c40'][(x * 7 + y * 3) & 3];
          g.fillRect(x + 1, y + 1, 22, 14);
        }
      }
    } else if (style === 'snoep') {
      for (let y = 0; y < H; y += 32) {
        g.fillStyle = (y / 32) % 2 ? '#f7b7d4' : '#f19ac0';
        g.fillRect(0, y, W, 32);
      }
      noise(g, W, H, ['#ffffff', '#ffe066', '#7ad3ff'], 260, 3, 4);
    } else if (style === 'melk') {
      const grd = g.createLinearGradient(0, 0, W, 0);
      grd.addColorStop(0, '#d9e4ff'); grd.addColorStop(0.5, '#fbfaf6'); grd.addColorStop(1, '#d9e4ff');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      noise(g, W, H, ['#ffffff', '#cfd9ff', '#ffe9f6'], 500, 2.5, 7);
    } else {
      const spots = {
        asfalt: ['#54585e', '#666a72', '#4b4f55', '#70747b'], zand: ['#cfa96b', '#e3c58f', '#c69c5e'],
        aarde: ['#8c6845', '#a7825a', '#7c5a3a'], sneeuw: ['#ffffff', '#dbe7f2', '#cfe0ef'], beton: ['#858a90', '#999ea4', '#7b8086'],
      }[style] || ['#54585e', '#666a72'];
      noise(g, W, H, spots, 2400, 2.2, 3);
    }
    // middenstreep en zijlijnen
    if (style === 'asfalt' || style === 'beton') {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(W / 2 - 3, 20, 6, 90);
      g.fillRect(W / 2 - 3, 148, 6, 90);
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.fillRect(8, 0, 5, H); g.fillRect(W - 13, 0, 5, H);
    } else if (style === 'melk') {
      g.fillStyle = 'rgba(120,170,255,0.55)';
      g.fillRect(W / 2 - 2, 0, 4, H);
    } else if (style === 'sneeuw') {
      g.fillStyle = 'rgba(150,170,190,0.35)';
      for (let x of [W * 0.3, W * 0.7]) g.fillRect(x - 6, 0, 12, H); // bandensporen
    }
    return tex(c, { repeat: true });
  });
}

export function groundTexture(color, spots, seed = 2) {
  return cached('ground-' + color + spots.join(), () => {
    const c = canvas(128, 128);
    const g = c.getContext('2d');
    g.fillStyle = color;
    g.fillRect(0, 0, 128, 128);
    noise(g, 128, 128, spots, 900, 2, seed);
    return tex(c, { repeat: true });
  });
}

export function stripeTexture(a, b, n = 2, vertical = false) {
  return cached(`stripe-${a}-${b}-${n}-${vertical}`, () => {
    const c = canvas(64, 64);
    const g = c.getContext('2d');
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? b : a;
      if (vertical) g.fillRect((64 / n) * i, 0, 64 / n + 1, 64);
      else g.fillRect(0, (64 / n) * i, 64, 64 / n + 1);
    }
    return tex(c, { repeat: true });
  });
}

export function checkerTexture() {
  return cached('checker', () => {
    const c = canvas(64, 64);
    const g = c.getContext('2d');
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.fillStyle = (x + y) % 2 ? '#111' : '#fff';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
    const t = tex(c, { repeat: true });
    t.magFilter = THREE.NearestFilter;
    return t;
  });
}

export function arrowTexture() {
  return cached('arrow', () => {
    const c = canvas(64, 128);
    const g = c.getContext('2d');
    g.fillStyle = '#ff7a00';
    g.fillRect(0, 0, 64, 128);
    g.fillStyle = '#ffe14d';
    for (const y of [10, 74]) {
      g.beginPath();
      g.moveTo(32, y); g.lineTo(60, y + 34); g.lineTo(46, y + 34); g.lineTo(32, y + 18); g.lineTo(18, y + 34); g.lineTo(4, y + 34);
      g.closePath(); g.fill();
    }
    return tex(c, { repeat: true });
  });
}

export function questionTexture() {
  return cached('question', () => {
    const c = canvas(128, 128);
    const g = c.getContext('2d');
    const grd = g.createLinearGradient(0, 0, 128, 128);
    grd.addColorStop(0, '#ff5fa2'); grd.addColorStop(0.35, '#ffd23f'); grd.addColorStop(0.7, '#3dd6d0'); grd.addColorStop(1, '#7b6cff');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 8; g.strokeRect(4, 4, 120, 120);
    g.fillStyle = '#ffffff';
    g.font = 'bold 92px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 10; g.strokeStyle = 'rgba(40,30,90,0.55)';
    g.strokeText('?', 64, 70); g.fillText('?', 64, 70);
    return tex(c);
  });
}

// ---------- patronen voor capes en karts ----------
export function patternTexture(kind, color = '#ffffff') {
  return cached(`pat-${kind}-${color}`, () => {
    const c = canvas(128, 128);
    const g = c.getContext('2d');
    if (kind === 'regenboog') {
      const cols = ['#ff595e', '#ff924c', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
      cols.forEach((col, i) => { g.fillStyle = col; g.fillRect(0, (128 / cols.length) * i, 128, 128 / cols.length + 1); });
    } else if (kind === 'goud') {
      const grd = g.createLinearGradient(0, 0, 128, 128);
      grd.addColorStop(0, '#fff3a0'); grd.addColorStop(0.3, '#ffcf33'); grd.addColorStop(0.55, '#e0a100'); grd.addColorStop(0.8, '#ffe36b'); grd.addColorStop(1, '#c98a00');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(255,255,220,0.8)'; g.lineWidth = 3;
      for (let i = -128; i < 256; i += 22) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); }
    } else if (kind === 'sterren') {
      g.fillStyle = color; g.fillRect(0, 0, 128, 128);
      const r = rng(11);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = r() < 0.2 ? '#ffe066' : '#ffffff';
        const x = r() * 128, y = r() * 128, s = 1 + r() * 2.5;
        g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
      }
    } else if (kind === 'stippen') {
      g.fillStyle = color; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#ffffff';
      for (let y = 8; y < 128; y += 21) for (let x = (y % 2 ? 4 : 14); x < 128; x += 21) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'koe') {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 128);
      g.fillStyle = '#151515';
      const r = rng(5);
      for (let i = 0; i < 7; i++) {
        const cx = r() * 128, cy = r() * 128;
        g.beginPath();
        for (let a = 0; a < Math.PI * 2; a += 0.5) {
          const rad = 10 + r() * 12;
          g.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
        }
        g.closePath(); g.fill();
      }
    } else if (kind === 'kaasgaten') {
      g.fillStyle = '#ffd34d'; g.fillRect(0, 0, 128, 128);
      const r = rng(8);
      g.fillStyle = 'rgba(200,140,0,0.75)';
      for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(r() * 128, r() * 128, 4 + r() * 8, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'wafel') {
      g.fillStyle = '#b5702f'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#8a4f1c'; g.lineWidth = 5;
      for (let i = -128; i < 256; i += 18) {
        g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke();
        g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke();
      }
    } else {
      g.fillStyle = color; g.fillRect(0, 0, 128, 128);
    }
    const t = tex(c, { repeat: true });
    return t;
  });
}

// ---------- gevels, containers ----------
export function facadeTexture(color, seed) {
  return cached(`facade-${color}-${seed}`, () => {
    const c = canvas(64, 128);
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 64, 128);
    const r = rng(seed);
    for (let y = 10; y < 118; y += 26) {
      for (let x = 8; x < 60; x += 20) {
        g.fillStyle = r() < 0.25 ? '#ffe9a8' : '#2b3a4a';
        g.fillRect(x, y, 12, 16);
        g.fillStyle = '#f2f2f2';
        g.fillRect(x - 1, y - 2, 14, 2);
      }
    }
    g.fillStyle = '#3b2a20'; g.fillRect(24, 104, 16, 24);
    return tex(c);
  });
}

export function containerTexture(color) {
  return cached('cont-' + color, () => {
    const c = canvas(64, 32);
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 64, 32);
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let x = 2; x < 64; x += 5) g.fillRect(x, 1, 2, 30);
    return tex(c);
  });
}

// ---------- tekst ----------
export function textCanvas(text, { size = 48, color = '#fff', stroke = '#1a1a2e', bg = null, pad = 14, font = 'system-ui, sans-serif', weight = 800 } = {}) {
  const c = canvas(8, 8);
  let g = c.getContext('2d');
  g.font = `${weight} ${size}px ${font}`;
  const w = Math.ceil(g.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.35) + pad;
  c.width = w; c.height = h;
  g = c.getContext('2d');
  if (bg) {
    g.fillStyle = bg;
    const r = h / 2.4;
    g.beginPath();
    g.moveTo(r, 0); g.lineTo(w - r, 0); g.quadraticCurveTo(w, 0, w, r); g.lineTo(w, h - r); g.quadraticCurveTo(w, h, w - r, h);
    g.lineTo(r, h); g.quadraticCurveTo(0, h, 0, h - r); g.lineTo(0, r); g.quadraticCurveTo(0, 0, r, 0); g.fill();
  }
  g.font = `${weight} ${size}px ${font}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (stroke) { g.lineWidth = size / 6; g.strokeStyle = stroke; g.lineJoin = 'round'; g.strokeText(text, w / 2, h / 2 + 2); }
  g.fillStyle = color;
  g.fillText(text, w / 2, h / 2 + 2);
  return c;
}

export function textSprite(text, opts = {}) {
  const c = textCanvas(text, opts);
  const t = tex(c);
  const mat = new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: opts.depthTest ?? true, fog: false });
  const s = new THREE.Sprite(mat);
  const scale = opts.scale || 0.012;
  s.scale.set(c.width * scale, c.height * scale, 1);
  s.userData.aspect = c.width / c.height;
  return s;
}

export function glowTexture() {
  return cached('glow', () => {
    const c = canvas(64, 64);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.5)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return tex(c, { srgb: false });
  });
}

export function shadowTexture() {
  return cached('shadow', () => {
    const c = canvas(64, 64);
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 4, 32, 32, 31);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    return tex(c, { srgb: false });
  });
}
