// Klaar voor de Play Store: geen leeftijdscheck, het privacybeleid, de voorwaarden, melden, de offline-pagina,
// de koppeling met de Android-app en de filter op grove namen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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

test('de server: zonder CONTACT_EMAIL staat het adres van De Spelkeet op het privacybeleid', async () => {
  const srv = await startServer({ env: { CONTACT_EMAIL: '' } });
  try {
    for (const path of ['/privacy', '/voorwaarden', '/melden']) assert.ok((await (await fetch(srv.url + path)).text()).includes('despelkeet@gmail.com'), path);
  } finally {
    await srv.stop();
  }
});

test('de server: privacybeleid, voorwaarden, melden, offline-pagina; geen 18+ meer, wel de service worker op elke speelpagina', async () => {
  const srv = await startServer({ env: { CONTACT_EMAIL: 'hallo@voorbeeld.nl', MELD_SLEUTEL: 'geheim123', ANDROID_PACKAGE: '', ANDROID_SHA256: '' } });
  try {
    for (const [path, title] of [['/privacy', 'Privacybeleid'], ['/voorwaarden', 'Voorwaarden'], ['/melden', 'Iets melden']]) {
      const html = await (await fetch(srv.url + path)).text();
      assert.match(html, new RegExp(`<title>${title} · De Spelkeet</title>`), path);
      assert.ok(html.includes('hallo@voorbeeld.nl'), `${path}: het contactadres staat erin`);
      assert.ok(!html.includes('{{CONTACT_EMAIL}}'), path);
      assert.ok(!/18\+|18 jaar/.test(html), `${path}: geen 18+`);
    }
    assert.match(await (await fetch(srv.url + '/privacy')).text(), /Mijn gegevens wissen/);
    // elke speelpagina meldt de service worker aan, zegt niks over 18+ en heeft een link om iets te melden
    for (const path of ['/', '/kart', '/bussen', '/boer', '/mexen', '/dealer', '/paardenrace', '/rotonde', '/mijnenveld', '/borrelbord']) {
      const html = await (await fetch(srv.url + path)).text();
      assert.ok(html.includes('<script src="/js/poort.js" defer></script>'), `${path}: de service worker`);
      assert.ok(!/18\+|18 jaar|alcohol/i.test(html), `${path}: geen 18+ en geen alcohol`);
      if (path !== '/kart') assert.ok(html.includes('/melden'), `${path}: iets melden`);
    }
    const poort = await (await fetch(srv.url + '/js/poort.js')).text();
    assert.ok(!/18 jaar|18\+|alcohol/.test(poort.replace(/^\/\/.*$/gm, '')), 'geen leeftijdscheck meer');
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
    // zonder instellingen: de koppeling met nl.spelkeet.app, de uploadsleutel en de sleutel van Google Play
    const [std] = await (await fetch(srv.url + '/.well-known/assetlinks.json')).json();
    assert.equal(std.target.package_name, 'nl.spelkeet.app');
    assert.ok(std.target.sha256_cert_fingerprints.includes('CE:61:C5:3A:25:3C:74:BE:0E:00:D0:30:54:19:D0:C1:28:30:48:F6:48:DA:1F:4D:19:51:22:4E:75:95:AB:4B'));
    assert.ok(std.target.sha256_cert_fingerprints.includes('83:68:BB:D7:CE:82:A8:E2:DE:CB:6E:72:26:6E:3E:54:1B:9B:36:69:66:A4:D8:EE:FB:CA:83:37:35:32:D0:21'));
    for (const f of std.target.sha256_cert_fingerprints) assert.match(f, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
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

test('het plaatje bij een gedeelde link gebruikt het eigen webadres (op Render vanzelf)', async () => {
  for (const [env, want] of [[{ RENDER_EXTERNAL_URL: 'https://spelkeet.onrender.com' }, 'https://spelkeet.onrender.com/img/speelhal-deel.png'], [{ RENDER_EXTERNAL_URL: '' }, '/img/speelhal-deel.png']]) {
    const srv = await startServer({ env });
    try {
      for (const path of ['/', '/iphone']) {
        const html = await (await fetch(srv.url + path)).text();
        assert.ok(html.includes(`<meta property="og:image" content="${want}">`), `${path}: ${want}`);
        assert.ok(!html.includes('{{SITE_URL}}'), path);
      }
    } finally {
      await srv.stop();
    }
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
    assert.equal(link.target.package_name, 'nl.spelkeet.app');
    assert.equal(link.target.namespace, 'android_app');
    assert.equal(link.target.sha256_cert_fingerprints[0], print.toUpperCase(), 'de extra vingerafdruk uit ANDROID_SHA256');
    assert.equal(link.target.sha256_cert_fingerprints.length, 5, 'plus de vier vaste (uploadsleutel en Google Play); "nonsens" telt niet');
  } finally {
    await srv.stop();
  }
});

test('een melding gaat ook per mail naar het contactadres (via Resend), zonder dat de speler hoeft te wachten', async () => {
  const got = [];
  const fake = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => { got.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(body) }); res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"id":"x"}'); });
  });
  await new Promise((r) => fake.listen(0, '127.0.0.1', r));
  const srv = await startServer({ env: { CONTACT_EMAIL: 'hallo@voorbeeld.nl', RESEND_API_KEY: 're_test', RESEND_URL: `http://127.0.0.1:${fake.address().port}/emails` } });
  try {
    const r = await fetch(srv.url + '/api/melden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spel: 'bussen', code: 'abcd', naam: 'Henk', wat: 'Deze naam is grof' }) });
    assert.equal(r.status, 200);
    for (let i = 0; i < 40 && !got.length; i++) await new Promise((res) => setTimeout(res, 50));
    assert.equal(got.length, 1, 'er is een mail verstuurd');
    const [m] = got;
    assert.equal(m.url, '/emails');
    assert.equal(m.auth, 'Bearer re_test');
    assert.deepEqual(m.body.to, ['hallo@voorbeeld.nl']);
    assert.match(m.body.from, /onboarding@resend\.dev/);
    assert.equal(m.body.subject, 'Melding bij bussen over Henk');
    assert.match(m.body.text, /Tafel: ABCD/);
    assert.match(m.body.text, /Deze naam is grof/);
  } finally {
    await srv.stop();
    fake.close();
  }
});

test('zonder RESEND_API_KEY gaat er geen mail, maar de melding lukt wel', async () => {
  const srv = await startServer({ env: { RESEND_API_KEY: '' } });
  try {
    const r = await fetch(srv.url + '/api/melden', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ wat: 'Iets kapot bij Mexen' }) });
    assert.equal(r.status, 200);
  } finally {
    await srv.stop();
  }
});
