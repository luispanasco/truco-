/**
 * Capturas de pantalla (por defecto tamaño celular, 390x844): inicio, y la mesa en 1v1, 2v2
 * y 3v3 con cartas en juego y durante la pausa de fin de mano.
 * Uso, con la web levantada (pnpm web):
 *   node scripts/capturas.mjs [carpeta] [url] [ancho x alto]
 * Por ejemplo `node scripts/capturas.mjs capturas http://localhost:5173 1280x800` para escritorio.
 */
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const dir = process.argv[2] ?? 'capturas'
const url = process.argv[3] ?? 'http://localhost:5173'
const [ancho, alto] = (process.argv[4] ?? '390x844').split('x').map(Number)
const celular = ancho < 700
mkdirSync(dir, { recursive: true })

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: celular ? 2 : 1, isMobile: celular, hasTouch: celular })
const p = await ctx.newPage()
p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
p.on('console', (m) => {
  if (m.type() === 'error') console.log('consola:', m.text())
})

await p.goto(url + '/')
await p.fill('input', 'Luis')
await p.screenshot({ path: `${dir}/1-inicio.png` })

for (const [formato, etiqueta] of [
  ['1 vs 1', '1v1'],
  ['2 vs 2', '2v2'],
  ['3 vs 3', '3v3'],
]) {
  await p.goto(url + '/')
  await p.fill('input', 'Luis')
  await p.click('text=' + formato)
  await p.click('button:text-is("Jugar")')
  await p.waitForSelector('.mi-mano .carta')
  await p.screenshot({ path: `${dir}/2-${etiqueta}-inicio.png` })
  let jugadas = 0
  let finCapturado = false
  let conCartas = false
  const hasta = Date.now() + 45_000
  while (Date.now() < hasta && !(finCapturado && conCartas)) {
    if (!finCapturado && (await p.$('.fin-de-mano'))) {
      await p.screenshot({ path: `${dir}/3-${etiqueta}-fin-de-mano.png` })
      finCapturado = true
    }
    if (!conCartas && (await p.$$('.centro .jugada')).length >= Math.min(3, Number(etiqueta[0]) * 2 - 1)) {
      await p.screenshot({ path: `${dir}/2-${etiqueta}-con-cartas.png` })
      conCartas = true
    }
    const jugable = await p.$('.mi-mano .carta-jugable:not([disabled])')
    // Juega sin cantar nada; si le cantan, quiere; si tiene flor, la canta.
    const boton = (await p.$('.boton-accion:text-is("Flor")')) ?? (await p.$('.boton-accion:text-is("Quiero")')) ?? (await p.$('.boton-accion:text-matches("^Decir mi tanto|^Son buenas")'))
    if (boton) {
      await boton.click()
    } else if (jugable) {
      await jugable.click()
      jugadas++
    }
    await p.waitForTimeout(250)
  }
  console.log(etiqueta, { jugadas, finCapturado, conCartas })
}
await nav.close()
