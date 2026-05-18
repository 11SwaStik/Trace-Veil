# Phase 2 Testing Guide: Axios Interceptor + Token Refresh

## Overview

You've now implemented:
1. **axios clients** (`apiClient`, `replayClient`) with request/response interceptors
2. **Zustand auth store** (`useAuthStore`) for managing tokens and user state
3. **Token refresh logic** that automatically handles 401 errors
4. **localStorage persistence** so tokens survive page refreshes

This guide walks through testing all of this.

---

## Files Created

```
src/
├── api/
│   ├── client.ts         ← Axios instances + interceptors
│   └── README.md         ← API client documentation
├── store/
│   └── authStore.ts      ← Zustand store for auth state
├── types/
│   └── auth.ts           ← TypeScript types
├── hooks/
│   └── useAuthInit.ts    ← Hook to hydrate auth on app load
├── pages/
│   └── ApiTestPage.tsx   ← Test page for manual verification
└── App.tsx               ← Updated with router + test page link
```

---

## Step 1: Start Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
  VITE v5.0.8  ready in 123 ms
  ➜  Local:   http://localhost:5173/
```

Open: **http://localhost:5173**

You should see the home page with an "API Test" link at the bottom.

---

## Step 2: Verify Backend is Running

In another terminal:
```bash
cd /path/to/trace-veil-backend
docker compose up
```

Wait for all services to be ready:
```
postgres_1      | LOG:  database system is ready to accept connections
redis_1         | Ready to accept connections
simulation_1    | Application startup complete
api_1           | Uvicorn running on 0.0.0.0:8000
websocket_1     | Uvicorn running on 0.0.0.0:8001
replay_1        | Uvicorn running on 0.0.0.0:8002
```

---

## Step 3: Visit API Test Page

Click the "API Test" link at the bottom of the homepage, or navigate directly to:

```
http://localhost:5173/api-test
```

You should see a dark page with:
- **Auth Status** section (showing current tokens)
- **Tests** section with 4 buttons
- **Instructions** at the bottom

---

## Test 1: Check Tokens (No Auth)

### Action
Click **"Check Tokens in Store"** button.

### Expected Result
In the "Token Info" box, you should see:

```json
{
  "isAuthenticated": false,
  "hasAccessToken": false,
  "hasRefreshToken": false,
  "userEmail": "N/A",
  "accessTokenLength": 0,
  "refreshTokenLength": 0
}
```

### Verify in Browser
Open DevTools → Application → localStorage

You should see:
- `traceveil_access_token` — **NOT present**
- `traceveil_refresh_token` — **NOT present**
- `traceveil_user` — **NOT present**

---

## Test 2: Test Request Without Token (401 Expected)

### Action
Click **"Test GET /api/auth/me"** button.

### Expected Result
In the "Response" box, you should see:

```json
401 Unauthorized
```

(Or similar error message)

### Verify in Browser
Open DevTools → Network tab

Look for the request:
- **URL:** `http://localhost:8000/api/auth/me`
- **Method:** GET
- **Status:** `401`
- **Headers → Authorization:** Should NOT be present (no token yet)
- **Response:** `{"detail": "Unauthorized"}` or similar

---

## Test 3: Manual Token Test (Interceptor Verification)

This test verifies the **request interceptor** adds the Authorization header.

### Action

1. Open DevTools → Console (bottom of browser)
2. Paste this command:

```javascript
localStorage.setItem('traceveil_access_token', 'test-token-12345')
localStorage.setItem('traceveil_refresh_token', 'test-refresh-token-12345')
```

3. Press Enter
4. Back on the test page, click **"Check Tokens in Store"**

### Expected Result in Token Info
```json
{
  "isAuthenticated": true,
  "hasAccessToken": true,
  "hasRefreshToken": true,
  "userEmail": "N/A",
  "accessTokenLength": 16,
  "refreshTokenLength": 21
}
```

### Verify in Browser
DevTools → Application → localStorage

You should see all three keys present:
- `traceveil_access_token: test-token-12345`
- `traceveil_refresh_token: test-refresh-token-12345`

---

## Test 4: Request WITH Token (Interceptor Working)

### Action

After setting tokens manually (Test 3), click **"Test GET /api/auth/me"** again.

### Expected Result

In the Response box, you should see one of:

**A) Token is valid** → 200 OK with user data:
```json
{
  "id": "...",
  "email": "...",
  "created_at": "..."
}
```

**B) Token is invalid** → 401 (will trigger refresh flow, see next test)

### Verify in Network Tab

Look for the request:
- **URL:** `http://localhost:8000/api/auth/me`
- **Method:** GET
- **Status:** `200` (if token valid) or `401` (if token invalid)
- **Headers → Authorization:** `Bearer test-token-12345` ✅

**This confirms the request interceptor is adding the Authorization header!**

---

## Test 5: Token Refresh Flow (401 → Refresh → Retry)

This test verifies the **response interceptor** handles 401 and refreshes the token.

### Action

1. Set an EXPIRED token (will cause 401):

```javascript
localStorage.setItem('traceveil_access_token', 'expired-token-xyz')
localStorage.setItem('traceveil_refresh_token', 'refresh-token-xyz')
```

2. Open DevTools → Network tab
3. Click **"Test GET /api/simulations"** button
4. Watch the Network tab closely

### Expected Network Flow

You should see THREE requests in sequence:

**Request 1:** `GET /api/simulations`
- Headers: `Authorization: Bearer expired-token-xyz`
- Status: `401 Unauthorized`

**Request 2:** `POST /api/auth/refresh`
- Body: `{ "refresh_token": "refresh-token-xyz" }`
- Status: `401 Unauthorized` (refresh token also invalid)
- **This is expected** — we set fake tokens

**Request 3:** May not appear (if refresh failed)

### What This Shows

The response interceptor:
1. Caught the 401 from Request 1 ✅
2. Automatically called POST /api/auth/refresh ✅
3. Handled the failure (refresh also 401) ✅
4. Should have redirected to /login or logged out

---

## Test 6: Real Login Flow (If You Have Test Account)

If the backend has a test account or you created one:

### Action

1. Open DevTools → Console
2. Paste:

```javascript
import { apiClient } from './src/api/client.ts'

const response = await apiClient.post('/api/auth/login', {
  email: 'test@example.com',
  password: 'password123'
})

console.log(response.data)
```

3. Check localStorage — tokens should now be there

### Expected Result

Console should show:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLC...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLC...",
  "token_type": "bearer"
}
```

localStorage should contain:
- `traceveil_access_token: eyJ0eXAi...`
- `traceveil_refresh_token: eyJ0eXAi...`

---

## Test 7: Logout (Token Clearing)

### Action

Click **"Logout"** button on test page.

### Expected Result

In Token Info box:
```
Logged out. Check localStorage — tokens should be cleared.
```

### Verify in Browser

DevTools → Application → localStorage

All three keys should be **gone**:
- `traceveil_access_token` — ❌ NOT present
- `traceveil_refresh_token` — ❌ NOT present
- `traceveil_user` — ❌ NOT present

---

## Test 8: Page Refresh (localStorage Persistence)

This test verifies tokens survive page refresh (hydration).

### Action

1. Set tokens manually:

```javascript
localStorage.setItem('traceveil_access_token', 'test-token-abc')
localStorage.setItem('traceveil_refresh_token', 'test-refresh-abc')
```

2. Refresh page: `Cmd+R` (Mac) or `Ctrl+R` (Windows)
3. Click "API Test" link
4. Click "Check Tokens in Store"

### Expected Result

Token Info should show:
```json
{
  "isAuthenticated": true,
  "hasAccessToken": true,
  "hasRefreshToken": true,
  ...
}
```

**This confirms the `useAuthInit()` hook hydrated tokens from localStorage on app load!**

---

## Test 9: Interceptor Error Handling

This test verifies error handling if the backend is down.

### Action

1. Stop backend: Kill `docker compose up` in the backend terminal (Ctrl+C)
2. Set a valid token:

```javascript
localStorage.setItem('traceveil_access_token', 'some-token')
```

3. Click "Test GET /api/auth/me"

### Expected Result

Response box should show an error:

```
Error: Network Error
```

or

```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**This confirms the client handles network errors gracefully.**

---

## Debugging Tips

### 1. View All Requests

Open DevTools → Network tab and filter by:
- Type: `fetch` or `XHR`
- This shows all axios requests

### 2. View Request/Response Headers

Click any request in Network tab:
- **Headers** tab: See Authorization header
- **Response** tab: See the JSON response

### 3. View localStorage

DevTools → Application → Storage → Local Storage → http://localhost:5173

Shows all persisted tokens.

### 4. View Console Logs

When token refresh fails, the client logs to console:

```
Token refresh failed: ...error message...
```

Check DevTools → Console for error details.

### 5. Test with Invalid Token

Set a clearly invalid token and watch the 401 flow:

```javascript
localStorage.setItem('traceveil_access_token', 'invalid')
```

Then make a request and watch Network tab.

---

## Common Issues & Fixes

### Issue: "Cannot find module" errors

**Fix:** Make sure you've run:
```bash
npm install --save-dev @vitejs/plugin-react
```

### Issue: Tokens don't persist after refresh

**Fix:** Check that `useAuthInit()` is being called in App.tsx on mount. Verify in DevTools that localStorage has the keys.

### Issue: Authorization header not appearing

**Fix:** 
1. Verify token is set: check localStorage
2. Check Network tab → Request Headers
3. The header should say: `Authorization: Bearer {token}`

### Issue: Token refresh never triggers

**Fix:**
1. Set token to an invalid value so it causes 401
2. Watch Network tab for the POST /api/auth/refresh request
3. If it doesn't appear, refresh the page and try again

### Issue: "Unauthorized" error persists

**Fix:** This is expected if you're using fake tokens. To test a real flow:
1. Use Prompt 3 (Login page) to create real credentials
2. Login properly
3. Then test the interceptor with real tokens

---

## Summary Checklist

- [ ] Frontend runs on http://localhost:5173
- [ ] API Test page loads without errors
- [ ] Test 1: Token check shows empty state initially
- [ ] Test 2: /api/auth/me returns 401 without token
- [ ] Test 3: Can manually set tokens and see them in store
- [ ] Test 4: Interceptor adds Authorization header to requests
- [ ] Test 5: Response interceptor attempts refresh on 401
- [ ] Test 7: Logout clears all tokens
- [ ] Test 8: Tokens persist after page refresh (hydration works)
- [ ] Test 9: Network errors are handled gracefully
- [ ] Network tab shows all requests with proper headers

---

## Next Steps

Once all tests pass:

1. **Clean up test tokens** — Don't leave fake tokens in localStorage
2. **Check the console** for any warnings or errors
3. **Send Prompt 3** to build the Login + Register pages

From there, you'll have a complete auth flow:
1. User registers/logs in
2. Tokens stored via `setTokens()`
3. All future requests automatically include Authorization header
4. 401s automatically trigger refresh

---

## Code References

**Main Files:**
- Axios client: `src/api/client.ts`
- Auth store: `src/store/authStore.ts`
- Test page: `src/pages/ApiTestPage.tsx`

**Key Functions:**
- `apiClient.get(url)` — GET request with auth
- `apiClient.post(url, data)` — POST request with auth
- `useAuthStore()` — Access/update auth state
- `useAuthInit()` — Initialize auth on app load

---

## Questions?

If tests fail or something doesn't work:
1. Check the console for error messages
2. Open Network tab and look at requests/responses
3. Verify backend is actually running
4. Try the manual localStorage test first (Test 3)

Once confident, move to **Prompt 3: Login + Register Pages**.
