// Klaar voor de Play Store: de poort (18+), het privacybeleid, de voorwaarden, melden, de offline-pagina,
// de koppeling met de Android-app en de filter op grove namen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer } from './helpers.js';
import { isOffensive } from '../public/shared/namen.js';
import { cleanChallenge } from '../public/shared/challenges.js';
import { ZuipbordHub } from '../public/shared/zuipbordhub.js';

test('namenfilter: scheldwoorden weigeren, ook met trucjes, en gewone namen gewoon toelaten', () => {
  for (const bad of ['Kanker', 'k4nker', 'F.U.C.K', 'fuuuck', 'Kut', 'kut kees', 'tering', 'Hitler', 'n1gger', 'TYFUS jan']) assert.ok(isOffensive(bad), bad);
  for (const ok of ['Sanne', 'Bas', 'Dick', 'Fukuda', 'Lulu', 'Kutlu', 'Wetering', 'Pikachu', 'Analise', 'Hoek', 'Nazira', 'Sexton', 'Jort', 'Meke']) assert.ok(!isOffensive(ok), ok);
  assert.equal(cleanChallenge('Doe een kanker dansje'), null, 'ook de uitdaging in de kartgame');
  assert.equal(cleanChallenge('Doe een dansje'), 'Doe een dansje');
});

test('aan tafel: een grove naam mag niet meedoen', () => {
  const hub = new ZuipbordHub({ now: () => 1, log: () => {}, build: 'x', random: () => 0.5 });
  const got = {};
  const conn = { send: (t) => { const m = JSON.parse(t); got[m.t] = m; }, close() {} };
  hub.connect(conn);
  hub.message(conn, { t: 'create', name: 'K4nker', token: 'telefoon-0000000001' });
  assert.match(got.joinFailed.msg, /naam mag niet/);
  hub.message(conn, { t: 'create', name: 'Sanne', token: 'telefoon-0000000001' });
  assert.equal(got.state.players[0].name, 'Sanne');
});

test('de server: privacybeleid, voorwaarden, melden, offline-pagina en de poort op elke speelpagina', async () => {
  const srv = await startServer({ env: { CONTACT_EMAIL: 'hallo@voorbeeld.nl', MELD_SLEUTEL: 'geheim123', ANDROID_PACKAGE: '', ANDROID_SHA256: '' } });
  try {
    for (const [path, title] of [['/privacy', 'Privacybeleid'], ['/voorwaarden', 'Voorwaarden'], ['/melden', 'Iets melden']]) {
      const html = await (await fetch(srv.url + path)).text();
      assert.match(html, new RegExp(`<title>${title} · De Spelkeet</title>`), path);
      assert.ok(html.includes('hallo@voorbeeld.nl'), `${path}: het contactadres staat erin`);
      assert.ok(!html.includes('{{CONTACT_EMAIL}}'), path);
      assert.ok(!html.includes('/js/poort.js'), `${path} is altijd te lezen, ook zonder de poort`);
    }
    assert.match(await (await fetch(srv.url + '/privacy')).text(), /Mijn gegevens wissen/);
    // elke speelpagina heeft de poort (18+) en een link om iets te melden
    for (const path of ['/', '/kart', '/bussen', '/boer', '/mexen', '/dealer', '/paardenrace', '/rotonde', '/mijnenveld', '/borrelbord']) {
      const html = await (await fetch(srv.url + path)).text();
      assert.ok(html.includes('<script src="/js/poort.js" defer></script>'), `${path}: de poort`);
      if (path !== '/kart') assert.ok(html.includes('/melden'), `${path}: iets melden`);
    }
    const poort = await (await fetch(srv.url + '/js/poort.js')).text();
    assert.match(poort, /18 jaar en ouder/);
    assert.match(poort, /serviceWorker\.register\('\/sw\.js'\)/);
    // de service worker en de offline-pagina
    const sw = await fetch(srv.url + '/sw.js');
    assert.match(sw.headers.get('content-type'), /javascript/);
    assert.match(await sw.text(), /offline\.html/);
    assert.match(await (await fetch(srv.url + '/offline.html')).text(), /Geen verbinding/);
    // het app-manifest: iconen voor Android
    const manifest = await (await fetch(srv.url + '/speelhal.webmanifest')).json();
    assert.ok(manifest.icons.some((i) => i.purpose === 'maskable' && i.sizes === '512x512'));
    for (const icon of manifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200, icon.src);
    // zonder pakketnaam en vingerafdruk is er geen koppeling
    assert.equal((await fetch(srv.url + '/.well-known/assetlinks.json')).status, 404);
    // melden
    const post = (body) => fetch(srv.url + '/api/melden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await post({ wat: 'x' })).status, 400, 'te kort');
    const ok = await post({ spel: 'borrelbord', code: 'abcd', naam: 'Speler X', wat: 'Een grove naam aan tafel.' });
    assert.deepEqual([ok.status, await ok.json()], [200, { ok: true }]);
    assert.equal((await fetch(srv.url + '/api/meldingen')).status, 404, 'niet zonder sleutel');
    const list = await (await fetch(srv.url + '/api/meldingen?sleutel=geheim123')).json();
    assert.deepEqual([list[0].spel, list[0].code, list[0].naam, list[0].wat], ['borrelbord', 'ABCD', 'Speler X', 'Een grove naam aan tafel.']);
    // niet eindeloos melden vanaf één adres
    let last;
    for (let i = 0; i < 12; i++) last = await post({ wat: `melding nummer ${i}` });
    assert.equal(last.status, 429);
  } finally {
    await srv.stop();
  }
});

test('de koppeling met de Android-app (Digital Asset Links)', async () => {
  const print = Array.from({ length: 32 }, (_, i) => (i * 7 % 256).toString(16).padStart(2, '0')).join(':');
  const srv = await startServer({ env: { ANDROID_PACKAGE: 'nl.spelkeet.app', ANDROID_SHA256: `${print.toLowerCase()}, nonsens` } });
  try {
    const r = await fetch(srv.url + '/.well-known/assetlinks.json');
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /application\/json/);
    const [link] = await r.json();
    assert.deepEqual(link.relation, ['delegate_permission/common.handle_all_urls']);
    assert.deepEqual(link.target, { namespace: 'android_app', package_name: 'nl.spelkeet.app', sha256_cert_fingerprints: [print.toUpperCase()] });
  } finally {
    await srv.stop();
  }
});
