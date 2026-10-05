import { expect, test as base, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test'

/**
 * Ayudantes de los tests de punta a punta: personas en navegadores separados, salas
 * online, un jugador automático y gestos con el dedo (pantalla táctil de verdad, por CDP).
 */

/** Los navegadores abiertos con `persona` en el test en curso. */
const abiertos: BrowserContext[] = []

/**
 * `test` de Playwright que, al terminar cada test, cierra los navegadores de sus personas:
 * así nadie queda conectado (y jugando) mientras corre el test siguiente.
 */
export const test = base.extend<{ cerrarPersonas: void }>({
  cerrarPersonas: [
    async ({}, usar) => {
      await usar()
      for (const ctx of abiertos.splice(0)) await ctx.close().catch(() => {})
    },
    { auto: true },
  ],
})
export { expect }

/** Una persona nueva, en su propio navegador (contexto), con el apodo ya puesto en el inicio. */
export async function persona(browser: Browser, apodo: string): Promise<Page> {
  const ctx = await browser.newContext()
  abiertos.push(ctx)
  const page = await ctx.newPage()
  await page.goto('/')
  await page.getByPlaceholder('¿Cómo te dicen?').fill(apodo)
  return page
}

/** Las cartas de la mano propia (botones "Jugar el …", apilada o en abanico). */
export function cartasDeLaMano(page: Page): Locator {
  return page.getByRole('button', { name: /^Jugar el / })
}

/** Respuestas que el jugador automático da siempre que aparecen (el resto de los cantos los ignora). */
const RESPUESTAS = /^(Quiero|Decir mi tanto: \d+|Son buenas|Flor|No pedir ver)$/

/**
 * Si le toca, hace algo razonable: abre la mano, contesta que quiere o juega una carta.
 * Con `falta`, antes de jugar canta falta envido si puede (para terminar la partida rápido).
 */
export async function jugarSiLeToca(page: Page, { falta = false } = {}): Promise<boolean> {
  const verTodas = page.getByRole('button', { name: 'Ver todas' })
  if (await verTodas.isVisible().catch(() => false)) await verTodas.click({ timeout: 1500 }).catch(() => {})
  // Con timeout corto: si mientras tanto dejó de ser su turno, el botón se desactiva y se sigue.
  const tocar = (l: Locator) =>
    l.click({ timeout: 1500 }).then(
      () => true,
      () => false,
    )
  // La falta va antes que contestar: también sirve de respuesta a un envido o a un truco (el envido va primero).
  if (falta) {
    const canto = page.getByRole('button', { name: 'Falta envido' })
    if (await canto.isVisible().catch(() => false)) return tocar(canto)
  }
  const respuesta = page.getByRole('button', { name: RESPUESTAS }).first()
  if (await respuesta.isVisible().catch(() => false)) return tocar(respuesta)
  const carta = cartasDeLaMano(page).and(page.locator(':enabled')).first()
  if (await carta.isVisible().catch(() => false)) return tocar(carta)
  return false
}

/** El cartel de fin de partida ("¡Ganaste!", "Perdieron"…). */
export function finDePartida(page: Page): Locator {
  return page.getByRole('dialog', { name: /^(¡Ganaste!|¡Ganaron!|Perdiste|Perdieron)$/ })
}

/**
 * Juega con todos hasta que `listo` dé true (o se acabe el tiempo). Cada vuelta del ciclo,
 * cada persona hace a lo sumo una cosa si le toca.
 */
export async function jugarHasta(
  pages: Page[],
  listo: () => Promise<boolean>,
  { falta = false, tiempoMs = 90_000 } = {},
): Promise<number> {
  const fin = Date.now() + tiempoMs
  let jugadas = 0
  while (!(await listo())) {
    if (Date.now() > fin) throw new Error(`No terminó en ${tiempoMs} ms (${jugadas} jugadas)`)
    let alguna = false
    for (const p of pages) {
      if (await jugarSiLeToca(p, { falta })) {
        jugadas++
        alguna = true
      }
    }
    // Si nadie pudo hacer nada (juega un bot o es la pausa entre manos), espera un poco.
    if (!alguna) await pages[0]!.waitForTimeout(150)
  }
  return jugadas
}

/** Crea una sala privada desde el inicio. `ajustar` cambia el formulario antes de crearla. Devuelve el código. */
export async function crearSala(page: Page, ajustar?: (p: Page) => Promise<void>): Promise<string> {
  await page.getByText('Crear sala').first().click()
  await expect(page).toHaveURL(/\/crear$/)
  if (ajustar) await ajustar(page)
  await page.getByRole('button', { name: 'Crear sala' }).click()
  await expect(page).toHaveURL(/\/sala$/)
  const codigo = (await page.getByLabel(/^Código /).innerText()).replace(/\s/g, '')
  expect(codigo).toMatch(/^[A-Z0-9]{5}$/)
  return codigo
}

/** Entra a una sala con el código, desde el inicio. */
export async function unirse(page: Page, codigo: string) {
  await page.getByText('Unirme con código').first().click()
  await page.getByPlaceholder('ABC23').fill(codigo.toLowerCase())
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/sala$/)
  await expect(page.getByText('Esperando que el anfitrión empiece')).toBeVisible()
}

/** Elige una opción de un grupo de opciones del formulario (por ejemplo, "Formato" → "Parejas"). */
export async function elegir(page: Page, grupo: string, opcion: string | RegExp) {
  const radio = page.getByRole('radiogroup', { name: grupo }).getByRole('radio', { name: opcion })
  await radio.click()
  await expect(radio).toHaveAttribute('aria-checked', 'true')
}

/** El anfitrión empieza y todos pasan a la mesa. */
export async function empezar(anfitrion: Page, todos: Page[]) {
  await anfitrion.getByRole('button', { name: 'Empezar' }).click()
  for (const p of todos) {
    await expect(p).toHaveURL(/\/mesa$/)
    await expect(p.getByLabel('Mazo y muestra')).toBeVisible()
  }
}

type Punto = { x: number; y: number }

/**
 * Arrastra con el dedo (eventos táctiles de verdad, como en el celular) de `desde` a `hasta`,
 * en `pasos` movimientos. Así el navegador genera pointer events de tipo "touch".
 */
export async function arrastrarConDedo(page: Page, desde: Punto, hasta: Punto, pasos = 12) {
  const cdp = await page.context().newCDPSession(page)
  const toque = (p: Punto) => [{ x: p.x, y: p.y, radiusX: 4, radiusY: 4, force: 1, id: 1 }]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: toque(desde) })
  for (let i = 1; i <= pasos; i++) {
    const t = i / pasos
    const p = { x: desde.x + (hasta.x - desde.x) * t, y: desde.y + (hasta.y - desde.y) * t }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: toque(p) })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

/** La caja de un elemento visible (falla si no está). */
export async function caja(l: Locator) {
  const c = await l.boundingBox()
  if (!c) throw new Error('El elemento no está a la vista')
  return c
}
