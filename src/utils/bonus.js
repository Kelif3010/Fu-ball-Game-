import { PARTICIPANTS } from "../shared.js";
import { buildGroupData, compareStandingRows, matchSortAsc, ownerOf } from "./standings.js";

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

const WORLD_CHAMPION_BONUS = 3;

function teamLabel(team) {
  return team || "Team";
}

function winnerOf(match) {
  const hg = Number(match?.homeGoals);
  const ag = Number(match?.awayGoals);
  if (!Number.isFinite(hg) || !Number.isFinite(ag)) return "";
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

  const groupData = buildGroupData(live, played, upcoming);
  const thirds = groupData
    .filter(group => group.standings.length >= 3)
    .map(group => ({ group: group.group, ...group.standings[2] }))
    .sort((a, b) => b.pts - a.pts || b.td - a.td || b.gf - a.gf || a.team.localeCompare(b.team));
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
      });
    });
  });

  const koByTeam = {};
  (Array.isArray(knockout) ? [...knockout].sort(matchSortAsc) : []).forEach(match => {
    const stagePoints = KNOCKOUT_BONUS[match.stage] || 0;
    if (!stagePoints) return;
    [match.homeTeam, match.awayTeam].filter(Boolean).forEach(team => {
      koByTeam[team] = Math.max(koByTeam[team] || 0, stagePoints);
    });
  });

  Object.entries(koByTeam).forEach(([team, points]) => {
    const owner = ownerOf(team);
    if (!owner || !rowsByPerson[owner]) return;
    rowsByPerson[owner].knockoutBonus += points;
    rowsByPerson[owner].bonusDetails.push({
      type: "knockout",
      team,
      points,
      label: `${teamLabel(team)} erreicht K.o.-Runde`,
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
      };
    })
    .sort((a, b) => b.totalPts - a.totalPts || b.normalPts - a.normalPts || compareStandingRows(a, b));
}

export const bonusRules = {
  group: GROUP_BONUS,
  knockout: KNOCKOUT_BONUS,
  champion: WORLD_CHAMPION_BONUS,
};
