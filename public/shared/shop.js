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
  kart: 'Karts',
  kleur: 'Kartkleuren',
  hoed: 'Hoeden',
  banden: 'Bandeneffecten',
  spoor: 'Lichtsporen',
  pose: 'Overwinningsposes',
};

// tabbladen in de winkel: eerst de specials (coureurs), dan de uiterlijkspullen
export const SHOP_TABS = { special: 'Specials', ...SLOTS };

// look: gegevens voor de weergave in 3D
export const SHOP_ITEMS = [
  // --- standaard (gratis, iedereen heeft ze) ---
  { id: 'cape_geen', slot: 'cape', name: 'Geen cape', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'kleur_standaard', slot: 'kleur', name: 'Kleur van je coureur', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'banden_gewoon', slot: 'banden', name: 'Gewone banden', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'spoor_geen', slot: 'spoor', name: 'Geen spoor', rarity: 'gewoon', price: 0, free: true, look: null },
  { id: 'pose_duim', slot: 'pose', name: 'Duim omhoog', rarity: 'gewoon', price: 0, free: true, look: { pose: 'duim' } },
  { id: 'kart_standaard', slot: 'kart', name: 'Racekart', rarity: 'gewoon', price: 0, free: true, look: { model: 'standaard' } },
  { id: 'hoed_geen', slot: 'hoed', name: 'Geen hoed', rarity: 'gewoon', price: 0, free: true, look: null },

  // --- karts (alleen uiterlijk: elke kart rijdt even snel en is even groot bij botsingen) ---
  { id: 'kart_bakfiets', slot: 'kart', name: 'Bakfietskart', rarity: 'gewoon', price: 70, look: { model: 'bakfiets' } },
  { id: 'kart_roze', slot: 'kart', name: 'Roze droomkart', rarity: 'ongewoon', price: 140, look: { model: 'roze', paint: '#ff7eb6' } },
  { id: 'kart_tractor', slot: 'kart', name: 'Tractorkart', rarity: 'ongewoon', price: 160, look: { model: 'tractor' } },
  { id: 'kart_melkwagen', slot: 'kart', name: 'Melkwagen', rarity: 'zeldzaam', price: 220, look: { model: 'melkwagen' } },
  { id: 'kart_badkuip', slot: 'kart', name: 'Badkuip-kart', rarity: 'zeldzaam', price: 240, look: { model: 'badkuip', paint: '#f4f7fb' } },
  { id: 'kart_klomp', slot: 'kart', name: 'Klompkart', rarity: 'episch', price: 320, look: { model: 'klomp', paint: '#f2c14e' } },
  { id: 'kart_monster', slot: 'kart', name: 'Monstertruck', rarity: 'episch', price: 380, look: { model: 'monster' } },
  { id: 'kart_raket', slot: 'kart', name: 'Raketkart', rarity: 'episch', price: 450, look: { model: 'raket' } },

  // --- hoeden (passen op elke coureur) ---
  { id: 'hoed_feestmuts', slot: 'hoed', name: 'Feestmuts', rarity: 'gewoon', price: 40, look: { hat: 'feestmuts' } },
  { id: 'hoed_pet', slot: 'hoed', name: 'Pet achterstevoren', rarity: 'gewoon', price: 50, look: { hat: 'pet' } },
  { id: 'hoed_bloemen', slot: 'hoed', name: 'Bloemenkrans', rarity: 'ongewoon', price: 100, look: { hat: 'bloemen' } },
  { id: 'hoed_koptelefoon', slot: 'hoed', name: 'Koptelefoon', rarity: 'ongewoon', price: 110, look: { hat: 'koptelefoon' } },
  { id: 'hoed_kaas', slot: 'hoed', name: 'Kaaspunthoed', rarity: 'zeldzaam', price: 200, look: { hat: 'kaas' } },
  { id: 'hoed_viking', slot: 'hoed', name: 'Vikinghelm', rarity: 'zeldzaam', price: 230, look: { hat: 'viking' } },
  { id: 'hoed_melkpak', slot: 'hoed', name: 'Melkpakhoed', rarity: 'episch', price: 300, look: { hat: 'melkpak' } },
  { id: 'hoed_kroon', slot: 'hoed', name: 'Kroon', rarity: 'episch', price: 400, look: { hat: 'kroon' } },

  // --- specials: extra coureurs om mee te racen (alleen uiterlijk) ---
  { id: 'special_meke', slot: 'special', name: 'Meke', rarity: 'episch', price: 250, look: { character: 'meke' } },
  { id: 'special_nicole', slot: 'special', name: 'Nicole', rarity: 'episch', price: 250, look: { character: 'nicole' } },
  { id: 'special_cherso', slot: 'special', name: 'Cherso Duif', rarity: 'episch', price: 300, look: { character: 'cherso' } },

  // --- capes ---
  { id: 'cape_rood', slot: 'cape', name: 'Rode cape', rarity: 'gewoon', price: 50, look: { colors: ['#d62828'] } },
  { id: 'cape_blauw', slot: 'cape', name: 'Hemelsblauwe cape', rarity: 'gewoon', price: 50, look: { colors: ['#4aa3ff'] } },
  { id: 'cape_oranje', slot: 'cape', name: 'Oranje feestcape', rarity: 'ongewoon', price: 110, look: { colors: ['#ff7b00'] } },
  { id: 'cape_zakdoek', slot: 'cape', name: 'Boerenzakdoek-cape', rarity: 'ongewoon', price: 130, look: { colors: ['#c1121f'], pattern: 'stippen' } },
  { id: 'cape_sterren', slot: 'cape', name: 'Sterrennacht-cape', rarity: 'zeldzaam', price: 220, look: { colors: ['#1b1f5e'], pattern: 'sterren' } },
  { id: 'cape_regenboog', slot: 'cape', name: 'Regenboogcape', rarity: 'episch', price: 380, look: { pattern: 'regenboog' } },
  { id: 'cape_goud', slot: 'cape', name: 'Gouden cape', rarity: 'legendarisch', price: 900, look: { colors: ['#ffcf33'], pattern: 'goud', sparkle: true } },

  // --- kartkleuren ---
  { id: 'kleur_melkwit', slot: 'kleur', name: 'Melkwit', rarity: 'gewoon', price: 30, look: { color: '#f7f7f2' } },
  { id: 'kleur_weidegroen', slot: 'kleur', name: 'Weidegroen', rarity: 'gewoon', price: 30, look: { color: '#46b04a' } },
  { id: 'kleur_kauwgom', slot: 'kleur', name: 'Kauwgomroze', rarity: 'gewoon', price: 40, look: { color: '#ff7eb6' } },
  { id: 'kleur_koningsoranje', slot: 'kleur', name: 'Koningsoranje', rarity: 'ongewoon', price: 80, look: { color: '#ff7a00' } },
  { id: 'kleur_nachtblauw', slot: 'kleur', name: 'Nachtblauw', rarity: 'ongewoon', price: 80, look: { color: '#1d2b64' } },
  { id: 'kleur_koeienvlek', slot: 'kleur', name: 'Koeienvlekken', rarity: 'zeldzaam', price: 180, look: { color: '#ffffff', pattern: 'koe' } },
  { id: 'kleur_chroom', slot: 'kleur', name: 'Spiegelchroom', rarity: 'episch', price: 300, look: { color: '#d9e2ec', metal: true } },
  { id: 'kleur_lava', slot: 'kleur', name: 'Lavagloed', rarity: 'episch', price: 320, look: { color: '#ff3d00', glow: '#ff6a00' } },

  // --- bandeneffecten ---
  { id: 'banden_wit', slot: 'banden', name: 'Witte velgen', rarity: 'gewoon', price: 25, look: { rim: '#ffffff' } },
  { id: 'banden_vonk', slot: 'banden', name: 'Vonkenbanden', rarity: 'ongewoon', price: 90, look: { rim: '#ffd166', particles: 'vonk' } },
  { id: 'banden_sneeuw', slot: 'banden', name: 'Sneeuwvlokbanden', rarity: 'ongewoon', price: 95, look: { rim: '#bde6ff', particles: 'sneeuw' } },
  { id: 'banden_neon', slot: 'banden', name: 'Neonvelgen', rarity: 'zeldzaam', price: 190, look: { rim: '#39ff14', glow: '#39ff14' } },
  { id: 'banden_vuur', slot: 'banden', name: 'Vlammenwielen', rarity: 'episch', price: 340, look: { rim: '#ff5400', glow: '#ff7b00', particles: 'vuur' } },

  // --- lichtsporen ---
  { id: 'spoor_melk', slot: 'spoor', name: 'Melkspoor', rarity: 'gewoon', price: 40, look: { colors: ['#ffffff'] } },
  { id: 'spoor_neonroze', slot: 'spoor', name: 'Neonroze spoor', rarity: 'ongewoon', price: 110, look: { colors: ['#ff2fa0'] } },
  { id: 'spoor_bliksem', slot: 'spoor', name: 'Bliksemspoor', rarity: 'zeldzaam', price: 210, look: { colors: ['#4df3ff', '#ffffff'], zigzag: true } },
  { id: 'spoor_regenboog', slot: 'spoor', name: 'Regenboogspoor', rarity: 'episch', price: 400, look: { colors: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'] } },

  // --- overwinningsposes ---
  { id: 'pose_zwaai', slot: 'pose', name: 'Koninklijk zwaaien', rarity: 'gewoon', price: 35, look: { pose: 'zwaai' } },
  { id: 'pose_klompendans', slot: 'pose', name: 'Klompendans', rarity: 'ongewoon', price: 110, look: { pose: 'dans' } },
  { id: 'pose_proost', slot: 'pose', name: 'Karnemelk-proost', rarity: 'zeldzaam', price: 220, look: { pose: 'proost' } },
  { id: 'pose_salto', slot: 'pose', name: 'Kartsalto', rarity: 'episch', price: 420, look: { pose: 'salto' } },
];

export const SHOP_BY_ID = Object.fromEntries(SHOP_ITEMS.map((i) => [i.id, i]));
export const DEFAULT_EQUIP = { cape: 'cape_geen', kart: 'kart_standaard', kleur: 'kleur_standaard', hoed: 'hoed_geen', banden: 'banden_gewoon', spoor: 'spoor_geen', pose: 'pose_duim' };
export const FREE_ITEMS = SHOP_ITEMS.filter((i) => i.free).map((i) => i.id);
export const START_MP = 150; // welkomstcadeau voor nieuwe spelers
// Prijzen zijn zo gekozen dat je na een paar races al iets leuks kunt kopen
// (een race met vrienden levert gemiddeld zo'n 40 tot 80 MP op).

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
  if (item.slot === 'special') {
    // een special "dragen" = met die coureur racen
    profile.lastCharacter = item.look.character;
    return { ok: true, item, character: item.look.character };
  }
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
