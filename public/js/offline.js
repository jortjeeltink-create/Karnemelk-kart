// Offline-demo: de "server" draait in de pagina zelf (alleen oefenen + winkel).
// Wordt alleen gebruikt door de demo-build (npm run build:demo).
import { Hub } from '../shared/hub.js';
import { cleanName, nameKey } from '../shared/util.js';
import { DEFAULT_EQUIP, START_MP } from '../shared/shop.js';
import { store } from './settings.js';

const KEY = 'kk-offline-profielen';

function hashPin(pin, salt) {
  let h = 2166136261;
  const s = salt + ':' + pin;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}

class LocalStore {
  constructor() {
    let d = null;
    try { d = JSON.parse(store.get(KEY) || 'null'); } catch { d = null; }
    this.data = d && d.profiles ? d : { profiles: {}, tokens: {} };
  }

  persist() { store.set(KEY, JSON.stringify(this.data)); }

  async login(rawName, pin) {
    const name = cleanName(rawName);
    if (!name) return { ok: false, error: 'Kies een naam van 2 tot 16 tekens (letters, cijfers, spatie of -).' };
    if (typeof pin !== 'string' || !/^\d{4}$/.test(pin)) return { ok: false, error: 'Je PIN moet uit precies 4 cijfers bestaan.' };
    const key = nameKey(name);
    let p = this.data.profiles[key];
    let created = false;
    if (!p) {
      const salt = Math.random().toString(36).slice(2);
      p = { key, name, salt, pin: hashPin(pin, salt), mp: START_MP, owned: [], equipped: { ...DEFAULT_EQUIP }, stats: { races: 0, wins: 0, podiums: 0, totalMp: 0 } };
      this.data.profiles[key] = p;
      created = true;
    } else if (p.pin !== hashPin(pin, p.salt)) {
      return { ok: false, error: `De naam "${p.name}" bestaat al op dit apparaat en deze PIN klopt niet.` };
    }
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    this.data.tokens[token] = key;
    this.persist();
    return { ok: true, profile: p, token, created };
  }

  async fromToken(t) { const k = this.data.tokens[t]; return k ? this.data.profiles[k] || null : null; }
  async get(key) { return this.data.profiles[key] || null; }
  async save(p) { this.data.profiles[p.key] = p; this.persist(); }
  async logout(t) { delete this.data.tokens[t]; this.persist(); }
}

window.KK_OFFLINE = {
  createHub: () => new Hub({ store: new LocalStore(), now: () => Date.now() }),
};
