import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { Clock, Warning, House, FilmSlate, GearSix } from 'phosphor-react'

export function AppLayout() {
  const { user } = useAuthStore()
  const location = useLocation()

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: House },
    { path: '/history', label: 'History', icon: Clock },
    { path: '/replays', label: 'Replays', icon: FilmSlate },
    { path: '/alerts', label: 'Alerts', icon: Warning },
  ]

  const userInitial = user?.email?.charAt(0).toUpperCase() || '?'
  const username = user?.email?.split('@')[0] || 'User'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '220px 1fr 360px',
        gridTemplateRows: '48px 1fr 160px',
        gridTemplateAreas: `
          "top    top     top"
          "nav    canvas  insp"
          "nav    tl      tl"
        `,
        height: '100vh',
        width: '100%',
        background: 'var(--bg-0)',
        color: 'var(--ink-1)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* TOP BAR */}
      <header
        style={{
          gridArea: 'top',
          background: 'var(--bg-1)',
          borderBottom: '1px solid var(--line-1)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', fontWeight: 600, fontSize: '13px' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '3px',
              background: 'var(--bg-3)',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '3px',
                top: '4px',
                bottom: '4px',
                width: '2px',
                background: 'var(--attack)',
                opacity: 0.7,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: '8px',
                top: '7px',
                bottom: '7px',
                width: '1px',
                background: 'var(--attack)',
                opacity: 0.35,
              }}
            />
          </div>
          <span>TraceVeil</span>
        </div>

        <div style={{ display: 'flex', gap: '6px', color: 'var(--ink-3)', fontSize: '12px', alignItems: 'center' }}>
          <span>Production</span>
          <span style={{ color: 'var(--ink-4)' }}>›</span>
          <span>Simulation</span>
          <span style={{ color: 'var(--ink-4)' }}>›</span>
          <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>Active</span>
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--ink-2)',
          }}
        >
          <span style={{ color: 'var(--ink-3)', fontSize: '10px', textTransform: 'uppercase' }}>Integrity</span>
          <span style={{ color: 'var(--ink-1)', fontWeight: 600 }}>100%</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-2)' }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--threat)',
              boxShadow: '0 0 0 0 var(--threat)',
              animation: 'livepulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }}
          />
          <span>LIVE · 00:00.00</span>
        </div>

        <button
          style={{
            width: '26px',
            height: '26px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            transition: 'background 120ms, color 120ms',
          }}
          title="Settings"
        >
          <GearSix size={14} weight="bold" />
        </button>
      </header>

      {/* NAV SIDEBAR */}
      <nav
        style={{
          gridArea: 'nav',
          background: 'var(--bg-1)',
          borderRight: '1px solid var(--line-1)',
          padding: '12px 8px',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <div
            style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--ink-4)',
              padding: '0 8px 6px',
            }}
          >
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12.5px',
                  color: active ? 'var(--ink-1)' : 'var(--ink-2)',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 100ms, color 100ms',
                  background: active ? 'var(--bg-2)' : 'transparent',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-2)'
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {active && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '-8px',
                      top: '6px',
                      bottom: '6px',
                      width: '2px',
                      background: 'var(--attack)',
                      borderRadius: '1px',
                    }}
                  />
                )}
                <Icon
                  size={14}
                  weight="bold"
                  style={{ color: active ? 'var(--attack)' : 'var(--ink-3)' }}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div
          style={{
            marginTop: 'auto',
            padding: '10px 8px 4px',
            borderTop: '1px solid var(--line-1)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--ink-3)',
          }}
        >
          <div
            style={{
              width: '22px',
              height: '22px',
              borderRadius: '4px',
              background: 'var(--bg-3)',
              color: 'var(--ink-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 600,
            }}
          >
            {userInitial}
          </div>
          <div>
            <div style={{ color: 'var(--ink-1)', fontSize: '12px' }}>{username}</div>
            <div style={{ fontSize: '10px' }}>Analyst</div>
          </div>
        </div>
      </nav>

      {/* CANVAS AREA */}
      <section
        style={{
          gridArea: 'canvas',
          background: 'var(--bg-0)',
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
        }}
      >
        <div style={{ width: '100%', height: '100%' }}>
          <Outlet />
        </div>
      </section>

      {/* INSPECTOR PANEL */}
      <aside
        style={{
          gridArea: 'insp',
          background: 'var(--bg-1)',
          borderLeft: '1px solid var(--line-1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line-1)' }}>
          {['Story', 'Events', 'Alerts'].map((tab) => (
            <button
              key={tab}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '12px',
                fontWeight: 500,
                color: tab === 'Story' ? 'var(--ink-1)' : 'var(--ink-2)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'color 100ms',
              }}
            >
              {tab}
              {tab === 'Story' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-1px',
                    left: '12px',
                    right: '12px',
                    height: '1.5px',
                    background: 'var(--attack)',
                  }}
                />
              )}
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', color: 'var(--ink-3)' }}>
          <p style={{ fontSize: '12px' }}>Inspector content goes here</p>
        </div>
      </aside>

      {/* TIMELINE TRAY */}
      <section
        style={{
          gridArea: 'tl',
          background: 'var(--bg-1)',
          borderTop: '1px solid var(--line-1)',
          display: 'grid',
          gridTemplateRows: '30px 1fr 26px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid var(--line-1)',
            gap: '10px',
            fontSize: '11px',
          }}
        >
          <div style={{ display: 'flex', gap: '2px' }}>
            <button style={{ width: '20px', height: '20px', background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>‹</button>
            <button style={{ width: '20px', height: '20px', background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>▶</button>
            <button style={{ width: '20px', height: '20px', background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>›</button>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--ink-1)' }}>
            00:00.00 <span style={{ color: 'var(--ink-3)' }}>/ 00:42.00</span>
          </div>
          <button style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--ink-2)', background: 'var(--bg-2)', border: '1px solid var(--line-2)', borderRadius: 'var(--radius-sm)', padding: '2px 8px', cursor: 'pointer' }}>
            1× speed
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '11px', color: 'var(--ink-3)' }}>
            <strong style={{ color: 'var(--ink-1)' }}>0</strong> events · <strong style={{ color: 'var(--threat)' }}>0</strong> alerts · <strong style={{ color: 'var(--ink-1)' }}>0</strong> compromised
          </div>
        </div>
        <div
          style={{
            position: 'relative',
            padding: '0 16px',
            overflow: 'hidden',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: '16px',
              right: '16px',
              top: 'calc(50% - 1px)',
              height: '2px',
              background: 'var(--bg-3)',
              borderRadius: '1px',
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            borderTop: '1px solid var(--line-1)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--ink-4)',
            justifyContent: 'space-between',
          }}
        >
          <span>T+00:00 · Recon</span>
          <span>Idle — press play</span>
          <span>T+00:42 · End</span>
        </div>
      </section>
    </div>
  )
}
