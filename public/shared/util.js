// Kleine wiskunde- en hulpfuncties (zonder afhankelijkheden).
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

export function lerpAngle(a, b, t) {
  return a + wrapAngle(b - a) * t;
}

export function round(v, d = 3) {
  const m = 10 ** d;
  return Math.round(v * m) / m;
}

// Deterministische random-generator (mulberry32) zodat server en client dezelfde
// "toevallige" dingen kunnen berekenen.
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function formatTime(sec) {
  if (sec == null || !isFinite(sec)) return '--:--.--';
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`;
}

export function ordinal(n) {
  return `${n}e`;
}

// Namen opschonen: 2-16 tekens, letters (ook met accenten), cijfers, spatie, - en _.
export function cleanName(raw) {
  if (typeof raw !== 'string') return null;
  const name = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 2 || name.length > 16) return null;
  if (!/^[\p{L}\p{N} _\-'.]+$/u.test(name)) return null;
  return name;
}

export const nameKey = (name) => name.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
