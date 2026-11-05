// De teller van De Spelkeet: hoeveel bezoekers er zijn en wanneer, en welke spellen er gespeeld worden.
// Zonder cookies en zonder IP-adressen te bewaren. Een bezoeker herkennen we alleen binnen één dag, aan een hash van
// het IP-adres en de browser met een geheim dat elke dag nieuw is en alleen in het geheugen staat; die hashes
// worden nooit opgeslagen. Wat blijft, zijn alleen tellingen per dag en per uur (tijdzone Amsterdam).
import { createHash, randomBytes } from 'node:crypto';

const TZ = 'Europe/Amsterdam';
const DAYS_KEPT = 120;                 // zo lang bewaren we de tellingen per dag
const ONLINE_MS = 5 * 60 * 1000;       // wie de afgelopen 5 minuten een pagina opende, telt als "nu op de site"
const FLUSH_MS = 60 * 1000;            // zo vaak gaan de tellingen naar de opslag
// geen mensen: zoekmachines, linkvoorbeelden in WhatsApp en zo, monitors en testprogramma's
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|skype|curl|wget|python|go-http|java\/|okhttp|axios|node-fetch|undici|^node$|headless|lighthouse|pagespeed|render|uptime|monitor|pingdom|statuscake/i;

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
export function dayHour(ms) {
  const o = {};
  for (const p of fmt.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { day: `${o.year}-${o.month}-${o.day}`, hour: Number(o.hour) % 24 };
}
const emptyDay = () => ({ views: 0, visitors: 0, hours: Array(24).fill(0), pages: {}, tables: {}, starts: {} });
export const isBot = (ua) => !ua || BOT.test(ua);

export async function createStats({ kv, now = () => Date.now(), flushMs = FLUSH_MS } = {}) {
  let data = null;
  try { data = await kv.get('stats'); } catch (e) { data = null; }
  if (!data || typeof data !== 'object' || !data.days) data = { days: {} };
  let today = '', salt = '', seen = new Set();
  const recent = new Map();            // hash -> laatst gezien (alleen in het geheugen, voor "nu op de site")
  let dirty = false;

  function dayOf(ms) {
    const { day, hour } = dayHour(ms);
    if (day !== today) { today = day; salt = randomBytes(16).toString('hex'); seen = new Set(); }
    if (!data.days[day]) data.days[day] = emptyDay();
    return { d: data.days[day], hour };
  }
  const bump = (obj, key, n = 1) => { obj[key] = (obj[key] || 0) + n; };

  return {
    // een pagina werd geopend (alleen echte pagina's, geen plaatjes of scripts)
    pageview(page, { ip = '', ua = '' } = {}) {
      if (isBot(ua)) return false;
      const t = now(), { d, hour } = dayOf(t);
      const h = createHash('sha256').update(`${salt}|${ip}|${ua}`).digest('hex').slice(0, 20);
      d.views++;
      d.hours[hour]++;
      bump(d.pages, page);
      if (!seen.has(h)) { seen.add(h); d.visitors++; }
      recent.set(h, t);
      if (recent.size > 20000) for (const [k, v] of recent) if (t - v > ONLINE_MS) recent.delete(k);
      dirty = true;
      return true;
    },
    // er werd een tafel gemaakt ('tafel') of een potje gestart ('potje') bij een spel
    game(kind, id) {
      const { d } = dayOf(now());
      bump(kind === 'potje' ? d.starts : d.tables, id);
      dirty = true;
    },
    online() {
      const t = now();
      let n = 0;
      for (const [k, v] of recent) { if (t - v <= ONLINE_MS) n++; else recent.delete(k); }
      return n;
    },
    // de tellingen van de laatste `days` dagen, de oudste eerst (dagen zonder bezoek staan er met 0 in)
    summary(days = 30) {
      const t = now(), list = [];
      for (let i = days - 1; i >= 0; i--) {
        const { day } = dayHour(t - i * 86400000);
        if (list.length && list[list.length - 1].day === day) continue;   // zomertijd: geen dag dubbel
        list.push({ day, ...(data.days[day] || emptyDay()) });
      }
      return { today: dayHour(t).day, online: this.online(), days: list };
    },
    async flush() {
      if (!dirty) return;
      dirty = false;
      const keep = Object.keys(data.days).sort().slice(-DAYS_KEPT);
      data.days = Object.fromEntries(keep.map((k) => [k, data.days[k]]));
      try { await kv.set('stats', data); if (kv.flush) kv.flush(); } catch (e) { dirty = true; }
    },
    start() { const timer = setInterval(() => this.flush(), flushMs); timer.unref?.(); return timer; },
  };
}
