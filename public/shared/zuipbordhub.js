// Borrelbord (eerst Zuipbord) online: tafels met een groepscode (zie tafels.js), de spelregels in zuipbord.js.
// Er is niks geheim: iedereen ziet het bord, alle pionnen en wat er op elk vakje gebeurt.
// De host kiest de stand: stevig (de oude regels, met ad fundum en een bak) of rustig. De app uit de Play Store
// speelt alleen rustig (de telefoon stuurt dan play: true mee): een tafel uit de app is rustig, met de app schuif je
// niet aan bij een stevige tafel, en zit er iemand met de app aan tafel, dan kan de host niet naar stevig.
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

  setup(t) { t.mode = Z.MODE_DEFAULT; },
  created(t, msg) { if (msg.play === true) t.mode = 'rustig'; },
  admit: (t, msg) => (msg.play === true && t.mode === 'stevig'
    ? 'Deze tafel speelt Borrelbord met de stevige regels, en die zitten niet in de app. Doe mee via je browser, of vraag de host om rustig te kiezen.'
    : null),
  // de stand kiezen, in de lobby
  settings(t, msg) {
    if (t.g || !Z.MODES.includes(msg.mode) || msg.mode === t.mode) return false;
    if (msg.mode === 'stevig' && t.players.some((p) => p.play)) return false;
    t.mode = msg.mode;
    return true;
  },

  // nieuwe spelers mogen altijd aanschuiven: ze beginnen op start
  joinBlocked: () => null,
  joined(t, seat) { Z.addPlayer(t.g, t.players[seat].name); },
  // is wie aan de beurt is weg, dan is de volgende aan de beurt
  presence(t) { Z.fixTurn(t.g, live(t)); },

  // de host gooit als eerste
  start(t, seed) {
    const g = Z.newGame(t.players.map((p) => p.name), { seed, mode: t.mode });
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
    out.mode = g ? g.mode : t.mode;
    // kan de host nu naar stevig? (niet als er iemand met de app aan tafel zit)
    out.canStevig = !t.players.some((p) => p.play);
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
