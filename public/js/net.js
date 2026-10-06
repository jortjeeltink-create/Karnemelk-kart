// Verbinding met de server (WebSocket) met automatisch opnieuw verbinden en klok-synchronisatie.
export class Net {
  constructor() {
    this.handlers = new Map();
    this.ws = null;
    this.status = 'idle';
    this.offset = 0;       // servertijd = performance.now() + offset
    this.rtt = 0;
    this.samples = [];
    this.retry = 0;
    this.closedByUser = false;
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.status === 'closed') this.open();
    });
    window.addEventListener('online', () => { if (this.status === 'closed') this.open(); });
  }

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type).delete(fn);
  }

  emit(type, msg) {
    const hs = this.handlers.get(type);
    if (hs) for (const fn of [...hs]) {
      try { fn(msg); } catch (e) { console.error('fout in', type, e); }
    }
  }

  connect(url) {
    this.url = url;
    this.open();
    this.pingTimer = setInterval(() => this.ping(), 2000);
  }

  setStatus(s) {
    this.status = s;
    this.emit('status', s);
  }

  open() {
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    clearTimeout(this.retryTimer);
    this.setStatus('connecting');
    let ws;
    try { ws = new WebSocket(this.url); } catch (e) { this.scheduleRetry(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      this.setStatus('open');
      this.ping();
      this.emit('open');
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'pong') this.onPong(m);
      this.emit(m.t, m);
    };
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.setStatus('closed');
      if (!this.closedByUser) this.scheduleRetry();
    };
    ws.onerror = () => {};
  }

  scheduleRetry() {
    const wait = Math.min(5000, 400 * 2 ** this.retry);
    this.retry++;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.open(), wait);
  }

  send(obj) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  ping() {
    this.send({ t: 'ping', c: performance.now() });
  }

  onPong(m) {
    const now = performance.now();
    const rtt = now - m.c;
    if (rtt < 0 || rtt > 10000) return;
    this.samples.push({ rtt, off: m.s + rtt / 2 - now });
    if (this.samples.length > 12) this.samples.shift();
    // gebruik de metingen met de laagste vertraging (het nauwkeurigst)
    const best = [...this.samples].sort((a, b) => a.rtt - b.rtt).slice(0, 4);
    this.offset = best.reduce((a, s) => a + s.off, 0) / best.length;
    this.rtt = this.samples.slice(-5).reduce((a, s) => a + s.rtt, 0) / Math.min(5, this.samples.length);
    this.synced = true;
  }

  // ruwe schatting als er nog geen ping is geweest
  hint(serverNow) {
    if (!this.synced) this.offset = serverNow - performance.now();
  }

  serverNow() {
    return performance.now() + this.offset;
  }
}

// Offline-variant voor de demo: de "server" draait in dezelfde pagina.
export class LocalNet extends Net {
  constructor(hub) {
    super();
    this.hub = hub;
  }

  connect() {
    const self = this;
    this.conn = {
      send(text) { setTimeout(() => self.deliver(text), 0); },
      sendVolatile(text) { setTimeout(() => self.deliver(text), 0); },
      close() {},
    };
    this.hub.connect(this.conn);
    this.tickTimer = setInterval(() => this.hub.tick(), 1000 / 60);
    this.offset = Date.now() - performance.now();
    this.synced = true;
    setTimeout(() => { this.setStatus('open'); this.emit('open'); }, 0);
  }

  deliver(text) {
    let m;
    try { m = JSON.parse(text); } catch { return; }
    this.emit(m.t, m);
  }

  send(obj) {
    this.hub.message(this.conn, JSON.parse(JSON.stringify(obj)));
    return true;
  }

  serverNow() { return Date.now(); }
  ping() {}
}
