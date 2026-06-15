export function slugify(input: string): string {
  return input
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    // Keep Arabic letters, a-z, 0-9, and dashes
    .replace(/[^\u0600-\u06FFa-z0-9\-]+/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-+|\-+$/g, "")
    .slice(0, 120);
}

export function formatDateAr(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}
