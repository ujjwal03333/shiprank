import { NextResponse } from "next/server";
import { getServiceClient, isSupabaseConfigured } from "@/lib/supabase";
import { resolvePlan } from "@/lib/subscription";

/**
 * GET /api/account — current plan status from the caller's API key
 * (Authorization: Bearer ...) or session cookie. Always resolves to at
 * least the free plan; never errors for an anonymous/unknown caller.
 */
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    // No DB configured at all — still answer honestly with the free plan
    // rather than a 503, since "free" requires no backend state.
    return NextResponse.json({
      plan: "free",
      status: null,
      email: null,
      expires_at: null,
    });
  }

  try {
    const db = getServiceClient();
    const resolved = await resolvePlan(db, request);

    return NextResponse.json({
      plan: resolved.plan,
      status: resolved.status,
      email: resolved.email,
      expires_at: resolved.expiresAt,
    });
  } catch {
    // Same contract as the not-configured branch above: an unknown caller
    // always resolves to at least the free plan, never a hard error.
    return NextResponse.json({
      plan: "free",
      status: null,
      email: null,
      expires_at: null,
    });
  }
}
