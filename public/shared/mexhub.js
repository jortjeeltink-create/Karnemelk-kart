// Mexen online: tafels met een groepscode (zie tafels.js), de spelregels in mex.js.
// Mexen speel je open: iedereen ziet elke worp, dus elke telefoon krijgt dezelfde stand.
import * as M from './mex.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit en dus meegooit
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const mexen = {
  id: 'mexen',
  minPlayers: M.MIN_PLAYERS,
  maxPlayers: M.MAX_PLAYERS,
  cleanNames: M.cleanNames,

  setup(t) { t.stake = M.STAKE_DEFAULT; },

  // de inzet kan in de lobby en tussen twee rondes
  settings(t, msg) {
    if (!M.STAKES.includes(msg.stake) || (t.g && !M.setStake(t.g, msg.stake))) return false;
    t.stake = msg.stake;
    return true;
  },

  // nieuwe spelers mogen altijd aanschuiven: ze gooien mee vanaf de volgende ronde
  joinBlocked: () => null,
  joined(t, seat) { M.addPlayer(t.g, t.players[seat].name); },

  // de host begint de eerste ronde
  start(t, seed) {
    const g = M.newGame(t.players.map((p) => p.name), { seed, stake: t.stake });
    return M.startRound(g, live(t), t.host) ? g : null;
  },

  canAgain: (t) => t.g.phase === 'uitslag',

  action(t, s, me, msg) {
    const g = t.g;
    switch (msg.t) {
      // wie aan de beurt is gooit; is die weg, dan gooit de host voor hem
      case 'roll': return M.roll(g, t.actorFor(s, M.thrower(g)));
      case 'stand': return M.stand(g, t.actorFor(s, M.thrower(g)));
      // wie verloor begint de volgende ronde, of de host als die er niet is
      case 'next': return me === g.loser || me === t.host ? M.next(g, live(t)) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    out.stake = t.stake;
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, sips: gp.sips, lost: gp.lost, mex: gp.mex };
    });
    out.round = g.round;
    out.order = g.order;
    out.at = g.at;
    out.max = g.max;
    out.dice = g.dice;
    out.count = g.count;
    out.mexes = g.mexes;
    out.tie = g.tie;
    out.thrower = M.thrower(g);
    out.loser = g.loser;
    out.lostSips = g.sips;
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class MexHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: mexen }); }
}
