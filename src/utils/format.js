function relativeDayLabel(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfDate - startOfToday) / 86400000);

  const futureLabels = {
    1: "Morgen",
    2: "in zwei Tagen",
    3: "in drei Tagen",
    4: "in vier Tagen",
    5: "in fünf Tagen",
    6: "in sechs Tagen",
  };

  if (diffDays === -1) return "Gestern";
  if (diffDays === 0) return "Heute";
  return futureLabels[diffDays] || "";
}

export function formatDate(dateStr, options = {}) {
  if (!dateStr) return "Datum offen";
  const label = relativeDayLabel(dateStr);
  const date = new Date(`${dateStr}T12:00:00`);
  const dateText = date.toLocaleDateString("de-DE", options.compact
    ? { day: "2-digit", month: "2-digit" }
    : { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
  return label ? `${label} · ${dateText}` : dateText;
}

export function formatCountdown(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function statusLabel(status) {
  if (status === "IN_PLAY" || status === "LIVE") return "Live";
  if (status === "PAUSED") return "Halbzeit";
  if (status === "FINISHED") return "Abpfiff";
  if (status === "TIMED") return "Geplant";
  return status || "Geplant";
}

export const rankLabel = index => index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;

export const tdColor = value => value > 0 ? "#34d399" : value < 0 ? "#f87171" : "#94a3b8";

export const movementColor = delta => delta > 0 ? "#34d399" : delta < 0 ? "#f87171" : "#94a3b8";

export const pointsMovementText = delta => delta === 0 ? "±0" : delta > 0 ? `+${delta}` : `${delta}`;

export function rankMovementText(delta, currentRank) {
  if (delta === 0) return `Bleibt #${currentRank}`;
  return delta > 0 ? `↗ +${delta} Plätze` : `↘ ${Math.abs(delta)} Plätze`;
}
