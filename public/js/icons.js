// Eigen getekende pictogrammen (SVG).
import { ITEM } from '../shared/items.js';
import { CHARACTER_BY_ID, CHARACTERS } from '../shared/characters.js';
import { cleanLook, lookScales } from '../shared/look.js';

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

export function avatarSvg(ch, look) {
  if (ch.head === 'mens') return humanAvatar({ ...(ch.custom ? cleanLook(look) : { ...cleanLook(ch.look), ...ch.look }), armor: !!ch.armor, accent: ch.accent });
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
  // ridder: helm met neusstuk en pluim over het melkpak
  const knight = ch.armor ? `<path d="M8 17 Q8 1 24 1 Q40 1 40 17 Z" fill="#d3d9e1" stroke="#8a919b" stroke-width="1.5"/><rect x="22.5" y="13" width="3" height="12" rx="1" fill="#d3d9e1" stroke="#8a919b"/><path d="M24 1 Q20 -6 30 -5 Q27 -2 24 1Z" fill="${ch.accent}"/>` : '';
  return `<svg viewBox="0 -6 48 54" class="avatar">${headShape}${hats[ch.head] || ''}${knight}<circle cx="19" cy="24" r="3.2" fill="#fff"/><circle cx="29" cy="24" r="3.2" fill="#fff"/><circle cx="19.5" cy="24.5" r="1.6" fill="#111"/><circle cx="29.5" cy="24.5" r="1.6" fill="#111"/><rect x="12" y="44" width="24" height="4" rx="2" fill="${ch.body}"/></svg>`;
}

// avatar voor een coureur-id (met eventueel een eigen uiterlijk)
export function avatarFor(characterId, look) {
  return avatarSvg(CHARACTER_BY_ID[characterId] || CHARACTERS[0], look);
}

export function humanAvatar(l) {
  const { ws } = lookScales(l);
  const hc = l.hairColor;
  const face = Math.min(17, 14 + (ws - 1) * 5);
  const capPath = `M${24 - face} 24 Q${24 - face} ${10 - face * 0.1} 24 ${9} Q${24 + face} ${10 - face * 0.1} ${24 + face} 24 Q${24 + face - 3} 15 24 15 Q${24 - face + 3} 15 ${24 - face} 24Z`;
  let back = '';
  let hair = '';
  switch (l.hair) {
    case 'kort': hair = `<path d="${capPath}" fill="${hc}"/>`; break;
    case 'stekels': hair = `<path d="M${24 - face} 22 L12 8 L17 13 L20 4 L24 12 L28 4 L31 13 L36 8 L${24 + face} 22 Q24 13 ${24 - face} 22Z" fill="${hc}"/>`; break;
    case 'lang': back = `<path d="M${24 - face - 2} 20 Q24 4 ${24 + face + 2} 20 L${24 + face + 3} 46 L${24 - face - 3} 46Z" fill="${hc}"/>`; hair = `<path d="${capPath}" fill="${hc}"/>`; break;
    case 'staart': hair = `<path d="${capPath}" fill="${hc}"/><ellipse cx="${24 + face + 3}" cy="30" rx="4" ry="9" fill="${hc}" transform="rotate(-18 ${24 + face + 3} 30)"/>`; break;
    case 'knot': hair = `<path d="${capPath}" fill="${hc}"/><circle cx="24" cy="6" r="6" fill="${hc}"/>`; break;
    case 'krullen': hair = [[12, 17], [17, 11], [24, 9], [31, 11], [36, 17], [10, 24], [38, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="${hc}"/>`).join(''); break;
    case 'stoppels': hair = `<path d="${capPath}" fill="${hc}" opacity="0.5"/>`; break;
    case 'warrig': hair = `<path d="${capPath}" fill="${hc}"/>` + [[13, 15, 3.5], [17, 10, 4], [23, 7, 4], [29, 8, 4], [34, 12, 3.5], [20, 13, 3], [28, 12, 3]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${hc}"/>`).join(''); break;
    case 'scheiding': hair = `<path d="M${24 - face} 27 Q${24 - face} 9 23.2 9 L23.2 13 Q17 14 ${24 - face + 2} 27 Z" fill="${hc}"/><path d="M${24 + face} 27 Q${24 + face} 9 24.8 9 L24.8 13 Q31 14 ${24 + face - 2} 27 Z" fill="${hc}"/>`; break;
    default: break;
  }
  let extra = '';
  if (l.glasses === 'bril') extra += '<circle cx="19" cy="24" r="4.6" fill="none" stroke="#222" stroke-width="1.6"/><circle cx="29" cy="24" r="4.6" fill="none" stroke="#222" stroke-width="1.6"/><path d="M23.6 24 h0.8" stroke="#222" stroke-width="1.6"/>';
  if (l.glasses === 'zonnebril') extra += '<rect x="13.5" y="21" width="9.5" height="6" rx="2.5" fill="#111"/><rect x="25" y="21" width="9.5" height="6" rx="2.5" fill="#111"/><path d="M23 23 h2" stroke="#111" stroke-width="1.6"/>';
  if (l.facial === 'snor') extra += `<path d="M18 32 Q24 28 30 32 Q24 30.5 18 32Z" fill="${hc}" stroke="${hc}" stroke-width="1.5"/>`;
  if (l.facial === 'baard') extra += `<path d="M${24 - face + 1} 27 Q24 48 ${24 + face - 1} 27 Q24 36 ${24 - face + 1} 27Z" fill="${hc}"/>`;
  if (l.duif) extra += '<ellipse cx="25" cy="5" rx="7" ry="4.5" fill="#9aa5b1"/><circle cx="31" cy="1" r="3.2" fill="#8b95a3"/><path d="M33.8 1 l3 1 l-3 1z" fill="#ff8c1a"/><circle cx="31.8" cy="0.4" r="0.8" fill="#111"/><path d="M19 5 l-4 -2 l1 4z" fill="#7d8796"/>';
  const eyes = l.glasses === 'zonnebril' ? '' : '<circle cx="19" cy="24" r="3" fill="#fff"/><circle cx="29" cy="24" r="3" fill="#fff"/><circle cx="19.5" cy="24.5" r="1.5" fill="#111"/><circle cx="29.5" cy="24.5" r="1.5" fill="#111"/>';
  const bw = Math.min(46, 24 * ws);
  if (l.helm) {
    // ridder met dichte helm
    return `<svg viewBox="0 -6 48 54" class="avatar"><rect x="${24 - bw / 2}" y="41" width="${bw}" height="9" rx="4" fill="#d3d9e1" stroke="#8a919b"/><path d="M21 42 h6 M24 41 v8" stroke="${l.accent || '#e63946'}" stroke-width="2.2"/><ellipse cx="24" cy="23" rx="16" ry="18" fill="#d3d9e1" stroke="#8a919b" stroke-width="1.5"/><rect x="12" y="21" width="24" height="3.2" rx="1.6" fill="#15161a"/><path d="M24 5 v34" stroke="#8a919b" stroke-width="1.6"/><path d="M24 5 Q20 -6 33 -4 Q28 0 24 5Z" fill="${l.accent || '#e63946'}"/></svg>`;
  }
  const shirt = l.armor ? `<rect x="${24 - bw / 2}" y="41" width="${bw}" height="9" rx="4" fill="#d3d9e1" stroke="#8a919b"/>` : `<rect x="${24 - bw / 2}" y="41" width="${bw}" height="9" rx="4" fill="${l.shirt}"/>`;
  return `<svg viewBox="0 -6 48 54" class="avatar">${back}${shirt}<ellipse cx="24" cy="25" rx="${face}" ry="15" fill="${l.skin}" stroke="rgba(0,0,0,.15)"/>${hair}${eyes}<path d="M20 33 Q24 35.5 28 33" stroke="#7a2b2b" stroke-width="1.6" fill="none" stroke-linecap="round"/>${extra}</svg>`;
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
