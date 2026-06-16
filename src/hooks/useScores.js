import { useCallback, useEffect, useState } from "react";

const CACHE_PREFIX = "wm-liga-match-center:";
const MATCH_CENTER_CACHE_MS = 5 * 60 * 1000;
const DEFAULT_REFRESH_SECONDS = 300;

function loadCachedMatchCenter(matchId) {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${matchId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > MATCH_CENTER_CACHE_MS) return null;
    return parsed.data;
  } catch { return null; }
}

function saveCachedMatchCenter(matchId, data) {
  try { window.localStorage.setItem(`${CACHE_PREFIX}${matchId}`, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* ignore */ }
}

export function useScores() {
  const [live, setLive] = useState([]);
  const [played, setPlayed] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState(null);
  const [refreshSeconds, setRefreshSeconds] = useState(DEFAULT_REFRESH_SECONDS);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_REFRESH_SECONDS);
  const [expandedMatchId, setExpandedMatchId] = useState(null);
  const [matchCenters, setMatchCenters] = useState({});
  const [matchCenterLoading, setMatchCenterLoading] = useState({});
  const [matchCenterErrors, setMatchCenterErrors] = useState({});
  const [cachedMatchCenters, setCachedMatchCenters] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/scores");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Daten konnten nicht geladen werden.");
      const apiRefreshSeconds = Number(data?.refreshSeconds) || DEFAULT_REFRESH_SECONDS;
      setLive(Array.isArray(data.live) ? data.live : []);
      setPlayed(Array.isArray(data.played) ? data.played : []);
      setUpcoming(Array.isArray(data.upcoming) ? data.upcoming : []);
      setRefreshSeconds(apiRefreshSeconds);
      setSecondsLeft(apiRefreshSeconds);
      setUpdated(new Date());
    } catch (e) {
      setError(e.message || "Unbekannter Fehler");
    } finally {
      setLoading(false);
    }
  }, []);

  const openMatchCenter = useCallback(async (match) => {
    const matchId = match?.id;
    if (!matchId) {
      setMatchCenterErrors(prev => ({ ...prev, unknown: "Für dieses Spiel fehlt die Match-ID." }));
      return;
    }
    if (expandedMatchId === matchId) {
      setExpandedMatchId(null);
      return;
    }
    setExpandedMatchId(matchId);

    const cached = loadCachedMatchCenter(matchId);
    if (cached) {
      setMatchCenters(prev => ({ ...prev, [matchId]: cached }));
      setCachedMatchCenters(prev => ({ ...prev, [matchId]: true }));
      return;
    }
    if (matchCenters[matchId] || matchCenterLoading[matchId]) return;

    setMatchCenterLoading(prev => ({ ...prev, [matchId]: true }));
    setMatchCenterErrors(prev => ({ ...prev, [matchId]: "" }));
    try {
      const res = await fetch(`/api/match?id=${encodeURIComponent(matchId)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Match-Center konnte nicht geladen werden.");
      setMatchCenters(prev => ({ ...prev, [matchId]: data.match }));
      setCachedMatchCenters(prev => ({ ...prev, [matchId]: false }));
      saveCachedMatchCenter(matchId, data.match);
    } catch (e) {
      setMatchCenterErrors(prev => ({ ...prev, [matchId]: e.message || "Match-Center konnte nicht geladen werden." }));
    } finally {
      setMatchCenterLoading(prev => ({ ...prev, [matchId]: false }));
    }
  }, [expandedMatchId, matchCenters, matchCenterLoading]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!updated) {
        setSecondsLeft(refreshSeconds);
        return;
      }
      const elapsed = Math.floor((Date.now() - updated.getTime()) / 1000);
      const remaining = Math.max(0, refreshSeconds - (elapsed % refreshSeconds));
      setSecondsLeft(remaining);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [updated, refreshSeconds]);

  useEffect(() => {
    const interval = window.setInterval(load, Math.max(30, refreshSeconds) * 1000);
    return () => window.clearInterval(interval);
  }, [load, refreshSeconds]);

  return {
    live, played, upcoming,
    loading, error, updated,
    refreshSeconds, secondsLeft,
    expandedMatchId,
    matchCenters, matchCenterLoading, matchCenterErrors, cachedMatchCenters,
    load, openMatchCenter,
  };
}
