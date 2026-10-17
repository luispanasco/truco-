import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { Jugador, levantar } from './helpers'

let colyseus: ColyseusTestServer
let base: Base

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2591, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, reconexionS: 1 },
  }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
beforeEach(async () => colyseus.cleanup())

/** La API por el cliente http del servidor de prueba (escucha en su propio puerto). */
async function api(metodo: 'GET' | 'POST' | 'PUT', ruta: string, token: string | null, cuerpo?: unknown) {
  const http = { GET: colyseus.http.get, POST: colyseus.http.post, PUT: colyseus.http.put }[metodo]
  const headers = { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }
  try {
    const r = await http(`/api${ruta}`, { headers, ...(cuerpo !== undefined ? { body: cuerpo } : {}) })
    return { status: r.statusCode, datos: r.data as Record<string, unknown> }
  } catch (e) {
    const r = e as { statusCode: number; data: Record<string, unknown> }
    return { status: r.statusCode, datos: r.data }
  }
}

describe('cuentas', () => {
  it('el estado avisa que hay cuentas y login de prueba', async () => {
    expect((await api('GET', '/estado', null)).datos).toEqual({ cuentas: true, loginDePrueba: true })
  })

  it('sin sesión válida no se entra', async () => {
    expect((await api('POST', '/entrar', null, {})).status).toBe(401)
    expect((await api('POST', '/entrar', 'cualquiera', {})).status).toBe(401)
  })

  it('la primera vez se crea con lo del invitado; después vale lo guardado', async () => {
    const token = 'prueba:pepe@ejemplo.com'
    const primera = await api('POST', '/entrar', token, { invitadoId: 'invitado-pepe-1', apodo: 'Pepe', preferencias: { formato: '2v2' } })
    expect(primera.status).toBe(200)
    expect(primera.datos).toMatchObject({ email: 'pepe@ejemplo.com', apodo: 'Pepe', preferencias: { formato: '2v2' }, nueva: true })
    // Desde otro navegador, con otro invitado: no pisa lo de la cuenta, pero lo vincula.
    const segunda = await api('POST', '/entrar', token, { invitadoId: 'invitado-pepe-2', apodo: 'Otro', preferencias: { formato: '1v1' } })
    expect(segunda.datos).toMatchObject({ id: primera.datos.id, apodo: 'Pepe', preferencias: { formato: '2v2' }, nueva: false })
    const vinculados = await base.consultar<{ invitado_id: string }>('select invitado_id from invitados where cuenta_id = $1 order by 1', [primera.datos.id])
    expect(vinculados.map((v) => v.invitado_id)).toEqual(['invitado-pepe-1', 'invitado-pepe-2'])
  })

  it('el perfil se guarda validado', async () => {
    const token = 'prueba:ana@ejemplo.com'
    await api('POST', '/entrar', token, { apodo: 'Ana' })
    const r = await api('PUT', '/perfil', token, { apodo: '   Anita la del truco con nombre larguísimo  ', avatar: 'basura', preferencias: { mesa: 'boliche' } })
    expect(r.datos.apodo).toBe('Anita la del truco c')
    expect(r.datos.avatar).toBeNull()
    expect(r.datos.preferencias).toEqual({ mesa: 'boliche' })
    expect((await api('PUT', '/perfil', token, { preferencias: { x: 'a'.repeat(9_000) } })).datos.preferencias).toEqual({ mesa: 'boliche' })
  })

  it('en la sala, con la cuenta se recupera el lugar desde otro dispositivo', async () => {
    const token = 'prueba:luis@ejemplo.com'
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, token })
    await a.esperar(() => a.sala?.yo != null)
    const b = await Jugador.unirse(colyseus, a.room.roomId, Jugador.nuevoId(), 'Luis en el celu', { token })
    await b.esperar(() => b.sala?.yo != null)
    expect(b.sala!.yo).toBe(a.sala!.yo)
  })

  it('un token vencido no deja entrar a la sala', async () => {
    await expect(Jugador.crear(colyseus, { token: 'no-sirve' })).rejects.toThrow(/sesión venció/)
  })
})
