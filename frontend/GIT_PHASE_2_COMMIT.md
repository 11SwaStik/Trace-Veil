# Phase 2: Git Commit Instructions

## Files to Stage

When you're ready to commit Phase 2 (Axios + Token Refresh), stage these files:

```bash
git add \
  src/api/client.ts \
  src/api/README.md \
  src/store/authStore.ts \
  src/types/auth.ts \
  src/hooks/useAuthInit.ts \
  src/pages/ApiTestPage.tsx \
  src/App.tsx \
  PHASE_2_SUMMARY.md \
  TESTING_PHASE_2.md \
  GIT_PHASE_2_COMMIT.md
```

Or one command:

```bash
git add src/api/ src/store/authStore.ts src/types/auth.ts src/hooks/useAuthInit.ts src/pages/ApiTestPage.tsx src/App.tsx PHASE_2_SUMMARY.md TESTING_PHASE_2.md GIT_PHASE_2_COMMIT.md
```

## Commit Message

```bash
git commit -m "Add axios HTTP client with token refresh interceptor

- Create apiClient and replayClient instances with automatic token refresh
- Implement response interceptor to handle 401 errors and refresh tokens
- Add request interceptor to include Authorization header automatically
- Create Zustand auth store with localStorage persistence
- Add auth state hydration on app load
- Include ApiTestPage for manual verification of token refresh flow
- Add comprehensive testing and documentation guides

HTTP clients now automatically:
- Inject Authorization: Bearer {token} on all requests
- Detect 401 responses and refresh tokens
- Retry failed requests with new tokens
- Clear tokens on refresh failure and redirect to login"
```

## Verify Before Committing

Check that these exist:

```bash
ls -la src/api/client.ts
ls -la src/api/README.md
ls -la src/store/authStore.ts
ls -la src/types/auth.ts
ls -la src/hooks/useAuthInit.ts
ls -la src/pages/ApiTestPage.tsx
```

All should say "100%" or exist.

## After Committing

```bash
git log --oneline -1
# Should show your commit message
```

Then you're ready for Phase 3: Login + Register Pages!
