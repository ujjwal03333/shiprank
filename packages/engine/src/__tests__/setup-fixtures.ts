import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FIXTURE_ROOT = join(tmpdir(), "shiprank-test-fixtures");

export function fixtureDir(name: string): string {
  return join(FIXTURE_ROOT, name);
}

export function cleanFixtures(): void {
  rmSync(FIXTURE_ROOT, { recursive: true, force: true });
}

const PROFILER_FIXTURE_NAMES = ["nextjs-app", "vite-app", "remix-app", "empty-project", "monorepo"];
const SANITY_FIXTURE_NAMES = [
  "supabase-dep",
  "supabase-folder",
  "clerk-app",
  "next-auth-app",
  "auth-js-app",
  "supabase-auth-helpers",
  "no-auth-no-db",
];

export function cleanProfilerFixtures(): void {
  for (const name of PROFILER_FIXTURE_NAMES) {
    rmSync(fixtureDir(name), { recursive: true, force: true });
  }
}

export function cleanSanityFixtures(): void {
  for (const name of SANITY_FIXTURE_NAMES) {
    rmSync(fixtureDir(name), { recursive: true, force: true });
  }
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function writeText(path: string, text: string): void {
  writeFileSync(path, text);
}

export function createNextjsFixture(): string {
  const root = fixtureDir("nextjs-app");
  ensureDir(join(root, "app"));
  ensureDir(join(root, "app", "api", "hello"));
  ensureDir(join(root, ".github", "workflows"));
  ensureDir(join(root, "app", "login"));

  writeJson(join(root, "package.json"), {
    name: "test-nextjs",
    dependencies: {
      next: "14.2.0",
      react: "18.3.0",
      "react-dom": "18.3.0",
      "@supabase/supabase-js": "2.45.0",
      "@supabase/ssr": "0.5.0",
    },
    devDependencies: {
      typescript: "5.6.0",
      eslint: "9.0.0",
      vitest: "2.0.0",
    },
    packageManager: "pnpm@9.0.0",
  });

  writeText(join(root, "next.config.ts"), "export default {}");
  writeText(join(root, "tsconfig.json"), "{}");
  writeText(
    join(root, "app", "layout.tsx"),
    'export default function Layout({ children }: { children: React.ReactNode }) { return <html><body>{children}</body></html> }',
  );
  writeText(join(root, "app", "page.tsx"), "export default function Page() { return <h1>Hello</h1> }");
  writeText(
    join(root, "app", "api", "hello", "route.ts"),
    "export function GET() { return Response.json({ ok: true }) }",
  );
  writeText(join(root, "app", "login", "page.tsx"), "export default function Login() { return <form /> }");
  writeText(join(root, ".env.local"), "NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co");
  writeText(join(root, ".github", "workflows", "ci.yml"), "name: CI");
  writeText(join(root, ".eslintrc.json"), "{}");

  return root;
}

export function createViteFixture(): string {
  const root = fixtureDir("vite-app");
  ensureDir(join(root, "src"));

  writeJson(join(root, "package.json"), {
    name: "test-vite",
    dependencies: {
      react: "18.3.0",
      "react-dom": "18.3.0",
    },
    devDependencies: {
      vite: "6.0.0",
      typescript: "5.6.0",
    },
  });

  writeText(join(root, "vite.config.ts"), "export default {}");
  writeText(join(root, "index.html"), "<!DOCTYPE html><html></html>");
  writeText(join(root, "tsconfig.json"), "{}");
  writeText(join(root, "src", "App.tsx"), "export default function App() { return <div /> }");
  writeText(join(root, "package-lock.json"), "{}");

  return root;
}

export function createRemixFixture(): string {
  const root = fixtureDir("remix-app");
  ensureDir(join(root, "app", "routes"));

  writeJson(join(root, "package.json"), {
    name: "test-remix",
    dependencies: {
      "@remix-run/react": "2.15.0",
      "@remix-run/node": "2.15.0",
      react: "18.3.0",
    },
    devDependencies: {
      typescript: "5.6.0",
    },
  });

  writeText(join(root, "remix.config.js"), "module.exports = {}");
  writeText(join(root, "tsconfig.json"), "{}");
  writeText(join(root, "app", "root.tsx"), "export default function Root() {}");
  writeText(join(root, "app", "routes", "_index.tsx"), "export default function Index() {}");
  writeText(join(root, "yarn.lock"), "");

  return root;
}

export function createEmptyFixture(): string {
  const root = fixtureDir("empty-project");
  ensureDir(root);
  return root;
}

// ── Sanity-check fixtures for hasDatabase / hasAuth ─────────────────────────

/** Project that has @supabase/supabase-js in deps */
export function createSupabaseDepFixture(): string {
  const root = fixtureDir("supabase-dep");
  ensureDir(root);
  writeJson(join(root, "package.json"), {
    name: "supabase-dep-project",
    dependencies: { "@supabase/supabase-js": "2.45.0" },
  });
  return root;
}

/** Project that has a supabase/ folder but NO dep */
export function createSupabaseFolderFixture(): string {
  const root = fixtureDir("supabase-folder");
  ensureDir(join(root, "supabase", "migrations"));
  writeJson(join(root, "package.json"), { name: "supabase-folder-project" });
  writeText(join(root, "supabase", "migrations", "001_init.sql"), "select 1;");
  return root;
}

/** Project with @clerk/nextjs */
export function createClerkFixture(): string {
  const root = fixtureDir("clerk-app");
  ensureDir(root);
  writeJson(join(root, "package.json"), {
    name: "clerk-app",
    dependencies: { "@clerk/nextjs": "5.3.0", next: "14.2.0" },
  });
  return root;
}

/** Project with next-auth */
export function createNextAuthFixture(): string {
  const root = fixtureDir("next-auth-app");
  ensureDir(root);
  writeJson(join(root, "package.json"), {
    name: "next-auth-app",
    dependencies: { "next-auth": "4.24.0", next: "14.2.0" },
  });
  return root;
}

/** Project with @auth/core (Auth.js v5) */
export function createAuthJsFixture(): string {
  const root = fixtureDir("auth-js-app");
  ensureDir(root);
  writeJson(join(root, "package.json"), {
    name: "auth-js-app",
    dependencies: { "@auth/core": "0.32.0", next: "14.2.0" },
  });
  return root;
}

/** Project with @supabase/auth-helpers-nextjs */
export function createSupabaseAuthHelpersFixture(): string {
  const root = fixtureDir("supabase-auth-helpers");
  ensureDir(root);
  writeJson(join(root, "package.json"), {
    name: "supabase-auth-helpers",
    dependencies: {
      "@supabase/auth-helpers-nextjs": "0.10.0",
      next: "14.2.0",
    },
  });
  return root;
}

/** Project with no auth or database at all */
export function createNoAuthNoDbFixture(): string {
  const root = fixtureDir("no-auth-no-db");
  ensureDir(root);
  writeJson(join(root, "package.json"), {
    name: "plain-app",
    dependencies: { react: "18.3.0" },
  });
  return root;
}

export function createMonorepoFixture(): string {
  const root = fixtureDir("monorepo");
  ensureDir(join(root, "apps", "web"));
  ensureDir(join(root, "packages", "ui"));

  writeJson(join(root, "package.json"), {
    name: "test-monorepo",
    private: true,
    workspaces: ["apps/*", "packages/*"],
    packageManager: "pnpm@9.0.0",
  });

  writeText(join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n  - "packages/*"');
  writeText(join(root, "turbo.json"), "{}");

  writeJson(join(root, "apps", "web", "package.json"), {
    name: "web",
    dependencies: { next: "14.2.0", react: "18.3.0" },
    devDependencies: { typescript: "5.6.0" },
  });

  writeText(join(root, "pnpm-lock.yaml"), "lockfileVersion: 9.0");

  return root;
}
