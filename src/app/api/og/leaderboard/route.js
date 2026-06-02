import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

const PERIOD_LABELS = { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 Days', month: 'This Month' }

// gold / silver / bronze
const TROPHY_COLORS = ['#F59E0B', '#94A3B8', '#B45309']

function getDateLabel(period) {
  const now = new Date()
  const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  if (period === 'yesterday') {
    const y = new Date(now)
    y.setDate(now.getDate() - 1)
    return fmt(y)
  }
  if (period === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    return `${fmt(start)} – ${fmt(now)}`
  }
  if (period === 'month') return now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  return fmt(now)
}

// Trophy SVG path (Material Icons "emoji_events")
const TROPHY_PATH =
  'M19 5h-2V3H7v2H5C3.9 5 3 5.9 3 7v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 009 15.9V17H7v2h10v-2h-2v-1.1a5.01 5.01 0 003.61-3.96C21.08 11.63 21 9.55 21 8V7c0-1.1-.9-2-2-2zm-2 3c0 1.66-1.34 3-3 3s-3-1.34-3-3V5h6v3zM5 8V7h2v3.87C5.84 10.43 5 9.29 5 8zm14 0c0 1.29-.84 2.43-2 2.87V7h2v1z'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'today'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: rows } = await supabase.rpc('get_leaderboard', { period })
  const top4 = (rows || []).slice(0, 4)

  // Height: header ~160px + each row ~80px + gap ~12px + footer ~64px
  const rowsHeight = top4.length * 80 + Math.max(0, top4.length - 1) * 12
  const height = 160 + rowsHeight + 64

  return new ImageResponse(
    (
      <div
        style={{
          width: 600,
          height,
          background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: '36px 40px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 28 }}>
          <div
            style={{
              fontSize: 11,
              color: '#475569',
              letterSpacing: 3,
              textTransform: 'uppercase',
              marginBottom: 6,
              display: 'flex',
            }}
          >
            KyaReFitting aa
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#f1f5f9',
              lineHeight: 1.2,
              display: 'flex',
            }}
          >
            Leaderboard
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#64748b',
              marginTop: 4,
              display: 'flex',
            }}
          >
            {PERIOD_LABELS[period] ?? 'Today'} · {getDateLabel(period)}
          </div>
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {top4.map((row, i) => {
            const rank = i + 1
            const isTop3 = rank <= 3
            const trophyColor = TROPHY_COLORS[i]
            const initials = (row.full_name || '?')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)

            // rgba breakdown for border/bg tint
            const rgbMap = { 1: '245,158,11', 2: '148,163,184', 3: '180,83,9' }
            const rgb = rgbMap[rank] ?? '255,255,255'

            return (
              <div
                key={row.user_id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: isTop3 ? `rgba(${rgb},0.08)` : 'rgba(255,255,255,0.04)',
                  borderRadius: 14,
                  padding: '14px 18px',
                  border: isTop3
                    ? `1px solid rgba(${rgb},0.3)`
                    : '1px solid rgba(255,255,255,0.07)',
                  gap: 14,
                  height: 80,
                  boxSizing: 'border-box',
                }}
              >
                {/* Trophy / rank */}
                <div
                  style={{
                    width: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isTop3 ? (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill={trophyColor}>
                      <path d={TROPHY_PATH} />
                    </svg>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: '#1e293b',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#64748b',
                      }}
                    >
                      #{rank}
                    </div>
                  )}
                </div>

                {/* Avatar */}
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 999,
                    background: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#94a3b8',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                >
                  {row.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={row.avatar_url}
                      width={42}
                      height={42}
                      alt=""
                      style={{ borderRadius: 999 }}
                    />
                  ) : (
                    <div style={{ display: 'flex', color: '#94a3b8', fontWeight: 700, fontSize: 15 }}>
                      {initials}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div
                  style={{
                    flex: 1,
                    color: '#f1f5f9',
                    fontSize: 15,
                    fontWeight: 600,
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  {(row.full_name || 'Anonymous').slice(0, 28)}
                </div>

                {/* Steps */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      color: isTop3 ? trophyColor : '#f1f5f9',
                      fontSize: 18,
                      fontWeight: 700,
                      lineHeight: 1.2,
                      display: 'flex',
                    }}
                  >
                    {Number(row.total_steps).toLocaleString()}
                  </div>
                  <div style={{ color: '#64748b', fontSize: 11, display: 'flex' }}>steps</div>
                </div>
              </div>
            )
          })}

          {top4.length === 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                fontSize: 15,
                padding: '32px 0',
              }}
            >
              No data for this period yet.
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 20,
            display: 'flex',
            justifyContent: 'center',
            color: '#334155',
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          fitme.app
        </div>
      </div>
    ),
    { width: 600, height }
  )
}
