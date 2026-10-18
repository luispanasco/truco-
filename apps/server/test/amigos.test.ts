import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { Presencia, VIGENCIA_LATIDO_MS } from '../src/cuentas/presencia'
import { Jugador, levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2599, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 },
  }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
beforeEach(async () => colyseus.cleanup())

type Datos = Record<string, unknown>
async function api(metodo: 'GET' | 'POST', ruta: string, token: string, cuerpo?: unknown): Promise<{ status: number; datos: Datos }> {
  const http = metodo === 'GET' ? colyseus.http.get : colyseus.http.post
  try {
    const r = await http(`/api${ruta}`, { headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, ...(cuerpo ? { body: cuerpo } : {}) })
    return { status: r.statusCode, datos: r.data as Datos }
  } catch (e) {
    const r = e as { statusCode: number; data: Datos }
    return { status: r.statusCode, datos: r.data }
  }
}

/** Una cuenta nueva: entra por la API y devuelve su token, id y código de amigo. */
async function persona(apodo: string) {
  const token = `prueba:amigo${++n}@ejemplo.com`
  const entrar = await api('POST', '/entrar', token, { apodo })
  const lista = await api('GET', '/amigos', token)
  return { token, id: entrar.datos.id as string, codigo: lista.datos.codigo as string }
}

describe('amigos', () => {
  it('cada cuenta tiene un código de 6 que no cambia', async () => {
    const a = await persona('Ana')
    expect(a.codigo).toMatch(/^[A-Z0-9]{6}$/)
    expect((await api('GET', '/amigos', a.token)).datos.codigo).toBe(a.codigo)
  })

  it('pedir, aceptar y borrar', async () => {
    const [a, b] = [await persona('Ana'), await persona('Beto')]
    expect((await api('POST', '/amigos/agregar', a.token, { codigo: b.codigo.toLowerCase() })).datos).toEqual({ amigos: false })
    expect((await api('POST', '/amigos/agregar', a.token, { codigo: b.codigo })).datos.motivo).toBe('Ya le mandaste la solicitud')
    expect((await api('GET', '/amigos', a.token)).datos.enviadas).toEqual([{ id: b.id, apodo: 'Beto', avatar: null }])
    expect((await api('GET', '/amigos', b.token)).datos.recibidas).toEqual([{ id: a.id, apodo: 'Ana', avatar: null }])
    await api('POST', '/amigos/responder', b.token, { id: a.id, aceptar: true })
    const deA = (await api('GET', '/amigos', a.token)).datos
    expect(deA.amigos).toEqual([{ id: b.id, apodo: 'Beto', avatar: null, estado: 'conectado', sala: null }])
    expect(deA.enviadas).toEqual([])
    expect((await api('POST', '/amigos/agregar', b.token, { codigo: a.codigo })).datos.motivo).toBe('Ya son amigos')
    await api('POST', '/amigos/borrar', a.token, { id: b.id })
    expect((await api('GET', '/amigos', b.token)).datos.amigos).toEqual([])
  })

  it('si los dos se piden, quedan amigos; rechazar borra la solicitud', async () => {
    const [a, b, c] = [await persona('Ana'), await persona('Beto'), await persona('Ceci')]
    await api('POST', '/amigos/agregar', a.token, { codigo: b.codigo })
    expect((await api('POST', '/amigos/agregar', b.token, { codigo: a.codigo })).datos).toEqual({ amigos: true })
    await api('POST', '/amigos/agregar', c.token, { codigo: a.codigo })
    await api('POST', '/amigos/responder', a.token, { id: c.id, aceptar: false })
    expect((await api('GET', '/amigos', c.token)).datos.enviadas).toEqual([])
    expect((await api('POST', '/amigos/agregar', a.token, { codigo: a.codigo })).datos.motivo).toBe('Ese es tu código')
    expect((await api('POST', '/amigos/agregar', a.token, { codigo: 'ZZZZZZ' })).datos.motivo).toBe('No hay nadie con ese código')
  })

  it('en una sala se ve dónde está, y se invita solo a amigos desde una sala que espera', async () => {
    const [a, b, c] = [await persona('Ana'), await persona('Beto'), await persona('Ceci')]
    await api('POST', '/amigos/agregar', a.token, { codigo: b.codigo })
    await api('POST', '/amigos/responder', b.token, { id: a.id, aceptar: true })
    expect((await api('POST', '/amigos/invitar', a.token, { id: b.id })).datos.motivo).toMatch(/sala privada/)

    const sala = await Jugador.crear(colyseus, { config: { formato: '2v2' }, token: a.token })
    await sala.esperar(() => sala.sala !== null)
    const amigosDeB = (await api('GET', '/amigos', b.token)).datos.amigos as Datos[]
    expect(amigosDeB[0]).toMatchObject({ estado: 'enSala', sala: sala.room.roomId })
    expect((await api('POST', '/amigos/invitar', a.token, { id: c.id })).datos.motivo).toBe('Solo podés invitar a tus amigos')
    await api('POST', '/amigos/invitar', a.token, { id: b.id })
    const latido = (await api('POST', '/amigos/latido', b.token)).datos.invitaciones as Datos[]
    expect(latido).toEqual([expect.objectContaining({ de: a.id, apodo: 'Ana', sala: sala.room.roomId })])
    // Se entrega una sola vez.
    expect((await api('POST', '/amigos/latido', b.token)).datos.invitaciones).toEqual([])

    await sala.room.leave()
    await new Promise((r) => setTimeout(r, 100))
    expect(((await api('GET', '/amigos', b.token)).datos.amigos as Datos[])[0]).toMatchObject({ sala: null })
  })
})

describe('presencia', () => {
  it('sin latidos se da por desconectado', () => {
    let ahora = 0
    const p = new Presencia(() => ahora)
    p.latido('x')
    expect(p.estado('x').estado).toBe('conectado')
    ahora = VIGENCIA_LATIDO_MS + 1
    expect(p.estado('x').estado).toBe('desconectado')
    let jugando = false
    p.entrarASala('x', { codigo: 'ABCDE', jugando: () => jugando })
    expect(p.estado('x')).toEqual({ estado: 'enSala', sala: 'ABCDE' })
    jugando = true
    expect(p.estado('x')).toEqual({ estado: 'jugando', sala: null })
  })
})
