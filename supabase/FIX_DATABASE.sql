-- =====================================================================
-- DATABASE FIX FOR beout-tv
-- Run this in Supabase SQL Editor to fix schema mismatches and broken triggers.
-- =====================================================================

-- 1. Fix articles table columns
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS cover_image text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS author text DEFAULT 'فريق تحرير بي آوت سبورتس';
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS views integer DEFAULT 0;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Rename image_url to cover_image if it exists and cover_image is null
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='articles' AND column_name='image_url') THEN
        UPDATE public.articles SET cover_image = image_url WHERE cover_image IS NULL;
    END IF;
END $$;

-- 2b. Add article download-link columns (missing from original schema)
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS download_url  text;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS download_code text;
-- 3. DISABLE BROKEN TRIGGERS
-- The error "function net.http_post does not exist" indicates a broken webhook trigger.
-- We will disable all triggers on articles table to allow saving.
DO $$ 
DECLARE 
    trgname RECORD;
BEGIN 
    FOR trgname IN (SELECT trigger_name FROM information_schema.triggers WHERE event_object_table='articles') 
    LOOP 
        EXECUTE 'ALTER TABLE public.articles DISABLE TRIGGER ' || quote_ident(trgname.trigger_name);
    END LOOP;
END $$;

-- 4. Fix site_settings table (ensure it matches the expected schema)
-- If your site_settings is (key, value) style, the code expects specific columns.
-- We will create the expected table if it's missing the columns.
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS app_name text DEFAULT 'beout';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS app_code text DEFAULT 'BE2024';
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS download_link text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS android_link text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS ios_link text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS site_description text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS banner_image text;
ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS total_visits integer DEFAULT 0;

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
-- =====================================================================
-- NOTE: the download columns were extracted into their own dedicated
-- script: supabase/add_download_columns.sql — run it if this file fails.
