'use client'

/**
 * Supplies the PostHog singleton (initialised in src/instrumentation-client.js) to the
 * React tree so any client component can call usePostHog(), and identifies the signed-in
 * Supabase user (id + email) for analytics + user-targeted feature flags. Resets to an
 * anonymous id on sign-out. Mounted once at the root layout (mirrors theme-provider.jsx).
 */
import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { createClient } from '@/lib/supabase/client'

export function PostHogProvider({ children }) {
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) posthog.identify(user.id, { email: user.email })
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') posthog.reset()
      else if (session?.user) posthog.identify(session.user.id, { email: session.user.email })
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
