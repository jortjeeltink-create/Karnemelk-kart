// Offline-demo: de "server" draait in de pagina zelf (alleen oefenen + winkel).
// Wordt alleen gebruikt door de demo-build (npm run build:demo).
import { Hub } from '../shared/hub.js';
import { Profiles } from '../shared/profiles.js';
import { store } from './settings.js';

const KEY = 'kk-offline-data';

// sleutel/waarde-opslag in localStorage
class LocalKV {
  constructor() {
    let d = null;
    try { d = JSON.parse(store.get(KEY) || 'null'); } catch { d = null; }
    this.data = d && typeof d === 'object' ? d : {};
  }
  async get(k) { return this.data[k] ?? null; }
  async set(k, v) { this.data[k] = v; store.set(KEY, JSON.stringify(this.data)); }
  async del(k) { delete this.data[k]; store.set(KEY, JSON.stringify(this.data)); }
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function randomString(n) {
  const buf = new Uint8Array(n);
  (globalThis.crypto || window.crypto).getRandomValues(buf);
  let s = '';
  for (const b of buf) s += ALPHA[b & 63];
  return s;
}

window.KK_OFFLINE = {
  createHub: () => new Hub({ store: new Profiles(new LocalKV(), { randomString }), now: () => Date.now(), offline: true }),
};
