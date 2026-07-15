import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FrameworkInfo, FrameworkName } from "./types";

interface FrameworkSignal {
  framework: FrameworkName;
  signal: string;
  weight: number;
  check: (root: string, pkg: PackageJson | null) => Promise<boolean> | boolean;
}

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export async function readPackageJson(
  root: string,
): Promise<PackageJson | null> {
  try {
    const raw = await readFile(join(root, "package.json"), "utf-8");
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

function hasDep(pkg: PackageJson | null, name: string): boolean {
  if (!pkg) return false;
  return !!(pkg.dependencies?.[name] ?? pkg.devDependencies?.[name]);
}

function depVersion(pkg: PackageJson | null, name: string): string | null {
  if (!pkg) return null;
  return pkg.dependencies?.[name] ?? pkg.devDependencies?.[name] ?? null;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

const SIGNALS: FrameworkSignal[] = [
  // Next.js
  {
    framework: "nextjs",
    signal: "next in dependencies",
    weight: 40,
    check: (_r, pkg) => hasDep(pkg, "next"),
  },
  {
    framework: "nextjs",
    signal: "next.config file present",
    weight: 30,
    check: async (r) =>
      (await fileExists(join(r, "next.config.ts"))) ||
      (await fileExists(join(r, "next.config.js"))) ||
      (await fileExists(join(r, "next.config.mjs"))),
  },
  {
    framework: "nextjs",
    signal: "app/ directory (App Router)",
    weight: 20,
    check: async (r) =>
      (await fileExists(join(r, "app", "layout.tsx"))) ||
      (await fileExists(join(r, "app", "layout.js"))),
  },
  {
    framework: "nextjs",
    signal: "pages/ directory (Pages Router)",
    weight: 15,
    check: async (r) =>
      (await fileExists(join(r, "pages", "_app.tsx"))) ||
      (await fileExists(join(r, "pages", "_app.js"))),
  },

  // Remix
  {
    framework: "remix",
    signal: "@remix-run/react in dependencies",
    weight: 40,
    check: (_r, pkg) => hasDep(pkg, "@remix-run/react"),
  },
  {
    framework: "remix",
    signal: "remix.config file present",
    weight: 30,
    check: async (r) =>
      (await fileExists(join(r, "remix.config.ts"))) ||
      (await fileExists(join(r, "remix.config.js"))),
  },

  // Vite (plain, not via another framework)
  {
    framework: "vite",
    signal: "vite in dependencies",
    weight: 30,
    check: (_r, pkg) => hasDep(pkg, "vite"),
  },
  {
    framework: "vite",
    signal: "vite.config file present",
    weight: 30,
    check: async (r) =>
      (await fileExists(join(r, "vite.config.ts"))) ||
      (await fileExists(join(r, "vite.config.js"))),
  },
  {
    framework: "vite",
    signal: "index.html in root (SPA entry)",
    weight: 15,
    check: async (r) => fileExists(join(r, "index.html")),
  },

  // Create React App
  {
    framework: "cra",
    signal: "react-scripts in dependencies",
    weight: 50,
    check: (_r, pkg) => hasDep(pkg, "react-scripts"),
  },

  // Astro
  {
    framework: "astro",
    signal: "astro in dependencies",
    weight: 40,
    check: (_r, pkg) => hasDep(pkg, "astro"),
  },
  {
    framework: "astro",
    signal: "astro.config file present",
    weight: 30,
    check: async (r) =>
      (await fileExists(join(r, "astro.config.ts"))) ||
      (await fileExists(join(r, "astro.config.mjs"))),
  },

  // Nuxt
  {
    framework: "nuxt",
    signal: "nuxt in dependencies",
    weight: 40,
    check: (_r, pkg) => hasDep(pkg, "nuxt"),
  },
  {
    framework: "nuxt",
    signal: "nuxt.config file present",
    weight: 30,
    check: async (r) =>
      (await fileExists(join(r, "nuxt.config.ts"))) ||
      (await fileExists(join(r, "nuxt.config.js"))),
  },

  // SvelteKit
  {
    framework: "sveltekit",
    signal: "@sveltejs/kit in dependencies",
    weight: 40,
    check: (_r, pkg) => hasDep(pkg, "@sveltejs/kit"),
  },
  {
    framework: "sveltekit",
    signal: "svelte.config file present",
    weight: 30,
    check: async (r) =>
      (await fileExists(join(r, "svelte.config.js"))) ||
      (await fileExists(join(r, "svelte.config.ts"))),
  },

  // Angular
  {
    framework: "angular",
    signal: "@angular/core in dependencies",
    weight: 40,
    check: (_r, pkg) => hasDep(pkg, "@angular/core"),
  },
  {
    framework: "angular",
    signal: "angular.json present",
    weight: 30,
    check: async (r) => fileExists(join(r, "angular.json")),
  },

  // Gatsby
  {
    framework: "gatsby",
    signal: "gatsby in dependencies",
    weight: 40,
    check: (_r, pkg) => hasDep(pkg, "gatsby"),
  },
  {
    framework: "gatsby",
    signal: "gatsby-config file present",
    weight: 30,
    check: async (r) =>
      (await fileExists(join(r, "gatsby-config.ts"))) ||
      (await fileExists(join(r, "gatsby-config.js"))),
  },

  // Express (standalone backend)
  {
    framework: "express",
    signal: "express in dependencies",
    weight: 30,
    check: (_r, pkg) => hasDep(pkg, "express"),
  },
];

export async function detectFramework(root: string): Promise<FrameworkInfo> {
  const pkg = await readPackageJson(root);
  const scores = new Map<FrameworkName, { total: number; signals: string[] }>();

  for (const s of SIGNALS) {
    const matched = await s.check(root, pkg);
    if (!matched) continue;

    const entry = scores.get(s.framework) ?? { total: 0, signals: [] };
    entry.total += s.weight;
    entry.signals.push(s.signal);
    scores.set(s.framework, entry);
  }

  // Vite is often a sub-dependency of other frameworks — only count it
  // if no higher-level framework matched with a better score.
  const viteScore = scores.get("vite");
  if (viteScore) {
    for (const [fw, entry] of scores) {
      if (fw !== "vite" && fw !== "unknown" && entry.total > viteScore.total) {
        scores.delete("vite");
        break;
      }
    }
  }

  let best: FrameworkName = "unknown";
  let bestScore = 0;
  let bestSignals: string[] = [];

  for (const [fw, entry] of scores) {
    if (entry.total > bestScore) {
      best = fw;
      bestScore = entry.total;
      bestSignals = entry.signals;
    }
  }

  const maxPossible = SIGNALS.filter((s) => s.framework === best).reduce(
    (sum, s) => sum + s.weight,
    0,
  );
  const confidence =
    maxPossible > 0 ? Math.min(bestScore / maxPossible, 1) : 0;

  let version: string | null = null;
  if (best === "nextjs") version = depVersion(pkg, "next");
  else if (best === "vite") version = depVersion(pkg, "vite");
  else if (best === "remix") version = depVersion(pkg, "@remix-run/react");
  else if (best === "astro") version = depVersion(pkg, "astro");
  else if (best === "nuxt") version = depVersion(pkg, "nuxt");
  else if (best === "sveltekit") version = depVersion(pkg, "@sveltejs/kit");
  else if (best === "angular") version = depVersion(pkg, "@angular/core");
  else if (best === "gatsby") version = depVersion(pkg, "gatsby");
  else if (best === "cra") version = depVersion(pkg, "react-scripts");
  else if (best === "express") version = depVersion(pkg, "express");

  return { name: best, version, confidence, signals: bestSignals };
}
