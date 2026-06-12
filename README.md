# WM 2026 Liga – Vercel + football-data.org

Diese Version nutzt keine Claude/Anthropic API mehr. Die React-App ruft `/api/scores` auf, und diese Vercel Function lädt die WM-2026-Gruppenspiele über football-data.org.

## Lokal starten

```bash
npm install
npm run dev
```

Für lokale API-Tests brauchst du eine `.env.local` mit:

```bash
FOOTBALL_DATA_TOKEN=dein_token_hier
```

## Vercel

1. Projekt zu Vercel hochladen.
2. In `Settings → Environment Variables` eintragen:

```txt
FOOTBALL_DATA_TOKEN=dein_token_hier
```

3. Production Deploy ausführen:

```bash
vercel --prod
```

## Datenquelle

Endpoint: `https://api.football-data.org/v4/competitions/WC/matches?season=2026&stage=GROUP_STAGE`

Die Vercel Function wandelt die football-data.org-Antwort in das Format deiner bestehenden App um:

```json
{
  "played": [{ "homeTeam": "Spain", "awayTeam": "Croatia", "homeGoals": 2, "awayGoals": 1 }],
  "upcoming": [{ "homeTeam": "Germany", "awayTeam": "Mexico", "date": "2026-06-15", "time": "21:00", "group": "A" }]
}
```
