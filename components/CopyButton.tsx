"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // no-op
    }
  }
  return (
    <button
      onClick={copy}
      className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-3 py-3 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/20"
      aria-label="نسخ الكود"
    >
      {done ? "✓ تم النسخ" : "نسخ"}
    </button>
  );
}
