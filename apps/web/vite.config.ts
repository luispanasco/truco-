import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * El servidor de juego (puerto 2567) se alcanza por la misma dirección de la página,
 * bajo /juego. Así alcanza con un solo puerto: anda por la red de casa y por un túnel
 * (`pnpm compartir`), y con https queda todo seguro sin configurar nada más.
 */
const proxy = {
  '/juego': {
    target: `http://localhost:${process.env.PUERTO_SERVIDOR ?? 2567}`,
    ws: true,
    rewrite: (ruta: string) => ruta.replace(/^\/juego/, ''),
  },
}

export default defineConfig({
  plugins: [react()],
  // Los links de los túneles de Cloudflare (pnpm compartir) cambian cada vez.
  server: { port: 5173, proxy, allowedHosts: ['.trycloudflare.com'] },
  preview: { proxy, allowedHosts: ['.trycloudflare.com'] },
  test: {
    // Los tests de Playwright (e2e/) se corren aparte con `pnpm e2e`.
    exclude: ['e2e/**', 'node_modules/**'],
    environment: 'jsdom',
  },
})
