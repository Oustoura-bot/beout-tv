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

      {/* App Promotion Section */}
      <section className="mt-12 overflow-hidden rounded-2xl border border-emerald-500/30 bg-ink-800/80 p-6 shadow-glow-sm sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-right">
            <h3 className="text-xl font-bold text-white sm:text-2xl">
              📱 تابع أخبار الرياضة لحظة بلحظة مع تطبيق {settings?.app_name || "beout-tv"}
            </h3>
            <p className="mt-2 text-slate-400">
              احصل على آخر التحديثات والنتائج مباشرة على هاتفك
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-emerald-500">كود التطبيق</span>
            <div className="rounded-lg bg-ink-900 px-4 py-2 text-2xl font-black text-white ring-1 ring-emerald-500/50">
              {settings?.app_code || "1000"}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link 
            href={settings?.android_link || "#"} 
            target="_blank"
            className="flex items-center gap-3 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition hover:bg-emerald-500 hover:shadow-glow"
          >
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M17.523 15.3414C17.0652 15.3414 16.6917 14.968 16.6917 14.5101C16.6917 14.0523 17.0652 13.6789 17.523 13.6789C17.9808 13.6789 18.3542 14.0523 18.3542 14.5101C18.3542 14.968 17.9808 15.3414 17.523 15.3414ZM6.47702 15.3414C6.01918 15.3414 5.64575 14.968 5.64575 14.5101C5.64575 14.0523 6.01918 13.6789 6.47702 13.6789C6.93485 13.6789 7.30829 14.0523 7.30829 14.5101C7.30829 14.968 6.93485 15.3414 6.47702 15.3414ZM17.8633 11.2014L19.5312 8.3126C19.645 8.11548 19.5772 7.8633 19.3801 7.74945C19.183 7.6356 18.9308 7.70335 18.8169 7.90048L17.1322 10.8183C15.6872 10.1603 14.086 9.79126 12.398 9.79126C10.7101 9.79126 9.10887 10.1603 7.66382 10.8183L5.97911 7.90048C5.86526 7.70335 5.61308 7.6356 5.41595 7.74945C5.21883 7.8633 5.15108 8.11548 5.26493 8.3126L6.93275 11.2014C3.86851 12.862 1.8335 15.938 1.8335 19.5087H22.9626C22.9626 15.938 20.9275 12.862 17.8633 11.2014Z"/>
            </svg>
            تحميل للأندرويد
          </Link>
          <Link 
            href={settings?.ios_link || "#"} 
            target="_blank"
            className="flex items-center gap-3 rounded-xl bg-slate-700 px-6 py-3 font-bold text-white transition hover:bg-slate-600 hover:shadow-glow-sm"
          >
            <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
            </svg>
            تحميل للآيفون
          </Link>
        </div>
      </section>

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
