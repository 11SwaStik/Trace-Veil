import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useLogin } from './useAuth'
import { validateEmail, validatePassword, getErrorMessage } from '../../utils/validation'
import { Spinner } from '../../components/Spinner'

export function LoginPage() {
  const navigate = useNavigate()
  const loginMutation = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleEmailBlur = () => {
    const validation = validateEmail(email)
    setEmailError(validation.error || null)
  }

  const handlePasswordBlur = () => {
    const validation = validatePassword(password)
    setPasswordError(validation.error || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(password)

    if (!emailValidation.valid || !passwordValidation.valid) {
      setEmailError(emailValidation.error || null)
      setPasswordError(passwordValidation.error || null)
      return
    }

    // Submit
    try {
      await loginMutation.mutateAsync({
        email,
        password,
      })

      // On success, navigate to dashboard
      navigate('/dashboard')
    } catch (error) {
      // Error is handled by mutation, just show message
      console.error('Login failed:', error)
    }
  }

  const isLoading = loginMutation.isPending
  const errorMessage = loginMutation.error ? getErrorMessage(loginMutation.error) : null

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#e0e0e0] mb-2">TraceVeil</h1>
          <p className="text-[#888899]">Cybersecurity Simulation Platform</p>
        </div>

        {/* Form Card */}
        <div className="bg-[#131318] border border-[#262630] rounded-lg p-8">
          <h2 className="text-2xl font-semibold text-[#e0e0e0] mb-2">Sign In</h2>
          <p className="text-[#888899] text-sm mb-6">Enter your credentials to access TraceVeil</p>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg p-3 mb-6">
              <p className="text-[#ef4444] text-sm">{errorMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-[#888899] mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="user@example.com"
                className={`w-full px-4 py-2 bg-[#0a0a0f] border rounded-lg text-[#e0e0e0] placeholder-[#595963] focus:outline-none transition-all ${
                  emailError
                    ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]'
                    : 'border-[#262630] focus:border-[#00d9ff] focus:ring-1 focus:ring-[#00d9ff]'
                }`}
              />
              {emailError && <p className="text-[#ef4444] text-xs mt-1">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-[#888899] mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={handlePasswordBlur}
                placeholder="••••••••"
                className={`w-full px-4 py-2 bg-[#0a0a0f] border rounded-lg text-[#e0e0e0] placeholder-[#595963] focus:outline-none transition-all ${
                  passwordError
                    ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-1 focus:ring-[#ef4444]'
                    : 'border-[#262630] focus:border-[#00d9ff] focus:ring-1 focus:ring-[#00d9ff]'
                }`}
              />
              {passwordError && <p className="text-[#ef4444] text-xs mt-1">{passwordError}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-4 py-2 bg-[#1e40af] hover:bg-[#1e3a8a] disabled:bg-[#1e40af]/50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading && <Spinner size="sm" />}
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-[#888899] text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#00d9ff] hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[#595963] text-xs mt-8">
          © 2026 TraceVeil. All rights reserved.
        </p>
      </div>
    </div>
  )
}
