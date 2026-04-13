import { describe, expect, it } from "vitest";

import { renderQuotaBlock } from "../extensions/pi-hud/render.js";
import type { ThemeLike } from "../extensions/pi-hud/types.js";

const theme: ThemeLike = {
  fg: (_color, text) => text,
};

describe("renderQuotaBlock", () => {
  it("renders codex usage", () => {
    const rendered = renderQuotaBlock(theme, {
      kind: "codex",
      plan: null,
      sessionUsedPercent: 12,
      sessionResetAt: Date.now() + 60_000,
      weeklyUsedPercent: 40,
      weeklyResetAt: Date.now() + 120_000,
    }, true, null, "codex", 12);

    expect(rendered).toContain("Usage");
    expect(rendered).toContain("12%");
    expect(rendered).toContain("40%");
  });

  it("renders unavailable state", () => {
    expect(renderQuotaBlock(theme, null, false, "boom", "zai", 12)).toBe("Usage unavailable");
  });
});
