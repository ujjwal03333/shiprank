import { describe, expect, it } from "vitest";
import { overallScore, runChecks } from "../checks/engine";
import { capReasonOf, docketOf, hasProductSurface } from "../checks/lanes";
import { buildRemediationPlan } from "../remediation";
import type { CodeProfile, FileInfo } from "../checks/types";

function file(path: string, content: string): FileInfo {
  const ext = "." + (path.split(".").pop() ?? "ts");
  return { path, ext, size: content.length, lines: content.split("\n").length, content };
}

function profile(overrides: Partial<CodeProfile> = {}): CodeProfile {
  return {
    root: "/p",
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
    framework: "unknown",
    hasAuth: false,
    hasDatabase: false,
    hasPayments: false,
    hasUserData: false,
    ...overrides,
  };
}

describe("three lanes", () => {
  it("is deterministic", () => {
    const p = profile({
      framework: "nextjs",
      files: [file("app/page.tsx", "export default function Page(){ return <h1>Hello</h1> }")],
    });
    expect(overallScore(runChecks(p))).toBe(overallScore(runChecks(p)));
  });

  it("caps a security P0 at D", () => {
    const p = profile({
      framework: "nextjs",
      hasAuth: true,
      hasUserData: true,
      files: [
        file("app/page.tsx", "export default function Page(){ return <h1>App</h1> }"),
        file("lib/admin.ts", "const SUPABASE_SERVICE_ROLE_KEY='eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig'"),
      ],
    });
    const stations = runChecks(p);
    expect(stations.find((s) => s.station === "security")!.capReason).toBe("Security P0.");
    expect(overallScore(stations)).toBeLessThanOrEqual(54);
  });

  it("does not flag the anon key", () => {
    const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIn0.signaturepaddingpadding";
    const p = profile({
      files: [file("lib/supabase.ts", `export const k = "${anon}"`)],
    });
    const sec = runChecks(p).find((s) => s.station === "security")!;
    expect(sec.checks.find((c) => c.id === "SEC-001")!.passed).toBe(true);
  });

  it("fails RLS USING (true) and only proposes SQL", () => {
    const p = profile({
      hasDatabase: true,
      supabaseMigrations: [
        "CREATE TABLE public.users (id uuid); ALTER TABLE public.users ENABLE ROW LEVEL SECURITY; CREATE POLICY open ON public.users USING (true);",
      ],
    });
    const sec = runChecks(p).find((s) => s.station === "security")!;
    const using = sec.checks.find((c) => c.id === "SEC-032")!;
    expect(using.passed).toBe(false);
    expect(using.autoFixSafety).toBe("human-only");
    expect(using.fixPrompt).toMatch(/SQL/);
    expect(using.fixPrompt.toLowerCase()).toMatch(/do not apply/);
  });

  it("caps a repo with no auth and no data at C", () => {
    const p = profile({
      framework: "nextjs",
      files: [file("app/page.tsx", "export default function Page(){ return <h1>Hello world</h1> }")],
    });
    expect(hasProductSurface(p)).toBe(false);
    const stations = runChecks(p);
    expect(capReasonOf(stations)).toBe("not a product yet.");
    expect(overallScore(stations)).toBeLessThanOrEqual(69);
    expect(stations.find((s) => s.station === "accessibility")!.implemented).toBeGreaterThan(0);
  });

  it("caps a dead primary CTA at D", () => {
    const p = profile({
      framework: "nextjs",
      hasAuth: true,
      hasUserData: true,
      files: [
        file("middleware.ts", "export function middleware(){ return auth(); }"),
        file("next.config.ts", "const h = { key: 'Content-Security-Policy', value: \"default-src 'self'\" }; const h2 = 'Strict-Transport-Security'; const h3 = 'X-Frame-Options: DENY'; const h4 = 'nosniff';"),
        file(
          "app/page.tsx",
          "export default function Page(){ return <button className=\"bg-brand\">Start</button> }",
        ),
      ],
    });
    const stations = runChecks(p);
    expect(capReasonOf(stations)).toBe("Dead primary CTA.");
    expect(overallScore(stations)).toBeLessThanOrEqual(54);
  });

  it("keeps the docket to 7 and leads with each failing lane", () => {
    const p = profile({
      framework: "nextjs",
      hasAuth: true,
      hasUserData: true,
      supabaseMigrations: ["CREATE TABLE public.users (id uuid);"],
      files: [
        file("app/page.tsx", "export default function Page(){ return <div onClick={() => {}}>Go</div> }"),
        file("app/api/login/route.ts", "export function POST(){ return null }"),
        file("lib/x.ts", "try { x() } catch (e) {}"),
      ],
    });
    const stations = runChecks(p);
    const docket = docketOf(stations);
    expect(docket.length).toBeLessThanOrEqual(7);
    expect(docket.length).toBeGreaterThan(0);
    const lanes = new Set(docket.slice(0, 3).map((c) => c.station));
    expect(lanes.has("security") || lanes.has("quality") || lanes.has("accessibility")).toBe(true);
    expect(buildRemediationPlan(stations).all.length).toBeLessThanOrEqual(7);
  });

  it("marks header, robots, 404, and div-onClick fixes safe", () => {
    const p = profile({
      framework: "nextjs",
      files: [file("app/page.tsx", "export default function Page(){ return <div onClick={() => go()}>Go</div> }")],
    });
    const checks = runChecks(p).flatMap((s) => s.checks);
    expect(checks.find((c) => c.id === "SEC-033")!.autoFixSafety).toBe("safe");
    expect(checks.find((c) => c.id === "HEAL-006")!.autoFixSafety).toBe("safe");
    expect(checks.find((c) => c.id === "HEAL-007")!.autoFixSafety).toBe("safe");
    expect(checks.find((c) => c.id === "HUM-001")!.autoFixSafety).toBe("safe");
    expect(checks.find((c) => c.id === "HUM-001")!.passed).toBe(false);
  });

  it("excludes a check it cannot see", () => {
    const p = profile();
    const sec = runChecks(p).find((s) => s.station === "security")!;
    const rls = sec.checks.find((c) => c.id === "SEC-003")!;
    expect(rls.confidence).toBe(0);
    expect(rls.passed).toBe(false);
    expect(sec.implemented).toBe(sec.checks.filter((c) => c.confidence > 0 && c.applicable !== false).length);
  });

  it("does not pass web checks on a native tree they cannot read", () => {
    const files = [
      file("scripts/ue/update/probe_blueprint_mcp.mjs", "export const x = 1\n"),
      ...Array.from({ length: 40 }, (_, i) => file(`Source/A${i}.cpp`, "")),
      ...Array.from({ length: 20 }, (_, i) => file(`Source/A${i}.h`, "")),
      file("page.html", "<h1>Hi</h1>"),
    ];
    const p = profile({ framework: "unknown", files });
    const stations = runChecks(p);
    for (const station of ["security", "quality", "accessibility"] as const) {
      const row = stations.find((s) => s.station === station)!;
      expect(row.implemented).toBe(0);
      expect(row.checks.every((c) => c.applicable === false || c.confidence === 0)).toBe(true);
      expect(row.checks.some((c) => c.passed && c.confidence > 0)).toBe(false);
    }
    expect(overallScore(stations)).toBe(0);
    expect(overallScore(stations)).toBeLessThan(70);
    expect(capReasonOf(stations)).toBe("not a product yet.");
  });

  it("still fails a secret it can see in an otherwise unreadable tree", () => {
    const files = [
      file("scripts/probe.mjs", 'const k = "sk-abcdefghijklmnopqrstuvwxyz0123456789"'),
      ...Array.from({ length: 30 }, (_, i) => file(`Source/A${i}.cpp`, "")),
    ];
    const sec = runChecks(profile({ files })).find((s) => s.station === "security")!;
    const secrets = sec.checks.find((c) => c.id === "SEC-001")!;
    expect(secrets.passed).toBe(false);
    expect(secrets.confidence).toBeGreaterThan(0);
    expect(secrets.applicable).not.toBe(false);
    expect(overallScore(runChecks(profile({ files })))).toBeLessThan(70);
  });
});
