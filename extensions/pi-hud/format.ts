import os from "node:os";
import path from "node:path";

export const clampPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
};

export const formatCompactNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${Math.round(n)}`;
};

export const formatContextWindow = (tokens?: number) => {
  if (!tokens || !Number.isFinite(tokens)) return "?";
  if (tokens >= 1_000_000) {
    const value = tokens / 1_000_000;
    return Number.isInteger(value) ? `${value}M` : `${value.toFixed(1)}M`;
  }
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}k`;
  return `${tokens}`;
};

export const getProjectLabel = (cwd: string, gitBranch: string | null, home = os.homedir()) => {
  const normalizedCwd = cwd || ".";
  const displayPath = normalizedCwd === home
    ? "~"
    : normalizedCwd.startsWith(`${home}${path.sep}`)
      ? `~${path.sep}${path.relative(home, normalizedCwd)}`
      : normalizedCwd;
  return gitBranch ? `${displayPath} (${gitBranch})` : displayPath;
};

export const formatResetCountdown = (epochMs: number | null, nowMs = Date.now()) => {
  if (!epochMs) return null;
  const diffMs = epochMs - nowMs;
  if (diffMs <= 0) return "now";
  const totalMinutes = Math.ceil(diffMs / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
};

export const normalizeZaiLimitLabel = (minutes: number | null, fallback: string) => {
  if (!minutes || !Number.isFinite(minutes)) return fallback;
  if (minutes === 300) return "5h";
  if (minutes === 60) return "1h";
  if (minutes === 24 * 60) return "1d";
  if (minutes === 7 * 24 * 60) return "7d";
  if (minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}d`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return fallback;
};

export const normalizeResetAt = (value: number | null | undefined) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return value > 10_000_000_000 ? value : value * 1000;
};
