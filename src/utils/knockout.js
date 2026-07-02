// K.o.-Turnierbaum: Sieger (bzw. Verlierer) selbst weiterrechnen, wenn die
// Datenquelle die Paarung noch nicht gefüllt hat.
//
// Grundidee: Der Turnierbaum ist fest verdrahtet. Jedes Spiel einer Runde wird
// von zwei Spielen der Vorrunde gespeist ("feeders"). Sobald die Vorspiele
// entschieden sind, kennen wir die Teilnehmer – auch wenn football-data.org sie
// noch nicht ins Bracket übertragen hat.
//
// WICHTIG: football-data.org hat immer Vorrang. Wir füllen ausschließlich
// Slots, die die API noch leer (leerer String) lässt. Sobald die Quelle die
// echten Teams liefert, überschreiben diese unsere Berechnung automatisch.
//
// Die Tabelle ist pro Turnier zu pflegen und mit football-data-Spiel-IDs
// verschlüsselt: zielSpielId -> [vorspielHeim, vorspielAuswaerts].
// Ein Feeder ist entweder eine Spiel-ID (= Sieger dieses Spiels) oder
// { id, loser: true } (= Verlierer, nur fürs Spiel um Platz 3).
// Die Reihenfolge bestimmt Heim- bzw. Auswärtsteam.
//
// Zuordnung FIFA-Spielnummer -> football-data-ID wurde über die Teamnamen
// (Sechzehntelfinale) bzw. die MESZ-Anstoßzeiten (ab Achtelfinale) eindeutig
// hergeleitet.
export const KNOCKOUT_FEEDERS = {
  // Achtelfinale (FIFA-Spiele 89–96)
  537375: [537415, 537416], // Spiel 89: Sieger 74 (Dtl/Par) vs Sieger 77 (Fra/Swe)
  537376: [537417, 537418], // Spiel 90: Sieger 73 (RSA/Can) vs Sieger 75 (Ned/Mar)
  537377: [537423, 537424], // Spiel 91: Sieger 76 (Bra/Jpn) vs Sieger 78 (Civ/Nor)
  537378: [537425, 537426], // Spiel 92: Sieger 79 (Mex/Ecu) vs Sieger 80 (Eng/Cod)
  537379: [537419, 537420], // Spiel 93: Sieger 83 (Por/Cro) vs Sieger 84 (Esp/Aut)
  537380: [537421, 537422], // Spiel 94: Sieger 81 (USA/Bih) vs Sieger 82 (Bel/Sen)
  537381: [537427, 537428], // Spiel 95: Sieger 86 (Arg/Cpv) vs Sieger 88 (Aus/Egy)
  537382: [537429, 537430], // Spiel 96: Sieger 85 (Sui/Alg) vs Sieger 87 (Col/Gha)

  // Viertelfinale (FIFA-Spiele 97–100)
  537383: [537375, 537376], // Spiel 97: Sieger 89 vs Sieger 90
  537384: [537379, 537380], // Spiel 98: Sieger 93 vs Sieger 94
  537385: [537377, 537378], // Spiel 99: Sieger 91 vs Sieger 92
  537386: [537381, 537382], // Spiel 100: Sieger 95 vs Sieger 96

  // Halbfinale (FIFA-Spiele 101–102)
  537387: [537383, 537384], // Spiel 101: Sieger 97 vs Sieger 98
  537388: [537385, 537386], // Spiel 102: Sieger 99 vs Sieger 100

  // Spiel um Platz 3 (FIFA-Spiel 103): Verlierer der Halbfinals
  537389: [{ id: 537387, loser: true }, { id: 537388, loser: true }],

  // Finale (FIFA-Spiel 104): Sieger der Halbfinals
  537390: [537387, 537388],
};

// Ermittelt den Siegernamen eines Spiels. Bevorzugt das offizielle
// winner-Feld (berücksichtigt Verlängerung und Elfmeterschießen); nur wenn das
// fehlt, wird aus dem Ergebnis abgeleitet.
export function winnerTeamOf(match) {
  if (!match) return "";
  if (match.winner === "HOME_TEAM") return match.homeTeam || "";
  if (match.winner === "AWAY_TEAM") return match.awayTeam || "";
  const hg = match.homeGoals;
  const ag = match.awayGoals;
  if (Number.isInteger(hg) && Number.isInteger(ag) && hg !== ag) {
    return hg > ag ? (match.homeTeam || "") : (match.awayTeam || "");
  }
  return "";
}

// Ermittelt den Verlierer (für das Spiel um Platz 3).
export function loserTeamOf(match) {
  if (!match) return "";
  if (match.winner === "HOME_TEAM") return match.awayTeam || "";
  if (match.winner === "AWAY_TEAM") return match.homeTeam || "";
  const hg = match.homeGoals;
  const ag = match.awayGoals;
  if (Number.isInteger(hg) && Number.isInteger(ag) && hg !== ag) {
    return hg > ag ? (match.awayTeam || "") : (match.homeTeam || "");
  }
  return "";
}

function resolveFeeder(ref, byId) {
  const id = typeof ref === "object" ? ref.id : ref;
  const wantLoser = typeof ref === "object" && ref.loser;
  const match = byId.get(id);
  return wantLoser ? loserTeamOf(match) : winnerTeamOf(match);
}

// Füllt leere K.o.-Slots aus den Ergebnissen der Vorspiele. Läuft iterativ,
// damit sich Ergebnisse über mehrere Runden fortpflanzen können (z. B. ein
// bereits berechnetes Achtelfinal-Team, dessen Spiel dann entschieden wird).
// Gibt eine neue Liste zurück; berechnete Teams werden mit *Predicted-Flags
// markiert, damit die UI sie als "voraussichtlich" kennzeichnen kann.
export function fillKnockoutBracket(knockout, feeders = KNOCKOUT_FEEDERS) {
  if (!Array.isArray(knockout) || knockout.length === 0) return knockout;

  const result = knockout.map(match => ({ ...match }));
  const byId = new Map(result.map(match => [match.id, match]));

  // Höchstens so viele Durchläufe wie Runden – bricht ab, sobald nichts mehr
  // gefüllt wird.
  for (let pass = 0; pass < 8; pass++) {
    let changed = false;
    for (const match of result) {
      const wiring = feeders[match.id];
      if (!wiring) continue;

      if (!match.homeTeam) {
        const team = resolveFeeder(wiring[0], byId);
        if (team) { match.homeTeam = team; match.homeTeamPredicted = true; changed = true; }
      }
      if (!match.awayTeam) {
        const team = resolveFeeder(wiring[1], byId);
        if (team) { match.awayTeam = team; match.awayTeamPredicted = true; changed = true; }
      }
    }
    if (!changed) break;
  }

  return result;
}
