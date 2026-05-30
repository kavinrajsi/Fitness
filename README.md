# FitMe

A personal fitness tracking app that connects to Google Fit to display your health data — steps, calories, heart rate, activity sessions, sleep, and body metrics.

## Stack

- **Next.js 16** (App Router, JavaScript)
- **Supabase** — auth (Google OAuth), database, RLS
- **Tailwind CSS v4** + **shadcn/ui** (Base UI)
- **Google Fitness REST API**
- **Recharts** for charts, **Material Symbols Outlined** for icons

## Features

- Google OAuth sign-in with Google Fit scopes
- Dashboard with today's stats (steps, calories, heart rate, weight, height)
- 7-day steps bar chart
- Activity sessions with name, duration, and steps per session
- Leaderboard ranked by steps (today / last 7 days / this month)
- Dark / light / system theme
- Historical data stored per day in Supabase

## Getting started

```bash
npm install
npm run dev
```

### Required environment variables (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Google Cloud Console setup

1. Create a project, enable **Google Fitness API**
2. Create OAuth 2.0 credentials (Web application)
3. Add authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Paste Client ID + Secret into Supabase → Authentication → Providers → Google

## Commands

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # ESLint
```
