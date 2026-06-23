"use client";

import { useState } from "react";
import type { SiteSettings } from "@/lib/types";
import { updateSettingsAction } from "@/app/api/admin/actions";

export default function SettingsForm({ initial }: { initial: SiteSettings | null }) {
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? "");
  const [appName, setAppName] = useState(initial?.app_name ?? "beout");
  const [siteDescription, setSiteDescription] = useState(initial?.site_description ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? "contact@beout-tv.site");
  const [bannerImage, setBannerImage] = useState(initial?.banner_image ?? "");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await updateSettingsAction({
      logo_url: logoUrl || null,
      app_name: appName || null,
      site_description: siteDescription || null,
      contact_email: contactEmail || null,
      banner_image: bannerImage || null,
    });
    setBusy(false);
    if (!res.ok) setMsg({ type: "err", text: res.error });
    else setMsg({ type: "ok", text: "تم حفظ الإعدادات بنجاح ✓" });
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم الموقع">
          <input value={appName} onChange={(e) => setAppName(e.target.value)} className="input-field" />
        </Field>
      </div>

      <Field label="رابط الشعار (URL)">
        <input
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="https://..."
          className="input-field"
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
          className="input-field"
          dir="ltr"
        />
      </Field>

      <Field label="وصف الموقع (لـ SEO)">
        <textarea
          value={siteDescription}
          onChange={(e) => setSiteDescription(e.target.value)}
          rows={3}
          className="input-field"
        />
      </Field>

      <Field label="البريد الإلكتروني للتواصل">
        <input
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="input-field"
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
        .input-field {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #334155;
          background: #1E293B;
          color: #E2E8F0;
          padding: 0.6rem 0.75rem;
          font-size: 0.95rem;
          outline: none;
        }
        .input-field:focus {
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
