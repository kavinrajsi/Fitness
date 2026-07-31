<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KyaReFitting aa — agent guide

A Next.js 16 + Supabase fitness app on the Google Health API. See `README.md` for the
full architecture, data model, and env vars. Key conventions to follow:

## Framework / Next.js 16
- Middleware lives in `src/proxy.js` and exports `proxy` (NOT `middleware`), with a
  `config.matcher`.
- `cookies()`, `searchParams`, and route `params` are **async** — `await` them.
- The `@` alias maps to `src/`.

## Auth & Google
- **Google-only auth** (Supabase SSR). Never add email/password or other providers.
- Sign-in and **Google Health** use **two separate OAuth tokens** — the Health API rejects
  a token that also carries the People/sign-in scopes. Health is a second incremental
  consent (`/auth/google/health`). Tokens live on the `profiles` row; refresh via
  `src/lib/google-auth.js`.
- Google Health (`src/lib/google-health.js`) is restricted-scope and only returns data a
  device wrote to Health Connect. **Verify field shapes by probing real responses** — do
  not guess. Rollup windows are capped (steps/weight 90d; heart-rate/total-calories 14d),
  so use the chunked helpers.

## Dates
- Everything is **IST (UTC+5:30)**; the server runs UTC. Use `src/lib/date-utils.js`
  (`isoDate`, `dkey`, `civil`, `addDays`, `civilKey`, `istMonthStart`) and pass
  `timeZone: 'Asia/Kolkata'` to any `toLocaleString`/`toLocaleDateString`.

## UI
- Tailwind v4 + **shadcn `base-nova`** (Base UI based). The `Button` has **no `asChild`** —
  style an `<a>` with `buttonVariants({ ... })` or use the Base UI `render` prop. Sidebar
  primitives also use `render`, not `asChild`.
- Font is IBM Plex Sans; charts use recharts via `src/components/ui/chart.jsx`.
- **Dark mode is the default** (`next-themes`; toggle on `/profile`). Use the `--brand`
  yellow token and the `--chart-1..5` palette (`globals.css`) — don't hardcode hex.
- Small screens get a **bottom nav** (`src/components/bottom-nav.jsx`); the header
  hamburger is `md`-only. The leaderboard **share images** come from
  `/api/og/leaderboard` (`?period=`, `?format=story|post|square|wide`) and the picker is
  `src/components/leaderboard-share-button.jsx` (dropdown on desktop, bottom-sheet drawer
  on mobile).

## Database
- Supabase Postgres with **own-row RLS**; the service-role client
  (`src/lib/supabase/service.js`) bypasses RLS for cron/admin/cross-user reads only.
- Apply schema changes with the **Supabase MCP** `apply_migration` (there is no tracked
  `supabase/` folder). **Confirm before applying production migrations.**
- Cross-user ranking is **two** security-definer SQL functions: `leaderboard_between(since,
  until)` (the `/leaderboard` page + `/api/og/leaderboard`) and `leaderboard_since(date)`
  (push deltas in `notify-leaderboard.js`, via `getLeaderboard` in `src/lib/fitness-data.js`).
- Raw step samples land in `steps_raw`, rolled into `steps_hourly`.
- The `api_tokens`, `api_rate_limits`, and `oauth_*` tables are leftovers from the removed
  MCP server / developer API — nothing reads or writes them.

## Sync & push
- All sync goes through `syncUserMetrics` (`src/lib/sync-metrics.js`), called by the cron,
  manual `/api/sync` (streaming), and the webhook. `syncAllConnectedUsers` (same file) is
  the shared loop the crons use. Full history backfills once per user
  (`profiles.health_data_backfilled_at`). Per-caller windows: **manual** pulls 30 days of
  all data (`days`/`workoutDays`/`sampleDays` all 30); **cron**/**webhook** use a 7-day
  daily-metrics window with the default 5y workouts + 14d samples (365 on backfill). A
  metric whose Google Health fetch fails (after retrying `429`/`5xx` via `fetchWithRetry`)
  is **omitted from the upsert** in `getDailyMetrics`, so it can't clobber a stored value
  with `0`/`null`.
- Web Push: `src/lib/push.js` (`sendPushToAll`) + two helpers in `notify-leaderboard.js`:
  `notifyTopMovers({ push })` (7-day "added N steps" deltas; fires on manual `/api/sync` +
  webhook — the morning cron calls it with `push:false` to refresh the `leaderboard_snapshot`
  baseline silently) and `notifyLeaderboardTop({ period })` (daily top-3 recap; returns the
  resolved `period`). Opt-in only, from the Profile toggle.
- Two crons (`vercel.json`, 2 jobs ⇒ Vercel Pro): `sync-metrics` (07:30 IST) syncs then
  pushes **yesterday's** top 3; `notify-leaderboard?period=today&sync=1` (21:00 IST)
  re-syncs (`backfill:false`; `502` + no push if the sync fails) then pushes **today's** top
  3. Both gated by `CRON_SECRET` via `authorizeCron` (`src/lib/cron-auth.js`).
- Admin is gated by `ADMIN_EMAIL` (`src/lib/constants.js`).
- Admin failure alerts: `notifyAdminOfFailure` (`src/lib/notify-admin.js`) emails `ADMIN_EMAIL`
  via ZeptoMail (`src/lib/email.js`, REST not SDK; env `ZEPTOMAIL_TOKEN`/`ZEPTOMAIL_FROM`,
  no-ops if unset) the moment a sync hits a real failure — a Google Health fetch that fails
  after retries (the `onError` callback threaded through `getDailyMetrics`/`getWorkouts`/
  `getStepSamples`, fired only on a post-retry `429`/`5xx`, never on `403`/`404` no-data), a
  dead token, a `daily_metrics` upsert error, an unhandled per-user exception, or a whole
  cron run failing. Best-effort + deduped per run; never blocks/breaks the sync.
- Sync also writes `steps_raw` + `steps_hourly`; `src/lib/heatmap.js` (`buildHeatmap`)
  aggregates the hourly rows into the weekday×hour activity grid.

## Analytics & feature flags (PostHog)
- **Analytics**: PostHog inits in `src/instrumentation-client.js` (Next 16 client
  instrumentation, `defaults: '2026-01-30'` auto-pageviews); `src/components/posthog-provider.jsx`
  (in the root layout) wires `posthog-js/react` and identifies the Supabase user (id + email),
  resets on sign-out. `api_host` is the **ingestion** host `us.i.posthog.com` (ui_host
  `us.posthog.com`). No-ops without `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN`.
- **Flags**: Vercel Flags SDK (`flags/next`) + `@flags-sdk/posthog` in `src/lib/flags.js`;
  evaluated server-side, targeted via a deduped `identify` (same Supabase user). Add flags by
  copying `exampleFlag`; read with `await yourFlag()` in a server component.

## Working agreements
- Commit/push only when asked; end commit messages with the `Co-Authored-By` trailer.
- Don't dump raw OAuth tokens to the transcript.
- Tests run via `npm test` (vitest, node env); CI (`.github/workflows/ci.yml`, Node 22)
  runs install → test → build. Lint is **not** wired into CI — keep `npm test` green.
