// Bewaartermijn: wat ouder is dan 90 dagen, wordt vanzelf gewist (profielen waarmee niet meer gespeeld is,
// koppelingen van telefoons, verlopen codes, aantekeningen van gewiste profielen, meldingen en statistieken).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Profiles, RETENTION_DAYS } from '../public/shared/profiles.js';
import { FileKV } from '../server/store.js';
import { createStats } from '../server/stats.js';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from './helpers.js';

const DAY = 86400000;
const TOKEN = (n) => `apparaat-${String(n).padStart(24, '0')}`;
let n = 0;
const randomString = (len) => String(++n).padStart(len, 'x');

async function setup() {
  let t = Date.UTC(2026, 0, 1);
  const kv = new FileKV(mkdtempSync(join(tmpdir(), 'kk-bewaar-')));
  await kv.init();
  const store = new Profiles(kv, { randomString, now: () => t });
  return { kv, store, at: (d) => { t = Date.UTC(2026, 0, 1) + d * DAY; } };
}

test('de bewaartermijn is 90 dagen', () => {
  assert.equal(RETENTION_DAYS, 90);
});

test('een profiel waarmee 90 dagen niet gespeeld is, wordt gewist; wie speelt, houdt het', async () => {
  const { kv, store, at } = await setup();
  const a = (await store.register(TOKEN(1), 'Sanne')).profile;
  const b = (await store.register(TOKEN(2), 'Bas')).profile;
  await store.touch(a); await store.touch(b);
  // Sanne speelt na 60 dagen nog een keer, Bas niet meer
  at(60);
  await store.touch(await store.byDevice(TOKEN(1)));
  at(95);
  const r = await store.cleanup();
  assert.equal(r.profiles, 1, 'alleen Bas');
  assert.equal(r.devices, 1, 'en de koppeling van zijn telefoon');
  assert.equal(await kv.get('p:' + b.key), null);
  assert.equal(await kv.get('d:' + TOKEN(2)), null);
  assert.ok(await kv.get('p:' + a.key), 'Sanne speelde 35 dagen geleden nog');
  assert.equal((await store.byDevice(TOKEN(1))).name, 'Sanne');
});

test('profielen van voor deze regel krijgen eerst 90 dagen de tijd, in plaats van meteen weg te gaan', async () => {
  const { kv, store, at } = await setup();
  await kv.set('p:oud', { key: 'oud', name: 'Oud', created: Date.UTC(2024, 0, 1) });
  await kv.set('d:' + TOKEN(3), { key: 'oud', at: Date.UTC(2026, 0, 1) });
  let r = await store.cleanup();
  assert.equal(r.profiles, 0);
  assert.ok((await kv.get('p:oud')).seen, 'krijgt vandaag als datum');
  at(91);
  r = await store.cleanup();
  assert.equal(r.profiles, 1);
  assert.equal(await kv.get('p:oud'), null);
});

test('verlopen overdrachtscodes en oude aantekeningen van gewiste profielen gaan ook weg', async () => {
  const { kv, store, at } = await setup();
  await kv.set('x:ABC123', { key: 'iets', until: Date.UTC(2026, 0, 1) + 600000 });
  await kv.set('gone:weg', { at: Date.UTC(2026, 0, 1) });
  at(1);
  let r = await store.cleanup();
  assert.equal(r.transfers, 1);
  assert.equal(r.gone, 0, 'nog geen 90 dagen');
  at(92);
  r = await store.cleanup();
  assert.equal(r.gone, 1);
});

test('touch schrijft hooguit één keer per dag, en zonder het versienummer te verhogen', async () => {
  const { kv, store, at } = await setup();
  const p = (await store.register(TOKEN(4), 'Noor')).profile;
  const rev = p.rev;
  await store.touch(p);
  const first = (await kv.get('p:' + p.key)).seen;
  at(0.5);
  await store.touch(p);
  assert.equal((await kv.get('p:' + p.key)).seen, first, 'dezelfde dag: niet opnieuw');
  at(2);
  await store.touch(p);
  assert.ok((await kv.get('p:' + p.key)).seen > first);
  assert.equal(p.rev, rev);
});

test('statistieken: alleen de laatste 90 dagen blijven bewaard', async () => {
  let t = Date.UTC(2026, 0, 1, 12);
  const m = new Map();
  const kv = { get: async (k) => m.get(k) ?? null, set: async (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); } };
  const s = await createStats({ kv, now: () => t });
  for (let d = 0; d < 100; d++) { t = Date.UTC(2026, 0, 1, 12) + d * DAY; s.pageview('hoofdpagina', { ip: '1.1.1.1', ua: 'Mozilla/5.0 (iPhone) Safari' }); }
  await s.flush();
  assert.equal(Object.keys(m.get('stats').days).length, 90);
});

test('de server: het cookie geldt 90 dagen, en meldingen ouder dan 90 dagen worden opgeruimd', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kk-bewaar-srv-'));
  const now = Date.now();
  const meldingen = [{ at: new Date(now - 10 * DAY).toISOString(), wat: 'recent' }, { at: new Date(now - 120 * DAY).toISOString(), wat: 'oud' }];
  const fs = await import('node:fs');
  fs.writeFileSync(join(dir, 'karnemelk-data.json'), JSON.stringify({ meldingen }));
  const srv = await startServer({ dataDir: dir, env: { MELD_SLEUTEL: 'geheim123' } });
  try {
    const r = await fetch(srv.url + '/kart');
    assert.match(r.headers.get('set-cookie') || '', new RegExp(`Max-Age=${90 * 86400}\\b`));
    // een nieuwe melding ruimt meteen de oude op
    await fetch(srv.url + '/api/melden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wat: 'Iets nieuws gemeld' }) });
    const list = await (await fetch(srv.url + '/api/meldingen?sleutel=geheim123')).json();
    assert.deepEqual(list.map((x) => x.wat), ['Iets nieuws gemeld', 'recent']);
  } finally {
    await srv.stop();
  }
  // het privacybeleid noemt de termijn
  const privacy = readFileSync(new URL('../public/privacy.html', import.meta.url), 'utf8');
  assert.match(privacy, /90 dagen/);
  assert.ok(!/400 dagen|hooguit een jaar|120 dagen/.test(privacy), 'geen oude termijnen meer');
});
