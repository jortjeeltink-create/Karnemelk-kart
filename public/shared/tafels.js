// Online tafels met een code van 4 letters, voor de kaartspellen waarbij iedereen op zijn eigen telefoon speelt
// (Bussen, Boer zoekt vrouw). Hier zit alles wat elke tafel nodig heeft: maken, meedoen, opnieuw verbinden met
// een sleutel per telefoon, de host, van tafel halen en nog een potje. Het spel zelf komt binnen als `game`:
//
//   id                   naam voor in het logboek
//   minPlayers           zoveel spelers zijn nodig om te starten
//   maxPlayers           zoveel spelers passen er aan tafel
//   cleanNames(list)     namen opschonen (zie bussen.js)
//   setup(t)             eigen velden op een nieuwe tafel zetten, bijvoorbeeld instellingen
//   settings(t, msg)     de host past een instelling aan; true = laat iedereen het zien
//   joinBlocked(t)       mag er nu iemand bij? null = ja, anders de reden voor de nieuwe speler
//   joined(t, seat)      er is een nieuwe speler bij gekomen terwijl er een potje loopt
//   start(t, seed)       het potje (een gewoon object) of null als het nog niet kan
//   canAgain(t)          mag de host terug naar de lobby?
//   action(t, s, me, msg) een zet van een speler; geeft iets terug als iedereen een nieuwe stand moet zien
//   view(t, me, out)     vult de stand aan met wat speler `me` van het spel mag zien
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';

export const TABLE_IDLE_MS = 30 * 60 * 1000;  // een tafel zonder verbonden spelers verdwijnt na een half uur
const TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

export class TableHub {
  // build: versie van de pagina en de spelregels; telefoons met een andere versie laden zichzelf opnieuw
  constructor({ game, now = () => Date.now(), random = Math.random, log = () => {}, build = null }) {
    this.game = game;
    this.now = now;
    this.random = random;
    this.log = log;
    this.build = build;
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
      this.log(`${this.game.id}: fout bij bericht`, msg.t, e);
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
        this.log(`${this.game.id}: tafel ${table.code} gemaakt`);
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
        this.log(`${this.game.id}: tafel ${code} opgeruimd`);
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
    this.game = hub.game;
    this.code = code;
    this.players = [];      // { token, name, session, connected }
    this.host = 0;
    this.maker = null;      // wie de tafel maakte: die wordt weer host als hij terugkomt
    this.g = null;          // het potje; null = lobby
    this.emptySince = null;
    this.game.setup(this);
  }

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
      if (token === this.maker || !this.players[this.host].connected) this.host = back;
      this.broadcast();
      return { ok: true };
    }
    const blocked = this.g ? this.game.joinBlocked(this) : null;
    if (blocked) return { ok: false, error: blocked };
    if (this.players.length >= this.game.maxPlayers) return { ok: false, error: `De tafel is vol (${this.game.maxPlayers} spelers).` };
    const name = this.cleanName(rawName, -1);
    if (!name) return { ok: false, error: 'Kies eerst een naam.' };
    if (!this.maker) this.maker = token;
    this.players.push({ token, name, session: s, connected: true });
    s.table = this; s.seat = this.players.length - 1;
    this.emptySince = null;
    if (token === this.maker || !this.players[this.host].connected) this.host = s.seat;
    if (this.g) this.game.joined(this, s.seat);
    this.hub.log(`${this.game.id}: ${name} zit aan tafel ${this.code}`);
    this.broadcast();
    return { ok: true };
  }

  cleanName(raw, self) {
    const others = this.players.filter((_, i) => i !== self).map((p) => p.name);
    const all = this.game.cleanNames([...others, raw]);
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
    if (owner == null || owner < 0 || !this.players[owner]) return -1;
    if (s.seat === owner) return owner;
    if (s.seat === this.host && !this.players[owner].connected) return owner;
    return -1;
  }

  action(s, msg) {
    const me = s.seat;
    const isHost = me === this.host;
    switch (msg.t) {
      case 'settings':
        if (isHost && this.game.settings(this, msg)) this.broadcast();
        return;
      case 'kick': {
        const i = msg.seat;
        if (!isHost || this.g || !Number.isInteger(i) || i === me || !this.players[i]) return;
        const p = this.players[i];
        if (p.session) { p.session.table = null; p.session.seat = -1; this.hub.sendTo(p.session, { t: 'left', reason: 'De host heeft je van tafel gehaald.' }); }
        this.players.splice(i, 1);
        if (this.host > i) this.host--;
        this.players.forEach((x, k) => { if (x.session) x.session.seat = k; });
        return this.broadcast();
      }
      case 'start': {
        if (!isHost || this.g) return;
        const min = this.game.minPlayers;
        const g = this.players.length >= min ? this.game.start(this, Math.floor(this.hub.random() * 2 ** 32)) : null;
        if (!g) return this.hub.sendTo(s, { t: 'err', msg: `Er zijn minstens ${min} spelers nodig.` });
        this.g = g;
        this.hub.log(`${this.game.id}: potje gestart aan tafel ${this.code} met ${this.players.length} spelers`);
        return this.broadcast();
      }
      case 'again': {
        if (!isHost || !this.g || !this.game.canAgain(this)) return;
        // terug naar de lobby met iedereen die er nog is; nieuwe spelers kunnen dan aanschuiven
        this.g = null;
        const hostToken = this.players[this.host].token;
        this.players = this.players.filter((p) => p.connected);
        this.players.forEach((p, k) => { p.left = false; if (p.session) p.session.seat = k; });
        this.host = Math.max(0, this.players.findIndex((p) => p.token === hostToken));
        return this.broadcast();
      }
    }
    if (this.g && this.game.action(this, s, me, msg)) this.broadcast();
  }

  broadcast() {
    this.players.forEach((p, i) => { if (p.session) this.hub.sendTo(p.session, this.view(i)); });
  }

  // Wat speler `me` te zien krijgt: de tafel, en via het spel wat hij van het potje mag zien.
  view(me) {
    const out = {
      t: 'state', code: this.code, you: me, host: this.host, build: this.hub.build, phase: 'lobby',
      players: this.players.map((p) => ({ name: p.name, connected: p.connected })),
    };
    this.game.view(this, me, out);
    return out;
  }
}
