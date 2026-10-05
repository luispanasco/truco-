/**
 * Íconos de la PWA a partir de public/icono.svg, rasterizados con el Chromium de Playwright
 * (ya instalado para los tests, así no hace falta otra dependencia). Uso, desde apps/web:
 *   node scripts/iconos.mjs
 * Deja en public/iconos/ los PNG que nombra el manifiesto (vite.config.ts) y el apple-touch-icon.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const web = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(web, 'public/icono.svg'), 'utf8')
const destino = join(web, 'public/iconos')
mkdirSync(destino, { recursive: true })

/*
 * "A sangre": el paño ocupa todo el cuadrado y no hay marco de madera. Es lo que piden los
 * íconos maskable (el sistema recorta la forma) y el de iOS (que redondea las esquinas solo y
 * no admite transparencia).
 */
const A_SANGRE = '#madera { display: none } #pano { x: 0; y: 0; width: 512px; height: 512px; rx: 0 }'

const ICONOS = [
  { archivo: 'icono-192.png', tam: 192 },
  { archivo: 'icono-512.png', tam: 512 },
  { archivo: 'icono-maskable-512.png', tam: 512, estilo: A_SANGRE },
  { archivo: 'apple-touch-icon.png', tam: 180, estilo: A_SANGRE },
]

const nav = await chromium.launch()
const pagina = await nav.newPage()
for (const { archivo, tam, estilo = '' } of ICONOS) {
  await pagina.setViewportSize({ width: tam, height: tam })
  await pagina.setContent(
    `<style>html, body { margin: 0; background: transparent } svg { display: block; width: ${tam}px; height: ${tam}px } ${estilo}</style>${svg}`,
  )
  await pagina.screenshot({ path: join(destino, archivo), omitBackground: true })
  console.log(`public/iconos/${archivo} (${tam} × ${tam})`)
}
await nav.close()
