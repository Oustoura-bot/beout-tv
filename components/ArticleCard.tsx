import Link from "next/link";
import Image from "next/image";
import type { Article } from "@/lib/types";
import { formatDateAr } from "@/lib/utils";

export default function ArticleCard({
  article,
  priority = false,
}: {
  article: Article;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/article/${article.slug}`}
      className="group card flex h-full flex-col overflow-hidden transition hover:border-emerald-500/60 hover:shadow-glow"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-700">
        <Image
          src={article.cover_image}
          alt={article.title}
          fill
          priority={priority}
          sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/80 to-transparent" />
        <span className="absolute right-3 top-3 chip">{article.category}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-bold leading-7 text-white group-hover:text-emerald-400">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-400">
            {article.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>{article.author ?? "فريق التحرير"}</span>
          <time dateTime={article.created_at}>{formatDateAr(article.created_at)}</time>
        </div>
      </div>
    </Link>
  );
}
