// Arena: het wedspel, online met iedereen op zijn eigen telefoon.
// Iedereen begint met een stapel munten. Elke ronde moeten twee spelers de arena in voor een kort minispel van één
// tegen één. De rest zet munten in op wie er wint. Goed gegokt: je inzet erbij. Fout: je inzet kwijt, en net zoveel
// strafpunten. De minispellen: Valse start, Stop op 0, Steen-papier-schaar, Tikrace, Snelle som en Welke kleur?.
// Wie het duel verliest krijgt strafpunten, wie wint krijgt munten. Ben je blut, dan krijg je een mega
// strafpunt en nieuwe munten. Na de laatste ronde wint de rijkste; de armste krijgt een mega strafpunt.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen. De tijd komt
// van buiten (now, in milliseconden), zodat alles te testen is zonder klok.
import { rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 3;        // twee in de arena en minstens één die inzet
export const MAX_PLAYERS = 10;
export const START_MUNTEN = 10;
export const MAX_INZET = 3;          // zoveel munten mag je hooguit op een duel zetten
export const WIN_MUNTEN = 2;         // voor wie het duel wint
export const VERLIES_STRAF = 2;      // strafpunten voor wie het duel verliest
export const BLUT_MUNTEN = 5;        // zoveel munten krijg je terug als je blut bent (samen met een mega strafpunt)
export const LENGTES = [6, 10, 14];  // aantal rondes; de host kiest
export const LENGTE_DEFAULT = 10;
const LOG_SIZE = 12;

// De minispellen. Elk duurt maar een paar seconden en is op de telefoon van de twee spelers te spelen.
export const SPELLEN = ['reactie', 'stop', 'sps', 'tikken', 'som', 'kleur'];
export const SPEL_NAAM = { reactie: 'Valse start', stop: 'Stop op 0', sps: 'Steen, papier, schaar', tikken: 'Tikrace', som: 'Snelle som', kleur: 'Welke kleur?' };
export const SPEL_UITLEG = {
  reactie: 'Tik zodra het scherm groen wordt. Let op: eerst komen er nepseintjes in een andere kleur. Te vroeg getikt is verloren.',
  stop: 'De klok telt af vanaf 10 seconden en verdwijnt na 3 seconden. Wie het dichtst bij 0 stopt, wint.',
  sps: 'Kies steen, papier of schaar. Wie het eerst twee keer wint, wint het duel.',
  tikken: 'Tik in 5 seconden zo vaak als je kunt op het scherm. De meeste tikken wint.',
  som: 'Er komt een som in beeld. Wie het eerst het goede antwoord aantikt, wint. Fout getikt is verloren.',
  kleur: 'Er komt een kleur in beeld als woord, maar in een andere kleur geschreven. Tik de kleur van de letters aan, niet het woord. Fout is verloren.',
};
export const QUIZ = ['som', 'kleur'];  // de minispellen met een vraag en antwoorden om aan te tikken
export const KLEUREN = ['rood', 'blauw', 'groen', 'geel'];
export const SPS = ['steen', 'papier', 'schaar'];
export const SPS_WINS = 2;           // zoveel keer winnen bij steen, papier, schaar
export const TIK_MS = 5000;          // zo lang duurt de tikrace
export const STOP_DOEL = 10000;      // de klok telt af vanaf 10 seconden: stop hem op 0
export const STOP_ZICHT = 3000;      // zo lang zie je de klok lopen
export const NEP_MS = 450;           // zo lang blijft een nepseintje in beeld
export const AFTEL_MS = 3500;        // 3, 2, 1 voor de tikrace en de stopwatch
const REACTIE_MIN = 3000, REACTIE_EXTRA = 4000, REACTIE_MAX = 5000;
const STOP_MAX = STOP_DOEL + 6000;   // wie dan nog niet gestopt heeft, is te laat
const QUIZ_MAX = 10000;              // zo lang mag je over een antwoord doen
const TIK_MAX = 90;                  // meer tikken dan dit in 5 seconden kan een mens niet

const newPlayer = (name) => ({ name, munten: START_MUNTEN, straf: 0, mega: 0, duels: 0, gewonnen: 0, goed: 0, blut: 0 });

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now(), rondes = LENGTE_DEFAULT } = {}) {
  return {
    seed: seed >>> 0,
    players: cleanNames(names).map(newPlayer),
    phase: 'inzet',         // inzet → duel → uitslag → (volgende ronde) … → klaar
    ronde: 0,
    rondes: LENGTES.includes(rondes) ? rondes : LENGTE_DEFAULT,
    a: -1, b: -1,           // de twee in de arena
    spel: null,             // het minispel van deze ronde
    zak: [],                // de minispellen die nog moeten komen
    bets: {},               // speler → { op, n }; n = 0 is overgeslagen (iemand die weg is)
    duel: null,
    last: null,             // de uitslag van de vorige ronde
    eind: null,             // de eindstand
    seq: 0,
    log: [],
  };
}

export function addPlayer(g, name) {
  g.players.push(newPlayer(cleanNames([...g.players.map((p) => p.name), name]).pop()));
}

// Wie moeten er de arena in? De twee die het minst vaak geweest zijn (bij gelijk loot), liefst niet weer hetzelfde paar.
function pickPair(g, live) {
  const pool = live.length >= 2 ? live : g.players.map((_, i) => i);
  const order = pool.map((i) => ({ i, k: g.players[i].duels + rand(g) * .9 })).sort((x, y) => x.k - y.k).map((x) => x.i);
  let [a, b] = order;
  const same = (x, y) => (x === g.a && y === g.b) || (x === g.b && y === g.a);
  if (same(a, b) && order.length > 2) b = order[2];
  return rand(g) < .5 ? [a, b] : [b, a];
}

function nieuweRonde(g, live) {
  g.ronde++;
  [g.a, g.b] = pickPair(g, live);
  // De minispellen komen uit een geschudde stapel: zo komen ze allemaal even vaak langs, en nooit twee keer achter
  // elkaar hetzelfde (ook niet als de stapel opnieuw geschud wordt).
  if (!g.zak || !g.zak.length) {
    g.zak = schud(g, SPELLEN);
    if (g.zak[g.zak.length - 1] === g.spel) g.zak.unshift(g.zak.pop());
  }
  g.spel = g.zak.pop();
  g.bets = {};
  g.duel = null;
  g.phase = 'inzet';
  return emit(g, { type: 'ronde', ronde: g.ronde, a: g.a, b: g.b, spel: g.spel });
}

export function begin(g, live) {
  if (g.ronde || g.players.length < MIN_PLAYERS) return null;
  return nieuweRonde(g, live);
}

export const inArena = (g, p) => p === g.a || p === g.b;
// wie er nog moeten inzetten: iedereen die erbij is en niet zelf in de arena staat
export const wachtOp = (g, live) => live.filter((i) => !inArena(g, i) && !g.bets[i]);

/* ---------- inzetten ---------- */
// Zet n munten op speler `op` (een van de twee in de arena). Heeft iedereen ingezet, dan begint het duel.
export function bet(g, player, op, n, live, now) {
  const p = g.players[player];
  if (g.phase !== 'inzet' || !p || inArena(g, player) || g.bets[player]) return null;
  if (!inArena(g, op) || !Number.isInteger(n) || n < 1 || n > Math.min(MAX_INZET, p.munten)) return null;
  g.bets[player] = { op, n };
  const ev = emit(g, { type: 'inzet', player });
  startAlsKlaar(g, live, now);
  return ev;
}

// Iemand die weg is slaat deze ronde over (de host doet dat voor hem).
export function skipBet(g, player, live, now) {
  if (g.phase !== 'inzet' || !g.players[player] || inArena(g, player) || g.bets[player]) return null;
  g.bets[player] = { op: -1, n: 0 };
  const ev = emit(g, { type: 'overgeslagen', player });
  startAlsKlaar(g, live, now);
  return ev;
}

// Ging er iemand weg of kwam er iemand terug? Misschien is iedereen die er is nu klaar met inzetten.
export function fixBets(g, live, now) {
  if (g.phase === 'inzet') startAlsKlaar(g, live, now);
}

function startAlsKlaar(g, live, now) {
  if (g.phase === 'inzet' && !wachtOp(g, live).length) startDuel(g, now, 1);
}

/* ---------- het duel ---------- */
function startDuel(g, now, poging) {
  g.phase = 'duel';
  const d = { spel: g.spel, poging, res: {}, deadline: 0 };
  if (g.spel === 'reactie') {
    const wacht = Math.round(REACTIE_MIN + rand(g) * REACTIE_EXTRA);
    d.goAt = now + wacht;
    d.deadline = d.goAt + REACTIE_MAX + 1500;
    // De nepseintjes: een paar keer licht het scherm op in een andere kleur. `voor` is hoeveel milliseconden voor
    // het echte groen het seintje begint; k is welke kleur. Het laatste is ruim voor het groen weer weg.
    d.nep = [];
    let t = 900 + rand(g) * 700;
    for (let k = 1 + Math.floor(rand(g) * 3); k > 0 && t <= wacht - NEP_MS - 500; k--) {
      d.nep.push({ voor: Math.round(wacht - t), k: Math.floor(rand(g) * 3) });
      t += NEP_MS + 500 + rand(g) * 900;
    }
  } else if (g.spel === 'tikken') {
    d.startAt = now + AFTEL_MS;
    d.n = { [g.a]: 0, [g.b]: 0 };
    d.deadline = d.startAt + TIK_MS + 2500;
  } else if (g.spel === 'sps') {
    d.keuze = {};
    d.score = { [g.a]: 0, [g.b]: 0 };
    d.rondjes = [];
    d.deadline = now + 25000;
  } else if (g.spel === 'stop') {
    d.startAt = now + AFTEL_MS;
    d.deadline = d.startAt + STOP_MAX + 1000;
  } else {
    d.startAt = now + AFTEL_MS;
    Object.assign(d, g.spel === 'som' ? maakSom(g) : maakKleur(g));
    d.deadline = d.startAt + QUIZ_MAX + 1500;
  }
  g.duel = d;
  return emit(g, { type: 'duel', spel: g.spel, poging });
}

// in willekeurige volgorde (met de random-generator van het potje)
function schud(g, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand(g) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const kies1 = (g, list) => list[Math.floor(rand(g) * list.length)];
const tussen = (g, lo, hi) => lo + Math.floor(rand(g) * (hi - lo + 1));

// Snelle som: een plus-, min- of keersom met drie antwoorden die dicht bij elkaar liggen.
function maakSom(g) {
  const soort = kies1(g, ['+', '−', '×']);
  let a, b, uit;
  if (soort === '×') { a = tussen(g, 3, 9); b = tussen(g, 3, 9); uit = a * b; }
  else if (soort === '+') { a = tussen(g, 12, 58); b = tussen(g, 12, 39); uit = a + b; }
  else { a = tussen(g, 31, 95); b = tussen(g, 12, a - 6); uit = a - b; }
  const fout = schud(g, soort === '×' ? [uit - a, uit + a, uit - b, uit + b, uit - 1, uit + 1, uit + 2] : [uit - 10, uit + 10, uit - 1, uit + 1, uit - 2, uit + 2]);
  const opties = schud(g, [uit, ...[...new Set(fout)].filter((x) => x !== uit && x > 0).slice(0, 2)]);
  return { vraag: { tekst: `${a} ${soort} ${b}`, opties }, goed: opties.indexOf(uit), oplossing: `${a} ${soort} ${b} = ${uit}` };
}

// Welke kleur?: de naam van een kleur, geschreven in een andere kleur. Het goede antwoord is de kleur van de letters.
function maakKleur(g) {
  const inkt = kies1(g, KLEUREN), woord = kies1(g, KLEUREN.filter((k) => k !== inkt));
  const opties = schud(g, KLEUREN);
  return { vraag: { woord, inkt, opties }, goed: opties.indexOf(inkt), oplossing: `De letters waren ${inkt}` };
}

const beide = (g) => g.duel.res[g.a] != null && g.duel.res[g.b] != null;
const ander = (g, p) => (p === g.a ? g.b : g.a);
// gelijk: nog een keer hetzelfde minispel. Is het al vaker gelijk geweest, dan beslist het lot (anders kan het
// eindeloos doorgaan, bijvoorbeeld als allebei niks doen).
export const MAX_POGING = 3;
function gelijk(g, now, detail, lot = false) {
  if (lot || g.duel.poging >= MAX_POGING) return resolve(g, rand(g) < .5 ? g.a : g.b, { loot: true, gelijk: detail });
  emit(g, { type: 'gelijk', detail });
  return startDuel(g, now, g.duel.poging + 1);
}

// Valse start: hoe snel tikte je na het groene scherm (ms, gemeten op je eigen telefoon)? early = te vroeg getikt.
export function tik(g, player, ms, early, now) {
  const d = g.duel;
  if (g.phase !== 'duel' || d.spel !== 'reactie' || !inArena(g, player) || d.res[player] != null) return null;
  if (!early && !(Number.isFinite(ms) && now >= d.goAt - 250)) return null;   // nog niet groen: dat kan alleen te vroeg zijn
  d.res[player] = early ? -1 : Math.max(100, Math.min(REACTIE_MAX, Math.round(ms)));
  if (!beide(g)) return emit(g, { type: 'getikt', player, early: !!early });
  const ra = d.res[g.a], rb = d.res[g.b];
  if (ra === rb) return gelijk(g, now, ra < 0 ? 'Allebei te vroeg' : 'Precies even snel');
  const winner = ra < 0 ? g.b : rb < 0 ? g.a : ra < rb ? g.a : g.b;
  return resolve(g, winner, { ms: { [g.a]: ra, [g.b]: rb } });
}

// Tikrace: je stand tot nu toe (klaar = de 5 seconden zijn om).
export function tikken(g, player, n, klaar, now) {
  const d = g.duel;
  if (g.phase !== 'duel' || d.spel !== 'tikken' || !inArena(g, player) || d.res[player] != null) return null;
  if (now < d.startAt - 250 || !Number.isInteger(n) || n < 0) return null;
  d.n[player] = Math.max(d.n[player], Math.min(TIK_MAX, n));
  if (!klaar) return { type: 'tikstand' };   // alleen de stand bijwerken, geen gebeurtenis
  if (now < d.startAt + TIK_MS - 400) return null;
  d.res[player] = d.n[player];
  if (!beide(g)) return emit(g, { type: 'getikt', player });
  if (d.res[g.a] === d.res[g.b]) return gelijk(g, now, d.res[g.a] ? `Allebei ${d.res[g.a]} tikken` : 'Niemand tikte', !d.res[g.a]);
  return resolve(g, d.res[g.a] > d.res[g.b] ? g.a : g.b, { tikken: { ...d.res } });
}

// Steen, papier, schaar: kies; hebben allebei gekozen, dan gaat het open. Wie het eerst SPS_WINS keer wint, wint.
export function kies(g, player, keuze, now) {
  const d = g.duel;
  if (g.phase !== 'duel' || d.spel !== 'sps' || !inArena(g, player) || d.keuze[player] || !SPS.includes(keuze)) return null;
  d.keuze[player] = keuze;
  if (!d.keuze[g.a] || !d.keuze[g.b]) return emit(g, { type: 'gekozen', player });
  const ka = d.keuze[g.a], kb = d.keuze[g.b];
  const w = ka === kb ? -1 : (SPS.indexOf(ka) - SPS.indexOf(kb) + 3) % 3 === 1 ? g.a : g.b;
  d.rondjes.push({ [g.a]: ka, [g.b]: kb, w });
  d.keuze = {};
  d.deadline = now + 25000;
  if (w >= 0 && ++d.score[w] >= SPS_WINS) return resolve(g, w, { sps: d.rondjes, score: { ...d.score } });
  return emit(g, { type: 'sps', a: ka, b: kb, w });
}

// Snelle som en Welke kleur?: welk antwoord tikte je aan (k, het nummer van de knop) en hoe snel (ms na het
// verschijnen van de vraag, gemeten op je eigen telefoon)? Een fout antwoord is verloren, net als te vroeg tikken.
export function antwoord(g, player, k, ms, now) {
  const d = g.duel;
  if (g.phase !== 'duel' || !QUIZ.includes(d.spel) || !inArena(g, player) || d.res[player] != null) return null;
  if (now < d.startAt - 250 || !Number.isInteger(k) || k < 0 || k >= d.vraag.opties.length || !Number.isFinite(ms)) return null;
  d.res[player] = k === d.goed ? Math.max(150, Math.min(QUIZ_MAX, Math.round(ms))) : -1;
  if (!beide(g)) return emit(g, { type: 'getikt', player });
  const ra = d.res[g.a], rb = d.res[g.b];
  if (ra === rb) return gelijk(g, now, ra < 0 ? 'Allebei fout' : 'Precies even snel');
  const winner = ra < 0 ? g.b : rb < 0 ? g.a : ra < rb ? g.a : g.b;
  return resolve(g, winner, { ms: { [g.a]: ra, [g.b]: rb }, quiz: d.oplossing });
}

// Stop op 0: hoeveel milliseconden na de start stopte je de klok (gemeten op je eigen telefoon)? De klok telt af
// vanaf STOP_DOEL, dus precies STOP_DOEL milliseconden is precies 0.
export function stop(g, player, ms, now) {
  const d = g.duel;
  if (g.phase !== 'duel' || d.spel !== 'stop' || !inArena(g, player) || d.res[player] != null) return null;
  if (now < d.startAt - 250 || !Number.isFinite(ms)) return null;
  d.res[player] = Math.max(0, Math.min(STOP_MAX, Math.round(ms)));
  if (!beide(g)) return emit(g, { type: 'getikt', player });
  const da = Math.abs(d.res[g.a] - STOP_DOEL), db = Math.abs(d.res[g.b] - STOP_DOEL);
  if (da === db) return gelijk(g, now, 'Precies even dichtbij');
  return resolve(g, da < db ? g.a : g.b, { stop: { ...d.res } });
}

// De tijd is om en er mist nog iemand: wie niks deed, verliest. Deden ze allebei niks, dan beslist het lot.
export function tijd(g, now) {
  const d = g.duel;
  if (g.phase !== 'duel' || now < d.deadline) return null;
  const klaar = (p) => (d.spel === 'sps' ? !!d.keuze[p] : d.res[p] != null);
  const ka = klaar(g.a), kb = klaar(g.b);
  const winner = ka && !kb ? g.a : kb && !ka ? g.b : rand(g) < .5 ? g.a : g.b;
  return resolve(g, winner, { tijdOm: true, loot: ka === kb });
}

// Opgeven (de host doet dat voor iemand die weg is): de ander wint.
export function opgeven(g, player) {
  if (g.phase !== 'duel' || !inArena(g, player)) return null;
  return resolve(g, ander(g, player), { opgegeven: player });
}

/* ---------- de uitslag ---------- */
function resolve(g, winner, detail) {
  const loser = ander(g, winner), W = g.players[winner], L = g.players[loser];
  W.munten += WIN_MUNTEN; W.gewonnen++; W.duels++; L.duels++;
  L.straf += VERLIES_STRAF;
  const bets = [];
  for (const [key, b] of Object.entries(g.bets)) {
    const i = Number(key), p = g.players[i];
    if (!b.n) continue;
    const ok = b.op === winner;
    if (ok) { p.munten += b.n; p.goed++; } else { p.munten -= b.n; p.straf += b.n; }
    bets.push({ p: i, op: b.op, n: b.n, ok });
  }
  // blut: een mega strafpunt en nieuwe munten, zodat je mee kunt blijven doen
  const blut = [];
  g.players.forEach((p, i) => { if (p.munten <= 0) { p.munten = BLUT_MUNTEN; p.mega++; p.blut++; blut.push(i); } });
  g.phase = 'uitslag';
  g.duel = null;
  g.last = { ronde: g.ronde, spel: g.spel, a: g.a, b: g.b, winner, loser, detail, bets, blut };
  return emit(g, { type: 'uitslag', ...g.last });
}

// De host gaat door: de volgende ronde, of na de laatste ronde de eindstand.
export function next(g, live) {
  if (g.phase !== 'uitslag') return null;
  if (g.ronde < g.rondes) return nieuweRonde(g, live);
  const max = Math.max(...g.players.map((p) => p.munten)), min = Math.min(...g.players.map((p) => p.munten));
  const rijkste = g.players.flatMap((p, i) => (p.munten === max ? [i] : []));
  const armste = max === min ? [] : g.players.flatMap((p, i) => (p.munten === min ? [i] : []));
  armste.forEach((i) => { g.players[i].mega++; });
  g.phase = 'klaar';
  g.eind = { rijkste, armste };
  return emit(g, { type: 'einde', rijkste, armste });
}
