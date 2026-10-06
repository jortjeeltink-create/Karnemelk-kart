// Hulpjes voor de tests: server starten en nep-spelers laten verbinden.
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

export async function startServer({ port, dataDir, env = {} } = {}) {
  dataDir = dataDir || mkdtempSync(join(tmpdir(), 'kk-test-'));
  port = port || 4100 + Math.floor(Math.random() * 800);
  const proc = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT, env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, HOST: '127.0.0.1', ...env }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  proc.stdout.on('data', (d) => { out += d; });
  proc.stderr.on('data', (d) => { out += d; });
  const t0 = Date.now();
  while (!out.includes('draait op')) {
    if (Date.now() - t0 > 8000) throw new Error('server start niet: ' + out);
    if (proc.exitCode != null) throw new Error('server gestopt: ' + out);
    await sleep(50);
  }
  return {
    port, dataDir, proc, url: `http://127.0.0.1:${port}`, ws: `ws://127.0.0.1:${port}/ws`, output: () => out,
    stop: () => new Promise((res) => { proc.once('exit', res); proc.kill('SIGTERM'); }),
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Client {
  constructor(url) {
    this.url = url;
    this.msgs = [];
    this.waiters = [];
    this.last = {};
  }
  open() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => res(this);
      this.ws.onerror = (e) => rej(e);
      this.ws.onmessage = (ev) => {
        const m = JSON.parse(ev.data);
        this.last[m.t] = m;
        this.msgs.push(m);
        if (this.onMsg) this.onMsg(m);
        this.waiters = this.waiters.filter((w) => {
          if (w.pred(m)) { w.res(m); return false; }
          return true;
        });
      };
    });
  }
  send(obj) { this.ws.send(JSON.stringify(obj)); }
  wait(pred, ms = 5000) {
    if (typeof pred === 'string') { const t = pred; pred = (m) => m.t === t; }
    return new Promise((res, rej) => {
      const w = { pred, res };
      this.waiters.push(w);
      setTimeout(() => {
        if (this.waiters.includes(w)) {
          this.waiters = this.waiters.filter((x) => x !== w);
          rej(new Error('timeout bij wachten op bericht; laatste: ' + JSON.stringify(this.msgs.slice(-3)).slice(0, 400)));
        }
      }, ms);
    });
  }
  async request(obj, pred, ms) {
    const p = this.wait(pred, ms);
    this.send(obj);
    return p;
  }
  close() { this.ws.close(); }
}

// nieuwe speler (of bestaande, als device wordt meegegeven)
// backup: de reservekopie die een telefoon bewaart (voor een server die je vergeten is)
export async function loginClient(wsUrl, name, device = null, backup = null) {
  const c = await new Client(wsUrl).open();
  const w = await c.request({ t: 'hello', device, backup }, 'welcome');
  c.device = w.device;
  if (w.profile) {
    c.profile = w.profile;
    return c;
  }
  if (name === 'x') return c; // alleen kijken of de server je kent
  const r = await c.request({ t: 'register', name }, (m) => m.t === 'loggedIn' || m.t === 'registerFailed');
  c.profile = r.profile;
  return c;
}
