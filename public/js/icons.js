// Eigen getekende pictogrammen (SVG).
import { ITEM } from '../shared/items.js';

const wafel = (x = 0, y = 0, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="32" cy="32" r="24" fill="#c47a35" stroke="#7a4518" stroke-width="3"/>
    <path d="M14 22 L50 42 M14 32 L44 50 M20 16 L52 34 M50 22 L14 42 M50 32 L20 50 M44 16 L12 34" stroke="#8a4f1c" stroke-width="2.5"/>
    <circle cx="32" cy="32" r="24" fill="none" stroke="#e8a85a" stroke-width="2" stroke-dasharray="3 3"/>
  </g>`;

export const ITEM_ICONS = {
  [ITEM.TURBO]: `<svg viewBox="0 0 64 64">${wafel()}<path d="M52 8 l6 -4 l-2 7 z" fill="#ffd23f"/></svg>`,
  [ITEM.TURBO3]: `<svg viewBox="0 0 64 64">${wafel(-4, 10, 0.55)}${wafel(26, 10, 0.55)}${wafel(11, -6, 0.55)}</svg>`,
  [ITEM.SCHILD]: `<svg viewBox="0 0 64 64"><path d="M8 46 L56 46 L32 10 Z" fill="#ffd34d" stroke="#d99a00" stroke-width="3" stroke-linejoin="round"/><circle cx="30" cy="34" r="4" fill="#e5a800"/><circle cx="40" cy="40" r="3" fill="#e5a800"/><circle cx="22" cy="41" r="2.5" fill="#e5a800"/><circle cx="33" cy="22" r="2.5" fill="#e5a800"/><path d="M6 50 Q32 60 58 50" stroke="#7cf8ff" stroke-width="3" fill="none"/></svg>`,
  [ITEM.PLAS]: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="44" rx="24" ry="9" fill="#ffffff" stroke="#b9c7d6" stroke-width="2"/><ellipse cx="26" cy="42" rx="7" ry="2" fill="#dfe8f2"/><path d="M32 8 C24 20 22 26 22 30 a10 10 0 0 0 20 0 C42 26 40 20 32 8 Z" fill="#ffffff" stroke="#b9c7d6" stroke-width="2"/></svg>`,
  [ITEM.KLOMP]: `<svg viewBox="0 0 64 64"><path d="M6 40 C6 30 14 26 24 26 L38 24 C50 22 58 30 58 38 C58 46 50 48 40 48 L14 48 C9 48 6 45 6 40 Z" fill="#f2c14e" stroke="#9c6a1a" stroke-width="3"/><ellipse cx="22" cy="31" rx="8" ry="3" fill="#7a4f1a"/><path d="M44 30 l4 4 m-6 0 l4 4" stroke="#d93a3a" stroke-width="2.5"/></svg>`,
};

export const LOGO = `
<svg class="logo-svg" viewBox="0 0 360 150" role="img" aria-label="Karnemelk Kart">
  <defs>
    <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e6f0ff"/></linearGradient>
  </defs>
  <path d="M20 40 Q60 6 120 22 Q180 0 240 20 Q300 4 340 38 L338 98 Q330 112 318 100 Q312 128 296 104 Q280 112 270 100 L84 100 Q70 132 58 102 Q46 116 38 100 Q24 104 22 92 Z" fill="url(#lg1)" stroke="#2f7de1" stroke-width="5" stroke-linejoin="round"/>
  <text x="180" y="66" text-anchor="middle" font-family="ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif" font-weight="900" font-size="44" textLength="268" lengthAdjust="spacingAndGlyphs" fill="#2f7de1" stroke="#ffffff" stroke-width="2" paint-order="stroke">KARNEMELK</text>
  <g transform="translate(180 120) rotate(-4)">
    <rect x="-74" y="-26" width="148" height="46" rx="14" fill="#ff7a00" stroke="#ffffff" stroke-width="4"/>
    <text x="0" y="10" text-anchor="middle" font-family="ui-rounded, 'Arial Rounded MT Bold', system-ui, sans-serif" font-weight="900" font-size="34" textLength="112" lengthAdjust="spacingAndGlyphs" fill="#ffffff">KART</text>
  </g>
  <circle cx="44" cy="58" r="8" fill="#151515"/><circle cx="318" cy="56" r="9" fill="#151515"/><circle cx="300" cy="82" r="5" fill="#151515"/>
</svg>`;

export const MP_ICON = `<svg class="mp-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9 h14 l-1.5 11 a2 2 0 0 1 -2 1.7 h-7 a2 2 0 0 1 -2 -1.7 Z" fill="#ffffff" stroke="#2f7de1" stroke-width="1.8"/><path d="M8 4 h8 l1 5 H7 Z" fill="#2f7de1"/><text x="12" y="18" text-anchor="middle" font-size="7" font-weight="900" fill="#2f7de1" font-family="system-ui">MP</text></svg>`;

export function avatarSvg(ch) {
  const hats = {
    pak: `<rect x="10" y="9" width="28" height="30" rx="3" fill="#fff" stroke="#2f7de1" stroke-width="2"/><path d="M10 9 L24 2 L38 9 Z" fill="#f1f1f1" stroke="#2f7de1" stroke-width="2"/><rect x="10" y="30" width="28" height="5" fill="#2f7de1"/>`,
    strohoed: `<ellipse cx="24" cy="15" rx="20" ry="5" fill="#e9c46a"/><rect x="15" y="5" width="18" height="10" rx="4" fill="#e9c46a"/><rect x="15" y="11" width="18" height="3" fill="#d93a3a"/>`,
    ruit: ``, friet: `<path d="M15 14 L33 14 L30 4 L18 4 Z" fill="#e8423f"/><path d="M19 4 V-2 M23 4 V-4 M27 4 V-2 M30 5 V0" stroke="#ffd23f" stroke-width="3"/>`,
    snavel: `<path d="M24 30 L44 34 L24 37 Z" fill="#ff8c1a"/>`, wafel: `<ellipse cx="24" cy="12" rx="15" ry="5" fill="#b5702f" stroke="#8a4f1c"/>`,
    bal: `<circle cx="27" cy="9" r="4" fill="#ffd23f"/>`, molen: `<rect x="21" y="2" width="6" height="10" fill="#7b5a3a"/><path d="M24 6 l-9 -6 M24 6 l9 -6 M24 6 l-9 6 M24 6 l9 6" stroke="#fff" stroke-width="3"/>`,
    tulp: `<path d="M24 12 V4" stroke="#3fa34d" stroke-width="2"/><path d="M17 4 Q24 -8 31 4 Q24 8 17 4 Z" fill="#ff4f9a"/>`,
    kaas: `<path d="M10 14 L38 14 L30 3 Z" fill="#ffd34d" stroke="#d99a00"/><circle cx="26" cy="10" r="2" fill="#e5a800"/>`,
  };
  const headShape = ch.head === 'pak' ? '' : ch.head === 'ruit'
    ? `<path d="M24 6 L40 24 L24 44 L8 24 Z" fill="#1d1d22"/>`
    : `<circle cx="24" cy="25" r="15" fill="${ch.head === 'bal' ? '#9b5523' : ch.skin}" stroke="rgba(0,0,0,.15)"/>`;
  return `<svg viewBox="0 -6 48 54" class="avatar">${headShape}${hats[ch.head] || ''}<circle cx="19" cy="24" r="3.2" fill="#fff"/><circle cx="29" cy="24" r="3.2" fill="#fff"/><circle cx="19.5" cy="24.5" r="1.6" fill="#111"/><circle cx="29.5" cy="24.5" r="1.6" fill="#111"/><rect x="12" y="44" width="24" height="4" rx="2" fill="${ch.body}"/></svg>`;
}

export function trackMapSvg(track, { stroke = '#ffffff', width = 6 } = {}) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < track.N; i++) {
    minX = Math.min(minX, track.px[i]); maxX = Math.max(maxX, track.px[i]);
    minZ = Math.min(minZ, track.pz[i]); maxZ = Math.max(maxZ, track.pz[i]);
  }
  const pad = 14;
  let d = '';
  for (let i = 0; i <= track.N; i += 6) {
    const k = i % track.N;
    d += `${i ? 'L' : 'M'}${(track.px[k] - minX + pad).toFixed(0)},${(track.pz[k] - minZ + pad).toFixed(0)}`;
  }
  d += 'Z';
  const s = track.pointAt(0, 0);
  return `<svg viewBox="0 0 ${(maxX - minX + pad * 2).toFixed(0)} ${(maxZ - minZ + pad * 2).toFixed(0)}" class="trackmap"><path d="${d}" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="${width * 3.2}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width * 2}" stroke-linejoin="round"/><circle cx="${(s.x - minX + pad).toFixed(0)}" cy="${(s.z - minZ + pad).toFixed(0)}" r="${width * 1.6}" fill="#ff7a00" stroke="#fff" stroke-width="3"/></svg>`;
}
