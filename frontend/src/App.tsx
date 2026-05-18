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
import { AppLayout } from './components/Layout/AppLayout'
import { ProtectedRoute } from './components/Layout/ProtectedRoute'

function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-[#e0e0e0] mb-4">TraceVeil</h1>
        <p className="text-[#888899] text-lg mb-8">Cybersecurity Simulation Platform</p>

        <div className="grid grid-cols-4 gap-4 max-w-2xl mb-12">
          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
            <div className="w-12 h-12 rounded-full bg-[#22c55e] mb-4 mx-auto"></div>
            <p className="text-sm text-[#888899]">CLEAN</p>
          </div>

          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
            <div className="w-12 h-12 rounded-full bg-[#ef4444] mb-4 mx-auto"></div>
            <p className="text-sm text-[#888899]">COMPROMISED</p>
          </div>

          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
            <div className="w-12 h-12 rounded-full bg-[#f97316] mb-4 mx-auto"></div>
            <p className="text-sm text-[#888899]">ELEVATED</p>
          </div>

          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
            <div className="w-12 h-12 rounded-full bg-[#a855f7] mb-4 mx-auto"></div>
            <p className="text-sm text-[#888899]">EXFILTRATING</p>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <Link
            to="/login"
            className="px-6 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors inline-block"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="px-6 py-2 bg-[#00d9ff] text-[#0a0a0f] rounded hover:bg-[#00c2ff] transition-colors font-medium inline-block"
          >
            Get Started
          </Link>
        </div>

        <div className="flex justify-center gap-3 text-sm">
          <Link to="/api-test" className="text-[#00d9ff] hover:underline">
            API Test
          </Link>
        </div>

        <p className="text-[#595963] text-xs mt-12">
          Frontend initialized with dark theme • Ready for Phase 1
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
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/simulation/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SimulationViewPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SimulationHistoryPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <AppLayout>
                <AlertsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/replay/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ReplayViewerPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="/api-test" element={<ApiTestPage />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
