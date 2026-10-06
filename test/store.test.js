// Opslag: bestand en Upstash Redis (met een nagebootste Upstash-server).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileKV, UpstashKV, createProfiles, randomString } from '../server/store.js';

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
  const dev = randomString(32);
  assert.equal(dev.length, 32);
  const bad = await store.register('kort', 'Jort');
  assert.equal(bad.ok, false, 'ongeldige apparaatsleutel');
  assert.equal((await store.register(dev, 'x')).ok, false, 'te korte naam');
  const a = await store.register(dev, 'Jort');
  assert.equal(a.ok, true);
  assert.equal(a.created, true);
  assert.equal(a.profile.mp, 150);
  a.profile.mp = 777;
  a.profile.owned.push('cape_rood');
  await store.save(a.profile);
  // nog een keer registreren op hetzelfde apparaat geeft hetzelfde profiel
  const again = await store.register(dev, 'Iemand anders');
  assert.equal(again.profile.key, a.profile.key);
  // twee mensen met dezelfde naam op verschillende telefoons: twee profielen
  const dev2 = randomString(32);
  const b = await store.register(dev2, 'Jort');
  assert.notEqual(b.profile.key, a.profile.key);
  assert.equal(b.profile.mp, 150);
  // overzetcode
  const code = await store.createTransfer(a.profile);
  const dev3 = randomString(32);
  const t = await store.useTransfer(dev3, code);
  assert.equal(t.ok, true);
  assert.equal((await store.byDevice(dev3)).mp, 777);
  assert.equal((await store.useTransfer(randomString(32), code)).ok, false, 'code werkt maar één keer');
  return dev;
}

test('bestandsopslag bewaart profielen per telefoon', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kk-store-'));
  const kv = new FileKV(dir);
  const store = createProfiles(kv);
  await store.init();
  const dev = await exercise(store);
  kv.flush();
  // nieuwe instantie leest alles terug
  const store2 = createProfiles(new FileKV(dir));
  await store2.init();
  const p = await store2.byDevice(dev);
  assert.equal(p.mp, 777);
  assert.ok(p.owned.includes('cape_rood'));
  // de apparaatsleutel staat alleen als verwijzing in de opslag, niet in het profiel
  const raw = readFileSync(join(dir, 'karnemelk-data.json'), 'utf8');
  assert.ok(!JSON.stringify(p).includes(dev));
  assert.ok(raw.includes('d:' + dev));
});

test('Upstash Redis-opslag werkt via de REST-API', async () => {
  const fake = await fakeUpstash('geheim');
  try {
    const store = createProfiles(new UpstashKV(fake.url, 'geheim'));
    await store.init();
    const dev = await exercise(store);
    assert.ok([...fake.data.keys()].some((k) => k.startsWith('kk:p:')));
    const store2 = createProfiles(new UpstashKV(fake.url, 'geheim'));
    await store2.init();
    assert.equal((await store2.byDevice(dev)).mp, 777);
    await assert.rejects(new UpstashKV(fake.url, 'fout').init(), /Upstash/);
  } finally {
    fake.srv.close();
  }
});
