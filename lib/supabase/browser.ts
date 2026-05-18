import { createClient, SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: SupabaseClient<any> | null = null;

// Browser-only: anon key, read-only via RLS. Used only for Realtime subscriptions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBrowserClient(): SupabaseClient<any> {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
