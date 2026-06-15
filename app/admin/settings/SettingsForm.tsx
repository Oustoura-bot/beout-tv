"use client";

import { useState } from "react";
import type { SiteSettings } from "@/lib/types";
import { updateSettingsAction } from "@/app/api/admin/actions";

export default function SettingsForm({ initial }: { initial: SiteSettings | null }) {
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [appName, setAppName] = useState(initial?.app_name ?? "beout");
  const [appCode, setAppCode] = useState(initial?.app_code ?? "BE2024");
  const [downloadLink, setDownloadLink] = useState(initial?.download_link ?? "https://beout.app/download");
  const [siteDescription, setSiteDescription] = useState(initial?.site_description ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "contact@beout.app");
  const [bannerImage, setBannerImage] = useState(initial?.banner_image ?? "");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await updateSettingsAction({
      logo_url: logoUrl,
      app_name: appName,
      app_code: appCode,
      download_link: downloadLink,
      site_description: siteDescription,
      contact_email: contactEmail,
      banner_image: bannerImage,
    });
    setBusy(false);
    if (!res.ok) setMsg({ type: "err", text: res.error });
    else setMsg({ type: "ok", text: "تم حفظ الإعدادات بنجاح ✓" });
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم التطبيق">
          <input value={appName} onChange={(e) => setAppName(e.target.value)} className="input" />
        </Field>
        <Field label="كود التطبيق">
          <input value={appCode} onChange={(e) => setAppCode(e.target.value)} className="input" />
        </Field>
      </div>

      <Field label="رابط الشعار (URL)">
        <input
          value={logoUrl ?? ""}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          className="input"
        />
      </Field>

      {logoUrl && (
        <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
          <div className="mb-2 text-xs text-slate-400">معاينة الشعار:</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt="logo" className="h-12 w-12 rounded-lg bg-ink-800 object-contain p-1" />
        </div>
      )}

      <Field label="صورة البانر الرئيسي (URL)">
        <input
          value={bannerImage}
          onChange={(e) => setBannerImage(e.target.value)}
          placeholder="https://..."
          className="input"
          dir="ltr"
        />
      </Field>

      {bannerImage && (
        <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
          <div className="mb-2 text-xs text-slate-400">معاينة البانر:</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerImage} alt="banner" className="w-full max-w-sm rounded-xl object-cover" style={{aspectRatio:"16/10"}} />
        </div>
      )}

      <Field label="رابط التحميل">
        <input
          value={downloadLink}
          onChange={(e) => setDownloadLink(e.target.value)}
          className="input"
          dir="ltr"
        />
      </Field>

      <Field label="وصف الموقع (لـ SEO)">
        <textarea
          value={siteDescription}
          onChange={(e) => setSiteDescription(e.target.value)}
          rows={3}
          className="input"
        />
      </Field>

      <Field label="البريد الإلكتروني للتواصل">
        <input
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="input"
          dir="ltr"
        />
      </Field>

      {msg && (
        <div
          className={
            "rounded-lg border px-3 py-2 text-sm " +
            (msg.type === "ok"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300")
          }
        >
          {msg.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #334155;
          background: #1E293B;
          color: #E2E8F0;
          padding: 0.6rem 0.75rem;
          font-size: 0.95rem;
          outline: none;
        }
        .input:focus {
          border-color: #10B981;
          box-shadow: 0 0 0 2px rgba(16,185,129,0.15);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-200">{label}</span>
      {children}
    </label>
  );
}
