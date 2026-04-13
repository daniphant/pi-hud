import { DEFAULT_METER_WIDTH } from "./constants.js";
import { clampPercent, formatResetCountdown } from "./format.js";
import type { ProviderQuotaSnapshot, ThemeLike } from "./types.js";

export const getMeterColor = (remainingPercent: number | null) => {
  const value = remainingPercent ?? 0;
  if (value <= 15) return "error";
  if (value <= 35) return "warning";
  return "success";
};

export const buildBar = (
  theme: ThemeLike,
  percent: number | null | undefined,
  width = DEFAULT_METER_WIDTH,
  options?: { invert?: boolean; color?: string },
) => {
  const safePercent = clampPercent(percent) ?? 0;
  const displayed = options?.invert ? 100 - safePercent : safePercent;
  const filled = Math.round((displayed / 100) * width);
  const empty = Math.max(0, width - filled);
  const text = `${"█".repeat(filled)}${"░".repeat(empty)}`;
  return theme.fg(options?.color || getMeterColor(displayed), text);
};

export const renderQuotaWindow = (theme: ThemeLike, usedPercent: number | null, resetAt: number | null, width = DEFAULT_METER_WIDTH) => {
  const used = clampPercent(usedPercent);
  const bar = buildBar(theme, used, width, { color: "accent" });
  const percentText = used === null ? theme.fg("muted", "--%") : theme.fg("accent", `${Math.round(used)}%`);
  const reset = formatResetCountdown(resetAt);
  const resetText = reset ? theme.fg("dim", `(resets in ${reset})`) : theme.fg("dim", "(reset unknown)");
  return `${bar} ${percentText} ${resetText}`;
};

export const renderQuotaBlock = (
  theme: ThemeLike,
  snapshot: ProviderQuotaSnapshot,
  showWeeklyLimits: boolean,
  quotaError: string | null,
  quotaProviderKey: string | null,
  width = DEFAULT_METER_WIDTH,
) => {
  if (snapshot?.kind === "codex") {
    const usage = `${theme.fg("muted", "Usage")} ${renderQuotaWindow(theme, snapshot.sessionUsedPercent, snapshot.sessionResetAt, width)}`;
    const weekly = showWeeklyLimits && snapshot.weeklyUsedPercent !== null
      ? renderQuotaWindow(theme, snapshot.weeklyUsedPercent, snapshot.weeklyResetAt, width)
      : null;
    return weekly ? `${usage}${theme.fg("dim", " | ")}${weekly}` : usage;
  }

  if (snapshot?.kind === "zai") {
    const usage = snapshot.primary
      ? `${theme.fg("muted", "Usage")} ${renderQuotaWindow(theme, snapshot.primary.usedPercent, snapshot.primary.resetAt, width)}`
      : null;
    const weekly = showWeeklyLimits && snapshot.secondary
      ? renderQuotaWindow(theme, snapshot.secondary.usedPercent, snapshot.secondary.resetAt, width)
      : null;
    if (!usage && !weekly) return null;
    return [usage, weekly].filter(Boolean).join(theme.fg("dim", " | "));
  }

  if (quotaError && quotaProviderKey) return theme.fg("warning", "Usage unavailable");
  return null;
};
