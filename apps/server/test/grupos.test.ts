import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { MAX_GRUPOS, MAX_GRUPOS_POR_PERSONA } from '@truco/shared'
import { Presencia } from '../src/cuentas/presencia'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { Jugador, levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let n = 0
/** El puerto en el que quedó escuchando (boot elige el suyo). */
let url = ''

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2601, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 },
  }))
  url = `http://127.0.0.1:${(colyseus.server as unknown as { port: number }).port}`
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
// Cada test arranca sin grupos (el tope es de toda la app).
beforeEach(async () => {
  await base.consultar('delete from grupos')
})

type Datos = Record<string, unknown>
async function api(metodo: 'GET' | 'POST' | 'PUT', ruta: string, token: string | null, cuerpo?: unknown) {
  const r = await fetch(`${url}/api${ruta}`, {
    method: metodo,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'content-type': cuerpo instanceof Uint8Array ? 'image/webp' : 'application/json',
    },
    ...(cuerpo === undefined ? {} : { body: cuerpo instanceof Uint8Array ? cuerpo : JSON.stringify(cuerpo) }),
  })
  const texto = r.headers.get('content-type')?.includes('json') ? ((await r.json()) as Datos) : {}
  return { status: r.status, datos: texto, r }
}

async function persona(apodo: string) {
  const token = `prueba:grupo${++n}@ejemplo.com`
  const entrar = await api('POST', '/entrar', token, { apodo })
  return { token, id: entrar.datos.id as string }
}

const config = (nombre: string, extra: Datos = {}) => ({ nombre, sigla: 'TRU', descripcion: '', ingreso: 'abierto', cupo: null, ...extra })

async function crear(token: string, nombre: string, extra: Datos = {}) {
  const r = await api('POST', '/grupos/crear', token, config(nombre, extra))
  expect(r.status, JSON.stringify(r.datos)).toBe(200)
  return r.datos.id as string
}
const detalle = async (token: string, id: string) => (await api('POST', '/grupos/detalle', token, { id })).datos
const roles = async (token: string, id: string) =>
  Object.fromEntries((((await detalle(token, id)).lista as { apodo: string; rol: string }[]) ?? []).map((m) => [m.apodo, m.rol]))

/** Una imagen WebP mínima de verdad (1×1). */
const WEBP = Uint8Array.from(
  Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=', 'base64'),
)

describe('grupos', () => {
  it('crear: quien lo crea es el líder; el nombre no se repite y se valida', async () => {
    const ana = await persona('Ana')
    const id = await crear(ana.token, 'Los del Boliche')
    const d = await detalle(ana.token, id)
    expect(d).toMatchObject({ nombre: 'Los del Boliche', sigla: 'TRU', rol: 'lider', miembros: 1, foto: null })
    expect(d.codigo).toMatch(/^[A-Z0-9]{7}$/)
    expect((await api('POST', '/grupos/crear', ana.token, config('los del boliche'))).datos.motivo).toBe('Ya hay un grupo con ese nombre')
    expect((await api('POST', '/grupos/crear', ana.token, config('A'))).datos.motivo).toMatch(/El nombre va de 3 a 24/)
    expect((await api('POST', '/grupos/crear', ana.token, config('Otro', { sigla: 'T R' }))).datos.motivo).toMatch(/sigla/)
    // Sin sesión, nada.
    expect((await api('GET', '/grupos', null)).status).toBe(401)
  })

  it(`hay un tope de ${MAX_GRUPOS} grupos en toda la app`, async () => {
    for (let i = 0; i < MAX_GRUPOS; i++) await crear((await persona(`P${i}`)).token, `Grupo ${i}`)
    const otro = await persona('Otro')
    expect((await api('GET', '/grupos', otro.token)).datos.quedan).toBe(0)
    const r = await api('POST', '/grupos/crear', otro.token, config('Uno más'))
    expect(r.status).toBe(409)
    expect(r.datos.motivo).toBe(`Ya hay ${MAX_GRUPOS} grupos, el máximo de la beta`)
  })

  it(`una persona está en varios grupos, hasta ${MAX_GRUPOS_POR_PERSONA}`, async () => {
    const beto = await persona('Beto')
    const ids: string[] = []
    for (let i = 0; i <= MAX_GRUPOS_POR_PERSONA; i++) ids.push(await crear((await persona(`L${i}`)).token, `Barra ${i}`))
    for (const id of ids.slice(0, MAX_GRUPOS_POR_PERSONA)) expect((await api('POST', '/grupos/entrar', beto.token, { id })).datos).toEqual({ adentro: true })
    expect((await api('GET', '/grupos', beto.token)).datos.tuyos).toHaveLength(MAX_GRUPOS_POR_PERSONA)
    const r = await api('POST', '/grupos/entrar', beto.token, { id: ids.at(-1) })
    expect(r.datos.motivo).toBe(`Ya estás en ${MAX_GRUPOS_POR_PERSONA} grupos, el máximo`)
  })

  it('con solicitud: queda pedido y lo acepta un capitán; los miembros no ven las solicitudes', async () => {
    const [ana, beto, caro] = [await persona('Ana'), await persona('Beto'), await persona('Caro')]
    const id = await crear(ana.token, 'La Barra', { ingreso: 'solicitud' })
    expect((await api('POST', '/grupos/entrar', beto.token, { id })).datos).toEqual({ adentro: false })
    expect((await api('GET', '/grupos', beto.token)).datos.buscar).toMatchObject([{ id, pedido: true, rol: null }])
    expect((await api('POST', '/grupos/entrar', beto.token, { id })).datos.motivo).toMatch(/Ya pediste/)
    await api('POST', '/grupos/responder', ana.token, { id, cuenta: beto.id, aceptar: true })
    expect(await roles(ana.token, id)).toEqual({ Ana: 'lider', Beto: 'miembro' })
    // Un miembro no ve el código ni las solicitudes, y no puede responder.
    await api('POST', '/grupos/entrar', caro.token, { id })
    expect(await detalle(beto.token, id)).toMatchObject({ codigo: null, solicitudes: null })
    expect((await api('POST', '/grupos/responder', beto.token, { id, cuenta: caro.id, aceptar: true })).datos.motivo).toMatch(/Solo los capitanes/)
    // Ya de capitán, sí.
    await api('POST', '/grupos/rol', ana.token, { id, cuenta: beto.id, rol: 'capitan' })
    expect((await detalle(beto.token, id)).solicitudes).toEqual([{ id: caro.id, apodo: 'Caro', avatar: null }])
    await api('POST', '/grupos/responder', beto.token, { id, cuenta: caro.id, aceptar: false })
    expect((await detalle(ana.token, id)).solicitudes).toEqual([])
  })

  it('cerrado: no aparece para buscar ni se ve, pero con el código se entra; renovar el código invalida el viejo', async () => {
    const [ana, beto, caro] = [await persona('Ana'), await persona('Beto'), await persona('Caro')]
    const id = await crear(ana.token, 'Secreto', { ingreso: 'cerrado' })
    expect((await api('GET', '/grupos', beto.token)).datos.buscar).toEqual([])
    expect((await api('POST', '/grupos/detalle', beto.token, { id })).status).toBe(404)
    const codigo = (await detalle(ana.token, id)).codigo as string
    expect((await api('POST', '/grupos/codigo', beto.token, { codigo: codigo.toLowerCase() })).datos).toEqual({ id })
    const nuevo = (await api('POST', '/grupos/renovar-codigo', ana.token, { id })).datos.codigo
    expect(nuevo).not.toBe(codigo)
    expect((await api('POST', '/grupos/codigo', caro.token, { codigo })).datos.motivo).toBe('No hay ningún grupo con ese código')
    expect((await api('POST', '/grupos/codigo', caro.token, { codigo: nuevo })).datos).toEqual({ id })
  })

  it('el cupo: lleno no entra nadie más, y no se puede bajar de los que ya son', async () => {
    const [ana, beto, caro] = [await persona('Ana'), await persona('Beto'), await persona('Caro')]
    const id = await crear(ana.token, 'Chicos', { cupo: 2 })
    await api('POST', '/grupos/entrar', beto.token, { id })
    expect((await api('POST', '/grupos/entrar', caro.token, { id })).datos.motivo).toBe('El grupo está lleno')
    await api('POST', '/grupos/configurar', ana.token, { id, ...config('Chicos', { cupo: 3 }) })
    await api('POST', '/grupos/entrar', caro.token, { id })
    expect((await api('POST', '/grupos/configurar', ana.token, { id, ...config('Chicos', { cupo: 2 }) })).datos.motivo).toMatch(/Ya son 3/)
  })

  it('roles: el capitán expulsa miembros pero no capitanes; solo el líder configura y nombra capitanes', async () => {
    const [ana, beto, caro, dani] = [await persona('Ana'), await persona('Beto'), await persona('Caro'), await persona('Dani')]
    const id = await crear(ana.token, 'Los Pibes')
    for (const p of [beto, caro, dani]) await api('POST', '/grupos/entrar', p.token, { id })
    await api('POST', '/grupos/rol', ana.token, { id, cuenta: beto.id, rol: 'capitan' })
    await api('POST', '/grupos/rol', ana.token, { id, cuenta: caro.id, rol: 'capitan' })
    expect((await api('POST', '/grupos/expulsar', beto.token, { id, cuenta: caro.id })).datos.motivo).toBe('No podés sacar a esa persona')
    expect((await api('POST', '/grupos/expulsar', beto.token, { id, cuenta: ana.id })).datos.motivo).toBe('No podés sacar a esa persona')
    expect((await api('POST', '/grupos/expulsar', beto.token, { id, cuenta: dani.id })).datos).toEqual({ ok: true })
    expect((await api('POST', '/grupos/rol', beto.token, { id, cuenta: caro.id, rol: 'miembro' })).datos.motivo).toBe('Solo el líder cambia los roles')
    expect((await api('POST', '/grupos/configurar', beto.token, { id, ...config('Otro nombre') })).datos.motivo).toMatch(/Solo el líder/)
    expect((await api('POST', '/grupos/expulsar', ana.token, { id, cuenta: caro.id })).datos).toEqual({ ok: true })
    expect(await roles(ana.token, id)).toEqual({ Ana: 'lider', Beto: 'capitan' })
  })

  it('el liderazgo: se pasa a mano; si el líder se va, hereda el capitán más antiguo; sin nadie, el grupo se borra', async () => {
    const [ana, beto, caro] = [await persona('Ana'), await persona('Beto'), await persona('Caro')]
    const id = await crear(ana.token, 'Herencia')
    await api('POST', '/grupos/entrar', beto.token, { id })
    await api('POST', '/grupos/entrar', caro.token, { id })
    // A mano: Ana se lo pasa a Caro y queda de capitana; Caro se lo devuelve.
    await api('POST', '/grupos/liderazgo', ana.token, { id, cuenta: caro.id })
    expect(await roles(ana.token, id)).toEqual({ Caro: 'lider', Ana: 'capitan', Beto: 'miembro' })
    await api('POST', '/grupos/liderazgo', caro.token, { id, cuenta: ana.id })
    expect(await roles(ana.token, id)).toEqual({ Ana: 'lider', Caro: 'capitan', Beto: 'miembro' })
    // Se va Ana: hereda Caro, la capitana, aunque Beto entró antes.
    await api('POST', '/grupos/salir', ana.token, { id })
    expect(await roles(beto.token, id)).toEqual({ Caro: 'lider', Beto: 'miembro' })
    // Sin capitanes, el miembro más antiguo; y el último que se va borra el grupo.
    await api('POST', '/grupos/salir', caro.token, { id })
    expect(await roles(beto.token, id)).toEqual({ Beto: 'lider' })
    await api('POST', '/grupos/salir', beto.token, { id })
    expect((await api('POST', '/grupos/detalle', beto.token, { id })).status).toBe(404)
  })
  it('la foto: solo el líder, solo imágenes, y se sirve con su tipo', async () => {
    const [ana, beto] = [await persona('Ana'), await persona('Beto')]
    const id = await crear(ana.token, 'Con Foto')
    await api('POST', '/grupos/entrar', beto.token, { id })
    expect((await api('PUT', `/grupos/${id}/foto`, beto.token, WEBP)).datos.motivo).toBe('Solo el líder cambia la foto')
    expect((await api('PUT', `/grupos/${id}/foto`, ana.token, new TextEncoder().encode('<script>hola</script>'))).datos.motivo).toMatch(/no es una foto/)
    const r = await api('PUT', `/grupos/${id}/foto`, ana.token, WEBP)
    expect(r.datos).toEqual({ foto: 1 })
    expect((await detalle(beto.token, id)).foto).toBe(1)
    const foto = await fetch(`${url}/api/grupos/${id}/foto?v=1`)
    expect(foto.headers.get('content-type')).toBe('image/webp')
    expect(new Uint8Array(await foto.arrayBuffer())).toEqual(WEBP)
    expect((await api('POST', '/grupos/sacar-foto', ana.token, { id })).datos).toEqual({ foto: null })
    expect((await fetch(`${url}/api/grupos/${id}/foto?v=2`)).status).toBe(404)
  })

  it('borrar: solo el líder, y se lleva miembros y solicitudes', async () => {
    const [ana, beto] = [await persona('Ana'), await persona('Beto')]
    const id = await crear(ana.token, 'Efímero', { ingreso: 'solicitud' })
    await api('POST', '/grupos/entrar', beto.token, { id })
    expect((await api('POST', '/grupos/borrar', beto.token, { id })).datos.motivo).toBe('No estás en ese grupo')
    expect((await api('POST', '/grupos/borrar', ana.token, { id })).datos).toEqual({ ok: true })
    expect((await api('GET', '/grupos', ana.token)).datos).toMatchObject({ tuyos: [], buscar: [], quedan: MAX_GRUPOS })
  })

  it('armar partida: llama a todo el grupo a tu sala; quién llama se configura, y hay una espera entre llamadas', async () => {
    const [ana, beto, caro] = [await persona('Ana'), await persona('Beto'), await persona('Caro')]
    const id = await crear(ana.token, 'Los del Truco')
    for (const p of [beto, caro]) await api('POST', '/grupos/entrar', p.token, { id })
    expect((await detalle(ana.token, id)).convocan).toBe('todos')
    // Sin sala, no.
    expect((await api('POST', '/grupos/convocar', beto.token, { id })).datos.motivo).toMatch(/sala privada/)

    const sala = await Jugador.crear(colyseus, { config: { formato: '2v2' }, token: beto.token })
    await sala.esperar(() => sala.sala !== null)
    // En el grupo se ve que Beto espera en una sala, para unirse.
    const lista = (await detalle(ana.token, id)).lista as Datos[]
    expect(lista.find((m) => m.apodo === 'Beto')).toMatchObject({ estado: 'enSala', sala: sala.room.roomId })

    expect((await api('POST', '/grupos/convocar', beto.token, { id })).datos).toEqual({ invitados: 2 })
    const llega = (await api('POST', '/amigos/latido', caro.token)).datos.invitaciones as Datos[]
    expect(llega).toEqual([expect.objectContaining({ de: beto.id, apodo: 'Beto', sala: sala.room.roomId, grupo: '[TRU] Los del Truco' })])
    expect((await api('POST', '/amigos/latido', beto.token)).datos.invitaciones).toEqual([])
    // Enseguida de nuevo, no.
    expect((await api('POST', '/grupos/convocar', beto.token, { id })).datos.motivo).toBe('Ya llamaste al grupo hace un ratito')
    // Alguien de afuera tampoco.
    const otro = await persona('Otro')
    expect((await api('POST', '/grupos/convocar', otro.token, { id })).datos.motivo).toBe('No estás en ese grupo')

    // Con "líder y capitanes", un miembro ya no llama.
    expect((await api('POST', '/grupos/configurar', ana.token, { id, ...config('Los del Truco', { convocan: 'capitanes' }) })).status).toBe(200)
    expect((await api('POST', '/grupos/convocar', caro.token, { id })).datos.motivo).toMatch(/solo el líder y los capitanes/)
    expect((await api('POST', '/grupos/configurar', ana.token, { id, ...config('Los del Truco', { convocan: 'nadie' }) })).datos.motivo).toBe(
      'Elegí quién arma partidas',
    )
    await sala.room.leave()
  })
})

describe('la espera entre llamadas al grupo', () => {
  it('es por persona y por grupo', () => {
    let ahora = 0
    const p = new Presencia(() => ahora)
    expect(p.puedeConvocar('a', 'g1', 1000)).toBe(true)
    expect(p.puedeConvocar('a', 'g1', 1000)).toBe(false)
    expect(p.puedeConvocar('a', 'g2', 1000)).toBe(true)
    expect(p.puedeConvocar('b', 'g1', 1000)).toBe(true)
    ahora = 1000
    expect(p.puedeConvocar('a', 'g1', 1000)).toBe(true)
  })
})
