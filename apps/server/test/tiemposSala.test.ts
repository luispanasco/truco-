import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import type { Accion } from '@truco/engine'
import { normalizarTiempos, TIEMPOS_SALA_DEFAULT } from '@truco/shared'
import { Jugador, levantar } from './helpers'

// Cada segundo de la sala dura 20 ms: 30 s de turno son 600 ms y 60 s de primera jugada, 1200 ms.
const MS_POR_SEGUNDO = 20
const MARGEN = 250
let colyseus: ColyseusTestServer

beforeAll(async () => {
  ;({ colyseus } = await levantar(2581, {
    tiempos: { msPorSegundo: MS_POR_SEGUNDO, botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, reconexionS: 1 },
  }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

/** Turnos con reloj que le llegaron a este jugador. */
const turnosPropios = (j: Jugador) => j.de('turno').filter((t) => t.venceEn !== null && t.asientos.includes(j.sala!.yo!))

/** Una jugada cualquiera, mejor tirar una carta; nunca al mazo. */
function jugadaCualquiera(j: Jugador): Accion {
  const validas = j.vista!.accionesValidas.filter((a) => a.tipo !== 'irseAlMazo')
  return validas.find((a) => a.tipo === 'jugarCarta') ?? validas[0]!
}

interface TurnoMedido {
  /** Lo que quedaba al recibir el turno. */
  restante: number
  mano: number
  /** Si este jugador era el mano y todavía no había pasado nada en la mano. */
  primera: boolean
}

/** Juega hasta empezar la mano `hasta` y devuelve cuánto tiempo le dieron en cada turno. */
async function jugarMidiendo(j: Jugador, hasta: number): Promise<TurnoMedido[]> {
  const medidos: TurnoMedido[] = []
  for (;;) {
    const vistos = turnosPropios(j).length
    await j.esperar(() => turnosPropios(j).length > vistos, 10_000, 'el próximo turno')
    const restante = turnosPropios(j).at(-1)!.venceEn! - Date.now()
    const v = j.vista!
    const e = v.mano.enfrentamientos.at(-1)!
    const nadaJugado = e.vueltas.every((vu) => vu.jugadas.length === 0)
    medidos.push({ restante, mano: v.mano.numero, primera: nadaJugado && e.mano === v.yo.asiento && !e.truco.pendiente })
    if (v.mano.numero >= hasta) return medidos
    j.enviar('accion', { accion: jugadaCualquiera(j) })
  }
}

describe('tiempos de la sala', () => {
  it('la primera jugada del mano tiene el tiempo largo y las demás el normal', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' }, tiempos: { turnoS: 30, primeraJugadaS: 60 } })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.tiempos).toEqual({ turnoS: 30, primeraJugadaS: 60 })
    a.enviar('iniciar', {})

    // a está en el asiento 0: es mano en la primera mano y en la tercera; el bot, en la segunda.
    const medidos = await jugarMidiendo(a, 3)
    const largo = 60 * MS_POR_SEGUNDO
    const normal = 30 * MS_POR_SEGUNDO

    const [primero, ...resto] = medidos
    expect(primero!.mano).toBe(1)
    expect(primero!.restante).toBeGreaterThan(largo - MARGEN)
    expect(primero!.restante).toBeLessThanOrEqual(largo)

    const ultimo = resto.pop()!
    // Al empezar la tercera mano, a vuelve a ser mano: otra vez el tiempo largo.
    expect(ultimo.mano).toBe(3)
    expect(ultimo.primera).toBe(true)
    expect(ultimo.restante).toBeGreaterThan(largo - MARGEN)

    // Todo lo del medio (jugadas, respuestas y la mano en la que a es pie) va con el normal.
    expect(resto.some((t) => t.mano === 2)).toBe(true)
    for (const t of resto) {
      expect(t.restante).toBeLessThanOrEqual(normal)
      expect(t.restante).toBeGreaterThan(normal - MARGEN)
    }
  }, 60_000)

  it('sin tiempos al crear, usa 30 s y 60 s', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.tiempos).toEqual(TIEMPOS_SALA_DEFAULT)
    expect(TIEMPOS_SALA_DEFAULT).toEqual({ turnoS: 30, primeraJugadaS: 60 })
  })

  it('el anfitrión cambia los tiempos en la espera; los demás no pueden', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.room.roomId)
    await b.esperar(() => b.sala?.yo !== null && b.sala !== null)

    a.enviar('configurar', { tiempos: { turnoS: 45, primeraJugadaS: 90 } })
    await b.esperar(() => b.sala!.tiempos.turnoS === 45, 5_000, 'los tiempos nuevos')
    expect(b.sala!.tiempos).toEqual({ turnoS: 45, primeraJugadaS: 90 })

    // Cambiar otra cosa no toca los tiempos.
    a.enviar('configurar', { ayudas: false })
    await a.esperar(() => a.sala!.ayudas === false)
    expect(a.sala!.tiempos).toEqual({ turnoS: 45, primeraJugadaS: 90 })

    b.enviar('configurar', { tiempos: { turnoS: 20 } })
    await b.esperar(() => b.de('error').length > 0, 5_000, 'el rechazo')
    expect(b.de('error')[0]!.motivo).toMatch(/anfitrión/)
    expect(a.sala!.tiempos.turnoS).toBe(45)

    // Los valores fuera de rango se llevan al límite.
    a.enviar('configurar', { tiempos: { turnoS: 2, primeraJugadaS: 10_000 } })
    await a.esperar(() => a.sala!.tiempos.turnoS === 15, 5_000, 'los tiempos ajustados')
    expect(a.sala!.tiempos).toEqual({ turnoS: 15, primeraJugadaS: 180 })

    // Empezada la partida, ya no se cambian.
    a.enviar('iniciar', {})
    await a.esperar(() => a.sala!.fase === 'jugando')
    a.enviar('configurar', { tiempos: { turnoS: 60 } })
    await a.esperar(() => a.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.sala!.tiempos.turnoS).toBe(15)
  })

  it('al crear, los tiempos inválidos se descartan o se ajustan', async () => {
    const a = await Jugador.crear(colyseus, {
      config: { formato: '1v1' },
      tiempos: { turnoS: 'mucho' as unknown as number, primeraJugadaS: 5 },
    })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.tiempos).toEqual({ turnoS: 30, primeraJugadaS: 30 })
  })
})

describe('normalizarTiempos', () => {
  it('completa con la base, redondea y respeta los límites', () => {
    expect(normalizarTiempos(undefined)).toEqual({ turnoS: 30, primeraJugadaS: 60 })
    expect(normalizarTiempos({ turnoS: 44.6 })).toEqual({ turnoS: 45, primeraJugadaS: 60 })
    expect(normalizarTiempos({ turnoS: 0, primeraJugadaS: 0 })).toEqual({ turnoS: 15, primeraJugadaS: 30 })
    expect(normalizarTiempos({ turnoS: 500, primeraJugadaS: 500 })).toEqual({ turnoS: 120, primeraJugadaS: 180 })
    expect(normalizarTiempos({ turnoS: Number.NaN, primeraJugadaS: Infinity }, { turnoS: 20, primeraJugadaS: 90 })).toEqual({
      turnoS: 20,
      primeraJugadaS: 90,
    })
    expect(normalizarTiempos({ primeraJugadaS: null as unknown as number }, { turnoS: 20, primeraJugadaS: 90 })).toEqual({
      turnoS: 20,
      primeraJugadaS: 90,
    })
  })
})
