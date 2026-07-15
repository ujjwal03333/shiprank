import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import type { ProjectContext, FileInventory } from "./types";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
  packageManager?: string;
}

const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".vue",
  ".svelte",
  ".astro",
  ".mjs",
  ".cjs",
]);

const CONFIG_PATTERNS = [
  /^\.env/,
  /config\.(ts|js|mjs|cjs|json)$/,
  /^tsconfig/,
  /^\.eslint/,
  /^\.prettier/,
  /^tailwind/,
  /^postcss/,
  /^vite\.config/,
  /^next\.config/,
  /^nuxt\.config/,
  /^svelte\.config/,
  /^astro\.config/,
  /^remix\.config/,
  /^angular\.json$/,
  /^package\.json$/,
  /^docker-compose/,
  /^Dockerfile$/,
  /\.ya?ml$/,
];

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "dist",
  "build",
  ".git",
  ".turbo",
  "coverage",
  ".vercel",
  "__pycache__",
]);

async function walkFiles(
  dir: string,
  maxDepth: number = 4,
  depth: number = 0,
): Promise<string[]> {
  if (depth > maxDepth) return [];
  const results: string[] = [];

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...(await walkFiles(fullPath, maxDepth, depth + 1)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const AUTH_DEPS = [
  "@supabase/supabase-js",
  "@supabase/auth-helpers-nextjs",
  "@supabase/ssr",
  "next-auth",
  "@auth/core",
  "@clerk/nextjs",
  "@clerk/clerk-react",
  "firebase",
  "firebase-admin",
  "@firebase/auth",
  "passport",
  "lucia",
  "better-auth",
  "@kinde-oss/kinde-auth-nextjs",
];

const DB_DEPS = [
  "@supabase/supabase-js",
  "prisma",
  "@prisma/client",
  "drizzle-orm",
  "mongoose",
  "typeorm",
  "knex",
  "pg",
  "mysql2",
  "better-sqlite3",
  "@planetscale/database",
  "@neondatabase/serverless",
  "firebase-admin",
];

export async function detectContext(
  root: string,
  pkg: PackageJson | null,
): Promise<ProjectContext> {
  const allFiles = await walkFiles(root);
  const fileNames = allFiles.map((f) => f.replace(root + "/", ""));

  const allDeps = {
    ...pkg?.dependencies,
    ...pkg?.devDependencies,
  };

  const hasAuth =
    AUTH_DEPS.some((d) => d in allDeps) ||
    fileNames.some(
      (f) =>
        f.includes("auth") ||
        f.includes("login") ||
        f.includes("signin") ||
        f.includes("sign-in"),
    );

  const hasDatabase =
    DB_DEPS.some((d) => d in allDeps) ||
    fileNames.some(
      (f) =>
        f.includes("prisma/schema") ||
        f.includes("drizzle") ||
        f.includes("migrations"),
    );

  const hasAPI = fileNames.some(
    (f) =>
      f.includes("api/") ||
      f.includes("routes/") ||
      f.includes("server/") ||
      f.match(/route\.(ts|js)$/) !== null,
  );

  const hasTests =
    "vitest" in allDeps ||
    "jest" in allDeps ||
    "@testing-library/react" in allDeps ||
    "cypress" in allDeps ||
    "playwright" in allDeps ||
    fileNames.some(
      (f) =>
        f.includes("__tests__") ||
        f.includes(".test.") ||
        f.includes(".spec."),
    );

  const hasCICD = fileNames.some(
    (f) =>
      f.startsWith(".github/workflows/") ||
      f.startsWith(".gitlab-ci") ||
      f.startsWith(".circleci/") ||
      f.startsWith("Jenkinsfile") ||
      f.includes("vercel.json"),
  );

  const hasDocker = fileNames.some(
    (f) => f === "Dockerfile" || f.startsWith("docker-compose"),
  );

  const hasEnvFile = fileNames.some((f) => /^\.env/.test(f.split("/").pop()!));

  const hasTypeScript =
    "typescript" in allDeps ||
    fileNames.some((f) => f === "tsconfig.json" || f.endsWith(".ts"));

  const hasLinting =
    "eslint" in allDeps ||
    "biome" in allDeps ||
    "@biomejs/biome" in allDeps ||
    fileNames.some((f) => f.includes(".eslint") || f.includes("biome.json"));

  const hasMonorepo =
    fileNames.some(
      (f) =>
        f === "pnpm-workspace.yaml" ||
        f === "turbo.json" ||
        f === "lerna.json" ||
        f === "nx.json",
    ) ||
    !!(
      pkg?.workspaces &&
      (Array.isArray(pkg.workspaces)
        ? pkg.workspaces.length > 0
        : pkg.workspaces.packages?.length > 0)
    );

  let packageManager: ProjectContext["packageManager"] = "unknown";
  if (pkg?.packageManager) {
    const pm = pkg.packageManager.split("@")[0];
    if (pm === "pnpm" || pm === "npm" || pm === "yarn" || pm === "bun") {
      packageManager = pm;
    }
  } else if (fileNames.includes("pnpm-lock.yaml")) {
    packageManager = "pnpm";
  } else if (fileNames.includes("yarn.lock")) {
    packageManager = "yarn";
  } else if (fileNames.includes("bun.lockb") || fileNames.includes("bun.lock")) {
    packageManager = "bun";
  } else if (fileNames.includes("package-lock.json")) {
    packageManager = "npm";
  }

  return {
    hasAuth,
    hasDatabase,
    hasAPI,
    hasTests,
    hasCICD,
    hasDocker,
    hasEnvFile,
    hasTypeScript,
    hasLinting,
    hasMonorepo,
    packageManager,
  };
}

export async function buildFileInventory(
  root: string,
): Promise<FileInventory> {
  const allFiles = await walkFiles(root);
  const relative = allFiles.map((f) => f.replace(root + "/", ""));

  const sourceFiles = relative.filter((f) => SOURCE_EXTS.has(extname(f)));
  const configFiles = relative.filter((f) => {
    const name = f.split("/").pop()!;
    return CONFIG_PATTERNS.some((p) => p.test(name));
  });
  const envFiles = relative.filter((f) => /^\.env/.test(f.split("/").pop()!));

  return {
    totalFiles: relative.length,
    sourceFiles,
    configFiles,
    envFiles,
  };
}
