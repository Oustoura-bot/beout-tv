export type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  category: string;
  cover_image: string;
  author: string | null;
  is_published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
};

export interface SiteSettings {
  logo_url?: string;
  app_name?: string;
  app_code?: string;
  download_link?: string;
  android_link?: string;
  ios_link?: string;
  site_description?: string;
  contact_email?: string;
  banner_image?: string;
  total_visits?: string;
  [key: string]: string | undefined;
}

export type SettingsInput = Partial<SiteSettings>;

export type ArticleInput = {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  category: string;
  cover_image: string;
  author?: string;
  is_published?: boolean;
};
