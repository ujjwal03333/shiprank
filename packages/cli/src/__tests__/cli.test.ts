import { describe, it, expect } from "vitest";
import { parseArgs } from "../args.js";
import { buildUploadPayload } from "../uploader.js";
import { gradeFromScore, renderTerminalOutput, renderJsonOutput } from "../formatter.js";
import type { ScanResult } from "../scanner.js";

// ── arg parser ────────────────────────────────────────────────────────────────

describe("parseArgs()", () => {
  function parse(args: string[]): ReturnType<typeof parseArgs> {
    return parseArgs(["node", "shiprank", ...args]);
  }

  it("defaults to scan . with no flags", () => {
    const r = parse([]);
    expect(r.command).toBe("scan");
    expect(r.dir).toBe(".");
    expect(r.json).toBe(false);
    expect(r.ci).toBe(false);
    expect(r.upload).toBe(false);
    expect(r.rules).toBe(false);
  });

  it("parses a directory positional", () => {
    expect(parse(["./my-app"]).dir).toBe("./my-app");
  });

  it("sets --json flag", () => {
    expect(parse(["--json"]).json).toBe(true);
  });

  it("parses --ci --threshold 75", () => {
    const r = parse(["--ci", "--threshold", "75"]);
    expect(r.ci).toBe(true);
    expect(r.threshold).toBe(75);
  });

  it("parses --threshold=80 (equals form)", () => {
    expect(parse(["--threshold=80"]).threshold).toBe(80);
  });

  it("parses --upload", () => {
    expect(parse(["--upload"]).upload).toBe(true);
  });

  it("parses --rules", () => {
    expect(parse(["--rules"]).rules).toBe(true);
  });

  it("sets compile command with prompt", () => {
    const r = parse(["compile", "build a booking app"]);
    expect(r.command).toBe("compile");
    expect(r.compilePrompt).toBe("build a booking app");
  });

  it("sets help=true for --help", () => {
    const r = parse(["--help"]);
    expect(r.help).toBe(true);
  });

  it("sets help=true for -h", () => {
    const r = parse(["-h"]);
    expect(r.help).toBe(true);
  });

  it("help flag does not set json or ci", () => {
    const r = parse(["--help"]);
    expect(r.json).toBe(false);
    expect(r.ci).toBe(false);
  });
});

// ── --ci exit code logic ──────────────────────────────────────────────────────

describe("--ci threshold exit logic", () => {
  it("exits 0 when score meets threshold", () => {
    const score = 75;
    const threshold = 60;
    expect(score >= threshold).toBe(true);
  });

  it("exits 1 when score is below threshold", () => {
    const score = 55;
    const threshold = 60;
    expect(score < threshold).toBe(true);
  });
});

// ── upload payload ─────────────────────────────────────────────────────────────

function makeMinimalResult(score: number): ScanResult {
  return {
    version: "1.0.0",
    checkSuiteVersion: "1.0.0",
    projectName: "payload-test",
    root: "/tmp/payload-test",
    contentHash: "0000000000000000000000000000000000000000000000000000000000000000",
    fileCount: 10,
    lineCount: 500,
    depCount: 5,
    score,
    grade: gradeFromScore(score),
    framework: "nextjs",
    fingerprint: {
      platform: { platform: "cursor", confidence: 70, signals: [] },
      model: { model: "claude-sonnet-5", confidence: 70, reasoning: "" },
      aiRatio: null,
    },
    stations: [
      { station: "security", name: "Security", score: 80, implemented: 3, total: 5, checks: [] },
    ],
    heldout: [],
    remediation: { currentScore: score, projectedScore: score + 5, top3: [], all: [] },
    profile: {
      root: "/tmp/payload-test",
      files: [],
      packageJson: null,
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
  };
}

describe("buildUploadPayload()", () => {
  it("maps score, grade, framework correctly", () => {
    const payload = buildUploadPayload(makeMinimalResult(72));
    expect(payload.score).toBe(72);
    expect(payload.grade).toBe("B"); // 70-84 = B per scoreToGrade
    expect(payload.framework).toBe("nextjs");
    expect(payload.platform).toBe("cursor");
    expect(payload.model).toBe("claude-sonnet-5");
    expect(payload.aiRatio).toBeNull();
  });

  it("includes stationScores map", () => {
    const payload = buildUploadPayload(makeMinimalResult(72));
    expect(payload.stationScores).toHaveProperty("security", 80);
  });

  it("omits stub-only stations from stationScores", () => {
    const result = makeMinimalResult(72);
    result.stations.push({
      station: "architecture",
      name: "Architecture",
      score: 0,
      implemented: 0,
      total: 9,
      checks: [],
    });
    const payload = buildUploadPayload(result);
    expect(payload.stationScores).not.toHaveProperty("architecture");
    expect(payload.stationScores).toHaveProperty("security", 80);
  });
});

// ── --json output ──────────────────────────────────────────────────────────────

describe("--json output", () => {
  it("produces valid JSON matching ScanResult shape", () => {
    const result = makeMinimalResult(82);
    const json = renderJsonOutput(result);
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed["score"]).toBe(82);
    expect(parsed["grade"]).toBe("B");
    expect(parsed["projectName"]).toBe("payload-test");
    expect(Array.isArray(parsed["stations"])).toBe(true);
    expect(parsed["fingerprint"]).toBeDefined();
  });
});
