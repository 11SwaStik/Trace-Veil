# TraceVeil Frontend - Setup Instructions

## Phase 0: Project Initialization Complete ✅

### Files Created/Modified

**Config Files:**
- ✅ `package.json` — All dependencies listed
- ✅ `tsconfig.json` — TypeScript configuration
- ✅ `tsconfig.node.json` — Vite TS config
- ✅ `vite.config.ts` — Vite configuration
- ✅ `tailwind.config.js` — Tailwind with dark theme colors
- ✅ `postcss.config.js` — PostCSS setup
- ✅ `.env.local` — Environment variables (API endpoints)
- ✅ `.gitignore` — Git ignore rules
- ✅ `index.html` — HTML entry point

**Source Files:**
- ✅ `src/main.tsx` — React entry point
- ✅ `src/App.tsx` — Root component (theme test page)
- ✅ `src/globals.css` — Tailwind directives + custom CSS

**Folder Structure:**
- ✅ `src/components/` — Reusable UI components
- ✅ `src/features/` — Feature-specific modules
- ✅ `src/hooks/` — Custom React hooks
- ✅ `src/store/` — Zustand stores
- ✅ `src/api/` — API clients
- ✅ `src/types/` — TypeScript types
- ✅ `src/utils/` — Utility functions

---

## Installation & Running

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

**One additional plugin needed:**
```bash
npm install --save-dev @vitejs/plugin-react
```

This is needed for the Vite React plugin (already referenced in `vite.config.ts`).

### Step 2: Make Sure Backend is Running

In another terminal:
```bash
cd /path/to/trace-veil-backend
docker compose up
```

**Expected services to be available:**
- REST API: `http://localhost:8000`
- WebSocket: `ws://localhost:8001`
- Replay Engine: `http://localhost:8002`

### Step 3: Start Frontend Dev Server

```bash
npm run dev
```

**Output should show:**
```
  VITE v5.0.8  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

### Step 4: Open in Browser

Navigate to: **http://localhost:5173**

---

## What You Should See

### Visual Test (Theme Verification)

You should see:

1. **Background Color**: Deep dark navy/black (`#0a0a0f`) — not pure black, slightly blue-tinted
2. **Text**: Light gray (`#e0e0e0`) — very readable on the dark background
3. **Title**: "TraceVeil" in white, large heading
4. **Subtitle**: "Cybersecurity Simulation Platform" in muted gray
5. **4 Color Swatches** showing status indicators:
   - Green circle (`#22c55e`) — CLEAN
   - Red circle (`#ef4444`) — COMPROMISED
   - Orange circle (`#f97316`) — ELEVATED
   - Purple circle (`#a855f7`) — EXFILTRATING
6. **Two Buttons**:
   - "Login" button (dark blue, top)
   - "Get Started" button (bright cyan, top)
7. **Footer text**: "Frontend initialized with dark theme • Ready for Phase 1"

### Color Palette Reference (Visible on Page)

| Element | Color | Hex | Visible As |
|---------|-------|-----|-----------|
| Background | Primary Dark | `#0a0a0f` | Page background |
| Text | Primary | `#e0e0e0` | Main text (title, labels) |
| Text | Secondary | `#888899` | Muted text (subtitle, "CLEAN", "COMPROMISED") |
| Status | Clean | `#22c55e` | Green circle |
| Status | Compromised | `#ef4444` | Red circle |
| Status | Elevated | `#f97316` | Orange circle |
| Status | Exfiltrating | `#a855f7` | Purple circle |
| Button | Primary | `#1e40af` | "Login" button |
| Button | Accent | `#00d9ff` | "Get Started" button (bright cyan) |

---

## Environment Variables

Located in `.env.local`:

```env
VITE_API_BASE=http://localhost:8000          # REST API
VITE_REPLAY_BASE=http://localhost:8002       # Replay engine
VITE_WS_BASE=ws://localhost:8001             # WebSocket gateway
```

These are read by the frontend to connect to backend services.

---

## Troubleshooting

### Issue: "Cannot find module '@vitejs/plugin-react'"
**Fix:** Run `npm install --save-dev @vitejs/plugin-react`

### Issue: Port 5173 already in use
**Fix:** Vite will automatically try 5174, 5175, etc. Or kill the process using port 5173:
```bash
lsof -i :5173  # Find process
kill -9 <PID>  # Kill it
```

### Issue: Browser shows white/different colors
**Fix:** 
1. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Clear browser cache
3. Check that `src/globals.css` is imported in `src/main.tsx`

### Issue: Tailwind classes not applying
**Fix:**
1. Verify `tailwind.config.js` includes `"./src/**/*.{js,ts,jsx,tsx}"`
2. Run `npm install` again
3. Restart dev server: `npm run dev`

---

## Next Steps

Once you confirm the page loads with the dark theme colors, send:

> **Prompt 2: Axios interceptor + token refresh logic**

This will set up the HTTP client layer for Phase 1 (Authentication).

---

## Quick Reference: Theme Colors

Copy-paste for reference in components:

```javascript
const colors = {
  bg: {
    primary: '#0a0a0f',
    secondary: '#131318',
    tertiary: '#1a1a20',
  },
  text: {
    primary: '#e0e0e0',
    secondary: '#888899',
    muted: '#595963',
  },
  status: {
    clean: '#22c55e',
    compromised: '#ef4444',
    elevated: '#f97316',
    exfiltrating: '#a855f7',
  },
  severity: {
    low: '#3b82f6',
    medium: '#eab308',
    high: '#f97316',
    critical: '#ef4444',
  },
  accent: '#00d9ff',
}
```

All of these are already configured in `tailwind.config.js` as Tailwind classes.
