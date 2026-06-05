/**
 * /workouts — the user's exercise sessions from Google Health (workouts table).
 */
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Workouts — KyaReFitting' }

function fmtDate(iso) {
  return iso
    ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'
}

export default async function WorkoutsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: workouts } = await supabase
    .from('workouts')
    .select('source_id, started_at, type, duration_min, calories, distance_km')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(100)

  const list = workouts ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workouts</CardTitle>
        <CardDescription>Your recent exercise sessions from Google Health</CardDescription>
      </CardHeader>
      <CardContent>
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No workouts yet — they&apos;ll appear here after a sync (and once Google Health has
            exercise sessions for your account).
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Activity</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead className="text-right">Calories</TableHead>
                <TableHead className="text-right">Distance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((w) => (
                <TableRow key={w.source_id}>
                  <TableCell className="font-medium">{w.type ?? 'Workout'}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(w.started_at)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {w.duration_min != null ? `${w.duration_min} min` : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {w.calories != null ? w.calories : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {w.distance_km != null ? `${w.distance_km} km` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
