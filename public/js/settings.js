// Instellingen van deze speler op dit apparaat (in localStorage).
const KEY = 'kk-instellingen';

export const DEFAULT_SETTINGS = {
  music: 0.5,
  sfx: 0.8,
  muted: false,
  controls: 'knoppen',   // knoppen | schuif | kantelen
  autoGas: true,
  quality: 'auto',       // auto | laag | normaal | hoog
  names: true,
  lefty: false,
  vibrate: true,
  minimap: true,
  secretBtn: true,       // geheime boostknop tonen (als je de code hebt)
};

export function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { s = {}; }
  return { ...DEFAULT_SETTINGS, ...s };
}

export function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* privémodus */ }
}

export const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, v) { try { localStorage.setItem(key, v); } catch { /* negeren */ } },
  del(key) { try { localStorage.removeItem(key); } catch { /* negeren */ } },
};
