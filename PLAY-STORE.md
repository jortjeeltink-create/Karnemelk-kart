# De Spelkeet in de Google Play Store

De Spelkeet is een website (een PWA). In de Play Store komt hij als **Trusted Web Activity**: een kleine Android-app die de site schermvullend opent, zonder adresbalk. De spellen blijven op de server draaien. Een update van de site is dus meteen ook een update van de app.

Op de site staat al klaar:

- **De poort.** De eerste keer vraagt De Spelkeet of je 18 of ouder bent, met regels over verantwoord spelen en de voorwaarden.
- **De juridische pagina's:**
  - `/privacy` (privacybeleid);
  - `/voorwaarden` (gebruiksvoorwaarden, met de regels voor namen);
  - `/melden` (spelers of namen melden).
- **Gegevens wissen.** In Karnemelk Kart: *Instellingen → Mijn gegevens wissen*.
- **Een namenfilter.** Grove namen en uitdagingen worden geweigerd. De host kan spelers van tafel halen.
- **Uitleg met plaatjes** bij elk spel, en een **slokkenkaart** die op je eigen telefoon groot laat zien hoeveel jij moet drinken.
- **Spelen op een iPhone** (`/iphone`). De Spelkeet staat niet in de App Store. Vrienden met een iPhone spelen gewoon mee in Safari, en op deze pagina zien ze hoe ze De Spelkeet op hun beginscherm zetten. In de app (en op de hoofdpagina) staat een knop om die link te delen.
- **Een offline-pagina** (service worker `/sw.js`).
- **Het app-manifest** (`/speelhal.webmanifest`), met iconen voor Android.
- **De koppeling met de app** (`/.well-known/assetlinks.json`). Die zet je aan met twee instellingen, zie stap 4.
- **Store-materiaal** in de map [`store/`](store): icoon, banner, 6 screenshots en de teksten ([`store/teksten.md`](store/teksten.md)).

Hieronder staat wat jij zelf moet doen, in deze volgorde.

---

## 1. Hosting en webadres

- **Kies je webadres nu, voordat je publiceert.** De app zit vast aan dat adres. Een ander adres betekent later een nieuwe app-versie en een nieuwe koppeling.
  - Gebruik `spelkeet.onrender.com` (zie hieronder hoe je daar komt), niet meer `karnemelk-kart.onrender.com`.
  - Een eigen domein (bijvoorbeeld iets met "spelkeet") is netter. Koppelen kan in Render bij *Settings → Custom Domains*.
- **Van `karnemelk-kart` naar `spelkeet.onrender.com`.** Een adres op Render kun je niet hernoemen. Maak daarom een nieuwe service:
  1. Ga in Render naar **New → Web Service** en kies de repository *Karnemelk-kart* (branch `main`).
  2. Vul in:
     - **Name**: `spelkeet`;
     - **Region**: Frankfurt;
     - **Build Command**: `npm install --omit=dev`;
     - **Start Command**: `npm start`;
     - **Health Check Path**: `/health`.
  3. Zet bij **Environment** dezelfde instellingen als bij de oude service (`KK_SECRET`, `CONTACT_EMAIL`, `MELD_SLEUTEL`, en `UPSTASH_…` als je die hebt). Kopieer ze met de hand.
  4. Klik op **Create Web Service** en wacht tot `https://spelkeet.onrender.com` werkt.
  5. Zet bij de **oude** service (`karnemelk-kart`) onder *Environment*: `REDIRECT_TO` = `https://spelkeet.onrender.com`. Wie de oude link nog heeft, komt dan vanzelf op het nieuwe adres.
- **Neem een betaald plan bij Render.** Het gratis plan valt na 15 minuten zonder bezoekers in slaap, en dan wacht de eerste speler bijna een minuut. In een app voelt dat kapot. Het goedkoopste betaalde plan (Starter) is genoeg.
- **Zet bij Render onder *Environment* deze instellingen:**

| Instelling | Wat | Voorbeeld |
|---|---|---|
| `CONTACT_EMAIL` | Het e-mailadres dat op het privacybeleid, de voorwaarden en het meldformulier staat. Gebruik gerust een apart adres; het wordt openbaar | `spelkeet.app@gmail.com` |
| `MELD_SLEUTEL` | Een geheim woord. Daarmee lees je de meldingen op `/api/meldingen?sleutel=…` | een lange willekeurige tekst |
| `ANDROID_PACKAGE` | De pakketnaam van de app (stap 3) | `nl.spelkeet.app` |
| `ANDROID_SHA256` | De vingerafdruk(ken) van de ondertekeningssleutel (stap 4), gescheiden door komma's | `AB:CD:…` |

Meldingen komen ook in de logboeken van Render ("melding: …"). Op het gratis plan zonder schijf zijn de bewaarde meldingen na een herstart weg; de logboeken niet.

## 2. Een ontwikkelaarsaccount

1. Ga naar [play.google.com/console](https://play.google.com/console) en maak een account (eenmalig 25 dollar).
2. Kies **persoonlijk account**, tenzij je een bedrijf hebt.
3. Google vraagt je identiteit te bevestigen (ID-bewijs en telefoonnummer). Je ontwikkelaarsnaam en het contactadres staan straks openbaar in de Store.
4. **Let op:** een nieuw persoonlijk account moet eerst een **gesloten test** doen met **minstens 12 testers, 14 dagen achter elkaar**, voordat je naar productie mag (stap 6). Zoek dus alvast 12 vrienden met een Android-telefoon.

## 3. De Android-app maken (zonder programmeren)

1. Ga naar [pwabuilder.com](https://www.pwabuilder.com) en vul het adres van De Spelkeet in (bijvoorbeeld `https://spelkeet.onrender.com`).
2. Kies **Package for stores → Android → Generate package**. Vul in:
   - **Package ID**: bijvoorbeeld `nl.spelkeet.app`. Hij moet uniek zijn en kan later **nooit** meer veranderen.
   - **App name** en **Launcher name**: `De Spelkeet`.
   - **Start URL**: `/`.
   - **Display mode**: Standalone. **Orientation**: Default (de kartgame kan dan ook liggend).
   - **Signing key**: *Create new*.
3. Download het zip-bestand. Daarin zitten:
   - het `.aab`-bestand (dat upload je);
   - de ondertekeningssleutel (`signing.keystore`) met de wachtwoorden;
   - een voorbeeld van `assetlinks.json`.

   **Bewaar de sleutel en de wachtwoorden goed** (bijvoorbeeld in een wachtwoordmanager). Zonder sleutel kun je nooit meer een update uploaden.

Liever op je eigen computer? Met [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) (`npx @bubblewrap/cli init --manifest https://jouw-adres/speelhal.webmanifest`) kan het ook.

## 4. De app koppelen aan de site

Zonder deze koppeling toont de app bovenin een adresbalk.

1. Maak in de Play Console de app aan:
   - naam *De Spelkeet*;
   - standaardtaal *Nederlands*;
   - *Game*;
   - *Gratis*.
2. Upload het `.aab`-bestand bij **Testen → Gesloten testen**. Laat **Play App Signing** aan staan (standaard).
3. Kopieer twee vingerafdrukken (SHA-256):
   - die van de **app-ondertekeningssleutel**: Play Console → *Instellingen → App-integriteit → App-ondertekening*;
   - die van je **uploadsleutel**: staat op dezelfde pagina, of in het `assetlinks.json` van PWABuilder.
4. Zet ze bij Render:
   - `ANDROID_SHA256`: allebei, met een komma ertussen;
   - `ANDROID_PACKAGE`: je Package ID.
5. Controleer dat `https://jouw-adres/.well-known/assetlinks.json` je pakketnaam en vingerafdrukken toont.

## 5. Alles invullen in de Play Console

**Hoofdvermelding in de Store**
- Gebruik de teksten uit [`store/teksten.md`](store/teksten.md).
- Gebruik de plaatjes uit `store/`: `icoon-512.png`, `banner-1024x500.png` en de 6 screenshots.

**App-content** (bij *Beleid → App-content*):

| Onderdeel | Wat je invult |
|---|---|
| Privacybeleid | `https://jouw-adres/privacy` |
| Advertenties | Nee, de app bevat geen advertenties |
| Toegang tot de app | Alle functies zijn beschikbaar zonder inloggen |
| Doelgroep | Alleen **18 jaar en ouder**. Niet aantrekkelijk voor kinderen |
| Contentclassificatie (IARC) | Zie hieronder |
| Gegevensveiligheid | Zie hieronder |
| Overheid, financiën, gezondheid, nieuws | Nee |

**Contentclassificatie**: categorie *Game*. Beantwoord eerlijk:
- **Alcohol: ja.** Er zijn drankspellen; drinken wordt genoemd en geteld in slokken.
- **Geweld: alleen fantasie, zonder bloed.** Karts die met klompen schieten (tekenfilmachtig).
- **Gokken: nee.**
  - Er is geen echt geld en geen casino.
  - Bij Paardenrace zet je slokken in, geen geld.
  - De punten in Karnemelk Kart zijn nep.
- **Spelers kunnen met elkaar omgaan: ja.** Namen die anderen aan tafel zien; de host kan een korte uitdaging typen. Er is geen chat.
- **Aankopen in de app: nee.**
- **Locatie delen: nee.**

**Gegevensveiligheid**:
- **Verzameld**:
  - *Persoonsgegevens → Naam*: de bijnaam die je kiest, nodig om te spelen, niet gedeeld met derden.
  - *Apparaat- of andere ID's*: een willekeurige sleutel om je terug te laten komen op je plek, voor de werking van de app.
  - *App-activiteit → Andere door de gebruiker gemaakte content*: de uitdagingstekst en meldingen.
  - *App-activiteit → Andere acties*: punten en spullen in Karnemelk Kart.
- **Niet gedeeld met derden, niet verkocht.**
- **Versleuteld tijdens verzending: ja** (HTTPS).
- **Gebruikers kunnen vragen gegevens te verwijderen: ja.**
  - In de app: Karnemelk Kart → Instellingen → Mijn gegevens wissen.
  - Via e-mail: het adres in `CONTACT_EMAIL`.
  - Als webadres voor verwijderen kun je `https://jouw-adres/privacy` opgeven.

## 6. Testen en publiceren

1. Maak bij *Gesloten testen* een testerslijst met minstens 12 Gmail-adressen, of een Google Groep.
2. Stuur de testers de deelnamelink. Ze moeten op *Word tester* tikken en de app installeren.
3. Laat ze **14 dagen** meedoen. Speel echt een paar potjes; Google kijkt of de app gebruikt wordt.
4. Daarna kun je bij het *Dashboard* **productietoegang aanvragen**. Google stelt een paar vragen over de test.
5. De eerste beoordeling duurt vaak een paar dagen tot een week.

## Als Google de app afwijst

- **Lees de reden in de e-mail.** Meestal gaat het over het beleid voor *alcohol* of *inhoud van gebruikers*.
- **Wat er al gedaan is volgens het beleid van Google Play over alcohol.** Google verbiedt apps die "overmatig drinken positief neerzetten, zoals overmatig drinken, comazuipen of drinken als wedstrijd". Daarom:
  - een 18+-poort, met tips voor verantwoord spelen;
  - "een slok mag ook water, fris of karnemelk zijn", op elke drinkmelding;
  - geen bak of ad fundum (een glas in één keer leeg) in Bussen en Borrelbord;
  - een maximum aantal slokken per keer in elk spel:
    - Mexen: 6;
    - Pak de dealer: 5;
    - Paardenrace: 8;
    - Rotonde: 8;
    - Mijnenveld: 6;
    - Bussen: de bus stopt bij 10;
  - de app heet De Spelkeet (ATJE betekende een glas in één keer leeg), met een icoon zonder bier.
- **Waar Google nog over kan vallen.** Boer zoekt vrouw is bewust niet aangepast: de vrouw drinkt snel een glas leeg, en wie verliest drinkt het tweede glas. Dat is precies "snel drinken". Ook de naam "Boer zoekt vrouw" (een tv-programma) kan een reden zijn. Wordt de app daarom afgewezen, pas dan dat spel aan of haal het eruit.
- **Je kunt bezwaar maken** via de link in de e-mail. Leg daarin uit dat het een spel voor volwassenen is dat verantwoord drinken stimuleert.
- **Nog een stap verder?** Laat de app standaard "punten" tellen in plaats van slokken. Dat is te bouwen als het nodig blijkt.

## Na het publiceren

- **Elke update van de site is meteen live in de app.** Een nieuwe app-versie is alleen nodig als je het adres, de naam of het icoon van de app verandert.
- **Vrienden met een iPhone**: stuur ze `https://jouw-adres/iphone` (of tik in De Spelkeet onderaan op *Stuur de link*).
- **Kijk af en toe naar de meldingen** (`/api/meldingen?sleutel=…`) en naar de beoordelingen in de Play Console.
