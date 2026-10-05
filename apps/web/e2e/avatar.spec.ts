import { crearSala, expect, persona, test, unirse } from './ayudantes'

/**
 * De punta a punta: Ana arma su avatar en el perfil, crea una sala y Beto, que entra con
 * el código, la ve con ese mismo avatar (y ella a él con el suyo).
 */
test('el avatar armado en el perfil es el que ven los demás en la sala', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')

  // Ana abre el editor y elige peinado, ojos y ropa (gratis).
  await ana.getByRole('button', { name: 'Cambiar tu avatar' }).click()
  const editor = ana.getByRole('dialog', { name: 'Tu avatar' })
  await editor.getByRole('tab', { name: 'Pelo' }).click()
  await editor.getByRole('radio', { name: 'Peinado 5' }).click()
  await editor.getByRole('radio', { name: 'Color 6' }).click()
  await editor.getByRole('tab', { name: 'Ojos' }).click()
  await editor.getByRole('radio', { name: 'Ojos 4' }).click()
  await editor.getByRole('tab', { name: 'Ropa' }).click()
  await editor.getByRole('radio', { name: 'Remera roja' }).click()
  await expect(editor.getByRole('radio', { name: 'Remera roja' })).toHaveAttribute('aria-checked', 'true')

  // Una prenda de la tienda no se puede elegir: avisa el precio.
  const camiseta = editor.getByRole('radio', { name: /^Camiseta celeste: 200 monedas/ })
  await expect(camiseta).toHaveAttribute('aria-disabled', 'true')
  // Se puede tocar igual (para ver el precio): Playwright no toca lo que está aria-disabled sin force.
  await camiseta.click({ force: true })
  await expect(editor.getByRole('status')).toContainText('Pronto en la tienda')
  await expect(editor.getByRole('radio', { name: 'Remera roja' })).toHaveAttribute('aria-checked', 'true')

  // La seña se ve en el avatar grande.
  await editor.getByRole('button', { name: 'Ver una seña' }).click()
  await expect(editor.locator('.editor-avatar-grande svg')).toHaveAttribute('data-gesto', 'pieza2')
  await editor.getByRole('button', { name: 'Listo' }).click()
  await expect(editor).toBeHidden()

  const codigoAna = await ana.locator('.perfil-avatar svg').getAttribute('data-avatar')
  // a1. piel . cabeza . pelo 4 . color 5 . cejas . ojos 3 … ropa 1 (en base 36).
  expect(codigoAna).toMatch(/^a1\.[0-9a-z]+\.[0-9a-z]+\.4\.5\.[0-9a-z]+\.3\.(?:[0-9a-z]+\.){6}1\.0\.0$/)

  // Queda guardado al recargar.
  await ana.reload()
  await expect(ana.locator('.perfil-avatar svg')).toHaveAttribute('data-avatar', codigoAna!)

  const codigo = await crearSala(ana)
  const beto = await persona(browser, 'Beto')
  const codigoBeto = await beto.locator('.perfil-avatar svg').getAttribute('data-avatar')
  await unirse(beto, codigo)

  // Cada uno ve al otro con su avatar en la sala de espera.
  await expect(beto.locator('.lugar', { hasText: 'Ana' }).locator('svg.avatar-dibujo')).toHaveAttribute('data-avatar', codigoAna!)
  await expect(ana.locator('.lugar', { hasText: 'Beto' }).locator('svg.avatar-dibujo')).toHaveAttribute('data-avatar', codigoBeto!)
})
