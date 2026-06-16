export function formatDate(dateStr) {
  if (!dateStr) return "Datum offen";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
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
