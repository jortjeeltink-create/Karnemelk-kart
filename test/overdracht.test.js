// Overdracht bij een update: de nieuwe server neemt alles over van de server die nog draait (server/overdracht.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sign, verify, overdrachtSecret } from '../server/overdracht.js';
import { startServer } from './helpers.js';

const SECRET = 'een-lang-geheim-voor-de-test-1234';
const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

test('handtekening: alleen met het goede geheim, en maar een minuut geldig', () => {
  const t = Date.UTC(2026, 10, 9, 12, 0);
  const h = sign(SECRET, t);
  assert.equal(verify(SECRET, h, t + 5000), true);
  assert.equal(verify(SECRET, h, t + 61_000), false, 'te oud');
  assert.equal(verify('een-ander-geheim-van-genoeg-tekens', h, t), false, 'ander geheim');
  assert.equal(verify(SECRET, h.slice(0, -1) + (h.endsWith('0') ? '1' : '0'), t), false, 'aangepast');
  assert.equal(verify(SECRET, 'onzin', t), false);
  assert.equal(verify('', h, t), false, 'zonder geheim nooit');
  assert.equal(overdrachtSecret({ KK_SECRET: 'kort' }), '', 'te kort geheim telt niet');
  assert.equal(overdrachtSecret({ MELD_SLEUTEL: SECRET }), SECRET);
});

test('een update: de nieuwe server begint met de statistieken, meldingen en reviews van de oude', async () => {
  const oud = await startServer({ env: { KK_SECRET: SECRET, MELD_SLEUTEL: 'geheim123' } });
  let nieuw = null, vreemd = null;
  try {
    // wat bezoekers en een review op de oude server
    for (const p of ['/', '/bussen', '/mexen']) await fetch(oud.url + p, { headers: { 'User-Agent': PHONE } });
    const post = (path, body) => fetch(oud.url + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post('/api/review', { sterren: 5, spel: 'bussen', goed: 'Top', bron: 'na-spel' })).status, 200);
    assert.equal((await post('/api/melden', { spel: 'mexen', wat: 'Iemand scheldt' })).status, 200);
    // zonder of met een foute handtekening geeft de oude server niks
    assert.equal((await fetch(oud.url + '/api/intern/overdracht')).status, 404);
    assert.equal((await fetch(oud.url + '/api/intern/overdracht', { headers: { 'X-Overdracht': sign('een-ander-geheim-van-genoeg-tekens') } })).status, 404);

    // de nieuwe server (lege map) haalt alles op voordat hij start
    nieuw = await startServer({ env: { KK_SECRET: SECRET, MELD_SLEUTEL: 'geheim123', OVERDRACHT_URL: oud.url } });
    assert.match(nieuw.output(), /overdracht: \d+ sleutels overgenomen/);
    const s = await (await fetch(nieuw.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.equal(s.days[0].views, 3, 'de bezoeken van vandaag zijn er nog');
    assert.equal(s.overgenomen.ok, true, 'de statistieken zeggen dat het gelukt is');
    assert.ok(s.overgenomen.n > 0, 'en hoeveel er is overgenomen');
    assert.deepEqual(s.days[0].pages, { hoofdpagina: 1, bussen: 1, mexen: 1 });
    const b = await (await fetch(nieuw.url + '/api/beheer?sleutel=geheim123')).json();
    assert.equal(b.reviews.length, 1);
    assert.equal(b.reviews[0].goed, 'Top');
    assert.equal(b.meldingen[0].wat, 'Iemand scheldt');

    // een server met een ander geheim krijgt niks, en begint gewoon leeg
    vreemd = await startServer({ env: { KK_SECRET: 'een-ander-geheim-van-genoeg-tekens', MELD_SLEUTEL: 'geheim123', OVERDRACHT_URL: oud.url } });
    assert.match(vreemd.output(), /overdracht: geen gegevens van de vorige server \(404\)/);
    const s2 = await (await fetch(vreemd.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.equal(s2.days[0].views, 0);
    assert.equal(s2.overdracht, true);
    assert.deepEqual([s2.overgenomen.ok, s2.overgenomen.reden], [false, 'de vorige server gaf 404']);
  } finally {
    await oud.stop();
    if (nieuw) await nieuw.stop();
    if (vreemd) await vreemd.stop();
  }
});

test('zonder vorige server (de eerste start) start de server gewoon', async () => {
  const srv = await startServer({ env: { KK_SECRET: SECRET, OVERDRACHT_URL: 'http://127.0.0.1:9' } });
  try {
    assert.match(srv.output(), /overdracht: niet gelukt/);
    assert.equal((await fetch(srv.url + '/health')).status, 200);
  } finally {
    await srv.stop();
  }
});
