// De "centrale": verbindingen, inloggen, rooms en de winkel.
// Werkt met elke opslag die dezelfde functies heeft (bestand, Redis of de browser).
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROOM_IDLE_MS } from './constants.js';
import { Room } from './room.js';
import { tryBuy, tryEquip, publicCosmetics } from './shop.js';

export function publicProfile(p) {
  if (!p) return null;
  return {
    name: p.name, mp: p.mp, owned: p.owned || [], equipped: publicCosmetics(p),
    stats: p.stats || {}, lastCharacter: p.lastCharacter || null,
  };
}

export class Hub {
  constructor({ store, now = () => Date.now(), random = Math.random, log = () => {}, laps = null }) {
    this.store = store;
    this.laps = laps; // alleen voor tests: kortere races
    this.now = now;
    this.random = random;
    this.log = log;
    this.rooms = new Map();
    this.sessions = new Set();
  }

  // conn: { send(text), sendVolatile?(text), close() }
  connect(conn) {
    const session = { conn, profile: null, token: null, room: null, msgCount: 0, msgWindow: this.now() };
    conn.session = session;
    this.sessions.add(session);
    return session;
  }

  sendTo(session, obj) {
    if (session && session.conn) session.conn.send(JSON.stringify(obj));
  }

  sendRaw(session, text, volatile = false) {
    if (!session || !session.conn) return;
    if (volatile && session.conn.sendVolatile) session.conn.sendVolatile(text);
    else session.conn.send(text);
  }

  disconnect(conn) {
    const session = conn.session;
    if (!session) return;
    this.sessions.delete(session);
    if (session.room) session.room.disconnected(session);
    session.conn = null;
  }

  newCode() {
    for (let tries = 0; tries < 1000; tries++) {
      let code = '';
      for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[Math.floor(this.random() * ROOM_CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('geen vrije roomcode');
  }

  async message(conn, msg) {
    const session = conn.session;
    if (!session || !msg || typeof msg.t !== 'string') return;
    // eenvoudige bescherming tegen spam
    const now = this.now();
    if (now - session.msgWindow > 1000) { session.msgWindow = now; session.msgCount = 0; }
    if (++session.msgCount > 150) return;

    try {
      await this.handle(session, msg);
    } catch (e) {
      this.log('fout bij bericht', msg.t, e);
      this.sendTo(session, { t: 'err', msg: 'Er ging iets mis op de server. Probeer het opnieuw.' });
    }
  }

  async handle(session, msg) {
    const room = session.room;
    switch (msg.t) {
      case 'ping':
        return this.sendTo(session, { t: 'pong', c: msg.c, s: this.now() });

      case 'hello': {
        let profile = null;
        if (typeof msg.token === 'string' && msg.token.length < 200) {
          profile = await this.store.fromToken(msg.token);
          if (profile) { session.profile = profile; session.token = msg.token; }
        }
        return this.sendTo(session, { t: 'welcome', profile: publicProfile(profile) });
      }

      case 'login': {
        const res = await this.store.login(msg.name, msg.pin);
        if (!res.ok) return this.sendTo(session, { t: 'loginFailed', msg: res.error });
        if (session.room) session.room.leave(session);
        session.profile = res.profile;
        session.token = res.token;
        return this.sendTo(session, { t: 'loggedIn', profile: publicProfile(res.profile), token: res.token, created: !!res.created });
      }

      case 'logout': {
        if (session.room) session.room.leave(session);
        if (session.token) await this.store.logout(session.token);
        session.profile = null; session.token = null;
        return this.sendTo(session, { t: 'welcome', profile: null });
      }
    }

    if (!session.profile) return this.sendTo(session, { t: 'err', msg: 'Log eerst in met je naam en PIN.', code: 'login' });

    switch (msg.t) {
      case 'profile':
        return this.sendTo(session, { t: 'profile', profile: publicProfile(session.profile) });

      case 'create': {
        if (session.room) session.room.leave(session);
        const code = this.newCode();
        const r = new Room(this, code, { practice: !!msg.practice });
        this.rooms.set(code, r);
        r.join(session);
        this.log(`room ${code} gemaakt door ${session.profile.name}${r.practice ? ' (oefenen)' : ''}`);
        return;
      }

      case 'join': {
        const code = typeof msg.code === 'string' ? msg.code.toUpperCase().replace(/[^A-Z]/g, '') : '';
        const r = this.rooms.get(code);
        if (!r || (r.practice && !r.members.has(session.profile.key))) return this.sendTo(session, { t: 'joinFailed', msg: code.length < 4 ? 'Vul de groepscode van 4 letters in.' : `Groepscode ${code} bestaat niet (meer). Controleer de code.` });
        if (session.room && session.room !== r) session.room.leave(session);
        const res = r.join(session);
        if (!res.ok) this.sendTo(session, { t: 'joinFailed', msg: res.error });
        return;
      }

      case 'leave':
        if (room) room.leave(session);
        return this.sendTo(session, { t: 'left', reason: null });

      case 'buy': {
        const res = tryBuy(session.profile, msg.id);
        if (!res.ok) return this.sendTo(session, { t: 'shopFailed', msg: res.error });
        await this.store.save(session.profile);
        this.sendTo(session, { t: 'profile', profile: publicProfile(session.profile), bought: msg.id });
        return;
      }

      case 'equip': {
        const res = tryEquip(session.profile, msg.id);
        if (!res.ok) return this.sendTo(session, { t: 'shopFailed', msg: res.error });
        await this.store.save(session.profile);
        this.sendTo(session, { t: 'profile', profile: publicProfile(session.profile) });
        if (room) room.setCosmetics(session);
        return;
      }
    }

    if (!room) {
      if (['in', 'rocket'].includes(msg.t)) return;
      return this.sendTo(session, { t: 'err', msg: 'Je zit niet (meer) in een room.', code: 'noroom' });
    }
    switch (msg.t) {
      case 'in': return room.input(session, msg);
      case 'rocket': return room.rocket(session);
      case 'ready': return room.setReady(session, !!msg.on);
      case 'char': return room.setCharacter(session, msg.id);
      case 'settings': return room.setSettings(session, msg.settings || {});
      case 'start': return room.startRace(session, !!msg.force);
      case 'again': return room.again(session);
      case 'lobby': return room.backToLobby(session);
      case 'challenge': return room.challengeAction(session, msg.action);
      case 'kick': return room.kick(session, msg.pid);
      default: return undefined;
    }
  }

  // punten na een race bijschrijven (ook als de speler net even weg is)
  async awardRace(profileKey, mp, place, total) {
    const p = await this.store.get(profileKey);
    if (!p) return;
    p.mp = (p.mp || 0) + mp;
    p.stats = p.stats || {};
    p.stats.races = (p.stats.races || 0) + 1;
    p.stats.totalMp = (p.stats.totalMp || 0) + mp;
    if (place === 1 && total > 1) p.stats.wins = (p.stats.wins || 0) + 1;
    if (place <= 3 && total > 1) p.stats.podiums = (p.stats.podiums || 0) + 1;
    await this.store.save(p);
    for (const s of this.sessions) {
      if (s.profile && s.profile.key === profileKey) this.sendTo(s, { t: 'profile', profile: publicProfile(p) });
    }
  }

  lastTick = 0;

  tick() {
    const now = this.now();
    const dt = this.lastTick ? Math.min(0.25, (now - this.lastTick) / 1000) : 0;
    this.lastTick = now;
    for (const [code, r] of this.rooms) {
      try {
        r.tick(dt);
      } catch (e) {
        this.log(`fout in room ${code}`, e);
      }
      if (r.emptySince != null && now - r.emptySince > (r.practice ? 30000 : ROOM_IDLE_MS)) {
        this.rooms.delete(code);
        this.log(`room ${code} opgeruimd`);
      }
    }
  }

  stats() {
    let players = 0;
    for (const r of this.rooms.values()) players += r.members.size;
    return { rooms: this.rooms.size, players, connections: this.sessions.size };
  }
}
