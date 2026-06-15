"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Article, ArticleInput } from "@/lib/types";
import { createArticleAction, updateArticleAction } from "@/app/api/admin/actions";
import { slugify } from "@/lib/utils";

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
  const [isPublished, setIsPublished] = useState<boolean>(a?.is_published ?? true);

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
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      category: category.trim() || "عام",
      cover_image: coverImage.trim(),
      author: author.trim(),
      is_published: isPublished,
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

  function autoSlug() {
    if (!slug) setSlug(slugify(title));
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-5 sm:p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="العنوان" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={autoSlug}
            required
            className="input"
          />
        </Field>
        <Field label="المعرّف (slug) — اتركه فارغًا للتوليد التلقائي">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-article-slug"
            className="input"
          />
        </Field>
      </div>

      <Field label="التصنيف">
        <div className="flex gap-2">
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            list="cat-list"
            className="input"
          />
          <datalist id="cat-list">
            {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </Field>

      <Field label="رابط صورة الغلاف (URL)" required hint="يمكنك استخدام روابط Unsplash أو أي CDN يدعم HTTPS">
        <input
          value={coverImage}
          onChange={(e) => setCoverImage(e.target.value)}
          required
          placeholder="https://images.unsplash.com/photo-..."
          className="input"
        />
      </Field>

      {coverImage && (
        <div className="overflow-hidden rounded-xl border border-ink-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={coverImage} alt="preview" className="h-48 w-full object-cover" />
        </div>
      )}

      <Field label="المقتطف (excerpt)">
        <textarea
          value={excerpt ?? ""}
          onChange={(e) => setExcerpt(e.target.value)}
          rows={2}
          className="input"
        />
      </Field>

      <Field label="المحتوى" required hint="افصل بين الفقرات بسطر فارغ">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={12}
          required
          className="input leading-8"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="الكاتب">
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="الحالة">
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            منشور (يظهر في الموقع)
          </label>
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
