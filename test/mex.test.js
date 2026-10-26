// Mexen: de volgorde van de worpen, de beurten, wie drinkt, Mex verdubbelt en afgooien.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../public/shared/mex.js';

const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);
function game(n, opts = {}) {
  const g = M.newGame(names(n), { seed: 1, ...opts });
  M.startRound(g, seats(n), 0);
  return g;
}

test('de volgorde: Mex, dan de dubbels van 600 tot 100, dan 65 tot en met 31', () => {
  const order = [[2, 1], [6, 6], [5, 5], [1, 1], [6, 5], [6, 1], [5, 4], [4, 3], [3, 2], [3, 1]];
  const scores = order.map(M.score);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a), 'van hoog naar laag');
  assert.equal(new Set(scores).size, scores.length);
  assert.equal(M.score([1, 2]), M.score([2, 1]), 'volgorde van de stenen maakt niet uit');
  assert.equal(M.score([3, 6]), 63);
  assert.deepEqual([[2, 1], [1, 2], [4, 4], [5, 3]].map(M.scoreName), ['Mex', 'Mex', '400', '53']);
  assert.equal(M.isMex([1, 2]), true);
  assert.equal(M.isMex([1, 1]), false);
});

test('de eerste bepaalt hoe vaak je mag gooien, en alleen wie aan de beurt is gooit', () => {
  const g = game(3);
  assert.equal(M.thrower(g), 0);
  assert.equal(M.roll(g, 1, [3, 4]), null, 'niet aan de beurt');
  assert.equal(M.stand(g, 0), null, 'eerst gooien');
  M.roll(g, 0, [3, 1]);
  M.roll(g, 0, [5, 4]);
  M.stand(g, 0);
  assert.equal(g.max, 2, 'de eerste gooide twee keer');
  assert.equal(M.thrower(g), 1);
  M.roll(g, 1, [2, 3]);
  const ev = M.roll(g, 1, [6, 2]);
  assert.equal(ev.count, 2);
  assert.equal(M.thrower(g), 2, 'na twee worpen blijf je vanzelf staan');
  assert.equal(M.roll(g, 1, [1, 1]), null);
  assert.deepEqual(g.dice[1], [6, 2], 'je laatste worp telt');
  // een Mex is niet te verbeteren: meteen klaar
  const mex = M.roll(g, 2, [1, 2]);
  assert.equal(mex.mex, true);
  assert.equal(g.phase, 'uitslag');
  assert.equal(g.loser, 0, '54 is lager dan 62 en Mex');
  assert.equal(g.sips, 2, 'één Mex: dubbel');
  assert.equal(g.players[0].sips, 2);
  assert.equal(g.players[2].mex, 1);
});

test('elke Mex verdubbelt; wie verloor begint de volgende ronde', () => {
  const g = game(4, { stake: 3 });
  M.roll(g, 0, [2, 1]);          // Mex: de rest mag ook maar één keer
  assert.equal(g.max, 1);
  M.roll(g, 1, [1, 2]);
  M.roll(g, 2, [4, 3]);
  M.roll(g, 3, [6, 6]);
  assert.equal(g.phase, 'uitslag');
  assert.equal(g.loser, 2);
  assert.equal(g.sips, M.MAX_SIPS, 'twee keer Mex: vier keer de inzet (12), maar hooguit 6');
  assert.equal(M.setStake(g, 2), true, 'tussen twee rondes mag de inzet anders');
  const ev = M.next(g, seats(4));
  assert.equal(ev.starter, 2);
  assert.deepEqual(g.order, [2, 3, 0, 1]);
  assert.equal(g.round, 2);
  assert.equal(g.mexes, 0);
  assert.equal(g.stake, 2);
  assert.equal(M.setStake(g, 3), false, 'niet tijdens een ronde');
});

test('gelijk laagst: die spelers gooien nog één keer, en weer gelijk betekent nog eens', () => {
  const g = game(3);
  M.roll(g, 0, [4, 3]); M.stand(g, 0);
  M.roll(g, 1, [3, 4]);
  M.roll(g, 2, [6, 5]);
  assert.equal(g.phase, 'afgooien');
  assert.deepEqual(g.tie.order, [0, 1]);
  assert.equal(M.thrower(g), 0);
  assert.equal(M.stand(g, 0), null, 'bij afgooien gooi je gewoon één keer');
  M.roll(g, 0, [2, 2]);
  M.roll(g, 1, [2, 2]);
  assert.equal(g.phase, 'afgooien', 'weer gelijk');
  M.roll(g, 0, [5, 1]);
  M.roll(g, 1, [5, 2]);
  assert.equal(g.phase, 'uitslag');
  assert.equal(g.loser, 0);
  assert.equal(g.sips, 1);
  assert.equal(g.players[0].lost, 1);
});

test('wie er niet is gooit niet mee; wie aanschuift doet de volgende ronde mee', () => {
  const g = M.newGame(names(4), { seed: 3 });
  assert.equal(M.startRound(g, [2], 0), null, 'met één speler kan het niet');
  M.startRound(g, [0, 2, 3], 1);
  assert.deepEqual(g.order, [2, 3, 0], 'de eerstvolgende na wie er niet is');
  M.addPlayer(g, 'Laat');
  assert.equal(g.players.length, 5);
  assert.equal(g.count.length, 4);
});

test('honderd rondes met willekeurige stenen lopen altijd door', () => {
  const g = M.newGame(names(5), { seed: 42 });
  M.startRound(g, seats(5), 0);
  let rounds = 0, guard = 0;
  while (rounds < 100 && guard++ < 10000) {
    if (g.phase === 'uitslag') { rounds++; M.next(g, seats(5)); continue; }
    const p = M.thrower(g);
    // soms blijven staan, soms nog een keer
    if (g.phase === 'gooien' && g.count[p] && (g.seq % 3 === 0)) M.stand(g, p);
    else M.roll(g, p);
  }
  assert.equal(rounds, 100);
  assert.equal(g.players.reduce((n, p) => n + p.lost, 0), 100, 'elke ronde precies één verliezer');
});
