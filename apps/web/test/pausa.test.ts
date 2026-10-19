// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Evento } from '@truco/engine'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { PAUSA_ENTRE_MANOS, useJuego } from '../src/estado'
import { CORTE_MS, GIRO_MS, REPARTO_MS } from '../src/componentes/Mazo'

/** Conexión de mentira: el test decide qué mensajes llegan. */
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
  return { c, llegar: (m: MensajeServidor) => oyente!(m) }
}

const carta = (numero: 1 | 4, palo: 'espada' | 'oro') => ({ numero, palo }) as const

afterEach(() => {
  useJuego.getState().salir()
  vi.useRealTimers()
})

describe('pausa entre manos', () => {
  it('deja las cartas y el resultado a la vista, y después levanta la mesa y sigue', () => {
    vi.useFakeTimers()
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)

    const finDeMano: Evento[] = [
      { tipo: 'cartaJugada', asiento: 0, carta: carta(1, 'espada') },
      { tipo: 'cartaJugada', asiento: 1, carta: carta(4, 'oro') },
      { tipo: 'vueltaTerminada', indice: 2, resultado: 0, ganador: 0 },
      {
        tipo: 'enfrentamientoTerminado',
        indice: 0,
        participantes: [0, 1],
        muestra: carta(4, 'oro'),
        picaPica: false,
        resultado: { motivo: 'vueltas', ganador: 0, puntosTruco: 2, puntosTanto: [0, 0], revelados: [], mentirosos: [], mostradas: [] },
      },
      { tipo: 'puntos', puntos: [2, 0] },
      { tipo: 'manoRepartida', numero: 2, reparte: 0, mano: 1, muestra: carta(4, 'oro'), picaPica: false },
    ]
    llegar({ tipo: 'eventos', datos: finDeMano })

    // Durante la pausa: las dos cartas siguen en la mesa y se ve el resultado.
    let s = useJuego.getState()
    expect(s.mesa.jugadas).toHaveLength(2)
    expect(s.finDeMano).toContain('2 puntos')
    // Lo de la mano nueva (el reparto y la vista) todavía no se aplicó.
    llegar({ tipo: 'turno', datos: { asientos: [1], venceEn: null } })
    expect(useJuego.getState().turno.asientos).toEqual([])
    expect(s.registro.some((l) => l.texto.includes('Mano 2'))).toBe(false)

    vi.advanceTimersByTime(PAUSA_ENTRE_MANOS + 10)
    s = useJuego.getState()
    expect(s.finDeMano).toBeNull()
    expect(s.mesa.jugadas).toHaveLength(0)
    expect(s.turno.asientos).toEqual([1])
    expect(s.registro.some((l) => l.texto.includes('Mano 2'))).toBe(true)
  })

  it('al terminar la partida no hay pausa', () => {
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar({
      tipo: 'eventos',
      datos: [
        {
          tipo: 'enfrentamientoTerminado',
          indice: 0,
          participantes: [0, 1],
          muestra: carta(4, 'oro'),
          picaPica: false,
          resultado: { motivo: 'mazo', ganador: 1, puntosTruco: 1, puntosTanto: [0, 0], revelados: [], mentirosos: [], mostradas: [] },
        },
        { tipo: 'partidaTerminada', ganador: 1, puntos: [20, 30] },
      ],
    })
    expect(useJuego.getState().finDeMano).toBeNull()
  })

  it('las cartas de todas las vueltas quedan en la mesa, cada una con su vuelta', () => {
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar({
      tipo: 'eventos',
      datos: [
        { tipo: 'cartaJugada', asiento: 0, carta: carta(1, 'espada') },
        { tipo: 'cartaJugada', asiento: 1, carta: carta(4, 'oro') },
        { tipo: 'vueltaTerminada', indice: 0, resultado: 0, ganador: 0 },
        { tipo: 'cartaJugada', asiento: 0, carta: carta(4, 'espada') },
      ],
    })
    const { mesa } = useJuego.getState()
    expect(mesa.jugadas.map((j) => j.vuelta)).toEqual([0, 0, 1])
    expect(mesa.vueltas).toEqual([{ resultado: 0, ganador: 0 }])
  })

  it('en la pausa se ven las cartas que dio vuelta quien cantó flor o ganó el envido', () => {
    vi.useFakeTimers()
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar({
      tipo: 'eventos',
      datos: [
        {
          tipo: 'enfrentamientoTerminado',
          indice: 0,
          participantes: [0, 1],
          muestra: carta(4, 'oro'),
          picaPica: false,
          resultado: {
            motivo: 'mazo',
            ganador: 1,
            puntosTruco: 1,
            puntosTanto: [0, 5],
            revelados: [
              { asiento: 1, envido: 33, flor: 38 },
              { asiento: 2, envido: 31, flor: null },
            ],
            mentirosos: [],
            mostradas: [
              { asiento: 1, cartas: [carta(1, 'oro'), carta(4, 'oro')] },
              { asiento: 2, cartas: [carta(4, 'espada')] },
            ],
          },
        },
        { tipo: 'puntos', puntos: [0, 5] },
      ],
    })
    expect(useJuego.getState().mostradas.map((m) => [m.asiento, m.etiqueta, m.cartas.length])).toEqual([
      [1, 'Flor de 38', 2],
      [2, 'Envido 31', 1],
    ])
    vi.advanceTimersByTime(PAUSA_ENTRE_MANOS + 10)
    expect(useJuego.getState().mostradas).toEqual([])
  })
})

describe('la tirada de reyes en la mesa', () => {
  const sala = (apodos: string[]) =>
    ({
      lugares: apodos.map((apodo, asiento) => ({ asiento, tipo: 'bot', apodo, avatar: null, conectado: true, anfitrion: false })),
      yo: 0,
    }) as unknown as import('@truco/shared').InfoSala

  it('la primera mano espera a que termine la tirada (la sala nueva no) y después se pasa de a poco', () => {
    vi.useFakeTimers()
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar({
      tipo: 'reyes',
      datos: { tiradas: [{ asiento: 1, carta: { numero: 12, palo: 'oro' } }], reparte: 1, equipos: null, apodos: ['Ana', 'Beto'] },
    })
    llegar({ tipo: 'sala', datos: sala(['Ana', 'Beto']) })
    llegar({ tipo: 'turno', datos: { asientos: [0], venceEn: null } })
    llegar({ tipo: 'eventos', datos: [{ tipo: 'corte', asiento: 0, corte: 'convencional' }] })
    llegar({ tipo: 'eventos', datos: [{ tipo: 'cartaJugada', asiento: 1, carta: carta(4, 'oro') }] })
    let s = useJuego.getState()
    expect(s.reyes?.enMesa).toBe(true)
    expect(s.sala?.lugares).toHaveLength(2)
    expect(s.turno.asientos).toEqual([])
    expect(s.corte).toBeNull()

    // Terminó la tirada: el corte enseguida; la carta del bot, después de verse el corte.
    useJuego.getState().cerrarReyes()
    s = useJuego.getState()
    expect(s.reyes).toBeNull()
    expect(s.turno.asientos).toEqual([0])
    expect(s.corte?.corte).toBe('convencional')
    expect(s.mesa.jugadas).toHaveLength(0)
    // Lo que llega mientras tanto espera detrás.
    llegar({ tipo: 'turno', datos: { asientos: [1], venceEn: null } })
    expect(useJuego.getState().turno.asientos).toEqual([0])
    vi.advanceTimersByTime(2200)
    s = useJuego.getState()
    expect(s.mesa.jugadas).toHaveLength(1)
    expect(s.turno.asientos).toEqual([1])
  })

  it('si la mesa no avisa que terminó, la mano arranca igual', () => {
    vi.useFakeTimers()
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar({
      tipo: 'reyes',
      datos: { tiradas: [{ asiento: 0, carta: { numero: 12, palo: 'oro' } }], reparte: 0, equipos: null, apodos: ['Ana', 'Beto'] },
    })
    llegar({ tipo: 'turno', datos: { asientos: [1], venceEn: null } })
    expect(useJuego.getState().turno.asientos).toEqual([])
    vi.advanceTimersByTime(20_000)
    expect(useJuego.getState().reyes).toBeNull()
    expect(useJuego.getState().turno.asientos).toEqual([1])
  })
})

describe('las señas durante el reparto', () => {
  it('esperan a que termine el corte y el reparto, y después se ven', () => {
    vi.useFakeTimers()
    const { c, llegar } = conexionFalsa()
    useJuego.getState().conectar(c)
    llegar({ tipo: 'eventos', datos: [{ tipo: 'corte', asiento: 1, corte: 'convencional' }] })
    llegar({ tipo: 'senia', datos: { de: 2, senia: 'pieza2', mano: 1 } })
    llegar({ tipo: 'seniaPescada', datos: { de: 1, senia: null } })
    expect(useJuego.getState().senias).toEqual([])
    expect(useJuego.getState().pescadas).toEqual([])
    vi.advanceTimersByTime(CORTE_MS.convencional + REPARTO_MS + GIRO_MS + 10)
    expect(useJuego.getState().senias.map((s) => s.senia)).toEqual(['pieza2'])
    expect(useJuego.getState().pescadas).toHaveLength(1)
    // Con las cartas ya en la mano, llegan al instante.
    llegar({ tipo: 'senia', datos: { de: 2, senia: 'pieza4', mano: 1 } })
    expect(useJuego.getState().senias).toHaveLength(2)
  })
})
