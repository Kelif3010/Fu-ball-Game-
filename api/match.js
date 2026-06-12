function normalizePlayer(player) {
  if (!player || typeof player !== "object") return null;
  return {
    id: player.id ?? null,
    name: player.name || player.shortName || "Unbekannt",
    position: player.position || "",
    shirtNumber: player.shirtNumber ?? player.number ?? null,
    nationality: player.nationality || "",
  };
}

function normalizeCoach(coach) {
  if (!coach || typeof coach !== "object") return null;
  return {
    id: coach.id ?? null,
    name: coach.name || "",
    nationality: coach.nationality || "",
  };
}

function normalizeTeam(team) {
  const lineup = Array.isArray(team?.lineup) ? team.lineup.map(normalizePlayer).filter(Boolean) : [];
  const bench = Array.isArray(team?.bench) ? team.bench.map(normalizePlayer).filter(Boolean) : [];

  return {
    id: team?.id ?? null,
    name: team?.name || team?.shortName || team?.tla || "Team",
    shortName: team?.shortName || "",
    tla: team?.tla || "",
    crest: team?.crest || "",
    formation: team?.formation || "",
    coach: normalizeCoach(team?.coach),
    lineup,
    bench,
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
      homeTeam: normalizeTeam(data?.homeTeam),
      awayTeam: normalizeTeam(data?.awayTeam),
    };

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=180");
    return res.status(200).json({
      source: "football-data.org",
      match,
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unbekannter Serverfehler beim Laden der Match-Details." });
  }
}
