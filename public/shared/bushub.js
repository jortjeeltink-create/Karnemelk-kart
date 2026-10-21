// Bussen online: tafels met een groepscode, spelers op hun eigen telefoon.
// De server is de baas over het potje (zie bussen.js); elke speler krijgt alleen te zien wat hij mag zien:
// zijn eigen kaarten, de open kaarten op tafel en de stand. Dichte kaarten verlaten de server niet.
import * as B from './bussen.js';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';

export const TABLE_IDLE_MS = 30 * 60 * 1000;  // een tafel zonder verbonden spelers verdwijnt na een half uur
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

export class BusHub {
  constructor({ now = () => Date.now(), random = Math.random, log = () => {} } = {}) {
    this.now = now;
    this.random = random;
    this.log = log;
    this.tables = new Map();
    this.sessions = new Set();
  }

  // conn: { send(text), close() }
  connect(conn) {
    const session = { conn, table: null, seat: -1, msgCount: 0, msgWindow: this.now() };
    conn.session = session;
    this.sessions.add(session);
    return session;
  }

  disconnect(conn) {
    const s = conn.session;
    if (!s) return;
    this.sessions.delete(s);
    if (s.table) s.table.disconnected(s);
    s.conn = null;
  }

  sendTo(s, obj) {
    if (s && s.conn) s.conn.send(JSON.stringify(obj));
  }

  message(conn, msg) {
    const s = conn.session;
    if (!s || !msg || typeof msg.t !== 'string') return;
    const now = this.now();
    if (now - s.msgWindow > 1000) { s.msgWindow = now; s.msgCount = 0; }
    if (++s.msgCount > 40) return;
    try {
      this.handle(s, msg);
    } catch (e) {
      this.log('bussen: fout bij bericht', msg.t, e);
      this.sendTo(s, { t: 'err', msg: 'Er ging iets mis op de server. Probeer het opnieuw.' });
    }
  }

  newCode() {
    for (let tries = 0; tries < 1000; tries++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[Math.floor(this.random() * ROOM_CODE_ALPHABET.length)];
      if (!this.tables.has(code)) return code;
    }
    throw new Error('geen vrije tafelcode');
  }

  handle(s, msg) {
    if (msg.t === 'ping') return this.sendTo(s, { t: 'pong', c: msg.c });
    if (msg.t === 'create' || msg.t === 'join') {
      const token = typeof msg.token === 'string' && TOKEN_RE.test(msg.token) ? msg.token : null;
      if (!token) return this.sendTo(s, { t: 'joinFailed', msg: 'Herlaad de pagina en probeer het opnieuw.' });
      let table;
      if (msg.t === 'create') {
        table = new Table(this, this.newCode());
        this.tables.set(table.code, table);
        this.log(`bussen: tafel ${table.code} gemaakt`);
      } else {
        const code = typeof msg.code === 'string' ? msg.code.toUpperCase().replace(/[^A-Z]/g, '') : '';
        table = this.tables.get(code);
        if (!table) return this.sendTo(s, { t: 'joinFailed', msg: code.length < ROOM_CODE_LENGTH ? `Vul de code van ${ROOM_CODE_LENGTH} letters in.` : `Tafel ${code} bestaat niet (meer). Controleer de code.`, gone: true });
      }
      if (s.table && s.table !== table) s.table.leave(s);
      const res = table.join(s, msg.name, token);
      if (!res.ok) {
        if (!table.players.length) this.tables.delete(table.code);
        return this.sendTo(s, { t: 'joinFailed', msg: res.error });
      }
      return;
    }
    if (!s.table) return this.sendTo(s, { t: 'err', msg: 'Je zit niet (meer) aan een tafel.', code: 'notable' });
    if (msg.t === 'leave') {
      s.table.leave(s);
      return this.sendTo(s, { t: 'left' });
    }
    s.table.action(s, msg);
  }

  tick() {
    const now = this.now();
    for (const [code, t] of this.tables) {
      if (t.emptySince != null && now - t.emptySince > TABLE_IDLE_MS) {
        this.tables.delete(code);
        this.log(`bussen: tafel ${code} opgeruimd`);
      }
    }
  }

  stats() {
    let players = 0;
    for (const t of this.tables.values()) players += t.players.length;
    return { tables: this.tables.size, players };
  }
}

class Table {
  constructor(hub, code) {
    this.hub = hub;
    this.code = code;
    this.players = [];      // { token, name, session, connected }
    this.host = 0;
    this.busLength = B.BUS_DEFAULT;
    this.g = null;          // het potje; null = lobby
    this.emptySince = null;
  }

  get inGame() { return !!this.g && this.g.phase !== 'klaar'; }

  join(s, rawName, token) {
    const back = this.players.findIndex((p) => p.token === token);
    if (back >= 0) {
      const p = this.players[back];
      if (p.session && p.session !== s) { p.session.table = null; this.hub.sendTo(p.session, { t: 'left', reason: 'Je speelt nu op een ander scherm verder.' }); }
      p.session = s; p.connected = true;
      if (!this.g) {
        const name = this.cleanName(rawName, back);
        if (name) p.name = name;
      }
      s.table = this; s.seat = back;
      this.emptySince = null;
      if (!this.players[this.host].connected) this.host = back;
      this.broadcast();
      return { ok: true };
    }
    if (this.g) return { ok: false, error: this.g.phase === 'klaar' ? 'Deze tafel rondt net een potje af. Probeer het zo nog eens.' : 'Dit potje is al begonnen. Doe mee bij het volgende potje.' };
    if (this.players.length >= B.MAX_PLAYERS) return { ok: false, error: `De tafel is vol (${B.MAX_PLAYERS} spelers).` };
    const name = this.cleanName(rawName, -1);
    if (!name) return { ok: false, error: 'Kies eerst een naam.' };
    this.players.push({ token, name, session: s, connected: true });
    s.table = this; s.seat = this.players.length - 1;
    this.emptySince = null;
    if (!this.players[this.host].connected) this.host = s.seat;
    this.hub.log(`bussen: ${name} zit aan tafel ${this.code}`);
    this.broadcast();
    return { ok: true };
  }

  cleanName(raw, self) {
    const others = this.players.filter((_, i) => i !== self).map((p) => p.name);
    const all = B.cleanNames([...others, raw]);
    return all.length > others.length ? all[all.length - 1] : null;
  }

  leave(s) {
    const i = this.players.findIndex((p) => p.session === s);
    s.table = null; s.seat = -1;
    if (i < 0) return;
    if (this.g) {
      // tijdens een potje blijft je plek bestaan; de host kan voor je invallen
      this.players[i].session = null;
      this.players[i].connected = false;
      this.players[i].left = true;
    } else {
      this.players.splice(i, 1);
      if (this.host === i) this.host = 0;
      else if (this.host > i) this.host--;
      this.players.forEach((p, k) => { if (p.session) p.session.seat = k; });
    }
    this.afterPresence();
  }

  disconnected(s) {
    const p = this.players.find((x) => x.session === s);
    if (!p) return;
    p.session = null;
    p.connected = false;
    this.afterPresence();
  }

  afterPresence() {
    const live = this.players.findIndex((p) => p.connected);
    if (live < 0) { this.emptySince = this.hub.now(); return; }
    if (!this.players[this.host] || !this.players[this.host].connected) this.host = live;
    this.broadcast();
  }

  // Wie mag deze actie doen? De speler zelf, of de host als die speler weg is.
  actorFor(s, owner) {
    if (owner == null || owner < 0) return -1;
    if (s.seat === owner) return owner;
    if (s.seat === this.host && !this.players[owner].connected) return owner;
    return -1;
  }

  action(s, msg) {
    const g = this.g;
    const me = s.seat;
    const isHost = me === this.host;
    let ev = null;
    switch (msg.t) {
      case 'settings':
        if (!isHost || g) return;
        if (B.BUS_LENGTHS.includes(msg.busLength)) this.busLength = msg.busLength;
        return this.broadcast();
      case 'kick': {
        const i = msg.seat;
        if (!isHost || g || !Number.isInteger(i) || i === me || !this.players[i]) return;
        const p = this.players[i];
        if (p.session) { p.session.table = null; p.session.seat = -1; this.hub.sendTo(p.session, { t: 'left', reason: 'De host heeft je van tafel gehaald.' }); }
        this.players.splice(i, 1);
        if (this.host > i) this.host--;
        this.players.forEach((x, k) => { if (x.session) x.session.seat = k; });
        return this.broadcast();
      }
      case 'start': {
        if (!isHost || g) return;
        if (this.players.length < B.MIN_PLAYERS) return this.hub.sendTo(s, { t: 'err', msg: `Er zijn minstens ${B.MIN_PLAYERS} spelers nodig.` });
        this.g = B.newGame(this.players.map((p) => p.name), { busLength: this.busLength, seed: Math.floor(this.hub.random() * 2 ** 32) });
        // namen zijn al uniek, dus de volgorde van de stoelen blijft gelijk
        this.hub.log(`bussen: potje gestart aan tafel ${this.code} met ${this.players.length} spelers`);
        return this.broadcast();
      }
      case 'again': {
        if (!isHost || !g || g.phase !== 'klaar') return;
        // terug naar de lobby met iedereen die er nog is; nieuwe spelers kunnen dan aanschuiven
        this.g = null;
        const keep = this.players.filter((p) => p.connected);
        const hostToken = this.players[this.host].token;
        this.players = keep;
        this.players.forEach((p, k) => { p.left = false; if (p.session) p.session.seat = k; });
        this.host = Math.max(0, this.players.findIndex((p) => p.token === hostToken));
        return this.broadcast();
      }
    }
    if (!g) return;
    switch (msg.t) {
      case 'answer': ev = B.answer(g, this.actorFor(s, g.turn), msg.o); break;
      case 'deal': ev = B.deal(g, me, msg.to); break;
      case 'skipDeal': {
        const from = Number.isInteger(msg.from) ? msg.from : me;
        ev = B.skipDeal(g, this.actorFor(s, from) === from ? from : -1);
        break;
      }
      case 'flip': if (msg.i === g.next) ev = B.flip(g); break;
      case 'pick': {
        const who = Number.isInteger(msg.for) ? msg.for : me;
        ev = B.pick(g, this.actorFor(s, who), msg.i);
        break;
      }
      case 'guess': ev = B.guess(g, this.actorFor(s, g.rider), msg.o); break;
      case 'retry': ev = B.retry(g, this.actorFor(s, g.rider)); break;
      case 'sips': ev = B.sips(g, me, msg.act); break;
      default: return;
    }
    if (ev) this.broadcast();
  }

  broadcast() {
    this.players.forEach((p, i) => { if (p.session) this.hub.sendTo(p.session, this.view(i)); });
  }

  // Wat speler `me` te zien krijgt.
  view(me) {
    const g = this.g;
    const out = {
      t: 'state', code: this.code, you: me, host: this.host, busLength: this.busLength,
      phase: g ? g.phase : 'lobby',
      players: this.players.map((p, i) => {
        const base = { name: p.name, connected: p.connected };
        if (!g) return base;
        const gp = g.players[i];
        return { ...base, cards: gp.hand.length, laid: gp.laid.length, got: gp.got, drank: gp.drank, owe: gp.pending + gp.saved, saved: gp.saved, dealt: gp.dealt, goed: gp.goed };
      }),
    };
    if (!g) return out;
    const p = g.players[me];
    // tijdens de vragenronde liggen alle kaarten open, daarna houdt iedereen zijn kaarten voor zich
    out.hands = g.phase === 'vragen' ? g.players.map((x) => x.hand) : null;
    out.hand = p.hand;
    out.me = { pending: p.pending, from: p.from, saved: p.saved, settle: p.settle };
    out.round = g.round;
    out.turn = g.turn;
    out.deals = g.deals.map((d) => ({ from: d.from, sips: d.sips }));
    out.waiting = B.waitingOn(g);
    out.seq = g.seq;
    out.log = g.log;
    if (g.pyramid) {
      out.pyramid = g.pyramid.map((x) => ({ card: x.open ? x.card : null, row: x.row, laid: x.laid.map((l) => l.p) }));
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
    return out;
  }
}
