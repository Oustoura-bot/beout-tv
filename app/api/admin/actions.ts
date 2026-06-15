"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkAdminPassword, clearAdminCookie, isAdmin, setAdminCookie } from "@/lib/admin-auth";
import type { ArticleInput, SettingsInput } from "@/lib/types";

// ---------- AUTH ----------
export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    return { ok: false, error: "كلمة المرور غير صحيحة" };
  }
  await setAdminCookie();
  redirect("/admin/articles");
}

export async function logoutAction() {
  await clearAdminCookie();
  redirect("/admin");
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin");
}

// ---------- ARTICLES ----------
async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("UNAUTHORIZED");
}

function slugifyServer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\u0600-\u06FFa-z0-9\-]+/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "")
    .slice(0, 120);
}

export async function createArticleAction(input: ArticleInput) {
  try {
    await assertAdmin();
    const supabase = createAdminClient();
    if (!supabase) {
      return { ok: false as const, error: "Failed to initialize admin client" };
    }
    const slug = input.slug?.trim() ? slugifyServer(input.slug) : slugifyServer(input.title);

    const { data, error } = await supabase
      .from("articles")
      .insert([
        {
          title: input.title.trim(),
          slug,
          excerpt: input.excerpt?.trim() || null,
          content: input.content,
          category: input.category.trim() || "عام",
          cover_image: input.cover_image.trim(),
          author: input.author?.trim() || "فريق تحرير بي آ اوت سبورتس",
          is_published: input.is_published ?? true,
        },
      ])
      .select("id")
      .single();

    if (error) {
      return { ok: false as const, error: error.message };
    }
    revalidatePath("/");
    revalidatePath(`/article/${slug}`);
    revalidatePath("/admin/articles");
    return { ok: true as const, id: data.id, slug };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false as const, error: message };
  }
}

export async function updateArticleAction(id: string, input: ArticleInput) {
  try {
    await assertAdmin();
    const supabase = createAdminClient();
    if (!supabase) {
      return { ok: false as const, error: "Failed to initialize admin client" };
    }
    const slug = input.slug?.trim() ? slugifyServer(input.slug) : slugifyServer(input.title);

    const { error } = await supabase
      .from("articles")
      .update({
        title: input.title.trim(),
        slug,
        excerpt: input.excerpt?.trim() || null,
        content: input.content,
        category: input.category.trim() || "عام",
        cover_image: input.cover_image.trim(),
        author: input.author?.trim() || "فريق تحرير بي آ اوت سبورتس",
        is_published: input.is_published ?? true,
      })
      .eq("id", id);

    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/");
    revalidatePath(`/article/${slug}`);
    revalidatePath("/admin/articles");
    return { ok: true as const, slug };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false as const, error: message };
  }
}

export async function deleteArticleAction(id: string) {
  try {
    await assertAdmin();
    const supabase = createAdminClient();
    if (!supabase) {
      return { ok: false as const, error: "Failed to initialize admin client" };
    }
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/articles");
    return { ok: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false as const, error: message };
  }
}

// ---------- SETTINGS ----------
export async function updateSettingsAction(input: SettingsInput) {
  try {
    await assertAdmin();
    const supabase = createAdminClient();
    if (!supabase) {
      return { ok: false as const, error: "Failed to initialize admin client" };
    }
    const id = "00000000-0000-0000-0000-000000000001";

    const update: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (v !== undefined) update[k] = v;
    }

    const { error } = await supabase
      .from("site_settings")
      .update(update)
      .eq("id", id);

    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/");
    revalidatePath("/admin/settings");
    return { ok: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false as const, error: message };
  }
}
