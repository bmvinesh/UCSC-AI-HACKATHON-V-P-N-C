/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Environment files live at the repository root (.env, see .env.example).
// Only VITE_* values reach the bundle; APP_* values are read here for the dev proxy alone.
const ENV_DIR = '..'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, ['VITE_', 'APP_BIND_'])
  const apiTarget = `http://${env.APP_BIND_HOST || '127.0.0.1'}:${env.APP_BIND_PORT || '8000'}`

  return {
    envDir: ENV_DIR,
    base: env.VITE_BASE_PATH || '/',
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      // Keeps the local UI same-origin with the API during development.
      proxy: { '/api': apiTarget },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}', '../tests/frontend/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  }
})
