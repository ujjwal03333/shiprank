import { describe, it, expect, vi, afterEach } from "vitest";
import { formatPlatformName, formatModelName, timeAgo, visiblePlatform } from "../format-names";

describe("formatPlatformName", () => {
  it("returns canonical name for known platforms", () => {
    expect(formatPlatformName("cursor")).toBe("Cursor");
    expect(formatPlatformName("lovable")).toBe("Lovable");
    expect(formatPlatformName("v0")).toBe("V0");
    expect(formatPlatformName("github-copilot")).toBe("GitHub Copilot");
    expect(formatPlatformName("copilot")).toBe("GitHub Copilot");
  });

  it("is case-insensitive", () => {
    expect(formatPlatformName("CURSOR")).toBe("Cursor");
    expect(formatPlatformName("Bolt")).toBe("Bolt");
  });

  it("capitalizes first letter of unknown platforms", () => {
    expect(formatPlatformName("somethingNew")).toBe("SomethingNew");
    expect(formatPlatformName("other")).toBe("Other");
  });

  it("returns 'Not detected' for null/undefined/empty", () => {
    expect(formatPlatformName(null)).toBe("Not detected");
    expect(formatPlatformName(undefined)).toBe("Not detected");
    expect(formatPlatformName("")).toBe("Not detected");
  });
});

describe("visiblePlatform", () => {
  it("hides unknown and empty so the Card stays clean", () => {
    expect(visiblePlatform(null)).toBeNull();
    expect(visiblePlatform("unknown")).toBeNull();
    expect(visiblePlatform("Not detected")).toBeNull();
    expect(visiblePlatform("cursor")).toBe("Cursor");
  });
});

describe("formatModelName", () => {
  it("returns 'Not detected' for null/undefined/empty", () => {
    expect(formatModelName(null)).toBe("Not detected");
    expect(formatModelName(undefined)).toBe("Not detected");
    expect(formatModelName("")).toBe("Not detected");
  });

  it("formats Claude models", () => {
    expect(formatModelName("claude-3.5-sonnet")).toBe("Claude 3.5 Sonnet");
  });

  it("formats GPT models preserving uppercase", () => {
    expect(formatModelName("gpt-4o")).toBe("GPT 4o");
  });

  it("formats Gemini models", () => {
    expect(formatModelName("gemini-1.5-pro")).toBe("Gemini 1.5 Pro");
  });
});

describe("timeAgo", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 'just now' for < 60 seconds", () => {
    const now = new Date();
    expect(timeAgo(now.toISOString())).toBe("just now");
  });

  it("returns minutes for < 60 minutes", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(timeAgo(fiveMinAgo.toISOString())).toBe("5m ago");
  });

  it("returns hours for < 24 hours", () => {
    const threeHrsAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(timeAgo(threeHrsAgo.toISOString())).toBe("3h ago");
  });

  it("returns days for < 7 days", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoDaysAgo.toISOString())).toBe("2d ago");
  });

  it("returns weeks for < 30 days", () => {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    expect(timeAgo(fourteenDaysAgo.toISOString())).toBe("2w ago");
  });

  it("returns months for < 365 days", () => {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(timeAgo(ninetyDaysAgo.toISOString())).toBe("3mo ago");
  });

  it("returns years for >= 365 days", () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
    expect(timeAgo(twoYearsAgo.toISOString())).toBe("2y ago");
  });
});
