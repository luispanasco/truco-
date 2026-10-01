/**
 * Capturas de los globitos de chat en la mesa online: Ana, Beto y Caro (cada una en su
 * navegador) se sientan en una sala con bots, escriben y Ana saca la foto. Una por formato
 * (1v1, 2v2 y 3v3), más una con canto y chat a la vez.
 * Uso, con el servidor de juego y la web levantados (pnpm dev):
 *   node scripts/capturas-chat.mjs [carpeta] [url] [ancho x alto]
 */
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const dir = process.argv[2] ?? 'capturas'
const url = process.argv[3] ?? 'http://localhost:5173'
const [ancho, alto] = (process.argv[4] ?? '390x844').split('x').map(Number)
mkdirSync(dir, { recursive: true })

const nav = await chromium.launch()

async function persona(apodo) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log(`ERROR EN PÁGINA (${apodo}):`, e.message))
  await p.goto(url + '/')
  await p.getByPlaceholder('¿Cómo te dicen?').fill(apodo)
  return p
}

async function decir(p, texto) {
  await p.getByRole('button', { name: /^Chat/ }).click()
  await p.getByLabel('Mensaje').fill(texto)
  await p.keyboard.press('Enter')
  await p.keyboard.press('Escape')
}

for (const [formato, etiqueta, lugares] of [
  ['1 vs 1', '1v1', []],
  ['2 vs 2', '2v2', [null, 2]],
  ['3 vs 3', '3v3', [null, 3]],
]) {
  const ana = await persona('Ana')
  await ana.getByText('Crear sala').first().click()
  await ana.getByText(formato).first().click()
  await ana.getByRole('button', { name: 'Crear sala' }).click()
  await ana.waitForURL(/\/sala$/)
  const codigo = (await ana.locator('.codigo-sala').innerText()).replace(/\s/g, '')

  // Beto (y Caro, en equipos) entran con el código; Caro se sienta enfrente de Ana.
  const otros = []
  for (const [i, apodo] of ['Beto', 'Caro'].slice(0, etiqueta === '1v1' ? 1 : 2).entries()) {
    const p = await persona(apodo)
    await p.getByText('Unirme con código').first().click()
    await p.getByPlaceholder('ABC23').fill(codigo)
    await p.getByRole('button', { name: 'Entrar' }).click()
    await p.waitForURL(/\/sala$/)
    const asiento = lugares[i]
    const libre = asiento == null ? null : p.getByLabel(`Lugar libre ${asiento + 1}: sentarme acá`)
    if (libre && (await libre.isVisible().catch(() => false))) await libre.click()
    otros.push(p)
  }
  await ana.waitForTimeout(500)
  await ana.getByRole('button', { name: 'Empezar' }).click()
  await ana.waitForURL(/\/mesa$/)
  await ana.getByLabel('Mazo y muestra').waitFor()

  const [beto, caro] = otros
  await decir(beto, 'Buena mano')
  if (caro) await decir(caro, 'Che, ¿tenés algo para el envido? Yo vengo bastante bien, jugá tranquila que te banco')
  await decir(ana, '¡Vamos arriba!')
  await ana.waitForTimeout(700)
  await ana.screenshot({ path: `${dir}/chat-${etiqueta}.png` })

  // Canto y chat a la vez: quien pueda cantar truco, lo canta y enseguida escribe.
  for (const p of [ana, ...otros]) {
    const truco = p.getByRole('button', { name: /^Truco/ }).first()
    if (await truco.isVisible().catch(() => false)) {
      await truco.click().catch(() => {})
      await decir(p, 'Esta la ganamos')
      await ana.waitForTimeout(500)
      await ana.screenshot({ path: `${dir}/chat-${etiqueta}-con-canto.png` })
      break
    }
  }
  // Se van solos.
  await ana.waitForTimeout(8500)
  await ana.screenshot({ path: `${dir}/chat-${etiqueta}-despues.png` })
  for (const p of [ana, ...otros]) await p.context().close()
  console.log(etiqueta, 'listo')
}
await nav.close()
