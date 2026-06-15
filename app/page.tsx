import ArticleCard from "@/components/ArticleCard";
import AppCodeCard from "@/components/AppCodeCard";
import DownloadBanner from "@/components/DownloadBanner";
import { getPublishedArticles, getSettings } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "beout سبورتس — آخر أخبار الرياضة",
  description:
    "آخر أخبار كرة القدم، الانتقالات، ودوريات أوروبا والعرب لحظة بلحظة.",
  alternates: { canonical: "/" },
};

// In-feed promo insertion points
const APP_CODE_AFTER = 3; // 1-indexed — after the 3rd article
const DOWNLOAD_AFTER = 6; // after the 6th article

export default async function HomePage() {
  const [articles, settings] = await Promise.all([
    getPublishedArticles(),
    getSettings(),
  ]);

  return (
    <div>
      {/* Hero / Latest strip */}
      <section className="mb-6">
        <div className="card overflow-hidden">
          <div className="grid items-center gap-4 p-5 sm:grid-cols-[1fr,auto] sm:p-7">
            <div>
              <span className="chip">آخر التحديثات</span>
              <h1 className="mt-2 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                كل أخبار الرياضة في <span className="text-emerald-400">مكان واحد</span>
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
                تغطية شاملة ومحدّثة لأهمّ الأحداث: الدوري الإسباني، الإنجليزي، الإيطالي،
                الفرنسي، دوري أبطال أوروبا، انتقالات اللاعبين، وأخبار نجوم العرب حول العالم.
              </p>
            </div>
            <div className="hidden sm:block">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/15 text-3xl font-black text-emerald-400 ring-1 ring-emerald-500/30">
                ⚽
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Grid + in-feed promos */}
      <section>
        {articles.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, idx) => {
              const position = idx + 1; // 1-indexed
              return (
                <div key={article.id} className="contents">
                  <ArticleCard article={article} priority={idx < 3} />

                  {/* App Code card after 3rd article */}
                  {position === APP_CODE_AFTER && (
                    <AppCodeCard settings={settings} />
                  )}

                  {/* Download banner after 6th article */}
                  {position === DOWNLOAD_AFTER && (
                    <DownloadBanner settings={settings} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="card grid place-items-center p-12 text-center">
      <div className="text-5xl">📰</div>
      <h2 className="mt-3 text-xl font-bold text-white">لا توجد مقالات بعد</h2>
      <p className="mt-1 max-w-md text-sm text-slate-400">
        أضِف مقالاتك من لوحة الإدارة لتظهر هنا تلقائياً.
      </p>
      <a className="btn-primary mt-4" href="/admin">
        افتح لوحة الإدارة
      </a>
    </div>
  );
}
