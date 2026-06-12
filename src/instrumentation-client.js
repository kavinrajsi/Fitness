/**
 * Client-side instrumentation (Next.js 16) — runs after the document loads and before
 * React hydration, the recommended place to initialise third-party SDKs.
 *
 * Initialises PostHog (analytics). `defaults: '2026-01-30'` enables automatic pageview /
 * pageleave capture, including App Router SPA navigations (history-API based). Guarded so a
 * missing token (e.g. local dev without PostHog) is a no-op rather than an error.
 *
 * api_host is the INGESTION host (us.i.posthog.com); ui_host is the dashboard host
 * (us.posthog.com) used only for "view in PostHog" links.
 */
import posthog from 'posthog-js'

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN
if (token) {
  posthog.init(token, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    ui_host: 'https://us.posthog.com',
    defaults: '2026-01-30',
  })
}
