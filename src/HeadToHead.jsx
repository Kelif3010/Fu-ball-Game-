import { useMemo, useState } from "react";
import { COLORS, displayTeamName } from "./App";

const PEOPLE = Object.keys(COLORS);

function buildSelectedStats(stats, selectedPerson) {
  return (Array.isArray(stats) ? stats : [])
    .filter(pair => pair.p1 === selectedPerson || pair.p2 === selectedPerson)
    .map(pair => {
      const selectedIsP1 = pair.p1 === selectedPerson;
      const opponent = selectedIsP1 ? pair.p2 : pair.p1;
      return {
        ...pair,
        opponent,
        selectedWins: selectedIsP1 ? pair.p1Wins : pair.p2Wins,
        opponentWins: selectedIsP1 ? pair.p2Wins : pair.p1Wins,
        selectedGoals: selectedIsP1 ? pair.p1Goals : pair.p2Goals,
        opponentGoals: selectedIsP1 ? pair.p2Goals : pair.p1Goals,
      };
    })
    .sort((a, b) => b.matches - a.matches || (b.selectedGoals + b.opponentGoals) - (a.selectedGoals + a.opponentGoals) || a.opponent.localeCompare(b.opponent));
}

export default function HeadToHead({ stats, selectedPerson, onSelectPerson }) {
  const [internalPerson, setInternalPerson] = useState(PEOPLE[0] || "");
  const activePerson = selectedPerson || internalPerson;
  const setPerson = onSelectPerson || setInternalPerson;

  const rows = useMemo(() => buildSelectedStats(stats, activePerson), [stats, activePerson]);

  if (!stats || stats.length === 0) {
    return (
      <div className="empty-state">
        <strong>Noch keine direkten Duelle gespielt.</strong>
        <p>Sobald Ergebnisse zwischen verschiedenen Teilnehmern vorliegen, erscheinen hier die Statistiken.</p>
      </div>
    );
  }

  return (
    <div className="card-stack">
      <div className="h2h-selector-wrap">
        <div className="h2h-selector-head">
          <div>
            <h3>Head-to-Head</h3>
            <p>Wähle einen Teilnehmer und sieh nur seine direkten Duelle.</p>
          </div>
          <span className="analysis-badge">{rows.length} Duelle</span>
        </div>
        <div className="person-selector h2h-selector">
          {PEOPLE.map(person => (
            <button
              key={person}
              className={activePerson === person ? "active" : ""}
              onClick={() => setPerson(person)}
              style={{ "--accent": COLORS[person] }}
            >
              {person}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <strong>Noch keine direkten Duelle für {activePerson}.</strong>
          <p>Sobald dieses Teilnehmerpaar gespielt hat, erscheint die Auswertung hier.</p>
        </div>
      ) : (
        rows.map(pair => (
          <article key={pair.key} className="h2h-card">
            <div className="h2h-header">
              <span className="h2h-fire">🔥</span>
              <span style={{ color: COLORS[activePerson] }}>{activePerson}</span>
              <span className="h2h-vs">vs</span>
              <span style={{ color: COLORS[pair.opponent] }}>{pair.opponent}</span>
            </div>

            <div className="h2h-main-stats">
              <strong>{pair.matches} direkte Spiele</strong>
              <div className="h2h-win-row">
                <span>{activePerson}: {pair.selectedWins} Siege</span>
                <span>{pair.opponent}: {pair.opponentWins} Siege</span>
              </div>
              <div className="h2h-draws">Unentschieden: {pair.draws}</div>
            </div>

            <div className="h2h-goals-section">
              <h4>Tore:</h4>
              <div className="h2h-goals-row">
                <span style={{ color: COLORS[activePerson] }}>{activePerson}-Teams {pair.selectedGoals}</span>
                <span className="h2h-divider">:</span>
                <span style={{ color: COLORS[pair.opponent] }}>{pair.opponentGoals} {pair.opponent}-Teams</span>
              </div>
            </div>

            {pair.lastMatch && (
              <div className="h2h-last-match">
                <small>Letztes Duell:</small>
                <div className="h2h-last-match-box">
                  <span className="team-truncate">{displayTeamName(pair.lastMatch.homeTeam)}</span>
                  <strong className="h2h-result">{pair.lastMatch.homeGoals}:{pair.lastMatch.awayGoals}</strong>
                  <span className="team-truncate">{displayTeamName(pair.lastMatch.awayTeam)}</span>
                </div>
              </div>
            )}
          </article>
        ))
      )}
    </div>
  );
}
