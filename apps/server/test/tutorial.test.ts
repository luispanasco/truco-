import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buscarItem, idMonedas, MONEDAS_DIPLOMA, PREMIO_DIPLOMA, vitrinaDelDia } from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { cobrarMision, misiones } from '../src/cuentas/misiones'
import { saldo } from '../src/cuentas/monedas'
import { comprar, inventario } from '../src/cuentas/tienda'
import { recibirse } from '../src/cuentas/tutorial'

let base: Base
let n = 0

beforeAll(async () => {
  base = await baseLocal()
})
afterAll(async () => {
  await base.cerrar()
})

async function cuenta(): Promise<string> {
  const email = `tutorial${++n}@ejemplo.com`
  const u = (await verificadorDePrueba(`prueba:${email}`))!
  await entrar(base, u, { apodo: `T${n}` })
  return u.id
}

describe('recibirse en el tutorial', () => {
  it('da las monedas y los Naipes una sola vez, y la misión deja de mostrarse', async () => {
    const id = await cuenta()
    const antes = await misiones(base, id)
    const mision = antes.deUnaVez.find((m) => m.id === 'recibirse')!
    expect(mision.premio).toBe(MONEDAS_DIPLOMA)
    expect(mision.avance).toBe(0)
    // No se cobra por la lista: se cobra sola al recibirte.
    await expect(cobrarMision(base, id, 'recibirse')).rejects.toThrow('Todavía no la cumpliste')

    const inicial = await saldo(base, id)
    const r = await recibirse(base, id)
    expect(r.nuevas).toEqual([idMonedas(MONEDAS_DIPLOMA), PREMIO_DIPLOMA])
    expect(r.saldo).toBe(inicial + MONEDAS_DIPLOMA)
    expect(r.inventario).toContain(PREMIO_DIPLOMA)
    expect((await misiones(base, id)).deUnaVez.some((m) => m.id === 'recibirse')).toBe(false)

    // La segunda vez no da nada.
    const otra = await recibirse(base, id)
    expect(otra.nuevas).toEqual([])
    expect(await saldo(base, id)).toBe(inicial + MONEDAS_DIPLOMA)
    expect((await inventario(base, id)).filter((i) => i === PREMIO_DIPLOMA)).toHaveLength(1)
  })

  it('los Naipes no se venden: no salen en la vitrina ni se pueden comprar', async () => {
    expect(buscarItem(PREMIO_DIPLOMA)?.nombre).toBe('Naipes')
    expect(buscarItem(PREMIO_DIPLOMA)?.recompensa).toBe('Aprendé a jugar')
    for (let d = 1; d <= 28; d++) expect(vitrinaDelDia(`2026-12-${String(d).padStart(2, '0')}`).some((i) => i.id === PREMIO_DIPLOMA)).toBe(false)
    const id = await cuenta()
    await expect(comprar(base, id, PREMIO_DIPLOMA)).rejects.toThrow()
  })
})
