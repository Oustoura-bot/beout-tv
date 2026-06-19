import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndUpdateSettings() {
  console.log('--- فحص إعدادات الموقع في Supabase ---');
  
  const { data, error } = await supabase
    .from('site_settings')
    .select('*');

  if (error) {
    console.error('خطأ في جلب الإعدادات:', error.message);
    return;
  }

  console.log('الإعدادات الحالية:', JSON.stringify(data, null, 2));

  // البحث عن أي ظهور لـ beout.app وتحديثه
  for (const setting of data) {
    let needsUpdate = false;
    const updatedSetting = { ...setting };

    for (const key in updatedSetting) {
      if (typeof updatedSetting[key] === 'string' && updatedSetting[key].includes('beout.app')) {
        updatedSetting[key] = updatedSetting[key].replace(/beout\.app/g, 'beout-tv.site');
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      console.log(`تحديث السجل ${setting.id}...`);
      const { error: updateError } = await supabase
        .from('site_settings')
        .update(updatedSetting)
        .eq('id', setting.id);

      if (updateError) {
        console.error('خطأ في التحديث:', updateError.message);
      } else {
        console.log('✅ تم التحديث بنجاح.');
      }
    }
  }
}

checkAndUpdateSettings();
