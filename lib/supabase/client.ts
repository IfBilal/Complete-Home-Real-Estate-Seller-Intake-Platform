import { createBrowserClient } from "@supabase/ssr";

// Browser-only Supabase client. Uses the anon key — respects RLS.
// Import this inside "use client" components only.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
