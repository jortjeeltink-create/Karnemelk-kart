// De poort van Rondje, op elke speelpagina: de eerste keer vraagt hij of je 18 of ouder bent (er zitten drankspellen
// in), met een paar regels over verantwoord spelen en de voorwaarden. Daarna onthoudt deze telefoon het.
// Ook meldt hij de service worker aan, voor een nette pagina als je geen internet hebt (/sw.js).
(() => {
  'use strict';
  const KEY = 'rondje-18';
  const VERSION = '1';   // ophogen als de voorwaarden flink veranderen: dan vraagt hij het opnieuw

  if ('serviceWorker' in navigator && window.isSecureContext) {
    addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }

  let ok = false;
  try { ok = localStorage.getItem(KEY) === VERSION; } catch (e) { /* privémodus: dan vragen we het elke keer */ }
  if (ok) return;

  const css = `
.rpoort{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:20px 16px calc(20px + env(safe-area-inset-bottom,0px));
  background:rgba(14,8,18,.82);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);
  font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#2a1d2e;overflow-y:auto}
.rpoort *{box-sizing:border-box}
.rpoort .k{width:min(100%,420px);padding:22px 20px 18px;border-radius:24px;background:#f6f0de;
  box-shadow:0 24px 60px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.7)}
.rpoort .t{display:flex;align-items:center;gap:12px;margin:0 0 10px}
.rpoort .t b{display:grid;place-items:center;flex:none;width:52px;height:52px;border-radius:16px;background:#e5483b;color:#fff;
  font:900 20px/1 system-ui,sans-serif;letter-spacing:-.02em;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}
.rpoort h2{margin:0;font:800 23px/1.15 system-ui,sans-serif;letter-spacing:-.01em}
.rpoort p{margin:0 0 10px}
.rpoort ul{margin:0 0 12px;padding:0 0 0 20px}
.rpoort li{margin:4px 0}
.rpoort .s{font-size:13.5px;color:#5c4a60}
.rpoort a{color:#b8322a;font-weight:700}
.rpoort button{display:block;width:100%;min-height:50px;margin:8px 0 0;border:0;border-radius:16px;font:800 17px/1.2 system-ui,sans-serif;cursor:pointer}
.rpoort .ja{background:#2eaa57;color:#fff;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18)}
.rpoort .nee{background:transparent;color:#5c4a60;box-shadow:inset 0 0 0 2px rgba(92,74,96,.35)}
.rpoort button:focus-visible{outline:3px solid #f2c230;outline-offset:2px}
@media (prefers-color-scheme:dark){.rpoort .k{background:#241a28;color:#f3efdb}.rpoort .s{color:#c9bccb}.rpoort a{color:#ff8a7d}
  .rpoort .nee{color:#c9bccb;box-shadow:inset 0 0 0 2px rgba(201,188,203,.35)}}`;

  const welcome = `
    <div class="t"><b>18+</b><h2 id="rpoort-h">Welkom bij Rondje</h2></div>
    <p>Rondje is voor een avond met vrienden. Er zitten drankspellen in, daarom is Rondje alleen voor mensen van <strong>18 jaar en ouder</strong>.</p>
    <ul>
      <li>Een slok mag ook water, fris of karnemelk zijn.</li>
      <li>Drink nooit als je nog moet rijden.</li>
      <li>Niemand hoeft mee te drinken. Genoeg gehad? Stop gewoon.</li>
    </ul>
    <p class="s">Door verder te gaan ga je akkoord met de <a href="/voorwaarden">voorwaarden</a> en het <a href="/privacy">privacybeleid</a>. Kies een nette naam: anderen aan tafel zien hem.</p>
    <button class="ja" type="button" data-poort="ja">Ik ben 18 of ouder</button>
    <button class="nee" type="button" data-poort="nee">Ik ben jonger dan 18</button>`;
  const tooYoung = `
    <div class="t"><b>18+</b><h2 id="rpoort-h">Nog even wachten</h2></div>
    <p>Rondje is alleen voor mensen van 18 jaar en ouder. Kom terug als je 18 bent!</p>
    <p class="s">Meer weten over alcohol en jongeren? Kijk op <a href="https://www.alcoholinfo.nl" rel="noopener">alcoholinfo.nl</a>.</p>
    <button class="nee" type="button" data-poort="terug">Toch 18 of ouder? Terug</button>`;

  function show() {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    const box = document.createElement('div');
    box.className = 'rpoort';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-labelledby', 'rpoort-h');
    const card = document.createElement('div');
    card.className = 'k';
    card.innerHTML = welcome;
    box.appendChild(card);
    document.body.appendChild(box);
    // de pagina erachter niet laten scrollen of tikken
    const was = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const focus = () => { const b = card.querySelector('button'); if (b) b.focus({ preventScroll: true }); };
    focus();
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-poort]');
      if (!b) return;
      const what = b.dataset.poort;
      if (what === 'ja') {
        try { localStorage.setItem(KEY, VERSION); } catch (err) { /* privémodus */ }
        box.remove();
        style.remove();
        document.documentElement.style.overflow = was;
      } else {
        card.innerHTML = what === 'nee' ? tooYoung : welcome;
        focus();
      }
    });
  }

  if (document.body) show(); else addEventListener('DOMContentLoaded', show);
})();
