// Bussen online: tafels met een code, meedoen, opnieuw verbinden, wat elke telefoon te zien krijgt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BusHub, TABLE_IDLE_MS } from '../public/shared/bushub.js';
import * as B from '../public/shared/bussen.js';

let clock = 1_000_000;
const now = () => clock;
const token = (n) => `telefoon-${String(n).padStart(10, '0')}`;

// een nep-telefoon: onthoudt het laatste bericht van elke soort
function phone(hub, n) {
  const p = { token: token(n), msgs: [], last: {} };
  p.conn = { send: (text) => { const m = JSON.parse(text); p.msgs.push(m); p.last[m.t] = m; }, close() {} };
  p.say = (msg) => hub.message(p.conn, msg);
  p.connect = () => { hub.connect(p.conn); return p; };
  p.state = () => p.last.state;
  return p.connect();
}

function table(names, opts = {}) {
  const hub = new BusHub({ now, log: () => {}, random: opts.random || Math.random });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code };
}

test('een tafel maken, meedoen met de code en de host start', () => {
  const { hub, phones, code } = table(['Jort', 'Meke', 'jort']);
  assert.match(code, /^[A-Z]{4}$/);
  const s = phones[2].state();
  assert.equal(s.phase, 'lobby');
  assert.equal(s.you, 2);
  assert.equal(s.host, 0);
  assert.deepEqual(s.players.map((p) => p.name), ['Jort', 'Meke', 'jort 2']);
  // verkeerde code, geen naam, geen geldige sleutel
  const x = phone(hub, 9);
  x.say({ t: 'join', code: 'ZZZZ', name: 'X', token: x.token });
  assert.match(x.last.joinFailed.msg, /bestaat niet/);
  x.say({ t: 'join', code, name: '   ', token: x.token });
  assert.match(x.last.joinFailed.msg, /naam/);
  x.say({ t: 'join', code, name: 'X', token: 'kort' });
  assert.ok(x.last.joinFailed);
  // alleen de host start en kiest de lengte van de bus
  phones[1].say({ t: 'start' });
  assert.equal(phones[1].state().phase, 'lobby');
  phones[0].say({ t: 'settings', busLength: 5 });
  assert.equal(phones[1].state().busLength, 5);
  phones[0].say({ t: 'start' });
  for (const p of phones) assert.equal(p.state().phase, 'vragen');
  // tijdens het potje kan er niemand meer bij
  x.say({ t: 'join', code, name: 'Laat', token: x.token });
  assert.match(x.last.joinFailed.msg, /al begonnen/);
  assert.equal(hub.stats().players, 3);
});

test('elke telefoon ziet alleen wat hij mag zien', () => {
  const { hub, phones, code } = table(['Jort', 'Meke']);
  phones[0].say({ t: 'start' });
  const g = hub.tables.get(code).g;
  const s0 = phones[0].state();
  assert.equal(s0.deck, undefined);
  assert.equal(JSON.stringify(s0).includes('"deck"'), false);
  // speel de vragenronde snel uit via de telefoons
  let guard = 0;
  while (g.phase === 'vragen' && guard++ < 100) {
    for (const d of g.deals.slice()) phones[d.from].say({ t: 'deal', to: { [1 - d.from]: d.sips } });
    const right = B.truth(g.round, g.players[g.turn].hand, g.deck[g.deck.length - 1]) ?? B.QUESTIONS[g.round].options[0];
    phones[g.turn].say({ t: 'answer', o: right });
  }
  for (const d of g.deals.slice()) phones[d.from].say({ t: 'deal', to: { [1 - d.from]: d.sips } });
  assert.equal(g.phase, 'piramide');
  const s = phones[1].state();
  assert.equal(s.hands, null, 'na de vragenronde zie je de kaarten van een ander niet meer');
  assert.deepEqual(s.hand, g.players[1].hand);
  assert.equal(s.players[0].cards, 4);
  assert.ok(s.pyramid.every((x) => x.card === null), 'dichte piramidekaarten gaan niet naar de telefoon');
  phones[1].say({ t: 'flip', i: 0 });
  assert.notEqual(phones[0].state().pyramid[0].card, null);
  phones[0].say({ t: 'flip', i: 0 });
  assert.equal(g.next, 1, 'dubbel tikken draait geen tweede kaart om');
});

test('slokken uitdelen via de telefoon van de uitdeler, en nu doen of sparen', () => {
  const { hub, phones, code } = table(['Jort', 'Meke', 'Sim']);
  phones[0].say({ t: 'start' });
  const g = hub.tables.get(code).g;
  g.deck.push({ r: 9, s: 0 });                 // Jort krijgt harten 9: rood is goed
  phones[1].say({ t: 'answer', o: 'rood' });
  assert.equal(g.turn, 0, 'Meke is niet aan de beurt');
  phones[0].say({ t: 'answer', o: 'rood' });
  assert.deepEqual(phones[2].state().deals, [{ from: 0, sips: 1 }]);
  assert.deepEqual(phones[2].state().waiting, [0]);
  phones[1].say({ t: 'deal', to: { 2: 1 } });
  assert.equal(g.deals.length, 1, 'alleen Jort deelt uit');
  phones[0].say({ t: 'deal', to: { 2: 1 } });
  const s2 = phones[2].state();
  assert.equal(s2.me.pending, 1);
  assert.deepEqual(s2.me.from, [{ p: 0, n: 1 }]);
  assert.equal(s2.log[s2.log.length - 1].type, 'uitdelen');
  assert.equal(s2.players[2].owe, 1, 'iedereen ziet hoeveel Sim nog moet');
  phones[2].say({ t: 'sips', act: 'save' });
  assert.equal(phones[0].state().players[2].owe, 1, 'gespaard telt nog mee');
  assert.equal(phones[0].state().players[2].saved, 1);
  assert.equal(phones[2].state().me.pending, 0);
  phones[2].say({ t: 'sips', act: 'now' });
  assert.equal(g.players[2].drank, 0, 'gespaarde slokken komen pas aan het eind van de ronde terug');
});

test('disco via de telefoon: iedereen ziet een bak staan en tikt op gedaan', () => {
  const { hub, phones, code } = table(['Jort', 'Meke']);
  phones[0].say({ t: 'start' });
  const g = hub.tables.get(code).g;
  g.round = 3; g.turn = 0;
  g.players[0].hand = [{ r: 2, s: 0 }, { r: 5, s: 1 }, { r: 9, s: 2 }];
  g.players[1].hand = [{ r: 3, s: 0 }, { r: 4, s: 0 }, { r: 6, s: 0 }];
  g.deck.push({ r: 12, s: 3 });
  phones[1].say({ t: 'answer', o: 'disco' });
  assert.equal(g.players[0].hand.length, 3, 'Meke is niet aan de beurt');
  phones[0].say({ t: 'answer', o: 'disco' });
  assert.equal(phones[1].state().me.bak, 1);
  assert.equal(phones[1].state().me.bakFrom, 0);
  assert.equal(phones[0].state().players[1].bak, 1);
  phones[1].say({ t: 'bak' });
  assert.equal(phones[0].state().players[1].bak, 0);
  assert.equal(phones[0].state().players[1].bakken, 1);
  assert.equal(phones[0].state().log[phones[0].state().log.length - 1].type, 'bak');
});

test('opnieuw verbinden: zelfde plek, en de host valt in voor wie weg is', () => {
  const { hub, phones, code } = table(['Jort', 'Meke']);
  phones[0].say({ t: 'start' });
  const g = hub.tables.get(code).g;
  // de host valt weg: Meke wordt host
  hub.disconnect(phones[0].conn);
  assert.equal(phones[1].state().host, 1);
  assert.equal(phones[1].state().players[0].connected, false);
  // Jort is aan de beurt maar weg: Meke speelt voor hem
  phones[1].say({ t: 'answer', o: 'zwart' });
  assert.equal(g.players[0].hand.length, 1);
  // Jort komt terug met dezelfde sleutel en zit weer op zijn eigen plek
  const back = phone(hub, 1);
  back.say({ t: 'join', code, name: 'Jort', token: back.token });
  assert.equal(back.state().you, 0);
  assert.equal(back.state().phase, 'vragen');
  assert.equal(back.state().players[0].connected, true);
  // een tweede scherm met dezelfde sleutel neemt het over
  const again = phone(hub, 1);
  again.say({ t: 'join', code, name: 'Jort', token: again.token });
  assert.match(back.last.left.reason, /ander scherm/);
  assert.equal(again.state().you, 0);
});

test('nog een potje: terug naar de lobby, nieuwe spelers kunnen aanschuiven, lege tafels verdwijnen', () => {
  const { hub, phones, code } = table(['Jort', 'Meke']);
  const t = hub.tables.get(code);
  phones[0].say({ t: 'start' });
  t.g.phase = 'klaar';
  phones[1].say({ t: 'again' });
  assert.ok(t.g, 'alleen de host');
  phones[0].say({ t: 'again' });
  assert.equal(phones[1].state().phase, 'lobby');
  const x = phone(hub, 7);
  x.say({ t: 'join', code, name: 'Sim', token: x.token });
  assert.equal(x.state().players.length, 3);
  phones[0].say({ t: 'kick', seat: 2 });
  assert.match(x.last.left.reason, /van tafel/);
  assert.equal(phones[0].state().players.length, 2);
  // iedereen weg: na een half uur is de tafel opgeruimd
  for (const p of phones) hub.disconnect(p.conn);
  hub.tick();
  assert.ok(hub.tables.has(code));
  clock += TABLE_IDLE_MS + 1;
  hub.tick();
  assert.equal(hub.tables.has(code), false);
});

test('gelijkspel: de kandidaten kiezen een kaart op hun eigen telefoon', () => {
  const { hub, phones, code } = table(['A', 'B', 'C']);
  phones[0].say({ t: 'start' });
  const g = hub.tables.get(code).g;
  g.phase = 'kiezen';
  g.candidates = [1, 2];
  g.pick = { round: 1, cards: [{ r: 9, s: 0 }, { r: 3, s: 1 }, { r: 12, s: 2 }, { r: 5, s: 3 }], taken: {} };
  g.pyramid = Array.from({ length: 15 }, (_, i) => ({ card: { r: 5, s: i % 4 }, row: 1, open: true, laid: [] }));
  hub.tables.get(code).broadcast();
  const s = phones[0].state();
  assert.deepEqual(s.pick, { round: 1, n: 4, taken: {} }, 'de kaarten zelf blijven geheim');
  phones[0].say({ t: 'pick', i: 0 });
  assert.deepEqual(g.pick.taken, {}, 'A staat niet gelijk');
  phones[1].say({ t: 'pick', i: 0 });
  phones[2].say({ t: 'pick', i: 1 });
  assert.equal(g.phase, 'bus');
  assert.equal(phones[0].state().rider, 2);
  const ev = phones[0].state().log.find((e) => e.type === 'kies');
  assert.deepEqual(ev.low, [2]);
  phones[1].say({ t: 'guess', o: 'hoger' });
  assert.equal(g.bus.open, 1, 'alleen wie in de bus zit gokt');
  phones[2].say({ t: 'guess', o: 'hoger' });
  assert.equal(g.bus.open, 2);
});
