-- Separate Google Health OAuth token (incremental authorization).
-- The Google Health API rejects access tokens that also carry the People
-- (gender/birthday) scopes, so health uses its own token obtained via a separate
-- consent at /auth/google/health, stored in these columns.
alter table public.profiles add column if not exists google_health_access_token text;
alter table public.profiles add column if not exists google_health_refresh_token text;
alter table public.profiles add column if not exists google_health_token_expires_at timestamptz;
