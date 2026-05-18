import { Toaster } from 'sonner'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuthInit } from './hooks/useAuthInit'
import { useAuthStore } from './store/authStore'
import { ApiTestPage } from './pages/ApiTestPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'

function DashboardPage() {
  const { user, logout } = useAuthStore()

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <div className="bg-[#131318] border-b border-[#262630] px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-[#e0e0e0]">TraceVeil</h1>
          <div className="flex items-center gap-4">
            <span className="text-[#888899]">{user?.email}</span>
            <button
              onClick={() => {
                logout()
                window.location.href = '/login'
              }}
              className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-[#e0e0e0] mb-4">Welcome back, {user?.email}!</h2>
        <p className="text-[#888899] mb-8">This is the dashboard. More features coming in Phase 4!</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#e0e0e0] mb-2">Simulations</h3>
            <p className="text-[#888899]">Create and run attack simulations</p>
          </div>
          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[#e0e0e0] mb-2">Replays</h3>
            <p className="text-[#888899]">Review past simulations</p>
          </div>
        </div>

        <div className="mt-8">
          <Link to="/api-test" className="text-[#00d9ff] hover:underline text-sm">
            → API Test Page
          </Link>
        </div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

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

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
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
