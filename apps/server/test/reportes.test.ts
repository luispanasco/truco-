import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { crearConfig } from '@truco/engine'
import { MAX_DESCRIPCION_REPORTE, pasosDeRepeticion, type RepeticionPartida } from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { LimiteReportes } from '../src/cuentas/reportes'
import { Jugador, levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let url = ''
let n = 0
const ADMIN = 'admin-reportes@ejemplo.com'

beforeAll(async () => {
  process.env.ADMINS = ADMIN
  base = await baseLocal()
  ;({ colyseus } = await levantar(2603, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 },
  }))
  url = `http://127.0.0.1:${(colyseus.server as unknown as { port: number }).port}`
})
afterAll(async () => {
  delete process.env.ADMINS
  await colyseus.shutdown()
  await base.cerrar()
})

type Datos = Record<string, unknown>
/** Cada test con su IP (el límite es por IP e invitado), salvo que diga otra cosa. */
async function api(metodo: 'GET' | 'POST', ruta: string, op: { token?: string; cuerpo?: unknown; ip?: string } = {}) {
  const r = await fetch(`${url}/api${ruta}`, {
    method: metodo,
    headers: {
      ...(op.token ? { authorization: `Bearer ${op.token}` } : {}),
      'content-type': 'application/json',
      'fly-client-ip': op.ip ?? `10.0.0.${++n}`,
    },
    ...(op.cuerpo === undefined ? {} : { body: typeof op.cuerpo === 'string' ? op.cuerpo : JSON.stringify(op.cuerpo) }),
  })
  const datos = r.headers.get('content-type')?.includes('json') ? ((await r.json()) as Datos) : {}
  return { status: r.status, datos }
}

const reporte = (extra: Datos = {}) => ({
  tipo: 'reglas',
  descripcion: 'El envido no sumó bien',
  invitadoId: `invitado-reporte-${++n}`,
  apodo: 'Tester',
  contexto: { version: '0.1.0-test', ruta: '/mesa', navegador: 'vitest', pantalla: '380x800' },
  ...extra,
})

/** Una repetición chiquita (sin acciones): la partida recién repartida. */
const repeticionLocal = (): RepeticionPartida => ({
  fecha: new Date().toISOString(),
  semilla: 77,
  reparte: 1,
  config: crearConfig({ formato: '1v1', puntosPartida: 20 }),
  jugadores: [
    { asiento: 0, apodo: 'Tester', bot: false },
    { asiento: 1, apodo: 'Bot Pepe', bot: true },
  ],
  acciones: [],
  resultado: null,
})

describe('reportes de problemas', () => {
  it('se manda sin cuenta; solo el admin los lista y ve la partida', async () => {
    const r = await api('POST', '/reportes', { cuerpo: reporte({ contexto: { ruta: '/mesa', local: { modo: 'compu', repeticion: repeticionLocal() } } }) })
    expect(r.status, JSON.stringify(r.datos)).toBe(200)
    const id = r.datos.id as number
    expect(id).toBeGreaterThan(0)

    expect((await api('GET', '/reportes')).status).toBe(401)
    expect((await api('GET', '/reportes', { token: 'prueba:curioso@ejemplo.com' })).status).toBe(403)
    const lista = await api('GET', '/reportes', { token: `prueba:${ADMIN}` })
    expect(lista.status).toBe(200)
    const fila = (lista.datos.reportes as Datos[]).find((x) => x.id === id)!
    expect(fila).toMatchObject({ tipo: 'reglas', descripcion: 'El envido no sumó bien', apodo: 'Tester', cuentaId: null, donde: 'Contra la compu', ruta: '/mesa', conRepeticion: true })

    const partida = await api('GET', `/reportes/${id}/repeticion`, { token: `prueba:${ADMIN}` })
    expect(partida.status).toBe(200)
    expect(pasosDeRepeticion(partida.datos as unknown as RepeticionPartida).length).toBe(1)
    expect((await api('GET', `/reportes/${id}/repeticion`, { token: 'prueba:curioso@ejemplo.com' })).status).toBe(403)
    expect((await api('GET', '/reportes/999999/repeticion', { token: `prueba:${ADMIN}` })).status).toBe(404)
  })

  it('con cuenta, queda anotada', async () => {
    const token = 'prueba:tester-con-cuenta@ejemplo.com'
    const entrar = await api('POST', '/entrar', { token, cuerpo: { apodo: 'Con Cuenta' } })
    const r = await api('POST', '/reportes', { token, cuerpo: reporte({ tipo: 'visual', descripcion: '' }) })
    expect(r.status).toBe(200)
    const lista = await api('GET', '/reportes', { token: `prueba:${ADMIN}` })
    const fila = (lista.datos.reportes as Datos[]).find((x) => x.id === r.datos.id)!
    expect(fila).toMatchObject({ tipo: 'visual', cuentaId: entrar.datos.id, email: 'tester-con-cuenta@ejemplo.com', donde: 'Fuera de una partida', conRepeticion: false })
  })

  it('valida el tipo, la descripción, el invitado y el tamaño', async () => {
    expect((await api('POST', '/reportes', { cuerpo: reporte({ tipo: 'cualquiera' }) })).status).toBe(400)
    expect((await api('POST', '/reportes', { cuerpo: reporte({ tipo: undefined }) })).status).toBe(400)
    expect((await api('POST', '/reportes', { cuerpo: reporte({ descripcion: 'x'.repeat(MAX_DESCRIPCION_REPORTE + 1) }) })).status).toBe(400)
    expect((await api('POST', '/reportes', { cuerpo: reporte({ descripcion: 3 }) })).status).toBe(400)
    expect((await api('POST', '/reportes', { cuerpo: reporte({ invitadoId: 'corto' }) })).status).toBe(400)
    // Un cuerpo de más de 1 MB no se lee.
    const grande = reporte({ contexto: { vista: 'x'.repeat(1_100_000) } })
    expect((await api('POST', '/reportes', { cuerpo: grande })).status).toBe(413)
  })

  it('a la IP (o al invitado) le deja mandar 10 por hora', async () => {
    const ip = '10.9.9.9'
    for (let i = 0; i < 10; i++) expect((await api('POST', '/reportes', { ip, cuerpo: reporte() })).status).toBe(200)
    const r = await api('POST', '/reportes', { ip, cuerpo: reporte() })
    expect(r.status).toBe(429)
    expect(r.datos.motivo).toMatch(/muchos reportes/)

    const invitadoId = 'invitado-insistente-1'
    for (let i = 0; i < 10; i++) expect((await api('POST', '/reportes', { cuerpo: reporte({ invitadoId }) })).status).toBe(200)
    expect((await api('POST', '/reportes', { cuerpo: reporte({ invitadoId }) })).status).toBe(429)
  })

  it('el límite se renueva a la hora', () => {
    let ahora = 0
    const l = new LimiteReportes(2, () => ahora)
    expect(l.permitir(['a'])).toBe(true)
    expect(l.permitir(['a', 'b'])).toBe(true)
    expect(l.permitir(['b'])).toBe(true)
    expect(l.permitir(['a'])).toBe(false)
    ahora = 60 * 60 * 1000
    expect(l.permitir(['a'])).toBe(true)
  })

  it('online: el servidor adjunta la partida de la sala solo a quien juega en ella', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' }, botsEnVacios: true })
    await a.esperar(() => a.sala !== null)
    a.autoJugar(5)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vistas.length > 6, 10_000, 'unas jugadas')
    a.dejarDeJugar()
    const sala = a.room.roomId
    const online = { sala, codigo: a.sala!.codigo, asiento: 0 }

    const r = await api('POST', '/reportes', { cuerpo: reporte({ invitadoId: a.invitadoId, tipo: 'bot', contexto: { online } }) })
    expect(r.status, JSON.stringify(r.datos)).toBe(200)
    const partida = await api('GET', `/reportes/${r.datos.id}/repeticion`, { token: `prueba:${ADMIN}` })
    expect(partida.status).toBe(200)
    const rep = partida.datos as unknown as RepeticionPartida
    expect(rep.jugadores.length).toBe(2)
    expect(rep.acciones.length).toBeGreaterThan(0)
    // Se vuelve a jugar entera con el motor.
    expect(pasosDeRepeticion(rep).length).toBe(rep.acciones.length + 1)
    const lista = await api('GET', '/reportes', { token: `prueba:${ADMIN}` })
    expect((lista.datos.reportes as Datos[]).find((x) => x.id === r.datos.id)).toMatchObject({ donde: `Online (sala ${sala})`, conRepeticion: true })

    // Alguien que no está en la mesa no se la lleva.
    const ajeno = await api('POST', '/reportes', { cuerpo: reporte({ contexto: { online } }) })
    expect(ajeno.status).toBe(200)
    expect((await api('GET', `/reportes/${ajeno.datos.id}/repeticion`, { token: `prueba:${ADMIN}` })).status).toBe(404)
    await a.room.leave(true)
  })
})
