"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Article, ArticleInput } from "@/lib/types";
import { createArticleAction, updateArticleAction } from "@/app/api/admin/actions";

type Props =
  | { mode: "create" }
  | { mode: "edit"; article: Article };

const DEFAULT_CATEGORIES = [
  "الدوري الإسباني",
  "الدوري الإنجليزي",
  "الدوري الإيطالي",
  "الدوري الفرنسي",
  "الدوري الألماني",
  "الدوري السعودي",
  "دوري أبطال أوروبا",
  "انتقالات",
  "منتخبات",
  "عام",
];

export default function ArticleForm(props: Props) {
  const router = useRouter();
  const isEdit = props.mode === "edit";
  const a = isEdit ? props.article : null;

  const [title, setTitle] = useState(a?.title ?? "");
  const [slug, setSlug] = useState(a?.slug ?? "");
  const [excerpt, setExcerpt] = useState(a?.excerpt ?? "");
  const [content, setContent] = useState(a?.content ?? "");
  const [category, setCategory] = useState(a?.category ?? "عام");
  const [coverImage, setCoverImage] = useState(a?.cover_image ?? "");
  const [author, setAuthor] = useState(a?.author ?? "فريق تحرير بي آوت سبورتس");
  const [isPublished, setIsPublished] = useState(a?.is_published ?? true);
  const [downloadUrl, setDownloadUrl] = useState(a?.download_url ?? "");
  const [downloadCode, setDownloadCode] = useState(a?.download_code ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !content.trim() || !coverImage.trim()) {
      setError("العنوان، المحتوى، وصورة الغلاف حقول مطلوبة.");
      return;
    }

    const input: ArticleInput = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      content: content.trim(),
      category: category.trim() || "عام",
      cover_image: coverImage.trim(),
      author: author.trim() || undefined,
      is_published: isPublished,
      download_url: downloadUrl.trim() || undefined,
      download_code: downloadCode.trim() || undefined,
    };

    setBusy(true);
    const res = isEdit
      ? await updateArticleAction((props as { article: Article }).article.id, input)
      : await createArticleAction(input);
    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/admin/articles");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="العنوان" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-field"
          />
        </Field>
        <Field label="الرابط الفرعي (Slug)" hint="اتركه فارغاً للتوليد التلقائي">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="example-article-title"
            className="input-field"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="التصنيف">
          <div className="flex gap-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="cat-list"
              className="input-field"
            />
            <datalist id="cat-list">
              {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
        </Field>
        <Field label="الكاتب">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="input-field"
          />
        </Field>
      </div>

      <Field label="مقتطف (Excerpt)" hint="وصف قصير يظهر في القائمة">
        <textarea
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          className="input-field"
        />
      </Field>

      <Field label="رابط صورة الغلاف (URL)" required hint="يمكنك استخدام روابط Unsplash أو أي CDN يدعم HTTPS">
        <input
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          required
          placeholder="https://images.unsplash.com/photo-..."
          className="input-field"
        />
      </Field>

      {coverImage && (
        <div className="overflow-hidden rounded-xl border border-ink-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage} alt="preview" className="h-48 w-full object-cover" />
        </div>
      )}

      <Field label="المحتوى" required hint="افصل بين الفقرات بسطر فارغ. يمكنك استخدام وسوم HTML مثل <img> للصور أو <a> للروابط.">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          required
          className="input-field leading-8"
        />
      </Field>

      <div className="flex items-center gap-2 py-2">
        <input
          type="checkbox"
          id="is_published"
          checked={isPublished}
          onChange={(e) => setIsPublished(e.target.checked)}
          className="h-5 w-5 rounded border-ink-700 bg-ink-900 text-emerald-500"
        />
        <label htmlFor="is_published" className="text-sm font-medium text-slate-200">
          منشور (يظهر في الموقع)
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 border-t border-ink-700 pt-4">
        <Field label="رابط التحميل (Download URL)" hint="اتركه فارغاً لإخفاء بلوك التحميل في نهاية المقال">
          <input
            value={downloadUrl}
            onChange={(e) => setDownloadUrl(e.target.value)}
            placeholder="https://example.com/download"
            className="input-field"
          />
        </Field>
        <Field label="كود التحميل / كلمة السر" hint="يظهر بجانب رابط التحميل">
          <input
            value={downloadCode}
            onChange={(e) => setDownloadCode(e.target.value)}
            placeholder="1234"
            className="input-field"
          />
        </Field>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "جارٍ الحفظ..." : isEdit ? "حفظ التعديلات" : "نشر المقال"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/articles")}
          className="btn-ghost"
        >
          إلغاء
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

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-200">
        {label} {required && <span className="text-emerald-400">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
