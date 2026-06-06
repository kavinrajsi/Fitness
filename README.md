# KyaReFitting aa

A Google-Health–powered fitness tracker: sign in with Google, sync your steps and
health metrics, climb a leaderboard, and get a push notification when a top mover pulls
ahead. Built with Next.js 16 + Supabase.

## Stack

- **Next.js 16** (App Router, JavaScript) — note: middleware is `src/proxy.js` (exports
  `proxy`), and `cookies()` / `searchParams` / `params` are async.
- **Supabase** — Google-only auth (SSR via `@supabase/ssr`), Postgres with row-level
  security, a service-role client for cross-user/admin reads.
- **Google Health API** (`health.googleapis.com/v4`) for metrics + **People API** for
  gender/birthday. Restricted scopes; sign-in and Health use **separate** OAuth tokens.
- **Tailwind v4** + **shadcn/ui** (style `base-nova`, which is **Base UI** based — the
  `Button` has no `asChild`), **IBM Plex Sans**, **recharts** for charts.
- **web-push** for Web Push notifications (VAPID), with a service worker + PWA manifest.
- **Vercel** — hosting + a daily cron.

## Features

- Google-only sign-in; a separate "Connect Google Health" consent for health data.
- **Dashboard** — goal ring, stat cards (steps, active/total calories, distance, resting/
  avg/min/max HR, VO₂, SpO₂, HRV, active minutes, hydration), steps area chart, intraday
  hourly chart, HR/sleep trend charts, streaks + achievements.
- **Steps** (`/data`) with 90D / 1Y / All ranges, **Workouts**, **Leaderboard**
  (Today / 7D / This month), **Profile** (details, goal, notifications, reconnect).
- **Admin** (`/admin`, gated to `ADMIN_EMAIL`, `noindex`) — all users, per-user drill-down,
  device list, and a push **notification log**.
- **Sync** three ways: a daily cron, an on-demand streaming Sync button, and a Google
  Health webhook. Full multi-year history is backfilled once per user, then incrementally.
- **Web Push** — opt-in from Profile; everyone is alerted when a current top-4 (7-day)
  person gains steps. Every broadcast + recipient + device is logged for admins.

## Data model (Postgres / Supabase)

| Table | What it holds |
|---|---|
| `profiles` | user, Google + Google-Health tokens, height/weight/age/gender/birthday, `daily_step_goal`, sync flags |
| `daily_metrics` | one row per user per day: steps, calories, total_calories, distance, sleep, resting/avg/min/max HR, VO₂, SpO₂, HRV, active minutes, hydration |
| `steps_hourly` | intraday hourly step buckets (recent window) |
| `workouts` | exercise sessions: type, start/end, duration, calories, distance, steps, active-zone minutes, elevation, pace |
| `leaderboard_snapshot` | last-seen 7-day totals (drives push deltas) |
| `push_subscriptions` | Web Push subscriptions + device label/user-agent |
| `notification_log` / `notification_recipients` | push audit log (what was sent, to whom, status, device) |

Migrations are applied directly via the **Supabase MCP** (`apply_migration`); there is no
tracked `supabase/` migrations folder. The ranking is computed in SQL
(`leaderboard_since(date)`, security-definer).

## Environment variables

Create `.env.local` (and set the same in Vercel → Production):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth (sign-in + Google Health)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Google Health webhook (must match the registered subscriber secret)
GOOGLE_HEALTH_WEBHOOK_SECRET=

# Cron auth (Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically)
CRON_SECRET=

# Web Push (VAPID) — generate with `npx web-push generate-vapid-keys`
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=   # same value as VAPID_PUBLIC_KEY
VAPID_SUBJECT=mailto:you@example.com

# Optional: override the admin account (defaults to sikavinraj@gmail.com)
ADMIN_EMAIL=
```

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Scripts:

```bash
npm run dev        # start dev server
npm run build      # production build
npm run start      # run the production build
npm run lint       # eslint
npm run test       # vitest (date-utils + gamification)
```

## Sync pipeline

All three entry points share `syncUserMetrics` (`src/lib/sync-metrics.js`):

- **Cron** — `GET /api/cron/sync-metrics` (Vercel cron, daily `0 2 * * *` UTC; requires
  `CRON_SECRET`). Backfills full history once per user, then incremental.
- **Manual** — `POST /api/sync` streams live progress (NDJSON) to the Sync button.
- **Webhook** — `POST /api/webhooks/health` re-syncs a user on new Google Health data.

After a sync, `notifyTopMovers()` checks the 7-day leaderboard and pushes alerts.

## Deployment

Hosted on Vercel. Set all env vars in **Production**, then deploy. The cron is configured
in `vercel.json`. Web Push needs the VAPID vars; on iPhone, users must **Add to Home
Screen** (install the PWA) before notifications can be delivered.

## Notes

- **Dates are IST (UTC+5:30).** The server runs UTC — always go through
  `src/lib/date-utils.js` or format with `timeZone: 'Asia/Kolkata'`.
- **Google Health is restricted-scope** and only returns data a device actually wrote to
  Health Connect. Rollup query windows are capped (steps/weight 90 days; heart-rate/
  total-calories 14 days), so those are paginated.
- **Auth is Google-only** by design — do not add email/password or other providers.
