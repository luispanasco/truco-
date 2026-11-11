import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { GUARDA_CHAT_GRUPO, TRAE_CHAT_GRUPO, type MensajeGrupo, type ResumenGrupo } from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { chatDeGrupo, LimiteChatGrupo, mandarAlChat } from '../src/cuentas/chatGrupo'
import { levantar } from './helpers'

let base: Base
let colyseus: ColyseusTestServer
let url = ''
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2607, {
    cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true },
  }))
  url = `http://127.0.0.1:${(colyseus.server as unknown as { port: number }).port}`
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})

type Datos = Record<string, unknown>
async function api(token: string, metodo: 'GET' | 'POST' | 'DELETE', ruta: string, cuerpo?: unknown) {
  const r = await fetch(`${url}/api${ruta}`, {
    method: metodo,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  })
  return { status: r.status, datos: (await r.json()) as Datos }
}

/** Una cuenta nueva (entra con el login de prueba): su token y su id. */
async function cuenta(apodo: string): Promise<{ token: string; id: string }> {
  const token = `prueba:chat${++n}@ejemplo.com`
  const r = await api(token, 'POST', '/entrar', { apodo })
  return { token, id: r.datos.id as string }
}

let grupos = 0
async function grupoCon(lider: string, ...otros: string[]): Promise<string> {
  const r = await api(lider, 'POST', '/grupos/crear', { nombre: `Grupo del chat ${++grupos}`, sigla: `C${grupos}`, ingreso: 'abierto', convocan: 'todos' })
  const id = r.datos.id as string
  for (const o of otros) await api(o, 'POST', '/grupos/entrar', { id })
  return id
}

const mensajes = (d: Datos) => d.mensajes as MensajeGrupo[]

describe('el chat del grupo', () => {
  it('manda textos (filtrados) y emotes, los trae en orden con apodo y avatar, y lo nuevo con desde', async () => {
    const [ana, beto] = [await cuenta('Ana'), await cuenta('Beto')]
    const g = await grupoCon(ana.token, beto.token)
    expect(mensajes((await api(ana.token, 'GET', `/grupos/${g}/chat`)).datos)).toEqual([])

    const texto = await api(ana.token, 'POST', `/grupos/${g}/chat`, { texto: '  ¿Quién   juega?  Sos un pelotudo ' })
    expect(texto.status).toBe(200)
    expect(texto.datos).toMatchObject({ tipo: 'texto', texto: '¿Quién juega? Sos un ********', senia: null, autor: { id: ana.id, apodo: 'Ana' } })
    const emote = await api(beto.token, 'POST', `/grupos/${g}/chat`, { senia: 'perico' })
    expect(emote.datos).toMatchObject({ tipo: 'emote', senia: 'perico', texto: null, autor: { apodo: 'Beto' } })

    const todo = mensajes((await api(beto.token, 'GET', `/grupos/${g}/chat`)).datos)
    expect(todo.map((m) => m.autor.apodo)).toEqual(['Ana', 'Beto'])
    expect(todo[0]!.autor).toHaveProperty('avatar')
    expect(typeof todo[0]!.creado).toBe('string')
    const nuevos = mensajes((await api(ana.token, 'GET', `/grupos/${g}/chat?desde=${todo[0]!.id}`)).datos)
    expect(nuevos.map((m) => m.id)).toEqual([todo[1]!.id])
  })

  it('valida lo que se manda y solo lo ven los del grupo (404 como el muro)', async () => {
    const [ana, beto, caro] = [await cuenta('Ana'), await cuenta('Beto'), await cuenta('Caro')]
    const g = await grupoCon(ana.token, beto.token)
    expect((await api(ana.token, 'POST', `/grupos/${g}/chat`, { texto: '   ' })).status).toBe(400)
    expect((await api(beto.token, 'POST', `/grupos/${g}/chat`, { texto: 'x'.repeat(201) })).status).toBe(400)
    expect((await api(caro.token, 'POST', `/grupos/${g}/chat`, { senia: 'cualquiera' })).status).toBe(400)
    await new Promise((r) => setTimeout(r, 1100))
    expect((await api(ana.token, 'POST', `/grupos/${g}/chat`, { texto: 'x'.repeat(200) })).status).toBe(200)
    expect((await api(caro.token, 'GET', `/grupos/${g}/chat`)).status).toBe(404)
    await new Promise((r) => setTimeout(r, 1100))
    expect((await api(caro.token, 'POST', `/grupos/${g}/chat`, { texto: 'hola' })).status).toBe(404)
    expect((await api(caro.token, 'GET', `/grupos/no-existe/chat`)).status).toBe(404)
  })

  it('borra el autor o el líder y los capitanes; un miembro no borra lo ajeno', async () => {
    const [ana, beto, caro] = [await cuenta('Ana'), await cuenta('Beto'), await cuenta('Caro')]
    const g = await grupoCon(ana.token, beto.token, caro.token)
    const deBeto = (await api(beto.token, 'POST', `/grupos/${g}/chat`, { texto: 'uno' })).datos.id as number
    const deCaro = (await api(caro.token, 'POST', `/grupos/${g}/chat`, { texto: 'dos' })).datos.id as number
    const deAna = (await api(ana.token, 'POST', `/grupos/${g}/chat`, { senia: 'flor' })).datos.id as number
    expect((await api(caro.token, 'DELETE', `/grupos/${g}/chat/${deBeto}`)).status).toBe(403)
    expect((await api(caro.token, 'DELETE', `/grupos/${g}/chat/${deCaro}`)).status).toBe(200)
    expect((await api(ana.token, 'DELETE', `/grupos/${g}/chat/${deBeto}`)).status).toBe(200)
    expect((await api(ana.token, 'DELETE', `/grupos/${g}/chat/${deBeto}`)).status).toBe(404)
    expect(mensajes((await api(beto.token, 'GET', `/grupos/${g}/chat`)).datos).map((m) => m.id)).toEqual([deAna])
  })

  it('más de uno por segundo da 429', async () => {
    const ana = await cuenta('Ana')
    const g = await grupoCon(ana.token)
    expect((await api(ana.token, 'POST', `/grupos/${g}/chat`, { texto: 'uno' })).status).toBe(200)
    const r = await api(ana.token, 'POST', `/grupos/${g}/chat`, { texto: 'dos' })
    expect(r.status).toBe(429)
    expect(r.datos.motivo).toMatch(/despacio/)
  })

  it('el límite: 1 por segundo y 20 por minuto', () => {
    let t = 0
    const l = new LimiteChatGrupo(() => t)
    expect(l.permitir('a')).toBe(true)
    expect(l.permitir('a')).toBe(false)
    expect(l.permitir('b')).toBe(true)
    for (let i = 1; i < 20; i++) {
      t = i * 1000
      expect(l.permitir('a')).toBe(true)
    }
    t = 20_000
    expect(l.permitir('a')).toBe(false)
    t = 60_000
    expect(l.permitir('a')).toBe(true)
  })

  it('guarda los últimos 200 y trae los últimos 50', async () => {
    const ana = await cuenta('Ana')
    const g = await grupoCon(ana.token)
    for (let i = 1; i <= GUARDA_CHAT_GRUPO + 5; i++) await mandarAlChat(base, ana.id, g, { texto: `m${i}` })
    const [{ n: guardados }] = (await base.consultar<{ n: number }>('select count(*)::int as n from grupo_chat where grupo_id = $1', [g])) as [{ n: number }]
    expect(guardados).toBe(GUARDA_CHAT_GRUPO)
    const { mensajes: ultimos } = await chatDeGrupo(base, ana.id, g)
    expect(ultimos).toHaveLength(TRAE_CHAT_GRUPO)
    expect(ultimos.at(-1)!.texto).toBe(`m${GUARDA_CHAT_GRUPO + 5}`)
    expect(ultimos[0]!.texto).toBe(`m${GUARDA_CHAT_GRUPO + 5 - TRAE_CHAT_GRUPO + 1}`)
  })

  it('la lista de grupos avisa el último mensaje de otro (los tuyos no)', async () => {
    const [ana, beto] = [await cuenta('Ana'), await cuenta('Beto')]
    const g = await grupoCon(ana.token, beto.token)
    const ultimoChat = async (token: string) => ((await api(token, 'GET', '/grupos')).datos.tuyos as ResumenGrupo[]).find((x) => x.id === g)!.ultimoChat
    expect(await ultimoChat(ana.token)).toBeNull()
    const id = (await api(beto.token, 'POST', `/grupos/${g}/chat`, { senia: 'unoBravo' })).datos.id as number
    expect(await ultimoChat(ana.token)).toBe(id)
    expect(await ultimoChat(beto.token)).toBeNull()
  })
})
