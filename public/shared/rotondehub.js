// Rotonde online: tafels met een groepscode (zie tafels.js), de spelregels in rotonde.js.
// Iedereen ziet de zon, de pot en elke omgedraaide kaart; de dichte kaarten blijven op de server.
import * as R from './rotonde.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit en dus mee gokt
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const rotonde = {
  id: 'rotonde',
  minPlayers: R.MIN_PLAYERS,
  maxPlayers: R.MAX_PLAYERS,
  cleanNames: R.cleanNames,

  setup() {},
  settings: () => false,

  // nieuwe spelers mogen altijd aanschuiven: ze gokken mee als ze aan de beurt komen
  joinBlocked: () => null,
  joined(t, seat) { R.addPlayer(t.g, t.players[seat].name); },
  // is wie aan de beurt is weg, dan is de volgende aan de beurt
  presence(t) { R.fixTurn(t.g, live(t)); },

  // de host begint
  start(t, seed) {
    const g = R.newGame(t.players.map((p) => p.name), { seed });
    return R.begin(g, live(t), t.host) ? g : null;
  },

  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g;
    // wie aan de beurt is kiest en gokt; is die weg, dan doet de host het voor hem
    const actor = t.actorFor(s, g.turn);
    switch (msg.t) {
      case 'pick': return R.pick(g, actor, msg.i);
      case 'guess': return R.guess(g, actor, msg.color, live(t));
      case 'more': return R.decide(g, actor, msg.more === true, live(t));
      // een nieuwe rotonde als de vorige leeg is
      case 'next': return me === t.host ? R.next(g, live(t)) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, sips: gp.sips, right: gp.right, wrong: gp.wrong, max: gp.max };
    });
    out.round = g.round;
    out.cards = g.cards.map((c) => (c.open ? { v: c.v, card: c.card } : { v: c.v }));
    out.pot = g.pot;
    out.turn = g.turn;
    out.sel = g.sel;
    out.extra = g.extra;
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class RotondeHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: rotonde }); }
}
