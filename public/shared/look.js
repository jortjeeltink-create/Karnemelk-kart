// Uiterlijk van mensachtige coureurs (Meke, Meike, Stan, Morris, ... en je eigen coureur).
// Alleen uiterlijk: lengte en bouw veranderen niets aan snelheid of botsingen.

export const SKIN_COLORS = ['#ffe3cc', '#f6c9a5', '#e8b48a', '#c98d5f', '#9b6440', '#6b4229'];
export const HAIR_COLORS = ['#1f1a17', '#4a2f1d', '#7a4a26', '#c58b3a', '#ecc96d', '#b23a2a', '#e9e9e9', '#ff6fb0', '#4aa3ff', '#7fd36b', '#f6d987', '#3a2418'];
export const SHIRT_COLORS = ['#2f7de1', '#e63946', '#3fbf6a', '#ffd23f', '#ff7a00', '#ff5fa2', '#7b6cff', '#222831', '#ffffff', '#3dd6d0', '#8a5a35', '#9aa5b1'];

export const HAIR_STYLES = { kaal: 'Kaal', stoppels: 'Stoppels', kort: 'Kort', warrig: 'Warrig', scheiding: 'Middenscheiding', stekels: 'Stekels', lang: 'Lang', staart: 'Staart', knot: 'Knot', krullen: 'Krullen' };
export const HEIGHTS = { klein: { name: 'Klein', s: 0.85 }, normaal: { name: 'Normaal', s: 1 }, lang: { name: 'Lang', s: 1.2 }, extralang: { name: 'Extra lang', s: 1.38 } };
export const BUILDS = { dun: { name: 'Dun', s: 0.78 }, normaal: { name: 'Normaal', s: 1 }, stevig: { name: 'Stevig', s: 1.3 }, extrastevig: { name: 'Extra stevig', s: 1.55 } };
export const GLASSES = { geen: 'Geen', bril: 'Bril', zonnebril: 'Zonnebril' };
export const FACIAL = { geen: 'Geen', snor: 'Snor', baard: 'Baard' };

export const DEFAULT_LOOK = {
  skin: SKIN_COLORS[1], hair: 'kort', hairColor: HAIR_COLORS[1], shirt: SHIRT_COLORS[0],
  height: 'normaal', build: 'normaal', glasses: 'geen', facial: 'geen',
};

const pick = (v, list, def) => (list.includes(v) ? v : def);
const key = (v, obj, def) => (typeof v === 'string' && Object.prototype.hasOwnProperty.call(obj, v) ? v : def);

// Maakt van willekeurige invoer een geldig uiterlijk (nooit iets onbekends doorlaten).
export function cleanLook(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    skin: pick(r.skin, SKIN_COLORS, DEFAULT_LOOK.skin),
    hair: key(r.hair, HAIR_STYLES, DEFAULT_LOOK.hair),
    hairColor: pick(r.hairColor, HAIR_COLORS, DEFAULT_LOOK.hairColor),
    shirt: pick(r.shirt, SHIRT_COLORS, DEFAULT_LOOK.shirt),
    height: key(r.height, HEIGHTS, DEFAULT_LOOK.height),
    build: key(r.build, BUILDS, DEFAULT_LOOK.build),
    glasses: key(r.glasses, GLASSES, DEFAULT_LOOK.glasses),
    facial: key(r.facial, FACIAL, DEFAULT_LOOK.facial),
  };
}

// Schaalfactoren voor de 3D-figuur; coureurs kunnen een eigen (grotere) bouw hebben.
export function lookScales(look) {
  const hs = look.heightScale || (HEIGHTS[look.height] || HEIGHTS.normaal).s;
  const ws = look.buildScale || (BUILDS[look.build] || BUILDS.normaal).s;
  return { hs, ws };
}
