import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Evento, VistaPartida } from '@truco/engine'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { useJuego } from '../src/estado'
import { AjustesSonido, BotonSonido } from '../src/componentes/AjustesSonido'
import { sonarEvento, usarReproductor } from '../src/sonido'
import { AJUSTES_SONIDO_POR_DEFECTO, leerAjustesSonido, useAjustesSonido } from '../src/sonido/ajustes'
import { Reproductor } from '../src/sonido/reproductor'
import { packElegido, urlDeVoz, type PackVoces } from '../src/sonido/voces'

/** Contexto de audio de mentira: anota qué arranca, cuándo y con qué volumen. */
class ContextoFalso {
  state = 'suspended'
  currentTime = 10
  destination = {}
  iniciados: { buffer: unknown; cuando: number; volumen: number }[] = []
  resume = vi.fn(async () => {
    this.state = 'running'
  })
  decodeAudioData = vi.fn(async (datos: ArrayBuffer) => ({ duration: 0.5, datos }) as unknown as AudioBuffer)
  createGain() {
    return { gain: { value: 1 }, connect: (x: unknown) => x }
  }
  createBufferSource() {
    const fuente = {
      buffer: null as unknown,
      onended: null as null | (() => void),
      ganancia: null as null | { gain: { value: number } },
      connect: (g: { gain: { value: number } }) => {
        fuente.ganancia = g
        return g
      },
      start: (cuando: number) => this.iniciados.push({ buffer: fuente.buffer, cuando, volumen: fuente.ganancia!.gain.value }),
    }
    return fuente
  }
}

const esperar = () => new Promise((r) => setTimeout(r, 0))

function armar(bajar: (url: string) => Promise<ArrayBuffer> = async (url) => new TextEncoder().encode(url).buffer as ArrayBuffer) {
  const contexto = new ContextoFalso()
  let ahora = 0
  const r = new Reproductor({ crearContexto: () => contexto as unknown as AudioContext, bajar, ahora: () => ahora })
  return { r, contexto, avanzar: (ms: number) => (ahora += ms) }
}

describe('reproductor', () => {
  it('no suena nada hasta que la persona toca la página', async () => {
    const { r, contexto } = armar()
    expect(r.reproducir('/a.ogg', 1)).toBe(false)
    await esperar()
    expect(contexto.iniciados).toHaveLength(0)
    r.desbloquear()
    expect(contexto.resume).toHaveBeenCalled()
    expect(r.reproducir('/a.ogg', 1)).toBe(true)
    await esperar()
    expect(contexto.iniciados).toHaveLength(1)
  })

  it('usa el volumen, y con volumen 0 no suena', async () => {
    const { r, contexto, avanzar } = armar()
    r.desbloquear()
    r.reproducir('/a.ogg', 0.35)
    avanzar(500)
    expect(r.reproducir('/a.ogg', 0)).toBe(false)
    await esperar()
    expect(contexto.iniciados.map((i) => i.volumen)).toEqual([0.35])
  })

  it('el mismo sonido dos veces seguidas suena una vez; con un rato de diferencia, dos', async () => {
    const { r, contexto, avanzar } = armar()
    r.desbloquear()
    expect(r.reproducir('/a.ogg', 1)).toBe(true)
    expect(r.reproducir('/a.ogg', 1)).toBe(false)
    expect(r.reproducir('/b.ogg', 1)).toBe(true)
    avanzar(100)
    expect(r.reproducir('/a.ogg', 1)).toBe(true)
    await esperar()
    expect(contexto.iniciados).toHaveLength(3)
  })

  it('decodifica cada archivo una sola vez, y respeta el retraso', async () => {
    const { r, contexto, avanzar } = armar()
    r.desbloquear()
    r.precargar(['/a.ogg'])
    await esperar()
    r.reproducir('/a.ogg', 1, 200)
    avanzar(1000)
    r.reproducir('/a.ogg', 1)
    await esperar()
    expect(contexto.decodeAudioData).toHaveBeenCalledTimes(1)
    expect(contexto.iniciados.map((i) => i.cuando)).toEqual([10.2, 10])
  })

  it('una serie suena una atrás de la otra', async () => {
    const { r, contexto } = armar()
    r.desbloquear()
    r.serie(['/primero.ogg', '/segundo.ogg'], 1)
    await esperar()
    expect(contexto.iniciados.map((i) => i.cuando)).toEqual([10, 10.5])
  })

  it('si un archivo no baja, no suena y se vuelve a intentar', async () => {
    let falla = true
    const { r, contexto, avanzar } = armar(async () => {
      if (falla) throw new Error('sin red')
      return new ArrayBuffer(4)
    })
    r.desbloquear()
    r.reproducir('/a.ogg', 1)
    await esperar()
    expect(contexto.iniciados).toHaveLength(0)
    falla = false
    avanzar(100)
    r.reproducir('/a.ogg', 1)
    await esperar()
    expect(contexto.iniciados).toHaveLength(1)
  })
})

/** Anota lo que se pide sonar, sin audio. */
class ReproductorEspia extends Reproductor {
  pedidos: { urls: readonly string[]; volumen: number; retraso: number }[] = []
  override serie(urls: readonly string[], volumen: number, retrasoMs = 0): boolean {
    this.pedidos.push({ urls, volumen, retraso: retrasoMs })
    return true
  }
}

const PACK: PackVoces = { id: 'prueba', nombre: 'Prueba', archivos: { truco: 'truco.webm', realEnvido: 'real.webm', envidoVaPrimero: 'primero.webm', quiero: 'quiero.webm' } }
const carta = (numero: 1 | 4, palo: 'espada' | 'oro') => ({ numero, palo }) as const

function conexionFalsa() {
  let oyente: ((m: MensajeServidor) => void) | null = null
  const c: Conexion = {
    tipo: 'local',
    enviar: () => {},
    escuchar: (o) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { c, llegar: (eventos: Evento[]) => oyente!({ tipo: 'eventos', datos: eventos }) }
}

describe('sonidos de la mesa', () => {
  let espia: ReproductorEspia
  beforeEach(() => {
    localStorage.clear()
    useAjustesSonido.getState().cambiar(AJUSTES_SONIDO_POR_DEFECTO)
    espia = new ReproductorEspia()
  })
  afterEach(() => {
    useJuego.getState().salir()
    usarReproductor(new Reproductor())
    cleanup()
  })

  it('cada evento de la mesa dispara su efecto', () => {
    usarReproductor(espia)
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar([
      { tipo: 'manoRepartida', numero: 1, reparte: 1, mano: 0, muestra: carta(4, 'oro'), picaPica: false },
      { tipo: 'cartaJugada', asiento: 0, carta: carta(1, 'espada') },
      { tipo: 'cartaJugada', asiento: 1, carta: carta(4, 'oro') },
      { tipo: 'vueltaTerminada', indice: 0, resultado: 0, ganador: 0 },
      { tipo: 'puntos', puntos: [2, 1] },
    ])
    expect(espia.pedidos.map((p) => [p.urls[0], p.retraso])).toEqual([
      ['/sonidos/repartir.ogg', 0],
      // Las cartas alternan entre dos sonidos.
      ['/sonidos/carta-1.ogg', 0],
      ['/sonidos/carta-2.ogg', 0],
      ['/sonidos/vuelta.ogg', 280],
      // Un tic por cada fósforo sumado (3), uno atrás del otro.
      ['/sonidos/punto.ogg', 0],
      ['/sonidos/punto.ogg', 110],
      ['/sonidos/punto.ogg', 220],
    ])
    expect(espia.pedidos.every((p) => p.volumen === AJUSTES_SONIDO_POR_DEFECTO.volumen)).toBe(true)
  })

  it('el primer reparto (que llega como vista, sin evento) también suena, una sola vez', () => {
    usarReproductor(espia)
    let oyente: ((m: MensajeServidor) => void) | null = null
    useJuego.getState().conectar({ tipo: 'local', enviar: () => {}, escuchar: (o) => ((oyente = o), () => {}), salir: () => {} })
    const vista = { mano: { enfrentamientos: [], actual: 0 }, ganador: null, puntos: [0, 0] } as unknown as VistaPartida
    oyente!({ tipo: 'vista', datos: vista })
    oyente!({ tipo: 'vista', datos: vista })
    expect(espia.pedidos.map((p) => p.urls[0])).toEqual(['/sonidos/repartir.ogg'])
  })

  it('los fósforos cuentan desde el tanteador de antes', () => {
    usarReproductor(espia)
    sonarEvento({ tipo: 'puntos', puntos: [9, 4] }, [8, 4])
    expect(espia.pedidos).toHaveLength(1)
    sonarEvento({ tipo: 'puntos', puntos: [30, 4] }, [10, 4])
    expect(espia.pedidos).toHaveLength(7)
  })

  it('sin pack de voces, los cantos no suenan (queda el globo)', () => {
    usarReproductor(espia, [])
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar([{ tipo: 'cantoTruco', asiento: 1, canto: 'truco' }])
    expect(useJuego.getState().globos[1]?.texto).toBe('¡Truco!')
    expect(espia.pedidos).toHaveLength(0)
  })

  it('con pack, suena la voz del canto si la tiene', () => {
    usarReproductor(espia, [PACK])
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar([
      { tipo: 'cantoTruco', asiento: 1, canto: 'truco' },
      { tipo: 'respuesta', asiento: 0, a: 'truco', respuesta: 'quiero' },
      { tipo: 'cantoTruco', asiento: 0, canto: 'retruco' },
      { tipo: 'cantoEnvido', asiento: 1, canto: 'realEnvido', primeroEstaElEnvido: true },
    ])
    expect(espia.pedidos.map((p) => p.urls)).toEqual([
      ['/voces/prueba/truco.webm'],
      ['/voces/prueba/quiero.webm'],
      // El retruco no está en el pack: no se pide nada.
      [],
      ['/voces/prueba/primero.webm', '/voces/prueba/real.webm'],
    ])
  })

  it('silenciado no suena ningún efecto, y sin voz no suenan los cantos', () => {
    usarReproductor(espia, [PACK])
    useAjustesSonido.getState().cambiar({ efectos: false, voz: false })
    sonarEvento({ tipo: 'cartaJugada', asiento: 0, carta: carta(1, 'espada') })
    sonarEvento({ tipo: 'cantoTruco', asiento: 0, canto: 'truco' })
    expect(espia.pedidos).toHaveLength(0)
    useAjustesSonido.getState().cambiar({ efectos: true, volumen: 0.2 })
    sonarEvento({ tipo: 'cartaJugada', asiento: 0, carta: carta(1, 'espada') })
    expect(espia.pedidos.map((p) => p.volumen)).toEqual([0.2])
  })
})

describe('packs de voces', () => {
  it('elige el pack pedido o el primero, y arma la dirección de cada canto', () => {
    const otro = { ...PACK, id: 'otro' }
    expect(packElegido('otro', [PACK, otro])).toBe(otro)
    expect(packElegido('no existe', [PACK, otro])).toBe(PACK)
    expect(packElegido(null, [])).toBeNull()
    expect(urlDeVoz(PACK, 'truco')).toBe('/voces/prueba/truco.webm')
    expect(urlDeVoz(PACK, 'flor')).toBeNull()
  })
})

describe('ajustes de sonido', () => {
  beforeEach(() => {
    localStorage.clear()
    useAjustesSonido.getState().cambiar(AJUSTES_SONIDO_POR_DEFECTO)
    usarReproductor(new ReproductorEspia(), [])
  })
  afterEach(() => {
    cleanup()
    usarReproductor(new Reproductor())
  })

  it('se guardan con su propia clave, y lo roto vuelve a los valores por defecto', () => {
    useAjustesSonido.getState().cambiar({ volumen: 3 })
    expect(JSON.parse(localStorage.getItem('truco.sonido')!).volumen).toBe(1)
    localStorage.setItem('truco.sonido', '{"efectos":"si","volumen":-2}')
    expect(leerAjustesSonido()).toEqual({ ...AJUSTES_SONIDO_POR_DEFECTO, volumen: 0 })
    localStorage.setItem('truco.sonido', 'no es json')
    expect(leerAjustesSonido()).toEqual(AJUSTES_SONIDO_POR_DEFECTO)
  })

  it('en el inicio: efectos con volumen, y la voz desactivada con "Pronto"', () => {
    render(<AjustesSonido />)
    const voz = screen.getByRole<HTMLInputElement>('switch', { name: /Voz de los cantos/ })
    expect(voz.disabled).toBe(true)
    expect(voz.checked).toBe(false)
    expect(screen.getByText('Pronto')).toBeTruthy()

    fireEvent.change(screen.getByRole('slider'), { target: { value: '40' } })
    expect(useAjustesSonido.getState().volumen).toBe(0.4)

    fireEvent.click(screen.getByRole('switch', { name: /Efectos de sonido/ }))
    expect(useAjustesSonido.getState().efectos).toBe(false)
    expect(screen.queryByRole('slider')).toBeNull()
  })

  it('el botón de la mesa silencia y vuelve a prender', () => {
    render(<BotonSonido />)
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar los sonidos' }))
    expect(useAjustesSonido.getState().efectos).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Prender los sonidos' }))
    expect(useAjustesSonido.getState().efectos).toBe(true)
  })
})
