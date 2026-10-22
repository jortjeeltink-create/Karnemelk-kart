// Fuck the dealer: het kaartspel, online met iedereen op zijn eigen telefoon.
// De dealer houdt de stapel vast en ziet als enige de bovenste kaart. Om de beurt raden de anderen welke kaart
// het is. Goed in één keer: de dealer drinkt 5 slokken. Fout: de dealer zegt hoger of lager, en je raadt nog één
// keer. Nu goed: de dealer drinkt 3. Weer fout: jij drinkt het verschil tussen je gok en de kaart. Speelt de
// dealer drie spelers achter elkaar uit, dan is hij dealer af en gaat de stapel naar de volgende.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { newDeck, shuffle, rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;
export const STREAK = 3;          // zoveel spelers achter elkaar uitgespeeld: dealer af
export const SIPS_FIRST = 5;      // de dealer drinkt als je hem in één keer raadt
export const SIPS_SECOND = 3;     // en als je hem in twee keer raadt
export const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const LOG_SIZE = 16;

const newPlayer = (name) => ({ name, sips: 0, right: 0, beaten: 0, dealer: 0 });
const freshDeck = (g) => shuffle(newDeck(), () => rand(g));
const emptyBoard = () => Object.fromEntries(RANKS.map((r) => [r, 0]));

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now() } = {}) {
  const g = {
    seed: seed >>> 0,
    players: cleanNames(names).map(newPlayer),
    phase: 'raden',
    deck: [],
    board: emptyBoard(),   // hoeveel kaarten van elke waarde er al gespeeld zijn
    dealer: -1,
    guesser: -1,           // wie er nu raadt
    first: null,           // de eerste gok bij deze kaart
    hint: null,            // 'hoger' of 'lager' na een foute eerste gok
    streak: 0,             // zoveel spelers heeft de dealer achter elkaar uitgespeeld
    log: [],
    seq: 0,
  };
  g.deck = freshDeck(g);
  return g;
}

// Er schuift iemand aan tijdens het potje: die raadt mee als hij aan de beurt komt.
export function addPlayer(g, name) {
  g.players.push(newPlayer(name));
}

// De eerstvolgende aan tafel na `from` die er is (in `live`) en niet `skip` is.
function nextAfter(g, from, live, skip) {
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const p = (from + k) % n;
    if (p !== skip && live.includes(p)) return p;
  }
  return -1;
}

// Een willekeurige dealer kiezen; de speler na hem raadt als eerste.
export function begin(g, live) {
  const list = [...new Set(live)].filter((p) => g.players[p]);
  if (list.length < MIN_PLAYERS) return null;
  g.dealer = list[Math.floor(rand(g) * list.length)];
  g.players[g.dealer].dealer++;
  g.guesser = nextAfter(g, g.dealer, list, g.dealer);
  return emit(g, { type: 'dealer', to: g.dealer, first: true });
}

// Raden. Na een foute eerste gok moet de tweede gok kloppen met hoger of lager.
export function guess(g, player, rank, live) {
  if (player < 0 || player !== g.guesser || !RANKS.includes(rank)) return null;
  const card = g.deck[g.deck.length - 1];
  if (g.first == null) {
    if (rank === card.r) return resolve(g, live, [rank], 1);
    g.first = rank;
    g.hint = card.r > rank ? 'hoger' : 'lager';
    return emit(g, { type: 'hint', player, rank, hint: g.hint });
  }
  if (g.hint === 'hoger' ? rank <= g.first : rank >= g.first) return null;
  return resolve(g, live, [g.first, rank], rank === card.r ? 2 : 0);
}

// De kaart gaat open. ok: 1 = in één keer goed, 2 = in twee keer, 0 = fout.
function resolve(g, live, guesses, ok) {
  const card = g.deck.pop();
  const player = g.guesser, dealer = g.dealer;
  g.board[card.r]++;
  const drinker = ok ? dealer : player;
  const sips = ok === 1 ? SIPS_FIRST : ok === 2 ? SIPS_SECOND : Math.abs(guesses[1] - card.r);
  g.players[drinker].sips += sips;
  if (ok) { g.players[player].right++; g.streak = 0; } else { g.players[dealer].beaten++; g.streak++; }
  g.first = null;
  g.hint = null;
  const ev = emit(g, { type: 'kaart', player, dealer, card, guesses, ok, drinker, sips, streak: g.streak });
  if (g.streak >= STREAK) {
    // drie keer uitgespeeld: de stapel gaat naar de volgende
    const to = nextAfter(g, dealer, live, -1);
    g.dealer = to;
    g.players[to].dealer++;
    g.streak = 0;
    g.guesser = nextAfter(g, to, live, to);
    emit(g, { type: 'dealer', from: dealer, to });
  } else {
    g.guesser = nextAfter(g, player, live, dealer);
  }
  if (!g.deck.length) {
    // stapel op: nieuwe kaarten, en de tafel is weer leeg
    g.deck = freshDeck(g);
    g.board = emptyBoard();
    emit(g, { type: 'schudden' });
  }
  return ev;
}

// Is wie er moest raden weg, of schoof er iemand aan? Dan de beurt doorgeven aan iemand die er is.
export function fixTurn(g, live) {
  if (g.dealer < 0 || g.first != null) return false;
  if (live.includes(g.guesser) && g.guesser !== g.dealer) return false;
  const next = nextAfter(g, g.guesser < 0 ? g.dealer : g.guesser, live, g.dealer);
  if (next < 0 || next === g.guesser) return false;
  g.guesser = next;
  return true;
}
