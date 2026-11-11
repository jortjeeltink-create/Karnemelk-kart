// Bakplaten: een kaartspel op één telefoon. De kaarten, wat raak is, de pagina, de speelhal en de teller voor de statistieken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { startServer } from './helpers.js';

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');

// de kaarten-code uit de pagina, los te draaien
function kaarten(instellingen) {
  const html = read('bakplaten.html');
  const code = html.slice(html.indexOf('/* ================= DE KAARTEN'), html.indexOf('/* ================= INSTELLINGEN'));
  const raak = html.match(/const raak = \(c\) => [^\n]+/)[0];
  const ctx = { S: instellingen };
  vm.runInNewContext(`${code}\n${raak}\nthis.nieuwDeck = nieuwDeck; this.raak = raak; this.kaartHTML = kaartHTML;`, ctx);
  return ctx;
}

test('Bakplaten: 52 verschillende kaarten zonder jokers, goed geschud', () => {
  const k = kaarten({ azen: true, rood: false });
  const d = k.nieuwDeck();
  assert.equal(d.length, 52);
  assert.equal(new Set(d.map((c) => `${c.r}${c.s}`)).size, 52, 'geen dubbele kaarten');
  assert.ok(d.every((c) => c.r >= 2 && c.r <= 14 && c.s >= 0 && c.s <= 3), 'alleen gewone kaarten');
  const twee = k.nieuwDeck();
  assert.notDeepEqual(d, twee, 'elke keer anders geschud');
});

test('Bakplaten: plaatjes en azen zijn raak; zonder azen alleen de plaatjes', () => {
  const met = kaarten({ azen: true, rood: false }), zonder = kaarten({ azen: false, rood: false });
  const d = met.nieuwDeck();
  assert.equal(d.filter(met.raak).length, 16, 'boer, vrouw, heer en aas: 4 x 4');
  assert.equal(d.filter(zonder.raak).length, 12, 'alleen boer, vrouw en heer');
  assert.ok(!met.raak({ r: 10, s: 0 }) && !met.raak({ r: 2, s: 3 }));
  assert.ok(met.raak({ r: 11, s: 0 }) && met.raak({ r: 14, s: 2 }) && !zonder.raak({ r: 14, s: 2 }));
  assert.match(met.kaartHTML({ r: 12, s: 1 }), /class="pc red /);
  assert.match(met.kaartHTML({ r: 12, s: 1 }), /aria-label="ruiten vrouw"/);
});

test('Bakplaten: de pagina', () => {
  const html = read('bakplaten.html');
  assert.match(html, /<title>Bakplaten<\/title>/);
  for (const s of ['/js/poort.js', '/js/uitleg.js', '/js/review.js']) assert.ok(html.includes(`<script src="${s}" defer></script>`), s);
  assert.ok(html.includes('href="/melden"') && html.includes('href="/?tab=een"'));
  assert.ok(html.includes("SpelkeetReview.stand('bakplaten', "));
  assert.ok(html.includes("JSON.stringify({ spel: 'bakplaten' })"), 'een potje telt mee');
  assert.ok(!/alcohol|18\+|anytimer|dark-?mark|https?:\/\/(?!fonts\.)/i.test(html), 'geen verwijzingen naar andere sites, geen 18+');
  assert.equal(JSON.parse(read('bakplaten.webmanifest')).start_url, '/bakplaten');
  assert.ok(read('js/uitleg.js').includes("bakplaten: { name: 'Bakplaten'"));
  assert.ok(read('js/review.js').includes("bakplaten: 'Bakplaten'"));
});

test('de speelhal: Bakplaten staat bij één telefoon', () => {
  const html = read('speelhal.html');
  assert.match(html, /\{ id: 'bakplaten', mode: 'een'/);
  assert.match(html, /\n {2}bakplaten\(c, w, h, t\)\{/, 'een voorproefje');
});

test('de server: /bakplaten, en een potje en een review tellen mee', async () => {
  const srv = await startServer({ env: { MELD_SLEUTEL: 'geheim123' } });
  try {
    const page = await fetch(srv.url + '/bakplaten');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Bakplaten<\/title>/);
    for (const f of ['/img/bakplaten-192.png', '/img/bakplaten-512.png', '/img/bakplaten.svg', '/bakplaten.webmanifest']) assert.equal((await fetch(srv.url + f)).status, 200, f);
    const r = await fetch(srv.url + '/api/potje', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spel: 'bakplaten' }) });
    assert.equal(r.status, 204);
    const s = await (await fetch(srv.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.deepEqual(s.days[0].starts, { bakplaten: 1 });
    const rv = await fetch(srv.url + '/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sterren: 5, spel: 'bakplaten' }) });
    assert.equal(rv.status, 200);
    const b = await (await fetch(srv.url + '/api/beheer?sleutel=geheim123')).json();
    assert.equal(b.reviews[0].spel, 'bakplaten');
  } finally {
    await srv.stop();
  }
});
