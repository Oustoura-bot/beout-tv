import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/data";
import AdminNav from "../AdminNav";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsAdminPage() {
  if (!(await isAdmin())) redirect("/admin");
  const settings = await getSettings();

  return (
    <div>
      <AdminNav />
      <h1 className="mb-4 text-2xl font-extrabold text-white">الإعدادات العامة</h1>
      <p className="mb-5 text-sm text-slate-400">
        تتحكم هذه الإعدادات في الشعار، اسم التطبيق، كود التطبيق، ورابط التحميل المعروض في الواجهة.
      </p>
      <SettingsForm initial={settings} />
    </div>
  );
}
