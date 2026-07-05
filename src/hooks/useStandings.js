import { useMemo } from "react";
import { buildTeamStats, buildStandings, rankMap, buildHeadToHeadStats, buildFormComparisonRows, buildPointsTimeline } from '../utils/standings.js';

export function useStandings({ played, live, upcoming }) {
  const groupPlayed = useMemo(() => played.filter(m => m.stage === "GROUP_STAGE"), [played]);
  const groupLive = useMemo(() => live.filter(m => m.stage === "GROUP_STAGE"), [live]);
  const teamStats = useMemo(() => buildTeamStats(groupPlayed), [groupPlayed]);
  const standings = useMemo(() => buildStandings(teamStats), [teamStats]);
  const officialRanks = useMemo(() => rankMap(standings), [standings]);
  const liveProjectionStats = useMemo(() => buildTeamStats([...groupPlayed, ...groupLive]), [groupPlayed, groupLive]);
  const liveProjectionStandings = useMemo(() => buildStandings(liveProjectionStats), [liveProjectionStats]);
  const leaderChange = live.length > 0 && standings[0]?.person && liveProjectionStandings[0]?.person && standings[0].person !== liveProjectionStandings[0].person
    ? liveProjectionStandings[0].person : "";
  const upcomingByDate = useMemo(() => upcoming.reduce((acc, match) => {
    const key = match.date || "Datum offen";
    acc[key] ||= [];
    acc[key].push(match);
    return acc;
  }, {}), [upcoming]);
  const statsFormRows = useMemo(() => buildFormComparisonRows(standings, played), [standings, played]);
  const h2hStats = useMemo(() => buildHeadToHeadStats(played), [played]);

  return {
    teamStats, standings, officialRanks,
    liveProjectionStandings, leaderChange,
    upcomingByDate, statsFormRows, h2hStats,
  };
}
