-- Profiles table: stores Google OAuth tokens + cached "basic details" plus
-- manual self-entry overrides for height/weight. Idempotent so it is safe to
-- re-run whether or not the table already exists.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  google_access_token text,
  google_refresh_token text,
  google_token_expires_at timestamptz,
  height_cm numeric,
  weight_kg numeric,
  age int,
  gender text,
  birthday date,
  manual_height_cm numeric,
  manual_weight_kg numeric,
  details_synced_at timestamptz,
  created_at timestamptz not null default now()
);

-- Add any columns that may be missing if the table predates this migration.
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists google_access_token text;
alter table public.profiles add column if not exists google_refresh_token text;
alter table public.profiles add column if not exists google_token_expires_at timestamptz;
alter table public.profiles add column if not exists height_cm numeric;
alter table public.profiles add column if not exists weight_kg numeric;
alter table public.profiles add column if not exists age int;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists birthday date;
alter table public.profiles add column if not exists manual_height_cm numeric;
alter table public.profiles add column if not exists manual_weight_kg numeric;
alter table public.profiles add column if not exists details_synced_at timestamptz;

-- RLS: each user may read/insert/update only their own row. All writes happen
-- through the user's session (route handlers / server actions), so anon-key
-- access under these policies is sufficient.
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill rows for users who signed up before this migration.
insert into public.profiles (id, email, full_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
from auth.users u
on conflict (id) do nothing;
