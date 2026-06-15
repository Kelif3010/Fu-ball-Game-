import { useCallback, useEffect, useMemo, useState } from "react";
import HeadToHead from "./HeadToHead";

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

export const FLAGS = {
  Portugal: "🇵🇹", Norway: "🇳🇴", USA: "🇺🇸", Scotland: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}", "South Africa": "🇿🇦", Jordan: "🇯🇴",
  Brazil: "🇧🇷", Senegal: "🇸🇳", Switzerland: "🇨🇭", Mexico: "🇲🇽", Uzbekistan: "🇺🇿", "Saudi Arabia": "🇸🇦",
  Netherlands: "🇳🇱", Turkey: "🇹🇷", Uruguay: "🇺🇾", Ghana: "🇬🇭", "South Korea": "🇰🇷", Iran: "🇮🇷",
  France: "🇫🇷", Morocco: "🇲🇦", Ecuador: "🇪🇨", Paraguay: "🇵🇾", Tunisia: "🇹🇳", Panama: "🇵🇦",
  Argentina: "🇦🇷", Sweden: "🇸🇪", Colombia: "🇨🇴", "Czech Republic": "🇨🇿", Australia: "🇦🇺", Qatar: "🇶🇦",
  Germany: "🇩🇪", Belgium: "🇧🇪", Algeria: "🇩🇿", Canada: "🇨🇦", Haiti: "🇭🇹", Iraq: "🇮🇶",
  Spain: "🇪🇸", Croatia: "🇭🇷", Austria: "🇦🇹", "DR Congo": "🇨🇩", Egypt: "🇪🇬", Curaçao: "🇨🇼",
  England: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", "Ivory Coast": "🇨🇮", Japan: "🇯🇵", "Bosnia and Herzegovina": "🇧🇦", "Cape Verde": "🇨🇻", "New Zealand": "🇳🇿",
};

export const DE = {
  Portugal: "Portugal", Norway: "Norwegen", USA: "USA", Scotland: "Schottland", "South Africa": "Südafrika", Jordan: "Jordanien",
  Brazil: "Brasilien", Senegal: "Senegal", Switzerland: "Schweiz", Mexico: "Mexiko", Uzbekistan: "Usbekistan", "Saudi Arabia": "Saudi-Arabien",
  Netherlands: "Niederlande", Turkey: "Türkei", Uruguay: "Uruguay", Ghana: "Ghana", "South Korea": "Südkorea", Iran: "Iran",
  France: "Frankreich", Morocco: "Marokko", Ecuador: "Ecuador", Paraguay: "Paraguay", Tunisia: "Tunesien", Panama: "Panama",
  Argentina: "Argentinien", Sweden: "Schweden", Colombia: "Kolumbien", "Czech Republic": "Tschechien", Australia: "Australien", Qatar: "Katar",
  Germany: "Deutschland", Belgium: "Belgien", Algeria: "Algerien", Canada: "Kanada", Haiti: "Haiti", Iraq: "Irak",
  Spain: "Spanien", Croatia: "Kroatien", Austria: "Österreich", "DR Congo": "DR Kongo", Egypt: "Ägypten", Curaçao: "Curaçao",
  England: "England", "Ivory Coast": "Elfenbeinküste", Japan: "Japan", "Bosnia and Herzegovina": "Bosnien-Herzegowina", "Cape Verde": "Kap Verde", "New Zealand": "Neuseeland",
};

export const COLORS = {
  Berkant: "#f59e0b", Bora: "#10b981", Can: "#3b82f6", Dogan: "#8b5cf6",
  Fayit: "#ef4444", Hasret: "#f97316", Ken: "#06b6d4", Selcuk: "#84cc16",
};

const ALL_TEAMS = new Set(Object.values(PARTICIPANTS).flat());
const LIVE_REFRESH_MS = 5 * 60 * 1000;
const MATCH_CENTER_CACHE_MS = 5 * 60 * 1000;
const CACHE_PREFIX = "wm-liga-match-center:";
const DEFAULT_REFRESH_SECONDS = 300;

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
  ],
  stats: [
    { id: "h2h", label: "Head-to-Head" },
  ],
};

const ownerOf = team => Object.entries(PARTICIPANTS).find(([, teams]) => teams.includes(team))?.[0] || "";
export const displayTeamName = team => `${FLAGS[team] || ""} ${DE[team] || team || "Team"}`.trim();
const rankLabel = index => index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
const tdColor = value => value > 0 ? "#34d399" : value < 0 ? "#f87171" : "#94a3b8";
const movementColor = delta => delta > 0 ? "#34d399" : delta < 0 ? "#f87171" : "#94a3b8";
const pointsMovementText = delta => delta === 0 ? "±0" : delta > 0 ? `+${delta}` : `${delta}`;

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
    stats[h].played++; stats[a].played++;
    stats[h].gf += hg; stats[h].ga += ag; stats[a].gf += ag; stats[a].ga += hg;
    if (hg > ag) { stats[h].pts += 3; stats[h].won++; stats[a].lost++; }
    else if (ag > hg) { stats[a].pts += 3; stats[a].won++; stats[h].lost++; }
    else { stats[h].pts++; stats[a].pts++; stats[h].drawn++; stats[a].drawn++; }
  }
  return stats;
}

function buildStandings(teamStats) {
  return Object.entries(PARTICIPANTS).map(([person, teams]) => {
    const total = teams.reduce((acc, team) => {
      const s = teamStats[team] || {};
      acc.played += s.played || 0; acc.won += s.won || 0; acc.drawn += s.drawn || 0; acc.lost += s.lost || 0;
      acc.gf += s.gf || 0; acc.ga += s.ga || 0; acc.pts += s.pts || 0;
      return acc;
    }, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 });
    return { person, teams, ...total, td: total.gf - total.ga };
  }).sort((a, b) => b.pts - a.pts || b.td - a.td || b.gf - a.gf || a.person.localeCompare(b.person));
}

function compareStandingRows(a, b) {
  return b.pts - a.pts || b.td - a.td || b.gf - a.gf || a.person.localeCompare(b.person);
}

function rankMap(standings) {
  return standings.reduce((acc, row, index) => {
    acc[row.person] = { rank: index + 1, row };
    return acc;
  }, {});
}

function formatDate(dateStr) {
  if (!dateStr) return "Datum offen";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatCountdown(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function statusLabel(status) {
  if (status === "IN_PLAY" || status === "LIVE") return "Live";
  if (status === "PAUSED") return "Halbzeit";
  if (status === "FINISHED") return "Abpfiff";
  if (status === "TIMED") return "Geplant";
  return status || "Geplant";
}

function rankMovementText(delta, currentRank) {
  if (delta === 0) return `Bleibt #${currentRank}`;
  return delta > 0 ? `↗ +${delta} Plätze` : `↘ ${Math.abs(delta)} Plätze`;
}

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

function matchSortAsc(a, b) {
  return `${a.date || "9999-99-99"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-99-99"} ${b.time || "99:99"}`);
}

function matchSortDesc(a, b) {
  return `${b.date || "0000-00-00"} ${b.time || "00:00"}`.localeCompare(`${a.date || "0000-00-00"} ${a.time || "00:00"}`);
}

function buildHeadToHeadStats(playedMatches) {
  const pairings = {};
  [...playedMatches].sort(matchSortAsc).forEach(match => {
    const hOwner = ownerOf(match.homeTeam);
    const aOwner = ownerOf(match.awayTeam);
    if (!hOwner || !aOwner || hOwner === aOwner) return;

    const pair = [hOwner, aOwner].sort();
    const key = pair.join(" vs ");
    if (!pairings[key]) {
      pairings[key] = {
        key,
        p1: pair[0],
        p2: pair[1],
        matches: 0,
        p1Wins: 0,
        p2Wins: 0,
        draws: 0,
        p1Goals: 0,
        p2Goals: 0,
        lastMatch: null
      };
    }

    const stats = pairings[key];
    stats.matches++;
    const hg = Number(match.homeGoals);
    const ag = Number(match.awayGoals);

    if (hOwner === stats.p1) {
      stats.p1Goals += hg;
      stats.p2Goals += ag;
      if (hg > ag) stats.p1Wins++;
      else if (ag > hg) stats.p2Wins++;
      else stats.draws++;
    } else {
      stats.p1Goals += ag;
      stats.p2Goals += hg;
      if (ag > hg) stats.p1Wins++;
      else if (hg > ag) stats.p2Wins++;
      else stats.draws++;
    }
    stats.lastMatch = match;
  });

  return Object.values(pairings).sort((a, b) => 
    b.matches - a.matches || 
    (b.p1Goals + b.p2Goals) - (a.p1Goals + a.p2Goals) || 
    a.key.localeCompare(b.key)
  );
}

function loadCachedMatchCenter(matchId) {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${matchId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MATCH_CENTER_CACHE_MS) return null;
    return parsed.data;
  } catch { return null; }
}

function saveCachedMatchCenter(matchId, data) {
  try { window.localStorage.setItem(`${CACHE_PREFIX}${matchId}`, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* ignore */ }
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

function StandingRow({ row, index, maxPts, open, onToggle, liveMode = false, officialMeta = null }) {
  const progress = maxPts > 0 ? Math.max(row.pts === 0 ? 0 : 6, Math.round((row.pts / maxPts) * 100)) : 0;
  const currentRank = index + 1;
  const officialRank = officialMeta?.rank || currentRank;
  const rankDelta = officialRank - currentRank;
  const officialPts = officialMeta?.row?.pts ?? row.pts;
  const ptsDelta = row.pts - officialPts;
  const placementClass = index === 0 ? "first" : index < 3 ? "podium" : "normal";
  return <article className={`standing-row ${placementClass} ${open ? "open" : ""}`} style={{ "--accent": COLORS[row.person], "--progress": `${progress}%` }}>
    <button className="standing-main" onClick={onToggle}>
      <span className="rank-badge">{rankLabel(index)}</span>
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
      <div className="team-pill-grid">{row.teams.map(team => <span key={team}>{displayTeamName(team)}</span>)}</div>
    </div>
  </article>;
}

function StandingsPanel({ standings, liveMode = false, officialRanks = {}, openPerson, setOpenPerson }) {
  const maxPts = Math.max(1, ...standings.map(row => row.pts));
  if (!standings.length) return <EmptyState title="Noch keine Tabelle" text="Sobald Ergebnisse geladen werden, erscheint hier die Rangliste." />;
  return <div className="standings-list">
    {standings.map((row, index) => <StandingRow key={row.person} row={row} index={index} maxPts={maxPts} open={openPerson === row.person} onToggle={() => setOpenPerson(openPerson === row.person ? "" : row.person)} liveMode={liveMode} officialMeta={liveMode ? officialRanks[row.person] : null} />)}
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
  const hasHomePlayers = (data?.homeTeam?.lineup?.length || 0) + (data?.homeTeam?.bench?.length || 0) > 0;
  const hasAwayPlayers = (data?.awayTeam?.lineup?.length || 0) + (data?.awayTeam?.bench?.length || 0) > 0;
  const hasAnyPlayers = hasHomePlayers || hasAwayPlayers;
  const events = Array.isArray(data?.events) ? data.events : [];
  return <div className="match-center-panel">
    {loading && <p className="loading-line">⏳ Lade Match-Center…</p>}
    {error && <p className="error-line">❌ {error}</p>}
    {!loading && !error && data && <>
      <div className="source-line">Quelle: {data.lineupSourceLabel || data.sourceLabel || "football-data.org"}{cached ? " · aus 5-Minuten-Cache" : ""}</div>
      <div className="impact-row"><InfoPill label="Status" value={statusLabel(match.status)} color="#fbbf24" />{getMatchPointImpact(match).map((item, index) => <InfoPill key={`${item.person}-${index}`} label={item.person} value={`${item.pts}P`} color={COLORS[item.person]} />)}</div>
      {!hasAnyPlayers && events.length === 0 && <div className="hint-box">{data.lineupFallbackReason || "Für dieses Spiel liefert die API aktuell keine Startelf-, Bank- oder Event-Daten."}</div>}
      <section className="match-section"><h3>⚡ Spiel-Events</h3><EventList events={events} /></section>
      <div className="lineup-grid"><TeamLineup team={data.homeTeam} fallbackName={displayTeamName(match.homeTeam)} /><TeamLineup team={data.awayTeam} fallbackName={displayTeamName(match.awayTeam)} /></div>
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

function GamesPanel({ subTab, upcomingByDate, played, live }) {
  if (subTab === "ergebnisse") {
    return <div className="card-stack">{played.length === 0 ? <EmptyState title="Noch keine Ergebnisse" text="Beendete Spiele erscheinen hier automatisch." /> : played.map((m, i) => <ScoreCard key={`played-${m.id || i}`} match={m} />)}</div>;
  }
  const dates = Object.keys(upcomingByDate);
  return <div className="card-stack">
    {live.length > 0 && <section className="section-block"><h2>🔴 Läuft gerade</h2><div className="card-stack slim">{live.map((m, i) => <ScoreCard key={`upcoming-live-${m.id || i}`} match={m} live compact />)}</div></section>}
    {dates.length === 0 && <EmptyState title="Keine kommenden Spiele" text="Sobald die API kommende Gruppenspiele liefert, landen sie hier." />}
    {dates.map(date => <section className="section-block" key={date}><h2>{formatDate(date)}</h2>{upcomingByDate[date].map((match, index) => <UpcomingCard key={`${date}-${match.id || index}`} match={match} />)}</section>)}
  </div>;
}

function StatsPanel({ h2hStats, selectedPerson, setSelectedPerson }) {
  return <HeadToHead stats={h2hStats} selectedPerson={selectedPerson} onSelectPerson={setSelectedPerson} />;
}

function getPersonMatches(person, live, upcoming) {
  return [...live, ...upcoming]
    .filter(match => ownerOf(match.homeTeam) === person || ownerOf(match.awayTeam) === person)
    .sort(matchSortAsc);
}

function getMatchTitle(match) {
  if (!match) return "";
  return `${displayTeamName(match.homeTeam)} vs ${displayTeamName(match.awayTeam)}`;
}

function buildOpenMatchMap(live, upcoming) {
  const map = Object.fromEntries(Object.keys(PARTICIPANTS).map(person => [person, []]));
  [...live, ...upcoming].forEach(match => {
    const homeOwner = ownerOf(match.homeTeam);
    const awayOwner = ownerOf(match.awayTeam);
    if (homeOwner && map[homeOwner]) map[homeOwner].push(match);
    if (awayOwner && awayOwner !== homeOwner && map[awayOwner]) map[awayOwner].push(match);
  });
  return map;
}

function getLastResultsForPerson(person, played, limit = 5) {
  return [...played]
    .sort(matchSortDesc)
    .filter(match => ownerOf(match.homeTeam) === person || ownerOf(match.awayTeam) === person)
    .slice(0, limit)
    .map(match => {
      const hg = Number(match.homeGoals);
      const ag = Number(match.awayGoals);
      const homeOwner = ownerOf(match.homeTeam);
      const awayOwner = ownerOf(match.awayTeam);
      let emoji = "🤝";
      if (Number.isFinite(hg) && Number.isFinite(ag)) {
        if (hg > ag) emoji = homeOwner === person ? "✅" : "❌";
        else if (ag > hg) emoji = awayOwner === person ? "✅" : "❌";
      }
      return { emoji, match };
    });
}

function buildFormCurveRows(selectedPerson, standings, analysis) {
  const rows = [selectedPerson];
  if (analysis?.currentThreats?.length) rows.push(...analysis.currentThreats.map(item => item.person));
  if (analysis?.reachable?.length) rows.push(...analysis.reachable.map(item => item.person));
  const unique = [];
  for (const person of rows) {
    if (!person || unique.includes(person)) continue;
    unique.push(person);
    if (unique.length >= 3) break;
  }
  if (unique.length < 3) {
    for (const row of standings) {
      if (unique.includes(row.person)) continue;
      unique.push(row.person);
      if (unique.length >= 3) break;
    }
  }
  return unique;
}

function buildMyAnalysis(person, standings, liveProjectionStandings, live, upcoming) {
  const rowIndex = standings.findIndex(item => item.person === person);
  const row = standings[rowIndex] || null;
  if (!row) return null;

  const standingsByPerson = rankMap(standings);
  const openMatchMap = buildOpenMatchMap(live, upcoming);
  const openMatches = (openMatchMap[person] || []).sort(matchSortAsc);
  const openCount = openMatches.length;
  const maxExtraPoints = openCount * 3;
  const maxPossiblePoints = row.pts + maxExtraPoints;

  const mostPlayedRow = standings.reduce((best, current) => {
    if (!best) return current;
    if (current.played > best.played) return current;
    if (current.played === best.played && current.pts > best.pts) return current;
    if (current.played === best.played && current.pts === best.pts && current.td > best.td) return current;
    return best;
  }, null);

  const mostPlayedName = mostPlayedRow?.person || person;
  const gamesGap = Math.max(0, (mostPlayedRow?.played || row.played) - row.played);

  const futureThreats = standings.map(other => {
    const open = openMatchMap[other.person]?.length || 0;
    const futurePoints = other.pts + open * 3;
    return {
      ...other,
      open,
      futurePoints,
      rank: standingsByPerson[other.person]?.rank || 999,
    };
  }).sort((a, b) => b.futurePoints - a.futurePoints || b.td - a.td || b.gf - a.gf || a.person.localeCompare(b.person));

  const winAllTable = standings
    .map(other => other.person === person ? { ...other, pts: maxPossiblePoints } : other)
    .sort(compareStandingRows);
  const winAllRank = Math.max(1, winAllTable.findIndex(item => item.person === person) + 1);
  const currentLeader = standings[0] || null;

  const currentThreats = futureThreats
    .filter(item => item.person !== person && item.rank > (standingsByPerson[person]?.rank || 0))
    .filter(item => item.futurePoints > maxPossiblePoints || (item.futurePoints === maxPossiblePoints && item.td > row.td))
    .sort((a, b) => b.futurePoints - a.futurePoints || b.rank - a.rank)
    .slice(0, 3);

  const reachable = standings
    .filter(item => item.person !== person && item.rank < (standingsByPerson[person]?.rank || 999))
    .map(item => ({
      ...item,
      rank: standingsByPerson[item.person]?.rank || 999,
      open: openMatchMap[item.person]?.length || 0,
    }))
    .filter(item => maxPossiblePoints > item.pts || (maxPossiblePoints === item.pts && row.td > item.td))
    .sort((a, b) => a.rank - b.rank || b.pts - a.pts || b.td - a.td)
    .slice(0, 3);

  const nextImportantMatch = openMatches
    .map(match => {
      const homeOwner = ownerOf(match.homeTeam);
      const awayOwner = ownerOf(match.awayTeam);
      const opponent = homeOwner === person ? awayOwner : homeOwner;
      const opponentMeta = opponent ? standingsByPerson[opponent] : null;
      const myMeta = standingsByPerson[person];
      const myRank = myMeta?.rank || rowIndex + 1;
      const opponentRank = opponentMeta?.rank || 999;
      const rankGap = opponentRank - myRank;
      const ptsGap = Math.abs((opponentMeta?.row?.pts || 0) - row.pts);
      let score = 12;
      if (match.status === "IN_PLAY" || match.status === "LIVE") score += 70;
      if (opponentMeta) {
        if (opponentRank < myRank) score += 42;
        else if (opponentRank === myRank) score += 32;
        else if (opponentRank <= myRank + 2) score += 28;
        else if (opponentRank <= myRank + 4) score += 18;
        else score += 10;
        if (rankGap < 0) score += Math.min(12, Math.abs(rankGap) * 3);
        if (ptsGap <= 3) score += 16;
        else if (ptsGap <= 6) score += 8;
      } else {
        score += 4;
      }
      return { match, opponent, score };
    })
    .sort((a, b) => b.score - a.score || matchSortAsc(a.match, b.match))[0] || null;

  const canOvertakeText = currentThreats.length
    ? currentThreats.map(item => item.person).join(" · ")
    : "Niemand";
  const overtakeText = reachable.length
    ? reachable.map(item => item.person).join(" · ")
    : "Aktuell niemand";

  let summary = "";
  if (rowIndex === 0) {
    summary = currentThreats.length > 0
      ? `Du bist aktuell vorne, aber ${currentThreats.map(item => item.person).join(" und ")} können dich noch überholen.`
      : "Du bist aktuell vorne. Wenn du deine restlichen Spiele gewinnst, sicherst du sehr wahrscheinlich Platz 1.";
  } else if (winAllRank === 1) {
    summary = "Wenn du deine restlichen Spiele gewinnst, kannst du theoretisch noch auf Platz 1 springen.";
  } else if (winAllRank === 2) {
    summary = "Wenn du deine restlichen Spiele gewinnst, kannst du theoretisch bis auf Platz 2 springen.";
  } else {
    summary = `Selbst mit Siegen in allen restlichen Spielen wird Platz 1 schwierig, aber Platz ${winAllRank} ist noch erreichbar.`;
  }

  const gapText = gamesGap === 0
    ? `${person} hat gleich viele Spiele wie der fleißigste Teilnehmer.`
    : `${person} hat ${gamesGap} Spiele weniger als ${mostPlayedName}.`;

  return {
    row,
    rowIndex,
    openCount,
    maxExtraPoints,
    maxPossiblePoints,
    mostPlayedName,
    gamesGap,
    winAllRank,
    currentLeader,
    nextImportantMatch,
    currentThreats,
    reachable,
    summary,
    gapText,
    canOvertakeText,
    overtakeText,
  };
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

const STYLES = `
*{box-sizing:border-box}body{margin:0;background:#05091a}.app-shell{min-height:100vh;background:radial-gradient(circle at top,#101b32 0,#05091a 45%,#040713 100%);color:#e2e8f0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:12px}.phone-frame{width:min(100%,430px);min-height:calc(100vh - 24px);margin:0 auto;background:#060d1d;border:1px solid rgba(255,255,255,.09);border-radius:28px;overflow:hidden;box-shadow:0 22px 70px rgba(0,0,0,.35);display:flex;flex-direction:column}.app-header{padding:18px 16px 12px;background:linear-gradient(180deg,#071126 0,#060d1d 100%);border-bottom:1px solid rgba(255,255,255,.055)}.header-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.app-header h1{margin:0;color:#fbbf24;font-size:24px;letter-spacing:-.7px;line-height:1.05}.app-header p{margin:6px 0 0;color:#64748b;font-size:12px;font-weight:700;line-height:1.35}.refresh-btn{width:38px;height:38px;border-radius:14px;border:1px solid rgba(245,158,11,.26);background:rgba(245,158,11,.1);color:#fbbf24;font-size:18px;font-weight:900;cursor:pointer;flex-shrink:0}.refresh-btn:disabled{opacity:.7;cursor:default}.header-meta-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}.header-meta-row>span{color:#94a3b8;font-size:11px;font-weight:700}.countdown-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(245,158,11,.11);border:1px solid rgba(245,158,11,.24);border-radius:999px;padding:5px 10px;color:#94a3b8;font-size:10px;font-weight:800}.countdown-pill strong{color:#fbbf24;font-size:12px;font-variant-numeric:tabular-nums}.countdown-dot{width:6px;height:6px;border-radius:50%;background:#fbbf24;animation:pulseDot 1.7s ease-in-out infinite}@keyframes pulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.78)}}.sub-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));border-bottom:1px solid rgba(255,255,255,.06);background:#060d1d}.sub-tabs button{border:0;border-bottom:2px solid transparent;background:transparent;color:#64748b;padding:10px 8px;font-size:12px;font-weight:900;cursor:pointer}.sub-tabs button.active{color:#fbbf24;border-bottom-color:#fbbf24;background:rgba(245,158,11,.045)}.sub-tabs span{background:#ef4444;color:#fff;border-radius:999px;padding:1px 5px;font-size:9px;margin-left:4px}.content{flex:1;padding:13px 14px 16px;overflow:visible}.bottom-nav{position:sticky;bottom:0;display:grid;grid-template-columns:repeat(5,1fr);gap:0;background:#060d1d;border-top:1px solid rgba(255,255,255,.08);padding:7px 6px max(9px,env(safe-area-inset-bottom));z-index:5}.bottom-nav-item{position:relative;border:0;background:transparent;color:#475569;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px 0 4px;border-radius:14px;font-size:10px;font-weight:900;cursor:pointer}.bottom-nav-item .nav-icon{font-size:20px;line-height:1}.bottom-nav-item.active{color:#fbbf24;background:rgba(245,158,11,.055)}.bottom-nav-item i{width:4px;height:4px;border-radius:50%;background:#fbbf24;opacity:0}.bottom-nav-item.active i{opacity:1}.bottom-nav-item em{position:absolute;top:2px;left:50%;margin-left:8px;background:#ef4444;color:#fff;font-size:9px;font-style:normal;border-radius:999px;padding:1px 5px;line-height:1.2}.top-alert,.hint-box,.empty-state{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:12px;color:#94a3b8;font-size:12px;line-height:1.45}.top-alert{margin-bottom:12px}.top-alert.leader{color:#fff;background:linear-gradient(135deg,rgba(239,68,68,.18),rgba(245,158,11,.09));border-color:rgba(239,68,68,.28)}.top-alert.error{color:#fca5a5;background:rgba(239,68,68,.11);border-color:rgba(239,68,68,.32)}.hint-box.red{color:#fca5a5;background:rgba(239,68,68,.07);border-color:rgba(239,68,68,.18)}.empty-state strong{display:block;color:#cbd5e1;font-size:14px}.empty-state p{margin:4px 0 0}.empty-state.compact{padding:10px}.card-stack{display:grid;gap:9px}.card-stack.slim{gap:6px}.standings-list{display:grid;gap:7px}.standing-row{--accent:#fbbf24;--progress:0%;border-radius:15px;overflow:hidden;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.075)}.standing-row.first{background:linear-gradient(135deg,rgba(245,158,11,.11),rgba(255,255,255,.035));border-color:rgba(245,158,11,.25)}.standing-row.podium{background:rgba(255,255,255,.045)}.standing-main{width:100%;border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:9px;padding:11px 12px 7px;text-align:left;cursor:pointer}.rank-badge{width:28px;text-align:center;font-size:16px;font-weight:950;color:#475569;flex-shrink:0}.person-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0}.standing-name-wrap{min-width:0;flex:1}.standing-name-wrap strong{display:block;color:var(--accent);font-size:15px;line-height:1;font-weight:950}.standing-name-wrap small{display:block;margin-top:3px;color:#475569;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.standing-points{text-align:right;flex-shrink:0}.standing-points small{display:block;color:#475569;font-size:9px;text-transform:uppercase;font-weight:900}.standing-points strong{display:block;color:var(--accent);font-size:26px;line-height:1;font-weight:950;letter-spacing:-1px}.progress-wrap{display:flex;align-items:center;gap:8px;padding:0 12px 9px}.progress-track{height:3px;background:rgba(255,255,255,.07);border-radius:999px;overflow:hidden;flex:1}.progress-track div{height:100%;width:var(--progress);background:var(--accent);border-radius:999px}.progress-wrap span{font-size:10px;color:#64748b;font-weight:800;white-space:nowrap}.standing-details{display:none;padding:0 12px 12px}.standing-row.open .standing-details{display:grid;gap:9px}.stat-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}.stat-chip{min-width:0;background:rgba(255,255,255,.048);border:1px solid rgba(255,255,255,.065);border-radius:9px;padding:6px 4px;text-align:center}.stat-chip span{display:block;color:#64748b;font-size:9px;font-weight:950;text-transform:uppercase}.stat-chip strong{display:block;margin-top:2px;font-size:13px;font-weight:950}.team-pill-grid{display:flex;flex-wrap:wrap;gap:6px}.team-pill-grid span{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);border-radius:999px;padding:6px 8px;color:#cbd5e1;font-size:11px;font-weight:800}.live-movement-row,.impact-row{display:flex;gap:6px;flex-wrap:wrap;padding:0 12px 9px}.info-pill{--pill:#94a3b8;display:inline-flex;align-items:center;gap:4px;border:1px solid color-mix(in srgb,var(--pill) 35%,transparent);background:color-mix(in srgb,var(--pill) 14%,transparent);color:var(--pill);border-radius:999px;padding:5px 8px;font-size:10px;font-weight:950;white-space:nowrap}.info-pill span{color:#94a3b8}.match-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);border-radius:14px;padding:12px;outline:none}.match-card.live{background:linear-gradient(135deg,rgba(239,68,68,.11),rgba(255,255,255,.035));border-color:rgba(239,68,68,.25)}.match-card.selected{border-color:rgba(251,191,36,.55);box-shadow:0 0 0 2px rgba(251,191,36,.07)}.match-card.compact{padding:10px}.match-grid{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:9px;align-items:center}.team-block{min-width:0}.team-block strong{display:block;color:#e2e8f0;font-size:13px;line-height:1.25;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.team-block small{display:block;margin-top:2px;font-size:10px;font-weight:900}.score-center{text-align:center;min-width:66px}.status-pill{display:inline-flex;align-items:center;justify-content:center;gap:4px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.055);border-radius:999px;padding:3px 7px;color:#94a3b8;font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.35px;margin-bottom:5px}.match-card.live .status-pill{color:#fecaca;background:rgba(239,68,68,.16);border-color:rgba(239,68,68,.25)}.status-pill span{width:6px;height:6px;border-radius:50%;background:#ef4444;animation:pulseDot 1.2s ease-in-out infinite}.score-center strong{display:block;color:#fff;font-size:23px;line-height:1;font-weight:950;letter-spacing:-1px}.score-center small{display:block;margin-top:3px;color:#64748b;font-size:10px;font-weight:850}.score-center em{display:inline-block;margin-top:5px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.22);color:#fbbf24;border-radius:5px;padding:2px 5px;font-size:9px;font-style:normal;font-weight:950}.score-center b{display:block;margin-top:4px;color:#64748b;font-size:9px}.match-card .impact-row{padding:9px 0 0}.match-center-panel{border:1px solid rgba(251,191,36,.18);background:linear-gradient(135deg,rgba(251,191,36,.07),rgba(255,255,255,.025));border-radius:15px;padding:12px}.loading-line{margin:0;color:#fbbf24;font-size:13px;font-weight:850}.error-line{margin:0;color:#fca5a5;font-size:13px;font-weight:850}.source-line{color:#94a3b8;font-size:11px;line-height:1.4;margin-bottom:9px}.match-section h3,.section-block h2{margin:0 0 8px;color:#fbbf24;font-size:13px;letter-spacing:.1px}.section-block{display:grid;gap:7px}.lineup-grid{display:grid;grid-template-columns:1fr;gap:9px}.lineup-card{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);border-radius:14px;padding:11px}.lineup-head{display:flex;justify-content:space-between;gap:8px;margin-bottom:10px}.lineup-head h3{margin:0;color:#fbbf24;font-size:14px}.lineup-head small{display:block;margin-top:2px;color:#94a3b8;font-size:11px}.lineup-head span{align-self:flex-start;border:1px solid rgba(251,191,36,.25);background:rgba(251,191,36,.1);color:#fbbf24;border-radius:999px;padding:4px 7px;font-size:10px;font-weight:950}.player-list{margin-top:10px}.player-list:first-of-type{margin-top:0}.player-list h4{margin:0 0 7px;color:#cbd5e1;font-size:11px;text-transform:uppercase;letter-spacing:.4px}.player-list h4 span{color:#64748b}.player-list p,.soft-text{margin:0;color:#64748b;font-size:12px}.player-list>div{display:grid;gap:6px}.player-row{display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;align-items:center;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.035);border-radius:10px;padding:7px 8px}.player-row>span{width:28px;height:28px;display:grid;place-items:center;border-radius:999px;background:rgba(255,255,255,.06);color:#fbbf24;font-size:11px;font-weight:950}.player-row strong{display:block;color:#e2e8f0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.player-row small{display:block;color:#64748b;font-size:10px}.event-list{display:grid;gap:6px}.event-row{display:grid;grid-template-columns:38px minmax(0,1fr);gap:8px;align-items:center;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.035);border-radius:11px;padding:7px 9px}.event-row>strong{color:#fbbf24;font-size:12px}.event-row b{display:block;color:#e2e8f0;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.event-row small{display:block;margin-top:1px;color:#94a3b8;font-size:10px}.chart-card,.cards-ranking,.my-card,.what-card{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.075);border-radius:15px;padding:12px}.chart-title{color:#64748b;font-size:10px;font-weight:950;text-transform:uppercase;letter-spacing:.45px;margin-bottom:8px}.chart-legend{display:flex;flex-wrap:wrap;gap:8px;margin-top:7px}.chart-legend span{display:inline-flex;align-items:center;gap:5px;color:#94a3b8;font-size:11px;font-weight:850}.chart-legend i{width:16px;height:3px;border-radius:2px}.cards-ranking{display:grid;gap:2px}.card-ranking-row{display:flex;align-items:center;gap:9px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}.card-ranking-row:last-child{border-bottom:0}.card-ranking-row>span{width:22px;text-align:center;color:#475569;font-size:12px;font-weight:950}.card-ranking-row strong{flex:1;font-size:13px}.card-ranking-row div{display:flex;gap:5px}.card-ranking-row em,.card-ranking-row b{border-radius:7px;padding:3px 7px;font-size:11px;font-style:normal}.card-ranking-row em{background:rgba(250,204,21,.1);border:1px solid rgba(250,204,21,.24);color:#fde047}.card-ranking-row b{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.24);color:#fca5a5}.person-selector{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.person-selector button{--accent:#fbbf24;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:#64748b;border-radius:999px;padding:7px 5px;font-size:11px;font-weight:900;cursor:pointer}.person-selector button.active{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 38%,transparent);background:color-mix(in srgb,var(--accent) 12%,transparent)}.my-card{--accent:#fbbf24;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 12%,transparent),rgba(255,255,255,.035));border-color:color-mix(in srgb,var(--accent) 25%,transparent)}.my-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:10px}.my-head h2{margin:0;color:var(--accent);font-size:20px}.my-head p{margin:3px 0 0;color:#64748b;font-size:11px;font-weight:800}.my-head div:last-child{text-align:right}.my-head small{display:block;color:#64748b;font-size:9px;font-weight:900;text-transform:uppercase}.my-head strong{display:block;color:var(--accent);font-size:31px;line-height:1;font-weight:950;letter-spacing:-1px}.what-card h3{margin:0 0 8px;color:#7dd3fc;font-size:12px;text-transform:uppercase;letter-spacing:.4px}.what-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0;font-size:11px}.what-row span{color:#94a3b8}.what-row strong{text-align:right}.what-row strong.ok{color:#34d399}.what-row strong.warn{color:#fbbf24}.what-row strong.no{color:#f87171}@media (min-width:760px){.phone-frame{width:min(100%,760px)}.lineup-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.content{padding:16px}.person-selector{grid-template-columns:repeat(8,minmax(0,1fr))}}@media (max-width:370px){.app-shell{padding:0}.phone-frame{min-height:100vh;border-radius:0;border:0}.stat-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.person-selector{grid-template-columns:repeat(2,minmax(0,1fr))}.bottom-nav-item span:last-of-type{font-size:9px}.app-header h1{font-size:22px}}.h2h-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px}.h2h-header{display:flex;align-items:center;gap:8px;font-size:18px;font-weight:800}.h2h-vs{color:#64748b;font-size:14px;font-weight:400}.h2h-main-stats{display:flex;flex-direction:column;gap:4px}.h2h-main-stats strong{color:#fbbf24;font-size:15px}.h2h-win-row{display:flex;justify-content:space-between;font-size:13px;color:#94a3b8}.h2h-draws{font-size:12px;color:#64748b}.h2h-goals-section h4{margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px}.h2h-goals-row{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:14px;font-weight:600}.h2h-divider{color:#64748b}.h2h-last-match{margin-top:4px;border-top:1px solid rgba(255,255,255,.05);padding-top:10px}.h2h-last-match small{color:#64748b;font-size:11px;font-weight:700;display:block;margin-bottom:6px}.h2h-last-match-box{display:flex;align-items:center;justify-content:space-between;gap:6px;background:rgba(0,0,0,.2);padding:8px 12px;border-radius:10px;font-size:12px}.h2h-result{color:#fbbf24;font-size:14px;min-width:30px;text-align:center}.team-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
`;

const ANALYSIS_STYLES = `
.analysis-card{display:grid;gap:10px}.analysis-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.analysis-head h3{margin:0;color:#fbbf24;font-size:12px;text-transform:uppercase;letter-spacing:.4px}.analysis-head p{margin:4px 0 0;color:#cbd5e1;font-size:12px;line-height:1.4}.analysis-badge{display:inline-flex;align-items:center;justify-content:center;min-width:76px;padding:5px 9px;border-radius:999px;border:1px solid rgba(251,191,36,.24);background:rgba(251,191,36,.1);color:#fbbf24;font-size:10px;font-weight:950;white-space:nowrap}.analysis-pills{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.analysis-list{display:grid;gap:8px}.analysis-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06)}.analysis-row:first-child{padding-top:0;border-top:0}.analysis-row span{min-width:0;color:#94a3b8;font-size:11px;font-weight:800}.analysis-row strong{min-width:0;text-align:right;color:#e2e8f0;font-size:11px;font-weight:900;line-height:1.35}.analysis-row strong.ok{color:#34d399}.analysis-row strong.warn{color:#fbbf24}.analysis-chip-row{display:flex;flex-wrap:wrap;gap:6px}.analysis-chip{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.04);border-radius:999px;padding:5px 7px;color:#e2e8f0;font-size:10px;font-weight:800;white-space:nowrap}.analysis-chip.good{border-color:rgba(52,211,153,.24);background:rgba(52,211,153,.08);color:#86efac}.analysis-chip.muted{color:#94a3b8}.form-list{display:grid;gap:8px}.form-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid rgba(255,255,255,.06)}.form-row:first-of-type{padding-top:0;border-top:0}.form-name{min-width:0}.form-name strong{display:block;color:#e2e8f0;font-size:12px;font-weight:900;line-height:1.2}.form-name small{display:block;margin-top:2px;color:#64748b;font-size:10px;font-weight:800}.form-results{display:flex;align-items:center;justify-content:flex-end;gap:5px;flex-wrap:wrap}.form-result{min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);font-size:11px;line-height:1}.form-result.win{border-color:rgba(52,211,153,.3);background:rgba(52,211,153,.08)}.form-result.loss{border-color:rgba(248,113,113,.28);background:rgba(248,113,113,.08)}.form-result.draw{border-color:rgba(251,191,36,.22);background:rgba(251,191,36,.08)}.form-result.muted{color:#64748b;padding:0 6px;min-width:auto}.form-empty{margin:0;color:#94a3b8;font-size:12px;line-height:1.4}.h2h-selector-wrap{display:grid;gap:9px}.h2h-selector-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.h2h-selector-head h3{margin:0;color:#fbbf24;font-size:12px;text-transform:uppercase;letter-spacing:.4px}.h2h-selector-head p{margin:4px 0 0;color:#94a3b8;font-size:12px;line-height:1.35}.h2h-selector{grid-template-columns:repeat(2,minmax(0,1fr))}@media (min-width:760px){.analysis-pills{grid-template-columns:repeat(4,minmax(0,1fr))}.h2h-selector{grid-template-columns:repeat(8,minmax(0,1fr))}}
`;

export default function App() {
  const [live, setLive] = useState([]);
  const [played, setPlayed] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);
  const [refreshSeconds, setRefreshSeconds] = useState(DEFAULT_REFRESH_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_REFRESH_SECONDS);
  const [tab, setTab] = useState("liga");
  const [subTabs, setSubTabs] = useState({ live: "laufend", spiele: "demnaechst", stats: "h2h" });
  const [openPerson, setOpenPerson] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("Ken");
  const [selectedH2hPerson, setSelectedH2hPerson] = useState("Ken");
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [matchCenters, setMatchCenters] = useState({});
  const [matchCenterLoading, setMatchCenterLoading] = useState({});
  const [matchCenterErrors, setMatchCenterErrors] = useState({});
  const [cachedMatchCenters, setCachedMatchCenters] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Daten konnten nicht geladen werden.");
      const apiRefreshSeconds = Number(data?.refreshSeconds) || DEFAULT_REFRESH_SECONDS;
      setLive(Array.isArray(data.live) ? data.live : []);
      setPlayed(Array.isArray(data.played) ? data.played : []);
      setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
      setRefreshSeconds(apiRefreshSeconds);
      setSecondsLeft(apiRefreshSeconds);
      setUpdated(new Date());
    } catch (e) {
      setError(e.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  const openMatchCenter = useCallback(async (match) => {
    const matchId = match?.id;
    if (!matchId) {
      setMatchCenterErrors(prev => ({ ...prev, unknown: "Für dieses Spiel fehlt die Match-ID." }));
      return;
    }
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      return;
    }
    setExpandedMatchId(matchId);

    const cached = loadCachedMatchCenter(matchId);
    if (cached) {
      setMatchCenters(prev => ({ ...prev, [matchId]: cached }));
      setCachedMatchCenters(prev => ({ ...prev, [matchId]: true }));
      return;
    }
    if (matchCenters[matchId] || matchCenterLoading[matchId]) return;

    setMatchCenterLoading(prev => ({ ...prev, [matchId]: true }));
    setMatchCenterErrors(prev => ({ ...prev, [matchId]: "" }));
    try {
      const res = await fetch(`/api/match?id=${encodeURIComponent(matchId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Match-Center konnte nicht geladen werden.");
      setMatchCenters(prev => ({ ...prev, [matchId]: data.match }));
      setCachedMatchCenters(prev => ({ ...prev, [matchId]: false }));
      saveCachedMatchCenter(matchId, data.match);
    } catch (e) {
      setMatchCenterErrors(prev => ({ ...prev, [matchId]: e.message || "Match-Center konnte nicht geladen werden." }));
    } finally {
      setMatchCenterLoading(prev => ({ ...prev, [matchId]: false }));
    }
  }, [expandedMatchId, matchCenters, matchCenterLoading]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!updated) {
        setSecondsLeft(refreshSeconds);
        return;
      }
      const elapsed = Math.floor((Date.now() - updated.getTime()) / 1000);
      const remaining = Math.max(0, refreshSeconds - (elapsed % refreshSeconds));
      setSecondsLeft(remaining);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [updated, refreshSeconds]);

  useEffect(() => {
    const interval = window.setInterval(load, Math.max(30, refreshSeconds) * 1000);
    return () => window.clearInterval(interval);
  }, [load, refreshSeconds]);

  const teamStats = useMemo(() => buildTeamStats(played), [played]);
  const standings = useMemo(() => buildStandings(teamStats), [teamStats]);
  const officialRanks = useMemo(() => rankMap(standings), [standings]);
  const liveProjectionStats = useMemo(() => buildTeamStats([...played, ...live]), [played, live]);
  const liveProjectionStandings = useMemo(() => buildStandings(liveProjectionStats), [liveProjectionStats]);
  const leaderChange = live.length > 0 && standings[0]?.person && liveProjectionStandings[0]?.person && standings[0].person !== liveProjectionStandings[0].person ? liveProjectionStandings[0].person : "";
  const upcomingByDate = useMemo(() => upcoming.reduce((acc, match) => {
    const key = match.date || "Datum offen";
    acc[key] ||= [];
    acc[key].push(match);
    acc[key].sort(matchSortAsc);
    return acc;
  }, {}), [upcoming]);
  const h2hStats = useMemo(() => buildHeadToHeadStats(played), [played]);

  const activeSubTab = subTabs[tab];
  const changeSubTab = id => setSubTabs(prev => ({ ...prev, [tab]: id }));

  let screen = null;
  if (tab === "liga") {
    screen = <StandingsPanel standings={standings} openPerson={openPerson} setOpenPerson={setOpenPerson} />;
  } else if (tab === "live") {
    screen = activeSubTab === "prognose"
      ? <ProjectionPanel live={live} liveProjectionStandings={liveProjectionStandings} officialRanks={officialRanks} openPerson={openPerson} setOpenPerson={setOpenPerson} />
      : <LivePanel live={live} expandedMatchId={expandedMatchId} openMatchCenter={openMatchCenter} matchCenters={matchCenters} matchCenterLoading={matchCenterLoading} matchCenterErrors={matchCenterErrors} cachedMatchCenters={cachedMatchCenters} />;
  } else if (tab === "spiele") {
    screen = <GamesPanel subTab={activeSubTab} upcomingByDate={upcomingByDate} played={played} live={live} />;
  } else if (tab === "stats") {
    screen = <StatsPanel h2hStats={h2hStats} selectedPerson={selectedH2hPerson} setSelectedPerson={setSelectedH2hPerson} />;
  } else if (tab === "mein") {
    screen = <MyPanel selectedPerson={selectedPerson} setSelectedPerson={setSelectedPerson} standings={standings} liveProjectionStandings={liveProjectionStandings} live={live} upcoming={upcoming} played={played} />;
  }

  return <main className="app-shell">
    <style>{STYLES}</style>
    <style>{ANALYSIS_STYLES}</style>
    <section className="phone-frame">
      <Header loading={loading} updated={updated} liveCount={live.length} playedCount={played.length} upcomingCount={upcoming.length} secondsLeft={secondsLeft} onRefresh={load} />
      <SubTabs activeTab={tab} activeSubTab={activeSubTab} onChange={changeSubTab} liveCount={live.length} />
      <div className="content">
        {leaderChange && <div className="top-alert leader">👑 Wenn es so bleibt, ist <strong style={{ color: COLORS[leaderChange] }}>{leaderChange}</strong> neuer Tabellenführer.</div>}
        {error && <div className="top-alert error">❌ {error}</div>}
        {screen}
      </div>
      <BottomNav active={tab} onChange={setTab} liveCount={live.length} />
    </section>
  </main>;
}
