<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# KyaReFitting — agent guide

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

## Database
- Supabase Postgres with **own-row RLS**; the service-role client
  (`src/lib/supabase/service.js`) bypasses RLS for cron/admin/cross-user reads only.
- Apply schema changes with the **Supabase MCP** `apply_migration` (there is no tracked
  `supabase/` folder). **Confirm before applying production migrations.**
- Cross-user ranking is a security-definer SQL function `leaderboard_since(date)`.

## Sync & push
- All sync goes through `syncUserMetrics` (`src/lib/sync-metrics.js`), called by the cron,
  manual `/api/sync` (streaming), and the webhook. Full history backfills once per user
  (`profiles.health_data_backfilled_at`).
- Web Push: `src/lib/push.js` (`sendPushToAll`) + `notifyTopMovers`
  (`src/lib/notify-leaderboard.js`). Opt-in only, from the Profile toggle.
- Admin is gated by `ADMIN_EMAIL` (`src/lib/constants.js`).

## Working agreements
- Commit/push only when asked; end commit messages with the `Co-Authored-By` trailer.
- Don't dump raw OAuth tokens to the transcript.
