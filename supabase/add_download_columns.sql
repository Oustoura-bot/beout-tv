-- =====================================================================
-- FIX: Article download link not showing on article pages
-- Run this ONCE in Supabase SQL Editor (https://app.supabase.com > SQL Editor)
-- =====================================================================
-- Problem summary:
-- The admin panel saves `download_url` / `download_code` correctly, but these
-- two columns did not exist in the public.articles table schema (they were
-- missing from schema.sql and FIX_DATABASE.sql). Any value the panel sent was
-- either silently dropped or read back as NULL, so the download section never
-- rendered on the public article page.
-- =====================================================================

-- 1. Add the missing columns
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS download_url  text;
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS download_code text;

-- 2. Make sure no trigger drops them: inspect for any net.http_post-style
--    webhook trigger that could interfere with updates (harmless check).
DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN (SELECT trigger_name FROM information_schema.triggers
            WHERE event_object_table = 'articles'
              AND action_statement LIKE '%http_post%')
  LOOP
    RAISE NOTICE 'Found suspect trigger: %', t.trigger_name;
  END LOOP;
END $$;

-- 3. Force PostgREST schema cache reload so Vercel serverless functions
--    see the new columns immediately without waiting.
NOTIFY pgrst, 'reload schema';

-- =====================================================================
-- Done. Verify:
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'articles' ORDER BY ordinal_position;
-- =====================================================================
