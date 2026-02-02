# 🛠️ دليل تشغيل Friends Hub (النسخة النهائية)

عشان "ننهي" أي جدل ونضمن إن الموقع يشتغل 100%، أنا جهزتلك كود واحد "شامل".
الكود ده **بيمسح القديم** (لو فيه مشاكل) و **بيبني كل حاجة من الأول** بأسلوب صحيح.

## الخطوة الوحيدة: بناء قاعدة البيانات (SQL) 🏗️

1.  افتح [Supabase Dashboard](https://supabase.com/dashboard).
2.  ادخل على مشروعك -> **SQL Editor**.
3.  دوس **New Query**.
4.  انسخ الكود ده **كله** وحطه هناك ودوس **Run**:

```sql
-- 🔥 تنظيف شامل (بيمسح الجداول القديمة عشان نبني على نظافة)
DROP TABLE IF EXISTS public.event_participants CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.photos CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. تفعيل الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. جدول المستخدمين (Profiles)
CREATE TABLE public.profiles (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  username text UNIQUE NOT NULL,
  avatar_url text, 
  status text DEFAULT 'Available',
  status_message text,
  location_lat float,
  location_lng float,
  is_visible boolean DEFAULT true,
  status_since timestamptz DEFAULT now(),
  location_text text,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 3. جدول الرسايل (Messages)
CREATE TABLE public.messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 4. جدول الصور (Photos)
CREATE TABLE public.photos (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  uploader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- 5. جدول المناسبات (Events)
CREATE TABLE public.events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  date_time timestamptz NOT NULL,
  location_name text,
  created_at timestamptz DEFAULT now()
);

-- 6. المشتركين في المناسبات
CREATE TABLE public.event_participants (
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'going',
  PRIMARY KEY (event_id, user_id)
);

-- 7. تفعيل التحديث اللحظي (Realtime) ⚡
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_participants;

-- 8. "افتح يا سمسم" (Security Policies) 🔓
-- الكود ده بيسمح لأي حد يكتب ويقرا (لأننا لغينا الـ Sign Up المعقد)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.event_participants FOR ALL USING (true) WITH CHECK (true);
```

---

## الخطوة 2: تفعيل الصور (Storage) 🖼️
(لو لسه معملتهاش)

1.  Supabase -> **Storage**.
2.  **New Bucket** -> الاسم: `gallery` -> خلية **Public** -> Save.

---

## مبروك! 🎉
الموقع كده "شطبناه" نهائي. ابعت الرابط لصحابك!
