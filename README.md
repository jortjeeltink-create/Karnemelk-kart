# De Spelkeet

De Spelkeet is een verzameling spellen voor een avond met vrienden, ieder op zijn eigen telefoon: de kartgame **Karnemelk Kart** en acht tafelspellen (kaart-, dobbel-, bord- en rollenspellen). Iemand maakt een tafel en deelt de code; de rest doet mee. Geen app nodig, maar De Spelkeet kan ook als app in de Google Play Store (zie [PLAY-STORE.md](PLAY-STORE.md)).

Karnemelk Kart is een originele, kleurrijke arcade-kartgame voor in de browser. Tot 10 vrienden racen live tegen elkaar op dezelfde baan, gewoon vanaf hun telefoon in Safari of Chrome. Alle personages, banen, items, geluiden en afbeeldingen zijn zelf bedacht en worden in code getekend en gesynthetiseerd.

## Wat zit erin

- **De Spelkeet** (de hoofdpagina, `/`): een scrollpagina met al de spellen: Karnemelk Kart (`/kart`), Bussen, Boer zoekt vrouw, Mexen, Pak de dealer, Paardenrace, Rotonde, Mijnenveld en Borrelbord. Zet je de site als app op je beginscherm, dan heet hij **De Spelkeet**, met een eigen logo (een glas bier in een neonring met de kleur van elk spel); deel je de link, dan zie je die naam en een plaatje met alle spellen. Vanuit elk spel ga je terug naar De Spelkeet.
- **Oude namen en adressen**: De Spelkeet heette eerst Speelhal, toen Rondje en daarna ATJE; de kartgame heette Mario Bak, Pak de dealer heette Fuck the dealer en Borrelbord heette Zuipbord; `/zuipbord` stuurt door naar `/borrelbord`. Weerwolven (later Wolvennacht), Mega Ball, Stock Market Trainer en Rode Zone zijn van de site af; hun oude adressen sturen door naar de hoofdpagina.
- **Live multiplayer** voor maximaal 10 spelers (mensen + computerkarts) per room.
- **Privéroom met groepscode** van 4 letters, plus een deelbare link (`https://jouw-site/kart?room=ABCD`; oude links met `/?room=ABCD` werken ook nog).
- **Lobby** met wie er meedoet, wie klaar is, coureurkeuze, baankeuze, computerkarts en de uitdaging voor de verliezer. De host start de race (en kan spelers verwijderen).
- **Opnieuw deelnemen** na een verbindingsonderbreking: je krijgt automatisch je eigen kart terug (tot 2 minuten). Wie tijdens een race binnenkomt, kijkt mee en doet de volgende race mee.
- **13 banen**: kustweg, pretpark, stadscentrum (grachten), bos, haven, sneeuwbaan, woestijn, boerderij, een bonusbaan in de ruimte, en nieuw: Schansenpolder, Neonstad Nachtrace, Vulkaan Vuurrit en Duinensprong. Elk met eigen route, decor, obstakels, bewegende hindernissen, muziek en sfeer.
- **Schansen en boostringen**: rijd met vaart over een schans en je vliegt, ook over andere karts, plassen en obstakels heen. Een mooie landing geeft een kleine turbo, en door een gouden boostring krijg je een flinke turbo. Op sommige banen spring je over sloten of lavastromen (erdoorheen rijden remt je flink af). Elke baan heeft nu ook meer turbostroken.
- **Mooie, realistischere graphics**: filmisch licht, echte schaduwen van karts en bomen, reflecties in lak, water en metaal, een lucht met drijvende wolken, heuvels aan de horizon, graspollen langs de weg, ronde vormen en nieuwe bomen. Bij "Laag" (Instellingen) staat alles zuinig voor oudere telefoons.
- **3 rondes** met aftellen, raketstart, live posities, minikaart, finishscherm, uitslag met podium.
- **Botsen**: wie een kart ramt, vertraagt die en duwt hem opzij. Iedereen ziet de botsing (wolkje, geluid, trilling en "BOTS!") en de nieuwe posities live.
- **Driften** met mini-turbo (witte, gele en roze vonken) en **power-ups**: Stroopwafel-turbo, Drie stroopwafels, Kaasschild, Karnemelkplas (glad obstakel) en Klompkanon.
- **Inhaalhulp** (zoals in GTA): wie verder achter ligt, rijdt een tikje harder. De koploper is het traagst, elke plek daarachter haalt 2% meer topsnelheid, tot hooguit 10% voor wie ver achter ligt. Zo kun je altijd nog inhalen. Het geldt voor iedereen die nog rijdt, ook voor de computerkarts.
- **Oefenmodus** voor één speler, met 0 tot 9 computerkarts (makkelijk, normaal, moeilijk).
- **Winnaar en verliezer**: de laatste mens krijgt de uitdaging "Een atje karnemelk!". De verliezer of host kan hem overslaan, een andere kiezen of afvinken. De host kan de tekst vooraf aanpassen of uitzetten.
- **Het rad**: met minstens 2 mensen ziet de winnaar "Je bent de winnaar!" en tikt hij op wie er óók een atje karnemelk moet doen. Daarna draait bij iedereen tegelijk een rad met alle namen, dat stopt op die persoon. Kiest de winnaar niet binnen 30 seconden, dan beslist het rad zelf. De verliezer moet sowieso.
- **Geen wachtwoord of PIN**: je kiest alleen een naam. Je telefoon onthoudt je, en je MP-punten en spullen blijven op die telefoon. Nieuwe telefoon? Met een overzetcode (Instellingen) neem je alles mee.
- **MP-punten** na elke race, plus een **dagbonus** van 25 MP voor je eerste uitgereden race van de dag.
- **Specials**: Sjors (lichtdonker haar), Wim, Stef, Flip, Koen, Freek, Ridder Kees en Ridder Roest (allebei in een volledig ridderpak) koop je met MP-punten. In de race heet je dan bijvoorbeeld **Flip (Sanne)**, zodat je meerdere Flips uit elkaar houdt.
- **Mijn coureur**: maak je eigen coureur met huidskleur, haar, haarkleur, shirt, lengte, bouw, bril en snor of baard.
- **Winkel** met specials, andere karts (o.a. een Roze droomkart, Tractorkart, Badkuip-kart en Monstertruck), hoeden, capes, kartkleuren, bandeneffecten, lichtsporen en overwinningsposes in 5 zeldzaamheden. Alles is betaalbaar: een special heb je na een paar races. Alleen uiterlijk, iedereen ziet elkaars spullen in de race.
- **Langs de weg**: tribunes met juichend publiek, reclameborden met grappige teksten, bochtpijlen, bandenstapels, vlaggen, pionnen en per baan eigen spullen (fietsen in de stad, melkbussen en schapen op de boerderij, surfplanken aan de kust, ...).
- **Toeteren**: met de TOET-knop toeter je naar anderen in de buurt.
- **Titels na de race**: Botskampioen, Pechvogel, Itemkoning en Driftkoning.
- **Instellingen**: muziek, effecten, alles stil, besturing (knoppen, schuifbalk of kantelen), automatisch gas, linkshandig, trillen, grafische kwaliteit, namen en minikaart.
- **Bussen** (via De Spelkeet, of los op `/bussen`): het kaartspel bussen, online met 2 tot 9 vrienden, ieder op zijn eigen telefoon. Zet de link op je beginscherm (iPhone: Deel → Zet op beginscherm; Android: menu → Toevoegen aan startscherm), dan staat Bussen er als eigen app met een eigen icoon die meteen Bussen opent. Iemand maakt een tafel en deelt de code van 4 letters of de link (`/bussen/ABCD`); de rest doet mee. Het ziet eruit als een pokertafel: groen vilt, de spelers rondom (jij altijd onderaan) en de kaarten in het midden.
  - **Vragenronde**: om de beurt rood of zwart, hoger of lager, binnen of buiten en "heb je het vormpje al?" (komt de vorm van je vierde kaart al voor in je hand; 1 tot 4 slokken). Fout is drinken, goed is niks. Heb je bij die laatste vraag drie verschillende vormen, dan mag je ook **Disco** kiezen: wordt je vierde kaart de ontbrekende vorm, dan drinkt de rest 3 slokken. Disco mis telt als fout.
  - **Slokken**: krijg je slokken, dan kies je op je telefoon **Nu doen** of **Sparen**. Gespaarde slokken komen terug aan het eind van de vragenronde en van de piramide (weer sparen mag), en aan het eind van het spel moeten ze op. Bovenin en bij je naam zie je altijd hoeveel je er nog hebt staan.
  - **Piramide**: 11 kaarten zoals op tafel: onderaan één, dan rijen van 4, 3 en 2, en bovenin één. De host draait ze om en iedereen ziet tegelijk welke kaart open ligt. Wie dezelfde waarde heeft, tikt zelf zijn kaart aan om hem weg te leggen (voordat de volgende kaart om gaat) en deelt per kaart uit. Elke rij is 1, 1, 2, 2 of 3 slokken waard (van onder naar boven); een kaart die dwars ligt telt dubbel, dus onderin 2 en bovenin 6. Uitdelen gaat door aan tafel de namen aan te tikken en op Uitdelen te tikken; daarna ziet iedereen wie er moet drinken. Je eigen kaarten zie je alleen op je eigen telefoon.
  - **De bus**: wie de meeste kaarten overhoudt moet erin. Bij gelijkspel kiest ieder een dichte kaart; wie de laagste trekt, moet de bus in (weer gelijk: opnieuw kiezen). In de bus raad je hoger of lager tot het eind (4, 5 of 7 kaarten, de host kiest). Fout: zoveel slokken als de hoeveelste gok het was. Heb je in de bus 10 slokken gehad, dan mag je er ook uit.
  - Valt iemand weg, dan kan de host even voor die speler spelen; wie terugkomt, zit vanzelf weer op zijn eigen plek. Na afloop: titels (Buschauffeur, Waarzegger, Uitdeler, Pechvogel, Spaarpot, Discokoning, Piramidekoning) en Nog een potje.
- **Boer zoekt vrouw** (via De Spelkeet, of los op `/boer`, ook als eigen app op het beginscherm): het drankspel, online met 3 tot 10 vrienden, ieder op zijn eigen telefoon, aan dezelfde groene tafel als Bussen. Iemand maakt een tafel en deelt de code of de link (`/boer/ABCD`).
  - Iedereen krijgt stiekem een rol op zijn telefoon, met een tekening: één **boer**, één **vrouw** en de rest **burgers**. Je rol staat na het verdelen even in beeld en gaat dan dicht; tik op het kaartje om nog eens te kijken.
  - De boer begint wanneer hij wil: ogen dicht, zijn telefoon telt af en tikt de seconden (standaard 8; de host kiest 6, 7, 8 of 10). Op elke telefoon klinkt een startsein, dus niemand ziet aan een scherm wie de vrouw is. De vrouw drinkt intussen zo snel mogelijk een van de twee glazen leeg.
  - Na het tellen klinkt op elke telefoon een **pling**: de boer doet zijn ogen open en wijst de vrouw aan. Goed geraden: de vrouw drinkt ook het tweede glas. Fout: de boer drinkt het. Daarna ziet iedereen alle rollen.
  - De host verdeelt de rollen voor de volgende ronde. Wie later aanschuift, doet mee vanaf de volgende ronde. In het menu staat de stand: glazen leeggedronken, hoe vaak iemand boer was en hoe vaak die goed raadde.
- **Mexen** (via De Spelkeet, of los op `/mexen`, ook als eigen app op het beginscherm): het dobbelspel, online met 2 tot 10 vrienden, aan dezelfde groene tafel. Iemand maakt een tafel en deelt de code of de link (`/mexen/ABCD`).
  - Om de beurt gooi je met twee stenen door op je telefoon op Gooi te tikken; iedereen ziet de stenen live uit de beker rollen. Je laatste worp telt: na elke worp kies je **Blijf staan** of **Nog eens**.
  - De eerste van de ronde mag tot 3 keer gooien; hoe vaak hij gooit, zo vaak mag de rest ook. Mex (een 2 en een 1) is het hoogst en maakt je beurt meteen af, dan de dubbels (600 tot 100), dan 65 tot en met 31.
  - Wie de laagste worp heeft, drinkt de inzet (1, 2 of 3 slokken, de host kiest). Elke Mex in de ronde verdubbelt de slokken, tot hooguit 6. Bij gelijk gooien de laagsten nog één keer (afgooien). Wie verloor, begint de volgende ronde.
  - Valt iemand weg, dan gooit de host voor die speler. Wie later aanschuift, gooit mee vanaf de volgende ronde. In het menu staat de stand: slokken, verloren rondes en Mexen.
- **Pak de dealer** (via De Spelkeet, of los op `/dealer`, ook als eigen app op het beginscherm): het kaartspel, online met 2 tot 10 vrienden, aan dezelfde groene tafel. Iemand maakt een tafel en deelt de code of de link (`/dealer/ABCD`). Bij de start wordt er een willekeurige dealer gekozen.
  - Alleen de dealer ziet de bovenste kaart, op zijn eigen telefoon. Wie aan de beurt is, raadt met dertien knoppen (2 tot en met aas). In één keer goed: de dealer drinkt 5. Fout: iedereen ziet of de kaart hoger of lager is, en je raadt nog één keer. Nu goed: de dealer drinkt 3. Weer fout: jij drinkt het verschil tussen je gok en de kaart, hooguit 5.
  - De kaart gaat open en op tafel zie je per waarde hoeveel kaarten er al gespeeld zijn. Speelt de dealer drie spelers achter elkaar uit, dan gaat de stapel naar de volgende speler. Is de stapel op, dan komen er nieuwe kaarten.
  - Valt wie aan de beurt is weg, dan is de volgende aan de beurt. Wie later aanschuift, raadt mee. In het menu staat de stand: slokken, goed geraden, hoe vaak iemand dealer was en hoeveel spelers die uitspeelde.
- **Paardenrace** (via De Spelkeet, of los op `/paardenrace`, ook als eigen app op het beginscherm): het drankspel met de vier azen als paarden, online met 2 tot 10 vrienden, aan dezelfde groene tafel. Iemand maakt een tafel en deelt de code of de link (`/paardenrace/ABCD`).
  - **Inzetten**: iedereen kiest op zijn telefoon een aas (harten, ruiten, klaveren of schoppen) en zet 1 tot 5 slokken in. Meer spelers mogen op hetzelfde paard. Is iedereen aan tafel klaar, dan begint de race vanzelf; de host kan ook eerder beginnen met wie al klaar is.
  - **De race**: op het vilt ligt de baan, met links zeven dichte kaarten en per aas een baan van start tot finish. Om de beurt tik je op Trek een kaart: het paard met die vorm galoppeert een stap vooruit. Zijn alle vier de paarden langs een dichte kaart, dan gaat die open en moet het paard met die vorm een stap terug. Iedereen ziet de paarden tegelijk lopen.
  - **Finish**: het eerste paard voorbij de zevende kaart wint. Wie op een ander paard zette, drinkt zijn eigen inzet plus de hoogste inzet op het winnende paard, samen hooguit 8. Wint een paard waar niemand op zette, dan drinkt iedereen alleen zijn eigen inzet. Daarna start de host de volgende race; je paard en inzet blijven staan.
  - Valt wie aan de beurt is weg, dan trekt de volgende. Wie later aanschuift, zet in voor de volgende race. In het menu staat de stand: slokken, gewonnen races en het aantal races.
- **Rotonde** (via De Spelkeet, of los op `/rotonde`, ook als eigen app op het beginscherm): het kaartspel (ook wel Atoombommen, Spinnenwebben of Kernreactor), online met 2 tot 10 vrienden, aan dezelfde groene tafel. Iemand maakt een tafel en deelt de code of de link (`/rotonde/ABCD`); de host begint.
  - Op het vilt liggen 37 dichte kaarten als een zon. De kleur van de achterkant zegt hoeveel slokken een kaart waard is: 16 rode in de buitenste ring (1), daarbinnen 8 oranje (2) en 4 blauwe (3), 8 groene rond het midden (4) en de paarse in het midden (6).
  - Wie aan de beurt is, tikt een dichte kaart aan en gokt rood of zwart. Goed: de waarde gaat in de pot, en je kiest Doorgeven of Nog eentje gokken (één extra keer, om de pot groter te maken). Fout: je drinkt de waarde van de kaart plus de hele pot (hooguit 8), de pot is weer leeg en je probeert het opnieuw.
  - Een omgedraaide kaart blijft open liggen. Liggen alle kaarten open, dan is de rotonde leeg en legt de host een nieuwe; de stand blijft staan. Valt wie aan de beurt is weg, dan is de volgende aan de beurt. In het menu staat de stand: slokken, goed en fout gegokt, en de meeste slokken in één keer.
- **Mijnenveld** (via De Spelkeet, of los op `/mijnenveld`, ook als eigen app op het beginscherm): het dobbel- en kaartspel, online met 2 tot 10 vrienden, aan dezelfde groene tafel. Iemand maakt een tafel en deelt de code of de link (`/mijnenveld/ABCD`); de host kiest in de lobby hoeveel slokken een mijn is (2, 3 of 5) en gooit als eerste.
  - Op het vilt liggen 36 dichte kaarten in een veld van 6 bij 6, met 8 verstopte mijnen. Wie aan de beurt is, gooit de steen twee keer: eerst voor de kolom (van links), dan voor de rij (van boven). Ligt die kaart al open, dan wordt het de eerstvolgende dichte kaart.
  - Ligt er een mijn op die kaart: boem. Je drinkt de slokken per mijn (hooguit 6 in één keer) en legt de mijn ergens anders neer: op een kaart of tussen twee kaarten (dan raakt hij ze allebei). Verlegde mijnen ziet iedereen; van de verstopte zie je alleen hoeveel er nog liggen.
  - Daarna gok je rood of zwart en gaat de kaart open. Goed: de volgende is aan de beurt. Fout: 2 slokken en je gooit opnieuw. Zo speelt ook de online versie van dark-mark.com. Liggen alle kaarten open, dan legt de host een nieuw veld; de stand blijft staan. Valt wie aan de beurt is weg, dan is de volgende aan de beurt (moest hij nog een mijn leggen, dan doet de server dat). In het menu staat de stand: slokken, mijnen, goed en fout gegokt.
- **Borrelbord** (via De Spelkeet, of los op `/borrelbord`, ook als eigen app op het beginscherm): het partyspel als ganzenbord, online met 2 tot 10 vrienden. Iemand maakt een tafel en deelt de code of de link (`/borrelbord/ABCD`); de host gooit als eerste.
  - Een eigen stijl: een vrolijk spelbord van 7 bij 7 met gekleurde vakjes op een houten tafel, pionnen in de kleur van elke speler die vakje voor vakje lopen, en een grote steen om te gooien.
  - 48 vakjes van start tot finish. Om de beurt gooi je met je telefoon en loopt je pion zoveel vakjes. Rood: jij drinkt. Groen: geef slokken aan wie jij kiest. Oranje: iedereen, je buren of de laatste drinkt. Paars: een vraag voor de groep ("Wie single is, drinkt 2") of bedenk een regel. Geel: dubbel of niks, een duel (allebei gooien, de laagste drinkt 2), een drinkmaatje (die drinkt mee als jij drinkt) of van plek ruilen.
  - Zoals ganzenbord: op de gans loop je nog een keer zoveel verder, de brug brengt je naar 12, in het café drink je 1 en sla je een beurt over, in de put zit je vast tot een ander erin valt, het doolhof zet je 5 terug en de doodskop stuurt je terug naar start. Op vakje 47 drink je 2. Er zijn ook een paar rustvakjes waar niks gebeurt.
  - Gooi je verder dan de finish, dan sta je er ook op. Wie als eerste op de finish staat, wint en kiest wie er 3 slokken drinkt. Wie dan het verst achter staat, drinkt 2. Daarna start de host een nieuw potje; de stand blijft.
  - Het aantal slokken is zo gekozen dat het te doen blijft: gemiddeld zo'n 10 per speler per potje, en een potje duurt ongeveer 10 worpen per speler (de vragen en regels niet meegeteld).
  - Valt wie aan de beurt is weg, dan is de volgende aan de beurt (moest hij nog iemand kiezen, dan kiest de telefoon). Wie later aanschuift, begint op start. Tik op een vakje om te zien wat het doet.
- **18+ en verantwoord spelen**: de eerste keer vraagt elke pagina of je 18 of ouder bent (`public/js/poort.js`), met een paar regels over verantwoord spelen en de voorwaarden. Drinken is nooit verplicht: een slok mag ook water, fris of karnemelk zijn. Volgens de regels van Google Play over alcohol: geen enkel spel laat een glas leegdrinken (behalve Boer zoekt vrouw, zie [PLAY-STORE.md](PLAY-STORE.md)), en elk spel heeft een maximum aantal slokken per keer.
- **Uitleg met plaatjes**: bij elk spel staat een knop Uitleg (op de hoofdpagina, op het startscherm van het spel, in het menu en bovenaan de spelregels). Die opent een diashow met screenshots uit het echte spel en per stap een korte tekst, met de slokken erbij (`public/js/uitleg.js`, plaatjes in `public/img/uitleg/`). Vegen of op Volgende tikken; de terugknop van Android sluit hem.
- **De slokkenkaart**: moet jij drinken, dan zie je het groot op je eigen telefoon: hoeveel slokken (of bij Boer zoekt vrouw het glas), en waarom (bijvoorbeeld "41 was de laagste worp" of "De kaart is 4 waard en er zat 6 in de pot"). Met trillen; weg met een tik op Gedronken. Zo werkt het in Mexen, Boer zoekt vrouw, Pak de dealer, Paardenrace, Rotonde, Mijnenveld en Borrelbord (`public/js/slok.js`). Bussen had dit al, met nu doen of sparen.
- **Spelen op een iPhone** (`/iphone`): De Spelkeet staat niet in de App Store, maar werkt in Safari. Deze pagina laat stap voor stap zien hoe je De Spelkeet op je beginscherm zet (Deel → Zet op beginscherm → Voeg toe), met plaatjes. Op een Android-telefoon (of in de app uit de Play Store) staan er knoppen om de link te delen met vrienden met een iPhone, ook via WhatsApp. Op de hoofdpagina staat de link bovenaan en onderaan.
- **Privacy, voorwaarden en melden**: `/privacy`, `/voorwaarden` en `/melden` (een speler, naam of iets anders melden; de meldingen staan in de opslag en in het logboek). Grove namen en uitdagingen worden geweigerd (`public/shared/namen.js`); de host kan spelers van tafel halen. In Karnemelk Kart wis je je gegevens via Instellingen → Mijn gegevens wissen.
- **Als app in de Play Store**: De Spelkeet is een PWA met een offline-pagina (`/sw.js`), iconen voor Android en de koppeling `/.well-known/assetlinks.json`. Hoe je hem in de Play Store zet, staat in [PLAY-STORE.md](PLAY-STORE.md); het icoon, de banner, screenshots en teksten staan in `store/`.
- Alles in het Nederlands.

## Snel starten op je eigen computer

Je hebt [Node.js](https://nodejs.org) versie 18.17 of nieuwer nodig (aangeraden: 22).

```bash
npm install
npm start
```

Open daarna **http://localhost:3000** (De Spelkeet; de kartgame staat op `/kart`). In het venster van de server zie je ook een regel als:

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

De Spelkeet is één klein Node.js-programma dat zowel de game-bestanden levert als de live multiplayer regelt via WebSockets. Daarom heb je nodig:

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
| `CONTACT_EMAIL` | – | Het e-mailadres op het privacybeleid, de voorwaarden en het meldformulier |
| `MELD_SLEUTEL` | – | Geheim woord om de meldingen te lezen op `/api/meldingen?sleutel=…`. Niet ingevuld: niet te lezen (wel in het logboek) |
| `ANDROID_PACKAGE` | – | Pakketnaam van de app in de Play Store, voor `/.well-known/assetlinks.json` |
| `ANDROID_SHA256` | – | Vingerafdruk(ken) (SHA-256) van de ondertekeningssleutel van de app, gescheiden door komma's |
| `REDIRECT_TO` | – | Verhuisd naar een nieuw adres? Zet hier het nieuwe adres (bijvoorbeeld `https://spelkeet.onrender.com`) op de oude server, dan stuurt die iedereen door, met de rest van de link erbij. `/health` blijft gewoon werken |

**Naar een ander webadres verhuizen** (bijvoorbeeld van `karnemelk-kart.onrender.com` naar `spelkeet.onrender.com`): het adres van een bestaande service op Render kun je niet hernoemen. Maak daarom een nieuwe gratis Web Service met dezelfde repository en de nieuwe naam, en neem bij Environment de `KK_SECRET` van de oude service over (anders herkent de nieuwe server de reservekopieën op de telefoons niet en zijn de MP-punten weg). Werkt het nieuwe adres, zet dan `REDIRECT_TO` op de oude service, en pas het adres van het deelplaatje (`og:image` in `public/speelhal.html`) aan.

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
| Specials | Allemaal 250: Sjors, Wim, Stef, Flip, Koen, Freek, Ridder Kees, Ridder Roest (na 5 online races heb je er altijd genoeg voor, ook als je steeds laatste wordt). |
| Capes | Rode cape 50, Hemelsblauwe cape 50, Oranje feestcape 110, Boerenzakdoek-cape 130, Sterrennacht-cape 220, Regenboogcape 380, **Gouden cape 900 (Legendarisch)** |
| Karts | Bakfietskart 70, Roze droomkart 140, Tractorkart 160, Melkwagen 220, Badkuip-kart 240, Klompkart 320, Monstertruck 380, Raketkart 450 |
| Kartkleuren | Melkwit 30, Weidegroen 30, Kauwgomroze 40, Koningsoranje 80, Nachtblauw 80, Koeienvlekken 180, Spiegelchroom 300, Lavagloed 320 |
| Hoeden | Feestmuts 40, Pet achterstevoren 50, Bloemenkrans 100, Koptelefoon 110, Kaaspunthoed 200, Vikinghelm 230, Melkpakhoed 300, Kroon 400 |
| Bandeneffecten | Witte velgen 25, Vonkenbanden 90, Sneeuwvlokbanden 95, Neonvelgen 190, Vlammenwielen 340 |
| Lichtsporen | Melkspoor 40, Neonroze spoor 110, Bliksemspoor 210, Regenboogspoor 400 |
| Overwinningsposes | Koninklijk zwaaien 35, Klompendans 110, Karnemelk-proost 220, Kartsalto 420 |

## Coureurs en banen

Gratis coureurs (allemaal even snel): Kees Karnemelk, Bella Boerin, Dirk Drop, Fien Friet, Otto Ooievaar, Saar Stroopwafel, Bram Bitterbal, Molenaar Mo, Tess Tulp, Gijs Gouda en **Mijn coureur** (zelf gemaakt).

Specials (te koop met MP): **Sjors** (kort, lichtdonker haar), **Wim** (kort, donkerbruin en warrig), **Stef** (kort geschoren en blond), **Flip** (kort lichtblond), **Koen** (kaal), **Freek** (blond met middenscheiding), **Ridder Kees** en **Ridder Roest** (volledig ridderpak met helm en pluim). Wie met een special racet, heet in de race "Flip (spelersnaam)". Computerkarts gebruiken nooit een special. (Vroeger hadden de specials de namen van vrienden; wie er een had, houdt hem.)

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
- **Bussen**, **Boer zoekt vrouw**, **Mexen**, **Pak de dealer**, **Paardenrace**, **Rotonde**, **Mijnenveld** en **Borrelbord** gebruiken elk een eigen WebSocket-kanaal (`/ws/bussen`, `/ws/boer`, `/ws/mexen`, `/ws/dealer`, `/ws/paardenrace`, `/ws/rotonde`, `/ws/mijnenveld`, `/ws/zuipbord`) op dezelfde server, met dezelfde tafels (`tafels.js`): een code, meedoen, terugkomen op je eigen plek en een host. Bussen: De server houdt het potje bij en stuurt elke telefoon alleen wat die mag zien: je eigen kaarten, de open kaarten op tafel en de stand. Dichte kaarten en de stapel verlaten de server niet. Tafels leven in het geheugen; een tafel zonder verbonden spelers verdwijnt na een half uur.
- **Browser**: Three.js (meegeleverd in `public/vendor`, geen CDN nodig). Fysiek gebaseerde materialen met omgevingslicht uit de lucht (reflecties), filmische kleuren (ACES), zonneschaduw die met de speler meeloopt, een lucht-shader met wolken en afgeronde vormen. Ongeveer 100.000 tot 270.000 driehoeken en 110 tot 380 tekenopdrachten per beeld. Kwaliteit: *Hoog* (echte schaduwen en reflecties op alles, tot 2 pixels per punt), *Normaal* en *Automatisch* (snelle wereld met glimmende karts, zachte schaduwvlekken, hooguit 1,5 pixel per punt), *Laag* (alles zo licht mogelijk). Automatisch zet bij haperen eerst de schaduwen uit en verlaagt daarna de resolutie; de volgende race wordt dan Laag.
- **Schansen**: de hoogte (`y`) zit in de gedeelde fysica, dus server en voorspelling zijn het eens. Karts met meer dan 1,3 m hoogteverschil botsen niet, wie vliegt raakt geen plassen of obstakels.
- **Soepel rijden ondanks vertraging**: je eigen kart wordt in de browser voorspeld (met precies dezelfde code als op de server) en stilletjes gecorrigeerd. Andere karts worden vloeiend tussen updates in getekend (30 updates per seconde, 80 ms buffer). Botsingen met andere karts voorspelt je telefoon zelf: je voelt en ziet de klap meteen, de server bevestigt hem kort daarna.
- **Geluid en muziek** worden live gemaakt met de Web Audio API; er zijn geen geluidsbestanden.
- **Wie ben je?** Bij je eerste bezoek krijgt je telefoon een lange, geheime apparaatsleutel. Die staat in de browser én in een cookie van de server (HttpOnly, 400 dagen, bij elk bezoek verlengd). Aan die sleutel hangen je naam, MP-punten en spullen. Andere spelers zien de sleutel nooit.
- **Reservekopie op de telefoon**: bij elke wijziging (punten, aankoop, uiterlijk) stuurt de server een kopie van je profiel mee, ondertekend met HMAC-SHA256 en `KK_SECRET`. De telefoon bewaart die (`kk-reserve`) en stuurt hem mee bij het verbinden. Kent de server je niet (meer), bijvoorbeeld na een herstart met een lege schijf, dan zet hij je profiel terug. Aangepaste kopieën (meer MP) worden geweigerd. Elke wijziging krijgt een hoger versienummer (`rev`): speel je op twee telefoons (of in Safari én via het beginscherm), dan wint altijd de nieuwste kopie, ook als de server al een oudere had teruggezet. Andere schermen met hetzelfde profiel krijgen elke wijziging meteen mee.
- **Overzetcode**: in Instellingen maak je een code van 6 tekens (15 minuten geldig, één keer te gebruiken) om je profiel op een nieuwe telefoon te gebruiken.

```
server/            server (http + WebSocket) en opslag
public/speelhal.html  De Spelkeet, de hoofdpagina met al de spellen
public/privacy.html, voorwaarden.html, melden.html  privacybeleid, voorwaarden en het meldformulier (/privacy, /voorwaarden, /melden)
public/offline.html, sw.js  de pagina als er geen internet is, en de service worker die hem laat zien
public/js/poort.js  de poort (18+) op elke speelpagina
public/js/uitleg.js  de uitleg als diashow bij elk spel (plaatjes in public/img/uitleg/)
public/js/slok.js  de slokkenkaart: hoeveel jij moet drinken, groot op je eigen telefoon
public/iphone.html  spelen op een iPhone: De Spelkeet op je beginscherm zetten, en de link delen (/iphone)
store/             het icoon, de banner, screenshots en teksten voor de Play Store
public/index.html  de kartgame (/kart)
public/bussen.html  Bussen, het online kaartspel (praat met de server via /ws/bussen)
public/boer.html    Boer zoekt vrouw, het online drankspel (praat met de server via /ws/boer)
public/mexen.html   Mexen, het online dobbelspel (praat met de server via /ws/mexen)
public/dealer.html  Pak de dealer, het online kaartspel (praat met de server via /ws/dealer)
public/paardenrace.html  Paardenrace, het online drankspel met de azen als paarden (praat met de server via /ws/paardenrace)
public/rotonde.html  Rotonde, het online kaartspel met de zon van 37 kaarten (praat met de server via /ws/rotonde)
public/mijnenveld.html  Mijnenveld, het online dobbel- en kaartspel met het veld van 6 bij 6 (praat met de server via /ws/mijnenveld)
public/zuipbord.html  Borrelbord, het partyspel als ganzenbord (/borrelbord; praat met de server via /ws/zuipbord)
public/css/        vormgeving
public/js/         browsercode: render/ (3D), game/ (race, HUD, voorspelling), ui/ (schermen), audio, besturing
public/shared/     code voor server én browser: banen, fysica, items, bots, race, rooms, punten, winkel, tafels.js (online tafels met een code), bussen.js + bushub.js (Bussen), boer.js + boerhub.js (Boer zoekt vrouw), mex.js + mexhub.js (Mexen), ftd.js + ftdhub.js (Pak de dealer), paard.js + paardhub.js (Paardenrace), rotonde.js + rotondehub.js (Rotonde), mijnenveld.js + mijnenveldhub.js (Mijnenveld) en zuipbord.js + zuipbordhub.js (Borrelbord)
public/vendor/     three.js (MIT-licentie)
test/              tests
tools/             baanvoorbeelden tekenen, offline-demo bouwen
```

## Wat getest is, en wat niet

Getest in deze omgeving:

- 27 snelle tests: banen (geen te krappe bochten of overlappende stukken), elke schans op elke baan (lanceert, ring is te halen, geen muur na de landing), vliegen over karts, sloten, fysica, rondes en checkpoints, punten en dagbonus, winkel en betaalbaarheid, specials ("Flip (Sanne)"), eigen coureur, inloggen per telefoon (ook via het cookie), overzetcode, reservekopie op de telefoon (terugzetten, vervalste kopie geweigerd, nieuwste kopie wint bij twee telefoons), botsingen, titels, toeteren, voorspelling, lobby, herverbinden, opslag in bestand en in (nagebootste) Upstash.
- Een echte race met **10 gelijktijdige spelers** via WebSockets: allemaal gefinisht, zo'n 80 botsingen die iedereen live zag, een speler die wegviel en in dezelfde kart terugkwam, punten 155 → 45 (inclusief dagbonus), winkel, alles bewaard na een herstart van de server, én teruggezet vanaf de telefoon na een herstart met een lege schijf.
- **Bussen**: 20 snelle tests voor de spelregels en de tafels (vragen, paal, disco, uitdelen, nu doen of sparen per ronde, piramide, kaart kiezen bij gelijkspel, de bus, 40 hele potjes met 9 spelers, meedoen met code, opnieuw verbinden, de host die invalt, wat elke telefoon wel en niet te zien krijgt), plus een test met twee echte WebSocket-verbindingen. In Chromium een heel potje gespeeld met drie telefoons tegelijk (iPhone en iPhone SE), inclusief uitdelen, sparen, een gelijkspel om de bus, wegvallen en terugkomen. Zonder fouten in de console.
- **Boer zoekt vrouw**: 8 snelle tests (rollen met precies één boer en één vrouw, tellen, te vroeg raden, wie het tweede glas drinkt, de tijd aanpassen, aanschuiven tussendoor, wat elke telefoon wel en niet te zien krijgt, de host die raadt als de boer wegvalt), plus een test met drie echte WebSocket-verbindingen. In Chromium een hele ronde gespeeld met drie telefoons tegelijk (iPhone en iPhone SE).
- **Mexen**: 9 snelle tests (de volgorde van de worpen, de eerste die het aantal worpen bepaalt, Mex verdubbelt, afgooien bij gelijk, de verliezer die begint, de inzet, aanschuiven, de host die gooit voor wie weg is, honderd rondes met willekeurige stenen), plus een test met twee echte WebSocket-verbindingen. In Chromium drie rondes gespeeld met drie telefoons tegelijk, en het afgooien nagelopen.
- **Pak de dealer**: 8 snelle tests (in één keer goed, hoger of lager, het verschil drinken, dealer af na drie keer, met twee spelers wisselen, wie weg is slaat over, een nieuwe stapel, honderden beurten, alleen de dealer ziet de kaart), plus een test met twee echte WebSocket-verbindingen. In Chromium gespeeld met drie telefoons tegelijk, tot en met een nieuwe dealer.
- **Paardenrace**: 12 snelle tests (inzetten en klaar, de race begint als iedereen klaar is, de stapel zonder azen, een stap vooruit, een kaart die open gaat en een paard terugzet, twee kaarten na elkaar, wie hoeveel drinkt bij de finish, een paard zonder inzet dat wint, de volgende race, wie weg is slaat over, honderden races die altijd uitlopen, de stapel blijft op de server), plus een test met twee echte WebSocket-verbindingen. In Chromium een hele race gespeeld met drie telefoons tegelijk, tot en met de volgende race.
- **Rotonde**: 9 snelle tests (de vorm met 37 kaarten en hun waarden, alleen wie aan de beurt is kiest en gokt, goed in de pot, de extra gok, fout is de kaart plus de pot en opnieuw, fout tijdens de extra gok, een lege rotonde en een nieuwe met dezelfde stand, wie weg is slaat over, de dichte kaarten blijven op de server), plus een test met twee echte WebSocket-verbindingen. In Chromium een hele rotonde gespeeld met drie telefoons tegelijk, tot en met een nieuwe rotonde.
- **Mijnenveld**: 11 snelle tests (het veld met 8 verstopte mijnen, de plekken voor een mijn, eerst de kolom en dan de rij gooien en doorschuiven als die kaart open ligt, goed en fout gokken, boem en mijnen verleggen, een mijn op de laatste kaart, een nieuw veld met dezelfde stand en de slokken per mijn, wie weg is slaat over, honderd velden die altijd uitlopen, de verstopte mijnen blijven op de server), plus een test met twee echte WebSocket-verbindingen. In Chromium een heel veld gespeeld met drie telefoons tegelijk, tot en met een nieuw veld.
- **Borrelbord**: 11 snelle tests (het bord met 48 vakjes, gooien en lopen, de gans, de brug, het doolhof en de doodskop, precies op de finish en teruglopen, de winnaar en de laatste, het café en de put, uitdelen, een duel, ruilen en het drinkmaatje, buren, de laatste, dubbel of niks en ad fundum, wie weg is slaat over, honderd potjes die altijd aflopen, en via de telefoon gooien en kiezen), plus een test met twee echte WebSocket-verbindingen. In Chromium hele potjes gespeeld met 2, 5 en 7 telefoons tegelijk, tot en met de finish en een nieuw potje.
- **Met 7 telefoons**: alle zeven tafelspellen 90 seconden gespeeld met 7 telefoons in Chromium die willekeurig tikken, waarvan er een zijn pagina herlaadt: geen fouten, en op alle telefoons dezelfde stand. Mario Bak met 7 telefoons: room maken, 6 doen mee met de code, iedereen klaar, en een race waarin elke telefoon alle 7 spelers in de stand ziet. Valt bij een tafelspel een telefoon stil weg (geen antwoord meer), dan merkt de server dat binnen 8 seconden en is de volgende aan de beurt (eerst kon dat 15 tot 30 seconden duren).
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
