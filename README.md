# Karnemelk Kart

Een originele, kleurrijke arcade-kartgame voor in de browser. Tot 10 vrienden racen live tegen elkaar op dezelfde baan, gewoon vanaf hun telefoon in Safari of Chrome. Geen app nodig.

Alle personages, banen, items, geluiden en afbeeldingen zijn zelf bedacht en worden in code getekend en gesynthetiseerd. Er zitten geen Nintendo- of Mario-onderdelen in.

## Wat zit erin

- **Live multiplayer** voor maximaal 10 spelers (mensen + computerkarts) per room.
- **Privéroom met groepscode** van 4 letters, plus een deelbare link (`https://jouw-site/?room=ABCD`).
- **Lobby** met wie er meedoet, wie klaar is, coureurkeuze, baankeuze, computerkarts en de uitdaging voor de verliezer. De host start de race (en kan spelers verwijderen).
- **Opnieuw deelnemen** na een verbindingsonderbreking: je krijgt automatisch je eigen kart terug (tot 2 minuten). Wie tijdens een race binnenkomt, kijkt mee en doet de volgende race mee.
- **9 banen**: kustweg, pretpark, stadscentrum (grachten), bos, haven, sneeuwbaan, woestijn, boerderij en een bonusbaan in de ruimte. Elk met eigen route, decor, obstakels, bewegende hindernissen, muziek en sfeer.
- **3 rondes** met aftellen, raketstart, live posities, minikaart, finishscherm, uitslag met podium.
- **Botsen**: wie een kart ramt, vertraagt die en duwt hem opzij. Iedereen ziet de botsing (wolkje, geluid, trilling en "BOTS!") en de nieuwe posities live.
- **Driften** met mini-turbo (witte, gele en roze vonken) en **power-ups**: Stroopwafel-turbo, Drie stroopwafels, Kaasschild, Karnemelkplas (glad obstakel) en Klompkanon.
- **Oefenmodus** voor één speler, met 0 tot 9 computerkarts (makkelijk, normaal, moeilijk).
- **Winnaar en verliezer**: de laatste mens krijgt de uitdaging "Een atje karnemelk!". De verliezer of host kan hem overslaan, een andere kiezen of afvinken. De host kan de tekst vooraf aanpassen of uitzetten.
- **MP-punten** na elke race, bewaard per speler (naam + 4-cijferige PIN), ook op een ander apparaat.
- **Winkel** met capes, kartkleuren, bandeneffecten, lichtsporen en overwinningsposes in 5 zeldzaamheden. Alleen uiterlijk, iedereen ziet elkaars spullen in de race.
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
3. **Bewaarde opslag voor de MP-punten.** Standaard schrijft de server naar `data/karnemelk-data.json` (of de map in `DATA_DIR`). Op hosting zonder vaste schijf gebruik je gratis Upstash Redis (zie hieronder).

Eén serverinstantie is genoeg voor flink wat groepjes vrienden; een race met 10 spelers kost de server minder dan 5 ms rekentijd per seconde. Gebruik **één** instantie (niet opschalen naar meerdere), want rooms leven in het geheugen van de server.

### Optie A: Render.com (gratis, makkelijkst)

1. Zet deze map in een GitHub-repository.
2. Maak een gratis account op [render.com](https://render.com) en kies **New → Blueprint**. Selecteer je repository; Render leest `render.yaml` en maakt een webservice.
3. Maak een gratis database op [upstash.com](https://upstash.com) (**Redis → Create database**). Kopieer bij **REST API** de waarden `UPSTASH_REDIS_REST_URL` en `UPSTASH_REDIS_REST_TOKEN`.
4. Vul die twee in bij Render (**Environment**). Zonder Upstash werkt alles ook, maar dan zijn punten weg na elke herstart van de gratis server.
5. Je link wordt iets als `https://karnemelk-kart.onrender.com`. Deel die, of deel vanuit de lobby de link met groepscode.

Let op: een gratis Render-server slaapt na 15 minuten zonder bezoekers. De eerste speler wacht dan ongeveer een minuut; de game probeert vanzelf opnieuw te verbinden. Met een betaald plan (vanaf ongeveer $7 per maand) gebeurt dat niet en kun je ook een vaste schijf gebruiken (`DATA_DIR=/var/data`).

### Optie B: Railway of Fly.io

Beide draaien de meegeleverde `Dockerfile`. Koppel een volume aan `/data` (de Dockerfile zet `DATA_DIR=/data`), dan blijven de punten bewaard. Je kunt ook hier Upstash gebruiken in plaats van een volume.

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
| `UPSTASH_REDIS_REST_URL` | – | Als ingevuld: opslag in Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | – | Hoort bij de URL hierboven |

`/health` geeft de status terug (aantal rooms en spelers), handig voor hostingcontroles.

## Zo speel je

1. Open de link, kies een naam en een PIN van 4 cijfers. Nieuw? Dan krijg je 150 MP welkomstcadeau.
2. **Room maken** geeft een groepscode. Deel de link of laat vrienden de code invullen bij **Meedoen met code**.
3. Kies je coureur. Vrienden tikken op **Ik ben klaar!**; de host kiest de baan en tikt op **Start de race!**
4. Na de race zie je de uitslag, je MP-punten en de uitdaging. De host kan meteen **Opnieuw racen**.

**Besturing op de telefoon** (standaard): je geeft vanzelf gas. Pijltjes linksonder om te sturen (je duim mag tussen links en rechts glijden). Rechtsonder: **DRIFT**, **REM** en het **item**. Tik ook op het itemvakje bovenin om je item te gebruiken.
**Toetsenbord**: pijltjes of WASD, spatie = drift, E of Enter = item.
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

Met 10 vrienden: 1e 120, 2e 109, 3e 98, 4e 87, 5e 76, 6e 64, 7e 53, 8e 42, 9e 31, 10e 20 MP (plus 10 voor de snelste ronde). Met 2 spelers: 72 en 20 MP. Zo levert racen tegen meer echte vrienden meer op, maar verdient iedereen iets.

## Winkel

Alles is alleen uiterlijk. Zeldzaamheden van laag naar hoog: Gewoon, Ongewoon, Zeldzaam, Episch, **Legendarisch**. De Gouden cape is het enige legendarische item en het duurste van de winkel. Kopen met te weinig MP lukt niet (de server controleert dit ook).

| Soort | Items en prijzen |
|---|---|
| Capes | Rode cape 120, Hemelsblauwe cape 120, Oranje feestcape 260, Boerenzakdoek-cape 300, Sterrennacht-cape 560, Regenboogcape 1150, **Gouden cape 2500 (Legendarisch)** |
| Kartkleuren | Melkwit 80, Weidegroen 80, Kauwgomroze 100, Koningsoranje 210, Nachtblauw 210, Koeienvlekken 460, Spiegelchroom 920, Lavagloed 980 |
| Bandeneffecten | Witte velgen 60, Vonkenbanden 230, Sneeuwvlokbanden 240, Neonvelgen 490, Vlammenwielen 1000 |
| Lichtsporen | Melkspoor 100, Neonroze spoor 270, Bliksemspoor 530, Regenboogspoor 1200 |
| Overwinningsposes | Koninklijk zwaaien 90, Klompendans 280, Karnemelk-proost 600, Kartsalto 1300 |

## Coureurs en banen

Coureurs (allemaal even snel): Kees Karnemelk, Bella Boerin, Dirk Drop, Fien Friet, Otto Ooievaar, Saar Stroopwafel, Bram Bitterbal, Molenaar Mo, Tess Tulp en Gijs Gouda.

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

## Techniek

- **Server**: Node.js met alleen het pakket `ws`. De server is de baas over de race (60 stappen per seconde, 20 updates per seconde naar iedere speler), zodat botsingen voor iedereen hetzelfde zijn.
- **Browser**: Three.js (meegeleverd in `public/vendor`, geen CDN nodig) met simpele, platte vormen: 25.000 tot 45.000 driehoeken en 60 tot 300 tekenopdrachten per beeld. Automatische kwaliteit verlaagt de resolutie als een telefoon het niet bijhoudt.
- **Soepel rijden ondanks vertraging**: je eigen kart wordt in de browser voorspeld (met precies dezelfde code als op de server) en stilletjes gecorrigeerd. Andere karts worden vloeiend tussen updates in getekend.
- **Geluid en muziek** worden live gemaakt met de Web Audio API; er zijn geen geluidsbestanden.
- **Opslag**: PIN's worden gehasht (scrypt) bewaard. Na 5 foute PIN's gaat een naam 5 minuten op slot.

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

- 14 snelle tests: banen (geen te krappe bochten of overlappende stukken), fysica, rondes en checkpoints, punten, winkel, botsingen, voorspelling, lobby, herverbinden, opslag in bestand en in (nagebootste) Upstash.
- Een echte race met **10 gelijktijdige spelers** via WebSockets: allemaal gefinisht, zo'n 80 botsingen die iedereen live zag, een speler die wegviel en in dezelfde kart terugkwam, punten 130 → 20, winkel, en alles bewaard na een herstart van de server.
- De game in een Chromium-browser met iPhone-formaat en aanraakbediening, staand en liggend: inloggen, uitnodigingslink, lobby, races op alle 9 banen, items, uitslag, winkel, toeschouwen, offline-demo. Zonder fouten in de console.

Niet getest, en waarom:

- **Op een echte iPhone met Safari.** De werkomgeving had alleen een Chromium-browser met software-3D. Safari ondersteunt alles wat de game gebruikt, maar test het even met een paar vrienden voordat je een groot potje plant. Laat het weten als iets er vreemd uitziet.
- **Kantelbesturing.** Werkt alleen met een echte bewegingssensor en via HTTPS. Gaat sturen precies verkeerd om, zet dan in Instellingen "Kantelrichting omdraaien" aan.
- **Trillen** werkt op Android, maar iPhones staan trillen vanuit een website niet toe.
- **Geluid op iPhone** valt weg als de stille-modusschakelaar aan staat; dat is een beperking van iOS.

Bewuste keuzes en beperkingen:

- Inloggen gaat met naam + 4-cijferige PIN, geen e-mail. Een vergeten PIN kun je niet zelf herstellen; de beheerder kan het profiel uit het opslagbestand halen.
- Rooms bestaan alleen in het geheugen van de server: bij een herstart stoppen lopende races (punten en spullen blijven bewaard).
- Bescherming tegen valsspelen is basaal (de server rekent alle fysica zelf en beperkt hoeveel invoer je mag sturen). Prima voor vrienden onder elkaar.
