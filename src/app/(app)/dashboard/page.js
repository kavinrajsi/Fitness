/**
 * Dashboard — shadcn cards + trend badges (dashboard-01 style) wired to the user's
 * real Google Health data: section cards, an activity chart with a range toggle, and
 * achievements. Steps from daily_metrics; goal from profiles.daily_step_goal.
 */
import {
  TrendingUpIcon,
  TrendingDownIcon,
  FlameIcon,
  HeartPulseIcon,
  DropletIcon,
  ActivityIcon,
  GaugeIcon,
  WindIcon,
  HeartIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getUserDetails } from '@/lib/get-user-details'
import { computeGamification } from '@/lib/gamification'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Dashboard — KyaReFitting' }

const IST = 5.5 * 3600 * 1000
const RANGES = [
  { key: '7d', label: '7D', days: 7 },
  { key: '30d', label: '30D', days: 30 },
  { key: '90d', label: '90D', days: 90 },
]

const dkey = (o) => new Date(Date.now() + IST - o * 86400000).toISOString().slice(0, 10)
const pct = (cur, prev) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : cur > 0 ? 100 : 0)

export default async function DashboardPage({ searchParams }) {
  const { range: rangeParam } = await searchParams
  const range = RANGES.find((r) => r.key === rangeParam) ?? RANGES[1]

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rows }, d] = await Promise.all([
    supabase.from('profiles').select('daily_step_goal').eq('id', user.id).maybeSingle(),
    supabase
      .from('daily_metrics')
      .select('date, steps, active_min, resting_hr, hydration_ml, vo2_max, spo2, hrv_ms')
      .eq('user_id', user.id),
    getUserDetails(),
  ])

  const goal = profile?.daily_step_goal ?? 10000
  const game = computeGamification(rows ?? [], goal)

  const byDate = {}
  for (const r of rows ?? []) byDate[r.date] = r.steps ?? 0
  const sum = (a, b) => {
    let t = 0
    for (let i = a; i <= b; i++) t += byDate[dkey(i)] ?? 0
    return t
  }
  const today = byDate[dkey(0)] ?? 0
  const yesterday = byDate[dkey(1)] ?? 0
  const last7 = sum(0, 6)
  const prev7 = sum(7, 13)
  const avg7 = Math.round(last7 / 7)

  // Most-recent value for sparse daily metrics (these aren't recorded every day).
  const latest = (field) => {
    const byField = {}
    for (const r of rows ?? []) if (r[field] != null) byField[r.date] = r[field]
    for (let i = 0; i < 90; i++) if (byField[dkey(i)] != null) return byField[dkey(i)]
    return null
  }
  const restingHr = latest('resting_hr')
  const hydrationMl = latest('hydration_ml')
  const vo2Max = latest('vo2_max')
  const spo2 = latest('spo2')
  const hrv = latest('hrv_ms')
  const activeMin = (rows ?? []).find((r) => r.date === dkey(0))?.active_min ?? null

  const series = []
  let chartMax = 0
  let chartTotal = 0
  for (let i = range.days - 1; i >= 0; i--) {
    const steps = byDate[dkey(i)] ?? 0
    chartTotal += steps
    if (steps > chartMax) chartMax = steps
    series.push({ key: dkey(i), steps })
  }
  const chartAvg = Math.round(chartTotal / range.days)

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Metric
          label="Steps today"
          value={today.toLocaleString()}
          trend={pct(today, yesterday)}
          foot={today >= goal ? 'Goal reached 🎉' : 'Keep moving'}
          note={`${Math.round(game.pct * 100)}% of ${goal.toLocaleString()} goal`}
        />
        <Metric
          label="This week"
          value={last7.toLocaleString()}
          trend={pct(last7, prev7)}
          foot="vs. previous 7 days"
          note={`${avg7.toLocaleString()} avg/day`}
        />
        <Metric
          label="Current streak"
          value={`${game.currentStreak}d`}
          icon={<FlameIcon className="size-4" />}
          foot={`Best: ${game.bestStreak} days`}
          note={`Goal ${goal.toLocaleString()}/day`}
        />
        <Metric
          label="Goal today"
          value={`${Math.round(game.pct * 100)}%`}
          progress={game.pct}
          foot={`${today.toLocaleString()} / ${goal.toLocaleString()}`}
          note="Daily step goal"
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium">Health</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <Metric
            label="Active minutes"
            value={activeMin != null ? `${activeMin} min` : '—'}
            icon={<ActivityIcon className="size-4" />}
            foot="Active time"
            note="Today"
          />
          <Metric
            label="Resting HR"
            value={restingHr != null ? `${restingHr} bpm` : '—'}
            icon={<HeartPulseIcon className="size-4" />}
            foot="Resting heart rate"
            note="Most recent"
          />
          <Metric
            label="Cardio fitness"
            value={vo2Max != null ? `${vo2Max}` : '—'}
            icon={<GaugeIcon className="size-4" />}
            foot="VO₂ max"
            note="mL/kg/min"
          />
          <Metric
            label="SpO₂"
            value={spo2 != null ? `${spo2}%` : '—'}
            icon={<WindIcon className="size-4" />}
            foot="Blood oxygen"
            note={spo2 != null ? 'Most recent' : 'No data yet'}
          />
          <Metric
            label="HRV"
            value={hrv != null ? `${hrv} ms` : '—'}
            icon={<HeartIcon className="size-4" />}
            foot="Heart rate variability"
            note={hrv != null ? 'Most recent' : 'No data yet'}
          />
          <Metric
            label="Hydration"
            value={hydrationMl != null ? `${(hydrationMl / 1000).toFixed(1)} L` : '—'}
            icon={<DropletIcon className="size-4" />}
            foot="Water intake"
            note={hydrationMl != null ? 'Most recent day' : 'Reconnect to enable'}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>
            {chartTotal.toLocaleString()} steps · {chartAvg.toLocaleString()}/day avg
          </CardDescription>
          <CardAction>
            <div className="bg-muted flex gap-0.5 rounded-lg p-0.5">
              {RANGES.map((r) => (
                <a
                  key={r.key}
                  href={`/dashboard?range=${r.key}`}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium',
                    r.key === range.key
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground'
                  )}
                >
                  {r.label}
                </a>
              ))}
            </div>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-px">
            {series.map((s) => (
              <span
                key={s.key}
                className="bg-primary flex-1 rounded-t-sm"
                style={{
                  height: chartMax ? `${Math.max((s.steps / chartMax) * 100, 1.5)}%` : '1.5%',
                }}
                title={`${s.key}: ${s.steps.toLocaleString()}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {game.achievements.map((a) => (
              <div
                key={a.id}
                title={a.name}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border p-3 text-center',
                  a.earned ? 'bg-muted/50' : 'opacity-40'
                )}
              >
                <span className="text-2xl leading-none">{a.earned ? a.icon : '🔒'}</span>
                <span className="text-muted-foreground text-[0.7rem] font-medium">{a.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {!d?.healthConnected && (
        <a href="/auth/google/health" className={cn(buttonVariants(), 'w-full')}>
          Connect Google Health
        </a>
      )}
    </div>
  )
}

function Metric({ label, value, trend, icon, progress, foot, note }) {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">{value}</CardTitle>
        <CardAction>
          {trend != null ? (
            <Badge variant="outline">
              {trend >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {trend >= 0 ? '+' : ''}
              {trend}%
            </Badge>
          ) : (
            icon && <Badge variant="outline">{icon}</Badge>
          )}
        </CardAction>
      </CardHeader>
      {progress != null && (
        <CardContent>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </CardContent>
      )}
      <CardFooter className="flex-col items-start gap-0.5 text-sm">
        <span className="font-medium">{foot}</span>
        <span className="text-muted-foreground text-xs">{note}</span>
      </CardFooter>
    </Card>
  )
}
