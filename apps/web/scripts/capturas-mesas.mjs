/**
 * Capturas de cada mesa (paño y madera), para revisar que todo se lea encima: cartas,
 * fósforos, nombres, globos, botones, pastillas de seña y la ficha del tanto. Por mesa: 2v2 con
 * círculos, 3v3 sentados y el inicio con Más opciones abierto. Arma un resumen por tamaño.
 * Uso, con la web levantada (pnpm web):
 *   node scripts/capturas-mesas.mjs [carpeta] [url] [tamaños separados por coma] [mesas separadas por coma]
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const dir = resolve(process.argv[2] ?? 'capturas-mesas')
const url = process.argv[3] ?? 'http://localhost:5173'
const tamanios = (process.argv[4] ?? '360x780,1280x800').split(',')
const MESAS = (process.argv[5] ?? 'boliche,azul,bordo,pizarra,celeste,parrillero,cantina').split(',')
mkdirSync(dir, { recursive: true })

/** Semillas de capturas-escenas: la persona es mano, le toca y tiene flor (aparece la ficha). */
const ESCENAS = [
  { nombre: '2v2-circulos', formato: '2v2', semilla: 183, bustos: false },
  { nombre: '3v3-sentados', formato: '3v3', semilla: 11, bustos: true },
]
const CARTAS = [
  ['oro', 1], ['copa', 3], ['basto', 7], ['espada', 12], ['oro', 6], ['copa', 2],
  ['basto', 4], ['espada', 11], ['oro', 10], ['copa', 5], ['basto', 1], ['espada', 3],
].map(([palo, numero]) => ({ palo, numero }))
/** Una seña del compañero (pastilla) y una pescada de un rival. */
const SENIAS = { '2v2': [['senia', { de: 2, senia: 'pieza2' }], ['seniaPescada', { de: 1, senia: 'perico' }]], '3v3': [['senia', { de: 2, senia: 'pieza2' }], ['seniaPescada', { de: 3, senia: 'unoBravo' }]] }

const nav = await chromium.launch()

function contexto(ancho, alto) {
  const celular = ancho < 700
  return nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: celular ? 2 : 1, isMobile: celular, hasTouch: celular })
}

/**
 * Las mesas de la tienda todavía no se pueden elegir (el perfil vuelve a boliche): para verlas,
 * se pone el atributo a mano, como lo haría aplicarMesa.
 */
async function probar(p, mesa) {
  await p.evaluate((mesa) => (document.documentElement.dataset.mesa = mesa), mesa)
}

async function mesa({ ancho, alto, mesa, formato, semilla, bustos, archivo }) {
  const ctx = await contexto(ancho, alto)
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
  await p.addInitScript(
    ({ bustos, mesa }) => localStorage.setItem('truco.perfil', JSON.stringify({ apodo: 'Luis', ojear: false, mesaBustos: bustos, mesa })),
    { bustos, mesa },
  )
  await p.goto(url + '/')
  await p.evaluate(
    async ({ formato, semilla }) => {
      const { useJuego } = await import('/src/estado.ts')
      const { ConexionLocal } = await import('/src/conexion/local.ts')
      const c = new ConexionLocal({
        apodo: 'Luis', avatar: '', formato, nivelBots: 'facil', ayudas: true, semilla,
        config: { picaPica: false }, senias: { habilitadas: true, pescar: 'gestoYCarta' }, demoraBots: [1e9, 1e9],
      })
      window.__conexion = c
      useJuego.getState().conectar(c)
      history.pushState({}, '', '/mesa')
      dispatchEvent(new PopStateEvent('popstate'))
    },
    { formato, semilla },
  )
  await p.waitForSelector('.mi-mano .carta')
  await probar(p, mesa)
  await p.waitForSelector('.asiento .avatar-dibujo')
  await p.waitForFunction(() => !document.querySelector('.avatar[data-gesto]'), null, { timeout: 20_000 })
  // Cartas jugadas, fósforos en los dos lados, el turno de otro, un canto, un chat y señas.
  await p.evaluate(
    async ({ cartas, senias }) => {
      const { useJuego } = await import('/src/estado.ts')
      const s = useJuego.getState()
      const e = s.vista.mano.enfrentamientos[s.vista.mano.actual]
      const juegan = e.participantes
      let i = 0
      const jugadas = [0, 1].flatMap((vuelta) => juegan.map((asiento) => ({ asiento, carta: cartas[i++ % cartas.length], vuelta })))
      useJuego.setState({ mesa: { jugadas, vueltas: [{ resultado: 0, ganador: juegan[0] }] }, vista: { ...s.vista, puntos: [7, 12] } })
      const c = window.__conexion
      const n = s.vista.jugadores.length
      c.emitir('turno', { asientos: [1], venceEn: Date.now() + 25_000 })
      c.emitir('eventos', [{ tipo: 'cantoTruco', asiento: n - 1, canto: 'truco' }])
      c.emitir('chat', { de: 1, apodo: s.vista.jugadores[1].apodo, texto: 'Vamo arriba', canal: 'general' })
      for (const [tipo, datos] of senias) c.emitir(tipo, datos)
    },
    { cartas: CARTAS, senias: SENIAS[formato] },
  )
  await p.waitForTimeout(150)
  // A mitad de la seña: el asiento ya está recuadrado y la cara hace el gesto.
  await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 900 }))
  const caja = ancho < 700 ? null : await p.locator('.pantalla-mesa').boundingBox()
  await p.screenshot({ path: `${dir}/${archivo}.png`, clip: caja ?? undefined })
  await ctx.close()
}

async function inicio({ ancho, alto, mesa, archivo }) {
  const ctx = await contexto(ancho, alto)
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
  await p.addInitScript((mesa) => localStorage.setItem('truco.perfil', JSON.stringify({ apodo: 'Luis', mesa })), mesa)
  await p.goto(url + '/')
  await probar(p, mesa)
  await p.locator('.mas-opciones summary').click()
  await p.waitForTimeout(300)
  await p.evaluate(() => scrollTo(0, 0))
  // Arriba de todo, y el selector de mesas a la vista (debajo).
  await p.screenshot({ path: `${dir}/${archivo}.png` })
  await p.locator('.mesas').scrollIntoViewIfNeeded()
  await p.screenshot({ path: `${dir}/${archivo}-selector.png` })
  await ctx.close()
}

for (const t of tamanios) {
  const [ancho, alto] = t.split('x').map(Number)
  const filas = []
  for (const m of MESAS) {
    const fila = { titulo: m, celdas: [] }
    for (const e of ESCENAS) {
      const archivo = `${t}-${m}-${e.nombre}`
      await mesa({ ancho, alto, mesa: m, ...e, archivo })
      fila.celdas.push({ titulo: e.nombre, archivo })
    }
    const archivo = `${t}-${m}-inicio`
    await inicio({ ancho, alto, mesa: m, archivo })
    fila.celdas.push({ titulo: 'inicio', archivo }, { titulo: 'selector', archivo: `${archivo}-selector` })
    filas.push(fila)
    console.log('listo', t, m)
  }
  const anchoCelda = ancho < 700 ? Math.round(ancho * 0.75) : 420
  const html = `<html><body style="margin:0;padding:16px;background:#222;color:#eee;font:600 18px system-ui">
    <h1 style="margin:0 0 12px;font-size:22px">Mesas · ${t}</h1>
    ${filas
      .map(
        (f) => `<div style="display:flex;gap:14px;margin-bottom:18px;align-items:flex-start">
        <div style="width:100px;font-size:22px">${f.titulo}</div>
        ${f.celdas
          .map(
            (c) => `<figure style="margin:0"><figcaption style="margin-bottom:6px">${c.titulo}</figcaption>
            <img src="data:image/png;base64,${readFileSync(`${dir}/${c.archivo}.png`).toString('base64')}" style="width:${anchoCelda}px;display:block;border:1px solid #555"></figure>`,
          )
          .join('')}
      </div>`,
      )
      .join('')}
  </body></html>`
  const ctx = await nav.newContext({ viewport: { width: 130 + 4 * (anchoCelda + 16), height: 400 } })
  const p = await ctx.newPage()
  await p.setContent(html)
  await p.waitForLoadState('load')
  await p.screenshot({ path: `${dir}/resumen-${t}.png`, fullPage: true })
  await ctx.close()
}
await nav.close()
