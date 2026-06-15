import type { MetadataRoute } from "next";
import { getAllArticleSlugs, getCategories } from "@/lib/data";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://beout.app";
  const [slugs, cats] = await Promise.all([getAllArticleSlugs(), getCategories()]);

  const now = new Date();

  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "hourly", priority: 1.0 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const articleUrls: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/article/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = cats.map((c) => ({
    url: `${base}/category/${encodeURIComponent(c)}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticUrls, ...articleUrls, ...categoryUrls];
}
