// Bussen: het kaartspel, online met iedereen op zijn eigen telefoon.
// De rekenkern: kaarten, de vragenronde, de piramide, kaart kiezen bij gelijkspel, de bus en de slokken.
// De server (bushub.js) voert dit uit; een potje is een gewoon object (JSON), inclusief de seed van de
// random-generator, dus alles is te testen zonder netwerk.

export const SUITS = [
  { id: 'harten', sym: '♥', red: true },
  { id: 'ruiten', sym: '♦', red: true },
  { id: 'klaveren', sym: '♣', red: false },
  { id: 'schoppen', sym: '♠', red: false },
];
// boer, vrouw, heer en aas; de aas is het hoogst
export const RANK_LABEL = { 11: 'B', 12: 'V', 13: 'H', 14: 'A' };
export const RANK_NAME = { 11: 'boer', 12: 'vrouw', 13: 'heer', 14: 'aas' };

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 9;      // 9 × 4 kaarten + 11 in de piramide = 47, past in één spel
export const NAME_MAX = 14;
// De piramide zoals hij op tafel ligt, van onder naar boven: één kaart, dan rijen van 4, 3 en 2, en bovenin één.
// Elke rij is een aantal slokken waard. Een kaart die dwars ligt (d) telt dubbel, een rechte kaart (r) enkel:
// onderin dus 1 × 2 = 2 en bovenin 5 × 2 = 10. Zoveel deel je uit per kaart die je erop weglegt.
export const PYRAMID = [
  { sips: 1, lay: 'd' },
  { sips: 2, lay: 'rdrd' },
  { sips: 3, lay: 'drd' },
  { sips: 4, lay: 'rd' },
  { sips: 5, lay: 'd' },
];
// alle plekken in de volgorde waarin ze omgaan (onder naar boven, links naar rechts)
export const PYRAMID_SLOTS = PYRAMID.flatMap((r, i) => [...r.lay].map((x) => ({ row: i + 1, dwars: x === 'd', sips: r.sips * (x === 'd' ? 2 : 1) })));
export const PYRAMID_SIZE = PYRAMID_SLOTS.length;
// na het omdraaien van een piramidekaart wacht de volgende even, zodat iedereen zijn kaart kan wegleggen
export const FLIP_PAUSE_MS = 3000;
export const BUS_LENGTHS = [5, 7, 10];
export const BUS_DEFAULT = 7;
export const PICK_EXTRA = 2;       // bij gelijkspel liggen er zoveel kaarten meer dan kiezers
const LOG_SIZE = 16;

export const QUESTIONS = [
  { id: 'kleur', q: 'Rood of zwart?', sips: 1, options: ['rood', 'zwart'] },
  { id: 'hogerlager', q: 'Hoger of lager?', sips: 2, options: ['hoger', 'lager'] },
  { id: 'binnenbuiten', q: 'Binnen of buiten?', sips: 3, options: ['binnen', 'buiten'] },
  // heb je de vorm (harten, ruiten, klaveren of schoppen) van je vierde kaart al? Met 3 verschillende vormen mag ook disco
  { id: 'vorm', q: 'Heb je het vormpje al?', sips: 4, options: ['ja', 'nee', 'disco'] },
];

export const rankLabel = (c) => RANK_LABEL[c.r] || String(c.r);
export const label = (c) => rankLabel(c) + SUITS[c.s].sym;
export const isRed = (c) => SUITS[c.s].red;
export const sipsText = (n) => `${n} ${n === 1 ? 'slok' : 'slokken'}`;
// disco kan alleen als je eerste drie kaarten drie verschillende vormen hebben
export const canDisco = (hand) => hand.length === 3 && new Set(hand.map((c) => c.s)).size === 3;

// "de 7♥", "de vrouw ♠"
export function cardName(c, lidwoord = 'de') {
  const name = RANK_NAME[c.r];
  return name ? `${lidwoord} ${name} ${SUITS[c.s].sym}` : `${lidwoord} ${c.r}${SUITS[c.s].sym}`;
}

export function newDeck() {
  const deck = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) deck.push({ r, s });
  return deck;
}

export function shuffle(arr, random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// mulberry32, met de stand in het potje zelf (ook gebruikt door boer.js)
export function rand(g) {
  g.seed = (g.seed + 0x6d2b79f5) >>> 0;
  let t = g.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const freshDeck = (g) => shuffle(newDeck(), () => rand(g));

// Namen opschonen: geen lege, niet te lang, en dubbele krijgen een nummer.
export function cleanNames(list) {
  const out = [];
  for (const raw of list) {
    const base = String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
    if (!base) continue;
    let name = base;
    for (let n = 2; out.some((o) => o.toLowerCase() === name.toLowerCase()); n++) name = `${base.slice(0, NAME_MAX - 2)} ${n}`;
    out.push(name);
  }
  return out;
}

// Het goede antwoord op vraag `round` met deze hand en de nieuwe kaart.
// null betekent paal: gelijk aan een kaart die je al hebt, en dat is altijd fout.
export function truth(round, hand, card) {
  if (round === 0) return isRed(card) ? 'rood' : 'zwart';
  if (round === 1) return card.r === hand[0].r ? null : card.r > hand[0].r ? 'hoger' : 'lager';
  if (round === 2) {
    const lo = Math.min(hand[0].r, hand[1].r), hi = Math.max(hand[0].r, hand[1].r);
    if (card.r === lo || card.r === hi) return null;
    return card.r > lo && card.r < hi ? 'binnen' : 'buiten';
  }
  return hand.some((c) => c.s === card.s) ? 'ja' : 'nee';
}

export function busTruth(prev, card) {
  return card.r === prev.r ? null : card.r > prev.r ? 'hoger' : 'lager';
}

export function newGame(names, { busLength = BUS_DEFAULT, seed = Math.floor(Math.random() * 2 ** 32) } = {}) {
  const list = cleanNames(names);
  if (list.length < MIN_PLAYERS || list.length > MAX_PLAYERS) throw new Error(`Bussen is voor ${MIN_PLAYERS} tot ${MAX_PLAYERS} spelers`);
  const g = {
    v: 2,
    phase: 'vragen',          // vragen → piramide → (kiezen) → bus → klaar
    busLength: BUS_LENGTHS.includes(busLength) ? busLength : BUS_DEFAULT,
    seed: seed >>> 0,
    players: list.map((name) => ({
      name, hand: [], laid: [], goed: 0, fout: 0, dealt: 0,
      got: 0,          // slokken die je in totaal kreeg
      drank: 0,        // slokken die je echt gedronken hebt ("nu doen")
      pending: 0,      // nieuwe slokken waar je nog nu doen of sparen op moet kiezen
      from: [],        // van wie die nieuwe slokken komen (-1 is zelf)
      saved: 0,        // gespaarde slokken
      savedTotal: 0,
      settle: null,    // 'ronde' of 'eind': je gespaarde slokken komen terug
      bak: 0,          // bakken die je nog moet doen (disco), die kun je niet sparen
      bakFrom: [],     // van wie die bakken komen: { p, n, disco }
      bakken: 0,
      disco: 0,
    })),
    deck: [],
    round: 0,
    turn: 0,
    deals: [],        // open uitdelingen: { from, sips }; elke speler hooguit één tegelijk
    pyramid: null,
    next: 0,
    candidates: null,
    pick: null,
    rider: null,
    bus: null,
    seq: 0,
    log: [],
  };
  g.deck = freshDeck(g);
  return g;
}

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

function addSips(g, to, n, from) {
  const p = g.players[to];
  p.pending += n;
  p.got += n;
  const f = p.from.find((x) => x.p === from);
  if (f) f.n += n; else p.from.push({ p: from, n });
}

function addBak(g, to, n, from, disco = false) {
  const p = g.players[to];
  p.bak += n;
  const f = p.bakFrom.find((x) => x.p === from && x.disco === disco);
  if (f) f.n += n; else p.bakFrom.push({ p: from, n, disco });
}

// slokken om uit te delen; legt iemand meer kaarten weg, dan komen ze bij elkaar
function queueDeal(g, from, n) {
  const open = g.deals.find((d) => d.from === from);
  if (open) open.n += n;
  else g.deals.push({ from, n });
}

// Aan het eind van een ronde komen je gespaarde slokken terug: nu doen of weer sparen.
function roundEnd(g, kind = 'ronde') {
  for (const p of g.players) if (p.saved > 0) p.settle = kind;
}

// Vragenronde: de speler die aan de beurt is kiest een antwoord en krijgt de bovenste kaart.
export function answer(g, player, option) {
  if (g.phase !== 'vragen' || g.deals.length || player !== g.turn) return null;
  const Q = QUESTIONS[g.round];
  const p = g.players[player];
  if (!Q.options.includes(option) || (option === 'disco' && !canDisco(p.hand))) return null;
  const card = g.deck.pop();
  const right = truth(g.round, p.hand, card);
  // disco is goed als de vierde kaart de ontbrekende vorm is: dan moet iedereen een bak
  const disco = option === 'disco';
  const ok = disco ? right === 'nee' : right === option;
  p.hand.push(card);
  if (ok && disco) {
    p.goed++; p.disco++;
    g.players.forEach((_, i) => addBak(g, i, 1, player, true));
  } else if (ok) p.goed++;     // goed geraden: niks te drinken (uitdelen doe je pas in de piramide)
  else { p.fout++; addSips(g, player, Q.sips, -1); }
  const ev = emit(g, { type: 'vraag', player, round: g.round, hand: p.hand.slice(), card, option, right, ok, paal: right === null, sips: Q.sips, disco });
  if (++g.turn >= g.players.length) { g.turn = 0; g.round++; }
  if (g.round >= QUESTIONS.length) { startPyramid(g); roundEnd(g); }
  return ev;
}

// Uitdelen: de uitdeler verdeelt al zijn slokken in één keer, bijvoorbeeld { 1: 2, 3: 1 }.
export function deal(g, from, dist) {
  const d = g.deals.find((x) => x.from === from);
  if (!d || !dist || typeof dist !== 'object') return null;
  const to = {};
  let sum = 0;
  for (const [k, v] of Object.entries(dist)) {
    const i = Number(k), n = Number(v);
    if (!Number.isInteger(i) || !g.players[i] || i === from || !Number.isInteger(n) || n < 0) return null;
    if (n > 0) { to[i] = n; sum += n; }
  }
  if (sum !== d.n) return null;
  g.deals = g.deals.filter((x) => x !== d);
  g.players[from].dealt += d.n;
  for (const [i, n] of Object.entries(to)) addSips(g, Number(i), n, from);
  return emit(g, { type: 'uitdelen', from, n: d.n, to });
}

// Al hardop uitgedeeld (of de uitdeler is weg): de slokken tellen als uitgedeeld, zonder ontvangers.
export function skipDeal(g, from) {
  const d = g.deals.find((x) => x.from === from);
  if (!d) return null;
  g.deals = g.deals.filter((x) => x !== d);
  g.players[from].dealt += d.n;
  return emit(g, { type: 'uitdelen', from, n: d.n, to: {}, hardop: true });
}

// Slokken: nieuwe slokken nu doen of sparen; aan het eind van een ronde de gespaarde opnieuw.
// Aan het eind van het spel kan sparen niet meer.
export function sips(g, player, act) {
  const p = g.players[player];
  if (!p || (act !== 'now' && act !== 'save')) return null;
  const end = g.phase === 'klaar';
  if (p.pending > 0) {
    if (act === 'save' && end) return null;
    const n = p.pending;
    if (act === 'now') p.drank += n;
    else { p.saved += n; p.savedTotal += n; }
    p.pending = 0;
    p.from = [];
    return emit(g, { type: 'slok', player, act, n, kind: 'nieuw' });
  }
  if (p.settle) {
    if (act === 'save' && p.settle === 'eind') return null;
    const n = p.saved, kind = p.settle;
    if (act === 'now') { p.drank += n; p.saved = 0; }
    p.settle = null;
    return emit(g, { type: 'slok', player, act, n, kind });
  }
  return null;
}

// Een bak gedaan (na een disco). Een bak kun je niet sparen.
export function bak(g, player) {
  const p = g.players[player];
  if (!p || p.bak <= 0) return null;
  p.bak--;
  p.bakken++;
  if (!p.bak) p.bakFrom = [];
  return emit(g, { type: 'bak', player });
}

function startPyramid(g) {
  g.phase = 'piramide';
  g.pyramid = PYRAMID_SLOTS.map((x) => ({ card: g.deck.pop(), row: x.row, open: false, laid: [] }));
  g.next = 0;
}

// Indexen in g.pyramid per rij, bovenste rij eerst (zo staat hij op het scherm).
export function pyramidRows() {
  const rows = [];
  let i = 0;
  PYRAMID.forEach((r) => { rows.unshift(Array.from({ length: r.lay.length }, (_, k) => i + k)); i += r.lay.length; });
  return rows;
}

// Piramide: de volgende kaart omdraaien. Wie dezelfde waarde heeft, moet zelf zijn kaart wegleggen (lay).
export function flip(g) {
  if (g.phase !== 'piramide' || g.deals.length || g.next >= g.pyramid.length) return null;
  const index = g.next++;
  const slot = g.pyramid[index];
  slot.open = true;
  return emit(g, { type: 'piramide', index, row: slot.row, card: slot.card, last: g.next >= g.pyramid.length });
}

// Een eigen kaart wegleggen op de kaart die net is omgedraaid. Alleen met dezelfde waarde, en alleen
// zolang de volgende kaart nog niet om is: wie te laat is, heeft hem gemist.
export function lay(g, player, card) {
  const p = g.players[player];
  if (g.phase !== 'piramide' || !g.next || !p || !card) return null;
  const index = g.next - 1, slot = g.pyramid[index];
  const k = p.hand.findIndex((c) => c.r === card.r && c.s === card.s);
  if (k < 0 || p.hand[k].r !== slot.card.r) return null;
  const [c] = p.hand.splice(k, 1);
  p.laid.push(c);
  slot.laid.push({ p: player, card: c });
  const n = PYRAMID_SLOTS[index].sips;
  queueDeal(g, player, n);
  return emit(g, { type: 'gelegd', player, card: c, index, row: slot.row, n });
}

// Alle kaarten liggen open en alles is uitgedeeld: wie moet de bus in?
export function endPyramid(g) {
  if (g.phase !== 'piramide' || g.deals.length || g.next < g.pyramid.length) return null;
  finishPyramid(g);
  return emit(g, { type: 'piramideklaar', phase: g.phase });
}

function finishPyramid(g) {
  roundEnd(g);
  const most = Math.max(...g.players.map((p) => p.hand.length));
  const cands = g.players.map((_, i) => i).filter((i) => g.players[i].hand.length === most);
  if (cands.length === 1) startBus(g, cands[0]);
  else startPick(g, cands, 1);
}

// Gelijkspel om de bus: iedereen die gelijk staat kiest een dichte kaart; de laagste moet de bus in.
function startPick(g, cands, round) {
  g.phase = 'kiezen';
  g.candidates = cands;
  g.pick = { round, cards: freshDeck(g).slice(0, cands.length + PICK_EXTRA), taken: {} };
}

export function pick(g, player, i) {
  const pk = g.pick;
  if (g.phase !== 'kiezen' || !pk || g.deals.length || !g.candidates.includes(player)) return null;
  if (!Number.isInteger(i) || !pk.cards[i] || pk.taken[i] != null || Object.values(pk.taken).includes(player)) return null;
  pk.taken[i] = player;
  if (Object.keys(pk.taken).length < g.candidates.length) return emit(g, { type: 'gekozen', player, index: i });
  const picks = Object.entries(pk.taken).map(([idx, p]) => ({ p, index: Number(idx), card: pk.cards[idx] }));
  const low = Math.min(...picks.map((x) => x.card.r));
  const losers = picks.filter((x) => x.card.r === low).map((x) => x.p).sort((a, b) => a - b);
  const ev = emit(g, { type: 'kies', round: pk.round, picks, low: losers, again: losers.length > 1 });
  if (losers.length === 1) startBus(g, losers[0]);
  else startPick(g, losers, pk.round + 1);
  return ev;
}

function busRow(g) {
  g.deck = freshDeck(g);
  return g.deck.splice(-g.busLength);
}

function startBus(g, rider) {
  g.phase = 'bus';
  g.rider = rider;
  g.bus = { cards: busRow(g), open: 1, tries: 1, drank: 0, fail: null };
}

// De bus: is de volgende kaart hoger of lager dan de laatste open kaart?
export function guess(g, player, option) {
  const b = g.bus;
  if (g.phase !== 'bus' || player !== g.rider || g.deals.length || !b || b.fail || (option !== 'hoger' && option !== 'lager')) return null;
  const prev = b.cards[b.open - 1], card = b.cards[b.open];
  const right = busTruth(prev, card);
  const ok = right === option;
  const step = b.open++;   // de hoeveelste gok dit is
  let done = false;
  if (!ok) {
    b.fail = { step, sips: step };
    b.drank += step;
    addSips(g, g.rider, step, -1);
  } else if (b.open >= b.cards.length) {
    done = true;
    g.phase = 'klaar';
    roundEnd(g, 'eind');
  }
  return emit(g, { type: 'bus', player, step, prev, card, option, right, ok, paal: right === null, sips: ok ? 0 : step, done, tries: b.tries });
}

// Na een foute gok: nieuwe kaarten en opnieuw vooraan beginnen.
export function retry(g, player) {
  const b = g.bus;
  if (g.phase !== 'bus' || player !== g.rider || !b || !b.fail) return null;
  b.cards = busRow(g);
  b.open = 1;
  b.fail = null;
  b.tries++;
  return emit(g, { type: 'opnieuw', player, tries: b.tries });
}

// Wie moet er nu iets doen? (voor de spelers die wachten, en voor de host die voor iemand invalt)
export function waitingOn(g) {
  if (g.deals.length) return g.deals.map((d) => d.from);
  if (g.phase === 'vragen') return [g.turn];
  if (g.phase === 'kiezen') return g.candidates.filter((p) => !Object.values(g.pick.taken).includes(p));
  if (g.phase === 'bus') return [g.rider];
  return [];
}

function topOf(g, key) {
  const best = Math.max(...g.players.map((p) => p[key]));
  if (!(best > 0)) return null;
  return { names: g.players.filter((p) => p[key] === best).map((p) => p.name), value: best };
}

// Titels voor de uitslag, zoals de titels na een race in Karnemelk Kart.
export function titles(g) {
  const out = [];
  if (g.rider != null && g.bus) {
    out.push({ id: 'chauffeur', title: 'Buschauffeur', names: [g.players[g.rider].name],
      text: `${g.bus.tries} ${g.bus.tries === 1 ? 'rit' : 'ritten'}, ${sipsText(g.bus.drank)} in de bus` });
  }
  const goed = topOf(g, 'goed');
  if (goed) out.push({ id: 'waarzegger', title: 'Waarzegger', names: goed.names, text: `${goed.value} van de 4 goed geraden` });
  const dealt = topOf(g, 'dealt');
  if (dealt) out.push({ id: 'uitdeler', title: 'Uitdeler', names: dealt.names, text: `${sipsText(dealt.value)} uitgedeeld` });
  const got = topOf(g, 'got');
  if (got) out.push({ id: 'dorstig', title: 'Dorstigste', names: got.names, text: `${sipsText(got.value)} gekregen` });
  const saved = topOf(g, 'savedTotal');
  if (saved) out.push({ id: 'spaarpot', title: 'Spaarpot', names: saved.names, text: `${sipsText(saved.value)} gespaard` });
  const disco = topOf(g, 'disco');
  if (disco) out.push({ id: 'disco', title: 'Discokoning', names: disco.names, text: `${disco.value} keer disco: iedereen een bak` });
  const laid = Math.max(...g.players.map((p) => p.laid.length));
  if (laid > 0) out.push({ id: 'piramide', title: 'Piramidekoning', names: g.players.filter((p) => p.laid.length === laid).map((p) => p.name), text: `${laid} ${laid === 1 ? 'kaart' : 'kaarten'} in de piramide gelegd` });
  return out;
}
