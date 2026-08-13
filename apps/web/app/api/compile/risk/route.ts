import { NextResponse } from "next/server";
import { computeFailFrequencies, type ScanCheckRecord } from "@shiprank/engine";
import { getApplicableConstraints, STACK_DEFS, type StackKey } from "@shiprank/compile/client";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";

const VALID_STACK_KEYS = new Set<string>(STACK_DEFS.map((d) => d.key));
const STACK_LABELS = new Map(STACK_DEFS.map((d) => [d.key, d.label]));

// Below this many completed scans, per-checkId fail rates are too noisy to
// show as "real" — fall back to the researched defaults instead.
const MIN_SAMPLE_SCANS = 5;

const DEFAULT_RISK: Array<{ keys: StackKey[]; text: string }> = [
  {
    keys: ["supabase", "stripe"],
    text: "Supabase+Stripe apps commonly ship with missing RLS and unsigned webhooks.",
  },
  {
    keys: ["supabase", "auth"],
    text: "Supabase+Auth apps commonly ship with client-exposed service_role keys and missing RLS.",
  },
  {
    keys: ["stripe", "auth"],
    text: "Stripe+Auth apps commonly ship with unsigned webhooks and tokens stored in localStorage.",
  },
  { keys: ["supabase"], text: "Supabase apps commonly ship without RLS enabled on every table." },
  { keys: ["stripe"], text: "Stripe integrations commonly ship without webhook signature verification." },
  { keys: ["auth"], text: "Auth flows commonly ship with tokens in localStorage instead of httpOnly cookies." },
  { keys: ["firebase"], text: "Firebase apps commonly ship with open Firestore read/write rules." },
  { keys: ["fileUpload"], text: "Upload features commonly validate file type on the client only, never the server." },
  { keys: ["realtime"], text: "Realtime/chat features commonly skip server-side auth on the socket connection." },
  { keys: ["email"], text: "Email integrations commonly leave the sending API key reachable from the client bundle." },
  {
    keys: ["backgroundJobs"],
    text: "Background jobs commonly run without an idempotency check, so retries double-charge or double-send.",
  },
];

function defaultRiskLine(stackKeys: StackKey[]): string | null {
  const set = new Set(stackKeys);
  const byLength = [...DEFAULT_RISK].sort((a, b) => b.keys.length - a.keys.length);
  for (const entry of byLength) {
    if (entry.keys.every((k) => set.has(k))) return entry.text;
  }
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stackParam = url.searchParams.get("stack") ?? "";
  const stackKeys = stackParam
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StackKey => VALID_STACK_KEYS.has(s)) as StackKey[];

  if (stackKeys.length === 0) {
    return NextResponse.json({ text: null, source: "none" });
  }

  const fallback = defaultRiskLine(stackKeys);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ text: fallback, source: "default" });
  }

  try {
    const selection = getApplicableConstraints(stackKeys, "security");
    const relevantIds = [
      ...new Set(
        selection.primary.filter((c) => c.hasEngineCheck && c.critical).map((c) => c.checkId),
      ),
    ].slice(0, 4);

    if (relevantIds.length === 0) {
      return NextResponse.json({ text: fallback, source: "default" });
    }

    const db = getServiceClient();

    const { count: totalScans } = await db
      .from("scans")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed");

    if (!totalScans || totalScans < MIN_SAMPLE_SCANS) {
      return NextResponse.json({ text: fallback, source: "default", totalScans: totalScans ?? 0 });
    }

    const { data: rows, error } = await db
      .from("check_results")
      .select("check_id, passed, fix_suggestion, station_results!inner(scans!inner(status))")
      .in("check_id", relevantIds)
      .eq("station_results.scans.status", "completed");

    if (error || !rows) {
      return NextResponse.json({ text: fallback, source: "default" });
    }

    const records: ScanCheckRecord[] = rows.map((r) => ({
      check_id: r["check_id"] as string,
      passed: r["passed"] as boolean,
      fix_suggestion: (r["fix_suggestion"] as string | null) ?? null,
    }));

    const frequencies = computeFailFrequencies(records, totalScans);
    const withData = frequencies.filter((f) => relevantIds.includes(f.checkId) && f.failCount > 0);

    if (withData.length === 0) {
      return NextResponse.json({ text: fallback, source: "default", totalScans });
    }

    const stackLabel = stackKeys.map((k) => STACK_LABELS.get(k) ?? k).join("+");
    const parts = withData
      .slice(0, 2)
      .map((f) => `${f.checkId} in ${Math.round(f.failRate * 100)}% of scans`);
    const text = `${stackLabel} apps fail ${parts.join(" and ")}.`;

    return NextResponse.json({ text, source: "real", totalScans });
  } catch {
    return NextResponse.json({ text: fallback, source: "default" });
  }
}
