// Eigen, originele coureurs. Alleen uiterlijk: alle karts rijden precies even snel.
export const CHARACTERS = [
  { id: 'kees', name: 'Kees Karnemelk', desc: 'Een vrolijk melkpak met een snor.', head: 'pak', body: '#2f7de1', skin: '#ffffff', kart: '#3a8ef6', accent: '#ffffff' },
  { id: 'bella', name: 'Bella Boerin', desc: 'Ruikt de modder al van verre.', head: 'strohoed', body: '#d93a3a', skin: '#f6c9a5', kart: '#e8423f', accent: '#ffd34d' },
  { id: 'dirk', name: 'Dirk Drop', desc: 'Zwart, zout en supersnel.', head: 'ruit', body: '#222831', skin: '#2a2a2e', kart: '#33373f', accent: '#ff5fa2' },
  { id: 'fien', name: 'Fien Friet', desc: 'Altijd in een zakje, nooit in de berm.', head: 'friet', body: '#f2b632', skin: '#f6d0a8', kart: '#ffc93c', accent: '#e8423f' },
  { id: 'otto', name: 'Otto Ooievaar', desc: 'Lange snavel, nog langere bochten.', head: 'snavel', body: '#f4f4f4', skin: '#ffffff', kart: '#f2f2f2', accent: '#ff8c1a' },
  { id: 'saar', name: 'Saar Stroopwafel', desc: 'Lekker plakkerig op de baan.', head: 'wafel', body: '#a8662b', skin: '#f3c79b', kart: '#b5702f', accent: '#ffe0a3' },
  { id: 'bram', name: 'Bram Bitterbal', desc: 'Klein, rond en heet van binnen.', head: 'bal', body: '#8a4b1d', skin: '#a35a24', kart: '#9b5523', accent: '#ffe066' },
  { id: 'mo', name: 'Molenaar Mo', desc: 'Draait overal zijn hand voor om.', head: 'molen', body: '#3e8e41', skin: '#e9b48a', kart: '#43a047', accent: '#ffffff' },
  { id: 'tess', name: 'Tess Tulp', desc: 'Bloeit op in de laatste ronde.', head: 'tulp', body: '#e94f9b', skin: '#f7cdb0', kart: '#ff5fae', accent: '#7fd36b' },
  { id: 'gijs', name: 'Gijs Gouda', desc: 'Gatenkaas met een gouden hart.', head: 'kaas', body: '#f5c518', skin: '#f2c09c', kart: '#f7c948', accent: '#ff9f1c' },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
export const DEFAULT_CHARACTER = 'kees';
