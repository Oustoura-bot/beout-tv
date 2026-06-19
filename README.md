# beout Sports — Next.js + Supabase

High-performance Arabic (RTL) sports news site inspired by **bololo90.com** with the **beout App** visual identity (dark mode `#0F172A` + emerald `#10B981`).

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** (custom dark + emerald theme)
- **Supabase** (Postgres + RLS)
- **Cairo / Tajawal** Arabic webfonts

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>

## Supabase setup

1. Open Supabase → SQL Editor
2. Paste the contents of [`supabase/schema.sql`](./supabase/schema.sql)
3. Run it. It will:
   - Create the `articles` and `site_settings` tables
   - Enable RLS with public read policies
   - Insert the single settings row
   - Seed **20 real Arabic sports articles**

## Admin panel

- URL: `/admin`
- Default password: `beout-admin-2024` (set in `.env.local` → `ADMIN_PASSWORD`)
- Manage articles (create / edit / delete / publish)
- Update global settings: **logo, app name, app code, download link**

## Project structure

```
app/
  layout.tsx           Root layout, RTL, dark theme, fonts
  page.tsx             Homepage with in-feed promos (App Code + Download)
  article/[slug]/page  Article detail
  privacy/page.tsx     Privacy policy
  about/page.tsx       About us
  contact/page.tsx     Contact us
  admin/
    page.tsx           Password gate
    articles/          Article manager
    settings/          Global settings
  api/admin/           Server actions for admin
  sitemap.ts           Auto-generated sitemap
  robots.ts            robots.txt
components/
  Header / Footer
  ArticleCard / AppCodeCard / DownloadBanner
  AdminTable / AdminForm ...
lib/
  supabase/            Supabase clients (browser, server, admin)
  data.ts              Data fetchers
  types.ts             Shared types
```
\n# Deployment Update: Fri Jun 19 11:16:57 UTC 2026
