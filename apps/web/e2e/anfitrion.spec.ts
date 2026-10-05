import type { Page } from '@playwright/test'
import { crearSala, empezar, expect, persona, test, unirse } from './ayudantes'

/** Con E2E_CAPTURAS (una carpeta) se guardan capturas para revisar a ojo. */
async function captura(page: Page, nombre: string) {
  const carpeta = process.env.E2E_CAPTURAS
  if (carpeta) await page.screenshot({ path: `${carpeta}/${nombre}.png` })
}

const mesaDe = (page: Page) => page.locator('html').getAttribute('data-mesa')

/**
 * De punta a punta: Ana desbloquea la tienda de prueba, elige la mesa Bordó (paga) y la baraja
 * clásica y crea una sala. Beto, con su mesa Azul, entra y ve la mesa y la baraja de Ana en la
 * espera y en la partida; al salir vuelve a la suya.
 */
test('la mesa y la baraja de la sala son las del anfitrión', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')
  await ana.getByText('Más opciones').click()
  // Con la tienda cerrada, Bordó tiene candado.
  await expect(ana.getByRole('radio', { name: /^Bordó: 400 monedas/ })).toHaveAttribute('aria-disabled', 'true')
  await ana.getByText('Desbloquear la tienda (prueba)').click()
  await expect(ana.getByRole('switch', { name: /Desbloquear la tienda/ })).toBeChecked()
  const bordo = ana.getByRole('radiogroup', { name: 'Mesa' }).getByRole('radio', { name: 'Bordó' })
  await bordo.click()
  await expect(bordo).toHaveAttribute('aria-checked', 'true')
  await ana.getByRole('radio', { name: /^Clásica 1878/ }).click()
  await expect.poll(() => mesaDe(ana)).toBe('bordo')
  await ana.getByText('Desbloquear la tienda (prueba)').scrollIntoViewIfNeeded()
  await captura(ana, '1-inicio-tienda-desbloqueada')

  const codigo = await crearSala(ana)
  await expect(ana.getByText('Mesa Bordó · Baraja clásica, las tuyas')).toBeVisible()

  const beto = await persona(browser, 'Beto')
  await beto.getByText('Más opciones').click()
  const azul = beto.getByRole('radiogroup', { name: 'Mesa' }).getByRole('radio', { name: 'Azul' })
  await azul.click()
  await expect(azul).toHaveAttribute('aria-checked', 'true')
  await expect.poll(() => mesaDe(beto)).toBe('azul')
  // Su baraja es la propia: el abanico del inicio no tiene imágenes.
  await expect(beto.locator('.abanico .carta-img')).toHaveCount(0)

  await unirse(beto, codigo)
  await expect(beto.getByText('Mesa Bordó · Baraja clásica, de Ana')).toBeVisible()
  await expect.poll(() => mesaDe(beto)).toBe('bordo')
  await captura(beto, '2-sala-de-espera-beto')

  await empezar(ana, [ana, beto])
  await expect.poll(() => mesaDe(beto)).toBe('bordo')
  // La baraja clásica son imágenes (la propia es SVG): la muestra y las cartas de Beto.
  await expect(beto.locator('.carta-img').first()).toBeVisible()
  await captura(beto, '3-mesa-de-beto')

  // Al salir, Beto vuelve a su mesa y a su baraja.
  await beto.getByRole('button', { name: 'Salir de la mesa' }).click()
  await beto.getByRole('button', { name: 'Abandonar' }).click()
  await expect(beto).toHaveURL(/\/$/)
  await expect.poll(() => mesaDe(beto)).toBe('azul')
  await expect(beto.locator('.abanico .carta')).toHaveCount(3)
  await expect(beto.locator('.abanico .carta-img')).toHaveCount(0)
})
