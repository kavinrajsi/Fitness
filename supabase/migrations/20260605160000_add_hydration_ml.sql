-- Hydration (water intake) in millilitres per day, from the Google Health
-- hydration-log data type (nutrition scope).
alter table public.daily_metrics add column if not exists hydration_ml int;
