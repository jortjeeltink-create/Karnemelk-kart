// Weerwolven online: tafels met een groepscode (zie tafels.js), de spelregels in weerwolven.js.
// Elke telefoon krijgt alleen te zien wat die speler mag weten: zijn eigen rol, wat hij 's nachts ontdekte, de andere
// wolven als hij wolf is, en de rollen van wie dood is. Wie dood is, kijkt als geest mee en ziet alles.
import * as W from './weerwolven.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit en dus een rol krijgt
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const weerwolven = {
  id: 'weerwolven',
  minPlayers: W.MIN_PLAYERS,
  maxPlayers: W.MAX_PLAYERS,
  cleanNames: W.cleanNames,

  setup(t) { t.settings = { ...W.DEFAULT_SETTINGS }; },

  // het aantal wolven en welke rollen meedoen; in de lobby en als een potje klaar is (voor het volgende)
  settings(t, msg) {
    if (t.g && t.g.phase !== 'klaar') return false;
    const s = { ...t.settings };
    if (W.WOLF_CHOICES.includes(msg.wolves)) s.wolves = msg.wolves;
    else if (W.SPECIALS.includes(msg.role) && typeof msg.on === 'boolean') s[msg.role] = msg.on;
    else return false;
    t.settings = s;
    if (t.g) W.setSettings(t.g, s);
    return true;
  },

  // tijdens een potje kun je niet aanschuiven: de rollen zijn al verdeeld
  joinBlocked: (t) => (t.g.phase === 'klaar' ? null : 'Er loopt een potje Weerwolven. Je kunt aanschuiven als het klaar is.'),
  joined(t, seat) { W.addPlayer(t.g, t.players[seat].name); },
  // wie de tafel verlaat, is dood; wie terugkomt, telt weer gewoon mee
  presence(t) {
    t.players.forEach((p, i) => {
      if (p.left && p.connected) p.left = false;
      else if (p.left) W.leave(t.g, i);
    });
  },

  start(t, seed) {
    const g = W.newGame(t.players.map((p) => p.name), { seed, settings: t.settings });
    return W.deal(g, live(t)) ? g : null;
  },

  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g;
    const n = (x) => (Number.isInteger(x) ? x : -2);
    switch (msg.t) {
      case 'ready': return W.ready(g, me);
      case 'wolf': return W.wolfPick(g, me, n(msg.target));
      case 'look': return W.look(g, me, n(msg.target));
      case 'cupid': return W.cupid(g, me, n(msg.a), n(msg.b));
      case 'witch': return W.witch(g, me, msg.save === true, msg.poison === -1 ? -1 : n(msg.poison));
      case 'suspect': return W.suspect(g, me, n(msg.target));
      case 'vote': return W.vote(g, me, msg.target === -1 ? -1 : n(msg.target));
      // de jager schiet; is hij weg, dan doet de host het voor hem
      case 'shoot': return g.phase === 'jager' ? W.shoot(g, t.actorFor(s, g.hunter.p), n(msg.target)) : null;
      // niet langer wachten op wie er niet is
      case 'force': return me === t.host ? W.force(g) : null;
      case 'next': return me === t.host ? W.next(g, live(t)) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    out.settings = t.settings;
    const g = t.g;
    if (!g) return;
    const P = g.players, mine = P[me];
    // geesten (wie dood is) en iedereen na afloop zien alle rollen
    const all = g.phase === 'klaar' || (!!mine && !!mine.role && !mine.alive);
    out.phase = g.phase;
    out.round = g.round;
    out.day = g.day;
    out.deck = g.deck;
    out.players = out.players.map((base, i) => {
      const p = P[i];
      const o = { ...base, sips: p.sips, wins: p.wins, games: p.games, alive: p.alive, inGame: !!p.role };
      if (p.role && (!p.alive || all)) o.role = p.role;
      if (g.phase === 'rollen') o.ready = p.ready;
      if (g.phase === 'dag') o.voted = i in g.votes;
      return o;
    });
    if (all && g.lovers) out.lovers = g.lovers;
    if (g.phase === 'jager') out.hunter = g.hunter.p;
    if (g.phase === 'klaar') out.winner = g.winner;
    out.me = mine ? meView(g, me, all) : null;
    out.seq = g.seq;
    out.log = g.log;
  },
};

// Wat alleen jij weet.
function meView(g, me, all) {
  const p = g.players[me], n = g.night;
  const o = { role: p.role, alive: p.alive, ready: p.ready, known: [] };
  if (p.role === 'wolf') {
    g.players.forEach((x, i) => { if (i !== me && x.role === 'wolf') o.known.push({ p: i, role: 'wolf' }); });
  }
  for (const s of p.seen) if (!o.known.some((k) => k.p === s.p)) o.known.push({ p: s.p, role: s.role, night: s.night });
  if (g.lovers && g.loversKnown && g.lovers.includes(me)) {
    const other = g.lovers[0] === me ? g.lovers[1] : g.lovers[0];
    o.lover = { p: other, role: g.players[other].role };
  }
  if (p.role === 'cupido' && g.lovers) o.lovers = g.lovers;
  if (p.role === 'heks') o.potions = g.potions;
  if (g.phase === 'nacht' && p.alive) {
    o.task = n.tasks[me];
    o.done = o.task === 'wolf' ? n.locked : !!n.done[me];
    o.pick = o.task === 'wolf' ? (n.wolves[me] ?? -1) : (n.picks[me] ?? -1);
    // de wolven zien elkaars keuze; de heks ziet wie ze kozen
    if (o.task === 'wolf') o.pack = packView(g);
    if (o.task === 'heks') o.victim = n.locked ? n.victim : null;
  }
  // een geest kijkt 's nachts mee met de wolven en de heks
  if (all && g.phase === 'nacht') {
    o.pack = packView(g);
    o.night = { victim: n.locked ? n.victim : null, save: n.save, poison: n.poison };
  }
  if (g.phase === 'dag' && me in g.votes) o.vote = g.votes[me];
  return o;
}

const packView = (g) => g.players.flatMap((x, i) => (x.role === 'wolf' && x.alive ? [{ p: i, pick: g.night.wolves[i] ?? -1 }] : []));

export class WeerwolvenHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: weerwolven }); }
}
