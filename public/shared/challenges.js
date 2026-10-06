// Uitdagingen voor de verliezer. Alles is vrijwillig en kan overgeslagen worden.
export const DEFAULT_CHALLENGE = 'Een atje karnemelk! 🥛';

export const CHALLENGES = [
  DEFAULT_CHALLENGE,
  'Zing het refrein van je favoriete liedje',
  'Doe 10 kniebuigingen',
  'Geef de winnaar een groots compliment',
  'Praat één minuut als een piraat',
  'Laat je beste koeiengeluid horen',
  'Doe een klompendansje',
  'Vertel je slechtste mop',
  'Drink een glas water in één keer leeg',
  'Doe een overwinningsdansje voor de winnaar',
];

export function nextChallenge(current, rand = Math.random) {
  const pool = CHALLENGES.filter((c) => c !== current);
  return pool[Math.floor(rand() * pool.length)];
}

export function cleanChallenge(text) {
  if (typeof text !== 'string') return null;
  const t = text.replace(/\s+/g, ' ').trim().slice(0, 80);
  return t.length >= 2 ? t : null;
}
