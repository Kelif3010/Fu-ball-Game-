import { COLORS, displayTeamName } from "./App";

export default function HeadToHead({ stats }) {
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
      {stats.map((pair) => (
        <article key={pair.key} className="h2h-card">
          <div className="h2h-header">
            <span className="h2h-fire">🔥</span>
            <span style={{ color: COLORS[pair.p1] }}>{pair.p1}</span>
            <span className="h2h-vs">vs</span>
            <span style={{ color: COLORS[pair.p2] }}>{pair.p2}</span>
          </div>
          
          <div className="h2h-main-stats">
            <strong>{pair.matches} direkte Spiele</strong>
            <div className="h2h-win-row">
              <span>{pair.p1}: {pair.p1Wins} Siege</span>
              <span>{pair.p2}: {pair.p2Wins} Siege</span>
            </div>
            <div className="h2h-draws">Unentschieden: {pair.draws}</div>
          </div>

          <div className="h2h-goals-section">
            <h4>Tore:</h4>
            <div className="h2h-goals-row">
              <span style={{ color: COLORS[pair.p1] }}>{pair.p1}-Teams {pair.p1Goals}</span>
              <span className="h2h-divider">:</span>
              <span style={{ color: COLORS[pair.p2] }}>{pair.p2Goals} {pair.p2}-Teams</span>
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
      ))}
    </div>
  );
}
