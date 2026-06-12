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
  "usa": "USA",
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

function aliasKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .replace(/[._]/g, " ")
    .replace(/&/g, "and")
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

function namesMatch(a, b) {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  return na && nb && aliasKey(na) === aliasKey(nb);
}

function normalizeFootballDataPlayer(player) {
  if (!player || typeof player !== "object") return null;
  return {
    id: player.id ?? null,
    name: player.name || player.shortName || "Unbekannt",
    position: player.position || "",
    shirtNumber: player.shirtNumber ?? player.number ?? null,
    nationality: player.nationality || "",
  };
}

function normalizeApiFootballPlayer(entry) {
  const player = entry?.player || entry;
  if (!player || typeof player !== "object") return null;
  return {
    id: player.id ?? null,
    name: player.name || "Unbekannt",
    position: player.pos || player.position || "",
    shirtNumber: player.number ?? player.shirtNumber ?? null,
    grid: player.grid || "",
  };
}

function normalizeCoach(coach) {
  if (!coach || typeof coach !== "object") return null;
  return {
    id: coach.id ?? null,
    name: coach.name || "",
    nationality: coach.nationality || "",
    photo: coach.photo || "",
  };
}

function normalizeFootballDataTeam(team) {
  const lineup = Array.isArray(team?.lineup) ? team.lineup.map(normalizeFootballDataPlayer).filter(Boolean) : [];
  const bench = Array.isArray(team?.bench) ? team.bench.map(normalizeFootballDataPlayer).filter(Boolean) : [];

  return {
    id: team?.id ?? null,
    name: team?.name || team?.shortName || team?.tla || "Team",
    shortName: team?.shortName || "",
    tla: team?.tla || "",
    crest: team?.crest || "",
    logo: team?.crest || "",
    formation: team?.formation || "",
    coach: normalizeCoach(team?.coach),
    lineup,
    bench,
  };
}

function normalizeApiFootballTeam(lineupObject) {
  const lineup = Array.isArray(lineupObject?.startXI) ? lineupObject.startXI.map(normalizeApiFootballPlayer).filter(Boolean) : [];
  const bench = Array.isArray(lineupObject?.substitutes) ? lineupObject.substitutes.map(normalizeApiFootballPlayer).filter(Boolean) : [];

  return {
    id: lineupObject?.team?.id ?? null,
    name: lineupObject?.team?.name || "Team",
    shortName: lineupObject?.team?.name || "",
    tla: "",
    crest: lineupObject?.team?.logo || "",
    logo: lineupObject?.team?.logo || "",
    formation: lineupObject?.formation || "",
    coach: normalizeCoach(lineupObject?.coach),
    lineup,
    bench,
  };
}

function hasPlayers(team) {
  return (team?.lineup?.length || 0) + (team?.bench?.length || 0) > 0;
}

function getBerlinDate(utcDate) {
  if (!utcDate) return "";
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function bestFixtureMatch(fixtures, homeName, awayName) {
  const candidates = Array.isArray(fixtures) ? fixtures : [];
  return candidates.find(item => {
    const home = item?.teams?.home?.name;
    const away = item?.teams?.away?.name;
    return namesMatch(home, homeName) && namesMatch(away, awayName);
  }) || candidates.find(item => {
    const home = item?.teams?.home?.name;
    const away = item?.teams?.away?.name;
    return namesMatch(home, awayName) && namesMatch(away, homeName);
  }) || null;
}

async function loadApiFootballLineups({ homeTeam, awayTeam, utcDate }) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return null;

  const date = getBerlinDate(utcDate) || String(utcDate || "").slice(0, 10);
  if (!date) return null;

  const headers = {
    "x-apisports-key": apiKey,
    "Accept": "application/json",
  };

  const fixturesUrl = new URL("https://v3.football.api-sports.io/fixtures");
  fixturesUrl.searchParams.set("league", "1");
  fixturesUrl.searchParams.set("season", "2026");
  fixturesUrl.searchParams.set("date", date);
  fixturesUrl.searchParams.set("timezone", "Europe/Berlin");

  const fixturesRes = await fetch(fixturesUrl, { headers });
  const fixturesData = await fixturesRes.json().catch(() => null);
  if (!fixturesRes.ok) {
    throw new Error(fixturesData?.message || fixturesData?.errors?.requests || "API-Football Fixtures konnten nicht geladen werden.");
  }

  const fixture = bestFixtureMatch(fixturesData?.response, homeTeam?.name, awayTeam?.name);
  const fixtureId = fixture?.fixture?.id;
  if (!fixtureId) return null;

  const lineupsUrl = new URL("https://v3.football.api-sports.io/fixtures/lineups");
  lineupsUrl.searchParams.set("fixture", String(fixtureId));

  const lineupsRes = await fetch(lineupsUrl, { headers });
  const lineupsData = await lineupsRes.json().catch(() => null);
  if (!lineupsRes.ok) {
    throw new Error(lineupsData?.message || lineupsData?.errors?.requests || "API-Football Lineups konnten nicht geladen werden.");
  }

  const lineupRows = Array.isArray(lineupsData?.response) ? lineupsData.response : [];
  if (lineupRows.length === 0) return null;

  const normalizedRows = lineupRows.map(normalizeApiFootballTeam);
  const apiHome = normalizedRows.find(team => namesMatch(team.name, homeTeam?.name)) || normalizedRows[0] || null;
  const apiAway = normalizedRows.find(team => namesMatch(team.name, awayTeam?.name)) || normalizedRows.find(team => team !== apiHome) || normalizedRows[1] || null;

  if (!hasPlayers(apiHome) && !hasPlayers(apiAway)) return null;

  return {
    fixtureId,
    homeTeam: apiHome,
    awayTeam: apiAway,
    source: "api-football",
    sourceLabel: "API-Football / API-Sports",
  };
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

  const matchId = req.query?.id;
  if (!matchId || !/^\d+$/.test(String(matchId))) {
    return res.status(400).json({ error: "Gültige Match-ID fehlt." });
  }

  try {
    const fdRes = await fetch(`https://api.football-data.org/v4/matches/${encodeURIComponent(matchId)}`, {
      headers: { "X-Auth-Token": token, "Accept": "application/json" },
    });

    const data = await fdRes.json().catch(() => null);
    if (!fdRes.ok) {
      return res.status(fdRes.status).json({
        error: data?.message || data?.error || "Match-Details konnten nicht geladen werden.",
        details: data || null,
      });
    }

    const match = {
      id: data?.id ?? Number(matchId),
      status: data?.status || "",
      utcDate: data?.utcDate || "",
      homeTeam: normalizeFootballDataTeam(data?.homeTeam),
      awayTeam: normalizeFootballDataTeam(data?.awayTeam),
      lineupSource: "football-data.org",
      lineupSourceLabel: "football-data.org",
    };

    const footballDataHasPlayers = hasPlayers(match.homeTeam) || hasPlayers(match.awayTeam);

    if (!footballDataHasPlayers && process.env.API_FOOTBALL_KEY) {
      const apiFootballLineups = await loadApiFootballLineups(match).catch(error => ({ error }));

      if (apiFootballLineups && !apiFootballLineups.error) {
        match.homeTeam = apiFootballLineups.homeTeam || match.homeTeam;
        match.awayTeam = apiFootballLineups.awayTeam || match.awayTeam;
        match.apiFootballFixtureId = apiFootballLineups.fixtureId;
        match.lineupSource = apiFootballLineups.source;
        match.lineupSourceLabel = apiFootballLineups.sourceLabel;
      } else if (apiFootballLineups?.error) {
        match.lineupFallbackError = apiFootballLineups.error.message || "API-Football konnte keine Aufstellung liefern.";
      }
    }

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");
    return res.status(200).json({
      source: match.lineupSource,
      sourceLabel: match.lineupSourceLabel,
      match,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unbekannter Serverfehler beim Laden der Match-Details." });
  }
}
