// De uitleg bij elk spel (diashow), de slokkenkaart en de pagina voor spelen op een iPhone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { startServer } from './helpers.js';

const root = new URL('../public/', import.meta.url);
const read = (f) => readFileSync(new URL(f, root), 'utf8');
const PAGES = { bussen: 'bussen', boer: 'boer', mexen: 'mexen', dealer: 'dealer', paardenrace: 'paardenrace', rotonde: 'rotonde', mijnenveld: 'mijnenveld', zuipbord: 'borrelbord' };

test('uitleg: elk spel heeft dia\'s, en elk plaatje bestaat', () => {
  const src = read('js/uitleg.js');
  for (const key of [...Object.values(PAGES), 'kart']) assert.match(src, new RegExp(`\\b${key}: \\{ name: '`), key);
  const imgs = [...src.matchAll(/img: '([a-z0-9-]+)'/g)].map((m) => m[1]);
  assert.ok(imgs.length >= 40, `${imgs.length} dia's`);
  for (const img of imgs) assert.ok(existsSync(new URL(`img/uitleg/${img}.webp`, root)), `plaatje ${img}.webp`);
  assert.match(src, /borrelbordRustig: \{ name: 'Borrelbord'/, 'in de app: de rustige uitleg van Borrelbord');
});

test('uitleg en slokkenkaart: op elke speelpagina een knop en het script', () => {
  for (const [page, key] of Object.entries(PAGES)) {
    const html = read(`${page}.html`);
    assert.ok(html.includes('<script src="/js/uitleg.js" defer></script>'), `${page}: uitleg.js`);
    assert.ok(html.includes(`data-uitleg="${key}"`), `${page}: knop op het startscherm`);
    assert.ok(html.includes('data-act="uitleg"') && html.includes(`window.Uitleg?.open('${key}')`), `${page}: uitleg in het menu`);
    // Bussen heeft zijn eigen vel met nu doen of sparen; de rest de slokkenkaart
    if (page !== 'bussen') {
      assert.ok(html.includes('<script src="/js/slok.js" defer></script>'), `${page}: slok.js`);
      assert.match(html, /window\.Slok\?\.(drink|bak)\(|Slok\.(drink|bak)\(/, `${page}: de slokkenkaart`);
    }
  }
  const hal = read('speelhal.html');
  assert.equal((hal.match(/data-uitleg="\$\{g\.id\}"/g) || []).length, 1, 'uitleg-knop bij elk spel in de hoofdpagina');
  assert.ok(hal.includes('href="/iphone"'));
  assert.match(hal, /<ol class="ipsteps">[\s\S]*Zet op beginscherm[\s\S]*Voeg toe/, 'de stappen voor een iPhone staan ook op de hoofdpagina');
  // op Android (ook als De Spelkeet daar als app staat) mag /iphone niet terugsturen naar de hoofdpagina
  assert.match(read('iphone.html'), /navigator\.standalone === true && !document\.referrer/);
});

test('de server: de iPhone-pagina en de plaatjes van de uitleg', async () => {
  const srv = await startServer();
  try {
    const r = await fetch(srv.url + '/iphone');
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.match(html, /<title>De Spelkeet op je iPhone<\/title>/);
    assert.match(html, /Zet op beginscherm/);
    assert.match(html, /rel="apple-touch-icon"/);
    const img = await fetch(srv.url + '/img/uitleg/mexen-1.webp');
    assert.equal(img.status, 200);
    assert.equal(img.headers.get('content-type'), 'image/webp');
    for (const js of ['/js/uitleg.js', '/js/slok.js']) assert.equal((await fetch(srv.url + js)).status, 200, js);
  } finally {
    await srv.stop();
  }
});
