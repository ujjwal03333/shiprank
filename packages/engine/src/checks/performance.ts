import type { CheckResult, CheckFn, CodeProfile } from "./types";

function stub(
  id: string, weight: number, severity: CheckResult["severity"],
  title: string, failMessage: string, fixPrompt: string,
  fixDifficulty: CheckResult["fixDifficulty"], fixTime: string,
  autoFixSafety: CheckResult["autoFixSafety"],
): CheckFn {
  return () => ({
    id, station: "performance" as const, passed: true, severity,
    confidence: 0, title, failMessage, evidence: "", fixPrompt,
    fixDifficulty, fixTime, autoFixSafety, scoreWeight: weight,
  });
}

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"]);
const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);

// ── PERF-001: Oversized images ────────────────────────────────────────────────
const checkPERF001: CheckFn = (profile) => {
  const base = {
    id: "PERF-001",
    station: "performance" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "No oversized images in public/",
    fixPrompt:
      "Convert images to WebP (cwebp -q 80 image.png -o image.webp) and compress to under 200KB. Use next/image for automatic optimisation and lazy loading.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 18,
  };

  const oversized = profile.files.filter(f =>
    f.path.startsWith("public/") &&
    IMAGE_EXTS.has(f.ext) &&
    f.size > 512_000, // 500KB
  );

  if (oversized.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `${oversized.length} image(s) over 500KB: ${oversized[0]!.path} (${Math.round(oversized[0]!.size / 1024)}KB)`,
    evidence: oversized.map(f => `${f.path} (${Math.round(f.size / 1024)}KB)`).slice(0, 3).join(", "),
  };
};

// ── PERF-002: Giant bundle imports ────────────────────────────────────────────
const HEAVY_IMPORTS: Array<{ re: RegExp; label: string; fix: string }> = [
  {
    re: /import\s+_\s+from\s+['"]lodash['"]/,
    label: "import _ from 'lodash' (full bundle)",
    fix: "import debounce from 'lodash/debounce' — import only what you need.",
  },
  {
    re: /import\s+moment\s+from\s+['"]moment['"]/,
    label: "import moment (330KB)",
    fix: "Replace moment with date-fns: import { format } from 'date-fns'",
  },
  {
    re: /import\s+\*\s+as\s+icons\s+from\s+['"]@heroicons/,
    label: "Wildcard heroicons import",
    fix: "Import only the icons you use: import { BeakerIcon } from '@heroicons/react/24/solid'",
  },
  {
    re: /from\s+['"]react-icons['"]$/m,
    label: "react-icons barrel import",
    fix: "Import from sub-packages: import { FiUser } from 'react-icons/fi'",
  },
];

const checkPERF002: CheckFn = (profile) => {
  const base = {
    id: "PERF-002",
    station: "performance" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "No full-library barrel imports",
    fixPrompt:
      "Replace barrel imports with per-function imports. Example: import { debounce } from 'lodash/debounce' instead of import _ from 'lodash'.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 16,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext) || !file.content) continue;
    for (const { re, label } of HEAVY_IMPORTS) {
      if (re.test(file.content)) hits.push(`${label} in ${file.path}`);
    }
  }

  if (hits.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `${hits.length} heavy barrel import(s) found.`,
    evidence: hits.slice(0, 3).join("; "),
  };
};

// ── PERF-003: No lazy loading ─────────────────────────────────────────────────
const LAZY_RE = /React\.lazy|dynamic\s*\(|import\s*\(/;

const checkPERF003: CheckFn = (profile) => {
  const base = {
    id: "PERF-003",
    station: "performance" as const,
    severity: "warning" as const,
    confidence: 70,
    title: "Code-splitting / lazy loading in use",
    fixPrompt:
      "Use dynamic imports for heavy below-fold components: const Chart = dynamic(() => import('./Chart'), { ssr: false, loading: () => <Skeleton /> })",
    fixDifficulty: "moderate" as const,
    fixTime: "30 min",
    autoFixSafety: "review" as const,
    scoreWeight: 14,
  };

  // If the project is small (few components), lazy loading is less critical
  if (profile.components.length < 5) {
    return { ...base, passed: true, failMessage: "", evidence: "", confidence: 60 };
  }

  const hasLazy = profile.files.some(f =>
    SOURCE_EXTS.has(f.ext) && f.content && LAZY_RE.test(f.content),
  );

  if (hasLazy) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `${profile.components.length} components but no React.lazy or dynamic() found.`,
    evidence: "No lazy loading detected",
  };
};

// ── PERF-004: No pagination on data fetches ───────────────────────────────────
// Detect .select() / .findMany() / .find() without .limit() / .range() / take
const UNBOUNDED_FETCH_RE = /\.(?:select|findMany|find|getAll)\s*\([^)]*\)(?!\s*\.(?:limit|range|take|skip|paginate))/;

const checkPERF004: CheckFn = (profile) => {
  const base = {
    id: "PERF-004",
    station: "performance" as const,
    severity: "warning" as const,
    confidence: 70,
    title: "Data fetches use pagination",
    fixPrompt:
      "Add .limit() or .range() to all database queries: supabase.from('posts').select('*').range(0, 24). Never fetch unbounded lists in production.",
    fixDifficulty: "moderate" as const,
    fixTime: "30 min",
    autoFixSafety: "review" as const,
    scoreWeight: 12,
  };

  if (!profile.hasDatabase) {
    return { ...base, passed: true, failMessage: "", evidence: "", confidence: 60 };
  }

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext) || !file.content) continue;
    if (UNBOUNDED_FETCH_RE.test(file.content)) hits.push(file.path);
  }

  if (hits.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `${hits.length} file(s) with potentially unbounded data fetches.`,
    evidence: hits.slice(0, 3).join(", "),
  };
};

// ── PERF-005: useEffect without dependency array ──────────────────────────────
// Matches useEffect(something) with no second argument — not useEffect(fn, [deps])
const USE_EFFECT_NO_DEPS = /useEffect\s*\(\s*(?:async\s*)?\(\s*\)\s*=>\s*\{[\s\S]*?\},?\s*\)/g;

const checkPERF005: CheckFn = (profile) => {
  const base = {
    id: "PERF-005",
    station: "performance" as const,
    severity: "warning" as const,
    confidence: 75,
    title: "useEffect calls have dependency arrays",
    fixPrompt:
      "Add a dependency array to useEffect: useEffect(() => { ... }, [dep1, dep2]). An empty array [] means 'run once on mount'. Missing the array means 'run on every render'.",
    fixDifficulty: "moderate" as const,
    fixTime: "15 min",
    autoFixSafety: "review" as const,
    scoreWeight: 10,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!(file.ext === ".tsx" || file.ext === ".jsx" || file.ext === ".ts" || file.ext === ".js")) continue;
    if (!file.content) continue;
    // Detect useEffect( without a second argument by checking for useEffect(\nfn\n) with no ,[]
    const matches = [...file.content.matchAll(/useEffect\s*\(\s*(?:async\s*)?\(\s*\)\s*=>/g)];
    for (const m of matches) {
      // Get the text from this match onwards to check for closing ), deps
      const rest = file.content.slice(m.index!);
      // Naive check: if the first closing paren group is not followed by , [
      if (/^useEffect\s*\([^)]+\)\s*[;{]/.test(rest) === false) {
        // Check if useEffect call block has a dependency array
        if (!/useEffect\s*\([\s\S]{1,300}?,\s*\[/.test(rest.slice(0, 400))) {
          hits.push(file.path);
          break;
        }
      }
    }
  }

  if (hits.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `Possible useEffect without dependency array in ${hits.length} file(s) — triggers on every render.`,
    evidence: hits.slice(0, 3).join(", "),
  };
};

// ── PERF-006: No debounce on search inputs ────────────────────────────────────
const SEARCH_INPUT_RE = /(?:search|query|filter).*onChange|onChange.*(?:search|query|filter)/i;
const DEBOUNCE_RE = /debounce|useDebounce|useDeferredValue|startTransition/;

const checkPERF006: CheckFn = (profile) => {
  const base = {
    id: "PERF-006",
    station: "performance" as const,
    severity: "warning" as const,
    confidence: 70,
    title: "Search inputs use debouncing",
    fixPrompt:
      "Wrap search handlers with debounce: const debouncedSearch = useMemo(() => debounce(handleSearch, 300), []). Or use React 18's useDeferredValue for built-in concurrent debouncing.",
    fixDifficulty: "moderate" as const,
    fixTime: "15 min",
    autoFixSafety: "review" as const,
    scoreWeight: 8,
  };

  const hasSearch = profile.files.some(f =>
    (f.ext === ".tsx" || f.ext === ".jsx") && f.content && SEARCH_INPUT_RE.test(f.content),
  );

  if (!hasSearch) return { ...base, passed: true, failMessage: "", evidence: "", confidence: 60 };

  const hasDebounce = profile.files.some(f =>
    SOURCE_EXTS.has(f.ext) && f.content && DEBOUNCE_RE.test(f.content),
  );

  if (hasDebounce) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: "Search input onChange found without debounce — fires an API call on every keystroke.",
    evidence: "SEARCH_INPUT_RE matched but no debounce found",
  };
};

// ── Wave 2 stubs ──────────────────────────────────────────────────────────────
const checkPERF007 = stub("PERF-007", 7, "warning", "Route-level code splitting", "All page routes share a single bundle.", "Use Next.js App Router or React.lazy for automatic per-route splitting.", "moderate", "1 hr", "review");
const checkPERF008 = stub("PERF-008", 5, "warning", "No large client-side data filtering", "Fetching all records then filtering client-side.", "Move filtering to the database query (WHERE clause) to avoid large payloads.", "moderate", "1 hr", "review");
const checkPERF009 = stub("PERF-009", 3, "info", "SVG files are optimised", "Raw unoptimised SVGs included in the project.", "Run svgo on SVG files to reduce size by 30-60%.", "copy-paste", "5 min", "safe");
const checkPERF010 = stub("PERF-010", 2, "info", "Database connection pooling", "New DB connection created per request.", "Use a connection pooler (Supabase Pooler, PgBouncer) to reuse connections across serverless invocations.", "architectural", "2 hrs", "review");

export const performanceChecks: CheckFn[] = [
  checkPERF001, checkPERF002, checkPERF003, checkPERF004,
  checkPERF005, checkPERF006, checkPERF007, checkPERF008,
  checkPERF009, checkPERF010,
];
