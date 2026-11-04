// Borrelbord (eerst Zuipbord): het partyspel op een bord, zoals ganzenbord, online met iedereen op zijn eigen telefoon.
// 48 vakjes van start (0) tot de finish (48). Om de beurt gooi je één steen en loop je zoveel vakjes. Elk vakje heeft
// een opdracht: zelf strafpunten, uitdelen, iedereen krijgt er een, je buren, een vraag, een regel, een duel, dubbel of
// niks, een maatje kiezen of van plek ruilen. Op een gans loop je nog een keer zoveel vakjes verder, de brug brengt je
// naar 12, in het café sla je een beurt over, in de put zit je vast tot een ander erin valt, het doolhof zet je 5 terug
// en bij de doodskop ga je terug naar start. Gooi je verder dan de finish, dan sta je er ook op. Bij een duel gooien
// jullie allebei zelf (bij gelijk nog een keer); bij dubbel of niks gooi je zelf nog een keer.
// Er zijn drie versies, de host kiest:
// - licht: zo'n 10 strafpunten per speler en geen mega strafpunten. De winnaar kiest wie er 3 krijgt, de laatste krijgt er 2.
// - middel: zo'n 15 per speler. Vakje 47 is een mega strafpunt, de winnaar deelt er een uit en de laatste krijgt er 3.
// - extreem: zo'n 25 per speler. Mega strafpunten op 24 en 47, de doodskop kost er ook een, de winnaar deelt er een
//   uit en de laatste krijgt er een.
// Strafpunten en mega strafpunten worden apart geteld (sips en megas).
// Heb je een maatje, dan krijgt die mee als jij iets krijgt (behalve als iedereen iets krijgt: dan al).
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const SIZE = 48;
export const BRIDGE_TO = 12;
export const MAZE_BACK = 5;
export const LAST_SIPS = 3;    // middel: wie het verst achter staat als iemand wint
export const WIN_SIPS = 3;     // licht: zoveel deelt de winnaar uit
export const MODES = ['licht', 'middel', 'extreem'];
export const MODE_DEFAULT = 'middel';
const LOG_SIZE = 20;

// Licht: zo'n 10 strafpunten per speler per potje, zonder mega strafpunten.
export const BOARD_LICHT = [
  { t: 'start' },
  { t: 'drink', n: 1 }, { t: 'geef', n: 1 }, { t: 'vraag' }, { t: 'rust' }, { t: 'gans' }, { t: 'brug' },
  { t: 'drink', n: 1 }, { t: 'maatje' }, { t: 'vraag' }, { t: 'duel', n: 2 }, { t: 'buren', n: 1 }, { t: 'geef', n: 1 },
  { t: 'regel' }, { t: 'gans' }, { t: 'drink', n: 1 }, { t: 'vraag' }, { t: 'iedereen', n: 1 }, { t: 'dubbel', n: 2 },
  { t: 'cafe', n: 1 }, { t: 'geef', n: 1 }, { t: 'vraag' }, { t: 'laatste', n: 1 }, { t: 'gans' }, { t: 'drink', n: 1 },
  { t: 'ruil' }, { t: 'vraag' }, { t: 'buren', n: 1 }, { t: 'rust' }, { t: 'regel' }, { t: 'duel', n: 2 },
  { t: 'put' }, { t: 'gans' }, { t: 'regel' }, { t: 'vraag' }, { t: 'drink', n: 1 }, { t: 'ruil' },
  { t: 'rust' }, { t: 'vraag' }, { t: 'drink', n: 1 }, { t: 'geef', n: 1 }, { t: 'gans' }, { t: 'doolhof' },
  { t: 'rust' }, { t: 'vraag' }, { t: 'rust' }, { t: 'dood', n: 1 }, { t: 'drink', n: 2 }, { t: 'finish' },
];
// Middel: het oude bord, vakje voor vakje. t: de soort, n: hoeveel strafpunten. 'mega' is een mega strafpunt.
export const BOARD = [
  { t: 'start' },
  { t: 'drink', n: 1 }, { t: 'geef', n: 1 }, { t: 'vraag' }, { t: 'rust' }, { t: 'gans' }, { t: 'brug' },
  { t: 'drink', n: 1 }, { t: 'maatje' }, { t: 'vraag' }, { t: 'duel', n: 2 }, { t: 'buren', n: 1 }, { t: 'geef', n: 2 },
  { t: 'regel' }, { t: 'gans' }, { t: 'drink', n: 2 }, { t: 'vraag' }, { t: 'iedereen', n: 1 }, { t: 'dubbel', n: 3 },
  { t: 'cafe', n: 1 }, { t: 'geef', n: 2 }, { t: 'vraag' }, { t: 'laatste', n: 2 }, { t: 'gans' }, { t: 'drink', n: 2 },
  { t: 'ruil' }, { t: 'vraag' }, { t: 'buren', n: 1 }, { t: 'rust' }, { t: 'geef', n: 2 }, { t: 'duel', n: 2 },
  { t: 'put' }, { t: 'gans' }, { t: 'regel' }, { t: 'vraag' }, { t: 'drink', n: 2 }, { t: 'maatje' },
  { t: 'rust' }, { t: 'vraag' }, { t: 'drink', n: 1 }, { t: 'geef', n: 3 }, { t: 'gans' }, { t: 'doolhof' },
  { t: 'iedereen', n: 1 }, { t: 'vraag' }, { t: 'drink', n: 2 }, { t: 'dood', n: 2 }, { t: 'mega' }, { t: 'finish' },
];
// Extreem: overal meer, mega strafpunten op 24 en 47, en de doodskop kost je een mega strafpunt (mega: true).
export const BOARD_EXTREEM = [
  { t: 'start' },
  { t: 'drink', n: 2 }, { t: 'geef', n: 2 }, { t: 'vraag' }, { t: 'drink', n: 1 }, { t: 'gans' }, { t: 'brug' },
  { t: 'drink', n: 2 }, { t: 'maatje' }, { t: 'vraag' }, { t: 'duel', n: 3 }, { t: 'buren', n: 2 }, { t: 'geef', n: 3 },
  { t: 'regel' }, { t: 'gans' }, { t: 'drink', n: 3 }, { t: 'vraag' }, { t: 'iedereen', n: 2 }, { t: 'dubbel', n: 4 },
  { t: 'cafe', n: 2 }, { t: 'geef', n: 3 }, { t: 'vraag' }, { t: 'laatste', n: 3 }, { t: 'gans' }, { t: 'mega' },
  { t: 'ruil' }, { t: 'vraag' }, { t: 'buren', n: 2 }, { t: 'drink', n: 2 }, { t: 'geef', n: 3 }, { t: 'duel', n: 3 },
  { t: 'put' }, { t: 'gans' }, { t: 'regel' }, { t: 'vraag' }, { t: 'drink', n: 3 }, { t: 'maatje' },
  { t: 'iedereen', n: 2 }, { t: 'vraag' }, { t: 'drink', n: 2 }, { t: 'geef', n: 4 }, { t: 'gans' }, { t: 'doolhof' },
  { t: 'iedereen', n: 2 }, { t: 'vraag' }, { t: 'drink', n: 3 }, { t: 'dood', n: 3, mega: true }, { t: 'mega' }, { t: 'finish' },
];
// per versie: het bord, wat de winnaar uitdeelt (een mega strafpunt, of kies wie er 3 krijgt) en wat de laatste krijgt
export const RULES = {
  licht: { board: BOARD_LICHT, win: { kind: 'winst', n: WIN_SIPS }, last: { n: 2 } },
  middel: { board: BOARD, win: { kind: 'mega', n: 1 }, last: { n: LAST_SIPS } },
  extreem: { board: BOARD_EXTREEM, win: { kind: 'mega', n: 1 }, last: { mega: true } },
};
export const rulesOf = (mode) => RULES[mode] || RULES[MODE_DEFAULT];
export const boardOf = (mode) => rulesOf(mode).board;
// vakjes waarop je iemand kiest (en wie de winnaar iets geeft)
export const CHOOSE = ['geef', 'maatje', 'duel', 'ruil', 'mega', 'winst'];

// Vragen: wie het is, krijgt strafpunten (dat weet de telefoon niet, dus dat doe je zelf).
export const VRAGEN = [
  'Wie het laatst op vakantie was, krijgt er 2.',
  'Iedereen met een bril of lenzen krijgt er 1.',
  'De jongste aan tafel krijgt er 2.',
  'Wie single is, krijgt er 2.',
  'Wie een tattoo heeft, krijgt er 1.',
  'Wie ooit een verkeersboete kreeg, krijgt er 2.',
  'Wie het laatst een ex appte, krijgt er 2.',
  'Wie als laatste binnenkwam, krijgt er 2.',
  'Wie ooit voor een examen zakte, krijgt er 2.',
  'De langste aan tafel krijgt er 2.',
  'Iedereen in iets zwarts krijgt er 1.',
  'Wie een huisdier heeft, krijgt er 1.',
  'Wie nog bij zijn ouders woont, krijgt er 2.',
  'Wie dit jaar op een festival was, krijgt er 2.',
  'Wie vandaag nog niks heeft gegeten, krijgt er 1. En ga daarna wat eten.',
  'Wie het oudst is, krijgt er 2.',
  'Wie ooit is ingeslapen in de trein of bus, krijgt er 2.',
  'Wie een broer of zus heeft, krijgt er 1.',
  'Wie deze week nog sportte, deelt 2 strafpunten uit.',
  'Wie ooit iemand heeft gezoend aan deze tafel, krijgt er 2.',
  'Zeg iets liefs over de speler links van je, of neem er 2.',
  'Noem 5 automerken in 10 seconden, of neem er 2.',
  'Doe een dansje van 5 seconden, of neem er 2.',
  'Proost met degene tegenover je. Jullie krijgen er allebei 1.',
  'Iedereen die zijn telefoon in een hoesje heeft, krijgt er 1.',
  'Wie het eerst zijn neus aanraakt, mag 2 uitdelen. De laatste krijgt er 2.',
  'Iedereen die vandaag water heeft gedronken, mag 1 uitdelen.',
  'Wie de meeste strafpunten heeft, mag er 2 uitdelen.',
  'Iedereen met blauwe ogen krijgt er 1.',
  'Wie het laatst gehuild heeft bij een film, krijgt er 2.',
  'Vertel een gênant verhaal, of neem er 2.',
  'Wie het eerst "proost" roept, deelt 2 uit.',
  'Wie ooit een feestje te vroeg verliet, krijgt er 2.',
  'Iedereen die vandaag gewerkt of gestudeerd heeft, krijgt er 1.',
  'Wie het verst weg woont, krijgt er 2.',
  'Speel steen-papier-schaar met de speler rechts van je. De verliezer krijgt er 2.',
];
// Regels: de speler bedenkt een regel die blijft tot het einde van het potje (hier een voorbeeld).
export const REGELS = [
  'Niemand mag nog "strafpunt" zeggen.',
  'Je pakt je telefoon alleen nog met je linkerhand.',
  'Voor je een strafpunt wegwerkt, zeg je "proost" tegen iemand.',
  'Niemand mag nog iemand bij zijn naam noemen.',
  'Wie een 6 gooit, mag 1 strafpunt uitdelen.',
  'Elke keer dat iemand lacht om zijn eigen grap, krijgt hij er 1.',
  'Wie op zijn telefoon kijkt terwijl een ander gooit, krijgt er 1.',
  'Je mag niet meer naar het glas van een ander wijzen.',
  'Wie vloekt, krijgt er 1.',
  'Zeg voor je gooit iets wat rijmt op je naam.',
];

const newPlayer = (name) => ({ name, pos: 0, sips: 0, megas: 0, wins: 0, skip: 0, stuck: false, buddy: -1, turns: 0 });

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now(), mode = MODE_DEFAULT } = {}) {
  return {
    seed: seed >>> 0,
    mode: MODES.includes(mode) ? mode : MODE_DEFAULT,
    players: cleanNames(names).map(newPlayer),
    // gooien: wie aan de beurt is gooit; kiezen: hij kiest iemand; duel: twee spelers gooien allebei;
    // dubbel: wie aan de beurt is gooit nog een keer (dubbel of niks); klaar: er is een winnaar
    phase: 'gooien',
    round: 1,
    turn: -1,
    pending: null,      // bij kiezen en dubbel: { kind, n }
    duel: null,         // bij een duel: { a, b, ra, rb, n } (ra/rb: wat ze gooiden, null als nog niet)
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
  g.duel = null;
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

// Iemand krijgt strafpunten; zijn maatje krijgt ze ook. Geeft de lijst terug van wie hoeveel krijgt.
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

// Iemand krijgt een mega strafpunt; zijn maatje krijgt er ook een. Geeft de lijst terug: [[speler, 1], [maatje, 1, 'maatje']].
function mega(g, p, out = []) {
  g.players[p].megas++;
  out.push([p, 1]);
  const b = g.players[p].buddy;
  if (b >= 0 && b !== p && g.players[b]) {
    g.players[b].megas++;
    out.push([b, 1, 'maatje']);
  }
  return out;
}

// Lopen van `from` met `v` ogen; op de finish stop je. Geeft de vakjes die je langsgaat.
function walk(from, v) {
  const path = [];
  for (let at = from + 1; at <= Math.min(from + v, SIZE); at++) path.push(at);
  return path;
}

// Wie bij een duel nog moet gooien.
export function duelWaiting(g) {
  const d = g.duel;
  if (g.phase !== 'duel' || !d) return [];
  return [d.ra == null ? d.a : -1, d.rb == null ? d.b : -1].filter((p) => p >= 0);
}

// Gooien (value is alleen voor de tests): om te lopen, voor dubbel of niks, of voor een duel.
export function roll(g, player, live, value) {
  live = uniq(live);
  const v = Number.isInteger(value) && value >= 1 && value <= 6 ? value : die(g);
  if (g.phase === 'duel') return duelRoll(g, player, live, v);
  if (g.phase === 'dubbel') return doubleRoll(g, player, live, v);
  if (g.phase !== 'gooien' || player < 0 || player !== g.turn) return null;
  const p = g.players[player];
  const from = p.pos, path = walk(from, v);
  p.pos = path[path.length - 1];
  p.turns++;
  const ev = emit(g, { type: 'worp', player, v, from, to: p.pos, path });
  land(g, player, v, live, 0);
  return ev;
}

// Dubbel of niks: even, dan krijgt de rest 1 strafpunt; oneven, dan krijg jij er n.
function doubleRoll(g, player, live, r) {
  if (player < 0 || player !== g.turn) return null;
  const n = g.pending.n, drinks = [];
  if (r % 2 === 0) for (const q of live) { if (q !== player) drink(g, q, 1, drinks); }
  else drink(g, player, n, drinks);
  const ev = emit(g, { type: 'dubbel', player, r, n, drinks });
  passTurn(g, live);
  return ev;
}

// Een duel: allebei gooien; de laagste krijgt n strafpunten. Gelijk? Dan gooien jullie allebei nog een keer.
function duelRoll(g, player, live, v) {
  const d = g.duel;
  if (!duelWaiting(g).includes(player)) return null;
  if (player === d.a) d.ra = v; else d.rb = v;
  const ev = emit(g, { type: 'duelworp', player, v });
  if (d.ra == null || d.rb == null) return ev;
  const base = { type: 'duel', player: d.a, target: d.b, a: d.ra, b: d.rb, n: d.n };
  if (d.ra === d.rb) {
    d.ra = null; d.rb = null;
    emit(g, { ...base, tie: true });
    return ev;
  }
  emit(g, { ...base, drinks: drink(g, d.ra < d.rb ? d.a : d.b, d.n) });
  passTurn(g, live);
  return ev;
}

// Wat er gebeurt op het vakje waar je staat.
function land(g, player, v, live, depth) {
  const p = g.players[player], at = p.pos, sq = boardOf(g.mode)[at];
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
      return done({ from: at, to: 0, n: sq.n, drinks: drink(g, player, sq.n), ...(sq.mega ? { megas: mega(g, player) } : {}) });
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
      // je gooit zelf nog een keer (zie doubleRoll)
      if (!others.length) return done();
      emit(g, { ...base, n: sq.n });
      g.phase = 'dubbel';
      g.pending = { kind: 'dubbel', n: sq.n };
      return true;
    }
    case 'mega': return done({ megas: mega(g, player) });
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

// Wie aan de beurt is kiest iemand: om strafpunten te geven, als maatje, voor een duel, om mee te ruilen, of (de
// winnaar) wie er een mega strafpunt krijgt.
export function choose(g, player, target, live) {
  live = uniq(live);
  if (g.phase !== 'kiezen' || player < 0 || player !== g.turn || target === player || !live.includes(target) || !g.players[target]) return null;
  const { kind, n } = g.pending, p = g.players[player], q = g.players[target];
  const ev = { type: 'keuze', player, target, kind, n };
  if (kind === 'geef' || kind === 'winst') ev.drinks = drink(g, target, n);
  else if (kind === 'maatje') p.buddy = target;
  else if (kind === 'ruil') {
    [p.pos, q.pos] = [q.pos, p.pos];
    [p.stuck, q.stuck] = [q.stuck, p.stuck];
  } else if (kind === 'mega') ev.megas = mega(g, target);
  g.pending = null;
  emit(g, ev);
  if (kind === 'duel') {
    // nu gooien jullie allebei (zie duelRoll)
    g.phase = 'duel';
    g.duel = { a: player, b: target, ra: null, rb: null, n };
  } else if (kind === 'mega' || kind === 'winst') end(g, player, live);
  else passTurn(g, live);
  return ev;
}

// Op de finish: gewonnen. De winnaar kiest eerst wie er een mega strafpunt krijgt (als er iemand anders is).
function finish(g, player, live, base) {
  g.players[player].wins++;
  g.winner = player;
  emit(g, { ...base });
  if (!live.some((q) => q !== player)) return end(g, player, live);
  g.phase = 'kiezen';
  g.pending = { ...rulesOf(g.mode).win };
  return true;
}

// Het potje is klaar: wie het verst achter staat, krijgt strafpunten.
function end(g, player, live) {
  const others = live.filter((q) => q !== player), last = rulesOf(g.mode).last;
  const drinks = [], megas = [];
  if (others.length) {
    const min = Math.min(...others.map((q) => g.players[q].pos));
    for (const q of others) if (g.players[q].pos === min) { if (last.mega) mega(g, q, megas); else drink(g, q, last.n, drinks); }
  }
  g.phase = 'klaar';
  g.pending = null;
  g.duel = null;
  return emit(g, { type: 'klaar', winner: player, drinks, megas, round: g.round });
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
// Bij een duel of dubbel of niks gooit de telefoon voor wie er weg is.
export function fixTurn(g, live) {
  live = uniq(live);
  if (g.phase === 'klaar' || !live.length) return false;
  if (g.phase === 'duel') {
    let done = false;
    for (let guard = 0; guard < 20; guard++) {
      const away = duelWaiting(g).find((p) => !live.includes(p));
      if (away == null) break;
      roll(g, away, live);
      done = true;
    }
    return done;
  }
  if (live.includes(g.turn)) return false;
  if (g.phase === 'dubbel') return !!roll(g, g.turn, live);
  if (g.phase === 'kiezen') {
    const options = live.filter((q) => q !== g.turn);
    if (options.length) return !!choose(g, g.turn, options[Math.floor(rand(g) * options.length)], live);
  }
  return !!passTurn(g, live);
}
