import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import AdminNav from "../../AdminNav";
import ArticleForm from "../ArticleForm";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  if (!(await isAdmin())) redirect("/admin");
  return (
    <div>
      <AdminNav />
      <h1 className="mb-4 text-2xl font-extrabold text-white">مقال جديد</h1>
      <ArticleForm mode="create" />
    </div>
  );
}
