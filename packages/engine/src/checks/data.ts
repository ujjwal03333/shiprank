import type { CheckResult, CheckFn, CodeProfile, FileInfo } from "./types";

const SOURCE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const FIX_TIME_5_MIN = "5 min";
const FIX_TIME_15_MIN = "15 min";
const FIX_TIME_30_MIN = "30 min";
const FIX_TIME_1_HR = "1 hr";

function stub(
  id: string,
  weight: number,
  sev: "critical" | "warning" | "info",
  title: string,
  failMessage: string,
  fixPrompt: string,
  diff: "copy-paste" | "moderate" | "architectural",
  time: string,
  safety: "safe" | "review" | "human-only",
): CheckFn {
  return () => ({
    id,
    station: "data" as const,
    passed: true,
    severity: sev,
    confidence: 0,
    title,
    failMessage,
    evidence: "",
    fixPrompt,
    fixDifficulty: diff,
    fixTime: time,
    autoFixSafety: safety,
    scoreWeight: weight,
  });
}

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

function norm(path: string): string {
  return path.replace(/\\/g, "/");
}

function isTestPath(path: string, testFiles: string[]): boolean {
  return testFiles.includes(path) || path.includes("__tests__") || /\.(test|spec)\./.test(path);
}

function schemaSources(profile: CodeProfile): { label: string; content: string }[] {
  const out: { label: string; content: string }[] = [];
  profile.supabaseMigrations.forEach((sql, i) => {
    if (sql) out.push({ label: `migration[${i}]`, content: sql });
  });
  for (const f of profile.files) {
    const p = norm(f.path);
    if (!f.content) continue;
    if (p.includes("supabase/migrations/") && f.ext === ".sql") {
      if (!profile.supabaseMigrations.includes(f.content)) {
        out.push({ label: f.path, content: f.content });
      }
      continue;
    }
    if (
      /prisma\/schema\.prisma$/.test(p) ||
      /drizzle\/.+\.(ts|sql)$/.test(p) ||
      /(^|\/)migrations\/.+\.sql$/.test(p)
    ) {
      out.push({ label: f.path, content: f.content });
    }
  }
  return out;
}

function hasMigrationFiles(profile: CodeProfile, files: FileInfo[]): boolean {
  if (profile.supabaseMigrations.length > 0) return true;
  return files.some((f) => {
    const p = norm(f.path);
    return (
      p.includes("supabase/migrations/") ||
      p.includes("prisma/migrations/") ||
      /(^|\/)drizzle\/.+\.sql$/.test(p) ||
      /(^|\/)migrations\/\d+.+\.sql$/.test(p)
    );
  });
}

const MONEY_FLOAT_SQL =
  /\b(price|amount|cost|fee|total|balance|salary|payment|unit_price|unitprice)\b\s+(double\s+precision|float8|float4|float|double|real)\b/i;
const MONEY_FLOAT_PRISMA =
  /\b(price|amount|cost|fee|total|balance|salary|payment|unitPrice|unit_price)\s+Float\b/;

const PRISMA_MODEL = /model\s+(\w+)\s*\{([\s\S]*?)\}/g;

function extractCreateTables(sql: string): Array<{ name: string; body: string }> {
  const header = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:[\w."]+?\.)?["']?(\w+)["']?\s*\(/gi;
  const tables: Array<{ name: string; body: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = header.exec(sql))) {
    const name = match[1] ?? "table";
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < sql.length && depth > 0) {
      const ch = sql[i];
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      i++;
    }
    tables.push({ name, body: sql.slice(start, Math.max(start, i - 1)) });
  }
  return tables;
}

// ── DATA-003: No float for monetary values ───────────────────────────────────
const checkDATA003: CheckFn = (profile) => {
  const base = {
    id: "DATA-003",
    station: "data" as const,
    severity: "warning" as const,
    confidence: 86,
    title: "No float for monetary values",
    fixPrompt:
      "Use NUMERIC(12,2) or an integer-cents column for money. FLOAT and DOUBLE cannot represent cents exactly.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_30_MIN,
    autoFixSafety: "review" as const,
    scoreWeight: 14,
  };

  const sources = schemaSources(profile);
  if (sources.length === 0) {
    return pass({ ...base, title: "No schema to inspect for monetary floats" });
  }

  const hits: string[] = [];
  for (const src of sources) {
    if (MONEY_FLOAT_SQL.test(src.content) || MONEY_FLOAT_PRISMA.test(src.content)) {
      hits.push(src.label);
    }
  }

  if (hits.length === 0) return pass(base);
  return fail(
    base,
    "FLOAT or DOUBLE used for money columns.",
    hits.slice(0, 4).join("; "),
  );
};

// ── DATA-004: Migrations committed to repo ───────────────────────────────────
const checkDATA004: CheckFn = (profile) => {
  const base = {
    id: "DATA-004",
    station: "data" as const,
    severity: "warning" as const,
    confidence: 92,
    title: "Migrations committed to repo",
    fixPrompt:
      "Use Supabase migrations (supabase db diff), Prisma migrate, or Drizzle-kit. Commit the SQL so preview and prod can be recreated.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_1_HR,
    autoFixSafety: "review" as const,
    scoreWeight: 12,
  };

  if (hasMigrationFiles(profile, profile.files)) {
    const count =
      profile.supabaseMigrations.length ||
      profile.files.filter((f) => /migrations\//.test(norm(f.path))).length;
    return pass({ ...base, title: `Migrations committed to repo (${count} file(s))` });
  }

  const hasDbDep = profile.files.some((f) => {
    if (!/(^|\/)package\.json$/.test(norm(f.path)) || !f.content) return false;
    return /@supabase\/|["']prisma["']|["']drizzle-orm["']|["']pg["']/.test(f.content);
  });

  if (!profile.hasDatabase && !hasDbDep) {
    return pass({ ...base, title: "Migrations not required (no database detected)" });
  }

  return fail(base, "No migration files found.", "No supabase/migrations, prisma/migrations, or drizzle SQL");
};

// ── DATA-006: No N+1 query patterns ──────────────────────────────────────────
const QUERY_IN_LOOP =
  /await\s+[\s\S]{0,200}?(?:\.from\s*\(|prisma\.\w+|\.findUnique\s*\(|\.findFirst\s*\(|\.query\s*\()/;

function extractBraceBodies(src: string, header: RegExp): string[] {
  const bodies: string[] = [];
  const re = new RegExp(header.source, header.flags.includes("g") ? header.flags : `${header.flags}g`);
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      i++;
    }
    bodies.push(src.slice(start, Math.max(start, i - 1)));
  }
  return bodies;
}

const checkDATA006: CheckFn = (profile) => {
  const base = {
    id: "DATA-006",
    station: "data" as const,
    severity: "warning" as const,
    confidence: 76,
    title: "No N+1 query patterns",
    fixPrompt:
      "Use a JOIN or a batch select (.in('id', ids) / findMany({ where: { id: { in: ids } } })) instead of one query per row inside a loop.",
    fixDifficulty: "moderate" as const,
    fixTime: FIX_TIME_1_HR,
    autoFixSafety: "review" as const,
    scoreWeight: 10,
  };

  const hits: string[] = [];
  for (const file of profile.files) {
    if (!SOURCE_EXTS.has(file.ext) || !file.content) continue;
    if (isTestPath(file.path, profile.testFiles)) continue;
    const loopBodies = [
      ...extractBraceBodies(file.content, /for\s*\([^)]*\)\s*\{/),
      ...extractBraceBodies(file.content, /\.map\s*\(\s*async\s*\([^)]*\)\s*=>\s*\{/),
    ];
    const inlineMap = /\.map\s*\(\s*async\s*\([^)]*\)\s*=>\s*await\s+[\s\S]{0,160}?(?:\.from\s*\(|prisma\.\w+|\.findUnique\s*\()/.test(
      file.content,
    );
    if (inlineMap || loopBodies.some((body) => QUERY_IN_LOOP.test(body))) {
      hits.push(file.path);
    }
  }

  if (hits.length === 0) return pass(base);
  return fail(
    base,
    "Loops containing individual DB queries per item.",
    hits.slice(0, 4).join("; "),
  );
};

// ── DATA-007: created_at / updated_at ────────────────────────────────────────
const checkDATA007: CheckFn = (profile) => {
  const base = {
    id: "DATA-007",
    station: "data" as const,
    severity: "warning" as const,
    confidence: 84,
    title: "Created_at / updated_at timestamps",
    fixPrompt:
      "Add created_at TIMESTAMPTZ DEFAULT now() and updated_at with a moddatetime trigger (or Prisma @updatedAt) on every persistent table.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_15_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 8,
  };

  const sources = schemaSources(profile);
  if (sources.length === 0) {
    return pass({ ...base, title: "No schema to inspect for timestamps" });
  }

  const missing: string[] = [];
  const blob = sources.map((s) => s.content).join("\n");

  for (const table of extractCreateTables(blob)) {
    if (!/\b(created_at|createdat)\b/i.test(table.body)) missing.push(table.name);
  }
  for (const match of blob.matchAll(PRISMA_MODEL)) {
    const name = match[1] ?? "model";
    const body = match[2] ?? "";
    if (!/\b(createdAt|created_at)\b/.test(body)) missing.push(name);
  }

  if (missing.length === 0) return pass(base);
  return fail(
    base,
    "Tables missing audit timestamp columns.",
    `Missing created_at/createdAt on: ${missing.slice(0, 6).join(", ")}`,
  );
};

// ── DATA-008: Unique constraints on unique fields ────────────────────────────
const checkDATA008: CheckFn = (profile) => {
  const base = {
    id: "DATA-008",
    station: "data" as const,
    severity: "warning" as const,
    confidence: 80,
    title: "Unique constraints on unique fields",
    fixPrompt:
      "ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email); In Prisma: email String @unique.",
    fixDifficulty: "copy-paste" as const,
    fixTime: FIX_TIME_5_MIN,
    autoFixSafety: "safe" as const,
    scoreWeight: 7,
  };

  const sources = schemaSources(profile);
  if (sources.length === 0) {
    return pass({ ...base, title: "No schema to inspect for unique email/username" });
  }

  const blob = sources.map((s) => s.content).join("\n");
  const offenders: string[] = [];

  for (const table of extractCreateTables(blob)) {
    const body = table.body;
    const hasEmail = /(^|,)\s*["']?email["']?\s+/i.test(body);
    const hasUsername = /(^|,)\s*["']?username["']?\s+/i.test(body);
    const emailUnique =
      /email[^,\n]*\bUNIQUE\b/i.test(body) || /UNIQUE\s*\([^)]*email/i.test(body);
    const usernameUnique =
      /username[^,\n]*\bUNIQUE\b/i.test(body) || /UNIQUE\s*\([^)]*username/i.test(body);
    if (hasEmail && !emailUnique) offenders.push(`${table.name}.email`);
    if (hasUsername && !usernameUnique) offenders.push(`${table.name}.username`);
  }

  for (const match of blob.matchAll(PRISMA_MODEL)) {
    const name = match[1] ?? "model";
    const body = match[2] ?? "";
    const emailLine = body.split("\n").find((l) => /^\s*email\s+String\b/.test(l));
    const userLine = body.split("\n").find((l) => /^\s*username\s+String\b/.test(l));
    if (emailLine && !/@unique/.test(emailLine) && !/@@unique\(\s*\[([^\]]*email[^\]]*)\]/.test(body)) {
      offenders.push(`${name}.email`);
    }
    if (userLine && !/@unique/.test(userLine) && !/@@unique\(\s*\[([^\]]*username[^\]]*)\]/.test(body)) {
      offenders.push(`${name}.username`);
    }
  }

  if (offenders.length === 0) return pass(base);
  return fail(
    base,
    "Email / username columns without UNIQUE constraint.",
    offenders.slice(0, 6).join(", "),
  );
};

export const dataChecks: CheckFn[] = [
  stub("DATA-001", 18, "critical", "Indexed foreign key columns", "Foreign key columns without database indexes.", "CREATE INDEX ON table(foreign_key_col); Run EXPLAIN ANALYSE on slow queries.", "moderate", FIX_TIME_30_MIN, "review"),
  stub("DATA-002", 16, "critical", "NOT NULL constraints on required fields", "Required columns allow NULL values.", "ALTER TABLE t ALTER COLUMN col SET NOT NULL; Add default or backfill existing NULLs first.", "moderate", FIX_TIME_30_MIN, "review"),
  checkDATA003,
  checkDATA004,
  stub("DATA-005", 10, "warning", "Soft delete pattern for user content", "Hard deletes on user content tables.", "Add deleted_at TIMESTAMPTZ column and filter WHERE deleted_at IS NULL in queries.", "moderate", FIX_TIME_1_HR, "review"),
  checkDATA006,
  checkDATA007,
  checkDATA008,
  stub("DATA-009", 3, "info", "Schema changes via migrations only", "Direct table alterations outside of migration files.", "Always use supabase db diff or prisma migrate dev — never alter tables directly in prod.", "architectural", FIX_TIME_1_HR, "review"),
  stub("DATA-010", 2, "info", "Enum types for fixed value sets", "String columns for status fields that should be enums.", "CREATE TYPE status AS ENUM ('active','paused','cancelled') and use it in column definition.", "copy-paste", FIX_TIME_15_MIN, "safe"),
];
