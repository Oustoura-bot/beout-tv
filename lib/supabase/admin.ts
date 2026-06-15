import { createClient } from "@supabase/supabase-js";

// Uses the service role key — bypasses RLS. ONLY for server actions in /admin.
export const createAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // During static build without secrets, return null — callers must handle this.
    return null;
  }

  if (key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error(
      "SECURITY WARNING: SUPABASE_SERVICE_ROLE_KEY is the same as NEXT_PUBLIC_SUPABASE_ANON_KEY. This is a security risk. Please use the actual service role key from your Supabase dashboard."
    );
  }

  return createClient(
    url,
    key,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
};
