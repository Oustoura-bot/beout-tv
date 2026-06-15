import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin/articles");
  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold text-white">لوحة الإدارة</h1>
        <p className="mt-1 text-sm text-slate-400">أدخل كلمة المرور للوصول إلى لوحة الإدارة.</p>
        <LoginForm />
      </div>
    </div>
  );
}
