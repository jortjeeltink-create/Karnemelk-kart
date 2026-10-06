// Eigen, originele coureurs. Alleen uiterlijk: alle karts rijden precies even snel.
// head: 'mens' = mensachtige figuur die wordt opgebouwd uit `look` (zie look.js).
export const CHARACTERS = [
  { id: 'kees', name: 'Kees Karnemelk', desc: 'Een vrolijk melkpak met een snor.', head: 'pak', body: '#2f7de1', skin: '#ffffff', kart: '#3a8ef6', accent: '#ffffff' },
  {
    id: 'meke', friend: true, special: 'special_meke', name: 'Meke', desc: 'Lang en dun: ziet elke bocht als eerste aankomen.', head: 'mens', body: '#7b6cff', skin: '#f6c9a5', kart: '#8f7dff', accent: '#ffd23f',
    look: { skin: '#f6c9a5', hair: 'lang', hairColor: '#4a2f1d', shirt: '#7b6cff', height: 'extralang', build: 'dun', glasses: 'geen', facial: 'geen', heightScale: 1.42, buildScale: 0.72 },
  },
  {
    id: 'nicole', friend: true, special: 'special_nicole', name: 'Nicole', desc: 'Rijdt stevig door en gaat geen botsing uit de weg.', head: 'mens', body: '#ff5fa2', skin: '#f6c9a5', kart: '#ff6fb0', accent: '#ffffff',
    look: { skin: '#f6c9a5', hair: 'staart', hairColor: '#c58b3a', shirt: '#ff5fa2', height: 'normaal', build: 'stevig', glasses: 'geen', facial: 'geen', buildScale: 1.35 },
  },
  {
    id: 'cherso', friend: true, special: 'special_cherso', name: 'Cherso Duif', desc: 'De grootste van het stel, met zijn trouwe duif op zijn hoofd.', head: 'mens', body: '#3e8e41', skin: '#e8b48a', kart: '#4caf50', accent: '#9aa5b1',
    look: { skin: '#e8b48a', hair: 'kort', hairColor: '#1f1a17', shirt: '#3e8e41', height: 'normaal', build: 'extrastevig', glasses: 'geen', facial: 'geen', heightScale: 1.08, buildScale: 1.78, duif: true },
  },
  { id: 'bella', name: 'Bella Boerin', desc: 'Ruikt de modder al van verre.', head: 'strohoed', body: '#d93a3a', skin: '#f6c9a5', kart: '#e8423f', accent: '#ffd34d' },
  { id: 'dirk', name: 'Dirk Drop', desc: 'Zwart, zout en supersnel.', head: 'ruit', body: '#222831', skin: '#2a2a2e', kart: '#33373f', accent: '#ff5fa2' },
  { id: 'fien', name: 'Fien Friet', desc: 'Altijd in een zakje, nooit in de berm.', head: 'friet', body: '#f2b632', skin: '#f6d0a8', kart: '#ffc93c', accent: '#e8423f' },
  { id: 'otto', name: 'Otto Ooievaar', desc: 'Lange snavel, nog langere bochten.', head: 'snavel', body: '#f4f4f4', skin: '#ffffff', kart: '#f2f2f2', accent: '#ff8c1a' },
  { id: 'saar', name: 'Saar Stroopwafel', desc: 'Lekker plakkerig op de baan.', head: 'wafel', body: '#a8662b', skin: '#f3c79b', kart: '#b5702f', accent: '#ffe0a3' },
  { id: 'bram', name: 'Bram Bitterbal', desc: 'Klein, rond en heet van binnen.', head: 'bal', body: '#8a4b1d', skin: '#a35a24', kart: '#9b5523', accent: '#ffe066' },
  { id: 'mo', name: 'Molenaar Mo', desc: 'Draait overal zijn hand voor om.', head: 'molen', body: '#3e8e41', skin: '#e9b48a', kart: '#43a047', accent: '#ffffff' },
  { id: 'tess', name: 'Tess Tulp', desc: 'Bloeit op in de laatste ronde.', head: 'tulp', body: '#e94f9b', skin: '#f7cdb0', kart: '#ff5fae', accent: '#7fd36b' },
  { id: 'gijs', name: 'Gijs Gouda', desc: 'Gatenkaas met een gouden hart.', head: 'kaas', body: '#f5c518', skin: '#f2c09c', kart: '#f7c948', accent: '#ff9f1c' },
  // je eigen coureur: het uiterlijk komt uit je profiel (Mijn coureur)
  { id: 'eigen', name: 'Mijn coureur', desc: 'Zelf gemaakt: pas je uiterlijk aan bij "Mijn coureur".', head: 'mens', custom: true, body: '#2f7de1', skin: '#f6c9a5', kart: '#3a8ef6', accent: '#ffffff' },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
export const DEFAULT_CHARACTER = 'kees';
// gratis coureurs (specials koop je in de winkel; je eigen coureur maak je zelf)
export const BOT_CHARACTERS = CHARACTERS.filter((c) => !c.custom && !c.special);

// Racenaam: met een special heet je bijvoorbeeld "Meke (Jort)", zodat je meerdere Mekes uit elkaar houdt.
export function racerName(playerName, characterId) {
  const ch = CHARACTER_BY_ID[characterId];
  if (!ch || !ch.special) return playerName;
  if (playerName.toLowerCase() === ch.name.toLowerCase()) return playerName;
  return `${ch.name} (${playerName})`;
}
