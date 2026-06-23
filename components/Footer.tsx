import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

export default function Footer({ settings }: { settings: SiteSettings | null }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 border-t border-ink-700/70 bg-ink-950/60">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            {settings?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={settings.logo_url}
                alt={settings.app_name || "logo"}
                className="h-8 w-8 rounded-lg bg-ink-800 object-contain p-1"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-ink-950 font-black">
                b
              </div>
            )}
            <span className="text-base font-extrabold text-white">
              {settings?.app_name ?? "beout"} <span className="text-emerald-400">سبورتس</span>
            </span>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            {settings?.site_description ??
              "آخر أخبار الرياضة العالمية والعربية لحظة بلحظة."}
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-white">روابط سريعة</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><Link className="hover:text-emerald-400" href="/">الرئيسية</Link></li>
            <li><Link className="hover:text-emerald-400" href="/about">من نحن</Link></li>
            <li><Link className="hover:text-emerald-400" href="/contact">اتصل بنا</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-white">المزيد</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li><Link className="hover:text-emerald-400" href="/privacy">سياسة الخصوصية</Link></li>
            <li><Link className="hover:text-emerald-400" href="/about">من نحن</Link></li>
            <li><Link className="hover:text-emerald-400" href="/contact">اتصل بنا</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-bold text-white">تواصل</h3>
          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              <a className="hover:text-emerald-400" href={`mailto:${settings?.contact_email ?? "contact@beout-tv.site"}`}>
                {settings?.contact_email ?? "contact@beout-tv.site"}
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-700/70">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-4 text-xs text-slate-500 sm:flex-row">
          <span>© {year} {settings?.app_name ?? "beout"} سبورتس. جميع الحقوق محفوظة.</span>
          <span>صُنع بـ ❤️ لعشّاق كرة القدم</span>
        </div>
      </div>
    </footer>
  );
}
