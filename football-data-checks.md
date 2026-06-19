# football-data.org Checks

Token einsetzen und die Befehle als eine Zeile kopieren.

## 1. Alle WM-2026-Spiele prüfen

```bash
curl -H "X-Auth-Token: DEIN_TOKEN" "https://api.football-data.org/v4/competitions/WC/matches?season=2026"
```

Wichtig in der Antwort:

```json
{
  "stage": "LAST_32",
  "group": null,
  "matchday": 4
}
```

## 2. Runde der letzten 32 einzeln prüfen

```bash
curl -H "X-Auth-Token: DEIN_TOKEN" "https://api.football-data.org/v4/competitions/WC/matches?season=2026&stage=LAST_32"
```

Wenn hier Matches zurückkommen, können wir den K.o.-Tab relativ einfach über `stage` bauen.

## Alles auf einmal prüfen

Dieses Script prüft Spielplan, K.o.-Runden, Match-Details, Torschützen und optional API-Football-Daten. Tokens werden nur aus den Environment-Variablen gelesen.

Nur football-data.org:

```bash
FOOTBALL_DATA_TOKEN="DEIN_TOKEN" node scripts/audit-football-apis.mjs
```

football-data.org plus API-Football:

```bash
FOOTBALL_DATA_TOKEN="DEIN_TOKEN" API_FOOTBALL_KEY="DEIN_API_FOOTBALL_KEY" node scripts/audit-football-apis.mjs
```

Danach steht der Report hier:

```text
api-audit-report.md
```
