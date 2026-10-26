// Mijnenveld: de steen twee keer gooien naar een kaart, mijnen die ontploffen en verlegd worden, rood of zwart,
// en wie hoeveel drinkt (zoals de online versie van dark-mark.com).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../public/shared/mijnenveld.js';

const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);
const RED = { r: 7, s: 0 }, BLACK = { r: 7, s: 3 };
// een potje zonder mijnen waarin speler 0 begint
function game(n = 3, mineSips = 5) {
  const g = M.newGame(names(n), { seed: 1, mineSips });
  M.begin(g, seats(n), 0);
  g.mines = [];
  return g;
}
const at = (col, row) => (row - 1) * M.SIDE + (col - 1);
// de steen twee keer: eerst de kolom, dan de rij
const throwAt = (g, p, col, row) => M.roll(g, p, col) && M.roll(g, p, row);

test('een veld van 6 bij 6 met 8 verstopte mijnen op 8 verschillende kaarten', () => {
  const g = M.newGame(names(3), { seed: 4 });
  assert.equal(g.cards.length, 36);
  assert.equal(new Set(g.cards.map((c) => `${c.card.r}${c.card.s}`)).size, 36);
  assert.equal(g.mines.length, M.MINES);
  assert.ok(g.mines.every((m) => m.hidden && m.cells.length === 1 && m.count === 1));
  assert.equal(new Set(g.mines.map((m) => m.cells[0])).size, M.MINES);
  assert.equal(g.mineSips, M.MINE_DEFAULT);
  assert.equal(M.newGame(names(2), { mineSips: 7 }).mineSips, M.MINE_DEFAULT, 'alleen 3, 5 of 10');
});

test('een mijn mag op een kaart of tussen twee kaarten', () => {
  assert.deepEqual(M.spotCells([7]), [7]);
  assert.deepEqual(M.spotCells([8, 7]), [7, 8]);
  assert.deepEqual(M.spotCells([7, 13]), [7, 13]);
  assert.equal(M.spotCells([14, 7, 13, 8]), null, 'niet op een hoek van vier');
  assert.equal(M.spotCells([5, 6]), null, 'niet over de rand van een rij');
  assert.equal(M.spotCells([7, 9]), null);
  assert.equal(M.spotCells([5, 6, 11, 12]), null);
  assert.equal(M.spotCells([7, 8, 13]), null);
  assert.equal(M.spotCells([36]), null);
  assert.equal(M.spotCells('7'), null);
});

test('eerst gooi je voor de kolom, dan voor de rij; ligt die kaart open, dan de eerstvolgende dichte', () => {
  const g = game();
  assert.equal(M.roll(g, 1, 3), null, 'niet aan de beurt');
  const col = M.roll(g, 0, 3);
  assert.deepEqual([col.type, col.value, g.phase, g.dice], ['kolom', 3, 'rij', [3, null]]);
  assert.equal(M.guess(g, 0, 'rood', seats(3)), null, 'eerst ook voor de rij gooien');
  g.phase = 'gooien'; g.dice = null;
  const ev = throwAt(g, 0, 3, 2);
  assert.deepEqual([ev.type, ev.target, ev.moved], ['worp', at(3, 2), false]);
  assert.equal(g.phase, 'gokken');
  assert.equal(throwAt(g, 0, 1, 1), null, 'eerst gokken');
  g.cards[at(3, 2)].card = RED;
  M.guess(g, 0, 'rood', seats(3));
  g.cards[at(4, 2)].open = true;
  const ev2 = throwAt(g, 1, 3, 2);
  assert.deepEqual([ev2.target, ev2.moved], [at(5, 2), true], 'twee open kaarten: dan de eerstvolgende dichte');
  g.cards[at(5, 2)].card = BLACK;
  M.guess(g, 1, 'zwart', seats(3));
  for (let i = 30; i < 36; i++) g.cards[i].open = true;
  g.cards[0].open = true;
  assert.equal(throwAt(g, 2, 6, 6).target, 1, 'na de laatste kaart weer linksboven verder');
});

test('goed: de volgende is aan de beurt; fout: 3 slokken en zelf opnieuw gooien', () => {
  const g = game();
  throwAt(g, 0, 1, 1);
  g.cards[0].card = BLACK;
  assert.equal(M.guess(g, 0, 'paars', seats(3)), null);
  const ev = M.guess(g, 0, 'rood', seats(3));
  assert.deepEqual([ev.ok, ev.sips], [false, M.WRONG_SIPS]);
  assert.equal(g.cards[0].open, true, 'de kaart gaat ook open als je fout gokt');
  assert.deepEqual([g.turn, g.phase, g.players[0].sips, g.dice], [0, 'gooien', M.WRONG_SIPS, null]);
  throwAt(g, 0, 2, 1);
  g.cards[1].card = RED;
  M.guess(g, 0, 'rood', seats(3));
  assert.deepEqual([g.turn, g.players[0].right, g.players[0].wrong], [1, 1, 1]);
});

test('boem: de slokken per mijn drinken, de mijn ergens anders neerleggen en dan pas gokken', () => {
  const g = game(3, 5);
  g.mines = [{ cells: [at(2, 2)], hidden: true, count: 1 }, { cells: [at(2, 2), at(3, 2)], hidden: false, count: 2 }];
  throwAt(g, 0, 2, 2);
  const boom = g.log.at(-1);
  assert.deepEqual([boom.type, boom.count, boom.sips, boom.hidden], ['mijn', 3, 15, true]);
  assert.equal(g.players[0].sips, 15);
  assert.equal(g.players[0].mines, 3);
  assert.equal(g.mines.length, 0, 'de mijnen zijn van het veld');
  assert.deepEqual([g.phase, g.hit], ['plaatsen', 3]);
  assert.equal(M.guess(g, 0, 'rood', seats(3)), null, 'eerst de mijnen neerleggen');
  assert.equal(M.place(g, 1, [0]), null, 'niet aan de beurt');
  assert.equal(M.place(g, 0, [at(2, 2)]), null, 'niet op de kaart van de worp');
  assert.equal(M.place(g, 0, [at(1, 2), at(2, 2)]), null);
  g.cards[0].open = true;
  assert.equal(M.place(g, 0, [0, 1]), null, 'niet op een open kaart');
  assert.equal(M.place(g, 0, [1, 2]).left, 2);
  M.place(g, 0, [2, 1]);
  assert.equal(g.mines.length, 1);
  assert.equal(g.mines[0].count, 2, 'twee mijnen op dezelfde plek');
  assert.equal(M.place(g, 0, [3, 4, 9, 10]), null, 'niet op een hoek van vier');
  M.place(g, 0, [9, 10]);
  assert.equal(g.phase, 'gokken');
  assert.ok(g.mines.every((m) => !m.hidden), 'verlegde mijnen ziet iedereen');
  // wie op een van de twee kaarten landt, raakt de mijn
  g.cards[at(2, 2)].card = RED;
  M.guess(g, 0, 'rood', seats(3));
  throwAt(g, 1, 4, 2);
  assert.equal(g.log.at(-1).type, 'mijn');
  assert.equal(g.players[1].sips, 5);
});

test('ligt alleen de kaart van de worp nog dicht, dan verdwijnt de mijn', () => {
  const g = game(2, 3);
  g.cards.forEach((c, i) => { if (i !== 20) c.open = true; });
  g.mines = [{ cells: [20], hidden: true, count: 1 }];
  throwAt(g, 0, 1, 1);
  assert.deepEqual([g.target, g.phase, g.hit], [20, 'gokken', 0]);
  assert.equal(g.players[0].sips, 3);
  M.guess(g, 0, 'rood', [0, 1]);
  assert.equal(g.phase, 'klaar');
  assert.equal(g.log.at(-1).type, 'klaar');
});

test('een nieuw veld houdt de stand; de slokken per mijn wijzigen kan alleen tussen twee velden', () => {
  const g = game(2);
  assert.equal(M.setMineSips(g, 10), false);
  g.cards.forEach((c, i) => { if (i) c.open = true; });
  throwAt(g, 0, 1, 1);
  M.guess(g, 0, 'rood', [0, 1]);
  assert.equal(g.phase, 'klaar');
  const sips = g.players.map((p) => p.sips);
  assert.equal(M.setMineSips(g, 4), false);
  assert.equal(M.setMineSips(g, 10), true);
  assert.ok(M.next(g, [0, 1]));
  assert.deepEqual([g.round, M.closed(g), g.mines.length, g.mineSips], [2, 36, M.MINES, 10]);
  assert.equal(g.turn, 1);
  assert.deepEqual(g.players.map((p) => p.sips), sips);
});

test('valt wie mijnen moest leggen weg, dan legt de server ze en is de volgende aan de beurt', () => {
  const g = game(3);
  g.mines = [{ cells: [7], hidden: true, count: 1 }];
  throwAt(g, 0, 2, 2);
  assert.equal(g.phase, 'plaatsen');
  assert.equal(M.fixTurn(g, [1, 2]), true);
  assert.deepEqual([g.turn, g.phase, g.hit], [1, 'gooien', 0]);
  assert.equal(g.mines.length, 1);
  assert.ok(!g.mines[0].hidden && g.mines[0].cells[0] !== 7);
  assert.equal(g.cards[7].open, false, 'de kaart van de worp blijft dicht');
  M.addPlayer(g, 'Laat');
  throwAt(g, 1, 6, 6);
  if (g.phase === 'plaatsen') M.place(g, 1, [0]);
  g.cards[35].card = RED;
  M.guess(g, 1, 'rood', [1, 2, 3]);
  throwAt(g, 2, 6, 5);
  if (g.phase === 'plaatsen') M.place(g, 2, [0]);
  g.cards[29].card = RED;
  M.guess(g, 2, 'rood', [1, 2, 3]);
  assert.equal(g.turn, 3, 'wie later aanschuift, is ook aan de beurt');
});

test('honderd velden lopen altijd uit', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const g = M.newGame(names(3), { seed });
    M.begin(g, seats(3), 0);
    for (let n = 0; g.phase !== 'klaar' && n < 2000; n++) {
      if (g.phase === 'gooien' || g.phase === 'rij') M.roll(g, g.turn);
      else if (g.phase === 'plaatsen') {
        const free = g.cards.findIndex((c, i) => !c.open && i !== g.target);
        assert.ok(M.place(g, g.turn, [free]), `seed ${seed}: plek voor de mijn`);
      } else M.guess(g, g.turn, n % 2 ? 'rood' : 'zwart', seats(3));
    }
    assert.equal(g.phase, 'klaar', `seed ${seed}`);
    assert.equal(M.closed(g), 0);
    assert.equal(g.mines.length, 0, 'alle mijnen zijn ontploft');
  }
});
