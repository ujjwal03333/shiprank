import { describe, it, expect, afterAll } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scanProject } from "../scanner.js";

const FIXTURE_ROOT = join(tmpdir(), "shiprank-cli-test");

function makeNextjsFixture(): string {
  const root = join(FIXTURE_ROOT, "nextjs-app");
  mkdirSync(join(root, "app", "api", "hello"), { recursive: true });
  mkdirSync(join(root, "app", "login"), { recursive: true });

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "cli-test-app",
      dependencies: {
        next: "14.2.0",
        react: "18.3.0",
        "@supabase/supabase-js": "2.45.0",
        stripe: "16.0.0",
        zod: "3.23.0",
      },
      devDependencies: { typescript: "5.6.0" },
    }),
  );
  writeFileSync(join(root, "next.config.ts"), "export default {}");
  writeFileSync(join(root, "tsconfig.json"), "{}");
  writeFileSync(
    join(root, "app", "layout.tsx"),
    'export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html> }',
  );
  writeFileSync(
    join(root, "app", "page.tsx"),
    "export default function Page() { return <h1>Hello</h1> }",
  );
  writeFileSync(
    join(root, "app", "api", "hello", "route.ts"),
    "export function GET() { return Response.json({ ok: true }) }",
  );
  writeFileSync(
    join(root, "app", "login", "page.tsx"),
    "export default function Login() { return <form /> }",
  );

  return root;
}

afterAll(() => {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
});

describe("scanProject()", () => {
  it("returns a ScanResult with required shape", async () => {
    const root = makeNextjsFixture();
    const result = await scanProject(root);

    expect(result.projectName).toBe("cli-test-app");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D", "F"]).toContain(result.grade);
    expect(result.framework).toBe("nextjs");
    expect(result.stations.length).toBeGreaterThan(0);
    expect(result.fileCount).toBeGreaterThan(0);
    expect(result.depCount).toBeGreaterThan(0);
  });

  it("computes grade consistent with score", async () => {
    const root = makeNextjsFixture();
    const result = await scanProject(root);
    const { score, grade } = result;

    if (score >= 90) expect(grade).toBe("A");
    else if (score >= 75) expect(grade).toBe("B");
    else if (score >= 60) expect(grade).toBe("C");
    else if (score >= 45) expect(grade).toBe("D");
    else expect(grade).toBe("F");
  });

  it("fingerprint detects platform", async () => {
    const root = makeNextjsFixture();
    const result = await scanProject(root);
    expect(result.fingerprint.platform.platform).toBeDefined();
  });

  it("remediation top3 entries have positive scoreGain", async () => {
    const root = makeNextjsFixture();
    const result = await scanProject(root);
    for (const item of result.remediation.top3) {
      expect(item.scoreGain).toBeGreaterThan(0);
    }
  });
});
