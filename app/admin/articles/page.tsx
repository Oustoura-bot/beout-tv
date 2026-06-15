import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";
import AdminNav from "../AdminNav";
import ArticlesTable from "./ArticlesTable";

export const dynamic = "force-dynamic";

export default async function ArticlesAdminPage() {
  if (!(await isAdmin())) redirect("/admin");

  let data: Article[] = [];
  let error: { message: string } | null = null;

  try {
    const supabase = await createClient();
    if (!supabase) {
      error = { message: "Failed to initialize Supabase client" };
    } else {
      const result = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });
      if (result.error) {
        error = result.error;
      } else {
        data = result.data || [];
      }
    }
  } catch (err) {
    error = {
      message: err instanceof Error ? err.message : "An unexpected error occurred",
    };
  }

  return (
    <div>
      <AdminNav />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-white">إدارة المقالات</h1>
        <a href="/admin/articles/new" className="btn-primary">
          + مقال جديد
        </a>
      </div>
      {error && (
        <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error.message}
        </div>
      )}
      <ArticlesTable articles={data} />
    </div>
  );
}
