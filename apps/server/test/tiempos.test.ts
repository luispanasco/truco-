import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { esperarMs, Jugador, levantar, salaEnServidor } from './helpers'

// Tiempos cortos para no esperar de verdad 30 segundos.
let colyseus: ColyseusTestServer

beforeAll(async () => {
  ;({ colyseus } = await levantar(2572, {
    tiempos: { turnoMs: 150, botMinMs: 0, botMaxMs: 0, ofrecerBotMs: 100, cierreSinHumanosMs: 200, reconexionS: 1 },
  }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

describe('tiempos', () => {
  it('si vence el turno, juega un bot por el jugador', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    a.enviar('iniciar', {})
    await a.esperar(() => a.de('turno').some((t) => t.asientos.includes(0) && t.venceEn !== null), 5_000, 'el turno de a')
    const turno = a.de('turno').find((t) => t.asientos.includes(0) && t.venceEn !== null)!
    expect(turno.venceEn! - Date.now()).toBeLessThanOrEqual(150)

    // a no hace nada: igual la partida avanza y termina, jugando el bot por él.
    await a.esperar(() => a.vista?.ganador != null, 60_000, 'que termine la partida')
    expect(a.de('error')).toEqual([])
  }, 90_000)

  it('cola pública: empieza sola con dos personas', async () => {
    const a = await Jugador.cola(colyseus)
    const b = await Jugador.cola(colyseus)
    expect(b.room.roomId).toBe(a.room.roomId)
    await a.esperar(() => a.sala?.fase === 'jugando')
    expect(a.sala!.publica).toBe(true)
    expect(a.sala!.chatEquipo).toBe(false)
    expect(a.sala!.ayudas).toBe(false)
    expect(a.sala!.codigo).toBeNull()

    // Una tercera persona va a otra sala, no a la partida empezada.
    const c = await Jugador.cola(colyseus)
    expect(c.room.roomId).not.toBe(a.room.roomId)
  })

  it('cola pública: si no aparece nadie, ofrece jugar contra un bot', async () => {
    const a = await Jugador.cola(colyseus)
    await a.esperar(() => a.de('ofrecerBot').length > 0, 2_000, 'la oferta del bot')
    a.enviar('jugarContraBot', {})
    await a.esperar(() => a.sala?.fase === 'jugando')
    expect(a.sala!.lugares.map((l) => l.tipo)).toEqual(['humano', 'bot'])
  })

  it('sin humanos, la sala se cierra', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    const id = a.room.roomId
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista !== null)
    await a.room.leave(true)
    expect(salaEnServidor(colyseus, id)).toBeDefined()
    await esperarMs(600)
    expect(salaEnServidor(colyseus, id)).toBeUndefined()
  })
})
