import { useCallback, useEffect, useMemo, useState } from "react";
import HeadToHead from "./HeadToHead";
import { PARTICIPANTS, FLAGS, DE, COLORS, displayTeamName, FIFA_RANKS } from "./shared";
import { formatDate, formatCountdown, statusLabel, rankLabel, tdColor, movementColor, pointsMovementText, rankMovementText } from './utils/format.js';
import { buildTeamStats, buildStandings, compareStandingRows, rankMap, buildHeadToHeadStats, buildFormComparisonRows, buildMyAnalysis, buildOpenMatchMap, buildMaxPossibleRows, getPersonMatches, getMatchTitle, buildGroupData, ownerOf, matchSortAsc, matchSortDesc } from './utils/standings.js';
import { useScores } from './hooks/useScores.js';
import { useStandings } from './hooks/useStandings.js';
import './App.css';


const NAV_ITEMS = [
  { id: "liga", label: "Liga", icon: "🏆" },
  { id: "live", label: "Live", icon: "🔴" },
  { id: "spiele", label: "Spiele", icon: "⚽" },
  { id: "stats", label: "Stats", icon: "📊" },
  { id: "mein", label: "Mein", icon: "👤" },
];

const SUB_TABS = {
  live: [
    { id: "laufend", label: "Laufend" },
    { id: "prognose", label: "Prognose" },
  ],
  spiele: [
    { id: "demnaechst", label: "Demnächst" },
    { id: "ergebnisse", label: "Ergebnisse" },
    { id: "gruppen", label: "Gruppen" },
    { id: "ko", label: "K.o." },
  ],
  stats: [
    { id: "max", label: "Max Punkte" },
    { id: "form", label: "Form" },
    { id: "h2h", label: "Head-to-Head" },
    { id: "gruppendritte", label: "Gruppendritte" },
  ],
};

function getMatchPointImpact(match) {
  const hOwner = ownerOf(match.homeTeam);
  const aOwner = ownerOf(match.awayTeam);
  const hg = Number(match.homeGoals);
  const ag = Number(match.awayGoals);
  if (!Number.isFinite(hg) || !Number.isFinite(ag)) return [];
  if (hg > ag) return [{ person: hOwner, pts: 3 }, { person: aOwner, pts: 0 }].filter(x => x.person);
  if (ag > hg) return [{ person: hOwner, pts: 0 }, { person: aOwner, pts: 3 }].filter(x => x.person);
  return [{ person: hOwner, pts: 1 }, { person: aOwner, pts: 1 }].filter(x => x.person);
}

const KNOCKOUT_ROUNDS = [
  { id: "LAST_32", label: "Runde der letzten 32" },
  { id: "LAST_16", label: "Achtelfinale" },
  { id: "QUARTER_FINALS", label: "Viertelfinale" },
  { id: "SEMI_FINALS", label: "Halbfinale" },
  { id: "THIRD_PLACE", label: "Spiel um Platz 3" },
  { id: "FINAL", label: "Finale" },
];


const RANK_SNAPSHOT_KEY = "wm-liga-rank-snapshot";
function loadRankSnapshot() {
  try {
    const raw = window.localStorage.getItem(RANK_SNAPSHOT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveRankSnapshot(standings) {
  try {
    const snapshot = standings.reduce((acc, row, i) => { acc[row.person] = i + 1; return acc; }, {});
    window.localStorage.setItem(RANK_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {}
}

function InfoPill({ label, value, color }) {
  return <span className="info-pill" style={{ "--pill": color || "#94a3b8" }}><span>{label}</span>{value}</span>;
}

function StatChip({ label, value, color }) {
  return <div className="stat-chip"><span>{label}</span><strong style={{ color: color || "#e2e8f0" }}>{value}</strong></div>;
}

function buildRoundProgress(person, allMatches) {
  const teams = PARTICIPANTS[person] || [];
  const rounds = [[], [], []];
  for (const team of teams) {
    const teamGames = allMatches
      .filter(m => m.homeTeam === team || m.awayTeam === team)
      .sort((a, b) => (`${a.date || "9999"} ${a.time || "99:99"}`).localeCompare(`${b.date || "9999"} ${b.time || "99:99"}`));
    for (let i = 0; i < 3; i++) {
      if (teamGames[i]) rounds[i].push(teamGames[i]);
    }
  }
  return rounds.map((games, i) => ({
    round: i + 1,
    played: games.filter(g => g.status === "FINISHED").length,
    total: games.length,
  }));
}

function TeamBlock({ team, align = "left" }) {
  const owner = ownerOf(team);
  return <div className="team-block" style={{ textAlign: align }}>
    <strong>{align === "right" ? `${DE[team] || team || "Team"} ${FLAGS[team] || ""}`.trim() : displayTeamName(team)}</strong>
    {owner && <small style={{ color: COLORS[owner] }}>{owner}</small>}
  </div>;
}

function Header({ loading, updated, liveCount, playedCount, upcomingCount, secondsLeft, onRefresh }) {
  const updatedText = updated ? updated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  return <header className="app-header">
    <div className="header-title-row">
      <div>
        <h1>⚽ WM 2026 Liga</h1>
        <p>{loading ? "Lade Daten…" : `${liveCount} live · ${playedCount} Ergebnisse · ${upcomingCount} kommende Spiele`}</p>
      </div>
      <button className="refresh-btn" onClick={onRefresh} disabled={loading} aria-label="Daten aktualisieren">{loading ? "⏳" : "↻"}</button>
    </div>
    <div className="header-meta-row">
      <span>Stand: {updatedText} Uhr</span>
      <div className="countdown-pill" title="Zeit bis zum nächsten automatischen Update">
        <span className="countdown-dot" />
        <span>Update</span>
        <strong>{formatCountdown(secondsLeft)}</strong>
      </div>
    </div>
  </header>;
}

function BottomNav({ active, onChange, liveCount }) {
  return <nav className="bottom-nav" aria-label="Hauptnavigation">
    {NAV_ITEMS.map(item => <button key={item.id} className={`bottom-nav-item ${active === item.id ? "active" : ""}`} onClick={() => onChange(item.id)}>
      <span className="nav-icon">{item.icon}</span>
      <span>{item.label}</span>
      {item.id === "live" && liveCount > 0 && <em>{liveCount}</em>}
      <i />
    </button>)}
  </nav>;
}

function SubTabs({ activeTab, activeSubTab, onChange, liveCount }) {
  const items = SUB_TABS[activeTab];
  if (!items) return null;
  return <nav className="sub-tabs" aria-label="Untermenü">
    {items.map(item => <button key={item.id} className={activeSubTab === item.id ? "active" : ""} onClick={() => onChange(item.id)}>
      {item.label}{item.id === "laufend" && liveCount > 0 ? <span>{liveCount}</span> : null}
    </button>)}
  </nav>;
}

function StandingRow({ row, index, maxPts, open, onToggle, liveMode = false, officialMeta = null, prevRankSnapshot = null, onTeamClick = null, liveRankMap = null, allMatches = [] }) {
  const progress = maxPts > 0 ? Math.max(row.pts === 0 ? 0 : 6, Math.round((row.pts / maxPts) * 100)) : 0;
  const currentRank = index + 1;
  const officialRank = officialMeta?.rank || currentRank;
  const rankDelta = officialRank - currentRank;
  const officialPts = officialMeta?.row?.pts ?? row.pts;
  const ptsDelta = row.pts - officialPts;
  const prevRank = prevRankSnapshot?.[row.person] ?? null;
  const sessionDelta = prevRank !== null ? prevRank - currentRank : null;
  const liveProjectedRank = liveRankMap?.[row.person] ?? null;
  const liveDelta = liveProjectedRank !== null ? currentRank - liveProjectedRank : null;
  const displayDelta = (liveDelta !== null && liveDelta !== 0) ? liveDelta : sessionDelta;
  const sortedTeams = [...row.teams].sort((a, b) => (FIFA_RANKS[a] ?? 999) - (FIFA_RANKS[b] ?? 999));
  const placementClass = index === 0 ? "first" : index < 3 ? "podium" : "normal";
  return <article className={`standing-row ${placementClass} ${open ? "open" : ""}`} style={{ "--accent": COLORS[row.person], "--progress": `${progress}%` }}>
    <button className="standing-main" onClick={onToggle}>
      <span className="rank-badge">{rankLabel(index)}</span>
      {displayDelta !== null && displayDelta !== 0 && <span className="rank-delta" style={{ color: displayDelta > 0 ? "#34d399" : "#f87171" }}>{displayDelta > 0 ? `▲${displayDelta}` : `▼${Math.abs(displayDelta)}`}</span>}
      <span className="person-dot" />
      <span className="standing-name-wrap">
        <strong>{row.person}</strong>
        <small>{sortedTeams.map(team => FLAGS[team] || "").join(" ")}</small>
      </span>
      <span className="standing-points"><small>Pkt</small><strong>{row.pts}</strong></span>
    </button>
    <div className="progress-wrap"><div className="progress-track"><div /></div>{index === 0 && <span>Spitze</span>}</div>
    {liveMode && officialMeta && <div className="live-movement-row">
      <InfoPill label="Live-Platz" value={rankMovementText(rankDelta, currentRank)} color={movementColor(rankDelta)} />
      <InfoPill label="Live-Punkte" value={pointsMovementText(ptsDelta)} color={movementColor(ptsDelta)} />
      <InfoPill label="Offiziell" value={`#${officialRank} · ${officialPts}P`} />
    </div>}
    <div className="standing-details">
      <div className="stat-grid">
        <StatChip label="S" value={row.won} color="#34d399" />
        <StatChip label="U" value={row.drawn} />
        <StatChip label="N" value={row.lost} color="#f87171" />
        <StatChip label="Tore" value={`${row.gf}:${row.ga}`} />
        <StatChip label="TD" value={`${row.td > 0 ? "+" : ""}${row.td}`} color={tdColor(row.td)} />
      </div>
      {!liveMode && allMatches.length > 0 && (() => {
        const rounds = buildRoundProgress(row.person, allMatches);
        return (
          <div className="round-progress">
            {rounds.map(r => {
              const done = r.total > 0 && r.played === r.total;
              const partial = r.played > 0 && !done;
              return (
                <div key={r.round} className={`round-chip${done ? " done" : partial ? " partial" : " pending"}`}>
                  <span className="round-label">Runde {r.round}</span>
                  <span className="round-status">
                    {done ? "✅" : partial ? `⏳ ${r.played}/${r.total}` : "🔜"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
      <div className="team-pill-grid">
        {sortedTeams.map(team => (
          <span
            key={team}
            onClick={e => { e.stopPropagation(); onTeamClick && onTeamClick(team); }}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onTeamClick && onTeamClick(team); } }}
            style={{ cursor: "pointer" }}
          >
            {displayTeamName(team)}
          </span>
        ))}
      </div>
    </div>
  </article>;
}

function StandingsPanel({ standings, liveMode = false, officialRanks = {}, openPerson, setOpenPerson, prevRankSnapshot = null, onTeamClick = null, liveRankMap = null, allMatches = [] }) {
  const maxPts = Math.max(1, ...standings.map(row => row.pts));
  if (!standings.length) return <EmptyState title="Noch keine Tabelle" text="Sobald Ergebnisse geladen werden, erscheint hier die Rangliste." />;
  return <div className="standings-list">
    {standings.map((row, index) => <StandingRow key={row.person} row={row} index={index} maxPts={maxPts} open={openPerson === row.person} onToggle={() => setOpenPerson(openPerson === row.person ? "" : row.person)} liveMode={liveMode} officialMeta={liveMode ? officialRanks[row.person] : null} prevRankSnapshot={prevRankSnapshot} onTeamClick={onTeamClick} liveRankMap={liveRankMap} allMatches={allMatches} />)}
  </div>;
}

function ScoreCard({ match, live = false, onClick = null, selected = false, compact = false }) {
  const clickable = typeof onClick === "function";
  const hg = Number(match.homeGoals);
  const ag = Number(match.awayGoals);
  const hasScore = Number.isFinite(hg) && Number.isFinite(ag);
  const hOwner = ownerOf(match.homeTeam);
  const aOwner = ownerOf(match.awayTeam);
  const isDuel = hOwner && aOwner && hOwner !== aOwner;
  const impacts = live ? getMatchPointImpact(match) : [];
  const handleKeyDown = event => {
    if (!clickable) return;
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); }
  };
  return <article className={`match-card ${live ? "live" : ""} ${selected ? "selected" : ""} ${compact ? "compact" : ""}`} onClick={onClick || undefined} onKeyDown={handleKeyDown} role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : undefined}>
    {match.group && !compact && <div className="match-group-label">Gruppe {match.group}</div>}
    <div className="match-grid">
      <TeamBlock team={match.homeTeam} />
      <div className="score-center">
        <div className="status-pill">{live && <span />} {statusLabel(match.status)}</div>
        <strong>{hasScore ? `${hg}:${ag}` : (match.time || "vs")}</strong>
        {(match.minute || (!hasScore && match.time)) && <small>{match.minute ? `${match.minute}'` : "Uhr"}</small>}
        {!live && match.date && <em>{formatDate(match.date, { compact: true })}</em>}
        {clickable && <b>{selected ? "Match-Center offen" : "Tippen"}</b>}
      </div>
      <TeamBlock team={match.awayTeam} align="right" />
    </div>
    {impacts.length > 0 && <div className="impact-row">{impacts.map((item, index) => <InfoPill key={`${item.person}-${item.pts}-${index}`} label={item.person} value={`+${item.pts}P wenn's so bleibt`} color={COLORS[item.person]} />)}</div>}
  </article>;
}

function buildScenarioStandings(standings, match, pointsByPerson) {
  const updated = standings.map(row => {
    const added = pointsByPerson[row.person] || 0;
    return added ? { ...row, pts: row.pts + added } : { ...row };
  });
  return updated.sort(compareStandingRows);
}

function buildUpcomingScenarios(match, standings) {
  const homeOwner = ownerOf(match.homeTeam);
  const awayOwner = ownerOf(match.awayTeam);
  const currentRanks = rankMap(standings);
  const sameOwner = homeOwner && homeOwner === awayOwner;
  const directOwners = [...new Set([homeOwner, awayOwner].filter(Boolean))];
  const scenarios = [
    {
      id: "home",
      label: `${DE[match.homeTeam] || match.homeTeam}-Sieg`,
      points: homeOwner ? { [homeOwner]: 3 } : {},
      blocked: awayOwner && awayOwner !== homeOwner ? [awayOwner] : [],
    },
    {
      id: "draw",
      label: "Remis",
      points: sameOwner
        ? { [homeOwner]: 2 }
        : Object.fromEntries([[homeOwner, 1], [awayOwner, 1]].filter(([person]) => person)),
      blocked: directOwners,
    },
    {
      id: "away",
      label: `${DE[match.awayTeam] || match.awayTeam}-Sieg`,
      points: awayOwner ? { [awayOwner]: 3 } : {},
      blocked: homeOwner && homeOwner !== awayOwner ? [homeOwner] : [],
    },
  ];

  return scenarios.map(scenario => {
    const projected = buildScenarioStandings(standings, match, scenario.points);
    const projectedRanks = rankMap(projected);
    const rankGainers = standings
      .filter(row => !directOwners.includes(row.person))
      .map(row => {
        const oldRank = currentRanks[row.person]?.rank || 999;
        const newRank = projectedRanks[row.person]?.rank || oldRank;
        return { person: row.person, oldRank, newRank };
      })
      .filter(item => item.newRank < item.oldRank)
      .sort((a, b) => a.newRank - b.newRank);

    const closeBeneficiaries = scenario.blocked.flatMap(blockedPerson => {
      const blockedMeta = currentRanks[blockedPerson];
      if (!blockedMeta) return [];
      return standings
        .filter(row => !directOwners.includes(row.person))
        .filter(row => {
          const rowRank = currentRanks[row.person]?.rank || 999;
          const pointsGap = blockedMeta.row.pts - row.pts;
          return rowRank > blockedMeta.rank && pointsGap >= 0 && pointsGap <= 3;
        })
        .map(row => ({ person: row.person, blockedPerson }));
    });

    const seen = new Set(rankGainers.map(item => item.person));
    const indirect = closeBeneficiaries.filter(item => {
      if (seen.has(item.person)) return false;
      seen.add(item.person);
      return true;
    });

    return { ...scenario, rankGainers, indirect };
  });
}

function MatchImpactPanel({ match, standings }) {
  const [open, setOpen] = useState(false);
  const homeOwner = ownerOf(match.homeTeam);
  const awayOwner = ownerOf(match.awayTeam);
  if (!homeOwner && !awayOwner) return null;
  const sameOwner = homeOwner && homeOwner === awayOwner;
  const title = sameOwner
    ? `${homeOwner} hat beide Teams`
    : homeOwner && awayOwner
      ? `Direktes Duell: ${homeOwner} vs ${awayOwner}`
      : `${homeOwner || awayOwner} kann punkten`;
  const scenarios = buildUpcomingScenarios(match, standings);

  return <div className={`match-impact-panel${open ? " open" : ""}`}>
    <button className="match-impact-toggle" onClick={() => setOpen(!open)}>
      <span>{title}</span>
      <strong>{open ? "▲" : "▼"}</strong>
    </button>
    {open && <div className="match-impact-body">
      <p>Auswirkung auf eure Tabelle, wenn dieses Ergebnis so kommt.</p>
      <div className="impact-scenario-list">
        {scenarios.map(scenario => {
          const pointText = Object.entries(scenario.points)
            .map(([person, pts]) => `${person} +${pts}`)
            .join(" · ");
          return <article className="impact-scenario" key={scenario.id}>
            <div className="impact-scenario-head">
              <strong>{scenario.label}</strong>
              {pointText && <span>{pointText}</span>}
            </div>
            {scenario.rankGainers.length > 0 ? (
              <p>{scenario.rankGainers.map(item => `${item.person} steigt auf Platz ${item.newRank}`).join(" · ")}</p>
            ) : scenario.indirect.length > 0 ? (
              <p>Gut für {scenario.indirect.map(item => item.person).join(", ")}, weil {scenario.indirect.map(item => item.blockedPerson).filter((person, index, arr) => arr.indexOf(person) === index).join(" und ")} Punkte liegen lässt.</p>
            ) : (
              <p>Kein direkter Platzgewinn für andere Spieler.</p>
            )}
          </article>;
        })}
      </div>
    </div>}
  </div>;
}

function UpcomingCard({ match, standings }) {
  return <div className="upcoming-match-item">
    <ScoreCard match={match} compact />
    <MatchImpactPanel match={match} standings={standings} />
  </div>;
}

function PlayerRow({ player, index }) {
  const number = player?.shirtNumber || player?.number || "";
  const position = player?.position || "";
  return <div className="player-row">
    <span>{number || index + 1}</span>
    <div><strong>{player?.name || "Unbekannt"}</strong>{position && <small>{position}</small>}</div>
  </div>;
}

function PlayerList({ title, players = [], emptyText }) {
  return <section className="player-list"><h4>{title} <span>({players.length})</span></h4>
    {players.length === 0 ? <p>{emptyText}</p> : <div>{players.map((player, index) => <PlayerRow key={`${player.id || player.name || index}-${index}`} player={player} index={index} />)}</div>}
  </section>;
}

function TeamLineup({ team, fallbackName }) {
  const lineup = Array.isArray(team?.lineup) ? team.lineup : [];
  const bench = Array.isArray(team?.bench) ? team.bench : [];
  const formation = team?.formation;
  const coach = team?.coach?.name;
  return <article className="lineup-card">
    <div className="lineup-head"><div><h3>{team?.name || fallbackName || "Team"}</h3>{coach && <small>Coach: {coach}</small>}</div>{formation && <span>{formation}</span>}</div>
    <PlayerList title="Startelf" players={lineup} emptyText="Keine Startelf-Daten geliefert." />
    <PlayerList title="Bank" players={bench} emptyText="Keine Bank-Daten geliefert." />
  </article>;
}

function EventList({ events = [] }) {
  if (!events.length) return <p className="soft-text">Keine Events geliefert.</p>;
  return <div className="event-list">{events.map((event, index) => <div key={`${event.minute}-${event.player}-${index}`} className="event-row">
    <strong>{event.minute || "–"}</strong>
    <div><b>{event.type || "Event"}{event.detail ? ` · ${event.detail}` : ""}</b><small>{event.team ? `${DE[event.team] || event.team}: ` : ""}{event.player || ""}{event.assist ? ` · Assist: ${event.assist}` : ""}</small></div>
  </div>)}</div>;
}

function MatchCenterPanel({ match, data, loading, error, cached }) {
  const [mcTab, setMcTab] = useState("events");
  const hasHomePlayers = (data?.homeTeam?.lineup?.length || 0) + (data?.homeTeam?.bench?.length || 0) > 0;
  const hasAwayPlayers = (data?.awayTeam?.lineup?.length || 0) + (data?.awayTeam?.bench?.length || 0) > 0;
  const hasAnyPlayers = hasHomePlayers || hasAwayPlayers;
  const events = Array.isArray(data?.events) ? data.events : [];
  const hasContent = hasAnyPlayers || events.length > 0;
  return <div className="match-center-panel">
    {loading && <p className="loading-line">⏳ Lade Match-Center…</p>}
    {error && <p className="error-line">❌ {error}</p>}
    {!loading && !error && data && <>
      <div className="source-line">Quelle: {data.lineupSourceLabel || data.sourceLabel || "football-data.org"}{cached ? " · aus 5-Minuten-Cache" : ""}</div>
      <div className="impact-row"><InfoPill label="Status" value={statusLabel(match.status)} color="#fbbf24" />{getMatchPointImpact(match).map((item, index) => <InfoPill key={`${item.person}-${index}`} label={item.person} value={`${item.pts}P`} color={COLORS[item.person]} />)}</div>
      {!hasContent && <div className="hint-box">{data.lineupFallbackReason || "Für dieses Spiel liefert die API aktuell keine Startelf-, Bank- oder Event-Daten."}</div>}
      {hasContent && <>
        <div className="mc-tabs">
          <button className={mcTab === "events" ? "active" : ""} onClick={() => setMcTab("events")}>⚡ Events {events.length > 0 && `(${events.length})`}</button>
          <button className={mcTab === "lineup" ? "active" : ""} onClick={() => setMcTab("lineup")}>👥 Aufstellung</button>
        </div>
        {mcTab === "events" && <section className="match-section"><EventList events={events} /></section>}
        {mcTab === "lineup" && <div className="lineup-grid"><TeamLineup team={data.homeTeam} fallbackName={displayTeamName(match.homeTeam)} /><TeamLineup team={data.awayTeam} fallbackName={displayTeamName(match.awayTeam)} /></div>}
      </>}
    </>}
  </div>;
}

function LivePanel({ live, expandedMatchId, openMatchCenter, matchCenters, matchCenterLoading, matchCenterErrors, cachedMatchCenters }) {
  if (live.length === 0) return <EmptyState title="Gerade läuft kein Spiel" text="Sobald ein Spiel aus eurer Liga live ist, erscheint es hier mit Match-Center." />;
  return <div className="card-stack">
    <div className="hint-box red">Tippe ein Spiel an für Match-Center, Startelf, Bank und Events.</div>
    {live.map((m, index) => {
      const matchId = m.id || `${m.homeTeam}-${m.awayTeam}-${index}`;
      const selected = expandedMatchId === m.id;
      return <div className="card-stack" key={`live-${matchId}`}>
        <ScoreCard match={m} live onClick={() => openMatchCenter(m)} selected={selected} />
        {selected && <MatchCenterPanel match={m} data={matchCenters[m.id]} loading={!!matchCenterLoading[m.id]} error={matchCenterErrors[m.id]} cached={!!cachedMatchCenters[m.id]} />}
      </div>;
    })}
  </div>;
}

function ProjectionPanel({ live, liveProjectionStandings, officialRanks, openPerson, setOpenPerson }) {
  return <div className="card-stack">
    <div className="hint-box red">Prognose mit aktuellem Live-Stand. Ändert sich beim nächsten Auto-Update oben im Timer.</div>
    {live.length > 0 && <div className="card-stack slim">{live.map((m, i) => <ScoreCard key={`projection-live-${m.id || i}`} match={m} live compact />)}</div>}
    <StandingsPanel standings={liveProjectionStandings} liveMode officialRanks={officialRanks} openPerson={openPerson} setOpenPerson={setOpenPerson} />
  </div>;
}

function GroupsPanel({ live, played, upcoming }) {
  const [openGroups, setOpenGroups] = useState(new Set());
  const liveIds = new Set(live.map(m => m.id).filter(Boolean));
  const groupData = buildGroupData(live, played, upcoming);
  if (groupData.length === 0) return <EmptyState title="Keine Gruppen-Daten" text="Sobald die API Gruppenspiele liefert, erscheinen hier alle Gruppen." />;

  const toggleGroup = group => setOpenGroups(prev => {
    const next = new Set(prev);
    if (next.has(group)) next.delete(group); else next.add(group);
    return next;
  });
  const allOpen = openGroups.size === groupData.length;
  const toggleAll = () => setOpenGroups(allOpen ? new Set() : new Set(groupData.map(g => g.group)));

  return <div className="card-stack">
    <button className="group-toggle-all" onClick={toggleAll}>{allOpen ? "Alle zuklappen ▲" : "Alle aufklappen ▼"}</button>
    {groupData.map(({ group, standings, matches }) => {
      const isOpen = openGroups.has(group);
      const liveCount = matches.filter(m => liveIds.has(m.id)).length;
      const leader = standings[0];
      const played2 = matches.filter(m => m.status === "FINISHED").length;
      return (
        <section className={`group-section${isOpen ? " open" : ""}`} key={group}>
          <button className="group-header" onClick={() => toggleGroup(group)}>
            <span className="group-letter">Gruppe {group}</span>
            {liveCount > 0 && <span className="group-live-pill">{liveCount} Live</span>}
            {!isOpen && leader && <span className="group-preview">{FLAGS[leader.team] || ""} {DE[leader.team] || leader.team} · {leader.pts}P</span>}
            {!isOpen && <span className="group-meta">{played2}/{matches.length}</span>}
            <span className="group-chevron">{isOpen ? "▲" : "▼"}</span>
          </button>
          {isOpen && <div className="group-body">
            <div className="group-table">
              <div className="group-table-head">
                <span>Team</span><span>Sp</span><span>S</span><span>U</span><span>N</span><span>Tore</span><span>Pkt</span>
              </div>
              {standings.map((row, i) => {
                const owner = ownerOf(row.team);
                return (
                  <div className={`group-table-row${i === 0 ? " leader" : ""}`} key={row.team}>
                    <span><span className="group-team-name">{displayTeamName(row.team)}</span>{owner && <span className="group-owner" style={{ color: COLORS[owner] }}>{owner}</span>}</span>
                    <span>{row.played}</span><span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span>
                    <span>{row.gf}:{row.ga}</span><span className="pts">{row.pts}</span>
                  </div>
                );
              })}
            </div>
            <div className="card-stack slim">
              {matches.map((m, i) => <ScoreCard key={`grp-${group}-${m.id || i}`} match={m} live={liveIds.has(m.id)} compact />)}
            </div>
          </div>}
        </section>
      );
    })}
  </div>;
}

function KnockoutTeamBlock({ team, align = "left" }) {
  const hasTeam = Boolean(team);
  const owner = hasTeam ? ownerOf(team) : "";
  return <div className={`ko-team-block ${!hasTeam ? "empty" : ""}`} style={{ textAlign: align }}>
    <strong>{hasTeam ? (align === "right" ? `${DE[team] || team} ${FLAGS[team] || ""}`.trim() : displayTeamName(team)) : "Noch offen"}</strong>
    {owner && <small style={{ color: COLORS[owner] }}>{owner}</small>}
  </div>;
}

function KnockoutCard({ match }) {
  const hg = Number(match.homeGoals);
  const ag = Number(match.awayGoals);
  const hasScore = Number.isFinite(hg) && Number.isFinite(ag);
  const homeOwner = ownerOf(match.homeTeam);
  const awayOwner = ownerOf(match.awayTeam);
  const hasOwners = homeOwner || awayOwner;

  return <article className="ko-match-card">
    <div className="ko-match-meta">
      <span>{match.date ? formatDate(match.date, { compact: true }) : "Datum offen"}</span>
      <span>{match.time || "--:--"} Uhr</span>
      <span>{statusLabel(match.status)}</span>
    </div>
    <div className="ko-match-grid">
      <KnockoutTeamBlock team={match.homeTeam} />
      <div className="ko-score-center">
        <strong>{hasScore ? `${hg}:${ag}` : "vs"}</strong>
      </div>
      <KnockoutTeamBlock team={match.awayTeam} align="right" />
    </div>
    {hasOwners && <div className="ko-owner-row">
      {homeOwner && <InfoPill label={homeOwner} value={DE[match.homeTeam] || match.homeTeam} color={COLORS[homeOwner]} />}
      {awayOwner && awayOwner !== homeOwner && <InfoPill label={awayOwner} value={DE[match.awayTeam] || match.awayTeam} color={COLORS[awayOwner]} />}
    </div>}
  </article>;
}

function KnockoutPanel({ knockout = [] }) {
  const [openRounds, setOpenRounds] = useState(() => new Set(["LAST_32"]));
  const matchesByStage = (Array.isArray(knockout) ? knockout : []).reduce((acc, match) => {
    const stage = match.stage || "UNKNOWN";
    acc[stage] ||= [];
    acc[stage].push(match);
    return acc;
  }, {});
  const availableRounds = KNOCKOUT_ROUNDS
    .map(round => ({ ...round, matches: (matchesByStage[round.id] || []).sort(matchSortAsc) }))
    .filter(round => round.matches.length > 0);

  if (!availableRounds.length) {
    return <EmptyState title="Noch keine K.o.-Spiele" text="Sobald football-data.org die K.o.-Phase liefert, erscheint hier der Turnierbaum." />;
  }

  const allOpen = availableRounds.every(round => openRounds.has(round.id));
  const toggleRound = stage => setOpenRounds(prev => {
    const next = new Set(prev);
    if (next.has(stage)) next.delete(stage); else next.add(stage);
    return next;
  });
  const toggleAll = () => setOpenRounds(allOpen ? new Set() : new Set(availableRounds.map(round => round.id)));

  return <div className="card-stack ko-panel">
    <div className="hint-box">Die K.o.-Termine sind schon da. Teams erscheinen automatisch, sobald sie nach der Gruppenphase feststehen.</div>
    <button className="group-toggle-all" onClick={toggleAll}>{allOpen ? "Alle zuklappen ▲" : "Alle aufklappen ▼"}</button>
    {availableRounds.map(round => {
      const isOpen = openRounds.has(round.id);
      const knownTeams = round.matches.reduce((count, match) => count + (match.homeTeam ? 1 : 0) + (match.awayTeam ? 1 : 0), 0);
      return <section className={`ko-round-section${isOpen ? " open" : ""}`} key={round.id}>
        <button className="ko-round-header" onClick={() => toggleRound(round.id)}>
          <span className="ko-round-title">{round.label}</span>
          <span className="ko-round-meta">{round.matches.length} Spiele · {knownTeams}/{round.matches.length * 2} Teams</span>
          <span className="group-chevron">{isOpen ? "▲" : "▼"}</span>
        </button>
        {isOpen && <div className="ko-round-body">
          {round.matches.map(match => <KnockoutCard key={match.id} match={match} />)}
        </div>}
      </section>;
    })}
  </div>;
}

function GamesPanel({ subTab, upcomingByDate, played, live, upcoming, knockout, standings }) {
  if (subTab === "ergebnisse") {
    return <div className="card-stack">{played.length === 0 ? <EmptyState title="Noch keine Ergebnisse" text="Beendete Spiele erscheinen hier automatisch." /> : played.map((m, i) => <ScoreCard key={`played-${m.id || i}`} match={m} />)}</div>;
  }
  if (subTab === "gruppen") {
    return <GroupsPanel live={live} played={played} upcoming={upcoming} />;
  }
  if (subTab === "ko") {
    return <KnockoutPanel knockout={knockout} />;
  }
  const dates = Object.keys(upcomingByDate);
  return <div className="card-stack">
    {live.length > 0 && <section className="section-block"><h2>🔴 Läuft gerade</h2><div className="card-stack slim">{live.map((m, i) => <ScoreCard key={`upcoming-live-${m.id || i}`} match={m} live compact />)}</div></section>}
    {dates.length === 0 && <EmptyState title="Keine kommenden Spiele" text="Sobald die API kommende Gruppenspiele liefert, landen sie hier." />}
    {dates.map(date => <section className="section-block" key={date}><h2>{formatDate(date)}</h2>{upcomingByDate[date].map((match, index) => <UpcomingCard key={`${date}-${match.id || index}`} match={match} standings={standings} />)}</section>)}
  </div>;
}

function StatsPanel({ subTab, maxPossibleRows, formRows, h2hStats, selectedPerson, setSelectedPerson, standings, teamStats, live, played, upcoming }) {
  if (subTab === "form") return <StatsFormCard rows={formRows} />;
  if (subTab === "h2h") return <HeadToHead stats={h2hStats} selectedPerson={selectedPerson} onSelectPerson={setSelectedPerson} />;
  if (subTab === "gruppendritte") return <GroupThirdsCard live={live} played={played} upcoming={upcoming} />;
  return <StatsMaxPointsCard rows={maxPossibleRows} />;
}

function StatsMaxPointsCard({ rows }) {
  if (!rows.length) return <EmptyState title="Keine Punkte-Daten" text="Sobald Ergebnisse geladen sind, erscheint hier die Maximalpunkte-Ansicht." />;
  return <article className="what-card analysis-card stats-card">
    <div className="analysis-head">
      <div>
        <h3>📈 Maximale mögliche Punkte</h3>
        <p>Aktuelle Punkte plus alle offenen Spiele mit 3 Punkten pro Sieg.</p>
      </div>
      <span className="analysis-badge">Alle Teilnehmer</span>
    </div>
    <div className="stats-list">
      {rows.map(row => (
        <div className="stats-row" key={row.person}>
          <div className="stats-row-main">
            <span className="stats-rank">{rankLabel(row.rank - 1)}</span>
            <div className="stats-name">
              <strong style={{ color: COLORS[row.person] }}>{row.person}</strong>
              <small>{row.pts} aktuell · {row.openCount} offen</small>
            </div>
          </div>
          <div className="stats-points">
            <strong>{row.maxPossiblePoints}</strong>
            <small>max</small>
          </div>
        </div>
      ))}
    </div>
  </article>;
}

function GroupThirdsCard({ live, played, upcoming }) {
  const groupData = buildGroupData(live, played, upcoming);
  const thirds = groupData
    .filter(g => g.standings.length >= 3)
    .map(g => ({ group: g.group, ...g.standings[2] }))
    .sort((a, b) =>
      b.pts - a.pts ||
      b.td - a.td ||
      b.gf - a.gf ||
      (FIFA_RANKS[a.team] || 999) - (FIFA_RANKS[b.team] || 999)
    );

  if (!thirds.length) return <EmptyState title="Noch keine Gruppendritte" text="Sobald in jeder Gruppe mindestens 2 Spiele gespielt wurden, erscheinen hier die Gruppendritten." />;

  return <article className="what-card analysis-card stats-card">
    <div className="analysis-head">
      <div>
        <h3>🔀 Gruppendritte</h3>
        <p>Die besten 8 von 12 kommen weiter. Sortiert nach Punkten, TD, Toren, FIFA-Rang.</p>
      </div>
      <span className="analysis-badge">{thirds.length}/12 Gruppen</span>
    </div>
    <div className="thirds-list">
      {thirds.map((t, i) => {
        const advancing = i < 8;
        const teamOwner = ownerOf(t.team);
        return (
          <div key={t.team}>
            {i === 0 && <div className="thirds-section-label advancing">✅ Kommen weiter — Plätze 1–8</div>}
            {i === 8 && <div className="thirds-section-label eliminated">❌ Scheiden aus — Plätze 9–12</div>}
            <div className={`thirds-row${advancing ? " advancing" : " eliminated"}`}>
              <span className="thirds-rank">{i + 1}.</span>
              <div className="thirds-team">
                <span className="thirds-flag">{FLAGS[t.team] || "🏳️"}</span>
                <div className="thirds-info">
                  <strong>{DE[t.team] || t.team}</strong>
                  <small>Gruppe {t.group}{teamOwner ? <> · <span style={{ color: COLORS[teamOwner] }}>{teamOwner}</span></> : ""}</small>
                </div>
              </div>
              <div className="thirds-stats">
                <span className="thirds-pts">{t.pts}P</span>
                <span className="thirds-td" style={{ color: tdColor(t.td) }}>{t.td > 0 ? "+" : ""}{t.td}</span>
                <span className="thirds-gf">{t.gf}T</span>
              </div>
            </div>
          </div>
        );
      })}
      {thirds.length < 12 && <p className="thirds-note">⏳ Noch {12 - thirds.length} Gruppe(n) ohne Drittplatzierten — Stand kann sich noch ändern.</p>}
    </div>
  </article>;
}

function StatsFormCard({ rows }) {
  if (!rows.length) return <EmptyState title="Keine Formdaten" text="Sobald Spiele gespielt wurden, erscheint hier die Teamform." />;
  return <article className="what-card analysis-card stats-card">
    <div className="analysis-head">
      <div>
        <h3>🔥 Form der letzten 5 Spiele</h3>
        <p>Vergleich der letzten Ergebnisse über alle Teilnehmer hinweg.</p>
      </div>
      <span className="analysis-badge">Letzte 5</span>
    </div>
    <div className="stats-form-grid">
      {rows.map(row => (
        <div className="stats-form-row" key={row.person}>
          <div className="stats-form-head">
            <strong style={{ color: COLORS[row.person] }}>{row.person}</strong>
            <small>{row.results.length ? `${row.results.length} Spiele` : "Keine Spiele"}</small>
          </div>
          <div className="form-results">
            {row.results.length > 0 ? [...row.results].reverse().map(({ emoji, match }, index) => <span key={`${row.person}-${match.id || index}-${index}`} className={`form-result ${emoji === "✅" ? "win" : emoji === "❌" ? "loss" : "draw"}`} title={`${displayTeamName(match.homeTeam)} vs ${displayTeamName(match.awayTeam)}`}>{emoji}</span>) : <span className="form-result muted">-</span>}
          </div>
        </div>
      ))}
    </div>
  </article>;
}


function PersonSelector({ selected, onSelect }) {
  return <div className="person-selector">{Object.keys(PARTICIPANTS).map(person => <button key={person} className={selected === person ? "active" : ""} onClick={() => onSelect(person)} style={{ "--accent": COLORS[person] }}>{person}</button>)}</div>;
}

function PersonTeamsPanel({ person, played, live, upcoming }) {
  const [openTeam, setOpenTeam] = useState("");
  const allMatches = [...played, ...live, ...upcoming];
  const finishedMatches = [...played, ...live.filter(match => Number.isFinite(Number(match.homeGoals)) && Number.isFinite(Number(match.awayGoals)))];
  const teamStats = buildTeamStats(finishedMatches);
  const groupData = buildGroupData(live, played, upcoming);
  const groupByTeam = {};
  for (const group of groupData) {
    group.standings.forEach((row, index) => {
      groupByTeam[row.team] = { group: group.group, rank: index + 1, row };
    });
  }
  const teams = PARTICIPANTS[person] || [];

  return <section className="section-block person-teams-panel">
    <div className="section-title-row">
      <h2>Teams von {person}</h2>
      <span>{teams.length}</span>
    </div>
    <div className="person-team-list">
      {teams.map(team => {
        const stats = teamStats[team] || { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
        const groupMeta = groupByTeam[team];
        const teamMatches = allMatches
          .filter(match => match.homeTeam === team || match.awayTeam === team)
          .sort(matchSortAsc);
        const isOpen = openTeam === team;
        const td = (stats.gf || 0) - (stats.ga || 0);
        return <article className={`person-team-card${isOpen ? " open" : ""}`} key={team}>
          <button className="person-team-toggle" onClick={() => setOpenTeam(isOpen ? "" : team)}>
            <span className="person-team-main">
              <strong>{displayTeamName(team)}</strong>
              <small>{groupMeta ? `Gruppe ${groupMeta.group} · Platz ${groupMeta.rank}` : "Gruppe offen"}</small>
            </span>
            <span className="person-team-score">
              <strong>{stats.pts || 0}P</strong>
              <small>{stats.gf || 0}:{stats.ga || 0}</small>
            </span>
            <span className="person-team-chevron">{isOpen ? "▲" : "▼"}</span>
          </button>
          {isOpen && <div className="person-team-body">
            <div className="stat-grid">
              <StatChip label="Sp" value={stats.played || 0} />
              <StatChip label="S" value={stats.won || 0} color="#34d399" />
              <StatChip label="U" value={stats.drawn || 0} />
              <StatChip label="N" value={stats.lost || 0} color="#f87171" />
              <StatChip label="Tore" value={`${stats.gf || 0}:${stats.ga || 0}`} />
              <StatChip label="TD" value={`${td > 0 ? "+" : ""}${td}`} color={tdColor(td)} />
            </div>
            {groupMeta && <div className="team-group-note">
              <strong>Aktuell Platz {groupMeta.rank} in Gruppe {groupMeta.group}</strong>
              <span>{groupMeta.rank === 1 ? "Gruppensieger-Kurs" : groupMeta.rank === 2 ? "Direkt weiter-Kurs" : groupMeta.rank === 3 ? "Dritter Platz" : "Muss aufholen"}</span>
            </div>}
            <div className="card-stack slim">
              {teamMatches.length === 0
                ? <EmptyState title="Keine Spiele gefunden" text="Für dieses Team sind aktuell keine Spiele geladen." compact />
                : teamMatches.map((match, index) => <ScoreCard key={`${team}-${match.id || index}`} match={match} live={live.some(item => item.id === match.id)} compact />)}
            </div>
          </div>}
        </article>;
      })}
    </div>
  </section>;
}

function PersonMatchesPanel({ person, played, live, upcoming }) {
  const liveIds = new Set(live.map(match => match.id).filter(Boolean));
  const matches = [...played, ...live, ...upcoming]
    .filter(match => ownerOf(match.homeTeam) === person || ownerOf(match.awayTeam) === person)
    .sort(matchSortAsc);
  const finishedCount = matches.filter(match => match.status === "FINISHED").length;
  const liveCount = matches.filter(match => liveIds.has(match.id)).length;
  const upcomingCount = matches.length - finishedCount - liveCount;

  return <section className="section-block person-matches-panel">
    <div className="section-title-row">
      <h2>Alle Spiele von {person}</h2>
      <span>{matches.length}</span>
    </div>
    <div className="person-match-summary">
      <InfoPill label="Beendet" value={finishedCount} color="#34d399" />
      <InfoPill label="Live" value={liveCount} color="#ef4444" />
      <InfoPill label="Offen" value={upcomingCount} color="#fbbf24" />
    </div>
    <div className="card-stack slim">
      {matches.length === 0
        ? <EmptyState title="Keine Spiele gefunden" text="Für diesen Teilnehmer sind aktuell keine Spiele in den geladenen Daten." compact />
        : matches.map((match, index) => (
            <ScoreCard
              key={`person-${person}-${match.id || index}`}
              match={match}
              live={liveIds.has(match.id)}
              compact
            />
          ))
      }
    </div>
  </section>;
}

function MyPanel({ selectedPerson, setSelectedPerson, standings, liveProjectionStandings, live, upcoming, played }) {
  const selectedRank = standings.findIndex(row => row.person === selectedPerson);
  const row = standings[selectedRank] || standings[0];
  const analysis = buildMyAnalysis(row?.person, standings, liveProjectionStandings, live, upcoming);
  if (!row) return <EmptyState title="Noch keine Daten" text="Sobald Ergebnisse geladen sind, erscheint hier dein Teilnehmerbereich." />;
  const nextMatch = analysis?.nextImportantMatch?.match || null;
  const nextMatchOpponent = analysis?.nextImportantMatch?.opponent || "";
  const canOvertakeList = analysis?.currentThreats || [];
  const reachableList = analysis?.reachable || [];
  return <div className="card-stack">
    <PersonSelector selected={row.person} onSelect={setSelectedPerson} />
    <article className="my-card" style={{ "--accent": COLORS[row.person] }}>
      <div className="my-head"><div><h2>{rankLabel(selectedRank)} {row.person}</h2><p>{row.played} Spiele gewertet</p></div><div><small>Pkt</small><strong>{row.pts}</strong></div></div>
      <div className="stat-grid"><StatChip label="S" value={row.won} color="#34d399" /><StatChip label="U" value={row.drawn} /><StatChip label="N" value={row.lost} color="#f87171" /><StatChip label="TD" value={`${row.td > 0 ? "+" : ""}${row.td}`} color={tdColor(row.td)} /></div>
    </article>
    <PersonTeamsPanel person={row.person} played={played} live={live} upcoming={upcoming} />
    <article className="what-card analysis-card">
      <div className="analysis-head">
        <div>
          <h3>🧮 Was muss passieren?</h3>
          <p>{analysis?.summary || "Keine Analyse verfügbar."}</p>
        </div>
        <span className="analysis-badge">{analysis?.rowIndex === 0 ? "Aktuell 1." : `Aktuell #${Math.max(1, selectedRank + 1)}`}</span>
      </div>
      <div className="scenario-cards">
        <article className="scenario-card best-case">
          <span className="scenario-icon">🏆</span>
          <div className="scenario-content">
            <strong>Best-Case: Platz {analysis?.winAllRank ?? selectedRank + 1}</strong>
            <p>Wenn du alle <b>{analysis?.openCount ?? 0}</b> Spiele gewinnst, holst du <b>{analysis?.maxExtraPoints ?? 0} Punkte</b> dazu.</p>
          </div>
          <span className="scenario-badge">+{analysis?.maxExtraPoints ?? 0} Punkte</span>
        </article>
        {canOvertakeList.length === 0
          ? <article className="scenario-card safe">
              <span className="scenario-icon">✅</span>
              <div className="scenario-content">
                <strong>Platz {selectedRank + 1} ist sicher</strong>
                <p>Niemand kann dich mit seinen restlichen Spielen mehr überholen.</p>
              </div>
              <span className="scenario-badge">Sicher</span>
            </article>
          : canOvertakeList.slice(0, 1).map(threat => (
              <article key={threat.person} className="scenario-card threat">
                <span className="scenario-icon">⚠️</span>
                <div className="scenario-content">
                  <strong style={{ color: COLORS[threat.person] }}>{threat.person} kann dich noch einholen</strong>
                  <p>{formatNeedLine(threat)}</p>
                </div>
                <span className="scenario-badge threat">Gefahr</span>
              </article>
            ))
        }
        {reachableList.length === 0
          ? <article className="scenario-card muted">
              <span className="scenario-icon">🎯</span>
              <div className="scenario-content">
                <strong>Niemand in Reichweite</strong>
                <p>Alle Teilnehmer vor dir liegen außer Reichweite.</p>
              </div>
              <span className="scenario-badge target">Ziel</span>
            </article>
          : reachableList.slice(0, 1).map(target => (
              <article key={target.person} className="scenario-card target">
                <span className="scenario-icon">🎯</span>
                <div className="scenario-content">
                  <strong style={{ color: COLORS[target.person] }}>{target.person} ist dein nächstes Ziel</strong>
                  <p>{formatNeedLine(target)}</p>
                </div>
                <span className="scenario-badge target">Erreichbar</span>
              </article>
            ))
        }
      </div>
    </article>
    <section className="section-block">
      <h2>Nächstes Spiel</h2>
      {nextMatch
        ? <>{nextMatch.date && <p className="next-match-date">{formatDate(nextMatch.date)}</p>}<ScoreCard match={nextMatch} live={live.includes(nextMatch)} compact /></>
        : <EmptyState title="Kein nächstes Spiel gefunden" text="Aktuell liefert die API kein anstehendes Spiel für diesen Teilnehmer." compact />
      }
    </section>
    <PersonMatchesPanel person={row.person} played={played} live={live} upcoming={upcoming} />
  </div>;
}

function EmptyState({ title, text, compact = false }) {
  return <div className={`empty-state ${compact ? "compact" : ""}`}><strong>{title}</strong><p>{text}</p></div>;
}

function formatNeedLine(item) {
  if (!item) return "";
  const tiePoints = item.pointsToTie ?? item.pointsNeeded ?? 0;
  const passPoints = item.pointsToPass ?? (tiePoints + 1);
  const pointsTextTie = tiePoints === 1 ? "1 Punkt" : `${tiePoints} Punkte`;
  const pointsTextPass = passPoints === 1 ? "1 Punkt" : `${passPoints} Punkte`;
  if (tiePoints === 0) {
    return item.tdNeededAtTie > 0
      ? `Punktgleichheit reicht noch nicht: +${item.tdNeededAtTie} Tordifferenz nötig.`
      : `Punktgleichheit reicht schon, die Tordifferenz ist besser.`;
  }
  return `${pointsTextTie} für Punktgleichheit, ${pointsTextPass} zum Überholen. Bei Punktgleichheit brauchst du +${item.tdNeededAtTie} Tordifferenz.`;
}

function TeamModal({ team, onClose, played, live, upcoming }) {
  const owner = ownerOf(team);
  const allFinished = [...played, ...live.filter(m => Number.isFinite(Number(m.homeGoals)) && Number.isFinite(Number(m.awayGoals)))];
  const stats = buildTeamStats(allFinished)[team] || { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 };
  const td = stats.gf - stats.ga;
  const teamMatches = [...played, ...live, ...upcoming]
    .filter(m => m.homeTeam === team || m.awayTeam === team)
    .sort(matchSortAsc);

  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    // iOS-kompatibler Scroll-Lock: body fixieren damit Hintergrund nicht scrollt
    const scrollY = window.scrollY;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{displayTeamName(team)}</h2>
            {owner && <small style={{ color: COLORS[owner] }}>Gehört {owner}</small>}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Schließen">✕</button>
        </div>
        <div className="modal-body">
          <div className="stat-grid">
            <StatChip label="S" value={stats.won} color="#34d399" />
            <StatChip label="U" value={stats.drawn} />
            <StatChip label="N" value={stats.lost} color="#f87171" />
            <StatChip label="Tore" value={`${stats.gf}:${stats.ga}`} />
            <StatChip label="TD" value={td > 0 ? `+${td}` : `${td}`} color={td > 0 ? "#34d399" : td < 0 ? "#f87171" : "#94a3b8"} />
          </div>
          <div className="modal-matches-title">Alle Spiele ({teamMatches.length})</div>
          <div className="card-stack">
            {teamMatches.length === 0
              ? <EmptyState title="Keine Spiele gefunden" text="Noch keine Matches für dieses Team verfügbar." />
              : teamMatches.map((m, i) => (
                  <ScoreCard
                    key={m.id || i}
                    match={m}
                    live={live.some(l => l.id === m.id)}
                    compact
                  />
                ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const {
    live, played, upcoming, knockout,
    loading, error, updated, secondsLeft,
    expandedMatchId,
    matchCenters, matchCenterLoading, matchCenterErrors, cachedMatchCenters,
    load, openMatchCenter,
  } = useScores();

  const {
    teamStats, standings, officialRanks, liveProjectionStandings, leaderChange,
    upcomingByDate, statsMaxPossibleRows, statsFormRows, h2hStats,
  } = useStandings({ played, live, upcoming });

  const [tab, setTab] = useState("liga");
  const [subTabs, setSubTabs] = useState({ live: "laufend", spiele: "demnaechst", stats: "max" });
  const [openPerson, setOpenPerson] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("Ken");
  const [selectedH2hPerson, setSelectedH2hPerson] = useState("Ken");
  const [prevRankSnapshot] = useState(() => loadRankSnapshot());
  const [selectedTeam, setSelectedTeam] = useState(null);
  const handleTabChange = useCallback((id) => {
    setTab(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (standings.length > 0 && updated) saveRankSnapshot(standings);
  }, [standings, updated]);

  const liveRankMap = useMemo(() =>
    liveProjectionStandings.reduce((acc, row, i) => { acc[row.person] = i + 1; return acc; }, {}),
    [liveProjectionStandings]
  );

  const activeSubTab = subTabs[tab];
  const changeSubTab = id => setSubTabs(prev => ({ ...prev, [tab]: id }));

  let screen = null;
  if (tab === "liga") {
    screen = <StandingsPanel standings={standings} openPerson={openPerson} setOpenPerson={setOpenPerson} prevRankSnapshot={prevRankSnapshot} onTeamClick={setSelectedTeam} liveRankMap={liveRankMap} allMatches={[...played, ...live, ...upcoming]} />;
  } else if (tab === "live") {
    screen = activeSubTab === "prognose"
      ? <ProjectionPanel live={live} liveProjectionStandings={liveProjectionStandings} officialRanks={officialRanks} openPerson={openPerson} setOpenPerson={setOpenPerson} />
      : <LivePanel live={live} expandedMatchId={expandedMatchId} openMatchCenter={openMatchCenter} matchCenters={matchCenters} matchCenterLoading={matchCenterLoading} matchCenterErrors={matchCenterErrors} cachedMatchCenters={cachedMatchCenters} />;
  } else if (tab === "spiele") {
    screen = <GamesPanel subTab={activeSubTab} upcomingByDate={upcomingByDate} played={played} live={live} upcoming={upcoming} knockout={knockout} standings={standings} />;
  } else if (tab === "stats") {
    screen = <StatsPanel subTab={activeSubTab} maxPossibleRows={statsMaxPossibleRows} formRows={statsFormRows} h2hStats={h2hStats} selectedPerson={selectedH2hPerson} setSelectedPerson={setSelectedH2hPerson} standings={standings} teamStats={teamStats} live={live} played={played} upcoming={upcoming} />;
  } else if (tab === "mein") {
    screen = <MyPanel selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} standings={standings} liveProjectionStandings={liveProjectionStandings} live={live} upcoming={upcoming} played={played} />;
  }

  return <main className="app-shell">
    <section className="phone-frame">
      <Header loading={loading} updated={updated} liveCount={live.length} playedCount={played.length} upcomingCount={upcoming.length} secondsLeft={secondsLeft} onRefresh={load} />
      <SubTabs activeTab={tab} activeSubTab={activeSubTab} onChange={changeSubTab} liveCount={live.length} />
      <div className="content">
        {leaderChange && <div className="top-alert leader">👑 Wenn es so bleibt, ist <strong style={{ color: COLORS[leaderChange] }}>{leaderChange}</strong> neuer Tabellenführer.</div>}
        {error && <div className="top-alert error">❌ {error}</div>}
        {screen}
      </div>
      {!selectedTeam && <BottomNav active={tab} onChange={handleTabChange} liveCount={live.length} />}
      {selectedTeam && <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} played={played} live={live} upcoming={upcoming} />}
    </section>
  </main>;
}
