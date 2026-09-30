import { expect, test, type Browser, type Page } from '@playwright/test'

/**
 * De punta a punta: dos personas en navegadores separados, contra el servidor real.
 * La configuración (servidor + web) está en playwright.config.ts.
 */

async function persona(browser: Browser, apodo: string): Promise<Page> {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/')
  await page.getByPlaceholder('¿Cómo te dicen?').fill(apodo)
  return page
}

/** Si le toca, hace algo razonable: abre la mano, contesta que quiere o juega una carta. */
async function jugarSiLeToca(page: Page): Promise<boolean> {
  const verTodas = page.getByRole('button', { name: 'Ver todas' })
  if (await verTodas.isVisible().catch(() => false)) await verTodas.click()
  // Con timeout corto: si mientras tanto dejó de ser su turno, el botón se desactiva y se sigue.
  const tocar = (l: ReturnType<Page['locator']>) =>
    l.click({ timeout: 1500 }).then(
      () => true,
      () => false,
    )
  const quiero = page.getByRole('button', { name: /^(Quiero|Decir mi tanto|Flor)/ }).first()
  if (await quiero.isVisible().catch(() => false)) return tocar(quiero)
  const carta = page.locator('.mi-mano .carta-jugable:not([disabled])').first()
  if (await carta.isVisible().catch(() => false)) return tocar(carta)
  return false
}

test('dos personas crean una sala, entran con el código y juegan', async ({ browser }) => {
  const ana = await persona(browser, 'Ana')
  const beto = await persona(browser, 'Beto')

  // Ana crea la sala.
  await ana.getByText('Crear sala').first().click()
  await expect(ana).toHaveURL(/\/crear$/)
  await ana.getByRole('button', { name: 'Crear sala' }).click()
  await expect(ana).toHaveURL(/\/sala$/)
  const codigo = (await ana.locator('.codigo-sala').innerText()).replace(/\s/g, '')
  expect(codigo).toMatch(/^[A-Z0-9]{5}$/)

  // Beto entra con el código.
  await beto.getByText('Unirme con código').first().click()
  await beto.getByPlaceholder('ABC23').fill(codigo.toLowerCase())
  await beto.getByRole('button', { name: 'Entrar' }).click()
  await expect(beto).toHaveURL(/\/sala$/)
  await expect(beto.getByText('Esperando que el anfitrión empiece')).toBeVisible()
  await expect(ana.getByText('Beto')).toBeVisible()

  // Ana empieza: los dos pasan a la mesa.
  await ana.getByRole('button', { name: 'Empezar' }).click()
  await expect(ana).toHaveURL(/\/mesa$/)
  await expect(beto).toHaveURL(/\/mesa$/)
  await expect(ana.getByLabel('Mazo y muestra')).toBeVisible()
  await expect(beto.getByLabel('Mazo y muestra')).toBeVisible()

  // Juegan un rato: cada uno actúa cuando le toca.
  let jugadas = 0
  for (let i = 0; i < 60 && jugadas < 8; i++) {
    for (const p of [ana, beto]) if (await jugarSiLeToca(p)) jugadas++
    await ana.waitForTimeout(250)
  }
  expect(jugadas).toBeGreaterThanOrEqual(4)

  // Chat: Ana manda una frase rápida y a Beto le llega.
  await ana.getByRole('button', { name: /^Chat/ }).click()
  await ana.getByRole('button', { name: 'Buena mano' }).click()
  await ana.keyboard.press('Escape')
  await expect(beto.getByRole('button', { name: /^Chat, 1 sin leer/ })).toBeVisible({ timeout: 10_000 })
  await beto.getByRole('button', { name: /^Chat/ }).click()
  await expect(beto.getByText('Buena mano').first()).toBeVisible()
  await beto.keyboard.press('Escape')

  // Beto recarga la página: vuelve a la partida desde el inicio.
  await beto.reload()
  await beto.goto('/')
  await beto.getByRole('button', { name: 'Volver a la partida' }).click()
  await expect(beto).toHaveURL(/\/mesa$/)
  await expect(beto.getByLabel('Mazo y muestra')).toBeVisible()
})

test('un código que no existe muestra un error claro', async ({ browser }) => {
  const page = await persona(browser, 'Carla')
  await page.getByText('Unirme con código').first().click()
  await page.getByPlaceholder('ABC23').fill('ZZZZZ')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('No existe una sala con ese código.')).toBeVisible()
})
