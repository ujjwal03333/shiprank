import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseHost } from "@/lib/supabase";
import { getSupabaseProbeError, supabaseAvailable } from "@/lib/dare-store";
import {
  CONTROLLED_HOST,
  isForeignShiprankHost,
  publicAppUrl,
} from "@/lib/public-url";

/** Cheap liveness probe for Vercel / uptime. Does not throw. */
export async function GET() {
  const rawAppUrl = process.env["NEXT_PUBLIC_APP_URL"]?.trim() ?? null;
  const origin = publicAppUrl();
  const rawIsForeign = rawAppUrl != null && isForeignShiprankHost(rawAppUrl);

  const scanJobs = await supabaseAvailable();

  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured(),
    supabaseHost: supabaseHost(),
    scanJobs,
    scanJobsError: getSupabaseProbeError(),
    origin,
    originSafe: !isForeignShiprankHost(origin) && !rawIsForeign,
    rawAppUrl,
    rawIsForeign,
    controlledHost: CONTROLLED_HOST,
    time: new Date().toISOString(),
  });
}
