import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCategories, getPublishedArticles } from "@/lib/data";
import ArticleCard from "@/components/ArticleCard";

type Props = { params: Promise<{ category: string }> };

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const cats = await getCategories();
    if (!cats || cats.length === 0) return [];
    return cats.map((c) => ({
      category: encodeURIComponent(String(c)),
    }));
  } catch (error) {
    console.error("Error generating category static params:", error);
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  return {
    title: `${decoded} — آخر الأخبار`,
    description: `كل المقالات في تصنيف ${decoded} على beout سبورتس.`,
    alternates: { canonical: `/category/${encodeURIComponent(decoded)}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const decoded = decodeURIComponent(category);
  const all = await getPublishedArticles();
  const list = all.filter((a) => a.category === decoded);
  if (list.length === 0) notFound();

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-400">
        <Link href="/" className="hover:text-emerald-400">الرئيسية</Link>
        <span className="mx-2 text-slate-600">/</span>
        <span className="text-slate-300">{decoded}</span>
      </nav>
      <div className="mb-6">
        <span className="chip">تصنيف</span>
        <h1 className="mt-2 text-3xl font-extrabold text-white">{decoded}</h1>
        <p className="mt-1 text-sm text-slate-400">{list.length} مقال</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((a) => <ArticleCard key={a.id} article={a} />)}
      </div>
    </div>
  );
}
