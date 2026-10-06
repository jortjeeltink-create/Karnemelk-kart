# Karnemelk Kart

Een originele, kleurrijke arcade-kartgame voor in de browser. Tot 10 vrienden racen live tegen elkaar op dezelfde baan, gewoon vanaf hun telefoon in Safari of Chrome. Geen app nodig.

Alle personages, banen, items, geluiden en afbeeldingen zijn zelf bedacht en worden in code getekend en gesynthetiseerd. Er zitten geen Nintendo- of Mario-onderdelen in.

## Wat zit erin

- **Live multiplayer** voor maximaal 10 spelers (mensen + computerkarts) per room.
- **Privéroom met groepscode** van 4 letters, plus een deelbare link (`https://jouw-site/?room=ABCD`).
- **Lobby** met wie er meedoet, wie klaar is, coureurkeuze, baankeuze, computerkarts en de uitdaging voor de verliezer. De host start de race (en kan spelers verwijderen).
- **Opnieuw deelnemen** na een verbindingsonderbreking: je krijgt automatisch je eigen kart terug (tot 2 minuten). Wie tijdens een race binnenkomt, kijkt mee en doet de volgende race mee.
- **13 banen**: kustweg, pretpark, stadscentrum (grachten), bos, haven, sneeuwbaan, woestijn, boerderij, een bonusbaan in de ruimte, en nieuw: Schansenpolder, Neonstad Nachtrace, Vulkaan Vuurrit en Duinensprong. Elk met eigen route, decor, obstakels, bewegende hindernissen, muziek en sfeer.
- **Schansen en boostringen**: rijd met vaart over een schans en je vliegt, ook over andere karts, plassen en obstakels heen. Een mooie landing geeft een kleine turbo, en door een gouden boostring krijg je een flinke turbo. Op sommige banen spring je over sloten of lavastromen (erdoorheen rijden remt je flink af). Elke baan heeft nu ook meer turbostroken.
- **Mooie, realistischere graphics**: filmisch licht, echte schaduwen van karts en bomen, reflecties in lak, water en metaal, een lucht met drijvende wolken, heuvels aan de horizon, graspollen langs de weg, ronde vormen en nieuwe bomen. Bij "Laag" (Instellingen) staat alles zuinig voor oudere telefoons.
- **3 rondes** met aftellen, raketstart, live posities, minikaart, finishscherm, uitslag met podium.
- **Botsen**: wie een kart ramt, vertraagt die en duwt hem opzij. Iedereen ziet de botsing (wolkje, geluid, trilling en "BOTS!") en de nieuwe posities live.
- **Driften** met mini-turbo (witte, gele en roze vonken) en **power-ups**: Stroopwafel-turbo, Drie stroopwafels, Kaasschild, Karnemelkplas (glad obstakel) en Klompkanon.
- **Oefenmodus** voor één speler, met 0 tot 9 computerkarts (makkelijk, normaal, moeilijk).
- **Winnaar en verliezer**: de laatste mens krijgt de uitdaging "Een atje karnemelk!". De verliezer of host kan hem overslaan, een andere kiezen of afvinken. De host kan de tekst vooraf aanpassen of uitzetten.
- **Geen wachtwoord of PIN**: je kiest alleen een naam. Je telefoon onthoudt je, en je MP-punten en spullen blijven op die telefoon. Nieuwe telefoon? Met een overzetcode (Instellingen) neem je alles mee.
- **MP-punten** na elke race, plus een **dagbonus** van 25 MP voor je eerste uitgereden race van de dag.
- **Specials**: Meke (lang, dun en blond), Meike (donker haar, dun), Stan, Jullian, Melle, Duuk, Morris, Ridder Kees en Ridder Jort (allebei in een volledig ridderpak) koop je met MP-punten. In de race heet je dan bijvoorbeeld **Meke (Jort)**, zodat je meerdere Mekes uit elkaar houdt.
- **Mijn coureur**: maak je eigen coureur met huidskleur, haar, haarkleur, shirt, lengte, bouw, bril en snor of baard.
- **Winkel** met specials, andere karts (o.a. een Roze droomkart, Tractorkart, Badkuip-kart en Monstertruck), hoeden, capes, kartkleuren, bandeneffecten, lichtsporen en overwinningsposes in 5 zeldzaamheden. Alles is betaalbaar: een special heb je na een paar races. Alleen uiterlijk, iedereen ziet elkaars spullen in de race.
- **Langs de weg**: tribunes met juichend publiek, reclameborden met grappige teksten, bochtpijlen, bandenstapels, vlaggen, pionnen en per baan eigen spullen (fietsen in de stad, melkbussen en schapen op de boerderij, surfplanken aan de kust, ...).
- **Toeteren**: met de TOET-knop toeter je naar anderen in de buurt.
- **Titels na de race**: Botskampioen, Pechvogel, Itemkoning en Driftkoning.
- **Instellingen**: muziek, effecten, alles stil, besturing (knoppen, schuifbalk of kantelen), automatisch gas, linkshandig, trillen, grafische kwaliteit, namen en minikaart.
- Alles in het Nederlands.

## Snel starten op je eigen computer

Je hebt [Node.js](https://nodejs.org) versie 18.17 of nieuwer nodig (aangeraden: 22).

```bash
npm install
npm start
```

Open daarna **http://localhost:3000**. In het venster van de server zie je ook een regel als:

```
Op je wifi (telefoon): http://192.168.1.23:3000
```

Telefoons op **hetzelfde wifi-netwerk** kunnen dat adres openen en meedoen. Werkt het niet, controleer dan of je firewall poort 3000 toelaat.

Handige varianten:

| Commando | Wat het doet |
|---|---|
| `npm run dev` | Herstart de server vanzelf als je iets aanpast |
| `PORT=8080 npm start` | Andere poort |
| `npm test` | Alle tests, inclusief een race met 10 spelers (duurt ongeveer 3 minuten, Node 22 nodig) |
| `npm run test:snel` | Alleen de snelle tests (seconden) |
| `npm run build:demo` | Offline-demo in één bestand: `dist/karnemelk-kart-offline.html` |

## Online zetten zodat vrienden met een link meespelen

Karnemelk Kart is één klein Node.js-programma dat zowel de game-bestanden levert als de live multiplayer regelt via WebSockets. Daarom heb je nodig:

1. **Een host die een Node.js-server draait en WebSockets toelaat.** Statische hosting zoals GitHub Pages, Netlify of Vercel is *niet* genoeg, want daar kan de live raceserver niet draaien.
2. **HTTPS** (bijna elke host regelt dit automatisch). De game schakelt dan vanzelf over op beveiligde WebSockets (`wss://`). Kantelbesturing op iPhone werkt alleen via HTTPS.
3. **Niks extra's voor de MP-punten.** De server schrijft naar `data/karnemelk-data.json` (of de map in `DATA_DIR`), en elke telefoon bewaart daarnaast een ondertekende reservekopie van zijn eigen profiel. Start een gratis server opnieuw met een lege schijf, dan zet elke telefoon zijn naam, MP en spullen vanzelf terug. Een database is dus niet nodig.

Eén serverinstantie is genoeg voor flink wat groepjes vrienden; een race met 10 spelers kost de server minder dan 5 ms rekentijd per seconde. Gebruik **één** instantie (niet opschalen naar meerdere), want rooms leven in het geheugen van de server.

### Optie A: Render.com (gratis, makkelijkst)

1. Zet deze map in een GitHub-repository.
2. Maak een gratis account op [render.com](https://render.com) en kies **New → Blueprint**. Selecteer je repository; Render leest `render.yaml` en maakt een webservice in Frankfurt. Je hoeft niks in te vullen: Render maakt zelf het geheim `KK_SECRET` aan waarmee de reservekopieën worden ondertekend.
3. Klik op **Deploy Blueprint**. Je link wordt iets als `https://karnemelk-kart.onrender.com`. Deel die, of deel vanuit de lobby de link met groepscode.

Let op: een gratis Render-server slaapt na 15 minuten zonder bezoekers. De eerste speler wacht dan ongeveer een minuut; de game probeert vanzelf opnieuw te verbinden en de telefoons zetten hun profiel terug. Wie op dat moment niet online is, krijgt zijn profiel terug zodra hij de game weer opent.

### Optie B: Railway of Fly.io

Beide draaien de meegeleverde `Dockerfile`. Zet `KK_SECRET` op een lange willekeurige tekst, dan werken de reservekopieën op de telefoons. Koppel je een volume aan `/data` (de Dockerfile zet `DATA_DIR=/data`), dan bewaart ook de server alles.

### Optie C: eigen server of VPS

```bash
docker build -t karnemelk-kart .
docker run -d --restart unless-stopped -p 3000:3000 -v karnemelk-data:/data karnemelk-kart
```

Zet er voor HTTPS een reverse proxy voor, bijvoorbeeld [Caddy](https://caddyserver.com) met één regel config: `jouwdomein.nl { reverse_proxy localhost:3000 }`. WebSockets gaan daar automatisch goed.

### Optie D: even snel testen met vrienden buiten je wifi

Start de server lokaal en maak een tijdelijke HTTPS-link met [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/):

```bash
npm start
cloudflared tunnel --url http://localhost:3000
```

Je krijgt een adres als `https://iets-willekeurigs.trycloudflare.com` dat werkt zolang je computer aan staat.

### Instellingen via omgevingsvariabelen

| Variabele | Standaard | Uitleg |
|---|---|---|
| `PORT` | `3000` | Poort van de server |
| `HOST` | `0.0.0.0` | Netwerkadres |
| `DATA_DIR` | `./data` | Map voor het opslagbestand |
| `KK_SECRET` | – | Geheim om reservekopieën te ondertekenen. Niet ingevuld: de server maakt er zelf één en bewaart die in de opslag. Op hosting zonder vaste schijf moet je dit invullen (Render doet het automatisch) |
| `UPSTASH_REDIS_REST_URL` | – | Optioneel: opslag in Upstash Redis in plaats van een bestand |
| `UPSTASH_REDIS_REST_TOKEN` | – | Hoort bij de URL hierboven |

`/health` geeft de status terug (aantal rooms en spelers), handig voor hostingcontroles.

## Zo speel je

1. Open de link en kies een naam. Nieuw? Dan krijg je 150 MP welkomstcadeau. Je telefoon onthoudt je daarna.
2. **Room maken** geeft een groepscode. Deel de link of laat vrienden de code invullen bij **Meedoen met code**.
3. Kies je coureur. Vrienden tikken op **Ik ben klaar!**; de host kiest de baan en tikt op **Start de race!**
4. Na de race zie je de uitslag, je MP-punten en de uitdaging. De host kan meteen **Opnieuw racen**.

**Besturing op de telefoon** (standaard): je geeft vanzelf gas. Pijltjes linksonder om te sturen (je duim mag tussen links en rechts glijden). Rechtsonder: **DRIFT**, **REM** en het **item**. Tik ook op het itemvakje bovenin om je item te gebruiken.
**Toetsenbord**: pijltjes of WASD, spatie = drift, E of Enter = item, H = toeteren.
**Toeteren**: de TOET-knop linksboven de stuurknoppen. Spelers in de buurt horen het en zien "TOET!" boven je kart.
**Raketstart**: druk op DRIFT vlak voordat START verschijnt.
**Driften**: houd DRIFT vast terwijl je een bocht in stuurt; laat los voor een turbo. Hoe langer, hoe beter (wit, geel, roze).

Tip: in Safari kun je de game via de deelknop op je **beginscherm** zetten; dan opent hij schermvullend als een app.

## Items

| Item | Effect |
|---|---|
| Stroopwafel-turbo | Even extra snel |
| Drie stroopwafels | Drie keer turbo |
| Kaasschild | 8 seconden onaantastbaar bij botsingen, vangt één klap op |
| Karnemelkplas | Glad obstakel achter je: wie erin rijdt, tolt rond |
| Klompkanon | Schiet een klomp vooruit (achteruit met de rem ingedrukt), stuitert tegen muren |

Wie achteraan rijdt, krijgt vaker turbo's. Wie voorop rijdt, krijgt vaker plassen en schilden.

## MP-punten

| Onderdeel | Punten |
|---|---|
| Race uitgereden | 20 MP |
| Plaatsbonus | (aantal racers − plek) ÷ (aantal racers − 1) × (40 + 6 × veldgrootte) |
| Veldgrootte | aantal mensen + de helft van het aantal computerkarts |
| Snelste ronde (mens) | +10 MP |
| Niet uitgereden | 5 MP |
| Oefenmodus | alles × 0,5 |
| Dagbonus | +25 MP voor je eerste uitgereden race van de dag |

Met 10 vrienden: 1e 120, 2e 109, 3e 98, 4e 87, 5e 76, 6e 64, 7e 53, 8e 42, 9e 31, 10e 20 MP (plus 10 voor de snelste ronde). Met 4 vrienden: 84, 63, 41 en 20 MP. Zo levert racen tegen meer echte vrienden meer op, maar verdient iedereen iets.

## Winkel

Alles is alleen uiterlijk; ook een andere kart of coureur rijdt precies even snel. Zeldzaamheden van laag naar hoog: Gewoon, Ongewoon, Zeldzaam, Episch, **Legendarisch**. De Gouden cape is het enige legendarische item en het duurste van de winkel. Kopen met te weinig MP lukt niet (de server controleert dit ook).

De prijzen zijn bewust betaalbaar. Een race met vier vrienden levert al snel 40 tot 80 MP op, en je begint met 150 MP. Een special heb je dus na een paar races, ook als je steeds derde wordt.

| Soort | Items en prijzen (MP) |
|---|---|
| Specials | Allemaal 250: Meke, Meike, Stan, Jullian, Melle, Duuk, Morris, Ridder Kees, Ridder Jort (na 5 online races heb je er altijd genoeg voor, ook als je steeds laatste wordt). Nicole en Cherso Duif zijn uit de winkel: wie ze had, kreeg de MP terug. |
| Capes | Rode cape 50, Hemelsblauwe cape 50, Oranje feestcape 110, Boerenzakdoek-cape 130, Sterrennacht-cape 220, Regenboogcape 380, **Gouden cape 900 (Legendarisch)** |
| Karts | Bakfietskart 70, Roze droomkart 140, Tractorkart 160, Melkwagen 220, Badkuip-kart 240, Klompkart 320, Monstertruck 380, Raketkart 450 |
| Kartkleuren | Melkwit 30, Weidegroen 30, Kauwgomroze 40, Koningsoranje 80, Nachtblauw 80, Koeienvlekken 180, Spiegelchroom 300, Lavagloed 320 |
| Hoeden | Feestmuts 40, Pet achterstevoren 50, Bloemenkrans 100, Koptelefoon 110, Kaaspunthoed 200, Vikinghelm 230, Melkpakhoed 300, Kroon 400 |
| Bandeneffecten | Witte velgen 25, Vonkenbanden 90, Sneeuwvlokbanden 95, Neonvelgen 190, Vlammenwielen 340 |
| Lichtsporen | Melkspoor 40, Neonroze spoor 110, Bliksemspoor 210, Regenboogspoor 400 |
| Overwinningsposes | Koninklijk zwaaien 35, Klompendans 110, Karnemelk-proost 220, Kartsalto 420 |

## Coureurs en banen

Gratis coureurs (allemaal even snel): Kees Karnemelk, Bella Boerin, Dirk Drop, Fien Friet, Otto Ooievaar, Saar Stroopwafel, Bram Bitterbal, Molenaar Mo, Tess Tulp, Gijs Gouda en **Mijn coureur** (zelf gemaakt).

Specials (te koop met MP): **Meke** (lang, dun, blond), **Meike** (donker haar, dun), **Stan** (kort, donkerbruin en warrig), **Jullian** (kaal en blond), **Melle** (kort lichtblond), **Duuk** (kaal), **Morris** (blond met middenscheiding), **Ridder Kees** en **Ridder Jort** (volledig ridderpak met helm en pluim). Wie met een special racet, heet in de race "Meke (spelersnaam)". Computerkarts gebruiken nooit een special.

| Baan | Plek | Bijzonder |
|---|---|---|
| Zilte Zeeweg | Kustweg | Vuurtoren, strandhuisjes, overstekende krab |
| Poffertjes Pretpark | Pretpark | Reuzenrad, draaimolen, botsauto's |
| Grachtengordel GP | Stadscentrum | Krappe bochten, paaltjes, tram |
| Paddenstoelenpad | Bos | Reuzenpaddenstoelen, egel, vuurvliegjes |
| Containerkade | Haven | Kranen, containers, heftruck |
| IJspegelpas | Sneeuwbaan | Haarspeldbochten, gladde ijsplaten, sneeuwbal |
| Zandstorm Canyon | Woestijn | Snel en breed, cactussen, rolbossen |
| Karnemelk Hoeve | Boerderij | Molen, tulpenvelden, modder, koeien |
| Melkweg Ring | Ruimte (bonus) | Planeten, zwevende melkflessen, meteoriet, ufo |
| Schansenpolder | Polder | Vier schansen over sloten, boostringen, knotwilgen, molens, een trekker dwars over de weg |
| Neonstad Nachtrace | Stad bij nacht | Neonlichten, verlichte flats, boostpoorten in de bochten, taxi's |
| Vulkaan Vuurrit | Vulkaaneiland | Rokende vulkaan, schansen over lavastromen, rollende lavaballen |
| Duinensprong | Strand bij zonsondergang | Megaschansen met ringen, snel en breed |

Alle banen hebben schansen (soms met een boostring erachter) en extra turbostroken.

## Techniek

- **Server**: Node.js met alleen het pakket `ws`. De server is de baas over de race (60 stappen per seconde, 20 updates per seconde naar iedere speler), zodat botsingen voor iedereen hetzelfde zijn.
- **Browser**: Three.js (meegeleverd in `public/vendor`, geen CDN nodig). Fysiek gebaseerde materialen met omgevingslicht uit de lucht (reflecties), filmische kleuren (ACES), zonneschaduw die met de speler meeloopt, een lucht-shader met wolken en afgeronde vormen. Ongeveer 100.000 tot 270.000 driehoeken en 110 tot 380 tekenopdrachten per beeld. Kwaliteit: *Hoog* (echte schaduwen en reflecties op alles, tot 2 pixels per punt), *Normaal* en *Automatisch* (snelle wereld met glimmende karts, zachte schaduwvlekken, hooguit 1,5 pixel per punt), *Laag* (alles zo licht mogelijk). Automatisch zet bij haperen eerst de schaduwen uit en verlaagt daarna de resolutie; de volgende race wordt dan Laag.
- **Schansen**: de hoogte (`y`) zit in de gedeelde fysica, dus server en voorspelling zijn het eens. Karts met meer dan 1,3 m hoogteverschil botsen niet, wie vliegt raakt geen plassen of obstakels.
- **Soepel rijden ondanks vertraging**: je eigen kart wordt in de browser voorspeld (met precies dezelfde code als op de server) en stilletjes gecorrigeerd. Andere karts worden vloeiend tussen updates in getekend (30 updates per seconde, 80 ms buffer). Botsingen met andere karts voorspelt je telefoon zelf: je voelt en ziet de klap meteen, de server bevestigt hem kort daarna.
- **Geluid en muziek** worden live gemaakt met de Web Audio API; er zijn geen geluidsbestanden.
- **Wie ben je?** Bij je eerste bezoek krijgt je telefoon een lange, geheime apparaatsleutel. Die staat in de browser én in een cookie van de server (HttpOnly, 400 dagen, bij elk bezoek verlengd). Aan die sleutel hangen je naam, MP-punten en spullen. Andere spelers zien de sleutel nooit.
- **Reservekopie op de telefoon**: bij elke wijziging (punten, aankoop, uiterlijk) stuurt de server een kopie van je profiel mee, ondertekend met HMAC-SHA256 en `KK_SECRET`. De telefoon bewaart die (`kk-reserve`) en stuurt hem mee bij het verbinden. Kent de server je niet (meer), bijvoorbeeld na een herstart met een lege schijf, dan zet hij je profiel terug. Aangepaste kopieën (meer MP) worden geweigerd.
- **Overzetcode**: in Instellingen maak je een code van 6 tekens (15 minuten geldig, één keer te gebruiken) om je profiel op een nieuwe telefoon te gebruiken.

```
server/            server (http + WebSocket) en opslag
public/index.html  de pagina
public/css/        vormgeving
public/js/         browsercode: render/ (3D), game/ (race, HUD, voorspelling), ui/ (schermen), audio, besturing
public/shared/     code voor server én browser: banen, fysica, items, bots, race, rooms, punten, winkel
public/vendor/     three.js (MIT-licentie)
test/              tests
tools/             baanvoorbeelden tekenen, offline-demo bouwen
```

## Wat getest is, en wat niet

Getest in deze omgeving:

- 25 snelle tests: banen (geen te krappe bochten of overlappende stukken), elke schans op elke baan (lanceert, ring is te halen, geen muur na de landing), vliegen over karts, sloten, fysica, rondes en checkpoints, punten en dagbonus, winkel en betaalbaarheid, specials ("Meke (Jort)"), eigen coureur, inloggen per telefoon (ook via het cookie), overzetcode, reservekopie op de telefoon (terugzetten, vervalste kopie geweigerd), botsingen, titels, toeteren, voorspelling, lobby, herverbinden, opslag in bestand en in (nagebootste) Upstash.
- Een echte race met **10 gelijktijdige spelers** via WebSockets: allemaal gefinisht, zo'n 80 botsingen die iedereen live zag, een speler die wegviel en in dezelfde kart terugkwam, punten 155 → 45 (inclusief dagbonus), winkel, alles bewaard na een herstart van de server, én teruggezet vanaf de telefoon na een herstart met een lege schijf.
- De game in een Chromium-browser met iPhone-, iPhone SE- en Pixel-formaat en aanraakbediening, staand en liggend: naam kiezen, herladen (telefoon onthoudt je), uitnodigingslink, lobby, specials kopen, mijn coureur, alle kartmodellen en hoeden, races en foto's op de banen met de nieuwe graphics (Hoog, Normaal en Laag), een echte sprong over een schans door een ring, toeteren, uitslag met titels, toeschouwen, offline-demo. Zonder fouten in de console.

Niet getest, en waarom:

- **Op een echte iPhone met Safari.** De werkomgeving had alleen een Chromium-browser met software-3D. Safari ondersteunt alles wat de game gebruikt, maar test het even met een paar vrienden voordat je een groot potje plant. Laat het weten als iets er vreemd uitziet.
- **Hoe snel de nieuwe graphics op echte telefoons zijn.** Software-3D zegt daar niets over. Moderne telefoons kunnen dit soort graphics prima aan; hapert het op een oudere telefoon, zet dan Instellingen → Grafische kwaliteit op Laag.
- **Kantelbesturing.** Werkt alleen met een echte bewegingssensor en via HTTPS. Gaat sturen precies verkeerd om, zet dan in Instellingen "Kantelrichting omdraaien" aan.
- **Trillen** werkt op Android, maar iPhones staan trillen vanuit een website niet toe.
- **Geluid op iPhone** valt weg als de stille-modusschakelaar aan staat; dat is een beperking van iOS.

Bewuste keuzes en beperkingen:

- Je punten staan op je telefoon. Wis je de websitegegevens in je browser, dan ben je ook de reservekopie kwijt; maak bij twijfel eerst een overzetcode.
- Wie handig is, kan een oude reservekopie bewaren en die na een herstart van de server terugzetten (bijvoorbeeld van vóór een aankoop). Voor een spel onder vrienden is dat geen probleem; wil je het helemaal dichtzetten, gebruik dan een vaste schijf of Upstash.
- Safari en een icoon op je beginscherm (iPhone) bewaren gegevens apart. Kies één van de twee, of gebruik de overzetcode om je punten mee te nemen.
- Rooms bestaan alleen in het geheugen van de server: bij een herstart stoppen lopende races (punten en spullen blijven bewaard). Kreeg je punten terwijl je offline was en start de server daarna opnieuw voordat je terugkomt, dan kunnen die punten verloren gaan.
- Bescherming tegen valsspelen is basaal (de server rekent alle fysica zelf en beperkt hoeveel invoer je mag sturen). Prima voor vrienden onder elkaar.
