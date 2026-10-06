// Snelle tests zonder netwerk: banen, fysica, punten, winkel, protocol en de roomlogica.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACKS, TRACK_BY_ID } from '../public/shared/tracks.js';
import { buildTrack, validateTrack } from '../public/shared/trackgeo.js';
import { createKart, stepKart, raceDistance } from '../public/shared/physics.js';
import { computePoints } from '../public/shared/points.js';
import { tryBuy, tryEquip, SHOP_ITEMS, RARITIES, publicCosmetics, DEFAULT_EQUIP, START_MP } from '../public/shared/shop.js';
import { encodeFull, decodeFull, encodeVisual, decodeVisual, encodeInput, decodeInput } from '../public/shared/protocol.js';
import { rollItem, ITEM } from '../public/shared/items.js';
import { Race } from '../public/shared/race.js';
import { Hub } from '../public/shared/hub.js';
import { Profiles, isDeviceToken, cleanBackup } from '../public/shared/profiles.js';
import { makeSigner } from '../server/store.js';
import { CHARACTER_BY_ID, BOT_CHARACTERS, racerName } from '../public/shared/characters.js';
import { cleanLook, lookScales, BUILDS, HEIGHTS } from '../public/shared/look.js';
import { botInput } from '../public/shared/bots.js';
import { Predictor } from '../public/js/game/predict.js';
import { rng } from '../public/shared/util.js';
import { DT, LAPS, PHYS, JUMP } from '../public/shared/constants.js';

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
  for (const slot of ['cape', 'kart', 'kleur', 'hoed', 'banden', 'spoor', 'pose']) assert.ok(SHOP_ITEMS.filter((i) => i.slot === slot && !i.free).length >= 3);
  const roze = SHOP_ITEMS.find((i) => i.id === 'kart_roze');
  assert.ok(roze && roze.slot === 'kart' && roze.price > 0, 'roze kart te koop');
  assert.ok(SHOP_ITEMS.filter((i) => i.slot === 'kart' && !i.free).length >= 6, 'genoeg karts');

  const p = { mp: 150, owned: [], equipped: { ...DEFAULT_EQUIP } };
  let r = tryBuy(p, 'cape_goud');
  assert.equal(r.ok, false);
  assert.match(r.error, /Te weinig MP/);
  assert.equal(p.mp, 150);
  r = tryEquip(p, 'cape_rood');
  assert.equal(r.ok, false);
  r = tryBuy(p, 'cape_rood');
  assert.equal(r.ok, true);
  assert.equal(p.mp, 100);
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

// rijdt een kart met volle snelheid over een schans en geeft de gebeurtenissen terug
function overSchans(tr, rp, { speed = PHYS.maxSpeed, before = 30 } = {}) {
  const k = createKart(0, tr, 0);
  const p = tr.pointAt(rp.s - before, rp.d);
  Object.assign(k, { x: p.x, z: p.z, h: p.h, vx: Math.sin(p.h) * speed, vz: Math.cos(p.h) * speed, lap: 1 });
  const loc = tr.locate(k.x, k.z); k.i = loc.i; k.s = loc.s;
  const ev = [];
  let maxY = 0, airSteps = 0;
  const env = { time: 0, laps: 3, emit: (t, d) => ev.push({ t, ...d }) };
  for (let n = 0; n < 200; n++) {
    env.time = n * DT;
    const tgt = tr.pointAt(k.s + 9, rp.d);
    const fx = Math.sin(k.h), fz = Math.cos(k.h);
    const dx = tgt.x - k.x, dz = tgt.z - k.z;
    const steer = Math.max(-1, Math.min(1, Math.atan2(dx * -fz + dz * fx, dx * fx + dz * fz) * 2.4));
    stepKart(k, { steer, gas: speed > 10 }, tr, env);
    maxY = Math.max(maxY, k.y);
    if (k.air) airSteps++;
  }
  return { k, ev, maxY, air: airSteps * DT, types: ev.map((e) => e.t) };
}

test('schansen: vliegen, door de boostring, en een landingsturbo', () => {
  const tr = buildTrack(TRACK_BY_ID.schansenpolder);
  assert.ok(tr.ramps.length >= 3, 'genoeg schansen');
  const rp = tr.ramps.find((r) => r.ring);
  const r = overSchans(tr, rp);
  assert.ok(r.types.includes('jump'), 'kart springt');
  assert.ok(r.maxY > 2.5, `hoog genoeg om over een kart te springen (${r.maxY.toFixed(1)} m)`);
  assert.ok(r.air > 0.6 && r.air < 1.6, `luchttijd ${r.air.toFixed(2)} s`);
  assert.ok(r.types.includes('ring'), 'door de boostring gevlogen');
  assert.ok(r.types.includes('land'), 'weer geland');
  assert.ok(r.ev.some((e) => e.t === 'boost' && e.src === 'land'), 'landingsturbo');
  assert.equal(r.k.y, 0, 'staat weer op de grond');
  // langzaam over de schans: nauwelijks een sprong, geen ring
  const slow = overSchans(tr, rp, { speed: 6, before: 8 });
  assert.ok(slow.maxY < 1.3, 'langzaam rol je er gewoon af');
  assert.ok(!slow.types.includes('ring'));
  // in de lucht stuur je minder
  assert.ok(JUMP.airSteer < 0.5);
});

test('elke schans op elke baan werkt, en elke ring is te halen', () => {
  for (const def of TRACKS) {
    const tr = buildTrack(def);
    for (const rp of tr.ramps) {
      const r = overSchans(tr, rp, { before: 26 });
      assert.ok(r.types.includes('jump'), `${def.id} schans ${rp.id} lanceert`);
      if (rp.ring) assert.ok(r.types.includes('ring'), `${def.id} ring achter schans ${rp.id} is te halen`);
      assert.ok(!r.types.includes('wall'), `${def.id} schans ${rp.id}: niet tegen de muur na de landing`);
    }
  }
});

test('in de lucht: over andere karts, plassen en obstakels heen, en de sloot', () => {
  const tr = buildTrack(TRACK_BY_ID.schansenpolder);
  const entrants = [0, 1].map((kid) => ({ kid, id: 'p' + kid, name: 'P' + kid, isBot: false }));
  const race = new Race({ track: tr, entrants, startDelay: 0 });
  race.update(0.001);
  const [a, b] = race.karts;
  const p = tr.pointAt(200, 0);
  b.x = p.x; b.z = p.z; b.vx = 0; b.vz = 0; b.y = 0;
  a.x = p.x - Math.sin(p.h) * 1.0; a.z = p.z - Math.cos(p.h) * 1.0; a.vx = Math.sin(p.h) * 25; a.vz = Math.cos(p.h) * 25;
  a.y = 2.5; a.air = 1;
  race.takeEvents();
  race.kartCollisions();
  assert.ok(!race.takeEvents().some((e) => e.type === 'bump'), 'wie vliegt, botst niet');
  assert.equal(b.bumpT, 0);
  a.y = 0; a.air = 0;
  race.kartCollisions();
  assert.ok(race.takeEvents().some((e) => e.type === 'bump'), 'op de grond wel');
  // de hoogte gaat mee over het netwerk
  a.y = 3.21;
  assert.equal(decodeVisual(encodeVisual(a)).y, 3.21);
  // sloot: zonder sprong word je flink afgeremd
  const zn = tr.zones.find((z) => z.type === 'water');
  assert.ok(zn, 'polder heeft sloten');
  assert.equal(tr.zoneAt(zn.s0 + 2, 0), 'water');
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
class MemKV {
  constructor() { this.data = new Map(); }
  async get(k) { return this.data.has(k) ? JSON.parse(this.data.get(k)) : null; }
  async set(k, v) { this.data.set(k, JSON.stringify(v)); }
  async del(k) { this.data.delete(k); }
}
let rs = 0;
const randomString = (n) => { rs++; return (`t${rs}`.padEnd(n, 'x') + 'abcdefghijklmnopqrstuvwxyz0123456789').slice(0, n).replace(/[^A-Za-z0-9_-]/g, 'y'); };
function makeHub(clockRef, extra = {}) {
  const store = new Profiles(new MemKV(), { randomString, now: () => clockRef.t });
  return new Hub({ store, now: () => clockRef.t, random: rng(9), ...extra });
}

function fakeConn(cookieDevice) {
  const c = { out: [], cookieDevice, send(t) { c.out.push(JSON.parse(t)); }, sendVolatile(t) { c.out.push(JSON.parse(t)); } };
  c.last = (type) => [...c.out].reverse().find((m) => m.t === type);
  return c;
}

async function newPlayer(hub, name, cookieDevice) {
  const c = fakeConn(cookieDevice);
  hub.connect(c);
  await hub.message(c, { t: 'hello' });
  await hub.message(c, { t: 'register', name });
  c.device = c.last('welcome').device;
  c.profile = c.last('loggedIn').profile;
  return c;
}

const flush = () => new Promise((r) => setTimeout(r, 5));

test('inloggen zonder PIN: telefoon onthoudt je, ook via het cookie', async () => {
  const clock = { t: Date.UTC(2026, 9, 6, 12) };
  const hub = makeHub(clock);
  const c = fakeConn();
  hub.connect(c);
  await hub.message(c, { t: 'hello' });
  const w = c.last('welcome');
  assert.equal(w.profile, null);
  assert.ok(isDeviceToken(w.device), 'server geeft een apparaatsleutel');
  await hub.message(c, { t: 'register', name: 'x' });
  assert.match(c.last('registerFailed').msg, /2 tot 16/);
  await hub.message(c, { t: 'register', name: 'Meke' });
  const li = c.last('loggedIn');
  assert.equal(li.profile.name, 'Meke');
  assert.equal(li.profile.mp, 150);
  // dezelfde telefoon later opnieuw (sleutel uit de browser)
  const c2 = fakeConn();
  hub.connect(c2);
  await hub.message(c2, { t: 'hello', device: w.device });
  assert.equal(c2.last('welcome').profile.name, 'Meke');
  // alleen het cookie (browseropslag gewist)
  const c3 = fakeConn(w.device);
  hub.connect(c3);
  await hub.message(c3, { t: 'hello' });
  assert.equal(c3.last('welcome').profile.name, 'Meke');
  // een ander apparaat zonder sleutel krijgt geen profiel
  const c4 = fakeConn();
  hub.connect(c4);
  await hub.message(c4, { t: 'hello', device: 'onzin' });
  assert.equal(c4.last('welcome').profile, null);
  // naam wijzigen
  await hub.message(c2, { t: 'rename', name: 'Meke de Snelle' });
  assert.equal(c2.last('profile').profile.name, 'Meke de Snelle');
});

test('overzetcode zet punten naar een nieuwe telefoon (eenmalig, verloopt)', async () => {
  const clock = { t: Date.UTC(2026, 9, 6, 12) };
  const hub = makeHub(clock);
  const oud = await newPlayer(hub, 'Nicole');
  const p = await hub.store.get(oud.profile.id);
  p.mp = 999;
  await hub.message(oud, { t: 'transferCode' });
  const code = oud.last('transferCode').code;
  assert.match(code, /^[A-Z2-9]{6}$/);
  const nieuw = fakeConn();
  hub.connect(nieuw);
  await hub.message(nieuw, { t: 'hello' });
  await hub.message(nieuw, { t: 'useTransfer', code: 'AAAAAA' });
  assert.match(nieuw.last('transferFailed').msg, /klopt niet/);
  await hub.message(nieuw, { t: 'useTransfer', code: code.toLowerCase() });
  const li = nieuw.last('loggedIn');
  assert.equal(li.profile.name, 'Nicole');
  assert.equal(li.profile.mp, 999);
  assert.equal(li.transferred, true);
  // nog een keer gebruiken kan niet
  const derde = fakeConn();
  hub.connect(derde);
  await hub.message(derde, { t: 'hello' });
  await hub.message(derde, { t: 'useTransfer', code });
  assert.ok(derde.last('transferFailed'));
  // verlopen code
  await hub.message(oud, { t: 'transferCode' });
  const code2 = oud.last('transferCode').code;
  clock.t += 16 * 60000;
  await hub.message(derde, { t: 'useTransfer', code: code2 });
  assert.match(derde.last('transferFailed').msg, /verlopen/);
});

test('server vergeten (gratis hosting herstart): de telefoon zet naam, MP en spullen terug', async () => {
  const clock = { t: Date.UTC(2026, 9, 6, 12) };
  const signer = makeSigner('test-geheim-voor-de-reservekopie');
  const hub = makeHub(clock, { signer });
  const a = await newPlayer(hub, 'Cherso');
  const p = await hub.store.get(a.profile.id);
  p.mp = 600;
  await hub.message(a, { t: 'buy', id: 'special_cherso' });
  await hub.message(a, { t: 'buy', id: 'kart_roze' });
  await hub.message(a, { t: 'equip', id: 'kart_roze' });
  const backup = a.last('profile').profile.backup;
  assert.ok(backup && backup.d && backup.s, 'telefoon krijgt een ondertekende reservekopie');
  const mp = a.last('profile').profile.mp;

  // nieuwe server zonder opslag, zelfde geheim
  const hub2 = makeHub(clock, { signer });
  const b = fakeConn();
  hub2.connect(b);
  await hub2.message(b, { t: 'hello', device: a.device, backup });
  const w = b.last('welcome').profile;
  assert.equal(w.name, 'Cherso');
  assert.equal(w.id, a.profile.id, 'zelfde profiel (en dus zelfde plek in de room)');
  assert.equal(w.mp, mp);
  assert.ok(w.owned.includes('special_cherso') && w.owned.includes('kart_roze'));
  assert.equal(w.equipped.kart, 'kart_roze');
  // daarna gewoon verder: kopen werkt en de server kent je weer
  await hub2.message(b, { t: 'buy', id: 'hoed_pet' });
  assert.ok(b.last('profile').profile.owned.includes('hoed_pet'));

  // aangepaste kopie (meer MP) wordt geweigerd
  const nep = JSON.parse(backup.d);
  nep.mp = 99999;
  const hub3 = makeHub(clock, { signer });
  const c = fakeConn();
  hub3.connect(c);
  await hub3.message(c, { t: 'hello', device: a.device, backup: { d: JSON.stringify(nep), s: backup.s } });
  assert.equal(c.last('welcome').profile, null, 'vervalste reservekopie telt niet');
  // ander geheim: ook geweigerd
  const hub4 = makeHub(clock, { signer: makeSigner('ander-geheim-123') });
  const d = fakeConn();
  hub4.connect(d);
  await hub4.message(d, { t: 'hello', device: a.device, backup });
  assert.equal(d.last('welcome').profile, null);
  // opschonen: onbekende spullen en vreemde getallen eruit
  const schoon = cleanBackup({ v: 1, key: 'abcdefghij', name: 'Test', mp: -5, owned: ['bestaat_niet', 'cape_rood'], equipped: { cape: 'cape_goud' } });
  assert.equal(schoon.mp, 0);
  assert.deepEqual(schoon.owned, ['cape_rood']);
  assert.equal(schoon.equipped.cape, 'cape_geen', 'niet gekochte cape kun je niet dragen');
  // zonder ondertekening (offline-demo) geen reservekopie
  const off = await newPlayer(makeHub(clock), 'Demo');
  assert.equal(off.profile.backup, undefined);
});

test('coureurs: Meke lang en dun, Nicole dikker, Cherso Duif de allerdikste', () => {
  const meke = lookScales({ ...cleanLook(CHARACTER_BY_ID.meke.look), ...CHARACTER_BY_ID.meke.look });
  const nicole = lookScales({ ...cleanLook(CHARACTER_BY_ID.nicole.look), ...CHARACTER_BY_ID.nicole.look });
  const cherso = lookScales({ ...cleanLook(CHARACTER_BY_ID.cherso.look), ...CHARACTER_BY_ID.cherso.look });
  assert.equal(CHARACTER_BY_ID.cherso.name, 'Cherso Duif');
  assert.ok(meke.hs > 1.3 && meke.ws < 0.8, 'Meke is lang en dun');
  assert.ok(nicole.ws > 1.2, 'Nicole is wat dikker');
  assert.ok(cherso.ws > nicole.ws, 'Cherso is dikker dan Nicole');
  // niemand (ook geen zelfgemaakte coureur) is dikker dan Cherso
  const maxCustom = Math.max(...Object.values(BUILDS).map((b) => b.s));
  assert.ok(cherso.ws > maxCustom, 'Cherso is de allerdikste');
  const maxH = Math.max(...Object.values(HEIGHTS).map((b) => b.s));
  assert.ok(meke.hs > maxH, 'Meke is de langste');
  // bots gebruiken geen zelfgemaakte coureur en geen specials
  assert.ok(!BOT_CHARACTERS.some((c) => c.custom || c.special));
  for (const id of ['meke', 'nicole', 'cherso']) assert.ok(CHARACTER_BY_ID[id].special, `${id} is een special`);
  assert.equal(racerName('Jort', 'meke'), 'Meke (Jort)');
  assert.equal(racerName('Meke', 'meke'), 'Meke');
  assert.equal(racerName('Jort', 'kees'), 'Jort');
});

test('alles is betaalbaar: een special heb je binnen 5 races', () => {
  // vier vrienden racen; wie steeds 3e wordt, verdient per race:
  const rows = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, place: i + 1, finished: true, bestLap: 50 + i }));
  const third = computePoints(rows).c.mp;
  const after5 = START_MP + 5 * third;
  const specials = SHOP_ITEMS.filter((i) => i.slot === 'special');
  assert.equal(specials.length, 3);
  for (const sp of specials) assert.ok(sp.price <= after5, `${sp.name} (${sp.price} MP) haalbaar na 5 races (${after5} MP)`);
  // zelfs wie 5 keer laatste wordt, kan elke special kopen
  const last = computePoints(rows).d.mp;
  for (const sp of specials) assert.ok(sp.price <= START_MP + 5 * last, `${sp.name} haalbaar na 5 keer laatste (${START_MP + 5 * last} MP)`);
  // geen enkel item kost meer dan zo'n 25 races, de gouden cape blijft het duurste
  const goud = SHOP_ITEMS.find((i) => i.id === 'cape_goud');
  assert.ok(goud.price <= 25 * third, 'gouden cape blijft bereikbaar');
  for (const it of SHOP_ITEMS) if (it.id !== 'cape_goud') assert.ok(it.price <= 450);
});

test('specials: eerst kopen, dan racen als "Meke (jouw naam)"', async () => {
  const clock = { t: Date.UTC(2026, 9, 6, 12) };
  const hub = makeHub(clock);
  const a = await newPlayer(hub, 'Jort');
  await hub.message(a, { t: 'create' });
  await hub.message(a, { t: 'char', id: 'meke' });
  assert.match(a.last('err').msg, /special/);
  assert.notEqual(a.last('room').players[0].character, 'meke');
  // genoeg MP sparen en kopen
  (await hub.store.get(a.profile.id)).mp = 400;
  await hub.message(a, { t: 'buy', id: 'special_meke' });
  assert.equal(a.last('profile').bought, 'special_meke');
  await hub.message(a, { t: 'equip', id: 'special_meke' });
  assert.equal(a.last('room').players[0].character, 'meke');
  await hub.message(a, { t: 'settings', settings: { bots: 1 } });
  await hub.message(a, { t: 'start' });
  const race = a.last('race');
  const mine = race.entrants.find((e) => e.kid === race.you);
  assert.equal(mine.name, 'Meke (Jort)');
  assert.ok(race.entrants.filter((e) => e.isBot).every((e) => !['meke', 'nicole', 'cherso'].includes(e.character)));
});

test('eigen coureur: ongeldige waarden worden vervangen, anderen zien je uiterlijk', async () => {
  const clock = { t: Date.UTC(2026, 9, 6, 12) };
  const hub = makeHub(clock);
  const a = await newPlayer(hub, 'Anna');
  const b = await newPlayer(hub, 'Bas');
  await hub.message(a, { t: 'create' });
  const code = a.last('room').code;
  await hub.message(b, { t: 'join', code });
  await hub.message(a, { t: 'look', use: true, look: { skin: '#ffe3cc', hair: 'krullen', hairColor: '#ff6fb0', shirt: '#000001', height: 'lang', build: 'reus', glasses: 'zonnebril', facial: 'snor' } });
  const saved = a.last('profile').profile.look;
  assert.equal(saved.hair, 'krullen');
  assert.equal(saved.shirt, cleanLook({}).shirt, 'onbekende kleur wordt standaard');
  assert.equal(saved.build, 'normaal', 'onbekende bouw wordt standaard');
  const seen = b.last('room').players.find((p) => p.name === 'Anna');
  assert.equal(seen.character, 'eigen');
  assert.equal(seen.look.hairColor, '#ff6fb0');
  // dezelfde naam in één room krijgt een nummer
  const anna2 = await newPlayer(hub, 'Anna');
  await hub.message(anna2, { t: 'join', code });
  assert.ok(a.last('room').players.some((p) => p.name === 'Anna 2'));
});

test('oefenmodus met bots: race tot uitslag, punten, dagbonus en titels', async () => {
  const clock = { t: Date.UTC(2026, 9, 6, 12) };
  const hub = makeHub(clock, { laps: 1 });
  const conn = await newPlayer(hub, 'Jort');
  const myId = conn.profile.id;
  await hub.message(conn, { t: 'create', practice: true });
  assert.equal(conn.last('room').practice, true);
  await hub.message(conn, { t: 'settings', settings: { trackId: 'karnemelkhoeve', bots: 4, botLevel: 'makkelijk' } });
  const runRace = async () => {
    const before = conn.out.filter((m) => m.t === 'results').length;
    await hub.message(conn, { t: before ? 'again' : 'start' });
    const race = conn.last('race');
    assert.equal(race.entrants.length, 5);
    assert.ok(race.entrants.filter((e) => e.isBot).every((e) => !['eigen'].includes(e.character)));
    const tr = buildTrack(TRACK_BY_ID[race.trackId]);
    const pred = new Predictor(tr, race.you, race.you, race.laps);
    let seqStart = 1;
    let buf = [];
    let horned = false;
    for (let n = 0; n < 60 * 200 && conn.out.filter((m) => m.t === 'results').length === before; n++) {
      clock.t += 1000 / 60;
      const rt = (clock.t - race.startAt) / 1000;
      if (rt >= 0) {
        const r = pred.step(botInput(pred.kart, tr, { time: rt }), rt);
        buf.push(r.packed);
        if (buf.length === 3) { await hub.message(conn, { t: 'in', s: seqStart, i: buf }); seqStart += 3; buf = []; }
        if (!horned && rt > 2) { horned = true; await hub.message(conn, { t: 'horn' }); await hub.message(conn, { t: 'horn' }); }
      }
      hub.tick();
      const s = conn.out.length && conn.out[conn.out.length - 1];
      if (s && s.t === 's' && s.me) pred.reconcile(s.me);
      if (n % 30 === 0) await flush();
    }
    await flush();
    return conn.last('results');
  };
  const res = await runRace();
  assert.ok(res, 'uitslag ontvangen');
  assert.equal(res.rows.length, 5);
  const me = res.rows.find((r) => r.id === myId);
  assert.ok(me.finished, 'speler is gefinisht');
  assert.ok(me.parts.some((p) => p.label.startsWith('Dagbonus')), 'eerste race van de dag: dagbonus');
  assert.ok(Array.isArray(res.awards));
  const horns = conn.out.filter((m) => m.t === 's').flatMap((m) => m.ev).filter((e) => e.type === 'horn');
  assert.equal(horns.length, 1, 'toeteren heeft een korte pauze');
  const prof = conn.last('profile');
  assert.equal(prof.profile.mp, 150 + me.mp);
  assert.equal(prof.profile.stats.races, 1);
  // tweede race dezelfde dag: geen dagbonus
  const res2 = await runRace();
  const me2 = res2.rows.find((r) => r.id === myId);
  assert.ok(!me2.parts.some((p) => p.label.startsWith('Dagbonus')));
  // volgende dag weer wel
  clock.t += 24 * 3600 * 1000;
  const res3 = await runRace();
  assert.ok(res3.rows.find((r) => r.id === myId).parts.some((p) => p.label.startsWith('Dagbonus')));
});

test('race-titels: wie het vaakst ramt wordt Botskampioen', () => {
  const tr = buildTrack(TRACK_BY_ID.zandstorm);
  const entrants = [0, 1].map((kid) => ({ kid, id: 'p' + kid, name: 'P' + kid, isBot: false }));
  const race = new Race({ track: tr, entrants, startDelay: 0 });
  race.update(0.001);
  const [a, b] = race.karts;
  const p = tr.pointAt(200, 0);
  for (let n = 0; n < 3; n++) {
    race.time += 1;
    b.x = p.x; b.z = p.z; b.vx = 0; b.vz = 0; b.shieldT = 0;
    a.x = p.x - Math.sin(p.h) * 2.2; a.z = p.z - Math.cos(p.h) * 2.2; a.vx = Math.sin(p.h) * 25; a.vz = Math.cos(p.h) * 25;
    race.kartCollisions();
  }
  const aw = race.awards();
  const champ = aw.find((x) => x.key === 'botskampioen');
  assert.ok(champ && champ.name === 'P0');
  assert.ok(aw.find((x) => x.key === 'pechvogel').name === 'P1');
});

test('lobby: klaar-status, host-rechten, vol, verkeerde code en herverbinden', async () => {
  const clock = { t: 5_000_000 };
  const hub = makeHub(clock);
  const conns = [];
  for (let i = 0; i < 11; i++) conns.push(await newPlayer(hub, 'Speler' + i));
  await hub.message(conns[0], { t: 'create' });
  const code = conns[0].last('room').code;
  assert.match(code, /^[A-Z]{4}$/);
  await hub.message(conns[1], { t: 'join', code: 'ZZZZ' === code ? 'YYYY' : 'ZZZZ' });
  assert.match(conns[1].last('joinFailed').msg, /bestaat niet/);
  for (let i = 1; i < 10; i++) await hub.message(conns[i], { t: 'join', code: code.toLowerCase() });
  await hub.message(conns[10], { t: 'join', code });
  assert.match(conns[10].last('joinFailed').msg, /vol/);
  assert.equal(conns[0].last('room').players.length, 10);
  await hub.message(conns[3], { t: 'start' });
  assert.match(conns[3].last('err').msg, /host/);
  await hub.message(conns[0], { t: 'start' });
  assert.equal(conns[0].last('notReady').names.length, 9);
  for (let i = 1; i < 10; i++) await hub.message(conns[i], { t: 'ready', on: true });
  assert.ok(conns[0].last('room').players.every((p) => p.host || p.ready));
  await hub.message(conns[0], { t: 'start' });
  const raceMsg = conns[5].last('race');
  assert.ok(raceMsg && raceMsg.entrants.length === 10);
  // speler 5 valt weg en komt terug op een nieuwe verbinding (zelfde telefoon)
  hub.disconnect(conns[5]);
  clock.t += 3000; hub.tick();
  assert.equal(conns[0].last('room').players.find((p) => p.name === 'Speler5').connected, false);
  const back = fakeConn();
  hub.connect(back);
  await hub.message(back, { t: 'hello', device: conns[5].device });
  assert.equal(back.last('welcome').profile.name, 'Speler5');
  await hub.message(back, { t: 'join', code });
  assert.equal(back.last('race').you, raceMsg.you, 'zelfde kart terug');
  assert.equal(conns[0].last('room').players.find((p) => p.name === 'Speler5').connected, true);
  await hub.message(conns[0], { t: 'leave' });
  assert.equal(conns[1].last('room').host, conns[1].profile.id);
});
