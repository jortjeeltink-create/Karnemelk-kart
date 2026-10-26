// Namen en teksten die spelers zelf kiezen, ziet iedereen aan tafel. Grove, beledigende of seksuele woorden weigeren
// we (de Play Store eist dat zulke tekst van spelers wordt tegengehouden). Een korte lijst, met de gebruikelijke trucjes
// eruit gehaald: hoofdletters, cijfers voor letters (3 = e, 0 = o, ...) en tekens of spaties ertussen.

// Lange woorden die bijna nooit per ongeluk in een gewone naam zitten: overal in de tekst verboden.
const ANYWHERE = [
  'kanker', 'tyfus', 'tiefus', 'klerelijer', 'hoer', 'neuk', 'fuck', 'shit', 'bitch', 'cunt',
  'nigger', 'nigga', 'neger', 'flikker', 'mongool', 'retard', 'hitler', 'porn', 'penis', 'vagina', 'pussy',
  'kutwijf', 'teringlijer', 'kankerlijer', 'godver', 'klootzak', 'lul', 'motherfucker', 'whore', 'slut', 'faggot',
];
// Korte woorden die ook in gewone namen kunnen zitten: alleen als los woord verboden.
const WORDS = new Set(['kut', 'tering', 'pik', 'kk', 'sex', 'seks', 'cock', 'anus', 'slet', 'nazi', 'homo', 'jood', 'tyf']);
// 'lul' staat bij ANYWHERE maar zit ook in gewone woorden; die laten we toe
const ALLOWED = ['lulu'];

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's', '!': 'i', '|': 'i' };

const fold = (s) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[0-9@$!|]/g, (c) => LEET[c] ?? c);

// true als de tekst een verboden woord bevat
export function isOffensive(text) {
  if (typeof text !== 'string' || !text) return false;
  const f = fold(text);
  const words = f.split(/[^a-z]+/).filter(Boolean);
  if (words.some((w) => WORDS.has(w))) return true;
  // alle letters aan elkaar ("f.u.c.k", "k a n k e r"), en dubbele letters één keer ("fuuuck")
  const glued = words.join('');
  const squeezed = glued.replace(/(.)\1+/g, '$1');
  return ANYWHERE.some((bad) => [glued, squeezed].some((t) => t.includes(bad) && !ALLOWED.some((ok) => t.includes(ok) && ok.includes(bad))));
}

export const OFFENSIVE_MSG = 'Die naam mag niet: kies een nette naam. Anderen aan tafel zien hem.';
