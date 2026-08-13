import { describe, it, expect } from "vitest";
import { runChecks, overallScore, runHeldoutChecks } from "../checks/engine";
import type { CodeProfile, FileInfo } from "../checks/types";

function file(path: string, content: string): FileInfo {
  const ext = "." + (path.split(".").pop() ?? "ts");
  return { path, ext, size: content.length, lines: content.split("\n").length, content };
}

function makeProfile(files: FileInfo[]): CodeProfile {
  return {
    root: "/project",
    files,
    packageJson: { name: "demo" },
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
  };
}

// A Slack token — deliberately NOT in SEC-001's public pattern list, so the
// public score must be identical whether or not this file is present.
// Split to avoid tripping GitHub push protection on the test fixture itself.
const _pfx = "xox";
const SLACK_SECRET = `const t = "${_pfx}b-2411231234-abcdefGHIJ0987";`;

const cleanFiles = [file("src/app.ts", "export const x = 1;")];
const secretFiles = [...cleanFiles, file("src/leak.ts", SLACK_SECRET)];

describe("held-out check infrastructure", () => {
  it("HELD-001 runs and DETECTS a held-out secret", () => {
    const results = runHeldoutChecks(makeProfile(secretFiles));
    const held = results.find((r) => r.id === "HELD-001");
    expect(held).toBeDefined();
    expect(held!.visibility).toBe("heldout");
    expect(held!.passed).toBe(false);
    expect(held!.failMessage).toMatch(/slack/i);
  });

  it("HELD-001 passes cleanly when no held-out secret is present", () => {
    const held = runHeldoutChecks(makeProfile(cleanFiles)).find(
      (r) => r.id === "HELD-001",
    );
    expect(held!.passed).toBe(true);
  });

  it("does NOT affect the overall score", () => {
    const clean = overallScore(runChecks(makeProfile(cleanFiles)));
    const withSecret = overallScore(runChecks(makeProfile(secretFiles)));
    expect(withSecret).toBe(clean);
  });

  it("does NOT affect any station score (security included)", () => {
    const cleanStations = runChecks(makeProfile(cleanFiles));
    const secretStations = runChecks(makeProfile(secretFiles));
    for (const s of cleanStations) {
      const other = secretStations.find((x) => x.station === s.station)!;
      expect(other.score).toBe(s.score);
    }
  });

  it("never appears in the public (scored) check set", () => {
    const stations = runChecks(makeProfile(secretFiles));
    const allPublic = stations.flatMap((s) => s.checks);
    expect(allPublic.some((c) => c.id === "HELD-001")).toBe(false);
    expect(allPublic.every((c) => c.visibility === "public")).toBe(true);
  });
});
