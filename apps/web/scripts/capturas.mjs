/**
 * Capturas de pantalla en tamaño celular (390x844) de inicio y mesa en 1v1, 2v2 y 3v3.
 * Uso, con la web levantada (pnpm --filter @truco/web dev):
 *   node scripts/capturas.mjs [carpeta] [url]
 */
import { chromium } from '@playwright/test'
const dir = process.argv[2] ?? 'capturas'
const url = process.argv[3] ?? 'http://localhost:5173'
import { mkdirSync } from 'node:fs'
mkdirSync(dir, { recursive: true })
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
p.on('console', (m) => { if (m.type() === 'error') console.log('consola:', m.text()) })
await p.goto(url + '/')
await p.fill('input', 'Luis')
await p.screenshot({ path: dir + '/1-inicio.png' })
for (const [formato, etiqueta] of [['1 contra 1', '1v1'], ['2 contra 2', '2v2'], ['3 contra 3', '3v3']]) {
  await p.goto(url + '/')
  await p.fill('input', 'Luis')
  await p.click('text=' + formato)
  await p.click('text=Jugar contra bots')
  await p.waitForSelector('.mi-mano .carta')
  // Juega un par de veces para que haya cartas en la mesa.
  for (let i = 0; i < 12; i++) {
    const jugable = await p.$('.mi-mano .carta-jugable:not([disabled])')
    if (jugable) { await jugable.click(); await p.waitForTimeout(1600) } else await p.waitForTimeout(900)
    if (i === 1) await p.screenshot({ path: dir + '/2-mesa-' + etiqueta + '-a.png' })
  }
  await p.screenshot({ path: dir + '/2-mesa-' + etiqueta + '-b.png' })
}
await nav.close()
console.log('listo')
