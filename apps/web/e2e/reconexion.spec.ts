import type { Page } from '@playwright/test'
import { cartasDeLaMano, crearSala, elegir, empezar, expect, jugarSiLeToca, persona, test, unirse } from './ayudantes'

/**
 * Recargar en medio de una partida online: la persona vuelve desde el inicio con "Volver
 * a la partida" y encuentra la misma mano (mismo número de mano y las mismas cartas).
 */

/** Las cartas de la mano, por nombre y ordenadas. */
const nombresDeLaMano = async (page: Page) =>
  (await cartasDeLaMano(page).evaluateAll((cs) => cs.map((c) => c.getAttribute('aria-label') ?? ''))).sort()
/** "Mano 3": el número de mano del marcador. */
const numeroDeMano = (page: Page) => page.getByRole('banner').getByText(/^Mano \d+$/)

test('recargar en medio de la partida y volver con la misma mano', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')
  const beto = await persona(browser, 'Beto')

  const codigo = await crearSala(ana, (p) => elegir(p, 'Formato', /Mano a mano/))
  await unirse(beto, codigo)
  await empezar(ana, [ana, beto])

  // Juegan hasta que Beto ya tiró alguna carta de esta mano y le toca a Ana (con su reloj).
  // Ana no juega mientras Beto no está: así nadie (ni el bot que lo reemplaza) toca su mano.
  const listo = async () => {
    const n = await cartasDeLaMano(beto).count()
    return n > 0 && n < 3 && (await ana.getByRole('timer').isVisible())
  }
  for (let i = 0; i < 200 && !(await listo()); i++) {
    let alguna = false
    for (const p of [ana, beto]) if (await jugarSiLeToca(p)) alguna = true
    if (!alguna) await ana.waitForTimeout(150)
  }
  expect(await listo()).toBe(true)
  const mano = await numeroDeMano(beto).textContent()
  const cartas = await nombresDeLaMano(beto)

  // Beto recarga: la mesa no se puede armar sin conexión y vuelve al inicio.
  await beto.reload()
  await expect(beto).toHaveURL(/\/$/)
  // Mientras no está, Ana lo ve desconectado (juega un bot por él si le toca).
  await expect(ana.getByText('juega un bot')).toBeVisible()
  await beto.getByRole('button', { name: 'Volver a la partida' }).click()
  await expect(beto).toHaveURL(/\/mesa$/)
  await expect(beto.getByLabel('Mazo y muestra')).toBeVisible()
  await expect(numeroDeMano(beto)).toHaveText(mano!)
  await expect.poll(() => nombresDeLaMano(beto)).toEqual(cartas)

  // Ana ve que Beto volvió, y la partida sigue: Beto vuelve a jugar él (no el bot).
  await expect(ana.getByText('juega un bot')).toBeHidden()
  let betoJugo = false
  for (let i = 0; i < 100 && !betoJugo; i++) {
    betoJugo = await jugarSiLeToca(beto)
    if (!betoJugo && !(await jugarSiLeToca(ana))) await ana.waitForTimeout(150)
  }
  expect(betoJugo).toBe(true)
})
