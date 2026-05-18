import { create } from 'zustand'
import type { AuthTokens, AuthUser, AuthState } from '../types/auth'

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'traceveil_access_token',
  REFRESH_TOKEN: 'traceveil_refresh_token',
  USER: 'traceveil_user',
} as const

interface AuthStore extends AuthState {
  setTokens: (tokens: AuthTokens) => void
  setUser: (user: AuthUser) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  logout: () => void
  hydrate: () => void
  getAuthHeader: () => { Authorization?: string }
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setTokens: (tokens: AuthTokens) => {
    const { access_token, refresh_token } = tokens

    // Store in localStorage
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token)
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh_token)

    set({
      accessToken: access_token,
      refreshToken: refresh_token,
      isAuthenticated: true,
      error: null,
    })
  },

  setUser: (user: AuthUser) => {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
    set({
      user,
      isAuthenticated: true,
    })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  logout: () => {
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)

    // Clear state
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      error: null,
    })
  },

  hydrate: () => {
    // Load from localStorage on app init
    const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    const userJson = localStorage.getItem(STORAGE_KEYS.USER)

    if (accessToken && refreshToken) {
      const user = userJson ? JSON.parse(userJson) : null

      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
        error: null,
      })
    }
  },

  getAuthHeader: () => {
    const { accessToken } = get()
    if (!accessToken) return {}
    return { Authorization: `Bearer ${accessToken}` }
  },
}))
