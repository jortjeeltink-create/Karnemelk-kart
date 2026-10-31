// De uitleg bij elk spel: een diashow met plaatjes uit het echte spel en korte teksten.
// Open met Uitleg.open('mexen'), of met een knop die data-uitleg="mexen" heeft.
// De plaatjes staan in /img/uitleg/ (gemaakt met een script dat het spel echt speelt).
(() => {
  'use strict';
  if (window.Uitleg) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const IMG = (k) => `/img/uitleg/${k}.webp`;

  const TAFEL = (min, max, extra = '') => `Eén iemand maakt een tafel en deelt de code van vier letters, of de link via Uitnodigen. De rest doet mee met die code, ieder op zijn eigen telefoon. Met ${min} tot ${max} spelers.${extra}`;

  const GAMES = {
    mexen: { name: 'Mexen', c: '#36c5d6', url: '/mexen', slides: [
      { img: 'mexen-1', t: 'Aan tafel', p: TAFEL(2, 10, ' De host kiest de inzet: <b>1, 2 of 3 slokken</b>.') },
      { img: 'mexen-2', t: 'Gooien', p: 'Tik op <b>Gooi</b>. Daarna mag je nog eens gooien of blijven staan, maar je laatste worp telt. De eerste van de ronde gooit hooguit 3 keer; zo vaak als hij gooit, mag de rest ook.' },
      { img: 'mexen-3', t: 'Wat telt', p: 'De hoogste steen eerst: een 6 en een 4 is 64. Dubbels zijn honderden: twee vijven is 500. Het hoogst is <b>Mex</b>, een 2 en een 1. Het laagst is 31.' },
      { img: 'mexen-4', t: 'Drinken', p: 'Wie het laagst gooit, drinkt de inzet. <b>Elke Mex verdubbelt</b>: inzet 1 met één Mex is 2 slokken, met twee Mexen 4. Meer dan <b>6</b> wordt het nooit. Moet jij drinken, dan zie je groot op je telefoon hoeveel.' },
      { img: 'mexen-5', t: 'Gelijk en de volgende ronde', p: 'Staan er meer spelers even laag, dan gooien die nog één keer (afgooien). Wie verloor, begint de volgende ronde.' },
    ] },
    bussen: { name: 'Bussen', c: '#4f8dff', url: '/bussen', slides: [
      { img: 'bussen-1', t: 'Aan tafel', p: TAFEL(2, 9, ' De host kiest hoe lang de bus is: 4, 5 of 7 kaarten.') },
      { img: 'bussen-2', t: '1. De vragenronde', p: 'Iedereen krijgt om de beurt vier kaarten, steeds met een vraag. Goed: niks. Fout: drinken. Rood of zwart <b>1 slok</b>, hoger of lager <b>2</b>, binnen of buiten <b>3</b>, heb je het vormpje al <b>4</b>. Gelijk is paal, en paal is fout.' },
      { img: 'bussen-3', t: 'Disco', p: 'Heb je bij de vierde vraag drie verschillende vormen, dan mag je ook <b>Disco</b> kiezen. Is je vierde kaart de ontbrekende vorm, dan drinkt <b>de rest 3 slokken</b>. Mis telt als fout: 4 slokken.' },
      { img: 'bussen-4', t: 'Nu doen of sparen', p: 'Krijg je slokken, dan zie je groot hoeveel en van wie. Drink ze <b>nu</b>, of <b>spaar</b> ze op. Aan het eind van een ronde komen gespaarde slokken terug, en aan het eind van het spel moeten ze op.' },
      { img: 'bussen-5', t: '2. De piramide', p: 'Elf kaarten gaan één voor één open. Heb je dezelfde waarde? Tik je kaart aan om hem weg te leggen, voordat de volgende omgaat. Per kaart deel je slokken uit: van onder naar boven <b>1 tot 3</b>, en een dwarse kaart telt dubbel (onderin 2, bovenin 6).' },
      { img: 'bussen-6', t: 'Uitdelen', p: 'Tik aan tafel op wie er drinkt, tot al je slokken verdeeld zijn. Wie ze krijgt, ziet het meteen op zijn telefoon.' },
      { img: 'bussen-7', t: '3. De bus', p: 'Wie de meeste kaarten overhoudt, moet de bus in (bij gelijk kiest ieder een dichte kaart; de laagste moet erin). Raad steeds hoger of lager. Fout of paal? Drink zoveel slokken als de hoeveelste gok het was (<b>1, 2, 3…</b>) en begin opnieuw. Haal je het eind, of heb je in de bus <b>10 slokken</b> gehad, dan ben je eruit.' },
    ] },
    boer: { name: 'Boer zoekt vrouw', c: '#ff6b8b', url: '/boer', slides: [
      { img: 'boer-1', t: 'Aan tafel', p: TAFEL(3, 10, ' Zet <b>twee volle glazen</b> op tafel.') },
      { img: 'boer-2', t: 'Je rol', p: 'Iedereen krijgt stiekem een rol op zijn telefoon: één <b>boer</b>, één <b>vrouw</b> en de rest <b>burgers</b>. Laat niemand meekijken. Tik op je kaart om nog eens te kijken.' },
      { img: 'boer-3', t: 'De boer telt', p: 'De boer begint wanneer hij wil en telt met zijn ogen dicht tot 8 (de host kan dat aanpassen). De vrouw drinkt intussen zo snel mogelijk <b>een glas leeg</b>. De burgers doen gewoon alsof.' },
      { img: 'boer-4', t: 'Raden', p: 'Bij de pling mag de boer kijken. Hij wijst op zijn telefoon aan wie de vrouw was.' },
      { img: 'boer-5', t: 'Het tweede glas', p: 'Goed geraden? Dan drinkt de vrouw <b>ook het tweede glas</b>. Fout? Dan drinkt <b>de boer</b> het. Wie moet drinken, ziet het groot op zijn telefoon. Glazen vullen, en de host verdeelt de rollen opnieuw.' },
    ] },
    dealer: { name: 'Pak de dealer', c: '#a28fe3', url: '/dealer', slides: [
      { img: 'dealer-1', t: 'Aan tafel', p: TAFEL(2, 10, ' Bij de start wordt er een willekeurige dealer gekozen.') },
      { img: 'dealer-2', t: 'De dealer', p: 'Alleen de dealer ziet de bovenste kaart van de stapel, op zijn eigen telefoon.' },
      { img: 'dealer-3', t: 'Raden', p: 'De speler na de dealer raadt welke kaart het is, van 2 tot de aas (boer 11, vrouw 12, heer 13, aas 14). Op tafel zie je welke kaarten al geweest zijn.' },
      { img: 'dealer-4', t: 'Hoger of lager', p: 'In één keer goed: de dealer drinkt <b>5</b>. Fout? Dan hoor je hoger of lager en raad je nog één keer. Nu goed: de dealer drinkt <b>3</b>. Weer fout: jij drinkt <b>het verschil</b>, hooguit 5. Zeg je 6 en is het een 2, dan drink je er 4.' },
      { img: 'dealer-5', t: 'Dealer af', p: 'Speelt de dealer <b>drie spelers achter elkaar</b> uit, dan gaat de stapel naar de volgende. Raadt er iemand goed, dan begint hij weer bij nul.' },
    ] },
    paardenrace: { name: 'Paardenrace', c: '#a6d83c', url: '/paardenrace', slides: [
      { img: 'paardenrace-1', t: 'Inzetten', p: 'Kies een aas als paard en zet <b>1 tot 5 slokken</b> in. Meer spelers mogen op hetzelfde paard. Tik op Klaar; is iedereen klaar, dan begint de race.' },
      { img: 'paardenrace-2', t: 'De start', p: 'De paarden staan op de start en de zeven dichte kaarten liggen naast de baan. Je inzet drink je alleen als je paard verliest.' },
      { img: 'paardenrace-3', t: 'De race', p: 'Trek om de beurt een kaart: het paard met die vorm doet een stap vooruit. Zijn alle paarden langs een dichte kaart naast de baan, dan gaat die open en moet het paard met die vorm <b>een stap terug</b>.' },
      { img: 'paardenrace-4', t: 'De finish', p: 'Het eerste paard voorbij de zevende kaart wint. Zette je op een ander paard? Dan drink je <b>je eigen inzet plus de hoogste inzet op de winnaar</b>, samen hooguit 8. Zette jij op de winnaar, dan hoef je niks.' },
    ] },
    rotonde: { name: 'Rotonde', c: '#d63bb5', url: '/rotonde', slides: [
      { img: 'rotonde-1', t: 'De zon', p: '37 dichte kaarten liggen als een zon op tafel. De kleur zegt hoeveel slokken een kaart waard is: rood <b>1</b>, oranje <b>2</b>, blauw <b>3</b>, groen <b>4</b> en paars in het midden <b>6</b>.' },
      { img: 'rotonde-2', t: 'Kiezen en gokken', p: 'Wie aan de beurt is, tikt een dichte kaart aan en gokt <b>rood</b> (harten, ruiten) of <b>zwart</b> (klaveren, schoppen). De kaart gaat open.' },
      { img: 'rotonde-3', t: 'Goed: de pot groeit', p: 'Dan gaat de waarde van de kaart in de pot. Je mag nog één keer gokken om de pot groter te maken, of de beurt doorgeven.' },
      { img: 'rotonde-4', t: 'Fout: de pot is voor jou', p: 'Dan drink je <b>de kaart plus de hele pot</b>, hooguit 8: een groene kaart (4) met 3 in de pot is 7 slokken. De pot is weer leeg en je probeert het opnieuw. Liggen alle kaarten open, dan kan de host een nieuwe rotonde leggen.' },
    ] },
    mijnenveld: { name: 'Mijnenveld', c: '#c9803a', url: '/mijnenveld', slides: [
      { img: 'mijnenveld-1', t: 'Het veld', p: '36 dichte kaarten in een veld van 6 bij 6, met <b>8 verstopte mijnen</b>. De host kiest in de lobby hoeveel slokken een mijn is: <b>2, 3 of 5</b>.' },
      { img: 'mijnenveld-2', t: 'Gooien', p: 'Gooi de steen twee keer: eerst voor de kolom (blauw), dan voor de rij (goud). Ligt die kaart al open, dan wordt het de eerstvolgende dichte kaart.' },
      { img: 'mijnenveld-3', t: 'Boem!', p: 'Ligt er een mijn op die kaart, dan drink je de slokken <b>per mijn</b> (hooguit 6 in één keer). Daarna leg jij de mijn ergens anders neer: op een kaart, of tussen twee kaarten (dan raakt hij ze allebei).' },
      { img: 'mijnenveld-4', t: 'Rood of zwart', p: 'Dan gok je de kleur en de kaart gaat open. Goed: de volgende is aan de beurt. Fout: <b>2 slokken</b> en je gooit opnieuw. Liggen alle kaarten open, dan is het veld leeg.' },
    ] },
    // in de browser: de stevige regels (de host kan ook rustig kiezen); in de app alleen rustig (borrelbordRustig)
    borrelbord: { name: 'Borrelbord', c: '#f2c230', url: '/borrelbord', slides: [
      { img: 'borrelbord-stevig-1', t: 'Het bord', p: '48 vakjes, zoals ganzenbord. ' + TAFEL(2, 10) + ' De host kiest de regels: <b>stevig</b> (de oude regels, met veel slokken) of <b>rustig</b>. Deze uitleg is voor stevig.' },
      { img: 'borrelbord-stevig-2', t: 'Gooien', p: 'Ben je aan de beurt? <b>Houd de knop vast en laat los</b>. De steen rolt over het bord, bij iedereen, en je pion loopt zoveel vakjes.' },
      { img: 'borrelbord-stevig-3', t: 'Het vakje', p: 'Doe wat er staat: <b>drink 1 of 2</b>, <b>geef 1 tot 3</b> weg, iedereen of je buren drinken 1, de laatste drinkt 2, een vraag, een regel, een drinkmaatje of van plek ruilen. Moet je iemand kiezen, dan doe je dat op je telefoon.' },
      { img: 'borrelbord-stevig-4', t: 'Duel en dubbel of niks', p: 'Bij een duel gooien jullie allebei op je eigen telefoon: de laagste drinkt <b>2</b>, bij gelijk nog een keer. Bij dubbel of niks gooi je nog eens: even, dan drinkt de rest <b>1</b>; oneven, dan drink jij <b>3</b>.' },
      { img: 'borrelbord-stevig-5', t: 'Gans, brug en doodskop', p: 'Op een gans loop je nog een keer zoveel verder. De brug brengt je naar 12. In het café drink je 1 en sla je een beurt over. In de put zit je vast tot een ander erin valt. Het doolhof zet je 5 terug, de doodskop naar start (en drink 2). Vakje 47 is een <b>ad fundum</b>: glas in één keer leeg.' },
      { img: 'borrelbord-stevig-6', t: 'Winnen', p: 'Wie als eerste op de finish staat, wint en mag <b>een bak</b> uitdelen: kies wie zijn glas in één keer leeg drinkt. Wie dan het verst achter staat, drinkt <b>3</b>.' },
    ] },
    borrelbordRustig: { name: 'Borrelbord', c: '#f2c230', url: '/borrelbord', slides: [
      { img: 'borrelbord-1', t: 'Het bord', p: '48 vakjes, zoals ganzenbord. ' + TAFEL(2, 10) },
      { img: 'borrelbord-2', t: 'Gooien', p: 'Ben je aan de beurt? <b>Houd de knop vast en laat los</b>. De steen rolt over het bord, bij iedereen, en je pion loopt zoveel vakjes.' },
      { img: 'borrelbord-3', t: 'Het vakje', p: 'Doe wat er staat: <b>drink 1</b>, <b>geef 1</b> weg, iedereen of je buren drinken 1, een vraag, een regel, een drinkmaatje of van plek ruilen. Moet je iemand kiezen, dan doe je dat op je telefoon.' },
      { img: 'borrelbord-4', t: 'Duel en dubbel of niks', p: 'Bij een duel gooien jullie allebei op je eigen telefoon: de laagste drinkt <b>2</b>, bij gelijk nog een keer. Bij dubbel of niks gooi je nog eens: even, dan drinkt de rest <b>1</b>; oneven, dan drink jij <b>2</b>.' },
      { img: 'borrelbord-5', t: 'Gans, brug en doodskop', p: 'Op een gans loop je nog een keer zoveel verder. De brug brengt je naar 12. In het café drink je 1 en sla je een beurt over. In de put zit je vast tot een ander erin valt. Het doolhof zet je 5 terug, de doodskop naar start (en drink 1). Vlak voor de finish, op vakje 47, drink je 2.' },
      { img: 'borrelbord-6', t: 'Winnen', p: 'Wie als eerste op de finish staat, wint en kiest wie er <b>3 slokken</b> drinkt. Wie dan het verst achter staat, drinkt <b>2</b>.' },
    ] },
    kart: { name: 'Karnemelk Kart', c: '#ff7a00', url: '/kart', slides: [
      { img: 'kart-1', t: 'Racen met vrienden', p: 'Tik op <b>Room maken</b> en deel de code, of doe mee met de code van een vriend. Tot 10 spelers live. Even niemand? Oefen tegen bots.' },
      { img: 'kart-2', t: 'Sturen', p: 'Je kart geeft vanzelf gas. Stuur met de pijltjes links onderin. Rechts zitten <b>REM</b>, <b>DRIFT</b> en je item. Liever schuiven of je telefoon kantelen? Dat kies je bij Instellingen.' },
      { img: 'kart-3', t: 'Driften en items', p: 'Houd DRIFT ingedrukt in een bocht: hoe langer, hoe meer vonkjes. Laat los voor een turbo. Rijd door een regenboog-melkpak voor een item, zoals de stroopwafel-turbo, het kaasschild, een karnemelkplas of het klompkanon.' },
      { img: 'kart-4', t: 'Punten en de winkel', p: 'Na elke race krijg je MP-punten. Koop er karts, hoeden, capes en meer mee in de winkel, en maak je eigen coureur.' },
    ] },
  };
  // in de app uit de Play Store (die opent met /?app=play) speelt Borrelbord alleen met de rustige regels
  const PLAY = (() => { try { return sessionStorage.getItem('spelkeet-play') === '1' || /[?&]app=play\b/.test(location.search); } catch (e) { return false; } })();
  // andere namen voor hetzelfde spel
  GAMES.paard = GAMES.paardenrace;
  GAMES.zuipbord = GAMES.borrelbord;
  GAMES.zuipbordRustig = GAMES.borrelbordRustig;

  const CSS = `
.uitleg{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;background:#120a16 radial-gradient(90% 55% at 50% 0%,color-mix(in srgb,var(--uc) 38%,transparent),transparent 70%) no-repeat;color:#f6efe3;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased;overscroll-behavior:contain;animation:uIn .25s ease both}
.uitleg[hidden]{display:none}
.uitleg *{box-sizing:border-box}
.uitleg .u-top{display:flex;align-items:center;gap:12px;padding:calc(10px + env(safe-area-inset-top,0px)) 16px 6px;width:min(100%,560px);margin:0 auto}
.uitleg .u-top div{flex:1;min-width:0}
.uitleg .u-kick{margin:0;font-size:12px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--uc)}
.uitleg .u-name{margin:0;font-size:22px;line-height:1.15;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.uitleg .u-x{flex:none;width:44px;height:44px;border:0;border-radius:50%;background:rgba(255,255,255,.1);color:inherit;font-size:20px;cursor:pointer}
.uitleg .u-track{flex:1;min-height:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.uitleg .u-track::-webkit-scrollbar{display:none}
.uitleg .u-slide{flex:0 0 100%;min-width:0;scroll-snap-align:center;scroll-snap-stop:always;display:flex;flex-direction:column;align-items:center;gap:14px;padding:8px 20px 4px;overflow-y:auto}
.uitleg figure{flex:1 1 auto;min-height:150px;margin:0;display:flex;align-items:center;justify-content:center;width:100%}
.uitleg figure img{display:block;max-width:100%;max-height:100%;height:auto;width:auto;border-radius:20px;box-shadow:0 0 0 1px rgba(255,255,255,.16),0 14px 40px rgba(0,0,0,.55);background:#000}
.uitleg .u-text{flex:none;width:min(100%,500px)}
.uitleg .u-step{display:inline-block;margin:0 0 4px;padding:2px 10px;border-radius:999px;background:var(--uc);color:#140a16;font-size:13px;font-weight:900}
.uitleg h3{margin:0 0 4px;font-family:inherit;font-size:22px;line-height:1.2;font-weight:900;color:#fff;letter-spacing:normal;text-transform:none;text-shadow:none}
.uitleg p{margin:0;font-family:inherit;color:#e3d8e6;font-size:16.5px;line-height:1.5;letter-spacing:normal;text-transform:none}
.uitleg p b{color:#fff}
.uitleg .u-foot{display:flex;align-items:center;gap:10px;width:min(100%,560px);margin:0 auto;padding:10px 16px calc(14px + env(safe-area-inset-bottom,0px))}
.uitleg .u-dots{flex:1;display:flex;justify-content:center;gap:7px}
.uitleg .u-dots button{width:9px;height:9px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.28);cursor:pointer}
.uitleg .u-dots button[aria-current="true"]{width:24px;border-radius:5px;background:var(--uc)}
.uitleg .u-btn{flex:none;min-width:96px;min-height:50px;padding:0 18px;border:0;border-radius:16px;font:inherit;font-weight:900;font-size:17px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
.uitleg .u-prev{background:rgba(255,255,255,.1);color:inherit}
.uitleg .u-prev[disabled]{opacity:.3;cursor:default}
.uitleg .u-next{background:var(--uc);color:#140a16}
.uitleg button:focus-visible,.uitleg a:focus-visible{outline:3px solid #fff;outline-offset:2px}
@keyframes uIn{from{opacity:0}}
@media (min-height:760px){.uitleg h3{font-size:24px}.uitleg p{font-size:17px}}
@media (prefers-reduced-motion:reduce){.uitleg{animation:none}}`;

  let root = null, game = null, at = 0, back = null, pushed = false, opts = {};
  const $ = (s) => root.querySelector(s);

  function mount() {
    if (root) return;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'uitleg';
    root.hidden = true;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('data-lenis-prevent', '');
    document.body.appendChild(root);
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-u]');
      if (!b) return;
      const a = b.dataset.u;
      if (a === 'close') close();
      else if (a === 'prev') go(at - 1);
      else if (a === 'next') { if (at < game.slides.length - 1) go(at + 1); else if (!opts.play) close(); }
      else if (a === 'dot') go(+b.dataset.i);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(at + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(at - 1); }
    });
    // terug (de knop van Android, of vegen) sluit eerst de uitleg
    addEventListener('popstate', () => { if (pushed) { pushed = false; close(true); } });
  }

  function draw() {
    const n = game.slides.length;
    root.style.setProperty('--uc', game.c);
    root.setAttribute('aria-label', `Uitleg: ${game.name}`);
    root.innerHTML = `
      <div class="u-top"><div><p class="u-kick">Uitleg</p><p class="u-name">${game.name}</p></div><button class="u-x" type="button" data-u="close" aria-label="Uitleg sluiten">✕</button></div>
      <div class="u-track" tabindex="-1">${game.slides.map((s, i) => `
        <section class="u-slide" aria-roledescription="dia" aria-label="${i + 1} van ${n}">
          <figure><img alt="" decoding="async" ${i < 2 ? `src="${IMG(s.img)}"` : `data-src="${IMG(s.img)}"`} onerror="this.parentNode.hidden=true"></figure>
          <div class="u-text"><span class="u-step">${i + 1}/${n}</span><h3>${s.t}</h3><p>${s.p}</p></div>
        </section>`).join('')}</div>
      <div class="u-foot">
        <button class="u-btn u-prev" type="button" data-u="prev" aria-label="Vorige">‹</button>
        <div class="u-dots">${game.slides.map((_, i) => `<button type="button" data-u="dot" data-i="${i}" aria-label="Dia ${i + 1}"></button>`).join('')}</div>
        <span class="u-nextwrap"></span>
      </div>`;
    const track = $('.u-track');
    let raf = 0;
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { const i = Math.round(track.scrollLeft / Math.max(1, track.clientWidth)); if (i !== at) { at = i; sync(); } });
    }, { passive: true });
  }

  // knoppen, stippen en de plaatjes van de buren bijwerken
  function sync() {
    const n = game.slides.length, last = at === n - 1;
    root.querySelectorAll('.u-dots button').forEach((b, i) => b.setAttribute('aria-current', String(i === at)));
    $('.u-prev').disabled = at === 0;
    const wrap = $('.u-nextwrap');
    wrap.innerHTML = last && opts.play
      ? `<a class="u-btn u-next" href="${opts.play}">Spelen</a>`
      : `<button class="u-btn u-next" type="button" data-u="next">${last ? 'Klaar' : 'Volgende'}</button>`;
    root.querySelectorAll('.u-slide').forEach((sl, i) => {
      const img = sl.querySelector('img[data-src]');
      if (img && Math.abs(i - at) <= 1) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
    });
  }

  function go(i) {
    const n = game.slides.length;
    i = Math.max(0, Math.min(n - 1, i));
    const track = $('.u-track');
    track.scrollTo({ left: i * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    if (i !== at) { at = i; sync(); }
  }

  function open(key, o = {}) {
    const g = (PLAY && GAMES[`${key}Rustig`]) || GAMES[key];
    if (!g) return false;
    mount();
    game = g; at = 0; opts = o;
    back = document.activeElement;
    draw();
    sync();
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    try { history.pushState({ uitleg: key }, ''); pushed = true; } catch (e) { pushed = false; }
    const next = root.querySelector('.u-next');
    if (next) next.focus({ preventScroll: true });
    return true;
  }

  function close(fromHistory = false) {
    if (!root || root.hidden) return;
    root.hidden = true;
    root.innerHTML = '';
    document.documentElement.style.overflow = '';
    if (pushed && !fromHistory) { pushed = false; history.back(); }
    if (back && back.focus) back.focus({ preventScroll: true });
  }

  // elke knop met data-uitleg="spel" opent de uitleg van dat spel
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-uitleg]');
    if (!b) return;
    e.preventDefault();
    open(b.dataset.uitleg, { play: b.dataset.play || '' });
  });

  window.Uitleg = { open, close, games: GAMES };
})();
