// Toepen online: tafels met een groepscode (zie tafels.js), de spelregels in toepen.js.
// Iedereen ziet alleen zijn eigen kaarten; van de anderen alleen hoeveel ze er nog hebben en wat er op tafel ligt.
import * as T from './toepen.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const toepen = {
  id: 'toepen',
  minPlayers: T.MIN_PLAYERS,
  maxPlayers: T.MAX_PLAYERS,
  cleanNames: T.cleanNames,

  setup(t) { t.limit = T.LIMIT_DEFAULT; },
  // de host kiest tot hoeveel strafpunten er gespeeld wordt (in de lobby, of als een potje klaar is)
  settings(t, msg) {
    if (!T.LIMITS.includes(msg.limit)) return false;
    if (t.g && t.g.phase !== 'klaar') return false;
    t.limit = msg.limit;
    if (t.g) T.setLimit(t.g, msg.limit);
    return true;
  },

  // tijdens een potje kan er niemand bij: iedereen begint met evenveel strafpunten
  joinBlocked: () => 'Er wordt al getoept aan deze tafel. Wacht tot de host terug naar de lobby gaat.',
  joined() {},
  // is iemand weg terwijl er gekozen moet worden (mee of passen, kijken of geloven), dan kiest de server voor hem
  presence(t) { T.fixWaits(t.g, live(t)); },

  start(t, seed) { return T.newGame(t.players.map((p) => p.name), { seed, limit: t.limit }); },
  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g;
    switch (msg.t) {
      case 'play': {
        // de host kan spelen voor wie weg is: dan de laagste kaart die mag (zonder de kaarten te zien)
        const p = t.actorFor(s, g.turn);
        if (p < 0) return null;
        const card = p === me ? msg.card : T.lowest(g, p);
        return T.play(g, p, card && { r: card.r, s: card.s });
      }
      case 'klop': return T.knock(g, me, live(t));
      case 'mee': return T.answer(g, me, true);
      case 'pas': return T.answer(g, me, false);
      case 'was': return T.vuileWas(g, me, live(t));
      case 'kijk': return T.check(g, me, true);
      case 'geloof': return T.check(g, me, false);
      case 'kans': return T.kans(g, me);
      case 'next': return g.phase === 'ronde' && !g.players[me].out ? T.next(g) : null;
      case 'opnieuw': return me === t.host ? T.again(g) : null;
    }
    return null;
  },

  view(t, me, out) {
    out.limit = t.limit;
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.limit = g.limit;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, pts: gp.pts, out: gp.out, won: gp.won, inRound: !!g.inRound[i], cards: (g.hands[i] || []).length };
    });
    out.round = g.round;
    out.dealer = g.dealer;
    out.leader = g.leader;
    out.turn = g.turn;
    out.stake = g.stake;
    out.knocker = g.knocker;
    out.tricks = g.tricks;
    out.trick = g.trick;
    out.last = g.last;
    out.started = g.started;
    out.winner = g.winner;
    out.klop = g.klop && { by: g.klop.by, from: g.klop.from, to: g.klop.to, wait: g.klop.wait };
    out.was = g.was && { by: g.was.by, wait: g.was.wait, kijk: g.was.kijk.length };
    // alleen je eigen kaarten, en wat je ermee mag
    out.hand = me >= 0 ? g.hands[me] || [] : [];
    const legal = g.phase === 'spelen' && g.turn === me ? T.legal(g, me) : [];
    out.legal = out.hand.map((c) => legal.includes(c));
    out.can = { klop: T.canKnock(g, me), was: T.canWas(g, me), kans: T.canKans(g, me) };
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class ToepenHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: toepen }); }
}
