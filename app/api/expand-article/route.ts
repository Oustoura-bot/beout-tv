import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // إرسال الطلب لـ Anthropic Claude
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: `أنت محرر صحفي رياضي محترف. وسّع هذا المقال إلى 600-800 كلمة بالعربية.
            حافظ على نفس الفكرة والأسلوب الرياضي.
            أضف تفاصيل، تحليلات، وسياق رياضي منطقي.
            لا تخترع أرقاماً أو إحصائيات غير موجودة في الأصل.
            النتيجة: نص مقال فقط بدون عناوين أو تعليقات إضافية.
            
            العنوان: ${title}
            المحتوى الأصلي: ${content}`,
          },
        ],
      }),
    });

    const aiData = await response.json();
    const expandedContent = aiData.content[0].text;

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
