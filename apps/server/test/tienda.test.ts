import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import {
  AVATAR_BASE,
  CATALOGO_TIENDA,
  PRECIO_RAREZA,
  cambioDeVitrina,
  codificarAvatar,
  diaDeTienda,
  leerAvatar,
  vitrinaDelDia,
  type CapaAvatar,
} from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { pagarPartida } from '../src/cuentas/monedas'
import { comprar, inventario, vitrina } from '../src/cuentas/tienda'
import { tiendaDePruebaDelEntorno } from '../src/servidor'
import { Jugador, levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2597, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
    tiendaDePrueba: false,
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 },
  }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
beforeEach(async () => colyseus.cleanup())

/** Una cuenta con monedas: cada partida contra gente ganada paga 20 (más 30 la primera del día). */
async function cuentaCon(partidas: number): Promise<{ id: string; token: string }> {
  const token = `prueba:tienda${++n}@ejemplo.com`
  const u = (await verificadorDePrueba(token))!
  await entrar(base, u, { apodo: `T${n}` })
  for (let i = 0; i < partidas; i++) await pagarPartida(base, `p${i}`, { cuentaId: u.id, gano: true, contraGente: true })
  return { id: u.id, token }
}

describe('vitrina', () => {
  it('seis lugares por día, sin repetir, con las rarezas de cada lugar; el mismo día, la misma', () => {
    const v = vitrinaDelDia('2026-10-17')
    expect(v.map((i) => i.rareza).slice(0, 3)).toEqual(['comun', 'comun', 'comun'])
    expect(['rara', 'epica']).toContain(v[3]!.rareza)
    expect(['epica', 'legendaria']).toContain(v[5]!.rareza)
    expect(new Set(v.map((i) => i.id)).size).toBe(6)
    expect(vitrinaDelDia('2026-10-17')).toEqual(v)
    expect(vitrinaDelDia('2026-10-18')).not.toEqual(v)
    for (const i of v) expect(i.precio).toBe(PRECIO_RAREZA[i.rareza])
  })

  it('el día cambia a la medianoche de Uruguay', () => {
    expect(diaDeTienda(new Date('2026-10-18T02:59:00Z'))).toBe('2026-10-17')
    expect(diaDeTienda(new Date('2026-10-18T03:00:00Z'))).toBe('2026-10-18')
    expect(cambioDeVitrina(new Date('2026-10-17T15:00:00Z')).toISOString()).toBe('2026-10-18T03:00:00.000Z')
  })

  it('todo lo pago está en el catálogo, con su precio de rareza', () => {
    expect(CATALOGO_TIENDA.length).toBeGreaterThan(140)
    expect(CATALOGO_TIENDA.some((i) => i.id === 'mesa:cantina' && i.rareza === 'legendaria')).toBe(true)
  })

  it('la tienda de prueba: prendida en desarrollo, apagada en producción', () => {
    expect(tiendaDePruebaDelEntorno({ NODE_ENV: 'production' })).toBe(false)
    expect(tiendaDePruebaDelEntorno({ NODE_ENV: 'production', TRUCO_TIENDA_DE_PRUEBA: '1' })).toBe(true)
  })
})

describe('comprar', () => {
  it('descuenta las monedas y queda en el inventario; no se compra dos veces', async () => {
    const { id } = await cuentaCon(40)
    const item = vitrina().items[0]!
    const antes = (await comprar(base, id, item.id)).saldo
    expect(await inventario(base, id)).toEqual([item.id])
    expect(antes).toBe(300 - item.precio)
    await expect(comprar(base, id, item.id)).rejects.toThrow('Ya lo tenés')
  })

  it('solo lo de la vitrina de hoy, y si alcanzan las monedas', async () => {
    const { id } = await cuentaCon(1)
    const hoy = new Set(vitrina().items.map((i) => i.id))
    const otro = CATALOGO_TIENDA.find((i) => !hoy.has(i.id))!
    await expect(comprar(base, id, otro.id)).rejects.toThrow('vitrina')
    await expect(comprar(base, id, 'cualquiera')).rejects.toThrow('vitrina')
    const caro = vitrina().items[5]!
    await expect(comprar(base, id, caro.id)).rejects.toThrow('No te alcanzan')
  })

  it('por la API: la vitrina es pública y comprar pide sesión', async () => {
    const { token } = await cuentaCon(40)
    const v = await colyseus.http.get('/api/tienda')
    const items = (v.data as { items: { id: string }[] }).items
    expect(items).toHaveLength(6)
    const r = await colyseus.http.post('/api/tienda/comprar', { headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: { item: items[0]!.id } })
    expect((r.data as { inventario: string[] }).inventario).toEqual([items[0]!.id])
    await expect(colyseus.http.post('/api/tienda/comprar', { headers: { 'content-type': 'application/json' }, body: { item: items[1]!.id } })).rejects.toMatchObject({
      statusCode: 401,
    })
  })
})

describe('en la sala', () => {
  it('lo comprado se usa; lo pago que no compraste vuelve a lo gratis', async () => {
    const pieza = vitrina().items.find((i) => i.tipo === 'avatar')!
    const capa = pieza.capa as CapaAvatar
    const avatar = codificarAvatar({ ...AVATAR_BASE, [capa]: pieza.pieza! })

    const sin = await cuentaCon(0)
    const a = await Jugador.crear(colyseus, { avatar, token: sin.token })
    await a.esperar(() => a.sala?.yo != null)
    const yoA = a.sala!.lugares[a.sala!.yo!]!
    expect(leerAvatar(yoA.avatar)![capa]).toBe(AVATAR_BASE[capa])
    await a.room.leave()

    const con = await cuentaCon(40)
    await comprar(base, con.id, pieza.id)
    const b = await Jugador.crear(colyseus, { avatar, token: con.token })
    await b.esperar(() => b.sala?.yo != null)
    expect(leerAvatar(b.sala!.lugares[b.sala!.yo!]!.avatar)![capa]).toBe(pieza.pieza)
  })
})
