// Spelersprofielen zonder wachtwoord of PIN: je telefoon krijgt een geheime
// apparaatsleutel en daaraan hangen je naam, MP-punten en spullen.
// Werkt met elke sleutel/waarde-opslag met async get/set/del (bestand, Redis of de browser).
import { cleanName } from './util.js';
import { DEFAULT_EQUIP, START_MP, SHOP_BY_ID, ownsItem } from './shop.js';
import { cleanLook, DEFAULT_LOOK } from './look.js';

const DEVICE_RE = /^[A-Za-z0-9_-]{20,64}$/;
const TRANSFER_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const TRANSFER_MINUTES = 15;
export const DAILY_BONUS = 25;

export const isDeviceToken = (t) => typeof t === 'string' && DEVICE_RE.test(t);

// datum in Nederland (voor de dagbonus)
export function dayKey(ms) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 10);
  }
}

export class Profiles {
  // randomBytes(n) -> string met willekeurige url-veilige tekens
  constructor(kv, { randomString, now = () => Date.now() }) {
    this.kv = kv;
    this.randomString = randomString;
    this.now = now;
    this.cache = new Map();
  }

  async init() { if (this.kv.init) await this.kv.init(); }

  newDeviceToken() { return this.randomString(32); }

  async get(key) {
    if (typeof key !== 'string') return null;
    if (this.cache.has(key)) return this.cache.get(key);
    const p = await this.kv.get('p:' + key);
    if (p) {
      p.equipped = { ...DEFAULT_EQUIP, ...(p.equipped || {}) };
      p.look = cleanLook(p.look);
      this.cache.set(key, p);
    }
    return p;
  }

  async byDevice(token) {
    if (!isDeviceToken(token)) return null;
    const d = await this.kv.get('d:' + token);
    return d && d.key ? this.get(d.key) : null;
  }

  async linkDevice(token, key) {
    if (!isDeviceToken(token)) return;
    await this.kv.set('d:' + token, { key, at: this.now() });
  }

  async register(token, rawName) {
    if (!isDeviceToken(token)) return { ok: false, error: 'Er ging iets mis met dit apparaat. Herlaad de pagina.' };
    const existing = await this.byDevice(token);
    if (existing) return { ok: true, profile: existing, created: false };
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: 'Kies een naam van 2 tot 16 tekens (letters, cijfers, spatie of -).' };
    let key;
    do key = this.randomString(10); while (await this.kv.get('p:' + key));
    const profile = {
      key, name, mp: START_MP, owned: [], equipped: { ...DEFAULT_EQUIP }, look: { ...DEFAULT_LOOK },
      stats: { races: 0, wins: 0, podiums: 0, totalMp: 0 }, created: this.now(),
    };
    this.cache.set(key, profile);
    await this.kv.set('p:' + key, profile);
    await this.linkDevice(token, key);
    return { ok: true, profile, created: true };
  }

  async rename(profile, rawName) {
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: 'Kies een naam van 2 tot 16 tekens (letters, cijfers, spatie of -).' };
    profile.name = name;
    await this.save(profile);
    return { ok: true };
  }

  async setLook(profile, rawLook) {
    profile.look = cleanLook(rawLook);
    await this.save(profile);
    return { ok: true };
  }

  async save(profile) {
    this.cache.set(profile.key, profile);
    await this.kv.set('p:' + profile.key, profile);
  }

  // ---- overzetten naar een andere telefoon ----
  async createTransfer(profile) {
    if (profile.transfer) await this.kv.del('x:' + profile.transfer);
    let code;
    do {
      code = '';
      const r = this.randomString(12);
      for (let i = 0; i < 6; i++) code += TRANSFER_ALPHABET[r.charCodeAt(i) % TRANSFER_ALPHABET.length];
    } while (await this.kv.get('x:' + code));
    await this.kv.set('x:' + code, { key: profile.key, until: this.now() + TRANSFER_MINUTES * 60000 });
    profile.transfer = code;
    await this.save(profile);
    return code;
  }

  async useTransfer(token, rawCode) {
    const code = typeof rawCode === 'string' ? rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    if (code.length !== 6) return { ok: false, error: 'Een overzetcode heeft 6 tekens.' };
    const x = await this.kv.get('x:' + code);
    if (!x || x.until < this.now()) {
      if (x) await this.kv.del('x:' + code);
      return { ok: false, error: 'Deze overzetcode klopt niet of is verlopen. Maak op je oude telefoon een nieuwe code.' };
    }
    const profile = await this.get(x.key);
    if (!profile) return { ok: false, error: 'Dit profiel bestaat niet meer.' };
    await this.kv.del('x:' + code);
    delete profile.transfer;
    await this.save(profile);
    await this.linkDevice(token, profile.key);
    return { ok: true, profile };
  }

  // ---- reservekopie op de telefoon ----
  // Na een herstart van de server (gratis hosting zonder database) brengt de telefoon
  // je profiel terug. De kopie is ondertekend door de server, dus niet aan te passen.
  async restore(token, raw) {
    if (!isDeviceToken(token)) return null;
    const data = cleanBackup(raw);
    if (!data) return null;
    const existing = await this.get(data.key);
    if (existing) {
      // bestaat al (bijvoorbeeld een tweede telefoon met hetzelfde profiel): alleen koppelen
      await this.linkDevice(token, existing.key);
      return existing;
    }
    const profile = { ...data, created: data.created || this.now(), restored: this.now() };
    await this.save(profile);
    await this.linkDevice(token, profile.key);
    return profile;
  }

  flush() { if (this.kv.flush) this.kv.flush(); }
}

const KEY_RE = /^[A-Za-z0-9_-]{6,20}$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const int = (v, max) => (Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0);

// wat er in de reservekopie op de telefoon staat
export function backupData(p) {
  return {
    v: 1, key: p.key, name: p.name, mp: p.mp, owned: p.owned || [], equipped: p.equipped || {}, look: p.look,
    stats: p.stats || {}, lastCharacter: p.lastCharacter || null, lastDaily: p.lastDaily || null, created: p.created || null,
  };
}

// reservekopie controleren en opschonen (alleen bekende spullen, geldige getallen)
export function cleanBackup(raw) {
  if (!raw || typeof raw !== 'object' || raw.v !== 1 || !KEY_RE.test(raw.key || '')) return null;
  const name = cleanName(raw.name);
  if (!name) return null;
  const owned = [...new Set(Array.isArray(raw.owned) ? raw.owned : [])].filter((id) => typeof id === 'string' && SHOP_BY_ID[id]);
  const profile = { key: raw.key, name, mp: int(raw.mp, 1e7), owned, equipped: { ...DEFAULT_EQUIP }, look: cleanLook(raw.look) };
  const eq = raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : {};
  for (const slot of Object.keys(DEFAULT_EQUIP)) {
    const it = SHOP_BY_ID[eq[slot]];
    if (it && it.slot === slot && ownsItem(profile, it.id)) profile.equipped[slot] = it.id;
  }
  const st = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
  profile.stats = { races: int(st.races, 1e6), wins: int(st.wins, 1e6), podiums: int(st.podiums, 1e6), totalMp: int(st.totalMp, 1e8) };
  if (typeof raw.lastCharacter === 'string' && raw.lastCharacter.length <= 20) profile.lastCharacter = raw.lastCharacter;
  if (typeof raw.lastDaily === 'string' && DAY_RE.test(raw.lastDaily)) profile.lastDaily = raw.lastDaily;
  if (Number.isFinite(raw.created)) profile.created = raw.created;
  return profile;
}
