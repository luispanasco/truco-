import { defineConfig, devices } from '@playwright/test'

/**
 * Tests de punta a punta: levantan el servidor de juego y la web, y manejan
 * navegadores de verdad en tamaño celular. Correr con `pnpm --filter @truco/web e2e`.
 */
const PUERTO_SERVIDOR = 2595
const PUERTO_WEB = 5320

export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    ...devices['Pixel 7'],
    baseURL: `http://localhost:${PUERTO_WEB}`,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `node ../server/node_modules/tsx/dist/cli.mjs ../server/src/index.ts`,
      port: PUERTO_SERVIDOR,
      env: { PORT: String(PUERTO_SERVIDOR), TRUCO_BOT_MS: '0', TRUCO_TURNO_MS: '60000' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npx vite --port ${PUERTO_WEB} --strictPort`,
      port: PUERTO_WEB,
      // Sin VITE_SERVIDOR: la web llega al servidor por /juego, como con pnpm compartir.
      env: { PUERTO_SERVIDOR: String(PUERTO_SERVIDOR) },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
