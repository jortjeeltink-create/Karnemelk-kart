// De statistieken: bezoekers per dag en per uur (Nederlandse tijd), zonder cookies of IP-adressen te bewaren.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStats, dayHour, isBot } from '../server/stats.js';
import { ZuipbordHub } from '../public/shared/zuipbordhub.js';
import { startServer } from './helpers.js';

const fakeKv = () => { const m = new Map(); return { m, get: async (k) => m.get(k) ?? null, set: async (k, v) => { m.set(k, JSON.parse(JSON.stringify(v))); } }; };
const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

test('dag en uur in Nederlandse tijd, ook rond middernacht en met zomertijd', () => {
  assert.deepEqual(dayHour(Date.UTC(2026, 10, 4, 22, 30)), { day: '2026-11-04', hour: 23 }, 'winter: UTC+1');
  assert.deepEqual(dayHour(Date.UTC(2026, 10, 4, 23, 30)), { day: '2026-11-05', hour: 0 });
  assert.deepEqual(dayHour(Date.UTC(2026, 6, 1, 20, 0)), { day: '2026-07-01', hour: 22 }, 'zomer: UTC+2');
});

test('bezoekers tellen: elke bezoeker één keer per dag, bots niet, en per uur en per pagina', async () => {
  let t = Date.UTC(2026, 10, 4, 19, 0);   // 20:00 in Amsterdam
  const kv = fakeKv(), s = await createStats({ kv, now: () => t });
  assert.equal(isBot('Googlebot/2.1'), true);
  assert.equal(isBot(''), true, 'zonder browser: geen mens');
  assert.equal(isBot(PHONE), false);
  s.pageview('hoofdpagina', { ip: '1.2.3.4', ua: PHONE });
  s.pageview('bussen', { ip: '1.2.3.4', ua: PHONE });
  s.pageview('bussen', { ip: '5.6.7.8', ua: PHONE });
  assert.equal(s.pageview('hoofdpagina', { ip: '9.9.9.9', ua: 'Mozilla/5.0 (compatible; bingbot/2.0)' }), false);
  assert.equal(s.pageview('hoofdpagina', { ip: '9.9.9.9', ua: 'WhatsApp/2.23' }), false, 'een linkvoorbeeld is geen bezoeker');
  s.game('tafel', 'bussen');
  s.game('potje', 'bussen');
  let d = s.summary(1).days[0];
  assert.equal(d.day, '2026-11-04');
  assert.equal(d.views, 3);
  assert.equal(d.visitors, 2);
  assert.equal(d.hours[20], 3);
  assert.deepEqual(d.pages, { hoofdpagina: 1, bussen: 2 });
  assert.deepEqual([d.tables, d.starts], [{ bussen: 1 }, { bussen: 1 }]);
  assert.equal(s.online(), 2, 'twee mensen de laatste 5 minuten');
  // een nieuwe dag: dezelfde mensen tellen weer als bezoeker
  t += 24 * 3600 * 1000;
  s.pageview('hoofdpagina', { ip: '1.2.3.4', ua: PHONE });
  const sum = s.summary(2);
  assert.deepEqual(sum.days.map((x) => x.visitors), [2, 1]);
  assert.equal(sum.today, '2026-11-05');
  // na 5 minuten stil: niemand meer online
  t += 6 * 60 * 1000;
  assert.equal(s.online(), 0);
});

test('de tellingen gaan naar de opslag, zonder IP-adressen of hashes, en komen na een herstart terug', async () => {
  const t = Date.UTC(2026, 10, 4, 12, 0);
  const kv = fakeKv(), s = await createStats({ kv, now: () => t });
  s.pageview('mexen', { ip: '1.2.3.4', ua: PHONE });
  await s.flush();
  const saved = JSON.stringify(kv.m.get('stats'));
  assert.ok(!saved.includes('1.2.3.4'), 'geen IP-adres');
  assert.ok(!/[0-9a-f]{20}/.test(saved), 'geen hash van een bezoeker');
  const again = await createStats({ kv, now: () => t });
  assert.equal(again.summary(1).days[0].views, 1);
  // dagen zonder bezoek staan er met 0 in
  assert.deepEqual(again.summary(3).days.map((x) => x.views), [0, 0, 1]);
});

test('een tafel en een potje tellen mee bij het spel', () => {
  const got = [];
  const hub = new ZuipbordHub({ log: () => {}, stat: (kind, id) => got.push([kind, id]), random: () => 0.5 });
  const phone = (n) => { const p = { token: `telefoon-${String(n).padStart(10, '0')}`, last: {} }; p.conn = { send: (x) => { const m = JSON.parse(x); p.last[m.t] = m; }, close() {} }; hub.connect(p.conn); p.say = (m) => hub.message(p.conn, m); return p; };
  const a = phone(1), b = phone(2);
  a.say({ t: 'create', name: 'Jort', token: a.token });
  b.say({ t: 'join', code: a.last.state.code, name: 'Meke', token: b.token });
  a.say({ t: 'start' });
  assert.deepEqual(got, [['tafel', 'zuipbord'], ['potje', 'zuipbord']]);
});

test('de server: /api/statistieken alleen met de sleutel; een browser telt mee, een bot niet', async () => {
  const srv = await startServer({ env: { MELD_SLEUTEL: 'geheim123' } });
  try {
    assert.equal((await fetch(srv.url + '/api/statistieken')).status, 404);
    assert.equal((await fetch(srv.url + '/api/statistieken?sleutel=fout')).status, 404);
    await fetch(srv.url + '/', { headers: { 'User-Agent': PHONE } });
    await fetch(srv.url + '/borrelbord', { headers: { 'User-Agent': PHONE } });
    await fetch(srv.url + '/', { headers: { 'User-Agent': 'Googlebot/2.1' } });
    await fetch(srv.url + '/img/speelhal.svg', { headers: { 'User-Agent': PHONE } });
    const r = await fetch(srv.url + '/api/statistieken?sleutel=geheim123&dagen=7');
    assert.equal(r.status, 200);
    const s = await r.json();
    assert.equal(s.days.length, 7);
    const today = s.days[s.days.length - 1];
    assert.equal(today.views, 2, 'alleen pagina\'s, geen plaatjes, geen bots');
    assert.equal(today.visitors, 1);
    assert.deepEqual(today.pages, { hoofdpagina: 1, borrelbord: 1 });
    assert.equal(s.online, 1);
    assert.equal(typeof s.inGame, 'number');
    assert.equal(s.vast, true, 'in de test staat de opslag in een vaste map (DATA_DIR)');
    // de maker: wie de link opent krijgt een cookie, en telt daarna niet meer mee
    const cookie = (r.headers.get('set-cookie') || '').split(';')[0];
    assert.equal(cookie, 'sk_eigen=1');
    assert.match(r.headers.get('set-cookie'), /HttpOnly/);
    for (let i = 0; i < 5; i++) await fetch(srv.url + '/borrelbord', { headers: { 'User-Agent': PHONE, Cookie: `kk_dev=abc; ${cookie}` } });
    const s2 = await (await fetch(srv.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.equal(s2.days[0].views, 2, 'vijf keer zelf kijken telt niet mee');
    assert.equal(s2.days[0].visitors, 1);
    const page = await (await fetch(srv.url + '/statistieken')).text();
    assert.match(page, /<title>Statistieken · De Spelkeet<\/title>/);
    assert.match(page, /noindex/);
  } finally {
    await srv.stop();
  }
});

test('de geheime link: /statistieken/<code> toont de pagina, en de code werkt als sleutel (ook zonder MELD_SLEUTEL)', async () => {
  const { createHash } = await import('node:crypto');
  const code = 'testlink_' + 'x'.repeat(24);
  const srv = await startServer({ env: { STATS_LINK_HASH: createHash('sha256').update(code).digest('hex') } });
  try {
    const page = await fetch(srv.url + '/statistieken/' + code);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Statistieken · De Spelkeet<\/title>/);
    assert.equal((await fetch(srv.url + '/api/statistieken?sleutel=' + code)).status, 200);
    assert.equal((await fetch(srv.url + '/api/statistieken?sleutel=' + code.slice(0, -1) + 'y')).status, 404, 'een andere code niet');
    assert.equal((await fetch(srv.url + '/api/statistieken?sleutel=')).status, 404, 'zonder MELD_SLEUTEL telt een lege sleutel niet');
  } finally {
    await srv.stop();
  }
});
