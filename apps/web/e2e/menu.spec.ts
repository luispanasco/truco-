import { arrastrarConDedo, caja, expect, persona, test } from './ayudantes'

/**
 * El menú principal en un celular de verdad: se desliza con el dedo entre la tienda, jugar y
 * el lobby, la barra de abajo salta de una a otra, el engranaje abre los ajustes y, con el
 * login de prueba, el banner muestra las monedas y el Elo.
 */
test('el menú se desliza con el dedo y el banner muestra la cuenta', async ({ browser }) => {
  const page = await persona(browser, 'Mora')
  const pestania = (nombre: string) => page.getByRole('tab', { name: nombre })
  await expect(pestania('Jugar')).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: '¡Jugar!' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Crear sala/ })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Bandera de Uruguay' })).toBeVisible()

  // Deslizando hacia la izquierda aparece el lobby; hacia la derecha, de vuelta y la tienda.
  const carril = await caja(page.locator('.menu-carril'))
  // Bien abajo: sobre la tarjeta del modo, deslizar cambia el modo.
  const medio = carril.y + carril.height * 0.9
  const izquierda = { x: carril.x + carril.width * 0.15, y: medio }
  const derecha = { x: carril.x + carril.width * 0.85, y: medio }
  const deslizar = (desde: typeof izquierda, hasta: typeof izquierda) => arrastrarConDedo(page, desde, hasta, 12, 16)
  await deslizar(derecha, izquierda)
  await expect(pestania('Lobby')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#panel-lobby').getByText('Contra la compu')).toBeInViewport()
  await deslizar(izquierda, derecha)
  await expect(pestania('Jugar')).toHaveAttribute('aria-selected', 'true')
  await deslizar(izquierda, derecha)
  await expect(pestania('Tienda')).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#panel-tienda').getByRole('heading', { name: 'Tienda' })).toBeInViewport()

  // La barra de abajo vuelve al medio.
  await pestania('Jugar').click()
  await expect(page.getByRole('button', { name: /Crear sala/ })).toBeInViewport()

  // El engranaje abre los ajustes.
  await page.getByRole('button', { name: 'Ajustes' }).click()
  const ajustes = page.getByRole('dialog', { name: 'Ajustes' })
  await expect(ajustes.getByRole('radiogroup', { name: 'Mesa', exact: true })).toBeVisible()
  await ajustes.getByRole('button', { name: 'Cerrar' }).click()
  await expect(ajustes).toBeHidden()

  // Invitado: el banner invita a entrar; con el login de prueba, monedas y Elo (1200 al arrancar).
  await page.locator('.banner-entrar').click()
  const entrar = page.getByRole('dialog', { name: 'Entrar a tu cuenta' })
  await entrar.getByPlaceholder('vos@ejemplo.com').fill(`mora-${Date.now()}@ejemplo.com`)
  await entrar.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(entrar).toBeHidden()
  await expect(page.getByRole('button', { name: /monedas\. Ir a la tienda/ })).toBeVisible()
  await expect(page.locator('.banner-elo')).toContainText('1200')
  await page.getByRole('button', { name: /monedas\. Ir a la tienda/ }).click()
  await expect(pestania('Tienda')).toHaveAttribute('aria-selected', 'true')
})
