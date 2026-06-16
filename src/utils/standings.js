import { PARTICIPANTS, displayTeamName } from '../shared.js';

const ALL_TEAMS = new Set(Object.values(PARTICIPANTS).flat());

export const ownerOf = team => Object.entries(PARTICIPANTS).find(([, teams]) => teams.includes(team))?.[0] || "";

export function matchSortAsc(a, b) {
  return `${a.date || "9999-99-99"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-99-99"} ${b.time || "99:99"}`);
}

export function matchSortDesc(a, b) {
  return `${b.date || "0000-00-00"} ${b.time || "00:00"}`.localeCompare(`${a.date || "0000-00-00"} ${a.time || "00:00"}`);
}

export function buildTeamStats(matches) {
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

export function buildStandings(teamStats) {
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

export function compareStandingRows(a, b) {
  return b.pts - a.pts || b.td - a.td || b.gf - a.gf || a.person.localeCompare(b.person);
}

export function rankMap(standings) {
  return standings.reduce((acc, row, index) => {
    acc[row.person] = { rank: index + 1, row };
    return acc;
  }, {});
}

export function buildHeadToHeadStats(playedMatches) {
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

export function buildPointsTimeline(played) {
  const sorted = [...played].sort(matchSortAsc);
  const dateSet = [];
  const seen = new Set();
  for (const m of sorted) { if (m.date && !seen.has(m.date)) { seen.add(m.date); dateSet.push(m.date); } }

  const persons = Object.keys(PARTICIPANTS);
  const running = Object.fromEntries(persons.map(p => [p, 0]));
  const series = Object.fromEntries(persons.map(p => [p, []]));

  for (const date of dateSet) {
    const dayMatches = sorted.filter(m => m.date === date);
    for (const match of dayMatches) {
      const hOwner = ownerOf(match.homeTeam);
      const aOwner = ownerOf(match.awayTeam);
      const hg = Number(match.homeGoals);
      const ag = Number(match.awayGoals);
      if (!Number.isFinite(hg) || !Number.isFinite(ag)) continue;
      if (hg > ag) { if (hOwner) running[hOwner] += 3; }
      else if (ag > hg) { if (aOwner) running[aOwner] += 3; }
      else { if (hOwner) running[hOwner]++; if (aOwner) running[aOwner]++; }
    }
    persons.forEach(p => series[p].push(running[p]));
  }
  return { dates: dateSet, series };
}

export function getLastResultsForPerson(person, played, limit = 5) {
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

export function buildFormComparisonRows(standings, played) {
  return standings.map((row, index) => ({
    ...row,
    rank: index + 1,
    results: getLastResultsForPerson(row.person, played),
  }));
}

export function buildFormCurveRows(selectedPerson, standings, analysis) {
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

export function buildOpenMatchMap(live, upcoming) {
  const map = Object.fromEntries(Object.keys(PARTICIPANTS).map(person => [person, []]));
  [...live, ...upcoming].forEach(match => {
    const homeOwner = ownerOf(match.homeTeam);
    const awayOwner = ownerOf(match.awayTeam);
    if (homeOwner && map[homeOwner]) map[homeOwner].push(match);
    if (awayOwner && awayOwner !== homeOwner && map[awayOwner]) map[awayOwner].push(match);
  });
  return map;
}

export function buildMaxPossibleRows(standings, live, upcoming) {
  const openMap = buildOpenMatchMap(live, upcoming);
  return standings.map((row, index) => {
    const openCount = openMap[row.person]?.length || 0;
    return {
      ...row,
      rank: index + 1,
      openCount,
      maxPossiblePoints: row.pts + (openCount * 3),
    };
  });
}

function beatsOnTieBreak(a, b) {
  return a.td > b.td || (a.td === b.td && a.gf > b.gf);
}

function buildCatchupRequirement(source, target) {
  const pointsToTie = Math.max(0, target.pts - source.pts);
  const pointsToPass = pointsToTie + 1;
  const tdNeededAtTie = Math.max(0, target.td - source.td + 1);
  const gfNeededAtTie = Math.max(0, target.gf - source.gf + 1);
  return {
    pointsNeeded: pointsToTie,
    pointsToTie,
    pointsToPass,
    tdNeededAtTie,
    gfNeededAtTie,
  };
}

export function buildMyAnalysis(person, standings, liveProjectionStandings, live, upcoming) {
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
    .filter(item => item.pts + 3 > row.pts || (item.pts + 3 === row.pts && beatsOnTieBreak(item, row)))
    .map(item => ({
      ...item,
      ...buildCatchupRequirement(item, row),
    }))
    .sort((a, b) => a.pointsToTie - b.pointsToTie || a.tdNeededAtTie - b.tdNeededAtTie || a.rank - b.rank)
    .slice(0, 1)
    .map(item => ({
      ...item,
    }));

  const reachable = standings
    .filter(item => item.person !== person && (standingsByPerson[item.person]?.rank || 999) < (standingsByPerson[person]?.rank || 999))
    .map(item => ({
      ...item,
      rank: standingsByPerson[item.person]?.rank || 999,
      open: openMatchMap[item.person]?.length || 0,
      ...buildCatchupRequirement(row, item),
    }))
    .filter(item => row.pts + 3 > item.pts || (row.pts + 3 === item.pts && beatsOnTieBreak(row, item)))
    .sort((a, b) => a.pointsToTie - b.pointsToTie || a.tdNeededAtTie - b.tdNeededAtTie || a.rank - b.rank)
    .slice(0, 1);

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

export function getPersonMatches(person, live, upcoming) {
  return [...live, ...upcoming]
    .filter(match => ownerOf(match.homeTeam) === person || ownerOf(match.awayTeam) === person)
    .sort(matchSortAsc);
}

export function getMatchTitle(match) {
  if (!match) return "";
  return `${displayTeamName(match.homeTeam)} vs ${displayTeamName(match.awayTeam)}`;
}

export function buildGroupData(live, played, upcoming) {
  const allMatches = [...played, ...live, ...upcoming];
  const groups = {};
  for (const m of allMatches) {
    if (!m.group) continue;
    if (!groups[m.group]) groups[m.group] = { group: m.group, teams: new Set(), matches: [] };
    groups[m.group].teams.add(m.homeTeam);
    groups[m.group].teams.add(m.awayTeam);
    groups[m.group].matches.push(m);
  }
  const finishedMatches = [...played, ...live.filter(m => Number.isFinite(Number(m.homeGoals)))];
  const allTeamStats = buildTeamStats(finishedMatches);
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([groupLetter, data]) => {
      const teams = [...data.teams];
      const standings = teams
        .map(team => ({ team, ...(allTeamStats[team] || { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, pts: 0 }), td: (allTeamStats[team]?.gf || 0) - (allTeamStats[team]?.ga || 0) }))
        .sort((a, b) => b.pts - a.pts || b.td - a.td || b.gf - a.gf || a.team.localeCompare(b.team));
      const sortedMatches = [...data.matches].sort((a, b) => `${a.date || "9999"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999"} ${b.time || "99:99"}`));
      return { group: groupLetter, standings, matches: sortedMatches };
    });
}
