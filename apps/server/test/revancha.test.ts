import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import type { RegistroPartida } from '../src/registro'
import { esperarMs, Jugador, levantar } from './helpers'

let colyseus: ColyseusTestServer
let dirDatos: string

beforeAll(async () => {
  ;({ colyseus, dirDatos } = await levantar(2573, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 } }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

/** Primera vista de una partida recién repartida que llegó a partir del índice `desde`. */
function primeraVistaDesde(j: Jugador, desde: number) {
  return j.vistas.slice(desde).find((v) => v.ganador === null)
}

describe('revancha', () => {
  it('1v1 contra un bot: terminada la partida, la revancha arranca otra con la mano rotada', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    a.autoJugar(5)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista?.ganador != null, 60_000, 'el final de la partida')
    expect(a.sala!.fase).toBe('terminada')
    expect(a.sala!.revancha).toEqual([])
    const reparteAntes = a.vistas[0]!.mano.reparte

    const desde = a.vistas.length
    a.enviar('revancha', {})
    await a.esperar(() => a.sala!.fase === 'jugando' && primeraVistaDesde(a, desde) !== undefined, 5_000, 'la revancha')
    const nueva = primeraVistaDesde(a, desde)!
    expect(nueva.puntos).toEqual([0, 0])
    expect(nueva.mano.numero).toBe(1)
    expect(nueva.yo.asiento).toBe(0)
    expect(nueva.mano.reparte).toBe((reparteAntes + 1) % 2)
    expect(a.sala!.yo).toBe(0)
    expect(a.sala!.revancha).toEqual([])
    expect(a.sala!.lugares.map((l) => l.tipo)).toEqual(['humano', 'bot'])

    // La revancha también se juega hasta el final y deja su propio registro.
    await a.esperar(() => a.vista?.ganador != null && a.vistas.length > desde, 60_000, 'el final de la revancha')
    await esperarMs(100)
    const registros = readdirSync(join(dirDatos, 'partidas'))
      .filter((f) => f.includes(a.room.roomId))
      .map((f) => JSON.parse(readFileSync(join(dirDatos, 'partidas', f), 'utf8')) as RegistroPartida)
      .sort((x, y) => x.inicio.localeCompare(y.inicio))
    expect(registros).toHaveLength(2)
    expect(registros.map((r) => r.reparte)).toEqual([reparteAntes, (reparteAntes + 1) % 2])
    expect(registros.every((r) => r.resultado !== null && 'ganador' in r.resultado)).toBe(true)
  }, 120_000)

  it('2v2 con dos personas: no arranca hasta que la piden las dos', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
    await b.esperar(() => b.sala?.yo === 1)
    a.autoJugar(7)
    b.autoJugar(8)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista?.ganador != null, 60_000, 'el final de la partida')
    await b.esperar(() => b.sala?.fase === 'terminada', 5_000, 'el final para b')

    a.enviar('revancha', {})
    await b.esperar(() => b.sala!.revancha.length === 1, 5_000, 'el pedido de a')
    expect(b.sala!.revancha).toEqual([0])
    await a.esperar(() => a.sala!.revancha.length === 1)
    await esperarMs(100)
    expect(a.sala!.fase).toBe('terminada')

    // Pedirla dos veces no cambia nada.
    a.enviar('revancha', {})
    await esperarMs(100)
    expect(b.sala!.fase).toBe('terminada')
    expect(b.sala!.revancha).toEqual([0])

    const desdeA = a.vistas.length
    const desdeB = b.vistas.length
    b.enviar('revancha', {})
    await a.esperar(() => a.sala!.fase === 'jugando' && primeraVistaDesde(a, desdeA) !== undefined, 5_000, 'la revancha para a')
    await b.esperar(() => b.sala!.fase === 'jugando' && primeraVistaDesde(b, desdeB) !== undefined, 5_000, 'la revancha para b')
    expect(a.sala!.revancha).toEqual([])
    expect(a.sala!.lugares.map((l) => l.tipo)).toEqual(['humano', 'humano', 'bot', 'bot'])
    expect(primeraVistaDesde(a, desdeA)!.yo.asiento).toBe(0)
    expect(primeraVistaDesde(b, desdeB)!.yo.asiento).toBe(1)
    expect(primeraVistaDesde(a, desdeA)!.puntos).toEqual([0, 0])
    // La primera la repartió el asiento 3; la revancha, el 0.
    expect(a.vistas[0]!.mano.reparte).toBe(3)
    expect(primeraVistaDesde(a, desdeA)!.mano.reparte).toBe(0)
  }, 90_000)

  it('si se va el que faltaba, la revancha arranca con los que quedan y su lugar lo juega un bot', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
    await b.esperar(() => b.sala?.yo === 1)
    a.autoJugar(9)
    b.autoJugar(10)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista?.ganador != null, 60_000, 'el final de la partida')
    await b.esperar(() => b.sala?.fase === 'terminada', 5_000, 'el final para b')

    a.enviar('revancha', {})
    await a.esperar(() => a.sala!.revancha.length === 1, 5_000, 'el pedido de a')
    const desde = a.vistas.length
    await b.room.leave(true)
    await a.esperar(() => a.sala!.fase === 'jugando' && primeraVistaDesde(a, desde) !== undefined, 5_000, 'la revancha')
    // b conserva su lugar (desconectado) y la partida sigue sin esperarlo.
    expect(a.sala!.lugares[1]!).toMatchObject({ tipo: 'humano', conectado: false })
    await a.esperar(() => a.vistas.length > desde + 3, 5_000, 'que la revancha avance')
  }, 90_000)

  it('pedirla antes de que termine la partida da error', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    a.enviar('revancha', {})
    await a.esperar(() => a.de('error').length === 1)
    expect(a.de('error')[0]!.motivo).toBe('La partida no terminó')

    a.enviar('iniciar', {})
    await a.esperar(() => a.vista !== null)
    a.enviar('revancha', {})
    await a.esperar(() => a.de('error').length === 2)
    expect(a.de('error')[1]!.motivo).toBe('La partida no terminó')
    expect(a.sala!.fase).toBe('jugando')
    expect(a.sala!.revancha).toEqual([])
  })
})
