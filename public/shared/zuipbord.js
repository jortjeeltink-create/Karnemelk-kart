// Zuipbord: het drankspel op een bord, zoals ganzenbord, online met iedereen op zijn eigen telefoon.
// 48 vakjes van start (0) tot de finish (48). Om de beurt gooi je één steen en loop je zoveel vakjes. Elk vakje heeft
// een opdracht: zelf drinken, uitdelen, iedereen drinkt, je buren drinken, een vraag, een regel, een duel, een
// drinkmaatje kiezen of van plek ruilen. Op een gans loop je nog een keer zoveel vakjes verder, de brug brengt je naar
// 12, in het café sla je een beurt over, in de put zit je vast tot een ander erin valt, het doolhof zet je 5 terug en
// bij de doodskop ga je terug naar start. Je moet precies op de finish komen: gooi je te veel, dan loop je terug.
// Wie als eerste op de finish staat, wint en mag een bak uitdelen: iemand drinkt zijn glas leeg. Wie dan het verst
// achter staat, drinkt er 5.
// Heb je een drinkmaatje, dan drinkt die mee als jij moet drinken (behalve als iedereen drinkt: dan al).
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const SIZE = 48;
export const BRIDGE_TO = 12;
export const MAZE_BACK = 5;
export const AD_SIPS = 5;      // een ad fundum (of een bak) telt in de stand als 5 slokken
export const LAST_SIPS = 5;    // wie het verst achter staat als iemand wint
const LOG_SIZE = 20;

// Het bord, vakje voor vakje. t: de soort, n: hoeveel slokken.
export const BOARD = [
  { t: 'start' },
  { t: 'drink', n: 1 }, { t: 'geef', n: 2 }, { t: 'vraag' }, { t: 'iedereen', n: 1 }, { t: 'gans' }, { t: 'brug' },
  { t: 'drink', n: 2 }, { t: 'maatje' }, { t: 'vraag' }, { t: 'duel', n: 3 }, { t: 'buren', n: 1 }, { t: 'geef', n: 3 },
  { t: 'regel' }, { t: 'gans' }, { t: 'drink', n: 2 }, { t: 'vraag' }, { t: 'iedereen', n: 2 }, { t: 'dubbel', n: 4 },
  { t: 'cafe', n: 2 }, { t: 'geef', n: 2 }, { t: 'vraag' }, { t: 'laatste', n: 2 }, { t: 'gans' }, { t: 'drink', n: 3 },
  { t: 'ruil' }, { t: 'vraag' }, { t: 'buren', n: 2 }, { t: 'rust' }, { t: 'geef', n: 3 }, { t: 'duel', n: 3 },
  { t: 'put' }, { t: 'gans' }, { t: 'iedereen', n: 2 }, { t: 'vraag' }, { t: 'drink', n: 2 }, { t: 'maatje' },
  { t: 'regel' }, { t: 'dubbel', n: 4 }, { t: 'vraag' }, { t: 'geef', n: 4 }, { t: 'gans' }, { t: 'doolhof' },
  { t: 'iedereen', n: 3 }, { t: 'vraag' }, { t: 'drink', n: 3 }, { t: 'dood', n: 3 }, { t: 'ad' }, { t: 'finish' },
];
// vakjes waarop je iemand kiest (en de bak van de winnaar)
export const CHOOSE = ['geef', 'maatje', 'duel', 'ruil', 'bak'];

// Vragen: wie het is, drinkt (dat weet de telefoon niet, dus dat doe je zelf).
export const VRAGEN = [
  'Wie het laatst op vakantie was, drinkt 2.',
  'Iedereen met een bril of lenzen drinkt 1.',
  'De jongste aan tafel drinkt 2.',
  'Wie single is, drinkt 2.',
  'Wie een tattoo heeft, drinkt 1.',
  'Wie ooit een verkeersboete kreeg, drinkt 2.',
  'Wie het laatst een ex appte, drinkt 3.',
  'Wie als laatste binnenkwam, drinkt 2.',
  'Wie ooit voor een examen zakte, drinkt 2.',
  'De langste aan tafel drinkt 2.',
  'Iedereen in iets zwarts drinkt 1.',
  'Wie een huisdier heeft, drinkt 1.',
  'Wie nog bij zijn ouders woont, drinkt 2.',
  'Wie dit jaar op een festival was, drinkt 2.',
  'Wie vandaag nog niks heeft gegeten, drinkt 1. En ga daarna wat eten.',
  'Wie het oudst is, drinkt 2.',
  'Wie ooit is ingeslapen in de trein of bus, drinkt 2.',
  'Wie een broer of zus heeft, drinkt 1.',
  'Wie deze week nog sportte, deelt 2 slokken uit.',
  'Wie ooit iemand heeft gezoend aan deze tafel, drinkt 3.',
  'Zeg iets liefs over de speler links van je, of drink 2.',
  'Noem 5 automerken in 10 seconden, of drink 2.',
  'Doe een dansje van 5 seconden, of drink 3.',
  'Proost met degene tegenover je. Jullie drinken allebei 1.',
  'Iedereen die zijn telefoon in een hoesje heeft, drinkt 1.',
  'Wie het eerst zijn neus aanraakt, mag 2 uitdelen. De laatste drinkt 2.',
  'Waterval: iedereen drinkt mee tot de speler links van jou stopt.',
  'Wie de meeste slokken heeft gehad, mag 3 uitdelen.',
  'Iedereen met blauwe ogen drinkt 1.',
  'Wie het laatst gehuild heeft bij een film, drinkt 2.',
  'Vertel een gênant verhaal, of drink 3.',
  'Wie het eerst "proost" roept, deelt 2 uit.',
  'Wie ooit een feestje te vroeg verliet, drinkt 2.',
  'Iedereen die vandaag gewerkt of gestudeerd heeft, drinkt 1.',
  'Wie het verst weg woont, drinkt 2.',
  'Speel steen-papier-schaar met de speler rechts van je. De verliezer drinkt 2.',
];
// Regels: de speler bedenkt een regel die blijft tot het einde van het potje (hier een voorbeeld).
export const REGELS = [
  'Niemand mag nog "drinken" zeggen.',
  'Je drinkt alleen nog met je linkerhand.',
  'Voor je drinkt, zeg je "proost" tegen iemand.',
  'Niemand mag nog iemand bij zijn naam noemen.',
  'Wie een 6 gooit, mag 1 slok uitdelen.',
  'Elke keer dat iemand lacht om zijn eigen grap, drinkt hij 1.',
  'Wie op zijn telefoon kijkt terwijl een ander gooit, drinkt 1.',
  'Je mag niet meer naar het glas van een ander wijzen.',
  'Wie vloekt, drinkt 1.',
  'Zeg voor je gooit iets wat rijmt op je naam.',
];

const newPlayer = (name) => ({ name, pos: 0, sips: 0, wins: 0, skip: 0, stuck: false, buddy: -1, turns: 0 });

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
    phase: 'gooien',    // gooien: wie aan de beurt is gooit; kiezen: hij kiest iemand; klaar: er is een winnaar
    round: 1,
    turn: -1,
    pending: null,      // bij kiezen: { kind, n }
    winner: -1,
    log: [],
    seq: 0,
  };
}

// Er schuift iemand aan tijdens het potje: die begint op start.
export function addPlayer(g, name) {
  g.players.push(newPlayer(name));
}

const die = (g) => 1 + Math.floor(rand(g) * 6);
const uniq = (live) => [...new Set(live)].filter((p) => Number.isInteger(p));

// De eerstvolgende aan tafel na `from` die er is (in `live`); -1 als er niemand is.
function nextAfter(g, from, live) {
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const p = (from + k) % n;
    if (live.includes(p)) return p;
  }
  return -1;
}

function giveTurn(g, to) {
  g.turn = to;
  g.phase = 'gooien';
  g.pending = null;
  return emit(g, { type: 'beurt', to });
}

// De beurt naar de volgende die mag gooien: wie een beurt moet overslaan of in de put zit, slaat over.
function passTurn(g, live) {
  const n = g.players.length;
  let cur = g.turn;
  for (let guard = 0; guard < n * 4; guard++) {
    cur = nextAfter(g, cur, live);
    if (cur < 0) return null;
    const p = g.players[cur];
    if (p.stuck) {
      // zit iedereen die er is vast? Dan komt de eerste vanzelf weer los
      if (live.every((q) => g.players[q].stuck || q === cur)) { p.stuck = false; return giveTurn(g, cur); }
      continue;
    }
    if (p.skip > 0) {
      p.skip--;
      emit(g, { type: 'overslaan', player: cur });
      continue;
    }
    return giveTurn(g, cur);
  }
  return giveTurn(g, nextAfter(g, g.turn, live));
}

// De eerste beurt: `starter` als die er is, anders de eerstvolgende.
export function begin(g, live, starter) {
  const list = uniq(live).filter((p) => g.players[p]);
  if (list.length < MIN_PLAYERS) return null;
  return giveTurn(g, list.includes(starter) ? starter : nextAfter(g, starter, list));
}

// Iemand drinkt; zijn drinkmaatje drinkt mee. Geeft de lijst terug van wie hoeveel drinkt.
function drink(g, p, n, out = [], buddy = true) {
  g.players[p].sips += n;
  out.push([p, n]);
  const b = g.players[p].buddy;
  if (buddy && b >= 0 && b !== p && g.players[b]) {
    g.players[b].sips += n;
    out.push([b, n, 'maatje']);
  }
  return out;
}

// Lopen van `from` met `v` ogen; voorbij de finish loop je terug. Geeft de vakjes die je langsgaat.
function walk(from, v) {
  const path = [];
  let at = from, dir = 1;
  for (let k = 0; k < v; k++) {
    if (at === SIZE) dir = -1;
    at += dir;
    path.push(at);
  }
  return path;
}

// Gooien en lopen (value is alleen voor de tests).
export function roll(g, player, live, value) {
  if (g.phase !== 'gooien' || player < 0 || player !== g.turn) return null;
  const p = g.players[player];
  const v = Number.isInteger(value) && value >= 1 && value <= 6 ? value : die(g);
  const from = p.pos, path = walk(from, v);
  p.pos = path[path.length - 1];
  p.turns++;
  const ev = emit(g, { type: 'worp', player, v, from, to: p.pos, path });
  land(g, player, v, uniq(live), 0);
  return ev;
}

// Wat er gebeurt op het vakje waar je staat.
function land(g, player, v, live, depth) {
  const p = g.players[player], at = p.pos, sq = BOARD[at];
  const base = { type: 'vak', player, at, t: sq.t };
  const others = live.filter((q) => q !== player);
  const done = (extra = {}) => { emit(g, { ...base, ...extra }); return passTurn(g, live); };
  switch (sq.t) {
    case 'drink': return done({ n: sq.n, drinks: drink(g, player, sq.n) });
    case 'iedereen': {
      const drinks = [];
      for (const q of live) drink(g, q, sq.n, drinks, false);
      return done({ n: sq.n, drinks });
    }
    case 'buren': {
      const left = nextAfter(g, player, others), right = (() => { const n = g.players.length; for (let k = 1; k <= n; k++) { const q = (player - k + n * 2) % n; if (others.includes(q)) return q; } return -1; })();
      const drinks = [];
      for (const q of new Set([left, right].filter((x) => x >= 0))) drink(g, q, sq.n, drinks);
      return done({ n: sq.n, drinks });
    }
    case 'laatste': {
      const min = Math.min(...live.map((q) => g.players[q].pos));
      const drinks = [];
      for (const q of live) if (g.players[q].pos === min) drink(g, q, sq.n, drinks);
      return done({ n: sq.n, drinks });
    }
    case 'gans':
    case 'brug': {
      // op de gans nog een keer zoveel ogen verder; de brug brengt je naar 12
      if (depth >= 3) return done();
      const path = sq.t === 'gans' ? walk(at, v) : [BRIDGE_TO];
      p.pos = path[path.length - 1];
      emit(g, { ...base, from: at, to: p.pos, path });
      return land(g, player, v, live, depth + 1);
    }
    case 'doolhof': {
      p.pos = Math.max(0, at - MAZE_BACK);
      return done({ from: at, to: p.pos });
    }
    case 'dood': {
      p.pos = 0;
      return done({ from: at, to: 0, n: sq.n, drinks: drink(g, player, sq.n) });
    }
    case 'cafe': {
      p.skip = 1;
      return done({ n: sq.n, drinks: drink(g, player, sq.n) });
    }
    case 'put': {
      // wie er al in zat, is vrij; nu zit jij erin
      const freed = g.players.flatMap((x, i) => (x.stuck && i !== player ? [i] : []));
      for (const i of freed) g.players[i].stuck = false;
      p.stuck = true;
      return done({ freed });
    }
    case 'vraag': return done({ i: Math.floor(rand(g) * VRAGEN.length) });
    case 'regel': return done({ i: Math.floor(rand(g) * REGELS.length) });
    case 'dubbel': {
      // even: de rest drinkt 2, oneven: jij drinkt 4
      const r = die(g), drinks = [];
      if (r % 2 === 0) for (const q of others) drink(g, q, sq.n / 2, drinks);
      else drink(g, player, sq.n, drinks);
      return done({ n: sq.n, r, drinks });
    }
    case 'ad': return done({ drinks: drink(g, player, AD_SIPS) });
    case 'finish': return finish(g, player, live, base);
    case 'geef': case 'maatje': case 'duel': case 'ruil': {
      if (!others.length) return done();
      emit(g, { ...base, n: sq.n });
      g.phase = 'kiezen';
      g.pending = { kind: sq.t, n: sq.n || 0 };
      return true;
    }
    default: return done();   // start en rust: niks
  }
}

// Wie aan de beurt is kiest iemand: om te laten drinken, als drinkmaatje, voor een duel, om mee te ruilen, of (de
// winnaar) wie er een bak trekt.
export function choose(g, player, target, live) {
  live = uniq(live);
  if (g.phase !== 'kiezen' || player < 0 || player !== g.turn || target === player || !live.includes(target) || !g.players[target]) return null;
  const { kind, n } = g.pending, p = g.players[player], q = g.players[target];
  const ev = { type: 'keuze', player, target, kind, n };
  if (kind === 'geef') ev.drinks = drink(g, target, n);
  else if (kind === 'maatje') p.buddy = target;
  else if (kind === 'duel') {
    // allebei gooien; de laagste drinkt, bij gelijk drinken ze er allebei 1
    const a = die(g), b = die(g), drinks = [];
    if (a === b) { drink(g, player, 1, drinks); drink(g, target, 1, drinks); }
    else drink(g, a < b ? player : target, n, drinks);
    Object.assign(ev, { a, b, drinks });
  } else if (kind === 'ruil') {
    [p.pos, q.pos] = [q.pos, p.pos];
    [p.stuck, q.stuck] = [q.stuck, p.stuck];
  } else if (kind === 'bak') ev.drinks = drink(g, target, AD_SIPS);
  g.pending = null;
  emit(g, ev);
  if (kind === 'bak') end(g, player, live);
  else passTurn(g, live);
  return ev;
}

// Op de finish: gewonnen. De winnaar kiest eerst wie er een bak trekt (als er iemand anders is).
function finish(g, player, live, base) {
  g.players[player].wins++;
  g.winner = player;
  emit(g, { ...base });
  if (!live.some((q) => q !== player)) return end(g, player, live);
  g.phase = 'kiezen';
  g.pending = { kind: 'bak', n: AD_SIPS };
  return true;
}

// Het potje is klaar: wie het verst achter staat, drinkt.
function end(g, player, live) {
  const others = live.filter((q) => q !== player);
  const drinks = [];
  if (others.length) {
    const min = Math.min(...others.map((q) => g.players[q].pos));
    for (const q of others) if (g.players[q].pos === min) drink(g, q, LAST_SIPS, drinks);
  }
  g.phase = 'klaar';
  g.pending = null;
  return emit(g, { type: 'klaar', winner: player, drinks, round: g.round });
}

// Nog een potje: iedereen terug naar start, de stand blijft. Na de winnaar is de volgende aan de beurt.
export function next(g, live) {
  if (g.phase !== 'klaar') return null;
  const list = uniq(live).filter((p) => g.players[p]);
  if (list.length < MIN_PLAYERS) return null;
  for (const p of g.players) Object.assign(p, { pos: 0, skip: 0, stuck: false, buddy: -1, turns: 0 });
  g.round++;
  g.winner = -1;
  emit(g, { type: 'nieuw', round: g.round });
  return giveTurn(g, nextAfter(g, g.turn, list));
}

// Is wie aan de beurt is weg? Moest hij nog iemand kiezen, dan kiest de telefoon; daarna is de volgende aan de beurt.
export function fixTurn(g, live) {
  live = uniq(live);
  if (g.phase === 'klaar' || live.includes(g.turn)) return false;
  if (!live.length) return false;
  if (g.phase === 'kiezen') {
    const options = live.filter((q) => q !== g.turn);
    if (options.length) return !!choose(g, g.turn, options[Math.floor(rand(g) * options.length)], live);
  }
  return !!passTurn(g, live);
}
