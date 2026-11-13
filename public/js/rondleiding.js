// De rondleiding op de hoofdpagina: de eerste keer dat iemand De Spelkeet opent, laten we in een paar stappen zien hoe
// het werkt. Elke stap licht een stuk van de pagina op met een kaartje erbij. Overslaan kan altijd (ook met Esc), en
// via het menu start je hem opnieuw (Rondleiding.start()).
(() => {
  'use strict';
  if (window.Rondleiding) return;
  const KEY = 'spelkeet-rondleiding';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // el: wat er oplicht (het eerste dat zichtbaar is); probeer: je mag het zelf uitproberen
  const STAPPEN = [
    { t: 'Welkom bij De Spelkeet!', p: 'Partyspellen voor een avond met vrienden. Zal ik je in een halve minuut laten zien hoe het werkt?', ja: 'Laat maar zien', nee: 'Nee, ik kijk zelf rond' },
    { el: '#tabs', t: 'Kies hoe jullie spelen', p: '<b>Ieder z\'n telefoon</b>: iedereen speelt op zijn eigen telefoon mee. <b>Eén telefoon</b>: de telefoon gaat rond of ligt op tafel.' },
    { el: '.game .prev', t: 'Elk spel een eigen kaart', p: 'Met een voorproefje en waar het om draait. Scroll naar beneden voor alle spellen, of tik onderin op een bolletje om meteen naar een spel te springen.' },
    { el: '.game .howbtn', t: 'Nieuw met een spel?', p: 'Tik op <b>Hoe werkt het?</b> voor een korte uitleg met plaatjes uit het echte spel.', probeer: 'Probeer het' },
    { el: '.game .cta', t: 'Spelen', p: 'Tik op de knop en maak een tafel. Je krijgt een code van vier letters; je vrienden doen mee met die code of met de link die je deelt. Geen account nodig.' },
    { el: '#menuBtn', t: 'Het menu', p: 'Hier vind je alle spellen, deel je De Spelkeet met vrienden, geef je een beoordeling of feedback, en start je deze rondleiding opnieuw.', ja: 'Aan de slag!' },
  ];

  const CSS = `
.rl{position:fixed;inset:0;z-index:2147481000;pointer-events:none;font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.rl-gat{position:fixed;border-radius:18px;box-shadow:0 0 0 3px #f7c548,0 0 0 9999px rgba(10,5,12,.74);transition:${reduce ? 'none' : 'left .35s cubic-bezier(.3,.7,.2,1),top .35s cubic-bezier(.3,.7,.2,1),width .35s cubic-bezier(.3,.7,.2,1),height .35s cubic-bezier(.3,.7,.2,1)'}}
.rl-gat.leeg{left:50%!important;top:50%!important;width:0!important;height:0!important;box-shadow:0 0 0 9999px rgba(10,5,12,.74)}
.rl-blok{position:fixed;inset:0;pointer-events:auto}
.rl-kaart{position:fixed;left:50%;width:min(360px,calc(100vw - 28px));transform:translateX(-50%);padding:18px 18px 14px;border-radius:22px;background:#f3efdb;color:#2b1531;box-shadow:0 24px 60px rgba(0,0,0,.55);pointer-events:auto;animation:${reduce ? 'none' : 'rlIn .3s cubic-bezier(.2,.8,.2,1)'}}
@keyframes rlIn{from{opacity:0;transform:translate(-50%,10px)}}
.rl-kaart .rl-k{margin:0 0 4px;font:700 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.14em;text-transform:uppercase;color:#6a4570}
.rl-kaart h2{margin:0 0 6px;font:900 26px/1.05 "Sofia Sans Extra Condensed","Arial Narrow",sans-serif}
.rl-kaart p{margin:0 0 14px;font-size:15.5px}
.rl-knoppen{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.rl-knoppen button{min-height:46px;padding:0 16px;border:0;border-radius:14px;font:800 15px/1 system-ui,sans-serif;cursor:pointer}
.rl-ja{margin-left:auto;background:#2b1531;color:#f3efdb}
.rl-probeer{background:#d690c9;color:#2b1531}
.rl-nee{margin-right:auto;background:transparent;color:#6a4570;padding:0 4px!important;text-decoration:underline;text-underline-offset:3px}
.rl button:focus-visible{outline:3px solid #b866a8;outline-offset:2px}`;

  let root = null, stap = 0, doel = null, loop = 0, wachten = 0;
  const gezien = () => { try { return !!localStorage.getItem(KEY); } catch (e) { return true; } };
  const klaar = (hoe) => { try { localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), hoe })); } catch (e) { /* privémodus */ } };
  // het eerste element dat echt in beeld kan komen
  const vind = (sel) => [...document.querySelectorAll(sel)].find((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) || null;

  function mount() {
    if (root) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'rl';
    root.setAttribute('data-lenis-prevent', '');
    root.innerHTML = '<div class="rl-blok"></div><div class="rl-gat leeg"></div><div class="rl-kaart" role="dialog" aria-modal="true" aria-labelledby="rlT"></div>';
    document.body.appendChild(root);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.classList.contains('rl-nee')) stop('overgeslagen');
      else if (b.classList.contains('rl-probeer')) probeer();
      else if (b.classList.contains('rl-ja')) (stap >= STAPPEN.length - 1 ? stop('klaar') : toon(stap + 1));
    });
  }

  // het kaartje boven of onder het opgelichte stuk, waar de meeste ruimte is
  function plaats() {
    if (!root) return;
    const gat = root.querySelector('.rl-gat'), kaart = root.querySelector('.rl-kaart');
    if (!doel) { gat.classList.add('leeg'); kaart.style.top = `${Math.max(16, (innerHeight - kaart.offsetHeight) / 2)}px`; return; }
    const r = doel.getBoundingClientRect(), m = 8;
    gat.classList.remove('leeg');
    Object.assign(gat.style, { left: `${r.left - m}px`, top: `${r.top - m}px`, width: `${r.width + 2 * m}px`, height: `${r.height + 2 * m}px` });
    const h = kaart.offsetHeight, onder = innerHeight - r.bottom - m, boven = r.top - m;
    const top = onder >= h + 24 || onder >= boven ? Math.min(r.bottom + m + 14, innerHeight - h - 12) : Math.max(12, r.top - m - 14 - h);
    kaart.style.top = `${Math.max(12, top)}px`;
  }

  function toon(i) {
    stap = i;
    const s = STAPPEN[i];
    doel = s.el ? vind(s.el) : null;
    if (s.el && !doel) { if (i < STAPPEN.length - 1) toon(i + 1); else stop('klaar'); return; }
    if (doel && doel.offsetParent !== null) {
      // naar het stuk toe scrollen (niet bij iets dat vast in beeld staat, zoals de menuknop) (via Lenis als die er is, anders gewoon)
      if (window.spelkeetNaar) window.spelkeetNaar(doel); else doel.scrollIntoView({ block: 'center' });
    }
    const kaart = root.querySelector('.rl-kaart');
    kaart.innerHTML = `<p class="rl-k">${i ? `Rondleiding · ${i} van ${STAPPEN.length - 1}` : 'Rondleiding'}</p><h2 id="rlT">${s.t}</h2><p>${s.p}</p>
      <div class="rl-knoppen">${i < STAPPEN.length - 1 ? `<button type="button" class="rl-nee">${s.nee || 'Overslaan'}</button>` : ''}${s.probeer ? `<button type="button" class="rl-probeer">${s.probeer}</button>` : ''}<button type="button" class="rl-ja">${s.ja || 'Volgende'}</button></div>`;
    kaart.style.animation = 'none'; void kaart.offsetWidth; kaart.style.animation = '';
    plaats();
    try { kaart.querySelector('.rl-ja').focus({ preventScroll: true }); } catch (e) { /* niet erg */ }
  }

  // zelf proberen: de rondleiding gaat even weg, en komt terug als de uitleg dicht is
  function probeer() {
    const el = doel;
    root.hidden = true;
    if (el) el.click();
    clearInterval(wachten);
    wachten = setInterval(() => {
      const u = document.querySelector('.uitleg');
      if (u && !u.hidden) return;
      clearInterval(wachten);
      root.hidden = false;
      toon(stap + 1);
    }, 400);
  }

  function start() {
    if (root && !root.hidden && root.isConnected) return;
    mount();
    root.hidden = false;
    toon(0);
    cancelAnimationFrame(loop);
    const tick = () => { if (!root) return; if (!root.hidden) plaats(); loop = requestAnimationFrame(tick); };
    loop = requestAnimationFrame(tick);
    addEventListener('keydown', esc, true);
  }

  function stop(hoe) {
    klaar(hoe);
    clearInterval(wachten);
    cancelAnimationFrame(loop);
    removeEventListener('keydown', esc, true);
    if (root) { root.remove(); root = null; }
    doel = null;
  }
  function esc(e) { if (e.key === 'Escape' && root && !root.hidden) { e.stopPropagation(); stop('overgeslagen'); } }

  window.Rondleiding = { start, stop, gezien };
  // De eerste keer vanzelf, als de pagina klaar is (niet als je via een link naar een bepaald spel springt)
  addEventListener('load', () => { if (!gezien() && !location.hash) setTimeout(() => { if (!gezien()) start(); }, 900); });
})();
