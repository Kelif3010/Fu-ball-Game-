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
  "united states": "USA", "united states of america": "USA", "usa": "USA",
  "holland": "Netherlands", "the netherlands": "Netherlands",
  "côte d'ivoire": "Ivory Coast", "cote d'ivoire": "Ivory Coast", "ivory coast": "Ivory Coast",
  "korea republic": "South Korea", "republic of korea": "South Korea", "south korea": "South Korea",
  "dr congo": "DR Congo", "d.r. congo": "DR Congo", "democratic republic of congo": "DR Congo", "democratic republic of the congo": "DR Congo", "drc": "DR Congo", "congo dr": "DR Congo",
  "czechia": "Czech Republic", "czech republic": "Czech Republic",
  "cabo verde": "Cape Verde", "cape verde": "Cape Verde",
  "bosnia": "Bosnia and Herzegovina", "bosnia & herzegovina": "Bosnia and Herzegovina", "bosnia and herzegovina": "Bosnia and Herzegovina", "bosnia herzegovina": "Bosnia and Herzegovina", "bosnia-herzegovina": "Bosnia and Herzegovina", "bosnia-hercegovina": "Bosnia and Herzegovina", "bosnia and hercegovina": "Bosnia and Herzegovina", "bosnia-herzegovina national football team": "Bosnia and Herzegovina",
  "curacao": "Curaçao", "curaçao": "Curaçao", "saudi arabia": "Saudi Arabia", "south africa": "South Africa", "new zealand": "New Zealand",
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
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
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
  return Boolean(na && nb && aliasKey(na) === aliasKey(nb));
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
  return { id: coach.id ?? null, name: coach.name || "", nationality: coach.nationality || "", photo: coach.photo || "" };
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

function readableEventLabel(type, detail, comments) {
  const rawType = String(type || "").toLowerCase();
  const rawDetail = String(detail || "").toLowerCase();
  const rawComments = String(comments || "").toLowerCase();
  const combined = `${rawType} ${rawDetail} ${rawComments}`;

  if (rawType.includes("goal")) {
    if (combined.includes("own")) return "⚽ Eigentor";
    if (combined.includes("penalty")) return "⚽ Elfmeter-Tor";
    if (combined.includes("missed")) return "❌ Elfmeter verschossen";
    if (combined.includes("cancelled") || combined.includes("var")) return "⚽ Tor-Check";
    return "⚽ Tor";
  }

  if (rawType.includes("card")) {
    if (combined.includes("red") || combined.includes("second yellow")) return "🟥 Rote Karte";
    if (combined.includes("yellow")) return "🟨 Gelbe Karte";
    return "🟨 Karte";
  }

  if (rawType.includes("subst") || rawDetail.includes("substitution")) return "🔁 Auswechslung";

  if (rawType.includes("var") || combined.includes("var")) return "📺 VAR-Check";

  return detail || type || "Event";
}

function normalizeApiFootballEvent(event) {
  if (!event || typeof event !== "object") return null;
  const elapsed = event.time?.elapsed ?? null;
  const extra = event.time?.extra ?? null;
  const originalType = event.type || "";
  const originalDetail = event.detail || "";
  const comments = event.comments || "";
  return {
    minute: Number.isInteger(elapsed) ? `${elapsed}${Number.isInteger(extra) ? `+${extra}` : ""}'` : "",
    team: normalizeTeamName(event.team?.name || ""),
    player: event.player?.name || "",
    assist: event.assist?.name || "",
    type: readableEventLabel(originalType, originalDetail, comments),
    detail: "",
    originalType,
    originalDetail,
    comments,
  };
}

function hasPlayers(team) {
  return (team?.lineup?.length || 0) + (team?.bench?.length || 0) > 0;
}

function getBerlinDate(utcDate) {
  if (!utcDate) return "";
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(d)
    .reduce((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getUtcDate(utcDate) {
  if (!utcDate) return "";
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  if (!dateStr) return "";
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function bestFixtureMatch(fixtures, homeName, awayName) {
  const candidates = Array.isArray(fixtures) ? fixtures : [];
  return candidates.find(item => namesMatch(item?.teams?.home?.name, homeName) && namesMatch(item?.teams?.away?.name, awayName))
    || candidates.find(item => namesMatch(item?.teams?.home?.name, awayName) && namesMatch(item?.teams?.away?.name, homeName))
    || null;
}

async function apiFootballGet(path, params, headers) {
  const url = new URL(`https://v3.football.api-sports.io/${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  const response = await fetch(url, { headers });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.message || data?.errors?.requests || data?.errors?.token || `API-Football ${path} konnte nicht geladen werden.`;
    throw new Error(Array.isArray(message) ? message.join(" ") : String(message));
  }
  return data;
}

async function findApiFootballFixture({ homeTeam, awayTeam, utcDate }, headers) {
  const berlinDate = getBerlinDate(utcDate);
  const utcDay = getUtcDate(utcDate);
  const dates = unique([berlinDate, utcDay, addDays(berlinDate, -1), addDays(berlinDate, 1)]);
  const attempts = [];

  for (const date of dates) {
    attempts.push({ label: `World Cup 2026 ${date}`, params: { league: 1, season: 2026, date, timezone: "Europe/Berlin" } });
    attempts.push({ label: `World Cup ohne Season ${date}`, params: { league: 1, date, timezone: "Europe/Berlin" } });
    attempts.push({ label: `Breite Datumssuche ${date}`, params: { date, timezone: "Europe/Berlin" } });
  }

  const diagnostics = [];
  for (const attempt of attempts) {
    const data = await apiFootballGet("fixtures", attempt.params, headers);
    const fixtures = Array.isArray(data?.response) ? data.response : [];
    diagnostics.push({ label: attempt.label, count: fixtures.length });
    const fixture = bestFixtureMatch(fixtures, homeTeam?.name, awayTeam?.name);
    if (fixture?.fixture?.id) return { fixture, diagnostics };
  }

  return { fixture: null, diagnostics };
}

async function loadApiFootballMatchCenter(match) {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) return null;

  const headers = { "x-apisports-key": apiKey, "Accept": "application/json" };
  const { fixture, diagnostics } = await findApiFootballFixture(match, headers);
  const fixtureId = fixture?.fixture?.id;
  if (!fixtureId) {
    return {
      empty: true,
      source: "api-football",
      sourceLabel: "API-Football / API-Sports",
      fallbackReason: "API-Football hat zum Datum kein passendes Fixture für diese Teamnamen gefunden.",
      diagnostics,
    };
  }

  const [lineupsData, eventsData] = await Promise.all([
    apiFootballGet("fixtures/lineups", { fixture: fixtureId }, headers),
    apiFootballGet("fixtures/events", { fixture: fixtureId }, headers).catch(() => ({ response: [] })),
  ]);

  const lineupRows = Array.isArray(lineupsData?.response) ? lineupsData.response : [];
  const normalizedRows = lineupRows.map(normalizeApiFootballTeam);
  const apiHome = normalizedRows.find(team => namesMatch(team.name, match.homeTeam?.name)) || normalizedRows[0] || null;
  const apiAway = normalizedRows.find(team => namesMatch(team.name, match.awayTeam?.name)) || normalizedRows.find(team => team !== apiHome) || normalizedRows[1] || null;
  const events = Array.isArray(eventsData?.response) ? eventsData.response.map(normalizeApiFootballEvent).filter(Boolean) : [];

  if (!hasPlayers(apiHome) && !hasPlayers(apiAway) && events.length === 0) {
    return {
      empty: true,
      fixtureId,
      source: "api-football",
      sourceLabel: "API-Football / API-Sports",
      fallbackReason: "API-Football hat das Fixture gefunden, liefert dafür aber aktuell keine Lineups oder Events.",
      diagnostics,
    };
  }

  return {
    fixtureId,
    homeTeam: apiHome,
    awayTeam: apiAway,
    events,
    source: "api-football",
    sourceLabel: "API-Football / API-Sports",
    diagnostics,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return res.status(500).json({ error: "FOOTBALL_DATA_TOKEN fehlt in den Vercel Environment Variables." });

  const matchId = req.query?.id;
  if (!matchId || !/^\d+$/.test(String(matchId))) return res.status(400).json({ error: "Gültige Match-ID fehlt." });

  try {
    const fdRes = await fetch(`https://api.football-data.org/v4/matches/${encodeURIComponent(matchId)}`, {
      headers: { "X-Auth-Token": token, "Accept": "application/json" },
    });

    const data = await fdRes.json().catch(() => null);
    if (!fdRes.ok) {
      return res.status(fdRes.status).json({ error: data?.message || data?.error || "Match-Details konnten nicht geladen werden.", details: data || null });
    }

    const match = {
      id: data?.id ?? Number(matchId),
      status: data?.status || "",
      utcDate: data?.utcDate || "",
      homeTeam: normalizeFootballDataTeam(data?.homeTeam),
      awayTeam: normalizeFootballDataTeam(data?.awayTeam),
      lineupSource: "football-data.org",
      lineupSourceLabel: "football-data.org",
      events: [],
    };

    const footballDataHasPlayers = hasPlayers(match.homeTeam) || hasPlayers(match.awayTeam);

    if ((!footballDataHasPlayers || match.events.length === 0) && process.env.API_FOOTBALL_KEY) {
      const apiFootballMatchCenter = await loadApiFootballMatchCenter(match).catch(error => ({ error }));
      match.lineupFallbackTried = true;

      if (apiFootballMatchCenter && !apiFootballMatchCenter.error && !apiFootballMatchCenter.empty) {
        if (!footballDataHasPlayers) {
          match.homeTeam = apiFootballMatchCenter.homeTeam || match.homeTeam;
          match.awayTeam = apiFootballMatchCenter.awayTeam || match.awayTeam;
        }
        match.events = apiFootballMatchCenter.events || [];
        match.apiFootballFixtureId = apiFootballMatchCenter.fixtureId;
        match.lineupSource = apiFootballMatchCenter.source;
        match.lineupSourceLabel = apiFootballMatchCenter.sourceLabel;
        match.lineupDiagnostics = apiFootballMatchCenter.diagnostics || [];
      } else if (apiFootballMatchCenter?.empty) {
        match.apiFootballFixtureId = apiFootballMatchCenter.fixtureId || null;
        match.lineupSource = apiFootballMatchCenter.source;
        match.lineupSourceLabel = apiFootballMatchCenter.sourceLabel;
        match.lineupFallbackReason = apiFootballMatchCenter.fallbackReason;
        match.lineupDiagnostics = apiFootballMatchCenter.diagnostics || [];
      } else if (apiFootballMatchCenter?.error) {
        match.lineupFallbackError = apiFootballMatchCenter.error.message || "API-Football konnte keine Match-Center-Daten liefern.";
      }
    } else if (!footballDataHasPlayers && !process.env.API_FOOTBALL_KEY) {
      match.lineupFallbackReason = "API_FOOTBALL_KEY fehlt in Vercel. Deshalb kann API-Football nicht als Fallback genutzt werden.";
    }

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=900");
    return res.status(200).json({ source: match.lineupSource, sourceLabel: match.lineupSourceLabel, fetchedAt: new Date().toISOString(), match });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unbekannter Serverfehler beim Laden der Match-Details." });
  }
}
