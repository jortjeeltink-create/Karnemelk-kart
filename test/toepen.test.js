// Toepen: slagen, bekennen, kloppen en passen, de laatste slag wint, afvallen bij de grens, vuile was en kans op toep.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../public/shared/toepen.js';

const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const C = (r, s) => ({ r, s });   // s: 0 harten, 1 ruiten, 2 klaveren, 3 schoppen (zie bussen.js)
// een potje waarin we zelf de kaarten bepalen; speler 0 komt uit
function game(hands, opts = {}) {
  const g = T.newGame(names(hands.length), { seed: 3, ...opts });
  g.hands = hands.map((h) => h.map(([r, s]) => C(r, s)));
  g.inRound = hands.map(() => true);
  g.dealer = hands.length - 1;
  g.leader = g.turn = 0;
  g.phase = 'spelen';
  g.started = false;
  return g;
}

test('32 kaarten, 4 per speler, de speler na de deler komt uit', () => {
  const g = T.newGame(names(4), { seed: 9 });
  assert.equal(g.hands.length, 4);
  assert.ok(g.hands.every((h) => h.length === 4));
  const all = [...g.hands.flat(), ...g.deck];
  assert.equal(all.length, 32);
  assert.ok(all.every((c) => c.r >= 7 && c.r <= 14), 'alleen 7 tot en met aas');
  assert.equal(new Set(all.map((c) => `${c.r}${c.s}`)).size, 32);
  assert.equal(g.leader, (g.dealer + 1) % 4);
  assert.deepEqual([g.stake, g.phase, g.limit], [1, 'spelen', 10]);
  assert.equal(T.newGame(names(2), { limit: 12 }).limit, 10, 'alleen 10 of 15');
});

test('de volgorde: boer, vrouw, heer, aas, 7, 8, 9, 10', () => {
  const s = [11, 12, 13, 14, 7, 8, 9, 10].map((r) => T.strength(C(r, 0)));
  assert.deepEqual(s, [0, 1, 2, 3, 4, 5, 6, 7]);
});

test('bekennen: wie de kleur heeft, moet die opleggen; de hoogste in de gevraagde kleur wint de slag', () => {
  const g = game([[[7, 0], [8, 1], [9, 2], [10, 3]], [[14, 0], [10, 0], [8, 2], [9, 3]], [[12, 1], [13, 1], [11, 2], [7, 3]]]);
  assert.equal(T.play(g, 1, C(14, 0)), null, 'niet aan de beurt');
  assert.ok(T.play(g, 0, C(7, 0)));
  assert.deepEqual(T.legal(g, 1).map((c) => c.r).sort(), [10, 14], 'harten bekennen');
  assert.equal(T.play(g, 1, C(8, 2)), null, 'eerst bekennen');
  T.play(g, 1, C(14, 0));
  assert.equal(T.legal(g, 2).length, 4, 'geen harten: alles mag');
  T.play(g, 2, C(7, 3));   // een hoge 7, maar in een andere kleur
  const slag = g.log.at(-1);
  assert.deepEqual([slag.type, slag.winner, slag.nr], ['slag', 0, 1], 'de harten 7 is hoger dan de harten aas');
  assert.deepEqual([g.leader, g.turn], [0, 0], 'de winnaar komt uit');
});

test('wie de vierde slag wint, wint de ronde; de rest krijgt de inzet', () => {
  const g = game([[[10, 0], [10, 1], [10, 2], [10, 3]], [[7, 0], [7, 1], [7, 2], [8, 3]]]);
  for (let k = 0; k < 4; k++) { T.play(g, 0, g.hands[0][0]); T.play(g, 1, T.legal(g, 1)[0]); }
  assert.equal(g.phase, 'ronde');
  const r = g.log.find((e) => e.type === 'ronde');
  assert.deepEqual([r.winner, r.stake, r.losers], [0, 1, [1]]);
  assert.deepEqual(g.players.map((p) => p.pts), [0, 1]);
  assert.ok(T.next(g));
  assert.deepEqual([g.round, g.phase, g.stake], [2, 'spelen', 1]);
  assert.equal(g.hands.every((h) => h.length === 4), true);
});

test('kloppen: de inzet gaat omhoog; passen kost de oude inzet en je doet niet meer mee', () => {
  const g = game([[[10, 0], [9, 0], [8, 0], [7, 0]], [[11, 1], [12, 1], [13, 1], [14, 1]], [[11, 2], [12, 2], [13, 2], [14, 2]]]);
  assert.ok(T.knock(g, 0));
  assert.equal(g.phase, 'klop');
  assert.equal(T.play(g, 0, C(10, 0)), null, 'eerst kiest iedereen');
  assert.equal(T.answer(g, 0, true), null, 'wie klopt, hoeft niet te kiezen');
  T.answer(g, 1, false);
  assert.deepEqual([g.players[1].pts, g.inRound[1]], [1, false], 'passen kost 1');
  T.answer(g, 2, true);
  assert.deepEqual([g.phase, g.stake, g.knocker], ['spelen', 2, 0]);
  assert.equal(T.canKnock(g, 0), false, 'niet twee keer achter elkaar');
  // overkloppen: passen kost nu 2
  assert.ok(T.knock(g, 2));
  T.answer(g, 0, false);
  assert.equal(g.players[0].pts, 2);
  // nog maar één over: die wint de ronde meteen
  assert.equal(g.phase, 'ronde');
  assert.equal(g.log.find((e) => e.type === 'ronde').winner, 2);
});

test('je kunt niet hoger kloppen dan de grens min je eigen strafpunten', () => {
  const g = game([[[10, 0], [9, 0], [8, 0], [7, 0]], [[11, 1], [12, 1], [13, 1], [14, 1]]]);
  g.players[0].pts = 8; g.stake = 2;
  assert.equal(T.canKnock(g, 0), false, 'op 8 van de 10: hooguit voor 2');
  g.stake = 1;
  assert.equal(T.canKnock(g, 0), true);
});

test('een speler die halverwege past: de slag gaat door met wie er nog in zit', () => {
  const g = game([[[10, 0], [9, 0], [8, 0], [7, 0]], [[11, 0], [12, 1], [13, 1], [14, 1]], [[12, 0], [12, 2], [13, 2], [14, 2]]]);
  T.play(g, 0, C(7, 0));
  T.knock(g, 2);
  T.answer(g, 0, false);   // de uitkomer past
  T.answer(g, 1, true);
  assert.equal(g.turn, 1);
  T.play(g, 1, C(11, 0));
  T.play(g, 2, C(12, 0));
  const slag = g.log.findLast((e) => e.type === 'slag');
  assert.equal(slag.winner, 2, 'de vrouw wint van de boer; de 7 van wie paste telt niet');
});

test('de grens: wie die haalt ligt eruit, de laatste die overblijft wint', () => {
  const g = game([[[10, 0], [10, 1], [10, 2], [10, 3]], [[7, 0], [7, 1], [7, 2], [8, 3]]]);
  g.players[1].pts = 9;
  for (let k = 0; k < 4; k++) { T.play(g, 0, g.hands[0][0]); T.play(g, 1, T.legal(g, 1)[0]); }
  assert.equal(g.players[1].out, true);
  assert.deepEqual([g.phase, g.winner], ['klaar', 0]);
  assert.ok(T.again(g));
  assert.deepEqual(g.players.map((p) => [p.pts, p.out]), [[0, false], [0, false]]);
});

test('vuile was: echt en iemand kijkt (die krijgt 1 strafpunt), bluf en betrapt, of niemand kijkt', () => {
  const was = [[11, 0], [12, 1], [13, 2], [7, 3]];
  let g = game([was, [[8, 0], [8, 1], [8, 2], [9, 3]], [[9, 0], [9, 1], [9, 2], [10, 1]]]);
  assert.equal(T.isVuileWas(g.hands[0]), true);
  assert.ok(T.vuileWas(g, 0));
  assert.equal(T.play(g, 0, C(11, 0)), null, 'eerst kijken of geloven');
  T.check(g, 1, true); T.check(g, 2, false);
  let uit = g.log.at(-1).type === 'wasuit' ? g.log.at(-1) : g.log.findLast((e) => e.type === 'wasuit');
  assert.deepEqual([uit.real, uit.fresh, uit.cards.length], [true, true, 4]);
  assert.deepEqual(g.players.map((p) => p.pts), [0, 1, 0]);
  assert.equal(g.hands[0].length, 4);
  assert.equal(T.canWas(g, 0), false, 'één keer per ronde');
  // bluf: iemand kijkt
  g = game([[[10, 0], [9, 1], [8, 2], [7, 3]], [[8, 0], [8, 1], [8, 2], [9, 3]]]);
  const hand = [...g.hands[0]];
  T.vuileWas(g, 0); T.check(g, 1, true);
  uit = g.log.findLast((e) => e.type === 'wasuit');
  assert.deepEqual([uit.real, uit.fresh], [false, false], 'betrapt: hij speelt met zijn eigen kaarten');
  assert.deepEqual(g.hands[0], hand);
  assert.deepEqual(g.players.map((p) => p.pts), [0, 0]);
  // bluf, maar niemand kijkt: nieuwe kaarten, en niemand weet of het echt was
  g = game([[[10, 0], [9, 1], [8, 2], [7, 3]], [[8, 0], [8, 1], [8, 2], [9, 3]]]);
  T.vuileWas(g, 0); T.check(g, 1, false);
  uit = g.log.findLast((e) => e.type === 'wasuit');
  assert.deepEqual([uit.real, uit.fresh, uit.cards], [null, true, null]);
  // na de eerste kaart kan het niet meer
  g = game([[[10, 0], [9, 1], [8, 2], [7, 3]], [[8, 0], [8, 1], [8, 2], [9, 3]]]);
  T.play(g, 0, C(10, 0));
  assert.equal(T.canWas(g, 1), false);
});

test('kans op toep: alleen met drie dezelfde; vier dezelfde wint het hele spel', () => {
  const g = game([[[8, 0], [8, 1], [8, 2], [10, 3]], [[9, 0], [9, 1], [11, 2], [10, 1]]]);
  assert.equal(T.canKans(g, 1), false, 'geen drie dezelfde: geen kans op toep (bluffen mag niet)');
  // de laatste kaart van de stapel is de vierde 8
  g.deck = g.deck.filter((c) => !(c.r === 8 && c.s === 3));
  g.deck.push(C(8, 3));
  assert.ok(T.kans(g, 0));
  assert.deepEqual([g.phase, g.winner], ['klaar', 0]);
  assert.ok(g.log.some((e) => e.type === 'toep' && e.kans));
});

test('wie weg is, hoeft niet te kiezen: bij een klop mee, bij een vuile was geloven', () => {
  const g = game([[[10, 0], [9, 0], [8, 0], [7, 0]], [[11, 1], [12, 1], [13, 1], [14, 1]], [[11, 2], [12, 2], [13, 2], [14, 2]]]);
  T.knock(g, 0, [0, 1]);   // speler 2 is weg
  assert.deepEqual(g.klop.wait, [1]);
  T.answer(g, 1, true);
  assert.deepEqual([g.phase, g.stake, g.inRound[2]], ['spelen', 2, true]);
});

test('honderd potjes met willekeurige zetten lopen altijd af', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const n = 2 + (seed % 7);
    const g = T.newGame(names(n), { seed, limit: seed % 2 ? 10 : 15 });
    let r = seed;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let k = 0; g.phase !== 'klaar' && k < 20000; k++) {
      if (g.phase === 'ronde') { T.next(g); continue; }
      if (g.phase === 'klop') { T.answer(g, g.klop.wait[0], rnd() < .7); continue; }
      if (g.phase === 'was') { T.check(g, g.was.wait[0], rnd() < .3); continue; }
      const p = g.turn;
      if (rnd() < .05 && T.canKnock(g, p)) { T.knock(g, p); continue; }
      if (rnd() < .05 && T.canWas(g, p)) { T.vuileWas(g, p); continue; }
      if (T.canKans(g, p)) { T.kans(g, p); continue; }
      const opts = T.legal(g, p);
      assert.ok(T.play(g, p, opts[Math.floor(rnd() * opts.length)]), `seed ${seed}: een kaart die mag`);
    }
    assert.equal(g.phase, 'klaar', `seed ${seed}`);
    assert.ok(g.winner >= 0 && !g.players[g.winner].out);
  }
});
