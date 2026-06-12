const ALL_TEAMS = new Set([
  "Portugal", "Norway", "USA", "Scotland", "South Africa", "Jordan",
  "Brazil", "Senegal", "Switzerland", "Mexico", "Uzbekistan", "Saudi Arabia",
  "Netherlands", "Turkey", "Uruguay", "Ghana", "South Korea", "Iran",
  "France", "Morocco", "Ecuador", "Paraguay", "Tunisia", "Panama",
  "Argentina", "Sweden", "Colombia", "Czech Republic", "Australia", "Qatar",
  "Germany", "Belgium", "Algeria", "Canada", "Haiti", "Iraq",
  "Spain", "Croatia", "Austria", "DR Congo", "Egypt", "Curaçao",
  "England", "Ivory Coast", "Japan", "Bosnia and Herzegovina", "Cape Verde", "New Zealand",
]);

const TEAM_ALIASES = {
  "united states": "USA",
  "united states of america": "USA",
  "u.s.a.": "USA",
  "u.s.": "USA",
  "holland": "Netherlands",
  "the netherlands": "Netherlands",
  "côte d'ivoire": "Ivory Coast",
  "cote d'ivoire": "Ivory Coast",
  "ivory coast": "Ivory Coast",
  "korea republic": "South Korea",
  "republic of korea": "South Korea",
  "south korea": "South Korea",
  "dr congo": "DR Congo",
  "d.r. congo": "DR Congo",
  "democratic republic of congo": "DR Congo",
  "democratic republic of the congo": "DR Congo",
  "drc": "DR Congo",
  "congo dr": "DR Congo",
  "czechia": "Czech Republic",
  "czech republic": "Czech Republic",
  "cabo verde": "Cape Verde",
  "cape verde": "Cape Verde",
  "bosnia": "Bosnia and Herzegovina",
  "bosnia & herzegovina": "Bosnia and Herzegovina",
  "bosnia and herzegovina": "Bosnia and Herzegovina",
  "curacao": "Curaçao",
  "curaçao": "Curaçao",
  "saudi arabia": "Saudi Arabia",
  "south africa": "South Africa",
  "new zealand": "New Zealand",
};

function normalizeTeamName(name) {
  if (!name) return "";
  const cleaned = String(name).trim();
  const key = cleaned.toLowerCase();
  if (TEAM_ALIASES[key]) return TEAM_ALIASES[key];
  for (const team of ALL_TEAMS) {
    if (team.toLowerCase() === key) return team;
  }
  return cleaned;
}

function getTeamName(team) {
  return normalizeTeamName(team?.name || team?.shortName || team?.tla || "");
}

function getBerlinDateAndTime(utcDate) {
  if (!utcDate) return { date: "", time: "" };
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function getGroup(match) {
  const raw = match?.group || match?.stage || "";
  if (!raw) return "";
  return String(raw).replace(/^GROUP[_\s-]*/i, "").replace(/^GRUPPE[_\s-]*/i, "");
}

function transformMatch(match) {
  const homeTeam = getTeamName(match.homeTeam);
  const awayTeam = getTeamName(match.awayTeam);
  const { date, time } = getBerlinDateAndTime(match.utcDate);
  return {
    homeTeam,
    awayTeam,
    homeGoals: match.score?.fullTime?.home,
    awayGoals: match.score?.fullTime?.away,
    date,
    time,
    group: getGroup(match),
    status: match.status,
  };
}

function isKnownSelectedMatch(m) {
  return ALL_TEAMS.has(m.homeTeam) && ALL_TEAMS.has(m.awayTeam);
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "FOOTBALL_DATA_TOKEN fehlt in den Vercel Environment Variables." });
  }

  const url = new URL("https://api.football-data.org/v4/competitions/WC/matches");
  url.searchParams.set("season", "2026");
  url.searchParams.set("stage", "GROUP_STAGE");

  try {
    const fdRes = await fetch(url, {
      headers: { "X-Auth-Token": token, "Accept": "application/json" },
    });
    const data = await fdRes.json().catch(() => null);
    if (!fdRes.ok) {
      return res.status(fdRes.status).json({
        error: data?.message || data?.error || "football-data.org konnte nicht geladen werden.",
        details: data || null,
      });
    }

    const matches = Array.isArray(data?.matches) ? data.matches : [];
    const transformed = matches.map(transformMatch).filter(isKnownSelectedMatch);
    const played = transformed
      .filter(m => m.status === "FINISHED" && Number.isInteger(m.homeGoals) && Number.isInteger(m.awayGoals))
      .map(({ homeTeam, awayTeam, homeGoals, awayGoals }) => ({ homeTeam, awayTeam, homeGoals, awayGoals }));
    const upcoming = transformed
      .filter(m => m.status !== "FINISHED" && m.status !== "CANCELLED")
      .map(({ homeTeam, awayTeam, date, time, group }) => ({ homeTeam, awayTeam, date, time, group }))
      .sort((a, b) => `${a.date || "9999-99-99"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-99-99"} ${b.time || "99:99"}`));

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    return res.status(200).json({
      source: "football-data.org",
      competition: "WC",
      season: 2026,
      fetchedAt: new Date().toISOString(),
      played,
      upcoming,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unbekannter Serverfehler beim Abrufen der Fußball-Daten." });
  }
}
