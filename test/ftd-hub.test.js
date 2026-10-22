// Fuck the dealer online: alleen de dealer ziet de kaart, raden via de telefoon, en wie weg is slaat over.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DealerHub } from '../public/shared/ftdhub.js';

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
  const hub = new DealerHub({ now, log: () => {}, build: 'd1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('alleen de dealer ziet de bovenste kaart; raden gaat via de telefoon', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const g = t.g;
  assert.ok(g.dealer >= 0);
  phones.forEach((p, i) => {
    const s = p.state();
    assert.equal(s.dealer, g.dealer);
    assert.equal(s.guesser, g.guesser);
    assert.equal(s.deckLeft, 52);
    assert.deepEqual(s.top, i === g.dealer ? g.deck.at(-1) : null, 'de kaart alleen voor de dealer');
    assert.equal(JSON.stringify(s).includes('"deck"'), false, 'de stapel blijft op de server');
  });
  const top = g.deck.at(-1), guesser = g.guesser;
  const wrong = top.r === 2 ? 3 : 2;
  const other = [0, 1, 2].find((p) => p !== guesser && p !== g.dealer);
  phones[other].say({ t: 'guess', r: wrong });
  assert.equal(g.first, null, 'niet aan de beurt');
  phones[guesser].say({ t: 'guess', r: wrong });
  assert.equal(phones[other].state().first, wrong);
  assert.equal(phones[other].state().hint, top.r > wrong ? 'hoger' : 'lager');
  phones[guesser].say({ t: 'guess', r: top.r });
  const s = phones[other].state();
  assert.equal(s.log.at(-1).type, 'kaart');
  assert.equal(s.board[top.r], 1);
  assert.equal(s.players[g.dealer].sips, 3, 'in twee keer goed: dealer drinkt 3');
  assert.equal(s.build, 'd1');
});

test('valt wie moet raden weg, dan is de volgende aan de beurt; nieuwe spelers raden mee', () => {
  const { hub, phones, code, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const g = t.g, was = g.guesser;
  hub.disconnect(phones[was].conn);
  assert.notEqual(g.guesser, was);
  assert.notEqual(g.guesser, g.dealer);
  const late = phone(hub, 8);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(g.players.length, 4);
  assert.equal(late.state().top, null);
  const all = [...phones, late];
  all[t.host].say({ t: 'again' });
  assert.equal(late.state().phase, 'lobby', 'de host kan altijd terug naar de lobby');
});
