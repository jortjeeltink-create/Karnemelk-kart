// Fuck the dealer online: tafels met een groepscode (zie tafels.js), de spelregels in ftd.js.
// Alleen de dealer krijgt de bovenste kaart te zien; de rest ziet de stapel, de gespeelde kaarten en de gokken.
import * as F from './ftd.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit en dus mee raadt
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const dealer = {
  id: 'dealer',
  minPlayers: F.MIN_PLAYERS,
  maxPlayers: F.MAX_PLAYERS,
  cleanNames: F.cleanNames,

  setup() {},
  settings: () => false,

  // nieuwe spelers mogen altijd aanschuiven: ze raden mee als ze aan de beurt komen
  joinBlocked: () => null,
  joined(t, seat) { F.addPlayer(t.g, t.players[seat].name); },
  // is wie er moest raden weg, dan is de volgende aan de beurt
  presence(t) { F.fixTurn(t.g, live(t)); },

  start(t, seed) {
    const g = F.newGame(t.players.map((p) => p.name), { seed });
    return F.begin(g, live(t)) ? g : null;
  },

  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g;
    // wie aan de beurt is raadt; valt die weg na zijn eerste gok, dan raadt de host verder
    if (msg.t === 'guess' && Number.isInteger(msg.r)) return F.guess(g, t.actorFor(s, g.guesser), msg.r, live(t));
    return null;
  },

  view(t, me, out) {
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, sips: gp.sips, right: gp.right, beaten: gp.beaten, dealer: gp.dealer };
    });
    out.dealer = g.dealer;
    out.guesser = g.guesser;
    out.first = g.first;
    out.hint = g.hint;
    out.streak = g.streak;
    out.board = g.board;
    out.deckLeft = g.deck.length;
    out.top = me === g.dealer ? g.deck[g.deck.length - 1] : null;
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class DealerHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: dealer }); }
}
