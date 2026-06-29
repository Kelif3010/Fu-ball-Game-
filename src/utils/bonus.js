import { PARTICIPANTS, FIFA_RANKS } from "../shared.js";
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

const KNOCKOUT_STAGE_ORDER = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"];
const KNOCKOUT_STAGE_LABELS = {
  LAST_32: "Sechzehntelfinale erreicht",
  LAST_16: "Achtelfinale erreicht",
  QUARTER_FINALS: "Viertelfinale erreicht",
  SEMI_FINALS: "Halbfinale erreicht",
  FINAL: "Finale erreicht",
};

const WORLD_CHAMPION_BONUS = 3;

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
