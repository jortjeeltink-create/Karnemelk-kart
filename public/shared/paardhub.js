// Paardenrace online: tafels met een groepscode (zie tafels.js), de spelregels in paard.js.
// Paardenrace speel je open: iedereen ziet de paarden, de inzetten en elke kaart. Alleen de stapel en de dichte
// kaarten naast de baan blijven op de server.
import * as P from './paard.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const paard = {
  id: 'paardenrace',
  minPlayers: P.MIN_PLAYERS,
  maxPlayers: P.MAX_PLAYERS,
  cleanNames: P.cleanNames,

  setup() {},
  settings: () => false,

  // nieuwe spelers mogen altijd aanschuiven: ze zetten in voor de volgende race
  joinBlocked: () => null,
  joined(t, seat) { P.addPlayer(t.g, t.players[seat].name); },
  // is wie er moest trekken weg, dan is de volgende aan de beurt; gaat iemand weg die nog niet klaar was,
  // dan kan de race misschien beginnen
  presence(t) {
    P.fixTurn(t.g, live(t));
    P.autoStart(t.g, live(t));
  },

  // eerst kiest iedereen een paard en een inzet
  start(t, seed) { return P.newGame(t.players.map((p) => p.name), { seed }); },

  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g;
    switch (msg.t) {
      // is iedereen aan tafel klaar, dan begint de race vanzelf
      case 'bet':
        if (!P.bet(g, me, msg.horse, msg.bet, msg.ready === true)) return null;
        P.autoStart(g, live(t));
        return true;
      // de host kan beginnen met wie er klaar is
      case 'go': return me === t.host ? P.startRace(g, live(t)) : null;
      // wie aan de beurt is trekt; is die weg, dan trekt de host voor hem
      case 'draw': return P.draw(g, t.actorFor(s, g.turn), live(t));
      case 'next': return me === t.host ? P.next(g) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, horse: gp.horse, bet: gp.bet, ready: gp.ready, sips: gp.sips, wins: gp.wins, races: gp.races };
    });
    out.race = g.race;
    out.racers = g.racers;
    out.turn = g.turn;
    out.pos = g.pos;
    out.track = g.track.map((x) => (x.open ? x.card : null));
    out.pileLeft = g.pile.length;
    out.last = g.last;
    out.winner = g.winner;
    out.drinks = g.drinks;
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class PaardHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: paard }); }
}
