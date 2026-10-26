// Rotonde: de vorm, rood of zwart gokken, de pot, de extra gok en wie hoeveel drinkt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../public/shared/rotonde.js';

const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);
const RED = { r: 7, s: 0 }, BLACK = { r: 7, s: 3 };
// een potje waarin speler 0 begint
function game(n = 3) {
  const g = R.newGame(names(n), { seed: 1 });
  R.begin(g, seats(n), 0);
  return g;
}
// kaart i een vaste kleur geven, kiezen en gokken
function play(g, player, i, card, color, live) {
  g.cards[i].card = card;
  assert.equal(R.pick(g, player, i), true);
  return R.guess(g, player, color, live);
}

test('de zon: 37 kaarten, 16 × 1, 8 × 2, 4 × 3, 8 × 4 en 1 × 6', () => {
  assert.equal(R.SIZE, 37);
  const count = {};
  for (const s of R.LAYOUT) count[s.v] = (count[s.v] || 0) + 1;
  assert.deepEqual(count, { 1: 16, 2: 8, 3: 4, 4: 8, 6: 1 });
  // de blauwe liggen recht boven, rechts, onder en links
  assert.deepEqual(R.LAYOUT.filter((s) => s.v === 3).map((s) => s.angle), [0, 90, 180, 270]);
  const g = game();
  assert.equal(new Set(g.cards.map((c) => `${c.card.r}${c.card.s}`)).size, 37, 'allemaal verschillende kaarten');
  assert.equal(R.closed(g), 37);
  assert.equal(g.turn, 0);
});

test('kiezen en gokken kan alleen wie aan de beurt is, en alleen een dichte kaart', () => {
  const g = game();
  assert.equal(R.pick(g, 1, 5), null, 'niet aan de beurt');
  assert.equal(R.guess(g, 0, 'rood', seats(3)), null, 'eerst een kaart kiezen');
  assert.equal(R.pick(g, 0, 37), null);
  assert.equal(R.pick(g, 0, 5), true);
  assert.equal(R.pick(g, 0, 6), true, 'een andere kaart kiezen mag nog');
  assert.equal(R.guess(g, 0, 'groen', seats(3)), null);
  g.cards[6].card = RED;
  R.guess(g, 0, 'rood', seats(3));
  R.decide(g, 0, false, seats(3));
  assert.equal(R.pick(g, 1, 6), null, 'die ligt al open');
});

test('goed: de waarde gaat in de pot, en dan nog eentje of doorgeven', () => {
  const g = game();
  const ev = play(g, 0, 0, RED, 'rood', seats(3));
  assert.deepEqual([ev.type, ev.ok, ev.v, ev.pot], ['kaart', true, 6, 6]);
  assert.equal(g.pot, 6);
  assert.equal(g.phase, 'keuze');
  assert.equal(R.pick(g, 0, 1), null, 'eerst kiezen: nog eentje of doorgeven');
  assert.equal(R.decide(g, 1, true, seats(3)), null, 'niet aan de beurt');
  R.decide(g, 0, true, seats(3));
  assert.deepEqual([g.phase, g.extra, g.turn], ['kiezen', true, 0]);
  play(g, 0, 1, BLACK, 'zwart', seats(3));
  assert.equal(g.pot, 10);
  assert.deepEqual([g.phase, g.turn, g.extra], ['kiezen', 1, false], 'na de extra keer gaat de beurt vanzelf door');
  play(g, 1, 9, BLACK, 'zwart', seats(3));
  R.decide(g, 1, false, seats(3));
  assert.equal(g.turn, 2);
  assert.equal(g.pot, 13, 'een blauwe kaart is 3');
});

test('fout: de waarde plus de hele pot drinken (hooguit 8), de pot is leeg en je probeert het opnieuw', () => {
  const g = game();
  play(g, 0, 0, RED, 'rood', seats(3));
  R.decide(g, 0, false, seats(3));
  const ev = play(g, 1, 1, RED, 'zwart', seats(3));
  assert.deepEqual([ev.ok, ev.v, ev.pot, ev.sips], [false, 4, 6, R.MAX_SIPS], '4 + 6 is 10, maar hooguit 8');
  assert.equal(g.players[1].sips, 8);
  assert.equal(g.players[1].max, 8);
  assert.equal(g.pot, 0);
  assert.equal(g.cards[1].open, true, 'de kaart blijft open liggen');
  assert.deepEqual([g.phase, g.turn], ['kiezen', 1], 'zelf opnieuw');
  play(g, 1, 25, BLACK, 'rood', seats(3));
  assert.equal(g.players[1].sips, 9, 'een rode buitenkaart is 1');
  assert.equal(g.players[1].wrong, 2);
});

test('fout tijdens de extra keer: drinken en opnieuw, en daarna gaat de beurt door', () => {
  const g = game();
  play(g, 0, 21, RED, 'rood', seats(3));
  R.decide(g, 0, true, seats(3));
  play(g, 0, 22, RED, 'zwart', seats(3));
  assert.equal(g.players[0].sips, 2, '1 van de kaart + 1 in de pot');
  assert.deepEqual([g.turn, g.extra], [0, true]);
  play(g, 0, 23, BLACK, 'zwart', seats(3));
  assert.equal(g.turn, 1, 'de extra keer was al gebruikt');
});

test('liggen alle kaarten open, dan is de rotonde klaar; een nieuwe rotonde houdt de stand', () => {
  const g = game(2);
  for (let i = 0; i < R.SIZE; i++) {
    const p = g.turn;
    play(g, p, i, i % 2 ? RED : BLACK, i % 5 ? (i % 2 ? 'rood' : 'zwart') : 'rood', [0, 1]);
    if (g.phase === 'keuze') R.decide(g, p, false, [0, 1]);
  }
  assert.equal(g.phase, 'klaar');
  assert.equal(g.log.at(-1).type, 'klaar');
  assert.equal(R.guess(g, g.turn, 'rood', [0, 1]), null);
  const sips = g.players.map((p) => p.sips);
  assert.ok(sips.some((n) => n > 0));
  const last = g.turn;
  assert.ok(R.next(g, [0, 1]));
  assert.equal(g.round, 2);
  assert.equal(R.closed(g), 37);
  assert.equal(g.pot, 0);
  assert.equal(g.turn, 1 - last);
  assert.deepEqual(g.players.map((p) => p.sips), sips, 'de stand blijft');
});

test('wie weg is slaat over; nieuwe spelers komen aan de beurt', () => {
  const g = game(3);
  play(g, 0, 0, RED, 'rood', seats(3));
  assert.equal(R.fixTurn(g, [1, 2]), true, 'speler 0 viel weg tijdens zijn keuze');
  assert.deepEqual([g.turn, g.phase], [1, 'kiezen']);
  R.addPlayer(g, 'Laat');
  play(g, 1, 1, RED, 'rood', [1, 2, 3]);
  R.decide(g, 1, false, [1, 2, 3]);
  play(g, 2, 2, RED, 'rood', [1, 2, 3]);
  R.decide(g, 2, false, [1, 2, 3]);
  assert.equal(g.turn, 3);
});
