/**
 * Maqueta de la mesa de bustos: la mesa de hoy (círculos) y la de bustos lado a lado, con
 * cartas jugadas en el centro, un canto y el turno de alguien; más una seña a mitad de
 * animación y el pica-pica. Arma una imagen de resumen por tamaño de pantalla.
 * Uso, con la web levantada (pnpm web):
 *   node scripts/capturas-bustos.mjs [carpeta] [url] [tamaños separados por coma] [solo formato]
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const dir = resolve(process.argv[2] ?? 'capturas-bustos')
const url = process.argv[3] ?? 'http://localhost:5173'
const tamanios = (process.argv[4] ?? '360x780,412x915,1280x800').split(',')
const solo = process.argv[5]
mkdirSync(dir, { recursive: true })

/** Semillas de capturas-escenas: la persona es mano y le toca. */
const FORMATOS = [
  { formato: '1v1', semilla: 47 },
  { formato: '2v2', semilla: 183 },
  { formato: '3v3', semilla: 11 },
]
/** Cartas para la mesa (ninguna está en la mano de la persona con estas semillas). */
const CARTAS = [
  ['oro', 1], ['copa', 3], ['basto', 7], ['espada', 12], ['oro', 6], ['copa', 2],
  ['basto', 4], ['espada', 11], ['oro', 10], ['copa', 5], ['basto', 1], ['espada', 3],
].map(([palo, numero]) => ({ palo, numero }))

const SENIAS = {
  '2v2': [['senia', { de: 2, senia: 'pieza2' }], ['seniaPescada', { de: 1, senia: 'perico' }], ['seniaPescada', { de: 3, senia: null }]],
  '3v3': [
    ['senia', { de: 2, senia: 'pieza2' }],
    ['senia', { de: 4, senia: 'flor' }],
    ['seniaPescada', { de: 3, senia: 'unoBravo' }],
    ['seniaPescada', { de: 5, senia: null }],
    ['seniaPescada', { de: 1, senia: 'perica' }],
  ],
}

const nav = await chromium.launch()

async function escena({ ancho, alto, formato, semilla, bustos, picaPica = false, senias = false, archivo }) {
  const celular = ancho < 700
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: celular ? 2 : 1, isMobile: celular, hasTouch: celular })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
  await p.addInitScript((bustos) => localStorage.setItem('truco.perfil', JSON.stringify({ apodo: 'Luis', ojear: false, mesaBustos: bustos })), bustos)
  await p.goto(url + '/')
  await p.evaluate(
    async ({ formato, semilla, picaPica }) => {
      const { useJuego } = await import('/src/estado.ts')
      const { ConexionLocal } = await import('/src/conexion/local.ts')
      const c = new ConexionLocal({
        apodo: 'Luis', avatar: '', formato, nivelBots: 'facil', ayudas: true, semilla,
        config: { picaPica, picaPicaAlternado: false }, senias: { habilitadas: true, pescar: 'gestoYCarta' }, demoraBots: [1e9, 1e9],
      })
      window.__conexion = c
      useJuego.getState().conectar(c)
      history.pushState({}, '', '/mesa')
      dispatchEvent(new PopStateEvent('popstate'))
    },
    { formato, semilla, picaPica },
  )
  await p.waitForSelector('.mi-mano .carta')
  await p.waitForSelector('.asiento .avatar-dibujo')
  // Los bots señan al empezar la mano: se espera a que terminen sus gestos.
  await p.waitForFunction(() => !document.querySelector('.avatar[data-gesto]'), null, { timeout: 20_000 })
  // Dos vueltas jugadas por todos los del duelo (la primera, cerrada), el turno de uno y un canto.
  await p.evaluate(
    async ({ cartas, senias }) => {
      const { useJuego } = await import('/src/estado.ts')
      const s = useJuego.getState()
      const e = s.vista.mano.enfrentamientos[s.vista.mano.actual]
      const juegan = e.participantes
      let i = 0
      const jugadas = [0, 1].flatMap((vuelta) => juegan.map((asiento) => ({ asiento, carta: cartas[i++ % cartas.length], vuelta })))
      useJuego.setState({ mesa: { jugadas, vueltas: [{ resultado: 0, ganador: juegan[0] }] } })
      const c = window.__conexion
      const n = s.vista.jugadores.length
      const otro = juegan.find((a) => a !== 0) ?? 1
      c.emitir('turno', { asientos: [otro], venceEn: Date.now() + 25_000 })
      if (!senias) c.emitir('eventos', [{ tipo: 'cantoTruco', asiento: n === 2 ? 1 : n - 1, canto: 'truco' }])
    },
    { cartas: CARTAS, senias: !!senias },
  )
  if (senias) {
    await p.evaluate((ms) => {
      for (const [tipo, datos] of ms) window.__conexion.emitir(tipo, datos)
    }, senias)
    await p.waitForTimeout(150)
    // A mitad de la seña: el avatar ya creció y la cara hace el gesto.
    await p.evaluate(() => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 900 }))
  } else {
    await p.waitForTimeout(500)
  }
  // En escritorio, solo la mesa (el resto de la pantalla es fondo).
  const caja = celular ? null : await p.locator('.pantalla-mesa').boundingBox()
  await p.screenshot({ path: `${dir}/${archivo}.png`, clip: caja ?? undefined })
  await ctx.close()
}

for (const t of tamanios) {
  const [ancho, alto] = t.split('x').map(Number)
  const filas = []
  for (const f of FORMATOS.filter((f) => !solo || f.formato === solo)) {
    const base = { ancho, alto, ...f }
    const fila = { titulo: f.formato, celdas: [] }
    const capturar = async (nombre, titulo, extra) => {
      const archivo = `${t}-${f.formato}-${nombre}`
      await escena({ ...base, ...extra, archivo })
      fila.celdas.push({ titulo, archivo })
    }
    await capturar('circulos', 'Hoy (círculos)', { bustos: false })
    await capturar('bustos', 'Bustos', { bustos: true })
    if (SENIAS[f.formato]) {
      await capturar('circulos-senia', 'Hoy, con señas', { bustos: false, senias: SENIAS[f.formato] })
      await capturar('bustos-senia', 'Bustos, con señas', { bustos: true, senias: SENIAS[f.formato] })
    }
    if (f.formato === '3v3') await capturar('bustos-pica', 'Bustos, pica-pica', { bustos: true, picaPica: true })
    filas.push(fila)
  }
  // El resumen: una fila por formato, una columna por variante.
  const anchoCelda = ancho < 700 ? Math.round(ancho * 0.62) : 400
  const columnas = Math.max(...filas.map((f) => f.celdas.length))
  const html = `<html><body style="margin:0;padding:16px;background:#222;color:#eee;font:600 18px system-ui">
    <h1 style="margin:0 0 12px;font-size:22px">Mesa de bustos · ${t}</h1>
    ${filas
      .map(
        (f) => `<div style="display:flex;gap:14px;margin-bottom:18px;align-items:flex-start">
        <div style="width:60px;font-size:26px">${f.titulo}</div>
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
  const ctx = await nav.newContext({ viewport: { width: 110 + columnas * (anchoCelda + 16), height: 400 } })
  const p = await ctx.newPage()
  await p.setContent(html)
  await p.waitForLoadState('load')
  await p.screenshot({ path: `${dir}/resumen-${t}.png`, fullPage: true })
  await ctx.close()
  console.log('listo', t)
}
await nav.close()
