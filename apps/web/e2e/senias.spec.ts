import type { Page } from '@playwright/test'
import { caja, cartasDeLaMano, crearSala, elegir, empezar, expect, persona, test, unirse } from './ayudantes'

/**
 * Señas en parejas, online: Ana y Beto son compañeros, Caro es rival (con un bot de
 * compañero). La sala se crea con "Los rivales pescan señas: Nunca", así que a Caro no le
 * tiene que llegar ninguna seña de Ana ni de Beto.
 */

/** El lugar de un jugador en la mesa de `page`, ubicado por su nombre (el menú de la persona). */
const asientoDe = (page: Page, apodo: string) =>
  page.locator('.asiento', { has: page.getByRole('button', { name: `Opciones para ${apodo}` }) })

/** Mantiene apretado con el dedo el centro de un elemento `ms` milisegundos y lo suelta. */
async function mantenerConDedo(page: Page, x: number, y: number, ms: number) {
  const cdp = await page.context().newCDPSession(page)
  const toque = [{ x, y, radiusX: 4, radiusY: 4, force: 1, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: toque })
  await page.waitForTimeout(ms)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

test('una seña le llega al compañero y no al rival', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')
  const beto = await persona(browser, 'Beto')
  const caro = await persona(browser, 'Caro')

  const codigo = await crearSala(ana, async (p) => {
    await elegir(p, 'Formato', /Parejas/)
    await p.getByText('Reglas de la mesa').click()
    await elegir(p, 'Los rivales pescan señas', 'Nunca')
  })
  await expect(ana.getByText('Los rivales no pescan señas')).toBeVisible()

  // Beto se sienta enfrente de Ana (su compañero); Caro queda en el otro equipo.
  await unirse(beto, codigo)
  await beto.getByRole('button', { name: 'Lugar libre 3: sentarme acá' }).click()
  await unirse(caro, codigo)
  const equipo1 = ana.getByRole('group', { name: 'Equipo 1' })
  const equipo2 = ana.getByRole('group', { name: 'Equipo 2' })
  await expect(equipo1.getByText('Beto')).toBeVisible()
  await expect(equipo2.getByText('Caro')).toBeVisible()

  await empezar(ana, [ana, beto, caro])

  // Ana le levanta las cejas desde la cara (2 de la muestra).
  await ana.getByRole('button', { name: 'Hacer una seña' }).click()
  await ana.getByRole('dialog', { name: 'Señas' }).getByRole('button', { name: 'Levantar las cejas (2 de la muestra)' }).click()
  await expect(ana.getByRole('status').filter({ hasText: 'Le hiciste la seña: levantar las cejas' })).toBeVisible()

  // Beto ve el gesto en el avatar de Ana, con lo que anuncia.
  const anaParaBeto = asientoDe(beto, 'Ana')
  await expect(anaParaBeto.locator('[data-gesto="pieza2"]').first()).toBeVisible()
  await expect(anaParaBeto.getByRole('status')).toContainText('2 de la muestra')
  // A Caro no le llega nada: ni el gesto ni el aviso de que hubo una seña.
  await caro.waitForTimeout(300)
  const anaParaCaro = asientoDe(caro, 'Ana')
  await expect(anaParaCaro).toBeVisible()
  await expect(anaParaCaro.locator('[data-gesto]')).toHaveCount(0)
  await expect(anaParaCaro.getByRole('status')).toHaveCount(0)

  // Beto contesta manteniendo apretada una carta (con el dedo): prueba sus cartas hasta
  // encontrar una que tenga seña. Así no se juega la carta.
  await beto.getByRole('button', { name: 'Ver todas' }).click()
  const cartas = cartasDeLaMano(beto)
  await expect(cartas).toHaveCount(3)
  let hizo = false
  for (let i = 0; i < 3 && !hizo; i++) {
    const c = await caja(cartas.nth(i))
    await mantenerConDedo(beto, c.x + c.width / 2, c.y + c.height / 2, 700)
    const hecha = beto.getByRole('status').filter({ hasText: 'Le hiciste la seña' })
    const sinSenia = beto.getByText('Esa carta no tiene seña')
    await expect(hecha.or(sinSenia).first()).toBeVisible()
    hizo = await hecha.isVisible()
    if (!hizo) await expect(sinSenia).toBeHidden()
  }
  await expect(cartas).toHaveCount(3)
  if (!hizo) {
    test.info().annotations.push({ type: 'nota', description: 'Ninguna carta de Beto tenía seña: no se probó mantener apretada' })
    return
  }
  await expect(asientoDe(ana, 'Beto').locator('[data-gesto]').first()).toBeVisible()
  await caro.waitForTimeout(300)
  await expect(asientoDe(caro, 'Beto').locator('[data-gesto]')).toHaveCount(0)
})
