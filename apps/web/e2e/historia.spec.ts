import { expect, persona, test, unirse } from './ayudantes'

/**
 * Modo historia en cooperativo: el admin (el de los e2e, ver playwright.config.ts) gana el
 * nivel 1 de Rocha, arma la sala del nivel 2 desde la previa y un amigo entra con el código: van
 * del mismo lado, contra Julio y Nico, en la mesa de Rocha.
 */
test('un nivel de Rocha con un amigo', async ({ browser }) => {
  const luis = await persona(browser, 'Luis')
  await luis.locator('.banner-entrar').click()
  const hoja = luis.getByRole('dialog', { name: 'Entrar a tu cuenta' })
  await hoja.getByPlaceholder('vos@ejemplo.com').fill('admin-e2e@ejemplo.com')
  await hoja.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(hoja).toBeHidden()
  // El nivel 1, como si lo hubiera jugado.
  const estado = await luis.evaluate(async () => {
    const token = localStorage.getItem('truco.sesionDePrueba')
    const r = await fetch('/juego/api/historia/ganar', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ departamento: 'rocha', nivel: 1 }),
    })
    return r.status
  })
  expect(estado).toBe(200)

  await luis.goto('/historia/rocha/2')
  for (let i = 0; i < 2; i++) await luis.getByRole('button', { name: 'Seguir' }).click()
  await luis.getByRole('button', { name: 'Jugar con un amigo' }).click()
  await expect(luis).toHaveURL(/\/sala$/)
  await expect(luis.getByRole('heading', { name: 'Rocha · Nivel 2' })).toBeVisible()
  const codigo = ((await luis.locator('.codigo-sala').first().textContent()) ?? '').trim()

  const beto = await persona(browser, 'Beto')
  await unirse(beto, codigo)
  await expect(luis.getByRole('group', { name: 'Equipo 1' }).getByText('Beto')).toBeVisible()
  await expect(luis.getByLabel('Lugar 2: Julio, rival del nivel')).toBeVisible()

  await luis.getByRole('button', { name: 'Empezar' }).click()
  await expect(beto).toHaveURL(/\/mesa$/)
  await expect(beto.locator('.asiento').filter({ hasText: 'Julio' })).toBeVisible()
  await expect(beto.locator('.asiento').filter({ hasText: 'Nico' })).toBeVisible()
  expect(await beto.evaluate(() => document.documentElement.dataset.mesa)).toBe('rocha')
})
