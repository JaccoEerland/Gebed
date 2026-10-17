# Mijn gebedspunten — gratis privé-webapp voor Android (versie 1.1)

Een eenvoudige, lokaal opgeslagen gebedspunten-app. Je kunt de PWA publiceren op bijvoorbeeld GitHub Pages en daarna via Chrome aan je Android-startscherm toevoegen.

## Functies

- Gebedspunten toevoegen, bewerken en verwijderen met een volledige beschrijving; in het overzicht zie je alleen de titel.
- Categorieën uitklappen, toevoegen, hernoemen en verwijderen.
- Automatisch *lokaal* een voorstel voor titel en categorie op basis van trefwoorden (geen ChatGPT/API-kosten).
- Willekeurige gebedspunten tonen in een pop-up zonder dubbele punten in dezelfde trekking.
- **Nieuw instellingenmenu**: kies 1 t/m 20 punten voor de willekeurige selectie, donker/licht/automatisch thema en twee aanpasbare Bijbelteksten op het hoofdscherm.
- **Automatisch Bijbelteksten ophalen**: selecteer bijbelboek, hoofdstuk en vers, eventueel een eindvers. Na korte pauze haalt de app de tekst op uit de **Statenvertaling (SV)** via [Free.Bible](https://free.bible/nl/developers/). Geen account, sleutel of betaling nodig. **Internet is nodig** voor een nieuwe tekst; reeds opgeslagen teksten blijven offline beschikbaar.
- De eerder gekozen teksten **Jeremia 33:3 (HSV)** en **Psalm 62:9 (HSV)** blijven aanvankelijk ongewijzigd.
- **HSV niet automatisch beschikbaar**: de HSV is auteursrechtelijk beschermd en heeft geen vrij beschikbare, voor deze app toegestane ophaalkoppeling. Wie HSV wil gebruiken, kan de tekst zelf invullen en de vertaling als `HSV` instellen; dat gebeurt lokaal. De app kiest na een automatische ophaalactie expliciet `SV`, zodat vertalingen niet worden verwisseld.
- Export en import van niet-versleutelde JSON-back-ups; de instellingen zijn daarin inbegrepen. Oude back-ups zonder instellingen blijven importeerbaar.

## Gewoon testen

Open het aparte bestand `gebedspunten-proefversie-instellingen.html` in een browser. Dit is een zelfstandig proefbestand dat de CSS en JavaScript bevat. Een lokaal HTML-bestand is **niet installeerbaar als PWA**; daarvoor moet je de bestanden van de ZIP op een HTTPS-website zetten.

**Let op**: gegevens in een lokaal geopend proefbestand zijn niet automatisch zichtbaar in de gepubliceerde PWA. Gebruik **Instellingen → Exporteren** en later **Importeren** om ze over te zetten. Bij een lokaal bestand kan opslag per Android-browser beperkt zijn; test definitieve opslag in de geïnstalleerde app.

## Op Android installeren met GitHub Pages

1. Maak een gratis GitHub-account aan via https://github.com.
2. Maak een nieuwe publieke repository, bijvoorbeeld `mijn-gebedspunten`.
3. Pak de ZIP uit en upload de **inhoud** van de map `gebedspunten-app` naar de hoofdmap van je repository: `index.html`, `styles.css`, `app.js`, `service-worker.js`, `manifest.webmanifest`, `README.md` en `assets/`.
4. Open **Settings → Pages**, kies **Deploy from a branch**, selecteer `main` en `/(root)`, en sla op.
5. Open het GitHub Pages HTTPS-adres in Chrome op Android. Open het menu en kies **App installeren** of **Toevoegen aan startscherm**.
6. Gebruik vanaf dan je eigen icoon. De app kan na het eerste laden ook zonder internet worden gebruikt, met uitzondering van het opzoeken van nieuwe Bijbelteksten.

## Bestaande versie bijwerken

- **Voordat je iets bijwerkt: exporteer een back-up vanuit de bestaande app**.
- Vervang vervolgens de bestanden in **dezelfde** GitHub-repository en behoud **precies dezelfde URL en browser**. De app bewaart al je gegevens onder dezelfde lokale opslagsleutel als versie 1.0.
- De serviceworker-cache is bijgewerkt naar `pwa-v3`; mogelijk moet je de app één keer heropenen of de webpagina vernieuwen voordat de update zichtbaar is.
- Oude back-ups kunnen nog worden geïmporteerd; daarbij krijgen ontbrekende instellingen de standaardwaarden.

## Privacy en afhankelijkheden

- Gebedspunten staan in `localStorage` **op je apparaat** en worden niet automatisch met GitHub of een server gesynchroniseerd.
- De app bevat geen advertenties, tracking of ChatGPT-koppeling.
- Bij het **ophalen van Bijbelteksten** wordt **uitsluitend de Bijbelverwijzing** via HTTPS opgevraagd bij `free.bible`. Gebedspunten worden daarbij niet verstuurd. Gebruik is afhankelijk van de bereikbaarheid van deze externe dienst.
- Browseropslag en geëxporteerde JSON-back-ups zijn **niet versleuteld**. Bewaar back-ups zorgvuldig, gebruik je schermvergrendeling en verwijder niet zomaar browsergegevens.
- Beschikbaarheid van je lokaal opgeslagen gegevens kan verschillen tussen browsers of veranderen wanneer je browsergegevens wist. Maak regelmatig een back-up.

## Bron van de automatische Bijbelteksten

- [Free.Bible — ontwikkelaarsdocumentatie](https://free.bible/nl/developers/), Statenvertaling 1637 (`dutch`, publiek domein).
- [Stichting HSV — informatie over het gebruik van HSV-teksten](https://herzienestatenvertaling.nl/over-hsv).
