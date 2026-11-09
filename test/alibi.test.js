// Alibi: een spel op één telefoon. De pagina, de lijsten, de speelhal en de teller voor de statistieken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer } from './helpers.js';

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');
const list = (html, name) => html.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`))[1].match(/'(?:[^'\\\\]|\\\\.)*'/g);

test('Alibi: de pagina, genoeg beschuldigingen en woorden, en geen dubbele', () => {
  const html = read('alibi.html');
  assert.match(html, /<title>Alibi<\/title>/);
  for (const s of ['/js/poort.js', '/js/uitleg.js', '/js/review.js']) assert.ok(html.includes(`<script src="${s}" defer></script>`), s);
  assert.ok(html.includes('href="/melden"') && html.includes('href="/?tab=een"'));
  assert.ok(html.includes("SpelkeetReview.stand('alibi', "));
  assert.ok(!/alcohol|18\+|dark-?mark/i.test(html));
  const b = list(html, 'BESCHULDIGINGEN'), w = list(html, 'WOORDEN');
  assert.ok(b.length >= 30, `${b.length} beschuldigingen`);
  assert.ok(w.length >= 100, `${w.length} woorden`);
  assert.equal(new Set(b).size, b.length, 'geen dubbele beschuldigingen');
  assert.equal(new Set(w).size, w.length, 'geen dubbele woorden');
  assert.equal(JSON.parse(read('alibi.webmanifest')).start_url, '/alibi');
  assert.ok(read('js/uitleg.js').includes("alibi: { name: 'Alibi'"));
});

test('de speelhal: Alibi staat bij één telefoon', () => {
  const html = read('speelhal.html');
  assert.match(html, /\{ id: 'alibi', mode: 'een'/);
  assert.match(html, /\n {2}alibi\(c, w, h, t\)\{/, 'een voorproefje');
});

test('de server: /alibi, en een potje telt mee in de statistieken', async () => {
  const srv = await startServer({ env: { MELD_SLEUTEL: 'geheim123' } });
  try {
    const page = await fetch(srv.url + '/alibi');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Alibi<\/title>/);
    assert.equal((await fetch(srv.url + '/img/alibi-192.png')).status, 200);
    const r = await fetch(srv.url + '/api/potje', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spel: 'alibi' }) });
    assert.equal(r.status, 204);
    const s = await (await fetch(srv.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.deepEqual(s.days[0].starts, { alibi: 1 });
    const rv = await fetch(srv.url + '/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sterren: 4, spel: 'alibi' }) });
    assert.equal(rv.status, 200);
    const b = await (await fetch(srv.url + '/api/beheer?sleutel=geheim123')).json();
    assert.equal(b.reviews[0].spel, 'alibi');
  } finally {
    await srv.stop();
  }
});
