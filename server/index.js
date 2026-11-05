// De server van De Spelkeet: levert de bestanden en regelt de live multiplayer van Karnemelk Kart en de tafelspellen.
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
import { createStats } from './stats.js';
import { isDeviceToken, RETENTION_DAYS } from '../public/shared/profiles.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || join(ROOT, 'data');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
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
// Standaard is dat het adres van De Spelkeet; een ander adres zet je in CONTACT_EMAIL (bijvoorbeeld op Render bij Environment).
const CONTACT_EMAIL = (process.env.CONTACT_EMAIL || '').trim() || 'despelkeet@gmail.com';
// Het eigen webadres, voor het plaatje bij een gedeelde link (og:image moet een volledig adres zijn). Render zet
// RENDER_EXTERNAL_URL zelf; elders kan het met PUBLIC_URL. Zonder adres wordt het een gewoon pad.
const SITE_URL = (process.env.PUBLIC_URL || process.env.RENDER_EXTERNAL_URL || '').trim().replace(/\/+$/, '');
const FILL = { '{{CONTACT_EMAIL}}': CONTACT_EMAIL, '{{SITE_URL}}': /^https?:\/\/[\w.:-]+$/.test(SITE_URL) ? SITE_URL : '' };
for (const page of ['/privacy.html', '/voorwaarden.html', '/melden.html', '/speelhal.html', '/iphone.html']) {
  const f = files.get(page);
  if (!f) continue;
  let text = f.body.toString('utf8');
  for (const [key, value] of Object.entries(FILL)) text = text.replaceAll(key, value.replace(/[<>&"]/g, ''));
  const body = Buffer.from(text);
  files.set(page, {
    body, type: f.type, etag: '"' + createHash('sha1').update(body).digest('base64url').slice(0, 16) + '"',
    gz: gzipSync(body, { level: 9 }), br: brotliCompressSync(body, { params: { [zc.BROTLI_PARAM_QUALITY]: 11 } }),
  });
}

// De koppeling met de Android-app in de Play Store (Digital Asset Links): zonder dit bestand toont de app een
// adresbalk. De app heet nl.spelkeet.app. APP_PRINTS zijn de vingerafdrukken (SHA-256) van de sleutels waarmee de app
// ondertekend is: de uploadsleutel, en (na het uploaden) die van Google (Play Console → App-integriteit →
// App-ondertekening). Een andere pakketnaam kan met ANDROID_PACKAGE, en ANDROID_SHA256 voegt vingerafdrukken toe
// (gescheiden door komma's).
const APP_PACKAGE = 'nl.spelkeet.app';
const APP_PRINTS = [
  'CE:61:C5:3A:25:3C:74:BE:0E:00:D0:30:54:19:D0:C1:28:30:48:F6:48:DA:1F:4D:19:51:22:4E:75:95:AB:4B', // uploadsleutel
  '83:68:BB:D7:CE:82:A8:E2:DE:CB:6E:72:26:6E:3E:54:1B:9B:36:69:66:A4:D8:EE:FB:CA:83:37:35:32:D0:21', // app-ondertekeningssleutel van Google Play
  '42:91:BA:E0:A7:FB:47:21:C4:1B:C2:A0:1E:41:B2:E5:30:93:F0:05:43:75:48:9C:94:9D:79:19:83:69:F7:FB', // Google Play, hybride (klassiek)
  'B0:86:52:64:C7:BB:DF:00:02:CF:8C:67:07:A9:15:3A:37:49:A2:99:8A:47:66:BE:FA:03:EB:41:0D:F6:B6:4C', // Google Play, hybride (PQC)
];
const ASSET_LINKS = (() => {
  const pkg = (process.env.ANDROID_PACKAGE || '').trim() || APP_PACKAGE;
  const own = (process.env.ANDROID_SHA256 || '').split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter((x) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(x));
  const prints = [...new Set([...own, ...(pkg === APP_PACKAGE ? APP_PRINTS : [])])];
  if (!prints.length) return null;
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
  // 90 dagen, bij elk bezoek opnieuw verlengd (zo lang bewaren we ook je profiel als je niet speelt)
  return `${COOKIE}=${token}; Path=/; Max-Age=${RETENTION_DAYS * 86400}; HttpOnly; SameSite=Lax${https ? '; Secure' : ''}`;
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
// de statistieken: bezoekers per dag en per uur, en welke spellen er gespeeld worden (zie stats.js)
const stats = await createStats({ kv: store.kv });
const statsTimer = stats.start();
const stat = (kind, id) => stats.game(kind, id);
const busHub = new BusHub({ log, stat, build: buildOf('/bussen.html') });
const boerHub = new BoerHub({ log, stat, build: buildOf('/boer.html') });
const mexHub = new MexHub({ log, stat, build: buildOf('/mexen.html') });
const dealerHub = new DealerHub({ log, stat, build: buildOf('/dealer.html') });
const paardHub = new PaardHub({ log, stat, build: buildOf('/paardenrace.html') });
const rotondeHub = new RotondeHub({ log, stat, build: buildOf('/rotonde.html') });
const mijnHub = new MijnenveldHub({ log, stat, build: buildOf('/mijnenveld.html') });
const bordHub = new ZuipbordHub({ log, stat, build: buildOf('/zuipbord.html') });
// welke pagina's we tellen, met een korte naam
const PAGE_NAMES = { '/speelhal.html': 'hoofdpagina', '/index.html': 'kart', '/bussen.html': 'bussen', '/boer.html': 'boer', '/mexen.html': 'mexen', '/dealer.html': 'dealer', '/paardenrace.html': 'paardenrace', '/rotonde.html': 'rotonde', '/mijnenveld.html': 'mijnenveld', '/zuipbord.html': 'borrelbord', '/iphone.html': 'iphone', '/privacy.html': 'privacy', '/voorwaarden.html': 'voorwaarden', '/melden.html': 'melden' };
const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

// Een spel met een nieuwe naam (Zuipbord heet nu Borrelbord), en spellen die van de site af zijn (Weerwolven, Mega
// Ball, Stock Market, Rode Zone): wie nog een oude link heeft, komt op de goede plek.
const OLD_PATHS = [
  [/^\/zuipbord(?=\/|$)/, '/borrelbord'],
  [/^\/(megaball|stockmarket|rodezone|weerwolven|wolvennacht)(\/.*)?$/, '/'],
];

// Verhuisd naar een nieuw adres? Zet REDIRECT_TO (bijvoorbeeld https://speelhal.onrender.com) op de oude server,
// dan stuurt die iedereen door, met de rest van de link erbij. Alleen /health blijft, zodat Render de server ziet.
// De oude service op Render (karnemelk-kart) draait dezelfde code en stuurt ook zonder REDIRECT_TO door naar
// spelkeet.onrender.com: Render zet zelf RENDER_EXTERNAL_HOSTNAME.
const OLD_HOSTS = { 'karnemelk-kart.onrender.com': 'https://spelkeet.onrender.com' };
const MOVED_TO = (process.env.REDIRECT_TO || OLD_HOSTS[(process.env.RENDER_EXTERNAL_HOSTNAME || '').trim().toLowerCase()] || '').replace(/\/+$/, '');

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
// meldingen bewaren we hooguit 90 dagen
const recentMeldingen = (list, now = Date.now()) => (Array.isArray(list) ? list : []).filter((m) => now - Date.parse(m.at) <= RETENTION_DAYS * 86400000);

// Elke dag opruimen wat ouder is dan 90 dagen: profielen waarmee niet meer gespeeld is, koppelingen van telefoons,
// verlopen codes en oude meldingen. De statistieken ruimen zichzelf op (stats.js).
async function cleanupOld() {
  try {
    const r = await store.cleanup({ days: RETENTION_DAYS });
    const before = (await store.kv.get('meldingen')) || [], after = recentMeldingen(before);
    if (after.length !== before.length) await store.kv.set('meldingen', after);
    if (store.kv.flush) store.kv.flush();
    log(`opgeruimd (ouder dan ${RETENTION_DAYS} dagen): ${r.profiles} profielen, ${r.devices} telefoons, ${r.transfers} codes, ${r.gone} aantekeningen, ${before.length - after.length} meldingen`);
  } catch (e) {
    log('opruimen mislukt:', e.message);
  }
}

// Bij elke melding een mail, via Resend (resend.com, gratis tot 100 mails per dag). Zet daarvoor RESEND_API_KEY op
// Render. De mail gaat naar MELD_MAIL, of anders naar het contactadres. Zonder sleutel gaat er geen mail; de melding
// staat dan nog steeds in de opslag en in het logboek. Met RESEND_FROM kies je een eigen afzender (dan moet je domein
// bij Resend geverifieerd zijn); standaard is dat onboarding@resend.dev, en dat mag alleen naar je eigen Resend-adres.
const MAIL_KEY = (process.env.RESEND_API_KEY || '').trim();
const MAIL_TO = (process.env.MELD_MAIL || '').trim() || CONTACT_EMAIL;
const MAIL_FROM = (process.env.RESEND_FROM || '').trim() || 'De Spelkeet <onboarding@resend.dev>';
const MAIL_URL = (process.env.RESEND_URL || '').trim() || 'https://api.resend.com/emails';
async function mailMelding(m) {
  if (!MAIL_KEY || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(MAIL_TO)) return;
  const subject = `Melding${m.spel ? ` bij ${m.spel}` : ''}${m.naam ? ` over ${m.naam}` : ''}`;
  const text = [
    'Er is iets gemeld in De Spelkeet.',
    '',
    `Wanneer: ${m.at}`,
    `Spel: ${m.spel || '-'}`,
    `Tafel: ${m.code || '-'}`,
    `Over: ${m.naam || '-'}`,
    '',
    m.wat,
    '',
    `Alle meldingen: ${SITE_URL || ''}/api/meldingen?sleutel=(je MELD_SLEUTEL)`,
  ].join('\n');
  try {
    const r = await fetch(MAIL_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${MAIL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [MAIL_TO], subject, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) log(`melding: mail niet verstuurd (${r.status})`);
  } catch (e) {
    log(`melding: mail niet verstuurd (${e.message})`);
  }
}
async function melden(req, res) {
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  if (!meldAllowed(ip)) return send(429, { ok: false, msg: 'Je hebt al veel gemeld. Probeer het over een uur nog eens.' });
  const b = await readJson(req);
  const wat = clip(b && b.wat, 1000);
  if (!b || wat.length < 5) return send(400, { ok: false, msg: 'Schrijf kort wat er aan de hand is.' });
  const melding = { at: new Date().toISOString(), spel: clip(b.spel, 20), code: clip(b.code, 6).toUpperCase(), naam: clip(b.naam, 40), wat };
  const list = recentMeldingen((await store.kv.get('meldingen')) || []);
  list.unshift(melding);
  await store.kv.set('meldingen', list.slice(0, MELD_MAX));
  log(`melding: ${melding.spel || '-'} ${melding.code || ''} ${melding.naam ? `over ${melding.naam}` : ''}: ${wat.slice(0, 80)}`);
  mailMelding(melding);   // niet op wachten: de speler krijgt meteen antwoord
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
  if (path === '/api/statistieken') {
    const key = process.env.MELD_SLEUTEL;
    if (!key || url.searchParams.get('sleutel') !== key) { res.writeHead(404); return res.end(); }
    const days = Math.max(1, Math.min(120, Number(url.searchParams.get('dagen')) || 30));
    const inGame = [wss, ...tableChannels].reduce((n, ch) => n + ch.clients.size, 0);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ ...stats.summary(days), inGame }));
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
  // De Spelkeet is de hoofdpagina; uitnodigingen (/?room=, /join/) gaan nog steeds naar de kartgame
  if (path === '/kart' || path === '/kart/' || path.startsWith('/join/') || (path === '/' && url.searchParams.has('room'))) path = '/index.html';
  else if (path === '/') path = '/speelhal.html';
  else if (path === '/privacy' || path === '/voorwaarden' || path === '/melden' || path === '/iphone' || path === '/statistieken') path += '.html';
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
  if (req.method === 'GET' && PAGE_NAMES[path]) stats.pageview(PAGE_NAMES[path], { ip: clientIp(req), ua: String(req.headers['user-agent'] || '') });
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
// opruimen: kort na het starten, en daarna elke dag
const cleanupFirst = setTimeout(cleanupOld, 60 * 1000);
const cleanupTimer = setInterval(cleanupOld, 24 * 3600 * 1000);
cleanupFirst.unref?.(); cleanupTimer.unref?.();
const tableBeat = setInterval(() => { for (const channel of tableChannels) sweep(channel.clients); }, 4000);

const tickTimer = setInterval(() => hub.tick(), 1000 / 60);
const busTimer = setInterval(() => { busHub.tick(); boerHub.tick(); mexHub.tick(); dealerHub.tick(); paardHub.tick(); rotondeHub.tick(); mijnHub.tick(); bordHub.tick(); }, 5000);

server.listen(PORT, HOST, () => {
  log(`De Spelkeet draait op http://localhost:${PORT}`);
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
  clearInterval(statsTimer);
  clearTimeout(cleanupFirst);
  clearInterval(cleanupTimer);
  stats.flush().catch(() => {});
  try { store.flush(); } catch (e) { console.error(e); }
  server.close();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { server, hub, cleanupOld };
