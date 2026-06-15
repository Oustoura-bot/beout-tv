"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/api/admin/actions";

export default function AdminNav() {
  const pathname = usePathname();
  const items = [
    { href: "/admin/articles", label: "إدارة المقالات" },
    { href: "/admin/settings", label: "الإعدادات العامة" },
  ];
  return (
    <div className="mb-6 rounded-2xl border border-ink-700 bg-ink-800/70 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-ink-700"
          >
            ← الموقع
          </Link>
          {items.map((it) => {
            const active = pathname?.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={
                  "rounded-lg px-3 py-2 text-sm font-semibold " +
                  (active
                    ? "bg-emerald-500 text-ink-950"
                    : "text-slate-200 hover:bg-ink-700")
                }
              >
                {it.label}
              </Link>
            );
          })}
        </div>
        <form action={logoutAction}>
          <button className="btn-ghost text-xs">تسجيل الخروج</button>
        </form>
      </div>
    </div>
  );
}
