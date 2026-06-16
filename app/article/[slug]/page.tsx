import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug, getAllArticleSlugs, getPublishedArticles } from "@/lib/data";
import { formatDateAr, stripHtml } from "@/lib/utils";
import ArticleCard from "@/components/ArticleCard";
import { incrementArticleViews } from "@/app/api/admin/actions";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getAllArticleSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // Build-time env vars not available (e.g. Vercel preview without secrets)
    // Pages will be generated on-demand at runtime instead.
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const article = await getArticleBySlug(decodedSlug);
  if (!article) return { title: "مقال غير موجود" };
  const description =
    article.excerpt ?? stripHtml(article.content).slice(0, 160);
  return {
    title: article.title,
    description,
    alternates: { canonical: `/article/${article.slug}` },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      images: [{ url: article.cover_image }],
      publishedTime: article.created_at,
      authors: [article.author ?? "beout سبورتس"],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description,
      images: [article.cover_image],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const article = await getArticleBySlug(decodedSlug);
  if (!article) notFound();

  // Track article views
  incrementArticleViews(article.id).catch(console.error);

  const related = (await getPublishedArticles(6))
    .filter((a) => a.id !== article.id && a.category === article.category)
    .slice(0, 3);

  return (
    <article className="mx-auto max-w-4xl">
      <nav className="mb-4 text-sm text-slate-400">
        <Link href="/" className="hover:text-emerald-400">الرئيسية</Link>
        <span className="mx-2 text-slate-600">/</span>
        <span className="text-slate-300">{article.category}</span>
      </nav>

      <header className="mb-6">
        <span className="chip">{article.category}</span>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          {article.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <span>{article.author ?? "فريق التحرير"}</span>
          <span>•</span>
          <time dateTime={article.created_at}>{formatDateAr(article.created_at)}</time>
        </div>
      </header>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-ink-700">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.cover_image}
          alt={article.title}
          className="h-full w-full object-cover"
        />
      </div>

      {article.excerpt && (
        <p className="mt-6 border-r-4 border-emerald-500 bg-ink-800/60 p-4 text-lg leading-8 text-slate-200">
          {article.excerpt}
        </p>
      )}

      <div 
        className="prose-ar mt-8 text-base leading-9 text-slate-200 whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }}
      />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-6 text-sm text-slate-400">
        <span>الكاتب: <span className="text-slate-200">{article.author}</span></span>
        <Link href="/" className="btn-ghost">← العودة للرئيسية</Link>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-white">مقالات مشابهة</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
