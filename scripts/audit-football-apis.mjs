import fs from "node:fs/promises";

const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN || "";
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || "";
const REPORT_PATH = "api-audit-report.md";
const FOOTBALL_DATA_BASE = "https://api.football-data.org/v4";
const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

const footballDataHeaders = {
  "X-Auth-Token": FOOTBALL_DATA_TOKEN,
  "Accept": "application/json",
};

const footballDataUnfoldHeaders = {
  ...footballDataHeaders,
  "X-Unfold-Lineups": "true",
  "X-Unfold-Bookings": "true",
  "X-Unfold-Goals": "true",
  "X-Unfold-Subs": "true",
};

const apiFootballHeaders = {
  "x-apisports-key": API_FOOTBALL_KEY,
  "Accept": "application/json",
};

function jsonBlock(value) {
  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item?.[key] ?? "null";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function pickMatchSummary(match) {
  if (!match) return null;
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: match.status,
    stage: match.stage,
    group: match.group,
    matchday: match.matchday,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    score: match.score,
  };
}

function countKnownTeamSlots(matches) {
  return matches.reduce((count, match) => {
    return count + (match?.homeTeam?.id ? 1 : 0) + (match?.awayTeam?.id ? 1 : 0);
  }, 0);
}

function summarizeFootballDataMatch(match) {
  if (!match) return null;
  return {
    id: match.id,
    status: match.status,
    stage: match.stage,
    group: match.group,
    homeTeam: {
      id: match.homeTeam?.id ?? null,
      name: match.homeTeam?.name ?? null,
      lineupCount: Array.isArray(match.homeTeam?.lineup) ? match.homeTeam.lineup.length : null,
      benchCount: Array.isArray(match.homeTeam?.bench) ? match.homeTeam.bench.length : null,
    },
    awayTeam: {
      id: match.awayTeam?.id ?? null,
      name: match.awayTeam?.name ?? null,
      lineupCount: Array.isArray(match.awayTeam?.lineup) ? match.awayTeam.lineup.length : null,
      benchCount: Array.isArray(match.awayTeam?.bench) ? match.awayTeam.bench.length : null,
    },
    goalsCount: Array.isArray(match.goals) ? match.goals.length : null,
    bookingsCount: Array.isArray(match.bookings) ? match.bookings.length : null,
    substitutionsCount: Array.isArray(match.substitutions) ? match.substitutions.length : null,
    refereesCount: Array.isArray(match.referees) ? match.referees.length : null,
    sampleGoal: Array.isArray(match.goals) ? match.goals[0] || null : null,
    sampleBooking: Array.isArray(match.bookings) ? match.bookings[0] || null : null,
    sampleSubstitution: Array.isArray(match.substitutions) ? match.substitutions[0] || null : null,
    sampleHomeLineupPlayer: Array.isArray(match.homeTeam?.lineup) ? match.homeTeam.lineup[0] || null : null,
  };
}

function summarizeApiFootballFixture(fixture) {
  if (!fixture) return null;
  return {
    fixture: {
      id: fixture.fixture?.id ?? null,
      date: fixture.fixture?.date ?? null,
      timezone: fixture.fixture?.timezone ?? null,
      status: fixture.fixture?.status ?? null,
    },
    league: fixture.league || null,
    teams: fixture.teams || null,
    goals: fixture.goals || null,
    score: fixture.score || null,
  };
}

function namesOverlap(a, b) {
  const left = String(a || "").toLowerCase();
  const right = String(b || "").toLowerCase();
  return Boolean(left && right && (left.includes(right) || right.includes(left)));
}

function findLikelyApiFootballFixture(fixtures, footballDataMatch) {
  const fdHome = footballDataMatch?.homeTeam?.name;
  const fdAway = footballDataMatch?.awayTeam?.name;
  return fixtures.find(item =>
    namesOverlap(item?.teams?.home?.name, fdHome) && namesOverlap(item?.teams?.away?.name, fdAway)
  ) || fixtures.find(item =>
    namesOverlap(item?.teams?.home?.name, fdAway) && namesOverlap(item?.teams?.away?.name, fdHome)
  ) || fixtures[0] || null;
}

async function getJson(url, headers) {
  const response = await fetch(url, { headers });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text.slice(0, 1000) };
  }

  return {
    ok: response.ok,
    status: response.status,
    url,
    data,
  };
}

async function footballDataGet(path, headers = footballDataHeaders) {
  return getJson(`${FOOTBALL_DATA_BASE}${path}`, headers);
}

async function apiFootballGet(path) {
  return getJson(`${API_FOOTBALL_BASE}${path}`, apiFootballHeaders);
}

function footballDataSection(result, title) {
  if (!result.ok) {
    return [`## ${title}`, "", `Status: ${result.status}`, "", jsonBlock(result.data), ""].join("\n");
  }
  return "";
}

async function main() {
  if (!FOOTBALL_DATA_TOKEN) {
    console.error("Missing FOOTBALL_DATA_TOKEN. Refusing to overwrite api-audit-report.md without API data.");
    process.exitCode = 1;
    return;
  }

  const lines = [
    "# Football API Audit",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "Tokens are read from environment variables and are not written into this report.",
    "",
  ];

  if (!FOOTBALL_DATA_TOKEN) {
    lines.push("## football-data.org", "", "Missing `FOOTBALL_DATA_TOKEN`. Skipping football-data.org checks.", "");
  } else {
    const allMatchesResult = await footballDataGet("/competitions/WC/matches?season=2026");
    lines.push("## football-data.org: WC 2026 Matches", "");
    lines.push(`Status: ${allMatchesResult.status}`, "");

    if (!allMatchesResult.ok) {
      lines.push(jsonBlock(allMatchesResult.data), "");
    } else {
      const matches = Array.isArray(allMatchesResult.data?.matches) ? allMatchesResult.data.matches : [];
      const koMatches = matches.filter(match => match.stage && match.stage !== "GROUP_STAGE");
      const finishedMatch = matches.find(match => match.status === "FINISHED" && match.homeTeam?.id && match.awayTeam?.id);
      const last32Match = matches.find(match => match.stage === "LAST_32");

      lines.push(jsonBlock({
        filters: allMatchesResult.data?.filters || null,
        resultSet: allMatchesResult.data?.resultSet || null,
        competition: allMatchesResult.data?.competition || null,
        totalMatches: matches.length,
        byStage: countBy(matches, "stage"),
        byStatus: countBy(matches, "status"),
        knockoutMatches: koMatches.length,
        sampleGroupMatch: pickMatchSummary(matches.find(match => match.stage === "GROUP_STAGE")),
        sampleLast32Match: pickMatchSummary(last32Match),
        sampleFinishedMatch: pickMatchSummary(finishedMatch),
      }), "");

      const stages = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];
      lines.push("## football-data.org: Knockout Stage Filters", "");
      for (const stage of stages) {
        const result = await footballDataGet(`/competitions/WC/matches?season=2026&stage=${stage}`);
        const stageMatches = Array.isArray(result.data?.matches) ? result.data.matches : [];
        const teamSlots = stageMatches.length * 2;
        const knownTeamSlots = countKnownTeamSlots(stageMatches);
        lines.push(`### ${stage}`, "");
        lines.push(jsonBlock({
          status: result.status,
          count: stageMatches.length,
          teamSlots,
          knownTeamSlots,
          emptyTeamSlots: teamSlots - knownTeamSlots,
          matches: stageMatches.map(pickMatchSummary),
        }), "");
      }

      if (finishedMatch?.id) {
        const detailResult = await footballDataGet(`/matches/${finishedMatch.id}`, footballDataUnfoldHeaders);
        lines.push("## football-data.org: Match Details With Unfold Headers", "");
        lines.push(`Checked match id: ${finishedMatch.id}`, "");
        if (!detailResult.ok) {
          lines.push(footballDataSection(detailResult, "football-data.org detail error"));
        } else {
          lines.push(jsonBlock(summarizeFootballDataMatch(detailResult.data)), "");
        }
      }

      const scorersResult = await footballDataGet("/competitions/WC/scorers?season=2026");
      lines.push("## football-data.org: Scorers", "");
      lines.push(`Status: ${scorersResult.status}`, "");
      if (!scorersResult.ok) {
        lines.push(jsonBlock(scorersResult.data), "");
      } else {
        const scorers = Array.isArray(scorersResult.data?.scorers) ? scorersResult.data.scorers : [];
        lines.push(jsonBlock({
          count: scorers.length,
          sample: scorers.slice(0, 10).map(row => ({
            player: row.player,
            team: row.team,
            goals: row.goals,
            assists: row.assists,
            penalties: row.penalties,
          })),
        }), "");
      }

      if (API_FOOTBALL_KEY && finishedMatch) {
        const date = String(finishedMatch.utcDate || "").slice(0, 10);
        const leagueSearches = [
          { label: "id=1 season=2026", path: "/leagues?id=1&season=2026" },
          { label: "search=world cup", path: "/leagues?search=world%20cup" },
          { label: "search=fifa world cup", path: "/leagues?search=fifa%20world%20cup" },
          { label: "id=1", path: "/leagues?id=1" },
        ];
        const leagueResults = [];
        const candidateLeagues = new Map();
        for (const search of leagueSearches) {
          const result = await apiFootballGet(search.path);
          const rows = Array.isArray(result.data?.response) ? result.data.response : [];
          leagueResults.push({
            label: search.label,
            status: result.status,
            count: rows.length,
            sample: rows.slice(0, 6),
          });
          rows.forEach(row => {
            const id = row?.league?.id;
            if (id) candidateLeagues.set(id, row);
          });
        }

        const candidateLeagueIds = [...candidateLeagues.keys()];
        const fixtureSearches = [
          { label: `date only ${date}`, path: `/fixtures?date=${date}&timezone=Europe/Berlin` },
          { label: `league=1 season=2026 date ${date}`, path: `/fixtures?league=1&season=2026&date=${date}&timezone=Europe/Berlin` },
          { label: `league=1 date ${date}`, path: `/fixtures?league=1&date=${date}&timezone=Europe/Berlin` },
          { label: "league=1 season=2026", path: "/fixtures?league=1&season=2026&timezone=Europe/Berlin" },
          ...candidateLeagueIds.flatMap(id => ([
            { label: `league=${id} season=2026 date ${date}`, path: `/fixtures?league=${id}&season=2026&date=${date}&timezone=Europe/Berlin` },
            { label: `league=${id} date ${date}`, path: `/fixtures?league=${id}&date=${date}&timezone=Europe/Berlin` },
            { label: `league=${id} season=2026`, path: `/fixtures?league=${id}&season=2026&timezone=Europe/Berlin` },
          ])),
        ];

        const fixtureResults = [];
        let fixture = null;
        for (const search of fixtureSearches) {
          const result = await apiFootballGet(search.path);
          const fixtures = Array.isArray(result.data?.response) ? result.data.response : [];
          const likely = findLikelyApiFootballFixture(fixtures, finishedMatch);
          fixtureResults.push({
            label: search.label,
            status: result.status,
            count: fixtures.length,
            likelyFixture: summarizeApiFootballFixture(likely),
            sample: fixtures.slice(0, 3).map(summarizeApiFootballFixture),
          });
          if (!fixture && likely?.fixture?.id) fixture = likely;
        }

        const fixtureId = fixture?.fixture?.id || null;

        lines.push("## API-Football: League Discovery", "");
        lines.push(jsonBlock({
          searches: leagueResults,
          candidateLeagueIds,
        }), "");

        const [
          rounds,
          currentRound,
          teams,
          standings,
          players,
          topScorers,
          topAssists,
          topYellowCards,
          topRedCards,
          injuries,
        ] = await Promise.all([
          apiFootballGet("/fixtures/rounds?league=1&season=2026"),
          apiFootballGet("/fixtures/rounds?league=1&season=2026&current=true"),
          apiFootballGet("/teams?league=1&season=2026"),
          apiFootballGet("/standings?league=1&season=2026"),
          apiFootballGet("/players?league=1&season=2026&page=1"),
          apiFootballGet("/players/topscorers?league=1&season=2026"),
          apiFootballGet("/players/topassists?league=1&season=2026"),
          apiFootballGet("/players/topyellowcards?league=1&season=2026"),
          apiFootballGet("/players/topredcards?league=1&season=2026"),
          apiFootballGet("/injuries?league=1&season=2026"),
        ]);

        lines.push("## API-Football: World Cup 2026 Overview Endpoints", "");
        lines.push(jsonBlock({
          rounds: {
            status: rounds.status,
            count: Array.isArray(rounds.data?.response) ? rounds.data.response.length : null,
            response: Array.isArray(rounds.data?.response) ? rounds.data.response : rounds.data,
          },
          currentRound: {
            status: currentRound.status,
            response: currentRound.data?.response || currentRound.data,
          },
          teams: {
            status: teams.status,
            count: Array.isArray(teams.data?.response) ? teams.data.response.length : null,
            sample: Array.isArray(teams.data?.response) ? teams.data.response.slice(0, 8) : teams.data,
          },
          standings: {
            status: standings.status,
            groups: Array.isArray(standings.data?.response?.[0]?.league?.standings) ? standings.data.response[0].league.standings.length : null,
            sampleGroup: Array.isArray(standings.data?.response?.[0]?.league?.standings) ? standings.data.response[0].league.standings[0] : standings.data,
          },
          players: {
            status: players.status,
            countPage1: Array.isArray(players.data?.response) ? players.data.response.length : null,
            paging: players.data?.paging || null,
            sample: Array.isArray(players.data?.response) ? players.data.response.slice(0, 5) : players.data,
          },
          topScorers: {
            status: topScorers.status,
            count: Array.isArray(topScorers.data?.response) ? topScorers.data.response.length : null,
            sample: Array.isArray(topScorers.data?.response) ? topScorers.data.response.slice(0, 8) : topScorers.data,
          },
          topAssists: {
            status: topAssists.status,
            count: Array.isArray(topAssists.data?.response) ? topAssists.data.response.length : null,
            sample: Array.isArray(topAssists.data?.response) ? topAssists.data.response.slice(0, 8) : topAssists.data,
          },
          topYellowCards: {
            status: topYellowCards.status,
            count: Array.isArray(topYellowCards.data?.response) ? topYellowCards.data.response.length : null,
            sample: Array.isArray(topYellowCards.data?.response) ? topYellowCards.data.response.slice(0, 8) : topYellowCards.data,
          },
          topRedCards: {
            status: topRedCards.status,
            count: Array.isArray(topRedCards.data?.response) ? topRedCards.data.response.length : null,
            sample: Array.isArray(topRedCards.data?.response) ? topRedCards.data.response.slice(0, 8) : topRedCards.data,
          },
          injuries: {
            status: injuries.status,
            count: Array.isArray(injuries.data?.response) ? injuries.data.response.length : null,
            sample: Array.isArray(injuries.data?.response) ? injuries.data.response.slice(0, 8) : injuries.data,
          },
        }), "");

        lines.push("## API-Football: Fixture Discovery", "");
        lines.push(jsonBlock({
          searchedDate: date,
          selectedFixtureId: fixtureId,
          selectedFixture: summarizeApiFootballFixture(fixture),
          searches: fixtureResults,
        }), "");

        if (fixtureId) {
          const [events, lineups, players, topScorers] = await Promise.all([
            apiFootballGet(`/fixtures/events?fixture=${fixtureId}`),
            apiFootballGet(`/fixtures/lineups?fixture=${fixtureId}`),
            apiFootballGet(`/fixtures/players?fixture=${fixtureId}`),
            apiFootballGet("/players/topscorers?league=1&season=2026"),
          ]);

          lines.push("## API-Football: Events", "");
          lines.push(jsonBlock({
            status: events.status,
            count: Array.isArray(events.data?.response) ? events.data.response.length : null,
            sample: Array.isArray(events.data?.response) ? events.data.response.slice(0, 8) : events.data,
          }), "");

          lines.push("## API-Football: Lineups", "");
          lines.push(jsonBlock({
            status: lineups.status,
            count: Array.isArray(lineups.data?.response) ? lineups.data.response.length : null,
            sample: Array.isArray(lineups.data?.response) ? lineups.data.response.slice(0, 2) : lineups.data,
          }), "");

          lines.push("## API-Football: Player Match Stats", "");
          lines.push(jsonBlock({
            status: players.status,
            count: Array.isArray(players.data?.response) ? players.data.response.length : null,
            sample: Array.isArray(players.data?.response) ? players.data.response.slice(0, 2) : players.data,
          }), "");

          lines.push("## API-Football: Top Scorers", "");
          lines.push(jsonBlock({
            status: topScorers.status,
            count: Array.isArray(topScorers.data?.response) ? topScorers.data.response.length : null,
            sample: Array.isArray(topScorers.data?.response) ? topScorers.data.response.slice(0, 10) : topScorers.data,
          }), "");
        }
      } else if (!API_FOOTBALL_KEY) {
        lines.push("## API-Football", "", "Missing `API_FOOTBALL_KEY`. Skipping API-Football checks.", "");
      }
    }
  }

  await fs.writeFile(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
  console.log(`Wrote ${REPORT_PATH}`);
}

main().catch(async error => {
  const message = error?.stack || error?.message || String(error);
  await fs.writeFile(REPORT_PATH, `# Football API Audit\n\nFailed:\n\n\`\`\`\n${message}\n\`\`\`\n`, "utf8");
  console.error(message);
  process.exitCode = 1;
});
