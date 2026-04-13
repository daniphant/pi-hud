import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";

import { DEFAULT_METER_WIDTH, QUOTA_TTL_MS } from "./constants.js";
import { formatCompactNumber, getProjectLabel, clampPercent } from "./format.js";
import { getModelLabel } from "./model.js";
import { fetchCodexQuota } from "./providers/codex.js";
import { detectQuotaProvider } from "./providers/detect.js";
import { fetchZaiQuota } from "./providers/zai.js";
import { renderQuotaBlock, buildBar } from "./render.js";
import { getSessionTotals } from "./session.js";
import { loadSettings, saveSettings } from "./settings.js";
import type { CachedQuotaEntry, HudSettings, PiExtensionContext, ProviderKey, ProviderQuotaSnapshot, ThemeLike } from "./types.js";

export default function piHudExtension(pi: ExtensionAPI) {
  let enabled = true;
  let showWeeklyLimits = false;
  let latestCtx: PiExtensionContext | null = null;
  let requestRender: (() => void) | null = null;
  let quotaSnapshot: ProviderQuotaSnapshot = null;
  let quotaError: string | null = null;
  let quotaProviderKey: ProviderKey | null = null;
  let lastQuotaFetchAt = 0;
  let quotaCache: Partial<Record<ProviderKey, CachedQuotaEntry>> = {};
  let quotaFetchPromise: Promise<void> | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;

  const triggerRender = () => requestRender?.();

  const applyLoadedSettings = (settings: HudSettings) => {
    enabled = settings.enabled;
    showWeeklyLimits = settings.showWeeklyLimits;
    quotaCache = settings.quotaCache ?? {};
  };

  const persistSettings = async () => {
    try {
      await saveSettings({ enabled, showWeeklyLimits, quotaCache });
    } catch {
      // Non-fatal.
    }
  };

  const getActiveCtx = () => latestCtx;

  const refreshQuota = async (ctx: ExtensionContext, force = false) => {
    latestCtx = ctx;
    const provider = detectQuotaProvider(ctx.model);

    if (!provider) {
      quotaProviderKey = null;
      quotaSnapshot = null;
      quotaError = null;
      lastQuotaFetchAt = 0;
      triggerRender();
      return;
    }

    if (quotaProviderKey !== provider) {
      quotaProviderKey = provider;
      quotaError = null;
      lastQuotaFetchAt = 0;
      const cached = quotaCache[provider];
      if (cached?.snapshot) {
        quotaSnapshot = cached.snapshot;
        lastQuotaFetchAt = cached.fetchedAt;
      }
      triggerRender();
    }

    const cached = quotaCache[provider];
    if (!quotaSnapshot && cached?.snapshot) {
      quotaSnapshot = cached.snapshot;
      lastQuotaFetchAt = cached.fetchedAt;
      triggerRender();
    }

    const snapshotNeedsRepair = provider === "zai"
      && quotaSnapshot?.kind === "zai"
      && !!quotaSnapshot.primary
      && !quotaSnapshot.primary.resetAt;

    if (!force && !snapshotNeedsRepair && Date.now() - lastQuotaFetchAt < QUOTA_TTL_MS) return;
    if (quotaFetchPromise) return quotaFetchPromise;

    quotaFetchPromise = (async () => {
      try {
        const snapshot = provider === "codex" ? await fetchCodexQuota() : await fetchZaiQuota(ctx);
        quotaSnapshot = snapshot;
        quotaError = null;
        lastQuotaFetchAt = Date.now();
        quotaCache[provider] = { providerKey: provider, fetchedAt: lastQuotaFetchAt, snapshot };
        void persistSettings();
      } catch (error) {
        quotaError = error instanceof Error ? error.message : "Quota unavailable";
        if (!quotaSnapshot && cached?.snapshot) quotaSnapshot = cached.snapshot;
      } finally {
        quotaFetchPromise = null;
        triggerRender();
      }
    })();

    return quotaFetchPromise;
  };

  const ensureTicker = (ctx: ExtensionContext) => {
    if (ticker) return;
    ticker = setInterval(() => {
      triggerRender();
      const activeCtx = getActiveCtx() ?? ctx;
      if (enabled) void refreshQuota(activeCtx);
    }, 30_000);
  };

  const clearTicker = () => {
    if (!ticker) return;
    clearInterval(ticker);
    ticker = null;
  };

  const installFooter = (ctx: ExtensionContext) => {
    if (!ctx.hasUI) return;

    ctx.ui.setFooter((tui, theme, footerData) => {
      requestRender = () => tui.requestRender();
      const unsubBranch = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose() {
          if (requestRender) requestRender = null;
          unsubBranch();
        },
        invalidate() {},
        render(width: number): string[] {
          if (!enabled) return [];
          const activeCtx = getActiveCtx() ?? ctx;

          const modelLabel = theme.fg("accent", `[${getModelLabel(pi, activeCtx)}]`);
          const projectLabel = theme.fg("text", getProjectLabel(activeCtx.cwd, footerData.getGitBranch()));

          const usage = activeCtx.getContextUsage();
          const contextPercent = clampPercent(usage?.percent);
          const meterWidth = DEFAULT_METER_WIDTH;
          const contextColor = contextPercent === null ? undefined : contextPercent >= 85 ? "error" : contextPercent >= 65 ? "warning" : "success";
          const contextBar = buildBar(theme as ThemeLike, contextPercent, meterWidth, { color: contextColor });
          const contextText = contextPercent === null
            ? theme.fg("muted", "--%")
            : theme.fg(contextPercent >= 85 ? "error" : contextPercent >= 65 ? "warning" : "success", `${Math.round(contextPercent)}%`);
          const contextBlock = `${theme.fg("muted", "Context")} ${contextBar} ${contextText}`;

          const quotaBlock = renderQuotaBlock(theme as ThemeLike, quotaSnapshot, showWeeklyLimits, quotaError, quotaProviderKey, meterWidth);
          const pieces = [modelLabel, projectLabel, contextBlock, quotaBlock].filter(Boolean) as string[];
          const full = pieces.join(theme.fg("dim", " | "));
          if (visibleWidth(full) <= width) return [full];

          const withoutQuota = [modelLabel, projectLabel, contextBlock].join(theme.fg("dim", " | "));
          if (visibleWidth(withoutQuota) <= width) return [withoutQuota];

          const compactModel = theme.fg("accent", `[${activeCtx.model?.id || "no-model"}]`);
          const compactProject = theme.fg("text", getProjectLabel(activeCtx.cwd, footerData.getGitBranch()));
          const compact = [compactModel, compactProject, contextBlock].join(theme.fg("dim", " | "));
          if (visibleWidth(compact) <= width) return [compact];

          const tiny = [compactModel, contextBlock].join(theme.fg("dim", " | "));
          return [truncateToWidth(tiny, width)];
        },
      };
    });
  };

  const applyHudState = (ctx: ExtensionContext) => {
    latestCtx = ctx;
    if (!ctx.hasUI) {
      clearTicker();
      return;
    }
    if (enabled) {
      installFooter(ctx);
      ensureTicker(ctx);
      void refreshQuota(ctx, false);
    } else {
      ctx.ui.setFooter(undefined);
      clearTicker();
    }
  };

  const setEnabled = (ctx: ExtensionContext, next: boolean) => {
    enabled = next;
    applyHudState(ctx);
    void persistSettings();
    ctx.ui.notify(`PI HUD ${enabled ? "enabled" : "disabled"}`, "info");
  };

  pi.on("session_start", async (_event, ctx) => {
    applyLoadedSettings(await loadSettings());
    applyHudState(ctx);
  });

  pi.on("session_shutdown", async () => {
    clearTicker();
  });

  pi.on("model_select", async (_event, ctx) => {
    latestCtx = ctx;
    await refreshQuota(ctx, false);
  });

  pi.on("agent_start", async (_event, ctx) => {
    latestCtx = ctx;
    triggerRender();
  });

  pi.on("agent_end", async (_event, ctx) => {
    latestCtx = ctx;
    void refreshQuota(ctx);
    triggerRender();
  });

  pi.on("message_end", async (_event, ctx) => {
    latestCtx = ctx;
    triggerRender();
  });

  pi.on("turn_end", async (_event, ctx) => {
    latestCtx = ctx;
    void refreshQuota(ctx);
    triggerRender();
  });

  pi.registerCommand("hud", {
    description: "HUD controls: /hud on|off|status|weekly [on|off]",
    getArgumentCompletions: (prefix) => {
      const options = ["on", "off", "status", "weekly", "weekly on", "weekly off"];
      const normalized = prefix.toLowerCase();
      const items = options.filter((option) => option.startsWith(normalized)).map((option) => ({ value: option, label: option }));
      return items.length > 0 ? items : null;
    },
    handler: async (args, ctx) => {
      latestCtx = ctx;
      const trimmed = args.trim().toLowerCase();
      const action = trimmed || "toggle";
      const usageText = "Usage: /hud on|off|status|weekly [on|off]";

      if (trimmed === "help") {
        ctx.ui.notify(usageText, "info");
        return;
      }

      if (trimmed === "weekly on") {
        showWeeklyLimits = true;
        void persistSettings();
        triggerRender();
        ctx.ui.notify("PI HUD weekly limits enabled", "info");
        return;
      }
      if (trimmed === "weekly off") {
        showWeeklyLimits = false;
        void persistSettings();
        triggerRender();
        ctx.ui.notify("PI HUD weekly limits disabled", "info");
        return;
      }
      if (trimmed === "weekly") {
        showWeeklyLimits = !showWeeklyLimits;
        void persistSettings();
        triggerRender();
        ctx.ui.notify(`PI HUD weekly limits ${showWeeklyLimits ? "enabled" : "disabled"}`, "info");
        return;
      }

      switch (action) {
        case "on":
          setEnabled(ctx, true);
          return;
        case "off":
          setEnabled(ctx, false);
          return;
        case "status": {
          const totals = getSessionTotals(ctx);
          const quota = quotaProviderKey ? `; quota backend: ${quotaProviderKey}` : "";
          ctx.ui.notify(
            `PI HUD is ${enabled ? "enabled" : "disabled"}; weekly ${showWeeklyLimits ? "on" : "off"}; session ↑${formatCompactNumber(totals.input)} ↓${formatCompactNumber(totals.output)} $${totals.cost.toFixed(3)}${quota}`,
            "info",
          );
          return;
        }
        case "toggle":
          setEnabled(ctx, !enabled);
          return;
        default:
          ctx.ui.notify(usageText, "info");
      }
    },
  });
}
