// Borrelbord (zuipbord.js): het bord, gooien en lopen, de vakjes (gans, brug, café, put, doolhof, dood, finish),
// kiezen, het duel en dubbel of niks (zelf gooien), het drinkmaatje en wie hoeveel drinkt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as Z from '../public/shared/zuipbord.js';

const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);
function game(n = 3) {
  const g = Z.newGame(names(n), { seed: 1 });
  Z.begin(g, seats(n), 0);
  return g;
}
// zet speler p neer op vakje `at` en laat hem `v` gooien
const from = (g, p, at, v, live = seats(g.players.length)) => { g.players[p].pos = at; g.turn = p; g.phase = 'gooien'; return Z.roll(g, p, live, v); };
const last = (g, type) => g.log.filter((e) => e.type === type).at(-1);
// een zet van wie er aan de beurt is, wat er ook moet: gooien, kiezen of een duel
function play(g, n, k) {
  if (g.phase === 'duel') return Z.roll(g, Z.duelWaiting(g)[0], seats(n));
  if (g.phase === 'kiezen') return Z.choose(g, g.turn, (g.turn + 1 + (k % (n - 1))) % n, seats(n));
  return Z.roll(g, g.turn, seats(n));
}

test('het bord: 48 vakjes van start tot finish, met vijf ganzen en van elke soort een paar', () => {
  assert.equal(Z.BOARD.length, Z.SIZE + 1);
  assert.equal(Z.BOARD[0].t, 'start');
  assert.equal(Z.BOARD[Z.SIZE].t, 'finish');
  const count = (t) => Z.BOARD.filter((s) => s.t === t).length;
  assert.equal(count('gans'), 5);
  for (const t of ['brug', 'cafe', 'put', 'doolhof', 'dood']) assert.equal(count(t), 1, t);
  assert.equal(count('ad'), 0, 'geen ad fundum');
  assert.ok(Z.BOARD.every((sq) => !sq.n || sq.n <= 2), 'nergens meer dan 2 slokken');
  for (const t of ['drink', 'geef', 'iedereen', 'vraag', 'regel', 'duel', 'maatje', 'ruil', 'buren', 'dubbel', 'laatste']) assert.ok(count(t) >= 1, t);
  assert.ok(Z.VRAGEN.length >= 30 && Z.REGELS.length >= 8);
});

test('gooien kan alleen wie aan de beurt is; je loopt zoveel vakjes en de volgende is aan de beurt', () => {
  const g = game(3);
  assert.equal(Z.roll(g, 1, seats(3), 3), null, 'niet aan de beurt');
  const ev = Z.roll(g, 0, seats(3), 1);
  assert.deepEqual([ev.from, ev.to, ev.path], [0, 1, [1]]);
  assert.deepEqual(last(g, 'vak').drinks, [[0, 1]], 'vakje 1: drink 1');
  assert.equal(g.players[0].sips, 1);
  assert.equal(g.turn, 1);
  Z.roll(g, 1, seats(3), 4);
  assert.equal(last(g, 'vak').t, 'rust', 'vakje 4: niks');
  from(g, 2, 13, 4);
  assert.deepEqual(last(g, 'vak').drinks, [[0, 1], [1, 1], [2, 1]], 'vakje 17: iedereen drinkt 1');
});

test('de gans: nog een keer zoveel verder; de brug naar 12; het doolhof terug; de doodskop terug naar start', () => {
  const g = game(2);
  from(g, 0, 2, 3);
  assert.equal(g.players[0].pos, 8, 'van 5 nog 3 verder');
  assert.equal(g.phase, 'kiezen', 'op 8 kies je een drinkmaatje');
  Z.choose(g, 0, 1, [0, 1]);
  from(g, 1, 3, 3);
  assert.equal(g.players[1].pos, Z.BRIDGE_TO);
  assert.deepEqual(g.pending, { kind: 'geef', n: 1 }, 'na de brug geldt vakje 12');
  Z.choose(g, 1, 0, [0, 1]);
  assert.equal(g.players[0].sips, 1);
  assert.equal(g.players[1].sips, 1, 'speler 1 is het drinkmaatje van speler 0');
  from(g, 0, 40, 2);
  assert.equal(g.players[0].pos, 37, 'doolhof: 5 terug, en daar gebeurt niks');
  from(g, 1, 44, 2);
  assert.equal(g.players[1].pos, 0);
  assert.equal(g.players[1].sips, 2);
});

test('de finish: verder gooien mag, je stopt erop; de winnaar deelt slokken uit en de laatste drinkt', () => {
  const g = game(3);
  g.players[1].pos = 10;
  g.players[2].pos = 20;
  const ev = from(g, 0, 45, 5);
  assert.deepEqual(ev.path, [46, 47, 48], 'je loopt niet terug');
  assert.equal(g.players[0].pos, Z.SIZE);
  assert.equal(g.winner, 0);
  assert.equal(g.players[0].wins, 1);
  // de winnaar kiest wie er drinkt
  assert.deepEqual([g.phase, g.pending], ['kiezen', { kind: 'winst', n: Z.WIN_SIPS }]);
  assert.equal(Z.choose(g, 1, 2, seats(3)), null, 'alleen de winnaar kiest');
  const sips2 = g.players[2].sips;
  Z.choose(g, 0, 2, seats(3));
  assert.deepEqual(last(g, 'keuze').drinks, [[2, Z.WIN_SIPS]]);
  assert.equal(g.players[2].sips, sips2 + Z.WIN_SIPS);
  assert.equal(g.phase, 'klaar');
  assert.deepEqual(last(g, 'klaar').drinks, [[1, Z.LAST_SIPS]], 'wie het verst achter staat');
  assert.equal(Z.roll(g, 1, seats(3), 3), null);
  assert.ok(Z.next(g, seats(3)));
  assert.deepEqual(g.players.map((p) => p.pos), [0, 0, 0]);
  assert.equal(g.round, 2);
  assert.equal(g.turn, 1, 'na de winnaar');
  assert.equal(g.players[0].wins, 1, 'de stand blijft');
});

test('café: een beurt overslaan; put: vast tot een ander erin valt', () => {
  const g = game(3);
  from(g, 0, 18, 1);
  assert.equal(g.players[0].skip, 1);
  assert.equal(g.players[0].sips, 1);
  g.turn = 2; g.phase = 'gooien';
  Z.roll(g, 2, seats(3), 1);
  assert.equal(g.turn, 1, 'speler 0 slaat over');
  assert.equal(last(g, 'overslaan').player, 0);
  assert.equal(g.players[0].skip, 0);
  from(g, 1, 30, 1);
  assert.equal(g.players[1].stuck, true);
  // de volgende rondes slaat speler 1 over
  for (const p of [2, 0, 2]) { assert.notEqual(g.turn, 1); Z.roll(g, g.turn, seats(3), 1); if (g.phase === 'kiezen') Z.choose(g, g.turn, (g.turn + 1) % 3 === 1 ? 2 : (g.turn + 1) % 3, seats(3)); void p; }
  from(g, 2, 29, 2);
  assert.deepEqual([g.players[1].stuck, g.players[2].stuck], [false, true], 'speler 2 bevrijdt speler 1');
  assert.deepEqual(last(g, 'vak').freed, [1]);
});

test('kiezen: uitdelen, een duel, ruilen van plek; een drinkmaatje drinkt mee', () => {
  const g = game(3);
  from(g, 0, 7, 1);
  assert.equal(g.phase, 'kiezen');
  assert.equal(Z.roll(g, 0, seats(3), 2), null, 'eerst kiezen');
  assert.equal(Z.choose(g, 1, 2, seats(3)), null, 'alleen wie aan de beurt is');
  assert.equal(Z.choose(g, 0, 0, seats(3)), null, 'niet jezelf');
  Z.choose(g, 0, 2, seats(3));
  assert.equal(g.players[0].buddy, 2);
  from(g, 0, 14, 1);
  assert.deepEqual(last(g, 'vak').drinks, [[0, 1], [2, 1, 'maatje']], 'je maatje drinkt mee');
  from(g, 0, 9, 1);
  Z.choose(g, 0, 1, seats(3));
  assert.equal(g.phase, 'duel', 'nu gooien jullie allebei');
  assert.equal(Z.roll(g, 2, seats(3), 3), null, 'niet in het duel');
  assert.ok(Z.roll(g, 0, seats(3), 2));
  assert.equal(Z.roll(g, 0, seats(3), 6), null, 'je gooit maar één keer');
  assert.deepEqual(Z.duelWaiting(g), [1]);
  Z.roll(g, 1, seats(3), 5);
  const duel = last(g, 'duel');
  assert.deepEqual([duel.a, duel.b], [2, 5]);
  assert.deepEqual(duel.drinks, [[0, 2], [2, 2, 'maatje']], 'de laagste drinkt, met zijn maatje');
  assert.equal(g.phase, 'gooien');
  assert.equal(g.turn, 1);
  g.players[1].pos = 40;
  from(g, 0, 24, 1);
  Z.choose(g, 0, 1, seats(3));
  assert.deepEqual([g.players[0].pos, g.players[1].pos], [40, 25], 'van plek geruild');
});

test('buren, de laatste, dubbel of niks en ad fundum', () => {
  const g = game(4);
  from(g, 0, 10, 1);
  assert.deepEqual(last(g, 'vak').drinks.map((d) => d[0]).sort(), [1, 3], 'de spelers naast je');
  g.players.forEach((p, i) => { p.pos = [30, 5, 30, 5][i]; });
  from(g, 0, 21, 1);
  assert.deepEqual(last(g, 'vak').drinks.map((d) => d[0]).sort(), [1, 3], 'wie het verst achter staat');
  // dubbel of niks: je gooit zelf nog een keer
  from(g, 0, 17, 1);
  assert.deepEqual([g.phase, g.pending], ['dubbel', { kind: 'dubbel', n: 2 }]);
  assert.equal(Z.roll(g, 1, seats(4), 3), null, 'alleen wie aan de beurt is');
  Z.roll(g, 0, seats(4), 3);
  assert.deepEqual(last(g, 'dubbel').drinks, [[0, 2]], 'oneven: jij drinkt');
  assert.equal(g.phase, 'gooien');
  from(g, 0, 17, 1);
  Z.roll(g, 0, seats(4), 4);
  assert.deepEqual(last(g, 'dubbel').drinks, [[1, 1], [2, 1], [3, 1]], 'even: de rest drinkt 1');
  from(g, 0, 46, 1);
  assert.deepEqual(last(g, 'vak').drinks, [[0, 2]]);
});

test('een duel: bij gelijk gooien jullie allebei nog een keer', () => {
  const g = game(3);
  from(g, 0, 9, 1);
  Z.choose(g, 0, 1, seats(3));
  Z.roll(g, 0, seats(3), 4);
  Z.roll(g, 1, seats(3), 4);
  assert.equal(last(g, 'duel').tie, true);
  assert.equal(g.phase, 'duel');
  assert.deepEqual(Z.duelWaiting(g), [0, 1]);
  Z.roll(g, 1, seats(3), 2);
  Z.roll(g, 0, seats(3), 6);
  assert.deepEqual(last(g, 'duel').drinks, [[1, 2]]);
  assert.equal(g.turn, 1);
});

test('wie weg is slaat over; moest hij nog kiezen of gooien, dan doet de telefoon dat', () => {
  const g = game(3);
  from(g, 0, 1, 1);
  assert.equal(g.phase, 'kiezen');
  assert.equal(Z.fixTurn(g, [1, 2]), true);
  assert.equal(g.phase, 'gooien');
  assert.equal(last(g, 'keuze').player, 0);
  assert.ok([1, 2].includes(g.turn));
  // in een duel gooit de telefoon voor wie er weg is
  from(g, 0, 9, 1);
  Z.choose(g, 0, 2, seats(3));
  Z.roll(g, 0, seats(3), 3);
  assert.equal(Z.fixTurn(g, seats(3)), false, 'iedereen is er nog');
  assert.equal(Z.fixTurn(g, [0, 1]), true);
  assert.ok(last(g, 'duel'));
  // bij dubbel of niks ook
  from(g, 1, 17, 1);
  assert.equal(Z.fixTurn(g, [0, 2]), true);
  assert.equal(last(g, 'dubbel').player, 1);
  assert.notEqual(g.turn, 1);
  Z.addPlayer(g, 'Laat');
  assert.equal(g.players[3].pos, 0);
});

test('honderd potjes met willekeurige worpen lopen altijd af', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const n = 2 + (seed % 9);
    const g = Z.newGame(names(n), { seed });
    Z.begin(g, seats(n), 0);
    for (let k = 0; g.phase !== 'klaar' && k < 5000; k++) play(g, n, k);
    assert.equal(g.phase, 'klaar', `seed ${seed}`);
    assert.equal(g.players[g.winner].pos, Z.SIZE);
  }
});

test('een potje blijft te doen: gemiddeld zo\'n 10 slokken per speler, en niemand komt boven de 60', () => {
  for (const n of [3, 6, 10]) {
    let total = 0, most = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const g = Z.newGame(names(n), { seed });
      Z.begin(g, seats(n), 0);
      for (let k = 0; g.phase !== 'klaar' && k < 5000; k++) play(g, n, k);
      for (const p of g.players) { total += p.sips; most = Math.max(most, p.sips); }
    }
    const avg = total / 300 / n;
    assert.ok(avg >= 7 && avg <= 13, `${n} spelers: gemiddeld ${avg.toFixed(1)}`);
    assert.ok(most <= 60, `${n} spelers: de meeste ${most}`);
  }
});
