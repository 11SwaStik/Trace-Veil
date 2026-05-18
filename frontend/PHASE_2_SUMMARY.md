# Phase 2 Complete: Axios Interceptor + Token Refresh Logic ✅

## What Was Built

You now have a complete HTTP client layer with **automatic token refresh**:

1. ✅ **Axios Clients** — Two instances for different backends
2. ✅ **Request Interceptor** — Automatically adds `Authorization: Bearer {token}` header
3. ✅ **Response Interceptor** — Handles 401 errors by refreshing token and retrying
4. ✅ **Zustand Auth Store** — Manages tokens, user data, and localStorage persistence
5. ✅ **Token Hydration** — Loads tokens from localStorage on app startup
6. ✅ **Test Page** — Manual testing interface to verify everything works

---

## Files Created

### API Client
- **`src/api/client.ts`** — Axios instances + interceptor logic
  - Creates `apiClient` (localhost:8000)
  - Creates `replayClient` (localhost:8002)
  - Handles request auth header injection
  - Handles 401 response + token refresh
  - Handles logout on refresh failure

- **`src/api/README.md`** — Detailed API client documentation
  - How to use the client
  - Token refresh flow explanation
  - Testing instructions
  - Troubleshooting

### Auth Store
- **`src/store/authStore.ts`** — Zustand store with localStorage sync
  - State: `accessToken`, `refreshToken`, `user`, `isAuthenticated`, `isLoading`, `error`
  - Actions: `setTokens()`, `setUser()`, `logout()`, `hydrate()`
  - Helpers: `getAuthHeader()` for manual use

### Types
- **`src/types/auth.ts`** — TypeScript definitions
  - `AuthTokens`, `AuthUser`, `AuthState`
  - `LoginRequest`, `RegisterRequest`, `RefreshTokenRequest`

### Hooks
- **`src/hooks/useAuthInit.ts`** — Initialize auth on app load
  - Hydrates tokens from localStorage
  - Call this once in your root App component

### Test & Docs
- **`src/pages/ApiTestPage.tsx`** — Interactive test page
  - View current auth state
  - Test requests without auth (401)
  - Test requests with token
  - Check tokens in Zustand store
  - Manual logout

- **`TESTING_PHASE_2.md`** — Step-by-step testing guide
  - 9 different test scenarios
  - How to verify each piece works
  - Network tab inspection tips
  - Debugging guide

### Updated
- **`src/App.tsx`** — Now includes:
  - Router setup (React Router v6)
  - `useAuthInit()` hook call
  - Route to API test page
  - Link to test page on home

---

## How It Works (The Token Refresh Flow)

### Scenario 1: Request with Valid Token
```
1. Component: await apiClient.get('/api/simulations')
2. Request Interceptor: Adds { Authorization: 'Bearer {valid-token}' }
3. Server: 200 OK, returns data
4. Component: Receives data
```

### Scenario 2: Request with Expired Token
```
1. Component: await apiClient.get('/api/simulations')
2. Request Interceptor: Adds { Authorization: 'Bearer {expired-token}' }
3. Server: 401 Unauthorized
4. Response Interceptor: Triggers automatically
   a. Calls: POST /api/auth/refresh { refresh_token }
   b. Server: 200 OK, returns new tokens
   c. Stores new tokens in localStorage + Zustand
   d. Retries: GET /api/simulations with new token
5. Server: 200 OK, returns data
6. Component: Receives data (transparent to caller)
```

### Scenario 3: Refresh Token Expired
```
1. Component: await apiClient.get('/api/simulations')
2. Request Interceptor: Adds token
3. Server: 401 Unauthorized
4. Response Interceptor: Calls POST /api/auth/refresh
5. Server: 401 Unauthorized (refresh also expired)
6. Response Interceptor:
   a. Clears all tokens
   b. Redirects to /login
   c. Rejects promise
7. User: Must log in again
```

---

## Token Storage

Tokens are stored in **browser localStorage** with keys:
- `traceveil_access_token` — 15-minute lifetime
- `traceveil_refresh_token` — 7-day lifetime
- `traceveil_user` — User object (JSON)

**Persist across:**
- Page refresh ✅
- Browser close ✅
- New tab (same domain) ✅

**Clear on:**
- User logout ✅
- Token refresh fails ✅
- Manual `useAuthStore.getState().logout()` ✅

---

## API Usage Examples

### Make Authenticated Request
```typescript
import { apiClient } from './api/client'

async function fetchSimulations() {
  try {
    const response = await apiClient.get('/api/simulations')
    console.log(response.data)
  } catch (error) {
    console.error('Request failed:', error)
  }
}
```

### Update Auth State
```typescript
import { useAuthStore } from './store/authStore'

// After successful login
const { setTokens, setUser } = useAuthStore()

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
```

### Check Authentication Status
```typescript
const { isAuthenticated, user } = useAuthStore()

if (isAuthenticated) {
  console.log(`Logged in as: ${user?.email}`)
} else {
  console.log('Not authenticated')
}
```

### Logout
```typescript
const { logout } = useAuthStore()
logout()  // Clears tokens and redirects user
```

---

## Testing Quick Start

### 1. Run Frontend
```bash
cd frontend
npm run dev
```

### 2. Run Backend (separate terminal)
```bash
cd /path/to/backend
docker compose up
```

### 3. Visit Test Page
Navigate to: **http://localhost:5173/api-test**

### 4. Run Tests

Click these buttons in order:

1. **"Check Tokens in Store"** — Verify no tokens initially
2. **"Test GET /api/auth/me"** — Should get 401 (no token)
3. Set tokens manually in console:
   ```javascript
   localStorage.setItem('traceveil_access_token', 'test-token')
   ```
4. **"Check Tokens in Store"** again — Should now show token
5. **"Test GET /api/auth/me"** — Will either succeed or trigger refresh flow

See **TESTING_PHASE_2.md** for detailed explanations of each test.

---

## Key Files at a Glance

| File | Purpose | Key Exports |
|------|---------|-------------|
| `src/api/client.ts` | Axios setup + interceptors | `apiClient`, `replayClient`, `getAuthHeader()` |
| `src/store/authStore.ts` | Auth state management | `useAuthStore` (Zustand hook) |
| `src/types/auth.ts` | Type definitions | `AuthTokens`, `AuthUser`, `AuthState`, etc. |
| `src/hooks/useAuthInit.ts` | Auth initialization | `useAuthInit()` hook |
| `src/pages/ApiTestPage.tsx` | Testing interface | Component only |
| `src/App.tsx` | Root component | Calls `useAuthInit()`, sets up routes |

---

## Environment Variables

Located in `.env.local` (created in Phase 0):

```env
VITE_API_BASE=http://localhost:8000
VITE_REPLAY_BASE=http://localhost:8002
VITE_WS_BASE=ws://localhost:8001
```

The client reads these automatically via `import.meta.env.VITE_*`.

---

## Next Phase: Login + Register Pages

Phase 3 builds on this foundation:
1. Create Login page — calls `/api/auth/login`
2. Create Register page — calls `/api/auth/register`
3. Use auth store to save tokens
4. Protected routes for authenticated pages

Once tokens are stored via login, **all future requests automatically include them** (via the interceptor in `client.ts`).

---

## Troubleshooting

### "Cannot find module '@vitejs/plugin-react'"
```bash
npm install --save-dev @vitejs/plugin-react
```

### Frontend doesn't start
```bash
npm install
npm run dev
```

### API Test page shows 401 on all requests
This is **expected** if:
- You haven't logged in yet
- You haven't set a token manually
- The token is invalid

Set a token in DevTools Console:
```javascript
localStorage.setItem('traceveil_access_token', 'test-token')
```

### Token refresh not working
Check:
1. Backend is running (`docker compose up` in backend repo)
2. Network tab shows POST /api/auth/refresh request
3. Backend returns 200 with new tokens
4. localStorage is updated with new token

### "Redirected to /login" after test
This means refresh failed (token invalid). **This is expected** if you used a fake token.

To test real flow, use Prompt 3 to build login page and log in properly.

---

## Summary

✅ **What Works Now:**
- Automatic Authorization header injection
- 401 error handling with token refresh
- Token persistence across page refreshes
- Logout clears all tokens
- Two separate clients for different backends
- Type-safe token handling

✅ **What's Ready for Next Phase:**
- Auth store is ready to receive login/register results
- Clients are ready to handle all API calls
- Token refresh is transparent to components

✅ **Ready to Build:**
- Login page (POST /api/auth/login)
- Register page (POST /api/auth/register)
- Protected routes
- Dashboard page

---

## Commands to Remember

**Run everything:**
```bash
# Terminal 1
cd /path/to/backend && docker compose up

# Terminal 2
cd /path/to/frontend && npm run dev

# Browser
http://localhost:5173/api-test
```

**Install deps (if needed):**
```bash
npm install && npm install --save-dev @vitejs/plugin-react
```

**Test token refresh:**
```javascript
localStorage.setItem('traceveil_access_token', 'test-token')
// Then use API Test page
```

---

## Ready for Phase 3?

Once you've verified the tests pass (see TESTING_PHASE_2.md), send:

> **Prompt 3: Login + Register pages**

This will build the authentication UI that uses the client you just set up.
