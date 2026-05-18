import { useMutation } from '@tanstack/react-query'
import { useAuthStore } from '../../store/authStore'
import { apiClient } from '../../api/client'
import type { LoginRequest, RegisterRequest, AuthTokens, AuthUser } from '../../types/auth'

interface LoginResponse extends AuthTokens {
  user?: AuthUser
}

interface RegisterResponse {
  id: string
  email: string
  created_at: string
}

/**
 * Hook for login mutation
 */
export function useLogin() {
  const { setTokens, setUser } = useAuthStore()

  return useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const response = await apiClient.post<LoginResponse>('/api/auth/login', credentials)
      return response.data
    },
    onSuccess: (data) => {
      // Store tokens
      setTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
      })

      // If user data is in response, store it
      if (data.user) {
        setUser(data.user)
      }
    },
  })
}

/**
 * Hook for register mutation
 */
export function useRegister() {
  return useMutation({
    mutationFn: async (credentials: RegisterRequest) => {
      const response = await apiClient.post<RegisterResponse>('/api/auth/register', credentials)
      return response.data
    },
  })
}

/**
 * Hook to handle complete register + login flow
 */
export function useRegisterAndLogin() {
  const registerMutation = useRegister()
  const loginMutation = useLogin()

  return useMutation({
    mutationFn: async (credentials: RegisterRequest) => {
      await registerMutation.mutateAsync(credentials)
      const loginResponse = await loginMutation.mutateAsync(credentials)
      return loginResponse
    },
  })
}
