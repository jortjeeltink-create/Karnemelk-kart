// Weerwolven: de rollen, de nacht (wolven, ziener, heks, Cupido), de ochtend, stemmen, de jager, de geliefden,
// wie er wint en wie hoeveel drinkt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as W from '../public/shared/weerwolven.js';

const names = (n) => Array.from({ length: n }, (_, i) => `S${i + 1}`);
const seats = (n) => Array.from({ length: n }, (_, i) => i);
// een potje met vaste rollen, iedereen heeft zijn rol gezien en het is nacht 1
function game(roles, settings) {
  const g = W.newGame(names(roles.length), { seed: 1, settings });
  W.deal(g, seats(roles.length));
  roles.forEach((r, i) => { g.players[i].role = r; });
  g.deck = W.deckOf(roles);
  for (const p of seats(roles.length)) W.ready(g, p);
  return g;
}
// de hele nacht: de wolven kiezen `victim`, de rest doet zijn opdracht (zonder drankjes of Cupido)
function night(g, victim, extra = {}) {
  const alive = W.aliveList(g);
  for (const p of alive) {
    const task = g.night.tasks[p];
    const other = alive.find((x) => x !== p);
    if (task === 'wolf') W.wolfPick(g, p, victim);
    else if (task === 'zien') W.look(g, p, extra.look ?? other);
    else if (task === 'cupido') W.cupid(g, p, ...(extra.lovers ?? [p, other]));
    else if (task === 'verdenk') W.suspect(g, p, other);
  }
  for (const p of alive) if (g.phase === 'nacht' && g.night.tasks[p] === 'heks') W.witch(g, p, extra.save === true, extra.poison ?? -1);
}
const voteAll = (g, map) => { for (const [p, t] of Object.entries(map)) W.vote(g, Number(p), t); };
const last = (g, type) => g.log.filter((e) => e.type === type).at(-1);

test('de rollen: eerst de wolven, dan de aangezette rollen, de rest burger', () => {
  assert.deepEqual(W.roleList(4), ['wolf', 'ziener', 'heks', 'jager']);
  assert.deepEqual(W.roleList(7), ['wolf', 'wolf', 'ziener', 'heks', 'jager', 'burger', 'burger']);
  assert.deepEqual(W.roleList(7, { ...W.DEFAULT_SETTINGS, cupido: true, heks: false }), ['wolf', 'wolf', 'ziener', 'jager', 'cupido', 'burger', 'burger']);
  assert.deepEqual(W.roleList(10).filter((r) => r === 'wolf').length, 3);
  assert.equal(W.wolvesFor(5, 3), 2, 'altijd minder dan de helft wolf');
  assert.equal(W.wolvesFor(4, 2), 1);
  assert.deepEqual(W.deckOf(W.roleList(6)), { wolf: 2, ziener: 1, heks: 1, jager: 1, burger: 1 });
});

test('uitdelen: wie er is krijgt geheim een rol, wie er niet is kijkt mee; daarna bekijkt iedereen zijn rol', () => {
  const g = W.newGame(names(6), { seed: 9 });
  assert.equal(W.deal(g, [0, 1, 2]), null, 'minstens 4 spelers');
  const ev = W.deal(g, [0, 1, 2, 3, 5]);
  assert.deepEqual(ev.deck, { wolf: 1, ziener: 1, heks: 1, jager: 1, burger: 1 });
  assert.equal(g.players[4].role, null);
  assert.equal(g.players[4].alive, false, 'wie er niet was, kijkt mee');
  assert.deepEqual([g.phase, g.round, g.day], ['rollen', 1, 0]);
  for (const p of [0, 1, 2, 3]) W.ready(g, p);
  assert.equal(W.ready(g, 4), null, 'een kijker hoeft niks');
  assert.equal(g.phase, 'rollen');
  W.ready(g, 5);
  assert.deepEqual([g.phase, g.day], ['nacht', 1]);
});

test('s nachts heeft iedereen iets te doen; de wolven moeten het eens worden', () => {
  const g = game(['wolf', 'wolf', 'ziener', 'heks', 'burger', 'cupido']);
  assert.deepEqual(Object.values(g.night.tasks), ['wolf', 'wolf', 'zien', 'heks', 'verdenk', 'cupido']);
  assert.equal(W.wolfPick(g, 0, 1), null, 'geen wolf opeten');
  assert.equal(W.wolfPick(g, 4, 2), null, 'alleen wolven');
  W.wolfPick(g, 0, 4);
  W.wolfPick(g, 1, 2);
  assert.equal(g.night.locked, false, 'nog niet eens');
  assert.equal(W.witch(g, 3, true, -1), null, 'de heks wacht op de wolven');
  W.wolfPick(g, 1, 4);
  assert.deepEqual([g.night.locked, g.night.victim], [true, 4]);
  assert.equal(W.wolfPick(g, 0, 2), null, 'eens is eens');
  // de ziener ziet een rol
  assert.equal(W.look(g, 2, 2), null, 'niet jezelf');
  W.look(g, 2, 0);
  assert.deepEqual(g.players[2].seen, [{ p: 0, role: 'wolf', night: 1 }]);
  assert.equal(W.look(g, 2, 1), null, 'één keer per nacht');
  W.suspect(g, 4, 0);
  W.cupid(g, 5, 4, 2);
  assert.deepEqual(g.lovers, [2, 4]);
  assert.equal(g.loversKnown, false, 'de geliefden horen het pas als het ochtend is');
  assert.equal(g.phase, 'nacht', 'de heks moet nog');
  W.witch(g, 3, false, -1);
  assert.equal(g.phase, 'dag');
  // Burger 4 is opgegeten, en zijn geliefde (de ziener) sterft van verdriet
  const dawn = g.log.at(-1);
  assert.equal(dawn.type, 'ochtend');
  assert.deepEqual(dawn.deaths, [{ p: 4, role: 'burger' }, { p: 2, role: 'ziener', cause: 'liefde' }]);
  assert.deepEqual([g.players[4].sips, g.players[2].sips], [W.DEAD_SIPS, W.DEAD_SIPS]);
  assert.equal(g.loversKnown, true);
});

test('de heks redt één keer en vergiftigt één keer; zonder drankjes doet ze wat een burger doet', () => {
  const g = game(['wolf', 'heks', 'burger', 'burger', 'burger']);
  W.wolfPick(g, 0, 2);
  assert.equal(W.witch(g, 1, false, 2), null, 'het slachtoffer vergiftigen kan niet');
  assert.equal(W.witch(g, 1, false, 1), null, 'zichzelf ook niet');
  W.suspect(g, 2, 0); W.suspect(g, 3, 0); W.suspect(g, 4, 0);
  W.witch(g, 1, true, 3);
  assert.deepEqual(g.log.at(-1).deaths, [{ p: 3, role: 'burger' }], 'gered, en de vergiftigde is dood');
  assert.deepEqual(g.potions, { heal: false, poison: false });
  voteAll(g, { 0: -1, 1: -1, 2: -1, 4: -1 });
  assert.equal(g.phase, 'nacht');
  assert.equal(g.night.tasks[1], 'verdenk');
});

test('overdag: de meeste stemmen wordt opgehangen; wie op een onschuldige stemde drinkt; staken = niemand', () => {
  const g = game(['wolf', 'burger', 'burger', 'burger', 'burger', 'burger']);
  night(g, 5);
  assert.equal(g.phase, 'dag');
  assert.equal(W.vote(g, 1, 1), null, 'niet op jezelf');
  assert.equal(W.vote(g, 1, 5), null, 'niet op een dode');
  voteAll(g, { 0: 1, 1: 2, 2: 1, 3: 1 });
  assert.equal(g.phase, 'dag', 'nog niet iedereen heeft gestemd');
  W.vote(g, 3, 0);
  assert.equal(g.votes[3], 0, 'je kunt je stem nog veranderen');
  W.vote(g, 4, 1);
  const ev = last(g, 'stemming');
  assert.deepEqual([ev.type, ev.lynched, ev.tie, ev.wrong], ['stemming', 1, false, [0, 2, 4]]);
  assert.deepEqual(ev.deaths, [{ p: 1, role: 'burger' }]);
  assert.equal(g.players[2].sips, W.WRONG_VOTE_SIPS);
  assert.equal(g.players[1].sips, W.DEAD_SIPS);
  assert.deepEqual([g.phase, g.day], ['nacht', 2]);
  night(g, 4);
  voteAll(g, { 0: 2, 2: 0, 3: -1 });
  const tie = last(g, 'stemming');
  assert.deepEqual([tie.lynched, tie.tie], [-1, true]);
});

test('de jager neemt iemand mee, na de nacht en na het ophangen', () => {
  const g = game(['wolf', 'jager', 'burger', 'burger', 'wolf', 'burger']);
  night(g, 1);
  assert.deepEqual([g.phase, g.hunter.p], ['jager', 1]);
  assert.equal(W.shoot(g, 2, 0), null, 'alleen de jager');
  W.shoot(g, 1, 0);
  assert.deepEqual(g.log.at(-1).deaths, [{ p: 0, role: 'wolf' }]);
  assert.equal(g.phase, 'dag');
  // de jager is maar één keer jager; ophangen gaat verder naar de nacht
  voteAll(g, { 2: 4, 3: 4, 4: 2, 5: 4 });
  assert.equal(g.phase, 'klaar', 'alle wolven dood');
  assert.equal(g.winner, 'dorp');
});

test('het dorp wint als de wolven dood zijn, de wolven als alleen zij over zijn; de verliezers drinken', () => {
  const g = game(['wolf', 'burger', 'burger', 'burger']);
  night(g, 1);
  voteAll(g, { 0: 2, 2: 3, 3: 2 });
  assert.equal(g.phase, 'nacht');
  night(g, 3);
  assert.equal(g.phase, 'klaar');
  const ev = g.log.at(-1);
  assert.deepEqual([ev.winner, ev.winners, ev.losers], ['wolf', [0], [1, 2, 3]]);
  assert.deepEqual(ev.roles, ['wolf', 'burger', 'burger', 'burger']);
  assert.equal(g.players[0].wins, 1);
  assert.equal(g.players[2].sips, W.DEAD_SIPS + W.LOSE_SIPS);
  assert.equal(g.players[3].sips, W.WRONG_VOTE_SIPS + W.DEAD_SIPS + W.LOSE_SIPS, 'stemde op Burger 2');
  assert.equal(g.players[0].sips, W.WRONG_VOTE_SIPS, 'ook een wolf die op een onschuldige stemde');
});

test('een wolf en een dorpeling die verliefd zijn, winnen samen als ze als laatsten over zijn', () => {
  const g = game(['wolf', 'cupido', 'burger', 'burger', 'burger']);
  night(g, 2, { lovers: [0, 1] });
  assert.equal(W.teamOf(g, 0), 'liefde');
  voteAll(g, { 0: 3, 1: 3, 3: 4, 4: 3 });
  night(g, 4);
  assert.equal(g.phase, 'klaar');
  assert.equal(g.winner, 'liefde');
  assert.deepEqual(g.log.at(-1).winners, [0, 1]);
});

test('wie de tafel verlaat is dood zonder slokken; de host kan niet langer wachten', () => {
  const g = game(['wolf', 'wolf', 'ziener', 'burger', 'burger', 'burger']);
  W.wolfPick(g, 0, 3);
  W.wolfPick(g, 1, 4);
  W.look(g, 2, 0);
  W.suspect(g, 3, 0);
  W.leave(g, 5);
  assert.deepEqual(g.log.at(-1).deaths, [{ p: 5, role: 'burger', cause: 'weg' }]);
  assert.equal(g.players[5].sips, 0);
  // de wolven staken: dan wordt er niemand opgegeten
  W.force(g);
  assert.equal(g.phase, 'dag');
  assert.deepEqual(g.log.at(-1).deaths, []);
  W.vote(g, 0, 3);
  W.force(g);
  assert.equal(last(g, 'stemming').lynched, 3, 'met wat er gestemd is');
  // nacht 2: één wolf koos, de andere niet: dan beslist die ene
  W.wolfPick(g, 0, 2);
  W.force(g);
  assert.deepEqual(g.log.at(-1).deaths, [{ p: 2, role: 'ziener' }]);
});

test('nog een potje: nieuwe rollen voor wie er is, ook wie later aanschoof; de stand blijft', () => {
  const g = game(['wolf', 'burger', 'burger', 'burger']);
  night(g, 1);
  voteAll(g, { 0: 2, 2: 0, 3: 0 });
  assert.equal(g.winner, 'dorp');
  const sips = g.players.map((p) => p.sips);
  W.addPlayer(g, 'Laat');
  assert.equal(W.setSettings(g, { cupido: true }), true);
  W.next(g, [0, 1, 2, 3, 4]);
  assert.deepEqual([g.phase, g.round, g.day, g.lovers, g.winner], ['rollen', 2, 0, null, null]);
  assert.ok(g.players.every((p) => p.role && p.alive));
  assert.ok(g.players.some((p) => p.role === 'cupido'));
  assert.deepEqual(g.players.slice(0, 4).map((p) => p.sips), sips);
  assert.equal(g.players[4].games, 1);
});

test('honderd potjes met willekeurige keuzes lopen altijd af', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const n = 4 + (seed % 9);
    const g = W.newGame(names(n), { seed, settings: { ...W.DEFAULT_SETTINGS, cupido: seed % 2 === 0 } });
    W.deal(g, seats(n));
    let r = seed;
    const pick = (list) => { r = (r * 1103515245 + 12345) % 2147483648; return list[r % list.length]; };
    for (let step = 0; g.phase !== 'klaar' && step < 500; step++) {
      const alive = W.aliveList(g);
      if (g.phase === 'rollen') alive.forEach((p) => W.ready(g, p));
      else if (g.phase === 'nacht') {
        const victims = alive.filter((p) => g.players[p].role !== 'wolf');
        const target = pick(victims);
        for (const p of alive) {
          if (g.phase !== 'nacht') break;
          const others = alive.filter((x) => x !== p);
          const task = g.night.tasks[p];
          if (task === 'wolf') W.wolfPick(g, p, target);
          else if (task === 'zien') W.look(g, p, pick(others));
          else if (task === 'cupido') W.cupid(g, p, pick(alive), pick(others));
          else if (task === 'verdenk') W.suspect(g, p, pick(others));
        }
        for (const p of alive) {
          if (g.phase === 'nacht' && g.night.tasks[p] === 'heks') {
            const okPoison = alive.filter((x) => x !== p && x !== g.night.victim);
            W.witch(g, p, g.potions.heal && pick([true, false]), g.potions.poison && pick([true, false]) ? pick(okPoison) : -1);
          }
        }
      } else if (g.phase === 'dag') {
        for (const p of alive) W.vote(g, p, pick([-1, ...alive.filter((x) => x !== p)]));
      } else if (g.phase === 'jager') W.shoot(g, g.hunter.p, pick(alive));
    }
    assert.equal(g.phase, 'klaar', `seed ${seed}`);
    assert.ok(['dorp', 'wolf', 'liefde', 'niemand'].includes(g.winner));
  }
});
