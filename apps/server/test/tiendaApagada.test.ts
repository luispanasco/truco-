import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { AVATAR_BASE, CATALOGO_AVATAR, codificarAvatar, leerAvatar } from '@truco/shared'
import { Jugador, levantar } from './helpers'

// La tienda de prueba apagada, como va a quedar en la fase 2: solo vale lo comprado.
let colyseus: ColyseusTestServer

beforeAll(async () => {
  ;({ colyseus } = await levantar(2587, { tiempos: { botMinMs: 0, botMaxMs: 0, turnoMs: 60_000, reconexionS: 1 }, tiendaDePrueba: false }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

describe('tienda de prueba apagada', () => {
  it('el aviso del cliente no alcanza: lo pago vuelve a lo gratis', async () => {
    const sombrero = CATALOGO_AVATAR.sombrero.findIndex((p) => p.precio > 0)
    const avatar = codificarAvatar({ ...AVATAR_BASE, sombrero })
    const a = await Jugador.crear(colyseus, { avatar, tiendaDesbloqueada: true, mesa: 'cantina', baraja: 'fournier1878' })
    await a.esperar(() => a.sala !== null)
    expect(leerAvatar(a.sala!.lugares[a.sala!.yo!]!.avatar)!.sombrero).toBe(AVATAR_BASE.sombrero)
    expect(a.sala!.mesa).toBe('boliche')
    // La baraja clásica es gratis: pasa igual.
    expect(a.sala!.baraja).toBe('fournier1878')
  })
})
