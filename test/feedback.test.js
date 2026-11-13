// Wat de testers van Testers Community vroegen: een rondleiding, De Spelkeet delen en beoordelen, makkelijk feedback
// geven, en foutmeldingen van telefoons. Plus de nieuwe teksten en screenshots voor de Play Store.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { startServer } from './helpers.js';

const lees = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('de speelhal: rondleiding, en in het menu delen, beoordelen, feedback en de rondleiding opnieuw', () => {
  const hal = lees('public/speelhal.html');
  assert.ok(hal.includes('<script src="/js/rondleiding.js" defer></script>'));
  for (const s of ['data-deel', 'data-beoordeel', 'data-rondleiding', 'href="/review"']) assert.ok(hal.includes(s), s);
  assert.ok(hal.includes('Vind je De Spelkeet leuk?'), 'ook onderaan de pagina');
  const r = lees('public/js/rondleiding.js');
  assert.ok(r.includes("'spelkeet-rondleiding'") && r.includes('Overslaan') && r.includes("e.key === 'Escape'"), 'overslaan kan altijd');
  for (const sel of ['#tabs', '.game .prev', '.game .howbtn', '.game .cta', '#menuBtn']) assert.ok(r.includes(`'${sel}'`), sel);
});

test('delen en beoordelen: de Play Store op Android, onze eigen reviewpagina op een iPhone of computer', () => {
  const p = lees('public/js/poort.js');
  assert.ok(p.includes("'https://play.google.com/store/apps/details?id=nl.spelkeet.app'"));
  assert.ok(p.includes("location.href = '/review'"));
  assert.ok(p.includes('window.Spelkeet = { deel, beoordeel'));
  // na een goede review (4 of 5 sterren) op Android: ook in de Play Store? Met een duidelijke nee
  const r = lees('public/js/review.js');
  assert.ok(r.includes('sterren >= 4') && r.includes('Naar de Play Store') && r.includes('Nee, dankje'));
  // de tip bij een spel dat je nog niet kent
  const u = lees('public/js/uitleg.js');
  assert.ok(u.includes("'spelkeet-uitleg-gezien'") && u.includes('Eerste keer ${g.name}?'));
});

test('foutmeldingen van telefoons komen binnen, en een adres kan er niet eindeloos sturen', async () => {
  const srv = await startServer();
  try {
    const stuur = (body) => fetch(srv.url + '/api/fout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await stuur({ pagina: '/bussen', msg: 'TypeError: x is undefined', waar: '/bussen:12' })).status, 204);
    assert.equal((await stuur({ pagina: '/bussen' })).status, 204, 'zonder melding: niks bewaren, wel netjes antwoorden');
    for (let k = 0; k < 25; k++) await stuur({ pagina: '/mexen', msg: `fout ${k}` });
    await new Promise((r) => setTimeout(r, 200));
    const log = srv.output().split('\n').filter((l) => l.includes('fout op '));
    assert.ok(log[0].includes('fout op /bussen') && log[0].includes('TypeError'));
    assert.equal(log.length, 20, 'hooguit 20 per uur per adres');
  } finally {
    await srv.stop();
  }
});

test('de Play Store: teksten binnen de grenzen en acht nieuwe screenshots', () => {
  const t = lees('store/teksten.md');
  const blok = (kop) => t.split(`## ${kop}`)[1].split('```')[1].trim();
  assert.ok(blok('App-naam').length <= 30);
  assert.ok(blok('Korte beschrijving').length <= 80);
  const lang = blok('Volledige beschrijving');
  assert.ok(lang.length <= 4000 && lang.length > 2500, `${lang.length} tekens`);
  for (const w of ['partyspellen', 'Bussen', 'Mexen', 'Toepen', 'Kingsen', 'Arena', 'kaartspel']) assert.ok(lang.toLowerCase().includes(w.toLowerCase()), w);
  assert.ok(!/alcohol|drank/i.test(lang));
  const shots = readdirSync(new URL('../store/', import.meta.url)).filter((f) => /^screenshot-\d-.+\.png$/.test(f));
  assert.equal(shots.length, 8);
});
