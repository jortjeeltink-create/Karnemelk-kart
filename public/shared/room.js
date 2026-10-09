// Een privéroom: lobby, race en uitslag voor maximaal 10 spelers (incl. bots).
// Deze code draait op de server, maar heeft geen Node-specifieke dingen nodig,
// zodat de offline-demo hem ook in de browser kan gebruiken.
import { MAX_PLAYERS, LAPS, START_DELAY_MS, SNAPSHOT_RATE, RECONNECT_GRACE_MS } from './constants.js';
import { TRACKS, TRACK_BY_ID } from './tracks.js';
import { buildTrack } from './trackgeo.js';
import { Race } from './race.js';
import { encodeFull, encodeVisual, encodeEntity } from './protocol.js';
import { CHARACTER_BY_ID, DEFAULT_CHARACTER, BOT_CHARACTERS, racerName } from './characters.js';
import { cleanLook } from './look.js';
import { BOT_LEVELS } from './bots.js';
import { computePoints } from './points.js';
import { DEFAULT_CHALLENGE, nextChallenge, cleanChallenge } from './challenges.js';

const PICK_MS = 30000; // zo lang mag de winnaar nadenken
const SPIN_MS = 6500;  // zo lang draait het rad
import { publicCosmetics, SHOP_ITEMS, DEFAULT_EQUIP, ownsItem } from './shop.js';

const builtTracks = new Map();
export function getTrack(id) {
  if (!builtTracks.has(id)) builtTracks.set(id, buildTrack(TRACK_BY_ID[id]));
  return builtTracks.get(id);
}

const HOST_GRACE_MS = 20000;

export class Room {
  constructor(hub, code, { practice = false } = {}) {
    this.hub = hub;
    this.code = code;
    this.practice = practice;
    this.members = new Map(); // pid -> lid
    this.order = [];          // volgorde van binnenkomst
    this.hostPid = null;
    this.state = 'lobby';
    this.settings = {
      trackId: TRACKS[0].id,
      bots: practice ? 5 : 0,
      botLevel: 'normaal',
      challengeOn: true,
      challengeText: DEFAULT_CHALLENGE,
    };
    this.race = null;
    this.raceInfo = null;
    this.kidOf = new Map();
    this.results = null;
    this.challenge = null;
    this.pick = null; // de winnaar kiest wie er ook een atje moet doen (met het rad)
    this.kicked = new Set();
    this.lastSnap = 0;
    this.emptySince = null;
    this.raceCount = 0;
  }

  now() { return this.hub.now(); }

  humans() { return [...this.members.values()]; }

  // ---------- leden ----------
  join(session) {
    const pid = session.profile.key;
    if (this.kicked.has(pid)) return { ok: false, error: 'De host heeft je uit deze room verwijderd.' };
    let m = this.members.get(pid);
    if (m) {
      // terugkeren (na verbindingsverlies of op een ander apparaat)
      if (m.session && m.session !== session) {
        this.hub.sendTo(m.session, { t: 'left', reason: 'Je speelt nu verder op een ander apparaat.' });
        m.session.room = null;
      }
      m.session = session;
      m.connected = true;
      m.name = this.displayName(session.profile.name, pid);
      m.cosmetics = publicCosmetics(session.profile);
      m.look = cleanLook(session.profile.look);
    } else {
      const humans = this.members.size;
      if (humans >= MAX_PLAYERS) return { ok: false, error: `Deze room is vol (maximaal ${MAX_PLAYERS} spelers).` };
      if (humans + this.settings.bots >= MAX_PLAYERS) this.settings.bots = Math.max(0, MAX_PLAYERS - humans - 1);
      const used = new Set(this.humans().map((x) => x.character));
      const free = BOT_CHARACTERS.find((c) => !used.has(c.id));
      const last = session.profile.lastCharacter;
      const lastOk = last && CHARACTER_BY_ID[last] && this.mayUse(session.profile, last);
      m = {
        pid, name: this.displayName(session.profile.name, pid), session, connected: true, ready: false,
        character: lastOk && (last === 'eigen' || CHARACTER_BY_ID[last].special || !used.has(last)) ? last : (free ? free.id : DEFAULT_CHARACTER),
        cosmetics: publicCosmetics(session.profile), look: cleanLook(session.profile.look), lastSeen: this.now(), joinedAt: this.now(),
      };
      this.members.set(pid, m);
      this.order.push(pid);
      if (!this.hostPid) this.hostPid = pid;
    }
    session.room = this;
    m.lastSeen = this.now();
    this.emptySince = null;
    this.broadcastRoom();
    if (this.state === 'race' && this.raceInfo) {
      const kid = this.kidOf.get(pid);
      if (kid != null) {
        this.race.setConnected(kid, true);
        this.race.resetInputs(kid);
      }
      this.hub.sendTo(session, this.raceStartMsg(pid));
    } else if (this.state === 'results' && this.results) {
      this.hub.sendTo(session, this.results);
      if (this.challenge) this.hub.sendTo(session, { t: 'challenge', challenge: this.challenge });
      if (this.pick) this.hub.sendTo(session, { t: 'pick', pick: this.pickState() });
    }
    return { ok: true };
  }

  leave(session, reason) {
    const pid = session.profile && session.profile.key;
    const m = pid && this.members.get(pid);
    session.room = null;
    if (!m || m.session !== session) return;
    this.members.delete(pid);
    this.order = this.order.filter((p) => p !== pid);
    if (this.race) {
      const kid = this.kidOf.get(pid);
      if (kid != null) this.race.setConnected(kid, false);
    }
    if (reason) this.hub.sendTo(session, { t: 'left', reason });
    if (this.hostPid === pid) this.pickNewHost();
    this.broadcastRoom();
  }

  disconnected(session) {
    const pid = session.profile && session.profile.key;
    const m = pid && this.members.get(pid);
    if (!m || m.session !== session) return;
    m.connected = false;
    m.lastSeen = this.now();
    if (this.race) {
      const kid = this.kidOf.get(pid);
      if (kid != null) this.race.setConnected(kid, false);
    }
    this.broadcastRoom();
  }

  // twee spelers met dezelfde naam? Dan krijgt de tweede er een nummer achter.
  displayName(name, pid) {
    const taken = new Set([...this.members.values()].filter((x) => x.pid !== pid).map((x) => x.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let n = 2; n < 20; n++) if (!taken.has(`${name} ${n}`.toLowerCase())) return `${name} ${n}`;
    return name;
  }

  pickNewHost() {
    const next = this.order.map((p) => this.members.get(p)).find((m) => m && m.connected) || this.members.get(this.order[0]);
    this.hostPid = next ? next.pid : null;
  }

  kick(session, pid) {
    if (!this.isHost(session)) return this.err(session, 'Alleen de host kan spelers verwijderen.');
    if (pid === this.hostPid) return;
    const m = this.members.get(pid);
    if (!m) return;
    this.kicked.add(pid);
    if (m.session) this.leave(m.session, 'De host heeft je uit de room verwijderd.');
    else { this.members.delete(pid); this.order = this.order.filter((p) => p !== pid); this.broadcastRoom(); }
  }

  isHost(session) {
    return session.profile && session.profile.key === this.hostPid;
  }

  err(session, msg) {
    this.hub.sendTo(session, { t: 'err', msg });
  }

  // ---------- lobby ----------
  setReady(session, on) {
    const m = this.members.get(session.profile.key);
    if (!m) return;
    m.ready = !!on;
    this.broadcastRoom();
  }

  // specials moet je eerst kopen
  mayUse(profile, id) {
    const ch = CHARACTER_BY_ID[id];
    return !!ch && (!ch.special || ownsItem(profile, ch.special));
  }

  setCharacter(session, id) {
    const m = this.members.get(session.profile.key);
    if (!m || !CHARACTER_BY_ID[id]) return;
    if (!this.mayUse(session.profile, id)) return this.err(session, `${CHARACTER_BY_ID[id].name} is een special. Koop hem eerst in de winkel.`);
    m.character = id;
    session.profile.lastCharacter = id;
    this.broadcastRoom();
  }

  // naam, spullen of uiterlijk veranderd
  refreshMember(session) {
    const m = this.members.get(session.profile.key);
    if (!m) return;
    m.name = this.displayName(session.profile.name, m.pid);
    m.cosmetics = publicCosmetics(session.profile);
    m.look = cleanLook(session.profile.look);
    this.broadcastRoom();
  }

  setSettings(session, s) {
    if (!this.isHost(session)) return this.err(session, 'Alleen de host kan de instellingen veranderen.');
    if (this.state === 'race') return;
    const st = this.settings;
    if (s.trackId === 'random' || TRACK_BY_ID[s.trackId]) st.trackId = s.trackId;
    if (Number.isInteger(s.bots)) st.bots = Math.max(0, Math.min(MAX_PLAYERS - this.members.size, s.bots));
    if (BOT_LEVELS[s.botLevel]) st.botLevel = s.botLevel;
    if (typeof s.challengeOn === 'boolean') st.challengeOn = s.challengeOn;
    if (s.challengeText !== undefined) st.challengeText = cleanChallenge(s.challengeText) || DEFAULT_CHALLENGE;
    this.broadcastRoom();
  }

  roomState(forPid) {
    return {
      t: 'room', code: this.code, practice: this.practice, you: forPid, host: this.hostPid, state: this.state,
      max: MAX_PLAYERS, settings: this.settings,
      players: this.order.map((pid) => this.members.get(pid)).filter(Boolean).map((m) => ({
        pid: m.pid, name: m.name, character: m.character, cosmetics: m.cosmetics, look: m.look, ready: m.ready,
        connected: m.connected, host: m.pid === this.hostPid,
        racing: this.state === 'race' && this.kidOf.has(m.pid),
      })),
    };
  }

  broadcastRoom() {
    for (const m of this.members.values()) {
      if (m.session && m.connected) this.hub.sendTo(m.session, this.roomState(m.pid));
    }
  }

  // ---------- race ----------
  startRace(session, force = false) {
    if (!this.isHost(session)) return this.err(session, 'Alleen de host kan de race starten.');
    if (this.state === 'race') return;
    const connected = this.humans().filter((m) => m.connected);
    if (this.state === 'lobby' && !force) {
      const notReady = connected.filter((m) => m.pid !== this.hostPid && !m.ready);
      if (notReady.length) {
        return this.hub.sendTo(session, { t: 'notReady', names: notReady.map((m) => m.name) });
      }
    }
    this.beginRace();
  }

  beginRace() {
    const rand = this.hub.random;
    let trackId = this.settings.trackId;
    if (trackId === 'random') trackId = TRACKS[Math.floor(rand() * TRACKS.length)].id;
    const track = getTrack(trackId);
    const humans = this.humans().filter((m) => m.connected);
    const botCount = Math.max(0, Math.min(this.settings.bots, MAX_PLAYERS - humans.length));
    const usedChars = new Set(humans.map((m) => m.character));
    const freeChars = BOT_CHARACTERS.filter((c) => !usedChars.has(c.id));
    const pool = [];
    humans.forEach((m) => pool.push({ id: m.pid, name: racerName(m.name, m.character), isBot: false, character: m.character, cosmetics: m.cosmetics, look: m.look }));
    const botCosmeticsPool = SHOP_ITEMS.filter((i) => !i.free && i.rarity !== 'legendarisch');
    for (let b = 0; b < botCount; b++) {
      const ch = freeChars[b % Math.max(1, freeChars.length)] || BOT_CHARACTERS[b % BOT_CHARACTERS.length];
      const cos = { ...DEFAULT_EQUIP };
      // bots dragen af en toe iets leuks, zodat je ziet wat er in de winkel ligt
      for (let k = 0; k < 2; k++) {
        const pick = botCosmeticsPool[Math.floor(rand() * botCosmeticsPool.length)];
        if (pick && rand() < 0.55) cos[pick.slot] = pick.id;
      }
      pool.push({ id: `bot${b}`, name: ch.name.split(' ')[0] + ' (bot)', isBot: true, character: ch.id, cosmetics: cos });
    }
    // startvolgorde husselen
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const entrants = pool.map((e, kid) => ({ ...e, kid }));
    this.kidOf = new Map(entrants.filter((e) => !e.isBot).map((e) => [e.id, e.kid]));
    const seed = Math.floor(rand() * 1e9);
    const laps = this.hub.laps || LAPS;
    this.race = new Race({ track, entrants, seed, botLevel: this.settings.botLevel, startDelay: START_DELAY_MS / 1000, laps });
    this.startAt = this.now() + START_DELAY_MS;
    this.raceInfo = { trackId, seed, laps, entrants, practice: this.practice };
    this.state = 'race';
    this.results = null;
    this.challenge = null;
    this.pick = null;
    this.raceCount++;
    for (const m of this.members.values()) m.ready = false;
    for (const m of this.members.values()) {
      if (m.session && m.connected) this.hub.sendTo(m.session, this.raceStartMsg(m.pid));
    }
    this.broadcastRoom();
  }

  raceStartMsg(pid) {
    return {
      t: 'race', ...this.raceInfo, startAt: this.startAt, now: this.now(),
      you: this.kidOf.has(pid) ? this.kidOf.get(pid) : null,
    };
  }

  input(session, msg) {
    if (!this.race || this.state !== 'race') return;
    const kid = this.kidOf.get(session.profile.key);
    if (kid == null) return;
    const m = this.members.get(session.profile.key);
    if (!m || m.session !== session) return;
    if (!Number.isInteger(msg.s) || !Array.isArray(msg.i) || msg.i.length > 30) return;
    for (const it of msg.i) if (!Array.isArray(it) || it.length !== 2) return;
    this.race.queueInputs(kid, msg.s, msg.i);
  }

  rocket(session) {
    if (!this.race) return;
    const kid = this.kidOf.get(session.profile.key);
    if (kid != null) this.race.rocketStart(kid);
  }

  horn(session) {
    if (!this.race) return;
    const kid = this.kidOf.get(session.profile.key);
    if (kid != null) this.race.horn(kid);
  }

  tick(dt) {
    const now = this.now();
    if (this.state === 'race' && this.race) {
      const target = (now - this.startAt) / 1000;
      const step = Math.max(0, Math.min(0.25, target - this.race.time));
      this.race.update(step);
      if (now - this.lastSnap >= 1000 / SNAPSHOT_RATE - 2) {
        this.lastSnap = now;
        this.sendSnapshot();
      }
      if (this.race.phase === 'done') {
        this.finishRace().catch((e) => this.hub.log('fout bij uitslag', e));
      }
    }
    if (this.pick && this.state === 'results') {
      if (this.pick.state === 'kiezen' && now >= this.pick.deadline) {
        // de winnaar kiest niet op tijd: dan beslist het rad zelf
        const opts = this.pick.options;
        this.spinPick(opts[Math.floor(this.hub.random() * opts.length)].id, true);
      } else if (this.pick.state === 'draaien' && now >= this.pick.spinAt + this.pick.spinMs + 400) {
        this.pick.state = 'klaar';
        this.broadcastPick();
      }
    }
    // opruimen: spelers die te lang weg zijn
    for (const m of [...this.members.values()]) {
      if (!m.connected && now - m.lastSeen > RECONNECT_GRACE_MS) {
        this.members.delete(m.pid);
        this.order = this.order.filter((p) => p !== m.pid);
        if (this.hostPid === m.pid) this.pickNewHost();
        this.broadcastRoom();
      }
    }
    const host = this.members.get(this.hostPid);
    if (host && !host.connected && now - host.lastSeen > HOST_GRACE_MS) {
      const other = this.humans().find((m) => m.connected);
      if (other) { this.hostPid = other.pid; this.broadcastRoom(); }
    }
    const anyConnected = this.humans().some((m) => m.connected);
    if (!anyConnected) {
      if (this.emptySince == null) this.emptySince = now;
    } else this.emptySince = null;
  }

  sendSnapshot() {
    const r = this.race;
    const inactive = [];
    for (const b of r.boxes) if (!b.active) inactive.push(b.id);
    const common = JSON.stringify({
      rt: Math.round(r.time * 1000) / 1000,
      k: r.karts.map(encodeVisual),
      e: r.entities.map(encodeEntity),
      b: inactive,
      ev: r.takeEvents(),
      ph: r.phase,
      end: r.endAt,
    }).slice(1, -1);
    const st = this.now();
    for (const m of this.members.values()) {
      if (!m.session || !m.connected) continue;
      const kid = this.kidOf.get(m.pid);
      const me = kid != null ? JSON.stringify(encodeFull(r.byKid.get(kid))) : 'null';
      this.hub.sendRaw(m.session, `{"t":"s","st":${st},"me":${me},${common}}`, true);
    }
  }

  async finishRace() {
    const race = this.race;
    const rows = race.results();
    const awards = race.awards();
    this.state = 'results';
    this.sendSnapshot();
    this.race = null;
    const pts = computePoints(rows, { practice: this.practice });
    const humanRows = rows.filter((r) => !r.isBot);
    for (const row of rows) {
      const p = pts[row.id];
      row.mp = p ? p.mp : 0;
      row.parts = p ? p.parts : [];
    }
    // punten opslaan (met dagbonus voor de eerste uitgereden race van vandaag)
    for (const row of humanRows) {
      const bonus = await this.hub.awardRace(row.id, row.mp, row.place, rows.length, row.finished);
      if (bonus) {
        row.mp += bonus;
        row.parts.push({ label: 'Dagbonus (eerste race van vandaag)', mp: bonus });
      }
    }
    const winner = rows[0];
    let loser = null;
    if (humanRows.length >= 2) loser = humanRows[humanRows.length - 1];
    else if (humanRows.length === 1 && rows.length > 1 && rows[rows.length - 1] === humanRows[0]) loser = humanRows[0];
    this.challenge = this.settings.challengeOn && loser
      ? { text: this.settings.challengeText || DEFAULT_CHALLENGE, skipped: false, loser: loser.id, loserName: loser.name }
      : null;
    this.setupPick(humanRows);
    this.results = {
      t: 'results', trackId: this.raceInfo.trackId, practice: this.practice, rows, awards, pick: this.pickState(),
      winner: { id: winner.id, name: winner.name, isBot: winner.isBot, character: winner.character, cosmetics: winner.cosmetics, look: winner.look },
      loser: loser ? { id: loser.id, name: loser.name, character: loser.character, cosmetics: loser.cosmetics, look: loser.look } : null,
      challenge: this.challenge,
    };
    if (this.state !== 'results') return; // intussen al een nieuwe race gestart
    for (const m of this.members.values()) {
      if (m.session && m.connected) this.hub.sendTo(m.session, this.results);
    }
    this.broadcastRoom();
  }

  again(session) {
    if (!this.isHost(session)) return this.err(session, 'Alleen de host kan een nieuwe race starten.');
    if (this.state !== 'results' || !this.results) return;
    this.beginRace();
  }

  backToLobby(session) {
    if (!this.isHost(session)) return this.err(session, 'Alleen de host kan terug naar de lobby.');
    if (this.state === 'race') return;
    this.state = 'lobby';
    this.results = null;
    this.challenge = null;
    this.pick = null;
    for (const m of this.members.values()) m.ready = false;
    this.broadcastRoom();
  }

  // ---- winnaar kiest wie er ook een atje moet doen ----
  // humanRows: mensen in volgorde van de uitslag (de eerste is de winnaar)
  setupPick(humanRows) {
    this.pick = null;
    if (!this.settings.challengeOn || humanRows.length < 2) return;
    const winner = humanRows[0];
    this.pick = {
      state: 'kiezen',
      winner: winner.id,
      winnerName: winner.name,
      options: humanRows.slice(1).map((r) => ({ id: r.id, name: r.name })),
      names: humanRows.map((r) => ({ id: r.id, name: r.name })),
      deadline: this.now() + PICK_MS,
      target: null,
      byChance: false,
      spinAt: 0,
      spinMs: SPIN_MS,
      jitter: 0,
    };
    // het rad in een vaste maar door elkaar gehusselde volgorde
    const n = this.pick.names;
    for (let i = n.length - 1; i > 0; i--) { const j = Math.floor(this.hub.random() * (i + 1)); [n[i], n[j]] = [n[j], n[i]]; }
  }

  pickState() {
    if (!this.pick) return null;
    const { state, winner, winnerName, options, names, deadline, target, byChance, spinAt, spinMs, jitter } = this.pick;
    return { state, winner, winnerName, options, names, deadline, target, byChance, spinAt, spinMs, jitter };
  }

  broadcastPick() {
    if (this.results) this.results.pick = this.pickState();
    for (const m of this.members.values()) {
      if (m.session && m.connected) this.hub.sendTo(m.session, { t: 'pick', pick: this.pickState() });
    }
  }

  spinPick(targetId, byChance = false) {
    const pk = this.pick;
    pk.state = 'draaien';
    pk.target = targetId;
    pk.byChance = byChance;
    pk.spinAt = this.now() + 700; // even tijd zodat iedereen tegelijk begint
    pk.jitter = Math.round((this.hub.random() - 0.5) * 60) / 100; // waar in het vakje hij stopt
    this.broadcastPick();
  }

  choosePick(session, targetId) {
    const pk = this.pick;
    if (!pk || this.state !== 'results') return;
    if (session.profile.key !== pk.winner) return this.err(session, 'Alleen de winnaar mag kiezen.');
    if (pk.state !== 'kiezen') return;
    if (!pk.options.some((o) => o.id === targetId)) return this.err(session, 'Die speler doet niet mee.');
    this.spinPick(targetId, false);
  }

  challengeAction(session, action) {
    if (!this.challenge) return;
    const pid = session.profile.key;
    if (pid !== this.challenge.loser && !this.isHost(session)) {
      return this.err(session, 'Alleen de verliezer of de host kan de uitdaging aanpassen.');
    }
    if (action === 'skip') this.challenge.skipped = true;
    else if (action === 'next') { this.challenge.text = nextChallenge(this.challenge.text, this.hub.random); this.challenge.skipped = false; }
    else if (action === 'done') this.challenge.done = true;
    if (this.results) this.results.challenge = this.challenge;
    for (const m of this.members.values()) {
      if (m.session && m.connected) this.hub.sendTo(m.session, { t: 'challenge', challenge: this.challenge });
    }
  }
}
