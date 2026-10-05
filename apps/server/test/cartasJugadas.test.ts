import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { CARTAS_JUGADAS_DEFAULT, normalizarCartasJugadas, type CartasJugadas } from '@truco/shared'
import { Jugador, levantar } from './helpers'

let colyseus: ColyseusTestServer

beforeAll(async () => {
  ;({ colyseus } = await levantar(2583, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 } }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

describe('cartas jugadas en la sala', () => {
  it('sin elegir, quedan en la mesa', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.cartasJugadas).toBe('quedan')
  })

  it('se elige al crear, la ven todos y el anfitrión la cambia en la espera', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, cartasJugadas: 'seLevantan' })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.cartasJugadas).toBe('seLevantan')
    const b = await Jugador.unirse(colyseus, a.room.roomId)
    await b.esperar(() => b.sala !== null && b.sala.yo !== null)
    expect(b.sala!.cartasJugadas).toBe('seLevantan')

    a.enviar('configurar', { cartasJugadas: 'quedan' })
    await b.esperar(() => b.sala!.cartasJugadas === 'quedan', 5_000, 'la opción nueva')

    // Cambiar otra cosa no la toca, y un valor que no existe se descarta.
    a.enviar('configurar', { ayudas: false, cartasJugadas: 'alAire' as CartasJugadas })
    await a.esperar(() => a.sala!.ayudas === false)
    expect(a.sala!.cartasJugadas).toBe('quedan')

    // Los demás no la pueden cambiar.
    b.enviar('configurar', { cartasJugadas: 'seLevantan' })
    await b.esperar(() => b.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.sala!.cartasJugadas).toBe('quedan')
  })
})

describe('normalizarCartasJugadas', () => {
  it('acepta las dos opciones y lo demás queda como estaba', () => {
    expect(CARTAS_JUGADAS_DEFAULT).toBe('quedan')
    expect(normalizarCartasJugadas(undefined)).toBe('quedan')
    expect(normalizarCartasJugadas('seLevantan')).toBe('seLevantan')
    expect(normalizarCartasJugadas('quedan', 'seLevantan')).toBe('quedan')
    expect(normalizarCartasJugadas('cualquiera', 'seLevantan')).toBe('seLevantan')
    expect(normalizarCartasJugadas(3)).toBe('quedan')
  })
})
