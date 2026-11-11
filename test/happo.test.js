// Happo: een nijlpaard met een zere kies, op één telefoon. De tanden, de pagina, de speelhal en de teller voor de statistieken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { startServer } from './helpers.js';

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');

// de tanden-code uit de pagina, los te draaien
function tanden() {
  const html = read('happo.html');
  const code = html.slice(html.indexOf('/* ================= DE TANDEN'), html.indexOf('/* ================= INSTELLINGEN'));
  const ctx = {};
  vm.runInNewContext(`${code}\nthis.N = N; this.zereKiezen = zereKiezen; this.plek = plek;`, ctx);
  return ctx;
}

test('Happo: 10 tanden, en de zere kiezen liggen op verschillende plekken in de bek', () => {
  const k = tanden();
  assert.equal(k.N, 10);
  for (let r = 0; r < 200; r++) {
    const een = k.zereKiezen(k.N, 1), twee = k.zereKiezen(k.N, 2);
    assert.equal(een.length, 1);
    assert.equal(twee.length, 2);
    assert.notEqual(twee[0], twee[1], 'twee verschillende zere kiezen');
    for (const i of [...een, ...twee]) assert.ok(Number.isInteger(i) && i >= 0 && i < k.N);
  }
  // elke tand kan de zere zijn
  const gezien = new Set(Array.from({ length: 400 }, () => k.zereKiezen(k.N, 1)[0]));
  assert.equal(gezien.size, k.N);
  // de tanden staan in een boog en overlappen elkaar niet (genoeg ruimte om de goede aan te tikken)
  const p = Array.from({ length: k.N }, (_, i) => k.plek(i, k.N));
  for (let i = 1; i < k.N; i++) assert.ok(Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) >= 8.2, `tand ${i} heeft ruimte (een tand is 8,2% breed)`);
  assert.ok(p.every((x) => x.x > 10 && x.x < 90 && x.y > 50 && x.y < 85), 'in de onderkaak');
});

test('Happo: de pagina', () => {
  const html = read('happo.html');
  assert.match(html, /<title>Happo<\/title>/);
  for (const s of ['/js/poort.js', '/js/uitleg.js', '/js/review.js']) assert.ok(html.includes(`<script src="${s}" defer></script>`), s);
  assert.ok(html.includes('href="/melden"') && html.includes('href="/?tab=een"'));
  assert.ok(html.includes("SpelkeetReview.stand('happo', "));
  assert.ok(html.includes("JSON.stringify({ spel: 'happo' })"), 'een potje telt mee');
  // een eigen spel: geen krokodil en geen naam van een bestaand bordspel; strafpunten in plaats van slokken
  assert.ok(!/krokodil|kiespijn|alcohol|18\+|\bslok|\bdrank|\bbier|\bwijn|https?:\/\/(?!fonts\.)/i.test(html));
  assert.equal(JSON.parse(read('happo.webmanifest')).start_url, '/happo');
  assert.ok(read('js/uitleg.js').includes("happo: { name: 'Happo'"));
  assert.ok(read('js/review.js').includes("happo: 'Happo'"));
});

test('de speelhal: Happo staat bij één telefoon', () => {
  const html = read('speelhal.html');
  assert.match(html, /\{ id: 'happo', mode: 'een'/);
  assert.match(html, /\n {2}happo\(c, w, h, t\)\{/, 'een voorproefje');
});

test('de server: /happo, en een potje en een review tellen mee', async () => {
  const srv = await startServer({ env: { MELD_SLEUTEL: 'geheim123' } });
  try {
    const page = await fetch(srv.url + '/happo');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Happo<\/title>/);
    for (const f of ['/img/happo-192.png', '/img/happo-512.png', '/img/happo.svg', '/happo.webmanifest', '/img/uitleg/happo-4.webp']) assert.equal((await fetch(srv.url + f)).status, 200, f);
    const r = await fetch(srv.url + '/api/potje', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spel: 'happo' }) });
    assert.equal(r.status, 204);
    const s = await (await fetch(srv.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.deepEqual(s.days[0].starts, { happo: 1 });
    const rv = await fetch(srv.url + '/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sterren: 5, spel: 'happo' }) });
    assert.equal(rv.status, 200);
    const b = await (await fetch(srv.url + '/api/beheer?sleutel=geheim123')).json();
    assert.equal(b.reviews[0].spel, 'happo');
  } finally {
    await srv.stop();
  }
});
