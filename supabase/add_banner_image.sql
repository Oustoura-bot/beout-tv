-- شغّل هذا في Supabase SQL Editor لإضافة عمود صورة البانر
ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS banner_image text DEFAULT 'https://qu.ax/x/7xdxJ.jpg';

-- تحديث الصف الموجود بالصورة الافتراضية
UPDATE public.site_settings
SET banner_image = 'https://qu.ax/x/7xdxJ.jpg'
WHERE id = '00000000-0000-0000-0000-000000000001'
  AND (banner_image IS NULL OR banner_image = '');
