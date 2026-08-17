/**
 * Pure-function tests for the check engine's growth station.
 * No file I/O — CodeProfile is constructed inline.
 */
import { describe, it, expect } from "vitest";
import { growthChecks } from "../checks/growth";
import type { CodeProfile, FileInfo } from "../checks/types";

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

function runGrowth(id: string, profile: CodeProfile) {
  const fn = growthChecks.find(c => c(makeProfile()).id === id);
  if (!fn) throw new Error(`Check ${id} not found`);
  return fn(profile);
}

describe("SEO-002 — Open Graph tags", () => {
  it("FAIL: literal og: tags entirely absent", () => {
    const result = runGrowth("SEO-002", makeProfile({
      files: [file("app/layout.tsx", "export default function Layout() { return null; }")],
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: literal <meta property=\"og:...\"> tags present (non-Next.js apps)", () => {
    const result = runGrowth("SEO-002", makeProfile({
      files: [
        file("app/layout.tsx", [
          '<meta property="og:title" content="My App" />',
          '<meta property="og:description" content="Does things" />',
          '<meta property="og:image" content="/og.png" />',
        ].join("\n")),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("PASS: Next.js Metadata API with openGraph block, inherited title/description, and opengraph-image.tsx file convention", () => {
    // Regression: the check used to only look for the literal strings
    // "og:title" / "og:description" / "og:image" — it never recognized the
    // Next.js Metadata API, which is the standard way Next.js apps
    // configure Open Graph (and auto-populates og:title/og:description from
    // the top-level title/description when not overridden in openGraph).
    const result = runGrowth("SEO-002", makeProfile({
      files: [
        file("app/layout.tsx", [
          "export const metadata: Metadata = {",
          '  title: "My App",',
          '  description: "Does things",',
          "  openGraph: {",
          '    siteName: "My App",',
          '    type: "website",',
          "  },",
          "};",
        ].join("\n")),
        file("app/opengraph-image.tsx", "export default function Image() { return null; }"),
      ],
    }));
    expect(result.passed).toBe(true);
  });

  it("FAIL: Next.js Metadata API with openGraph block but no title/description anywhere and no image convention", () => {
    const result = runGrowth("SEO-002", makeProfile({
      files: [
        file("app/layout.tsx", [
          "export const metadata: Metadata = {",
          "  openGraph: {",
          '    siteName: "My App",',
          "  },",
          "};",
        ].join("\n")),
      ],
    }));
    expect(result.passed).toBe(false);
  });

  it("PASS: openGraph.images set explicitly (no file convention needed)", () => {
    const result = runGrowth("SEO-002", makeProfile({
      files: [
        file("app/layout.tsx", [
          "export const metadata: Metadata = {",
          '  title: "My App",',
          '  description: "Does things",',
          "  openGraph: {",
          '    images: [{ url: "/og.png" }],',
          "  },",
          "};",
        ].join("\n")),
      ],
    }));
    expect(result.passed).toBe(true);
  });
});
