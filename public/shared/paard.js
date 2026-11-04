// Paardenrace: het drankspel, online met iedereen op zijn eigen telefoon.
// De vier azen zijn de paarden. Iedereen kiest een paard en zet een aantal slokken in, die hij vooraf drinkt.
// Naast de baan liggen zeven dichte kaarten. Om de beurt trek je een kaart van de stapel: het paard met die
// vorm doet een stap naar voren. Zijn alle paarden langs een dichte kaart, dan gaat die open en moet het paard
// met die vorm een stap terug. Het eerste paard voorbij de zevende kaart wint. Wie op een ander paard zette,
// drinkt zijn eigen inzet nog een keer en de inzet van de winnaar erbij.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { newDeck, shuffle, rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const HORSES = 4;            // de vier azen, in de volgorde van SUITS in bussen.js
export const TRACK = 7;             // zoveel dichte kaarten liggen er naast de baan
export const FINISH = TRACK + 1;    // 0 = start, 1 tot en met 7 = naast die kaart, 8 = over de finish
export const BET_MIN = 1;
export const BET_MAX = 10;
export const BET_DEFAULT = 2;
const LOG_SIZE = 16;

const newPlayer = (name) => ({ name, horse: -1, bet: BET_DEFAULT, ready: false, sips: 0, wins: 0, races: 0 });

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now() } = {}) {
  return {
    seed: seed >>> 0,
    players: cleanNames(names).map(newPlayer),
    phase: 'inzetten',
    race: 0,
    racers: [],      // wie er in deze race meedoet: iedereen die een paard koos en klaar was
    starter: -1,     // wie de vorige race begon; de volgende race begint de speler daarna
    turn: -1,        // wie er nu een kaart trekt
    pos: [0, 0, 0, 0],
    track: [],       // de zeven kaarten naast de baan: { card, open }
    pile: [],        // de stapel waar je van trekt
    last: null,      // de laatst getrokken kaart
    winner: -1,      // het paard dat won
    drinks: [],      // per stoel wat hij na de race drinkt: { own, winner, total } of null
    log: [],
    seq: 0,
  };
}

// Er schuift iemand aan tijdens het potje: die zet in voor de volgende race.
export function addPlayer(g, name) {
  g.players.push(newPlayer(name));
}

// Een paard kiezen, de inzet aanpassen en zeggen dat je klaar bent. Kan alleen tussen twee races.
// horse -1 = nog geen paard; klaar kan pas met een paard.
export function bet(g, player, horse, sips, ready) {
  const p = g.players[player];
  if (g.phase !== 'inzetten' || !p) return null;
  if (!Number.isInteger(horse) || horse < -1 || horse >= HORSES) return null;
  if (!Number.isInteger(sips) || sips < BET_MIN || sips > BET_MAX) return null;
  if (ready && horse < 0) return null;
  p.horse = horse;
  p.bet = sips;
  p.ready = !!ready;
  return true;
}

// Wie er mee zou doen als de race nu begint.
export const readyPlayers = (g) => g.players.flatMap((p, i) => (p.ready && p.horse >= 0 ? [i] : []));

// Is iedereen die aan tafel zit klaar (en zijn het er genoeg)? Dan begint de race vanzelf.
export function autoStart(g, live) {
  if (g.phase !== 'inzetten') return null;
  const here = live.filter((i) => g.players[i]);
  if (!here.length || here.some((i) => !g.players[i].ready)) return null;
  return startRace(g, live);
}

// De eerstvolgende in de race na `from`; liefst iemand die er is (in `live`), anders wie er aan de beurt is.
function nextRacer(g, from, live) {
  const n = g.players.length;
  let fallback = -1;
  for (let k = 1; k <= n; k++) {
    const p = (from + k) % n;
    if (!g.racers.includes(p)) continue;
    if (live.includes(p)) return p;
    if (fallback < 0) fallback = p;
  }
  return fallback;
}

// De race begint met iedereen die klaar is: schudden zonder azen, zeven dichte kaarten naast de baan,
// en iedereen drinkt vooraf zijn inzet.
export function startRace(g, live) {
  if (g.phase !== 'inzetten') return null;
  const racers = readyPlayers(g);
  if (racers.length < MIN_PLAYERS) return null;
  const deck = shuffle(newDeck().filter((c) => c.r !== 14), () => rand(g));
  g.track = deck.slice(0, TRACK).map((card) => ({ card, open: false }));
  g.pile = deck.slice(TRACK);
  g.pos = [0, 0, 0, 0];
  g.racers = racers;
  g.last = null;
  g.winner = -1;
  g.drinks = [];
  g.race++;
  for (const i of racers) {
    g.players[i].sips += g.players[i].bet;
    g.players[i].races++;
  }
  g.turn = nextRacer(g, g.starter < 0 ? g.players.length - 1 : g.starter, live);
  g.starter = g.turn;
  g.phase = 'race';
  return emit(g, { type: 'start', race: g.race, racers: racers.map((i) => ({ player: i, horse: g.players[i].horse, bet: g.players[i].bet })) });
}

// Een kaart van de stapel trekken: dat paard een stap naar voren. Daarna gaan de dichte kaarten open waar
// alle paarden langs zijn, en elk zo'n kaart zet het paard met die vorm een stap terug.
// `card` is alleen voor de tests; aan tafel komt de kaart van de stapel.
export function draw(g, player, live, card = null) {
  if (g.phase !== 'race' || player < 0 || player !== g.turn) return null;
  card = card || g.pile.pop();
  if (!card) return null;
  g.last = card;
  const horse = card.s;
  g.pos[horse]++;
  const ev = emit(g, { type: 'kaart', player, card, horse, to: g.pos[horse] });
  if (g.pos[horse] >= FINISH) {
    finish(g, horse);
    return ev;
  }
  for (let k = g.track.findIndex((t) => !t.open); k >= 0 && Math.min(...g.pos) > k; k = g.track.findIndex((t) => !t.open)) {
    const t = g.track[k];
    t.open = true;
    const back = t.card.s;
    g.pos[back] = Math.max(0, g.pos[back] - 1);
    emit(g, { type: 'terug', index: k, card: t.card, horse: back, to: g.pos[back] });
  }
  g.turn = nextRacer(g, player, live);
  return ev;
}

// Over de finish: wie op dit paard zette, wint. De rest drinkt zijn eigen inzet en de inzet van de winnaar
// (zetten er meer spelers op het winnende paard, dan van allemaal bij elkaar).
function finish(g, horse) {
  const winners = g.racers.filter((i) => g.players[i].horse === horse);
  const pot = winners.reduce((n, i) => n + g.players[i].bet, 0);
  g.winner = horse;
  g.turn = -1;
  g.phase = 'uitslag';
  g.drinks = g.players.map(() => null);
  for (const i of g.racers) {
    const p = g.players[i];
    p.ready = false;
    if (p.horse === horse) {
      p.wins++;
      g.drinks[i] = { own: 0, winner: 0, total: 0 };
    } else {
      const total = p.bet + pot;
      p.sips += total;
      g.drinks[i] = { own: p.bet, winner: pot, total };
    }
  }
  return emit(g, { type: 'finish', horse, winners, pot });
}

// Na de uitslag: weer inzetten. Je paard en je inzet blijven staan, maar je moet opnieuw op klaar tikken.
export function next(g) {
  if (g.phase !== 'uitslag') return null;
  g.phase = 'inzetten';
  g.racers = [];
  g.turn = -1;
  for (const p of g.players) p.ready = false;
  return emit(g, { type: 'inzetten', race: g.race + 1 });
}

// Is wie er moest trekken weg, of kwam er iemand terug? Dan de beurt doorgeven aan iemand die er is.
export function fixTurn(g, live) {
  if (g.phase !== 'race' || live.includes(g.turn)) return false;
  const next = nextRacer(g, g.turn, live);
  if (next < 0 || next === g.turn || !live.includes(next)) return false;
  g.turn = next;
  return true;
}
