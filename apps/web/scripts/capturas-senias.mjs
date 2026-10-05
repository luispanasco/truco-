/**
 * Capturas de las señas a mitad de animación: en la mesa (el compañero de arriba hace la
 * seña; un rival, la misma pescada; el otro, disimulo) y en la cara grande de señas.
 * Uso, con la web levantada (pnpm web):
 *   node scripts/capturas-senias.mjs [carpeta] [url] [ancho x alto] [señas separadas por coma] [ms]
 */
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'
const dir = process.argv[2] ?? 'capturas'
const url = process.argv[3] ?? 'http://localhost:5173'
const [ancho, alto] = (process.argv[4] ?? '360x740').split('x').map(Number)
const senias = (process.argv[5] ?? 'pieza2,perico,unoFalso,flor').split(',')
const t = Number(process.argv[6] ?? 900)
mkdirSync(dir, { recursive: true })
const nav = await chromium.launch()

async function abrir() {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
  await p.addInitScript(() => localStorage.setItem('truco.perfil', JSON.stringify({ apodo: 'Luis', ojear: false })))
  await p.goto(url + '/')
  await p.evaluate(async () => {
    const { useJuego } = await import('/src/estado.ts')
    const { ConexionLocal } = await import('/src/conexion/local.ts')
    const c = new ConexionLocal({
      apodo: 'Luis', avatar: '🧉', formato: '2v2', nivelBots: 'facil', ayudas: true, semilla: 183,
      config: { picaPica: false }, senias: { habilitadas: true, pescar: 'gestoYCarta' }, demoraBots: [1e9, 1e9],
    })
    window.__conexion = c
    useJuego.getState().conectar(c)
    history.pushState({}, '', '/mesa')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await p.waitForSelector('.mi-mano .carta')
  await p.waitForSelector('.asiento .avatar-dibujo')
  // Los bots señan al empezar la mano: se espera a que terminen sus gestos.
  await p.waitForFunction(() => !document.querySelector('.avatar[data-gesto]'), null, { timeout: 20_000 })
  return { ctx, p }
}
const congelar = (p, ms) => p.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms }), ms)

// Mesa: el compañero (arriba) hace la seña; los rivales, una pescada y un disimulo.
for (const s of senias) {
  const { ctx, p } = await abrir()
  await p.evaluate((s) => {
    const c = window.__conexion
    c.emitir('senia', { de: 2, senia: s })
    c.emitir('seniaPescada', { de: 1, senia: s })
    c.emitir('seniaPescada', { de: 3, senia: null })
  }, s)
  await p.waitForTimeout(150)
  await congelar(p, t)
  await p.screenshot({ path: `${dir}/mesa-${s}.png` })
  await p.locator('.asiento.pos-2 .avatar').screenshot({ path: `${dir}/mesa-${s}-cerca.png` })
  await ctx.close()
}

// Cara grande: primero las zonas marcadas, después cada seña a mitad.
{
  const { ctx, p } = await abrir()
  await p.getByRole('button', { name: 'Hacer una seña' }).click()
  await p.waitForTimeout(600)
  await p.addStyleTag({ content: '.zona-cara { border-color: #fff9 !important; background: #fff3 !important }' })
  await p.screenshot({ path: `${dir}/cara-zonas.png` })
  await ctx.close()
}
const BOCA = { pieza4: 'Beso', tres: 'Morder', dosComun: 'Abrir', unoFalso: 'Lengua', flor: 'Inflar' }
const ETIQUETA = { pieza2: 'Levantar las cejas', perico: 'Guiño derecho', perica: 'Guiño izquierdo', pieza5: 'Fruncir la nariz', unoBravo: 'pera hacia la derecha', sieteBravo: 'pera hacia la izquierda' }
for (const s of senias) {
  const { ctx, p } = await abrir()
  await p.getByRole('button', { name: 'Hacer una seña' }).click()
  await p.waitForTimeout(600)
  const hoja = p.getByRole('dialog', { name: 'Señas' })
  if (s in BOCA || s === 'flor') {
    await hoja.getByRole('button', { name: 'Boca: más señas' }).click()
    await hoja.locator('.senia-boca', { hasText: BOCA[s] }).click()
  } else {
    await hoja.getByRole('button', { name: new RegExp(ETIQUETA[s]) }).first().click()
  }
  await p.waitForTimeout(100)
  await congelar(p, t)
  await p.locator('.cara-senias').screenshot({ path: `${dir}/cara-${s}.png` })
  await ctx.close()
}
await nav.close()
