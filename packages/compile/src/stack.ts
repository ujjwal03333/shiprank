/**
 * Pure, dependency-free stack detection + constraint catalog.
 * Safe to import from client components — no Anthropic SDK, no Node built-ins.
 */

export type StackKey =
  | "supabase"
  | "stripe"
  | "auth"
  | "firebase"
  | "fileUpload"
  | "realtime"
  | "email"
  | "backgroundJobs";

export interface StackDef {
  key: StackKey;
  label: string;
  keywords: string[];
}

export const STACK_DEFS: StackDef[] = [
  { key: "supabase", label: "Supabase", keywords: ["supabase", "database"] },
  { key: "stripe", label: "Stripe", keywords: ["stripe", "payment", "checkout"] },
  { key: "auth", label: "Auth", keywords: ["auth", "login", "signup", "clerk"] },
  { key: "firebase", label: "Firebase", keywords: ["firebase", "firestore"] },
  { key: "fileUpload", label: "File Upload", keywords: ["upload", "file", "image"] },
  { key: "realtime", label: "Realtime", keywords: ["realtime", "websocket", "chat"] },
  { key: "email", label: "Email", keywords: ["email", "sendgrid", "resend"] },
  { key: "backgroundJobs", label: "Background Jobs", keywords: ["cron", "schedule", "background"] },
];

export function detectStack(text: string): StackKey[] {
  const lower = text.toLowerCase();
  const found: StackKey[] = [];
  for (const def of STACK_DEFS) {
    if (def.keywords.some((kw) => lower.includes(kw))) found.push(def.key);
  }
  return found;
}

/** Which raw keyword (if any) triggered detection of a given stack key — used for annotation placement. */
export function firstKeywordHit(text: string, key: StackKey): { keyword: string; index: number } | null {
  const def = STACK_DEFS.find((d) => d.key === key);
  if (!def) return null;
  const lower = text.toLowerCase();
  let best: { keyword: string; index: number } | null = null;
  for (const kw of def.keywords) {
    const idx = lower.indexOf(kw);
    if (idx !== -1 && (best === null || idx < best.index)) {
      best = { keyword: kw, index: idx };
    }
  }
  return best;
}

export type FocusMode = "security" | "speed" | "scale";

export type ConstraintCategory = StackKey | "universal" | "scale";

export interface Constraint {
  id: string;
  /**
   * Check ID this constraint maps to. Where a real ShipRank engine security
   * check exists (packages/engine/src/checks/security.ts) this is that check's
   * real id (e.g. "SEC-003"), so feedback-loop fail-rate data lines up with it.
   * Constraints without a live engine check use a distinct non-SEC prefix
   * (REL-, SUP-, STR-, FB-, UPL-, PERF-) so they're never mistaken for one.
   */
  checkId: string;
  hasEngineCheck: boolean;
  category: ConstraintCategory;
  critical: boolean;
  text: string;
  example: string;
  verify: string;
}

export const CONSTRAINT_CATALOG: Constraint[] = [
  // ── Universal ──────────────────────────────────────────────────────────
  {
    id: "universal-error-boundary",
    checkId: "REL-001",
    hasEngineCheck: false,
    category: "universal",
    critical: true,
    text: "Error boundaries at app root",
    example: `// app/error.tsx\nexport default function Error({ error, reset }: { error: Error; reset: () => void }) {\n  return <button onClick={reset}>Try again</button>;\n}`,
    verify: "Confirm app/error.tsx exists and renders on a thrown error",
  },
  {
    id: "universal-secrets-env",
    checkId: "SEC-001",
    hasEngineCheck: true,
    category: "universal",
    critical: true,
    text: "Secrets in server-side environment variables only; nothing secret in client bundles",
    example: `// ✗ const key = "sk_live_51H8x...";\n// ✓ const key = process.env.STRIPE_SECRET_KEY;`,
    verify: "grep -rE 'sk_live_|sk_test_|SERVICE_ROLE_KEY\\s*=' src/ should return nothing",
  },
  {
    id: "universal-zod-validation",
    checkId: "SEC-010",
    hasEngineCheck: true,
    category: "universal",
    critical: true,
    text: "Server-side input validation with zod on every mutation",
    example: `const Body = z.object({ email: z.string().email() });\nconst parsed = Body.safeParse(await req.json());\nif (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 422 });`,
    verify: "Every POST/PUT/PATCH route imports and calls a zod schema before touching the database",
  },

  // ── Supabase ───────────────────────────────────────────────────────────
  {
    id: "supabase-rls",
    checkId: "SEC-003",
    hasEngineCheck: true,
    category: "supabase",
    critical: true,
    text: "Enable RLS on every table",
    example: `alter table bookings enable row level security;\ncreate policy "own rows" on bookings for select using (auth.uid() = user_id);`,
    verify: "select relrowsecurity from pg_class where relname = 'bookings'; -- must be true",
  },
  {
    id: "supabase-service-role",
    checkId: "SUP-001",
    hasEngineCheck: false,
    category: "supabase",
    critical: true,
    text: "Never expose the service_role key in client code",
    example: `// ✗ app/page.tsx:      createClient(url, SERVICE_ROLE_KEY)\n// ✓ app/api/*/route.ts: createClient(url, SERVICE_ROLE_KEY)`,
    verify: "grep -r SUPABASE_SERVICE_ROLE_KEY app --include=*.tsx should return nothing",
  },
  {
    id: "supabase-anon-key-client",
    checkId: "SUP-002",
    hasEngineCheck: false,
    category: "supabase",
    critical: false,
    text: "Use the anon key on the client; service_role only in server routes",
    example: `// client: createBrowserClient(url, NEXT_PUBLIC_SUPABASE_ANON_KEY)\n// server: createClient(url, SUPABASE_SERVICE_ROLE_KEY)`,
    verify: "The client JS bundle contains only NEXT_PUBLIC_SUPABASE_ANON_KEY, never the service key",
  },

  // ── Stripe ─────────────────────────────────────────────────────────────
  {
    id: "stripe-webhook-signature",
    checkId: "SEC-012",
    hasEngineCheck: true,
    category: "stripe",
    critical: true,
    text: "Verify webhook signatures using the signing secret",
    example: `const sig = req.headers.get("stripe-signature")!;\nconst event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);`,
    verify: "POST an unsigned payload to the webhook route — it must return 400",
  },
  {
    id: "stripe-no-secret-client",
    checkId: "SEC-001",
    hasEngineCheck: true,
    category: "stripe",
    critical: true,
    text: "Never put sk_live or sk_test keys in the client bundle",
    example: `// ✗ NEXT_PUBLIC_STRIPE_SECRET_KEY\n// ✓ STRIPE_SECRET_KEY  (server-only — no NEXT_PUBLIC_ prefix)`,
    verify: "grep -rE 'sk_live_|sk_test_' .next/static should return nothing",
  },
  {
    id: "stripe-test-vs-live-keys",
    checkId: "STR-001",
    hasEngineCheck: false,
    category: "stripe",
    critical: false,
    text: "Use test-mode keys in development, live keys in production",
    example: `# .env.local\nSTRIPE_SECRET_KEY=sk_test_...\n# production env\nSTRIPE_SECRET_KEY=sk_live_...`,
    verify: "Confirm .env.local uses the sk_test_ prefix and the deployed env uses sk_live_",
  },

  // ── Auth ───────────────────────────────────────────────────────────────
  {
    id: "auth-server-side-check",
    checkId: "SEC-004",
    hasEngineCheck: true,
    category: "auth",
    critical: true,
    text: "Server-side auth check on all protected routes",
    example: `const { data: { user } } = await supabase.auth.getUser();\nif (!user) return new Response("Unauthorized", { status: 401 });`,
    verify: "Request a protected route with no session cookie — must return 401 or redirect",
  },
  {
    id: "auth-httponly-cookies",
    checkId: "SEC-009",
    hasEngineCheck: true,
    category: "auth",
    critical: true,
    text: "Store session tokens in httpOnly cookies, not localStorage",
    example: `cookies().set("session", token, { httpOnly: true, secure: true, sameSite: "lax" });`,
    verify: "document.cookie in devtools must not expose the session token",
  },
  {
    id: "auth-rate-limit",
    checkId: "SEC-007",
    hasEngineCheck: true,
    category: "auth",
    critical: false,
    text: "Rate limit login/signup endpoints (5 req/min per IP)",
    example: `const { allowed } = await checkRateLimit(\`login:\${ip}\`, 5, 60);\nif (!allowed) return NextResponse.json({ error: "too many attempts" }, { status: 429 });`,
    verify: "A 6th login attempt within 60s from the same IP must return 429",
  },
  {
    id: "auth-csrf",
    checkId: "SEC-015",
    hasEngineCheck: true,
    category: "auth",
    critical: false,
    text: "Add CSRF protection on state-changing routes",
    example: `const origin = req.headers.get("origin");\nif (origin !== process.env.NEXT_PUBLIC_APP_URL) return new Response(null, { status: 403 });`,
    verify: "A POST from a foreign origin must be rejected",
  },

  // ── Firebase ───────────────────────────────────────────────────────────
  {
    id: "firebase-restrictive-rules",
    checkId: "FB-001",
    hasEngineCheck: false,
    category: "firebase",
    critical: true,
    text: "Write restrictive Firestore security rules (not open read/write)",
    example: `match /bookings/{id} {\n  allow read, write: if request.auth.uid == resource.data.userId;\n}`,
    verify: "Firebase emulator: an unauthenticated read of another user's doc must be denied",
  },
  {
    id: "firebase-validate-shape",
    checkId: "FB-002",
    hasEngineCheck: false,
    category: "firebase",
    critical: false,
    text: "Validate data shape in security rules, not just auth",
    example: `allow create: if request.resource.data.keys().hasAll(["userId","slot"])\n  && request.resource.data.slot is timestamp;`,
    verify: "Write a doc missing a required field — the rule must reject it",
  },

  // ── File upload ────────────────────────────────────────────────────────
  {
    id: "upload-validate-type-server",
    checkId: "SEC-013",
    hasEngineCheck: true,
    category: "fileUpload",
    critical: true,
    text: "Validate file type server-side (not just the client extension)",
    example: `const bytes = new Uint8Array(await file.arrayBuffer());\nconst type = await fileTypeFromBuffer(bytes);\nif (!ALLOWED_MIME.has(type?.mime)) return NextResponse.json({ error: "bad type" }, { status: 415 });`,
    verify: "Upload a .png renamed to .jpg — the server must reject it based on magic bytes, not the extension",
  },
  {
    id: "upload-size-limit-server",
    checkId: "UPL-001",
    hasEngineCheck: false,
    category: "fileUpload",
    critical: true,
    text: "Enforce file size limits server-side",
    example: `if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "too large" }, { status: 413 });`,
    verify: "Upload a file above the limit — must get 413, not a silent accept",
  },
  {
    id: "upload-no-user-filenames",
    checkId: "UPL-002",
    hasEngineCheck: false,
    category: "fileUpload",
    critical: false,
    text: "Never use user-provided filenames for storage paths",
    example: `const path = \`uploads/\${crypto.randomUUID()}.\${ext}\`; // not \`uploads/\${file.name}\``,
    verify: "Upload a file named ../../etc/passwd — the resulting storage path must not contain it",
  },

  // ── Scale-ready (performance) ─────────────────────────────────────────
  {
    id: "scale-connection-pooling",
    checkId: "PERF-001",
    hasEngineCheck: false,
    category: "scale",
    critical: false,
    text: "Connection pooling on the database client",
    example: `// Use the pooled connection string (port 6543) for serverless routes, not the direct one`,
    verify: "Confirm DATABASE_URL uses the pooler port under concurrent load",
  },
  {
    id: "scale-pagination",
    checkId: "PERF-002",
    hasEngineCheck: false,
    category: "scale",
    critical: false,
    text: "Pagination on every list endpoint",
    example: `.range(offset, offset + limit - 1)`,
    verify: "A list route with 10k+ rows must accept a cursor/page param and cap response size",
  },
  {
    id: "scale-indexed-queries",
    checkId: "PERF-003",
    hasEngineCheck: false,
    category: "scale",
    critical: false,
    text: "Indexed queries on every filter/sort column",
    example: `create index idx_bookings_user_id on bookings(user_id);`,
    verify: "EXPLAIN ANALYZE on the hot query path shows an index scan, not a sequential scan",
  },
];

export interface ConstraintSelection {
  primary: Constraint[];
  deferred: Constraint[];
}

/**
 * Selects constraints applicable to the detected stack, split by focus mode:
 *  - security: everything applicable, nothing deferred (critical ones marked
 *    "do not proceed until verified" by the caller)
 *  - speed: only critical constraints now; the rest deferred to a
 *    "Phase 2: Harden" section
 *  - scale: critical stack constraints + all performance constraints now;
 *    non-critical stack constraints deferred
 */
export function getApplicableConstraints(
  stackKeys: StackKey[],
  focusMode: FocusMode,
): ConstraintSelection {
  const stackSet = new Set<ConstraintCategory>(["universal", ...stackKeys]);
  const stackConstraints = CONSTRAINT_CATALOG.filter(
    (c) => c.category !== "scale" && stackSet.has(c.category),
  );
  const scaleConstraints = CONSTRAINT_CATALOG.filter((c) => c.category === "scale");

  if (focusMode === "security") {
    return { primary: stackConstraints, deferred: [] };
  }

  if (focusMode === "speed") {
    return {
      primary: stackConstraints.filter((c) => c.critical),
      deferred: stackConstraints.filter((c) => !c.critical),
    };
  }

  // scale
  return {
    primary: [...stackConstraints.filter((c) => c.critical), ...scaleConstraints],
    deferred: stackConstraints.filter((c) => !c.critical),
  };
}

function formatConstraint(c: Constraint, markCritical: boolean): string {
  const marker = markCritical ? " **[CRITICAL — do not proceed until verified]**" : "";
  return `- ${c.text} [${c.checkId}]${marker}\n  \`\`\`\n  ${c.example}\n  \`\`\`\n  Verify: ${c.verify}`;
}

/** Renders a constraint selection as the CONSTRAINTS section body, including an appended Phase 2: Harden block for deferred items. */
export function renderConstraintBlock(selection: ConstraintSelection, focusMode: FocusMode): string {
  const parts: string[] = [];
  if (selection.primary.length > 0) {
    parts.push(
      selection.primary
        .map((c) => formatConstraint(c, focusMode === "security" && c.critical))
        .join("\n"),
    );
  }
  if (selection.deferred.length > 0) {
    parts.push(
      `### Phase 2: Harden\n${selection.deferred.map((c) => formatConstraint(c, false)).join("\n")}`,
    );
  }
  return parts.join("\n\n");
}

/** Every distinct checkId referenced by a constraint selection (primary + deferred), for "N failure patterns prevented" stats. */
export function uniqueCheckIds(selection: ConstraintSelection): string[] {
  const ids = new Set<string>();
  for (const c of [...selection.primary, ...selection.deferred]) ids.add(c.checkId);
  return [...ids];
}
