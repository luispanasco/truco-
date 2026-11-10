import { expect, persona, test } from './ayudantes'

/**
 * "Aprendé a jugar" en un celular: desde Jugar se entra a la ruta, se hace la primera lección
 * (con un error en la pregunta) y se abre la siguiente; en la de la baraja se tocan las espadas.
 */
test('el tutorial: la primera lección y las espadas de la segunda', async ({ browser }) => {
  const page = await persona(browser, 'Alumno')
  await page.getByRole('button', { name: /¿Primera vez\? Aprendé a jugar/ }).click()
  await expect(page.getByRole('heading', { name: 'Aprendé a jugar' })).toBeVisible()
  await page.getByRole('button', { name: 'Lección 1: Un poco de historia' }).click()

  const queiroz = page.getByRole('status')
  await expect(queiroz).toContainText('Soy Queiroz')
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: 'Seguir' }).click()
  await page.getByRole('button', { name: 'Se juega con 50 cartas' }).click()
  await expect(queiroz).toContainText('Pensá en lo que te conté')
  await page.getByRole('button', { name: 'La muestra y las piezas' }).click()
  await page.getByRole('button', { name: 'Terminar' }).click()
  await expect(page.getByLabel('2 de 3 estrellas')).toBeVisible()

  await page.getByRole('button', { name: 'Siguiente: La baraja' }).click()
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Seguir' }).click()
  const espadas = page.getByRole('button', { name: /^El .* de espadas$/ })
  await expect(espadas).toHaveCount(4)
  for (let i = 0; i < 4; i++) await espadas.nth(i).click()
  await expect(queiroz).toContainText('¡Las encontraste todas!')

  // Vuelta a la ruta: la primera, hecha; la segunda, la que sigue.
  await page.getByRole('button', { name: 'Lecciones' }).click()
  await expect(page.getByText('1 de 11 lecciones')).toBeVisible()
})
