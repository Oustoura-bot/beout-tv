import type { SiteSettings } from "@/lib/types";
import { CopyButton } from "./CopyButton";

export default function AppCodeCard({ settings }: { settings: SiteSettings | null }) {
  const code = settings?.app_code ?? "BE2024";
  const appName = settings?.app_name ?? "beout";
  return (
    <div className="relative col-span-full overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-l from-emerald-500/10 via-ink-800 to-ink-800 p-6 shadow-glow sm:p-8">
      <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute -right-20 -bottom-20 h-60 w-60 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="chip">حصرياً</span>
          <h3 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
            كود تطبيق {appName} <span className="text-emerald-400">{code}</span>
          </h3>
          <p className="mt-2 max-w-xl text-sm leading-7 text-slate-300">
            استخدم الكود التالي داخل تطبيق {appName} للاستمتاع ببثّ مباشر، ترجمة فورية، وإشعارات المباريات لحظة بلحظة.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="flex-1 select-all rounded-xl border border-emerald-500/40 bg-ink-950/60 px-4 py-3 text-center font-mono text-xl font-bold tracking-widest text-emerald-400 sm:flex-none">
            {code}
          </div>
          <CopyButton text={code} />
        </div>
      </div>
    </div>
  );
}
