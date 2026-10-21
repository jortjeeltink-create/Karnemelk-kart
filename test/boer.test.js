// Boer zoekt vrouw: rollen verdelen, tellen, raden en wie het tweede glas drinkt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../public/shared/boer.js';

const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);

test('rollen: precies één boer en één vrouw, de rest burgers, en iedereen kan alles worden', () => {
  const was = { boer: new Set(), vrouw: new Set() };
  for (let seed = 0; seed < 60; seed++) {
    const g = V.newGame(names(6), { seed });
    const ev = V.deal(g, seats(6));
    assert.equal(ev.type, 'delen');
    assert.equal(g.round, 1);
    assert.equal(g.roles.filter((r) => r === 'boer').length, 1);
    assert.equal(g.roles.filter((r) => r === 'vrouw').length, 1);
    assert.equal(g.roles.filter((r) => r === 'burger').length, 4);
    assert.equal(g.roles[g.boer], 'boer');
    assert.equal(g.roles[g.vrouw], 'vrouw');
    was.boer.add(g.boer); was.vrouw.add(g.vrouw);
  }
  assert.equal(was.boer.size, 6, 'iedereen is wel eens de boer');
  assert.equal(was.vrouw.size, 6, 'iedereen is wel eens de vrouw');
  // met dezelfde seed dezelfde rollen
  const a = V.newGame(names(4), { seed: 7 }), b = V.newGame(names(4), { seed: 7 });
  V.deal(a, seats(4)); V.deal(b, seats(4));
  assert.deepEqual(a.roles, b.roles);
});

test('rollen alleen voor wie er is, en met minder dan drie kan het niet', () => {
  const g = V.newGame(names(5), { seed: 3 });
  assert.equal(V.deal(g, [0, 4]), null);
  V.deal(g, [0, 2, 4]);
  assert.deepEqual(g.in, [0, 2, 4]);
  assert.equal(g.roles[1], null);
  assert.equal(g.roles[3], null);
  assert.ok([0, 2, 4].includes(g.boer) && [0, 2, 4].includes(g.vrouw));
  // wie later aanschuift, doet de volgende ronde mee
  V.addPlayer(g, 'Laat');
  assert.equal(g.players.length, 6);
  V.deal(g, [0, 2, 4, 5]);
  assert.equal(g.in.length, 4);
  assert.notEqual(g.roles[5], null);
});

test('alleen de boer begint met tellen, en raden kan pas als de tijd om is', () => {
  const g = V.newGame(names(4), { seed: 11, count: 7 });
  V.deal(g, seats(4));
  const other = [0, 1, 2, 3].find((p) => p !== g.boer);
  assert.equal(V.startCount(g, other, 1000), null);
  const ev = V.startCount(g, g.boer, 1000);
  assert.deepEqual([ev.type, ev.boer, ev.count], ['tellen', g.boer, 7]);
  assert.equal(V.timeLeft(g, 4000), 4000);
  assert.equal(V.startCount(g, g.boer, 1200), null, 'je telt maar één keer');
  assert.equal(V.deal(g, seats(4)), null, 'niet opnieuw delen tijdens het tellen');
  assert.equal(V.setCount(g, 6), false, 'en de tijd blijft zoals hij was');
  const target = [0, 1, 2, 3].find((p) => p !== g.boer);
  assert.equal(V.guess(g, g.boer, target, 1000 + 7000 - V.GUESS_EARLY_MS - 1), null, 'nog niet: de boer telt nog');
  assert.equal(V.guess(g, target, g.vrouw, 9000), null, 'alleen de boer raadt');
  assert.equal(V.guess(g, g.boer, g.boer, 9000), null, 'niet jezelf');
  assert.equal(V.guess(g, g.boer, 9, 9000), null, 'niet iemand die niet meedoet');
  assert.equal(V.timeLeft(g, 9000), 0);
});

test('goed geraden: de vrouw drinkt ook het tweede glas; fout: de boer drinkt het', () => {
  const g = V.newGame(names(4), { seed: 5 });
  V.deal(g, seats(4));
  const { boer, vrouw } = g;
  V.startCount(g, boer, 0);
  const ev = V.guess(g, boer, vrouw, 8000);
  assert.deepEqual([ev.type, ev.ok, ev.vrouw, ev.target], ['raden', true, vrouw, vrouw]);
  assert.equal(g.phase, 'uitslag');
  assert.equal(g.players[vrouw].atjes, 2, 'twee glazen voor de vrouw');
  assert.equal(g.players[boer].atjes, 0);
  assert.equal(g.players[boer].raak, 1);

  // volgende ronde: de boer wijst iemand anders aan
  V.deal(g, seats(4));
  assert.equal(g.round, 2);
  assert.equal(g.phase, 'rollen');
  const b2 = g.boer, v2 = g.vrouw, before = g.players.map((p) => p.atjes);
  const wrong = [0, 1, 2, 3].find((p) => p !== b2 && p !== v2);
  V.startCount(g, b2, 0);
  const ev2 = V.guess(g, b2, wrong, 8000);
  assert.equal(ev2.ok, false);
  assert.equal(g.players[v2].atjes, before[v2] + 1, 'de vrouw drinkt alleen het eerste glas');
  assert.equal(g.players[b2].atjes, before[b2] + 1, 'de boer drinkt het tweede glas');
  assert.equal(g.players[wrong].atjes, before[wrong]);
  assert.equal(g.players.reduce((n, p) => n + p.boer, 0), 2);
  // na de uitslag mag de tijd weer anders
  assert.equal(V.setCount(g, 10), true);
  assert.equal(g.count, 10);
  assert.equal(V.setCount(g, 9), false, 'alleen de vaste keuzes');
});
