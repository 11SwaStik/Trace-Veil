# API Client Setup

## Overview

The API client layer provides:
- Two axios instances: `apiClient` (REST API on :8000) and `replayClient` (Replay Engine on :8002)
- Automatic request interceptor that adds `Authorization: Bearer {token}` header
- Response interceptor that handles 401 errors by:
  1. Calling `POST /api/auth/refresh` with the refresh token
  2. Storing new tokens in localStorage and Zustand store
  3. Retrying the original request with the new token
  4. On refresh failure: clearing tokens and redirecting to `/login`

## Files

- `client.ts` — Axios instances and interceptor logic
- `../store/authStore.ts` — Zustand store for auth state
- `../types/auth.ts` — TypeScript type definitions
- `../hooks/useAuthInit.ts` — Hook to hydrate auth state on app load

## Usage

### 1. Initialize Auth on App Load

In your `src/App.tsx`:

```tsx
import { useAuthInit } from './hooks/useAuthInit'

function App() {
  useAuthInit()  // Load tokens from localStorage
  
  return (
    // ... your app
  )
}
```

### 2. Make API Requests

```tsx
import { apiClient, replayClient } from '@/api/client'

// GET request
async function fetchSimulations() {
  const response = await apiClient.get('/api/simulations')
  return response.data
}

// POST request
async function login(email: string, password: string) {
  const response = await apiClient.post('/api/auth/login', {
    email,
    password,
  })
  return response.data
}

// Replay API
async function getReplay(replayId: string) {
  const response = await replayClient.get(`/api/replays/${replayId}`)
  return response.data
}
```

### 3. Update Auth State

```tsx
import { useAuthStore } from '@/store/authStore'

const { setTokens, setUser, logout, isAuthenticated } = useAuthStore()

// After login
setTokens({
  access_token: 'eyJ...',
  refresh_token: 'eyJ...',
  token_type: 'bearer',
})
setUser({
  id: 'user-123',
  email: 'user@example.com',
  created_at: '2026-05-15T10:00:00Z',
})

// On logout
logout()

// Check authentication
if (isAuthenticated) {
  // user is logged in
}
```

## How Token Refresh Works

### Scenario 1: Normal Request (Token Valid)

```
1. Component calls: await apiClient.get('/api/simulations')
2. Request interceptor adds: { Authorization: 'Bearer {access_token}' }
3. Server returns 200 + data
4. Component receives data
```

### Scenario 2: Token Expired (401)

```
1. Component calls: await apiClient.get('/api/simulations')
2. Request interceptor adds: { Authorization: 'Bearer {expired_token}' }
3. Server returns 401 (token expired)
4. Response interceptor triggers:
   a. Extracts refresh_token from store
   b. Calls: POST /api/auth/refresh { refresh_token }
   c. Server returns: { access_token, refresh_token }
   d. Stores new tokens in localStorage + Zustand
   e. Retries original request with new token
5. Component receives data (transparent to caller)
```

### Scenario 3: Refresh Token Expired / Invalid

```
1. Component calls: await apiClient.get('/api/simulations')
2. Request interceptor adds token
3. Server returns 401
4. Response interceptor calls: POST /api/auth/refresh
5. Server returns 401 (refresh token also expired)
6. Response interceptor:
   a. Clears all tokens from localStorage + Zustand
   b. Redirects to /login
   c. Rejects the original request
7. Component receives error (user must log in again)
```

## Token Storage

Tokens are stored in browser localStorage with keys:
- `traceveil_access_token` — Short-lived (15 min)
- `traceveil_refresh_token` — Long-lived (7 days)
- `traceveil_user` — User object (JSON)

**Note:** In a real app, consider using `httpOnly` cookies or secure storage. localStorage is convenient for development but vulnerable to XSS. For now, it's acceptable for a local tool.

## Error Handling

The interceptor handles these cases:

1. **Network error** → Rejected normally (try/catch in component)
2. **401 on non-refresh request** → Attempts refresh, retries
3. **401 on refresh request** → Logs out, redirects to login
4. **Refresh fails** → Logs out, redirects to login
5. **No refresh token** → Logs out, redirects to login

All errors log to console without exposing sensitive tokens.

## Testing

### Test 1: Manual Token Refresh

In browser DevTools Console:

```javascript
// 1. Set an expired token (will trigger 401)
localStorage.setItem('traceveil_access_token', 'expired.token.here')
localStorage.setItem('traceveil_refresh_token', '{valid_refresh_token}')

// 2. Make a request
import { apiClient } from './src/api/client.ts'
apiClient.get('/api/simulations')

// 3. Watch the Network tab:
//    - First request: 401 (expired token)
//    - Second request: POST /api/auth/refresh (200)
//    - Third request: GET /api/simulations (200, retried)

// 4. Check localStorage
localStorage.getItem('traceveil_access_token')  // Should be new token
```

### Test 2: Logout on Failed Refresh

```javascript
// 1. Set invalid refresh token
localStorage.setItem('traceveil_refresh_token', 'invalid.token')

// 2. Make a request (will return 401)
apiClient.get('/api/simulations')

// 3. Watch Network:
//    - First request: 401
//    - POST /api/auth/refresh: 401 (refresh also fails)
//    - Browser redirects to /login

// 4. Check localStorage
localStorage.getItem('traceveil_access_token')  // null (cleared)
```

### Test 3: Normal Auth Flow

```javascript
// 1. Login
import { apiClient } from './src/api/client.ts'
const response = await apiClient.post('/api/auth/login', {
  email: 'user@example.com',
  password: 'password123'
})

// 2. Store tokens
import { useAuthStore } from './src/store/authStore.ts'
useAuthStore.getState().setTokens(response.data)
useAuthStore.getState().setUser({ id: '...', email: '...', created_at: '...' })

// 3. Make request (token should be valid)
const sims = await apiClient.get('/api/simulations')
console.log(sims.data)

// 4. Check isAuthenticated
useAuthStore.getState().isAuthenticated  // true
```

## Environment Variables

The client reads from `.env.local`:

```env
VITE_API_BASE=http://localhost:8000
VITE_REPLAY_BASE=http://localhost:8002
```

If not set, defaults to localhost on those ports.

## Next Steps

Once you've tested the client:
1. Verify the interceptor adds the `Authorization` header (Network tab)
2. Confirm token refresh works on 401
3. Test logout clears localStorage

Then move to **Prompt 3: Login + Register pages** to build the auth UI.
