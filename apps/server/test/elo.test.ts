import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { actualizarElo, ELO, esperado, ranking } from '../src/cuentas/elo'
import { Jugador, levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2595, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 },
  }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
beforeEach(async () => colyseus.cleanup())

async function cuenta(apodo = `J${n + 1}`): Promise<string> {
  const u = (await verificadorDePrueba(`prueba:elo${++n}@ejemplo.com`))!
  await entrar(base, u, { apodo })
  return u.id
}

describe('elo', () => {
  it('lo esperado: parejos, 0,5; 400 puntos arriba, 10 a 1', () => {
    expect(esperado(1200, 1200)).toBe(0.5)
    expect(esperado(1600, 1200)).toBeCloseTo(10 / 11, 5)
  })

  it('uno contra uno entre nuevos: el que gana sube lo que baja el otro; la partida cuenta una vez', async () => {
    const [a, b] = [await cuenta(), await cuenta()]
    const cambios = await actualizarElo(base, 'p1', '1v1', [[a], [b]], 0)
    expect(cambios).toEqual([
      { cuentaId: a, antes: 1200, despues: 1200 + ELO.kNuevo / 2 },
      { cuentaId: b, antes: 1200, despues: 1200 - ELO.kNuevo / 2 },
    ])
    expect(await actualizarElo(base, 'p1', '1v1', [[a], [b]], 0)).toEqual([])
  })

  it('en parejas cuenta el promedio del equipo, y cada formato va aparte', async () => {
    const [a, b, c, d] = [await cuenta(), await cuenta(), await cuenta(), await cuenta()]
    await actualizarElo(base, 'q0', '1v1', [[a], [c]], 0)
    const cambios = await actualizarElo(base, 'q1', '2v2', [[a, b], [c, d]], 1)
    // En 2v2 todos arrancan en 1200, aunque a ya jugó en 1v1.
    expect(cambios.every((x) => x.antes === 1200)).toBe(true)
    expect(cambios.find((x) => x.cuentaId === c)!.despues).toBe(1220)
  })

  it('el ranking pide un mínimo de partidas y te dice dónde estás', async () => {
    const [a, b] = [await cuenta('Fuerte'), await cuenta('Flojo')]
    for (let i = 0; i < ELO.minimoRanking; i++) await actualizarElo(base, `r${i}`, '3v3', [[a], [b]], 0)
    const r = await ranking(base, '3v3', b)
    expect(r.filas.map((f) => f.apodo)).toEqual(['Fuerte', 'Flojo'])
    expect(r.filas[0]).toMatchObject({ posicion: 1, partidas: ELO.minimoRanking, ganadas: ELO.minimoRanking })
    expect(r.yo).toMatchObject({ apodo: 'Flojo', posicion: 2, enRanking: true })
    const c = await cuenta('Nuevo')
    await actualizarElo(base, 'r-nuevo', '3v3', [[c], [b]], 0)
    expect((await ranking(base, '3v3', c)).yo).toMatchObject({ enRanking: false })
  })

  it('en la sala: entre dos personas con cuenta se mueve el Elo; con un invitado, no', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1', puntosPartida: 20 }, botsEnVacios: false, token: 'prueba:sala-a@ejemplo.com' })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.room.roomId, Jugador.nuevoId(), 'Bea', { token: 'prueba:sala-b@ejemplo.com' })
    await b.esperar(() => b.sala?.yo != null)
    a.enviar('iniciar', {})
    a.autoJugar(3)
    b.autoJugar(4)
    await a.esperar(() => a.de('elo').length > 0, 60_000, 'el elo de a')
    await b.esperar(() => b.de('elo').length > 0, 5_000, 'el elo de b')
    const [ea, eb] = [a.de('elo')[0]!, b.de('elo')[0]!]
    expect(ea.formato).toBe('1v1')
    expect(ea.despues - ea.antes).toBe(-(eb.despues - eb.antes))
    expect(Math.abs(ea.despues - ea.antes)).toBe(ELO.kNuevo / 2)
  }, 90_000)

  it('en la sala: contra un invitado no hay Elo', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1', puntosPartida: 20 }, botsEnVacios: false, token: 'prueba:sala-c@ejemplo.com' })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.room.roomId)
    await b.esperar(() => b.sala?.yo != null)
    a.enviar('iniciar', {})
    a.autoJugar(5)
    b.autoJugar(6)
    await a.esperar(() => a.de('monedas').length > 0, 60_000, 'el final')
    expect(a.de('elo')).toEqual([])
  }, 90_000)
})
