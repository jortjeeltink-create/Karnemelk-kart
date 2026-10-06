// Eigen, originele coureurs. Alleen uiterlijk: alle karts rijden precies even snel.
// head: 'mens' = mensachtige figuur die wordt opgebouwd uit `look` (zie look.js).
export const CHARACTERS = [
  { id: 'kees', name: 'Kees Karnemelk', desc: 'Een vrolijk melkpak met een snor.', head: 'pak', body: '#2f7de1', skin: '#ffffff', kart: '#3a8ef6', accent: '#ffffff' },
  {
    id: 'meke', friend: true, special: 'special_meke', name: 'Meke', desc: 'Lang en dun: ziet elke bocht als eerste aankomen.', head: 'mens', body: '#7b6cff', skin: '#f6c9a5', kart: '#8f7dff', accent: '#ffd23f',
    look: { skin: '#f6c9a5', hair: 'lang', hairColor: '#ecc96d', shirt: '#7b6cff', height: 'extralang', build: 'dun', glasses: 'geen', facial: 'geen', heightScale: 1.42, buildScale: 0.72 },
  },
  {
    id: 'meike', friend: true, special: 'special_meike', name: 'Meike', desc: 'Donker haar en dun: glipt overal tussendoor.', head: 'mens', body: '#9b5de5', skin: '#f6c9a5', kart: '#8e4fd9', accent: '#ffffff',
    look: { skin: '#f6c9a5', hair: 'lang', hairColor: '#3a2418', shirt: '#9b5de5', height: 'normaal', build: 'dun', glasses: 'geen', facial: 'geen' },
  },
  {
    id: 'ridderkees', friend: true, special: 'special_ridderkees', name: 'Ridder Kees', desc: 'Kees in een glimmend ridderpak. Voor de eer van de karnemelk!', head: 'pak', armor: true, body: '#cfd5dd', skin: '#ffffff', kart: '#9aa3ad', accent: '#e63946',
  },
  {
    id: 'ridderjort', friend: true, special: 'special_ridderjort', name: 'Ridder Jort', desc: 'Van top tot teen in harnas. Niemand weet wat er onder die helm gebeurt.', head: 'mens', armor: true, body: '#cfd5dd', skin: '#f6c9a5', kart: '#2f5fa8', accent: '#ffd23f',
    look: { skin: '#f6c9a5', hair: 'kort', hairColor: '#4a2f1d', shirt: '#cfd5dd', height: 'normaal', build: 'normaal', glasses: 'geen', facial: 'geen', helm: true },
  },
  {
    id: 'stan', friend: true, special: 'special_stan', name: 'Stan', desc: 'Kort, donkerbruin en altijd een beetje warrig. Net als zijn rijstijl.', head: 'mens', body: '#e63946', skin: '#f6c9a5', kart: '#d62f3c', accent: '#ffffff',
    look: { skin: '#f6c9a5', hair: 'warrig', hairColor: '#3a2418', shirt: '#e63946', height: 'normaal', build: 'normaal', glasses: 'geen', facial: 'geen' },
  },
  {
    id: 'jullian', friend: true, special: 'special_jullian', name: 'Jullian', desc: 'Kaal geschoren en blond: geen haar die in de weg zit.', head: 'mens', body: '#222831', skin: '#f6c9a5', kart: '#2b3340', accent: '#ffd23f',
    look: { skin: '#f6c9a5', hair: 'stoppels', hairColor: '#ecc96d', shirt: '#222831', height: 'normaal', build: 'normaal', glasses: 'geen', facial: 'geen' },
  },
  {
    id: 'melle', friend: true, special: 'special_melle', name: 'Melle', desc: 'Kort lichtblond haar en een snelle stuurhand.', head: 'mens', body: '#3dd6d0', skin: '#f6c9a5', kart: '#2fc4be', accent: '#ffffff',
    look: { skin: '#f6c9a5', hair: 'kort', hairColor: '#f6d987', shirt: '#3dd6d0', height: 'normaal', build: 'normaal', glasses: 'geen', facial: 'geen' },
  },
  {
    id: 'duuk', friend: true, special: 'special_duuk', name: 'Duuk', desc: 'Kaal en aerodynamisch. Zegt hij zelf.', head: 'mens', body: '#ff7a00', skin: '#e8b48a', kart: '#ff8a1f', accent: '#222831',
    look: { skin: '#e8b48a', hair: 'kaal', hairColor: '#4a2f1d', shirt: '#ff7a00', height: 'normaal', build: 'normaal', glasses: 'geen', facial: 'geen' },
  },
  {
    id: 'morris', friend: true, special: 'special_morris', name: 'Morris', desc: 'Blond met een strakke middenscheiding. Elke haar zit goed, ook na een botsing.', head: 'mens', body: '#3fbf6a', skin: '#f6c9a5', kart: '#35a95c', accent: '#ffffff',
    look: { skin: '#f6c9a5', hair: 'scheiding', hairColor: '#ecc96d', shirt: '#3fbf6a', height: 'normaal', build: 'normaal', glasses: 'geen', facial: 'geen' },
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
