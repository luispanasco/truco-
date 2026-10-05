import type { Locator, Page } from '@playwright/test'
import { arrastrarConDedo, caja, cartasDeLaMano, expect, persona, test } from './ayudantes'

/**
 * Ojeo y arrastre con el dedo en el celular (Pixel 7, pantalla táctil), contra la compu.
 * Las zonas vienen de src/ojeo.ts (baraja propia): para ojear una carta tiene que asomar su
 * franja de cortes y número, el 30 % de arriba del alto. Jugar arrastrando pide subirla
 * más de 60 px (UMBRAL_JUGAR_PX en ManoOjeable).
 */
const FRANJA = 0.3
const UMBRAL_JUGAR_PX = 60

/** Espera a que la caja de un elemento deje de moverse (el reparto anima las cartas al entrar). */
async function cajaQuieta(l: Locator) {
  let antes = await caja(l)
  await expect
    .poll(async () => {
      const ahora = await caja(l)
      const quieta = Math.abs(ahora.y - antes.y) < 0.5 && Math.abs(ahora.x - antes.x) < 0.5 && ahora.height === antes.height
      antes = ahora
      return quieta
    })
    .toBe(true)
  return antes
}

/** Espera su turno para jugar una carta, contestando que quiere si la compu canta algo. */
async function esperarTurno(page: Page) {
  const jugable = cartasDeLaMano(page).and(page.locator(':enabled')).first()
  const respuesta = page.getByRole('button', { name: /^(Quiero|Decir mi tanto: \d+|Son buenas|Flor|No pedir ver)$/ }).first()
  await expect
    .poll(async () => {
      if (await jugable.isVisible()) return true
      if (await respuesta.isVisible()) await respuesta.click({ timeout: 1500 }).catch(() => {})
      return false
    })
    .toBe(true)
  return jugable
}

test('la mano llega apilada, se ojea deslizando y se juega arrastrando una carta', async ({ browser }) => {
  const page = await persona(browser, 'Tomi')
  await page.getByRole('button', { name: /^Mano a mano/ }).click()
  await page.getByRole('button', { name: 'Jugar', exact: true }).click()
  await expect(page).toHaveURL(/\/mesa$/)

  // Llega apilada: con la ayuda para ojear y "Ver todas".
  const cartas = cartasDeLaMano(page)
  await expect(cartas).toHaveCount(3)
  const verTodas = page.getByRole('button', { name: 'Ver todas' })
  await expect(verTodas).toBeVisible()
  await expect(page.getByText('para ojear')).toBeVisible()

  // Apiladas, las tres ocupan el mismo lugar (cuando termina la animación del reparto).
  await expect
    .poll(async () => {
      const cs = [await caja(cartas.nth(0)), await caja(cartas.nth(1)), await caja(cartas.nth(2))]
      return cs.every((c) => Math.abs(c.y - cs[0]!.y) < 1 && Math.abs(c.x - cs[0]!.x) < 1 && Math.abs(c.width - cs[0]!.width) < 1)
    })
    .toBe(true)
  const c0 = await cajaQuieta(cartas.nth(2))
  const alto = c0.height
  const franja = alto * FRANJA
  const x = c0.x + c0.width / 2

  // 1) La de adelante, hacia abajo: deja ver la del medio (y llega hasta el escalonado completo).
  await arrastrarConDedo(page, { x, y: c0.y + alto / 2 }, { x, y: c0.y + alto / 2 + 2 * franja + 20 })
  const adelante = await caja(cartas.nth(0))
  expect(adelante.y - c0.y).toBeGreaterThan(2 * franja - 2)
  expect(adelante.y - c0.y).toBeLessThan(2 * franja + 2)
  // Todavía falta la de atrás: sigue apilada.
  await expect(verTodas).toBeVisible()

  // 2) La del medio (se agarra por la franja que asoma arriba), hacia abajo: asoma la de atrás.
  await arrastrarConDedo(page, { x, y: c0.y + franja / 2 }, { x, y: c0.y + franja / 2 + franja + 20 })
  const medio = await caja(cartas.nth(1))
  expect(medio.y - c0.y).toBeGreaterThan(franja - 2)

  // Ojeadas las tres, se abre sola en abanico: ya no hay "Ver todas" y las cartas se separan.
  await expect(verTodas).toBeHidden()
  await expect(page.getByText('para ojear')).toBeHidden()
  await expect(cartas).toHaveCount(3)
  const [a, b, c] = [await cajaQuieta(cartas.nth(0)), await cajaQuieta(cartas.nth(1)), await cajaQuieta(cartas.nth(2))]
  expect(b.x - a.x).toBeGreaterThan(a.width / 2)
  expect(c.x - b.x).toBeGreaterThan(b.width / 2)

  // En su turno, arrastrar una carta poco hacia arriba no la juega: vuelve a su lugar.
  const carta = await esperarTurno(page)
  const nombre = ((await carta.getAttribute('aria-label')) ?? '').replace(/^Jugar el /, '')
  const desde = await cajaQuieta(carta)
  const centro = { x: desde.x + desde.width / 2, y: desde.y + desde.height / 2 }
  await arrastrarConDedo(page, centro, { x: centro.x, y: centro.y - UMBRAL_JUGAR_PX / 2 })
  await page.waitForTimeout(300)
  await expect(cartas).toHaveCount(3)
  await expect(page.getByRole('button', { name: `Jugar el ${nombre}` })).toBeEnabled()

  // Pasando el umbral, al soltarla se juega: sale de la mano y queda en la mesa.
  await arrastrarConDedo(page, centro, { x: centro.x, y: centro.y - UMBRAL_JUGAR_PX - 30 })
  await expect(cartas).toHaveCount(2)
  await expect(page.getByRole('button', { name: `Jugar el ${nombre}` })).toHaveCount(0)
  await expect(page.getByRole('img', { name: nombre })).toBeVisible()
})
