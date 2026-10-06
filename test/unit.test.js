// Snelle tests zonder netwerk: banen, fysica, punten, winkel, protocol en de roomlogica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_BY_ID } from '../public/shared/tracks.js';
import { buildTrack, validateTrack } from '../public/shared/trackgeo.js';
import { createKart, stepKart, raceDistance } from '../public/shared/physics.js';
import { computePoints } from '../public/shared/points.js';
import { tryBuy, tryEquip, SHOP_ITEMS, RARITIES, publicCosmetics, DEFAULT_EQUIP } from '../public/shared/shop.js';
import { encodeFull, decodeFull, encodeVisual, decodeVisual, encodeInput, decodeInput } from '../public/shared/protocol.js';
import { rollItem, ITEM } from '../public/shared/items.js';
import { Race } from '../public/shared/race.js';
import { Hub } from '../public/shared/hub.js';
import { botInput } from '../public/shared/bots.js';
import { Predictor } from '../public/js/game/predict.js';
import { rng } from '../public/shared/util.js';
import { DT, LAPS } from '../public/shared/constants.js';

test('er zijn minstens 8 verschillende, geldige banen', () => {
  assert.ok(TRACKS.length >= 8);
  const themes = new Set(TRACKS.map((t) => t.theme));
  assert.ok(themes.size >= 8, 'elke baan heeft een eigen thema');
  for (const def of TRACKS) {
    const tr = buildTrack(def);
    const v = validateTrack(tr);
    assert.ok(v.ok, `${def.id}: ${v.problems.join(', ')}`);
    assert.ok(tr.L > 600 && tr.L < 1500, `${def.id} lengte ${tr.L}`);
    assert.ok(tr.itemBoxes.length >= 8, `${def.id} heeft itemdozen`);
    assert.ok(tr.obstacles.length >= 3, `${def.id} heeft obstakels`);
    // obstakels en itemdozen liggen op de weg
    for (const o of tr.obstacles) assert.ok(Math.abs(o.d) + o.r < tr.wallD, `${def.id} obstakel buiten de baan`);
    for (const b of tr.itemBoxes) assert.ok(Math.abs(b.d) < tr.halfW, `${def.id} itemdoos buiten de weg`);
    // tien startplekken op de weg, niet over elkaar
    const slots = Array.from({ length: 10 }, (_, i) => tr.gridSlot(i));
    for (const s of slots) assert.ok(Math.abs(tr.locate(s.x, s.z).d) < tr.halfW, `${def.id} startplek naast de weg`);
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      assert.ok(Math.hypot(slots[i].x - slots[j].x, slots[i].z - slots[j].z) > 3, `${def.id} startplekken overlappen`);
    }
  }
});

test('kart rijdt vooruit, stuurt de goede kant op en blijft binnen de muren', () => {
  const tr = buildTrack(TRACK_BY_ID.kustweg);
  const k = createKart(0, tr, 0);
  const env = { time: 0, laps: 3 };
  for (let i = 0; i < 120; i++) stepKart(k, { steer: 0, gas: true }, tr, env);
  const speed = Math.hypot(k.vx, k.vz);
  assert.ok(speed > 15, `snelheid na 2s: ${speed}`);
  const h0 = k.h;
  for (let i = 0; i < 30; i++) stepKart(k, { steer: 1, gas: true }, tr, env);
  // rechts sturen verkleint de hoek
  assert.ok(k.h < h0, 'naar rechts sturen draait rechtsom');
  // met vol gas en vol sturen nooit door de muur
  for (let i = 0; i < 600; i++) {
    stepKart(k, { steer: 1, gas: true }, tr, env);
    const loc = tr.locate(k.x, k.z);
    assert.ok(Math.abs(loc.d) <= tr.wallD + 0.05, 'kart door de muur');
  }
});

test('rondes tellen alleen met alle checkpoints, en finish na 3 rondes', () => {
  for (const id of ['grachten', 'zandstorm']) {
    const tr = buildTrack(TRACK_BY_ID[id]);
    const k = createKart(0, tr, 0);
    k.bot = undefined;
    let t = 0;
    const events = [];
    const env = { get time() { return t; }, laps: LAPS, emit: (type) => events.push(type) };
    while (!k.finished && t < 300) {
      stepKart(k, botInput(k, tr, { time: t }), tr, env);
      t += DT;
    }
    assert.equal(k.finished, 1, `${id}: niet gefinisht`);
    assert.equal(events.filter((e) => e === 'lap').length, LAPS - 1);
    assert.ok(k.bestLap > 20 && k.bestLap < 70, `${id} beste ronde ${k.bestLap}`);
  }
});

test('achteruit over de streep levert geen ronde op', () => {
  const tr = buildTrack(TRACK_BY_ID.kustweg);
  const k = createKart(0, tr, 0);
  const env = { time: 0, laps: 3 };
  for (let i = 0; i < 120; i++) stepKart(k, { gas: true }, tr, env);
  assert.equal(k.lap, 1);
  // keer om en rij terug
  k.h += Math.PI; k.vx = 0; k.vz = 0;
  for (let i = 0; i < 300; i++) stepKart(k, { gas: true }, tr, env);
  assert.equal(k.lap, 0);
  assert.ok(raceDistance(k, tr) < 0);
});

test('MP-punten: eerlijk aflopend, winnaar het meest', () => {
  const rows = Array.from({ length: 10 }, (_, i) => ({ id: 'p' + i, isBot: false, place: i + 1, finished: true, bestLap: 40 + i }));
  const pts = computePoints(rows);
  const list = rows.map((r) => pts[r.id].mp);
  assert.equal(list[0], 130); // 20 + 100 + 10 snelste ronde
  assert.equal(list[9], 20);
  for (let i = 1; i < list.length; i++) assert.ok(list[i] <= list[i - 1]);
  // niet uitgereden en oefenen
  const pr = computePoints([{ id: 'a', place: 1, finished: true, bestLap: 30 }, { id: 'b', place: 2, finished: false }], { practice: true });
  assert.ok(pr.a.mp > pr.b.mp);
  assert.equal(pr.b.mp, 3); // 5 * 0,5 afgerond
  // bots krijgen niks
  const wb = computePoints([{ id: 'bot', isBot: true, place: 1, finished: true }, { id: 'x', place: 2, finished: true }]);
  assert.equal(wb.bot, undefined);
  assert.ok(wb.x.mp >= 20);
});

test('winkel: zeldzaamheden, gouden cape is het duurste en legendarisch, kopen en dragen', () => {
  const goud = SHOP_ITEMS.find((i) => i.id === 'cape_goud');
  assert.equal(goud.rarity, 'legendarisch');
  assert.equal(RARITIES.legendarisch.order, Math.max(...Object.values(RARITIES).map((r) => r.order)));
  for (const i of SHOP_ITEMS) if (i.id !== 'cape_goud') assert.ok(i.price < goud.price, `${i.id} duurder dan gouden cape`);
  assert.equal(SHOP_ITEMS.filter((i) => i.rarity === 'legendarisch').length, 1);
  for (const slot of ['cape', 'kleur', 'banden', 'spoor', 'pose']) assert.ok(SHOP_ITEMS.filter((i) => i.slot === slot && !i.free).length >= 3);

  const p = { mp: 150, owned: [], equipped: { ...DEFAULT_EQUIP } };
  let r = tryBuy(p, 'cape_goud');
  assert.equal(r.ok, false);
  assert.match(r.error, /Te weinig MP/);
  assert.equal(p.mp, 150);
  r = tryEquip(p, 'cape_rood');
  assert.equal(r.ok, false);
  r = tryBuy(p, 'cape_rood');
  assert.equal(r.ok, true);
  assert.equal(p.mp, 30);
  assert.equal(tryBuy(p, 'cape_rood').ok, false); // al in bezit
  assert.equal(tryEquip(p, 'cape_rood').ok, true);
  assert.equal(publicCosmetics(p).cape, 'cape_rood');
  // gemanipuleerde uitrusting zonder bezit telt niet
  const fake = { mp: 0, owned: [], equipped: { cape: 'cape_goud' } };
  assert.equal(publicCosmetics(fake).cape, 'cape_geen');
});

test('protocol: invoer en kartstatus overleven het netwerk', () => {
  const inp = { steer: -0.4567, gas: true, brake: false, drift: true, item: true };
  const back = decodeInput(encodeInput(inp));
  assert.equal(back.steer, -0.46);
  assert.deepEqual([back.gas, back.brake, back.drift, back.item], [true, false, true, true]);
  const tr = buildTrack(TRACK_BY_ID.melkweg);
  const k = createKart(3, tr, 3);
  k.drift = -1; k.driftT = 2.1; k.boostT = 0.5; k.item = ITEM.KLOMP;
  const full = decodeFull(JSON.parse(JSON.stringify(encodeFull(k))));
  assert.equal(full.item, ITEM.KLOMP);
  assert.ok(Math.abs(full.x - k.x) < 1e-3);
  const vis = decodeVisual(encodeVisual(k));
  assert.equal(vis.drift, -1);
  assert.equal(vis.driftLevel, 2);
  assert.equal(vis.boost, true);
});

test('itemverdeling helpt de achterhoede', () => {
  const rand = rng(5);
  const count = (place) => {
    let turbo = 0;
    for (let i = 0; i < 2000; i++) { const it = rollItem(place, 10, rand); if (it === ITEM.TURBO || it === ITEM.TURBO3) turbo++; }
    return turbo;
  };
  assert.ok(count(10) > count(1) * 3);
});

test('botsingen vertragen de geraakte kart en duwen hem opzij', () => {
  const tr = buildTrack(TRACK_BY_ID.zandstorm);
  const entrants = [0, 1].map((kid) => ({ kid, id: 'p' + kid, name: 'P' + kid, isBot: false }));
  const race = new Race({ track: tr, entrants, startDelay: 0 });
  race.update(0.001);
  const [a, b] = race.karts;
  // b staat stil op de weg, a ramt hem van achteren
  const p = tr.pointAt(200, 0);
  b.x = p.x; b.z = p.z; b.h = p.h; b.vx = 0; b.vz = 0;
  a.x = p.x - Math.sin(p.h) * 2.2; a.z = p.z - Math.cos(p.h) * 2.2; a.h = p.h;
  a.vx = Math.sin(p.h) * 25; a.vz = Math.cos(p.h) * 25;
  race.kartCollisions();
  const ev = race.takeEvents().find((e) => e.type === 'bump');
  assert.ok(ev, 'botsing gemeld');
  assert.equal(ev.b, b.kid, 'b is het slachtoffer');
  assert.ok(b.bumpT > 0.4, 'slachtoffer is even vertraagd');
  assert.ok(Math.hypot(b.vx, b.vz) > 5, 'slachtoffer is weggeduwd');
  assert.ok(Math.hypot(a.vx, a.vz) < 25, 'aanvaller verliest snelheid');
  // met een schild ben je immuun
  b.bumpT = 0; b.shieldT = 5;
  a.x = b.x - Math.sin(p.h) * 2.2; a.z = b.z - Math.cos(p.h) * 2.2; a.vx = Math.sin(p.h) * 25; a.vz = Math.cos(p.h) * 25; b.vx = 0; b.vz = 0;
  a.bumpCd.clear();
  race.kartCollisions();
  assert.equal(b.bumpT, 0, 'schild beschermt');
});

test('voorspelling komt overeen met de server (zelfde invoer = zelfde plek)', () => {
  const tr = buildTrack(TRACK_BY_ID.paddenstoelen);
  const race = new Race({ track: tr, entrants: [{ kid: 0, id: 'a', name: 'A' }], startDelay: 0 });
  race.update(0.0001);
  const pred = new Predictor(tr, 0, 0, LAPS);
  const k = race.karts[0];
  let seq0 = 1;
  const batch = [];
  for (let i = 0; i < 600; i++) {
    const inp = botInput(pred.kart, tr, { time: race.time });
    const r = pred.step(inp, race.time + i * DT);
    batch.push(r.packed);
  }
  race.queueInputs(0, seq0, batch.slice(0, 90));
  for (let i = 0; i < 100; i++) race.update(1 / 60);
  assert.equal(k.ack, 90);
  // voorspelling op stap 90 opnieuw opbouwen en vergelijken
  const p2 = new Predictor(tr, 0, 0, LAPS);
  for (let i = 0; i < 90; i++) p2.step(decodeInput(batch[i]), i * DT);
  assert.ok(Math.hypot(p2.kart.x - k.x, p2.kart.z - k.z) < 0.05, 'server en voorspelling lopen gelijk');
});

// ---------- roomlogica met een nepklok (geen netwerk) ----------
class MemStore {
  constructor() { this.p = new Map(); this.t = new Map(); }
  async login(name, pin) {
    const key = name.toLowerCase();
    let p = this.p.get(key);
    if (p && p.pin !== pin) return { ok: false, error: 'PIN klopt niet' };
    if (!p) { p = { key, name, pin, mp: 150, owned: [], equipped: {}, stats: {} }; this.p.set(key, p); }
    const token = 'tok-' + key;
    this.t.set(token, key);
    return { ok: true, profile: p, token };
  }
  async fromToken(tok) { return this.p.get(this.t.get(tok)) || null; }
  async get(key) { return this.p.get(key) || null; }
  async save() {}
  async logout() {}
}

function fakeConn() {
  const c = { out: [], send(t) { c.out.push(JSON.parse(t)); }, sendVolatile(t) { c.out.push(JSON.parse(t)); } };
  c.last = (type) => [...c.out].reverse().find((m) => m.t === type);
  return c;
}

test('oefenmodus met bots: race loopt helemaal door tot uitslag en punten', async () => {
  let clock = 1_000_000;
  const store = new MemStore();
  const hub = new Hub({ store, now: () => clock, random: rng(9), laps: 1 });
  const conn = fakeConn();
  hub.connect(conn);
  await hub.message(conn, { t: 'login', name: 'Jort', pin: '1234' });
  await hub.message(conn, { t: 'create', practice: true });
  const room = conn.last('room');
  assert.equal(room.practice, true);
  await hub.message(conn, { t: 'settings', settings: { trackId: 'karnemelkhoeve', bots: 4, botLevel: 'makkelijk' } });
  await hub.message(conn, { t: 'start' });
  const race = conn.last('race');
  assert.equal(race.entrants.length, 5);
  assert.equal(race.trackId, 'karnemelkhoeve');
  const tr = buildTrack(TRACK_BY_ID.karnemelkhoeve);
  const pred = new Predictor(tr, race.you, race.you, race.laps);
  let seqStart = 1;
  let buf = [];
  for (let n = 0; n < 60 * 200 && !conn.last('results'); n++) {
    clock += 1000 / 60;
    const rt = (clock - race.startAt) / 1000;
    if (rt >= 0) {
      const r = pred.step(botInput(pred.kart, tr, { time: rt }), rt);
      buf.push(r.packed);
      if (buf.length === 3) { await hub.message(conn, { t: 'in', s: seqStart, i: buf }); seqStart += 3; buf = []; }
    }
    hub.tick();
    const s = conn.out.length && conn.out[conn.out.length - 1];
    if (s && s.t === 's' && s.me) pred.reconcile(s.me);
  }
  const res = conn.last('results');
  assert.ok(res, 'uitslag ontvangen');
  assert.equal(res.rows.length, 5);
  const me = res.rows.find((r) => r.id === 'jort');
  assert.ok(me.finished, 'speler is gefinisht');
  assert.ok(me.mp > 0);
  await new Promise((r) => setTimeout(r, 20));
  const prof = conn.last('profile');
  assert.equal(prof.profile.mp, 150 + me.mp);
  assert.equal(prof.profile.stats.races, 1);
  // opnieuw racen
  await hub.message(conn, { t: 'again' });
  assert.ok(conn.out.filter((m) => m.t === 'race').length === 2);
});

test('lobby: klaar-status, host-rechten, vol, verkeerde code en herverbinden', async () => {
  let clock = 5_000_000;
  const store = new MemStore();
  const hub = new Hub({ store, now: () => clock, random: rng(3) });
  const conns = [];
  for (let i = 0; i < 11; i++) {
    const c = fakeConn();
    hub.connect(c);
    await hub.message(c, { t: 'login', name: 'Speler' + i, pin: '0000' });
    conns.push(c);
  }
  await hub.message(conns[0], { t: 'create' });
  const code = conns[0].last('room').code;
  assert.match(code, /^[A-Z]{4}$/);
  await hub.message(conns[1], { t: 'join', code: 'ZZZZ' === code ? 'YYYY' : 'ZZZZ' });
  assert.match(conns[1].last('joinFailed').msg, /bestaat niet/);
  for (let i = 1; i < 10; i++) await hub.message(conns[i], { t: 'join', code: code.toLowerCase() });
  await hub.message(conns[10], { t: 'join', code });
  assert.match(conns[10].last('joinFailed').msg, /vol/);
  assert.equal(conns[0].last('room').players.length, 10);
  // niet-host mag niet starten of instellingen wijzigen
  await hub.message(conns[3], { t: 'start' });
  assert.match(conns[3].last('err').msg, /host/);
  // host start terwijl niet iedereen klaar is -> lijst met namen
  await hub.message(conns[0], { t: 'start' });
  assert.equal(conns[0].last('notReady').names.length, 9);
  for (let i = 1; i < 10; i++) await hub.message(conns[i], { t: 'ready', on: true });
  assert.ok(conns[0].last('room').players.every((p) => p.host || p.ready));
  await hub.message(conns[0], { t: 'start' });
  const raceMsg = conns[5].last('race');
  assert.ok(raceMsg && raceMsg.entrants.length === 10);
  // speler 5 valt weg en komt terug op een nieuwe verbinding
  hub.disconnect(conns[5]);
  clock += 3000; hub.tick();
  assert.equal(conns[0].last('room').players.find((p) => p.name === 'Speler5').connected, false);
  const back = fakeConn();
  hub.connect(back);
  await hub.message(back, { t: 'hello', token: 'tok-speler5' });
  assert.equal(back.last('welcome').profile.name, 'Speler5');
  await hub.message(back, { t: 'join', code });
  const again = back.last('race');
  assert.equal(again.you, raceMsg.you, 'zelfde kart terug');
  assert.equal(conns[0].last('room').players.find((p) => p.name === 'Speler5').connected, true);
  // host verlaat -> nieuwe host
  await hub.message(conns[0], { t: 'leave' });
  assert.equal(conns[1].last('room').host, 'speler1');
});
