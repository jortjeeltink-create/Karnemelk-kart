// Weerwolven online: elke telefoon ziet alleen wat die speler mag weten, en alles gaat via berichten.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeerwolvenHub } from '../public/shared/weerwolvenhub.js';

const now = () => 7_000_000;
const token = (n) => `telefoon-${String(n).padStart(10, '0')}`;

function phone(hub, n) {
  const p = { token: token(n), last: {} };
  p.conn = { send: (text) => { const m = JSON.parse(text); p.last[m.t] = m; }, close() {} };
  p.say = (msg) => hub.message(p.conn, msg);
  p.state = () => p.last.state;
  hub.connect(p.conn);
  return p;
}

function table(names) {
  const hub = new WeerwolvenHub({ now, log: () => {}, build: 'w1', random: () => 0.5 });
  const phones = names.map((_, i) => phone(hub, i + 1));
  phones[0].say({ t: 'create', name: names[0], token: phones[0].token });
  const code = phones[0].state().code;
  phones.slice(1).forEach((p, i) => p.say({ t: 'join', code, name: names[i + 1], token: p.token }));
  return { hub, phones, code, t: hub.tables.get(code) };
}
const NAMES = ['Jort', 'Meke', 'Sim', 'Stan', 'Duuk', 'Melle'];
const roleOf = (t, i) => t.g.players[i].role;
const who = (t, role) => t.g.players.flatMap((p, i) => (p.role === role ? [i] : []));

test('de host kiest de rollen in de lobby; daarna ziet iedereen alleen zijn eigen rol', () => {
  const { phones, t } = table(NAMES);
  phones[1].say({ t: 'settings', role: 'cupido', on: true });
  assert.equal(phones[0].state().settings.cupido, false, 'alleen de host');
  phones[0].say({ t: 'settings', role: 'cupido', on: true });
  phones[0].say({ t: 'settings', wolves: 1 });
  phones[0].say({ t: 'settings', wolves: 7 });
  phones[0].say({ t: 'settings', role: 'burger', on: false });
  assert.deepEqual(phones[2].state().settings, { wolves: 1, ziener: true, heks: true, jager: true, cupido: true });
  phones[0].say({ t: 'start' });
  const s = phones[2].state();
  assert.equal(s.phase, 'rollen');
  assert.deepEqual(s.deck, { wolf: 1, ziener: 1, heks: 1, jager: 1, cupido: 1, burger: 1 });
  assert.equal(s.build, 'w1');
  phones.forEach((p, i) => {
    const v = p.state();
    assert.equal(v.me.role, roleOf(t, i));
    assert.ok(v.players.every((x) => x.role === undefined), 'niemand ziet de rol van een ander');
    assert.equal(v.roles, undefined);
    assert.equal(v.lovers, undefined);
  });
  phones[0].say({ t: 'settings', role: 'heks', on: false });
  assert.equal(t.settings.heks, true, 'tijdens een potje verandert er niks');
});

test('s nachts: de wolven zien elkaar en elkaars keuze, de heks ziet het slachtoffer, de ziener een rol', () => {
  const { phones, t } = table(NAMES);
  phones[0].say({ t: 'start' });
  phones.forEach((p) => p.say({ t: 'ready' }));
  assert.equal(phones[0].state().phase, 'nacht');
  const [w1, w2] = who(t, 'wolf'), [seer] = who(t, 'ziener'), [witch] = who(t, 'heks');
  assert.deepEqual(phones[w1].state().me.known, [{ p: w2, role: 'wolf' }]);
  const victim = [0, 1, 2, 3, 4, 5].find((i) => roleOf(t, i) === 'burger' || roleOf(t, i) === 'jager');
  phones[w1].say({ t: 'wolf', target: victim });
  assert.deepEqual(phones[w2].state().me.pack.find((x) => x.p === w1), { p: w1, pick: victim });
  assert.equal(phones[seer].state().me.pack, undefined, 'alleen wolven');
  assert.equal(phones[witch].state().me.victim, null, 'nog niet gekozen');
  phones[w2].say({ t: 'wolf', target: victim });
  assert.equal(phones[witch].state().me.victim, victim);
  assert.equal(phones[seer].state().me.victim, undefined);
  phones[seer].say({ t: 'look', target: w1 });
  assert.deepEqual(phones[seer].state().me.known, [{ p: w1, role: 'wolf', night: 1 }]);
  assert.deepEqual(phones[victim].state().me.known, []);
  // de rest verdenkt iemand, de heks doet niks: dan is het ochtend
  phones.forEach((p, i) => { if (t.g.night.tasks[i] === 'verdenk') p.say({ t: 'suspect', target: i ? 0 : 1 }); });
  phones[witch].say({ t: 'witch', save: false, poison: -1 });
  const s = phones[seer].state();
  assert.ok(s.phase === 'dag' || s.phase === 'jager');
  assert.equal(s.players[victim].alive, false);
  assert.equal(s.players[victim].role, roleOf(t, victim), 'de rol van een dode kent iedereen');
  // de dode kijkt als geest mee en ziet alle rollen
  const ghost = phones[victim].state();
  assert.ok(ghost.players.every((x, i) => x.role === roleOf(t, i)));
});

test('overdag zie je wie er gestemd heeft maar niet op wie, tot iedereen gestemd heeft', () => {
  const { phones, t } = table(NAMES.slice(0, 4));
  phones[0].say({ t: 'settings', role: 'heks', on: false });
  phones[0].say({ t: 'settings', role: 'jager', on: false });
  phones[0].say({ t: 'start' });
  phones.forEach((p) => p.say({ t: 'ready' }));
  const [wolf] = who(t, 'wolf');
  const victim = [0, 1, 2, 3].find((i) => i !== wolf);
  phones.forEach((p, i) => {
    const task = t.g.night.tasks[i];
    if (task === 'wolf') p.say({ t: 'wolf', target: victim });
    else p.say({ t: task === 'zien' ? 'look' : 'suspect', target: wolf });
  });
  assert.equal(phones[0].state().phase, 'dag');
  const alive = [0, 1, 2, 3].filter((i) => i !== victim);
  const [a, b, c] = alive;
  phones[a].say({ t: 'vote', target: b });
  const s = phones[c].state();
  assert.equal(s.players[a].voted, true);
  assert.equal(s.players[b].voted, false);
  assert.equal(JSON.stringify(s).includes('"votes"'), false, 'de stemmen zijn nog geheim');
  assert.equal(phones[a].state().me.vote, b, 'je ziet je eigen stem');
  phones[b].say({ t: 'vote', target: -1 });
  phones[c].say({ t: 'vote', target: b });
  const ev = phones[c].state().log.find((e) => e.type === 'stemming');
  assert.equal(ev.lynched, b);
  assert.deepEqual(ev.votes, [[a, b], [b, -1], [c, b]]);
});

test('tijdens een potje kun je niet aanschuiven; wie weggaat is dood; de host kan niet langer wachten', () => {
  const { hub, phones, code, t } = table(NAMES.slice(0, 5));
  phones[0].say({ t: 'start' });
  const late = phone(hub, 9);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.match(late.last.joinFailed.msg, /loopt een potje/);
  phones[1].say({ t: 'force' });
  assert.equal(t.g.phase, 'rollen', 'alleen de host');
  phones[4].say({ t: 'leave' });
  assert.equal(t.g.players[4].alive, false);
  assert.equal(phones[0].state().players[4].role, roleOf(t, 4));
  assert.ok(t.g.phase === 'rollen' || t.g.phase === 'klaar');
  if (t.g.phase === 'rollen') {
    phones[0].say({ t: 'force' });
    assert.equal(t.g.phase, 'nacht');
  }
});

test('na afloop ziet iedereen alles, kan er iemand aanschuiven en start de host een nieuw potje', () => {
  const { hub, phones, code, t } = table(NAMES.slice(0, 4));
  phones[0].say({ t: 'start' });
  // het dorp hangt de wolf meteen op
  const [wolf] = who(t, 'wolf');
  phones[0].say({ t: 'force' });
  phones[0].say({ t: 'force' });
  if (t.g.phase === 'jager') phones[0].say({ t: 'force' });
  if (t.g.phase === 'klaar') return;
  phones.forEach((p, i) => { if (t.g.players[i].alive && i !== wolf) p.say({ t: 'vote', target: wolf }); });
  if (t.g.phase === 'dag') phones[0].say({ t: 'force' });
  if (t.g.phase === 'jager') phones[0].say({ t: 'force' });
  assert.equal(t.g.phase, 'klaar');
  const s = phones[1].state();
  assert.equal(s.winner, 'dorp');
  assert.ok(s.players.every((x, i) => x.role === roleOf(t, i)));
  const late = phone(hub, 9);
  late.say({ t: 'join', code, name: 'Laat', token: late.token });
  assert.equal(late.state().players.length, 5);
  phones[2].say({ t: 'next' });
  assert.equal(t.g.phase, 'klaar', 'alleen de host');
  phones[0].say({ t: 'next' });
  assert.equal(late.state().phase, 'rollen');
  assert.ok(late.state().me.role);
});
