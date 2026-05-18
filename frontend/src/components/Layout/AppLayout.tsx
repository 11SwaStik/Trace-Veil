import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { SignOut, Clock, Warning, House } from 'phosphor-react'

interface AppLayoutProps {
  children: React.ReactNode
}

/**
 * Main application layout for authenticated pages.
 * Includes header with user info, sidebar with navigation, and main content area.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: House },
    { path: '/history', label: 'History', icon: Clock },
    { path: '/alerts', label: 'Alerts', icon: Warning },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#131318] border-r border-[#262630] transition-all duration-300 flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-[#262630]">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#00d9ff] flex items-center justify-center flex-shrink-0">
              <span className="text-[#0a0a0f] font-bold text-sm">TV</span>
            </div>
            {sidebarOpen && <span className="text-[#e0e0e0] font-bold text-lg">TraceVeil</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.path)

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-[#1e40af] text-white'
                    : 'text-[#888899] hover:bg-[#1a1a20] hover:text-[#e0e0e0]'
                }`}
              >
                <Icon size={20} weight="bold" />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-[#262630]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full px-3 py-2 text-[#888899] hover:text-[#e0e0e0] text-sm transition-colors"
          >
            {sidebarOpen ? '←' : '→'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-[#131318] border-b border-[#262630] px-6 py-4">
          <div className="flex items-center justify-between max-w-full">
            <h1 className="text-2xl font-bold text-[#e0e0e0]">TraceVeil</h1>
            <div className="flex items-center gap-4">
              <span className="text-[#888899] text-sm">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white rounded text-sm font-medium transition-colors"
              >
                <SignOut size={16} weight="bold" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
