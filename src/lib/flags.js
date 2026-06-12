/**
 * Feature flags via the Vercel Flags SDK + PostHog adapter.
 *
 * Flags are evaluated server-side (App Router server components / route handlers) and
 * targeted at the signed-in Supabase user. `identify` (deduped per request) supplies the
 * distinctId + properties used for targeting — it must match the client-side identify in
 * src/components/posthog-provider.jsx (Supabase user id + email).
 *
 * The adapter reuses the same public project token as the client analytics. Without
 * POSTHOG_PERSONAL_API_KEY/POSTHOG_PROJECT_ID it evaluates flags remotely via that token
 * (works; set those later for faster local evaluation).
 */
import { dedupe, flag } from 'flags/next'
import { createPostHogAdapter } from '@flags-sdk/posthog'
import { createClient } from '@/lib/supabase/server'

const postHogAdapter = createPostHogAdapter({
  postHogKey: process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  postHogOptions: { host: process.env.NEXT_PUBLIC_POSTHOG_HOST },
})

const identify = dedupe(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return {
    distinctId: user?.id,
    properties: user?.email ? { email: user.email } : undefined,
  }
})

// Example flag — create a matching "example-flag" feature flag in the PostHog UI to control
// it. Copy this shape (key + defaultValue + identify + adapter) to add real flags.
export const exampleFlag = flag({
  key: 'example-flag',
  defaultValue: false,
  identify,
  adapter: postHogAdapter.isFeatureEnabled(),
})
