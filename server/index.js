// Karnemelk Kart server: levert de game-bestanden en regelt de live multiplayer.
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

// Verhuisd naar een nieuw adres? Zet REDIRECT_TO (bijvoorbeeld https://speelhal.onrender.com) op de oude server,
// dan stuurt die iedereen door, met de rest van de link erbij. Alleen /health blijft, zodat Render de server ziet.
const MOVED_TO = (process.env.REDIRECT_TO || '').replace(/\/+$/, '');

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let path = decodeURIComponent(url.pathname);
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, ...hub.stats(), bussen: busHub.stats(), boer: boerHub.stats(), mexen: mexHub.stats(), dealer: dealerHub.stats(), paardenrace: paardHub.stats() }));
  }
  if (MOVED_TO) {
    res.writeHead(301, { Location: MOVED_TO + req.url, 'Cache-Control': 'no-cache' });
    return res.end();
  }
  // de speelhal is de hoofdpagina; uitnodigingen (/?room=, /join/) gaan nog steeds naar de kartgame
  if (path === '/kart' || path === '/kart/' || path.startsWith('/join/') || (path === '/' && url.searchParams.has('room'))) path = '/index.html';
  else if (path === '/') path = '/speelhal.html';
  else if (path === '/rodezone' || path === '/rodezone/') path = '/rodezone.html';
  else if (path === '/megaball' || path === '/megaball/') path = '/megaball.html';
  else if (path === '/megaball/storten' || path === '/stockmarket/storten') path = '/megaball-storten.html';
  else if (path === '/stockmarket' || path === '/stockmarket/') path = '/stockmarket.html';
  else if (path === '/bussen' || path === '/bussen/' || /^\/bussen\/[A-Za-z]{4}$/.test(path)) path = '/bussen.html';
  else if (path === '/boer' || path === '/boer/' || /^\/boer\/[A-Za-z]{4}$/.test(path)) path = '/boer.html';
  else if (path === '/mexen' || path === '/mexen/' || /^\/mexen\/[A-Za-z]{4}$/.test(path)) path = '/mexen.html';
  else if (path === '/dealer' || path === '/dealer/' || /^\/dealer\/[A-Za-z]{4}$/.test(path)) path = '/dealer.html';
  else if (path === '/paardenrace' || path === '/paardenrace/' || /^\/paardenrace\/[A-Za-z]{4}$/.test(path)) path = '/paardenrace.html';
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
server.on('upgrade', (req, socket, head) => {
  const { pathname } = new URL(req.url, 'http://x');
  const target = { '/ws': wss, '/ws/bussen': busWss, '/ws/boer': boerWss, '/ws/mexen': mexWss, '/ws/dealer': dealerWss, '/ws/paardenrace': paardWss }[pathname];
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

// dode verbindingen opruimen
const heartbeat = setInterval(() => {
  for (const ws of [...wss.clients, ...busWss.clients, ...boerWss.clients, ...mexWss.clients, ...dealerWss.clients, ...paardWss.clients]) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 15000);

const tickTimer = setInterval(() => hub.tick(), 1000 / 60);
const busTimer = setInterval(() => { busHub.tick(); boerHub.tick(); mexHub.tick(); dealerHub.tick(); paardHub.tick(); }, 5000);

server.listen(PORT, HOST, () => {
  log(`Karnemelk Kart draait op http://localhost:${PORT}`);
  for (const ifs of Object.values(os.networkInterfaces())) {
    for (const i of ifs || []) {
      if (i.family === 'IPv4' && !i.internal) log(`Op je wifi (telefoon): http://${i.address}:${PORT}`);
    }
  }
});

function shutdown() {
  log('Afsluiten...');
  clearInterval(heartbeat);
  clearInterval(tickTimer);
  clearInterval(busTimer);
  try { store.flush(); } catch (e) { console.error(e); }
  server.close();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, hub };
