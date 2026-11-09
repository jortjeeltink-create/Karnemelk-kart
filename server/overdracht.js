// Overdracht bij een update. Render start bij elke update een nieuwe server met een lege schijf; wat de oude server in
// zijn bestand schreef (statistieken, meldingen, reviews, profielen) is dan weg. Maar tijdens de update draait de oude
// server nog even door, en het gewone adres (spelkeet.onrender.com) wijst nog naar hem tot de nieuwe klaarstaat. Dus:
// voordat de nieuwe server bezoekers aanneemt, vraagt hij via dat adres alles op bij de oude en begint hij daarmee.
// Alleen met een handtekening op basis van een geheim dat in Render staat (KK_SECRET of MELD_SLEUTEL), en die
// handtekening is maar een minuut geldig.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';

export const PATH = '/api/intern/overdracht';
const MAX_AGE_MS = 60_000;

export function overdrachtSecret(env) {
  return [env.KK_SECRET, env.MELD_SLEUTEL].find((s) => typeof s === 'string' && s.length >= 16) || '';
}

const mac = (secret, t) => createHmac('sha256', secret).update(`overdracht|${t}`).digest('hex');
export const sign = (secret, t = Date.now()) => `${t}.${mac(secret, t)}`;

export function verify(secret, header, now = Date.now()) {
  if (!secret || typeof header !== 'string') return false;
  const m = header.match(/^(\d{10,15})\.([0-9a-f]{64})$/);
  if (!m) return false;
  const t = Number(m[1]);
  if (Math.abs(now - t) > MAX_AGE_MS) return false;
  const want = Buffer.from(mac(secret, t), 'hex'), got = Buffer.from(m[2], 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}

// Haal de gegevens op bij de server die nu nog draait en zet ze in het opslagbestand, voordat de opslag geladen wordt.
// Geeft terug of het gelukt is, hoeveel sleutels er overkwamen en anders waarom niet.
export async function haalOver({ url, secret, file, log = () => {}, timeoutMs = 15_000, fetchImpl = globalThis.fetch }) {
  if (!url || !secret) return { ok: false, n: 0, reden: 'staat uit' };
  if (existsSync(file)) return { ok: false, n: 0, reden: 'er stond al een opslagbestand' };   // zoals bij een vaste schijf
  try {
    const r = await fetchImpl(new URL(PATH, url), { headers: { 'X-Overdracht': sign(secret) }, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) { log(`overdracht: geen gegevens van de vorige server (${r.status})`); return { ok: false, n: 0, reden: `de vorige server gaf ${r.status}` }; }
    const data = await r.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) { log('overdracht: onbruikbaar antwoord'); return { ok: false, n: 0, reden: 'onbruikbaar antwoord' }; }
    mkdirSync(dirname(file), { recursive: true });
    const tmp = `${file}.overdracht`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, file);
    const n = Object.keys(data).length;
    log(`overdracht: ${n} sleutels overgenomen van de vorige server`);
    return { ok: true, n, reden: '' };
  } catch (e) {
    const reden = e.name === 'TimeoutError' ? 'geen antwoord' : e.message;
    log(`overdracht: niet gelukt (${reden})`);
    return { ok: false, n: 0, reden };
  }
}
