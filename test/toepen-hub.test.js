// Toepen online: iedereen ziet alleen zijn eigen kaarten, kloppen en passen via de telefoon, en de host speelt voor
// wie weg is. Plus de pagina en het adres op de server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ToepenHub } from '../public/shared/toepenhub.js';
import { startServer } from './helpers.js';

const now = () => 7_000_000;
const token = (n) => `telefoon-${String(n).padStart(10, '0')}`;

function phone(hub, n) {
  const p = { token: token(n), last: {} };
  p.conn = { send: (text) => { const m = JSON.parse(text); p.last[m.t] = m; }, close() {} };
  p.say = (msg) => hub.message(p.conn, msg);
  p.state = () => p.last.state;
  hub.connect(p.conn);
  return p;
}

function table(names) {
  const hub = new ToepenHub({ now, log: () => {}, build: 't1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('de host kiest de grens en start; iedereen ziet alleen zijn eigen vier kaarten', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[1].say({ t: 'settings', limit: 15 });
  assert.equal(phones[0].state().limit, 10, 'alleen de host');
  phones[0].say({ t: 'settings', limit: 15 });
  assert.equal(phones[2].state().limit, 15);
  phones[0].say({ t: 'start' });
  const s = phones[1].state();
  assert.deepEqual([s.phase, s.limit, s.stake, s.round], ['spelen', 15, 1, 1]);
  assert.equal(s.hand.length, 4);
  assert.deepEqual(s.hand, t.g.hands[1], 'je eigen kaarten');
  assert.ok(s.players.every((p) => p.cards === 4));
  const raw = JSON.stringify(s);
  for (const c of t.g.hands[0]) assert.ok(!raw.includes(JSON.stringify(c)) || t.g.hands[1].some((x) => x.r === c.r && x.s === c.s), 'geen kaarten van een ander');
  // tijdens een potje kan er niemand bij
  const late = phone(t.hub, 9);
  late.say({ t: 'join', code: t.code, name: 'Laat', token: late.token });
  assert.equal(late.last.joinFailed.msg.includes('getoept'), true);
});

test('een kaart opleggen, kloppen en passen via de telefoon', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const g = t.g, first = g.turn;
  const other = (first + 1) % 3;
  // niet aan de beurt: er gebeurt niks
  phones[other].say({ t: 'play', card: g.hands[other][0] });
  assert.equal(g.trick.length, 0);
  const card = phones[first].state().hand.find((_, k) => phones[first].state().legal[k]);
  phones[first].say({ t: 'play', card });
  assert.equal(g.trick.length, 1);
  assert.equal(phones[other].state().trick[0].card.r, card.r);
  // kloppen: de rest kiest
  phones[other].say({ t: 'klop' });
  assert.equal(phones[first].state().phase, 'klop');
  assert.deepEqual(phones[first].state().klop.wait.sort(), [0, 1, 2].filter((p) => p !== other).sort());
  const third = [0, 1, 2].find((p) => p !== first && p !== other);
  phones[first].say({ t: 'mee' });
  phones[third].say({ t: 'pas' });
  const s = phones[first].state();
  assert.deepEqual([s.phase, s.stake, s.players[third].pts, s.players[third].inRound], ['spelen', 2, 1, false]);
});

test('is wie aan de beurt is weg, dan speelt de host de laagste kaart die mag; bij een klop gaat wie weg is mee', () => {
  const { phones, t, hub } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const g = t.g;
  // laat speler 1 aan de beurt zijn en weggaan
  g.turn = g.leader = 1;
  hub.disconnect(phones[1].conn);
  phones[2].say({ t: 'play' });
  assert.equal(g.trick.length, 0, 'alleen de host');
  phones[0].say({ t: 'play' });
  assert.equal(g.trick.length, 1);
  assert.equal(g.trick[0].p, 1);
  // een klop: wie weg is, gaat vanzelf mee
  phones[0].say({ t: 'klop' });
  assert.deepEqual(g.klop.wait, [2]);
  phones[2].say({ t: 'mee' });
  assert.deepEqual([g.phase, g.stake], ['spelen', 2]);
});

test('de server: /toepen en een tafellink openen de pagina; die laadt de spelregels en de review-vraag', async () => {
  const srv = await startServer();
  try {
    for (const path of ['/toepen', '/toepen/ABCD']) {
      const r = await fetch(srv.url + path);
      assert.equal(r.status, 200, path);
      assert.match(await r.text(), /<title>Toepen<\/title>/);
    }
    assert.equal((await fetch(srv.url + '/shared/toepen.js')).status, 200);
    assert.equal((await fetch(srv.url + '/toepen.webmanifest')).status, 200);
    assert.equal((await fetch(srv.url + '/img/toepen-192.png')).status, 200);
  } finally {
    await srv.stop();
  }
  const html = readFileSync(new URL('../public/toepen.html', import.meta.url), 'utf8');
  for (const s of ['/js/poort.js', '/js/slok.js', '/js/uitleg.js', '/js/review.js']) assert.ok(html.includes(`<script src="${s}" defer></script>`), s);
  assert.ok(html.includes("SpelkeetReview.stand('toepen', m.phase,") && html.includes("SpelkeetReview.stand('toepen', null, 0)"));
  assert.ok(html.includes("import * as T from '/shared/toepen.js';") && html.includes('/ws/toepen`'));
  assert.ok(!/dark-?mark|alcohol|18\+/i.test(html), 'geen verwijzingen naar andere sites, geen 18+');
});
