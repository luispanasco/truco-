import { expect, test, type Page } from '@playwright/test'

/**
 * La app instalada, sin internet: con el service worker activo se corta la red, se recarga y se
 * juega contra la compu. La configuración (compilar + vite preview) está en playwright.pwa.config.ts.
 */

/** Si le toca, contesta (quiero, su tanto o "son buenas") o juega una carta, como en e2e/online.spec.ts. */
async function jugarSiMeToca(page: Page): Promise<boolean> {
  const verTodas = page.getByRole('button', { name: 'Ver todas' })
  if (await verTodas.isVisible().catch(() => false)) await verTodas.click()
  const tocar = (l: ReturnType<Page['locator']>) =>
    l.click({ timeout: 1500 }).then(
      () => true,
      () => false,
    )
  const quiero = page.getByRole('button', { name: /^(Quiero|Decir mi tanto|Son buenas|Flor)/ }).first()
  if (await quiero.isVisible().catch(() => false)) return tocar(quiero)
  const carta = page.locator('.mi-mano .carta-jugable:not([disabled])').first()
  if (await carta.isVisible().catch(() => false)) return tocar(carta)
  return false
}

test('sin conexión carga, avisa en lo online y se juega contra la compu con la baraja clásica', async ({ page, context }) => {
  await page.goto('/')
  await page.getByPlaceholder('¿Cómo te dicen?').fill('Luis')

  // El service worker se instala y toma la página (clientsClaim).
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 30_000 })

  // Se elige la baraja clásica: sus 41 imágenes quedan guardadas para jugar sin red.
  await page.getByRole('radio', { name: /Clásica 1878/ }).click()
  await expect
    .poll(() => page.evaluate(async () => (await (await caches.open('barajas')).keys()).length), { timeout: 30_000 })
    .toBe(41)

  // Sin red: la app carga igual, desde la caché.
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Truco' })).toBeVisible()

  // Las fuentes son de la app (no de Google Fonts): andan sin internet.
  const fuentes = await page.evaluate(async () => {
    await Promise.all(['800 16px Nunito', '16px "Alfa Slab One"'].map((f) => document.fonts.load(f).catch(() => [])))
    return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''))
  })
  expect(fuentes).toEqual(expect.arrayContaining(['Nunito', 'Alfa Slab One']))

  // Lo online, desactivado y con "Sin conexión".
  for (const titulo of ['Crear sala', 'Unirme con código', 'Buscar partida']) {
    const opcion = page.locator('.opcion-online', { hasText: titulo })
    await expect(opcion).toBeDisabled()
    await expect(opcion).toContainText('Sin conexión')
  }
  await expect(page.getByText('Contra la compu se juega igual', { exact: false })).toBeVisible()

  // Contra la compu se juega.
  await page.getByRole('button', { name: 'Jugar', exact: true }).click()
  await expect(page).toHaveURL(/\/mesa$/)
  await expect(page.getByLabel('Mazo y muestra')).toBeVisible()
  const cartas = page.locator('.mi-mano .carta')
  await expect(cartas).toHaveCount(3)

  // Las cartas de la baraja clásica se ven (las imágenes salieron de la caché).
  const imagenes = page.locator('.mi-mano .carta-img')
  await expect(imagenes).toHaveCount(3)
  await expect
    .poll(() => imagenes.evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).naturalWidth > 0)))
    .toBe(true)

  // Juega al menos una carta (contestando lo que haga falta mientras tanto).
  await expect
    .poll(
      async () => {
        await jugarSiMeToca(page)
        return cartas.count()
      },
      { timeout: 60_000, intervals: [250] },
    )
    .toBeLessThan(3)
})
