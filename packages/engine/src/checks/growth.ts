import type { CheckResult, CheckFn, CodeProfile } from "./types";

const JSX_EXTS = new Set([".tsx", ".jsx", ".html"]);

function pass(base: Omit<CheckResult, "passed" | "failMessage" | "evidence">): CheckResult {
  return { ...base, passed: true, failMessage: "", evidence: "" };
}
function fail(base: Omit<CheckResult, "passed" | "failMessage" | "evidence">, failMessage: string, evidence: string): CheckResult {
  return { ...base, passed: false, failMessage, evidence };
}

// ── SEO-001: Missing favicon ──────────────────────────────────────────────────
const checkSEO001: CheckFn = (profile) => {
  const base = {
    id: "SEO-001",
    station: "growth" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "Favicon present",
    fixPrompt:
      "Add a favicon.ico or favicon.svg to public/. In Next.js App Router, export a generateMetadata() with icons: { icon: '/favicon.ico' } in layout.tsx.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 16,
  };

  const hasFavicon =
    profile.files.some(f =>
      f.path === "public/favicon.ico" ||
      f.path === "public/favicon.svg" ||
      f.path === "public/favicon.png",
    ) ||
    profile.files.some(f =>
      (f.ext === ".tsx" || f.ext === ".ts" || f.ext === ".html") &&
      f.content &&
      /favicon|rel\s*=\s*['"]icon['"]/.test(f.content),
    );

  return hasFavicon ? pass(base) : fail(base, "No favicon found in public/ or layout files.", "No favicon.ico or icon link tag");
};

// ── SEO-002: Missing Open Graph tags ─────────────────────────────────────────
const OG_TAGS = ["og:title", "og:description", "og:image"];

const checkSEO002: CheckFn = (profile) => {
  const base = {
    id: "SEO-002",
    station: "growth" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "Open Graph tags configured",
    fixPrompt:
      "Add OG tags in layout.tsx: export const metadata = { openGraph: { title: 'Your App', description: '...', images: [{ url: '/og.png' }] } }; Or add <meta property='og:title' content='...' /> in <head>.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 15,
  };

  const allContent = profile.files
    .filter(f => JSX_EXTS.has(f.ext) || f.path.includes("layout") || f.path.includes("metadata"))
    .map(f => f.content)
    .join("\n");

  const missing = OG_TAGS.filter(tag => !allContent.includes(tag));
  if (missing.length === 0) return pass(base);
  return fail(base, `Missing Open Graph tags: ${missing.join(", ")}`, missing.join(", "));
};

// ── SEO-003: Missing meta description ────────────────────────────────────────
const checkSEO003: CheckFn = (profile) => {
  const base = {
    id: "SEO-003",
    station: "growth" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "Meta description present",
    fixPrompt:
      "Add a meta description in layout.tsx: export const metadata = { description: 'A 150-160 char description of what your app does for search engines.' };",
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 14,
  };

  const allContent = profile.files.map(f => f.content).join("\n");
  const hasDesc =
    /meta\s+name\s*=\s*['"]description['"]/.test(allContent) ||
    /description\s*:/.test(allContent) && /metadata/.test(allContent);

  return hasDesc ? pass(base) : fail(base, "No meta description tag found.", "No <meta name='description'> or metadata.description");
};

// ── SEO-004: No sitemap.xml ───────────────────────────────────────────────────
const checkSEO004: CheckFn = (profile) => {
  const base = {
    id: "SEO-004",
    station: "growth" as const,
    severity: "warning" as const,
    confidence: 85,
    title: "sitemap.xml present",
    fixPrompt:
      "In Next.js App Router, create app/sitemap.ts: export default function sitemap() { return [{ url: 'https://yourapp.com', lastModified: new Date() }] }. Or use the next-sitemap package.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 13,
  };

  const hasSitemap =
    profile.files.some(f => f.path === "public/sitemap.xml") ||
    profile.files.some(f => /sitemap\.(ts|js|xml)$/.test(f.path)) ||
    Object.keys(profile.dependencies).includes("next-sitemap");

  return hasSitemap ? pass(base) : fail(base, "No sitemap.xml or sitemap generator found.", "No public/sitemap.xml or sitemap.ts");
};

// ── SEO-005: No robots.txt ────────────────────────────────────────────────────
const checkSEO005: CheckFn = (profile) => {
  const base = {
    id: "SEO-005",
    station: "growth" as const,
    severity: "warning" as const,
    confidence: 90,
    title: "robots.txt present",
    fixPrompt:
      "Create public/robots.txt:\nUser-agent: *\nAllow: /\nSitemap: https://yourapp.com/sitemap.xml\nOr use app/robots.ts in Next.js App Router.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 12,
  };

  const hasRobots =
    profile.files.some(f => f.path === "public/robots.txt") ||
    profile.files.some(f => /robots\.(ts|js|txt)$/.test(f.path));

  return hasRobots ? pass(base) : fail(base, "No robots.txt found.", "No public/robots.txt or robots.ts");
};

// ── SEO-006: No JSON-LD structured data ──────────────────────────────────────
const JSONLD_RE = /application\/ld\+json|JsonLd|json-ld|schema\.org/i;

const checkSEO006: CheckFn = (profile) => {
  const base = {
    id: "SEO-006",
    station: "growth" as const,
    severity: "warning" as const,
    confidence: 75,
    title: "JSON-LD structured data present",
    fixPrompt:
      'Add JSON-LD in layout.tsx: <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context":"https://schema.org","@type":"WebSite","name":"Your App","url":"https://yourapp.com" }) }} />',
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 11,
  };

  const hasJsonLd = profile.files.some(f =>
    (JSX_EXTS.has(f.ext) || f.ext === ".html") &&
    f.content &&
    JSONLD_RE.test(f.content),
  );

  return hasJsonLd ? pass(base) : fail(base, "No JSON-LD structured data found.", "No schema.org markup or application/ld+json script tag");
};

// ── SEO-007: Missing canonical URLs ──────────────────────────────────────────
const CANONICAL_RE = /rel\s*=\s*['"]canonical['"]|alternates\s*:\s*\{/;

const checkSEO007: CheckFn = (profile) => {
  const base = {
    id: "SEO-007",
    station: "growth" as const,
    severity: "warning" as const,
    confidence: 75,
    title: "Canonical URLs configured",
    fixPrompt:
      "Add canonical URL in layout.tsx metadata: export const metadata = { alternates: { canonical: 'https://yourapp.com' } }. Or add <link rel='canonical' href='...' /> in <head>.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 10,
  };

  const allContent = profile.files.map(f => f.content).join("\n");
  return CANONICAL_RE.test(allContent) ?
    pass(base) :
    fail(base, "No canonical URL link or metadata.alternates found.", "No rel='canonical'");
};

// ── SEO-008: No Twitter card tags ─────────────────────────────────────────────
const TWITTER_TAGS = ["twitter:card", "twitter:title", "twitter:image"];

const checkSEO008: CheckFn = (profile) => {
  const base = {
    id: "SEO-008",
    station: "growth" as const,
    severity: "info" as const,
    confidence: 80,
    title: "Twitter card tags present",
    fixPrompt:
      "Add Twitter card metadata in layout.tsx: export const metadata = { twitter: { card: 'summary_large_image', title: 'Your App', images: ['/og.png'] } };",
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 9,
  };

  const allContent = profile.files.map(f => f.content).join("\n");
  const missing = TWITTER_TAGS.filter(tag => !allContent.includes(tag));

  if (missing.length === 0) return pass(base);
  return fail(base, `Missing Twitter card tags: ${missing.join(", ")}`, missing.join(", "));
};

export const growthChecks: CheckFn[] = [
  checkSEO001, checkSEO002, checkSEO003, checkSEO004,
  checkSEO005, checkSEO006, checkSEO007, checkSEO008,
];
