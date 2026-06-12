import { useCallback, useEffect, useMemo, useState } from "react";

const PARTICIPANTS = {
  Berkant: ["Portugal", "Norway", "USA", "Scotland", "South Africa", "Jordan"],
  Bora: ["Brazil", "Senegal", "Switzerland", "Mexico", "Uzbekistan", "Saudi Arabia"],
  Can: ["Netherlands", "Turkey", "Uruguay", "Ghana", "South Korea", "Iran"],
  Dogan: ["France", "Morocco", "Ecuador", "Paraguay", "Tunisia", "Panama"],
  Fayit: ["Argentina", "Sweden", "Colombia", "Czech Republic", "Australia", "Qatar"],
  Hasret: ["Germany", "Belgium", "Algeria", "Canada", "Haiti", "Iraq"],
  Ken: ["Spain", "Croatia", "Austria", "DR Congo", "Egypt", "Curaçao"],
  Selcuk: ["England", "Ivory Coast", "Japan", "Bosnia and Herzegovina", "Cape Verde", "New Zealand"],
};

const FLAGS = {
  Portugal: "🇵🇹", Norway: "🇳🇴", USA: "🇺🇸", Scotland: "🏴", "South Africa": "🇿🇦", Jordan: "🇯🇴",
  Brazil: "🇧🇷", Senegal: "🇸🇳", Switzerland: "🇨🇭", Mexico: "🇲🇽", Uzbekistan: "🇺🇿", "Saudi Arabia": "🇸🇦",
  Netherlands: "🇳🇱", Turkey: "🇹🇷", Uruguay: "🇺🇾", Ghana: "🇬🇭", "South Korea": "🇰🇷", Iran: "🇮🇷",
  France: "🇫🇷", Morocco: "🇲🇦", Ecuador: "🇪🇨", Paraguay: "🇵🇾", Tunisia: "🇹🇳", Panama: "🇵🇦",
  Argentina: "🇦🇷", Sweden: "🇸🇪", Colombia: "🇨🇴", "Czech Republic": "🇨🇿", Australia: "🇦🇺", Qatar: "🇶🇦",
  Germany: "🇩🇪", Belgium: "🇧🇪", Algeria: "🇩🇿", Canada: "🇨🇦", Haiti: "🇭🇹", Iraq: "🇮🇶",
  Spain: "🇪🇸", Croatia: "🇭🇷", Austria: "🇦🇹", "DR Congo": "🇨🇩", Egypt: "🇪🇬", Curaçao: "🇨🇼",
  England: "🏴", "Ivory Coast": "🇨🇮", Japan: "🇯🇵", "Bosnia and Herzegovina": "🇧🇦", "Cape Verde": "🇨🇻", "New Zealand": "🇳🇿",
};

const DE = {
  Portugal: "Portugal", Norway: "Norwegen", USA: "USA", Scotland: "Schottland", "South Africa": "Südafrika", Jordan: "Jordanien",
  Brazil: "Brasilien", Senegal: "Senegal", Switzerland: "Schweiz", Mexico: "Mexiko", Uzbekistan: "Usbekistan", "Saudi Arabia": "Saudi-Arabien",
  Netherlands: "Niederlande", Turkey: "Türkei", Uruguay: "Uruguay", Ghana: "Ghana", "South Korea": "Südkorea", Iran: "Iran",
  France: "Frankreich", Morocco: "Marokko", Ecuador: "Ecuador", Paraguay: "Paraguay", Tunisia: "Tunesien", Panama: "Panama",
  Argentina: "Argentinien", Sweden: "Schweden", Colombia: "Kolumbien", "Czech Republic": "Tschechien", Australia: "Australien", Qatar: "Katar",
  Germany: "Deutschland", Belgium: "Belgien", Algeria: "Algerien", Canada: "Kanada", Haiti: "Haiti", Iraq: "Irak",
  Spain: "Spanien", Croatia: "Kroatien", Austria: "Österreich", "DR Congo": "DR Kongo", Egypt: "Ägypten", Curaçao: "Curaçao",
  England: "England", "Ivory Coast": "Elfenbeinküste", Japan: "Japan", "Bosnia and Herzegovina": "Bosnien-Herzegowina", "Cape Verde": "Kap Verde", "New Zealand": "Neuseeland",
};

const COLORS = {
  Berkant: "#f59e0b", Bora: "#10b981", Can: "#3b82f6", Dogan: "#8b5cf6",
  Fayit: "#ef4444", Hasret: "#f97316", Ken: "#06b6d4", Selcuk: "#84cc16",
};

const ALL_TEAMS = new Set(Object.values(PARTICIPANTS).flat());
const ownerOf = team => Object.entries(PARTICIPANTS).find(([, teams]) => teams.includes(team))?.[0] || "";

function buildTeamStats(matches) {
  const stats = {};
  for (const team of ALL_TEAMS) stats[team] = { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };

  for (const match of matches) {
    const h = match.homeTeam;
    const a = match.awayTeam;
    if (!stats[h] || !stats[a]) continue;

    const hg = Number(match.homeGoals);
    const ag = Number(match.awayGoals);
    if (!Number.isFinite(hg) || !Number.isFinite(ag)) continue;

    stats[h].played++;
    stats[a].played++;
    stats[h].gf += hg;
    stats[h].ga += ag;
    stats[a].gf += ag;
    stats[a].ga += hg;

    if (hg > ag) {
      stats[h].pts += 3;
      stats[h].won++;
      stats[a].lost++;
    } else if (ag > hg) {
      stats[a].pts += 3;
      stats[a].won++;
      stats[h].lost++;
    } else {
      stats[h].pts++;
      stats[a].pts++;
      stats[h].drawn++;
      stats[a].drawn++;
    }
  }

  return stats;
}

function buildStandings(teamStats) {
  return Object.entries(PARTICIPANTS)
    .map(([person, teams]) => {
      const total = teams.reduce((acc, team) => {
        const s = teamStats[team] || {};
        acc.played += s.played || 0;
        acc.won += s.won || 0;
        acc.drawn += s.drawn || 0;
        acc.lost += s.lost || 0;
        acc.gf += s.gf || 0;
        acc.ga += s.ga || 0;
        acc.pts += s.pts || 0;
        return acc;
      }, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });

      return { person, teams, ...total, td: total.gf - total.ga };
    })
    .sort((a, b) => b.pts - a.pts || b.td - a.td || b.gf - a.gf || a.person.localeCompare(b.person));
}

function rankMap(standings) {
  return standings.reduce((acc, row, index) => {
    acc[row.person] = { rank: index + 1, row };
    return acc;
  }, {});
}

function formatDate(dateStr) {
  if (!dateStr) return "Datum offen";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const rankLabel = index => index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
const tdColor = value => value > 0 ? "#34d399" : value < 0 ? "#f87171" : "#94a3b8";

function rankMovementText(delta, currentRank) {
  if (delta === 0) return `Bleibt #${currentRank}`;
  return delta > 0 ? `↗ +${delta} Plätze` : `↘ ${Math.abs(delta)} Plätze`;
}

function pointsMovementText(delta) {
  if (delta === 0) return "±0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function movementColor(delta) {
  if (delta > 0) return "#34d399";
  if (delta < 0) return "#f87171";
  return "#94a3b8";
}

function statusLabel(status) {
  if (status === "IN_PLAY" || status === "LIVE") return "Live";
  if (status === "PAUSED") return "Halbzeit";
  if (status === "FINISHED") return "Abpfiff";
  return status || "Geplant";
}

function displayTeamName(team) {
  return `${FLAGS[team] || ""} ${DE[team] || team}`.trim();
}

function StatChip({ label, value, color }) {
  return (
    <div style={{
      minWidth: 62,
      flex: "1 1 62px",
      background: "rgba(255,255,255,.045)",
      border: "1px solid rgba(255,255,255,.075)",
      borderRadius: 12,
      padding: "8px 9px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 10, color: "#64748b", fontWeight: 900, letterSpacing: ".5px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ marginTop: 3, color: color || "#e2e8f0", fontSize: 15, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

function InfoPill({ label, value, color }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      border: `1px solid ${color ? `${color}55` : "rgba(255,255,255,.1)"}`,
      background: color ? `${color}18` : "rgba(255,255,255,.045)",
      color: color || "#cbd5e1",
      borderRadius: 999,
      padding: "6px 9px",
      fontSize: 12,
      fontWeight: 900,
      whiteSpace: "nowrap",
    }}>
      <span style={{ color: "#94a3b8" }}>{label}</span> {value}
    </span>
  );
}

function TeamBlock({ team, align = "left" }) {
  const owner = ownerOf(team);
  return (
    <div style={{ minWidth: 0, textAlign: align }}>
      <strong style={{ display: "block", fontSize: 14, lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {align === "right" ? `${DE[team] || team} ${FLAGS[team] || ""}` : `${FLAGS[team] || ""} ${DE[team] || team}`}
      </strong>
      {owner && <small style={{ color: COLORS[owner], fontWeight: 800 }}>{owner}</small>}
    </div>
  );
}

function ScoreCard({ match, live = false, onClick = null, selected = false }) {
  const clickable = typeof onClick === "function";
  const handleKeyDown = event => {
    if (!clickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <article
      onClick={onClick || undefined}
      onKeyDown={handleKeyDown}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
        gap: 12,
        alignItems: "center",
        background: live ? "linear-gradient(135deg,rgba(239,68,68,.13),rgba(255,255,255,.04))" : "rgba(255,255,255,.04)",
        border: selected ? "1px solid rgba(251,191,36,.55)" : live ? "1px solid rgba(239,68,68,.32)" : "1px solid rgba(255,255,255,.08)",
        borderRadius: 16,
        padding: 14,
        boxShadow: selected ? "0 0 0 2px rgba(251,191,36,.08)" : live ? "0 10px 28px rgba(239,68,68,.08)" : "none",
        cursor: clickable ? "pointer" : "default",
        outline: "none",
      }}
    >
      <TeamBlock team={match.homeTeam} />
      <div style={{ textAlign: "center", minWidth: 74 }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          color: live ? "#fecaca" : "#94a3b8",
          background: live ? "rgba(239,68,68,.18)" : "rgba(255,255,255,.06)",
          border: live ? "1px solid rgba(239,68,68,.28)" : "1px solid rgba(255,255,255,.08)",
          borderRadius: 999,
          padding: "3px 8px",
          fontSize: 10,
          fontWeight: 950,
          textTransform: "uppercase",
          letterSpacing: ".4px",
          marginBottom: 5,
        }}>
          {live && <span style={{ width: 7, height: 7, borderRadius: 99, background: "#ef4444", display: "inline-block" }} />}
          {statusLabel(match.status)}
        </div>
        <strong style={{ display: "block", fontSize: 26, lineHeight: 1, letterSpacing: "-1px", color: live ? "#fff" : "#e2e8f0" }}>{match.homeGoals}:{match.awayGoals}</strong>
        {(match.minute || match.time) && <div style={{ marginTop: 4, color: "#64748b", fontSize: 11, fontWeight: 800 }}>{match.minute ? `${match.minute}'` : `${match.time} Uhr`}</div>}
        {clickable && <div style={{ marginTop: 5, color: selected ? "#fbbf24" : "#64748b", fontSize: 10, fontWeight: 900 }}>{selected ? "Aufstellung offen" : "Tippen für Aufstellung"}</div>}
      </div>
      <TeamBlock team={match.awayTeam} align="right" />
    </article>
  );
}

function PlayerRow({ player, index }) {
  const number = player?.shirtNumber || player?.number || "";
  const position = player?.position || "";
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "28px minmax(0,1fr)",
      gap: 8,
      alignItems: "center",
      border: "1px solid rgba(255,255,255,.07)",
      background: "rgba(255,255,255,.035)",
      borderRadius: 11,
      padding: "8px 9px",
    }}>
      <span style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,255,255,.06)",
        color: number ? "#fbbf24" : "#64748b",
        fontSize: 11,
        fontWeight: 950,
      }}>{number || index + 1}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 850, color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player?.name || "Unbekannt"}</div>
        {position && <div style={{ marginTop: 1, fontSize: 10, color: "#64748b", fontWeight: 800 }}>{position}</div>}
      </div>
    </div>
  );
}

function PlayerList({ title, players = [], emptyText }) {
  return (
    <section>
      <h4 style={{ margin: "0 0 8px", color: "#cbd5e1", fontSize: 12, letterSpacing: ".4px", textTransform: "uppercase" }}>
        {title} <span style={{ color: "#64748b" }}>({players.length})</span>
      </h4>
      {players.length === 0 ? (
        <p style={{ margin: 0, color: "#64748b", fontSize: 12, lineHeight: 1.35 }}>{emptyText}</p>
      ) : (
        <div style={{ display: "grid", gap: 6 }}>
          {players.map((player, index) => <PlayerRow key={`${player.id || player.name || index}-${index}`} player={player} index={index} />)}
        </div>
      )}
    </section>
  );
}

function TeamLineup({ team, fallbackName }) {
  const lineup = Array.isArray(team?.lineup) ? team.lineup : [];
  const bench = Array.isArray(team?.bench) ? team.bench : [];
  const formation = team?.formation;
  const coach = team?.coach?.name;

  return (
    <article style={{
      border: "1px solid rgba(255,255,255,.08)",
      background: "rgba(255,255,255,.035)",
      borderRadius: 15,
      padding: 12,
      minWidth: 0,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ margin: 0, color: "#fbbf24", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team?.name || fallbackName || "Team"}</h3>
          {coach && <div style={{ marginTop: 3, color: "#94a3b8", fontSize: 11, fontWeight: 750 }}>Coach: {coach}</div>}
        </div>
        {formation && <span style={{
          border: "1px solid rgba(251,191,36,.28)",
          background: "rgba(251,191,36,.12)",
          color: "#fbbf24",
          borderRadius: 999,
          padding: "5px 8px",
          fontSize: 11,
          fontWeight: 950,
          flexShrink: 0,
        }}>{formation}</span>}
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <PlayerList title="Startelf" players={lineup} emptyText="Keine Startelf-Daten geliefert." />
        <PlayerList title="Bank" players={bench} emptyText="Keine Bank-Daten geliefert." />
      </div>
    </article>
  );
}

function LineupPanel({ match, data, loading, error }) {
  const hasHomePlayers = (data?.homeTeam?.lineup?.length || 0) + (data?.homeTeam?.bench?.length || 0) > 0;
  const hasAwayPlayers = (data?.awayTeam?.lineup?.length || 0) + (data?.awayTeam?.bench?.length || 0) > 0;
  const hasAnyPlayers = hasHomePlayers || hasAwayPlayers;

  return (
    <div style={{
      border: "1px solid rgba(251,191,36,.18)",
      background: "linear-gradient(135deg,rgba(251,191,36,.08),rgba(255,255,255,.025))",
      borderRadius: 16,
      padding: 12,
      marginTop: -2,
    }}>
      {loading && <p style={{ margin: 0, color: "#fbbf24", fontSize: 13, fontWeight: 850 }}>⏳ Lade Aufstellung…</p>}
      {error && <p style={{ margin: 0, color: "#fca5a5", fontSize: 13, fontWeight: 850 }}>❌ {error}</p>}
      {!loading && !error && data && (
        <>
          <div style={{ marginBottom: 10, color: "#94a3b8", fontSize: 12, lineHeight: 1.45 }}>
            Aufstellung aus den Match-Details von football-data.org.
          </div>
          {!hasAnyPlayers && (
            <div style={{
              marginBottom: 10,
              color: "#cbd5e1",
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)",
              borderRadius: 12,
              padding: 11,
              fontSize: 13,
              lineHeight: 1.45,
            }}>
              Für dieses Spiel liefert football-data.org aktuell keine Startelf- oder Bank-Daten. Der Match-Detail-Endpunkt ist angebunden, aber die Felder sind leer.
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>
            <TeamLineup team={data.homeTeam} fallbackName={displayTeamName(match.homeTeam)} />
            <TeamLineup team={data.awayTeam} fallbackName={displayTeamName(match.awayTeam)} />
          </div>
        </>
      )}
    </div>
  );
}

function UpcomingCard({ match }) {
  const hOwner = ownerOf(match.homeTeam);
  const aOwner = ownerOf(match.awayTeam);
  const isDuel = hOwner && aOwner && hOwner !== aOwner;
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "minmax(0,1fr) auto minmax(0,1fr)",
      gap: 12,
      alignItems: "center",
      background: "rgba(255,255,255,.04)",
      border: isDuel ? "1px solid rgba(245,158,11,.22)" : "1px solid rgba(255,255,255,.08)",
      borderRadius: 14,
      padding: 14,
      marginBottom: 8,
    }}>
      <TeamBlock team={match.homeTeam} />
      <div style={{ textAlign: "center", color: "#94a3b8", fontWeight: 900, minWidth: 58 }}>
        {match.time || "--:--"}<br />
        <span style={{ fontSize: 11, color: isDuel ? "#fbbf24" : "#475569" }}>{isDuel ? "DUELL" : "VS"}</span>
      </div>
      <TeamBlock team={match.awayTeam} align="right" />
    </div>
  );
}

function StandingCard({ row, index, liveMode = false, officialMeta = null }) {
  const currentRank = index + 1;
  const officialRank = officialMeta?.rank || currentRank;
  const rankDelta = officialRank - currentRank;
  const officialPts = officialMeta?.row?.pts ?? row.pts;
  const ptsDelta = row.pts - officialPts;

  return (
    <article style={{
      border: `1px solid ${index === 0 ? (liveMode ? "rgba(239,68,68,.32)" : "rgba(245,158,11,.28)") : "rgba(255,255,255,.08)"}`,
      borderRadius: 18,
      overflow: "hidden",
      background: index === 0
        ? liveMode
          ? "linear-gradient(135deg,rgba(239,68,68,.13),rgba(255,255,255,.04))"
          : "linear-gradient(135deg,rgba(245,158,11,.13),rgba(255,255,255,.04))"
        : "rgba(255,255,255,.035)",
      boxShadow: index === 0 ? (liveMode ? "0 10px 30px rgba(239,68,68,.08)" : "0 10px 30px rgba(245,158,11,.08)") : "none",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 14px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 38,
            height: 38,
            flex: "0 0 38px",
            display: "grid",
            placeItems: "center",
            borderRadius: 14,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.08)",
            fontSize: index < 3 ? 20 : 16,
            fontWeight: 900,
          }}>{rankLabel(index)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: COLORS[row.person], flexShrink: 0 }} />
              <strong style={{ color: COLORS[row.person], fontSize: 18, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.person}</strong>
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: "#64748b", fontWeight: 700 }}>{row.played} Spiele gewertet</div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: "#64748b", fontWeight: 900, letterSpacing: ".5px" }}>PUNKTE</div>
          <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 950, color: COLORS[row.person], letterSpacing: "-1px" }}>{row.pts}</div>
        </div>
      </div>

      {liveMode && officialMeta && (
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", padding: "0 14px 10px" }}>
          <InfoPill label="Live-Platz" value={rankMovementText(rankDelta, currentRank)} color={movementColor(rankDelta)} />
          <InfoPill label="Live-Punkte" value={pointsMovementText(ptsDelta)} color={movementColor(ptsDelta)} />
          <InfoPill label="Offiziell" value={`#${officialRank} · ${officialPts}P`} />
        </div>
      )}

      <div style={{ display: "flex", gap: 7, padding: "0 14px 12px", flexWrap: "wrap" }}>
        <StatChip label="S" value={row.won} color="#34d399" />
        <StatChip label="U" value={row.drawn} color="#cbd5e1" />
        <StatChip label="N" value={row.lost} color="#f87171" />
        <StatChip label="Tore" value={`${row.gf}:${row.ga}`} />
        <StatChip label="TD" value={`${row.td > 0 ? "+" : ""}${row.td}`} color={tdColor(row.td)} />
      </div>

      <div style={{ padding: "11px 14px 13px", borderTop: "1px solid rgba(255,255,255,.06)", background: "rgba(0,0,0,.13)" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {row.teams.map(team => (
            <span key={team} style={{
              maxWidth: "100%",
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.04)",
              color: "#cbd5e1",
              borderRadius: 999,
              padding: "6px 9px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}>{FLAGS[team] || ""} {DE[team] || team}</span>
          ))}
        </div>
      </div>
    </article>
  );
}

function StandingsList({ standings, liveMode = false, officialRanks = {} }) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {standings.map((row, i) => (
        <StandingCard
          key={row.person}
          row={row}
          index={i}
          liveMode={liveMode}
          officialMeta={liveMode ? officialRanks[row.person] : null}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [live, setLive] = useState([]);
  const [played, setPlayed] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);
  const [tab, setTab] = useState("standings");
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [lineups, setLineups] = useState({});
  const [lineupLoading, setLineupLoading] = useState({});
  const [lineupErrors, setLineupErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Daten konnten nicht geladen werden.");
      setLive(Array.isArray(data.live) ? data.live : []);
      setPlayed(Array.isArray(data.played) ? data.played : []);
      setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
      setUpdated(new Date());
    } catch (e) {
      setError(e.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  const openLineup = useCallback(async (match) => {
    const matchId = match?.id;
    if (!matchId) {
      setLineupErrors(prev => ({ ...prev, unknown: "Für dieses Spiel fehlt die Match-ID." }));
      return;
    }

    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      return;
    }

    setExpandedMatchId(matchId);
    if (lineups[matchId] || lineupLoading[matchId]) return;

    setLineupLoading(prev => ({ ...prev, [matchId]: true }));
    setLineupErrors(prev => ({ ...prev, [matchId]: "" }));

    try {
      const res = await fetch(`/api/match?id=${encodeURIComponent(matchId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Aufstellung konnte nicht geladen werden.");
      setLineups(prev => ({ ...prev, [matchId]: data.match }));
    } catch (e) {
      setLineupErrors(prev => ({ ...prev, [matchId]: e.message || "Aufstellung konnte nicht geladen werden." }));
    } finally {
      setLineupLoading(prev => ({ ...prev, [matchId]: false }));
    }
  }, [expandedMatchId, lineups, lineupLoading]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (live.length === 0) return undefined;
    const interval = window.setInterval(load, 30000);
    return () => window.clearInterval(interval);
  }, [live.length, load]);

  const teamStats = useMemo(() => buildTeamStats(played), [played]);
  const standings = useMemo(() => buildStandings(teamStats), [teamStats]);
  const officialRanks = useMemo(() => rankMap(standings), [standings]);

  const liveProjectionStats = useMemo(() => buildTeamStats([...played, ...live]), [played, live]);
  const liveProjectionStandings = useMemo(() => buildStandings(liveProjectionStats), [liveProjectionStats]);

  const upcomingByDate = useMemo(() => {
    return upcoming.reduce((acc, match) => {
      const key = match.date || "Datum offen";
      acc[key] ||= [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [upcoming]);

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg,#05091a,#0c1525 55%,#070d1c)", color: "#e2e8f0", fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif", padding: 14 }}>
      <section style={{ maxWidth: 920, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(23px, 7vw, 28px)", color: "#fbbf24", letterSpacing: "-.7px" }}>⚽ WM 2026 Liga</h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13, lineHeight: 1.35 }}>
              {loading ? "Lade Daten…" : updated ? `Stand: ${updated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr · ${live.length} live · ${played.length} Ergebnisse · ${upcoming.length} kommende Spiele` : "Bereit"}
            </p>
          </div>
          <button onClick={load} disabled={loading} style={{ border: "1px solid rgba(245,158,11,.35)", background: "rgba(245,158,11,.12)", color: "#fbbf24", borderRadius: 12, padding: "10px 14px", fontWeight: 800, cursor: loading ? "default" : "pointer", flexShrink: 0 }}>
            {loading ? "⏳ Lädt" : "🔄 Aktualisieren"}
          </button>
        </header>

        {error && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.35)", color: "#fca5a5", padding: 14, borderRadius: 14, marginBottom: 14 }}>❌ {error}</div>}

        <nav style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[
            ["standings", "🏆 Rangliste"],
            ["liveTable", live.length > 0 ? `📈 Live-Tabelle (${live.length})` : "📈 Live-Tabelle"],
            ["live", live.length > 0 ? `🔴 Live (${live.length})` : "🔴 Live"],
            ["upcoming", "📅 Nächste Spiele"],
            ["played", "⚽ Ergebnisse"],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ border: "1px solid rgba(255,255,255,.1)", background: tab === id ? "rgba(245,158,11,.18)" : "rgba(255,255,255,.04)", color: tab === id ? "#fbbf24" : "#cbd5e1", borderRadius: 999, padding: "9px 13px", fontWeight: 800, cursor: "pointer", flex: "1 1 auto" }}>{label}</button>
          ))}
        </nav>

        {tab === "standings" && (
          <>
            <div style={{ marginBottom: 10, color: "#94a3b8", fontSize: 13, lineHeight: 1.4, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: 12 }}>
              🏆 Offizielle Rangliste: Hier zählen nur beendete Spiele.
            </div>
            <StandingsList standings={standings} />
          </>
        )}

        {tab === "liveTable" && (
          <>
            <div style={{ marginBottom: 10, color: "#fecaca", fontSize: 13, lineHeight: 1.4, background: "rgba(239,68,68,.10)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 14, padding: 12 }}>
              📈 Live-Prognose: Diese Tabelle rechnet laufende Spiele mit dem aktuellen Zwischenstand ein. Wenn kein Spiel live ist, entspricht sie der offiziellen Rangliste.
            </div>
            {live.length > 0 && (
              <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                {live.map((m, i) => <ScoreCard key={`live-table-${m.id || m.homeTeam}-${m.awayTeam}-${i}`} match={m} live />)}
              </div>
            )}
            <StandingsList standings={liveProjectionStandings} liveMode officialRanks={officialRanks} />
          </>
        )}

        {tab === "live" && (
          <div style={{ display: "grid", gap: 10 }}>
            {live.length === 0 && <p style={{ color: "#94a3b8", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", padding: 14, borderRadius: 14 }}>Gerade läuft kein Spiel aus eurer Liga.</p>}
            {live.length > 0 && (
              <div style={{ marginBottom: 2, color: "#94a3b8", fontSize: 13, lineHeight: 1.4, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 14, padding: 12 }}>
                Tippe ein Live-Spiel an, um Startelf und Bank zu laden, falls football-data.org die Aufstellung für dieses Spiel bereitstellt.
              </div>
            )}
            {live.map((m, i) => {
              const matchId = m.id || `${m.homeTeam}-${m.awayTeam}-${i}`;
              const selected = expandedMatchId === m.id;
              return (
                <div key={`live-${matchId}`} style={{ display: "grid", gap: 8 }}>
                  <ScoreCard match={m} live onClick={() => openLineup(m)} selected={selected} />
                  {selected && (
                    <LineupPanel
                      match={m}
                      data={lineups[m.id]}
                      loading={!!lineupLoading[m.id]}
                      error={lineupErrors[m.id]}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "upcoming" && (
          <div style={{ display: "grid", gap: 12 }}>
            {live.length > 0 && (
              <section style={{ marginBottom: 6 }}>
                <h2 style={{ fontSize: 15, color: "#ef4444", margin: "0 0 8px" }}>🔴 Läuft gerade</h2>
                <div style={{ display: "grid", gap: 8 }}>{live.map((m, i) => <ScoreCard key={`upcoming-live-${m.id || m.homeTeam}-${m.awayTeam}-${i}`} match={m} live />)}</div>
              </section>
            )}
            {Object.keys(upcomingByDate).length === 0 && <p style={{ color: "#94a3b8" }}>Keine kommenden Spiele gefunden.</p>}
            {Object.entries(upcomingByDate).map(([date, matches]) => (
              <section key={date}>
                <h2 style={{ fontSize: 15, color: "#fbbf24" }}>{formatDate(date)}</h2>
                {matches.map((m, i) => <UpcomingCard key={`${date}-${m.id || i}`} match={m} />)}
              </section>
            ))}
          </div>
        )}

        {tab === "played" && (
          <div style={{ display: "grid", gap: 10 }}>
            {played.length === 0 && <p style={{ color: "#94a3b8" }}>Noch keine Ergebnisse verfügbar.</p>}
            {played.map((m, i) => <ScoreCard key={`played-${m.id || m.homeTeam}-${m.awayTeam}-${i}`} match={m} />)}
          </div>
        )}
      </section>
    </main>
  );
}
