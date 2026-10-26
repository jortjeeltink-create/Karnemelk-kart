// Mexen: het dobbelspel, online met iedereen op zijn eigen telefoon.
// Om de beurt gooi je met twee stenen; je laatste worp telt. De eerste van de ronde mag tot drie keer gooien,
// en hoe vaak hij gooit, zo vaak mag de rest ook. 21 is Mex en het hoogst, dan de dubbels (600 tot 100), dan
// 65 tot en met 31. Wie de laagste worp heeft, drinkt; elke Mex in de ronde verdubbelt de slokken. Bij gelijk
// gooien de laagsten nog één keer (afgooien). Wie verloor, begint de volgende ronde.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const MAX_THROWS = 3;
export const STAKES = [1, 2, 3];     // slokken voor wie verliest, vóór het verdubbelen
export const STAKE_DEFAULT = 1;
const LOG_SIZE = 16;

export const isMex = ([a, b]) => (a === 2 && b === 1) || (a === 1 && b === 2);

// Hoe hoog een worp is: Mex boven alles, dan de dubbels, dan hoogste steen × 10 + laagste.
export function score(d) {
  const hi = Math.max(d[0], d[1]), lo = Math.min(d[0], d[1]);
  if (hi === 2 && lo === 1) return 1000;
  if (hi === lo) return hi * 100;
  return hi * 10 + lo;
}
export const scoreName = (d) => score(d) === 1000 ? 'Mex' : String(score(d));

const newPlayer = (name) => ({ name, sips: 0, lost: 0, mex: 0 });
const die = (g) => 1 + Math.floor(rand(g) * 6);

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now(), stake = STAKE_DEFAULT } = {}) {
  return {
    seed: seed >>> 0,
    stake: STAKES.includes(stake) ? stake : STAKE_DEFAULT,
    players: cleanNames(names).map(newPlayer),
    phase: 'gooien',
    round: 0,
    order: [],       // wie er deze ronde gooit, in volgorde
    at: 0,           // wie van `order` er nu aan de beurt is
    max: MAX_THROWS, // zo vaak mag je gooien; de eerste van de ronde bepaalt het
    dice: [],        // per stoel de laatste worp
    count: [],       // per stoel hoe vaak er al gegooid is
    mexes: 0,        // Mexen in deze ronde: elke Mex verdubbelt de slokken
    tie: null,       // afgooien: { order, at, dice }
    loser: -1,
    sips: 0,         // hoeveel slokken de verliezer moest drinken
    log: [],
    seq: 0,
  };
}

// Er schuift iemand aan tijdens het potje: die gooit mee vanaf de volgende ronde.
export function addPlayer(g, name) {
  g.players.push(newPlayer(name));
}

// Een nieuwe ronde met de spelers in `seats` (wie er nu aan tafel zit), te beginnen bij `starter`,
// of bij de eerstvolgende aan tafel als die er niet is.
export function startRound(g, seats, starter) {
  const list = [...new Set(seats)].filter((p) => g.players[p]).sort((a, b) => a - b);
  if (list.length < MIN_PLAYERS) return null;
  let k = list.findIndex((p) => p >= starter);
  if (k < 0) k = 0;
  g.order = [...list.slice(k), ...list.slice(0, k)];
  g.at = 0;
  g.max = MAX_THROWS;
  g.dice = g.players.map(() => null);
  g.count = g.players.map(() => 0);
  g.mexes = 0;
  g.tie = null;
  g.loser = -1;
  g.sips = 0;
  g.phase = 'gooien';
  g.round++;
  return emit(g, { type: 'ronde', round: g.round, starter: g.order[0] });
}

// Wie er nu moet gooien (-1 als niemand: dan is de ronde klaar).
export function thrower(g) {
  if (g.phase === 'gooien') return g.order[g.at];
  if (g.phase === 'afgooien') return g.tie.order[g.tie.at];
  return -1;
}

// Gooien. `d` is alleen voor de tests; aan tafel bepaalt de server de stenen.
export function roll(g, player, d = null) {
  if (player < 0 || player !== thrower(g)) return null;
  if (g.phase === 'gooien' && g.count[player] >= g.max) return null;
  d = d || [die(g), die(g)];
  const mex = isMex(d);
  if (mex) { g.mexes++; g.players[player].mex++; }
  if (g.phase === 'afgooien') {
    // afgooien: iedereen die gelijk stond gooit precies één keer
    g.tie.dice[player] = d;
    const ev = emit(g, { type: 'worp', player, dice: d, mex, tie: true });
    if (++g.tie.at >= g.tie.order.length) settle(g, g.tie.order, g.tie.dice);
    return ev;
  }
  g.dice[player] = d;
  g.count[player]++;
  const ev = emit(g, { type: 'worp', player, dice: d, mex, count: g.count[player], max: g.max });
  // Mex is niet te verbeteren, en na je laatste worp blijf je vanzelf staan
  if (mex || g.count[player] >= g.max) advance(g);
  return ev;
}

// Blijven staan op je laatste worp.
export function stand(g, player) {
  if (g.phase !== 'gooien' || player < 0 || player !== thrower(g) || !g.count[player]) return null;
  const ev = emit(g, { type: 'staan', player, count: g.count[player] });
  advance(g);
  return ev;
}

function advance(g) {
  // de eerste van de ronde bepaalt hoe vaak de rest mag gooien
  if (g.at === 0) g.max = g.count[g.order[0]];
  if (++g.at >= g.order.length) settle(g, g.order, g.dice);
}

// Iedereen heeft gegooid: wie het laagst heeft, drinkt. Staan er meer gelijk, dan afgooien.
function settle(g, who, dice) {
  const low = Math.min(...who.map((p) => score(dice[p])));
  const lowest = who.filter((p) => score(dice[p]) === low);
  if (lowest.length > 1) {
    g.phase = 'afgooien';
    g.tie = { order: lowest, at: 0, dice: {} };
    return emit(g, { type: 'gelijk', players: lowest, score: low });
  }
  const loser = lowest[0];
  g.loser = loser;
  g.sips = g.stake * 2 ** g.mexes;
  g.players[loser].sips += g.sips;
  g.players[loser].lost++;
  g.phase = 'uitslag';
  return emit(g, { type: 'verloren', player: loser, sips: g.sips, mexes: g.mexes, dice: dice[loser] });
}

// Na de uitslag: wie verloor begint de volgende ronde.
export function next(g, seats) {
  if (g.phase !== 'uitslag') return null;
  return startRound(g, seats, g.loser);
}

// De inzet aanpassen kan tussen twee rondes.
export function setStake(g, n) {
  if (!STAKES.includes(n) || g.phase !== 'uitslag') return false;
  g.stake = n;
  return true;
}
