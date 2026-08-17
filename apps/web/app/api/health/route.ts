import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";

/** Cheap liveness probe for Vercel / uptime. Does not throw. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    supabase: isSupabaseConfigured(),
    time: new Date().toISOString(),
  });
}
