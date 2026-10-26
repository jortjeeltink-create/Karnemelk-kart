// Borrelbord online: gooien en kiezen via de telefoon, een duel met twee telefoons, en wie weg is slaat over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZuipbordHub } from '../public/shared/zuipbordhub.js';

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
  const hub = new ZuipbordHub({ now, log: () => {}, build: 'z1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('de host gooit als eerste; iedereen ziet de pion lopen en wat er op het vakje gebeurt', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const s = phones[1].state();
  assert.deepEqual([s.phase, s.turn, s.build], ['gooien', 0, 'z1']);
  assert.ok(s.players.every((p) => p.pos === 0));
  phones[1].say({ t: 'roll' });
  assert.equal(phones[2].state().players[1].pos, 0, 'niet aan de beurt');
  phones[0].say({ t: 'roll' });
  const after = phones[2].state();
  const worp = after.log.find((e) => e.type === 'worp');
  assert.ok(worp.v >= 1 && worp.v <= 6);
  assert.equal(after.players[0].pos, t.g.players[0].pos);
  assert.ok(after.log.some((e) => e.type === 'vak'));
  // moest de host iemand kiezen, dan kiest hij Meke
  if (after.phase === 'kiezen') {
    phones[0].say({ t: 'choose', target: 0 });
    assert.equal(phones[2].state().phase, 'kiezen', 'niet jezelf');
    phones[0].say({ t: 'choose', target: 1 });
  }
  // een duel of dubbel of niks: nog even gooien
  if (t.g.phase === 'duel') { phones[0].say({ t: 'roll' }); phones[1].say({ t: 'roll' }); }
  if (t.g.phase === 'dubbel') phones[0].say({ t: 'roll' });
  assert.equal(phones[2].state().phase, 'gooien');
  assert.notEqual(phones[2].state().turn, 0);
});

test('wie weg is slaat over, nieuwe spelers beginnen op start, en na de finish start de host een nieuw potje', () => {
  const { hub, phones, code, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  hub.disconnect(phones[1].conn);
  t.g.turn = 0;
  for (let n = 0; n < 4; n++) {
    if (t.g.phase === 'kiezen') phones[t.g.turn].say({ t: 'choose', target: t.g.turn === 0 ? 2 : 0 });
    else phones[t.g.turn].say({ t: 'roll' });
    assert.notEqual(t.g.turn, 1, 'Meke is weg');
  }
  const late = phone(hub, 9);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(late.state().players[3].pos, 0);
  t.g.players[0].pos = 45; t.g.turn = 0; t.g.phase = 'gooien';
  for (let n = 0; t.g.phase !== 'klaar' && n < 400; n++) {
    const p = t.g.turn, by = (i) => [phones[0], null, phones[2], late][i];
    if (t.g.phase === 'kiezen') by(p).say({ t: 'choose', target: p === 0 ? 2 : 0 });
    else if (t.g.phase === 'duel') by(t.g.duel.ra == null ? t.g.duel.a : t.g.duel.b).say({ t: 'roll' });
    else by(p).say({ t: 'roll' });
  }
  assert.equal(t.g.phase, 'klaar');
  phones[2].say({ t: 'next' });
  assert.equal(t.g.phase, 'klaar', 'alleen de host');
  phones[0].say({ t: 'next' });
  assert.equal(late.state().phase, 'gooien');
  assert.ok(late.state().players.every((p) => p.pos === 0));
});

test('een duel: allebei gooien op je eigen telefoon; wie weggaat, daarvoor gooit de telefoon', () => {
  const { hub, phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  // Jort staat op een duel en kiest Meke
  Object.assign(t.g, { phase: 'kiezen', turn: 0, pending: { kind: 'duel', n: 2 } });
  phones[0].say({ t: 'choose', target: 1 });
  let s = phones[2].state();
  assert.equal(s.phase, 'duel');
  assert.deepEqual([s.duel.a, s.duel.b, s.duel.ra, s.duel.rb], [0, 1, null, null]);
  phones[2].say({ t: 'roll' });
  assert.equal(phones[2].state().duel.ra, null, 'Sim doet niet mee');
  phones[0].say({ t: 'roll' });
  phones[0].say({ t: 'roll' });
  s = phones[2].state();
  assert.ok(s.duel.ra >= 1);
  assert.equal(s.duel.rb, null, 'Jort gooit niet voor Meke');
  assert.equal(s.log.filter((e) => e.type === 'duelworp').length, 1);
  // Meke gaat weg: de telefoon gooit voor Meke (bij gelijk gooit Jort zelf nog een keer)
  hub.disconnect(phones[1].conn);
  if (t.g.phase === 'duel') phones[0].say({ t: 'roll' });
  for (let n = 0; t.g.phase === 'duel' && n < 20; n++) phones[0].say({ t: 'roll' });
  assert.equal(t.g.phase, 'gooien');
  assert.ok(phones[2].state().log.some((e) => e.type === 'duel' && e.drinks));
});
