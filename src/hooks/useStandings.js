import { useMemo } from "react";
import { buildTeamStats, buildStandings, rankMap, buildHeadToHeadStats, buildFormComparisonRows, buildMaxPossibleRows, buildPointsTimeline } from '../utils/standings.js';

export function useStandings({ played, live, upcoming }) {
  const teamStats = useMemo(() => buildTeamStats(played), [played]);
  const standings = useMemo(() => buildStandings(teamStats), [teamStats]);
  const officialRanks = useMemo(() => rankMap(standings), [standings]);
  const liveProjectionStats = useMemo(() => buildTeamStats([...played, ...live]), [played, live]);
  const liveProjectionStandings = useMemo(() => buildStandings(liveProjectionStats), [liveProjectionStats]);
  const leaderChange = live.length > 0 && standings[0]?.person && liveProjectionStandings[0]?.person && standings[0].person !== liveProjectionStandings[0].person
    ? liveProjectionStandings[0].person : "";
  const upcomingByDate = useMemo(() => upcoming.reduce((acc, match) => {
    const key = match.date || "Datum offen";
    acc[key] ||= [];
    acc[key].push(match);
    return acc;
  }, {}), [upcoming]);
  const statsMaxPossibleRows = useMemo(() => buildMaxPossibleRows(standings, live, upcoming), [standings, live, upcoming]);
  const statsFormRows = useMemo(() => buildFormComparisonRows(standings, played), [standings, played]);
  const h2hStats = useMemo(() => buildHeadToHeadStats(played), [played]);

  return {
    teamStats, standings, officialRanks,
    liveProjectionStandings, leaderChange,
    upcomingByDate, statsMaxPossibleRows, statsFormRows, h2hStats,
  };
}
