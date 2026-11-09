// Toepen: het kaartspel met 32 kaarten (7 tot en met aas), online met iedereen op zijn eigen telefoon.
// Iedereen krijgt 4 kaarten. Om de beurt leg je een kaart op; wie uitkomt bepaalt de kleur, en wie die kleur heeft,
// moet bekennen. De hoogste kaart in die kleur wint de slag en komt daarna uit. Wie de vierde slag wint, wint de
// ronde; de rest krijgt de inzet als strafpunten. De volgorde van laag naar hoog: boer, vrouw, heer, aas, 7, 8, 9, 10.
// Kloppen: de inzet gaat één omhoog. Wie nog meedoet, kiest dan: mee, of passen (dan krijg je de inzet van vóór de
// klop en speel je deze ronde niet meer mee). Je kunt niet twee keer achter elkaar kloppen, en niet hoger dan de
// grens min je eigen strafpunten. Wie de grens (10 of 15) haalt, ligt eruit; de laatste die overblijft, wint.
// Voor de eerste kaart van een ronde mag je nog: "vuile was" roepen (vier plaatjes, of drie plaatjes en een 7: nieuwe
// kaarten; bluffen mag, maar wie kijkt en gelijk heeft, betrapt je), of "kans op toep" spelen (drie dezelfde: de
// vierde ruilen; heb je dan vier dezelfde, dan win je het hele spel). Wie meteen vier dezelfde krijgt, wint ook.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { newDeck, shuffle, rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;
export const HAND = 4;
export const LIMITS = [10, 15];
export const LIMIT_DEFAULT = 10;
export const ORDER = [11, 12, 13, 14, 7, 8, 9, 10];   // van laag naar hoog
const PLAATJES = [11, 12, 13];                          // boer, vrouw, heer
const LOG_SIZE = 20;

export const strength = (c) => ORDER.indexOf(c.r);
export const sameCard = (a, b) => !!a && !!b && a.r === b.r && a.s === b.s;
const byRank = (hand) => hand.reduce((m, c) => m.set(c.r, (m.get(c.r) || 0) + 1), new Map());
// vier plaatjes, of drie plaatjes en een 7
export function isVuileWas(hand) {
  if (hand.length !== HAND) return false;
  const p = hand.filter((c) => PLAATJES.includes(c.r)).length;
  return p === 4 || (p === 3 && hand.some((c) => c.r === 7));
}
export const isToep = (hand) => hand.length === HAND && hand.every((c) => c.r === hand[0].r);
export const hasKans = (hand) => hand.length === HAND && [...byRank(hand).values()].includes(3);
// netjes op volgorde: per kleur, en binnen een kleur van laag naar hoog
const sortHand = (hand) => hand.sort((a, b) => a.s - b.s || strength(a) - strength(b));

const newPlayer = (name) => ({ name, pts: 0, out: false, won: 0 });

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now(), limit = LIMIT_DEFAULT } = {}) {
  const g = {
    seed: seed >>> 0,
    limit: LIMITS.includes(limit) ? limit : LIMIT_DEFAULT,
    players: cleanNames(names).map(newPlayer),
    phase: 'spelen',   // spelen, klop (iedereen kiest mee of passen), was (kijken of geloven), ronde (uitslag), klaar
    round: 0,
    dealer: -1,
    deck: [],
    pile: [],          // afgelegde kaarten (van een vuile was), voor als de stapel op is
    hands: [],
    inRound: [],       // doet nog mee deze ronde (niet gepast en niet af)
    trick: [],         // de kaarten van deze slag: { p, card }
    last: null,        // de vorige slag: { winner, trick }
    tricks: 0,         // zoveel slagen zijn er al gespeeld
    leader: -1,
    turn: -1,
    stake: 1,          // waar deze ronde om gespeeld wordt
    knocker: -1,       // wie het laatst klopte (die mag niet nog eens)
    klop: null,        // { by, from, to, wait: [spelers die nog moeten kiezen] }
    was: null,         // { by, real, wait, kijk: [wie kijkt] }
    washed: [],        // wie deze ronde al vuile was riep
    tried: [],         // wie deze ronde al kans op toep speelde
    started: false,    // ligt de eerste kaart van de ronde al?
    winner: -1,
    log: [],
    seq: 0,
  };
  g.dealer = Math.floor(rand(g) * g.players.length);
  deal(g);
  return g;
}

const active = (g) => g.players.flatMap((p, i) => (p.out ? [] : [i]));
const inRound = (g) => g.inRound.flatMap((v, i) => (v ? [i] : []));
// de eerstvolgende na `from` die aan de voorwaarde voldoet
function nextWhere(g, from, ok) {
  const n = g.players.length;
  for (let k = 1; k <= n; k++) {
    const p = (from + k) % n;
    if (ok(p)) return p;
  }
  return -1;
}
function draw(g) {
  if (!g.deck.length && g.pile.length) { g.deck = shuffle(g.pile, () => rand(g)); g.pile = []; }
  return g.deck.pop();
}

// Een nieuwe ronde: de deler schuift door, iedereen die nog meedoet krijgt 4 kaarten, en de speler na de deler komt uit.
function deal(g) {
  g.round++;
  g.dealer = nextWhere(g, g.dealer, (p) => !g.players[p].out);
  g.deck = shuffle(newDeck().filter((c) => c.r >= 7), () => rand(g));
  g.pile = [];
  g.hands = g.players.map((p) => (p.out ? [] : sortHand(Array.from({ length: HAND }, () => g.deck.pop()))));
  g.inRound = g.players.map((p) => !p.out);
  g.trick = []; g.last = null; g.tricks = 0;
  g.stake = 1; g.knocker = -1; g.klop = null; g.was = null;
  g.washed = []; g.tried = []; g.started = false;
  g.leader = g.turn = nextWhere(g, g.dealer, (p) => g.inRound[p]);
  g.phase = 'spelen';
  emit(g, { type: 'deel', round: g.round, dealer: g.dealer, leader: g.leader });
  // meteen vier dezelfde: toep, en het spel is gewonnen
  const toep = nextWhere(g, g.dealer, (p) => g.inRound[p] && isToep(g.hands[p]));
  if (toep >= 0) { emit(g, { type: 'toep', player: toep, cards: g.hands[toep], kans: false }); finish(g, toep); }
}

// Welke kaarten mag `p` nu opleggen? Wie de gevraagde kleur heeft, moet bekennen.
export function legal(g, p) {
  const hand = g.hands[p] || [];
  if (!g.trick.length) return hand;
  const suit = g.trick[0].card.s;
  const follow = hand.filter((c) => c.s === suit);
  return follow.length ? follow : hand;
}
// de laagste kaart die mag (als de host speelt voor iemand die weg is)
export const lowest = (g, p) => [...legal(g, p)].sort((a, b) => strength(a) - strength(b))[0] || null;

export function play(g, p, card) {
  if (g.phase !== 'spelen' || p < 0 || p !== g.turn || !g.inRound[p]) return null;
  const c = legal(g, p).find((x) => sameCard(x, card));
  if (!c) return null;
  g.hands[p] = g.hands[p].filter((x) => x !== c);
  g.trick.push({ p, card: c });
  g.started = true;
  const ev = emit(g, { type: 'kaart', player: p, card: c, lead: g.trick.length === 1 });
  advance(g, p);
  return ev;
}

// De volgende in de slag, of de slag is rond.
function advance(g, from) {
  const done = new Set(g.trick.map((t) => t.p));
  const wait = inRound(g).filter((p) => !done.has(p));
  if (!wait.length) return endTrick(g);
  g.turn = nextWhere(g, from, (p) => wait.includes(p));
  if (!g.trick.length) g.leader = g.turn;
}

function endTrick(g) {
  const lead = g.trick[0].card.s, still = g.trick.filter((t) => g.inRound[t.p]);
  const follow = still.filter((t) => t.card.s === lead);
  const best = (follow.length ? follow : still).reduce((a, b) => (strength(b.card) > strength(a.card) ? b : a));
  g.tricks++;
  g.last = { winner: best.p, trick: g.trick };
  g.trick = [];
  g.leader = g.turn = best.p;
  emit(g, { type: 'slag', winner: best.p, nr: g.tricks, cards: g.last.trick });
  if (g.tricks >= HAND) endRound(g, best.p);
}

// De ronde is klaar: de winnaar krijgt niks, de rest die nog meedeed de inzet. Wie de grens haalt, ligt eruit.
function endRound(g, w) {
  const losers = inRound(g).filter((p) => p !== w);
  for (const p of losers) g.players[p].pts += g.stake;
  g.players[w].won++;
  const out = markOut(g);
  g.phase = 'ronde';
  g.turn = -1;
  emit(g, { type: 'ronde', winner: w, stake: g.stake, losers, out });
  const left = active(g);
  if (left.length <= 1) finish(g, left.length ? left[0] : w);
}

function markOut(g) {
  const out = [];
  g.players.forEach((p, i) => { if (!p.out && p.pts >= g.limit) { p.out = true; g.inRound[i] = false; out.push(i); } });
  return out;
}

function finish(g, w) {
  g.phase = 'klaar';
  g.winner = w;
  g.turn = -1;
  emit(g, { type: 'klaar', winner: w });
}

// Kan `p` nu kloppen? Alleen als je meedoet, niet net zelf klopte, en de nieuwe inzet onder je grens blijft.
export function canKnock(g, p) {
  return g.phase === 'spelen' && p >= 0 && !!g.inRound[p] && p !== g.knocker && inRound(g).length > 1
    && g.stake + 1 <= g.limit - g.players[p].pts;
}

export function knock(g, p, live = null) {
  if (!canKnock(g, p)) return null;
  g.klop = { by: p, from: g.stake, to: g.stake + 1, wait: inRound(g).filter((q) => q !== p) };
  g.phase = 'klop';
  const ev = emit(g, { type: 'klop', player: p, to: g.klop.to });
  if (live) fixWaits(g, live);
  return ev;
}

// Mee of passen na een klop. Passen kost de inzet van vóór de klop, en dan doe je deze ronde niet meer mee.
export function answer(g, p, mee) {
  if (g.phase !== 'klop' || !g.klop.wait.includes(p)) return null;
  g.klop.wait = g.klop.wait.filter((q) => q !== p);
  let ev;
  if (mee) ev = emit(g, { type: 'mee', player: p });
  else {
    g.players[p].pts += g.klop.from;
    g.inRound[p] = false;
    ev = emit(g, { type: 'pas', player: p, pts: g.klop.from });
  }
  if (!g.klop.wait.length) closeKlop(g);
  return ev;
}

function closeKlop(g) {
  const k = g.klop;
  g.stake = k.to;
  g.knocker = k.by;
  g.klop = null;
  g.phase = 'spelen';
  const out = markOut(g);
  emit(g, { type: 'inzet', stake: g.stake, by: k.by, out });
  stillPlaying(g);
}

// Na passen of afvallen midden in een ronde: is er nog maar één over, dan wint die; anders de juiste beurt.
function stillPlaying(g) {
  const left = inRound(g);
  if (left.length === 1) return endRound(g, left[0]);
  if (!left.length) { const a = active(g); return finish(g, a.length ? a[0] : 0); }
  if (g.inRound[g.turn] && !g.trick.some((t) => t.p === g.turn)) return;
  // was wie aan de beurt was weg: de volgende in de slag (of de slag is rond)
  advance(g, g.turn);
}

// Vuile was roepen kan voor de eerste kaart van de ronde, één keer per ronde, en ook als bluf.
export function canWas(g, p) {
  return g.phase === 'spelen' && !g.started && p >= 0 && !!g.inRound[p] && !g.washed.includes(p)
    && inRound(g).length > 1 && g.deck.length + g.pile.length >= HAND;
}

export function vuileWas(g, p, live = null) {
  if (!canWas(g, p)) return null;
  g.washed.push(p);
  g.was = { by: p, real: isVuileWas(g.hands[p]), wait: inRound(g).filter((q) => q !== p), kijk: [] };
  g.phase = 'was';
  const ev = emit(g, { type: 'was', player: p });
  if (live) fixWaits(g, live);
  return ev;
}

// Kijken of geloven. Klopt de vuile was, dan krijgt wie keek 1 strafpunt; was het bluf, dan is de bluffer betrapt
// en speelt hij verder met zijn eigen kaarten. Keek er niemand, dan krijgt hij gewoon nieuwe kaarten.
export function check(g, p, kijk) {
  if (g.phase !== 'was' || !g.was.wait.includes(p)) return null;
  g.was.wait = g.was.wait.filter((q) => q !== p);
  if (kijk) g.was.kijk.push(p);
  const ev = emit(g, { type: kijk ? 'kijk' : 'geloof', player: p });
  if (!g.was.wait.length) closeWas(g);
  return ev;
}

function closeWas(g) {
  const { by, real, kijk } = g.was;
  g.was = null;
  g.phase = 'spelen';
  const shown = kijk.length ? [...g.hands[by]] : null;   // wie kijkt, draait de kaarten om: iedereen ziet ze
  if (kijk.length && real) for (const p of kijk) g.players[p].pts += 1;
  const fresh = !kijk.length || real;
  if (fresh) {
    g.pile.push(...g.hands[by]);
    g.hands[by] = [];
    for (let k = 0; k < HAND; k++) g.hands[by].push(draw(g));
    sortHand(g.hands[by]);
  }
  const out = markOut(g);
  emit(g, { type: 'wasuit', player: by, kijk, real: kijk.length ? real : null, cards: shown, fresh, out });
  if (fresh && isToep(g.hands[by])) { emit(g, { type: 'toep', player: by, cards: g.hands[by], kans: false }); return finish(g, by); }
  stillPlaying(g);
}

// Kans op toep: drie dezelfde en één andere. De andere ruil je voor een nieuwe kaart; vier dezelfde wint het spel.
export function canKans(g, p) {
  return g.phase === 'spelen' && !g.started && p >= 0 && !!g.inRound[p] && !g.tried.includes(p)
    && hasKans(g.hands[p]) && g.deck.length + g.pile.length > 0;
}

export function kans(g, p) {
  if (!canKans(g, p)) return null;
  g.tried.push(p);
  const counts = byRank(g.hands[p]), odd = g.hands[p].find((c) => counts.get(c.r) === 1);
  g.hands[p] = g.hands[p].filter((c) => c !== odd);
  g.pile.push(odd);
  g.hands[p].push(draw(g));
  sortHand(g.hands[p]);
  const toep = isToep(g.hands[p]);
  const ev = emit(g, { type: 'kans', player: p, toep });
  if (toep) { emit(g, { type: 'toep', player: p, cards: g.hands[p], kans: true }); finish(g, p); }
  return ev;
}

// De volgende ronde (na de uitslag).
export function next(g) {
  if (g.phase !== 'ronde') return null;
  deal(g);
  return true;
}

// Nog een potje met dezelfde spelers: iedereen weer op nul.
export function again(g) {
  if (g.phase !== 'klaar') return null;
  g.players.forEach((p) => { p.pts = 0; p.out = false; });
  g.winner = -1;
  deal(g);
  return true;
}

export function setLimit(g, n) {
  if (!LIMITS.includes(n)) return false;
  g.limit = n;
  return true;
}

// Wie weg is, hoeft niet te kiezen: bij een klop gaat hij mee, bij een vuile was gelooft hij het.
export function fixWaits(g, live) {
  let changed = false;
  for (;;) {
    if (g.phase === 'klop') {
      const p = g.klop.wait.find((q) => !live.includes(q));
      if (p == null) break;
      answer(g, p, true); changed = true;
    } else if (g.phase === 'was') {
      const p = g.was.wait.find((q) => !live.includes(q));
      if (p == null) break;
      check(g, p, false); changed = true;
    } else break;
  }
  return changed;
}
