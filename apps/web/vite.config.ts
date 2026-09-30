import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  test: {
    // Los tests de Playwright (e2e/) se corren aparte con `pnpm e2e`.
    exclude: ['e2e/**', 'node_modules/**'],
    environment: 'jsdom',
  },
})
