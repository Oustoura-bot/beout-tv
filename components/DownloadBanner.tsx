import Link from "next/link";
import type { SiteSettings } from "@/lib/types";

const DEFAULT_BANNER = "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80";

export default function DownloadBanner({ settings }: { settings: SiteSettings | null }) {
  const appName = settings?.app_name ?? "beout";
  const link = settings?.download_link || "#";
  const bannerImage = settings?.banner_image || DEFAULT_BANNER;
  return (
    <div className="relative col-span-full overflow-hidden rounded-2xl border border-ink-700 bg-ink-800 p-6 sm:p-8">
      <div className="grid items-center gap-6 md:grid-cols-[1.2fr,1fr]">
        <div>
          <span className="chip">حمّل التطبيق</span>
          <h3 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            كل أخبارك الرياضية في <span className="text-emerald-400">{appName}</span>
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-300">
            تابع كل المباريات، النتائج، الانتقالات، وأخبار نجومك المفضلين مباشرة من جوالك.
            التطبيق مجاني ومتوفر لأجهزة iOS و Android.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link href={link} className="btn-primary">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42L11 13.6V4a1 1 0 0 1 1-1zM4 19a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1z" />
              </svg>
              حمّل الآن
            </Link>
            <Link href="/" className="btn-ghost">
              تعرّف على المزيد
            </Link>
          </div>
        </div>
        <div className="relative">
          <div className="mx-auto aspect-[16/10] w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bannerImage}
              alt={`${appName} banner`}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
