// Stock Market (nep geld): rondes, koers, uitbetaling, andere spelers en de jackpot.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as SM from '../public/shared/stockmarket.js';

const N0 = SM.state(Date.UTC(2026, 9, 20, 12)).n;

test('een ronde duurt 21 seconden: 10 inzetten, 10 handel, 1 uitslag', () => {
  assert.equal(SM.CYCLE_MS, 21000);
  const t = SM.EPOCH + N0 * SM.CYCLE_MS;
  assert.deepEqual([SM.state(t).phase, SM.state(t + 9999).phase, SM.state(t + 10000).phase, SM.state(t + 19999).phase, SM.state(t + 20000).phase],
    ['bet', 'bet', 'trade', 'trade', 'result']);
  assert.equal(SM.state(t + SM.CYCLE_MS).n, N0 + 1);
  assert.equal(SM.tradeStartOf(N0), t + SM.BET_MS);
  assert.equal(SM.tradeEndOf(N0), t + SM.BET_MS + SM.TRADE_MS);
});

test('de koers is voor iedereen gelijk en blijft tussen -100% en 100%', () => {
  for (let n = N0; n < N0 + 500; n++) {
    const r = SM.move(n);
    assert.ok(Number.isInteger(r) && r >= -100 && r <= 100, `ronde ${n}: ${r}`);
    const p = SM.path(n);
    assert.equal(p.length, SM.KNOTS + 1);
    assert.equal(p[0], 0);
    assert.equal(p[SM.KNOTS], r);
    for (const v of p) assert.ok(v >= -100 && v <= 100);
    assert.equal(SM.pctAt(n, 1), r);
  }
  assert.equal(SM.move(N0 + 7), SM.move(N0 + 7));
});

test('de koers draait vaak om, krijgt vaak een boost en het begin verraadt de uitslag niet', () => {
  let agree = 0, boosted = 0;
  const N = 2000;
  for (let n = N0; n < N0 + N; n++) {
    const p = SM.path(n), r = SM.move(n);
    if (Math.sign(p[10] || 1) === Math.sign(r || 1)) agree++;
    let b = false;
    for (let i = 0; i < SM.KNOTS; i++) if (SM.boostAt(n, (i + 0.5) / SM.KNOTS)) b = true;
    if (b) boosted++;
  }
  assert.ok(agree / N > 0.4 && agree / N < 0.6, `begin wijst in ${agree / N} van de keren de goede kant op`);
  assert.ok(boosted / N > 0.6 && boosted / N < 0.95, `boost in ${boosted / N} van de sessies`);
});

test('gemiddeld komt 99% van de inzet terug, maximaal 2x', () => {
  let up = 0, down = 0, ups = 0, best = 0;
  const N = 60000;
  for (let n = N0; n < N0 + N; n++) {
    const r = SM.move(n);
    if (r >= 0) ups++;
    const a = SM.portfolio(1, 0, r) * (1 - SM.FEE), b = SM.portfolio(0, 1, r) * (1 - SM.FEE);
    up += a; down += b; best = Math.max(best, a, b);
  }
  assert.ok(Math.abs(ups / N - 0.5) < 0.01, `stijgingen ${ups / N}`);
  assert.ok(Math.abs(up / N - 0.99) < 0.01, `stijging geeft ${up / N} terug`);
  assert.ok(Math.abs(down / N - 0.99) < 0.01, `daling geeft ${down / N} terug`);
  assert.ok(best <= 2 * (1 - SM.FEE) + 1e-9);
  assert.equal(SM.cashOut(SM.portfolio(10, 5, -33)), 13.22);
  assert.equal(SM.portfolio(1, 0, -100), 0);
});

test('andere spelers zetten in de loop van de inzettijd in en winnaars kloppen', () => {
  for (let n = N0; n < N0 + 40; n++) {
    const all = SM.crowd(n), early = SM.crowd(n, 1000), half = SM.crowd(n, 5000);
    const players = all.up.n + all.down.n;
    assert.ok(players >= 30 && players <= 200, `${players} spelers`);
    assert.ok(early.up.n <= half.up.n && half.up.n <= all.up.n);
    assert.ok(early.down.amt <= half.down.amt + 1e-9 && half.down.amt <= all.down.amt + 1e-9);
    for (const b of SM.bettors(n)) assert.ok(b.stake >= SM.MIN_BET && b.at >= 0 && b.at < SM.BET_MS);
    const w = SM.winners(n);
    assert.equal(w.count, w.list.length);
    assert.equal(w.total, SM.money(w.list.reduce((t, x) => t + x.amount, 0)));
    for (let i = 1; i < w.list.length; i++) assert.ok(w.list[i - 1].amount >= w.list[i].amount);
  }
});

test('de jackpot groeit, blijft onder de 600K en valt dan', () => {
  const t0 = Date.UTC(2026, 9, 20, 12);
  let prev = SM.jackpotAt(t0), drops = 0;
  for (let t = t0; t < t0 + 12 * 3600e3; t += 5000) {
    const j = SM.jackpotAt(t);
    assert.ok(j.amount >= SM.JACKPOT.seed && j.amount < SM.JACKPOT.cap, `${j.amount}`);
    assert.ok(j.amount < j.drop);
    if (j.k === prev.k) assert.ok(j.amount >= prev.amount, 'groeit alleen');
    else { drops++; assert.equal(j.k, prev.k + 1); }
    prev = j;
  }
  assert.ok(drops >= 2, `${drops} keer gevallen in 12 uur`);
  assert.ok(SM.NAMES.includes(SM.jackpotWinner(prev.k)));
});
