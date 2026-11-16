import { expect, persona, test } from './ayudantes'

/**
 * De punta a punta: un dúo arma su sala de 2 vs 2 y sale a buscar rivales; del otro lado, dos
 * personas que buscaban 2 vs 2 solas. Los cuatro terminan en la misma mesa, el dúo del mismo lado.
 */
test('un dúo sale a buscar rivales y juega contra dos que buscaban solos', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')
  const beto = await persona(browser, 'Beto')
  const caro = await persona(browser, 'Caro')
  const dani = await persona(browser, 'Dani')

  // Ana arma una sala de parejas y entra Beto.
  await ana.getByText('Crear sala').first().click()
  await ana.getByRole('radio', { name: /^Parejas/ }).click()
  await ana.getByRole('button', { name: 'Crear sala' }).click()
  await expect(ana).toHaveURL(/\/sala$/)
  const codigo = (await ana.locator('.codigo-sala').innerText()).replace(/\s/g, '')
  await beto.getByText('Unirme con código').first().click()
  await beto.getByPlaceholder('ABC23').fill(codigo)
  await beto.getByRole('button', { name: 'Entrar' }).click()
  await expect(ana.getByText('Beto')).toBeVisible()

  // Caro busca 2 vs 2 sola desde el lobby.
  await caro.goto('/buscar?formato=2v2')
  await expect(caro.getByRole('heading', { name: 'Buscando gente…' })).toBeVisible()

  // El dúo sale a buscar rivales: los dos pasan a la búsqueda y caen con Caro.
  await ana.getByRole('button', { name: 'Buscar rivales' }).click()
  await expect(ana).toHaveURL(/\/buscar/)
  await expect(beto).toHaveURL(/\/buscar/)
  await expect(ana.getByRole('heading', { name: 'Buscando rivales para tu grupo…' })).toBeVisible()
  await expect(caro.getByText('Ya están 3 de 4.')).toBeVisible({ timeout: 10_000 })

  // Dani completa la mesa y empieza para todos.
  await dani.goto('/buscar?formato=2v2')
  for (const p of [ana, beto, caro, dani]) await expect(p).toHaveURL(/\/mesa$/, { timeout: 15_000 })
  await expect(ana.getByLabel('Mazo y muestra')).toBeVisible()
})
