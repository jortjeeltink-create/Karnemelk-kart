// Het rad: iedereen ziet het tegelijk draaien (de server bepaalt start, duur en uitkomst)
// en het stopt op wie er ook een atje karnemelk moet doen.
import { h } from './dom.js';

const COLORS = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#ff7eb6', '#3dd6d0', '#ff924c', '#52a675', '#4267ac'];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Wheel {
  // pick: { names:[{id,name}], target, spinAt, spinMs, jitter, winnerName, byChance }
  constructor(app, pick, challengeText) {
    this.app = app;
    this.pick = pick;
    this.key = `${pick.spinAt}:${pick.target}`;
    const n = pick.names.length;
    this.seg = 360 / n;
    const idx = Math.max(0, pick.names.findIndex((x) => x.id === pick.target));
    // met de klok mee draaien tot het gekozen vakje precies onder de pijl staat
    const a = (idx + 0.5 + (pick.jitter || 0)) * this.seg;
    this.total = 360 * 6 + (360 - a);
    this.lastSeg = -1;
    this.done = false;
    const target = pick.names[idx];
    this.targetName = target ? target.name : '?';
    const isDefault = /karnemelk/i.test(challengeText || '') || !challengeText;
    this.resultText = isDefault ? `${this.targetName} moet óók een atje karnemelk! 🥛` : `${this.targetName} moet ook: ${challengeText}`;

    // het rad als SVG
    const R = 140, C = 150;
    let paths = '';
    pick.names.forEach((p, i) => {
      const a0 = (i * this.seg) * Math.PI / 180, a1 = ((i + 1) * this.seg) * Math.PI / 180;
      const x0 = C + R * Math.sin(a0), y0 = C - R * Math.cos(a0);
      const x1 = C + R * Math.sin(a1), y1 = C - R * Math.cos(a1);
      const large = this.seg > 180 ? 1 : 0;
      const col = COLORS[i % COLORS.length];
      paths += n === 1
        ? `<circle cx="${C}" cy="${C}" r="${R}" fill="${col}"/>`
        : `<path d="M${C} ${C} L${x0.toFixed(1)} ${y0.toFixed(1)} A${R} ${R} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z" fill="${col}" stroke="#fff" stroke-width="3"/>`;
      const mid = (i + 0.5) * this.seg;
      const label = p.name.length > 14 ? p.name.slice(0, 13) + '…' : p.name;
      const fs = n > 8 ? 13 : n > 5 ? 15 : 18;
      paths += `<g transform="rotate(${mid.toFixed(1)} ${C} ${C})"><text x="${C}" y="${C - R * 0.56}" text-anchor="middle" dominant-baseline="middle" transform="rotate(-90 ${C} ${C - R * 0.56})" font-size="${fs}" font-weight="900" fill="#fff" stroke="rgba(0,0,0,.35)" stroke-width="3" paint-order="stroke" font-family="system-ui, sans-serif">${esc(label)}</text></g>`;
    });
    const svg = `<svg viewBox="0 0 300 300" class="wheel-svg"><g class="wheel-rot">${paths}<circle cx="${C}" cy="${C}" r="22" fill="#fff" stroke="#2b1a4a" stroke-width="4"/><text x="${C}" y="${C + 1}" text-anchor="middle" dominant-baseline="middle" font-size="20">🥛</text></g></svg>`;

    this.result = h('div', { class: 'wheel-result' });
    this.sub = h('p', { class: 'wheel-sub' }, 'Wie moet er óók een atje karnemelk?');
    this.closeBtn = h('button', { class: 'btn btn-primary hidden', onclick: () => this.destroy() }, 'Oké!');
    this.el = h('div', { class: 'wheel-overlay', role: 'dialog', 'aria-modal': 'true' },
      h('div', { class: 'card wheel-card' },
        h('h2', {}, 'Het rad draait!'),
        this.sub,
        h('div', { class: 'wheel-wrap' }, h('div', { class: 'wheel-pointer', 'aria-hidden': 'true' }), h('div', { class: 'wheel-holder', html: svg })),
        this.result,
        this.closeBtn));
    document.body.appendChild(this.el);
    this.rot = this.el.querySelector('.wheel-rot');
    this.rot.style.transformOrigin = '150px 150px';
    this.loop = () => this.frame();
    this.raf = requestAnimationFrame(this.loop);
  }

  angleAt(now) {
    const p = Math.max(0, Math.min(1, (now - this.pick.spinAt) / this.pick.spinMs));
    const e = 1 - Math.pow(1 - p, 4); // snel beginnen, langzaam uitlopen
    return { angle: this.total * e, p };
  }

  frame() {
    if (!this.el) return;
    const now = this.app.net.serverNow();
    const { angle, p } = this.angleAt(now);
    this.rot.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    // tikje bij elk vakje dat langs de pijl komt
    const under = Math.floor((((360 - (angle % 360)) % 360) / this.seg));
    if (p > 0 && p < 1 && under !== this.lastSeg) {
      this.lastSeg = under;
      this.app.sound.play('roll', 0.9);
    }
    if (p >= 1 && !this.done) this.finish();
    if (!this.done) this.raf = requestAnimationFrame(this.loop);
  }

  finish() {
    this.done = true;
    const me = this.app.room && this.app.room.you;
    this.result.textContent = this.pick.target === me ? this.resultText.replace(this.targetName + ' moet', 'Jij moet') : this.resultText;
    this.result.classList.add('show');
    if (this.pick.target === me) this.result.classList.add('me');
    this.sub.textContent = this.pick.byChance
      ? `${this.pick.winnerName} koos niet op tijd, dus het rad besliste zelf.`
      : `Winnaar ${this.pick.winnerName} koos ${this.targetName}!`;
    this.closeBtn.classList.remove('hidden');
    this.app.sound.play('finish', 0.8);
    setTimeout(() => this.app.sound.play('cheer', 0.6), 300);
    this.app.controls.vibrate([40, 40, 80]);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    if (this.el) this.el.remove();
    this.el = null;
    if (this.app.wheel === this) this.app.wheel = null;
  }
}
