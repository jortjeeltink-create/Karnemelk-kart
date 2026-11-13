// Arena online: tafels met een groepscode (zie tafels.js), de spelregels in arena.js.
// Inzetten zijn geheim tot het duel begint. De twee in de arena spelen het minispel op hun eigen telefoon; de
// uitkomst (een tijd, een aantal tikken, een keuze) sturen ze hierheen en de server bepaalt wie er wint.
import * as A from './arena.js';
import { TableHub } from './tafels.js';

export { TABLE_IDLE_MS } from './tafels.js';

// wie er nu aan tafel zit
const live = (t) => t.players.flatMap((p, i) => (p.connected ? [i] : []));

const arena = {
  id: 'arena',
  minPlayers: A.MIN_PLAYERS,
  maxPlayers: A.MAX_PLAYERS,
  cleanNames: A.cleanNames,

  setup(t) { t.rondes = A.LENGTE_DEFAULT; },
  settings(t, msg) {
    if (t.g || !A.LENGTES.includes(msg.rondes)) return false;
    t.rondes = msg.rondes;
    return true;
  },

  // nieuwe spelers mogen altijd aanschuiven: ze beginnen met een verse stapel munten
  joinBlocked: () => null,
  joined(t, seat) { A.addPlayer(t.g, t.players[seat].name); },
  // is wie er nog moest inzetten weg, dan kan het duel misschien al beginnen
  presence(t) { A.fixBets(t.g, live(t), t.hub.now()); },

  start(t, seed) {
    const g = A.newGame(t.players.map((p) => p.name), { seed, rondes: t.rondes });
    return A.begin(g, live(t)) ? g : null;
  },

  canAgain: () => true,

  action(t, s, me, msg) {
    const g = t.g, now = t.hub.now();
    switch (msg.t) {
      case 'bet': return A.bet(g, me, msg.op, msg.n, live(t), now);
      // de host laat iemand die weg is deze ronde overslaan
      case 'skipbet': return Number.isInteger(msg.for) && msg.for !== me ? A.skipBet(g, t.actorFor(s, msg.for), live(t), now) : null;
      case 'tik': return A.tik(g, me, msg.ms, !!msg.early, now);
      case 'tikken': return A.tikken(g, me, msg.n, !!msg.klaar, now);
      case 'kies': return A.kies(g, me, msg.k, now);
      case 'stop': return A.stop(g, me, msg.ms, now);
      case 'antw': return A.antwoord(g, me, msg.k, msg.ms, now);
      case 'race': return A.race(g, me, msg.ms, now);
      // elke telefoon mag melden dat de tijd om is; de server kijkt zelf op de klok
      case 'tijd': return A.tijd(g, now);
      // de host geeft op voor iemand die weg is
      case 'opgeven': return Number.isInteger(msg.for) && msg.for !== me ? A.opgeven(g, t.actorFor(s, msg.for)) : null;
      case 'next': return me === t.host ? A.next(g, live(t)) : null;
      default: return null;
    }
  },

  view(t, me, out) {
    out.rondes = t.rondes;
    const g = t.g;
    if (!g) return;
    const now = t.hub.now();
    out.phase = g.phase;
    out.rondes = g.rondes;
    out.ronde = g.ronde;
    out.players = out.players.map((base, i) => {
      const p = g.players[i];
      return { ...base, munten: p.munten, straf: p.straf, mega: p.mega, duels: p.duels, gewonnen: p.gewonnen, goed: p.goed, blut: p.blut };
    });
    out.a = g.a; out.b = g.b;
    out.spel = g.spel;
    // tijdens het inzetten zie je alleen wie er al klaar is, en je eigen inzet; daarna ligt alles open
    out.bets = g.phase === 'inzet'
      ? Object.fromEntries(Object.entries(g.bets).map(([i, b]) => [i, Number(i) === me ? b : { n: b.n ? -1 : 0 }]))
      : g.bets;
    out.wacht = g.phase === 'inzet' ? A.wachtOp(g, live(t)) : [];
    const d = g.duel;
    if (d) {
      const v = { spel: d.spel, poging: d.poging, om: Math.max(0, d.deadline - now), klaar: { [g.a]: d.res[g.a] != null, [g.b]: d.res[g.b] != null } };
      const s = A.soort(d.spel);
      if (s === 'reactie') { v.over = d.goAt - now; v.nep = d.nep; }   // over zoveel ms komt het seintje
      else if (s === 'kies') { v.score = d.score; v.rondjes = d.rondjes; v.gekozen = { [g.a]: !!d.keuze[g.a], [g.b]: !!d.keuze[g.b] }; v.mijn = d.keuze[me] || null; }
      else {
        v.over = d.startAt - now;
        if (s === 'tikken') v.n = d.n;
        else if (s === 'stop') v.doel = d.doel;
        else if (s === 'race') v.veld = d.veld;
        else v.vraag = d.vraag;                                           // de vraag, zonder het goede antwoord
      }
      out.duel = v;
    }
    out.last = g.last;
    out.eind = g.eind;
    out.seq = g.seq;
    out.log = g.log;
  },
};

export class ArenaHub extends TableHub {
  constructor(opts = {}) { super({ ...opts, game: arena }); }
}
