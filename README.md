# WM 2026 Liga – Vercel + football-data.org

Diese Version nutzt keine Claude/Anthropic API mehr. Die React-App ruft `/api/scores` auf, und diese Vercel Function lädt die WM-2026-Gruppenspiele über football-data.org.

Für Aufstellungen nutzt `/api/match` zuerst football-data.org. Wenn dort keine Startelf/Bank vorhanden ist und `API_FOOTBALL_KEY` gesetzt wurde, versucht die App automatisch API-Football / API-Sports als Fallback.

## Lokal starten

```bash
npm install
npm run dev
```

Für lokale API-Tests brauchst du eine `.env.local` mit:

```bash
FOOTBALL_DATA_TOKEN=dein_football_data_token_hier
API_FOOTBALL_KEY=dein_api_football_key_hier
```

## Vercel

1. Projekt zu Vercel hochladen.
2. In `Settings → Environment Variables` eintragen:

```txt
FOOTBALL_DATA_TOKEN=dein_football_data_token_hier
API_FOOTBALL_KEY=dein_api_football_key_hier
```

3. Production Deploy ausführen oder bei GitHub-Integration automatisch deployen lassen:

```bash
vercel --prod
```

## Datenquellen

### Ergebnisse, Live-Status und Spielplan

Endpoint:

```txt
https://api.football-data.org/v4/competitions/WC/matches?season=2026&stage=GROUP_STAGE
```

Die Vercel Function wandelt die football-data.org-Antwort in das Format deiner bestehenden App um:

```json
{
  "live": [{ "homeTeam": "Canada", "awayTeam": "Bosnia and Herzegovina", "homeGoals": 0, "awayGoals": 1 }],
  "played": [{ "homeTeam": "Spain", "awayTeam": "Croatia", "homeGoals": 2, "awayGoals": 1 }],
  "upcoming": [{ "homeTeam": "Germany", "awayTeam": "Mexico", "date": "2026-06-15", "time": "21:00", "group": "A" }]
}
```

### Aufstellungen

Die App ruft beim Antippen eines Live-Spiels diesen internen Endpoint auf:

```txt
/api/match?id=<football-data-match-id>
```

Diese Route:

1. lädt Match-Details von football-data.org,
2. prüft, ob `lineup` oder `bench` vorhanden sind,
3. nutzt bei leeren Daten automatisch API-Football / API-Sports,
4. sucht dort das passende WM-Spiel über Datum + Teamnamen,
5. lädt Startelf und Bank über den Fixture-Lineups-Endpunkt.

Wichtig: API-Football und football-data.org haben unterschiedliche Match-IDs. Deshalb wird nicht die ID direkt übernommen, sondern das Spiel über Datum und Teamnamen gematcht.
