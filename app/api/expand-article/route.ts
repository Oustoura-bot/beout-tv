import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// إعداد عميل Supabase بصلاحيات الخدمة (Service Role) لتجاوز RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // التحقق من مفتاح الأمان (اختياري ولكن مستحسن)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await req.json();
    const { record, type } = payload;

    // نتأكد أن العملية هي إضافة مقال جديد فقط
    if (type !== "INSERT" || !record) {
      return NextResponse.json({ message: "Skipped: Not an insert" });
    }

    const { id, title, content } = record;

    // نتأكد أن المحتوى قصير ويحتاج لتوسيع (مثلاً أقل من 1000 حرف)
    if (content.length > 1000) {
      return NextResponse.json({ message: "Skipped: Content already long" });
    }

    // إرسال الطلب لـ Google Gemini
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `أنت محرر صحفي رياضي محترف باللغة العربية. وسّع هذا المقال إلى 600-800 كلمة بأسلوب صحفي احترافي مع إضافة تفاصيل وتحليلات منطقية. لا تخترع أرقاماً. أرسل النص فقط بدون أي تعليقات.\nالعنوان: ${title}\nالمحتوى: ${content}`,
              },
            ],
          },
        ],
      }),
    });

    const aiData = await response.json();
    const expandedContent = aiData.candidates[0].content.parts[0].text;

    if (!expandedContent) {
      throw new Error("AI failed to generate content");
    }

    // تحديث المقال في Supabase بالمحتوى الموسع
    const { error: updateError } = await supabaseAdmin
      .from("articles")
      .update({ content: expandedContent })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ ok: true, message: "Article expanded successfully" });
  } catch (error: any) {
    console.error("Expansion Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
