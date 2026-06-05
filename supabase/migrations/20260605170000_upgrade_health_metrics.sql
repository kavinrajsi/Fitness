-- More Google Health metrics + a workouts table.
alter table public.daily_metrics add column if not exists active_min int;
alter table public.daily_metrics add column if not exists vo2_max numeric;
alter table public.daily_metrics add column if not exists spo2 numeric;
alter table public.daily_metrics add column if not exists hrv_ms numeric;

-- Exercise sessions (many per day) from the Google Health `exercise` data type.
create table if not exists public.workouts (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id text not null,
  started_at timestamptz,
  ended_at timestamptz,
  type text,
  duration_min int,
  calories int,
  distance_km numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, source_id)
);

create index if not exists workouts_user_started_idx
  on public.workouts (user_id, started_at desc);

alter table public.workouts enable row level security;

drop policy if exists "workouts_select_own" on public.workouts;
create policy "workouts_select_own" on public.workouts
  for select using (auth.uid() = user_id);
