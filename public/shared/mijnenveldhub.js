// Mijnenveld online: tafels met een groepscode (zie tafels.js), de spelregels in mijnenveld.js.
// Iedereen ziet de worp, de mijnen die iemand verlegd heeft en elke omgedraaide kaart. De dichte kaarten en de
// verstopte mijnen blijven op de server; je ziet alleen hoeveel er nog verstopt liggen.
import * as M from './mijnenveld.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit en dus mee gooit
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const mijnenveld = {
  id: 'mijnenveld',
  minPlayers: M.MIN_PLAYERS,
  maxPlayers: M.MAX_PLAYERS,
  cleanNames: M.cleanNames,

  setup(t) { t.mineSips = M.MINE_DEFAULT; },

  // de slokken per mijn kunnen in de lobby en als een veld klaar is
  settings(t, msg) {
    if (!M.MINE_SIPS.includes(msg.mineSips) || (t.g && !M.setMineSips(t.g, msg.mineSips))) return false;
    t.mineSips = msg.mineSips;
    return true;
  },

  // nieuwe spelers mogen altijd aanschuiven: ze gooien mee als ze aan de beurt komen
  joinBlocked: () => null,
  joined(t, seat) { M.addPlayer(t.g, t.players[seat].name); },
  // is wie aan de beurt is weg, dan is de volgende aan de beurt
  presence(t) { M.fixTurn(t.g, live(t)); },

  // de host begint
  start(t, seed) {
    const g = M.newGame(t.players.map((p) => p.name), { seed, mineSips: t.mineSips });
    return M.begin(g, live(t), t.host) ? g : null;
  },

  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g;
    // wie aan de beurt is gooit, legt en gokt; is die weg, dan doet de host het voor hem
    const actor = t.actorFor(s, g.turn);
    switch (msg.t) {
      case 'roll': return M.roll(g, actor);
      case 'place': return M.place(g, actor, msg.cells);
      case 'guess': return M.guess(g, actor, msg.color, live(t));
      // een nieuw veld als het vorige leeg is
      case 'next': return me === t.host ? M.next(g, live(t)) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    out.mineSips = t.mineSips;
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, sips: gp.sips, mines: gp.mines, right: gp.right, wrong: gp.wrong };
    });
    out.round = g.round;
    out.cards = g.cards.map((c) => (c.open ? c.card : null));
    out.mines = g.mines.filter((m) => !m.hidden).map((m) => ({ cells: m.cells, count: m.count }));
    out.hiddenMines = g.mines.filter((m) => m.hidden).length;
    out.turn = g.turn;
    out.dice = g.dice;
    out.target = g.target;
    out.hit = g.hit;
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class MijnenveldHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: mijnenveld }); }
}
