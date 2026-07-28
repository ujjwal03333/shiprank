import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function makeClient(): SupabaseClient | null {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
