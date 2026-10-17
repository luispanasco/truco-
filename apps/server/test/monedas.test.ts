import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { ECONOMIA, inicioDelDia, pagarPartida, saldo } from '../src/cuentas/monedas'
import { Jugador, levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2593, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 },
  }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
beforeEach(async () => colyseus.cleanup())

async function cuentaNueva(): Promise<string> {
  const email = `jugador${++n}@ejemplo.com`
  const u = (await verificadorDePrueba(`prueba:${email}`))!
  await entrar(base, u, { apodo: `J${n}` })
  return u.id
}

const MEDIODIA = new Date('2026-10-17T15:00:00Z')

describe('monedas', () => {
  it('el día empieza a la medianoche de Uruguay', () => {
    expect(inicioDelDia(new Date('2026-10-17T15:00:00Z')).toISOString()).toBe('2026-10-17T03:00:00.000Z')
    expect(inicioDelDia(new Date('2026-10-18T01:00:00Z')).toISOString()).toBe('2026-10-17T03:00:00.000Z')
    expect(inicioDelDia(new Date('2026-10-18T03:00:00Z')).toISOString()).toBe('2026-10-18T03:00:00.000Z')
  })

  it('contra gente: partida, victoria y el bonus del día (una vez por día)', async () => {
    const id = await cuentaNueva()
    const r1 = await pagarPartida(base, 'a', { cuentaId: id, gano: true, contraGente: true }, MEDIODIA)
    expect(r1.movimientos).toEqual([
      { tipo: 'partida', monto: 10 },
      { tipo: 'victoria', monto: 10 },
      { tipo: 'bonusDiario', monto: 30 },
    ])
    expect(r1.saldo).toBe(50)
    const r2 = await pagarPartida(base, 'b', { cuentaId: id, gano: false, contraGente: true }, MEDIODIA)
    expect(r2.movimientos).toEqual([{ tipo: 'partida', monto: 10 }])
    // Al otro día vuelve el bonus.
    const r3 = await pagarPartida(base, 'c', { cuentaId: id, gano: false, contraGente: true }, new Date('2026-10-18T12:00:00Z'))
    expect(r3.movimientos.map((m) => m.tipo)).toEqual(['partida', 'bonusDiario'])
  })

  it('contra bots se cobra menos; la misma partida no se paga dos veces', async () => {
    const id = await cuentaNueva()
    const r = await pagarPartida(base, 'x', { cuentaId: id, gano: true, contraGente: false }, MEDIODIA)
    expect(r.movimientos).toEqual([
      { tipo: 'partida', monto: 3 },
      { tipo: 'victoria', monto: 3 },
      { tipo: 'bonusDiario', monto: 30 },
    ])
    expect((await pagarPartida(base, 'x', { cuentaId: id, gano: true, contraGente: false }, MEDIODIA)).movimientos).toEqual([])
    expect(await saldo(base, id)).toBe(36)
  })

  it('hay un tope por día', async () => {
    const id = await cuentaNueva()
    let total = 0
    for (let i = 0; i < 20; i++) total += (await pagarPartida(base, `t${i}`, { cuentaId: id, gano: true, contraGente: true }, MEDIODIA)).movimientos.reduce((s, m) => s + m.monto, 0)
    expect(total).toBe(ECONOMIA.topeDiario)
  })

  it('los movimientos no se cambian ni se borran', async () => {
    const id = await cuentaNueva()
    await pagarPartida(base, 'i', { cuentaId: id, gano: false, contraGente: true }, MEDIODIA)
    await expect(base.consultar('update movimientos set monto = 1000 where cuenta_id = $1', [id])).rejects.toThrow(/no se cambian/)
    await expect(base.consultar('delete from movimientos where cuenta_id = $1', [id])).rejects.toThrow(/no se cambian/)
    expect(await saldo(base, id)).toBe(40)
  })

  it('en la sala: al terminar la partida contra la compu, cobra quien entró con su cuenta', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1', puntosPartida: 20 }, botsEnVacios: true, token: 'prueba:sala@ejemplo.com' })
    await a.esperar(() => a.sala !== null)
    a.enviar('iniciar', {})
    a.autoJugar(7)
    await a.esperar(() => a.vista?.ganador != null, 60_000, 'el final')
    await a.esperar(() => a.de('monedas').length > 0, 5_000, 'las monedas')
    const { movimientos, saldo: s } = a.de('monedas')[0]!
    const gano = a.vista!.ganador === 0
    expect(movimientos).toEqual([
      { tipo: 'partida', monto: 3 },
      ...(gano ? [{ tipo: 'victoria', monto: 3 }] : []),
      { tipo: 'bonusDiario', monto: 30 },
    ])
    expect(s).toBe(gano ? 36 : 33)
  }, 90_000)
})
