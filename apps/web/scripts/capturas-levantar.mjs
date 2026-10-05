/**
 * Capturas de las cartas que se levantan en cada vuelta (opción de sala "Cartas jugadas"):
 * vuelta cerrada con la ganadora, mientras se levanta, la mesa ya levantada y la vuelta
 * siguiente. Juega contra la compu con una semilla fija; la persona tira la primera carta que
 * puede y, cerrada la primera vuelta, espera a que se saquen las fotos.
 * Uso, con la web levantada (pnpm web):
 *   node scripts/capturas-levantar.mjs [carpeta] [url] [ancho x alto] [filtro]
 */
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const dir = process.argv[2] ?? 'capturas'
const url = process.argv[3] ?? 'http://localhost:5173'
const [ancho, alto] = (process.argv[4] ?? '360x780').split('x').map(Number)
const celular = ancho < 700
mkdirSync(dir, { recursive: true })

const ESCENAS = [
  { nombre: '1v1', formato: '1v1', semilla: 47 },
  { nombre: '2v2', formato: '2v2', semilla: 183 },
  { nombre: '3v3', formato: '3v3', semilla: 11 },
  { nombre: 'pica', formato: '3v3', semilla: 11, picaPica: true },
  { nombre: '2v2-sentados', formato: '2v2', semilla: 183, bustos: true },
  { nombre: '3v3-sentados', formato: '3v3', semilla: 11, bustos: true },
]

const solo = process.argv[5]
const nav = await chromium.launch()
for (const esc of ESCENAS.filter((e) => !solo || e.nombre.includes(solo))) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: celular ? 2 : 1, isMobile: celular, hasTouch: celular })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => console.log('ERROR EN PÁGINA:', e.message))
  await p.addInitScript((bustos) => localStorage.setItem('truco.perfil', JSON.stringify({ apodo: 'Luis', ojear: false, mesaBustos: bustos })), !!esc.bustos)
  await p.goto(url + '/')
  await p.evaluate(async (esc) => {
    const { useJuego } = await import('/src/estado.ts')
    const { ConexionLocal } = await import('/src/conexion/local.ts')
    const c = new ConexionLocal({
      apodo: 'Luis',
      avatar: null,
      formato: esc.formato,
      nivelBots: 'facil',
      ayudas: true,
      semilla: esc.semilla,
      cartasJugadas: 'seLevantan',
      config: { picaPica: esc.picaPica ?? false, picaPicaAlternado: false },
      senias: { habilitadas: false },
      // Bots con demora fija, y la pausa de siempre al cerrar la vuelta.
      demoraBots: [700, 700],
      pausas: { vuelta: 900, mano: 2700 },
    })
    // La persona juega sola mientras `__jugar` esté prendido: tira la primera carta que puede.
    window.__jugar = true
    useJuego.subscribe((s) => {
      if (s.mesa.vueltas.length >= 1 && !window.__cerrada) {
        window.__cerrada = true
        window.__jugar = false
      }
      const v = s.vista
      if (!window.__jugar || !v || !v.esperandoA.includes(0) || window.__pensando) return
      window.__pensando = true
      setTimeout(() => {
        window.__pensando = false
        const vv = useJuego.getState().vista
        if (!window.__jugar || !vv?.esperandoA.includes(0)) return
        const a = vv.accionesValidas
        const accion =
          a.find((x) => x.tipo === 'jugarCarta') ??
          a.find((x) => x.tipo === 'responder' && x.respuesta === 'quiero') ??
          a.find((x) => x.tipo !== 'irseAlMazo') ??
          a[0]
        if (accion) c.enviar('accion', { accion })
      }, 400)
    })
    useJuego.getState().conectar(c)
    history.pushState({}, '', '/mesa')
    dispatchEvent(new PopStateEvent('popstate'))
  }, esc)
  await p.waitForSelector('.mi-mano .carta')
  await p.waitForFunction(() => window.__cerrada === true, null, { timeout: 30_000 })
  const t0 = Date.now()
  const foto = async (paso, ms) => {
    await p.waitForTimeout(Math.max(0, ms - (Date.now() - t0)))
    const cartas = await p.locator('.cartas-en-mesa .jugada').count()
    await p.screenshot({ path: `${dir}/${esc.nombre}-${paso}.png` })
    console.log(esc.nombre, paso, `${Date.now() - t0} ms`, `${cartas} cartas en la mesa`)
  }
  await foto('1-cerrada', 400)
  await foto('2-levantando', 1350)
  await foto('3-levantada', 1900)
  // Sigue la mano: la vuelta siguiente cae sola en la mesa.
  await p.evaluate(() => {
    window.__jugar = true
    window.__pensando = false
  })
  await p.evaluate(async () => {
    const { useJuego } = await import('/src/estado.ts')
    const s = useJuego.getState()
    useJuego.setState({ vista: s.vista ? { ...s.vista } : s.vista })
  })
  const listo = await p
    .waitForFunction(() => document.querySelectorAll('.cartas-en-mesa .jugada').length >= 2, null, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false)
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${dir}/${esc.nombre}-4-siguiente.png` })
  console.log(esc.nombre, '4-siguiente', listo ? '' : '(no llegaron dos cartas)', await p.locator('.cartas-en-mesa .jugada').count(), 'cartas en la mesa')
  await ctx.close()
}
await nav.close()
