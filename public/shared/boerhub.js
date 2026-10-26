// Boerenbruiloft online: tafels met een groepscode (zie tafels.js), de spelregels in boer.js.
// Niemand ziet de rol van een ander. Wie de boer is, horen de anderen pas als hij begint te tellen,
// en wie de vrouw was pas als de boer heeft geraden.
import * as V from './boer.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit en dus een rol krijgt
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const boer = {
  id: 'boer',
  minPlayers: V.MIN_PLAYERS,
  maxPlayers: V.MAX_PLAYERS,
  cleanNames: V.cleanNames,

  setup(t) { t.count = V.COUNT_DEFAULT; },

  // de tijd mag ook tussendoor anders, maar niet terwijl de boer telt
  settings(t, msg) {
    if (!V.COUNTS.includes(msg.count) || (t.g && !V.setCount(t.g, msg.count))) return false;
    t.count = msg.count;
    return true;
  },

  // nieuwe spelers mogen altijd aanschuiven: ze doen mee vanaf de volgende ronde
  joinBlocked: () => null,
  joined(t, seat) { V.addPlayer(t.g, t.players[seat].name); },

  start(t, seed) {
    const g = V.newGame(t.players.map((p) => p.name), { seed, count: t.count });
    return V.deal(g, live(t)) ? g : null;
  },

  canAgain: (t) => t.g.phase !== 'tellen',

  action(t, s, me, msg) {
    const g = t.g;
    switch (msg.t) {
      case 'count': return V.startCount(g, t.actorFor(s, g.boer), t.hub.now());
      case 'guess': return Number.isInteger(msg.target) ? V.guess(g, t.actorFor(s, g.boer), msg.target, t.hub.now()) : null;
      // de host deelt de volgende ronde, of opnieuw zolang de boer nog niet telt
      case 'deal': return me === t.host ? V.deal(g, live(t)) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    out.count = t.count;
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, sips: gp.sips, raak: gp.raak, boer: gp.boer };
    });
    out.round = g.round;
    out.in = g.in;
    out.role = g.roles[me] || null;
    out.boer = g.phase !== 'rollen' || me === g.boer ? g.boer : -1;
    out.left = V.timeLeft(g, t.hub.now());
    if (g.phase === 'uitslag') {
      out.vrouw = g.vrouw;
      out.guess = g.guess;
      out.roles = g.roles;
    }
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class BoerHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: boer }); }
}
