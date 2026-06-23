"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";

export async function updateArticleAction(formData: FormData) {
  if (!(await isAdmin())) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const cover_image = formData.get("cover_image") as string;
  const download_url = formData.get("download_url") as string;
  const download_code = formData.get("download_code") as string;
  const is_published = formData.get("is_published") === "true";

  // Debugging info
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT_SET";
  console.log("DEBUG: Using Supabase URL:", supabaseUrl);

  const { error } = await supabase
    .from("articles")
    .update({
      title,
      content,
      category,
      cover_image,
      download_url,
      download_code,
      is_published,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("DEBUG: Supabase Error:", error);
    let userFriendlyError = error.message;
    
    // Check if it's the notorious schema cache error
    if (error.message.includes("column") && error.message.includes("cache")) {
      userFriendlyError = `خطأ في الذاكرة (Schema Cache). الرابط المستخدم يبدأ بـ: ${supabaseUrl.substring(0, 15)}...`;
    }
    
    return { ok: false as const, error: userFriendlyError };
  }

  revalidatePath("/");
  revalidatePath("/admin/articles");
  return { ok: true as const };
}

export async function createArticleAction(formData: FormData) {
  if (!(await isAdmin())) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const category = formData.get("category") as string;
  const cover_image = formData.get("cover_image") as string;
  const download_url = formData.get("download_url") as string;
  const download_code = formData.get("download_code") as string;
  const is_published = formData.get("is_published") === "true";
  
  // Generate a simple slug from title
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const { error } = await supabase
    .from("articles")
    .insert({
      title,
      slug,
      content,
      category,
      cover_image,
      download_url,
      download_code,
      is_published,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error("DEBUG: Supabase Error:", error);
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/articles");
  return { ok: true as const };
}

export async function deleteArticleAction(id: string | number) {
  if (!(await isAdmin())) {
    return { ok: false as const, error: "Unauthorized" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("articles").delete().eq("id", id);

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/admin/articles");
  return { ok: true as const };
}
