export type Article = {
  id: string | number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  cover_image: string;
  author: string | null;
  is_published: boolean;
  views: number;
  download_url: string | null;
  download_code: string | null;
  created_at: string;
  updated_at: string;
};

export interface SiteSettings {
  id?: string;
  logo_url: string | null;
  app_name: string | null;
  app_code: string | null;
  download_link: string | null;
  android_link: string | null;
  ios_link: string | null;
  site_description: string | null;
  contact_email: string | null;
  banner_image: string | null;
  total_visits: number;
  updated_at: string;
}

export type SettingsInput = Partial<Omit<SiteSettings, "id" | "updated_at">>;

export type ArticleInput = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  category: string;
  cover_image: string;
  author?: string;
  is_published?: boolean;
  download_url?: string;
  download_code?: string;
};
