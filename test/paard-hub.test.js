// Paardenrace online: inzetten via de telefoon, de race begint als iedereen klaar is, en de stapel blijft geheim.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PaardHub } from '../public/shared/paardhub.js';

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
  const hub = new PaardHub({ now, log: () => {}, build: 'p1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('inzetten via de telefoon; als iedereen klaar is begint de race en blijft de stapel geheim', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[1].say({ t: 'start' });
  assert.equal(t.g, null, 'alleen de host start');
  phones[0].say({ t: 'start' });
  assert.equal(phones[2].state().phase, 'inzetten');
  phones[0].say({ t: 'bet', horse: 0, bet: 3, ready: true });
  phones[1].say({ t: 'bet', horse: 2, bet: 99, ready: true });
  assert.equal(phones[2].state().players[1].ready, false, 'te hoge inzet');
  phones[1].say({ t: 'bet', horse: 2, bet: 2, ready: false });
  assert.deepEqual(phones[2].state().players.map((p) => [p.horse, p.bet, p.ready]), [[0, 3, true], [2, 2, false], [-1, 2, false]]);
  phones[1].say({ t: 'go' });
  assert.equal(t.g.phase, 'inzetten', 'alleen de host kan eerder beginnen');
  phones[1].say({ t: 'bet', horse: 2, bet: 2, ready: true });
  phones[2].say({ t: 'bet', horse: 2, bet: 1, ready: true });
  const s = phones[1].state();
  assert.equal(s.phase, 'race', 'iedereen klaar: de race begint vanzelf');
  assert.deepEqual(s.racers, [0, 1, 2]);
  assert.deepEqual(s.players.map((p) => p.sips), [3, 2, 1], 'de inzet drink je vooraf');
  assert.deepEqual(s.track, Array(7).fill(null), 'de kaarten naast de baan liggen dicht');
  assert.equal(s.pileLeft, 41);
  assert.equal(JSON.stringify(s).includes('"pile"'), false, 'de stapel blijft op de server');
  assert.equal(s.build, 'p1');

  const turn = s.turn, other = (turn + 1) % 3;
  phones[other].say({ t: 'draw' });
  assert.equal(phones[0].state().pileLeft, 41, 'niet aan de beurt');
  phones[turn].say({ t: 'draw' });
  const after = phones[0].state();
  assert.equal(after.pileLeft, 40);
  assert.ok(after.log.some((e) => e.type === 'kaart'));
  assert.equal(after.pos.reduce((a, b) => a + b, 0), 1);
  assert.deepEqual(after.last, t.g.last);
});

test('de host kan beginnen met wie klaar is; wie weg is slaat over en een race loopt altijd uit', () => {
  const { hub, phones, code, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  phones[0].say({ t: 'bet', horse: 1, bet: 2, ready: true });
  phones[0].say({ t: 'go' });
  assert.equal(t.g.phase, 'inzetten', 'met één speler kan het niet');
  phones[2].say({ t: 'bet', horse: 3, bet: 2, ready: true });
  phones[0].say({ t: 'go' });
  assert.equal(t.g.phase, 'race');
  assert.deepEqual(t.g.racers, [0, 2], 'Meke kijkt deze race mee');
  const late = phone(hub, 9);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(t.g.players.length, 4);
  // Sim valt weg: de beurt gaat naar Jort, en als Jort aan de beurt is, trekt hij elke keer
  hub.disconnect(phones[2].conn);
  for (let n = 0; t.g.phase === 'race' && n < 60; n++) {
    assert.equal(t.g.turn, 0);
    phones[0].say({ t: 'draw' });
  }
  assert.equal(t.g.phase, 'uitslag');
  const s = late.state();
  assert.ok(s.winner >= 0);
  assert.equal(s.drinks.length, 4);
  phones[1].say({ t: 'next' });
  assert.equal(t.g.phase, 'uitslag', 'alleen de host gaat door');
  phones[0].say({ t: 'next' });
  assert.equal(late.state().phase, 'inzetten');
  phones[0].say({ t: 'again' });
  assert.equal(late.state().phase, 'lobby', 'de host kan altijd terug naar de lobby');
});
