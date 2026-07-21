import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
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
        // The API lives on a different origin (:8081); never let the SW touch it.
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
})
