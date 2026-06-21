-- Run this in your Supabase SQL Editor

-- 1. User profiles (stores name and color per user)
create table if not exists user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  color text not null default '#1a1a1a'
);

-- Enable RLS
alter table user_profiles enable row level security;

-- All authenticated users can read all profiles (needed to show partner's name/color)
create policy "profiles_read_all" on user_profiles
  for select to authenticated using (true);

-- Users can only update their own profile
create policy "profiles_update_own" on user_profiles
  for update to authenticated using (auth.uid() = id);

-- Auto-insert profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into user_profiles (id, email)
  values (new.id, new.email)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- 2. Events table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date text not null,      -- format: 'YYYY-MM-DD'
  time text not null,      -- format: 'HH:MM'
  title text not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table events enable row level security;

-- All authenticated users can read all events
create policy "events_read_all" on events
  for select to authenticated using (true);

-- Users can only insert their own events
create policy "events_insert_own" on events
  for insert to authenticated with check (auth.uid() = user_id);

-- Users can only delete their own events
create policy "events_delete_own" on events
  for delete to authenticated using (auth.uid() = user_id);


-- 3. Month covers table
create table if not exists month_covers (
  id uuid primary key default gen_random_uuid(),
  month_key text unique not null,   -- format: 'cover_YYYY_M'
  url text not null,
  updated_at timestamptz default now()
);

alter table month_covers enable row level security;

create policy "covers_read_all" on month_covers
  for select to authenticated using (true);

create policy "covers_upsert_auth" on month_covers
  for all to authenticated using (true) with check (true);


-- 4. Storage bucket for cover photos
-- Go to Storage in your Supabase dashboard and create a bucket named: calendar-covers
-- Set it to PUBLIC
-- Then add this policy in Storage > calendar-covers > Policies:
--   Allow authenticated users to upload: bucket_id = 'calendar-covers' AND auth.role() = 'authenticated'
