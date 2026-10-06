// Opslag van spelersprofielen (MP-punten, gekochte spullen) en inlogsessies.
// Standaard in een JSON-bestand; met UPSTASH_REDIS_REST_URL + _TOKEN in een
// (gratis) Upstash Redis-database, handig bij hosting zonder vaste schijf.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { cleanName, nameKey } from '../public/shared/util.js';
import { DEFAULT_EQUIP, START_MP } from '../public/shared/shop.js';

// ---------- sleutel/waarde-opslag ----------
export class FileKV {
  constructor(dir) {
    this.dir = dir;
    this.file = join(dir, 'karnemelk-data.json');
    this.data = {};
    this.timer = null;
  }
  async init() {
    mkdirSync(this.dir, { recursive: true });
    if (existsSync(this.file)) {
      try {
        this.data = JSON.parse(readFileSync(this.file, 'utf8'));
      } catch (e) {
        console.error('Kon opslagbestand niet lezen, ik maak een reservekopie en begin opnieuw:', e.message);
        try { renameSync(this.file, this.file + '.kapot-' + Date.now()); } catch { /* negeren */ }
        this.data = {};
      }
    }
  }
  async get(key) { return this.data[key] ?? null; }
  async set(key, value) { this.data[key] = value; this.schedule(); }
  async del(key) { delete this.data[key]; this.schedule(); }
  schedule() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), 400);
  }
  flush() {
    clearTimeout(this.timer);
    this.timer = null;
    const tmp = this.file + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.data));
    renameSync(tmp, this.file);
  }
}

export class UpstashKV {
  constructor(url, token, fetchImpl = globalThis.fetch) {
    this.url = url.replace(/\/$/, '');
    this.token = token;
    this.fetch = fetchImpl;
  }
  async init() {
    const r = await this.cmd(['PING']);
    if (r !== 'PONG') throw new Error('Upstash antwoordt niet met PONG');
  }
  async cmd(args) {
    const res = await this.fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    });
    const body = await res.json();
    if (!res.ok || body.error) throw new Error(`Upstash-fout: ${body.error || res.status}`);
    return body.result;
  }
  async get(key) {
    const v = await this.cmd(['GET', 'kk:' + key]);
    return v == null ? null : JSON.parse(v);
  }
  async set(key, value) { await this.cmd(['SET', 'kk:' + key, JSON.stringify(value)]); }
  async del(key) { await this.cmd(['DEL', 'kk:' + key]); }
  flush() {}
}

// ---------- profielen ----------
const PIN_RE = /^\d{4}$/;

function hashPin(pin, salt) {
  return scryptSync(pin, salt, 32).toString('hex');
}

export class ProfileStore {
  constructor(kv) {
    this.kv = kv;
    this.cache = new Map();      // key -> profiel (één gedeeld object per speler)
    this.fails = new Map();      // key -> { n, until }
  }

  async init() { await this.kv.init(); }

  async get(key) {
    if (this.cache.has(key)) return this.cache.get(key);
    const p = await this.kv.get('p:' + key);
    if (p) {
      p.equipped = { ...DEFAULT_EQUIP, ...(p.equipped || {}) };
      this.cache.set(key, p);
    }
    return p;
  }

  async login(rawName, pin) {
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: 'Kies een naam van 2 tot 16 tekens (letters, cijfers, spatie of -).' };
    if (typeof pin !== 'string' || !PIN_RE.test(pin)) return { ok: false, error: 'Je PIN moet uit precies 4 cijfers bestaan.' };
    const key = nameKey(name);
    const now = Date.now();
    const f = this.fails.get(key);
    if (f && f.until > now) {
      const min = Math.ceil((f.until - now) / 60000);
      return { ok: false, error: `Te veel foute pogingen voor deze naam. Probeer het over ${min} minuut${min > 1 ? 'en' : ''} opnieuw.` };
    }
    let profile = await this.get(key);
    let created = false;
    if (!profile) {
      const salt = randomBytes(16).toString('hex');
      profile = {
        key, name, salt, pin: hashPin(pin, salt), mp: START_MP, owned: [], equipped: { ...DEFAULT_EQUIP },
        stats: { races: 0, wins: 0, podiums: 0, totalMp: 0 }, created: now,
      };
      this.cache.set(key, profile);
      await this.kv.set('p:' + key, profile);
      created = true;
    } else {
      const a = Buffer.from(hashPin(pin, profile.salt), 'hex');
      const b = Buffer.from(profile.pin, 'hex');
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        const lockExpired = f && f.until > 0 && f.until <= now;
        const n = (f && !lockExpired ? f.n : 0) + 1;
        this.fails.set(key, { n, until: n >= 5 ? now + 5 * 60000 : 0 });
        return { ok: false, error: `De naam "${profile.name}" is al bezet en deze PIN klopt niet. Is dit jouw naam? Probeer je PIN opnieuw, of kies een andere naam.` };
      }
      this.fails.delete(key);
    }
    const token = randomBytes(24).toString('base64url');
    await this.kv.set('t:' + token, { key, at: now });
    return { ok: true, profile, token, created };
  }

  async fromToken(token) {
    const t = await this.kv.get('t:' + token);
    if (!t || !t.key) return null;
    return this.get(t.key);
  }

  async save(profile) {
    this.cache.set(profile.key, profile);
    await this.kv.set('p:' + profile.key, profile);
  }

  async logout(token) { await this.kv.del('t:' + token); }

  flush() { this.kv.flush(); }
}

export async function createStore({ dataDir, upstashUrl, upstashToken, log = console.log }) {
  let kv;
  if (upstashUrl && upstashToken) {
    kv = new UpstashKV(upstashUrl, upstashToken);
    log('Opslag: Upstash Redis');
  } else {
    kv = new FileKV(dataDir);
    log(`Opslag: bestand in ${dataDir}`);
  }
  const store = new ProfileStore(kv);
  await store.init();
  return store;
}
