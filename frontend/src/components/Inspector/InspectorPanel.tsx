import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSimStore } from '../../store/simulationStore'

const SEV_COLOR: Record<string, string> = {
  LOW: 'var(--info)',
  MEDIUM: 'var(--warn)',
  HIGH: 'var(--threat)',
  CRITICAL: 'var(--threat)',
}

export default function InspectorPanel() {
  const [tab, setTab] = useState<'events' | 'alerts'>('events')
  const { events, alerts } = useSimStore()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          height: 36,
          borderBottom: '1px solid var(--line-1)',
          padding: '0 4px',
          flexShrink: 0,
        }}
      >
        {(['events', 'alerts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0 12px',
              fontSize: 12,
              color: tab === t ? 'var(--ink-1)' : 'var(--ink-3)',
              background: 'transparent',
              border: 0,
              cursor: 'pointer',
              borderBottom:
                tab === t ? '1.5px solid var(--attack)' : '1.5px solid transparent',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span
              style={{
                background: 'var(--bg-3)',
                color: 'var(--ink-2)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                padding: '1px 5px',
                borderRadius: 8,
              }}
            >
              {t === 'events' ? events.length : alerts.length}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <AnimatePresence>
          {tab === 'events' &&
            events.map((ev) => (
              <motion.div
                key={ev.id}
                initial={{ x: 6, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 12px 1fr auto',
                  gap: 8,
                  padding: '7px 16px',
                  alignItems: 'center',
                  fontSize: 11.5,
                  borderBottom: '1px solid var(--line-1)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10.5,
                    color: 'var(--ink-3)',
                  }}
                >
                  {new Date(ev.timestamp || ev.fired_at || '').toISOString().substr(11, 8)}
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: SEV_COLOR[ev.severity] ?? 'var(--ink-3)',
                    display: 'block',
                  }}
                />
                <span
                  style={{
                    color: 'var(--ink-1)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--ink-3)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10.5,
                    }}
                  >
                    {ev.event_type}{' '}
                  </span>
                  {ev.description}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-3)',
                    background: 'var(--bg-2)',
                    border: '1px solid var(--line-1)',
                    borderRadius: 3,
                    padding: '0 5px',
                  }}
                >
                  {ev.ttp_id}
                </span>
              </motion.div>
            ))}

          {tab === 'alerts' &&
            alerts.map((al) => (
              <motion.div
                key={al.id}
                initial={{ x: 6, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.28, ease: [0.34, 1.4, 0.64, 1] }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 12px 1fr',
                  gap: 8,
                  padding: '7px 16px 7px 19px',
                  alignItems: 'center',
                  fontSize: 11.5,
                  borderBottom: '1px solid var(--line-1)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: 6,
                    bottom: 6,
                    width: 3,
                    borderRadius: 1,
                    background: SEV_COLOR[al.severity] ?? 'var(--ink-3)',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10.5,
                    color: 'var(--ink-3)',
                  }}
                >
                  {new Date(al.created_at).toISOString().substr(11, 8)}
                </span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: SEV_COLOR[al.severity] ?? 'var(--ink-3)',
                    display: 'block',
                  }}
                />
                <span style={{ color: 'var(--ink-1)' }}>{al.title}</span>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
