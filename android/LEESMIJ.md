# De Android-app (WebView)

Sinds versie 1.1.0 is De Spelkeet een gewone Android-app met een eigen **WebView** die `https://spelkeet.onrender.com` toont. (Versie 1.0.0 was een Trusted Web Activity met Bubblewrap; die opende de site in Chrome. Diensten voor testers, zoals Testers Community, nemen zulke apps niet aan.)

Een update van de site is meteen ook een update van de app. Een nieuwe app-versie is alleen nodig als de app zelf verandert (naam, icoon, deze code).

## Wat de app doet (`MainActivity.java`)
- Pagina's van `spelkeet.onrender.com` openen in de app; andere links (WhatsApp, mail, andere sites) in de app die erbij hoort.
- De terugknop gaat eerst terug binnen de site.
- **Delen** gaat via het deelmenu van Android: de app geeft de site de brug `window.SpelkeetApp`, en `public/js/poort.js` maakt daar `navigator.share` van.
- Trillen (`navigator.vibrate`), geluid, WebGL (Karnemelk Kart) en kantelen werken gewoon.
- Een link naar spelkeet.onrender.com op de telefoon (bijvoorbeeld een uitnodiging) opent de app.
- Zonder internet bij het openen: `assets/offline.html` met "Opnieuw proberen".
- De gebruikersnaam van de browser eindigt op `SpelkeetApp/<versie>`, zodat de site kan zien dat hij in de app draait.

## Bouwen
Nodig: JDK 17 en de Android SDK (platform 36).

1. Verhoog `versionCode` (en `versionName`) in `app/build.gradle`.
2. Zet de uploadsleutel klaar. Die staat **niet** in de repository; Jort bewaart `spelkeet-upload.keystore` en het wachtwoord.
3. Bouw:
   ```
   cd android
   export ANDROID_HOME=/pad/naar/android-sdk
   export SPELKEET_KEYSTORE=/pad/naar/spelkeet-upload.keystore
   export SPELKEET_KEYSTORE_PASSWORD='het wachtwoord'
   ./gradlew bundleRelease
   ```
4. Upload `app/build/outputs/bundle/release/app-release.aab` in de Play Console.

Pakketnaam `nl.spelkeet.app`, minimaal Android 7 (SDK 24), gericht op SDK 36.
