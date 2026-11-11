// Kingsen: een kaartspel op één telefoon. De kaarten en hun opdrachten, de pagina, de speelhal en de teller voor de statistieken.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { startServer } from './helpers.js';

const read = (f) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8');

// de kaarten-code uit de pagina, los te draaien
function kaarten() {
  const html = read('kingsen.html');
  const code = html.slice(html.indexOf('/* ================= DE KAARTEN'), html.indexOf('/* ================= INSTELLINGEN'));
  const ctx = {};
  vm.runInNewContext(`${code}\nthis.nieuwDeck = nieuwDeck; this.REGELS = REGELS; this.CATEGORIEEN = CATEGORIEEN; this.kaartHTML = kaartHTML;`, ctx);
  return ctx;
}

test('Kingsen: 52 kaarten zonder jokers, en elke soort kaart heeft een opdracht', () => {
  const k = kaarten();
  const d = k.nieuwDeck();
  assert.equal(d.length, 52);
  assert.equal(new Set(d.map((c) => `${c.r}${c.s}`)).size, 52, 'geen dubbele kaarten');
  assert.deepEqual(Object.keys(k.REGELS).map(Number), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], 'van 2 tot en met aas');
  for (const [r, R] of Object.entries(k.REGELS)) assert.ok(R.naam && R.kort && R.tekst.length > 20, `kaart ${r}`);
  assert.equal(k.REGELS[13].naam, 'Op het glas');
  assert.match(k.REGELS[13].tekst, /vierde heer.*mega strafpunt/);
  assert.equal(k.REGELS[14].naam, 'Omkeren');
  assert.equal(k.REGELS[10].naam, 'Quizmaster');
  assert.ok(k.CATEGORIEEN.length >= 30 && new Set(k.CATEGORIEEN).size === k.CATEGORIEEN.length, 'genoeg ideeën, geen dubbele');
  assert.match(k.kaartHTML({ r: 13, s: 1 }), /aria-label="ruiten heer"/);
});

test('Kingsen: de pagina', () => {
  const html = read('kingsen.html');
  assert.match(html, /<title>Kingsen<\/title>/);
  for (const s of ['/js/poort.js', '/js/uitleg.js', '/js/review.js']) assert.ok(html.includes(`<script src="${s}" defer></script>`), s);
  assert.ok(html.includes('href="/melden"') && html.includes('href="/?tab=een"'));
  assert.ok(html.includes("SpelkeetReview.stand('kingsen', "));
  assert.ok(html.includes("JSON.stringify({ spel: 'kingsen' })"), 'een potje telt mee');
  assert.ok(html.includes('breekBij: S.breken ? rnd(15, 62) : 0'), 'de cirkel kan breken, maar niet meteen');
  // strafpunten, geen slokken of shots; en geen verwijzingen naar andere sites
  assert.ok(!/alcohol|18\+|\bslok|\bshot|\bdrank|\bbier|dark-?mark|https?:\/\/(?!fonts\.)/i.test(html));
  // wat mensen zelf typen (een regel) komt er alleen veilig in
  assert.ok(html.includes('${esc(r)}') && !/\$\{r\}<\/span>/.test(html));
  assert.equal(JSON.parse(read('kingsen.webmanifest')).start_url, '/kingsen');
  assert.ok(read('js/uitleg.js').includes("kingsen: { name: 'Kingsen'"));
  assert.ok(read('js/review.js').includes("kingsen: 'Kingsen'"));
});

test('de speelhal: Kingsen staat bij één telefoon', () => {
  const html = read('speelhal.html');
  assert.match(html, /\{ id: 'kingsen', mode: 'een'/);
  assert.match(html, /\n {2}kingsen\(c, w, h, t\)\{/, 'een voorproefje');
});

test('de server: /kingsen, en een potje en een review tellen mee', async () => {
  const srv = await startServer({ env: { MELD_SLEUTEL: 'geheim123' } });
  try {
    const page = await fetch(srv.url + '/kingsen');
    assert.equal(page.status, 200);
    assert.match(await page.text(), /<title>Kingsen<\/title>/);
    for (const f of ['/img/kingsen-192.png', '/img/kingsen-512.png', '/img/kingsen.svg', '/kingsen.webmanifest', '/img/uitleg/kingsen-5.webp']) assert.equal((await fetch(srv.url + f)).status, 200, f);
    const r = await fetch(srv.url + '/api/potje', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spel: 'kingsen' }) });
    assert.equal(r.status, 204);
    const s = await (await fetch(srv.url + '/api/statistieken?sleutel=geheim123&dagen=1')).json();
    assert.deepEqual(s.days[0].starts, { kingsen: 1 });
    const rv = await fetch(srv.url + '/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sterren: 5, spel: 'kingsen' }) });
    assert.equal(rv.status, 200);
    const b = await (await fetch(srv.url + '/api/beheer?sleutel=geheim123')).json();
    assert.equal(b.reviews[0].spel, 'kingsen');
  } finally {
    await srv.stop();
  }
});
