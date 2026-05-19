import { useSimStore } from '../../store/simulationStore'

const SEV_ORDER: Record<string, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3,
}
const SEV_COLOR: Record<string, string> = {
  LOW: '#6EA8FE',
  MEDIUM: '#E0A663',
  HIGH: '#E5484D',
  CRITICAL: '#E5484D',
}

export default function TimelineTray() {
  const { events, alerts } = useSimStore()

  const BUCKETS = 60
  const buckets = new Array(BUCKETS).fill(null).map(() => ({ count: 0, maxSev: '' }))
  events.forEach((ev) => {
    const t = new Date(ev.timestamp || ev.fired_at || '').getTime()
    const now = Date.now()
    const secAgo = Math.floor((now - t) / 1000)
    const idx = Math.max(0, Math.min(BUCKETS - 1, BUCKETS - 1 - secAgo))
    buckets[idx].count++
    if (
      !buckets[idx].maxSev ||
      SEV_ORDER[ev.severity] > SEV_ORDER[buckets[idx].maxSev]
    ) {
      buckets[idx].maxSev = ev.severity
    }
  })
  const maxCount = Math.max(1, ...buckets.map((b) => b.count))

  return (
    <div style={{ display: 'grid', gridTemplateRows: '30px 1fr 26px', height: '100%' }}>
      {/* Transport bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 10,
          borderBottom: '1px solid var(--line-1)',
          fontSize: 11,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 4,
            background: 'var(--bg-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 6,
            padding: 2,
          }}
        >
          {['⏮', '⏸', '⏭'].map((icon, i) => (
            <button
              key={i}
              style={{
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'transparent',
                border: 0,
                color: 'var(--ink-2)',
                cursor: 'pointer',
                fontSize: 10,
              }}
            >
              {icon}
            </button>
          ))}
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11.5,
            color: 'var(--ink-1)',
            background: 'var(--bg-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 3,
            padding: '2px 8px',
          }}
        >
          {new Date().toISOString().substr(11, 8)}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>
          <strong style={{ color: 'var(--ink-1)' }}>{events.length}</strong> events ·{' '}
          <strong style={{ color: 'var(--threat)' }}>{alerts.length}</strong> alerts
        </span>
      </div>

      {/* Density track */}
      <div style={{ position: 'relative', padding: '0 16px', cursor: 'pointer' }}>
        <svg
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            top: 6,
            bottom: 22,
            width: 'calc(100% - 32px)',
            height: 'calc(100% - 28px)',
          }}
          preserveAspectRatio="none"
          viewBox={`0 0 ${BUCKETS} 100`}
        >
          {buckets.map((b, i) =>
            b.count > 0 ? (
              <rect
                key={i}
                x={i + 0.1}
                y={100 - (b.count / maxCount) * 96}
                width={0.8}
                height={(b.count / maxCount) * 96}
                fill={SEV_COLOR[b.maxSev] ?? '#6EA8FE'}
                opacity={0.6}
              />
            ) : null,
          )}
        </svg>
        {/* Playhead */}
        <div
          style={{
            position: 'absolute',
            right: 16,
            top: 0,
            bottom: 22,
            width: 1,
            background: 'var(--attack)',
            transition: 'left 60ms linear',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: '50%',
              transform: 'translate(-50%, -100%)',
              background: 'var(--attack)',
              color: 'var(--bg-0)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              fontWeight: 600,
              padding: '1px 5px',
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            LIVE
          </div>
        </div>
        {/* Scrubber rail */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: 16,
            bottom: 8,
            height: 2,
            background: 'var(--bg-3)',
            borderRadius: 1,
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              background: 'var(--attack)',
              borderRadius: 1,
            }}
          />
        </div>
      </div>

      {/* Foot */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          borderTop: '1px solid var(--line-1)',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--ink-4)',
        }}
      >
        <span>T−60s</span>
        <span>Live simulation</span>
        <span>NOW</span>
      </div>
    </div>
  )
}
