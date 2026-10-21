// Boer zoekt vrouw online: wat elke telefoon ziet, tellen met de klok van de server, en aanschuiven tussendoor.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoerHub } from '../public/shared/boerhub.js';
import * as V from '../public/shared/boer.js';

let clock = 5_000_000;
const now = () => clock;
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
  const hub = new BoerHub({ now, log: () => {}, build: 'b1' });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}

test('starten kan pas met drie, en de host kiest hoe lang de boer telt', () => {
  const { phones, t } = table(['Jort', 'Meke']);
  phones[0].say({ t: 'start' });
  assert.match(phones[0].last.err.msg, /minstens 3/);
  assert.equal(t.g, null);
  phones[1].say({ t: 'settings', count: 6 });
  assert.equal(phones[0].state().count, V.COUNT_DEFAULT, 'alleen de host');
  phones[0].say({ t: 'settings', count: 7 });
  assert.equal(phones[1].state().count, 7);
  phones[0].say({ t: 'settings', count: 9 });
  assert.equal(phones[1].state().count, 7, 'alleen de vaste keuzes');
});

test('niemand ziet de rol van een ander; de boer wordt pas bekend als hij telt, de vrouw bij de uitslag', () => {
  const { phones, t } = table(['Jort', 'Meke', 'Sim', 'Stan']);
  phones[0].say({ t: 'start' });
  const g = t.g;
  assert.equal(g.round, 1);
  phones.forEach((p, i) => {
    const s = p.state();
    assert.equal(s.phase, 'rollen');
    assert.equal(s.role, g.roles[i]);
    assert.equal(s.roles, undefined);
    assert.equal(s.vrouw, undefined);
    assert.equal(s.boer, i === g.boer ? i : -1);
    assert.equal(JSON.stringify(s).includes('vrouw'), i === g.vrouw, 'wie de vrouw is lekt niet uit');
  });
  // alleen de boer kan beginnen
  const other = [0, 1, 2, 3].find((p) => p !== g.boer);
  phones[other].say({ t: 'count' });
  assert.equal(g.phase, 'rollen');
  phones[g.boer].say({ t: 'count' });
  assert.equal(g.phase, 'tellen');
  const s = phones[other].state();
  assert.equal(s.boer, g.boer, 'nu weet iedereen wie de boer is');
  assert.equal(s.left, V.COUNT_DEFAULT * 1000);
  assert.equal(s.vrouw, undefined);
  // te vroeg raden telt niet
  const target = [0, 1, 2, 3].find((p) => p !== g.boer);
  clock += 3000;
  assert.equal(phones[other].state().left, V.COUNT_DEFAULT * 1000, 'de stand komt pas bij de volgende gebeurtenis');
  phones[g.boer].say({ t: 'guess', target });
  assert.equal(g.phase, 'tellen');
  clock += V.COUNT_DEFAULT * 1000;
  phones[g.boer].say({ t: 'guess', target: 'Meke' });
  assert.equal(g.phase, 'tellen');
  phones[g.boer].say({ t: 'guess', target });
  assert.equal(g.phase, 'uitslag');
  const u = phones[other].state();
  assert.equal(u.vrouw, g.vrouw);
  assert.equal(u.guess, target);
  assert.deepEqual(u.roles, g.roles, 'na de uitslag ziet iedereen alle rollen');
  assert.equal(u.players[g.vrouw].atjes >= 1, true);
  assert.equal(u.log[u.log.length - 1].type, 'raden');
});

test('de host deelt de volgende ronde; wie aanschuift doet de ronde erna mee', () => {
  const { hub, phones, code, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const late = phone(hub, 9);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(late.state().you, 3);
  assert.equal(late.state().role, null, 'nog geen rol deze ronde');
  assert.deepEqual(late.state().in, [0, 1, 2]);
  phones[1].say({ t: 'deal' });
  assert.equal(t.g.round, 1, 'alleen de host deelt');
  phones[0].say({ t: 'deal' });
  assert.equal(t.g.round, 2, 'opnieuw delen zolang de boer nog niet telt');
  assert.deepEqual(late.state().in, [0, 1, 2, 3]);
  assert.equal(typeof late.state().role, 'string');
  // wie weg is, krijgt geen rol
  hub.disconnect(phones[2].conn);
  phones[0].say({ t: 'deal' });
  assert.deepEqual(t.g.in, [0, 1, 3]);
  // terug naar de lobby kan, behalve tijdens het tellen
  const all = [...phones, late];
  all[t.g.boer].say({ t: 'count' });
  phones[0].say({ t: 'again' });
  assert.ok(t.g, 'niet tijdens het tellen');
  clock += 20000;
  all[t.g.boer].say({ t: 'guess', target: t.g.in.find((p) => p !== t.g.boer) });
  phones[0].say({ t: 'again' });
  assert.equal(t.g, null);
  assert.equal(phones[0].state().phase, 'lobby');
});

test('valt de boer weg tijdens het tellen, dan raadt de host voor hem', () => {
  const { hub, phones, t } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  // zorg dat de boer niet de host is
  while (t.g.boer === 0) phones[0].say({ t: 'deal' });
  const g = t.g, b = g.boer;
  phones[b].say({ t: 'count' });
  hub.disconnect(phones[b].conn);
  clock += 20000;
  const target = g.in.find((p) => p !== b);
  phones[0].say({ t: 'guess', target });
  assert.equal(g.phase, 'uitslag');
  assert.equal(phones[0].state().build, 'b1');
});
