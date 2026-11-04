// Op elke speelpagina: meldt de service worker aan, voor een nette pagina als je geen internet hebt (/sw.js).
// (Vroeger vroeg dit bestand ook of je 18 of ouder bent; dat hoeft niet meer, het gaat om strafpunten.)
(() => {
  'use strict';
  if ('serviceWorker' in navigator && window.isSecureContext) {
    addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); });
  }
  // de oude bevestiging van de leeftijd hoeft niet meer bewaard te worden
  try { localStorage.removeItem('spelkeet-18'); } catch (e) { /* privémodus */ }
})();
