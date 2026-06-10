import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'DramaLog',
        short_name: 'DramaLog',
        description: 'Your personal K-drama tracker and ratings app',
        theme_color: '#667eea',
        background_color: '#ffffff',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        icons: [
          {
            src: 'https://via.placeholder.com/192x192?text=DramaLog',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'https://via.placeholder.com/512x512?text=DramaLog',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: 'https://via.placeholder.com/540x720?text=DramaLog',
            sizes: '540x720',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ]
      },
      workbox: {
        // Do not cache Supabase API calls here. Only TMDB data and images are cached.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.themoviedb\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 1 week
              }
            }
          },
          {
            urlPattern: /^https:\/\/image\.tmdb\.org\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 1 month
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173
  }
})
