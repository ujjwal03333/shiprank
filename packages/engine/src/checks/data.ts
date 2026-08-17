import type { CheckFn } from "./types";

const FIX_TIME_5_MIN = "5 min";
const FIX_TIME_15_MIN = "15 min";
const FIX_TIME_30_MIN = "30 min";
const FIX_TIME_1_HR = "1 hr";

function stub(id: string, weight: number, sev: "critical" | "warning" | "info", title: string, failMessage: string, fixPrompt: string, diff: "copy-paste" | "moderate" | "architectural", time: string, safety: "safe" | "review" | "human-only"): CheckFn {
  return () => ({ id, station: "data" as const, passed: true, severity: sev, confidence: 0, title, failMessage, evidence: "", fixPrompt, fixDifficulty: diff, fixTime: time, autoFixSafety: safety, scoreWeight: weight });
}

export const dataChecks: CheckFn[] = [
  stub("DATA-001", 18, "critical", "Indexed foreign key columns",              "Foreign key columns without database indexes.",                     "CREATE INDEX ON table(foreign_key_col); Run EXPLAIN ANALYSE on slow queries.",              "moderate",      FIX_TIME_30_MIN, "review"),
  stub("DATA-002", 16, "critical", "NOT NULL constraints on required fields",   "Required columns allow NULL values.",                              "ALTER TABLE t ALTER COLUMN col SET NOT NULL; Add default or backfill existing NULLs first.", "moderate",      FIX_TIME_30_MIN, "review"),
  stub("DATA-003", 14, "warning",  "No float for monetary values",              "FLOAT or DOUBLE used for money columns.",                           "Use NUMERIC(12,2) for monetary columns — floats cannot represent cents exactly.",            "moderate",      FIX_TIME_30_MIN, "review"),
  stub("DATA-004", 12, "warning",  "Migrations committed to repo",              "No migration files found.",                                        "Use Supabase migrations (supabase db diff), Prisma migrate, or Drizzle-kit.",               "moderate",      FIX_TIME_1_HR,   "review"),
  stub("DATA-005", 10, "warning",  "Soft delete pattern for user content",      "Hard deletes on user content tables.",                             "Add deleted_at TIMESTAMPTZ column and filter WHERE deleted_at IS NULL in queries.",         "moderate",      FIX_TIME_1_HR,   "review"),
  stub("DATA-006", 10, "warning",  "No N+1 query patterns",                     "Loops containing individual DB queries per item.",                 "Use JOIN or batch select: .in('id', ids) instead of one query per row.",                   "moderate",      FIX_TIME_1_HR,   "review"),
  stub("DATA-007",  8, "warning",  "Created_at / updated_at timestamps",        "Tables missing audit timestamp columns.",                          "Add created_at TIMESTAMPTZ DEFAULT now() and updated_at with moddatetime trigger.",         "copy-paste",    FIX_TIME_15_MIN, "safe"),
  stub("DATA-008",  7, "warning",  "Unique constraints on unique fields",        "Email / username columns without UNIQUE constraint.",              "ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);",                          "copy-paste",    FIX_TIME_5_MIN,  "safe"),
  stub("DATA-009",  3, "info",     "Schema changes via migrations only",         "Direct table alterations outside of migration files.",             "Always use supabase db diff or prisma migrate dev — never alter tables directly in prod.",   "architectural", FIX_TIME_1_HR,   "review"),
  stub("DATA-010",  2, "info",     "Enum types for fixed value sets",            "String columns for status fields that should be enums.",           "CREATE TYPE status AS ENUM ('active','paused','cancelled') and use it in column definition.", "copy-paste",   FIX_TIME_15_MIN, "safe"),
];
