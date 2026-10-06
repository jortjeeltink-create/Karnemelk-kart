// De race zelf: alle karts, items, botsingen, posities en de finish.
// Draait op de server (en in de offline-demo in de browser).
import { DT, TICK_RATE, KART_RADIUS, FINISH_GRACE, MAX_RACE_TIME, LAPS } from './constants.js';
import { createKart, stepKart, hitKart, raceDistance } from './physics.js';
import { botInput, autopilotInput, initBot } from './bots.js';
import { ITEM, rollItem, ITEM_ROLL_TIME, BOX_RESPAWN } from './items.js';
import { rng } from './util.js';
import { decodeInput } from './protocol.js';

export class Race {
  // entrants: [{ kid, id, name, isBot, character, cosmetics }]
  constructor({ track, entrants, seed = 1, botLevel = 'normaal', startDelay = 5, laps = LAPS }) {
    this.track = track;
    this.laps = laps;
    this.rand = rng(seed);
    this.time = -startDelay;   // < 0: aftellen
    this.phase = 'countdown';  // countdown | racing | finishing | done
    this.entrants = entrants;
    this.karts = [];
    this.byKid = new Map();
    entrants.forEach((e, slot) => {
      const k = createKart(e.kid, track, slot);
      k.isBot = !!e.isBot;
      k.connected = true;
      k.queue = [];
      k.budget = 0;
      k.acc = 0;
      k.bumpCd = new Map();
      k.rocket = 0;
      if (k.isBot) initBot(k, botLevel, rng(seed * 31 + slot * 7 + 3));
      this.karts.push(k);
      this.byKid.set(e.kid, k);
    });
    this.entities = [];
    this.nextEntityId = 1;
    this.boxes = track.itemBoxes.map((b) => ({ ...b, active: true, respawn: 0 }));
    this.events = [];
    this.entAcc = 0;
    this.endAt = null;
  }

  // ---- invoer van spelers ----
  queueInputs(kid, firstSeq, list) {
    const k = this.byKid.get(kid);
    if (!k || k.isBot || this.phase === 'done') return;
    if (this.time < 0) return; // tijdens aftellen telt niets
    for (let n = 0; n < list.length; n++) {
      const seq = firstSeq + n;
      if (seq <= k.ack || (k.queue.length && seq <= k.queue[k.queue.length - 1].seq)) continue;
      const inp = decodeInput(list[n]);
      inp.seq = seq;
      k.queue.push(inp);
    }
    if (k.queue.length > 90) k.queue.splice(0, k.queue.length - 90);
  }

  rocketStart(kid) {
    const k = this.byKid.get(kid);
    if (!k || k.rocket || this.time < -0.7 || this.time > 0.6) return false;
    k.rocket = 1;
    k.boostT = Math.max(k.boostT, 1.0);
    this.events.push({ type: 'boost', kid, src: 'start' });
    return true;
  }

  setConnected(kid, on) {
    const k = this.byKid.get(kid);
    if (k) {
      k.connected = on;
      if (!on) { k.queue.length = 0; }
    }
  }

  resetInputs(kid) {
    const k = this.byKid.get(kid);
    if (k) { k.queue.length = 0; k.ack = 0; k.budget = 0; }
  }

  // ---- simulatie ----
  env(k) {
    return {
      time: this.time,
      laps: this.laps,
      emit: (type, data) => this.onKartEvent(k, type, data),
      autopilot: (kk) => autopilotInput(kk, this.track),
    };
  }

  onKartEvent(k, type, data) {
    if (type === 'spawn') {
      this.spawn(data);
      return;
    }
    if (type === 'hop') return;
    this.events.push({ type, ...data });
  }

  spawn(data) {
    const id = this.nextEntityId++;
    if (data.kind === 'plas') {
      const loc = this.track.locate(data.x, data.z);
      this.entities.push({ id, kind: 'plas', x: data.x, z: data.z, h: data.h, r: 2.1, life: 30, owner: data.owner, s: loc.s, d: loc.d, i: loc.i, age: 0 });
    } else if (data.kind === 'klomp') {
      const loc = this.track.locate(data.x, data.z);
      this.entities.push({
        id, kind: 'klomp', x: data.x, z: data.z, h: data.h, r: 0.9, life: 4, owner: data.owner,
        vx: Math.sin(data.h) * data.speed, vz: Math.cos(data.h) * data.speed, bounces: 0, i: loc.i, age: 0,
      });
    }
    this.events.push({ type: 'spawn', kind: data.kind, kid: data.owner });
  }

  stepOne(k, inp) {
    stepKart(k, inp, this.track, this.env(k));
  }

  update(dt) {
    if (this.phase === 'done') return;
    this.time += dt;
    if (this.time < 0) return;
    if (this.phase === 'countdown') this.phase = 'racing';

    const ctx = { karts: this.karts, entities: this.entities, time: this.time };
    for (const k of this.karts) {
      if (k.isBot) {
        k.acc += dt;
        let n = 0;
        while (k.acc >= DT && n < 8) {
          k.acc -= DT; n++;
          const inp = k.finished ? null : botInput(k, this.track, ctx);
          this.stepOne(k, inp);
        }
      } else {
        k.budget = Math.min(k.budget + dt * TICK_RATE * 1.03, 24);
        while (k.budget >= 1 && k.queue.length) {
          const q = k.queue.shift();
          this.stepOne(k, q);
          k.ack = q.seq;
          k.budget -= 1;
        }
      }
    }

    this.entAcc += dt;
    let guard = 0;
    while (this.entAcc >= DT && guard++ < 10) {
      this.entAcc -= DT;
      this.updateEntities(DT);
    }
    this.kartCollisions();
    this.itemBoxes();
    this.rank();
    this.rubberBand();
    this.checkEnd();
  }

  updateEntities(dt) {
    const tr = this.track;
    const keep = [];
    for (const e of this.entities) {
      e.life -= dt;
      e.age += dt;
      if (e.life <= 0) { this.events.push({ type: 'poof', kind: e.kind, x: e.x, z: e.z }); continue; }
      if (e.kind === 'klomp') {
        e.x += e.vx * dt; e.z += e.vz * dt;
        e.h = Math.atan2(e.vx, e.vz);
        const loc = tr.locate(e.x, e.z, e.i);
        e.i = loc.i; e.s = loc.s; e.d = loc.d;
        const lim = tr.wallD - e.r;
        if (Math.abs(loc.d) > lim) {
          const sg = loc.d > 0 ? 1 : -1;
          const nx = tr.nx[loc.i] * sg, nz = tr.nz[loc.i] * sg;
          e.x -= nx * (Math.abs(loc.d) - lim); e.z -= nz * (Math.abs(loc.d) - lim);
          const vn = e.vx * nx + e.vz * nz;
          if (vn > 0) { e.vx -= 2 * vn * nx; e.vz -= 2 * vn * nz; }
          e.bounces++;
          if (e.bounces > 3) { this.events.push({ type: 'poof', kind: 'klomp', x: e.x, z: e.z }); continue; }
        }
        let gone = false;
        for (const o of tr.obstacles) {
          if (Math.hypot(e.x - o.x, e.z - o.z) < o.r + e.r) { gone = true; break; }
        }
        if (!gone) {
          for (const other of this.entities) {
            if (other !== e && other.kind === 'plas' && other.life > 0 && Math.hypot(e.x - other.x, e.z - other.z) < other.r + e.r) {
              other.life = 0; gone = true; break;
            }
          }
        }
        if (gone) { this.events.push({ type: 'poof', kind: 'klomp', x: e.x, z: e.z }); continue; }
      }
      // raakt een kart?
      let hit = false;
      for (const k of this.karts) {
        if (k.finished) continue;
        if (k.kid === e.owner && e.age < (e.kind === 'plas' ? 1.0 : 0.5)) continue;
        if (Math.hypot(k.x - e.x, k.z - e.z) < e.r + KART_RADIUS * 0.85) {
          const res = hitKart(k);
          this.events.push({ type: 'hit', kid: k.kid, kind: e.kind, res, by: e.owner, x: e.x, z: e.z });
          hit = true;
          break;
        }
      }
      if (!hit) keep.push(e);
    }
    this.entities = keep;
  }

  kartCollisions() {
    const ks = this.karts;
    const R2 = KART_RADIUS * 2;
    for (let i = 0; i < ks.length; i++) {
      const a = ks[i];
      for (let j = i + 1; j < ks.length; j++) {
        const b = ks[j];
        const dx = b.x - a.x, dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 >= R2 * R2) continue;
        const d = Math.sqrt(d2) || 0.01;
        const nx = dx / d, nz = dz / d;
        const overlap = R2 - d;
        a.x -= nx * overlap * 0.5; a.z -= nz * overlap * 0.5;
        b.x += nx * overlap * 0.5; b.z += nz * overlap * 0.5;
        const rv = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz; // < 0: naar elkaar toe
        if (rv >= 0) continue;
        const impact = -rv;
        const aTo = a.vx * nx + a.vz * nz;        // a rijdt richting b
        const bTo = -(b.vx * nx + b.vz * nz);     // b rijdt richting a
        let victim = aTo >= bTo ? b : a;
        let attacker = victim === a ? b : a;
        // een schild maakt je onaantastbaar: dan stuiter je de ander weg
        if (victim.shieldT > 0 && attacker.shieldT <= 0) { const t = victim; victim = attacker; attacker = t; }
        const j2 = impact * 0.7 + 2.5;
        const dir = victim === b ? 1 : -1; // richting waarin het slachtoffer weggeduwd wordt
        const shieldBoth = victim.shieldT > 0;
        if (!shieldBoth) {
          victim.vx += nx * dir * j2 * 1.25; victim.vz += nz * dir * j2 * 1.25;
          attacker.vx -= nx * dir * j2 * 0.35; attacker.vz -= nz * dir * j2 * 0.35;
          attacker.vx *= 0.93; attacker.vz *= 0.93;
        } else {
          a.vx -= nx * j2 * 0.6; a.vz -= nz * j2 * 0.6;
          b.vx += nx * j2 * 0.6; b.vz += nz * j2 * 0.6;
        }
        const now = this.time;
        const key = victim.kid < attacker.kid ? `${victim.kid}|${attacker.kid}` : `${attacker.kid}|${victim.kid}`;
        const last = a.bumpCd.get(key) || -10;
        if (impact > 2 && now - last > 0.35) {
          a.bumpCd.set(key, now);
          if (!shieldBoth) {
            victim.bumpT = Math.max(victim.bumpT, Math.min(1.0, 0.45 + impact * 0.035));
            if (victim.drift) { victim.drift = 0; victim.driftT = 0; }
          }
          this.events.push({ type: 'bump', a: attacker.kid, b: victim.kid, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, p: Math.round(impact * 10) / 10, shield: shieldBoth ? 1 : 0 });
        }
      }
    }
  }

  itemBoxes() {
    const total = this.karts.length;
    for (const box of this.boxes) {
      if (!box.active) {
        if (this.time >= box.respawn) box.active = true;
        continue;
      }
      for (const k of this.karts) {
        if (k.finished) continue;
        if (Math.hypot(k.x - box.x, k.z - box.z) < 2.3) {
          box.active = false;
          box.respawn = this.time + BOX_RESPAWN;
          if (!k.item && k.itemRoll <= 0) {
            const item = rollItem(k.place, total, this.rand);
            k.item = item;
            k.itemN = item === ITEM.TURBO3 ? 3 : 1;
            k.itemRoll = ITEM_ROLL_TIME;
          }
          this.events.push({ type: 'box', kid: k.kid, id: box.id });
          break;
        }
      }
    }
  }

  rank() {
    const tr = this.track;
    const sorted = [...this.karts].sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return raceDistance(b, tr) - raceDistance(a, tr);
    });
    sorted.forEach((k, idx) => { k.place = idx + 1; });
    this.order = sorted;
  }

  // bots die ver achter liggen worden een tikje sneller, bots die ver voor liggen iets trager
  rubberBand() {
    const humans = this.karts.filter((k) => !k.isBot);
    if (!humans.length) return;
    const tr = this.track;
    const bestHuman = Math.max(...humans.map((k) => raceDistance(k, tr)));
    for (const k of this.karts) {
      if (!k.isBot || k.finished) continue;
      const gap = raceDistance(k, tr) - bestHuman;
      const adj = gap > 120 ? -0.05 : gap > 60 ? -0.025 : gap < -150 ? 0.04 : 0;
      k.maxMul = Math.min(1.0, k.baseMul + adj);
    }
  }

  checkEnd() {
    const counted = this.karts.filter((k) => k.isBot || k.connected);
    const anyFinished = this.karts.some((k) => k.finished);
    if (anyFinished && this.endAt == null) {
      this.endAt = this.time + FINISH_GRACE;
      this.phase = 'finishing';
      this.events.push({ type: 'firstFinish', t: FINISH_GRACE });
    }
    const humansLeft = this.karts.some((k) => !k.isBot && k.connected && !k.finished);
    const allDone = counted.every((k) => k.finished) || (anyFinished && !humansLeft && this.karts.some((k) => !k.isBot));
    if (allDone || (this.endAt != null && this.time >= this.endAt) || this.time >= MAX_RACE_TIME) {
      this.phase = 'done';
      this.rank();
    }
  }

  results() {
    this.rank();
    return this.order.map((k, idx) => {
      const e = this.entrants.find((x) => x.kid === k.kid);
      return {
        kid: k.kid, id: e.id, name: e.name, isBot: !!e.isBot, character: e.character, cosmetics: e.cosmetics,
        place: idx + 1, finished: !!k.finished, time: k.finished ? k.finishTime : null,
        bestLap: k.bestLap || null, lap: Math.min(k.lap, this.laps),
      };
    });
  }

  takeEvents() {
    const ev = this.events;
    this.events = [];
    return ev;
  }
}
