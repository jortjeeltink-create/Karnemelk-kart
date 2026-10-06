// Besturing: aanraakknoppen, schuifbalk, kantelen en toetsenbord.
import { clamp } from '../shared/util.js';

const ARROW = (dir) => `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="${dir < 0 ? 'M27 7 L11 20 L27 33 Z' : 'M13 7 L29 20 L13 33 Z'}" fill="currentColor" stroke="currentColor" stroke-linejoin="round" stroke-width="4"/></svg>`;

export class Controls {
  constructor(settings, sound) {
    this.settings = settings;
    this.sound = sound;
    this.keys = new Set();
    this.touch = { steer: 0, gas: false, brake: false, drift: false, item: false };
    this.steer = 0;
    this.tilt = 0;
    this.tiltZero = null;
    this.el = null;
    this.enabled = false;
    this.onKey = (e) => this.key(e, true);
    this.offKey = (e) => this.key(e, false);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.offKey);
    window.addEventListener('blur', () => { this.keys.clear(); this.releaseAll(); });
    this.motion = (e) => this.onMotion(e);
  }

  key(e, down) {
    if (!this.enabled) return;
    const k = e.key.toLowerCase();
    if (k === 'h') { if (down && !e.repeat && this.onHorn) this.onHorn(); e.preventDefault(); return; }
    const map = {
      arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'gas', w: 'gas',
      arrowdown: 'brake', s: 'brake', ' ': 'drift', shift: 'drift', e: 'item', enter: 'item', x: 'item', k: 'item',
    };
    const act = map[k];
    if (!act) return;
    e.preventDefault();
    if (down) this.keys.add(act); else this.keys.delete(act);
  }

  // bouw de knoppen in het gegeven element
  mount(container) {
    this.unmount();
    const s = this.settings;
    const el = document.createElement('div');
    el.className = `tc mode-${s.controls}${s.lefty ? ' lefty' : ''}${s.autoGas ? ' autogas' : ''}`;
    el.innerHTML = `
      <div class="tc-steer" aria-label="Sturen">
        <div class="tc-btn tc-left">${ARROW(-1)}</div>
        <div class="tc-btn tc-right">${ARROW(1)}</div>
      </div>
      <div class="tc-slider" aria-label="Stuurschuif"><div class="tc-track"></div><div class="tc-knob"></div></div>
      <div class="tc-tilthint">Kantel je telefoon om te sturen</div>
      <div class="tc-btn tc-horn" aria-label="Toeteren">TOET</div>
      <div class="tc-actions">
        <div class="tc-btn tc-item" aria-label="Item gebruiken"><span class="tc-item-icon"></span></div>
        <div class="tc-btn tc-brake">REM</div>
        <div class="tc-btn tc-drift">DRIFT</div>
        <div class="tc-btn tc-gas">GAS</div>
      </div>`;
    container.appendChild(el);
    this.el = el;
    this.bindHold(el.querySelector('.tc-drift'), 'drift');
    this.bindHold(el.querySelector('.tc-brake'), 'brake');
    this.bindHold(el.querySelector('.tc-gas'), 'gas');
    this.bindHold(el.querySelector('.tc-item'), 'item');
    this.bindSteerButtons(el.querySelector('.tc-steer'));
    el.querySelector('.tc-horn').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.sound) this.sound.unlock();
      if (this.onHorn) this.onHorn();
    });
    this.bindSlider(el.querySelector('.tc-slider'));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    if (s.controls === 'kantelen') this.startTilt();
    this.enabled = true;
  }

  unmount() {
    if (this.el) this.el.remove();
    this.el = null;
    this.enabled = false;
    this.releaseAll();
    window.removeEventListener('devicemotion', this.motion);
  }

  releaseAll() {
    Object.assign(this.touch, { steer: 0, gas: false, brake: false, drift: false, item: false });
    if (this.el) this.el.querySelectorAll('.down').forEach((b) => b.classList.remove('down'));
  }

  vibrate(ms) {
    if (this.settings.vibrate && navigator.vibrate) { try { navigator.vibrate(ms); } catch { /* niet ondersteund */ } }
  }

  bindHold(btn, act) {
    const down = (e) => {
      e.preventDefault();
      if (this.sound) this.sound.unlock();
      btn.setPointerCapture?.(e.pointerId);
      this.touch[act] = true;
      btn.classList.add('down');
      if (act === 'drift' || act === 'item') this.vibrate(10);
    };
    const up = (e) => {
      e.preventDefault();
      this.touch[act] = false;
      btn.classList.remove('down');
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  }

  bindSteerButtons(zone) {
    const left = zone.querySelector('.tc-left'), right = zone.querySelector('.tc-right');
    const active = new Map();
    const apply = () => {
      let v = 0;
      for (const x of active.values()) v += x;
      this.touch.steer = clamp(v, -1, 1);
      left.classList.toggle('down', this.touch.steer < 0);
      right.classList.toggle('down', this.touch.steer > 0);
    };
    const pos = (e) => {
      const r = zone.getBoundingClientRect();
      return e.clientX < r.left + r.width / 2 ? -1 : 1;
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.sound) this.sound.unlock();
      zone.setPointerCapture?.(e.pointerId);
      active.set(e.pointerId, pos(e));
      apply();
    });
    zone.addEventListener('pointermove', (e) => {
      if (!active.has(e.pointerId)) return;
      active.set(e.pointerId, pos(e)); // je duim kan van links naar rechts glijden
      apply();
    });
    const end = (e) => { active.delete(e.pointerId); apply(); };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }

  bindSlider(zone) {
    const knob = zone.querySelector('.tc-knob');
    let id = null, x0 = 0;
    const set = (v) => {
      this.touch.steer = v;
      knob.style.transform = `translateX(${v * 60}px)`;
    };
    zone.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (this.sound) this.sound.unlock();
      zone.setPointerCapture?.(e.pointerId);
      id = e.pointerId;
      const r = zone.getBoundingClientRect();
      x0 = r.left + r.width / 2;
      set(clamp((e.clientX - x0) / 60, -1, 1));
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      set(clamp((e.clientX - x0) / 60, -1, 1));
    });
    const end = (e) => { if (e.pointerId === id) { id = null; set(0); } };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
    zone.addEventListener('lostpointercapture', end);
  }

  // iOS vraagt toestemming voor bewegingssensoren (moet vanuit een tik)
  static async requestTilt() {
    const DM = window.DeviceMotionEvent;
    if (DM && typeof DM.requestPermission === 'function') {
      try { return (await DM.requestPermission()) === 'granted'; } catch { return false; }
    }
    return !!DM;
  }

  startTilt() {
    this.tiltZero = null;
    window.addEventListener('devicemotion', this.motion);
  }

  recalibrate() { this.tiltZero = null; }

  onMotion(e) {
    const g = e.accelerationIncludingGravity;
    if (!g || g.x == null) return;
    const angle = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
    let t;
    if (angle === 90) t = g.y; else if (angle === -90 || angle === 270) t = -g.y; else if (angle === 180) t = -g.x; else t = g.x;
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) t = -t;
    if (this.settings.tiltInvert) t = -t;
    if (this.tiltZero == null) this.tiltZero = t;
    this.tilt = clamp((t - this.tiltZero) / 4, -1, 1);
  }

  setItemIcon(html) {
    if (!this.el) return;
    const i = this.el.querySelector('.tc-item-icon');
    if (i.dataset.v !== html) { i.innerHTML = html; i.dataset.v = html; }
    this.el.querySelector('.tc-item').classList.toggle('has', !!html);
  }

  // invoer van dit moment
  sample(dt) {
    const k = this.keys;
    let target = this.touch.steer;
    if (this.settings.controls === 'kantelen' && this.el) target = Math.abs(this.tilt) < 0.08 ? 0 : this.tilt;
    if (k.has('left')) target = -1;
    if (k.has('right')) target = 1;
    if (k.has('left') && k.has('right')) target = 0;
    // digitale knoppen een fractie verzachten
    const digital = this.settings.controls === 'knoppen' || k.has('left') || k.has('right');
    if (digital) {
      const rate = 9 * dt;
      this.steer += clamp(target - this.steer, -rate, rate);
      if (target === 0 && Math.abs(this.steer) < 0.2) this.steer = 0;
    } else this.steer = target;
    const gas = this.settings.autoGas ? !(this.touch.brake || k.has('brake')) : (this.touch.gas || k.has('gas'));
    return {
      steer: this.steer,
      gas: gas || k.has('gas'),
      brake: this.touch.brake || k.has('brake'),
      drift: this.touch.drift || k.has('drift'),
      item: this.touch.item || k.has('item'),
    };
  }
}
