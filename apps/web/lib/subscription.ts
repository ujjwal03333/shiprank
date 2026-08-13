import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Plan } from "./plan-gating";

export const API_KEY_PREFIX = "shiprank_live_";
export const SESSION_COOKIE = "shiprank_api_key";

/** shiprank_live_ + 48 hex chars (24 random bytes). */
export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(24).toString("hex");
}

export function isValidApiKeyFormat(key: string): boolean {
  return new RegExp(`^${API_KEY_PREFIX}[0-9a-f]{48}$`).test(key);
}

/**
 * API key from `Authorization: Bearer <key>` (CLI, MCP, programmatic use)
 * or the browser session cookie set after a successful checkout.
 */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const key = auth.slice("Bearer ".length).trim();
    if (isValidApiKeyFormat(key)) return key;
  }

  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name === SESSION_COOKIE) {
        const value = decodeURIComponent(rest.join("="));
        if (isValidApiKeyFormat(value)) return value;
      }
    }
  }

  return null;
}

export interface ResolvedPlan {
  subscriptionId: string | null;
  plan: Plan;
  email: string | null;
  status: string | null;
  expiresAt: string | null;
}

const FREE_PLAN: ResolvedPlan = {
  subscriptionId: null,
  plan: "free",
  email: null,
  status: null,
  expiresAt: null,
};

/**
 * Resolves a plan from an already-extracted API key. Defaults to 'free' for
 * no key, an unknown key, an inactive subscription, an expired subscription,
 * or — importantly — if the `subscriptions` table/migration doesn't exist
 * yet. That last case matters: it means every gated route degrades to the
 * free (redacted) response instead of throwing, exactly like the
 * leaderboard's pre-migration fallback.
 *
 * Split from resolvePlan() so server components (which have no raw Request,
 * only next/headers' cookies()) can resolve a plan without needing one.
 */
export async function resolvePlanForApiKey(
  db: SupabaseClient,
  apiKey: string | null,
): Promise<ResolvedPlan> {
  if (!apiKey) return FREE_PLAN;

  const { data, error } = await db
    .from("subscriptions")
    .select("id, plan, status, user_email, expires_at")
    .eq("api_key", apiKey)
    .maybeSingle();

  if (error || !data) return FREE_PLAN;
  if (data["status"] !== "active") return FREE_PLAN;
  if (data["expires_at"] && new Date(data["expires_at"] as string) < new Date()) {
    return FREE_PLAN;
  }

  return {
    subscriptionId: data["id"] as string,
    plan: data["plan"] as Plan,
    email: data["user_email"] as string,
    status: data["status"] as string,
    expiresAt: (data["expires_at"] as string | null) ?? null,
  };
}

/** Resolves a plan straight from an API route's Request (header or cookie). */
export async function resolvePlan(
  db: SupabaseClient,
  request: Request,
): Promise<ResolvedPlan> {
  return resolvePlanForApiKey(db, extractApiKey(request));
}
