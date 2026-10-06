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
import { createStore, randomString } from './store.js';
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
const hub = new Hub({ store, log, laps: process.env.KK_LAPS ? +process.env.KK_LAPS : null });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let path = decodeURIComponent(url.pathname);
  if (path === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, ...hub.stats() }));
  }
  if (path === '/' || path.startsWith('/join/')) path = '/index.html';
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

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 32 * 1024 });
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

// dode verbindingen opruimen
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 15000);

const tickTimer = setInterval(() => hub.tick(), 1000 / 60);

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
  try { store.flush(); } catch (e) { console.error(e); }
  server.close();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, hub };
