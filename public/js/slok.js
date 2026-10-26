// De slokkenkaart: moet jij drinken, dan zie je het groot op je eigen telefoon, met hoeveel en waarom.
// Elk tafelspel roept dit aan op het moment dat de uitslag in beeld komt:
//   Slok.drink(3, 'Je gooide het laagst')      drink 3 slokken
//   Slok.bak('De boer raadde het')              drink je glas in één keer leeg
//   Slok.give(4, 'Je kaart lag in de piramide')  deel 4 slokken uit
// Komt er nog iets bij terwijl de kaart open staat, dan telt hij het op. Weg met een tik, of na een tijdje vanzelf.
(() => {
  'use strict';
  if (window.Slok) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* niet ondersteund */ } };
  const KIND = {
    drink: { c: '#ff5a5f', kick: 'Jij drinkt', btn: 'Gedronken', buzz: [120, 60, 120], stay: 12000 },
    bak: { c: '#f7c548', kick: 'Jij drinkt', btn: 'Glas is leeg', buzz: [200, 80, 200, 80, 200], stay: 15000 },
    give: { c: '#2fbf71', kick: 'Jij mag uitdelen', btn: 'Oké', buzz: [60, 40, 60], stay: 8000 },
  };

  const CSS = `
.slok{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px;background:rgba(8,4,12,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent}
.slok[hidden]{display:none}
.slok .slok-card{position:relative;box-sizing:border-box;width:min(100%,340px);height:auto;aspect-ratio:auto;margin:0;font:16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;letter-spacing:normal;text-transform:none;padding:22px 20px 18px;border-radius:26px;text-align:center;color:#2b1531;background:#fff8e8;box-shadow:0 0 0 4px var(--k),0 24px 60px rgba(0,0,0,.5);animation:slokIn .38s cubic-bezier(.2,1.4,.4,1) both}
.slok .slok-kick{margin:0;font-size:13px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--k);filter:brightness(.8)}
.slok .slok-big{display:flex;align-items:center;justify-content:center;gap:10px;margin:8px 0 0}
.slok .slok-glass{width:64px;height:86px;flex:none}
.slok .slok-glass .slok-beer{transform-origin:50% 100%;animation:slokFill 1.1s .15s cubic-bezier(.3,.8,.3,1) both}
.slok .slok-n{font-size:96px;line-height:.9;font-weight:900;letter-spacing:-.04em;color:#2b1531;font-variant-numeric:tabular-nums}
.slok .slok-n.slok-word{font-size:64px;letter-spacing:0}
.slok .slok-n.slok-bump{animation:slokBump .4s ease}
.slok h2{margin:6px 0 2px;font-family:inherit;font-size:26px;line-height:1.1;font-weight:900;letter-spacing:-.01em;text-transform:none;color:#2b1531}
.slok .slok-why{margin:8px 0 0;padding:0;list-style:none;font-size:16px;line-height:1.35;color:#5a3a5e}
.slok .slok-why li+li{margin-top:4px}
.slok button{display:block;width:100%;min-height:52px;margin:18px 0 0;border:0;border-radius:16px;background:var(--k);color:#1a0d1d;font:inherit;font-size:18px;font-weight:900;cursor:pointer}
.slok button:focus-visible{outline:3px solid #2b1531;outline-offset:3px}
.slok .slok-fine{margin:10px 0 0;font-size:12.5px;color:#7a5f7e}
@keyframes slokIn{from{opacity:0;transform:scale(.7) translateY(20px)}}
@keyframes slokFill{from{transform:scaleY(0)}}
@keyframes slokBump{40%{transform:scale(1.25)}}
@media (prefers-reduced-motion:reduce){.slok .slok-card,.slok .slok-glass .slok-beer,.slok .slok-n.slok-bump{animation:none}}`;

  // een glas bier; bij een bak tot de rand vol
  const glass = (full) => `<svg class="slok-glass" viewBox="0 0 64 86" aria-hidden="true">
    <defs><clipPath id="slokCup"><path d="M8 10h48l-5 70H13z"/></clipPath><linearGradient id="slokBeer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd25a"/><stop offset="1" stop-color="#e89a12"/></linearGradient></defs>
    <g clip-path="url(#slokCup)"><g class="slok-beer"><rect x="0" y="${full ? 14 : 30}" width="64" height="70" fill="url(#slokBeer)"/>
      <path d="M0 ${full ? 16 : 32}q8-8 16 0t16 0 16 0 16 0v-10H0z" fill="#fffaf0"/></g></g>
    <path d="M8 10h48l-5 70H13z" fill="none" stroke="#2b1531" stroke-width="4" stroke-linejoin="round"/>
    ${full ? '<path d="M6 10q4-9 13-6 6-7 14-2 7-6 15 0 9-2 10 8" fill="#fffaf0" stroke="#2b1531" stroke-width="3" stroke-linejoin="round"/>' : ''}
  </svg>`;
  // twee pijlen naar buiten: uitdelen
  const hand = '<svg class="slok-glass" viewBox="0 0 64 86" aria-hidden="true"><path d="M8 10h48l-5 70H13z" fill="#fffaf0" stroke="#2b1531" stroke-width="4" stroke-linejoin="round"/><path d="M20 46h24M36 36l10 10-10 10" fill="none" stroke="#2fbf71" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let root = null, cur = null, timer = 0, queue = [];
  function mount() {
    if (root) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'slok';
    root.hidden = true;
    root.setAttribute('role', 'alertdialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'slokTitle');
    document.body.appendChild(root);
    root.addEventListener('click', (e) => { if (e.target === root || e.target.closest('button')) close(); });
    document.addEventListener('keydown', (e) => { if (cur && (e.key === 'Escape' || e.key === 'Enter')) { e.preventDefault(); e.stopPropagation(); close(); } }, true);
  }

  const sipsWord = (n) => n === 1 ? 'slok' : 'slokken';
  function draw(bump = false) {
    const k = KIND[cur.kind];
    const title = cur.title || (cur.kind === 'bak' ? 'Een bak!' : cur.kind === 'give' ? `Deel ${cur.n} ${sipsWord(cur.n)} uit` : `Drink ${cur.n} ${sipsWord(cur.n)}`);
    const big = cur.kind === 'bak' ? '<span class="slok-n slok-word">BAK</span>' : `<span class="slok-n${bump ? ' slok-bump' : ''}">${cur.n}</span>`;
    const sub = cur.kind === 'bak' ? 'Drink je glas in één keer leeg.' : '';
    root.style.setProperty('--k', k.c);
    root.innerHTML = `<div class="slok-card">
      <p class="slok-kick">${esc(cur.kick || k.kick)}</p>
      <div class="slok-big">${cur.kind === 'give' ? hand : glass(cur.kind === 'bak')}${big}</div>
      <h2 id="slokTitle">${esc(title)}</h2>
      ${cur.why.length || sub ? `<ul class="slok-why">${sub ? `<li>${sub}</li>` : ''}${cur.why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>` : ''}
      <button type="button">${esc(cur.btn || k.btn)}</button>
      ${cur.kind === 'give' ? '' : '<p class="slok-fine">Water, fris of karnemelk telt ook.</p>'}
    </div>`;
    if (bump && reduce) root.querySelector('.slok-n')?.classList.remove('slok-bump');
  }

  function open(item) {
    mount();
    // dezelfde soort staat al open (bijvoorbeeld twee keer slokken achter elkaar)? Dan erbij optellen.
    if (cur && cur.kind === item.kind && item.kind !== 'bak') {
      cur.n += item.n;
      if (item.why && !cur.why.includes(item.why)) cur.why = [...cur.why, item.why].slice(-3);
      draw(true);
    } else if (cur) { queue.push(item); return; } else {
      cur = { ...item, why: item.why ? [item.why] : [] };
      draw();
      root.hidden = false;
      const b = root.querySelector('button');
      if (b) b.focus({ preventScroll: true });
    }
    buzz(KIND[item.kind].buzz);
    clearTimeout(timer);
    timer = setTimeout(close, KIND[cur.kind].stay);
  }

  function close() {
    clearTimeout(timer);
    if (!root || !cur) return;
    cur = null;
    root.hidden = true;
    root.innerHTML = '';
    const next = queue.shift();
    if (next) setTimeout(() => open(next), 250);
  }

  function later(item, delay) {
    if (!(item.kind === 'bak' || item.n > 0)) return;
    if (delay > 0) setTimeout(() => open(item), delay); else open(item);
  }

  window.Slok = {
    drink(n, why = '', o = {}) { later({ kind: 'drink', n: Math.round(n), why, title: o.title, kick: o.kick, btn: o.btn }, o.delay || 0); },
    bak(why = '', o = {}) { later({ kind: 'bak', n: 1, why, title: o.title, kick: o.kick, btn: o.btn }, o.delay || 0); },
    give(n, why = '', o = {}) { later({ kind: 'give', n: Math.round(n), why, title: o.title, kick: o.kick, btn: o.btn }, o.delay || 0); },
    close() { queue = []; close(); },
    get open() { return !!cur; },
  };
})();
