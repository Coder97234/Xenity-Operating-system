import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Sandbox preview (BASE44_PREVIEW_MODE=1) serves the dev server through a proxy on
// a rotating hostname, so host checks and HMR need the preview origin. Unset, the
// config keeps Vite's normal localhost-only behaviour.
const preview = process.env.BASE44_PREVIEW_MODE === '1'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: preview ? true : undefined,
    watch: { usePolling: preview },
    hmr: preview ? { clientPort: 443 } : undefined,
  },
})
