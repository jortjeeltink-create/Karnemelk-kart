// Rotonde: het kaartspel, online met iedereen op zijn eigen telefoon (ook bekend als Atoombommen, Spinnenwebben
// of Kernreactor; alleen de vorm verschilt).
// 37 dichte kaarten liggen als een zon op tafel. De kleur van de achterkant zegt hoeveel slokken een kaart waard
// is: 16 rode in de buitenste ring (1), daarbinnen 8 oranje (2) en 4 blauwe (3), 8 groene rond het midden (4) en
// de paarse in het midden (12). Om de beurt kies je een dichte kaart en gok je rood of zwart. Goed: de waarde gaat
// in de pot, en je mag één keer extra gokken om de pot groter te maken of doorgeven. Fout: je drinkt de waarde plus
// de hele pot, de pot is weer leeg en je probeert het opnieuw. Liggen alle kaarten open, dan is de rotonde klaar.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { SUITS, newDeck, shuffle, rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const COLORS = ['rood', 'zwart'];
const LOG_SIZE = 16;

// De vorm, van het midden naar buiten. ring: 0 tot en met 3, angle: graden met de klok mee vanaf boven,
// v: zoveel slokken is de kaart waard. In de ring van 12 liggen de blauwe recht boven, onder, links en rechts.
export const LAYOUT = [
  { ring: 0, angle: 0, v: 12 },
  ...Array.from({ length: 8 }, (_, k) => ({ ring: 1, angle: k * 45, v: 4 })),
  ...Array.from({ length: 12 }, (_, k) => ({ ring: 2, angle: k * 30, v: k % 3 ? 2 : 3 })),
  ...Array.from({ length: 16 }, (_, k) => ({ ring: 3, angle: k * 22.5, v: 1 })),
];
export const SIZE = LAYOUT.length;

const newPlayer = (name) => ({ name, sips: 0, right: 0, wrong: 0, max: 0 });
export const closed = (g) => g.cards.filter((c) => !c.open).length;

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

// Een nieuwe rotonde: geschud en dicht neergelegd.
function deal(g) {
  const deck = shuffle(newDeck(), () => rand(g));
  g.cards = LAYOUT.map((spot, i) => ({ v: spot.v, card: deck[i], open: false }));
  g.pot = 0;
  g.sel = -1;
  g.extra = false;
  g.round++;
}

export function newGame(names, { seed = Date.now() } = {}) {
  const g = {
    seed: seed >>> 0,
    players: cleanNames(names).map(newPlayer),
    phase: 'kiezen',  // kiezen: wie aan de beurt is kiest een kaart en gokt; keuze: na een goede gok nog eentje of doorgeven
    round: 0,
    cards: [],
    pot: 0,
    turn: -1,
    sel: -1,          // de gekozen kaart van wie aan de beurt is
    extra: false,     // gokt wie aan de beurt is nu zijn extra keer
    log: [],
    seq: 0,
  };
  deal(g);
  return g;
}

// Er schuift iemand aan tijdens het potje: die gokt mee als hij aan de beurt komt.
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
  g.sel = -1;
  g.extra = false;
  g.phase = 'kiezen';
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

// Een dichte kaart kiezen (of een andere kiezen zolang je nog niet gegokt hebt).
export function pick(g, player, i) {
  if (g.phase !== 'kiezen' || player < 0 || player !== g.turn) return null;
  if (!Number.isInteger(i) || !g.cards[i] || g.cards[i].open || g.sel === i) return null;
  g.sel = i;
  return true;
}

// Rood of zwart gokken op de gekozen kaart.
export function guess(g, player, color, live) {
  if (g.phase !== 'kiezen' || player < 0 || player !== g.turn || g.sel < 0 || !COLORS.includes(color)) return null;
  const i = g.sel, c = g.cards[i], p = g.players[player];
  const ok = (color === 'rood') === SUITS[c.card.s].red;
  c.open = true;
  g.sel = -1;
  let ev;
  if (ok) {
    g.pot += c.v;
    p.right++;
    ev = emit(g, { type: 'kaart', player, i, card: c.card, v: c.v, color, ok: true, pot: g.pot, extra: g.extra });
    if (!closed(g)) finish(g);
    // na je extra keer gaat de beurt vanzelf door; anders mag je kiezen
    else if (g.extra) passTurn(g, player, live);
    else g.phase = 'keuze';
  } else {
    // fout: de kaart plus de hele pot, en je probeert het opnieuw
    const sips = c.v + g.pot;
    p.sips += sips;
    p.wrong++;
    p.max = Math.max(p.max, sips);
    ev = emit(g, { type: 'kaart', player, i, card: c.card, v: c.v, color, ok: false, sips, pot: g.pot, extra: g.extra });
    g.pot = 0;
    if (!closed(g)) finish(g);
  }
  return ev;
}

// Na een goede gok: nog één keer gokken (more) of de beurt doorgeven.
export function decide(g, player, more, live) {
  if (g.phase !== 'keuze' || player < 0 || player !== g.turn) return null;
  if (more) {
    g.extra = true;
    g.phase = 'kiezen';
    return emit(g, { type: 'extra', player });
  }
  return passTurn(g, player, live);
}

function finish(g) {
  g.phase = 'klaar';
  g.sel = -1;
  return emit(g, { type: 'klaar', round: g.round, pot: g.pot });
}

// Een nieuwe rotonde; de stand blijft. De speler na wie de laatste kaart omdraaide begint.
export function next(g, live) {
  if (g.phase !== 'klaar') return null;
  const list = [...new Set(live)].filter((p) => g.players[p]);
  if (list.length < MIN_PLAYERS) return null;
  deal(g);
  emit(g, { type: 'nieuw', round: g.round });
  return giveTurn(g, nextAfter(g, g.turn, list));
}

// Is wie aan de beurt is weg, of schoof er iemand aan? Dan de beurt doorgeven aan iemand die er is.
export function fixTurn(g, live) {
  if (g.phase === 'klaar' || live.includes(g.turn)) return false;
  const to = nextAfter(g, g.turn, live);
  if (to < 0) return false;
  giveTurn(g, to);
  return true;
}
