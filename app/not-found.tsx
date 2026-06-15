import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <div className="text-7xl">⚽</div>
      <h1 className="mt-4 text-3xl font-extrabold text-white">404</h1>
      <p className="mt-2 text-slate-400">الصفحة التي تبحث عنها غير موجودة.</p>
      <Link href="/" className="btn-primary mt-5">العودة للرئيسية</Link>
    </div>
  );
}
