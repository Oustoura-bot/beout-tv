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
          author: input.author?.trim() || "فريق تحرير بي آوت سبورتس",
          is_published: input.is_published ?? true,
          download_url: input.download_url?.trim() || null,
          download_code: input.download_code?.trim() || null,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error("createArticleAction error:", error);
      // إذا استمر خطأ Schema Cache، فهذا يعني أن Vercel يحتاج لإعادة بناء
      if (error.message.includes("schema cache")) {
        return { ok: false as const, error: "خطأ في ذاكرة التخزين (Schema Cache). يرجى إعادة نشر الموقع في Vercel مع خيار 'Clear Cache'." };
      }
      return { ok: false as const, error: error.message };
    }
    
    revalidatePath("/");
    revalidatePath("/admin/articles");
    return { ok: true as const, id: data.id, slug };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false as const, error: message };
  }
}

export async function updateArticleAction(id: string | number, input: ArticleInput) {
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
        author: input.author?.trim() || "فريق تحرير بي آوت سبورتس",
        is_published: input.is_published ?? true,
        download_url: input.download_url?.trim() || null,
        download_code: input.download_code?.trim() || null,
      })
      .eq("id", id);

    if (error) {
      console.error("updateArticleAction error:", error);
      if (error.message.includes("schema cache")) {
        return { ok: false as const, error: "خطأ في ذاكرة التخزين (Schema Cache). يرجى إعادة نشر الموقع في Vercel مع خيار 'Clear Cache'." };
      }
      return { ok: false as const, error: error.message };
    }
    
    revalidatePath("/");
    revalidatePath("/admin/articles");
    return { ok: true as const, slug };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false as const, error: message };
  }
}

export async function deleteArticleAction(id: string | number) {
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
    if (!supabase) return { ok: false as const, error: "Failed to initialize admin client" };

    const { error } = await supabase
      .from("site_settings")
      .update(input)
      .neq("updated_at", "1970-01-01") // dummy condition to allow update without id
      .limit(1);

    if (error) {
      console.error("updateSettingsAction error:", error.message);
      return { ok: false as const, error: error.message };
    }

    revalidatePath("/", "layout");
    revalidatePath("/admin/settings");
    return { ok: true as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return { ok: false as const, error: message };
  }
}

export async function incrementArticleViews(id: string | number) {
  try {
    const supabase = createAdminClient();
    if (!supabase) return;
    const { data } = await supabase.from("articles").select("views").eq("id", id).single();
    if (data) {
      await supabase.from("articles").update({ views: (data.views || 0) + 1 }).eq("id", id);
    }
  } catch (err) {
    console.error("incrementArticleViews error:", err);
  }
}

export async function incrementTotalVisits() {
  try {
    const supabase = createAdminClient();
    if (!supabase) return;
    
    const { data } = await supabase
      .from("site_settings")
      .select("total_visits")
      .limit(1)
      .maybeSingle();

    if (data) {
      await supabase
        .from("site_settings")
        .update({ total_visits: (data.total_visits || 0) + 1 })
        .neq("updated_at", "1970-01-01")
        .limit(1);
    }
  } catch (err) {
    console.error("incrementTotalVisits error:", err);
  }
}
