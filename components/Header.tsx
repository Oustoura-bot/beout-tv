"use client";

import Link from "next/link";
import { useState } from "react";
import type { SiteSettings } from "@/lib/types";

export default function Header({ settings }: { settings: SiteSettings | null }) {
  const [open, setOpen] = useState(false);
  const logo = settings?.logo_url;
  const appName = settings?.app_name ?? "beout";

  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-900/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={appName}
              className="h-9 w-9 rounded-lg bg-ink-800 object-contain p-1"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-ink-950 font-black">
              b
            </div>
          )}
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-extrabold text-white">{appName}</span>
            <span className="text-[11px] text-emerald-400">سبورتس</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link href="/" className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-ink-800">
            الرئيسية
          </Link>
          <Link href="/about" className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-ink-800">
            من نحن
          </Link>
          <Link href="/contact" className="rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-ink-800">
            اتصل بنا
          </Link>
          <Link
            href={settings?.download_link || "#"}
            className="btn-primary ms-2 px-3 py-2 text-sm"
          >
            حمّل التطبيق
          </Link>
        </nav>

        <button
          aria-label="القائمة"
          className="rounded-lg p-2 text-slate-200 hover:bg-ink-800 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-ink-700/70 bg-ink-900 md:hidden">
          <div className="container-x flex flex-col gap-1 py-2">
            <Link href="/" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-800">
              الرئيسية
            </Link>
            <Link href="/about" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-800">
              من نحن
            </Link>
            <Link href="/contact" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 hover:bg-ink-800">
              اتصل بنا
            </Link>
            <Link
              href={settings?.download_link || "#"}
              onClick={() => setOpen(false)}
              className="btn-primary mt-1 px-3 py-2 text-sm"
            >
              حمّل التطبيق
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
