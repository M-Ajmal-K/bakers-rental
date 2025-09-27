// lib/supabaseAdmin.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Guard against missing env on the server
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
if (!serviceRoleKey) throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");

/**
 * Singleton admin client (service role) — server-only.
 * Never expose the service role key to the client.
 */
let _admin: SupabaseClient | null = null;

export const supabaseAdmin: SupabaseClient = (() => {
  if (_admin) return _admin;
  _admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
    global: { headers: { "X-Client-Info": "bakers-rentals-admin" } },
  });
  return _admin;
})();
