import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// تحميل متغيرات البيئة من .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanArticles() {
  console.log('--- بدء عملية تنظيف المقالات ---');
  
  // جلب جميع المقالات
  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, title, content, slug');

  if (error) {
    console.error('خطأ في جلب المقالات:', error.message);
    return;
  }

  if (!articles || articles.length === 0) {
    console.log('لا توجد مقالات لتنظيفها.');
    return;
  }

  for (const article of articles) {
    const originalContent: string = article.content || '';
    if (!originalContent) continue;

    // تقسيم المحتوى إلى فقرات بناءً على أسطر جديدة
    const paragraphs = originalContent.split(/\n+/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
    
    // إزالة الفقرات المتكررة المتتالية أو العامة
    const uniqueParagraphs: string[] = [];
    const seen = new Set<string>();

    for (const p of paragraphs) {
      // إذا كانت الفقرة مكررة، نتخطاها
      if (seen.has(p)) {
        console.log(`[${article.slug}] تم العثور على تكرار للفقرة: "${p.substring(0, 50)}..."`);
        continue;
      }
      uniqueParagraphs.push(p);
      seen.add(p);
    }

    const newContent = uniqueParagraphs.join('\n\n');

    // إذا تغير المحتوى، نقوم بتحديثه
    if (newContent !== originalContent) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({ content: newContent })
        .eq('id', article.id);

      if (updateError) {
        console.error(`خطأ في تحديث المقال ${article.slug}:`, updateError.message);
      } else {
        console.log(`✅ تم تنظيف المقال: ${article.title} (${article.slug})`);
      }
    }
  }

  console.log('--- انتهت عملية التنظيف ---');
}

cleanArticles().catch(err => console.error('خطأ غير متوقع:', err));
