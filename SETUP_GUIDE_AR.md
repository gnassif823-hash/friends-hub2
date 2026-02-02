# 🛠️ دليل تشغيل Friends Hub (الخطوة الأخيرة)

الموقع (الكود) جاهز 100% ومرفوع. عشان "الروح" تدب فيه ويشتغل بجد، لازم تعمل الخطوات دي في حسابك في Supabase.

## الخطوة 1: بناء قاعدة البيانات (SQL) 🏗️
دي أهم خطوة. من غيرها، الموقع مش هيعرف يخزن ولا مستخدم ولا رسالة.

1.  افتح [Supabase Dashboard](https://supabase.com/dashboard).
2.  ادخل على مشروعك.
3.  من القائمة على الشمال، اختار **SQL Editor** (أيقونة 📝).
4.  دوس **New Query**.
5.  انسخ الكود اللي تحت ده كله وحطه هناك:

```sql
-- 1. تفعيل الامتدادات
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. جدول المستخدمين (Profiles)
create table public.profiles (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  avatar_url text, 
  status text default 'Available',
  status_message text,
  location_lat float,
  location_lng float,
  is_visible boolean default true, -- Ghost Mode
  status_since timestamptz default now(),
  location_text text,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- 3. جدول الرسايل (Messages)
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- 4. جدول الصور (Photos)
create table public.photos (
  id uuid default uuid_generate_v4() primary key,
  uploader_id uuid references public.profiles(id) on delete set null,
  url text not null,
  caption text,
  created_at timestamptz default now()
);

-- 5. جدول المناسبات (Events)
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  date_time timestamptz not null,
  location_name text,
  created_at timestamptz default now()
);

-- 6. المشتركين في المناسبات
create table public.event_participants (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'going',
  primary key (event_id, user_id)
);

-- 7. تفعيل التحديث اللحظي (Realtime) ⚡
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_participants;

-- 8. فتح الصلاحيات للكل (Security) 🔓
alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.photos enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

create policy "Public access" on public.profiles for all using (true) with check (true);
create policy "Public access" on public.messages for all using (true) with check (true);
create policy "Public access" on public.photos for all using (true) with check (true);
create policy "Public access" on public.events for all using (true) with check (true);
create policy "Public access" on public.event_participants for all using (true) with check (true);
```

6.  دوس زرار **RUN** (الأخضر). لو قالك "Success"، يبقى تمام! ✅

---

## الخطوة 2: تفعيل الصور (Storage) 🖼️
عشان معرض الصور يشتغل.

1.  في Supabase، روح لـ **Storage** (أيقونة 📁).
2.  اضغط **New Bucket**.
3.  الاسم: `gallery` (حروف صغيرة).
4.  فعّل خيار **Public Bucket** (مهم جداً).
5.  دوس **Save**.

---

## الخطوة 3: التجربة النهائية 🚀
دلوقتي روح افتح رابط الموقع بتاعك على Vercel.
1.  اكتب اسمك ودوس Login (المفروض يدخل).
2.  جرب تبعت رسالة في الشات.
3.  جرب تغير حالتك لـ "Busy".

لو كله اشتغل، مبروك عليك! 🎉
