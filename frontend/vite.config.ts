import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const apiProxyTarget =
  process.env.API_HTTPS?.split(';')[0] ??
  process.env.API_HTTP?.split(';')[0] ??
  'https://localhost:7095'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: apiProxyTarget,
        secure: false,
      },
      '/hubs': {
        target: apiProxyTarget,
        ws: true,
        secure: false,
      },
    },
  },
})
