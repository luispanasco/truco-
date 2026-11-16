import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { agregarAmigo, codigoDe } from '../src/cuentas/amigos'
import { crearGrupo, entrarAGrupo } from '../src/cuentas/grupos'
import { ganarNivel } from '../src/cuentas/historia'
import { mandarAlChat } from '../src/cuentas/chatGrupo'
import { levantar } from './helpers'

const PUERTO = 2611
let colyseus: ColyseusTestServer
let base: Base
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(PUERTO, { cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true } }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})

async function cuenta(apodo: string): Promise<{ id: string; token: string }> {
  const token = `prueba:borrar${++n}@ejemplo.com`
  const u = (await verificadorDePrueba(token))!
  await entrar(base, u, { apodo, invitadoId: `invitado-borrar-${n}` })
  return { id: u.id, token }
}

/** DELETE /api/cuenta por el cliente http del servidor de prueba: el estado y lo que contesta. */
async function borrar(token: string | null): Promise<{ status: number; datos: unknown }> {
  try {
    const r = await colyseus.http.delete('/api/cuenta', { headers: token ? { authorization: `Bearer ${token}` } : {} })
    return { status: r.statusCode, datos: r.data }
  } catch (e) {
    const r = e as { statusCode: number; data: unknown }
    return { status: r.statusCode, datos: r.data }
  }
}

const cuantas = async (sql: string, id: string) => Number((await base.consultar<{ n: string }>(sql, [id]))[0]!.n)

describe('borrar la cuenta', () => {
  it('sin sesión no se borra nada', async () => {
    expect((await borrar(null)).status).toBe(401)
  })

  it('borra todo lo suyo; su grupo pasa a otro miembro y lo que escribió en él queda sin la cuenta', async () => {
    const ana = await cuenta('Ana')
    const beto = await cuenta('Beto')
    await agregarAmigo(base, ana.id, await codigoDe(base, beto.id))
    await agregarAmigo(base, beto.id, await codigoDe(base, ana.id))
    const { id: grupo } = await crearGrupo(base, ana.id, { nombre: 'Los que se van', sigla: 'LQV', descripcion: '', ingreso: 'abierto', cupo: null, convocan: 'todos' })
    await entrarAGrupo(base, beto.id, grupo)
    await mandarAlChat(base, ana.id, grupo, { texto: 'Chau, gente' })
    await ganarNivel(base, ana.id, 'rocha', 1, true, 'la-paloma')
    // Un grupo donde Ana está sola: se borra con ella.
    const { id: solo } = await crearGrupo(base, ana.id, { nombre: 'Solo Ana', sigla: 'SA', descripcion: '', ingreso: 'abierto', cupo: null, convocan: 'todos' })

    const r = await borrar(ana.token)
    expect(r).toEqual({ status: 200, datos: { borrada: true } })

    for (const tabla of ['invitados', 'movimientos', 'historia', 'grupo_miembros', 'grupo_chat']) {
      expect(await cuantas(`select count(*) as n from ${tabla} where cuenta_id = $1`, ana.id)).toBe(0)
    }
    expect(await cuantas('select count(*) as n from cuentas where id = $1', ana.id)).toBe(0)
    expect(await cuantas('select count(*) as n from amistades where de = $1 or a = $1', ana.id)).toBe(0)
    // Beto queda de líder del grupo, y el grupo donde estaba sola no existe más.
    const [rol] = await base.consultar<{ rol: string }>('select rol from grupo_miembros where grupo_id = $1 and cuenta_id = $2', [grupo, beto.id])
    expect(rol?.rol).toBe('lider')
    expect(await cuantas('select count(*) as n from grupos where id = $1', solo)).toBe(0)
    // A Beto no le pasa nada.
    expect(await cuantas('select count(*) as n from cuentas where id = $1', beto.id)).toBe(1)

    // Si vuelve a entrar, empieza con una cuenta nueva y vacía.
    expect((await borrar(ana.token)).status).toBe(404)
  })
})
