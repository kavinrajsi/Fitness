-- Per-user daily step goal (gamification). Defaults to 10,000; existing rows get it too.
alter table public.profiles add column if not exists daily_step_goal int not null default 10000;
