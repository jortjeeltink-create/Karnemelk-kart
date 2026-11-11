// Tikkende Bom: een spel op één telefoon. De pagina, de speelhal met twee tabbladen, en de teller voor de statistieken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer } from './helpers.js';

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
const PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';

test('Tikkende Bom: de pagina, het icoon en de uitleg', () => {
  const html = read('bom.html');
  assert.match(html, /<title>Tikkende Bom<\/title>/);
  for (const s of ['/js/poort.js', '/js/uitleg.js', '/js/review.js']) assert.ok(html.includes(`<script src="${s}" defer></script>`), s);
  assert.ok(html.includes('href="/melden"'), 'iets melden');
  assert.ok(html.includes('href="/?tab=een"'), 'terug naar het goede tabblad');
  const man = JSON.parse(read('bom.webmanifest'));
  assert.equal(man.start_url, '/bom');
  assert.ok(read('js/uitleg.js').includes("bom: { name: 'Tikkende Bom'"));
  // genoeg opdrachten, en geen dubbele
  const vast = html.match(/const VAST = \[([\s\S]*?)\];/)[1].match(/'(?:[^'\\]|\\.)*'/g);
  assert.ok(vast.length >= 50, `${vast.length} vaste opdrachten`);
  assert.equal(new Set(vast).size, vast.length, 'geen dubbele opdrachten');
});

test('de speelhal: twee tabbladen, Karnemelk Kart onderaan en Tikkende Bom bij één telefoon', () => {
  const html = read('speelhal.html');
  assert.ok(html.includes('data-tab="samen"') && html.includes('data-tab="een"'), 'twee tabbladen');
  const ids = [...html.matchAll(/^ {2}\{ id: '([a-z]+)'/gm)].map((m) => m[1]);
  assert.deepEqual(ids.slice(-6), ['kart', 'bom', 'alibi', 'bakplaten', 'kingsen', 'happo'], 'kart als laatste van de samen-spellen, daarna de spellen op één telefoon');
  assert.match(html, /\{ id: 'bom', mode: 'een'/);
  assert.match(html, /\n {2}bom\(c, w, h, t\)\{/, 'een voorproefje van de bom');
});

test('de server: /bom, en een potje telt mee in de statistieken (niet te vaak, en niet voor de maker)', async () => {
  const srv = await startServer({ env: { MELD_SLEUTEL: 'geheim123' } });
  try {
    const page = await fetch(srv.url + '/bom', { headers: { 'User-Agent': PHONE } });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Tikkende Bom/);
    assert.equal((await fetch(srv.url + '/bom.webmanifest')).status, 200);
    assert.equal((await fetch(srv.url + '/img/bom-192.png')).status, 200);
    const post = (body, headers = {}) => fetch(srv.url + '/api/potje', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    assert.equal((await post({ spel: 'bom' })).status, 204);
    assert.equal((await post({ spel: 'bom' })).status, 204);
    assert.equal((await post({ spel: 'bussen' })).status, 204, 'een ander spel telt hier niet');
    // de maker (met het cookie van de beheerlink) telt niet mee
    assert.equal((await post({ spel: 'bom' }, { Cookie: 'sk_eigen=1' })).status, 204);
    const s = await (await fetch(srv.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.deepEqual(s.days[0].starts, { bom: 2 });
    assert.deepEqual(s.days[0].pages, { bom: 1 });
    // een review voor Tikkende Bom
    const r = await fetch(srv.url + '/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sterren: 5, spel: 'bom', bron: 'na-spel' }) });
    assert.equal(r.status, 200);
    const b = await (await fetch(srv.url + '/api/beheer?sleutel=geheim123')).json();
    assert.equal(b.reviews[0].spel, 'bom');
  } finally {
    await srv.stop();
  }
});

test('Tikkende Bom: de lont is lang genoeg (kort, normaal, lang)', () => {
  const html = read('bom.html');
  const tijd = JSON.parse(html.match(/const TIJD = (\{[^}]+\});/)[1].replace(/(\w+):/g, '"$1":'));
  assert.deepEqual(tijd, { kort: [20, 40], normaal: [30, 75], lang: [60, 120] });
  assert.ok(read('speelhal.html').includes("['Lont', '20 seconden tot 2 minuten']"));
});
