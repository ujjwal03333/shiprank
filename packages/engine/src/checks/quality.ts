import type { CheckResult, CheckFn } from "./types";

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const TS_EXTS = new Set([".ts", ".tsx"]);
const COMPONENT_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte"]);

function pass(base: Omit<CheckResult, "passed" | "failMessage" | "evidence">): CheckResult {
  return { ...base, passed: true, failMessage: "", evidence: "" };
}

function fail(
  base: Omit<CheckResult, "passed" | "failMessage" | "evidence">,
  failMessage: string,
  evidence: string,
): CheckResult {
  return { ...base, passed: false, failMessage, evidence };
}

// ── QUAL-001: Test coverage ───────────────────────────────────────────────────
const checkQUAL001: CheckFn = (profile) => {
  const isCritical = profile.hasPayments || profile.hasUserData;
  const base = {
    id: "QUAL-001",
    station: "quality" as const,
    severity: isCritical ? "critical" as const : "warning" as const,
    confidence: 90,
    title: "Test coverage present",
    fixPrompt:
      "Add Vitest or Jest tests. Start with the most critical business logic paths. Run: pnpm add -D vitest @vitest/ui",
    fixDifficulty: "moderate" as const,
    fixTime: "2 hrs",
    autoFixSafety: "review" as const,
    scoreWeight: 14,
  };

  if (profile.testFiles.length === 0) {
    return fail(
      base,
      isCritical
        ? "No test files found — critical for apps handling payments or user data."
        : "No test files found.",
      `0 test files detected (no __tests__/, *.test.*, or *.spec.* files).`,
    );
  }

  const sourceFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && !profile.testFiles.includes(f.path),
  );
  if (sourceFiles.length === 0) return pass(base);

  const ratio = profile.testFiles.length / sourceFiles.length;
  if (ratio < 0.1) {
    return fail(
      base,
      `Very low test-to-source ratio: ${profile.testFiles.length} test file(s) for ${sourceFiles.length} source file(s) (${Math.round(ratio * 100)}%).`,
      `Test ratio ${Math.round(ratio * 100)}% — aim for at least 20%.`,
    );
  }

  return pass({
    ...base,
    title: `Test coverage present (${profile.testFiles.length} test files, ${Math.round(ratio * 100)}% ratio)`,
  });
};

// ── QUAL-002: TypeScript strict mode ─────────────────────────────────────────

function stripJsonComments(text: string): string {
  return text.replace(
    /"(?:[^"\\]|\\.)*"|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (match) => match.startsWith('"') ? match : "",
  );
}

function parseTsconfigJson(content: string): Record<string, unknown> | null {
  try {
    return JSON.parse(stripJsonComments(content)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function hasStrictEnabled(profile: { tsConfig: Record<string, unknown> | null; files: Array<{ path: string; ext: string; content: string }> }): boolean {
  if (profile.tsConfig) {
    const co = (profile.tsConfig.compilerOptions ?? {}) as Record<string, unknown>;
    if (co.strict === true) return true;

    const strictFlags = [
      "noImplicitAny", "strictNullChecks", "strictFunctionTypes",
      "strictPropertyInitialization", "strictBindCallApply", "noImplicitThis",
    ];
    if (strictFlags.every(flag => co[flag] === true)) return true;
  }

  const tsconfigFiles = profile.files.filter(f =>
    /tsconfig[^/]*\.json$/.test(f.path) && f.content,
  );
  for (const f of tsconfigFiles) {
    const parsed = parseTsconfigJson(f.content);
    if (!parsed) continue;
    const co = (parsed.compilerOptions ?? {}) as Record<string, unknown>;
    if (co.strict === true) return true;
  }

  const configJsonFiles = profile.files.filter(f =>
    f.ext === ".json" && f.content && /base\.json$/.test(f.path),
  );
  for (const f of configJsonFiles) {
    const parsed = parseTsconfigJson(f.content);
    if (!parsed) continue;
    const co = (parsed.compilerOptions ?? {}) as Record<string, unknown>;
    if (co.strict === true) return true;
  }

  return false;
}

const checkQUAL002: CheckFn = (profile) => {
  const base = {
    id: "QUAL-002",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "TypeScript strict mode enabled",
    fixPrompt:
      'Add "strict": true to compilerOptions in tsconfig.json. Fix any resulting type errors — they reveal real bugs.',
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 12,
  };

  if (!profile.tsConfig) {
    const hasTSFiles = profile.files.some(f => TS_EXTS.has(f.ext));
    if (!hasTSFiles) {
      return pass({ ...base, title: "TypeScript not used (strict mode N/A)" });
    }
    return fail(base, "No tsconfig.json found.", "tsconfig.json missing from project root.");
  }

  if (hasStrictEnabled(profile)) return pass(base);

  return fail(
    base,
    '"strict": true not set in tsconfig.json or its extended configs.',
    `compilerOptions.strict not found in tsconfig chain.`,
  );
};

// ── QUAL-003: Excessive 'any' types ──────────────────────────────────────────
const checkQUAL003: CheckFn = (profile) => {
  const base = {
    id: "QUAL-003",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "No excessive 'any' type usage",
    fixPrompt:
      "Replace 'any' with specific types or 'unknown'. Use type assertions only at system boundaries (external API responses, library interop).",
    fixDifficulty: "moderate" as const,
    fixTime: "1 hr",
    autoFixSafety: "review" as const,
    scoreWeight: 12,
  };

  const testPathSet = new Set(profile.testFiles);
  const tsFiles = profile.files.filter(
    f => TS_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  if (tsFiles.length === 0) {
    return pass({ ...base, title: "No TypeScript source files to check" });
  }

  let anyCount = 0;
  let totalLines = 0;
  const hitFiles: string[] = [];

  for (const file of tsFiles) {
    totalLines += file.lines;
    const matches = (file.content.match(/:\s*any\b|as\s+any\b|Array<any>/g) ?? []).length;
    if (matches > 0) {
      anyCount += matches;
      hitFiles.push(`${file.path} (${matches})`);
    }
  }

  const ratio = totalLines > 0 ? (anyCount / totalLines) * 100 : 0;

  if (anyCount > 10 || ratio > 0.5) {
    return fail(
      base,
      `${anyCount} 'any' type usage(s) found across ${hitFiles.length} file(s).`,
      hitFiles.slice(0, 3).join("; "),
    );
  }

  if (anyCount > 0) {
    return pass({ ...base, title: `Minimal 'any' usage (${anyCount} instance${anyCount > 1 ? "s" : ""} — acceptable)` });
  }

  return pass(base);
};

// ── QUAL-004: Dead exports ────────────────────────────────────────────────────
const checkQUAL004: CheckFn = (profile) => {
  const base = {
    id: "QUAL-004",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 70,
    title: "No dead exports detected",
    fixPrompt:
      "Remove unused exports. Use eslint-plugin-unused-imports or ts-prune to find dead code systematically.",
    fixDifficulty: "moderate" as const,
    fixTime: "30 min",
    autoFixSafety: "review" as const,
    scoreWeight: 11,
  };

  const sourceFiles = profile.files.filter(f => SOURCE_EXTS.has(f.ext) && f.content);
  if (sourceFiles.length < 3) return pass(base);

  const EXPORT_RE = /^export\s+(?:(?:async\s+)?function|const|class|type|interface|enum)\s+([a-z_$][A-Za-z0-9_$]*)/gm;
  const exportedNames: Array<{ name: string; file: string }> = [];

  for (const file of sourceFiles) {
    if (
      file.path.includes("index.") ||
      file.path.includes("__tests__") ||
      file.path.includes(".test.") ||
      file.path.includes(".spec.")
    ) continue;

    for (const m of file.content.matchAll(EXPORT_RE)) {
      exportedNames.push({ name: m[1]!, file: file.path });
    }
  }

  if (exportedNames.length === 0) return pass(base);

  const allContent = sourceFiles.map(f => f.content).join("\n");
  const dead: string[] = [];

  for (const { name, file } of exportedNames) {
    const re = new RegExp(`\\b${name}\\b`, "g");
    const occurrences = (allContent.match(re) ?? []).length;
    if (occurrences <= 1) {
      dead.push(`${name} in ${file}`);
    }
  }

  if (dead.length > 5) {
    return fail(
      base,
      `${dead.length} potentially unused exported symbol(s) detected.`,
      dead.slice(0, 3).join("; "),
    );
  }

  return pass(base);
};

// ── QUAL-005: console.log in production code ──────────────────────────────────
const checkQUAL005: CheckFn = (profile) => {
  const base = {
    id: "QUAL-005",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "No console.log in production code",
    fixPrompt:
      "Replace console.log with a structured logger (pino, winston) or remove debug logs before shipping.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 10,
  };

  const testPathSet = new Set(profile.testFiles);
  const prodFiles = profile.files.filter(
    f =>
      SOURCE_EXTS.has(f.ext) &&
      f.content &&
      !testPathSet.has(f.path) &&
      !/\b(logger|logging|log\.ts|log\.js)\b/i.test(f.path),
  );

  const hitFiles: string[] = [];
  let totalCount = 0;

  for (const file of prodFiles) {
    const matches = file.content.match(/\bconsole\.log\s*\(/g) ?? [];
    if (matches.length > 0) {
      totalCount += matches.length;
      hitFiles.push(`${file.path} (${matches.length}×)`);
    }
  }

  if (hitFiles.length === 0) return pass(base);

  return fail(
    base,
    `${totalCount} console.log call(s) in ${hitFiles.length} production file(s).`,
    hitFiles.slice(0, 3).join("; "),
  );
};

// ── QUAL-006: Error boundaries ────────────────────────────────────────────────
const checkQUAL006: CheckFn = (profile) => {
  const base = {
    id: "QUAL-006",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "Error boundaries present",
    fixPrompt:
      "Add an <ErrorBoundary> around each major section. Use react-error-boundary: pnpm add react-error-boundary",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 9,
  };

  const isReactApp = profile.framework === "nextjs" || profile.framework === "vite-react";
  if (!isReactApp) {
    return pass({ ...base, title: "Error boundary check skipped (non-React framework)" });
  }

  const ERROR_BOUNDARY_PATTERNS = [
    /componentDidCatch/,
    /ErrorBoundary/,
    /error-boundary/,
    /react-error-boundary/,
    /useErrorBoundary/,
  ];

  const allContent = profile.files.map(f => f.content).join("\n");
  if (ERROR_BOUNDARY_PATTERNS.some(p => p.test(allContent))) return pass(base);

  return fail(
    base,
    "No React Error Boundary detected.",
    "No componentDidCatch, ErrorBoundary, or react-error-boundary usage found.",
  );
};

// ── QUAL-007: Loading states ──────────────────────────────────────────────────
const checkQUAL007: CheckFn = (profile) => {
  const base = {
    id: "QUAL-007",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 70,
    title: "Loading states for async operations",
    fixPrompt:
      "Add a loading skeleton or spinner while data loads. Use React Suspense boundaries or a loading boolean from your data-fetching hook.",
    fixDifficulty: "moderate" as const,
    fixTime: "30 min",
    autoFixSafety: "review" as const,
    scoreWeight: 8,
  };

  const isReactApp = profile.framework === "nextjs" || profile.framework === "vite-react";
  if (!isReactApp) {
    return pass({ ...base, title: "Loading state check skipped (non-React framework)" });
  }

  const hasLoadingFiles = profile.files.some(f => /loading\.(tsx|jsx|ts|js)$/.test(f.path));
  if (hasLoadingFiles) return pass(base);

  const FETCH_PATTERNS = [
    /\bfetch\s*\(/,
    /useQuery\s*\(/,
    /useSWR\s*\(/,
    /axios\./,
    /\.from\s*\([^)]+\)\s*\.select\s*\(/,
    /useEffect\s*\(/,
  ];

  const LOADING_PATTERNS = [
    /\bisLoading\b/,
    /\bisPending\b/,
    /\bloadingState\b/,
    /loading\s*[?:]/,
    /Skeleton/,
    /Spinner/,
    /<Suspense/,
    /fallback\s*=/,
  ];

  const testPathSet = new Set(profile.testFiles);
  const componentFiles = profile.files.filter(
    f => COMPONENT_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  let fetchCount = 0;
  let withLoadingCount = 0;

  for (const file of componentFiles) {
    const hasFetch = FETCH_PATTERNS.some(p => p.test(file.content));
    if (!hasFetch) continue;
    fetchCount++;
    if (LOADING_PATTERNS.some(p => p.test(file.content))) withLoadingCount++;
  }

  if (fetchCount === 0) {
    return pass({ ...base, title: "No async data fetching detected (skipped)" });
  }

  const ratio = withLoadingCount / fetchCount;
  if (ratio < 0.5) {
    return fail(
      base,
      `${fetchCount - withLoadingCount}/${fetchCount} data-fetching component(s) appear to lack loading states.`,
      `Only ${Math.round(ratio * 100)}% of fetching components have visible loading patterns.`,
    );
  }

  return pass(base);
};

// ── QUAL-008: Silent error swallowing ─────────────────────────────────────────
const checkQUAL008: CheckFn = (profile) => {
  const base = {
    id: "QUAL-008",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "No silent error swallowing",
    fixPrompt:
      "Never leave catch blocks empty. At minimum log the error with console.error, or rethrow. Swallowed errors hide bugs that surface in production as mysterious failures.",
    fixDifficulty: "moderate" as const,
    fixTime: "30 min",
    autoFixSafety: "review" as const,
    scoreWeight: 8,
  };

  const testPathSet = new Set(profile.testFiles);
  const prodFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  const hitFiles: string[] = [];
  let totalCount = 0;

  // Match `catch {`, `catch (e) {`, `catch (err) {` followed by `}`
  // with at most whitespace/comments between — an empty catch body.
  const EMPTY_CATCH = /catch\s*(?:\([^)]*\))?\s*\{[\s]*\}/g;

  for (const file of prodFiles) {
    const matches = file.content.match(EMPTY_CATCH) ?? [];
    if (matches.length > 0) {
      totalCount += matches.length;
      hitFiles.push(`${file.path} (${matches.length}×)`);
    }
  }

  if (hitFiles.length === 0) return pass(base);

  return fail(
    base,
    `${totalCount} empty catch block(s) in ${hitFiles.length} file(s) — errors silently swallowed.`,
    hitFiles.slice(0, 3).join("; "),
  );
};

// ── QUAL-009: Inconsistent async error handling ───────────────────────────────
const checkQUAL009: CheckFn = (profile) => {
  const base = {
    id: "QUAL-009",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 70,
    title: "Consistent async error handling",
    fixPrompt:
      "Pick one pattern for async error handling: either try/catch or .catch(), and use it consistently. Wrap every await in a try/catch, or chain .catch() on every promise. Mixing patterns makes error flows hard to reason about.",
    fixDifficulty: "moderate" as const,
    fixTime: "1 hr",
    autoFixSafety: "review" as const,
    scoreWeight: 7,
  };

  const testPathSet = new Set(profile.testFiles);
  const prodFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  let tryCatchCount = 0;
  let dotCatchCount = 0;
  const unhandledAwaitFiles: string[] = [];

  const ASYNC_FN = /async\s+(?:function\s+\w+|\([^)]*\)\s*=>|\w+\s*=>|\w+\s*\([^)]*\)\s*\{)/g;
  const AWAIT_RE = /\bawait\b/g;
  const TRY_CATCH_RE = /\btry\s*\{/g;
  const DOT_CATCH_RE = /\.catch\s*\(/g;

  for (const file of prodFiles) {
    const content = file.content;
    const asyncMatches = content.match(ASYNC_FN) ?? [];
    if (asyncMatches.length === 0) continue;

    const awaits = (content.match(AWAIT_RE) ?? []).length;
    const tryCatches = (content.match(TRY_CATCH_RE) ?? []).length;
    const dotCatches = (content.match(DOT_CATCH_RE) ?? []).length;

    tryCatchCount += tryCatches;
    dotCatchCount += dotCatches;

    if (awaits > 0 && tryCatches === 0 && dotCatches === 0) {
      unhandledAwaitFiles.push(`${file.path} (${awaits} await(s), 0 error handlers)`);
    }
  }

  if (unhandledAwaitFiles.length > 2) {
    return fail(
      base,
      `${unhandledAwaitFiles.length} file(s) with async/await but no error handling.`,
      unhandledAwaitFiles.slice(0, 3).join("; "),
    );
  }

  const total = tryCatchCount + dotCatchCount;
  if (total > 5) {
    const minor = Math.min(tryCatchCount, dotCatchCount);
    const major = Math.max(tryCatchCount, dotCatchCount);
    if (minor > 0 && minor / major > 0.3) {
      return fail(
        base,
        `Mixed async error handling: ${tryCatchCount} try/catch and ${dotCatchCount} .catch() — pick one pattern.`,
        `try/catch: ${tryCatchCount}×, .catch(): ${dotCatchCount}×`,
      );
    }
  }

  return pass(base);
};

// ── QUAL-010: Magic numbers/strings ───────────────────────────────────────────
const checkQUAL010: CheckFn = (profile) => {
  const base = {
    id: "QUAL-010",
    station: "quality" as const,
    severity: "info" as const,
    confidence: 65,
    title: "No magic numbers or strings",
    fixPrompt:
      "Extract repeated literal values into named constants. Magic numbers obscure intent and create maintenance burdens when values need to change.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 6,
  };

  const testPathSet = new Set(profile.testFiles);
  const sourceFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  if (sourceFiles.length === 0) return pass(base);

  const SAFE_NUMBERS = new Set([0, 1, 2, 3, 10, 100, 200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 1000, 1024, 3000, 8080]);

  const allContent = sourceFiles.map(f => f.content).join("\n");
  const NUM_RE = /(?<![.\w])(\d{2,})(?![.\w])/g;
  const numCounts = new Map<number, number>();

  for (const m of allContent.matchAll(NUM_RE)) {
    const n = parseInt(m[1]!, 10);
    if (SAFE_NUMBERS.has(n) || isNaN(n)) continue;
    numCounts.set(n, (numCounts.get(n) ?? 0) + 1);
  }

  const magicNums: string[] = [];
  for (const [num, count] of numCounts) {
    if (count >= 3) {
      magicNums.push(`${num} (${count}×)`);
    }
  }

  if (magicNums.length > 5) {
    return fail(
      base,
      `${magicNums.length} magic number(s) repeated 3+ times across source files.`,
      magicNums.slice(0, 3).join("; "),
    );
  }

  return pass(base);
};

// ── QUAL-011: Overly complex functions ────────────────────────────────────────
const checkQUAL011: CheckFn = (profile) => {
  const base = {
    id: "QUAL-011",
    station: "quality" as const,
    severity: "info" as const,
    confidence: 70,
    title: "No overly complex functions",
    fixPrompt:
      "Break large functions into smaller sub-functions. Each function should do one thing. Extract helpers for distinct logic branches.",
    fixDifficulty: "moderate" as const,
    fixTime: "1 hr",
    autoFixSafety: "review" as const,
    scoreWeight: 5,
  };

  const testPathSet = new Set(profile.testFiles);
  const sourceFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  const BRANCH_KEYWORDS = /\b(if|else\s+if|for|while|switch|case|\?\?|&&|\|\||\?)\b/g;
  const FUNC_START = /(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z_$]\w*)\s*=>|(?:async\s+)?(?:function\s*\(|(?:get|set)\s+\w+\s*\())/g;

  const complexFns: string[] = [];
  const LINE_THRESHOLD = 60;
  const BRANCH_THRESHOLD = 15;

  for (const file of sourceFiles) {
    const lines = file.content.split("\n");
    if (lines.length < LINE_THRESHOLD) continue;

    const branchCount = (file.content.match(BRANCH_KEYWORDS) ?? []).length;
    const fnCount = (file.content.match(FUNC_START) ?? []).length || 1;
    const avgBranches = branchCount / fnCount;

    if (avgBranches > BRANCH_THRESHOLD || (lines.length > 500 && avgBranches > 10)) {
      complexFns.push(`${file.path} (avg ${Math.round(avgBranches)} branches/fn, ${lines.length} lines)`);
    }
  }

  if (complexFns.length === 0) return pass(base);

  return fail(
    base,
    `${complexFns.length} file(s) with high cyclomatic complexity.`,
    complexFns.slice(0, 3).join("; "),
  );
};

// ── QUAL-012: Test coverage percentage ────────────────────────────────────────
const checkQUAL012: CheckFn = (profile) => {
  const base = {
    id: "QUAL-012",
    station: "quality" as const,
    severity: "warning" as const,
    confidence: 75,
    title: "Adequate test coverage ratio",
    fixPrompt:
      "Aim for at least 1 test file per 3 source files (33% ratio). Prioritize testing business logic, API routes, and data transformations.",
    fixDifficulty: "moderate" as const,
    fixTime: "2 hrs",
    autoFixSafety: "review" as const,
    scoreWeight: 5,
  };

  const sourceFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && !profile.testFiles.includes(f.path),
  );

  if (sourceFiles.length === 0) return pass(base);
  if (profile.testFiles.length === 0) {
    return fail(base, "No test files — 0% coverage ratio.", "0 test files for " + sourceFiles.length + " source files.");
  }

  const hasCoverageConfig =
    profile.dependencies["@vitest/coverage-v8"] !== undefined ||
    profile.dependencies["@vitest/coverage-istanbul"] !== undefined ||
    profile.dependencies["jest"] !== undefined ||
    profile.files.some(f => /vitest\.config|jest\.config/.test(f.path));

  const ratio = profile.testFiles.length / sourceFiles.length;
  const pct = Math.round(ratio * 100);

  if (hasCoverageConfig) {
    if (ratio < 0.2) {
      return fail(base, `Low test coverage ratio: ${pct}% (${profile.testFiles.length}/${sourceFiles.length}).`, `Coverage tooling configured but only ${pct}% file coverage.`);
    }
    return pass({ ...base, title: `Test coverage ratio ${pct}% with coverage tooling configured` });
  }

  if (ratio < 0.15) {
    return fail(base, `Low test-to-source ratio: ${pct}% (${profile.testFiles.length} test files / ${sourceFiles.length} source files).`, `${pct}% — consider adding a coverage tool like @vitest/coverage-v8.`);
  }

  return pass({ ...base, title: `Test coverage ratio ${pct}%` });
};

// ── QUAL-013: Deeper dead code (unused imports, unreachable code) ─────────────
const checkQUAL013: CheckFn = (profile) => {
  const base = {
    id: "QUAL-013",
    station: "quality" as const,
    severity: "info" as const,
    confidence: 65,
    title: "No dead code detected",
    fixPrompt:
      "Remove unused imports and unreachable code after early returns. Use eslint-plugin-unused-imports for automated cleanup: pnpm add -D eslint-plugin-unused-imports",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 3,
  };

  const testPathSet = new Set(profile.testFiles);
  const sourceFiles = profile.files.filter(
    f => SOURCE_EXTS.has(f.ext) && f.content && !testPathSet.has(f.path),
  );

  if (sourceFiles.length === 0) return pass(base);

  const unusedImportFiles: string[] = [];
  const unreachableFiles: string[] = [];

  for (const file of sourceFiles) {
    const lines = file.content.split("\n");

    const importRe = /^import\s+\{([^}]+)\}\s+from\s+/gm;
    let unusedCount = 0;
    for (const m of file.content.matchAll(importRe)) {
      const names = m[1]!.split(",").map(s => s.trim().split(/\s+as\s+/).pop()!.trim()).filter(Boolean);
      for (const name of names) {
        if (!name) continue;
        const re = new RegExp(`\\b${name}\\b`, "g");
        const occurrences = (file.content.match(re) ?? []).length;
        if (occurrences <= 1) unusedCount++;
      }
    }
    if (unusedCount >= 3) {
      unusedImportFiles.push(`${file.path} (${unusedCount} unused imports)`);
    }

    let afterReturn = 0;
    let returnDepth = -1;
    let depth = 0;
    for (const line of lines) {
      const trimmed = line.trim();

      const opens = (trimmed.match(/\{/g) ?? []).length;
      const closes = (trimmed.match(/\}/g) ?? []).length;
      depth += opens - closes;

      if (returnDepth >= 0) {
        if (depth < returnDepth) {
          returnDepth = -1;
        } else if (depth === returnDepth && trimmed && !trimmed.startsWith("//") && !trimmed.startsWith("*") && trimmed !== "}") {
          if (/^\}\s*(catch|finally|else)\b/.test(trimmed)) {
            returnDepth = -1;
          } else {
            afterReturn++;
          }
        }
      }

      if (/^\s*(return|throw)\s/.test(line) && !/^\s*(if|else|case|switch)/.test(line) && trimmed.endsWith(";")) {
        returnDepth = depth;
      }
    }
    if (afterReturn >= 3) {
      unreachableFiles.push(`${file.path} (~${afterReturn} unreachable lines)`);
    }
  }

  const totalIssues = unusedImportFiles.length + unreachableFiles.length;
  if (totalIssues > 3) {
    const evidence = [...unusedImportFiles.slice(0, 2), ...unreachableFiles.slice(0, 2)].join("; ");
    return fail(
      base,
      `${totalIssues} file(s) with dead code: ${unusedImportFiles.length} with unused imports, ${unreachableFiles.length} with unreachable code.`,
      evidence,
    );
  }

  return pass(base);
};

// ── Export ────────────────────────────────────────────────────────────────────
export const qualityChecks: CheckFn[] = [
  checkQUAL001,
  checkQUAL002,
  checkQUAL003,
  checkQUAL004,
  checkQUAL005,
  checkQUAL006,
  checkQUAL007,
  checkQUAL008,
  checkQUAL009,
  checkQUAL010,
  checkQUAL011,
  checkQUAL012,
  checkQUAL013,
];
