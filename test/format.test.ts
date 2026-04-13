import { describe, expect, it } from "vitest";

import { clampPercent, formatCompactNumber, formatContextWindow, formatResetCountdown, getProjectLabel, normalizeResetAt, normalizeZaiLimitLabel } from "../extensions/pi-hud/format.js";

describe("format helpers", () => {
  it("clamps percentages", () => {
    expect(clampPercent(-5)).toBe(0);
    expect(clampPercent(120)).toBe(100);
    expect(clampPercent(42)).toBe(42);
    expect(clampPercent(null)).toBeNull();
  });

  it("formats compact numbers", () => {
    expect(formatCompactNumber(999)).toBe("999");
    expect(formatCompactNumber(1_234)).toBe("1.2k");
    expect(formatCompactNumber(1_250_000)).toBe("1.3M");
  });

  it("formats context windows", () => {
    expect(formatContextWindow(400_000)).toBe("400k");
    expect(formatContextWindow(1_000_000)).toBe("1M");
    expect(formatContextWindow(1_500_000)).toBe("1.5M");
  });

  it("formats reset countdowns", () => {
    const now = 1_000_000;
    expect(formatResetCountdown(now + 20 * 60_000, now)).toBe("20m");
    expect(formatResetCountdown(now + 2 * 60 * 60_000 + 10 * 60_000, now)).toBe("2h 10m");
    expect(formatResetCountdown(now + 2 * 24 * 60 * 60_000 + 3 * 60 * 60_000, now)).toBe("2d 3h");
    expect(formatResetCountdown(now - 1, now)).toBe("now");
  });

  it("formats project paths relative to home", () => {
    expect(getProjectLabel("/Users/daniphant/projects/pi-hud", "main", "/Users/daniphant")).toBe("~/projects/pi-hud (main)");
    expect(getProjectLabel("/tmp/demo", null, "/Users/daniphant")).toBe("/tmp/demo");
  });

  it("formats canonical z.ai window labels", () => {
    expect(normalizeZaiLimitLabel(60, "quota")).toBe("1h");
    expect(normalizeZaiLimitLabel(300, "quota")).toBe("5h");
    expect(normalizeZaiLimitLabel(7 * 24 * 60, "quota")).toBe("7d");
  });

  it("normalizes reset timestamps", () => {
    expect(normalizeResetAt(1776053603881)).toBe(1776053603881);
    expect(normalizeResetAt(1776053603)).toBe(1776053603000);
    expect(normalizeResetAt(undefined)).toBeNull();
  });
});
