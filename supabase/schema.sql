-- =====================================================================
-- beout Sports — Database schema + seed data
-- Run this in Supabase SQL Editor (https://app.supabase.com) once.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

create table if not exists public.articles (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  slug          text        not null unique,
  excerpt       text,
  content       text        not null,
  category      text        not null default 'general',
  cover_image   text        not null,
  author        text        default 'فريق تحرير بي آوت سبورتس',
  is_published  boolean     not null default true,
  views         integer     not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists articles_created_at_idx on public.articles (created_at desc);
create index if not exists articles_category_idx   on public.articles (category);
create index if not exists articles_published_idx  on public.articles (is_published);

create table if not exists public.site_settings (
  id               uuid primary key default gen_random_uuid(),
  logo_url         text,
  app_name         text        default 'beout',
  app_code         text        default 'BE2024',
  download_link    text        default 'https://beout-tv.site/download',
  android_link     text,
  ios_link         text,
  site_description text        default 'آخر أخبار الرياضة العالمية والعربية لحظة بلحظة',
  contact_email    text        default 'contact@beout-tv.site',
  banner_image     text,
  total_visits     integer     not null default 0,
  updated_at       timestamptz not null default now()
);

-- Single-row settings table: ensure exactly one row
insert into public.site_settings (id, logo_url, app_name, app_code, download_link, android_link, ios_link, site_description, contact_email, total_visits)
values (
  '00000000-0000-0000-0000-000000000001',
  'https://ptaxgqvhzxkusedzlitb.supabase.co/storage/v1/object/public/assets/beout-logo.png',
  'beout',
  'BE2024',
  'https://beout-tv.site/download',
  '#',
  '#',
  'beout سبورتس — كل أخبار كرة القدم، الانتقالات، ودوريات أوروبا والعرب في مكان واحد.',
  'contact@beout-tv.site',
  0
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. AUTO-UPDATE updated_at
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_articles_updated_at on public.articles;
create trigger trg_articles_updated_at
  before update on public.articles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_updated_at on public.site_settings;
create trigger trg_settings_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------

alter table public.articles       enable row level security;
alter table public.site_settings  enable row level security;

-- Public can read published articles
drop policy if exists "public read articles" on public.articles;
create policy "public read articles"
  on public.articles for select
  using ( is_published = true );

-- Public can read site_settings (single row, harmless)
drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings"
  on public.site_settings for select
  using ( true );

-- Writes happen via service role key from the admin panel.
-- If you want client-side writes, add policies that check auth.role() = 'authenticated'.
