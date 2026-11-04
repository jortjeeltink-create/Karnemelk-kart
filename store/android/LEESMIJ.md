# De Android-app (voor de Play Store)

De app is een *Trusted Web Activity*: een kleine Android-app die `https://spelkeet.onrender.com` schermvullend opent. Een update van de site is meteen ook een update van de app. Een nieuwe app-versie is alleen nodig als de naam, het icoon of het adres verandert.

- `twa-manifest.json`: de instellingen van de app, met pakketnaam `nl.spelkeet.app`, versie 1.0.0 (code 1) en minimaal Android 7 (SDK 24).
- De uploadsleutel (`spelkeet-upload.keystore`) en het wachtwoord staan **niet** in de repository. Jort bewaart ze.

## Een nieuwe versie bouwen
1. Zet `spelkeet-upload.keystore` naast `twa-manifest.json`.
2. Verhoog `appVersionCode` (en `appVersionName`) in `twa-manifest.json`.
3. Bouw met [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). Daarvoor heb je JDK 17 en de Android SDK nodig; Bubblewrap biedt aan ze te installeren.
   ```
   npx @bubblewrap/cli update
   npx @bubblewrap/cli build
   ```
4. Upload `app-release-bundle.aab` in de Play Console.

De vingerafdrukken voor de koppeling met de site (`/.well-known/assetlinks.json`) staan in `APP_PRINTS` in `server/index.js`.
