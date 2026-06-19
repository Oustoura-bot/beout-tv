import type { Metadata } from "next";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "اتصل بنا",
  description: "تواصل مع فريق beout سبورتس — ملاحظاتك تهمّنا.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const settings = await getSettings();
  const email = settings?.contact_email ?? "contact@beout-tv.site";

  return (
    <article className="prose-ar mx-auto max-w-3xl text-slate-200">
      <h1 className="text-3xl font-extrabold text-white">اتصل بنا</h1>
      <p>
        نسعد بسماع ملاحظاتك واقتراحاتك. اختر الطريقة الأنسب لك:
      </p>

      <h2>البريد الإلكتروني</h2>
      <p>
        للأخبار والملاحظات العامة: <a className="text-emerald-400 hover:underline" href={`mailto:${email}`}>{email}</a>
      </p>

      <h2>أرسل لنا رسالة</h2>
      <form
        action={`mailto:${email}`}
        method="post"
        encType="text/plain"
        className="mt-2 grid gap-3"
      >
        <label className="text-sm text-slate-300">
          الاسم
          <input
            type="text"
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="text-sm text-slate-300">
          البريد الإلكتروني
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
        <label className="text-sm text-slate-300">
          رسالتك
          <textarea
            name="message"
            rows={5}
            required
            className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
          />
        </label>
        <button type="submit" className="btn-primary w-fit">إرسال</button>
      </form>

      <h2>التعاون والشراكات</h2>
      <p>
        للشراكات والتعاون التجاري، راسلنا على نفس البريد مع ذكر «شراكة» في عنوان الرسالة.
      </p>
    </article>
  );
}
