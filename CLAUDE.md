# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build (use to verify before finishing)
npm run lint     # ESLint
```

No test suite. Always run `npm run build` to confirm changes compile cleanly.

## Stack

- **Next.js 16** (App Router, JavaScript — no TypeScript) with React 19 and the React Compiler enabled
- **Supabase** (`lwwqizxvscsoxbxnlloi`, ap-southeast-1) for auth, database, and RLS
- **Tailwind CSS v4** — CSS-based config (`@import "tailwindcss"` in globals.css, no tailwind.config.js)
- **shadcn/ui** using **Base UI** (`@base-ui/react`) — NOT Radix UI. `asChild` is not supported on any component.
- **Google Material Symbols Outlined** loaded from Google Fonts CDN in `layout.js`

## Architecture

### Routing & auth

`src/proxy.js` is Next.js 16's middleware (exports `proxy` function, not `middleware`). It protects `/dashboard` and `/profile` — unauthenticated users are redirected to `/signin`. The route groups `(auth)` and `(dashboard)` each have their own layout.

Auth is **Google OAuth only** via Supabase. Flow:
1. `GET /auth/google` → calls `supabase.auth.signInWithOAuth` with Google Fit scopes → redirects to Google
2. Google → `GET /auth/callback?code=...` → exchanges code, stores `provider_token` + `provider_refresh_token` + `full_name` in `profiles` table

### Data flow — Google Fit → DB → UI

`src/lib/google-fit.js` exports:
- `getHealthSummary` — today's steps, calories, active minutes, distance, heart rate, active days
- `getDailySteps` — 7-day step buckets (1 bucket per day)
- `getBodyMetrics` — weight + height via the `dataSources/datasets` endpoint with BigInt nanoseconds
- `getActivitySessions` — workout sessions from `/sessions` API, with per-session step counts fetched in parallel
- `getSleepData` — last night's sleep duration from sleep segments

The **dashboard page** (`(dashboard)/dashboard/page.js`) is a server component that:
1. Fetches fresh data from Google Fit if token is valid
2. Upserts historical rows to `health_daily` (past days first, today's full summary last — order matters to avoid overwriting calories with 0)
3. Always serves the UI from the DB

### Database schema (Supabase)

`profiles` — one row per user (mirrors `auth.users.id`):
- `full_name`, `bio`, `avatar_url`
- `google_access_token`, `google_refresh_token`, `google_token_expires_at`
- `weight_kg numeric(5,1)`, `height_cm integer`
- `leaderboard_visible boolean DEFAULT true`

`health_daily` — one row per `(user_id, date)`:
- `steps`, `calories`, `avg_heart_rate`, `synced_at`
- RLS: users manage their own rows; a second SELECT policy allows reading all rows (for leaderboard)

`get_leaderboard(period text)` RPC — aggregates `health_daily` by user for `'today'`, `'week'`, or `'month'`. Returns `rank, user_id, full_name, total_steps`. SECURITY INVOKER.

### Theme system

Custom implementation (no `next-themes`). A blocking `<script dangerouslySetInnerHTML>` in `layout.js` reads `localStorage('fitme-theme')` and sets `.dark` on `<html>` before hydration. `ThemeProvider` (`src/components/theme-provider.jsx`) provides context; `ThemeSwitcher` renders the System/Light/Dark buttons.

### Key conventions

- **Supabase server client**: always `await createClient()` from `@/lib/supabase/server` — it's async
- **`searchParams`**: always `await searchParams` before accessing properties (Next.js 16 breaking change)
- **Icons**: use `<Icon name="material_icon_name" />` from `@/components/icon.jsx` — never emojis for UI chrome
- **`buttonVariants`**: use directly on `<Link>` elements instead of `<Button asChild>` (Base UI doesn't support asChild)
- **BigInt nanoseconds**: Google Fit `dataSources/datasets` endpoint requires nanoseconds — use `(BigInt(ms) * 1000000n).toString()`
- **Nav active state**: `NavLinks` client component in `src/components/nav-links.jsx` uses `usePathname()`
