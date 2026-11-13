// Op elke speelpagina: meldt de service worker aan (een nette pagina als je geen internet hebt, /sw.js), zorgt dat
// delen ook in de Android-app werkt, biedt De Spelkeet delen en beoordelen aan (window.Spelkeet), en meldt fouten.
// (Vroeger vroeg dit bestand ook of je 18 of ouder bent; dat hoeft niet meer, het gaat om strafpunten.)
(() => {
  'use strict';
  if ('serviceWorker' in navigator && window.isSecureContext) {
    addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
  // de oude bevestiging van de leeftijd hoeft niet meer bewaard te worden
  try { localStorage.removeItem('spelkeet-18'); } catch (e) { /* privémodus */ }
  // In de Android-app (een WebView) bestaat navigator.share niet. De app geeft een brug mee (window.SpelkeetApp),
  // zodat "Deel de code" daar ook het deelmenu van Android opent in plaats van alleen de link te kopiëren.
  const app = window.SpelkeetApp;
  if (!navigator.share && app && typeof app.share === 'function') {
    try {
      navigator.share = (d) => {
        const data = d || {};
        app.share(String(data.title || ''), String(data.text || ''), String(data.url || ''));
        return Promise.resolve();
      };
    } catch (e) { /* kan niet: dan blijft het kopiëren */ }
  }

  // De Spelkeet delen en beoordelen (in het menu van de speelhal en na een goede review).
  const STORE = 'https://play.google.com/store/apps/details?id=nl.spelkeet.app';
  const SITE = 'https://spelkeet.onrender.com';
  const inApp = /SpelkeetApp\//.test(navigator.userAgent);
  const android = inApp || /Android/i.test(navigator.userAgent);
  const DEEL_TEKST = `Speel partyspellen met je vrienden, ieder op je eigen telefoon: Bussen, Mexen, Toepen, Arena en nog veel meer. Gratis en zonder account.\n\nAndroid: ${STORE}\niPhone of computer: ${SITE}`;
  // geeft 'gedeeld', 'gekopieerd' of '' (niet gelukt) terug
  async function deel() {
    if (navigator.share) {
      try { await navigator.share({ title: 'De Spelkeet', text: DEEL_TEKST }); return 'gedeeld'; } catch (e) { if (e && e.name === 'AbortError') return ''; }
    }
    try { await navigator.clipboard.writeText(DEEL_TEKST); return 'gekopieerd'; } catch (e) { return ''; }
  }
  // Op Android (de app of de browser) naar de Play Store; op een iPhone of computer naar onze eigen reviewpagina.
  function beoordeel() {
    if (!android) { location.href = '/review'; return; }
    // in de app opent een link naar buiten vanzelf de Play Store; in de browser in een nieuw tabblad
    if (inApp || !window.open(STORE, '_blank', 'noopener')) location.href = STORE;
  }
  window.Spelkeet = { deel, beoordeel, inApp, android, STORE, SITE };

  // Gaat er op een telefoon iets mis in de code, dan sturen we een korte foutmelding naar de server (hooguit 3 per
  // pagina). Zo zie je in het beheer of er ergens iets stuk is. Geen namen of andere gegevens, alleen de fout.
  let gemeld = 0;
  const meld = (msg, waar) => {
    if (gemeld >= 3 || !msg || /^Script error\.?$/.test(msg)) return;
    gemeld++;
    const body = JSON.stringify({ pagina: location.pathname.replace(/\/[A-Za-z]{4}$/, '/…'), msg: String(msg).slice(0, 300), waar: String(waar || '').slice(0, 120) });
    try { if (!(navigator.sendBeacon && navigator.sendBeacon('/api/fout', new Blob([body], { type: 'application/json' })))) fetch('/api/fout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {}); } catch (e) { /* niet erg */ }
  };
  addEventListener('error', (e) => { if (e && e.message) meld(e.message, `${(e.filename || '').replace(location.origin, '')}:${e.lineno || 0}`); });
  addEventListener('unhandledrejection', (e) => { const r = e && e.reason; meld(r && (r.message || String(r)), 'promise'); });
})();
