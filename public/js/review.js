// Na een potje vraagt De Spelkeet heel kort om een review: sterren, wat ging goed en wat ging fout (die twee mogen leeg).
// Elk spel meldt zijn stand met SpelkeetReview.stand(spel, fase, eind):
//   fase  de fase van het spel ('lobby' = nog niet of niet meer aan het spelen, null = van tafel gegaan)
//   eind  0 = gewoon, 1 = er is net een ronde klaar, 2 = het hele spel is net klaar
// Niet te vaak: pas na een tijdje echt spelen, hooguit één keer per dag, niet meteen weer na "Nu niet", en per spel
// niet meer als je dat spel al een review gaf.
(() => {
  'use strict';
  const KEY = 'spelkeet-review';
  const MIN = 60e3, HOUR = 3600e3, DAY = 24 * HOUR;
  const WAIT = { 1: 6 * MIN, 2: 2 * MIN, weg: 4 * MIN };   // zo lang moet je eerst gespeeld hebben
  const NAMES = { kart: 'Karnemelk Kart', bussen: 'Bussen', boer: 'Boer zoekt vrouw', mexen: 'Mexen', dealer: 'Pak de dealer', paardenrace: 'Paardenrace', rotonde: 'Rotonde', mijnenveld: 'Mijnenveld', borrelbord: 'het Borrelbord', toepen: 'Toepen', bom: 'Tikkende Bom', alibi: 'Alibi', bakplaten: 'Bakplaten', kingsen: 'Kingsen', happo: 'Happo' };
  const R = window.SpelkeetReview = { klok: () => Date.now(), stand, open };
  const now = () => R.klok();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const save = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* geen opslag: dan vragen we deze keer niet nog eens */ } };

  let since = 0, lastEind = 0, asked = false;

  function mag(spel) {
    if (asked) return false;
    const s = load(), t = now();
    if (s.laatst && t - s.laatst < 20 * HOUR) return false;                          // hooguit één keer per dag
    if (s.nee && t - s.nee < 3 * DAY) return false;                                   // net "Nu niet" gezegd
    if (s.gedaan && s.gedaan[spel] && t - s.gedaan[spel] < 45 * DAY) return false;    // dit spel al beoordeeld
    return true;
  }

  // geeft true als de vraag eraan komt
  function stand(spel, fase, eind) {
    const t = now(), bezig = !!fase && fase !== 'lobby';
    if (bezig && !since) since = t;
    const played = since ? t - since : 0;
    let moment = false;
    if (eind && !lastEind && played >= WAIT[eind === 2 ? 2 : 1]) moment = true;    // net klaar met een ronde of het spel
    if (!bezig && since && played >= WAIT.weg) moment = true;                        // na een tijdje spelen terug naar de lobby of van tafel
    if (!bezig) since = 0;
    lastEind = eind || 0;
    if (!moment || !NAMES[spel] || !mag(spel)) return false;
    asked = true;
    setTimeout(() => open(spel), eind ? 2500 : 600);   // eerst even de uitslag laten zien
    return true;
  }

  const CSS = `
#srv{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;padding:12px 12px calc(12px + env(safe-area-inset-bottom,0px));font:16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f3efdb}
#srv .srv-back{position:absolute;inset:0;background:rgba(8,4,10,.6)}
#srv .srv-card{outline:0;position:relative;width:min(100%,440px);max-height:calc(100% - 12px);overflow:auto;padding:22px 18px 16px;border-radius:24px;background:#241229;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14),0 20px 60px rgba(0,0,0,.55);animation:srv-in .25s ease-out}
@keyframes srv-in{from{transform:translateY(30px);opacity:0}}
@media (prefers-reduced-motion:reduce){#srv .srv-card{animation:none}}
#srv h2{margin:0 36px 4px 0;font-size:22px;line-height:1.2;color:#fff}
#srv .srv-sub{margin:0 0 14px;color:#cfc4d2;font-size:15px}
#srv .srv-x{position:absolute;top:10px;right:10px;width:44px;height:44px;border:0;border-radius:50%;background:transparent;color:#cfc4d2;font-size:20px;cursor:pointer}
#srv .srv-stars{display:flex;gap:8px}
#srv .srv-stars button{flex:1;min-height:56px;padding:0;border:0;border-radius:16px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);color:#6d5a72;font-size:32px;line-height:1;cursor:pointer}
#srv .srv-stars button.on{background:rgba(242,194,48,.16);box-shadow:inset 0 0 0 2px #f2c230;color:#f2c230}
#srv .srv-more{display:grid;gap:12px;margin-top:14px}
#srv .srv-more[hidden]{display:none}
#srv label{display:grid;gap:6px;font-weight:700;font-size:15px}
#srv label small{font-weight:400;color:#cfc4d2}
#srv textarea{width:100%;min-height:64px;padding:10px 12px;border:0;border-radius:14px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);color:#f3efdb;font:16px/1.4 system-ui,sans-serif;resize:vertical;box-sizing:border-box}
#srv textarea:focus,#srv button:focus-visible{outline:3px solid #f2c230;outline-offset:1px}
#srv .srv-go{min-height:52px;border:0;border-radius:16px;background:#2fbf71;color:#fff;font:800 17px/1 system-ui,sans-serif;box-shadow:inset 0 -4px 0 rgba(0,0,0,.18);cursor:pointer}
#srv .srv-go:disabled{opacity:.6}
#srv .srv-later{display:block;width:100%;min-height:44px;margin-top:8px;border:0;background:transparent;color:#cfc4d2;font:700 15px system-ui,sans-serif;cursor:pointer}
#srv .srv-msg{margin:0;padding:10px 12px;border-radius:12px;font-weight:700;background:rgba(229,72,59,.18);box-shadow:inset 0 0 0 1px rgba(229,72,59,.6)}
#srv .srv-dank{margin:6px 0 4px;text-align:center;font-size:20px;font-weight:800;color:#fff}`;

  function open(spel) {
    if (document.getElementById('srv')) return;
    const s = load(); s.laatst = now(); save(s);
    if (!document.getElementById('srv-css')) {
      const st = document.createElement('style'); st.id = 'srv-css'; st.textContent = CSS; document.head.appendChild(st);
    }
    const back = document.activeElement;
    const box = document.createElement('div');
    box.id = 'srv';
    box.innerHTML = `<div class="srv-back"></div>
      <div class="srv-card" role="dialog" aria-modal="true" aria-labelledby="srv-t" tabindex="-1">
        <button type="button" class="srv-x" aria-label="Sluiten">✕</button>
        <h2 id="srv-t">Hoe vond je ${NAMES[spel]}?</h2>
        <p class="srv-sub">Tik op de sterren. Duurt tien seconden.</p>
        <div class="srv-stars" role="radiogroup" aria-label="Sterren">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" aria-label="${n} ${n === 1 ? 'ster' : 'sterren'}" data-n="${n}">★</button>`).join('')}</div>
        <div class="srv-more" hidden>
          <label>Wat ging goed? <small>(mag leeg)</small><textarea class="srv-goed" maxlength="500" rows="2" placeholder="Bijvoorbeeld: snel uitgelegd, veel gelachen"></textarea></label>
          <label>Wat ging fout? <small>(mag leeg)</small><textarea class="srv-fout" maxlength="500" rows="2" placeholder="Bijvoorbeeld: mijn scherm bleef hangen"></textarea></label>
          <p class="srv-msg" role="status" hidden></p>
          <button type="button" class="srv-go">Versturen</button>
        </div>
        <button type="button" class="srv-later">Nu niet</button>
      </div>`;
    const $ = (c) => box.querySelector(c);
    let sterren = 0;
    const stars = [...box.querySelectorAll('.srv-stars button')];
    const close = () => { box.remove(); document.removeEventListener('keydown', esc, true); if (back && back.focus) try { back.focus(); } catch (e) { /* niet erg */ } };
    const nee = () => { const o = load(); o.nee = now(); save(o); close(); };
    const esc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); nee(); } };
    stars.forEach((b) => b.addEventListener('click', () => {
      sterren = +b.dataset.n;
      stars.forEach((x) => { x.classList.toggle('on', +x.dataset.n <= sterren); x.setAttribute('aria-checked', String(x === b)); });
      $('.srv-more').hidden = false;
    }));
    $('.srv-x').addEventListener('click', nee);
    $('.srv-later').addEventListener('click', nee);
    $('.srv-back').addEventListener('click', nee);
    $('.srv-go').addEventListener('click', async () => {
      const go = $('.srv-go'), msg = $('.srv-msg');
      go.disabled = true; msg.hidden = true;
      try {
        const r = await fetch('/api/review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sterren, spel, goed: $('.srv-goed').value.trim(), fout: $('.srv-fout').value.trim(), bron: 'na-spel' }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.msg || 'Versturen lukte niet. Probeer het later nog eens.');
        const o = load(); o.gedaan = { ...(o.gedaan || {}), [spel]: now() }; save(o);
        $('.srv-card').innerHTML = '<p class="srv-dank" role="status">Dankjewel! 🙌</p>';
        setTimeout(close, 1400);
      } catch (e) {
        msg.textContent = e.message || 'Versturen lukte niet. Probeer het later nog eens.'; msg.hidden = false; go.disabled = false;
      }
    });
    // typen in het venster stuurt het spel niet aan (zoals de kart of sneltoetsen)
    for (const ev of ['keydown', 'keyup', 'keypress']) box.addEventListener(ev, (e) => e.stopPropagation());
    document.addEventListener('keydown', esc, true);
    document.body.appendChild(box);
    try { $('.srv-card').focus({ preventScroll: true }); } catch (e) { /* niet erg */ }
  }
})();
