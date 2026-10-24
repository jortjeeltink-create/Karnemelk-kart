// Weerwolven: het spel van Wakkerdam, online met iedereen op zijn eigen telefoon. De server is de spelleider: hij
// deelt de rollen uit, houdt de nacht bij en telt de stemmen, dus niemand hoeft spelleider te zijn.
//
// Iedereen krijgt geheim een rol. 's Nachts kiezen de weerwolven samen wie er wordt opgegeten; overdag stemt het
// dorp wie er wordt opgehangen. Het dorp wint als alle weerwolven dood zijn, de weerwolven als alleen zij nog leven.
// 's Nachts heeft iedereen iets te doen op zijn telefoon, zodat je niet aan iemand ziet of hij een rol heeft:
//   Weerwolf  kiest samen met de andere wolven een slachtoffer; ze zien elkaars keuze en moeten het eens worden
//   Ziener    bekijkt de rol van iemand
//   Heks      ziet wie de wolven kozen en kan één keer per spel iemand redden en één keer iemand vergiftigen
//   Cupido    maakt de eerste nacht twee spelers verliefd: sterft de een, dan sterft de ander van verdriet.
//             Zijn een wolf en een dorpeling verliefd, dan winnen zij samen als zij als laatsten over zijn.
//   Jager     schiet als hij doodgaat nog iemand dood
//   Burger    (en wie verder niks te doen heeft) tikt aan wie hij verdenkt
// Slokken: wie doodgaat drinkt er 3, wie op een onschuldige stemde die werd opgehangen 1, en aan het eind drinkt
// de verliezende kant er 3.
// Een potje is een gewoon object (JSON) met de seed van de random-generator erin, net als bij Bussen.
import { shuffle, rand, cleanNames, NAME_MAX } from './bussen.js';

export { cleanNames, NAME_MAX };
export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 12;
export const DEAD_SIPS = 3;
export const WRONG_VOTE_SIPS = 1;
export const LOSE_SIPS = 3;
const LOG_SIZE = 16;

export const ROLES = {
  wolf: { name: 'Weerwolf', team: 'wolf' },
  ziener: { name: 'Ziener', team: 'dorp' },
  heks: { name: 'Heks', team: 'dorp' },
  jager: { name: 'Jager', team: 'dorp' },
  cupido: { name: 'Cupido', team: 'dorp' },
  burger: { name: 'Burger', team: 'dorp' },
};
// de rollen die de host aan of uit kan zetten; zijn er te weinig spelers, dan vallen de laatste af
export const SPECIALS = ['ziener', 'heks', 'jager', 'cupido'];
// wolves: 0 = automatisch (zie autoWolves)
export const DEFAULT_SETTINGS = { wolves: 0, ziener: true, heks: true, jager: true, cupido: false };
export const WOLF_CHOICES = [0, 1, 2, 3];

// Minder dan de helft is wolf; automatisch: 1 tot en met 5 spelers, 2 tot en met 8, daarboven 3.
export const maxWolves = (n) => Math.max(1, Math.floor((n - 1) / 2));
export const autoWolves = (n) => Math.min(maxWolves(n), n <= 5 ? 1 : n <= 8 ? 2 : 3);
export const wolvesFor = (n, wolves) => Math.min(maxWolves(n), wolves || autoWolves(n));

// Welke rollen er meedoen met n spelers: eerst de wolven, dan de aangezette rollen zolang er plek is, de rest burger.
export function roleList(n, settings = DEFAULT_SETTINGS) {
  const w = wolvesFor(n, settings.wolves);
  const specials = SPECIALS.filter((r) => settings[r]).slice(0, n - w);
  return [...Array(w).fill('wolf'), ...specials, ...Array(n - w - specials.length).fill('burger')];
}

// Hoeveel van elke rol er meedoen (dat weet iedereen), in een vaste volgorde.
export function deckOf(roles) {
  const out = {};
  for (const r of Object.keys(ROLES)) {
    const n = roles.filter((x) => x === r).length;
    if (n) out[r] = n;
  }
  return out;
}

const newPlayer = (name) => ({ name, sips: 0, wins: 0, games: 0, role: null, alive: false, ready: false, seen: [] });
const isAlive = (g, p) => Number.isInteger(p) && !!g.players[p] && g.players[p].alive;
export const aliveList = (g) => g.players.flatMap((p, i) => (p.alive ? [i] : []));
const aliveWolves = (g) => aliveList(g).filter((p) => g.players[p].role === 'wolf');

// De kant van een speler. Een wolf en een dorpeling die verliefd zijn, vormen samen hun eigen kant.
export function teamOf(g, p) {
  const L = g.lovers, role = g.players[p].role;
  if (L && L.includes(p) && ROLES[g.players[L[0]].role].team !== ROLES[g.players[L[1]].role].team) return 'liefde';
  return role ? ROLES[role].team : null;
}

function emit(g, ev) {
  ev.seq = ++g.seq;
  g.log.push(ev);
  if (g.log.length > LOG_SIZE) g.log.shift();
  return ev;
}

export function newGame(names, { seed = Date.now(), settings = DEFAULT_SETTINGS } = {}) {
  return {
    seed: seed >>> 0,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    players: cleanNames(names).map(newPlayer),
    // rollen: iedereen bekijkt zijn rol; nacht; dag: stemmen; jager: de jager schiet; klaar: er is een winnaar
    phase: 'rollen',
    round: 0,          // het hoeveelste potje aan deze tafel
    day: 0,            // nacht 1, dag 1, nacht 2, dag 2, ...
    deck: {},          // hoeveel van elke rol er meedoen
    night: null,       // wat er deze nacht gebeurt (zie startNight)
    votes: {},         // overdag: wie stemt op wie (-1 = op niemand)
    lovers: null,      // [a, b] als Cupido twee spelers verliefd maakte
    loversKnown: false,
    potions: { heal: true, poison: true },
    hunter: null,      // { p, then } als de jager nog moet schieten; daarna gaat het spel door met `then`
    winner: null,
    log: [],
    seq: 0,
  };
}

// Er schuift iemand aan als een potje klaar is: die krijgt bij het volgende potje een rol.
export function addPlayer(g, name) {
  g.players.push(newPlayer(name));
}

// Een nieuw potje: iedereen in `present` krijgt geheim een rol, wie er niet is kijkt mee. De stand blijft.
export function deal(g, present) {
  const seats = [...new Set(present)].filter((p) => g.players[p]).sort((a, b) => a - b);
  if (seats.length < MIN_PLAYERS) return null;
  const roles = shuffle(roleList(seats.length, g.settings), () => rand(g));
  for (const pl of g.players) Object.assign(pl, { role: null, alive: false, ready: false, seen: [] });
  seats.forEach((p, k) => Object.assign(g.players[p], { role: roles[k], alive: true }));
  for (const p of seats) g.players[p].games++;
  Object.assign(g, {
    phase: 'rollen', round: g.round + 1, day: 0, deck: deckOf(roles), night: null, votes: {},
    lovers: null, loversKnown: false, potions: { heal: true, poison: true }, hunter: null, winner: null,
  });
  return emit(g, { type: 'rollen', round: g.round, deck: g.deck });
}

// Is de huidige stap klaar (iedereen die leeft heeft zijn rol gezien, zijn nachtopdracht gedaan of gestemd)?
// Dan door naar de volgende. Wie er even niet is, houdt het op; de host kan dan niet langer wachten (force).
function settle(g) {
  const alive = aliveList(g);
  if (g.phase === 'rollen' && alive.every((p) => g.players[p].ready)) return startNight(g);
  if (g.phase === 'nacht') {
    agree(g);
    if (alive.every((p) => nightDone(g, p))) return dawn(g);
  }
  if (g.phase === 'dag' && alive.every((p) => p in g.votes)) return tally(g);
  return true;
}

// Je rol gezien hebben.
export function ready(g, p) {
  if (g.phase !== 'rollen' || !isAlive(g, p) || g.players[p].ready) return null;
  g.players[p].ready = true;
  return settle(g);
}

/* ---------- de nacht ---------- */

// Wat iemand vannacht moet doen. Een heks zonder drankjes en Cupido na de eerste nacht doen wat een burger doet.
function taskFor(g, p) {
  switch (g.players[p].role) {
    case 'wolf': return 'wolf';
    case 'ziener': return 'zien';
    case 'cupido': return g.day === 1 ? 'cupido' : 'verdenk';
    case 'heks': return g.potions.heal || g.potions.poison ? 'heks' : 'verdenk';
    default: return 'verdenk';
  }
}

function startNight(g) {
  g.day++;
  g.phase = 'nacht';
  g.votes = {};
  g.night = { tasks: {}, done: {}, picks: {}, wolves: {}, locked: false, victim: -1, save: false, poison: -1 };
  for (const p of aliveList(g)) g.night.tasks[p] = taskFor(g, p);
  return emit(g, { type: 'nacht', night: g.day });
}

const nightTask = (g, p, task) => g.phase === 'nacht' && isAlive(g, p) && g.night.tasks[p] === task && !g.night.done[p];
// de wolven zijn klaar als ze het eens zijn; de rest als ze hun opdracht gedaan hebben
const nightDone = (g, p) => (g.night.tasks[p] === 'wolf' ? g.night.locked : !!g.night.done[p]);

// Kiezen alle wolven die nog leven hetzelfde slachtoffer, dan ligt het vast.
function agree(g) {
  const n = g.night;
  if (n.locked) return;
  const picks = aliveWolves(g).map((w) => n.wolves[w]);
  if (picks.length && picks.every((x) => x != null && x === picks[0])) {
    n.locked = true;
    n.victim = picks[0];
  }
}

// Een wolf kiest wie er wordt opgegeten (of kiest opnieuw zolang de wolven het niet eens zijn).
export function wolfPick(g, p, target) {
  if (g.phase !== 'nacht' || !isAlive(g, p) || g.night.tasks[p] !== 'wolf' || g.night.locked) return null;
  if (!isAlive(g, target) || g.players[target].role === 'wolf') return null;
  g.night.wolves[p] = target;
  return settle(g);
}

// De ziener bekijkt iemands rol; alleen hij ziet het.
export function look(g, p, target) {
  if (!nightTask(g, p, 'zien') || !isAlive(g, target) || target === p) return null;
  g.players[p].seen.push({ p: target, role: g.players[target].role, night: g.day });
  g.night.picks[p] = target;
  g.night.done[p] = true;
  return settle(g);
}

// Cupido maakt de eerste nacht twee spelers verliefd (hijzelf mag een van de twee zijn).
export function cupid(g, p, a, b) {
  if (!nightTask(g, p, 'cupido') || a === b || !isAlive(g, a) || !isAlive(g, b)) return null;
  g.lovers = [Math.min(a, b), Math.max(a, b)];
  g.night.done[p] = true;
  return settle(g);
}

// De heks, als de wolven gekozen hebben: het slachtoffer redden (save) en/of iemand vergiftigen (poison, -1 = niet).
export function witch(g, p, save, poison) {
  if (!nightTask(g, p, 'heks') || !g.night.locked) return null;
  const n = g.night;
  if (save === true && (!g.potions.heal || n.victim < 0)) return null;
  if (poison !== -1 && (!g.potions.poison || !isAlive(g, poison) || poison === p || poison === n.victim)) return null;
  if (save === true) { g.potions.heal = false; n.save = true; }
  if (poison !== -1) { g.potions.poison = false; n.poison = poison; }
  n.done[p] = true;
  return settle(g);
}

// Wie verder niks te doen heeft, tikt aan wie hij verdenkt. Daar gebeurt niks mee: het is zodat iedereen 's nachts
// op zijn telefoon bezig is.
export function suspect(g, p, target) {
  if (!nightTask(g, p, 'verdenk') || !isAlive(g, target) || target === p) return null;
  g.night.picks[p] = target;
  g.night.done[p] = true;
  return settle(g);
}

// Spelers gaan dood: ze drinken, hun rol wordt bekend, en wie verliefd was op een van hen sterft van verdriet.
function kill(g, list) {
  const out = [];
  const die = (p, cause) => {
    const pl = g.players[p];
    if (!pl.alive) return;
    pl.alive = false;
    pl.sips += DEAD_SIPS;
    out.push(cause ? { p, role: pl.role, cause } : { p, role: pl.role });
  };
  for (const p of list) die(p);
  if (g.lovers) {
    const [a, b] = g.lovers;
    if (!g.players[a].alive && g.players[b].alive) die(b, 'liefde');
    else if (!g.players[b].alive && g.players[a].alive) die(a, 'liefde');
  }
  return out;
}

// De ochtend: wie er vannacht stierf. Hoe (opgegeten of vergiftigd) zegt de spelleider niet.
function dawn(g) {
  const n = g.night;
  const list = [];
  if (n.victim >= 0 && !n.save) list.push(n.victim);
  if (n.poison >= 0 && !list.includes(n.poison)) list.push(n.poison);
  g.loversKnown = !!g.lovers;
  const deaths = kill(g, list);
  g.night = null;
  emit(g, { type: 'ochtend', night: g.day, deaths });
  return after(g, deaths, 'dag');
}

/* ---------- overdag ---------- */

// Stemmen wie er wordt opgehangen (-1 = op niemand). Je kunt je stem veranderen tot iedereen gestemd heeft.
export function vote(g, p, target) {
  if (g.phase !== 'dag' || !isAlive(g, p)) return null;
  if (target !== -1 && (!isAlive(g, target) || target === p)) return null;
  g.votes[p] = target;
  return settle(g);
}

// De meeste stemmen wordt opgehangen; staken de stemmen, dan niemand. Wie op een onschuldige stemde, drinkt.
function tally(g) {
  const votes = Object.entries(g.votes).map(([v, t]) => [Number(v), t]);
  const count = new Map();
  for (const [, t] of votes) if (t >= 0) count.set(t, (count.get(t) || 0) + 1);
  const max = Math.max(0, ...count.values());
  const top = [...count].filter(([, c]) => c === max).map(([t]) => t);
  const lynched = max > 0 && top.length === 1 ? top[0] : -1;
  let wrong = [];
  if (lynched >= 0 && g.players[lynched].role !== 'wolf') {
    wrong = votes.filter(([v, t]) => t === lynched && v !== lynched).map(([v]) => v);
    for (const v of wrong) g.players[v].sips += WRONG_VOTE_SIPS;
  }
  const deaths = lynched >= 0 ? kill(g, [lynched]) : [];
  g.votes = {};
  emit(g, { type: 'stemming', day: g.day, votes, lynched, tie: max > 0 && top.length > 1, wrong, deaths });
  return after(g, deaths, 'nacht');
}

/* ---------- de jager, de winnaar ---------- */

// Na doden: is de jager erbij, dan schiet die eerst; anders verder met `then` (of is er een winnaar).
function after(g, deaths, then) {
  const hunter = deaths.find((d) => d.role === 'jager');
  if (hunter) {
    g.phase = 'jager';
    g.hunter = { p: hunter.p, then };
    return true;
  }
  return proceed(g, then);
}

function proceed(g, then) {
  const w = winner(g);
  if (w) return finish(g, w);
  if (then === 'dag') {
    g.phase = 'dag';
    g.votes = {};
    return true;
  }
  return startNight(g);
}

// De jager neemt iemand mee.
export function shoot(g, p, target) {
  if (g.phase !== 'jager' || p !== g.hunter.p || !isAlive(g, target)) return null;
  const deaths = kill(g, [target]);
  emit(g, { type: 'jager', p, target, deaths });
  const { then } = g.hunter;
  g.hunter = null;
  return proceed(g, then);
}

// Wie er heeft gewonnen, of null als het spel doorgaat.
export function winner(g) {
  const alive = aliveList(g);
  if (!alive.length) return 'niemand';
  const L = g.lovers;
  if (L && alive.length === 2 && L.every((p) => alive.includes(p)) && teamOf(g, L[0]) === 'liefde') return 'liefde';
  const wolves = alive.filter((p) => g.players[p].role === 'wolf').length;
  if (!wolves) return 'dorp';
  if (wolves === alive.length) return 'wolf';
  return null;
}

// Het potje is klaar: alle rollen gaan open en de verliezers drinken.
function finish(g, w) {
  g.phase = 'klaar';
  g.winner = w;
  g.night = null;
  g.hunter = null;
  const inGame = g.players.flatMap((p, i) => (p.role ? [i] : []));
  const winners = w === 'niemand' ? [] : inGame.filter((p) => teamOf(g, p) === w);
  const losers = inGame.filter((p) => !winners.includes(p));
  for (const p of winners) g.players[p].wins++;
  for (const p of losers) g.players[p].sips += LOSE_SIPS;
  return emit(g, { type: 'klaar', winner: w, winners, losers, roles: g.players.map((p) => p.role) });
}

// Nog een potje met iedereen die er is; de stand blijft.
export function next(g, present) {
  if (g.phase !== 'klaar') return null;
  return deal(g, present);
}

// Andere instellingen voor het volgende potje.
export function setSettings(g, settings) {
  if (g.phase !== 'klaar') return false;
  g.settings = { ...g.settings, ...settings };
  return true;
}

/* ---------- als iemand er niet is ---------- */

// Iemand verliet de tafel tijdens het potje: hij is dood (zonder slokken) en zijn rol wordt bekend.
export function leave(g, p) {
  const pl = g.players[p];
  if (!pl || !pl.alive || g.phase === 'klaar') return null;
  pl.alive = false;
  if (g.night) delete g.night.wolves[p];
  const deaths = [{ p, role: pl.role, cause: 'weg' }, ...kill(g, [])];
  emit(g, { type: 'weg', p, deaths });
  const w = winner(g);
  if (w) return finish(g, w);
  return settle(g);
}

// De host wacht niet langer op wie er niet is: de stap gaat door met wat er gekozen is. 's Nachts beslist bij de
// wolven de meeste stemmen (staken ze, dan wordt er niemand opgegeten); een heks die niks koos, doet niks.
export function force(g) {
  switch (g.phase) {
    case 'rollen': return startNight(g);
    case 'nacht': {
      const n = g.night;
      if (!n.locked) {
        const count = new Map();
        for (const w of aliveWolves(g)) if (n.wolves[w] != null) count.set(n.wolves[w], (count.get(n.wolves[w]) || 0) + 1);
        const max = Math.max(0, ...count.values());
        const top = [...count].filter(([, c]) => c === max).map(([t]) => t);
        n.locked = true;
        n.victim = max > 0 && top.length === 1 ? top[0] : -1;
      }
      return dawn(g);
    }
    case 'dag': return tally(g);
    case 'jager': {
      emit(g, { type: 'jager', p: g.hunter.p, target: -1, deaths: [] });
      const { then } = g.hunter;
      g.hunter = null;
      return proceed(g, then);
    }
    default: return null;
  }
}
