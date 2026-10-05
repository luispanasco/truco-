import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { AVATAR_BASE, CATALOGO_AVATAR, codificarAvatar, leerAvatar } from '@truco/shared'
import { tiendaDePruebaDelEntorno } from '../src/servidor'
import { Jugador, levantar } from './helpers'

// Con la tienda de prueba prendida, como en la fase 1 (apagada: tiendaApagada.test.ts).
let conTienda: ColyseusTestServer

const TIEMPOS = { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 }

beforeAll(async () => {
  ;({ colyseus: conTienda } = await levantar(2586, { tiempos: TIEMPOS, tiendaDePrueba: true }))
})
afterAll(async () => conTienda.shutdown())
beforeEach(async () => conTienda.cleanup())

/** Un avatar con un sombrero de la tienda. */
const sombreroPago = CATALOGO_AVATAR.sombrero.findIndex((p) => p.precio > 0)
const avatarPago = codificarAvatar({ ...AVATAR_BASE, sombrero: sombreroPago })

const sombreroDe = (j: Jugador, asiento = j.sala!.yo!) => leerAvatar(j.sala!.lugares[asiento]!.avatar)!.sombrero

describe('tienda de prueba', () => {
  it('la variable de entorno estÃ¡ prendida por defecto y se apaga con 0', () => {
    expect(tiendaDePruebaDelEntorno({})).toBe(true)
    expect(tiendaDePruebaDelEntorno({ TRUCO_TIENDA_DE_PRUEBA: '1' })).toBe(true)
    expect(tiendaDePruebaDelEntorno({ TRUCO_TIENDA_DE_PRUEBA: '0' })).toBe(false)
  })

  it('con la variable y el aviso del cliente acepta lo pago', async () => {
    expect(sombreroPago).toBeGreaterThan(0)
    const a = await Jugador.crear(conTienda, { avatar: avatarPago, tiendaDesbloqueada: true, mesa: 'bordo', baraja: 'fournier1878' })
    await a.esperar(() => a.sala !== null)
    expect(sombreroDe(a)).toBe(sombreroPago)
    expect(a.sala!.mesa).toBe('bordo')
    expect(a.sala!.baraja).toBe('fournier1878')
  })

  it('sin el aviso del cliente, lo pago vuelve a lo gratis', async () => {
    const a = await Jugador.crear(conTienda, { avatar: avatarPago, mesa: 'bordo' })
    await a.esperar(() => a.sala !== null)
    expect(sombreroDe(a)).toBe(AVATAR_BASE.sombrero)
    expect(a.sala!.mesa).toBe('boliche')
  })
})

describe('la mesa y la baraja las pone el anfitriÃ³n', () => {
  it('llegan a todos, aunque cada uno tenga otras', async () => {
    const a = await Jugador.crear(conTienda, { config: { formato: '2v2' }, tiendaDesbloqueada: true, mesa: 'bordo', baraja: 'fournier1878' })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(conTienda, a.room.roomId, undefined, 'Beto', { mesa: 'azul', baraja: 'propia' })
    await b.esperar(() => b.sala?.yo !== null && b.sala?.yo !== undefined)
    expect(b.sala!.mesa).toBe('bordo')
    expect(b.sala!.baraja).toBe('fournier1878')
  })

  it('si el anfitriÃ³n las cambia en la espera, se actualizan para todos; los demÃ¡s no las cambian', async () => {
    const a = await Jugador.crear(conTienda, { config: { formato: '2v2' }, mesa: 'azul' })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(conTienda, a.room.roomId)
    await b.esperar(() => b.sala?.yo != null)
    expect(b.sala!.mesa).toBe('azul')

    a.enviar('mesaYBaraja', { mesa: 'boliche', baraja: 'fournier1878' })
    await b.esperar(() => b.sala!.mesa === 'boliche' && b.sala!.baraja === 'fournier1878', 5_000, 'la mesa nueva')

    // Lo que manda otro queda como suyo, pero la sala sigue con lo del anfitriÃ³n.
    b.enviar('mesaYBaraja', { mesa: 'azul', baraja: 'propia' })
    a.enviar('mesaYBaraja', { baraja: 'propia' })
    await b.esperar(() => b.sala!.baraja === 'propia', 5_000, 'la baraja nueva')
    expect(b.sala!.mesa).toBe('boliche')
  })

  it('valores invÃ¡lidos o pagos sin la tienda vuelven a boliche y la propia', async () => {
    const a = await Jugador.crear(conTienda, { mesa: 'mantel' as string, baraja: 'tarot' })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.mesa).toBe('boliche')
    expect(a.sala!.baraja).toBe('propia')
    a.enviar('mesaYBaraja', { mesa: 'azul' })
    await a.esperar(() => a.sala!.mesa === 'azul')
    a.enviar('mesaYBaraja', { mesa: 'parrillero', baraja: 7 as unknown as string })
    await a.esperar(() => a.sala!.mesa === 'boliche', 5_000, 'la mesa de vuelta a boliche')
    expect(a.sala!.baraja).toBe('propia')
  })

  it('si el anfitriÃ³n se va, quedan las del nuevo anfitriÃ³n', async () => {
    const a = await Jugador.crear(conTienda, { config: { formato: '2v2' }, mesa: 'azul', baraja: 'fournier1878' })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(conTienda, a.room.roomId, undefined, 'Beto', { mesa: 'boliche', baraja: 'propia' })
    await b.esperar(() => b.sala?.yo != null)
    expect(b.sala!.mesa).toBe('azul')
    await a.room.leave(true)
    await b.esperar(() => b.sala!.lugares.filter((l) => l.tipo === 'humano').length === 1, 5_000, 'que se vaya el anfitriÃ³n')
    expect(b.sala!.lugares[b.sala!.yo!]!.anfitrion).toBe(true)
    expect(b.sala!.mesa).toBe('boliche')
    expect(b.sala!.baraja).toBe('propia')
  })

  it('despuÃ©s de empezar ya no se cambian', async () => {
    const a = await Jugador.crear(conTienda, { config: { formato: '1v1' }, mesa: 'azul' })
    await a.esperar(() => a.sala !== null)
    a.enviar('iniciar', {})
    await a.esperar(() => a.sala!.fase === 'jugando')
    a.enviar('mesaYBaraja', { mesa: 'boliche' })
    await a.esperar(() => a.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.sala!.mesa).toBe('azul')
  })

  it('en la cola pÃºblica, sin anfitriÃ³n, todos ven boliche y la baraja propia', async () => {
    const a = await Jugador.cola(conTienda, { tiendaDesbloqueada: true, mesa: 'bordo', baraja: 'fournier1878' })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.mesa).toBe('boliche')
    expect(a.sala!.baraja).toBe('propia')
  })
})
