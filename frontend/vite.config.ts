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
  define: {
    "import.meta.env.OTEL_EXPORTER_OTLP_ENDPOINT": JSON.stringify(
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "",
    ),
    "import.meta.env.OTEL_EXPORTER_OTLP_HEADERS": JSON.stringify(
      process.env.OTEL_EXPORTER_OTLP_HEADERS ?? "",
    ),
    "import.meta.env.OTEL_RESOURCE_ATTRIBUTES": JSON.stringify(
      process.env.OTEL_RESOURCE_ATTRIBUTES ?? "",
    ),
    "import.meta.env.OTEL_SERVICE_NAME": JSON.stringify(
      process.env.OTEL_SERVICE_NAME ?? "",
    ),
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
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
