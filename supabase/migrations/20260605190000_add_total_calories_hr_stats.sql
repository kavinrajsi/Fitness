-- Total daily calories (vs. active) and full daily heart-rate stats from Google Health.
alter table public.daily_metrics add column if not exists total_calories numeric;
alter table public.daily_metrics add column if not exists hr_avg numeric;
alter table public.daily_metrics add column if not exists hr_min int;
alter table public.daily_metrics add column if not exists hr_max int;
