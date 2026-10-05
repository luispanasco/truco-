import { cartasDeLaMano, crearSala, elegir, empezar, expect, finDePartida, jugarHasta, persona, test, unirse } from './ayudantes'

/**
 * Revancha online: dos personas juegan una partida corta y las dos piden revancha.
 * Para que sea corta, la sala se arma con "Falta envido con los dos en malas: Gana el
 * partido" y las dos cantan falta envido cada vez que pueden: la primera querida termina.
 */
test('terminan una partida online, piden revancha las dos y arranca otra', async ({ browser }) => {
  test.setTimeout(150_000)
  const ana = await persona(browser, 'Ana')
  const beto = await persona(browser, 'Beto')

  const codigo = await crearSala(ana, async (p) => {
    await elegir(p, 'Formato', /Mano a mano/)
    await p.getByText('Reglas de la mesa').click()
    await elegir(p, 'Falta envido con los dos en malas', 'Gana el partido')
  })
  await expect(ana.getByText('Falta en malas: gana el partido')).toBeVisible()
  await unirse(beto, codigo)
  await expect(ana.getByText('Beto')).toBeVisible()
  await empezar(ana, [ana, beto])

  const finAna = finDePartida(ana)
  const finBeto = finDePartida(beto)
  await jugarHasta([ana, beto], async () => (await finAna.isVisible()) && (await finBeto.isVisible()), {
    falta: true,
    tiempoMs: 120_000,
  })
  // Una ganó y la otra perdió.
  const titulos = [await finAna.getByRole('heading').innerText(), await finBeto.getByRole('heading').innerText()].sort()
  expect(titulos).toEqual(['¡Ganaste!', 'Perdiste'].sort())
  const puntos = ana.getByRole('banner').locator('strong')
  expect(Math.max(...(await puntos.allInnerTexts()).map(Number))).toBeGreaterThan(0)

  // Ana pide revancha: queda esperando, y Beto ve que falta él.
  await finAna.getByRole('button', { name: 'Revancha 0/2' }).click()
  await expect(finAna.getByRole('button', { name: 'Esperando a los demás…' })).toBeDisabled()
  await expect(finBeto.getByRole('button', { name: 'Revancha 1/2' })).toBeVisible()

  // Beto también: arranca otra partida desde cero para los dos.
  await finBeto.getByRole('button', { name: 'Revancha 1/2' }).click()
  for (const p of [ana, beto]) {
    await expect(finDePartida(p)).toBeHidden()
    await expect(p.getByText('Mano 1', { exact: true })).toBeVisible()
    await expect(p.getByRole('banner').locator('strong')).toHaveText(['0', '0'])
    await expect(p.getByLabel('Mazo y muestra')).toBeVisible()
  }

  // Y se puede jugar: alguna de las dos tira una carta en la partida nueva.
  const enMano = async () => (await cartasDeLaMano(ana).count()) + (await cartasDeLaMano(beto).count())
  await expect.poll(enMano).toBe(6)
  await jugarHasta([ana, beto], async () => (await enMano()) < 6, { tiempoMs: 20_000 })
})
