import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { HISTORIAS, idBaraja, idMesa } from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { ganarNivel, progresoHistoria } from '../src/cuentas/historia'
import { inventario } from '../src/cuentas/tienda'
import { levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2601, { cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true } }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
afterEach(() => {
  delete process.env.ADMINS
})

async function cuenta(): Promise<{ id: string; token: string; email: string }> {
  const email = `historia${++n}@ejemplo.com`
  const token = `prueba:${email}`
  const u = (await verificadorDePrueba(token))!
  await entrar(base, u, { apodo: `H${n}` })
  return { id: u.id, token, email }
}

describe('modo historia', () => {
  it('los niveles se abren de a uno; la primera vez da sus recompensas, después ya no', async () => {
    const { id } = await cuenta()
    await expect(ganarNivel(base, id, 'rocha', 2)).rejects.toThrow('Primero ganá el nivel anterior')
    await expect(ganarNivel(base, id, 'rocha', 9)).rejects.toThrow('Ese nivel no existe')
    await expect(ganarNivel(base, id, 'montevideo', 1)).rejects.toThrow('Ese nivel no existe')

    const rocha = HISTORIAS.rocha!
    const r1 = await ganarNivel(base, id, 'rocha', 1)
    expect(r1.nuevas).toEqual(rocha.niveles[0]!.recompensas)
    expect(r1.progreso).toEqual({ rocha: [1] })
    // Repetir un nivel ganado se puede, pero no vuelve a dar nada.
    expect((await ganarNivel(base, id, 'rocha', 1)).nuevas).toEqual([])

    for (let nivel = 2; nivel <= rocha.niveles.length; nivel++) await ganarNivel(base, id, 'rocha', nivel)
    expect(await progresoHistoria(base, id)).toEqual({ rocha: [1, 2, 3, 4, 5] })
    const tiene = await inventario(base, id)
    expect(tiene).toEqual(expect.arrayContaining([idBaraja('costa'), idMesa('rocha'), ...rocha.niveles.flatMap((x) => x.recompensas)]))
  })

  it('la API es solo para los admins', async () => {
    const yo = await cuenta()
    const pedir = async (ruta: string, body?: unknown): Promise<{ status: number; data: unknown }> => {
      const http = body ? colyseus.http.post : colyseus.http.get
      try {
        const r = await http(`/api${ruta}`, { headers: { 'content-type': 'application/json', authorization: `Bearer ${yo.token}` }, ...(body ? { body } : {}) })
        return { status: r.statusCode, data: r.data }
      } catch (e) {
        const r = e as { statusCode: number; data: unknown }
        return { status: r.statusCode, data: r.data }
      }
    }
    expect((await pedir('/historia')).status).toBe(403)

    process.env.ADMINS = yo.email
    expect((await pedir('/historia')).data).toEqual({ progreso: {} })
    const r = await pedir('/historia/ganar', { departamento: 'rocha', nivel: 1 })
    expect((r.data as { progreso: unknown }).progreso).toEqual({ rocha: [1] })
    const rechazo = await pedir('/historia/ganar', { departamento: 'rocha', nivel: 3 })
    expect(rechazo.status).toBe(409)
  })
})
