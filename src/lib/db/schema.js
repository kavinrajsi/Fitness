/**
 * Drizzle schema for the Neon database.
 *
 * Phase 1: intentionally minimal. The full table definitions (profiles, daily_metrics,
 * workouts, steps_raw, steps_hourly, api_tokens, push_subscriptions, notification_log,
 * notification_recipients, leaderboard_snapshot, oauth_*, api_rate_limits) are added in
 * Phase 2 — defined here, created in Neon via drizzle-kit, then data copied from Supabase.
 *
 * Nothing references this yet, so an empty schema is valid and keeps `db` typed-but-unused.
 */
export {}
