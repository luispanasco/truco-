import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { MOTIVO_SIN_SENIAS } from '@truco/shared'
import { esperarMs, Jugador, levantar, salaEnServidor } from './helpers'

let colyseus: ColyseusTestServer

beforeAll(async () => {
  // Tiempos rápidos: los bots juegan enseguida y el turno de las personas no vence.
  ;({ colyseus } = await levantar(2579, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 } }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

/** Un 2v2 sin señas: `a` (asiento 0) y `b` (asiento 1) son personas rivales; los compañeros, bots. */
async function mesaSinSenias() {
  const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, senias: { habilitadas: false, pescar: 'gestoYCarta', probabilidadPescar: 1 } })
  await a.esperar(() => a.sala !== null)
  const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
  await b.esperar(() => b.sala?.yo === 1)
  a.enviar('iniciar', {})
  await a.esperar(() => a.vista !== null && a.vista.esperandoA.includes(0), 5_000, 'el turno de a')
  await b.esperar(() => b.vista !== null)
  return { a, b, sala: salaEnServidor(colyseus, a.room.roomId) }
}

describe('mesa sin señas', () => {
  it('la configuración llega en la sala', async () => {
    const { a } = await mesaSinSenias()
    expect(a.sala!.senias.habilitadas).toBe(false)
  })

  it('la seña de una persona se rechaza con el motivo y no le llega a nadie', async () => {
    const { a, b, sala } = await mesaSinSenias()
    a.enviar('senia', { senia: 'tres' })
    await a.esperar(() => a.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.de('error')[0]!.motivo).toBe(MOTIVO_SIN_SENIAS)
    await esperarMs(200)
    expect(b.de('seniaPescada')).toEqual([])
    expect(sala.seniasParaTests()[2]![0]).toBeUndefined()
  })

  it('los bots no hacen señas ni reciben ninguna al empezar la mano', async () => {
    const { a, b, sala } = await mesaSinSenias()
    await esperarMs(200)
    // Con probabilidad 1 y "gestoYCarta", cualquier seña de un bot se habría visto.
    expect(a.de('senia')).toEqual([])
    expect(a.de('seniaPescada')).toEqual([])
    expect(b.de('senia')).toEqual([])
    expect(b.de('seniaPescada')).toEqual([])
    // Lo que tiene cada bot para decidir: nada (ni siquiera "mi compañero no hizo señas").
    expect(sala.seniasParaTests().every((s) => Object.keys(s).length === 0)).toBe(true)
  })
})
