// Arena online: inzetten blijven geheim tot het duel begint, de host helpt wie weg is, en de server kijkt zelf op de klok.
// Plus de pagina en het adres op de server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ArenaHub } from '../public/shared/arenahub.js';
import * as A from '../public/shared/arena.js';
import { startServer } from './helpers.js';

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
  const klok = { t: 7_000_000 };
  const hub = new ArenaHub({ now: () => klok.t, log: () => {}, build: 't1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, klok, t: hub.tables.get(code) };
}
// Jort (0) en Meke (1) de arena in voor het gekozen minispel
function arena(names, spel) {
  const x = table(names);
  x.phones[0].say({ t: 'start' });
  const g = x.t.g;
  g.a = 0; g.b = 1; g.spel = spel;
  return { ...x, g };
}

test('de host kiest het aantal rondes en start; met z\'n tweeën kan het niet', () => {
  const duo = table(['Jort', 'Meke']);
  duo.phones[0].say({ t: 'start' });
  assert.equal(duo.t.g, null);
  const { phones } = table(['Jort', 'Meke', 'Sim']);
  phones[1].say({ t: 'settings', rondes: 6 });
  assert.equal(phones[0].state().rondes, A.LENGTE_DEFAULT, 'alleen de host');
  phones[0].say({ t: 'settings', rondes: 7 });
  assert.equal(phones[0].state().rondes, A.LENGTE_DEFAULT, 'alleen de vaste lengtes');
  phones[0].say({ t: 'settings', rondes: 6 });
  phones[0].say({ t: 'start' });
  const s = phones[2].state();
  assert.deepEqual([s.phase, s.ronde, s.rondes], ['inzet', 1, 6]);
  assert.ok(s.players.every((p) => p.munten === A.START_MUNTEN));
  assert.ok(A.SPELLEN.includes(s.spel));
});

test('een inzet blijft geheim tot het duel begint', () => {
  const { phones, g } = arena(['Jort', 'Meke', 'Sim', 'Bas'], 'sps');
  phones[2].say({ t: 'bet', op: 0, n: 3 });
  assert.deepEqual(phones[2].state().bets, { 2: { op: 0, n: 3 } }, 'je eigen inzet zie je');
  assert.deepEqual(phones[3].state().bets, { 2: { n: -1 } }, 'van een ander alleen dat het gedaan is');
  assert.deepEqual(phones[0].state().wacht, [3]);
  assert.ok(!JSON.stringify(phones[0].state()).includes('"op"'));
  phones[3].say({ t: 'bet', op: 1, n: 1 });
  const s = phones[0].state();
  assert.equal(s.phase, 'duel');
  assert.deepEqual(s.bets, { 2: { op: 0, n: 3 }, 3: { op: 1, n: 1 } }, 'nu ligt alles open');
  assert.equal(g.phase, 'duel');
});

test('steen, papier, schaar: je ziet de keuze van de ander niet voor je zelf gekozen hebt', () => {
  const { phones } = arena(['Jort', 'Meke', 'Sim'], 'sps');
  phones[2].say({ t: 'bet', op: 0, n: 1 });
  phones[2].say({ t: 'kies', k: 'steen' });
  assert.equal(phones[0].state().duel.gekozen[0], false, 'alleen de twee in de arena');
  phones[0].say({ t: 'kies', k: 'steen' });
  const meke = phones[1].state().duel;
  assert.deepEqual([meke.gekozen[0], meke.mijn], [true, null]);
  assert.ok(!JSON.stringify(phones[1].state().duel).includes('steen'));
  assert.equal(phones[0].state().duel.mijn, 'steen');
  phones[1].say({ t: 'kies', k: 'schaar' });
  assert.deepEqual(phones[2].state().duel.score, { 0: 1, 1: 0 });
  assert.deepEqual(phones[2].state().duel.rondjes[0], { 0: 'steen', 1: 'schaar', w: 0 });
  phones[0].say({ t: 'kies', k: 'papier' }); phones[1].say({ t: 'kies', k: 'steen' });
  const s = phones[2].state();
  assert.equal(s.phase, 'uitslag');
  assert.deepEqual([s.last.winner, s.last.loser], [0, 1]);
  assert.equal(s.players[2].munten, A.START_MUNTEN + 1);
  assert.equal(s.players[1].straf, A.VERLIES_STRAF);
  // alleen de host gaat door
  phones[1].say({ t: 'next' });
  assert.equal(phones[0].state().phase, 'uitslag');
  phones[0].say({ t: 'next' });
  assert.deepEqual([phones[0].state().phase, phones[0].state().ronde], ['inzet', 2]);
});

test('valse start: de server zegt over hoeveel tellen het groen wordt en kijkt zelf op de klok', () => {
  const { phones, klok, g } = arena(['Jort', 'Meke', 'Sim'], 'reactie');
  phones[2].say({ t: 'bet', op: 1, n: 2 });
  const d = phones[0].state().duel;
  assert.equal(d.spel, 'reactie');
  assert.equal(d.over, g.duel.goAt - klok.t);
  assert.deepEqual(d.nep, g.duel.nep, 'de nepseintjes');
  // tikken voor het groen is en zeggen dat je op tijd was: dat gelooft de server niet
  phones[0].say({ t: 'tik', ms: 150 });
  assert.equal(phones[0].state().duel.klaar[0], false);
  klok.t = g.duel.goAt + 400;
  phones[0].say({ t: 'tik', ms: 250 });
  phones[1].say({ t: 'tik', ms: 380 });
  const s = phones[2].state();
  assert.deepEqual([s.phase, s.last.winner], ['uitslag', 0]);
  assert.deepEqual([s.players[2].munten, s.players[2].straf], [A.START_MUNTEN - 2, 2], 'fout gegokt');
});

test('snelle som: iedereen ziet de vraag, niemand het goede antwoord', () => {
  const { phones, klok, g } = arena(['Jort', 'Meke', 'Sim'], 'som');
  phones[2].say({ t: 'bet', op: 0, n: 1 });
  const d = phones[1].state().duel;
  assert.deepEqual(d.vraag, g.duel.vraag);
  assert.equal(d.over, g.duel.startAt - klok.t);
  assert.ok(!('goed' in d) && !JSON.stringify(phones[1].state()).includes('oplossing'));
  klok.t = g.duel.startAt + 3000;
  phones[2].say({ t: 'antw', k: g.duel.goed, ms: 500 });
  assert.equal(g.phase, 'duel', 'alleen de twee in de arena');
  phones[0].say({ t: 'antw', k: (g.duel.goed + 1) % 3, ms: 900 });
  assert.deepEqual(phones[2].state().duel.klaar, { 0: true, 1: false });
  phones[1].say({ t: 'antw', k: g.duel.goed, ms: 2800 });
  const s = phones[2].state();
  assert.deepEqual([s.phase, s.last.winner, s.last.detail.ms[0]], ['uitslag', 1, -1]);
  assert.match(s.last.detail.quiz, / = \d+$/);
});

test('de nieuwe minispellen: wat je telefoon nodig heeft, zonder het goede antwoord', () => {
  for (const spel of ['vast', 'volgorde', 'doelen', 'stippen', 'geheugen', 'vreemd', 'meeste', 'pijl', 'hoogste']) {
    const { phones, g, klok } = arena(['Jort', 'Meke', 'Sim'], spel);
    phones[2].say({ t: 'bet', op: 0, n: 1 });
    const d = phones[1].state().duel;
    assert.equal(d.over, g.duel.startAt - klok.t, spel);
    if (spel === 'vast') assert.equal(d.doel, g.duel.doel);
    else if (A.soort(spel) === 'race') assert.deepEqual(d.veld, g.duel.veld);
    else { assert.deepEqual(d.vraag, g.duel.vraag); assert.ok(!('goed' in d)); }
  }
  // 1 tot 9 via de telefoon
  const { phones, g, klok } = arena(['Jort', 'Meke', 'Sim'], 'volgorde');
  phones[2].say({ t: 'bet', op: 1, n: 2 });
  klok.t = g.duel.startAt + 6000;
  phones[0].say({ t: 'race', ms: 5200 });
  phones[1].say({ t: 'race', ms: 4800 });
  assert.equal(phones[2].state().last.winner, 1);
  // één eronder via de telefoon
  const b = arena(['Jort', 'Meke', 'Sim'], 'bieden');
  b.phones[2].say({ t: 'bet', op: 0, n: 1 });
  b.phones[0].say({ t: 'kies', k: '3' });
  b.phones[1].say({ t: 'kies', k: '5' });
  assert.deepEqual(b.phones[2].state().duel.rondjes[0], { 0: '3', 1: '5', w: 1 });
});

test('de tijd is om: elke telefoon mag het melden, maar pas als het echt zo is', () => {
  const { phones, klok, g } = arena(['Jort', 'Meke', 'Sim'], 'stop');
  phones[2].say({ t: 'bet', op: 0, n: 1 });
  klok.t = g.duel.startAt + 9200;
  phones[0].say({ t: 'stop', ms: 9200 });
  phones[2].say({ t: 'tijd' });
  assert.equal(phones[2].state().phase, 'duel', 'nog niet');
  klok.t = g.duel.deadline + 1;
  phones[2].say({ t: 'tijd' });
  const s = phones[2].state();
  assert.deepEqual([s.phase, s.last.winner, s.last.detail.tijdOm], ['uitslag', 0, true]);
});

test('wie weg is: de host laat de inzet overslaan en geeft het duel op', () => {
  const { phones, hub, g } = arena(['Jort', 'Meke', 'Sim', 'Bas'], 'tikken');
  phones[2].say({ t: 'bet', op: 0, n: 1 });
  // Bas zit er nog: overslaan kan niet
  phones[0].say({ t: 'skipbet', for: 3 });
  assert.equal(g.phase, 'inzet');
  hub.disconnect(phones[3].conn);
  assert.equal(g.phase, 'duel', 'Bas ging weg: de rest is klaar');
  // Meke valt weg tijdens het duel: alleen de host kan voor haar opgeven
  phones[2].say({ t: 'opgeven', for: 1 });
  assert.equal(g.phase, 'duel');
  phones[0].say({ t: 'opgeven', for: 1 });
  assert.equal(g.phase, 'duel', 'ze zit er nog');
  hub.disconnect(phones[1].conn);
  phones[0].say({ t: 'opgeven', for: 1 });
  assert.deepEqual([g.phase, g.last.winner], ['uitslag', 0]);
  // zelf opgeven kan altijd
  const y = arena(['Jort', 'Meke', 'Sim'], 'tikken');
  y.phones[2].say({ t: 'bet', op: 0, n: 1 });
  y.phones[1].say({ t: 'opgeven' });
  assert.equal(y.g.phase, 'duel', 'opgeven is alleen voor wie weg is');
});

test('tijdens een potje aanschuiven kan: je begint met een verse stapel munten', () => {
  const { phones, t, hub } = arena(['Jort', 'Meke', 'Sim'], 'sps');
  const late = phone(hub, 9);
  late.say({ t: 'join', code: t.code, name: 'Laat', token: late.token });
  const s = late.state();
  assert.equal(s.players.length, 4);
  assert.equal(s.players[3].munten, A.START_MUNTEN);
  assert.ok(phones[0].state().wacht.includes(3), 'en mag meteen inzetten');
});

test('de server: /arena en een tafellink openen de pagina; die laadt de spelregels en de review-vraag', async () => {
  const srv = await startServer();
  try {
    for (const path of ['/arena', '/arena/ABCD']) {
      const r = await fetch(srv.url + path);
      assert.equal(r.status, 200, path);
      assert.match(await r.text(), /<title>Arena<\/title>/);
    }
    assert.equal((await fetch(srv.url + '/shared/arena.js')).status, 200);
    assert.equal((await fetch(srv.url + '/arena.webmanifest')).status, 200);
    assert.equal((await fetch(srv.url + '/img/arena-192.png')).status, 200);
  } finally {
    await srv.stop();
  }
  const html = readFileSync(new URL('../public/arena.html', import.meta.url), 'utf8');
  for (const s of ['/js/poort.js', '/js/slok.js', '/js/uitleg.js', '/js/review.js']) assert.ok(html.includes(`<script src="${s}" defer></script>`), s);
  assert.ok(html.includes("SpelkeetReview.stand('arena', m.phase,") && html.includes("SpelkeetReview.stand('arena', null, 0)"));
  assert.ok(html.includes("import * as A from '/shared/arena.js';") && html.includes('/ws/arena`'));
  assert.ok(!/alcohol|18\+|slokken|een slok\b/i.test(html), 'strafpunten, geen slokken; geen 18+');
});
