// Mijnenveld: het kaart- en dobbelspel, online met iedereen op zijn eigen telefoon.
// 36 dichte kaarten liggen in een raster van 6 bij 6, met 8 verstopte mijnen ertussen. Om de beurt gooi je de steen
// twee keer: eerst voor de kolom, dan voor de rij. Ligt die kaart al open, dan wordt het de eerstvolgende dichte
// kaart. Ligt er een mijn op, dan drink je de slokken per mijn en leg je hem ergens anders neer: op een kaart of
// tussen twee kaarten (dan raakt hij ze allebei). Daarna gok je rood of zwart en draai je de kaart om.
// Goed: de volgende is aan de beurt. Fout: 2 slokken en je gooit opnieuw. Liggen alle kaarten open, dan is het klaar.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { SUITS, newDeck, shuffle, rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const SIDE = 6;                 // 6 bij 6
export const SIZE = SIDE * SIDE;
export const MINES = 8;                // zoveel verstopte mijnen aan het begin
export const WRONG_SIPS = 2;           // fout gegokt
export const MINE_SIPS = [2, 3, 5];    // slokken per mijn: de host kiest (vroeger 3, 5 of 10)
export const MINE_DEFAULT = 3;
export const MAX_SIPS = 6;             // land je op twee mijnen tegelijk, dan nog nooit meer dan dit
export const COLORS = ['rood', 'zwart'];
const LOG_SIZE = 16;

export const rowOf = (i) => Math.floor(i / SIDE);
export const colOf = (i) => i % SIDE;
const newPlayer = (name) => ({ name, sips: 0, mines: 0, right: 0, wrong: 0 });
export const closed = (g) => g.cards.filter((c) => !c.open).length;
const die = (g) => 1 + Math.floor(rand(g) * 6);

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

// Waar een mijn mag liggen: op één kaart, of tussen twee kaarten naast of onder elkaar.
// Geeft de kaarten op volgorde terug, of null als het geen plek is.
export function spotCells(cells) {
  if (!Array.isArray(cells) || !cells.every((i) => Number.isInteger(i) && i >= 0 && i < SIZE)) return null;
  const c = [...new Set(cells)].sort((a, b) => a - b);
  if (c.length !== cells.length) return null;
  if (c.length === 1) return c;
  if (c.length === 2) return (c[1] === c[0] + 1 && rowOf(c[0]) === rowOf(c[1])) || c[1] === c[0] + SIDE ? c : null;
  return null;
}

// Een nieuw veld: geschud, dicht, en 8 mijnen verstopt op 8 verschillende kaarten.
function deal(g) {
  const deck = shuffle(newDeck(), () => rand(g));
  g.cards = deck.slice(0, SIZE).map((card) => ({ card, open: false }));
  const spots = shuffle(Array.from({ length: SIZE }, (_, i) => i), () => rand(g)).slice(0, MINES);
  g.mines = spots.map((i) => ({ cells: [i], hidden: true, count: 1 }));
  g.dice = null;
  g.target = -1;
  g.hit = 0;
  g.round++;
}

export function newGame(names, { seed = Date.now(), mineSips = MINE_DEFAULT } = {}) {
  const g = {
    seed: seed >>> 0,
    mineSips: MINE_SIPS.includes(mineSips) ? mineSips : MINE_DEFAULT,
    players: cleanNames(names).map(newPlayer),
    phase: 'gooien',   // gooien (voor de kolom), rij (gooien voor de rij), plaatsen (mijnen verleggen), gokken, klaar
    round: 0,
    cards: [],
    mines: [],         // { cells, hidden, count }: verstopt aan het begin, open als iemand hem verlegd heeft
    turn: -1,
    dice: null,        // de worpen van deze beurt: [kolom, rij] (rij is null zolang die nog niet gegooid is)
    target: -1,        // de kaart waar de stenen op wezen
    hit: 0,            // zoveel mijnen moet wie aan de beurt is nog neerleggen
    log: [],
    seq: 0,
  };
  deal(g);
  return g;
}

// Er schuift iemand aan tijdens het potje: die gooit mee als hij aan de beurt komt.
export function addPlayer(g, name) {
  g.players.push(newPlayer(name));
}

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
  g.dice = null;
  g.target = -1;
  g.hit = 0;
  return emit(g, { type: 'beurt', to });
}

// De beurt naar de volgende aan tafel (of terug naar jezelf als er verder niemand is).
function passTurn(g, player, live) {
  const to = nextAfter(g, player, live);
  return giveTurn(g, to < 0 ? player : to);
}

// De eerste beurt: `starter` als die er is, anders de eerstvolgende.
export function begin(g, live, starter) {
  const list = [...new Set(live)].filter((p) => g.players[p]);
  if (list.length < MIN_PLAYERS) return null;
  return giveTurn(g, list.includes(starter) ? starter : nextAfter(g, starter, list));
}

export const minesOn = (g, i) => g.mines.filter((m) => m.cells.includes(i));

// De steen gooien: de eerste keer voor de kolom, de tweede keer voor de rij.
// `value` is alleen voor de tests; aan tafel gooit de server.
export function roll(g, player, value = null) {
  if ((g.phase !== 'gooien' && g.phase !== 'rij') || player < 0 || player !== g.turn) return null;
  const v = value || die(g);
  if (g.phase === 'gooien') {
    g.dice = [v, null];
    g.phase = 'rij';
    return emit(g, { type: 'kolom', player, value: v });
  }
  const d = [g.dice[0], v];
  const aim = (d[1] - 1) * SIDE + (d[0] - 1);
  // ligt die kaart al open, dan de eerstvolgende dichte (naar rechts, dan de rij eronder)
  let target = aim;
  for (let k = 0; k < SIZE && g.cards[target].open; k++) target = (aim + k + 1) % SIZE;
  g.dice = d;
  g.target = target;
  const ev = emit(g, { type: 'worp', player, dice: d, target, moved: target !== aim });
  const found = minesOn(g, target);
  if (found.length) {
    // boem: de mijnen gaan van het veld, en wie erop landde legt ze ergens anders neer
    const count = found.reduce((n, m) => n + m.count, 0), sips = Math.min(MAX_SIPS, count * g.mineSips);
    g.mines = g.mines.filter((m) => !found.includes(m));
    const p = g.players[player];
    p.sips += sips;
    p.mines += count;
    emit(g, { type: 'mijn', player, target, count, sips, hidden: found.some((m) => m.hidden) });
    // past er geen mijn meer (alleen deze kaart ligt nog dicht), dan verdwijnen ze
    g.hit = closed(g) > 1 ? count : 0;
  }
  g.phase = g.hit ? 'plaatsen' : 'gokken';
  return ev;
}

// Een mijn neerleggen op `cells` (zie spotCells): alleen op dichte kaarten, en niet op de kaart van de worp.
export function place(g, player, cells) {
  if (g.phase !== 'plaatsen' || player < 0 || player !== g.turn) return null;
  const c = spotCells(cells);
  if (!c || c.some((i) => g.cards[i].open || i === g.target)) return null;
  const same = g.mines.find((m) => !m.hidden && m.cells.join() === c.join());
  if (same) same.count++;
  else g.mines.push({ cells: c, hidden: false, count: 1 });
  g.hit--;
  if (!g.hit) g.phase = 'gokken';
  return emit(g, { type: 'gelegd', player, cells: c, left: g.hit });
}

// Rood of zwart gokken op de kaart van de worp; de kaart gaat open.
export function guess(g, player, color, live) {
  if (g.phase !== 'gokken' || player < 0 || player !== g.turn || !COLORS.includes(color)) return null;
  const i = g.target, c = g.cards[i], p = g.players[player];
  const ok = (color === 'rood') === SUITS[c.card.s].red;
  c.open = true;
  g.target = -1;
  if (ok) p.right++;
  else { p.sips += WRONG_SIPS; p.wrong++; }
  const ev = emit(g, { type: 'kaart', player, i, card: c.card, color, ok, sips: ok ? 0 : WRONG_SIPS });
  if (!closed(g)) finish(g);
  // goed: de volgende; fout: zelf opnieuw gooien
  else if (ok) passTurn(g, player, live);
  else { g.phase = 'gooien'; g.dice = null; }
  return ev;
}

function finish(g) {
  g.phase = 'klaar';
  g.target = -1;
  g.hit = 0;
  return emit(g, { type: 'klaar', round: g.round });
}

// Een nieuw veld; de stand blijft. De speler na wie de laatste kaart omdraaide begint.
export function next(g, live) {
  if (g.phase !== 'klaar') return null;
  const list = [...new Set(live)].filter((p) => g.players[p]);
  if (list.length < MIN_PLAYERS) return null;
  deal(g);
  emit(g, { type: 'nieuw', round: g.round });
  return giveTurn(g, nextAfter(g, g.turn, list));
}

// De slokken per mijn aanpassen kan voor het spel en als een veld klaar is.
export function setMineSips(g, n) {
  if (!MINE_SIPS.includes(n) || g.phase !== 'klaar') return false;
  g.mineSips = n;
  return true;
}

// Is wie aan de beurt is weg? Moest hij nog mijnen leggen, dan legt de server die op een willekeurige dichte
// kaart; de kaart van zijn worp blijft dicht. Daarna is de volgende aan de beurt.
export function fixTurn(g, live) {
  if (g.phase === 'klaar' || live.includes(g.turn)) return false;
  const to = nextAfter(g, g.turn, live);
  if (to < 0) return false;
  for (; g.hit > 0; g.hit--) {
    const free = g.cards.flatMap((c, i) => (!c.open && i !== g.target ? [i] : []));
    const i = free[Math.floor(rand(g) * free.length)];
    const same = g.mines.find((m) => !m.hidden && m.cells.join() === String(i));
    if (same) same.count++;
    else g.mines.push({ cells: [i], hidden: false, count: 1 });
  }
  giveTurn(g, to);
  return true;
}
