import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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

/**
 * App instalable (PWA). El service worker guarda de entrada la app entera (HTML, JS, CSS, fuentes
 * e íconos): el motor y los bots corren en el navegador, así "Contra la compu" anda sin internet.
 * Con registerType 'prompt' nunca se recarga solo: la versión nueva espera a que la persona toque
 * "Actualizar" (componentes/Pwa.tsx), y eso se ofrece solo fuera de la partida.
 */
const pwa = VitePWA({
  registerType: 'prompt',
  // El registro lo hace src/registrarSW.ts, para manejar el aviso de versión nueva.
  injectRegister: false,
  manifest: {
    id: '/',
    name: 'Truco Uruguayo',
    short_name: 'Truco',
    description: 'Truco uruguayo con muestra, piezas y flor: contra la compu o con amigos.',
    lang: 'es',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    // El paño de la barra (el theme-color del index.html) y la madera del fondo (estilos.css).
    theme_color: '#1f5130',
    background_color: '#6b4226',
    categories: ['games'],
    icons: [
      { src: '/iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/iconos/icono-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  // Los PNG de los íconos los baja el sistema al instalar; la página no los usa (el favicon es el SVG).
  includeManifestIcons: false,
  workbox: {
    // Solo woff2 (todos los navegadores que tienen service worker lo leen; los .woff sobran).
    // Los efectos de sonido (public/sonidos, unos 50 KiB) van de entrada: sin red también suenan.
    globPatterns: ['**/*.{js,css,html,svg,woff2}', 'sonidos/*.ogg'],
    // La baraja clásica (1,5 MB) no se baja a todos: se guarda al elegirla (runtimeCaching).
    // Las voces, tampoco: cada pack se guarda la primera vez que suena.
    globIgnores: ['barajas/**', 'voces/**'],
    navigateFallback: 'index.html',
    // El servidor de juego (Colyseus) va por /juego: no se guarda nunca ni cae en el index.html.
    // Los websockets no pasan por el service worker, y los pedidos HTTP de /juego no tienen ruta.
    navigateFallbackDenylist: [/^\/juego/],
    cleanupOutdatedCaches: true,
    // La primera vez, el service worker toma la página enseguida (así ya guarda la baraja clásica).
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/barajas/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'barajas',
          expiration: { maxEntries: 100 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname.startsWith('/voces/'),
        handler: 'CacheFirst',
        options: {
          cacheName: 'voces',
          expiration: { maxEntries: 120 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
})

export default defineConfig({
  plugins: [react(), pwa],
  // Los links de los túneles de Cloudflare (pnpm compartir) cambian cada vez.
  server: { port: 5173, proxy, allowedHosts: ['.trycloudflare.com'] },
  preview: { proxy, allowedHosts: ['.trycloudflare.com'] },
  test: {
    // Los tests de Playwright (e2e/ y e2e-pwa/) se corren aparte con `pnpm e2e` y `pnpm e2e:pwa`.
    exclude: ['e2e/**', 'e2e-pwa/**', 'node_modules/**'],
    environment: 'jsdom',
  },
})
