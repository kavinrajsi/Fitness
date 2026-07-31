/**
 * /leaderboard — ranks all users by total steps for the selected window. Tabs
 * (Today / Yesterday / 7D / This month, ?period=, default Today) switch which
 * [since, until] window loads.
 *
 * daily_metrics + profiles are RLS "own-row only", so the cross-user ranking is
 * aggregated by the leaderboard_between() security-definer SQL function — only
 * leaderboard-safe fields (display name, avatar, step total) are returned.
 */
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LeaderboardShareButton } from '@/components/leaderboard-share-button'
import { LeaderboardSection, resolvePeriod } from '@/components/leaderboard-section'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Leaderboard — KyaReFitting aa' }

// Resolves the period window and renders the shared leaderboard section (tabs + ranking).
export default async function LeaderboardPage({ searchParams }) {
  const params = await searchParams
  // ?period=custom reads the window from ?from=/?to=; anything invalid falls back to Today.
  const period = resolvePeriod(params.period, { from: params.from, to: params.to })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const since = period.since()
  const until = period.until()
  const formatDayLabel = (d) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const dateLabel = since === until ? formatDayLabel(since) : `${formatDayLabel(since)} – ${formatDayLabel(until)}`

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Leaderboard</CardTitle>
        <CardDescription>Total steps · {period.label} · {dateLabel}</CardDescription>
        <CardAction>
          <LeaderboardShareButton period={period.key} from={since} to={until} />
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* periodKey is the raw param, not period.key — an invalid custom range must keep
            the Custom tab (and its form) selected so it can be corrected. */}
        <LeaderboardSection
          userId={user.id}
          periodKey={params.period}
          basePath="/leaderboard"
          paramName="period"
          currentParams={params}
          showCustom
        />
      </CardContent>
    </Card>
  )
}
