import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de la app instalable: el service worker existe solo en la versión compilada, así que
 * se compila y se sirve con `vite preview` (sin servidor de juego: se prueba sin conexión).
 * Correr con `pnpm --filter @truco/web e2e:pwa`. Los de juego online están en playwright.config.ts.
 */
const PUERTO_WEB = 5330

export default defineConfig({
  testDir: 'e2e-pwa',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PUERTO_WEB}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    // En una carpeta aparte, para no pisar dist/ si a la vez corre `pnpm build`.
    command: `npx vite build --outDir dist-pwa --emptyOutDir && npx vite preview --outDir dist-pwa --port ${PUERTO_WEB} --strictPort`,
    port: PUERTO_WEB,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
