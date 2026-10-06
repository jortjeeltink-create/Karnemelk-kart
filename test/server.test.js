// Echte server + 10 spelers via WebSockets: room, lobby, race met botsingen,
// herverbinden, uitslag, MP-punten, winkel en opslag na een herstart.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, loginClient, Client, sleep } from './helpers.js';
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
  let srv = await startServer({ env: { KK_LAPS: '1' } });
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
    srv = await startServer({ dataDir: srv.dataDir, port: srv.port });
    const relog = await loginClient(srv.ws, 'x', winnerClient.device);
    assert.equal(relog.profile.name, res.winner.name, 'telefoon wordt na herstart herkend');
    assert.equal(relog.profile.mp, mpAfter);
    assert.ok(relog.profile.owned.includes('cape_rood'));
    assert.equal(relog.profile.equipped.cape, 'cape_rood');
    const other = await loginClient(srv.ws, 'Nieuwkomer');
    assert.equal(other.profile.name, 'Nieuwkomer', 'een andere telefoon krijgt een eigen profiel');
    assert.equal(other.profile.mp, 150);
    relog.close(); other.close();
  } finally {
    clients.forEach((c) => { try { c.close(); } catch { /* al dicht */ } });
    await srv.stop();
  }
});

test('de server levert de game en een gezondheidscheck', async () => {
  const srv = await startServer();
  try {
    const first = await fetch(srv.url + '/');
    const html = await first.text();
    assert.match(html, /Karnemelk Kart/);
    // apparaatcookie: zo herkent de server deze telefoon
    const cookie = first.headers.get('set-cookie');
    assert.match(cookie, /^kk_dev=[A-Za-z0-9_-]{32}; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Lax/);
    const token = cookie.split(';')[0].split('=')[1];
    const again = await fetch(srv.url + '/', { headers: { cookie: `kk_dev=${token}` } });
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
    assert.match(await join.text(), /Karnemelk Kart/);
    const health = await (await fetch(srv.url + '/health')).json();
    assert.equal(health.ok, true);
    assert.equal((await fetch(srv.url + '/../server/store.js')).status, 404);
  } finally {
    await srv.stop();
  }
});
