import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Dev-сервер проксирует /api на локальный бэкенд, поэтому в разработке фронт
  // ходит теми же относительными путями, что и в проде. Иначе пришлось бы
  // держать VITE_API_URL и получить два разных способа обращения к API —
  // и, как следствие, класс багов, которые видно только в одном из окружений.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: false,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Keep the existing public/manifest.json + <link rel="manifest"> in index.html.
      manifest: false,
      includeAssets: ['pic.png', 'manifest.json'],
      workbox: {
        // Precache the app shell + self-hosted fonts → instant cold launch, offline shell.
        globPatterns: ['**/*.{js,css,html,woff2,woff,png,svg}'],
        navigateFallback: '/index.html',
        // API теперь на том же origin, поэтому исключение стало обязательным:
        // без него navigateFallback отдавал бы index.html в ответ на /api/*.
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
