export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface RefreshTokenRequest {
  refresh_token: string
}
