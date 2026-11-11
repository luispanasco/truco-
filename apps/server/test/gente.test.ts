import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { esperarMs, Jugador, levantar } from './helpers'

let colyseus: ColyseusTestServer
let url = ''

beforeAll(async () => {
  ;({ colyseus } = await levantar(2605, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000 } }))
  url = `http://127.0.0.1:${(colyseus.server as unknown as { port: number }).port}`
})
afterAll(async () => {
  await colyseus.shutdown()
})

const gente = async () => (await (await fetch(`${url}/api/gente`)).json()) as { buscando: number; jugando: number }

describe('cuánta gente hay', () => {
  it('cuenta a los que esperan en la cola pública y, cuando arranca, a los que juegan', async () => {
    expect(await gente()).toEqual({ buscando: 0, jugando: 0 })
    const ana = await Jugador.cola(colyseus)
    await esperarMs(50)
    expect(await gente()).toEqual({ buscando: 1, jugando: 0 })
    // Llega el segundo: la cola arma la partida mano a mano y pasan a jugar.
    const beto = await Jugador.cola(colyseus)
    await esperarMs(200)
    expect(await gente()).toEqual({ buscando: 0, jugando: 2 })
    await ana.room.leave()
    await beto.room.leave()
  })
})
