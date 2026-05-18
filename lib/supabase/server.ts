import { createClient } from "@supabase/supabase-js";

// Server-only: uses service role key — never import this on the client.
// We avoid the Database generic here to prevent supabase-js v2 type resolution issues;
// types are enforced at the query-result level via explicit casts in queries/actions.
export function createServerClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return createClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
