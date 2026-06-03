import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { istIsoDate } from '@/lib/utils'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Icon } from '@/components/icon'
import { StepsBarChart } from '@/components/steps-bar-chart'

export default async function UserProfilePage({ params }) {
  const { userId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/signin')

  const thirtyDaysAgo = istIsoDate(-29)

  const [
    { data: todayRows },
    { data: weekRows },
    { data: monthRows },
    { data: history },
  ] = await Promise.all([
    supabase.rpc('get_leaderboard', { period: 'today' }),
    supabase.rpc('get_leaderboard', { period: 'week' }),
    supabase.rpc('get_leaderboard', { period: 'month' }),
    supabase.from('health_daily')
      .select('date, steps, calories, active_minutes, distance_km')
      .eq('user_id', userId)
      .gte('date', thirtyDaysAgo)
      .order('date', { ascending: false })
      .limit(30),
  ])

  // User must be opted-in (appear in at least one leaderboard period)
  const userInfo =
    monthRows?.find(r => r.user_id === userId) ||
    weekRows?.find(r => r.user_id === userId) ||
    todayRows?.find(r => r.user_id === userId)

  if (!userInfo) notFound()

  const todayStat  = todayRows?.find(r => r.user_id === userId)
  const weekStat   = weekRows?.find(r => r.user_id === userId)
  const monthStat  = monthRows?.find(r => r.user_id === userId)

  const isMe = userId === user.id

  const initials = (userInfo.full_name || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const chartData = (history ?? [])
    .slice()
    .reverse()
    .map(r => ({
      date: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      }),
      steps: r.steps ?? 0,
    }))

  const bestDay = (history ?? []).reduce((best, r) => (r.steps ?? 0) > (best?.steps ?? 0) ? r : best, null)

  return (
    <>
      {/* Back */}
      <Link href="/leaderboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
        <Icon name="arrow_back" size={18} />
        Leaderboard
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Avatar className="h-16 w-16 text-lg font-bold flex-shrink-0">
          <AvatarImage src={userInfo.avatar_url} alt={userInfo.full_name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">
            {userInfo.full_name}
            {isMe && <span className="ml-2 text-sm text-primary font-semibold">you</span>}
          </h1>
          {monthStat && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Rank #{monthStat.rank} this month
            </p>
          )}
        </div>
      </div>

      {/* Step stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Today',      steps: todayStat?.total_steps },
          { label: 'This week',  steps: weekStat?.total_steps },
          { label: 'This month', steps: monthStat?.total_steps },
        ].map(({ label, steps }) => (
          <Card key={label}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xl font-bold tabular-nums">
                {steps != null ? Number(steps).toLocaleString() : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Best day */}
      {bestDay && bestDay.steps > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-muted/50 mb-8">
          <Icon name="emoji_events" size={20} className="text-yellow-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium">Best day (30 days)</p>
            <p className="text-xs text-muted-foreground">
              {new Date(bestDay.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {' · '}
              {Number(bestDay.steps).toLocaleString()} steps
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">Steps — Last 30 days</h2>
          <Card>
            <CardContent className="pt-6">
              <StepsBarChart data={chartData} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* History table */}
      {history && history.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold text-muted-foreground uppercase tracking-wide mb-3">History</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Steps</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Calories</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Active min</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Distance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row, i) => (
                      <tr key={row.date} className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/30'}`}>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(row.date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {row.steps > 0 ? Number(row.steps).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                          {row.calories > 0 ? `${Number(row.calories).toLocaleString()} kcal` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                          {row.active_minutes > 0 ? `${row.active_minutes} min` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground hidden md:table-cell">
                          {row.distance_km > 0 ? `${row.distance_km} km` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </>
  )
}
