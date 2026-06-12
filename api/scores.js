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
  "bosnia herzegovina": "Bosnia and Herzegovina",
  "bosnia-herzegovina": "Bosnia and Herzegovina",
  "bosnia-hercegovina": "Bosnia and Herzegovina",
  "bosnia and hercegovina": "Bosnia and Herzegovina",
  "bosnia-herzegovina national football team": "Bosnia and Herzegovina",
  "curacao": "Curaçao",
  "curaçao": "Curaçao",
  "saudi arabia": "Saudi Arabia",
  "south africa": "South Africa",
  "new zealand": "New Zealand",
};

const LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);
const BLOCKED_STATUSES = new Set(["CANCELLED", "POSTPONED", "SUSPENDED"]);

function aliasKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[._]/g, " ")
    .replace(/[\s-]+/g, " ")
    .trim();
}

function normalizeTeamName(name) {
  if (!name) return "";
  const cleaned = String(name).trim();
  const directKey = cleaned.toLowerCase();
  const fuzzyKey = aliasKey(cleaned);

  if (TEAM_ALIASES[directKey]) return TEAM_ALIASES[directKey];
  if (TEAM_ALIASES[fuzzyKey]) return TEAM_ALIASES[fuzzyKey];

  for (const team of ALL_TEAMS) {
    if (team.toLowerCase() === directKey || aliasKey(team) === fuzzyKey) return team;
  }
  return cleaned;
}

function getTeamName(team) {
  const candidates = [team?.name, team?.shortName, team?.tla].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeTeamName(candidate);
    if (ALL_TEAMS.has(normalized)) return normalized;
  }
  return normalizeTeamName(candidates[0] || "");
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

function pickNumber(...values) {
  for (const value of values) {
    if (Number.isInteger(value)) return value;
    const parsed = Number(value);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

function transformMatch(match) {
  const homeTeam = getTeamName(match.homeTeam);
  const awayTeam = getTeamName(match.awayTeam);
  const { date, time } = getBerlinDateAndTime(match.utcDate);
  const score = match.score || {};

  return {
    id: match.id,
    homeTeam,
    awayTeam,
    homeGoals: pickNumber(score.fullTime?.home, score.regularTime?.home, score.home),
    awayGoals: pickNumber(score.fullTime?.away, score.regularTime?.away, score.away),
    date,
    time,
    group: getGroup(match),
    status: match.status || "",
    minute: match.minute || match.matchTime || null,
  };
}

function isKnownSelectedMatch(m) {
  return ALL_TEAMS.has(m.homeTeam) && ALL_TEAMS.has(m.awayTeam);
}

function toScoreMatch({ id, homeTeam, awayTeam, homeGoals, awayGoals, date, time, group, status, minute }) {
  return { id, homeTeam, awayTeam, homeGoals, awayGoals, date, time, group, status, minute };
}

function toUpcomingMatch({ id, homeTeam, awayTeam, date, time, group, status }) {
  return { id, homeTeam, awayTeam, date, time, group, status };
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

    const live = transformed
      .filter(m => LIVE_STATUSES.has(m.status) && Number.isInteger(m.homeGoals) && Number.isInteger(m.awayGoals))
      .map(toScoreMatch)
      .sort((a, b) => `${a.date || "9999-99-99"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-99-99"} ${b.time || "99:99"}`));

    const played = transformed
      .filter(m => m.status === "FINISHED" && Number.isInteger(m.homeGoals) && Number.isInteger(m.awayGoals))
      .map(toScoreMatch)
      .sort((a, b) => `${b.date || "0000-00-00"} ${b.time || "00:00"}`.localeCompare(`${a.date || "0000-00-00"} ${a.time || "00:00"}`));

    const upcoming = transformed
      .filter(m => m.status !== "FINISHED" && !LIVE_STATUSES.has(m.status) && !BLOCKED_STATUSES.has(m.status))
      .map(toUpcomingMatch)
      .sort((a, b) => `${a.date || "9999-99-99"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-99-99"} ${b.time || "99:99"}`));

    const cacheHeader = live.length > 0 ? "s-maxage=30, stale-while-revalidate=60" : "s-maxage=300, stale-while-revalidate=900";
    res.setHeader("Cache-Control", cacheHeader);
    return res.status(200).json({
      source: "football-data.org",
      competition: "WC",
      season: 2026,
      fetchedAt: new Date().toISOString(),
      live,
      played,
      upcoming,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unbekannter Serverfehler beim Abrufen der Fußball-Daten." });
  }
}
