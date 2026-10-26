// Paardenrace: inzetten, kaarten trekken, kaarten naast de baan die een paard terugzetten, en wie hoeveel drinkt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../public/shared/paard.js';

const c = (s, r = 5) => ({ r, s });
const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);
// een potje waarin iedereen al een paard en een inzet koos: horses[i] en bets[i] voor stoel i
function race(horses, bets = horses.map(() => 2)) {
  const g = P.newGame(names(horses.length), { seed: 1 });
  horses.forEach((h, i) => P.bet(g, i, h, bets[i], true));
  P.startRace(g, seats(horses.length));
  return g;
}
// de kaarten naast de baan vastzetten (vormen van onder naar boven)
const setTrack = (g, suits) => { g.track = suits.map((s) => ({ card: c(s), open: false })); };

test('inzetten: een paard kiezen, een inzet tussen 1 en 10, en klaar kan pas met een paard', () => {
  const g = P.newGame(names(3), { seed: 1 });
  assert.equal(g.phase, 'inzetten');
  assert.equal(P.bet(g, 0, 4, 2, false), null, 'er zijn maar vier paarden');
  assert.equal(P.bet(g, 0, 1, 0, false), null, 'minstens 1 slok');
  assert.equal(P.bet(g, 0, 1, P.BET_MAX + 1, false), null);
  assert.equal(P.bet(g, 0, -1, 3, true), null, 'klaar zonder paard kan niet');
  assert.equal(P.bet(g, 7, 1, 3, true), null, 'onbekende stoel');
  assert.equal(P.bet(g, 0, 1, 3, true), true);
  assert.deepEqual([g.players[0].horse, g.players[0].bet, g.players[0].ready], [1, 3, true]);
  assert.equal(P.startRace(g, seats(3)), null, 'met één speler die klaar is begint de race niet');
  assert.equal(P.autoStart(g, seats(3)), null, 'nog niet iedereen is klaar');
  P.bet(g, 1, 1, 2, true);
  assert.equal(P.autoStart(g, seats(3)), null);
  assert.ok(P.autoStart(g, [0, 1]), 'wie weg is telt niet mee: nu begint de race vanzelf');
  assert.equal(g.phase, 'race');
  assert.deepEqual(g.racers, [0, 1]);
  assert.equal(P.bet(g, 2, 0, 2, true), null, 'tijdens de race zet je niet in');
});

test('de race begint: zeven dichte kaarten, een stapel zonder azen, en niemand drinkt vooraf', () => {
  const g = race([0, 1, 1], [3, 2, 5]);
  assert.equal(g.track.length, P.TRACK);
  assert.ok(g.track.every((t) => !t.open));
  assert.equal(g.track.length + g.pile.length, 48);
  assert.ok([...g.pile, ...g.track.map((t) => t.card)].every((x) => x.r !== 14), 'de azen zijn de paarden');
  assert.deepEqual(g.pos, [0, 0, 0, 0]);
  assert.deepEqual(g.players.map((p) => p.sips), [0, 0, 0]);
  assert.equal(g.log.at(-1).type, 'start');
  assert.equal(g.turn, 0, 'de eerste race begint bij de eerste speler');
});

test('trekken: het paard van die vorm een stap naar voren, en dan is de volgende aan de beurt', () => {
  const g = race([0, 1, 2]);
  assert.equal(P.draw(g, 1, seats(3)), null, 'niet aan de beurt');
  const left = g.pile.length;
  const ev = P.draw(g, 0, seats(3));
  assert.equal(ev.type, 'kaart');
  assert.equal(g.pos[ev.card.s], 1);
  assert.equal(ev.horse, ev.card.s);
  assert.equal(g.pile.length, left - 1);
  assert.deepEqual(g.last, ev.card);
  assert.equal(g.turn, 1);
  P.draw(g, 1, seats(3));
  P.draw(g, 2, seats(3));
  assert.equal(g.turn, 0, 'rond de tafel');
});

test('zijn alle paarden langs een dichte kaart, dan gaat die open en moet dat paard een stap terug', () => {
  const g = race([0, 1]);
  setTrack(g, [2, 0, 3, 3, 3, 3, 3]);
  g.pos = [1, 1, 0, 1];
  P.draw(g, 0, [0, 1], c(1));
  assert.equal(g.track[0].open, false, 'klaveren staat nog op de start');
  P.draw(g, 1, [0, 1], c(2));
  // klaveren is nu ook langs de eerste kaart: die gaat open, en dat is klaveren, dus klaveren terug
  assert.equal(g.track[0].open, true);
  assert.deepEqual(g.pos, [1, 2, 0, 1]);
  const ev = g.log.at(-1);
  assert.deepEqual([ev.type, ev.index, ev.horse, ev.to], ['terug', 0, 2, 0]);
  assert.equal(g.track[1].open, false);
});

test('na een open kaart kan de volgende meteen ook open gaan', () => {
  const g = race([0, 1]);
  setTrack(g, [0, 0, 2, 2, 2, 2, 2]);
  g.pos = [3, 3, 3, 1];
  // schoppen naar 2: kaart 1 gaat open (harten terug naar 2), en iedereen is nog steeds langs kaart 2,
  // dus die gaat ook open (harten terug naar 1)
  P.draw(g, 0, [0, 1], c(3));
  assert.deepEqual(g.track.map((t) => t.open).slice(0, 3), [true, true, false]);
  assert.deepEqual(g.pos, [1, 3, 3, 2]);
  assert.deepEqual(g.log.slice(-2).map((e) => [e.type, e.index, e.horse, e.to]), [['terug', 0, 0, 2], ['terug', 1, 0, 1]]);
});

test('over de finish: de rest drinkt zijn eigen inzet en de hoogste inzet op de winnaar, samen hooguit 8', () => {
  const g = race([0, 1, 0, 2], [3, 2, 4, 1]);
  const before = g.players.map((p) => p.sips);
  g.pos = [P.FINISH - 1, 2, 2, 2];
  setTrack(g, [3, 3, 3, 3, 3, 3, 3]);
  g.track[0].open = true; g.track[1].open = true;
  const ev = P.draw(g, 0, seats(4), c(0));
  assert.equal(ev.type, 'kaart');
  assert.equal(g.phase, 'uitslag');
  assert.equal(g.winner, 0);
  assert.equal(g.turn, -1);
  const fin = g.log.at(-1);
  assert.deepEqual([fin.type, fin.horse, fin.winners, fin.pot], ['finish', 0, [0, 2], 4], 'de hoogste inzet op de winnaar');
  assert.deepEqual(g.drinks, [{ own: 0, winner: 0, total: 0 }, { own: 2, winner: 4, total: 6 }, { own: 0, winner: 0, total: 0 }, { own: 1, winner: 4, total: 5 }]);
  assert.deepEqual(g.players.map((p, i) => p.sips - before[i]), [0, 6, 0, 5]);
  assert.deepEqual(g.players.map((p) => p.wins), [1, 0, 1, 0]);
  assert.equal(P.draw(g, 1, seats(4)), null, 'de race is voorbij');
  // nooit meer dan 8, en nooit meer dan 5 inzetten
  const h = race([0, 1], [5, 5]);
  h.pos = [P.FINISH - 1, 2, 2, 2];
  P.draw(h, 0, [0, 1], c(0));
  assert.deepEqual(h.drinks[1], { own: 5, winner: 3, total: P.LOSE_MAX });
  assert.equal(P.BET_MAX, 5);
});

test('wint een paard waar niemand op zette, dan drinkt iedereen alleen zijn eigen inzet', () => {
  const g = race([0, 1], [3, 2]);
  g.pos = [2, 2, 2, P.FINISH - 1];
  P.draw(g, 0, [0, 1], c(3));
  assert.equal(g.winner, 3);
  assert.deepEqual(g.drinks.map((d) => d.total), [3, 2]);
});

test('volgende race: paard en inzet blijven staan, opnieuw klaar, en de volgende speler begint', () => {
  const g = race([0, 1, 2]);
  g.pos = [P.FINISH - 1, 0, 0, 0];
  P.draw(g, 0, seats(3), c(0));
  assert.equal(P.next(g).type, 'inzetten');
  assert.equal(g.phase, 'inzetten');
  assert.deepEqual(g.players.map((p) => [p.horse, p.ready]), [[0, false], [1, false], [2, false]]);
  P.addPlayer(g, 'Laat');
  seats(3).forEach((i) => P.bet(g, i, g.players[i].horse, 2, true));
  assert.equal(P.autoStart(g, seats(4)), null, 'de nieuwe speler moet ook kiezen');
  P.bet(g, 3, 3, 1, true);
  assert.ok(P.autoStart(g, seats(4)));
  assert.equal(g.race, 2);
  assert.equal(g.turn, 1, 'de speler na wie de vorige race begon');
  assert.deepEqual(g.racers, [0, 1, 2, 3]);
});

test('is wie moet trekken weg, dan slaat de beurt hem over; wie niet meedoet trekt nooit', () => {
  const g = P.newGame(names(4), { seed: 3 });
  [0, 1, 2].forEach((i) => P.bet(g, i, i, 2, true));
  P.startRace(g, seats(4));
  assert.deepEqual(g.racers, [0, 1, 2], 'speler 4 was niet klaar en kijkt mee');
  P.draw(g, 0, seats(4));
  assert.equal(g.turn, 1);
  assert.equal(P.fixTurn(g, [0, 2, 3]), true);
  assert.equal(g.turn, 2, 'speler 2 is weg');
  P.draw(g, 2, [0, 2, 3]);
  assert.equal(g.turn, 0, 'speler 4 zit niet in de race');
});

test('een race komt altijd over de finish voordat de stapel op is', () => {
  for (let seed = 1; seed <= 300; seed++) {
    const g = P.newGame(names(2), { seed });
    P.bet(g, 0, 0, 1, true);
    P.bet(g, 1, 2, 1, true);
    P.startRace(g, [0, 1]);
    let n = 0;
    while (g.phase === 'race') {
      assert.ok(P.draw(g, g.turn, [0, 1]), `seed ${seed}: trekken lukt`);
      assert.ok(g.pos.every((p) => p >= 0 && p <= P.FINISH));
      n++;
    }
    assert.equal(g.phase, 'uitslag');
    assert.equal(g.pos[g.winner], P.FINISH);
    assert.ok(n <= 41);
  }
});
