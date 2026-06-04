-- Stable Google Health user id (from GET /v4/users/me/identity), used to map
-- inbound webhook notifications back to our user. Captured during sync.
alter table public.profiles add column if not exists google_health_user_id text;

create index if not exists profiles_health_user_id_idx
  on public.profiles (google_health_user_id);
