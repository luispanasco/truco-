// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Evento } from '@truco/engine'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { PAUSA_ENTRE_MANOS, useJuego } from '../src/estado'

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
        resultado: { motivo: 'vueltas', ganador: 0, puntosTruco: 2, puntosTanto: [0, 0], revelados: [], mentirosos: [] },
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
          resultado: { motivo: 'mazo', ganador: 1, puntosTruco: 1, puntosTanto: [0, 0], revelados: [], mentirosos: [] },
        },
        { tipo: 'partidaTerminada', ganador: 1, puntos: [20, 30] },
      ],
    })
    expect(useJuego.getState().finDeMano).toBeNull()
  })
})
