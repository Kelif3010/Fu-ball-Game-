import { useEffect, useState } from "react";
import HeadToHead from "./HeadToHead";
import { PARTICIPANTS, FLAGS, DE, COLORS, displayTeamName } from "./shared";
import { formatDate, formatCountdown, statusLabel, rankLabel, tdColor, movementColor, pointsMovementText, rankMovementText } from './utils/format.js';
import { buildTeamStats, buildStandings, compareStandingRows, rankMap, buildHeadToHeadStats, buildPointsTimeline, buildFormComparisonRows, getLastResultsForPerson, buildFormCurveRows, buildMyAnalysis, buildOpenMatchMap, buildMaxPossibleRows, getPersonMatches, getMatchTitle, buildGroupData, ownerOf, matchSortAsc, matchSortDesc } from './utils/standings.js';
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
  ],
  stats: [
    { id: "max", label: "Max Punkte" },
    { id: "form", label: "Form" },
    { id: "h2h", label: "Head-to-Head" },
    { id: "verlauf", label: "Verlauf" },
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

function StandingRow({ row, index, maxPts, open, onToggle, liveMode = false, officialMeta = null, prevRankSnapshot = null, onTeamClick = null }) {
  const progress = maxPts > 0 ? Math.max(row.pts === 0 ? 0 : 6, Math.round((row.pts / maxPts) * 100)) : 0;
  const currentRank = index + 1;
  const officialRank = officialMeta?.rank || currentRank;
  const rankDelta = officialRank - currentRank;
  const officialPts = officialMeta?.row?.pts ?? row.pts;
  const ptsDelta = row.pts - officialPts;
  const prevRank = prevRankSnapshot?.[row.person] ?? null;
  const sessionDelta = prevRank !== null ? prevRank - currentRank : null;
  const placementClass = index === 0 ? "first" : index < 3 ? "podium" : "normal";
  return <article className={`standing-row ${placementClass} ${open ? "open" : ""}`} style={{ "--accent": COLORS[row.person], "--progress": `${progress}%` }}>
    <button className="standing-main" onClick={onToggle}>
      <span className="rank-badge">{rankLabel(index)}</span>
      {sessionDelta !== null && sessionDelta !== 0 && <span className="rank-delta" style={{ color: sessionDelta > 0 ? "#34d399" : "#f87171" }}>{sessionDelta > 0 ? `↑${sessionDelta}` : `↓${Math.abs(sessionDelta)}`}</span>}
      <span className="person-dot" />
      <span className="standing-name-wrap">
        <strong>{row.person}</strong>
        <small>{row.teams.map(team => FLAGS[team] || "").join(" ")}</small>
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
      <div className="team-pill-grid">
        {row.teams.map(team => (
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

function StandingsPanel({ standings, liveMode = false, officialRanks = {}, openPerson, setOpenPerson, prevRankSnapshot = null, onTeamClick = null }) {
  const maxPts = Math.max(1, ...standings.map(row => row.pts));
  if (!standings.length) return <EmptyState title="Noch keine Tabelle" text="Sobald Ergebnisse geladen werden, erscheint hier die Rangliste." />;
  return <div className="standings-list">
    {standings.map((row, index) => <StandingRow key={row.person} row={row} index={index} maxPts={maxPts} open={openPerson === row.person} onToggle={() => setOpenPerson(openPerson === row.person ? "" : row.person)} liveMode={liveMode} officialMeta={liveMode ? officialRanks[row.person] : null} prevRankSnapshot={prevRankSnapshot} onTeamClick={onTeamClick} />)}
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
        {isDuel && !live && <em>DUELL</em>}
        {clickable && <b>{selected ? "Match-Center offen" : "Tippen"}</b>}
      </div>
      <TeamBlock team={match.awayTeam} align="right" />
    </div>
    {impacts.length > 0 && <div className="impact-row">{impacts.map((item, index) => <InfoPill key={`${item.person}-${item.pts}-${index}`} label={item.person} value={`+${item.pts}P wenn's so bleibt`} color={COLORS[item.person]} />)}</div>}
  </article>;
}

function UpcomingCard({ match }) {
  return <ScoreCard match={match} compact />;
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
                    <span>{displayTeamName(row.team)}{owner && <span className="group-owner" style={{ color: COLORS[owner] }}>{owner}</span>}</span>
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

function GamesPanel({ subTab, upcomingByDate, played, live, upcoming }) {
  if (subTab === "ergebnisse") {
    return <div className="card-stack">{played.length === 0 ? <EmptyState title="Noch keine Ergebnisse" text="Beendete Spiele erscheinen hier automatisch." /> : played.map((m, i) => <ScoreCard key={`played-${m.id || i}`} match={m} />)}</div>;
  }
  if (subTab === "gruppen") {
    return <GroupsPanel live={live} played={played} upcoming={upcoming} />;
  }
  const dates = Object.keys(upcomingByDate);
  return <div className="card-stack">
    {live.length > 0 && <section className="section-block"><h2>🔴 Läuft gerade</h2><div className="card-stack slim">{live.map((m, i) => <ScoreCard key={`upcoming-live-${m.id || i}`} match={m} live compact />)}</div></section>}
    {dates.length === 0 && <EmptyState title="Keine kommenden Spiele" text="Sobald die API kommende Gruppenspiele liefert, landen sie hier." />}
    {dates.map(date => <section className="section-block" key={date}><h2>{formatDate(date)}</h2>{upcomingByDate[date].map((match, index) => <UpcomingCard key={`${date}-${match.id || index}`} match={match} />)}</section>)}
  </div>;
}

function StatsPanel({ subTab, maxPossibleRows, formRows, h2hStats, selectedPerson, setSelectedPerson, played }) {
  if (subTab === "form") {
    return <StatsFormCard rows={formRows} />;
  }
  if (subTab === "h2h") {
    return <HeadToHead stats={h2hStats} selectedPerson={selectedPerson} onSelectPerson={setSelectedPerson} />;
  }
  if (subTab === "verlauf") {
    return <PointsTimelineCard played={played} />;
  }
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

function PointsTimelineCard({ played }) {
  const { dates, series } = buildPointsTimeline(played);
  if (!dates.length) return <EmptyState title="Noch keine Verlaufsdaten" text="Sobald Spiele gespielt wurden, erscheint hier der Punkteverlauf." />;

  const W = 300, H = 160, PAD = { top: 10, right: 10, bottom: 30, left: 30 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const maxPts = Math.max(1, ...Object.values(series).flat());
  const xScale = i => PAD.left + (i / Math.max(1, dates.length - 1)) * chartW;
  const yScale = v => PAD.top + chartH - (v / maxPts) * chartH;
  const persons = Object.keys(PARTICIPANTS);

  const yTicks = [0, Math.round(maxPts / 2), maxPts];
  const xTicks = dates.length <= 6
    ? dates.map((_, i) => i)
    : [0, Math.floor((dates.length - 1) / 2), dates.length - 1];

  return <article className="what-card analysis-card stats-card">
    <div className="analysis-head">
      <div>
        <h3>📉 Punkteverlauf</h3>
        <p>Kumulative Punkte pro Spieltag über den bisherigen Turnierverlauf.</p>
      </div>
      <span className="analysis-badge">Alle</span>
    </div>
    <svg className="timeline-svg" viewBox={`0 0 ${W} ${H}`} aria-label="Punkteverlauf-Diagramm">
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={PAD.left - 4} y={yScale(v)} fill="#475569" fontSize="8" textAnchor="end" dominantBaseline="middle">{v}</text>
        </g>
      ))}
      {xTicks.map(i => (
        <text key={i} x={xScale(i)} y={H - PAD.bottom + 10} fill="#475569" fontSize="8" textAnchor="middle">{i + 1}</text>
      ))}
      {persons.map(p => {
        const pts = series[p];
        if (!pts.length) return null;
        const points = pts.map((v, i) => `${xScale(i)},${yScale(v)}`).join(" ");
        return (
          <g key={p}>
            <polyline points={points} fill="none" stroke={COLORS[p]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
            {pts.map((v, i) => (
              <circle key={i} cx={xScale(i)} cy={yScale(v)} r="3" fill={COLORS[p]} opacity="0.85" />
            ))}
          </g>
        );
      })}
    </svg>
    <div className="timeline-legend">
      {persons.map(p => (
        <span key={p} style={{ color: COLORS[p] }}>● {p} {series[p].at(-1) ?? 0}P</span>
      ))}
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
            {row.results.length > 0 ? row.results.map(({ emoji, match }, index) => <span key={`${row.person}-${match.id || index}-${index}`} className={`form-result ${emoji === "✅" ? "win" : emoji === "❌" ? "loss" : "draw"}`} title={`${displayTeamName(match.homeTeam)} vs ${displayTeamName(match.awayTeam)}`}>{emoji}</span>) : <span className="form-result muted">-</span>}
          </div>
        </div>
      ))}
    </div>
  </article>;
}

function FormCurveCard({ selectedPerson, standings, played, analysis }) {
  const rows = buildFormCurveRows(selectedPerson, standings, analysis);
  const hasAnyForm = rows.some(person => getLastResultsForPerson(person, played).length > 0);
  if (!hasAnyForm) {
    return <article className="what-card analysis-card"><h3>🔥 Formkurve letzte 5 Spiele</h3><p className="form-empty">Noch keine Formdaten verfügbar.</p></article>;
  }
  return <article className="what-card analysis-card">
    <div className="analysis-head">
      <div>
        <h3>🔥 Formkurve letzte 5 Spiele</h3>
        <p>Die letzten Ergebnisse aus den bereits gespielten Partien.</p>
      </div>
      <span className="analysis-badge">Letzte 5</span>
    </div>
    <div className="form-list">
      {rows.map(person => {
        const results = getLastResultsForPerson(person, played);
        return <div className="form-row" key={person}>
          <div className="form-name">
            <strong>{person}</strong>
            <small>{results.length ? `${results.length} Spiele` : "Keine Spiele"}</small>
          </div>
          <div className="form-results">
            {results.length > 0 ? results.map(({ emoji, match }, index) => <span key={`${person}-${match.id || index}-${index}`} className={`form-result ${emoji === "✅" ? "win" : emoji === "❌" ? "loss" : "draw"}`} title={`${displayTeamName(match.homeTeam)} vs ${displayTeamName(match.awayTeam)}`}>{emoji}</span>) : <span className="form-result muted">-</span>}
          </div>
        </div>;
      })}
    </div>
  </article>;
}

function PersonSelector({ selected, onSelect }) {
  return <div className="person-selector">{Object.keys(PARTICIPANTS).map(person => <button key={person} className={selected === person ? "active" : ""} onClick={() => onSelect(person)} style={{ "--accent": COLORS[person] }}>{person}</button>)}</div>;
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
    <article className="what-card analysis-card">
      <div className="analysis-head">
        <div>
          <h3>🧮 Was muss passieren?</h3>
          <p>{analysis?.summary || "Keine Analyse verfügbar."}</p>
        </div>
        <span className="analysis-badge">{analysis?.rowIndex === 0 ? "Aktuell 1." : `Aktuell #${Math.max(1, selectedRank + 1)}`}</span>
      </div>
      <div className="analysis-pills">
        <InfoPill label="Gespielt" value={analysis ? `${row.played}` : "0"} color={COLORS[row.person]} />
        <InfoPill label="Offen" value={analysis ? `${analysis.openCount}` : "0"} color="#fbbf24" />
        <InfoPill label="Max" value={analysis ? `${analysis.maxPossiblePoints}` : `${row.pts}`} color="#34d399" />
        <InfoPill label="Max Platz" value={analysis ? `#${analysis.winAllRank}` : `#${selectedRank + 1}`} color="#f59e0b" />
      </div>
      <div className="analysis-list">
        <div className="analysis-row">
          <span>📈 Spiele / Potential</span>
          <strong className="ok">{analysis?.gapText || "Keine Daten"}</strong>
        </div>
        <div className="analysis-row">
          <span>🔥 Wichtigstes nächstes Spiel</span>
          <strong>{nextMatch ? `${getMatchTitle(nextMatch)}${nextMatchOpponent ? ` · ${nextMatchOpponent}` : ""}` : "Kein offenes Spiel gefunden"}</strong>
        </div>
        <div className="analysis-row">
          <span>⚠️ Kann dich überholen</span>
          <strong className={canOvertakeList.length ? "warn" : "ok"}>{analysis?.canOvertakeText || "Niemand"}</strong>
        </div>
        <div className="analysis-chip-row">
          {canOvertakeList.length > 0 ? canOvertakeList.map(item => <span key={item.person} className="analysis-chip">{item.person} · {item.futurePoints}P max</span>) : <span className="analysis-chip muted">Mit deinem Maximalwert keiner mehr</span>}
        </div>
        <div className="analysis-row">
          <span>🎯 Kannst du überholen</span>
          <strong className="ok">{analysis?.overtakeText || "Aktuell niemand"}</strong>
        </div>
        <div className="analysis-chip-row">
          {reachableList.length > 0 ? reachableList.map(item => <span key={item.person} className="analysis-chip good">{item.person} · {item.pts}P aktuell</span>) : <span className="analysis-chip muted">Alle vor dir liegen zu weit weg</span>}
        </div>
      </div>
    </article>
    <FormCurveCard selectedPerson={row.person} standings={standings} played={played} analysis={analysis} />
    <section className="section-block"><h2>Nächstes Spiel</h2>{nextMatch ? <ScoreCard match={nextMatch} live={live.includes(nextMatch)} compact /> : <EmptyState title="Kein nächstes Spiel gefunden" text="Aktuell liefert die API kein anstehendes Spiel für diesen Teilnehmer." compact />}</section>
  </div>;
}

function EmptyState({ title, text, compact = false }) {
  return <div className={`empty-state ${compact ? "compact" : ""}`}><strong>{title}</strong><p>{text}</p></div>;
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
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
    live, played, upcoming,
    loading, error, updated, secondsLeft,
    expandedMatchId,
    matchCenters, matchCenterLoading, matchCenterErrors, cachedMatchCenters,
    load, openMatchCenter,
  } = useScores();

  const {
    standings, officialRanks, liveProjectionStandings, leaderChange,
    upcomingByDate, statsMaxPossibleRows, statsFormRows, h2hStats,
  } = useStandings({ played, live, upcoming });

  const [tab, setTab] = useState("liga");
  const [subTabs, setSubTabs] = useState({ live: "laufend", spiele: "demnaechst", stats: "max" });
  const [openPerson, setOpenPerson] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("Ken");
  const [selectedH2hPerson, setSelectedH2hPerson] = useState("Ken");
  const [prevRankSnapshot] = useState(() => loadRankSnapshot());
  const [selectedTeam, setSelectedTeam] = useState(null);

  useEffect(() => {
    if (standings.length > 0 && updated) saveRankSnapshot(standings);
  }, [standings, updated]);

  const activeSubTab = subTabs[tab];
  const changeSubTab = id => setSubTabs(prev => ({ ...prev, [tab]: id }));

  let screen = null;
  if (tab === "liga") {
    screen = <StandingsPanel standings={standings} openPerson={openPerson} setOpenPerson={setOpenPerson} prevRankSnapshot={prevRankSnapshot} onTeamClick={setSelectedTeam} />;
  } else if (tab === "live") {
    screen = activeSubTab === "prognose"
      ? <ProjectionPanel live={live} liveProjectionStandings={liveProjectionStandings} officialRanks={officialRanks} openPerson={openPerson} setOpenPerson={setOpenPerson} />
      : <LivePanel live={live} expandedMatchId={expandedMatchId} openMatchCenter={openMatchCenter} matchCenters={matchCenters} matchCenterLoading={matchCenterLoading} matchCenterErrors={matchCenterErrors} cachedMatchCenters={cachedMatchCenters} />;
  } else if (tab === "spiele") {
    screen = <GamesPanel subTab={activeSubTab} upcomingByDate={upcomingByDate} played={played} live={live} upcoming={upcoming} />;
  } else if (tab === "stats") {
    screen = <StatsPanel subTab={activeSubTab} maxPossibleRows={statsMaxPossibleRows} formRows={statsFormRows} h2hStats={h2hStats} selectedPerson={selectedH2hPerson} setSelectedPerson={setSelectedH2hPerson} played={played} />;
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
      <BottomNav active={tab} onChange={setTab} liveCount={live.length} />
      {selectedTeam && <TeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} played={played} live={live} upcoming={upcoming} />}
    </section>
  </main>;
}
