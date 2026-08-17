import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, basename, relative } from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import type { CodeProfile, FileInfo, GitCommit, Framework } from "./types";

const execAsync = promisify(exec);

function stripJsonComments(text: string): string {
  // Remove line comments (// ...) and block comments (/* ... */) while
  // preserving strings that contain // or /* (e.g. URLs like https://).
  return text.replace(
    /"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match) => match.startsWith('"') ? match : "",
  );
}

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".nuxt", ".svelte-kit",
  "dist", "build", ".git", ".turbo", "coverage", ".vercel", "__pycache__",
]);

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif", ".svg"]);
// path.extname() returns "" for dotfiles with no further extension (e.g.
// ".gitignore" → ""), so these need an explicit basename allowlist to be
// read as text — otherwise their content silently comes back empty.
const KNOWN_DOTFILES = new Set([
  ".gitignore", ".npmrc", ".nvmrc", ".dockerignore", ".prettierrc", ".eslintignore",
]);
const CONFIG_NAMES = new Set([
  "vercel.json", "netlify.toml", "next.config.ts", "next.config.js",
  "next.config.mjs", "vite.config.ts", "vite.config.js", "nuxt.config.ts",
  "svelte.config.js", "svelte.config.ts", "astro.config.mjs",
  "tailwind.config.ts", "tailwind.config.js", "postcss.config.js",
  "biome.json", ".eslintrc.json", ".eslintrc.js",
]);

async function walkFiles(dir: string, root: string, maxDepth = 6, depth = 0): Promise<FileInfo[]> {
  if (depth > maxDepth) return [];
  const results: FileInfo[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      results.push(...await walkFiles(full, root, maxDepth, depth + 1));
    } else {
      const relPath = relative(root, full);
      const ext = extname(entry.name).toLowerCase();
      let size = 0;
      let content = "";
      let lines = 0;

      try {
        const s = await stat(full);
        size = s.size;

        // Read text content for source, config, SQL, env, and small image files
        const isText =
          SOURCE_EXTS.has(ext) ||
          ext === ".sql" ||
          ext === ".css" ||
          ext === ".json" ||
          ext === ".yaml" ||
          ext === ".yml" ||
          ext === ".toml" ||
          ext === ".md" ||
          ext === ".html" ||
          ext === ".txt" ||
          /^\.env/.test(entry.name) ||
          KNOWN_DOTFILES.has(entry.name);

        if (isText && size < 500_000) {
          const raw = await readFile(full, "utf8");
          const allLines = raw.split("\n");
          lines = allLines.length;
          content = allLines.slice(0, 500).join("\n");
        } else if (IMAGE_EXTS.has(ext)) {
          // Track images by size only, no content read
          lines = 0;
          content = "";
        }
      } catch {
        // unreadable file — include in list with empty content
      }

      results.push({ path: relPath, ext, size, lines, content });
    }
  }
  return results;
}

function detectFramework(files: FileInfo[]): Framework {
  const paths = new Set(files.map(f => f.path));
  const hasNextConfig = files.some(f => /^next\.config\.(ts|js|mjs)$/.test(f.path));
  const hasAppLayout = paths.has("app/layout.tsx") || paths.has("app/layout.jsx") || paths.has("src/app/layout.tsx");
  if (hasNextConfig || hasAppLayout) return "nextjs";

  const hasViteConfig = files.some(f => /^vite\.config\.(ts|js)$/.test(f.path));
  const hasMainTsx = paths.has("src/main.tsx") || paths.has("src/main.jsx") || paths.has("src/main.ts");
  if (hasViteConfig && hasMainTsx) return "vite-react";

  const hasNuxtConfig = files.some(f => /^nuxt\.config\./.test(f.path));
  const hasVueFiles = files.some(f => f.ext === ".vue");
  if (hasNuxtConfig || hasVueFiles) return "vue";

  const hasSvelteConfig = files.some(f => /^svelte\.config\./.test(f.path));
  if (hasSvelteConfig) return "svelte";

  const hasIndexHtml = paths.has("index.html");
  const hasAnyFrameworkConfig = hasNextConfig || hasViteConfig || hasNuxtConfig || hasSvelteConfig;
  if (hasIndexHtml && !hasAnyFrameworkConfig) return "html";

  return "unknown";
}

const AUTH_DEPS = new Set([
  "@supabase/supabase-js", "@supabase/ssr", "@supabase/auth-helpers-nextjs",
  "next-auth", "@auth/core", "@clerk/nextjs", "@clerk/clerk-react",
  "firebase", "@firebase/auth", "lucia", "better-auth",
  "passport", "@kinde-oss/kinde-auth-nextjs",
]);

const DB_DEPS = new Set([
  "@supabase/supabase-js", "prisma", "@prisma/client", "drizzle-orm",
  "mongoose", "typeorm", "knex", "pg", "mysql2", "better-sqlite3",
  "@planetscale/database", "@neondatabase/serverless",
]);

const PAYMENT_DEPS = new Set([
  "stripe", "razorpay", "@lemonsqueezy/lemonsqueezy.js",
  "braintree", "square", "@square/web-sdk",
]);

async function getGitCommits(root: string): Promise<GitCommit[] | null> {
  try {
    const { stdout } = await execAsync(
      `git -C "${root}" log -100 --format="SHIPRANK_COMMIT %H %s" -p --no-merges 2>/dev/null`,
      { maxBuffer: 10 * 1024 * 1024 },
    );
    if (!stdout.trim()) return null;

    const commits: GitCommit[] = [];
    const blocks = stdout.split(/(?=SHIPRANK_COMMIT )/);

    for (const block of blocks) {
      const firstLine = block.split("\n")[0] ?? "";
      const match = firstLine.match(/^SHIPRANK_COMMIT ([a-f0-9]{7,40}) (.+)$/);
      if (!match) continue;
      const hash = match[1] ?? "";
      const message = match[2] ?? "";
      // Grab diff portion (rest of block after first line), truncate to 8KB
      const diff = block.slice(firstLine.length + 1, 8192);
      commits.push({ hash, message, diff });
    }
    return commits.length ? commits : null;
  } catch {
    return null;
  }
}

export async function buildCodeProfile(root: string): Promise<CodeProfile> {
  const files = await walkFiles(root, root);

  // package.json
  let packageJson: Record<string, unknown> | null = null;
  const pkgFile = files.find(f => f.path === "package.json");
  if (pkgFile?.content) {
    try { packageJson = JSON.parse(pkgFile.content); } catch { /* ignore */ }
  }

  const deps: Record<string, string> = {
    ...((packageJson?.dependencies as Record<string, string>) ?? {}),
    ...((packageJson?.devDependencies as Record<string, string>) ?? {}),
  };

  // tsconfig — resolve extends chain to merge compilerOptions
  let tsConfig: Record<string, unknown> | null = null;
  const tsFile = files.find(f => f.path === "tsconfig.json" || f.path === "tsconfig.base.json");
  if (tsFile?.content) {
    try {
      const stripped = stripJsonComments(tsFile.content);
      tsConfig = JSON.parse(stripped);

      // Resolve extends chain (one level deep) to inherit compilerOptions
      const extendsValue = (tsConfig as Record<string, unknown>)["extends"];
      if (typeof extendsValue === "string") {
        let basePath: string;
        if (extendsValue.startsWith(".")) {
          basePath = join(root, extendsValue);
        } else {
          // Package reference (e.g. "@shiprank/tsconfig/base.json") — resolve via node_modules
          try {
            const req = createRequire(join(root, "package.json"));
            basePath = req.resolve(extendsValue);
          } catch {
            basePath = "";
          }
        }
        if (basePath) {
          const baseText = await readFile(basePath, "utf8").catch(() => "");
          if (baseText) {
            try {
              const baseStripped = stripJsonComments(baseText);
              const baseConfig = JSON.parse(baseStripped) as Record<string, unknown>;
              const baseCo = (baseConfig.compilerOptions ?? {}) as Record<string, unknown>;
              const localCo = (tsConfig!.compilerOptions ?? {}) as Record<string, unknown>;
              (tsConfig as Record<string, unknown>).compilerOptions = { ...baseCo, ...localCo };
            } catch { /* ignore base parse errors */ }
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Supabase SQL migrations
  const supabaseMigrations = files
    .filter(f => f.path.includes("supabase/migrations/") && f.ext === ".sql" && f.content)
    .map(f => f.content);

  // API routes (app/api/**/route.ts or pages/api/**)
  const apiRoutes = files
    .filter(f =>
      SOURCE_EXTS.has(f.ext) &&
      (f.path.includes("/api/") || f.path.match(/route\.(ts|tsx|js)$/)),
    )
    .map(f => f.path);

  // Component files
  const components = files
    .filter(f =>
      (f.ext === ".tsx" || f.ext === ".jsx" || f.ext === ".vue" || f.ext === ".svelte") &&
      !f.path.includes("__tests__") &&
      !f.path.includes(".test.") &&
      !f.path.includes(".spec."),
    )
    .map(f => f.path);

  // Test files
  const testFiles = files
    .filter(f =>
      f.path.includes("__tests__") ||
      f.path.includes(".test.") ||
      f.path.includes(".spec."),
    )
    .map(f => f.path);

  // Config files (basename → content). A monorepo can have more than one
  // file with the same basename (e.g. a real app config plus a test
  // fixture) — concatenate on collision instead of letting the last one
  // silently overwrite an earlier, possibly more relevant, match.
  const configFiles: Record<string, string> = {};
  for (const f of files) {
    const name = basename(f.path);
    if (CONFIG_NAMES.has(name) && f.content) {
      configFiles[name] = configFiles[name] ? `${configFiles[name]}\n${f.content}` : f.content;
    }
  }

  // .env.example
  const envExampleFile = files.find(f =>
    /^\.env\.(example|sample|template)$/.test(basename(f.path)),
  );
  const envExample = envExampleFile?.content ?? null;

  // Framework + context detection
  const framework = detectFramework(files);

  const allContent = files.map(f => f.content).join("\n");
  const hasAuth = Object.keys(deps).some(d => AUTH_DEPS.has(d));
  const hasDatabase =
    Object.keys(deps).some(d => DB_DEPS.has(d)) ||
    files.some(f =>
      f.path.startsWith("supabase/") ||
      f.path.includes("prisma/schema") ||
      f.path.includes("drizzle/"),
    );
  const hasPayments = Object.keys(deps).some(d => PAYMENT_DEPS.has(d));
  const hasUserData =
    supabaseMigrations.some(sql =>
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?("?public"?\.)?"?users?"?\s/i.test(sql) ||
      /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?("?public"?\.)?"?profiles?"?\s/i.test(sql),
    ) ||
    /model\s+User\s*\{/i.test(allContent);

  const gitCommits = await getGitCommits(root);

  return {
    root,
    files,
    packageJson,
    dependencies: deps,
    tsConfig,
    supabaseMigrations,
    apiRoutes,
    components,
    testFiles,
    configFiles,
    envExample,
    gitCommits,
    framework,
    hasAuth,
    hasDatabase,
    hasPayments,
    hasUserData,
  };
}
