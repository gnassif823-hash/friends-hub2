-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Simple Auth)
create table public.profiles (
  id uuid default uuid_generate_v4() primary key,
  username text unique not null,
  avatar_url text, 
  status text default 'Available',
  status_message text,
  location_lat float,
  location_lng float,
  is_visible boolean default true, -- Ghost Mode
  status_since timestamptz default now(), -- Time of status set
  location_text text, -- Manual location name (e.g. "Starbucks")
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- 2. Messages Table (The Lounge)
create table public.messages (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now()
);

-- 3. Photos Table (Gallery)
create table public.photos (
  id uuid default uuid_generate_v4() primary key,
  uploader_id uuid references public.profiles(id) on delete set null,
  url text not null,
  caption text,
  created_at timestamptz default now()
);

-- 4. Events Table (Planner)
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  creator_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  date_time timestamptz not null,
  location_name text,
  created_at timestamptz default now()
);

-- 5. Event Participants
create table public.event_participants (
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'going', -- going, maybe, declined
  primary key (event_id, user_id)
);

-- Enable Realtime for all tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.photos;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_participants;

-- Storage Bucket Policy (Mock - User needs to create 'avatars' and 'gallery' buckets in dashboard)
-- This SQL just sets up RLS to be public for simplicity as requested "simplicity and real-time"
-- WARNING: In a real/public app, you would lock this down.

alter table public.profiles enable row level security;
alter table public.messages enable row level security;
alter table public.photos enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;

-- Open Access Policies (Trusted Friends Model)
create policy "Public profiles access" on public.profiles for all using (true) with check (true);
create policy "Public messages access" on public.messages for all using (true) with check (true);
create policy "Public photos access" on public.photos for all using (true) with check (true);
create policy "Public events access" on public.events for all using (true) with check (true);
create policy "Public participants access" on public.event_participants for all using (true) with check (true);
