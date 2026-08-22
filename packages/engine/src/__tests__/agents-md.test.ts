import { describe, it, expect } from "vitest";
import { generateAgentsMd } from "../agents-md";
import type { CodeProfile, StationScore } from "../checks/types";
import type { Fingerprint } from "../fingerprint/types";

// ── fixtures ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<CodeProfile> = {}): CodeProfile {
  return {
    root: "/project",
    files: [],
    packageJson: { name: "my-app", scripts: { dev: "next dev", build: "next build", test: "vitest" } },
    dependencies: { next: "14.2.0", react: "18.3.0", "@supabase/supabase-js": "2.39.0" },
    tsConfig: { compilerOptions: { strict: true } },
    supabaseMigrations: ["20240101_init.sql"],
    apiRoutes: ["app/api/users/route.ts"],
    components: ["components/Button.tsx", "components/Header.tsx"],
    testFiles: ["__tests__/auth.test.ts"],
    configFiles: {},
    envExample: null,
    gitCommits: null,
    framework: "nextjs",
    hasAuth: true,
    hasDatabase: true,
    hasPayments: false,
    hasUserData: true,
    ...overrides,
  };
}

function makeStationScores(overrides: Partial<StationScore>[] = []): StationScore[] {
  const stations = ["security", "accessibility", "performance", "growth", "quality", "architecture", "data", "compliance", "infrastructure"] as const;
  return stations.map((station, i) => ({
    station,
    name: station,
    score: 80,
    checks: [],
    implemented: 1,
    total: 0,
    ...overrides[i],
  }));
}

function makeFingerprint(overrides: Partial<Fingerprint> = {}): Fingerprint {
  return {
    platform: { platform: "lovable", confidence: 92, signals: ["lovable.config file", "lovable-tagger dependency"] },
    model: { model: "claude-sonnet-4-6", confidence: 80, reasoning: "Lovable uses Claude Sonnet as its default." },
    aiRatio: { likelyAiCommits: 18, likelyHumanCommits: 3, totalAnalyzed: 25, aiRatio: 0.857 },
    ...overrides,
  };
}

// ── structure tests ───────────────────────────────────────────────────────────

describe("generateAgentsMd — structure", () => {
  it("returns a non-empty string", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(typeof md).toBe("string");
    expect(md.length).toBeGreaterThan(200);
  });

  it("starts with # AGENTS.md header", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md.trimStart()).toMatch(/^# AGENTS\.md/);
  });

  it("contains all required section headers", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("## Project");
    expect(md).toContain("## Directory Layout");
    expect(md).toContain("## Context Flags");
    expect(md).toContain("## Key Dependencies");
    expect(md).toContain("## NPM Scripts");
    expect(md).toContain("## Top 3 Fixes");
    expect(md).toContain("## Conventions");
  });
});

// ── project section ───────────────────────────────────────────────────────────

describe("generateAgentsMd — project section", () => {
  it("includes the project name from package.json", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("my-app");
  });

  it("labels Next.js framework correctly", () => {
    const md = generateAgentsMd(makeProfile({ framework: "nextjs" }), makeStationScores(), makeFingerprint());
    expect(md).toContain("Next.js (App Router)");
  });

  it("labels vite-react framework correctly", () => {
    const md = generateAgentsMd(makeProfile({ framework: "vite-react" }), makeStationScores(), makeFingerprint());
    expect(md).toContain("Vite + React");
  });

  it("falls back to 'this project' when package.json has no name", () => {
    const md = generateAgentsMd(
      makeProfile({ packageJson: {} }),
      makeStationScores(),
      makeFingerprint(),
    );
    expect(md).toContain("this project");
  });

  it("includes the ShipRank overall score", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toMatch(/ShipRank Score: \d+\/100/);
  });

  it("includes regeneration command", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("npx shiprank agents");
  });
});

// ── fingerprint section ───────────────────────────────────────────────────────

describe("generateAgentsMd — fingerprint section", () => {
  it("shows detected platform and confidence", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("lovable");
    expect(md).toContain("92%");
  });

  it("shows model name and confidence", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("claude-sonnet-4-6");
    expect(md).toContain("80%");
  });

  it("shows AI commit ratio as percentage", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("86%"); // Math.round(0.857 * 100)
    expect(md).toContain("25 commits");
  });

  it("shows 'no git history' when aiRatio is null", () => {
    const md = generateAgentsMd(
      makeProfile(),
      makeStationScores(),
      makeFingerprint({ aiRatio: null }),
    );
    expect(md).toContain("no git history");
  });

  it("shows 'not detected' for unknown platform", () => {
    const md = generateAgentsMd(
      makeProfile(),
      makeStationScores(),
      makeFingerprint({ platform: { platform: "unknown", confidence: 0, signals: [] } }),
    );
    expect(md).toContain("not detected");
  });

  it("shows 'unknown — correct us' when model is null", () => {
    const md = generateAgentsMd(
      makeProfile(),
      makeStationScores(),
      makeFingerprint({ model: { model: null, confidence: 0, reasoning: "" } }),
    );
    expect(md).toContain("correct us on the next scan");
    expect(md).not.toContain("shiprank.dev");
  });
});

// ── directory section ─────────────────────────────────────────────────────────

describe("generateAgentsMd — directory layout", () => {
  it("mentions app/ when App Router files present", () => {
    const profile = makeProfile({
      files: [{ path: "app/page.tsx", ext: ".tsx", size: 100, lines: 10, content: "" }],
    });
    const md = generateAgentsMd(profile, makeStationScores(), makeFingerprint());
    expect(md).toContain("`app/`");
  });

  it("reports component count", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("2 detected");
  });

  it("reports migration count", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("1 migration");
  });

  it("reports API route count", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("1 endpoint");
  });
});

// ── context flags ─────────────────────────────────────────────────────────────

describe("generateAgentsMd — context flags", () => {
  it("shows all four flags", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("hasAuth: `true`");
    expect(md).toContain("hasDatabase: `true`");
    expect(md).toContain("hasPayments: `false`");
    expect(md).toContain("hasUserData: `true`");
  });
});

// ── dependencies and scripts ──────────────────────────────────────────────────

describe("generateAgentsMd — dependencies and scripts", () => {
  it("lists key dependencies", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("`next`");
    expect(md).toContain("`react`");
    expect(md).toContain("`@supabase/supabase-js`");
  });

  it("lists npm scripts", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("`dev`: `next dev`");
    expect(md).toContain("`build`: `next build`");
    expect(md).toContain("`test`: `vitest`");
  });

  it("shows fallback when no deps", () => {
    const md = generateAgentsMd(
      makeProfile({ dependencies: {} }),
      makeStationScores(),
      makeFingerprint(),
    );
    expect(md).toContain("_none detected_");
  });

  it("shows fallback when no scripts", () => {
    const md = generateAgentsMd(
      makeProfile({ packageJson: { name: "x" } }),
      makeStationScores(),
      makeFingerprint(),
    );
    expect(md).toContain("_no scripts defined_");
  });
});

// ── conventions section ───────────────────────────────────────────────────────

describe("generateAgentsMd — conventions", () => {
  it("includes TypeScript note when tsConfig present", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("TypeScript");
  });

  it("includes auth security note when hasAuth", () => {
    const md = generateAgentsMd(makeProfile({ hasAuth: true }), makeStationScores(), makeFingerprint());
    expect(md).toContain("session tokens");
  });

  it("includes payment note when hasPayments", () => {
    const md = generateAgentsMd(makeProfile({ hasPayments: true }), makeStationScores(), makeFingerprint());
    expect(md).toContain("Stripe");
  });

  it("includes migration note when supabase migrations present", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("never edit existing ones");
  });

  it("includes DB parameterized query note when hasDatabase", () => {
    const md = generateAgentsMd(makeProfile({ hasDatabase: true }), makeStationScores(), makeFingerprint());
    expect(md).toContain("parameterized queries");
  });

  it("shows fallback when no conventions detected", () => {
    const md = generateAgentsMd(
      makeProfile({
        tsConfig: null,
        hasAuth: false,
        hasDatabase: false,
        hasPayments: false,
        supabaseMigrations: [],
      }),
      makeStationScores(),
      makeFingerprint(),
    );
    expect(md).toContain("_no specific conventions detected_");
  });
});

// ── remediation section ───────────────────────────────────────────────────────

describe("generateAgentsMd — top 3 fixes", () => {
  it("shows clean message when no failing checks", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    // makeStationScores has no checks so plan.top3 is empty
    expect(md).toContain("_no failing checks");
  });

  it("renders fix items with check ID, severity, effort, and prompt", () => {
    const scores: StationScore[] = makeStationScores();
    scores[0]!.checks = [
      {
        id: "SEC-002",
        station: "security",
        passed: false,
        severity: "critical",
        confidence: 1,
        title: "Missing CSP header",
        failMessage: "No Content-Security-Policy header found",
        evidence: "headers.ts",
        fixPrompt: "Add a Content-Security-Policy header in your middleware.",
        fixDifficulty: "copy-paste",
        fixTime: "10 min",
        autoFixSafety: "safe",
        scoreWeight: 20,
      },
    ];
    const md = generateAgentsMd(makeProfile(), scores, makeFingerprint());
    expect(md).toContain("SEC-002");
    expect(md).toContain("Missing CSP header");
    expect(md).toContain("CRITICAL");
    expect(md).toContain("SAFE-AUTO");
    expect(md).toContain("10 min");
    expect(md).toContain("Add a Content-Security-Policy");
  });

  it("shows projected score after fixes", () => {
    const scores: StationScore[] = makeStationScores();
    scores[0]!.checks = [
      {
        id: "SEC-003",
        station: "security",
        passed: false,
        severity: "warning",
        confidence: 1,
        title: "Weak CORS config",
        failMessage: "CORS allows *",
        evidence: "api/",
        fixPrompt: "Restrict CORS origins.",
        fixDifficulty: "copy-paste",
        fixTime: "5 min",
        autoFixSafety: "safe",
        scoreWeight: 15,
      },
    ];
    const md = generateAgentsMd(makeProfile(), scores, makeFingerprint());
    expect(md).toMatch(/raises your score from \*\*\d+[\d.]*\*\* → \*\*\d+[\d.]*\*\*/);
  });
});

// ── footer ────────────────────────────────────────────────────────────────────

describe("generateAgentsMd — footer", () => {
  it("includes platform and model in footer", () => {
    const md = generateAgentsMd(makeProfile(), makeStationScores(), makeFingerprint());
    expect(md).toContain("Detected platform: lovable");
    expect(md).toContain("Model: claude-sonnet-4-6");
  });
});
