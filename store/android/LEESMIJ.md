# De Android-app (voor de Play Store)

**De app staat nu in [`android/`](../../android/LEESMIJ.md)**: sinds versie 1.1.0 een gewone Android-app met een eigen WebView. Daar staat ook hoe je een nieuwe versie bouwt.

`twa-manifest.json` hier is van de eerste versie (1.0.0, een Trusted Web Activity gebouwd met Bubblewrap) en wordt niet meer gebruikt.

De vingerafdrukken voor de koppeling met de site (`/.well-known/assetlinks.json`) staan in `APP_PRINTS` in `server/index.js`. Die zorgen ervoor dat links naar spelkeet.onrender.com op de telefoon in de app openen.
