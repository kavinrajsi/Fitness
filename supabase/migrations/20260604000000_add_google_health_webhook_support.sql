-- Google Health webhook subscriber support.
--
-- Store the Google Health user id (healthUserId from GET /v4/users/me/identity)
-- so webhook notifications can be mapped back to our user, and allow 'webhook'
-- as a sync trigger source in sync_logs.

alter table public.profiles
  add column if not exists google_health_user_id text;

create unique index if not exists profiles_google_health_user_id_key
  on public.profiles (google_health_user_id)
  where google_health_user_id is not null;

alter table public.sync_logs
  drop constraint if exists sync_logs_triggered_by_check;
alter table public.sync_logs
  add constraint sync_logs_triggered_by_check
  check (triggered_by = any (array['manual'::text, 'cron'::text, 'webhook'::text]));
