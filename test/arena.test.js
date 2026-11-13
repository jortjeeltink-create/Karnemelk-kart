// Arena: munten, inzetten op een duel, de vier minispellen, de uitbetaling en de eindstand.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../public/shared/arena.js';

const NAMEN = ['Jort', 'Meke', 'Sim', 'Bas'];
const ALLEN = [0, 1, 2, 3];
// een potje waarin Jort (0) en Meke (1) de arena in moeten voor het gekozen minispel
function potje(spel, opts = {}) {
  const g = A.newGame(NAMEN, { seed: 7, ...opts });
  A.begin(g, ALLEN);
  g.a = 0; g.b = 1; g.spel = spel;
  return g;
}
// Sim en Bas zetten in; daarna begint het duel op tijdstip `now`
function inzetten(g, now = 1000, sim = [0, 2], bas = [1, 3]) {
  A.bet(g, 2, sim[0], sim[1], ALLEN, now);
  A.bet(g, 3, bas[0], bas[1], ALLEN, now);
}

test('een nieuw potje: iedereen 10 munten, twee spelers in de arena en een minispel', () => {
  const g = A.newGame(NAMEN, { seed: 1 });
  assert.equal(g.rondes, A.LENGTE_DEFAULT);
  assert.equal(A.newGame(NAMEN, { rondes: 6 }).rondes, 6);
  assert.equal(A.newGame(NAMEN, { rondes: 7 }).rondes, A.LENGTE_DEFAULT, 'alleen de vaste lengtes');
  assert.equal(A.begin(A.newGame(['A', 'B']), [0, 1]), null, 'met z\'n tweeën kan er niemand inzetten');
  const ev = A.begin(g, ALLEN);
  assert.equal(ev.type, 'ronde');
  assert.deepEqual([g.phase, g.ronde], ['inzet', 1]);
  assert.ok(g.a !== g.b && ALLEN.includes(g.a) && ALLEN.includes(g.b));
  assert.ok(A.SPELLEN.includes(g.spel));
  assert.ok(g.players.every((p) => p.munten === A.START_MUNTEN && p.straf === 0));
  assert.deepEqual(A.wachtOp(g, ALLEN).sort(), ALLEN.filter((i) => !A.inArena(g, i)));
});

test('inzetten: alleen wie niet in de arena staat, 1 tot 3 munten, één keer; daarna begint het duel', () => {
  const g = potje('sps');
  assert.equal(A.bet(g, 0, 1, 1, ALLEN, 0), null, 'wie zelf de arena in moet, zet niet in');
  assert.equal(A.bet(g, 2, 3, 1, ALLEN, 0), null, 'alleen op een van de twee in de arena');
  assert.equal(A.bet(g, 2, 0, 0, ALLEN, 0), null);
  assert.equal(A.bet(g, 2, 0, 4, ALLEN, 0), null, 'hooguit 3');
  assert.equal(A.bet(g, 2, 0, 1.5, ALLEN, 0), null);
  g.players[3].munten = 2;
  assert.equal(A.bet(g, 3, 1, 3, ALLEN, 0), null, 'niet meer dan je hebt');
  assert.equal(A.bet(g, 2, 0, 2, ALLEN, 0).type, 'inzet');
  assert.equal(A.bet(g, 2, 1, 1, ALLEN, 0), null, 'één keer inzetten');
  assert.equal(g.phase, 'inzet');
  A.bet(g, 3, 1, 2, ALLEN, 0);
  assert.equal(g.phase, 'duel', 'iedereen heeft ingezet');
  assert.equal(g.duel.spel, 'sps');
});

test('wie weg is hoeft niet in te zetten; de host kan iemand laten overslaan', () => {
  const g = potje('sps');
  A.bet(g, 2, 0, 1, [0, 1, 2], 0);   // Bas is weg
  assert.equal(g.phase, 'duel');
  const h = potje('sps');
  A.bet(h, 2, 0, 1, ALLEN, 0);
  assert.equal(A.skipBet(h, 3, ALLEN, 0).type, 'overgeslagen');
  assert.equal(h.phase, 'duel');
  const k = potje('sps');
  A.bet(k, 2, 0, 1, ALLEN, 0);
  A.fixBets(k, [0, 1, 2], 0);
  assert.equal(k.phase, 'duel', 'Bas ging weg: de rest is klaar');
});

test('de uitbetaling: winnaar munten, verliezer strafpunten, goed gegokt erbij, fout eraf en strafpunten', () => {
  const g = potje('sps');
  inzetten(g, 0, [0, 2], [1, 3]);   // Sim 2 op Jort, Bas 3 op Meke
  A.kies(g, 0, 'steen', 0); A.kies(g, 1, 'schaar', 0);
  assert.equal(g.phase, 'duel', 'eerst twee keer winnen');
  A.kies(g, 0, 'papier', 0);
  const ev = A.kies(g, 1, 'steen', 0);
  assert.equal(ev.type, 'uitslag');
  assert.deepEqual([ev.winner, ev.loser], [0, 1]);
  const [jort, meke, sim, bas] = g.players;
  assert.deepEqual([jort.munten, jort.gewonnen, jort.duels, jort.straf], [A.START_MUNTEN + A.WIN_MUNTEN, 1, 1, 0]);
  assert.deepEqual([meke.munten, meke.duels, meke.straf], [A.START_MUNTEN, 1, A.VERLIES_STRAF]);
  assert.deepEqual([sim.munten, sim.goed, sim.straf], [A.START_MUNTEN + 2, 1, 0]);
  assert.deepEqual([bas.munten, bas.goed, bas.straf], [A.START_MUNTEN - 3, 0, 3], 'fout: inzet kwijt en net zoveel strafpunten');
  assert.deepEqual(ev.bets, [{ p: 2, op: 0, n: 2, ok: true }, { p: 3, op: 1, n: 3, ok: false }]);
  assert.equal(g.phase, 'uitslag');
});

test('blut: een mega strafpunt en nieuwe munten', () => {
  const g = potje('sps');
  g.players[3].munten = 2;
  inzetten(g, 0, [0, 1], [1, 2]);
  A.kies(g, 0, 'steen', 0); A.kies(g, 1, 'schaar', 0);
  A.kies(g, 0, 'steen', 0);
  const ev = A.kies(g, 1, 'schaar', 0);
  assert.deepEqual(ev.blut, [3]);
  assert.deepEqual([g.players[3].munten, g.players[3].mega, g.players[3].blut], [A.BLUT_MUNTEN, 1, 1]);
});

test('steen, papier, schaar: gelijk telt niet, en je ziet de keuze pas als allebei gekozen hebben', () => {
  const g = potje('sps');
  inzetten(g);
  assert.equal(A.kies(g, 2, 'steen', 0), null, 'alleen de twee in de arena');
  assert.equal(A.kies(g, 0, 'vuur', 0), null);
  assert.equal(A.kies(g, 0, 'steen', 0).type, 'gekozen');
  assert.equal(A.kies(g, 0, 'papier', 0), null, 'al gekozen');
  const ev = A.kies(g, 1, 'steen', 0);
  assert.deepEqual([ev.type, ev.w], ['sps', -1]);
  assert.deepEqual(g.duel.score, { 0: 0, 1: 0 });
  // schaar wint van papier, papier van steen, steen van schaar
  A.kies(g, 0, 'schaar', 0); assert.equal(A.kies(g, 1, 'papier', 0).w, 0);
  A.kies(g, 0, 'steen', 0); assert.equal(A.kies(g, 1, 'papier', 0).w, 1);
  A.kies(g, 0, 'schaar', 0);
  assert.equal(A.kies(g, 1, 'steen', 0).winner, 1);
});

test('valse start: de snelste wint, te vroeg is verloren, gelijk is opnieuw; eerst komen er nepseintjes', () => {
  const g = potje('reactie');
  inzetten(g, 1000);
  const go = g.duel.goAt;
  assert.ok(go >= 4000 && go <= 8000, 'het groene scherm komt na 3 tot 7 seconden');
  // nepseintjes: minstens één, na de eerste 0,9 seconde en ruim voor het echte groen weer weg
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const n = potje('reactie', { seed });
    inzetten(n, 1000);
    const wacht = n.duel.goAt - 1000;
    assert.ok(n.duel.nep.length >= 1 && n.duel.nep.length <= 3, 'een tot drie nepseintjes');
    for (const f of n.duel.nep) {
      assert.ok(wacht - f.voor >= 900 && f.voor - A.NEP_MS >= 500, `seintje op ${wacht - f.voor} van ${wacht}`);
      assert.ok([0, 1, 2].includes(f.k));
    }
    for (let k = 1; k < n.duel.nep.length; k++) assert.ok(n.duel.nep[k - 1].voor - n.duel.nep[k].voor >= A.NEP_MS + 500, 'niet door elkaar');
  }
  assert.equal(A.tik(g, 0, 200, false, go - 1000), null, 'het scherm is nog niet groen');
  assert.equal(A.tik(g, 0, 231, false, go + 240).type, 'getikt');
  assert.equal(A.tik(g, 0, 150, false, go + 300), null, 'één keer');
  const ev = A.tik(g, 1, 310, false, go + 320);
  assert.equal(ev.winner, 0);
  assert.deepEqual(ev.detail.ms, { 0: 231, 1: 310 });
  // te vroeg
  const h = potje('reactie');
  inzetten(h, 1000);
  A.tik(h, 0, 0, true, 2000);
  assert.equal(A.tik(h, 1, 900, false, h.duel.goAt + 900).winner, 1);
  // allebei te vroeg: opnieuw
  const k = potje('reactie');
  inzetten(k, 1000);
  A.tik(k, 0, 0, true, 2000);
  const again = A.tik(k, 1, 0, true, 2100);
  assert.deepEqual([again.type, again.poging, k.phase], ['duel', 2, 'duel']);
  assert.deepEqual(k.duel.res, {});
  // onmogelijk snel wordt afgerond naar 100 ms
  const m = potje('reactie');
  inzetten(m, 1000);
  A.tik(m, 0, 3, false, m.duel.goAt + 5);
  assert.equal(m.duel.res[0], 100);
});

test('tikrace: de meeste tikken in 5 seconden wint', () => {
  const g = potje('tikken');
  inzetten(g, 1000);
  const start = g.duel.startAt;
  assert.equal(start, 1000 + A.AFTEL_MS);
  assert.equal(A.tikken(g, 0, 5, false, start - 2000), null, 'nog aan het aftellen');
  assert.equal(A.tikken(g, 0, 12, false, start + 1000).type, 'tikstand');
  A.tikken(g, 0, 9, false, start + 1500);
  assert.equal(g.duel.n[0], 12, 'de stand gaat niet achteruit');
  assert.equal(A.tikken(g, 0, 30, true, start + 2000), null, 'klaar kan pas als de tijd om is');
  A.tikken(g, 0, 500, true, start + A.TIK_MS);
  assert.equal(g.duel.res[0], 90, 'meer dan 90 kan niet');
  const ev = A.tikken(g, 1, 41, true, start + A.TIK_MS + 100);
  assert.equal(ev.winner, 0);
  assert.deepEqual(ev.detail.tikken, { 0: 90, 1: 41 });
});

test('stop op 0: de klok telt af vanaf 10 seconden; het dichtst bij 0 wint, te laat telt ook', () => {
  assert.deepEqual([A.STOP_DOEL, A.STOP_ZICHT], [10000, 3000]);
  const g = potje('stop');
  inzetten(g, 1000);
  const start = g.duel.startAt;
  assert.equal(A.stop(g, 0, 4000, start - 1000), null, 'nog aan het aftellen');
  A.stop(g, 0, 10300, start + 10300);
  const ev = A.stop(g, 1, 9850, start + 9900);
  assert.equal(ev.winner, 1, '0,15 seconde ervoor is beter dan 0,30 erna');
  assert.deepEqual(ev.detail.stop, { 0: 10300, 1: 9850 });
});

test('snelle som: het goede antwoord staat erbij, de snelste met het goede antwoord wint, fout is verloren', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
    const g = potje('som', { seed });
    inzetten(g, 1000);
    const d = g.duel, m = d.vraag.tekst.match(/^(\d+) ([+−×]) (\d+)$/);
    assert.ok(m, d.vraag.tekst);
    const uit = m[2] === '+' ? +m[1] + +m[3] : m[2] === '−' ? +m[1] - +m[3] : +m[1] * +m[3];
    assert.equal(d.vraag.opties.length, 3);
    assert.equal(new Set(d.vraag.opties).size, 3, 'drie verschillende antwoorden');
    assert.equal(d.vraag.opties[d.goed], uit);
    assert.ok(d.vraag.opties.every((x) => x > 0));
  }
  const g = potje('som');
  inzetten(g, 1000);
  const d = g.duel, start = d.startAt, goed = d.goed, fout = (goed + 1) % 3;
  assert.equal(A.antwoord(g, 0, goed, 800, start - 1000), null, 'de som staat er nog niet');
  assert.equal(A.antwoord(g, 0, 5, 800, start + 800), null, 'die knop bestaat niet');
  assert.equal(A.antwoord(g, 0, goed, 1900, start + 1900).type, 'getikt');
  assert.equal(A.antwoord(g, 0, fout, 100, start + 2000), null, 'één antwoord');
  const ev = A.antwoord(g, 1, goed, 1400, start + 2100);
  assert.equal(ev.winner, 1, 'allebei goed: de snelste');
  assert.deepEqual(ev.detail.ms, { 0: 1900, 1: 1400 });
  assert.match(ev.detail.quiz, / = \d+$/);
  // fout is verloren, ook als je sneller was
  const h = potje('som');
  inzetten(h, 1000);
  A.antwoord(h, 0, (h.duel.goed + 1) % 3, 300, h.duel.startAt + 300);
  assert.equal(A.antwoord(h, 1, h.duel.goed, 4000, h.duel.startAt + 4000).winner, 1);
  // allebei fout: opnieuw, met een nieuwe som
  const k = potje('som');
  inzetten(k, 1000);
  A.antwoord(k, 0, (k.duel.goed + 1) % 3, 300, k.duel.startAt + 300);
  const again = A.antwoord(k, 1, (k.duel.goed + 2) % 3, 500, k.duel.startAt + 500);
  assert.deepEqual([again.type, again.poging, k.phase], ['duel', 2, 'duel']);
});

test('welke kleur?: het woord is een andere kleur dan de letters; de kleur van de letters is goed', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    const g = potje('kleur', { seed });
    inzetten(g, 1000);
    const { vraag, goed } = g.duel;
    assert.ok(A.KLEUREN.includes(vraag.woord) && A.KLEUREN.includes(vraag.inkt));
    assert.notEqual(vraag.woord, vraag.inkt);
    assert.deepEqual([...vraag.opties].sort(), [...A.KLEUREN].sort());
    assert.equal(vraag.opties[goed], vraag.inkt);
  }
  const g = potje('kleur');
  inzetten(g, 1000);
  const d = g.duel;
  A.antwoord(g, 0, d.vraag.opties.indexOf(d.vraag.woord), 600, d.startAt + 600);   // het woord aangetikt: fout
  const ev = A.antwoord(g, 1, d.goed, 2500, d.startAt + 2500);
  assert.equal(ev.winner, 1);
  assert.deepEqual(ev.detail.ms, { 0: -1, 1: 2500 });
});

test('steeds gelijk: na drie keer beslist het lot; bij de tikrace zonder tikken meteen', () => {
  const g = potje('reactie');
  inzetten(g, 1000);
  let ev;
  for (let k = 1; k <= A.MAX_POGING; k++) {
    assert.equal(g.duel.poging, k);
    A.tik(g, 0, 0, true, 2000 * k);
    ev = A.tik(g, 1, 0, true, 2000 * k + 10);
  }
  assert.equal(ev.type, 'uitslag');
  assert.ok([0, 1].includes(ev.winner));
  assert.deepEqual([ev.detail.loot, ev.detail.gelijk], [true, 'Allebei te vroeg']);
  const h = potje('tikken');
  inzetten(h, 1000);
  const end = h.duel.startAt + A.TIK_MS;
  A.tikken(h, 0, 0, true, end);
  const nul = A.tikken(h, 1, 0, true, end + 50);
  assert.deepEqual([nul.type, nul.detail.loot, nul.detail.gelijk], ['uitslag', true, 'Niemand tikte']);
});

test('de tijd is om: wie niks deed verliest; opgeven kan ook', () => {
  const g = potje('stop');
  inzetten(g, 1000);
  A.stop(g, 1, 9100, g.duel.startAt + 9100);
  assert.equal(A.tijd(g, g.duel.deadline - 1), null, 'nog niet');
  const ev = A.tijd(g, g.duel.deadline);
  assert.deepEqual([ev.winner, ev.detail.tijdOm, ev.detail.loot], [1, true, false]);
  const h = potje('sps');
  inzetten(h, 1000);
  const loot = A.tijd(h, h.duel.deadline);
  assert.ok([0, 1].includes(loot.winner) && loot.detail.loot, 'allebei niks: het lot beslist');
  const k = potje('tikken');
  inzetten(k, 1000);
  assert.equal(A.opgeven(k, 2), null);
  assert.equal(A.opgeven(k, 0).winner, 1);
});

test('de volgende ronde: anderen de arena in; na de laatste ronde wint de rijkste en krijgt de armste een mega strafpunt', () => {
  const g = A.newGame(NAMEN, { seed: 3, rondes: 6 });
  A.begin(g, ALLEN);
  const paren = [];
  for (let r = 1; r <= 6; r++) {
    assert.equal(g.ronde, r);
    paren.push([g.a, g.b].sort().join(''));
    for (const i of A.wachtOp(g, ALLEN)) A.bet(g, i, g.a, 1, ALLEN, r * 100000);
    assert.equal(g.phase, 'duel');
    assert.equal(A.next(g, ALLEN), null, 'eerst het duel');
    A.opgeven(g, g.b);
    const ev = A.next(g, ALLEN);
    assert.equal(ev.type, r < 6 ? 'ronde' : 'einde');
  }
  // de minispellen: in de eerste zes rondes allemaal één keer, en nooit twee keer achter elkaar hetzelfde
  const h = A.newGame(NAMEN, { seed: 11, rondes: 14 });
  A.begin(h, ALLEN);
  const spellen = [h.spel];
  for (let r = 2; r <= 14; r++) { h.phase = 'uitslag'; A.next(h, ALLEN); spellen.push(h.spel); }
  assert.deepEqual([...spellen.slice(0, 6)].sort(), [...A.SPELLEN].sort());
  assert.deepEqual([...spellen.slice(6, 12)].sort(), [...A.SPELLEN].sort());
  for (let k = 1; k < spellen.length; k++) assert.notEqual(spellen[k], spellen[k - 1]);
  // iedereen is even vaak geweest: 6 rondes, 12 plekken, 4 spelers
  assert.deepEqual(g.players.map((p) => p.duels), [3, 3, 3, 3]);
  for (let k = 1; k < paren.length; k++) assert.notEqual(paren[k], paren[k - 1], 'niet twee keer achter elkaar hetzelfde paar');
  assert.equal(g.phase, 'klaar');
  const max = Math.max(...g.players.map((p) => p.munten)), min = Math.min(...g.players.map((p) => p.munten));
  assert.deepEqual(g.eind.rijkste, g.players.flatMap((p, i) => (p.munten === max ? [i] : [])));
  assert.deepEqual(g.eind.armste, g.players.flatMap((p, i) => (p.munten === min ? [i] : [])));
  for (const i of g.eind.armste) assert.ok(g.players[i].mega >= 1);
  assert.equal(A.next(g, ALLEN), null);
});

test('wie later aanschuift begint met een verse stapel munten', () => {
  const g = potje('sps');
  A.addPlayer(g, 'Jort');
  assert.equal(g.players.length, 5);
  assert.equal(g.players[4].munten, A.START_MUNTEN);
  assert.notEqual(g.players[4].name, 'Jort', 'geen twee keer dezelfde naam');
});
