import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticleBySlug, getAllArticleSlugs, getPublishedArticles, getSettings } from "@/lib/data";
import { formatDateAr, stripHtml } from "@/lib/utils";
import ArticleCard from "@/components/ArticleCard";
import { incrementArticleViews } from "@/app/api/admin/actions";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await getAllArticleSlugs();
    if (!slugs || slugs.length === 0) {
      return [];
    }
    return slugs.map((slug) => ({
      slug: String(slug),
    }));
  } catch (error) {
    console.error("Error generating static params:", error);
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
    alternates: { canonical: `https://beout-tv.site/article/${article.slug}` },
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
  const [article, settings] = await Promise.all([
    getArticleBySlug(decodedSlug),
    getSettings()
  ]);

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

      {/* Article Download Section */}
      {article.download_url && (
        <section className="mt-12 overflow-hidden rounded-2xl border border-emerald-500/30 bg-ink-800/80 p-6 shadow-glow-sm sm:p-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="text-center sm:text-right">
              <h3 className="text-xl font-bold text-white sm:text-2xl">
                📥 تحميل المحتوى / الملف
              </h3>
              <p className="mt-2 text-slate-400">
                يمكنك تحميل الملف الخاص بهذا المقال عبر الرابط أدناه
              </p>
            </div>
            {article.download_code && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-emerald-500">كود التحميل / كلمة السر</span>
                <div className="rounded-lg bg-ink-900 px-4 py-2 text-2xl font-black text-white ring-1 ring-emerald-500/50">
                  {article.download_code}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <Link 
              href={article.download_url} 
              target="_blank"
              className="flex items-center gap-3 rounded-xl bg-emerald-600 px-8 py-4 font-bold text-white transition hover:bg-emerald-500 hover:shadow-glow"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              اضغط هنا للتحميل
            </Link>
          </div>
        </section>
      )}

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
