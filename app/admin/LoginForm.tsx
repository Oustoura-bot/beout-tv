"use client";

import { useState } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/api/admin/actions";

export default function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (fd: FormData) => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await loginAction(fd);
        if (res && !res.ok) {
          setError(res.error ?? "حدث خطأ");
        } else if (res?.ok !== false) {
          // Success: redirect manually since we can't rely on redirect() from client
          router.push("/admin/articles");
        }
      } catch (err) {
        setError("حدث خطأ غير متوقع");
        console.error(err);
      }
    });
  };

  return (
    <form
      action={handleSubmit}
      className="mt-5 grid gap-3"
    >
      <label className="text-sm text-slate-300">
        كلمة المرور
        <input
          type="password"
          name="password"
          required
          autoFocus
          className="mt-1 w-full rounded-lg border border-ink-700 bg-ink-800 px-3 py-2 text-slate-100 outline-none focus:border-emerald-500"
          placeholder="••••••••"
        />
      </label>
      {error && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}
      <button type="submit" disabled={isPending} className="btn-primary mt-1">
        {isPending ? "جارٍ الدخول..." : "دخول"}
      </button>
    </form>
  );
}
