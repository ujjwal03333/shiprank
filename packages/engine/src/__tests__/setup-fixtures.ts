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
