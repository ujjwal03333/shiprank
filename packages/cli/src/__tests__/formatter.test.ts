import { describe, it, expect } from "vitest";
import { gradeFromScore, renderTerminalOutput, renderJsonOutput } from "../formatter.js";
import { scoreToGrade } from "@shiprank/database";
import type { ScanResult } from "../scanner.js";

function makeScanResult(score: number, overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    version: "1.0.0",
    checkSuiteVersion: "1.0.0",
    projectName: "test-app",
    root: "/tmp/test-app",
    fileCount: 42,
    lineCount: 8500,
    depCount: 18,
    score,
    grade: gradeFromScore(score),
    framework: "nextjs",
    fingerprint: {
      platform: { platform: "lovable", confidence: 80, signals: [] },
      model: { model: "claude-sonnet-5", confidence: 80, reasoning: "" },
      aiRatio: { likelyAiCommits: 9, likelyHumanCommits: 1, totalAnalyzed: 10, aiRatio: 0.9 },
    },
    stations: [
      {
        station: "security",
        name: "Security",
        score: 58,
        implemented: 5,
        total: 12,
        checks: [
          {
            id: "SEC-001",
            station: "security",
            passed: false,
            severity: "critical",
            confidence: 90,
            title: "Move service_role key to server",
            failMessage: "key exposed",
            evidence: "",
            fixPrompt: "",
            fixDifficulty: "copy-paste",
            fixTime: "5 min",
            autoFixSafety: "safe",
            scoreWeight: 20,
          },
        ],
      },
      {
        station: "accessibility",
        name: "Accessibility",
        score: 72,
        implemented: 3,
        total: 8,
        checks: [],
      },
      {
        station: "growth",
        name: "Growth",
        score: 44,
        implemented: 2,
        total: 6,
        checks: [
          {
            id: "SEO-002",
            station: "growth",
            passed: false,
            severity: "warning",
            confidence: 80,
            title: "Add OG meta tags",
            failMessage: "missing",
            evidence: "",
            fixPrompt: "",
            fixDifficulty: "copy-paste",
            fixTime: "5 min",
            autoFixSafety: "safe",
            scoreWeight: 10,
          },
        ],
      },
    ],
    remediation: {
      currentScore: score,
      projectedScore: Math.min(100, score + 21),
      top3: [
        {
          checkId: "SEC-001",
          station: "security",
          title: "Move service_role key to server",
          severity: "critical",
          scoreGain: 9,
          effortMinutes: 5,
          roi: 1.8,
          fixDifficulty: "copy-paste",
          fixPrompt: "",
          autoFixSafety: "safe",
          autoFixClass: "SAFE-AUTO",
        },
        {
          checkId: "SEO-002",
          station: "growth",
          title: "Add OG meta tags",
          severity: "warning",
          scoreGain: 5,
          effortMinutes: 5,
          roi: 1.0,
          fixDifficulty: "copy-paste",
          fixPrompt: "",
          autoFixSafety: "safe",
          autoFixClass: "SAFE-AUTO",
        },
      ],
      all: [],
    },
    profile: {
      root: "/tmp/test-app",
      files: [],
      packageJson: { name: "test-app" },
      dependencies: {},
      tsConfig: null,
      supabaseMigrations: [],
      apiRoutes: [],
      components: [],
      testFiles: [],
      configFiles: {},
      envExample: null,
      gitCommits: null,
      framework: "nextjs",
      hasAuth: false,
      hasDatabase: false,
      hasPayments: false,
      hasUserData: false,
    },
    ...overrides,
  };
}

describe("gradeFromScore()", () => {
  it("is the same function as scoreToGrade from @shiprank/database", () => {
    // Verify single source of truth — no separate reimplementation
    for (const s of [0, 39, 40, 54, 55, 69, 70, 84, 85, 96, 97, 100]) {
      expect(gradeFromScore(s)).toBe(scoreToGrade(s));
    }
  });

  // Spot-check the canonical boundaries from @shiprank/database
  it.each([
    [97, "A+"],
    [85, "A"],
    [84, "B"],
    [70, "B"],
    [69, "C"],
    [55, "C"],
    [54, "D"],
    [40, "D"],
    [39, "F"],
    [0, "F"],
  ])("score %i → grade %s", (score, grade) => {
    expect(gradeFromScore(score)).toBe(grade);
  });
});

describe("renderTerminalOutput()", () => {
  it("includes project name, score and grade", () => {
    const result = makeScanResult(67);
    const out = renderTerminalOutput(result);
    expect(out).toContain("test-app");
    expect(out).toContain("67 / 100");
    expect(out).toContain("Grade C");
  });

  it("includes fingerprint line with platform and model", () => {
    const out = renderTerminalOutput(makeScanResult(67));
    expect(out).toContain("Lovable");
    expect(out).toContain("claude-sonnet-5");
    expect(out).toContain("90% AI-written");
  });

  it("renders the remediation block with correct gain", () => {
    const out = renderTerminalOutput(makeScanResult(67));
    expect(out).toContain("Fix these 2 for +14 points");
    expect(out).toContain("[SEC-001]");
    expect(out).toContain("[SEO-002]");
  });

  it("marks stations with critical failures as ⚠", () => {
    const out = renderTerminalOutput(makeScanResult(67));
    expect(out).toContain("⚠ 1 critical");
  });

  it("shows footer hints", () => {
    const out = renderTerminalOutput(makeScanResult(67));
    expect(out).toContain("npx shiprank --json | less");
    expect(out).toContain("npx shiprank --rules > .cursorrules");
  });

  it("skips stations with no implemented checks", () => {
    const result = makeScanResult(100);
    // Override Accessibility to have implemented: 0 so formatter skips it
    result.stations[1]!.implemented = 0;
    const out = renderTerminalOutput(result);
    expect(out).not.toContain("Accessibility");
  });
});

describe("renderJsonOutput()", () => {
  it("produces valid JSON", () => {
    const result = makeScanResult(67);
    const json = renderJsonOutput(result);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("JSON contains expected top-level keys", () => {
    const parsed = JSON.parse(renderJsonOutput(makeScanResult(67))) as Record<string, unknown>;
    expect(parsed).toHaveProperty("score");
    expect(parsed).toHaveProperty("grade");
    expect(parsed).toHaveProperty("stations");
    expect(parsed).toHaveProperty("remediation");
    expect(parsed).toHaveProperty("fingerprint");
  });

  it("JSON score matches input", () => {
    const parsed = JSON.parse(renderJsonOutput(makeScanResult(83))) as Record<string, unknown>;
    expect(parsed["score"]).toBe(83);
    expect(parsed["grade"]).toBe("B");
  });
});
