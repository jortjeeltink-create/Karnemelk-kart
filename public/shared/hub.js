// De "centrale": verbindingen, wie je bent (per telefoon), rooms en de winkel.
// Werkt met elke opslag die dezelfde functies heeft (bestand, Redis of de browser).
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, ROOM_IDLE_MS } from './constants.js';
import { Room } from './room.js';
import { tryBuy, tryEquip, publicCosmetics } from './shop.js';
import { isDeviceToken, dayKey, DAILY_BONUS, TRANSFER_MINUTES } from './profiles.js';
import { cleanLook } from './look.js';

export function publicProfile(p) {
  if (!p) return null;
  return {
    id: p.key, name: p.name, mp: p.mp, owned: p.owned || [], equipped: publicCosmetics(p), look: cleanLook(p.look),
    stats: p.stats || {}, lastCharacter: p.lastCharacter || null, dailyReady: p.lastDaily !== dayKey(Date.now()),
  };
}

export class Hub {
  constructor({ store, now = () => Date.now(), random = Math.random, log = () => {}, laps = null, offline = false }) {
    this.store = store;
    this.laps = laps; // alleen voor tests: kortere races
    this.offline = offline;
    this.now = now;
    this.random = random;
    this.log = log;
    this.rooms = new Map();
    this.sessions = new Set();
  }

  // conn: { send(text), sendVolatile?(text), close(), cookieDevice? }
  connect(conn) {
    const session = {
      conn, profile: null, device: null, cookieDevice: isDeviceToken(conn.cookieDevice) ? conn.cookieDevice : null,
      room: null, msgCount: 0, msgWindow: this.now(), transferTries: 0,
    };
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

  // Wie ben je? Eerst het cookie van de server, dan de sleutel die de browser zelf bewaarde.
  async identify(session, browserDevice) {
    const cands = [session.cookieDevice, isDeviceToken(browserDevice) ? browserDevice : null].filter(Boolean);
    let profile = null;
    let device = null;
    for (const t of cands) {
      const p = await this.store.byDevice(t);
      if (p) { profile = p; device = t; break; }
    }
    if (!device) device = cands[0] || this.store.newDeviceToken();
    // beide sleutels naar hetzelfde profiel laten wijzen (als de ene ooit kwijtraakt)
    if (profile) for (const t of cands) if (t !== device) await this.store.linkDevice(t, profile.key);
    session.device = device;
    session.profile = profile;
    return profile;
  }

  async handle(session, msg) {
    const room = session.room;
    switch (msg.t) {
      case 'ping':
        return this.sendTo(session, { t: 'pong', c: msg.c, s: this.now() });

      case 'hello': {
        const profile = await this.identify(session, msg.device);
        return this.sendTo(session, { t: 'welcome', profile: publicProfile(profile), device: session.device });
      }

      case 'register': {
        if (!session.device) await this.identify(session, msg.device);
        const res = await this.store.register(session.device, msg.name);
        if (!res.ok) return this.sendTo(session, { t: 'registerFailed', msg: res.error });
        if (session.cookieDevice && session.cookieDevice !== session.device) await this.store.linkDevice(session.cookieDevice, res.profile.key);
        session.profile = res.profile;
        return this.sendTo(session, { t: 'loggedIn', profile: publicProfile(res.profile), device: session.device, created: !!res.created });
      }

      case 'useTransfer': {
        if (!session.device) await this.identify(session, msg.device);
        if (++session.transferTries > 8) return this.sendTo(session, { t: 'transferFailed', msg: 'Te veel pogingen. Herlaad de pagina en probeer het opnieuw.' });
        const res = await this.store.useTransfer(session.device, msg.code);
        if (!res.ok) return this.sendTo(session, { t: 'transferFailed', msg: res.error });
        if (session.cookieDevice && session.cookieDevice !== session.device) await this.store.linkDevice(session.cookieDevice, res.profile.key);
        if (session.room) session.room.leave(session);
        session.profile = res.profile;
        return this.sendTo(session, { t: 'loggedIn', profile: publicProfile(res.profile), device: session.device, transferred: true });
      }
    }

    if (!session.profile) return this.sendTo(session, { t: 'err', msg: 'Kies eerst een naam.', code: 'login' });

    switch (msg.t) {
      case 'profile':
        return this.sendTo(session, { t: 'profile', profile: publicProfile(session.profile) });

      case 'rename': {
        const res = await this.store.rename(session.profile, msg.name);
        if (!res.ok) return this.sendTo(session, { t: 'renameFailed', msg: res.error });
        this.sendTo(session, { t: 'profile', profile: publicProfile(session.profile), renamed: true });
        if (room) room.refreshMember(session);
        return;
      }

      case 'look': {
        await this.store.setLook(session.profile, msg.look);
        if (msg.use) session.profile.lastCharacter = 'eigen';
        await this.store.save(session.profile);
        this.sendTo(session, { t: 'profile', profile: publicProfile(session.profile), lookSaved: true });
        if (room) {
          if (msg.use) room.setCharacter(session, 'eigen');
          room.refreshMember(session);
        }
        return;
      }

      case 'transferCode': {
        if (this.offline) return this.sendTo(session, { t: 'transferFailed', msg: 'Overzetten kan alleen met de online server.' });
        const code = await this.store.createTransfer(session.profile);
        return this.sendTo(session, { t: 'transferCode', code, minutes: TRANSFER_MINUTES });
      }

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
        if (room && res.character) room.setCharacter(session, res.character);
        else if (room) room.refreshMember(session);
        return;
      }
    }

    if (!room) {
      if (['in', 'rocket', 'horn'].includes(msg.t)) return;
      return this.sendTo(session, { t: 'err', msg: 'Je zit niet (meer) in een room.', code: 'noroom' });
    }
    switch (msg.t) {
      case 'in': return room.input(session, msg);
      case 'rocket': return room.rocket(session);
      case 'horn': return room.horn(session);
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

  // Punten na een race bijschrijven (ook als de speler net even weg is).
  // Geeft de dagbonus terug als dit de eerste uitgereden race van vandaag is.
  async awardRace(profileKey, mp, place, total, finished) {
    const p = await this.store.get(profileKey);
    if (!p) return 0;
    let bonus = 0;
    const today = dayKey(this.now());
    if (finished && p.lastDaily !== today) {
      bonus = DAILY_BONUS;
      p.lastDaily = today;
    }
    p.mp = (p.mp || 0) + mp + bonus;
    p.stats = p.stats || {};
    p.stats.races = (p.stats.races || 0) + 1;
    p.stats.totalMp = (p.stats.totalMp || 0) + mp + bonus;
    if (place === 1 && total > 1) p.stats.wins = (p.stats.wins || 0) + 1;
    if (place <= 3 && total > 1) p.stats.podiums = (p.stats.podiums || 0) + 1;
    await this.store.save(p);
    for (const s of this.sessions) {
      if (s.profile && s.profile.key === profileKey) this.sendTo(s, { t: 'profile', profile: publicProfile(p) });
    }
    return bonus;
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
