// Borrelbord (eerst Zuipbord) online: tafels met een groepscode (zie tafels.js), de spelregels in zuipbord.js.
// Er is niks geheim: iedereen ziet het bord, alle pionnen en wat er op elk vakje gebeurt.
import * as Z from './zuipbord.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit en dus mee gooit
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const zuipbord = {
  id: 'zuipbord',
  minPlayers: Z.MIN_PLAYERS,
  maxPlayers: Z.MAX_PLAYERS,
  cleanNames: Z.cleanNames,

  setup() {},
  settings: () => false,

  // nieuwe spelers mogen altijd aanschuiven: ze beginnen op start
  joinBlocked: () => null,
  joined(t, seat) { Z.addPlayer(t.g, t.players[seat].name); },
  // is wie aan de beurt is weg, dan is de volgende aan de beurt
  presence(t) { Z.fixTurn(t.g, live(t)); },

  // de host gooit als eerste
  start(t, seed) {
    const g = Z.newGame(t.players.map((p) => p.name), { seed });
    return Z.begin(g, live(t), t.host) ? g : null;
  },

  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g;
    // wie aan de beurt is gooit en kiest; is die weg, dan doet de host het voor hem
    const actor = t.actorFor(s, g.turn);
    switch (msg.t) {
      case 'roll': {
        // bij een duel gooit ieder van de twee zelf (of de host voor wie er weg is)
        if (g.phase !== 'duel') return Z.roll(g, actor, live(t));
        const who = Z.duelWaiting(g).map((d) => t.actorFor(s, d)).find((d) => d >= 0);
        return who == null ? null : Z.roll(g, who, live(t));
      }
      case 'choose': return Z.choose(g, actor, Number.isInteger(msg.target) ? msg.target : -1, live(t));
      // nog een potje als er een winnaar is
      case 'next': return me === t.host ? Z.next(g, live(t)) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const p = g.players[i];
      return { ...base, pos: p.pos, sips: p.sips, wins: p.wins, skip: p.skip, stuck: p.stuck, buddy: p.buddy };
    });
    out.round = g.round;
    out.turn = g.turn;
    out.pending = g.pending;
    out.duel = g.duel;
    out.winner = g.winner;
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class ZuipbordHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: zuipbord }); }
}
