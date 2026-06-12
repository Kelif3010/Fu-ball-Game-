# WM 2026 Liga

Private WM-2026-Liga als Vite/React-App auf Vercel.

## Features

- mobile Rangliste
- Live-Spiele
- Live-Tabelle / „wenn es so bleibt“
- Match-Center per Tipp auf ein Live-Spiel
- Startelf, Bank und Events, sofern die APIs Daten liefern
- Regeln-Reiter
- PWA/App-Modus für iPhone über „Zum Home-Bildschirm hinzufügen“
- Service Worker für App-Shell-Caching
- Live-Update alle 5 Minuten, um API-Requests zu sparen
- Match-Center-Cache für 5 Minuten

## Lokal starten

```bash
npm install
npm run dev
```

## Vercel Environment Variables

In Vercel müssen zwei Environment Variables gesetzt sein:

```txt
FOOTBALL_DATA_TOKEN
API_FOOTBALL_KEY
```

Die Werte kommen aus football-data.org und API-Football/API-Sports. Die Keys niemals in GitHub speichern.

## Datenquellen

`/api/scores` lädt Ergebnisse, Live-Status und Spielplan über football-data.org.

`/api/match` lädt Match-Details, Aufstellungen und Events. Zuerst wird football-data.org geprüft. Wenn dort keine Aufstellung vorhanden ist, wird API-Football/API-Sports genutzt.

API-Football und football-data.org haben unterschiedliche Match-IDs. Deshalb wird das passende Spiel über Datum und Teamnamen gematcht.

## PWA / iPhone

Die App enthält Manifest, Icon und Service Worker. Auf dem iPhone kann sie über Safari installiert werden:

```txt
Teilen → Zum Home-Bildschirm hinzufügen
```

Der Service Worker cached nur die App-Oberfläche. API-Daten werden nicht dauerhaft im Service Worker gecached, damit Live-Stände nicht falsch hängen bleiben.

## Live-Update

Während Live-Spiele laufen, aktualisiert das Frontend automatisch alle 5 Minuten. `/api/scores` und `/api/match` setzen ebenfalls 5-Minuten-Cache-Header. Dadurch werden Free-Tier-Requests geschont.
