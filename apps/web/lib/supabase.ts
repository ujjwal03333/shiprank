import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function cleanSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

function cleanServiceRoleKey(raw: string): string {
  return raw.trim().replace(/^["']|["']$/g, "").split("#")[0]!.trim();
}

function makeClient(): SupabaseClient | null {
  const urlRaw = process.env["SUPABASE_URL"];
  const keyRaw = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!urlRaw || !keyRaw) return null;
  const url = cleanSupabaseUrl(urlRaw);
  const key = cleanServiceRoleKey(keyRaw);
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function supabaseHost(): string | null {
  const raw = process.env["SUPABASE_URL"]?.trim();
  if (!raw) return null;
  try {
    return new URL(cleanSupabaseUrl(raw)).host;
  } catch {
    return "unparseable";
  }
}

// Lazily created — safe at module load time (env may not be set in test builds)
let _client: SupabaseClient | null | undefined;

export function getServiceClient(): SupabaseClient {
  if (_client === undefined) _client = makeClient();
  if (!_client) {
    throw new Error(
      "Supabase not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return _client;
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env["SUPABASE_URL"] && process.env["SUPABASE_SERVICE_ROLE_KEY"]);
}
