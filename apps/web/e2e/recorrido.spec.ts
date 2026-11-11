import { expect, jugarHasta, test } from './ayudantes'

/**
 * El recorrido con Don Queiroz, de punta a punta en el celular: la primera vez que se abre la app
 * sale el de bienvenida (y el menú se mueve solo a cada pantalla); en la primera partida contra la
 * compu, el de la mesa, con el juego esperando hasta terminarlo.
 */
test('el recorrido de bienvenida y el de la primera partida', async ({ browser }) => {
  // Sin `persona`: esa marca los recorridos como vistos.
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto('/')

  const recorrido = page.getByRole('dialog', { name: 'Recorrido con Don Queiroz' })
  await expect(recorrido).toBeVisible()
  await expect(recorrido.getByText('1 de 11')).toBeVisible()
  await expect(recorrido.getByText(/Soy Don Queiroz/)).toBeVisible()
  await expect(recorrido.getByRole('button', { name: 'Siguiente' })).toBeFocused()

  const pestania = (nombre: string) => page.getByRole('tab', { name: nombre, exact: true })
  const luz = page.locator('.recorrido-luz')
  // En cada paso: el número, y la luz alrededor de lo que se explica.
  const pasos: [string, string, string | null][] = [
    ['2 de 11', '.jugar-centro .selector-modo', null],
    ['3 de 11', '.jugar-centro .boton-jugar-grande', null],
    ['4 de 11', '.tarjeta-aprender', null],
    ['5 de 11', '.portada-historia-contenido', null],
    ['6 de 11', '.jugar-secundarios', null],
    ['7 de 11', '#panel-avatar .personalizar-avatar', 'Avatar'],
    ['8 de 11', '#panel-tienda .tienda-como-ganar', 'Tienda'],
    ['9 de 11', '#panel-lobby .lobby-competi', 'Lobby'],
    ['10 de 11', '#panel-grupos .tarjeta', 'Grupos'],
    ['11 de 11', '.banner-ajustes:not(.banner-extra)', 'Jugar'],
  ]
  for (const [cuenta, donde, panel] of pasos) {
    await recorrido.getByRole('button', { name: 'Siguiente' }).click()
    await expect(recorrido.getByText(cuenta)).toBeVisible()
    if (panel) await expect(pestania(panel)).toHaveAttribute('aria-selected', 'true')
    // La luz queda sobre el elemento (con unos píxeles de aire) y el globo, adentro de la pantalla.
    const el = page.locator(donde).first()
    await expect
      .poll(async () => {
        const [a, b] = [await luz.boundingBox(), await el.boundingBox()]
        if (!a || !b) return false
        const alto = page.viewportSize()!.height
        const cy = (c: typeof a) => Math.max(c.y, 0) + (Math.min(c.y + c.height, alto) - Math.max(c.y, 0)) / 2
        return Math.abs(a.x + a.width / 2 - (b.x + b.width / 2)) < 8 && Math.abs(cy(a) - cy(b)) < 10
      })
      .toBe(true)
    const globo = await page.locator('.recorrido-globo').boundingBox()
    const vp = page.viewportSize()!
    expect(globo!.x).toBeGreaterThanOrEqual(0)
    expect(globo!.x + globo!.width).toBeLessThanOrEqual(vp.width)
    expect(globo!.y).toBeGreaterThanOrEqual(0)
    expect(globo!.y + globo!.height).toBeLessThanOrEqual(vp.height)
  }
  await expect(recorrido.getByRole('button', { name: 'Aprendé a jugar' })).toBeVisible()
  await recorrido.getByRole('button', { name: '¡A jugar!' }).click()
  await expect(recorrido).toBeHidden()

  // Al recargar ya no sale.
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Truco' })).toBeVisible()
  await page.waitForTimeout(800)
  await expect(recorrido).toBeHidden()

  // La primera partida contra la compu: se ojean las cartas y sale el de la mesa.
  await page.getByRole('button', { name: '¡Jugar!' }).click()
  await page.getByPlaceholder('¿Cómo te dicen?').fill('Nuevo')
  await page.getByRole('button', { name: '¡A jugar!' }).click()
  await expect(page).toHaveURL(/\/mesa$/)
  await page.getByRole('button', { name: 'Ver todas' }).click()
  const mesa = page.getByRole('dialog', { name: 'La mesa, con Don Queiroz' })
  await expect(mesa).toBeVisible({ timeout: 15_000 })
  await expect(mesa.getByText('1 de 5')).toBeVisible()
  // Mientras tanto, nadie juega: la mesa sigue vacía.
  await page.waitForTimeout(2500)
  await expect(page.locator('.cartas-en-mesa .jugada')).toHaveCount(0)
  for (let i = 2; i <= 5; i++) {
    await mesa.getByRole('button', { name: 'Siguiente' }).click()
    await expect(mesa.getByText(`${i} de 5`)).toBeVisible()
  }
  await mesa.getByRole('button', { name: '¡A jugar!' }).click()
  await expect(mesa).toBeHidden()
  // Y el juego sigue: se juega hasta que haya una carta en la mesa.
  await jugarHasta([page], async () => (await page.locator('.cartas-en-mesa .jugada').count()) > 0, { tiempoMs: 20_000 })
  await ctx.close()
})
