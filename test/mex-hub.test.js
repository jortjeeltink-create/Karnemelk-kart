// Mexen online: gooien via de telefoon, de host die invalt, de volgende ronde en de inzet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MexHub } from '../public/shared/mexhub.js';
import * as M from '../public/shared/mex.js';

const now = () => 9_000_000;
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
  const hub = new MexHub({ now, log: () => {}, build: 'm1' });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('inzet kiezen en starten: de host gooit als eerste en iedereen ziet de worp', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[1].say({ t: 'settings', stake: 3 });
  assert.equal(phones[0].state().stake, M.STAKE_DEFAULT, 'alleen de host');
  phones[0].say({ t: 'settings', stake: 2 });
  assert.equal(phones[2].state().stake, 2);
  phones[0].say({ t: 'start' });
  const s = phones[1].state();
  assert.equal(s.phase, 'gooien');
  assert.deepEqual(s.order, [0, 1, 2]);
  assert.equal(s.thrower, 0);
  phones[1].say({ t: 'roll' });
  assert.equal(t.g.count[1], 0, 'Meke is niet aan de beurt');
  phones[0].say({ t: 'roll' });
  assert.equal(t.g.count[0], 1);
  assert.deepEqual(phones[2].state().dice[0], t.g.dice[0], 'iedereen ziet de stenen');
  assert.equal(phones[2].state().log.at(-1).type, 'worp');
  assert.equal(phones[0].state().build, 'm1');
});

test('een hele ronde via de telefoons; de verliezer of de host begint de volgende', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const g = t.g;
  let guard = 0;
  while (g.phase !== 'uitslag' && guard++ < 50) phones[M.thrower(g)].say({ t: g.phase === 'gooien' && g.count[M.thrower(g)] ? 'stand' : 'roll' });
  assert.equal(g.phase, 'uitslag');
  const loser = g.loser, other = [0, 1, 2].find((p) => p !== loser && p !== 0);
  assert.equal(phones[1].state().loser, loser);
  assert.ok(phones[1].state().lostSips >= 1);
  if (other != null) {
    phones[other].say({ t: 'next' });
    assert.equal(g.phase, 'uitslag', 'alleen de verliezer of de host');
  }
  phones[loser].say({ t: 'next' });
  assert.equal(g.phase, 'gooien');
  assert.equal(M.thrower(g), loser, 'wie verloor begint');
});

test('valt wie aan de beurt is weg, dan gooit de host voor hem; nieuwe spelers gooien de volgende ronde mee', () => {
  const { hub, phones, code, t } = table(['Jort', 'Meke']);
  phones[0].say({ t: 'start' });
  phones[0].say({ t: 'roll' });
  phones[0].say({ t: 'stand' });
  const late = phone(hub, 7);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(late.state().you, 2);
  assert.deepEqual(t.g.order, [0, 1], 'deze ronde nog niet');
  hub.disconnect(phones[1].conn);
  phones[0].say({ t: 'roll' });
  assert.equal(t.g.count[1], 1, 'de host gooide voor Meke');
  while (t.g.phase !== 'uitslag') phones[0].say({ t: 'roll' });
  phones[0].say({ t: 'next' });
  assert.deepEqual(t.g.order.slice().sort(), [0, 2], 'Meke is weg, Laat doet mee');
});
