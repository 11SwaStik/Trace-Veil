import axios, { AxiosError, AxiosInstance } from 'axios'
import { useAuthStore } from '../store/authStore'
import type { AuthTokens, RefreshTokenRequest } from '../types/auth'

/**
 * Create an axios instance with token refresh interceptor.
 * Handles 401 responses by refreshing the token and retrying the request.
 */
function createApiClient(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    timeout: 10000,
  })

  // Request interceptor: add Authorization header
  instance.interceptors.request.use(
    (config) => {
      const authHeader = useAuthStore.getState().getAuthHeader()
      if (authHeader.Authorization) {
        config.headers.Authorization = authHeader.Authorization
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  // Response interceptor: handle 401 and token refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config

      // Only handle 401 responses
      if (error.response?.status !== 401 || !originalRequest) {
        return Promise.reject(error)
      }

      // Prevent infinite loop: don't retry refresh token endpoint
      if (originalRequest.url?.includes('/api/auth/refresh')) {
        useAuthStore.getState().logout()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        // Get current refresh token
        const refreshToken = useAuthStore.getState().refreshToken

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        // Call refresh endpoint
        const refreshRequest: RefreshTokenRequest = { refresh_token: refreshToken }

        const response = await axios.post<AuthTokens>(
          `${baseURL}/api/auth/refresh`,
          refreshRequest,
          { timeout: 5000 },
        )

        const { access_token, refresh_token } = response.data

        // Update tokens in store and localStorage
        useAuthStore.getState().setTokens({
          access_token,
          refresh_token,
          token_type: 'bearer',
        })

        // Retry original request with new token
        const config = originalRequest
        config.headers.Authorization = `Bearer ${access_token}`

        return instance(config)
      } catch (refreshError) {
        // Refresh failed: logout and redirect to login
        console.error('Token refresh failed:', refreshError instanceof Error ? refreshError.message : 'Unknown error')

        useAuthStore.getState().logout()
        window.location.href = '/login'

        return Promise.reject(refreshError)
      }
    },
  )

  return instance
}

// Create client instances for different backends
const apiBaseUrl = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const replayBaseUrl = import.meta.env.VITE_REPLAY_BASE || 'http://localhost:8002'

export const apiClient = createApiClient(apiBaseUrl)
export const replayClient = createApiClient(replayBaseUrl)

/**
 * Helper function to get auth header for manual use if needed.
 * Usage: { headers: getAuthHeader() }
 */
export function getAuthHeader() {
  return useAuthStore.getState().getAuthHeader()
}
