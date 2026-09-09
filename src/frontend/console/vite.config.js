import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The console is served under /console in production (Flask serves the built
// files); in dev Vite serves it at the root of :5173. `base` makes the asset
// URLs in the built index.html point at /console/assets/... instead of
// /assets/..., which is what stops a production build from 404-ing.
const BASE = process.env.VITE_BASE || '/'
const API_ORIGIN = process.env.VITE_API_ORIGIN || 'http://localhost:5000'

export default defineConfig({
  base: BASE,
  plugins: [react()],
  server: {
    port: 5173,
    // Same trick as the Next.js rewrite: forward /api to Flask so the browser
    // sees a same-origin request and sends the session cookie without any
    // CORS or third-party-cookie handling.
    proxy: {
      '/api': {
        target: API_ORIGIN,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
