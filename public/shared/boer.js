// Boer zoekt vrouw: het drankspel, online met iedereen op zijn eigen telefoon.
// Iedereen krijgt een kaart. Wie de boer trekt, begint wanneer hij wil met tellen, met zijn ogen dicht.
// Wie de vrouw trekt, drinkt intussen zo snel mogelijk een glas leeg. Daarna raadt de boer wie de vrouw was:
// goed geraden, dan drinkt de vrouw ook het tweede glas; fout, dan drinkt de boer het.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { newDeck, shuffle, rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 3;          // met z'n tweeën weet de boer meteen wie de vrouw is
export const MAX_PLAYERS = 10;
export const COUNTS = [6, 7, 8, 10];   // zoveel seconden telt de boer; de host kan het aanpassen
export const COUNT_DEFAULT = 8;
export const BOER = 11;
export const VROUW = 12;
// een gok mag zoveel eerder binnenkomen dan de tijd om is: de klok van een telefoon loopt nooit precies gelijk
export const GUESS_EARLY_MS = 600;
const LOG_SIZE = 12;

const newPlayer = (name) => ({ name, atjes: 0, boer: 0, vrouw: 0, raak: 0 });

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now(), count = COUNT_DEFAULT } = {}) {
  return {
    seed: seed >>> 0,
    count: COUNTS.includes(count) ? count : COUNT_DEFAULT,
    players: cleanNames(names).map(newPlayer),
    phase: 'kaarten',
    round: 0,
    in: [],          // wie er deze ronde een kaart heeft
    cards: [],       // de kaart per stoel (null voor wie niet meedoet)
    boer: -1,
    vrouw: -1,
    guess: -1,       // op wie de boer wees
    endsAt: 0,       // wanneer het tellen klaar is
    log: [],
    seq: 0,
  };
}

// Er schuift iemand aan tijdens het potje: die krijgt een kaart vanaf de volgende ronde.
export function addPlayer(g, name) {
  g.players.push(newPlayer(name));
}

// Schudden en delen aan de spelers in `seats` (wie er nu aan tafel zit): één boer, één vrouw en de rest gewone
// kaarten. Kan aan het begin, na een uitslag, en opnieuw zolang de boer nog niet telt.
export function deal(g, seats) {
  if (g.phase === 'tellen') return null;
  const list = [...new Set(seats)].filter((p) => g.players[p]);
  if (list.length < MIN_PLAYERS) return null;
  const deck = shuffle(newDeck(), () => rand(g));
  const plain = deck.filter((c) => c.r !== BOER && c.r !== VROUW).slice(0, list.length - 2);
  const hand = shuffle([deck.find((c) => c.r === BOER), deck.find((c) => c.r === VROUW), ...plain], () => rand(g));
  g.cards = g.players.map(() => null);
  list.forEach((p, k) => { g.cards[p] = hand[k]; });
  g.in = list;
  g.boer = list[hand.findIndex((c) => c.r === BOER)];
  g.vrouw = list[hand.findIndex((c) => c.r === VROUW)];
  g.round++;
  g.phase = 'kaarten';
  g.guess = -1;
  g.endsAt = 0;
  return emit(g, { type: 'delen', round: g.round });
}

// De boer begint te tellen; vanaf nu moet de vrouw drinken.
export function startCount(g, player, now) {
  if (g.phase !== 'kaarten' || player !== g.boer) return null;
  g.phase = 'tellen';
  g.endsAt = now + g.count * 1000;
  return emit(g, { type: 'tellen', boer: player, count: g.count });
}

export const timeLeft = (g, now) => g.phase === 'tellen' ? Math.max(0, g.endsAt - now) : 0;

// Na het tellen wijst de boer aan wie volgens hem de vrouw is.
export function guess(g, player, target, now) {
  if (g.phase !== 'tellen' || player !== g.boer || now < g.endsAt - GUESS_EARLY_MS) return null;
  if (!g.in.includes(target) || target === g.boer) return null;
  const ok = target === g.vrouw;
  const b = g.players[g.boer], v = g.players[g.vrouw];
  b.boer++;
  v.vrouw++;
  v.atjes++;                                   // het eerste glas, tijdens het tellen
  if (ok) { v.atjes++; b.raak++; } else b.atjes++;   // het tweede glas
  g.guess = target;
  g.phase = 'uitslag';
  return emit(g, { type: 'raden', boer: g.boer, target, vrouw: g.vrouw, ok });
}

// De tijd voor het tellen aanpassen, als acht seconden te lang of te kort blijkt. Niet terwijl de boer telt.
export function setCount(g, n) {
  if (!COUNTS.includes(n) || g.phase === 'tellen') return false;
  g.count = n;
  return true;
}
