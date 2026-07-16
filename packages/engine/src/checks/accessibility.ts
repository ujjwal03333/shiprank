import type { CheckResult, CheckFn, CodeProfile } from "./types";

function stub(
  id: string, weight: number, severity: CheckResult["severity"],
  title: string, failMessage: string, fixPrompt: string,
  fixDifficulty: CheckResult["fixDifficulty"], fixTime: string,
  autoFixSafety: CheckResult["autoFixSafety"],
): CheckFn {
  return () => ({
    id, station: "accessibility" as const, passed: true, severity,
    confidence: 0, title, failMessage, evidence: "", fixPrompt,
    fixDifficulty, fixTime, autoFixSafety, scoreWeight: weight,
  });
}

const JSX_EXTS = new Set([".tsx", ".jsx", ".vue", ".svelte"]);
const CSS_EXTS = new Set([".css", ".scss", ".sass", ".less"]);

// ── A11Y-001: Images without alt text ────────────────────────────────────────
const checkA11Y001: CheckFn = (profile) => {
  const base = {
    id: "A11Y-001",
    station: "accessibility" as const,
    severity: "critical" as const,
    confidence: 85,
    title: "All images have alt text",
    fixPrompt:
      'Add descriptive alt text to every image: <Image src={...} alt="Description of what the image shows" />. Use alt="" for purely decorative images.',
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "review" as const,
    scoreWeight: 18,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!JSX_EXTS.has(file.ext) || !file.content) continue;
    // <img without alt or alt="" — img tag that doesn't have alt=
    const imgMatches = [...file.content.matchAll(/<img\b[^>]*>/gi)];
    for (const m of imgMatches) {
      if (!/\balt\s*=/.test(m[0])) hits.push(`${file.path}: ${m[0].slice(0, 60)}`);
    }
    // <Image (next/image) without alt
    const nextImgMatches = [...file.content.matchAll(/<Image\b[^/]*(?:\/>|>)/g)];
    for (const m of nextImgMatches) {
      if (!/\balt\s*=/.test(m[0])) hits.push(`${file.path}: <Image> without alt`);
    }
  }

  if (hits.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `${hits.length} image(s) missing alt text.`,
    evidence: hits.slice(0, 3).join("; "),
  };
};

// ── A11Y-002: Form inputs without labels ─────────────────────────────────────
const INPUT_RE = /<(?:input|textarea|select)\b([^>]*?)(?:\/?>)/gi;
const LABEL_ASSOCIATION_RE = /(?:aria-label|aria-labelledby|id\s*=\s*['"][^'"]+['"])/i;

const checkA11Y002: CheckFn = (profile) => {
  const base = {
    id: "A11Y-002",
    station: "accessibility" as const,
    severity: "critical" as const,
    confidence: 80,
    title: "All form inputs have accessible labels",
    fixPrompt:
      'Add aria-label to each input: <input aria-label="Email address" type="email" />. Or wrap with <label>: <label>Email <input type="email" /></label>.',
    fixDifficulty: "copy-paste" as const,
    fixTime: "15 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 16,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!JSX_EXTS.has(file.ext) || !file.content) continue;
    const matches = [...file.content.matchAll(INPUT_RE)];
    for (const m of matches) {
      const attrs = m[1] ?? "";
      // Skip hidden inputs
      if (/type\s*=\s*['"]hidden['"]/.test(attrs)) continue;
      if (!LABEL_ASSOCIATION_RE.test(attrs)) {
        hits.push(`${file.path}: <${m[0].slice(1, m[0].indexOf(" ") || 20)}>`);
      }
    }
  }

  if (hits.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `${hits.length} input(s) without accessible labels.`,
    evidence: hits.slice(0, 3).join("; "),
  };
};

// ── A11Y-003: Missing focus indicators ───────────────────────────────────────
const OUTLINE_REMOVE_RE = /outline\s*:\s*(?:none|0)\s*[;}]/;
const FOCUS_VISIBLE_RE = /:focus(?:-visible)?\s*\{/;

const checkA11Y003: CheckFn = (profile) => {
  const base = {
    id: "A11Y-003",
    station: "accessibility" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Focus indicators not suppressed",
    fixPrompt:
      "Remove outline:none from global CSS. Add :focus-visible { outline: 2px solid #005FCC; outline-offset: 2px; } as a replacement that only shows focus rings for keyboard users.",
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 14,
  };

  const cssFiles = profile.files.filter(f => CSS_EXTS.has(f.ext) && f.content);

  let removesOutline = false;
  let hasFocusVisible = false;

  for (const file of cssFiles) {
    if (OUTLINE_REMOVE_RE.test(file.content)) removesOutline = true;
    if (FOCUS_VISIBLE_RE.test(file.content)) hasFocusVisible = true;
  }

  if (!removesOutline) return { ...base, passed: true, failMessage: "", evidence: "" };
  if (hasFocusVisible) return {
    ...base, passed: true, failMessage: "",
    evidence: "outline:none present but :focus-visible replacement found",
  };
  return {
    ...base, passed: false,
    failMessage: "outline:none or outline:0 found in CSS without a :focus-visible replacement.",
    evidence: "outline:none in CSS",
  };
};

// ── A11Y-004: Color contrast failures (simplified) ───────────────────────────
// Simplified static check: flag known low-contrast patterns (light gray on white).
const LOW_CONTRAST_PATTERNS = [
  /color\s*:\s*#(?:aaa|bbb|ccc|ddd|eee|999|888|d3d3d3|c0c0c0|a9a9a9)/i,
  /color\s*:\s*(?:lightgray|lightgrey|silver|darkgray)\b/i,
  /color\s*:\s*rgba?\(\s*(?:1[5-9]\d|[0-9]{1,2})\s*,\s*(?:1[5-9]\d|[0-9]{1,2})\s*,\s*(?:1[5-9]\d|[0-9]{1,2})/,
];

const checkA11Y004: CheckFn = (profile) => {
  const base = {
    id: "A11Y-004",
    station: "accessibility" as const,
    severity: "warning" as const,
    confidence: 55,
    title: "No obvious low-contrast color patterns",
    fixPrompt:
      "Replace light gray text colors with darker alternatives. Minimum WCAG AA contrast ratio is 4.5:1 for body text. Use https://webaim.org/resources/contrastchecker/ to verify.",
    fixDifficulty: "moderate" as const,
    fixTime: "30 min",
    autoFixSafety: "review" as const,
    scoreWeight: 13,
  };

  const hits: string[] = [];
  const cssFiles = profile.files.filter(f => CSS_EXTS.has(f.ext) && f.content);
  for (const file of cssFiles) {
    for (const re of LOW_CONTRAST_PATTERNS) {
      if (re.test(file.content)) {
        hits.push(file.path);
        break;
      }
    }
  }

  if (hits.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `Possible low-contrast text colors in ${hits.length} CSS file(s). Run a full contrast audit.`,
    evidence: hits.slice(0, 3).join(", "),
  };
};

// ── A11Y-005: No skip-to-content link ────────────────────────────────────────
const SKIP_LINK_RE = /href\s*=\s*['"]#(?:main|content|main-content|skip)['"]/i;

const checkA11Y005: CheckFn = (profile) => {
  const base = {
    id: "A11Y-005",
    station: "accessibility" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Skip-to-content link present",
    fixPrompt:
      'Add as the first child of <body>: <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 ...">Skip to main content</a>. Then add id="main-content" to your <main> element.',
    fixDifficulty: "copy-paste" as const,
    fixTime: "5 min",
    autoFixSafety: "safe" as const,
    scoreWeight: 12,
  };

  // Check layout files first
  const layoutFiles = profile.files.filter(f =>
    JSX_EXTS.has(f.ext) && (f.path.includes("layout") || f.path.includes("_app") || f.path.includes("_document")),
  );
  for (const file of layoutFiles) {
    if (SKIP_LINK_RE.test(file.content)) return { ...base, passed: true, failMessage: "", evidence: "" };
  }

  return {
    ...base, passed: false,
    failMessage: "No skip-to-content link found in layout files. Keyboard users cannot bypass repeated navigation.",
    evidence: "No href='#main-content' or href='#content' in layout",
  };
};

// ── A11Y-006: Heading hierarchy violations ───────────────────────────────────
const checkA11Y006: CheckFn = (profile) => {
  const base = {
    id: "A11Y-006",
    station: "accessibility" as const,
    severity: "warning" as const,
    confidence: 70,
    title: "Heading hierarchy is correct",
    fixPrompt:
      "Ensure headings follow a logical order: h1 → h2 → h3. Never skip levels (e.g. h1 → h3). Each page should have exactly one h1.",
    fixDifficulty: "moderate" as const,
    fixTime: "15 min",
    autoFixSafety: "review" as const,
    scoreWeight: 10,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!JSX_EXTS.has(file.ext) || !file.content) continue;
    const headings = [...file.content.matchAll(/<h([1-6])\b/gi)]
      .map(m => parseInt(m[1]!, 10));
    for (let i = 1; i < headings.length; i++) {
      const prev = headings[i - 1]!;
      const curr = headings[i]!;
      if (curr > prev + 1) {
        hits.push(`${file.path}: h${prev}→h${curr} skips a level`);
        break;
      }
    }
  }

  if (hits.length === 0) return { ...base, passed: true, failMessage: "", evidence: "" };
  return {
    ...base, passed: false,
    failMessage: `Heading level jumps found in ${hits.length} file(s).`,
    evidence: hits.slice(0, 3).join("; "),
  };
};

// ── Wave 2 stubs ─────────────────────────────────────────────────────────────
const checkA11Y007 = stub("A11Y-007", 7, "warning", "ARIA landmark regions present", "Page missing ARIA landmark regions (main, nav, header, footer).", "Wrap page sections in semantic HTML: <main>, <nav>, <header>, <footer>.", "copy-paste", "15 min", "safe");
const checkA11Y008 = stub("A11Y-008", 5, "warning", "Modals are keyboard-accessible", "Modal dialogs trap focus inside when open.", "Use a headless UI library or implement focus trap manually. Pressing Esc should close the modal.", "moderate", "1 hr", "review");
const checkA11Y009 = stub("A11Y-009", 3, "warning", "No auto-playing media", "Video or audio auto-plays without user consent.", "Add controls and remove autoplay from <video> and <audio> elements.", "copy-paste", "5 min", "safe");
const checkA11Y010 = stub("A11Y-010", 2, "info", "Touch targets meet minimum size", "Interactive elements are smaller than 44×44px.", "Ensure buttons and links meet minimum touch target size with padding.", "copy-paste", "15 min", "safe");

export const accessibilityChecks: CheckFn[] = [
  checkA11Y001, checkA11Y002, checkA11Y003, checkA11Y004,
  checkA11Y005, checkA11Y006, checkA11Y007, checkA11Y008,
  checkA11Y009, checkA11Y010,
];
