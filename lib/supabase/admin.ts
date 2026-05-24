import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. Bypasses ALL Row Level Security.
// ONLY import this in server-side API route files.
// NEVER import in "use client" files or pass to the browser in any way.
// The service role key must stay server-only — verify with:
//   grep -r "SUPABASE_SERVICE_ROLE_KEY" app/ → must return zero results
export const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
