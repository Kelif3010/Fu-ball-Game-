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
    stats[h].played++; stats[a].played++;
    stats[h].gf += hg; stats[h].ga += ag;
    stats[a].gf += ag; stats[a].ga += hg;
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
  }).sort((a, b) => b.pts - a.pts || b.td - a.td || b.gf - a.gf);
}

function formatDate(dateStr) {
  if (!dateStr) return "Datum offen";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function App() {
  const [played, setPlayed] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);
  const [tab, setTab] = useState("standings");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Daten konnten nicht geladen werden.");
      setPlayed(Array.isArray(data.played) ? data.played : []);
      setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
      setUpdated(new Date());
    } catch (e) {
      setError(e.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const teamStats = useMemo(() => buildTeamStats(played), [played]);
  const standings = useMemo(() => buildStandings(teamStats), [teamStats]);
  const upcomingByDate = useMemo(() => {
    return upcoming.reduce((acc, match) => {
      const key = match.date || "Datum offen";
      acc[key] ||= [];
      acc[key].push(match);
      return acc;
    }, {});
  }, [upcoming]);

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(160deg,#05091a,#0c1525 55%,#070d1c)", color: "#e2e8f0", fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif", padding: 16 }}>
      <section style={{ maxWidth: 920, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: "#fbbf24" }}>⚽ WM 2026 Liga</h1>
            <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
              {loading ? "Lade Daten…" : updated ? `Stand: ${updated.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr · ${played.length} Ergebnisse · ${upcoming.length} kommende Spiele` : "Bereit"}
            </p>
          </div>
          <button onClick={load} disabled={loading} style={{ border: "1px solid rgba(245,158,11,.35)", background: "rgba(245,158,11,.12)", color: "#fbbf24", borderRadius: 12, padding: "10px 14px", fontWeight: 800, cursor: loading ? "default" : "pointer" }}>
            {loading ? "⏳ Lädt" : "🔄 Aktualisieren"}
          </button>
        </header>

        {error && <div style={{ background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.35)", color: "#fca5a5", padding: 14, borderRadius: 14, marginBottom: 14 }}>❌ {error}</div>}

        <nav style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {[["standings", "🏆 Rangliste"], ["upcoming", "📅 Nächste Spiele"], ["played", "⚽ Ergebnisse"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ border: "1px solid rgba(255,255,255,.1)", background: tab === id ? "rgba(245,158,11,.18)" : "rgba(255,255,255,.04)", color: tab === id ? "#fbbf24" : "#cbd5e1", borderRadius: 999, padding: "9px 13px", fontWeight: 800, cursor: "pointer" }}>{label}</button>
          ))}
        </nav>

        {tab === "standings" && (
          <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 18, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "46px 1fr 70px 92px 70px 60px", gap: 8, padding: "12px 14px", background: "rgba(255,255,255,.04)", color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
              <span>#</span><span>Spieler</span><span>PTS</span><span>S-U-N</span><span>Tore</span><span>TD</span>
            </div>
            {standings.map((row, i) => (
              <div key={row.person} style={{ display: "grid", gridTemplateColumns: "46px 1fr 70px 92px 70px 60px", gap: 8, padding: "13px 14px", alignItems: "center", borderTop: "1px solid rgba(255,255,255,.06)", background: i === 0 ? "rgba(245,158,11,.08)" : "transparent" }}>
                <strong>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}</strong>
                <div>
                  <strong style={{ color: COLORS[row.person] }}>{row.person}</strong>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{row.teams.map(t => `${FLAGS[t] || ""} ${DE[t] || t}`).join(" · ")}</div>
                </div>
                <strong style={{ fontSize: 22, color: COLORS[row.person] }}>{row.pts}</strong>
                <span><span style={{ color: "#34d399" }}>{row.won}</span>-<span>{row.drawn}</span>-<span style={{ color: "#f87171" }}>{row.lost}</span></span>
                <span>{row.gf}:{row.ga}</span>
                <strong style={{ color: row.td > 0 ? "#34d399" : row.td < 0 ? "#f87171" : "#94a3b8" }}>{row.td > 0 ? "+" : ""}{row.td}</strong>
              </div>
            ))}
          </div>
        )}

        {tab === "upcoming" && (
          <div style={{ display: "grid", gap: 12 }}>
            {Object.keys(upcomingByDate).length === 0 && <p style={{ color: "#94a3b8" }}>Keine kommenden Spiele gefunden.</p>}
            {Object.entries(upcomingByDate).map(([date, matches]) => (
              <section key={date}>
                <h2 style={{ fontSize: 15, color: "#fbbf24" }}>{formatDate(date)}</h2>
                {matches.map((m, i) => {
                  const hOwner = ownerOf(m.homeTeam);
                  const aOwner = ownerOf(m.awayTeam);
                  return <div key={`${date}-${i}`} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 14, marginBottom: 8 }}>
                    <div><strong>{FLAGS[m.homeTeam]} {DE[m.homeTeam] || m.homeTeam}</strong><br />{hOwner && <small style={{ color: COLORS[hOwner] }}>{hOwner}</small>}</div>
                    <div style={{ textAlign: "center", color: "#94a3b8", fontWeight: 800 }}>{m.time || "--:--"}<br />VS</div>
                    <div style={{ textAlign: "right" }}><strong>{DE[m.awayTeam] || m.awayTeam} {FLAGS[m.awayTeam]}</strong><br />{aOwner && <small style={{ color: COLORS[aOwner] }}>{aOwner}</small>}</div>
                  </div>;
                })}
              </section>
            ))}
          </div>
        )}

        {tab === "played" && (
          <div style={{ display: "grid", gap: 10 }}>
            {played.length === 0 && <p style={{ color: "#94a3b8" }}>Noch keine Ergebnisse verfügbar.</p>}
            {played.map((m, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: 14 }}>
                <div><strong>{FLAGS[m.homeTeam]} {DE[m.homeTeam] || m.homeTeam}</strong><br /><small style={{ color: COLORS[ownerOf(m.homeTeam)] }}>{ownerOf(m.homeTeam)}</small></div>
                <strong style={{ fontSize: 24 }}>{m.homeGoals}:{m.awayGoals}</strong>
                <div style={{ textAlign: "right" }}><strong>{DE[m.awayTeam] || m.awayTeam} {FLAGS[m.awayTeam]}</strong><br /><small style={{ color: COLORS[ownerOf(m.awayTeam)] }}>{ownerOf(m.awayTeam)}</small></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
