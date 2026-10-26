// Bussen online: tafels met een groepscode, spelers op hun eigen telefoon (zie tafels.js).
// De server is de baas over het potje (zie bussen.js); elke speler krijgt alleen te zien wat hij mag zien:
// zijn eigen kaarten, de open kaarten op tafel en de stand. Dichte kaarten verlaten de server niet.
import * as B from './bussen.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

const bussen = {
  id: 'bussen',
  minPlayers: B.MIN_PLAYERS,
  maxPlayers: B.MAX_PLAYERS,
  cleanNames: B.cleanNames,

  setup(t) {
    t.busLength = B.BUS_DEFAULT;
    t.lastFlip = 0;      // wanneer de laatste piramidekaart omging
  },

  settings(t, msg) {
    if (t.g) return false;
    if (B.BUS_LENGTHS.includes(msg.busLength)) t.busLength = msg.busLength;
    return true;
  },

  joinBlocked: (t) => t.g.phase === 'klaar' ? 'Deze tafel rondt net een potje af. Probeer het zo nog eens.' : 'Dit potje is al begonnen. Doe mee bij het volgende potje.',
  joined() {},

  // namen zijn al uniek, dus de volgorde van de stoelen blijft gelijk
  start: (t, seed) => B.newGame(t.players.map((p) => p.name), { busLength: t.busLength, seed }),

  canAgain: (t) => t.g.phase === 'klaar',

  action(t, s, me, msg) {
    const g = t.g;
    const now = t.hub.now();
    switch (msg.t) {
      case 'answer': return B.answer(g, t.actorFor(s, g.turn), msg.o);
      case 'deal': return B.deal(g, me, msg.to);
      case 'skipDeal': {
        const from = Number.isInteger(msg.from) ? msg.from : me;
        return B.skipDeal(g, t.actorFor(s, from) === from ? from : -1);
      }
      // alleen de host draait de piramide om (valt die weg, dan neemt een ander het over),
      // en na elke kaart even wachten, zodat iedereen zijn kaart kan wegleggen
      case 'flip': {
        if (me !== t.host || msg.i !== g.next || now - t.lastFlip < B.FLIP_PAUSE_MS) return null;
        const ev = B.flip(g);
        if (ev) t.lastFlip = now;
        return ev;
      }
      case 'lay': {
        const c = msg.card;
        return c && Number.isInteger(c.r) && Number.isInteger(c.s) ? B.lay(g, me, { r: c.r, s: c.s }) : null;
      }
      case 'endpyr': return me === t.host && now - t.lastFlip >= B.FLIP_PAUSE_MS ? B.endPyramid(g) : null;
      case 'pick': {
        const who = Number.isInteger(msg.for) ? msg.for : me;
        return B.pick(g, t.actorFor(s, who), msg.i);
      }
      case 'guess': return B.guess(g, t.actorFor(s, g.rider), msg.o);
      case 'retry': return B.retry(g, t.actorFor(s, g.rider));
      case 'sips': return B.sips(g, me, msg.act);
      default: return null;
    }
  },

  view(t, me, out) {
    out.busLength = t.busLength;
    const g = t.g;
    if (!g) return;
    out.phase = g.phase;
    out.players = out.players.map((base, i) => {
      const gp = g.players[i];
      return { ...base, cards: gp.hand.length, laid: gp.laid.length, got: gp.got, drank: gp.drank, owe: gp.pending + gp.saved, saved: gp.saved, dealt: gp.dealt, goed: gp.goed };
    });
    const p = g.players[me];
    // tijdens de vragenronde liggen alle kaarten open, daarna houdt iedereen zijn kaarten voor zich
    out.hands = g.phase === 'vragen' ? g.players.map((x) => x.hand) : null;
    out.hand = p.hand;
    out.me = { pending: p.pending, from: p.from, saved: p.saved, settle: p.settle };
    out.round = g.round;
    out.turn = g.turn;
    out.deals = g.deals.map((d) => ({ from: d.from, n: d.n }));
    out.waiting = B.waitingOn(g);
    out.seq = g.seq;
    out.log = g.log;
    if (g.pyramid) {
      out.pyramid = g.pyramid.map((x) => ({ card: x.open ? x.card : null, row: x.row, laid: x.laid }));
      out.next = g.next;
    }
    if (g.phase === 'kiezen') {
      out.candidates = g.candidates;
      out.pick = { round: g.pick.round, n: g.pick.cards.length, taken: g.pick.taken };
    }
    if (g.bus) {
      const b = g.bus;
      out.rider = g.rider;
      out.bus = { n: b.cards.length, cards: b.cards.slice(0, b.open), open: b.open, tries: b.tries, drank: b.drank, fail: b.fail };
    }
    if (g.phase === 'klaar') out.titles = B.titles(g);
  },
};

export class BusHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: bussen }); }
}
