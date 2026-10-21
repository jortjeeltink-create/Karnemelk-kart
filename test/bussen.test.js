// Bussen: kaarten, vragenronde, uitdelen, sparen, piramide, kaart kiezen bij gelijkspel en de bus.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as B from '../public/shared/bussen.js';

const c = (r, s = 0) => ({ r, s });
const top = (g) => g.deck[g.deck.length - 1];
// het antwoord dat goed is voor de bovenste kaart (bij paal is alles fout)
const goodAnswer = (g) => B.truth(g.round, g.players[g.turn].hand, top(g)) ?? B.QUESTIONS[g.round].options[0];
const badAnswer = (g) => {
  const right = B.truth(g.round, g.players[g.turn].hand, top(g));
  return B.QUESTIONS[g.round].options.find((o) => o !== right);
};
// alle open uitdelingen naar de volgende speler aan tafel
const dealAll = (g) => { while (g.deals.length) { const d = g.deals[0]; B.deal(g, d.from, { [(d.from + 1) % g.players.length]: d.n }); } };
const answerAll = (g, pick = goodAnswer) => { while (g.phase === 'vragen') { dealAll(g); B.answer(g, g.turn, pick(g)); } dealAll(g); };

test('een spel heeft 52 verschillende kaarten en schudden hangt alleen af van de seed', () => {
  const deck = B.newDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map(B.label)).size, 52);
  assert.deepEqual(B.newGame(['A', 'B'], { seed: 42 }).deck, B.newGame(['A', 'B'], { seed: 42 }).deck);
  assert.notDeepEqual(B.newGame(['A', 'B'], { seed: 42 }).deck, B.newGame(['A', 'B'], { seed: 43 }).deck);
  assert.equal(B.label(c(14, 0)), 'A♥');
  assert.equal(B.label(c(10, 3)), '10♠');
  assert.equal(B.cardName(c(12, 2)), 'de vrouw ♣');
  assert.equal(B.sipsText(1), '1 slok');
  assert.equal(B.sipsText(3), '3 slokken');
});

test('de vier vragen: rood/zwart, hoger/lager, binnen/buiten en het teken, gelijk is paal', () => {
  assert.equal(B.truth(0, [], c(5, 1)), 'rood');
  assert.equal(B.truth(0, [], c(5, 3)), 'zwart');
  assert.equal(B.truth(1, [c(7)], c(9)), 'hoger');
  assert.equal(B.truth(1, [c(7)], c(14)), 'hoger', 'aas is het hoogst');
  assert.equal(B.truth(1, [c(7)], c(2)), 'lager');
  assert.equal(B.truth(1, [c(7)], c(7, 2)), null);
  assert.equal(B.truth(2, [c(4), c(10)], c(6)), 'binnen');
  assert.equal(B.truth(2, [c(10), c(4)], c(6)), 'binnen', 'volgorde van de eerste twee maakt niet uit');
  assert.equal(B.truth(2, [c(4), c(10)], c(12)), 'buiten');
  assert.equal(B.truth(2, [c(4), c(10)], c(4, 3)), null);
  assert.equal(B.truth(2, [c(8), c(8)], c(9)), 'buiten');
  assert.equal(B.truth(2, [c(8), c(8)], c(8, 1)), null);
  // vraag 4: heb je het vormpje al?
  assert.equal(B.truth(3, [c(2, 0), c(5, 2), c(9, 2)], c(13, 2)), 'ja');
  assert.equal(B.truth(3, [c(2, 0), c(5, 2), c(9, 2)], c(13, 1)), 'nee');
  assert.equal(B.canDisco([c(2, 0), c(5, 1), c(9, 2)]), true);
  assert.equal(B.canDisco([c(2, 0), c(5, 1), c(9, 1)]), false);
  assert.deepEqual(B.QUESTIONS.map((q) => q.sips), [1, 2, 3, 4]);
});

test('namen worden opgeschoond en het aantal spelers klopt', () => {
  assert.deepEqual(B.cleanNames(['  Jort ', '', 'jort', 'Meke', '   ', 'Een hele lange naam hoor']), ['Jort', 'jort 2', 'Meke', 'Een hele lange']);
  assert.throws(() => B.newGame(['Alleen']));
  assert.throws(() => B.newGame(Array.from({ length: 10 }, (_, i) => `S${i}`)));
  const g = B.newGame(Array.from({ length: 9 }, (_, i) => `S${i}`), { seed: 1, busLength: 99 });
  assert.equal(g.players.length, 9);
  assert.equal(g.busLength, B.BUS_DEFAULT, 'onbekende buslengte wordt de standaard');
});

test('vragenronde: alleen wie aan de beurt is, fout is zelf drinken, goed is niks', () => {
  const g = B.newGame(['Jort', 'Meke', 'Sim'], { seed: 7 });
  assert.equal(B.answer(g, 1, goodAnswer(g)), null, 'Meke is nog niet aan de beurt');
  const ev = B.answer(g, 0, badAnswer(g));
  assert.equal(ev.ok, false);
  assert.equal(ev.seq, 1);
  assert.equal(g.players[0].pending, 1, 'fout: 1 slok om te nemen');
  assert.deepEqual(g.players[0].from, [{ p: -1, n: 1 }]);
  assert.equal(g.turn, 1);
  assert.equal(B.answer(g, 1, 'hoger'), null, 'in ronde 1 bestaat hoger niet');

  // goed geraden (in ronde 1 kan geen paal): niks drinken en ook niks uitdelen
  const ev2 = B.answer(g, 1, goodAnswer(g));
  assert.equal(ev2.ok, true);
  assert.equal(g.deals.length, 0);
  assert.equal(g.players[1].pending, 0);
  assert.equal(g.players[1].goed, 1);
  answerAll(g);
  for (const p of g.players) assert.equal(p.hand.length, 4);
  assert.equal(g.phase, 'piramide');
  assert.equal(g.pyramid.length, B.PYRAMID_SIZE);
  assert.equal(B.PYRAMID_SIZE, 25);
  const seen = [...g.players.flatMap((p) => p.hand), ...g.pyramid.map((s) => s.card)].map(B.label);
  assert.equal(new Set(seen).size, seen.length, 'geen kaart dubbel');
});

test('slokken: nu doen of sparen, en gespaarde slokken komen terug aan het eind van elke ronde', () => {
  const g = B.newGame(['Jort', 'Meke'], { seed: 3 });
  B.answer(g, 0, badAnswer(g));                 // Jort: 1 slok
  assert.equal(B.sips(g, 1, 'now'), null, 'Meke hoeft niets');
  assert.equal(B.sips(g, 0, 'save').n, 1);
  assert.equal(g.players[0].saved, 1);
  assert.equal(g.players[0].pending, 0);
  dealAll(g);
  B.answer(g, 1, badAnswer(g));                 // Meke: 1 slok
  assert.equal(B.sips(g, 1, 'now').n, 1);
  assert.equal(g.players[1].drank, 1);
  answerAll(g, badAnswer);
  // einde vragenronde: wie gespaard heeft, krijgt ze terug
  assert.equal(g.phase, 'piramide');
  assert.equal(g.players[0].settle, 'ronde');
  // eerst de nieuwe slokken (allemaal sparen), daarna de gespaarde: weer sparen
  while (g.players[0].pending) B.sips(g, 0, 'save');
  const saved = g.players[0].saved;
  assert.ok(saved > 1);
  const ev = B.sips(g, 0, 'save');
  assert.equal(ev.kind, 'ronde');
  assert.equal(g.players[0].settle, null);
  assert.equal(g.players[0].saved, saved, 'weer sparen houdt ze vast');
  // de piramide afmaken: weer een rondeeinde
  while (g.phase === 'piramide') { dealAll(g); B.flip(g); }
  dealAll(g);
  assert.equal(g.players[0].settle, 'ronde');
  while (g.players[0].pending) B.sips(g, 0, 'save');   // tijdens de piramide uitgedeelde slokken ook sparen
  const saved2 = g.players[0].saved;
  const now = B.sips(g, 0, 'now');
  assert.equal(now.kind, 'ronde');
  assert.equal(now.n, saved2);
  assert.equal(g.players[0].saved, 0);
  assert.equal(g.players[0].drank, saved2);
  assert.equal(g.players[0].savedTotal, saved2);
});

test('aan het eind van het spel kan sparen niet meer', () => {
  const g = B.newGame(['Jort', 'Meke'], { seed: 9, busLength: 5 });
  answerAll(g);
  while (g.phase === 'piramide') { dealAll(g); B.flip(g); }
  dealAll(g);
  while (g.phase === 'kiezen') {
    for (const p of g.candidates.slice()) {
      const free = g.pick.cards.findIndex((_, i) => g.pick.taken[i] == null);
      if (!Object.values(g.pick.taken).includes(p)) B.pick(g, p, free);
    }
  }
  // de buspassagier spaart alles
  const r = g.rider, b = g.bus;
  b.cards = [c(7), c(10), c(3), c(3, 2), c(9)];
  B.guess(g, r, 'hoger'); B.guess(g, r, 'lager');
  B.guess(g, r, 'hoger');                       // paal: 3 slokken
  assert.equal(g.players[r].pending >= 3, true);
  while (g.players[r].pending) B.sips(g, r, 'save');
  B.retry(g, r);
  b.cards = [c(2), c(5), c(14), c(4), c(13)];
  for (const o of ['hoger', 'hoger', 'lager', 'hoger']) B.guess(g, r, o);
  assert.equal(g.phase, 'klaar');
  assert.equal(g.players[r].settle, 'eind');
  assert.equal(B.sips(g, r, 'save'), null, 'niet meer sparen');
  const ev = B.sips(g, r, 'now');
  assert.equal(ev.kind, 'eind');
  assert.equal(g.players[r].saved, 0);
  assert.equal(g.players[r].settle, null);
});

test('disco: met drie verschillende vormen, en de vierde vorm betekent een bak voor iedereen', () => {
  const setup = (hand0, next) => {
    // meteen naar vraag 4, met zelfgekozen kaarten
    const h = B.newGame(['Jort', 'Meke', 'Sim'], { seed: 4 });
    h.round = 3; h.turn = 0;
    h.players.forEach((p) => { p.hand = [c(2, 0), c(3, 0), c(4, 0)]; });
    h.players[0].hand = hand0;
    h.deck.push(next);
    return h;
  };
  // geen drie verschillende vormen: disco mag niet
  const g0 = setup([c(2, 0), c(5, 1), c(9, 1)], c(13, 3));
  assert.equal(B.answer(g0, 0, 'disco'), null);
  // disco goed: iedereen een bak, niets uitdelen
  const g = setup([c(2, 0), c(5, 1), c(9, 2)], c(13, 3));
  const ev = B.answer(g, 0, 'disco');
  assert.equal(ev.ok, true);
  assert.equal(ev.disco, true);
  assert.equal(g.deals.length, 0);
  assert.deepEqual(g.players.map((p) => p.bak), [1, 1, 1]);
  assert.deepEqual(g.players[1].bakFrom, [{ p: 0, n: 1, disco: true }]);
  assert.equal(g.players[0].disco, 1);
  assert.equal(B.bak(g, 1).type, 'bak');
  assert.equal(g.players[1].bak, 0);
  assert.equal(g.players[1].bakken, 1);
  assert.equal(B.bak(g, 1), null, 'geen bak meer te doen');
  assert.ok(B.titles(g).some((t) => t.id === 'disco' && t.names[0] === 'Jort'));
  // disco mis: de vorm had je al, dat is 4 slokken
  const g2 = setup([c(2, 0), c(5, 1), c(9, 2)], c(13, 1));
  const ev2 = B.answer(g2, 0, 'disco');
  assert.equal(ev2.ok, false);
  assert.equal(ev2.right, 'ja');
  assert.equal(g2.players[0].pending, 4);
  assert.deepEqual(g2.players.map((p) => p.bak), [0, 0, 0]);
  // gewoon nee zeggen bij de vierde vorm: goed, en verder niks
  const g3 = setup([c(2, 0), c(5, 1), c(9, 2)], c(13, 3));
  assert.equal(B.answer(g3, 0, 'nee').ok, true);
  assert.equal(g3.deals.length, 0);
  assert.deepEqual(g3.players.map((p) => p.bak), [0, 0, 0]);
});

test('paal telt als fout en kost de slokken van die vraag', () => {
  for (let seed = 0; seed < 400; seed++) {
    const g = B.newGame(['A', 'B'], { seed });
    while (g.phase === 'vragen') {
      dealAll(g);
      const right = B.truth(g.round, g.players[g.turn].hand, top(g));
      if (right === null) {
        const who = g.turn, before = g.players[who].pending, sips = B.QUESTIONS[g.round].sips;
        const ev = B.answer(g, who, B.QUESTIONS[g.round].options[0]);
        assert.equal(ev.paal, true);
        assert.equal(ev.ok, false);
        assert.equal(g.players[who].pending, before + sips);
        return;
      }
      B.answer(g, g.turn, right);
    }
  }
  assert.fail('geen paal gevonden');
});

test('piramide: 7-6-5-4-3 kaarten, 2 tot 5 slokken per kaart en bovenin een bak uitdelen', () => {
  assert.deepEqual(B.PYRAMID.map((r) => r.count), [7, 6, 5, 4, 3]);
  assert.deepEqual(B.pyramidRows(), [[22, 23, 24], [18, 19, 20, 21], [13, 14, 15, 16, 17], [7, 8, 9, 10, 11, 12], [0, 1, 2, 3, 4, 5, 6]]);
  const g = B.newGame(['Jort', 'Meke'], { seed: 11 });
  answerAll(g);
  assert.equal(g.deals.length, 0, 'in de vragenronde wordt niks uitgedeeld');
  g.players[0].hand = [c(7, 0), c(7, 1), c(9, 0), c(12, 0)];
  g.players[1].hand = [c(7, 2), c(13, 0), c(3, 0), c(4, 0)];
  g.pyramid.forEach((s, i) => { s.card = c(5, i % 4); });
  g.pyramid[0].card = c(7, 3);    // onderste rij: 2 slokken per kaart
  g.pyramid[7].card = c(13, 1);   // tweede rij: 3 slokken
  g.pyramid[22].card = c(12, 2);  // bovenste rij: een bak
  const ev = B.flip(g);
  assert.equal(ev.row, 1);
  assert.deepEqual(ev.matches.map((m) => [m.player, m.n, m.bak]), [[0, 4, false], [1, 2, false]]);
  assert.deepEqual(g.deals, [{ from: 0, n: 4, bak: false }, { from: 1, n: 2, bak: false }]);
  assert.equal(B.flip(g), null, 'eerst uitdelen');
  assert.equal(B.deal(g, 1, { 1: 2 }), null, 'niet aan jezelf');
  assert.equal(B.deal(g, 1, { 0: 1 }), null, 'precies 2 slokken');
  B.deal(g, 1, { 0: 2 });
  assert.equal(g.players[0].pending, 2);
  const dealtBefore = g.players[0].dealt;
  assert.equal(B.skipDeal(g, 0).hardop, true);
  assert.equal(g.players[0].dealt, dealtBefore + 4);
  for (let i = 1; i < 7; i++) { B.flip(g); dealAll(g); }
  const ev2 = B.flip(g);
  assert.equal(ev2.row, 2);
  assert.ok(ev2.matches.some((m) => m.player === 1 && m.n === 3));
  dealAll(g);
  while (g.next < 22) { B.flip(g); dealAll(g); }
  // bovenste rij: Jort legt zijn vrouw weg en deelt een bak uit
  const ev3 = B.flip(g);
  assert.equal(ev3.row, 5);
  assert.deepEqual(ev3.matches.map((m) => [m.player, m.n, m.bak]), [[0, 1, true]]);
  const before = g.players[1].pending;
  const d = B.deal(g, 0, { 1: 1 });
  assert.equal(d.bak, true);
  assert.equal(g.players[1].bak, 1);
  assert.equal(g.players[1].pending, before, 'een bak is geen slok');
  assert.deepEqual(g.players[1].bakFrom, [{ p: 0, n: 1, disco: false }]);
  assert.equal(g.players[0].bakDealt, 1);
  assert.equal(B.bak(g, 1).type, 'bak');
  assert.deepEqual(g.players[1].bakFrom, []);
});

test('met veel spelers komt er een tweede spel kaarten bij voor de piramide', () => {
  const g = B.newGame(Array.from({ length: 9 }, (_, i) => `S${i}`), { seed: 2 });
  answerAll(g);
  assert.equal(g.pyramid.length, 25, '36 kaarten in handen, dus 25 haalt het niet uit één spel');
  assert.ok(g.pyramid.every((s) => s.card && s.card.r >= 2 && s.card.r <= 14));
});

test('gelijkspel om de bus: iedereen kiest een dichte kaart en de laagste moet erin', () => {
  const tied = () => {
    const g = B.newGame(['A', 'B', 'C'], { seed: 5 });
    answerAll(g);
    g.players[0].hand = [c(2), c(8)]; g.players[1].hand = [c(3), c(4)]; g.players[2].hand = [c(6)];
    g.pyramid.forEach((s, i) => { s.card = c(5, i % 4); });    // vijven, die heeft niemand
    while (g.phase === 'piramide') B.flip(g);
    return g;
  };
  const g = tied();
  assert.equal(g.phase, 'kiezen');
  assert.deepEqual(g.candidates, [0, 1]);
  assert.equal(g.pick.cards.length, 2 + B.PICK_EXTRA);
  assert.deepEqual(B.waitingOn(g), [0, 1]);
  assert.equal(B.pick(g, 2, 0), null, 'C staat niet gelijk');
  g.pick.cards = [c(9), c(4), c(12), c(4, 2)];
  assert.equal(B.pick(g, 0, 0).type, 'gekozen');
  assert.equal(B.pick(g, 1, 0), null, 'die kaart is al gekozen');
  assert.equal(B.pick(g, 0, 2), null, 'A heeft al gekozen');
  assert.deepEqual(B.waitingOn(g), [1]);
  const ev = B.pick(g, 1, 1);
  assert.equal(ev.type, 'kies');
  assert.deepEqual(ev.low, [1]);
  assert.equal(g.phase, 'bus');
  assert.equal(g.rider, 1, 'B trok de 4, lager dan de 9');

  // weer gelijk: dan kiezen alleen die twee opnieuw
  const g2 = tied();
  g2.pick.cards = [c(6), c(6, 3), c(10), c(11)];
  B.pick(g2, 0, 0);
  const again = B.pick(g2, 1, 1);
  assert.equal(again.again, true);
  assert.equal(g2.phase, 'kiezen');
  assert.equal(g2.pick.round, 2);
  assert.deepEqual(g2.candidates, [0, 1]);
  assert.deepEqual(g2.pick.taken, {});
});

test('de bus: alleen de passagier gokt, fout kost de hoeveelste gok en dan opnieuw', () => {
  const g = B.newGame(['A', 'B'], { seed: 9, busLength: 5 });
  answerAll(g);
  g.players[0].hand = [c(2), c(3)]; g.players[1].hand = [];
  g.pyramid.forEach((s, i) => { s.card = c(5, i % 4); });
  while (g.phase === 'piramide') B.flip(g);
  assert.equal(g.phase, 'bus');
  assert.equal(g.rider, 0);
  const b = g.bus;
  assert.equal(b.cards.length, 5);
  assert.equal(new Set(b.cards.map(B.label)).size, 5);
  assert.equal(B.guess(g, 1, 'hoger'), null, 'B zit niet in de bus');
  b.cards = [c(7), c(10), c(3), c(3, 2), c(9)];
  assert.equal(B.guess(g, 0, 'hoger').ok, true);
  assert.equal(B.guess(g, 0, 'lager').ok, true);
  const before = g.players[0].pending;
  const ev = B.guess(g, 0, 'hoger');
  assert.equal(ev.paal, true);
  assert.equal(ev.sips, 3);
  assert.equal(g.players[0].pending, before + 3);
  assert.deepEqual(B.waitingOn(g), [0]);
  assert.equal(B.guess(g, 0, 'lager'), null, 'eerst opnieuw beginnen');
  assert.equal(B.retry(g, 1), null);
  assert.equal(B.retry(g, 0).tries, 2);
  assert.equal(b.open, 1);
  b.cards = [c(2), c(5), c(14), c(4), c(13)];
  for (const o of ['hoger', 'hoger', 'lager', 'hoger']) B.guess(g, 0, o);
  assert.equal(g.phase, 'klaar');
  assert.equal(g.log[g.log.length - 1].done, true);
  const t = B.titles(g);
  assert.equal(t[0].id, 'chauffeur');
  assert.match(t[0].text, /2 ritten, 3 slokken in de bus/);
});

test('een heel potje met 9 spelers loopt van begin tot eind', () => {
  for (let seed = 0; seed < 40; seed++) {
    const g = B.newGame(Array.from({ length: 9 }, (_, i) => `Speler ${i + 1}`), { seed, busLength: 10 });
    let guard = 0;
    while (g.phase !== 'klaar' && guard++ < 5000) {
      if (g.deals.length) { dealAll(g); continue; }
      if (g.phase === 'vragen') B.answer(g, g.turn, seed % 2 ? goodAnswer(g) : badAnswer(g));
      else if (g.phase === 'piramide') B.flip(g);
      else if (g.phase === 'kiezen') {
        const p = B.waitingOn(g)[0];
        B.pick(g, p, g.pick.cards.findIndex((_, i) => g.pick.taken[i] == null));
      } else if (g.bus.fail) B.retry(g, g.rider);
      else B.guess(g, g.rider, g.bus.cards[g.bus.open - 1].r >= 8 ? 'lager' : 'hoger');
      // iedereen beslist meteen: om en om sparen en nu doen
      g.players.forEach((p, i) => { if (p.pending || p.settle) B.sips(g, i, g.phase === 'klaar' || (seed + i) % 2 ? 'now' : 'save'); });
    }
    assert.equal(g.phase, 'klaar', `seed ${seed} komt uit de bus`);
    g.players.forEach((p, i) => { while (p.pending || p.settle) B.sips(g, i, 'now'); });
    const cards = g.players.reduce((n, p) => n + p.laid.length + p.hand.length, 0);
    assert.equal(cards, 36, 'elke kaart is nog in een hand of in de piramide');
    for (const p of g.players) {
      assert.equal(p.saved, 0);
      assert.equal(p.drank, p.got, 'alles is uiteindelijk gedronken');
    }
    assert.ok(g.log.length <= 16);
    assert.ok(B.titles(g).length >= 2);
  }
});
