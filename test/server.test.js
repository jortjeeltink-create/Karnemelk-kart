// Echte server + 10 spelers via WebSockets: room, lobby, race met botsingen,
// herverbinden, uitslag, MP-punten, winkel en opslag na een herstart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, loginClient, Client, sleep } from './helpers.js';
import WsSocket from 'ws';
import { TRACK_BY_ID } from '../public/shared/tracks.js';
import { buildTrack } from '../public/shared/trackgeo.js';
import { botInput } from '../public/shared/bots.js';
import { DT } from '../public/shared/constants.js';
import { Predictor } from '../public/js/game/predict.js';
import { decodeFull } from '../public/shared/protocol.js';

// Een nep-speler die rijdt zoals de echte browser: lokaal voorspellen, invoer sturen, corrigeren.
class Driver {
  constructor(client, raceMsg) {
    this.c = client;
    this.msg = raceMsg;
    this.track = buildTrack(TRACK_BY_ID[raceMsg.trackId]);
    this.pred = new Predictor(this.track, raceMsg.you, raceMsg.you, raceMsg.laps);
    this.synced = false;
    this.steps = null;
    this.buf = [];
    this.first = null;
    this.snaps = 0;
    this.maxKarts = 0;
    this.bumps = 0;
    this.onSnap = (m) => {
      if (m.t !== 's') return;
      this.snaps++;
      this.maxKarts = Math.max(this.maxKarts, m.k.length);
      this.bumps += m.ev.filter((e) => e.type === 'bump').length;
      if (!m.me) return;
      if (!this.synced) { Object.assign(this.pred.kart, decodeFull(m.me, {})); this.pred.seq = this.pred.kart.ack; this.synced = true; } else this.pred.reconcile(m.me);
    };
    client.onMsg = this.onSnap;
    this.timer = setInterval(() => this.tick(), 16);
  }

  tick() {
    const rt = (Date.now() - this.msg.startAt) / 1000;
    if (rt < 0 || !this.synced) return;
    const target = Math.floor(rt / DT);
    if (this.steps == null) this.steps = target - 1;
    const k = this.pred.kart;
    while (this.steps < target) {
      this.steps++;
      const inp = botInput(k, this.track, { time: rt, karts: [], entities: [] });
      inp.item = !!(k.item && k.itemRoll <= 0 && !k.pi);
      const r = this.pred.step(inp, this.steps * DT, null);
      if (this.first == null) this.first = r.seq;
      this.buf.push(r.packed);
      if (this.buf.length >= 3) {
        this.c.send({ t: 'in', s: this.first, i: this.buf });
        this.buf = []; this.first = null;
      }
    }
  }

  stop() { clearInterval(this.timer); }
}

test('10 spelers racen live samen, met herverbinden, punten en winkel', { timeout: 240000 }, async () => {
  const env = { KK_LAPS: '1', KK_SECRET: 'test-geheim-voor-reservekopieen' };
  let srv = await startServer({ env });
  const clients = [];
  try {
    for (let i = 0; i < 10; i++) clients.push(await loginClient(srv.ws, `Vriend${i}`));
    assert.ok(clients.every((c) => c.profile && c.profile.mp === 150), 'nieuwe profielen met 150 MP');

    const host = clients[0];
    const room = await host.request({ t: 'create' }, 'room');
    const code = room.code;
    for (let i = 1; i < 10; i++) {
      const r = await clients[i].request({ t: 'join', code }, 'room');
      assert.equal(r.code, code);
    }
    // de 11e mag er niet meer bij
    const extra = await loginClient(srv.ws, 'Elfde');
    const fail = await extra.request({ t: 'join', code }, 'joinFailed');
    assert.match(fail.msg, /vol/);
    extra.close();

    // lobby: iedereen ziet 10 spelers, iedereen klaar
    for (let i = 1; i < 10; i++) clients[i].send({ t: 'ready', on: true });
    await host.wait((m) => m.t === 'room' && m.players.length === 10 && m.players.filter((p) => p.ready).length === 9);
    host.send({ t: 'settings', settings: { trackId: 'zandstorm' } });
    await host.wait((m) => m.t === 'room' && m.settings.trackId === 'zandstorm');

    const waits = clients.map((c) => c.wait('race', 8000));
    host.send({ t: 'start' });
    const raceMsgs = await Promise.all(waits);
    assert.equal(raceMsgs[0].entrants.length, 10);
    const kids = new Set(raceMsgs.map((m) => m.you));
    assert.equal(kids.size, 10, 'iedere speler heeft een eigen kart');

    const drivers = clients.map((c, i) => new Driver(c, raceMsgs[i]));

    // speler 4 valt na 12 seconden weg en komt 3 seconden later terug
    await sleep(raceMsgs[0].startAt - Date.now() + 12000);
    const lost = clients[4];
    const device = lost.device;
    drivers[4].stop();
    lost.close();
    await host.wait((m) => m.t === 'room' && m.players.some((p) => p.name === 'Vriend4' && !p.connected), 5000);
    await sleep(3000);
    const back = await new Client(srv.ws).open();
    const w = await back.request({ t: 'hello', device }, 'welcome');
    assert.equal(w.profile.name, 'Vriend4', 'zelfde telefoon wordt herkend');
    const again = await back.request({ t: 'join', code }, 'race');
    assert.equal(again.you, raceMsgs[4].you, 'zelfde kart na herverbinden');
    back.device = device;
    back.profile = w.profile;
    clients[4] = back;
    drivers[4] = new Driver(back, again);

    // wacht op de uitslag
    const results = await Promise.all(clients.map((c) => c.wait('results', 150000)));
    drivers.forEach((d) => d.stop());
    const res = results[0];
    assert.equal(res.rows.length, 10);
    const finished = res.rows.filter((r) => r.finished).length;
    assert.ok(finished >= 8, `minstens 8 van de 10 gefinisht (${finished})`);
    for (let i = 1; i < res.rows.length; i++) {
      if (res.rows[i].finished && res.rows[i - 1].finished) assert.ok(res.rows[i].time >= res.rows[i - 1].time);
      assert.ok(res.rows[i].mp <= res.rows[i - 1].mp + 10, 'lagere plek = niet meer punten (behalve snelste ronde)');
    }
    assert.ok(res.rows[0].mp > res.rows[9].mp);
    assert.ok(res.winner && res.loser, 'winnaar en verliezer bekend');
    assert.equal(res.challenge.text, 'Een atje karnemelk! 🥛');
    // iedereen zag alle 10 karts live en er werd gebotst
    assert.ok(drivers.every((d) => d.maxKarts === 10));
    const bumps = Math.max(...drivers.map((d) => d.bumps));
    assert.ok(bumps > 0, 'er zijn botsingen geweest');
    const corr = drivers.reduce((a, d) => a + d.pred.corrections, 0) / drivers.length;
    console.log(`  gefinisht: ${finished}/10, botsingen gezien: ${bumps}, gem. correcties per speler: ${corr.toFixed(1)}, punten: ${res.rows.map((r) => r.mp).join(',')}`);

    // de verliezer wisselt de uitdaging
    const byId = (id) => clients.find((c) => c.profile.id === id);
    const loserClient = byId(res.loser.id);
    loserClient.send({ t: 'challenge', action: 'next' });
    const ch = await host.wait('challenge');
    assert.notEqual(ch.challenge.text, 'Een atje karnemelk! 🥛');

    // punten zijn bijgeschreven
    await sleep(300);
    const winnerClient = byId(res.winner.id);
    const prof = await winnerClient.request({ t: 'profile' }, 'profile');
    assert.equal(prof.profile.mp, 150 + res.rows[0].mp);

    // winkel: te weinig punten voor de gouden cape, wel genoeg voor een rode cape
    const buyer = winnerClient;
    const nope = await buyer.request({ t: 'buy', id: 'cape_goud' }, 'shopFailed');
    assert.match(nope.msg, /Te weinig MP/);
    const ok = await buyer.request({ t: 'buy', id: 'cape_rood' }, (m) => m.t === 'profile' && m.bought);
    assert.ok(ok.profile.owned.includes('cape_rood'));
    buyer.send({ t: 'equip', id: 'cape_rood' });
    const seen = await host.wait((m) => m.t === 'room' && m.players.some((p) => p.cosmetics.cape === 'cape_rood'));
    assert.ok(seen, 'anderen zien de nieuwe cape');
    const mpAfter = ok.profile.mp;

    // host start opnieuw
    host.send({ t: 'again' });
    await clients[3].wait('race');
    clients.forEach((c) => c.close());

    // server herstarten: profiel, punten en spullen zijn bewaard
    await sleep(600);
    await srv.stop();
    srv = await startServer({ dataDir: srv.dataDir, port: srv.port, env });
    const relog = await loginClient(srv.ws, 'x', winnerClient.device);
    assert.equal(relog.profile.name, res.winner.name, 'telefoon wordt na herstart herkend');
    assert.equal(relog.profile.mp, mpAfter);
    assert.ok(relog.profile.owned.includes('cape_rood'));
    assert.equal(relog.profile.equipped.cape, 'cape_rood');
    relog.close();

    // gratis hosting: server start opnieuw met een LEGE schijf; de telefoon zet alles terug
    const backup = [...winnerClient.msgs].reverse().find((m) => m.profile && m.profile.backup).profile.backup;
    await sleep(300);
    await srv.stop();
    srv = await startServer({ port: srv.port, env });
    const zonder = await loginClient(srv.ws, 'x', winnerClient.device);
    assert.equal(zonder.profile, undefined, 'lege server kent de telefoon niet zonder reservekopie');
    zonder.close();
    const terug = await loginClient(srv.ws, 'x', winnerClient.device, backup);
    assert.equal(terug.profile.name, res.winner.name, 'naam terug via de telefoon');
    assert.equal(terug.profile.mp, mpAfter, 'MP terug via de telefoon');
    assert.equal(terug.profile.equipped.cape, 'cape_rood', 'gekochte cape terug');
    terug.close();
    const other = await loginClient(srv.ws, 'Nieuwkomer');
    assert.equal(other.profile.name, 'Nieuwkomer', 'een andere telefoon krijgt een eigen profiel');
    assert.equal(other.profile.mp, 150);
    other.close();
  } finally {
    clients.forEach((c) => { try { c.close(); } catch { /* al dicht */ } });
    await srv.stop();
  }
});

test('de server levert de game en een gezondheidscheck', async () => {
  const srv = await startServer();
  try {
    // de hoofdpagina is de speelhal met al de spellen
    const hall = await fetch(srv.url + '/');
    assert.equal(hall.status, 200);
    const hallHtml = await hall.text();
    assert.match(hallHtml, /<title>Speelhal<\/title>/);
    for (const href of ['/kart', '/bussen', '/boer', '/mexen', '/dealer', '/paardenrace', '/rotonde', '/mijnenveld']) assert.ok(hallHtml.includes(`'${href}'`), `speelhal linkt naar ${href}`);
    for (const href of ['/megaball', '/stockmarket', '/rodezone']) assert.ok(!hallHtml.includes(`'${href}'`), `${href} staat niet meer in de speelhal`);
    assert.match(hallHtml, /'Mario Bak'/, 'de kartgame heet Mario Bak');
    assert.match(hallHtml, /rel="manifest" href="\/speelhal\.webmanifest"/);
    // op het beginscherm en bij het delen heet het Speelhal, met een eigen logo
    const hallManifest = await (await fetch(srv.url + '/speelhal.webmanifest')).json();
    assert.equal(hallManifest.name, 'Speelhal');
    assert.equal(hallManifest.start_url, '/');
    for (const icon of hallManifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200);
    assert.match(hallHtml, /property="og:title" content="Speelhal"/);
    assert.equal((await fetch(srv.url + '/img/speelhal-deel.png')).status, 200);
    assert.equal((await fetch(srv.url + '/img/speelhal-180.png')).status, 200);
    assert.equal((await (await fetch(srv.url + '/manifest.webmanifest')).json()).start_url, '/kart', 'de kartgame opent de race');
    // uitnodigingen naar de oude hoofdpagina komen nog steeds in de kartgame
    assert.match(await (await fetch(srv.url + '/?room=ABCD')).text(), /<title>Mario Bak<\/title>/);
    const first = await fetch(srv.url + '/kart');
    const html = await first.text();
    assert.match(html, /Mario Bak/);
    // apparaatcookie: zo herkent de server deze telefoon
    const cookie = first.headers.get('set-cookie');
    assert.match(cookie, /^kk_dev=[A-Za-z0-9_-]{32}; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Lax/);
    const token = cookie.split(';')[0].split('=')[1];
    const again = await fetch(srv.url + '/kart', { headers: { cookie: `kk_dev=${token}` } });
    assert.ok(again.headers.get('set-cookie').startsWith(`kk_dev=${token};`), 'zelfde cookie wordt verlengd');
    // WebSocket met dat cookie: registreren en daarna zonder browseropslag herkend worden
    const { WebSocket: WsClient } = await import('ws');
    const talk = (msgs, until) => new Promise((resolve, reject) => {
      const ws = new WsClient(srv.ws, { headers: { cookie: `kk_dev=${token}` } });
      const got = [];
      ws.on('open', () => msgs.forEach((m) => ws.send(JSON.stringify(m))));
      ws.on('message', (d) => { const m = JSON.parse(d.toString()); got.push(m); if (until(m)) { ws.close(); resolve(got); } });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('timeout')), 4000);
    });
    const r1 = await talk([{ t: 'hello' }, { t: 'register', name: 'Cookiemonster' }], (m) => m.t === 'loggedIn');
    assert.equal(r1.find((m) => m.t === 'welcome').device, token);
    const r2 = await talk([{ t: 'hello' }], (m) => m.t === 'welcome');
    assert.equal(r2[0].profile.name, 'Cookiemonster');
    const js = await fetch(srv.url + '/js/main.js', { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(js.status, 200);
    const three = await fetch(srv.url + '/vendor/three.module.min.js', { method: 'HEAD', headers: { 'Accept-Encoding': 'gzip' } });
    assert.equal(three.headers.get('content-encoding'), 'gzip');
    assert.ok(+three.headers.get('content-length') < 250000, 'three.js gecomprimeerd klein genoeg voor mobiel');
    const join = await fetch(srv.url + '/join/ABCD');
    assert.match(await join.text(), /Mario Bak/);
    const megaball = await fetch(srv.url + '/megaball');
    assert.equal(megaball.status, 200);
    assert.match(await megaball.text(), /<title>Mega Ball Speelgeld<\/title>/);
    const storten = await fetch(srv.url + '/megaball/storten');
    assert.equal(storten.status, 200);
    assert.match(await storten.text(), /<title>Mega Ball Storten<\/title>/);
    const stock = await fetch(srv.url + '/stockmarket');
    assert.equal(stock.status, 200);
    assert.match(await stock.text(), /<title>Stock Market Trainer<\/title>/);
    assert.equal((await fetch(srv.url + '/stockmarket/storten')).status, 200);
    assert.equal((await fetch(srv.url + '/shared/stockmarket.js')).status, 200);
    const zone = await fetch(srv.url + '/rodezone');
    assert.equal(zone.status, 200);
    assert.match(await zone.text(), /<title>Rode Zone<\/title>/);
    const bussen = await fetch(srv.url + '/bussen');
    assert.equal(bussen.status, 200);
    assert.match(await bussen.text(), /<title>Bussen<\/title>/);
    assert.equal((await fetch(srv.url + '/shared/bussen.js')).status, 200);
    // Bussen is een losse app voor op het beginscherm
    const manifest = await (await fetch(srv.url + '/bussen.webmanifest')).json();
    assert.equal(manifest.start_url, '/bussen');
    assert.equal((await fetch(srv.url + manifest.icons[0].src)).status, 200);
    assert.match(await (await fetch(srv.url + '/bussen/ABCD')).text(), /<title>Bussen<\/title>/, 'uitnodigingslink voor een tafel');
    // Boer zoekt vrouw: ook een losse app, met een uitnodigingslink per tafel
    assert.match(await (await fetch(srv.url + '/boer')).text(), /<title>Boer zoekt vrouw<\/title>/);
    assert.match(await (await fetch(srv.url + '/boer/ABCD')).text(), /<title>Boer zoekt vrouw<\/title>/);
    assert.equal((await fetch(srv.url + '/shared/boer.js')).status, 200);
    const boerManifest = await (await fetch(srv.url + '/boer.webmanifest')).json();
    assert.equal(boerManifest.start_url, '/boer');
    for (const icon of boerManifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200);
    // Mexen: ook een losse app, met een uitnodigingslink per tafel
    assert.match(await (await fetch(srv.url + '/mexen')).text(), /<title>Mexen<\/title>/);
    assert.match(await (await fetch(srv.url + '/mexen/ABCD')).text(), /<title>Mexen<\/title>/);
    assert.equal((await fetch(srv.url + '/shared/mex.js')).status, 200);
    const mexManifest = await (await fetch(srv.url + '/mexen.webmanifest')).json();
    assert.equal(mexManifest.start_url, '/mexen');
    for (const icon of mexManifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200);
    // Fuck the dealer: ook een losse app, met een uitnodigingslink per tafel
    assert.match(await (await fetch(srv.url + '/dealer')).text(), /<title>Fuck the dealer<\/title>/);
    assert.match(await (await fetch(srv.url + '/dealer/ABCD')).text(), /<title>Fuck the dealer<\/title>/);
    assert.equal((await fetch(srv.url + '/shared/ftd.js')).status, 200);
    const dealerManifest = await (await fetch(srv.url + '/dealer.webmanifest')).json();
    assert.equal(dealerManifest.start_url, '/dealer');
    for (const icon of dealerManifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200);
    // Paardenrace: ook een losse app, met een uitnodigingslink per tafel
    assert.match(await (await fetch(srv.url + '/paardenrace')).text(), /<title>Paardenrace<\/title>/);
    assert.match(await (await fetch(srv.url + '/paardenrace/ABCD')).text(), /<title>Paardenrace<\/title>/);
    assert.equal((await fetch(srv.url + '/shared/paard.js')).status, 200);
    const paardManifest = await (await fetch(srv.url + '/paardenrace.webmanifest')).json();
    assert.equal(paardManifest.start_url, '/paardenrace');
    for (const icon of paardManifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200);
    // Rotonde: ook een losse app, met een uitnodigingslink per tafel
    assert.match(await (await fetch(srv.url + '/rotonde')).text(), /<title>Rotonde<\/title>/);
    assert.match(await (await fetch(srv.url + '/rotonde/ABCD')).text(), /<title>Rotonde<\/title>/);
    assert.equal((await fetch(srv.url + '/shared/rotonde.js')).status, 200);
    const rotondeManifest = await (await fetch(srv.url + '/rotonde.webmanifest')).json();
    assert.equal(rotondeManifest.start_url, '/rotonde');
    for (const icon of rotondeManifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200);
    // Mijnenveld: ook een losse app, met een uitnodigingslink per tafel
    assert.match(await (await fetch(srv.url + '/mijnenveld')).text(), /<title>Mijnenveld<\/title>/);
    assert.match(await (await fetch(srv.url + '/mijnenveld/ABCD')).text(), /<title>Mijnenveld<\/title>/);
    assert.equal((await fetch(srv.url + '/shared/mijnenveld.js')).status, 200);
    const mijnManifest = await (await fetch(srv.url + '/mijnenveld.webmanifest')).json();
    assert.equal(mijnManifest.start_url, '/mijnenveld');
    for (const icon of mijnManifest.icons) assert.equal((await fetch(srv.url + icon.src)).status, 200);
    const health = await (await fetch(srv.url + '/health')).json();
    assert.equal(health.ok, true);
    assert.equal((await fetch(srv.url + '/../server/store.js')).status, 404);
  } finally {
    await srv.stop();
  }
});

test('Bussen online: twee telefoons aan één tafel via /ws/bussen', async () => {
  const srv = await startServer();
  try {
    const url = srv.ws + '/bussen';
    const a = await new Client(url).open();
    const b = await new Client(url).open();
    const sa = await a.request({ t: 'create', name: 'Jort', token: 'telefoon-a-0123456789' }, 'state');
    assert.equal(sa.phase, 'lobby');
    assert.match(sa.code, /^[A-Z]{4}$/);
    assert.match(sa.build, /^[\w-]{12}$/, 'de versie van Bussen gaat mee, zodat oude pagina\'s herladen');
    const sb = await b.request({ t: 'join', code: sa.code.toLowerCase(), name: 'Meke', token: 'telefoon-b-0123456789' }, (m) => m.t === 'state' && m.players.length === 2);
    assert.equal(sb.you, 1);
    const started = b.wait((m) => m.t === 'state' && m.phase === 'vragen');
    a.send({ t: 'start' });
    const sv = await started;
    assert.equal(sv.turn, 0);
    assert.equal(sv.hand.length, 0);
    // Jort raadt, Meke ziet de uitslag in het logboek
    const seen = b.wait((m) => m.t === 'state' && m.log.some((e) => e.type === 'vraag'));
    a.send({ t: 'answer', o: 'rood' });
    const after = await seen;
    assert.equal(after.hands[0].length, 1);
    assert.equal(after.turn, 1);
    // de kartgame werkt nog gewoon op /ws
    const k = await new Client(srv.ws).open();
    assert.equal((await k.request({ t: 'hello' }, 'welcome')).t, 'welcome');
    const health = await (await fetch(srv.url + '/health')).json();
    assert.deepEqual(health.bussen, { tables: 1, players: 2 });
    [a, b, k].forEach((c) => c.close());
  } finally {
    await srv.stop();
  }
});

test('Boer zoekt vrouw online: drie telefoons, ieder ziet alleen zijn eigen rol', async () => {
  const srv = await startServer();
  try {
    const url = srv.ws + '/boer';
    const phones = await Promise.all([0, 1, 2].map(() => new Client(url).open()));
    const s0 = await phones[0].request({ t: 'create', name: 'Jort', token: 'boer-telefoon-a-0123456789' }, 'state');
    assert.equal(s0.count, 8);
    assert.match(s0.build, /^[\w-]{12}$/);
    for (const [i, name] of [[1, 'Meke'], [2, 'Sim']]) {
      await phones[i].request({ t: 'join', code: s0.code, name, token: `boer-telefoon-${i}-0123456789` }, (m) => m.t === 'state' && m.players.length === i + 1);
    }
    const dealt = phones.map((p) => p.wait((m) => m.t === 'state' && m.phase === 'rollen'));
    phones[0].send({ t: 'start' });
    const states = await Promise.all(dealt);
    assert.deepEqual(states.map((st) => st.role).sort(), ['boer', 'burger', 'vrouw']);
    for (const st of states) assert.equal(st.roles, undefined, 'de rollen van anderen blijven op de server');
    const health = await (await fetch(srv.url + '/health')).json();
    assert.deepEqual(health.boer, { tables: 1, players: 3 });
    phones.forEach((c) => c.close());
  } finally {
    await srv.stop();
  }
});

test('Mexen online: twee telefoons, de host gooit en de ander ziet de worp', async () => {
  const srv = await startServer();
  try {
    const url = srv.ws + '/mexen';
    const [a, b] = await Promise.all([new Client(url).open(), new Client(url).open()]);
    const sa = await a.request({ t: 'create', name: 'Jort', token: 'mex-telefoon-a-0123456789' }, 'state');
    assert.equal(sa.stake, 1);
    assert.match(sa.build, /^[\w-]{12}$/);
    await b.request({ t: 'join', code: sa.code, name: 'Meke', token: 'mex-telefoon-b-0123456789' }, (m) => m.t === 'state' && m.players.length === 2);
    const started = b.wait((m) => m.t === 'state' && m.phase === 'gooien');
    a.send({ t: 'start' });
    assert.equal((await started).thrower, 0, 'de host begint');
    const rolled = b.wait((m) => m.t === 'state' && m.dice && m.dice[0]);
    a.send({ t: 'roll' });
    const st = await rolled;
    assert.equal(st.count[0], 1);
    assert.ok(st.dice[0].every((v) => v >= 1 && v <= 6));
    const health = await (await fetch(srv.url + '/health')).json();
    assert.deepEqual(health.mexen, { tables: 1, players: 2 });
    [a, b].forEach((c) => c.close());
  } finally {
    await srv.stop();
  }
});

test('Fuck the dealer online: alleen de dealer krijgt de bovenste kaart', async () => {
  const srv = await startServer();
  try {
    const url = srv.ws + '/dealer';
    const [a, b] = await Promise.all([new Client(url).open(), new Client(url).open()]);
    const sa = await a.request({ t: 'create', name: 'Jort', token: 'ftd-telefoon-a-0123456789' }, 'state');
    assert.match(sa.build, /^[\w-]{12}$/);
    await b.request({ t: 'join', code: sa.code, name: 'Meke', token: 'ftd-telefoon-b-0123456789' }, (m) => m.t === 'state' && m.players.length === 2);
    const states = [a, b].map((p) => p.wait((m) => m.t === 'state' && m.phase === 'raden'));
    a.send({ t: 'start' });
    const [x, y] = await Promise.all(states);
    assert.equal(x.dealer, y.dealer);
    const dealerState = x.dealer === 0 ? x : y, guesserState = x.dealer === 0 ? y : x;
    assert.ok(dealerState.top && Number.isInteger(dealerState.top.r), 'de dealer ziet de kaart');
    assert.equal(guesserState.top, null, 'de rest niet');
    assert.equal(guesserState.deckLeft, 52);
    const health = await (await fetch(srv.url + '/health')).json();
    assert.deepEqual(health.dealer, { tables: 1, players: 2 });
    [a, b].forEach((c) => c.close());
  } finally {
    await srv.stop();
  }
});

test('Paardenrace online: twee telefoons zetten in, de race begint en de stapel blijft op de server', async () => {
  const srv = await startServer();
  try {
    const url = srv.ws + '/paardenrace';
    const [a, b] = await Promise.all([new Client(url).open(), new Client(url).open()]);
    const sa = await a.request({ t: 'create', name: 'Jort', token: 'paard-telefoon-a-0123456789' }, 'state');
    assert.match(sa.build, /^[\w-]{12}$/);
    await b.request({ t: 'join', code: sa.code, name: 'Meke', token: 'paard-telefoon-b-0123456789' }, (m) => m.t === 'state' && m.players.length === 2);
    const betting = b.wait((m) => m.t === 'state' && m.phase === 'inzetten');
    a.send({ t: 'start' });
    await betting;
    a.send({ t: 'bet', horse: 0, bet: 2, ready: true });
    const racing = a.wait((m) => m.t === 'state' && m.phase === 'race');
    b.send({ t: 'bet', horse: 3, bet: 1, ready: true });
    const st = await racing;
    assert.deepEqual(st.racers, [0, 1]);
    assert.equal(st.pileLeft, 41);
    assert.ok(st.track.every((c) => c === null), 'de kaarten naast de baan liggen dicht');
    const health = await (await fetch(srv.url + '/health')).json();
    assert.deepEqual(health.paardenrace, { tables: 1, players: 2 });
    [a, b].forEach((c) => c.close());
  } finally {
    await srv.stop();
  }
});

test('Rotonde online: twee telefoons, de host kiest een kaart en gokt, de ander ziet hem open gaan', async () => {
  const srv = await startServer();
  try {
    const url = srv.ws + '/rotonde';
    const [a, b] = await Promise.all([new Client(url).open(), new Client(url).open()]);
    const sa = await a.request({ t: 'create', name: 'Jort', token: 'rotonde-telefoon-a-0123456789' }, 'state');
    assert.match(sa.build, /^[\w-]{12}$/);
    await b.request({ t: 'join', code: sa.code, name: 'Meke', token: 'rotonde-telefoon-b-0123456789' }, (m) => m.t === 'state' && m.players.length === 2);
    const started = b.wait((m) => m.t === 'state' && m.phase === 'kiezen');
    a.send({ t: 'start' });
    const st = await started;
    assert.equal(st.turn, 0, 'de host begint');
    assert.ok(st.cards.every((c) => !c.card), 'alle kaarten liggen dicht');
    const opened = b.wait((m) => m.t === 'state' && m.cards[0].card);
    a.send({ t: 'pick', i: 0 });
    a.send({ t: 'guess', color: 'rood' });
    const after = await opened;
    assert.ok(after.pot === 12 || after.players[0].sips === 12, 'goed in de pot, of fout gedronken');
    const health = await (await fetch(srv.url + '/health')).json();
    assert.deepEqual(health.rotonde, { tables: 1, players: 2 });
    [a, b].forEach((c) => c.close());
  } finally {
    await srv.stop();
  }
});

test('Mijnenveld online: twee telefoons, de host gooit twee keer en de ander ziet waar de steen op wijst', async () => {
  const srv = await startServer();
  try {
    const url = srv.ws + '/mijnenveld';
    const [a, b] = await Promise.all([new Client(url).open(), new Client(url).open()]);
    const sa = await a.request({ t: 'create', name: 'Jort', token: 'mijn-telefoon-a-0123456789' }, 'state');
    assert.equal(sa.mineSips, 5);
    assert.match(sa.build, /^[\w-]{12}$/);
    await b.request({ t: 'join', code: sa.code, name: 'Meke', token: 'mijn-telefoon-b-0123456789' }, (m) => m.t === 'state' && m.players.length === 2);
    const started = b.wait((m) => m.t === 'state' && m.phase === 'gooien');
    a.send({ t: 'start' });
    const st = await started;
    assert.deepEqual([st.turn, st.hiddenMines], [0, 8]);
    const rolled = b.wait((m) => m.t === 'state' && m.dice && m.dice[1]);
    a.send({ t: 'roll' });
    a.send({ t: 'roll' });
    const r = await rolled;
    assert.ok(r.dice.every((d) => d >= 1 && d <= 6));
    assert.ok(r.target >= 0 && r.target < 36);
    assert.ok(r.phase === 'gokken' || r.phase === 'plaatsen');
    const health = await (await fetch(srv.url + '/health')).json();
    assert.deepEqual(health.mijnenveld, { tables: 1, players: 2 });
    [a, b].forEach((c) => c.close());
  } finally {
    await srv.stop();
  }
});

test('tafelspellen: een telefoon die stil wegvalt, is binnen 10 seconden weg en de volgende is aan de beurt', async () => {
  const srv = await startServer();
  // telefoons via de ws-bibliotheek: daarmee kunnen we er een laten stoppen met antwoorden
  const phone = async () => { const ws = new WsSocket(srv.ws + '/dealer'); await new Promise((res) => ws.once('open', res)); return ws; };
  const waitFor = (ws, pred, ms = 12000) => new Promise((res, rej) => {
    const timer = setTimeout(() => { ws.off('message', on); rej(new Error('geen bericht op tijd')); }, ms);
    const on = (data) => { const m = JSON.parse(data); if (pred(m)) { clearTimeout(timer); ws.off('message', on); res(m); } };
    ws.on('message', on);
  });
  try {
    const phones = [await phone(), await phone(), await phone()];
    const said = (i, msg) => phones[i].send(JSON.stringify(msg));
    const made = waitFor(phones[0], (m) => m.t === 'state');
    said(0, { t: 'create', name: 'Jort', token: 'stil-telefoon-0-0123456789' });
    const { code } = await made;
    for (const i of [1, 2]) {
      const joined = waitFor(phones[i], (m) => m.t === 'state');
      said(i, { t: 'join', code, name: ['', 'Meke', 'Sim'][i], token: `stil-telefoon-${i}-0123456789` });
      await joined;
    }
    const started = waitFor(phones[0], (m) => m.t === 'state' && m.phase === 'raden');
    said(0, { t: 'start' });
    const { guesser } = await started;
    // wie moet raden, valt stil weg: zijn telefoon antwoordt nergens meer op, ook niet op de pings van de server
    const other = phones.findIndex((_, i) => i !== guesser);
    const t0 = Date.now();
    const noticed = waitFor(phones[other], (m) => m.t === 'state' && m.players[guesser].connected === false);
    phones[guesser]._socket.pause();
    const st = await noticed;
    assert.ok(Date.now() - t0 < 10000, `pas na ${Date.now() - t0} ms`);
    assert.notEqual(st.guesser, guesser, 'de volgende is aan de beurt');
    phones.forEach((ws) => ws.terminate());
  } finally {
    await srv.stop();
  }
});

test('verhuisd: met REDIRECT_TO stuurt de oude server alles door naar het nieuwe adres', async () => {
  const srv = await startServer({ env: { REDIRECT_TO: 'https://speelhal.onrender.com/' } });
  try {
    const r = await fetch(srv.url + '/bussen/ABCD?x=1', { redirect: 'manual' });
    assert.equal(r.status, 301);
    assert.equal(r.headers.get('location'), 'https://speelhal.onrender.com/bussen/ABCD?x=1');
    assert.equal((await fetch(srv.url + '/', { redirect: 'manual' })).headers.get('location'), 'https://speelhal.onrender.com/');
    assert.equal((await fetch(srv.url + '/health')).status, 200, 'Render blijft zien dat de server leeft');
  } finally {
    await srv.stop();
  }
});
