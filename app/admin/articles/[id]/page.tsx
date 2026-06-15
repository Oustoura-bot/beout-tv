import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "../../AdminNav";
import ArticleForm from "../ArticleForm";
import type { Article } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin");

  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const article = data as Article;

  return (
    <div>
      <AdminNav />
      <h1 className="mb-4 text-2xl font-extrabold text-white">تعديل المقال</h1>
      <ArticleForm mode="edit" article={article} />
    </div>
  );
}
