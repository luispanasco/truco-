import { expect, finDePartida, jugarHasta, persona, test } from './ayudantes'

/**
 * Contra la compu: el motor y los bots corren en el navegador (no usa el servidor).
 * Para que termine rápido: juego rápido, bots fáciles y falta envido cada vez que se puede
 * (querida con los dos en 0, quien la gana llega a 30).
 */
test('una partida entera contra la compu, de la mesa al cartel final', async ({ browser }) => {
  test.setTimeout(180_000)
  const page = await persona(browser, 'Lucía')

  await page.getByRole('button', { name: /^Mano a mano/ }).click()
  await page.getByRole('button', { name: 'Fácil' }).click()
  await page.getByText('Más opciones').click()
  const rapido = page.getByRole('switch', { name: /Juego rápido/ })
  await page.getByText('Juego rápido', { exact: true }).click()
  await expect(rapido).toBeChecked()
  await page.getByRole('button', { name: 'Jugar', exact: true }).click()

  await expect(page).toHaveURL(/\/mesa$/)
  await expect(page.getByLabel('Mazo y muestra')).toBeVisible()
  await expect(page.getByText('Bot Pepe').first()).toBeVisible()

  const fin = finDePartida(page)
  const jugadas = await jugarHasta([page], () => fin.isVisible(), { falta: true, tiempoMs: 150_000 })
  expect(jugadas).toBeGreaterThan(0)

  // El cartel dice el resultado: alguno de los dos llegó a 30.
  await expect(fin).toContainText('a 30 puntos')
  const resultado = fin.getByLabel('Resultado final')
  const puntos = (await resultado.locator('strong').allInnerTexts()).map(Number)
  expect(Math.max(...puntos)).toBeGreaterThanOrEqual(30)

  // Revancha contra la compu: arranca otra partida desde cero.
  await fin.getByRole('button', { name: 'Revancha' }).click()
  await expect(fin).toBeHidden()
  await expect(page.getByText('Mano 1', { exact: true })).toBeVisible()
})
