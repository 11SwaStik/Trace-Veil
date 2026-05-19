import { Toaster } from 'sonner'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuthInit } from './hooks/useAuthInit'
import { useAuthStore } from './store/authStore'
import { ApiTestPage } from './pages/ApiTestPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { SimulationViewPage } from './features/simulation/SimulationViewPage'
import { SimulationHistoryPage } from './features/history/SimulationHistoryPage'
import { AlertsPage } from './features/alerts/AlertsPage'
import { ReplayViewerPage } from './features/replay/ReplayViewerPage'
import { ReplayLibraryPage } from './features/replay/ReplayLibraryPage'
import { AppLayout } from './components/Layout/AppLayout'
import { ProtectedRoute } from './components/Layout/ProtectedRoute'

function HomePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--ink-1)', marginBottom: '1rem' }}>TraceVeil</h1>
        <p style={{ color: 'var(--ink-2)', fontSize: '1.125rem', marginBottom: '2rem' }}>Cybersecurity Simulation Platform</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', maxWidth: '56rem', marginBottom: '3rem' }}>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#22c55e', margin: '0 auto 1rem' }}></div>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>CLEAN</p>
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#ef4444', margin: '0 auto 1rem' }}></div>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>COMPROMISED</p>
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#f97316', margin: '0 auto 1rem' }}></div>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>ELEVATED</p>
          </div>
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--line-1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', background: '#a855f7', margin: '0 auto 1rem' }}></div>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-2)' }}>EXFILTRATING</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <Link
            to="/login"
            style={{
              padding: '0.5rem 1.5rem',
              background: '#1e40af',
              color: 'white',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1e3a8a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#1e40af')}
          >
            Login
          </Link>
          <Link
            to="/register"
            style={{
              padding: '0.5rem 1.5rem',
              background: 'var(--attack)',
              color: 'var(--bg-0)',
              borderRadius: '0.375rem',
              textDecoration: 'none',
              fontWeight: 500,
              display: 'inline-block',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#00c2ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--attack)')}
          >
            Get Started
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
          <Link to="/api-test" style={{ color: 'var(--attack)', textDecoration: 'none' }}>
            API Test
          </Link>
        </div>

        <p style={{ color: 'var(--ink-4)', fontSize: '0.75rem', marginTop: '3rem' }}>
          Frontend initialized with Operator design system • Phase 1: Tokens + Shell Layout
        </p>
      </div>
    </div>
  )
}

function App() {
  useAuthInit()
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <HomePage />} />
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
        <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />} />

        {/* Protected routes with layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/simulation/:id" element={<SimulationViewPage />} />
          <Route path="/history" element={<SimulationHistoryPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/replays" element={<ReplayLibraryPage />} />
          <Route path="/replay/:id" element={<ReplayViewerPage />} />
        </Route>

        <Route path="/api-test" element={<ApiTestPage />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
