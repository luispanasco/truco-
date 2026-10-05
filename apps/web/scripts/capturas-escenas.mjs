/**
 * Capturas de escenas armadas a mano, para revisar la mesa en los casos que cuesta pescar
 * jugando: flor con "Te toca" y Mazo, globos de varios a la vez, señas y gestos, tu globo
 * con el mazo abajo a la izquierda, y las explicaciones de las ayudas. Usa la conexión local con una semilla fija y bots
 * quietos, y mete en el store los mensajes de la escena (chat, cantos, señas).
 * Uso, con la web levantada (pnpm web):
 *   node scripts/capturas-escenas.mjs [carpeta] [url] [ancho x alto]
 */
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const dir = process.argv[2] ?? 'capturas'
const url = process.argv[3] ?? 'http://localhost:5173'
const [ancho, alto] = (process.argv[4] ?? '390x844').split('x').map(Number)
const celular = ancho < 700
mkdirSync(dir, { recursive: true })

const LARGO = 'Che, ¿tenés algo para el envido? Yo vengo bastante bien, jugá tranquilo'

/**
 * Semillas en las que la persona (asiento 0) es mano y tiene flor: así le toca, el mazo
 * queda abajo a la izquierda y aparece la ficha de la flor.
 *   1v1 47: 5 de espadas (pieza), 12 y 7 de oros; flor 35.
 *   2v2 183: 6, 7 y 5 de espadas; flor 38.
 *   3v3 11: 10, 6 y 11 de copas con muestra el 4 de copas; flor 40 (dos piezas).
 */
const ESCENAS = [
  { nombre: 'flor-1v1', formato: '1v1', semilla: 47 },
  { nombre: 'flor-2v2', formato: '2v2', semilla: 183 },
  { nombre: 'flor-3v3', formato: '3v3', semilla: 11, picaPica: false },
  { nombre: 'flor-3v3-reloj', formato: '3v3', semilla: 11, picaPica: false, reloj: true },
  { nombre: 'pica-3v3', formato: '3v3', semilla: 11, picaPica: true },
  { nombre: 'sin-senias-2v2', formato: '2v2', semilla: 183, senias: false },
  {
    nombre: 'chat-3v3',
    formato: '3v3',
    semilla: 11,
    picaPica: false,
    mensajes: [
      ['chat', { de: 3, apodo: 'Bot Tito', texto: LARGO, canal: 'general' }],
      ['chat', { de: 2, apodo: 'Bot Chela', texto: 'Vamo arriba que esta es nuestra', canal: 'equipo' }],
      ['chat', { de: 4, apodo: 'Bot Mirta', texto: 'Yo tengo para matar la primera', canal: 'equipo' }],
    ],
  },
  {
    nombre: 'canto-chat-3v3',
    formato: '3v3',
    semilla: 11,
    picaPica: false,
    mensajes: [
      ['eventos', [{ tipo: 'cantoTruco', asiento: 3, canto: 'truco' }]],
      ['chat', { de: 3, apodo: 'Bot Tito', texto: 'Esta la ganamos', canal: 'general' }],
      ['eventos', [{ tipo: 'cantoEnvido', asiento: 2, canto: 'envido', primeroEstaElEnvido: false }]],
      ['chat', { de: 2, apodo: 'Bot Chela', texto: LARGO, canal: 'general' }],
      ['chat', { de: 4, apodo: 'Bot Mirta', texto: 'Dale nomás', canal: 'general' }],
    ],
  },
  {
    nombre: 'mis-globos-2v2',
    formato: '2v2',
    semilla: 183,
    mensajes: [
      ['eventos', [{ tipo: 'cantoFlor', asiento: 0, canto: 'flor' }]],
      ['chat', { de: 0, apodo: 'Luis', texto: LARGO, canal: 'general' }],
      ['seniaPescada', { de: 3, senia: 'unoBravo' }],
    ],
  },
  {
    nombre: 'mis-globos-3v3',
    formato: '3v3',
    semilla: 11,
    picaPica: false,
    mensajes: [
      ['eventos', [{ tipo: 'cantoFlor', asiento: 0, canto: 'flor' }]],
      ['chat', { de: 0, apodo: 'Luis', texto: LARGO, canal: 'general' }],
      ['seniaPescada', { de: 5, senia: 'unoBravo' }],
      ['eventos', [{ tipo: 'cantoTruco', asiento: 1, canto: 'truco' }]],
    ],
  },
  // Ayudas: tocar la estrella de una carta o la ficha del tanto muestra la explicación.
  { nombre: 'ayuda-estrella-3v3', formato: '3v3', semilla: 11, picaPica: false, tocar: '.estrella-ayuda' },
  { nombre: 'ayuda-flor-3v3', formato: '3v3', semilla: 11, picaPica: false, tocar: '.mi-tanto' },
  { nombre: 'ayuda-envido-1v1', formato: '1v1', semilla: 3, tocar: '.mi-tanto' },
  { nombre: 'gesto-2v2', formato: '2v2', semilla: 183, espera: 700, mensajes: [['senia', { de: 2, senia: 'pieza2' }], ['seniaPescada', { de: 1, senia: 'perico' }], ['seniaPescada', { de: 3, senia: null }]] },
  { nombre: 'gesto-3v3', formato: '3v3', semilla: 11, picaPica: false, espera: 700, mensajes: [['senia', { de: 2, senia: 'pieza2' }], ['senia', { de: 4, senia: 'flor' }], ['seniaPescada', { de: 3, senia: 'unoBravo' }], ['seniaPescada', { de: 5, senia: null }], ['seniaPescada', { de: 1, senia: 'perica' }]] },
]

const solo = process.argv[5]
const nav = await chromium.launch()
for (const esc of ESCENAS.filter((e) => !solo || e.nombre.includes(solo))) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: celular ? 2 : 1, isMobile: celular, hasTouch: celular })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
  // Sin ojeo: la mano llega abierta, como queda después de ojear.
  await p.addInitScript(() => localStorage.setItem('truco.perfil', JSON.stringify({ apodo: 'Luis', ojear: false })))
  await p.goto(url + '/')
  await p.evaluate(async (esc) => {
    const { useJuego } = await import('/src/estado.ts')
    const { ConexionLocal } = await import('/src/conexion/local.ts')
    const c = new ConexionLocal({
      apodo: 'Luis',
      avatar: '🧉',
      formato: esc.formato,
      nivelBots: 'facil',
      ayudas: true,
      semilla: esc.semilla,
      config: { picaPica: esc.picaPica ?? false },
      senias: { habilitadas: esc.senias ?? true, pescar: 'gestoYCarta' },
      // Bots quietos: la escena no cambia mientras se saca la foto.
      demoraBots: [1e9, 1e9],
    })
    window.__conexion = c
    useJuego.getState().conectar(c)
    history.pushState({}, '', '/mesa')
    dispatchEvent(new PopStateEvent('popstate'))
  }, esc)
  await p.waitForSelector('.mi-mano .carta')
  await p.waitForTimeout(900)
  await p.evaluate((esc) => {
    const c = window.__conexion
    if (esc.reloj) c.emitir('turno', { asientos: [0], venceEn: Date.now() + 28_000 })
    for (const [tipo, datos] of esc.mensajes ?? []) c.emitir(tipo, tipo === 'chat' ? { ...datos, hora: Date.now() } : datos)
  }, esc)
  if (esc.tocar) await p.locator(esc.tocar).last().click()
  await p.waitForTimeout(esc.espera ?? 450)
  await p.screenshot({ path: `${dir}/${esc.nombre}.png` })
  // Medidas para comparar sin mirar: alto de la zona de abajo y del paño.
  const medidas = await p.evaluate(() => {
    const alto = (s) => Math.round(document.querySelector(s)?.getBoundingClientRect().height ?? 0)
    const tanto = document.querySelector('.mi-tanto')
    return { miLugar: alto('.mi-lugar'), tapete: alto('.tapete'), tantoCortado: tanto ? tanto.scrollWidth > tanto.clientWidth + 4 : null }
  })
  console.log(esc.nombre, JSON.stringify(medidas))
  await ctx.close()
}
await nav.close()
