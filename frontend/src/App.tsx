import { Toaster } from 'sonner'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthInit } from './hooks/useAuthInit'
import { useAuthStore } from './store/authStore'
import { ApiTestPage } from './pages/ApiTestPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import SimulationViewPage from './features/simulation/SimulationViewPage'
import { SimulationHistoryPage } from './features/history/SimulationHistoryPage'
import { AlertsPage } from './features/alerts/AlertsPage'
import { ReplayViewerPage } from './features/replay/ReplayViewerPage'
import { ReplayLibraryPage } from './features/replay/ReplayLibraryPage'
import { AppLayout } from './components/Layout/AppLayout'
import { ProtectedRoute } from './components/Layout/ProtectedRoute'

function App() {
  useAuthInit()
  const { isAuthenticated } = useAuthStore()

  return (
    <Router>
      <Toaster />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />} />
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
