// Opslag: bestand en Upstash Redis (met een nagebootste Upstash-server).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileKV, UpstashKV, ProfileStore } from '../server/store.js';

function fakeUpstash(token) {
  const data = new Map();
  const srv = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => { body += d; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.headers.authorization !== `Bearer ${token}`) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'Unauthorized' })); }
      const [cmd, key, val] = JSON.parse(body);
      let result = null;
      if (cmd === 'PING') result = 'PONG';
      else if (cmd === 'GET') result = data.has(key) ? data.get(key) : null;
      else if (cmd === 'SET') { data.set(key, val); result = 'OK'; }
      else if (cmd === 'DEL') result = data.delete(key) ? 1 : 0;
      res.end(JSON.stringify({ result }));
    });
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, data, url: `http://127.0.0.1:${srv.address().port}` })));
}

async function exercise(store) {
  const a = await store.login('Jort', '1234');
  assert.equal(a.ok, true);
  assert.equal(a.created, true);
  assert.equal(a.profile.mp, 150);
  a.profile.mp = 777;
  a.profile.owned.push('cape_rood');
  await store.save(a.profile);
  const wrong = await store.login('jort', '0000');
  assert.equal(wrong.ok, false);
  assert.match(wrong.error, /PIN klopt niet/);
  const again = await store.login('JORT', '1234');
  assert.equal(again.ok, true);
  assert.equal(again.created, false);
  const viaToken = await store.fromToken(a.token);
  assert.equal(viaToken.mp, 777);
  assert.equal((await store.login('x', '1234')).ok, false, 'te korte naam');
  assert.equal((await store.login('Lisa', '12a4')).ok, false, 'PIN met letter');
  // na 5 foute pogingen even op slot
  for (let i = 0; i < 5; i++) await store.login('Jort', '9999');
  const locked = await store.login('Jort', '1234');
  assert.equal(locked.ok, false);
  assert.match(locked.error, /Te veel foute pogingen/);
  return a.token;
}

test('bestandsopslag bewaart profielen en sessies', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kk-store-'));
  const kv = new FileKV(dir);
  const store = new ProfileStore(kv);
  await store.init();
  const token = await exercise(store);
  kv.flush();
  // nieuwe instantie leest alles terug
  const store2 = new ProfileStore(new FileKV(dir));
  await store2.init();
  const p = await store2.fromToken(token);
  assert.equal(p.mp, 777);
  assert.ok(p.owned.includes('cape_rood'));
  assert.ok(!JSON.stringify(p).includes('"1234"'), 'PIN wordt niet leesbaar opgeslagen');
});

test('Upstash Redis-opslag werkt via de REST-API', async () => {
  const fake = await fakeUpstash('geheim');
  try {
    const store = new ProfileStore(new UpstashKV(fake.url, 'geheim'));
    await store.init();
    const token = await exercise(store);
    assert.ok([...fake.data.keys()].some((k) => k.startsWith('kk:p:')));
    const store2 = new ProfileStore(new UpstashKV(fake.url, 'geheim'));
    await store2.init();
    assert.equal((await store2.fromToken(token)).mp, 777);
    await assert.rejects(new UpstashKV(fake.url, 'fout').init(), /Upstash/);
  } finally {
    fake.srv.close();
  }
});
