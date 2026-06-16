"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import type { Article } from "@/lib/types";
import { deleteArticleAction } from "@/app/api/admin/actions";
import { formatDateAr } from "@/lib/utils";

export default function ArticlesTable({ articles }: { articles: Article[] }) {
  const [items, setItems] = useState(articles);
  const [busy, setBusy] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا المقال؟")) return;
    setBusy(id);
    const res = await deleteArticleAction(id);
    if (res.ok) {
      setItems((arr) => arr.filter((a) => a.id !== id));
    } else {
      alert(res.error);
    }
    setBusy(null);
  }

  if (items.length === 0) {
    return (
      <div className="card grid place-items-center p-10 text-center text-slate-400">
        لا توجد مقالات بعد. ابدأ بإضافة أول مقال.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="hidden grid-cols-[1fr,120px,120px,100px,120px,140px] gap-3 border-b border-ink-700 bg-ink-800/80 px-4 py-3 text-xs font-semibold text-slate-300 sm:grid">
        <div>العنوان</div>
        <div>التصنيف</div>
        <div>الكاتب</div>
        <div>المشاهدات</div>
        <div>التاريخ</div>
        <div className="text-left">إجراءات</div>
      </div>
      <ul className="divide-y divide-ink-700">
        {items.map((a) => (
          <li key={a.id} className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr,120px,120px,100px,120px,140px] sm:items-center">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-16 overflow-hidden rounded-lg border border-ink-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.cover_image} alt={a.title} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="font-bold text-white">{a.title}</div>
                <Link className="text-xs text-emerald-400 hover:underline" href={`/article/${a.slug}`} target="_blank">
                  /article/{a.slug} ↗
                </Link>
              </div>
            </div>
            <div className="text-sm text-slate-300"><span className="chip">{a.category}</span></div>
            <div className="text-sm text-slate-400">{a.author}</div>
            <div className="text-sm font-mono text-emerald-400">{a.views.toLocaleString()}</div>
            <div className="text-sm text-slate-400">{formatDateAr(a.created_at)}</div>
            <div className="flex items-center justify-start gap-2 sm:justify-end">
              <Link href={`/admin/articles/${a.id}`} className="btn-ghost px-3 py-1.5 text-xs">تعديل</Link>
              <button
                onClick={() => onDelete(a.id)}
                disabled={busy === a.id}
                className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                {busy === a.id ? "..." : "حذف"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
