// Op elke speelpagina: meldt de service worker aan (een nette pagina als je geen internet hebt, /sw.js), en zorgt dat
// delen ook in de Android-app werkt.
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
})();
