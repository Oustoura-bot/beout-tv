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

export type SiteSettings = {
  id: string;
  logo_url: string | null;
  app_name: string;
  app_code: string;
  download_link: string;
  site_description: string;
  contact_email: string;
  banner_image: string | null;
  updated_at: string;
};

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

export type SettingsInput = Partial<Omit<SiteSettings, "id" | "updated_at">>;
