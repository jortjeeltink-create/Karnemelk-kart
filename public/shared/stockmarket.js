// Stock Market (nep geld): de rekenkern. Elke ronde volgt uit de klok en een vaste seed,
// dus iedereen die tegelijk speelt ziet dezelfde koers, dezelfde spelers en dezelfde jackpot.
import { rng, hashString, clamp } from './util.js';

export const BET_MS = 10000;      // "PLAATS UW INZET 10 … 1"
export const TRADE_MS = 10000;    // de handelssessie
export const RESULT_MS = 1000;    // "U WINT"
export const CYCLE_MS = BET_MS + TRADE_MS + RESULT_MS; // 21 s, zoals de ronde-id's van het origineel
export const EPOCH = Date.UTC(2024, 0, 1);
export const KNOTS = 30;          // knikpunten in de koerslijn per sessie
export const MAX_MOVE = 100;      // de koers stijgt of daalt nooit meer dan 100%: maximaal 2x je inzet
export const FEE = 0.01;          // 1% fee bij het uitbetalen van je portefeuille
export const MIN_BET = 0.1;
export const JACKPOT = { seed: 575000, cap: 600000, rate: 2, fee: 0.1, stepMs: 700, minRun: 3000 };

export const NAMES = [
  'ADAM', 'LUCAS', 'NOAH', 'EMMA', 'SOPHIE', 'DAAN', 'SEM', 'LIAM', 'MILA', 'TESS', 'JULIA', 'FENNA', 'BRAM', 'THIJS',
  'RUBEN', 'LARS', 'SANNE', 'ANOUK', 'NIELS', 'KOEN', 'MAX', 'FINN', 'LOTTE', 'ROOS', 'JESSE', 'LUUK', 'SVEN', 'IRIS',
  'ESMEE', 'MEHMET', 'YOUSSEF', 'SARA', 'NINA', 'TIM', 'RICK', 'DENNIS', 'KEVIN', 'MARCO', 'PETER', 'HENK', 'GERRIT',
  'ANNA', 'LISA', 'FLEUR', 'BAS', 'JOOST', 'WOUTER', 'MARTIJN', 'SANDER', 'ROBIN', 'PIM', 'TOM', 'JOP', 'OLIVIER',
  'DANIEL', 'MARK', 'PAUL', 'ERIK', 'JAN', 'KLAAS', 'DIRK', 'ROB', 'NICK', 'YARA', 'FAY', 'JADE', 'EVI', 'LYNN', 'SAM',
  'MIKE', 'STEFAN', 'NORA', 'HUGO', 'CASPER', 'VERA', 'FREEK', 'JOEP', 'MAUD', 'GIJS', 'TIJN', 'ILSE', 'ROEL', 'OMAR',
];

export const money = (v) => Math.round(v * 100) / 100;
export const floor2 = (v) => Math.floor(v * 100 + 1e-6) / 100;

const rngFor = (n, salt) => rng(hashString(`sm:${salt}:${n}`));
function gauss(R) {
  const u = Math.max(1e-12, R());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R());
}
function memo(map, key, make, keep = 400) {
  let v = map.get(key);
  if (v === undefined) {
    v = make(key);
    map.set(key, v);
    if (map.size > keep) map.delete(map.keys().next().value);
  }
  return v;
}

// ---------- tijd ----------
// Ronde n: eerst inzetten, dan handelen, dan kort de uitslag.
export function state(t) {
  const n = Math.floor((t - EPOCH) / CYCLE_MS);
  const betStart = EPOCH + n * CYCLE_MS;
  const tradeStart = betStart + BET_MS;
  const tradeEnd = tradeStart + TRADE_MS;
  const phase = t < tradeStart ? 'bet' : t < tradeEnd ? 'trade' : 'result';
  return { n, phase, betStart, tradeStart, tradeEnd, end: betStart + CYCLE_MS };
}
export const tradeStartOf = (n) => EPOCH + n * CYCLE_MS + BET_MS;
export const tradeEndOf = (n) => tradeStartOf(n) + TRADE_MS;

// ---------- koers ----------
// Slotkoers in hele procenten, -100 t/m 100. Stijgen en dalen zijn even waarschijnlijk en even groot,
// dus gemiddeld komt de inzet precies terug; de 1% fee is het huisvoordeel (99% terug).
const moves = new Map();
export function move(n) {
  return memo(moves, n, () => {
    const R = rngFor(n, 'koers');
    const up = R() < 0.5;
    const u = [R(), R(), R(), R()].sort((a, b) => a - b); // Beta(3,2): meestal 40-90%, soms klein
    const mag = Math.round(u[2] * MAX_MOVE);
    return up || mag === 0 ? mag : -mag;
  }, 2000);
}

// De koerslijn: KNOTS+1 punten van 0 naar de slotkoers, gekarteld zoals een echte grafiek.
// Het eerste deel loopt vrij en weet niet waar de sessie eindigt: trends die vaak omdraaien en
// boosts (een sprong in één knik). Pas in het laatste stuk gaat de lijn naar de slotkoers,
// bij een groot verschil met een boost. Zo zegt het begin niets over de uitslag.
export const BOOST = 14; // zoveel procentpunt in één knik telt als boost
const paths = new Map();
export function path(n) {
  return memo(paths, n, () => {
    const r = move(n);
    const R = rngFor(n, 'pad');
    const m = 16 + Math.floor(R() * 7); // tot hier loopt de koers vrij
    const p = [0];
    let slope = gauss(R) * 4;
    for (let i = 1; i <= m; i++) {
      const prev = p[i - 1];
      if (R() < 0.3) slope = gauss(R) * 5;
      let step = slope + gauss(R) * 3.5 - prev * 0.06;
      if (R() < 0.05) step += (R() < 0.5 + prev / 250 ? -1 : 1) * (18 + R() * 30);
      let v = prev + step;
      if (Math.abs(v) > 92) { v = Math.sign(v) * (184 - Math.abs(v)); slope = -slope; }
      p.push(v);
    }
    const from = p[m], dist = r - from, k = KNOTS - m;
    const jump = Math.abs(dist) > 25 && R() < 0.55 ? m + 1 + Math.floor(R() * k) : -1;
    const share = jump > 0 ? 0.45 + R() * 0.35 : 0;
    for (let i = m + 1; i < KNOTS; i++) {
      const f = (i - m) / k;
      const base = from + dist * ((1 - share) * f + (i >= jump && jump > 0 ? share : 0));
      p.push(clamp(base + gauss(R) * 3 * Math.sin(Math.PI * f), -MAX_MOVE, MAX_MOVE));
    }
    p.push(r);
    return p;
  }, 60);
}
// Grootte van de boost in het stuk lijn waar de sessie nu is (0 als er geen boost is).
export function boostAt(n, f) {
  const p = path(n);
  const i = Math.min(KNOTS - 1, Math.floor(clamp(f, 0, 1) * KNOTS));
  const d = p[i + 1] - p[i];
  return Math.abs(d) >= BOOST ? d : 0;
}
// Koers (in %) op een fractie 0..1 van de sessie.
export function pctAt(n, f) {
  const p = path(n);
  const x = clamp(f, 0, 1) * KNOTS;
  if (x >= KNOTS) return p[KNOTS];
  const i = Math.floor(x);
  return p[i] + (p[i + 1] - p[i]) * (x - i);
}

// Waarde van je portefeuille bij een koersverandering van pct procent.
export const portfolio = (up, down, pct) => Math.max(0, up * (1 + pct / 100) + down * (1 - pct / 100));
export const cashOut = (value) => money(value * (1 - FEE));

// ---------- andere spelers ----------
// Elke ronde stappen er nieuwe spelers in. Een deel laat zijn portefeuille een paar rondes staan
// (automatisch opnieuw inzetten), zoals bij het origineel; die staan meteen op het bord.
const fresh = new Map();
function newBettors(m) {
  return memo(fresh, m, () => {
    const R = rngFor(m, 'spelers');
    const pUp = clamp(0.5 + Math.sign(move(m - 1)) * 0.07 + (R() - 0.5) * 0.36, 0.15, 0.85);
    const count = 22 + Math.floor(R() * 24);
    const out = [];
    for (let i = 0; i < count; i++) {
      const name = NAMES[Math.floor(R() * NAMES.length)];
      const up = R() < pUp;
      let stake = Math.exp(gauss(R) * 1.1 + 0.9); // meestal een paar euro
      if (R() < 0.03) stake *= 4 + R() * 16;      // af en toe een grote speler
      stake = clamp(Math.round(stake * 10) / 10, MIN_BET, 400);
      const life = R() < 0.4 ? 1 : 2 + Math.floor(R() * 7);
      const at = 300 + (BET_MS - 800) * R() ** 1.5;
      out.push({ name, up, stake, life, at });
    }
    return out;
  }, 60);
}
const actives = new Map();
// Alle spelers in ronde n, met hun inzet aan het begin van de ronde en wanneer ze inzetten.
export function bettors(n) {
  return memo(actives, n, () => {
    const out = [];
    for (let m = n - 8; m <= n; m++) {
      for (const b of newBettors(m)) {
        if (n - m >= b.life) continue;
        let v = b.stake;
        for (let k = m; k < n; k++) v *= 1 + (b.up ? 1 : -1) * move(k) / 100;
        v = floor2(v);
        if (v < MIN_BET) continue;
        out.push({ name: b.name, up: b.up, stake: v, at: m === n ? b.at : 0, last: n - m === b.life - 1 });
      }
    }
    return out;
  }, 30);
}
// Stand op het bord, ms na het begin van de inzetfase.
export function crowd(n, ms = Infinity) {
  const c = { up: { amt: 0, n: 0 }, down: { amt: 0, n: 0 } };
  for (const b of bettors(n)) {
    if (b.at > ms) continue;
    const s = b.up ? c.up : c.down;
    s.amt += b.stake;
    s.n++;
  }
  return c;
}
// Wie na ronde n met winst uitstapt ("19 HEBBEN € 587 GEWONNEN").
export function winners(n) {
  const r = move(n);
  const list = [];
  for (const b of bettors(n)) {
    if (!b.last) continue;
    const pay = cashOut(portfolio(b.up ? b.stake : 0, b.up ? 0 : b.stake, r));
    if (pay > b.stake) list.push({ name: b.name, amount: pay });
  }
  list.sort((a, b) => b.amount - a.amount);
  return { count: list.length, total: money(list.reduce((t, w) => t + w.amount, 0)), list };
}

// ---------- Superheet jackpot ----------
// Groeit gestaag en valt altijd voordat hij de cap bereikt; het valpunt ligt vast per jackpot.
const dropAmount = (k) => money(JACKPOT.seed + JACKPOT.minRun + rngFor(k, 'jp')() * (JACKPOT.cap - JACKPOT.seed - JACKPOT.minRun - 1));
const runMs = (k) => Math.ceil((dropAmount(k) - JACKPOT.seed) / JACKPOT.rate * 1000);
const jp = { k: 0, start: EPOCH };
export function jackpotAt(t) {
  if (t < jp.start) { jp.k = 0; jp.start = EPOCH; }
  for (let d = runMs(jp.k); jp.start + d <= t; d = runMs(jp.k)) { jp.start += d; jp.k++; }
  const drop = dropAmount(jp.k);
  const steps = Math.floor((t - jp.start) / JACKPOT.stepMs);
  const cents = (hashString(`sm:jpc:${jp.k}:${steps}`) % 100) / 100;
  const amount = Math.min(money(drop - 0.01), money(JACKPOT.seed + steps * JACKPOT.stepMs / 1000 * JACKPOT.rate + cents));
  return { k: jp.k, amount, start: jp.start, dropAt: jp.start + runMs(jp.k), drop };
}
export const jackpotDrop = (k) => dropAmount(k);
export const jackpotWinner = (k) => NAMES[Math.floor(rngFor(k, 'jpwin')() * NAMES.length)];
