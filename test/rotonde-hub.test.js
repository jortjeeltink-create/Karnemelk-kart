// Rotonde online: kiezen en gokken via de telefoon, de dichte kaarten blijven op de server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RotondeHub } from '../public/shared/rotondehub.js';

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
  const hub = new RotondeHub({ now, log: () => {}, build: 'r1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('de host begint; kiezen en gokken via de telefoon, en de dichte kaarten blijven geheim', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const s = phones[1].state();
  assert.equal(s.phase, 'kiezen');
  assert.equal(s.turn, 0, 'de host begint');
  assert.equal(s.cards.length, 37);
  assert.ok(s.cards.every((c) => c.card === undefined && c.v >= 1), 'je ziet alleen de waarde');
  assert.equal(s.build, 'r1');
  phones[1].say({ t: 'pick', i: 3 });
  assert.equal(phones[2].state().sel, -1, 'niet aan de beurt');
  phones[0].say({ t: 'pick', i: 3 });
  assert.equal(phones[2].state().sel, 3, 'iedereen ziet welke kaart gekozen is');
  const card = t.g.cards[3].card, right = card.s < 2 ? 'rood' : 'zwart';
  phones[0].say({ t: 'guess', color: right });
  const after = phones[2].state();
  assert.deepEqual(after.cards[3].card, card, 'nu ligt hij open');
  assert.equal(after.pot, 4);
  assert.equal(after.phase, 'keuze');
  phones[0].say({ t: 'more', more: false });
  assert.equal(phones[1].state().turn, 1);
  phones[1].say({ t: 'pick', i: 0 });
  const middle = t.g.cards[0].card;
  phones[1].say({ t: 'guess', color: middle.s < 2 ? 'zwart' : 'rood' });
  const st = phones[0].state();
  assert.equal(st.players[1].sips, 8, '6 + 4 uit de pot, maar hooguit 8');
  assert.equal(st.pot, 0);
  assert.equal(st.turn, 1, 'Meke probeert het opnieuw');
});

test('valt wie aan de beurt is weg, dan is de volgende aan de beurt; de host start een nieuwe rotonde', () => {
  const { hub, phones, code, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  hub.disconnect(phones[0].conn);
  assert.equal(t.g.turn, 1);
  const late = phone(hub, 8);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(t.g.players.length, 4);
  t.g.cards.forEach((c, i) => { if (i) c.open = true; });
  phones[1].say({ t: 'pick', i: 0 });
  phones[1].say({ t: 'guess', color: 'rood' });
  assert.equal(late.state().phase, 'klaar');
  phones[2].say({ t: 'next' });
  assert.equal(t.g.phase, 'klaar', 'alleen de host');
  phones[t.host].say({ t: 'next' });
  assert.equal(late.state().phase, 'kiezen');
  assert.equal(late.state().round, 2);
});
