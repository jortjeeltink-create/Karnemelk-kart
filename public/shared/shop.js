// Winkel: alleen uiterlijk, nooit een racevoordeel.
export const RARITIES = {
  gewoon: { name: 'Gewoon', order: 1, color: '#9aa5b1' },
  ongewoon: { name: 'Ongewoon', order: 2, color: '#3fbf6a' },
  zeldzaam: { name: 'Zeldzaam', order: 3, color: '#3d8bff' },
  episch: { name: 'Episch', order: 4, color: '#a855f7' },
  legendarisch: { name: 'Legendarisch', order: 5, color: '#f5b301' },
};

export const SLOTS = {
  cape: 'Capes',
  kleur: 'Kartkleuren',
  banden: 'Bandeneffecten',
  spoor: 'Lichtsporen',
  pose: 'Overwinningsposes',
};

// look: gegevens voor de weergave in 3D
export const SHOP_ITEMS = [
  // --- standaard (gratis, iedereen heeft ze) ---
  { id: 'cape_geen', slot: 'cape', name: 'Geen cape', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'kleur_standaard', slot: 'kleur', name: 'Kleur van je coureur', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'banden_gewoon', slot: 'banden', name: 'Gewone banden', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'spoor_geen', slot: 'spoor', name: 'Geen spoor', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'pose_duim', slot: 'pose', name: 'Duim omhoog', rarity: 'gewoon', price: 0, free: true, look: { pose: 'duim' } },

  // --- capes ---
  { id: 'cape_rood', slot: 'cape', name: 'Rode cape', rarity: 'gewoon', price: 120, look: { colors: ['#d62828'] } },
  { id: 'cape_blauw', slot: 'cape', name: 'Hemelsblauwe cape', rarity: 'gewoon', price: 120, look: { colors: ['#4aa3ff'] } },
  { id: 'cape_oranje', slot: 'cape', name: 'Oranje feestcape', rarity: 'ongewoon', price: 260, look: { colors: ['#ff7b00'] } },
  { id: 'cape_zakdoek', slot: 'cape', name: 'Boerenzakdoek-cape', rarity: 'ongewoon', price: 300, look: { colors: ['#c1121f'], pattern: 'stippen' } },
  { id: 'cape_sterren', slot: 'cape', name: 'Sterrennacht-cape', rarity: 'zeldzaam', price: 560, look: { colors: ['#1b1f5e'], pattern: 'sterren' } },
  { id: 'cape_regenboog', slot: 'cape', name: 'Regenboogcape', rarity: 'episch', price: 1150, look: { pattern: 'regenboog' } },
  { id: 'cape_goud', slot: 'cape', name: 'Gouden cape', rarity: 'legendarisch', price: 2500, look: { colors: ['#ffcf33'], pattern: 'goud', sparkle: true } },

  // --- kartkleuren ---
  { id: 'kleur_melkwit', slot: 'kleur', name: 'Melkwit', rarity: 'gewoon', price: 80, look: { color: '#f7f7f2' } },
  { id: 'kleur_weidegroen', slot: 'kleur', name: 'Weidegroen', rarity: 'gewoon', price: 80, look: { color: '#46b04a' } },
  { id: 'kleur_kauwgom', slot: 'kleur', name: 'Kauwgomroze', rarity: 'gewoon', price: 100, look: { color: '#ff7eb6' } },
  { id: 'kleur_koningsoranje', slot: 'kleur', name: 'Koningsoranje', rarity: 'ongewoon', price: 210, look: { color: '#ff7a00' } },
  { id: 'kleur_nachtblauw', slot: 'kleur', name: 'Nachtblauw', rarity: 'ongewoon', price: 210, look: { color: '#1d2b64' } },
  { id: 'kleur_koeienvlek', slot: 'kleur', name: 'Koeienvlekken', rarity: 'zeldzaam', price: 460, look: { color: '#ffffff', pattern: 'koe' } },
  { id: 'kleur_chroom', slot: 'kleur', name: 'Spiegelchroom', rarity: 'episch', price: 920, look: { color: '#d9e2ec', metal: true } },
  { id: 'kleur_lava', slot: 'kleur', name: 'Lavagloed', rarity: 'episch', price: 980, look: { color: '#ff3d00', glow: '#ff6a00' } },

  // --- bandeneffecten ---
  { id: 'banden_wit', slot: 'banden', name: 'Witte velgen', rarity: 'gewoon', price: 60, look: { rim: '#ffffff' } },
  { id: 'banden_vonk', slot: 'banden', name: 'Vonkenbanden', rarity: 'ongewoon', price: 230, look: { rim: '#ffd166', particles: 'vonk' } },
  { id: 'banden_sneeuw', slot: 'banden', name: 'Sneeuwvlokbanden', rarity: 'ongewoon', price: 240, look: { rim: '#bde6ff', particles: 'sneeuw' } },
  { id: 'banden_neon', slot: 'banden', name: 'Neonvelgen', rarity: 'zeldzaam', price: 490, look: { rim: '#39ff14', glow: '#39ff14' } },
  { id: 'banden_vuur', slot: 'banden', name: 'Vlammenwielen', rarity: 'episch', price: 1000, look: { rim: '#ff5400', glow: '#ff7b00', particles: 'vuur' } },

  // --- lichtsporen ---
  { id: 'spoor_melk', slot: 'spoor', name: 'Melkspoor', rarity: 'gewoon', price: 100, look: { colors: ['#ffffff'] } },
  { id: 'spoor_neonroze', slot: 'spoor', name: 'Neonroze spoor', rarity: 'ongewoon', price: 270, look: { colors: ['#ff2fa0'] } },
  { id: 'spoor_bliksem', slot: 'spoor', name: 'Bliksemspoor', rarity: 'zeldzaam', price: 530, look: { colors: ['#4df3ff', '#ffffff'], zigzag: true } },
  { id: 'spoor_regenboog', slot: 'spoor', name: 'Regenboogspoor', rarity: 'episch', price: 1200, look: { colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'] } },

  // --- overwinningsposes ---
  { id: 'pose_zwaai', slot: 'pose', name: 'Koninklijk zwaaien', rarity: 'gewoon', price: 90, look: { pose: 'zwaai' } },
  { id: 'pose_klompendans', slot: 'pose', name: 'Klompendans', rarity: 'ongewoon', price: 280, look: { pose: 'dans' } },
  { id: 'pose_proost', slot: 'pose', name: 'Karnemelk-proost', rarity: 'zeldzaam', price: 600, look: { pose: 'proost' } },
  { id: 'pose_salto', slot: 'pose', name: 'Kartsalto', rarity: 'episch', price: 1300, look: { pose: 'salto' } },
];

export const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));
export const DEFAULT_EQUIP = { cape: 'cape_geen', kleur: 'kleur_standaard', banden: 'banden_gewoon', spoor: 'spoor_geen', pose: 'pose_duim' };
export const FREE_ITEMS = SHOP_ITEMS.filter((i) => i.free).map((i) => i.id);
export const START_MP = 150; // welkomstcadeau voor nieuwe spelers

export function ownsItem(profile, itemId) {
  const item = SHOP_BY_ID[itemId];
  if (!item) return false;
  return !!item.free || (profile.owned || []).includes(itemId);
}

// Probeer te kopen. Geeft { ok, error } terug en past het profiel alleen aan bij succes.
export function tryBuy(profile, itemId) {
  const item = SHOP_BY_ID[itemId];
  if (!item) return { ok: false, error: 'Dit item bestaat niet.' };
  if (ownsItem(profile, itemId)) return { ok: false, error: 'Je hebt dit item al.' };
  if (!Number.isInteger(profile.mp) || profile.mp < item.price) {
    const tekort = item.price - (profile.mp || 0);
    return { ok: false, error: `Te weinig MP-punten: je komt er nog ${tekort} tekort.` };
  }
  profile.mp -= item.price;
  profile.owned = [...(profile.owned || []), itemId];
  return { ok: true, item };
}

export function tryEquip(profile, itemId) {
  const item = SHOP_BY_ID[itemId];
  if (!item) return { ok: false, error: 'Dit item bestaat niet.' };
  if (!ownsItem(profile, itemId)) return { ok: false, error: 'Je moet dit item eerst kopen.' };
  profile.equipped = { ...DEFAULT_EQUIP, ...(profile.equipped || {}), [item.slot]: itemId };
  return { ok: true, item };
}

// Wat anderen van jouw uiterlijk zien (alleen geldige, gekochte items)
export function publicCosmetics(profile) {
  const eq = { ...DEFAULT_EQUIP, ...(profile?.equipped || {}) };
  const out = {};
  for (const slot of Object.keys(SLOTS)) {
    out[slot] = profile && ownsItem(profile, eq[slot]) ? eq[slot] : DEFAULT_EQUIP[slot];
  }
  return out;
}
