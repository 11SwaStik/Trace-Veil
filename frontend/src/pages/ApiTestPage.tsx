import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { apiClient } from '../api/client'

/**
 * Test page for verifying the API client and token refresh logic.
 * Navigate to /api-test to see this page.
 */
export function ApiTestPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [response, setResponse] = useState<string>('')
  const [tokenInfo, setTokenInfo] = useState<string>('')

  const auth = useAuthStore()

  const handleTestAuth = async () => {
    setStatus('loading')
    try {
      const response = await apiClient.get('/api/auth/me')
      setResponse(JSON.stringify(response.data, null, 2))
      setStatus('success')
    } catch (error) {
      setResponse(
        error instanceof Error
          ? error.message
          : 'Unknown error',
      )
      setStatus('error')
    }
  }

  const handleTestSimulations = async () => {
    setStatus('loading')
    try {
      const response = await apiClient.get('/api/simulations')
      setResponse(JSON.stringify(response.data, null, 2))
      setStatus('success')
    } catch (error) {
      setResponse(
        error instanceof Error
          ? error.message
          : 'Unknown error',
      )
      setStatus('error')
    }
  }

  const handleCheckTokens = () => {
    const info = {
      isAuthenticated: auth.isAuthenticated,
      hasAccessToken: !!auth.accessToken,
      hasRefreshToken: !!auth.refreshToken,
      userEmail: auth.user?.email || 'N/A',
      accessTokenLength: auth.accessToken?.length || 0,
      refreshTokenLength: auth.refreshToken?.length || 0,
    }
    setTokenInfo(JSON.stringify(info, null, 2))
  }

  const handleLogout = () => {
    auth.logout()
    setTokenInfo('Logged out. Check localStorage — tokens should be cleared.')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#e0e0e0] mb-8">API Client Test Page</h1>

        {/* Auth Status */}
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#e0e0e0] mb-4">Auth Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[#888899] text-sm">Authenticated</p>
              <p className="text-[#e0e0e0] font-mono">
                {auth.isAuthenticated ? '✅ YES' : '❌ NO'}
              </p>
            </div>
            <div>
              <p className="text-[#888899] text-sm">User Email</p>
              <p className="text-[#e0e0e0] font-mono">{auth.user?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[#888899] text-sm">Access Token</p>
              <p className="text-[#e0e0e0] font-mono text-xs">
                {auth.accessToken ? `${auth.accessToken.substring(0, 20)}...` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-[#888899] text-sm">Refresh Token</p>
              <p className="text-[#e0e0e0] font-mono text-xs">
                {auth.refreshToken ? `${auth.refreshToken.substring(0, 20)}...` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Test Buttons */}
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#e0e0e0] mb-4">Tests</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCheckTokens}
              className="px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors"
            >
              Check Tokens in Store
            </button>
            <button
              onClick={handleTestAuth}
              className="px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors"
            >
              Test GET /api/auth/me
            </button>
            <button
              onClick={handleTestSimulations}
              className="px-4 py-2 bg-[#1e40af] text-white rounded hover:bg-[#1e3a8a] transition-colors"
            >
              Test GET /api/simulations
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#ef4444] text-white rounded hover:bg-[#dc2626] transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Token Info */}
        {tokenInfo && (
          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">Token Info</h2>
            <pre className="bg-[#0a0a0f] p-3 rounded text-[#e0e0e0] font-mono text-xs overflow-x-auto">
              {tokenInfo}
            </pre>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="bg-[#131318] border border-[#262630] rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#e0e0e0]">Response</h2>
              <span
                className={`text-sm font-medium ${
                  status === 'success'
                    ? 'text-[#22c55e]'
                    : status === 'error'
                      ? 'text-[#ef4444]'
                      : 'text-[#888899]'
                }`}
              >
                {status.toUpperCase()}
              </span>
            </div>
            <pre className="bg-[#0a0a0f] p-3 rounded text-[#e0e0e0] font-mono text-xs overflow-x-auto">
              {response}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-6 mt-6">
          <h2 className="text-lg font-semibold text-[#e0e0e0] mb-3">How to Test</h2>
          <ol className="text-[#888899] space-y-2 text-sm list-decimal list-inside">
            <li>
              <strong>Check Tokens:</strong> Click "Check Tokens in Store" to see current auth state in Zustand
            </li>
            <li>
              <strong>Test Auth Endpoint:</strong> Click "Test GET /api/auth/me" — should fail with 401 if not logged in
            </li>
            <li>
              <strong>Manual Token Test:</strong> Open DevTools → Console, run:
              <code className="block bg-[#0a0a0f] p-2 rounded mt-1 font-mono">
                localStorage.setItem('traceveil_access_token', 'test-token-123')
              </code>
              Then click "Test GET /api/auth/me" — should show 401 + token refresh attempt
            </li>
            <li>
              <strong>Check Network Tab:</strong> Open DevTools → Network, repeat test above. You should see:
              <ul className="list-disc list-inside ml-4 mt-1">
                <li>Request to /api/auth/me with Authorization header</li>
                <li>Response: 401 Unauthorized</li>
                <li>Request to /api/auth/refresh (automatic retry)</li>
                <li>If refresh succeeds: another /api/auth/me request</li>
              </ul>
            </li>
            <li>
              <strong>Logout Test:</strong> Click "Logout" and check localStorage — tokens should be cleared
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}
