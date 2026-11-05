# Invulblad voor de Play Console

Houd dit naast je terwijl je klikt. Wat je moet plakken staat in een grijs blok. De teksten voor de Store staan in [`teksten.md`](teksten.md), de plaatjes in deze map.

**Wat je nodig hebt:**
- het app-bestand **`De-Spelkeet-1.0.0.aab`** (dat heb je van Claude gekregen);
- een account op [play.google.com/console](https://play.google.com/console) (eenmalig $25, met je ID bevestigd);
- de Gmail-adressen van **12 vrienden met een Android-telefoon**.

---

## 1. De app aanmaken

*Alle apps → **App maken***

| Veld | Wat je invult |
|---|---|
| App-naam | `De Spelkeet` |
| Standaardtaal | Nederlands – nl-NL |
| App of game | **Game** |
| Gratis of betaald | **Gratis** |
| Verklaringen | beide vinkjes aan |

Klik op **App maken**. Je komt op het *Dashboard* met een lijst taken. Die doe je hieronder één voor één.

## 2. Het app-bestand uploaden (gesloten test)

*Testen → **Gesloten testen** → bij *Alpha* (of: *Track maken*) → **Beheren** → tab **Testers***

1. Kies **E-maillijsten → Lijst maken**. Noem hem `Vrienden` en plak de 12 (of meer) Gmail-adressen erin. Sla op.
2. Bij **Feedback-URL of e-mailadres** vul je in:
   ```
   despelkeet@gmail.com
   ```
3. Ga naar het tabblad **Releases → Nieuwe release maken**.
   - Bij *App-ondertekening door Google Play*: klik op **Doorgaan** (laat dat aan staan).
   - Sleep **`De-Spelkeet-1.0.0.aab`** in het vak.
   - Releasenaam: `1.0.0`. Releaseopmerkingen:
     ```
     <nl-NL>
     Eerste versie van De Spelkeet.
     </nl-NL>
     ```
4. Klik op **Volgende**, dan **Opslaan**. Rol de release pas uit als de taken van stap 3 tot en met 5 klaar zijn; de Play Console zegt het zelf als er nog iets mist.

## 3. De koppeling met de site (belangrijk)

*Testen en releasen → Instellingen → **App-integriteit** → tab **App-ondertekening***

Kopieer de **SHA-256-vingerafdruk** onder *Certificaat van app-ondertekeningssleutel* en **stuur die naar Claude**. Claude zet hem in de site. Zonder deze stap zie je in de app bovenin een adresbalk.

(De vingerafdruk van de uploadsleutel staat al in de site:
`CE:61:C5:3A:25:3C:74:BE:0E:00:D0:30:54:19:D0:C1:28:30:48:F6:48:DA:1F:4D:19:51:22:4E:75:95:AB:4B`)

## 4. De Store-pagina

*Groei → Store-presence → **Hoofdvermelding in de Store***

| Veld | Wat je invult |
|---|---|
| App-naam | `De Spelkeet: partyspellen` (uit `teksten.md`) |
| Korte beschrijving | uit `teksten.md` |
| Volledige beschrijving | uit `teksten.md` |
| App-icoon | `icoon-512.png` |
| Feature graphic | `banner-1024x500.png` |
| Screenshots telefoon | de 6 bestanden `screenshot-1-…` t/m `screenshot-6-…` |

*Groei → Store-presence → **Store-instellingen***
- App-categorie: **Game → Casual**
- Tags: Partyspel, Multiplayer, Kaartspel
- E-mailadres: `despelkeet@gmail.com`
- Website: `https://spelkeet.onrender.com`

## 5. App-content (de taken op het dashboard)

*Beleid → **App-content***

| Taak | Wat je kiest |
|---|---|
| **Privacybeleid** | `https://spelkeet.onrender.com/privacy` |
| **App-toegang** | *Alle functionaliteit is beschikbaar zonder speciale toegang* |
| **Advertenties** | *Nee, mijn app bevat geen advertenties* |
| **Doelgroep en content** | Leeftijden: **13–15, 16–17 en 18 en ouder** (niet jonger dan 13: dan gelden de strenge regels voor kinderapps). "Kan je app onbedoeld kinderen aanspreken?" **Nee** |
| **Nieuws-app** | Nee |
| **Overheidsapp** | Nee |
| **Financiële functies** | *Mijn app biedt geen financiële functies* |
| **Gezondheid** | *Mijn app heeft geen gezondheidsfuncties* |

### Contentclassificatie (de vragenlijst)
E-mailadres: `despelkeet@gmail.com`. Categorie: **Game**. Beantwoord eerlijk:

| Vraag over | Antwoord |
|---|---|
| Geweld | Ja, alleen **tekenfilmachtig / fantasie**, zonder bloed (karts die met klompen schieten) |
| Angst, seks, grof taalgebruik | Nee |
| **Alcohol, tabak of drugs** | In de app wordt niet gedronken: je krijgt strafpunten. Wel staat er een café (de kroeg) in de achtergrond en heet een spel Borrelbord. Vraagt de lijst naar *verwijzingen* naar alcohol, kies dan eerlijk **ja, alleen verwijzingen**. Geen tabak, geen drugs |
| Gokken (echt geld of nagebootst) | **Nee**: geen geld, geen casino. Bij Paardenrace zet je strafpunten in |
| Spelers kunnen met elkaar omgaan | **Ja**: namen zien elkaar aan tafel; geen chat |
| Locatie delen | Nee |
| Digitale aankopen | Nee |

### Gegevensveiligheid
*Verzamelt of deelt je app gegevens?* **Ja**. *Worden alle gegevens versleuteld verzonden?* **Ja**. *Kunnen gebruikers vragen hun gegevens te verwijderen?* **Ja**.

| Soort gegevens | Verzameld | Gedeeld | Waarvoor |
|---|---|---|---|
| Persoonsgegevens → **Naam** (de bijnaam aan tafel) | Ja | Nee | App-functionaliteit |
| Apparaat- of andere id's (een willekeurige sleutel) | Ja | Nee | App-functionaliteit |
| App-activiteit → **Andere door gebruikers gegenereerde content** (uitdaging bij Kart, meldingen) | Ja | Nee | App-functionaliteit |
| App-activiteit → **Andere acties** (punten en spullen in Karnemelk Kart) | Ja | Nee | App-functionaliteit |
| App-activiteit → **App-interacties** (welke pagina's en spellen geopend worden, alleen als tellingen) | Ja | Nee | Analyse |

Geen locatie, contacten, foto's, berichten of betalingen. Als URL om gegevens te laten verwijderen: `https://spelkeet.onrender.com/privacy`

## 6. Uitrollen en de testers uitnodigen

1. Ga terug naar *Testen → Gesloten testen → Releases* en klik op **Release controleren → Uitrollen naar gesloten test**.
2. Kopieer bij het tabblad **Testers** de **link om deel te nemen** en stuur die met het bericht hieronder naar je testers.
3. Google kijkt de eerste versie na. Dat duurt een paar uur tot een paar dagen.

**WhatsApp-bericht voor je testers:**
```
Hoi! Ik zet mijn app De Spelkeet in de Play Store (kroeg- en kaartspellen met vrienden, ieder op zijn eigen telefoon). Google wil dat 12 mensen hem eerst 14 dagen testen. Doe je mee?

1. Open deze link op je Android-telefoon (met je Gmail-account): [LINK]
2. Tik op "Word tester" en daarna op "Downloaden in Google Play".
3. Installeer De Spelkeet en laat hem 14 dagen staan. Speel af en toe een potje mee!

Dank je! 🎲
```

## 7. Na 14 dagen

*Dashboard → **Productietoegang aanvragen***. Google stelt een paar vragen over de test: hoe je testers vond (vrienden), wat ze speelden en wat je verbeterde. Na goedkeuring zet je de release op **Productie**, en dan staat De Spelkeet voor iedereen in de Play Store.

Wordt de app afgewezen? Stuur de e-mail van Google naar Claude.
