// Race-informatie op het scherm: plek, ronde, tijd, item, minikaart en live stand.
import { formatTime } from '../../shared/util.js';
import { ITEM_ICONS } from '../icons.js';
import { ITEM } from '../../shared/items.js';

const ITEMS = [ITEM.TURBO, ITEM.TURBO3, ITEM.SCHILD, ITEM.PLAS, ITEM.KLOMP];

export class Hud {
  constructor(app, race) {
    this.app = app;
    this.race = race;
    const root = document.getElementById('hud');
    root.innerHTML = `
      <button class="hud-menu-btn" aria-label="Racemenu"><svg viewBox="0 0 24 24"><rect x="5" y="4" width="4.5" height="16" rx="1.5" fill="currentColor"/><rect x="14.5" y="4" width="4.5" height="16" rx="1.5" fill="currentColor"/></svg></button>
      <div class="hud-pos"><span class="n">-</span><span class="e">e</span><span class="of"></span></div>
      <div class="hud-item"><div class="slot"></div><span class="count"></span></div>
      <div class="hud-right">
        <div class="hud-lap">Ronde <b>1</b>/${race.laps}</div>
        <div class="hud-time">0:00.00</div>
        <div class="hud-ping"></div>
      </div>
      <canvas class="hud-map"></canvas>
      <ol class="hud-standings"></ol>
      <div class="hud-center"><div class="hud-big"></div><div class="hud-sub"></div></div>
      <div class="hud-warn"></div>
      <div class="hud-feed"></div>
      <div class="hud-spect hidden"></div>
      <div class="hud-panel hidden">
        <div class="card">
          <h2>Racemenu</h2>
          <p class="muted small">De race gaat gewoon door terwijl dit menu open is.</p>
          <button class="btn btn-primary hp-close">Verder racen</button>
          <button class="btn hp-sound"></button>
          <button class="btn hp-recal hidden">Kantelen opnieuw afstellen</button>
          <button class="btn btn-danger hp-leave">Race verlaten</button>
        </div>
      </div>
      <div class="touch-layer"></div>`;
    this.root = root;
    this.q = (s) => root.querySelector(s);
    this.posN = this.q('.hud-pos .n');
    this.posOf = this.q('.hud-pos .of');
    this.lapEl = this.q('.hud-lap b');
    this.timeEl = this.q('.hud-time');
    this.pingEl = this.q('.hud-ping');
    this.itemSlot = this.q('.hud-item .slot');
    this.itemCount = this.q('.hud-item .count');
    this.bigEl = this.q('.hud-big');
    this.subEl = this.q('.hud-sub');
    this.warnEl = this.q('.hud-warn');
    this.feedEl = this.q('.hud-feed');
    this.standEl = this.q('.hud-standings');
    this.spectEl = this.q('.hud-spect');
    this.map = this.q('.hud-map');
    this.panel = this.q('.hud-panel');
    this.bigUntil = 0;
    this.lastStand = '';
    this.standT = 0;
    this.rollT = 0;
    this.shownItem = -1;
    this.q('.hud-menu-btn').addEventListener('click', () => this.togglePanel(true));
    this.q('.hp-close').addEventListener('click', () => this.togglePanel(false));
    this.q('.hp-sound').addEventListener('click', () => {
      app.settings.muted = !app.settings.muted;
      app.saveSettings();
      this.updateSoundBtn();
    });
    this.q('.hp-recal').addEventListener('click', () => { app.controls.recalibrate(); this.togglePanel(false); });
    this.q('.hp-leave').addEventListener('click', () => app.confirm('Weet je zeker dat je de race wilt verlaten? Je kunt via de groepscode weer meedoen.', 'Verlaten', () => app.leaveRoom()));
    this.q('.hud-item').addEventListener('pointerdown', (e) => {
      // tik op het item-vakje = item gebruiken
      e.preventDefault();
      app.controls.touch.item = true;
      setTimeout(() => { app.controls.touch.item = false; }, 90);
    });
    if (app.settings.controls === 'kantelen') this.q('.hp-recal').classList.remove('hidden');
    this.updateSoundBtn();
    this.prepareMap();
    this.map.classList.toggle('hidden', !app.settings.minimap);
  }

  updateSoundBtn() {
    this.q('.hp-sound').textContent = this.app.settings.muted ? 'Geluid aanzetten' : 'Geluid uitzetten';
  }

  togglePanel(open) {
    this.panel.classList.toggle('hidden', !open);
  }

  get touchLayer() { return this.q('.touch-layer'); }

  prepareMap() {
    const tr = this.race.track;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (let i = 0; i < tr.N; i++) {
      minX = Math.min(minX, tr.px[i]); maxX = Math.max(maxX, tr.px[i]);
      minZ = Math.min(minZ, tr.pz[i]); maxZ = Math.max(maxZ, tr.pz[i]);
    }
    const size = 118;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.map.width = size * dpr; this.map.height = size * dpr;
    this.map.style.width = size + 'px'; this.map.style.height = size + 'px';
    const sc = (size - 16) / Math.max(maxX - minX, maxZ - minZ);
    const ox = (size - (maxX - minX) * sc) / 2, oz = (size - (maxZ - minZ) * sc) / 2;
    // bovenaanzicht: x naar rechts, z naar beneden
    this.mapTf = (x, z) => [((x - minX) * sc + ox) * dpr, ((z - minZ) * sc + oz) * dpr];
    const bg = document.createElement('canvas');
    bg.width = this.map.width; bg.height = this.map.height;
    const g = bg.getContext('2d');
    g.lineJoin = 'round';
    const path = () => {
      g.beginPath();
      for (let i = 0; i <= tr.N; i += 3) {
        const [x, y] = this.mapTf(tr.px[i % tr.N], tr.pz[i % tr.N]);
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
    };
    g.strokeStyle = 'rgba(20,20,50,0.55)'; g.lineWidth = 9 * dpr; path(); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 4.5 * dpr; path(); g.stroke();
    const s0 = tr.pointAt(0, -tr.halfW), s1 = tr.pointAt(0, tr.halfW);
    const [ax, ay] = this.mapTf(s0.x, s0.z), [bx, by] = this.mapTf(s1.x, s1.z);
    g.strokeStyle = '#ff7a00'; g.lineWidth = 3 * dpr; g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    this.mapBg = bg;
    this.mapCtx = this.map.getContext('2d');
    this.dpr = dpr;
  }

  drawMap(dots) {
    if (!this.app.settings.minimap) return;
    const g = this.mapCtx;
    g.clearRect(0, 0, this.map.width, this.map.height);
    g.drawImage(this.mapBg, 0, 0);
    // eigen kart als laatste (bovenop)
    for (const d of dots) {
      const [x, y] = this.mapTf(d.x, d.z);
      g.beginPath();
      g.arc(x, y, (d.me ? 5.5 : 4) * this.dpr, 0, Math.PI * 2);
      g.fillStyle = d.color;
      g.fill();
      g.lineWidth = (d.me ? 2.5 : 1.5) * this.dpr;
      g.strokeStyle = d.me ? '#ffffff' : 'rgba(0,0,0,0.6)';
      g.stroke();
    }
  }

  big(text, sub = '', ms = 1200, cls = '') {
    this.bigEl.textContent = text;
    this.subEl.textContent = sub;
    this.bigEl.className = 'hud-big show ' + cls;
    this.bigUntil = performance.now() + ms;
    // animatie opnieuw starten
    void this.bigEl.offsetWidth;
    this.bigEl.classList.add('pop');
  }

  feed(text) {
    const d = document.createElement('div');
    d.className = 'feed-item';
    d.textContent = text;
    this.feedEl.prepend(d);
    while (this.feedEl.children.length > 3) this.feedEl.lastChild.remove();
    setTimeout(() => d.classList.add('fade'), 2600);
    setTimeout(() => d.remove(), 3200);
  }

  warn(text) {
    if (this.warnText === text) return;
    this.warnText = text;
    this.warnEl.textContent = text || '';
    this.warnEl.classList.toggle('show', !!text);
  }

  spectate(text) {
    this.root.classList.toggle('spectating', !!text);
    this.spectEl.textContent = text || '';
    this.spectEl.classList.toggle('hidden', !text);
  }

  setItem(item, roll, count, dt) {
    let show = item;
    if (item && roll > 0) {
      this.rollT += dt;
      if (this.rollT > 0.08) {
        this.rollT = 0;
        this.rollIdx = ((this.rollIdx || 0) + 1) % ITEMS.length;
        this.app.sound.play('roll', 0.6);
      }
      show = ITEMS[this.rollIdx || 0];
    }
    const key = show + ':' + (roll > 0 ? 'r' : '') + count;
    if (key !== this.shownItem) {
      if (this.shownItem !== -1 && item && !roll && String(this.shownItem).includes('r')) this.app.sound.play('item');
      this.shownItem = key;
      const html = show ? ITEM_ICONS[show] : '';
      this.itemSlot.innerHTML = html;
      this.itemSlot.parentElement.classList.toggle('rolling', roll > 0);
      this.itemSlot.parentElement.classList.toggle('ready', !!item && roll <= 0);
      this.itemCount.textContent = item === ITEM.TURBO3 && roll <= 0 && count > 1 ? `x${count}` : '';
      this.app.controls.setItemIcon(item && roll <= 0 ? html : '');
    }
  }

  update(dt, s) {
    if (this.bigUntil && performance.now() > this.bigUntil) {
      this.bigEl.classList.remove('show', 'pop');
      this.subEl.textContent = '';
      this.bigUntil = 0;
    }
    if (s.place) {
      this.posN.textContent = s.place;
      this.posOf.textContent = '/' + s.total;
      this.posN.parentElement.dataset.p = s.place <= 3 ? s.place : '';
    }
    this.lapEl.textContent = Math.max(1, Math.min(this.race.laps, s.lap));
    this.timeEl.textContent = formatTime(Math.max(0, s.time));
    this.pingEl.textContent = s.ping != null ? `${Math.round(s.ping)} ms` : '';
    this.drawMap(s.dots);
    this.standT += dt;
    if (this.standT > 0.25) {
      this.standT = 0;
      const key = s.standings.map((r) => `${r.kid}${r.fin ? 'f' : ''}${r.con ? '' : 'x'}`).join(',');
      if (key !== this.lastStand) {
        this.lastStand = key;
        this.standEl.innerHTML = '';
        for (const r of s.standings) {
          const li = document.createElement('li');
          if (r.me) li.className = 'me';
          if (!r.con) li.classList.add('off');
          li.innerHTML = `<span class="pl">${r.place}</span><i style="background:${r.color}"></i><span class="nm"></span>${r.fin ? '<span class="fin">✓</span>' : ''}`;
          li.querySelector('.nm').textContent = r.name;
          this.standEl.appendChild(li);
        }
      }
    }
  }

  destroy() {
    this.root.classList.remove('spectating');
    this.root.innerHTML = '';
  }
}
