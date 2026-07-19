import { PARTICIPANTS, FIFA_RANKS } from "../shared.js";
import { buildGroupData, buildTeamStats, compareStandingRows, matchSortAsc, ownerOf } from "./standings.js";

const GROUP_BONUS = {
  winner: 3,
  runnerUp: 2,
  bestThird: 1,
};

const KNOCKOUT_BONUS = {
  LAST_32: 1,
  LAST_16: 2,
  QUARTER_FINALS: 3,
  SEMI_FINALS: 4,
  FINAL: 5,
};

const KNOCKOUT_STAGE_ORDER = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
const KNOCKOUT_STAGE_LABELS = {
  LAST_32: "Sechzehntelfinale erreicht",
  LAST_16: "Achtelfinale erreicht",
  QUARTER_FINALS: "Viertelfinale erreicht",
  SEMI_FINALS: "Halbfinale erreicht",
  FINAL: "Finale erreicht",
};

const WORLD_CHAMPION_BONUS = 3;

const BONUS_TYPE_ORDER = {
  group: 0,
  knockout: 10,
  champion: 20,
};

const GROUP_LABEL_ORDER = {
  winner: 0,
  runnerUp: 1,
  bestThird: 2,
};

function groupBonusOrder(index, isBestThird) {
  if (index === 0) return GROUP_LABEL_ORDER.winner;
  if (index === 1) return GROUP_LABEL_ORDER.runnerUp;
  if (isBestThird) return GROUP_LABEL_ORDER.bestThird;
  return 99;
}

function detailSortKey(detail) {
  const typeOrder = BONUS_TYPE_ORDER[detail.type] ?? 99;
  const stageOrder = detail.stage ? KNOCKOUT_STAGE_ORDER.indexOf(detail.stage) : -1;
  return [
    typeOrder,
    detail.groupOrder ?? (stageOrder >= 0 ? stageOrder : 99),
    detail.group || "",
    detail.team || "",
  ].join("|");
}

function teamLabel(team) {
  return team || "Team";
}

function scoreNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function winnerOf(match) {
  if (match?.winner === "HOME_TEAM") return match.homeTeam || "";
  if (match?.winner === "AWAY_TEAM") return match.awayTeam || "";
  const hg = scoreNumber(match?.homeGoals);
  const ag = scoreNumber(match?.awayGoals);
  if (hg === null || ag === null) return "";
  if (hg > ag) return match.homeTeam || "";
  if (ag > hg) return match.awayTeam || "";
  return "";
}

function makeEmptyRow(person, baseRow) {
  return {
    ...baseRow,
    person,
    normalPts: baseRow?.pts || 0,
    groupBonus: 0,
    knockoutBonus: 0,
    championBonus: 0,
    bonusTotal: 0,
    totalPts: baseRow?.pts || 0,
    bonusDetails: [],
  };
}

export function buildBonusRows({ standings, live, played, upcoming, knockout }) {
  const rowsByPerson = Object.fromEntries(
    Object.keys(PARTICIPANTS).map(person => [
      person,
      makeEmptyRow(person, standings.find(row => row.person === person) || { person, teams: PARTICIPANTS[person] || [], pts: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, td: 0 }),
    ])
  );

  // Tordifferenz "Mit Bonus" zählt zusätzlich die K.o.-Phase (90 bzw. 120 Min.
  // bei Verlängerung), aber kein Elfmeterschießen — homeGoals/awayGoals der
  // API bilden bereits nur den Spielstand nach regulärer Zeit/Verlängerung ab.
  const knockoutTeamStats = buildTeamStats(Array.isArray(knockout) ? knockout : []);
  Object.entries(PARTICIPANTS).forEach(([person, teams]) => {
    const row = rowsByPerson[person];
    if (!row) return;
    const koGf = teams.reduce((sum, team) => sum + (knockoutTeamStats[team]?.gf || 0), 0);
    const koGa = teams.reduce((sum, team) => sum + (knockoutTeamStats[team]?.ga || 0), 0);
    row.gf = (row.gf || 0) + koGf;
    row.ga = (row.ga || 0) + koGa;
    row.td = row.gf - row.ga;
  });

  const groupData = buildGroupData(live, played, upcoming);
  const thirds = groupData
    .filter(group => group.standings.length >= 3)
    .map(group => ({ group: group.group, ...group.standings[2] }))
    .sort((a, b) => b.pts - a.pts || b.td - a.td || b.gf - a.gf || (FIFA_RANKS[a.team] || 999) - (FIFA_RANKS[b.team] || 999));
  const bestThirdTeams = new Set(thirds.slice(0, 8).map(row => row.team));

  groupData.forEach(group => {
    group.standings.forEach((teamRow, index) => {
      const owner = ownerOf(teamRow.team);
      if (!owner || !rowsByPerson[owner]) return;
      let points = 0;
      let label = "";
      if (index === 0) {
        points = GROUP_BONUS.winner;
        label = `Gruppensieger Gruppe ${group.group}`;
      } else if (index === 1) {
        points = GROUP_BONUS.runnerUp;
        label = `Gruppenzweiter Gruppe ${group.group}`;
      } else if (index === 2 && bestThirdTeams.has(teamRow.team)) {
        points = GROUP_BONUS.bestThird;
        label = `Bester Gruppendritter Gruppe ${group.group}`;
      }
      if (!points) return;
      rowsByPerson[owner].groupBonus += points;
      rowsByPerson[owner].bonusDetails.push({
        type: "group",
        team: teamRow.team,
        points,
        label,
        group: group.group,
        groupOrder: groupBonusOrder(index, bestThirdTeams.has(teamRow.team)),
      });
    });
  });

  const koStagesByTeam = {};
  (Array.isArray(knockout) ? [...knockout].sort(matchSortAsc) : []).forEach(match => {
    const stagePoints = KNOCKOUT_BONUS[match.stage] || 0;
    if (!stagePoints) return;
    [match.homeTeam, match.awayTeam].filter(Boolean).forEach(team => {
      koStagesByTeam[team] ||= new Set();
      koStagesByTeam[team].add(match.stage);
    });
  });

  Object.entries(koStagesByTeam).forEach(([team, stages]) => {
    const owner = ownerOf(team);
    if (!owner || !rowsByPerson[owner]) return;
    KNOCKOUT_STAGE_ORDER
      .filter(stage => stages.has(stage))
      .forEach(stage => {
        const points = KNOCKOUT_BONUS[stage] || 0;
        rowsByPerson[owner].knockoutBonus += points;
        rowsByPerson[owner].bonusDetails.push({
          type: "knockout",
          team,
          points,
          label: `${teamLabel(team)}: ${KNOCKOUT_STAGE_LABELS[stage] || "K.o.-Runde erreicht"}`,
          stage,
          groupOrder: KNOCKOUT_STAGE_ORDER.indexOf(stage),
        });
      });
  });

  const finalMatch = (Array.isArray(knockout) ? knockout : []).find(match => match.stage === "FINAL");
  const champion = winnerOf(finalMatch);
  if (champion) {
    const owner = ownerOf(champion);
    if (owner && rowsByPerson[owner]) {
      rowsByPerson[owner].championBonus += WORLD_CHAMPION_BONUS;
      rowsByPerson[owner].bonusDetails.push({
        type: "champion",
        team: champion,
        points: WORLD_CHAMPION_BONUS,
        label: "Weltmeister",
        groupOrder: 0,
      });
    }
  }

  return Object.values(rowsByPerson)
    .map(row => {
      const bonusTotal = row.groupBonus + row.knockoutBonus + row.championBonus;
      return {
        ...row,
        bonusTotal,
        totalPts: row.normalPts + bonusTotal,
        pts: row.normalPts + bonusTotal,
        bonusDetails: [...row.bonusDetails].sort((a, b) => detailSortKey(a).localeCompare(detailSortKey(b))),
      };
    })
    .sort((a, b) => b.totalPts - a.totalPts || compareStandingRows(a, b));
}

export const bonusRules = {
  group: GROUP_BONUS,
  knockout: KNOCKOUT_BONUS,
  champion: WORLD_CHAMPION_BONUS,
};

// WC 2026 knockout bracket from Round of 16 onwards.
// Strings = known teams already in that match.
// Arrays  = possible teams (one will advance from the preceding AF match).
const WC2026_BRACKET = {
  stage: "FINAL",
  home: {
    stage: "SEMI_FINALS",
    home: { stage: "QUARTER_FINALS", home: "France", away: "Morocco" },
    away: { stage: "QUARTER_FINALS", home: ["Portugal", "Spain"], away: ["USA", "Belgium"] },
  },
  away: {
    stage: "SEMI_FINALS",
    home: { stage: "QUARTER_FINALS", home: ["Argentina", "Egypt"], away: ["Switzerland", "Colombia"] },
    away: { stage: "QUARTER_FINALS", home: ["Brazil", "Norway"], away: ["Mexico", "England"] },
  },
};

function bracketTeams(node) {
  if (typeof node === "string") return [node];
  if (Array.isArray(node)) return node;
  return [...bracketTeams(node.home), ...bracketTeams(node.away)];
}

// Recursively computes the max additional bonus a participant can still earn.
// activeTeams: Set of teams still in upcoming/live matches (not eliminated).
// earnedStages: map of team → Set of KO stage strings already in bonus.
function maxBonusFromBracket(node, person, activeTeams, earnedStages) {
  if (typeof node === "string") {
    if (ownerOf(node) !== person || !activeTeams.has(node)) return { bonus: 0, canWin: false, teamHighest: -1 };
    const earned = earnedStages[node] || new Set();
    const teamHighest = KNOCKOUT_STAGE_ORDER.reduce((max, s, i) => earned.has(s) ? i : max, -1);
    return { bonus: 0, canWin: true, teamHighest };
  }

  if (Array.isArray(node)) {
    const personActive = node.filter(t => ownerOf(t) === person && activeTeams.has(t));
    if (!personActive.length) return { bonus: 0, canWin: false, teamHighest: -1 };
    const team = personActive[0];
    const earned = earnedStages[team] || new Set();
    const teamHighest = KNOCKOUT_STAGE_ORDER.reduce((max, s, i) => earned.has(s) ? i : max, -1);
    return { bonus: 0, canWin: true, teamHighest };
  }

  const { stage, home, away } = node;
  const stageBonus = KNOCKOUT_BONUS[stage] || 0;
  const stageIdx = KNOCKOUT_STAGE_ORDER.indexOf(stage);

  const homeRes = maxBonusFromBracket(home, person, activeTeams, earnedStages);
  const awayRes = maxBonusFromBracket(away, person, activeTeams, earnedStages);

  let bonus = homeRes.bonus + awayRes.bonus;
  if (homeRes.canWin && homeRes.teamHighest < stageIdx) bonus += stageBonus;
  if (awayRes.canWin && awayRes.teamHighest < stageIdx) bonus += stageBonus;

  return { bonus, canWin: homeRes.canWin || awayRes.canWin, teamHighest: stageIdx };
}

export function buildMaxPossibleRows(standings, live, upcoming, bonusRows = []) {
  const activeTeams = new Set();
  [...(live || []), ...(upcoming || [])].forEach(m => {
    if (m.homeTeam) activeTeams.add(m.homeTeam);
    if (m.awayTeam) activeTeams.add(m.awayTeam);
  });

  const allBracketTeams = new Set(bracketTeams(WC2026_BRACKET));
  const bonusByPerson = Object.fromEntries((Array.isArray(bonusRows) ? bonusRows : []).map(r => [r.person, r]));

  const rows = standings.map(row => {
    const bonusRow = bonusByPerson[row.person];
    const bonusTotal = bonusRow?.bonusTotal || 0;
    const currentPointsWithBonus = row.pts + bonusTotal;

    const earnedStages = {};
    (bonusRow?.bonusDetails || []).filter(d => d.type === "knockout" && d.stage).forEach(d => {
      earnedStages[d.team] = earnedStages[d.team] || new Set();
      earnedStages[d.team].add(d.stage);
    });

    const result = maxBonusFromBracket(WC2026_BRACKET, row.person, activeTeams, earnedStages);
    const maxFutureBonus = result.bonus + (result.canWin ? WORLD_CHAMPION_BONUS : 0);

    const activeCount = (PARTICIPANTS[row.person] || []).filter(t => allBracketTeams.has(t) && activeTeams.has(t)).length;

    return {
      ...row,
      openCount: activeCount,
      bonusTotal,
      openWinPoints: maxFutureBonus,
      currentPointsWithBonus,
      maxPossiblePoints: currentPointsWithBonus + maxFutureBonus,
    };
  });

  // Sortierung nach maximal möglichen Punkten, bei Gleichstand nach aktuellem
  // Punktestand inkl. Bonus.
  rows.sort((a, b) =>
    b.maxPossiblePoints - a.maxPossiblePoints ||
    b.currentPointsWithBonus - a.currentPointsWithBonus
  );

  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}
