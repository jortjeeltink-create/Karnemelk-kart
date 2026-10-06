// Opslag van spelersprofielen (MP-punten, gekochte spullen, uiterlijk) per telefoon.
// Standaard in een JSON-bestand. Elke telefoon krijgt daarnaast een ondertekende
// reservekopie, zodat niemand iets kwijtraakt als de server opnieuw opstart zonder
// vaste schijf (gratis hosting). Upstash Redis (UPSTASH_REDIS_REST_URL + _TOKEN) mag ook, hoeft niet.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { Profiles } from '../public/shared/profiles.js';

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

export const randomString = (n) => randomBytes(Math.ceil((n * 3) / 4) + 2).toString('base64url').slice(0, n);

export function createProfiles(kv) {
  return new Profiles(kv, { randomString });
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
  const store = createProfiles(kv);
  await store.init();
  return store;
}

// Geheim om reservekopieën mee te ondertekenen. Bij voorkeur uit KK_SECRET (Render maakt die
// automatisch aan), anders één keer gemaakt en in de opslag bewaard.
export async function loadSecret(kv, fromEnv) {
  if (typeof fromEnv === 'string' && fromEnv.length >= 8) return fromEnv;
  let s = await kv.get('secret');
  if (typeof s !== 'string' || s.length < 32) {
    s = randomString(48);
    await kv.set('secret', s);
    if (kv.flush) kv.flush();
  }
  return s;
}

export function makeSigner(secret) {
  const mac = (text) => createHmac('sha256', secret).update(text).digest('base64url');
  return {
    sign: mac,
    verify(text, sig) {
      const a = Buffer.from(mac(text));
      const b = Buffer.from(String(sig));
      return a.length === b.length && timingSafeEqual(a, b);
    },
  };
}
