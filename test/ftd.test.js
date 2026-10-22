// Fuck the dealer: raden, hoger of lager, wie hoeveel drinkt, dealer af na drie keer en een nieuwe stapel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as F from '../public/shared/ftd.js';

const c = (r, s = 0) => ({ r, s });
const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);
// een potje met een vaste dealer en de kaarten die bovenop moeten liggen (laatste eerst)
function game(n, dealer, top) {
  const g = F.newGame(names(n), { seed: 1 });
  F.begin(g, seats(n));
  g.dealer = dealer;
  g.guesser = (dealer + 1) % n;
  g.deck.push(...top.slice().reverse());
  return g;
}

test('in één keer goed: de dealer drinkt 5', () => {
  const g = game(3, 0, [c(9)]);
  assert.equal(F.guess(g, 2, 9, seats(3)), null, 'niet aan de beurt');
  assert.equal(F.guess(g, 1, 15, seats(3)), null, 'geen bestaande kaart');
  const ev = F.guess(g, 1, 9, seats(3));
  assert.deepEqual([ev.type, ev.ok, ev.drinker, ev.sips], ['kaart', 1, 0, F.SIPS_FIRST]);
  assert.equal(g.players[0].sips, 5);
  assert.equal(g.players[1].right, 1);
  assert.equal(g.board[9], 1, 'de kaart ligt open op tafel');
  assert.equal(g.guesser, 2, 'de volgende raadt');
});

test('fout, dan hoger of lager, en in twee keer goed: de dealer drinkt 3', () => {
  const g = game(3, 0, [c(4)]);
  const hint = F.guess(g, 1, 8, seats(3));
  assert.deepEqual([hint.type, hint.hint], ['hint', 'lager']);
  assert.equal(F.guess(g, 1, 9, seats(3)), null, 'de tweede gok moet lager zijn');
  assert.equal(F.guess(g, 1, 8, seats(3)), null);
  const ev = F.guess(g, 1, 4, seats(3));
  assert.deepEqual([ev.ok, ev.drinker, ev.sips, ev.guesses], [2, 0, F.SIPS_SECOND, [8, 4]]);
});

test('twee keer fout: je drinkt het verschil, zoals 6 tegen een 2 is 4 slokken', () => {
  const g = game(3, 0, [c(2)]);
  F.guess(g, 1, 8, seats(3));
  const ev = F.guess(g, 1, 6, seats(3));
  assert.deepEqual([ev.ok, ev.drinker, ev.sips], [0, 1, 4]);
  assert.equal(g.players[1].sips, 4);
  assert.equal(g.players[0].beaten, 1);
  assert.equal(g.streak, 1);
  // een aas is 14: hoger dan een heer
  const h = game(2, 0, [c(14)]);
  assert.equal(F.guess(h, 1, 13, seats(2)).hint, 'hoger');
});

test('drie spelers achter elkaar uitgespeeld: de stapel gaat naar de volgende', () => {
  const g = game(4, 0, [c(2), c(3), c(5), c(7), c(9)]);
  const miss = (p, a, b) => { F.guess(g, p, a, seats(4)); return F.guess(g, p, b, seats(4)); };
  miss(1, 10, 9);       // het was een 2
  miss(2, 10, 9);       // een 3
  assert.equal(g.streak, 2);
  // wie goed raadt, maakt de reeks kapot
  const g2 = game(3, 0, [c(5), c(5)]);
  F.guess(g2, 1, 4, seats(3)); F.guess(g2, 1, 6, seats(3));
  F.guess(g2, 2, 5, seats(3));
  assert.equal(g2.streak, 0);
  // terug naar g: de derde uitgespeeld
  const ev = miss(3, 10, 9);
  assert.equal(ev.streak, 3);
  assert.equal(g.dealer, 1, 'de volgende aan tafel is dealer');
  assert.equal(g.guesser, 2, 'en de speler na hem raadt');
  assert.equal(g.streak, 0);
  assert.equal(g.log.at(-1).type, 'dealer');
  assert.equal(g.players[1].dealer >= 1, true);
});

test('met twee spelers wisselen ze, en de dealer raadt nooit zelf', () => {
  const g = game(2, 0, [c(2), c(2), c(2), c(2)]);
  for (let k = 0; k < 3; k++) { assert.equal(g.guesser, 1); F.guess(g, 1, 10, seats(2)); F.guess(g, 1, 9, seats(2)); }
  assert.equal(g.dealer, 1);
  assert.equal(g.guesser, 0);
});

test('wie weg is, slaat zijn beurt over; is de stapel op, dan komt er een nieuwe', () => {
  const g = game(4, 0, [c(5)]);
  assert.equal(F.fixTurn(g, [0, 2, 3]), true);
  assert.equal(g.guesser, 2, 'speler 1 is weg');
  assert.equal(F.fixTurn(g, [0, 2, 3]), false);
  // stapel bijna op
  g.deck = [c(7)];
  g.board[7] = 3;
  F.guess(g, 2, 7, [0, 2, 3]);
  assert.equal(g.deck.length, 52);
  assert.equal(g.board[7], 0, 'de tafel is weer leeg');
  assert.equal(g.log.at(-1).type, 'schudden');
  // honderd beurten met willekeurige gokken lopen altijd door
  const h = F.newGame(names(5), { seed: 9 });
  F.begin(h, seats(5));
  for (let k = 0; k < 300; k++) {
    const first = h.first;
    if (first == null) F.guess(h, h.guesser, F.RANKS[k % 13], seats(5));
    else F.guess(h, h.guesser, h.hint === 'hoger' ? Math.min(14, first + 1) : Math.max(2, first - 1), seats(5));
  }
  assert.ok(h.players.some((p) => p.dealer > 1), 'de stapel ging rond');
});
