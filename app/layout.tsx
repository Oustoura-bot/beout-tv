import type { Metadata } from "next";
import { Cairo, Tajawal } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSettings } from "@/lib/data";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display: "swap",
});
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://beout.app"),
  title: {
    default: "beout سبورتس — آخر أخبار الرياضة العالمية والعربية",
    template: "%s | beout سبورتس",
  },
  description:
    "beout سبورتس — تغطية شاملة لأخبار كرة القدم، دوريات أوروبا، الانتقالات، وأخبار النجوم العرب في مكان واحد.",
  keywords: [
    "beout",
    "أخبار رياضية",
    "كرة القدم",
    "الدوري الإسباني",
    "الدوري الإنجليزي",
    "دوري أبطال أوروبا",
    "انتقالات",
    "ريال مدريد",
    "برشلونة",
    "محمد صلاح",
  ],
  authors: [{ name: "beout سبورتس" }],
  openGraph: {
    type: "website",
    locale: "ar_AR",
    siteName: "beout سبورتس",
    title: "beout سبورتس — آخر أخبار الرياضة",
    description:
      "آخر أخبار كرة القدم، الانتقالات، ودوريات أوروبا والعرب لحظة بلحظة.",
  },
  twitter: {
    card: "summary_large_image",
    title: "beout سبورتس",
    description: "آخر أخبار الرياضة العالمية والعربية",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable}`}
    >
      <body className="min-h-screen bg-ink-900 font-sans text-slate-100 antialiased">
        <Header settings={settings} />
        <main className="container-x py-6">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
