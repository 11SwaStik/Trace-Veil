/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base dark theme
        bg: {
          primary: '#0a0a0f',    // main background
          secondary: '#131318',  // cards, panels
          tertiary: '#1a1a20',   // hover states
        },
        border: '#262630',       // subtle dividers
        text: {
          primary: '#e0e0e0',    // main text
          secondary: '#888899',  // muted text
          muted: '#595963',      // very muted
        },

        // Status colors (node states)
        status: {
          clean: '#22c55e',         // emerald-500
          compromised: '#ef4444',   // red-500
          elevated: '#f97316',      // orange-500
          exfiltrating: '#a855f7',  // purple-500
        },

        // Severity colors (alerts, events)
        severity: {
          low: '#3b82f6',      // blue-500
          medium: '#eab308',   // yellow-500
          high: '#f97316',     // orange-500
          critical: '#ef4444', // red-500
        },

        // Accent
        accent: '#00d9ff',   // cyan for highlights, glow
      },
      backgroundColor: {
        base: '#0a0a0f',
        surface: '#131318',
      },
      borderColor: {
        subtle: '#262630',
      },
      textColor: {
        base: '#e0e0e0',
        muted: '#888899',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.3)',
        'base': '0 4px 12px rgba(0, 0, 0, 0.5)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.6)',
      },
      dropShadow: {
        'glow-sm': '0 0 8px rgba(0, 217, 255, 0.6)',
        'glow': '0 0 16px rgba(0, 217, 255, 0.8)',
        'glow-lg': '0 0 24px rgba(0, 217, 255, 0.9)',
        'red-glow': '0 0 16px rgba(239, 68, 68, 0.8)',
        'orange-glow': '0 0 16px rgba(249, 115, 22, 0.8)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
