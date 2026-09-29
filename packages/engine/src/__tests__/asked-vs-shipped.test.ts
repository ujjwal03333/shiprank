import { describe, it, expect } from "vitest";
import { askedChipsFromEvidence, type ChipEvidence } from "../asked-vs-shipped";
import { runChecks } from "../checks/engine";
import type { CodeProfile, FileInfo } from "../checks/types";

function row(
  checkId: string,
  passed: boolean,
  title: string,
  extra: Partial<ChipEvidence> = {},
): ChipEvidence {
  const base: ChipEvidence = { checkId, passed, title };
  if (extra.applicable === true || extra.applicable === false) {
    base.applicable = extra.applicable;
  }
  if (typeof extra.confidence === "number") {
    base.confidence = extra.confidence;
  }
  return base;
}

function file(path: string, content: string): FileInfo {
  const ext = "." + (path.split(".").pop() ?? "ts");
  return { path, ext, size: content.length, lines: content.split("\n").length, content };
}

function makeProfile(overrides: Partial<CodeProfile> = {}): CodeProfile {
  return {
    root: "/project",
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
    ...overrides,
  };
}

function chipsFromProfile(profile: CodeProfile) {
  const checks = runChecks(profile).flatMap((s) => s.checks);
  return askedChipsFromEvidence(
    checks.map((c) => {
      const evidence: ChipEvidence = {
        checkId: c.id,
        passed: c.passed,
        title: c.title,
        confidence: c.confidence,
      };
      if (c.applicable === true || c.applicable === false) {
        evidence.applicable = c.applicable;
      }
      return evidence;
    }),
  );
}

describe("askedChipsFromEvidence", () => {
  it("omits everything when there is no stack evidence", () => {
    expect(
      askedChipsFromEvidence([
        row("SEC-001", true, "No hardcoded secrets in source code"),
        row("SEC-003", true, "RLS check — no Supabase migrations found"),
        row("SEC-004", true, "API auth check skipped — no auth or no API routes"),
        row("SEC-012", true, "Webhook check skipped — no payment library detected"),
        row("COMP-004", true, "Account deletion not required (no auth or user tables)"),
      ]),
    ).toEqual([]);
  });

  it("never invents asked from a universal secrets pass", () => {
    expect(
      askedChipsFromEvidence([row("SEC-001", true, "No hardcoded secrets in source code")]),
    ).toEqual([]);
  });

  it("Auth / RLS / Webhooks / Delete-my-data / Public secrets from applied checks", () => {
    const chips = askedChipsFromEvidence([
      row("SEC-001", true, "No hardcoded secrets in source code"),
      row("SEC-003", false, "All Supabase tables have RLS enabled"),
      row("SEC-004", true, "API routes verify authentication server-side"),
      row("SEC-012", false, "Payment webhooks verify signatures"),
      row("COMP-004", false, "Account deletion endpoint"),
    ]);
    expect(chips).toEqual([
      { id: "auth", label: "Auth", state: "present" },
      { id: "rls", label: "RLS", state: "missing" },
      { id: "webhooks", label: "Webhooks", state: "missing" },
      { id: "delete-my-data", label: "Delete-my-data", state: "missing" },
      { id: "public-secrets", label: "Public secrets", state: "present" },
    ]);
  });

  it("treats stripe-with-no-webhook-routes as Webhooks missing, not present", () => {
    expect(
      askedChipsFromEvidence([
        row("SEC-012", true, "No webhook routes found to verify"),
      ]),
    ).toEqual([{ id: "webhooks", label: "Webhooks", state: "missing" }]);
  });

  it("omits stubs, N/A, and applicable=false", () => {
    expect(
      askedChipsFromEvidence([
        row("SEC-013", true, "No file upload validation", { confidence: 0 }),
        row("SEC-004", true, "API routes verify authentication server-side", {
          applicable: false,
        }),
        row("SEC-003", true, "RLS N/A"),
      ]),
    ).toEqual([]);
  });

  it("Public secrets missing is asked from a failing secrets check even without other stack", () => {
    expect(
      askedChipsFromEvidence([
        row("SEC-001", false, "No hardcoded secrets in source code"),
      ]),
    ).toEqual([{ id: "public-secrets", label: "Public secrets", state: "missing" }]);
  });

  it("is deterministic: same rows, same chips, same order", () => {
    const rows = [
      row("COMP-004", false, "Account deletion endpoint"),
      row("SEC-004", false, "API routes verify authentication server-side"),
      row("SEC-001", true, "No hardcoded secrets in source code"),
    ];
    expect(askedChipsFromEvidence(rows)).toEqual(askedChipsFromEvidence([...rows].reverse()));
    expect(askedChipsFromEvidence(rows).map((c) => c.id)).toEqual([
      "auth",
      "delete-my-data",
      "public-secrets",
    ]);
  });

  it("omits a check that is not in the evidence set", () => {
    expect(
      askedChipsFromEvidence([
        row("SEC-004", false, "API routes verify authentication server-side"),
      ]).map((c) => c.id),
    ).toEqual(["auth"]);
  });
});

describe("asked chips from runChecks", () => {
  it("empty tree produces no chips", () => {
    expect(chipsFromProfile(makeProfile())).toEqual([]);
  });

  it("supabase migrations without RLS → RLS missing", () => {
    const chips = chipsFromProfile(
      makeProfile({
        hasDatabase: true,
        supabaseMigrations: ["CREATE TABLE public.bookings (id uuid, user_id uuid);"],
      }),
    );
    expect(chips.find((c) => c.id === "rls")).toEqual({
      id: "rls",
      label: "RLS",
      state: "missing",
    });
  });

  it("auth API routes without getUser → Auth missing", () => {
    const chips = chipsFromProfile(
      makeProfile({
        hasAuth: true,
        apiRoutes: ["app/api/me/route.ts"],
        files: [file("app/api/me/route.ts", "export async function GET() { return Response.json({}); }")],
      }),
    );
    expect(chips.find((c) => c.id === "auth")).toEqual({
      id: "auth",
      label: "Auth",
      state: "missing",
    });
  });

  it("stripe dep without webhook route → Webhooks missing", () => {
    const chips = chipsFromProfile(
      makeProfile({
        hasPayments: true,
        dependencies: { stripe: "17.0.0" },
      }),
    );
    expect(chips.find((c) => c.id === "webhooks")).toEqual({
      id: "webhooks",
      label: "Webhooks",
      state: "missing",
    });
  });
});
