// Mijnenveld online: twee keer gooien, mijnen leggen en gokken via de telefoon; verstopte mijnen blijven op de server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MijnenveldHub } from '../public/shared/mijnenveldhub.js';

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
  const hub = new MijnenveldHub({ now, log: () => {}, build: 'm1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('de host kiest de slokken per mijn en begint; verstopte mijnen en dichte kaarten blijven geheim', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[1].say({ t: 'settings', mineSips: 10 });
  assert.equal(phones[0].state().mineSips, 5, 'alleen de host');
  phones[0].say({ t: 'settings', mineSips: 10 });
  assert.equal(phones[2].state().mineSips, 10);
  phones[0].say({ t: 'start' });
  const s = phones[1].state();
  assert.deepEqual([s.phase, s.turn, s.hiddenMines, s.mines.length], ['gooien', 0, 8, 0]);
  assert.ok(s.cards.every((c) => c === null));
  assert.equal(JSON.stringify(s).includes('"hidden"'), false, 'waar de mijnen liggen, blijft op de server');
  assert.equal(s.build, 'm1');
  // zonder mijnen: gooien en gokken
  t.g.mines = [];
  phones[1].say({ t: 'roll' });
  assert.equal(phones[2].state().dice, null, 'niet aan de beurt');
  phones[0].say({ t: 'roll' });
  assert.equal(phones[2].state().phase, 'rij', 'eerst de kolom');
  assert.equal(phones[2].state().dice[1], null);
  phones[0].say({ t: 'roll' });
  const r = phones[2].state();
  assert.equal(r.phase, 'gokken');
  assert.ok(r.dice.every((d) => d >= 1 && d <= 6));
  const card = t.g.cards[r.target].card;
  phones[0].say({ t: 'guess', color: card.s < 2 ? 'rood' : 'zwart' });
  const after = phones[2].state();
  assert.deepEqual(after.cards[r.target], card, 'de kaart ligt open');
  assert.equal(after.turn, 1);
  // een mijn: ontploffen, neerleggen en dan pas gokken (er liggen nog vier kaarten dicht, elk met een mijn)
  const g = t.g, dicht = [0, 1, 2, 35];
  g.cards.forEach((c, i) => { c.open = !dicht.includes(i); });
  g.mines = dicht.map((i) => ({ cells: [i], hidden: true, count: 1 }));
  phones[1].say({ t: 'roll' });
  phones[1].say({ t: 'roll' });
  const boem = phones[0].state();
  assert.equal(boem.phase, 'plaatsen');
  assert.equal(boem.players[1].sips, 10, 'de host koos 10 slokken per mijn');
  assert.equal(boem.hiddenMines, 3);
  const spot = dicht.find((i) => i !== boem.target);
  phones[1].say({ t: 'place', cells: [spot] });
  const st = phones[0].state();
  assert.deepEqual(st.mines, [{ cells: [spot], count: 1 }], 'een verlegde mijn ziet iedereen');
  assert.equal(st.phase, 'gokken');
});

test('valt wie aan de beurt is weg, dan is de volgende aan de beurt; de host legt een nieuw veld', () => {
  const { hub, phones, code, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  hub.disconnect(phones[0].conn);
  assert.equal(t.g.turn, 1);
  const late = phone(hub, 8);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(t.g.players.length, 4);
  t.g.mines = [];
  t.g.cards.forEach((c, i) => { if (i) c.open = true; });
  phones[1].say({ t: 'roll' });
  phones[1].say({ t: 'roll' });
  phones[1].say({ t: 'guess', color: 'rood' });
  assert.equal(late.state().phase, 'klaar');
  phones[2].say({ t: 'next' });
  assert.equal(t.g.phase, 'klaar', 'alleen de host');
  phones[t.host].say({ t: 'next' });
  assert.equal(late.state().phase, 'gooien');
  assert.equal(late.state().hiddenMines, 8);
});
