import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { Article, SiteSettings } from "./types";

// Build-time safe client: uses service role (bypasses RLS, no cookies).
const buildClient = () => createAdminClient();

export async function getSettings(): Promise<SiteSettings | null> {
  const supabase = buildClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle();
    
  if (error) {
    console.error("getSettings error:", error.message);
    return null;
  }
  return (data as SiteSettings) ?? null;
}

export async function getPublishedArticles(limit?: number): Promise<Article[]> {
  const supabase = buildClient();
  if (!supabase) return [];
  let q = supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) {
    console.error("getPublishedArticles error:", error.message);
    return [];
  }
  return (data as Article[]) ?? [];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = buildClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("getArticleBySlug error:", error.message);
    return null;
  }
  return (data as Article) ?? null;
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const supabase = buildClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("slug")
    .eq("is_published", true);
  if (error) {
    console.error("getAllArticleSlugs error:", error.message);
    return [];
  }
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

export async function getCategories(): Promise<string[]> {
  const supabase = buildClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("articles")
    .select("category")
    .eq("is_published", true);
  if (error) return [];
  return Array.from(new Set((data ?? []).map((r: { category: string | null }) => r.category as string)));
}

export const createServerClient = createClient;
