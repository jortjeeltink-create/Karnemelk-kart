// De server van ATJE: levert de bestanden en regelt de live multiplayer van Karnemelk Kart en de tafelspellen.
// Start met:  npm start   (standaard op http://localhost:3000)
import http from 'node:http';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, brotliCompressSync, constants as zc } from 'node:zlib';
import { createHash } from 'node:crypto';
import os from 'node:os';
import { WebSocketServer } from 'ws';
import { Hub } from '../public/shared/hub.js';
import { BusHub } from '../public/shared/bushub.js';
import { BoerHub } from '../public/shared/boerhub.js';
import { MexHub } from '../public/shared/mexhub.js';
import { DealerHub } from '../public/shared/ftdhub.js';
import { PaardHub } from '../public/shared/paardhub.js';
import { RotondeHub } from '../public/shared/rotondehub.js';
import { MijnenveldHub } from '../public/shared/mijnenveldhub.js';
import { ZuipbordHub } from '../public/shared/zuipbordhub.js';
import { createStore, randomString, loadSecret, makeSigner, makeSecretCheck } from './store.js';
import { isDeviceToken } from '../public/shared/profiles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};
const COMPRESS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest', '.txt']);

// Alle bestanden één keer inlezen en (gecomprimeerd) in het geheugen houden.
const files = new Map();
function addDir(dir, urlPrefix) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) addDir(full, `${urlPrefix}${name}/`);
    else {
      const ext = extname(name).toLowerCase();
      if (!MIME[ext]) continue;
      const body = readFileSync(full);
      const entry = { body, type: MIME[ext], etag: '"' + createHash('sha1').update(body).digest('base64url').slice(0, 16) + '"' };
      if (COMPRESS.has(ext) && body.length > 512) {
        entry.gz = gzipSync(body, { level: 9 });
        entry.br = brotliCompressSync(body, { params: { [zc.BROTLI_PARAM_QUALITY]: 11 } });
      }
      files.set(urlPrefix + name, entry);
    }
  }
}
addDir(join(ROOT, 'public'), '/');

// Op de pagina's met het privacybeleid, de voorwaarden en het meldformulier staat het e-mailadres voor contact.
// Zet het in CONTACT_EMAIL (bijvoorbeeld op Render bij Environment); dan staat het er vanzelf in.
const CONTACT_EMAIL = (process.env.CONTACT_EMAIL || '').trim() || 'het e-mailadres bij ATJE in de Google Play Store';
for (const page of ['/privacy.html', '/voorwaarden.html', '/melden.html']) {
  const f = files.get(page);
  if (!f) continue;
  const body = Buffer.from(f.body.toString('utf8').replaceAll('{{CONTACT_EMAIL}}', CONTACT_EMAIL.replace(/[<>&"]/g, '')));
  files.set(page, {
    body, type: f.type, etag: '"' + createHash('sha1').update(body).digest('base64url').slice(0, 16) + '"',
    gz: gzipSync(body, { level: 9 }), br: brotliCompressSync(body, { params: { [zc.BROTLI_PARAM_QUALITY]: 11 } }),
  });
}

// De koppeling met de Android-app in de Play Store (Digital Asset Links): zonder dit bestand toont de app een
// adresbalk. ANDROID_PACKAGE is de pakketnaam van de app, ANDROID_SHA256 de vingerafdruk(ken) van de sleutel
// waarmee Google de app ondertekent, gescheiden door komma's (Play Console → App-integriteit → App-ondertekening).
const ASSET_LINKS = (() => {
  const pkg = (process.env.ANDROID_PACKAGE || '').trim();
  const prints = (process.env.ANDROID_SHA256 || '').split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(x));
  if (!pkg || !prints.length) return null;
  return JSON.stringify([{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name: pkg, sha256_cert_fingerprints: prints } }]);
})();


// ---------- apparaatcookie: zo onthoudt de server welke telefoon je bent ----------
const COOKIE = 'kk_dev';
function readCookie(req) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === COOKIE) {
      const val = decodeURIComponent(v.join('='));
      return isDeviceToken(val) ? val : null;
    }
  }
  return null;
}
function deviceCookie(req) {
  const token = readCookie(req) || randomString(32);
  const https = req.headers['x-forwarded-proto'] === 'https' || req.socket.encrypted;
  // 400 dagen is het maximum dat browsers toestaan; bij elk bezoek opnieuw verlengd
  return `${COOKIE}=${token}; Path=/; Max-Age=34560000; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`;
}

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const store = await createStore({
  dataDir: DATA_DIR,
  upstashUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  log,
});
const signer = makeSigner(await loadSecret(store.kv, process.env.KK_SECRET));
const checkSecret = makeSecretCheck(process.env.KK_SECRET_HASH || undefined);
const hub = new Hub({ store, log, signer, checkSecret, laps: process.env.KK_LAPS ? +process.env.KK_LAPS : null });
// versie van een tafelspel: verandert de pagina of de spelregels, dan laden telefoons die nog openstaan zichzelf opnieuw
const buildOf = (page) => createHash('sha1').update([...files].filter(([k]) => k === page || k.startsWith('/shared/')).map(([, f]) => f.etag).join('')).digest('base64url').slice(0, 12);
const busHub = new BusHub({ log, build: buildOf('/bussen.html') });
const boerHub = new BoerHub({ log, build: buildOf('/boer.html') });
const mexHub = new MexHub({ log, build: buildOf('/mexen.html') });
const dealerHub = new DealerHub({ log, build: buildOf('/dealer.html') });
const paardHub = new PaardHub({ log, build: buildOf('/paardenrace.html') });
const rotondeHub = new RotondeHub({ log, build: buildOf('/rotonde.html') });
const mijnHub = new MijnenveldHub({ log, build: buildOf('/mijnenveld.html') });
const bordHub = new ZuipbordHub({ log, build: buildOf('/zuipbord.html') });

// Een spel met een nieuwe naam (Zuipbord heet nu Borrelbord), en spellen die van de site af zijn (Weerwolven, Mega
// Ball, Stock Market, Rode Zone): wie nog een oude link heeft, komt op de goede plek.
const OLD_PATHS = [
  [/^\/zuipbord(?=\/|$)/, '/borrelbord'],
  [/^\/(megaball|stockmarket|rodezone|weerwolven|wolvennacht)(\/.*)?$/, '/'],
];

// Verhuisd naar een nieuw adres? Zet REDIRECT_TO (bijvoorbeeld https://speelhal.onrender.com) op de oude server,
// dan stuurt die iedereen door, met de rest van de link erbij. Alleen /health blijft, zodat Render de server ziet.
const MOVED_TO = (process.env.REDIRECT_TO || '').replace(/\/+$/, '');

// ---------- meldingen (Iets melden): een speler, een naam of iets anders ----------
// De laatste 500 staan in de opslag onder 'meldingen'. Lezen kan met MELD_SLEUTEL: /api/meldingen?sleutel=...
const MELD_MAX = 500;
const meldTimes = new Map();   // per IP-adres: wanneer er gemeld werd, om spam tegen te gaan
function meldAllowed(ip, now = Date.now()) {
  const recent = (meldTimes.get(ip) || []).filter((t) => now - t < 3600_000);
  if (recent.length >= 10) return false;
  recent.push(now);
  meldTimes.set(ip, recent);
  if (meldTimes.size > 5000) meldTimes.clear();
  return true;
}
const clip = (v, n) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n) : '');
function readJson(req, max = 4096) {
  return new Promise((resolve) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { req.destroy(); resolve(null); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch { resolve(null); } });
    req.on('error', () => resolve(null));
  });
}
async function melden(req, res) {
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!meldAllowed(ip)) return send(429, { ok: false, msg: 'Je hebt al veel gemeld. Probeer het over een uur nog eens.' });
  const b = await readJson(req);
  const wat = clip(b && b.wat, 1000);
  if (!b || wat.length < 5) return send(400, { ok: false, msg: 'Schrijf kort wat er aan de hand is.' });
  const melding = { at: new Date().toISOString(), spel: clip(b.spel, 20), code: clip(b.code, 6).toUpperCase(), naam: clip(b.naam, 40), wat };
  const list = (await store.kv.get('meldingen')) || [];
  list.unshift(melding);
  await store.kv.set('meldingen', list.slice(0, MELD_MAX));
  log(`melding: ${melding.spel || '-'} ${melding.code || ''} ${melding.naam ? `over ${melding.naam}` : ''}: ${wat.slice(0, 80)}`);
  return send(200, { ok: true });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let path = decodeURIComponent(url.pathname);
  if (path === '/api/melden' && req.method === 'POST') { melden(req, res); return; }
  if (path === '/api/meldingen') {
    const key = process.env.MELD_SLEUTEL;
    if (!key || url.searchParams.get('sleutel') !== key) { res.writeHead(404); return res.end(); }
    store.kv.get('meldingen').then((list) => { res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(list || [], null, 2)); });
    return;
  }
  if (path === '/.well-known/assetlinks.json') {
    if (!ASSET_LINKS) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Niet ingesteld (ANDROID_PACKAGE en ANDROID_SHA256)'); }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
    return res.end(ASSET_LINKS);
  }
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, ...hub.stats(), bussen: busHub.stats(), boer: boerHub.stats(), mexen: mexHub.stats(), dealer: dealerHub.stats(), paardenrace: paardHub.stats(), rotonde: rotondeHub.stats(), mijnenveld: mijnHub.stats(), zuipbord: bordHub.stats() }));
  }
  if (MOVED_TO) {
    res.writeHead(301, { Location: MOVED_TO + req.url, 'Cache-Control': 'no-cache' });
    return res.end();
  }
  // oude adressen: een spel met een nieuwe naam, of een spel dat er niet meer is (dan naar de hoofdpagina)
  const moved = OLD_PATHS.find(([re]) => re.test(path));
  if (moved) {
    res.writeHead(301, { Location: path.replace(moved[0], moved[1]) + url.search, 'Cache-Control': 'no-cache' });
    return res.end();
  }
  // ATJE is de hoofdpagina; uitnodigingen (/?room=, /join/) gaan nog steeds naar de kartgame
  if (path === '/kart' || path === '/kart/' || path.startsWith('/join/') || (path === '/' && url.searchParams.has('room'))) path = '/index.html';
  else if (path === '/') path = '/speelhal.html';
  else if (path === '/privacy' || path === '/voorwaarden' || path === '/melden') path += '.html';
  else if (path === '/bussen' || path === '/bussen/' || /^\/bussen\/[A-Za-z]{4}$/.test(path)) path = '/bussen.html';
  else if (path === '/boer' || path === '/boer/' || /^\/boer\/[A-Za-z]{4}$/.test(path)) path = '/boer.html';
  else if (path === '/mexen' || path === '/mexen/' || /^\/mexen\/[A-Za-z]{4}$/.test(path)) path = '/mexen.html';
  else if (path === '/dealer' || path === '/dealer/' || /^\/dealer\/[A-Za-z]{4}$/.test(path)) path = '/dealer.html';
  else if (path === '/paardenrace' || path === '/paardenrace/' || /^\/paardenrace\/[A-Za-z]{4}$/.test(path)) path = '/paardenrace.html';
  else if (path === '/rotonde' || path === '/rotonde/' || /^\/rotonde\/[A-Za-z]{4}$/.test(path)) path = '/rotonde.html';
  else if (path === '/mijnenveld' || path === '/mijnenveld/' || /^\/mijnenveld\/[A-Za-z]{4}$/.test(path)) path = '/mijnenveld.html';
  else if (path === '/borrelbord' || path === '/borrelbord/' || /^\/borrelbord\/[A-Za-z]{4}$/.test(path)) path = '/zuipbord.html';
  if (path.includes('..') || path.includes(sep + sep)) { res.writeHead(400); return res.end(); }
  const f = files.get(path);
  if (!f) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Niet gevonden');
  }
  const headers = { 'Content-Type': f.type, ETag: f.etag, 'Cache-Control': 'no-cache', Vary: 'Accept-Encoding', 'X-Content-Type-Options': 'nosniff' };
  if (path === '/index.html') headers['Set-Cookie'] = deviceCookie(req);
  if (req.headers['if-none-match'] === f.etag) { res.writeHead(304, headers); return res.end(); }
  const ae = req.headers['accept-encoding'] || '';
  let body = f.body;
  if (f.br && /\bbr\b/.test(ae)) { body = f.br; headers['Content-Encoding'] = 'br'; }
  else if (f.gz && /\bgzip\b/.test(ae)) { body = f.gz; headers['Content-Encoding'] = 'gzip'; }
  headers['Content-Length'] = body.length;
  res.writeHead(200, headers);
  res.end(req.method === 'HEAD' ? undefined : body);
});

// WebSocket-kanalen op dezelfde server: /ws voor de kartgame, en per tafelspel een eigen kanaal
const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 });
const busWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
const boerWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
const mexWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
const dealerWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
const paardWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
const rotondeWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
const mijnWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
const bordWss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 });
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://x');
  const target = { '/ws': wss, '/ws/bussen': busWss, '/ws/boer': boerWss, '/ws/mexen': mexWss, '/ws/dealer': dealerWss, '/ws/paardenrace': paardWss, '/ws/rotonde': rotondeWss, '/ws/mijnenveld': mijnWss, '/ws/zuipbord': bordWss }[pathname];
  if (!target) { socket.destroy(); return; }
  target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
});

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  const conn = {
    cookieDevice: readCookie(req),
    send: (text) => { if (ws.readyState === 1) ws.send(text); },
    // statusupdates overslaan als de verbinding van iemand achterloopt
    sendVolatile: (text) => { if (ws.readyState === 1 && ws.bufferedAmount < 128 * 1024) ws.send(text); },
    close: () => ws.close(),
  };
  hub.connect(conn);
  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    hub.message(conn, msg);
  });
  ws.on('close', () => hub.disconnect(conn));
  ws.on('error', () => {});
});

// een tafelspel: elke telefoon is een verbinding met de hub van dat spel
function tableChannel(channel, tables) {
  channel.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    const conn = {
      send: (text) => { if (ws.readyState === 1) ws.send(text); },
      close: () => ws.close(),
    };
    tables.connect(conn);
    ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      tables.message(conn, msg);
    });
    ws.on('close', () => tables.disconnect(conn));
    ws.on('error', () => {});
  });
}
tableChannel(busWss, busHub);
tableChannel(boerWss, boerHub);
tableChannel(mexWss, mexHub);
tableChannel(dealerWss, dealerHub);
tableChannel(paardWss, paardHub);
tableChannel(rotondeWss, rotondeHub);
tableChannel(mijnWss, mijnHub);
tableChannel(bordWss, bordHub);

// dode verbindingen opruimen: wie twee keer op rij niet antwoordt, valt weg (en komt vanzelf terug zodra hij weer
// verbinding heeft). Bij de tafelspellen gaat dat sneller, zodat de rest niet lang hoeft te wachten als wie aan de
// beurt is stil wegvalt (bijvoorbeeld buiten de wifi).
function sweep(clients) {
  for (const ws of clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}
const tableChannels = [busWss, boerWss, mexWss, dealerWss, paardWss, rotondeWss, mijnWss, bordWss];
const heartbeat = setInterval(() => sweep(wss.clients), 15000);
const tableBeat = setInterval(() => { for (const channel of tableChannels) sweep(channel.clients); }, 4000);

const tickTimer = setInterval(() => hub.tick(), 1000 / 60);
const busTimer = setInterval(() => { busHub.tick(); boerHub.tick(); mexHub.tick(); dealerHub.tick(); paardHub.tick(); rotondeHub.tick(); mijnHub.tick(); bordHub.tick(); }, 5000);

server.listen(PORT, HOST, () => {
  log(`ATJE draait op http://localhost:${PORT}`);
  for (const ifs of Object.values(os.networkInterfaces())) {
    for (const i of ifs || []) {
      if (i.family === 'IPv4' && !i.internal) log(`Op je wifi (telefoon): http://${i.address}:${PORT}`);
    }
  }
});

function shutdown() {
  log('Afsluiten...');
  clearInterval(heartbeat);
  clearInterval(tableBeat);
  clearInterval(tickTimer);
  clearInterval(busTimer);
  try { store.flush(); } catch (e) { console.error(e); }
  server.close();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, hub };
