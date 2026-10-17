import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { ICE_DEFAULT, MOTIVO_SIN_VOZ, type EstadoVoz } from '@truco/shared'
import { olvidarTurnParaTests, prenderTurnCloudflare, servidoresIceActuales, servidoresIceDelEntorno, validarSenal } from '../src/voz'
import { Jugador, levantar } from './helpers'

let colyseus: ColyseusTestServer

beforeAll(async () => {
  ;({ colyseus } = await levantar(2591, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 } }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

const ultimaVoz = (j: Jugador): EstadoVoz | undefined => j.de('voz').at(-1)
const enLaVoz = (j: Jugador) => ultimaVoz(j)?.yo != null
const OFERTA = { tipo: 'oferta', sdp: 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\n' } as const

/** Una sala de parejas con tres personas, todas con la voz activada. */
async function tresEnLaVoz() {
  const a = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
  await a.esperar(() => a.sala !== null)
  const b = await Jugador.unirse(colyseus, a.room.roomId, undefined, 'Beto')
  const c = await Jugador.unirse(colyseus, a.room.roomId, undefined, 'Carla')
  for (const j of [a, b, c]) await j.esperar(() => j.sala?.yo != null)
  for (const j of [a, b, c]) {
    j.enviar('voz', { activa: true })
    await j.esperar(() => enLaVoz(j), 5_000, 'entrar a la voz')
  }
  await a.esperar(() => ultimaVoz(a)!.participantes.length === 3, 5_000, 'los tres en la voz')
  return [a, b, c] as const
}

describe('opción de voz de la sala', () => {
  it('prendida por defecto en las privadas; el anfitrión la apaga en la espera', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null && ultimaVoz(a) !== undefined)
    expect(a.sala!.voz).toBe(true)
    expect(ultimaVoz(a)).toEqual({ activa: true, yo: null, participantes: [], servidoresIce: ICE_DEFAULT })
    a.enviar('configurar', { voz: false })
    await a.esperar(() => a.sala!.voz === false, 5_000, 'la voz apagada')
    expect(ultimaVoz(a)!.activa).toBe(false)
  })

  it('en la cola pública no hay voz y no se puede activar', async () => {
    const a = await Jugador.cola(colyseus)
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.voz).toBe(false)
    a.enviar('voz', { activa: true })
    await a.esperar(() => a.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.de('error')[0]!.motivo).toBe(MOTIVO_SIN_VOZ)
    expect(enLaVoz(a)).toBe(false)
  })

  it('con la voz apagada se rechaza entrar y la señalización', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' }, voz: false })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.room.roomId)
    await b.esperar(() => b.sala?.yo != null)
    a.enviar('voz', { activa: true })
    a.enviar('senalVoz', { a: 1, senal: OFERTA })
    await a.esperar(() => a.de('error').length >= 2, 5_000, 'los rechazos')
    expect(a.de('error').map((e) => e.motivo)).toEqual([MOTIVO_SIN_VOZ, MOTIVO_SIN_VOZ])
    expect(b.de('senalVoz')).toEqual([])
  })

  it('apagarla en la espera saca a todos de la voz', async () => {
    const [a, b] = await tresEnLaVoz()
    a.enviar('configurar', { voz: false })
    await b.esperar(() => ultimaVoz(b)!.activa === false, 5_000, 'la voz apagada')
    expect(ultimaVoz(b)).toMatchObject({ yo: null, participantes: [] })
  })
})

describe('señalización', () => {
  it('llega solo al destinatario, con el número de quien la manda', async () => {
    const [a, b, c] = await tresEnLaVoz()
    const voz = ultimaVoz(a)!
    const idDe = (j: Jugador) => voz.participantes.find((p) => p.asiento === j.sala!.yo)!.id
    expect(voz.yo).toBe(idDe(a))
    a.enviar('senalVoz', { a: idDe(b), senal: OFERTA })
    a.enviar('senalVoz', { a: idDe(b), senal: { tipo: 'candidato', candidato: { candidate: 'candidate:1 1 udp 1 127.0.0.1 9 typ host', sdpMid: '0', sdpMLineIndex: 0 } } })
    await b.esperar(() => b.de('senalVoz').length === 2, 5_000, 'las señales')
    expect(b.de('senalVoz')[0]).toEqual({ de: idDe(a), senal: OFERTA })
    expect(b.de('senalVoz')[1]!.senal).toMatchObject({ tipo: 'candidato', candidato: { sdpMLineIndex: 0 } })
    // A Carla y a quien la manda no les llega nada.
    await c.esperar(() => false, 300).catch(() => {})
    expect(c.de('senalVoz')).toEqual([])
    expect(a.de('senalVoz')).toEqual([])
  })

  it('se rechaza a quien no está en la voz, a uno mismo y lo que no es una señal', async () => {
    const [a, b] = await tresEnLaVoz()
    const voz = ultimaVoz(a)!
    a.enviar('senalVoz', { a: 999, senal: OFERTA })
    a.enviar('senalVoz', { a: voz.yo!, senal: OFERTA })
    a.enviar('senalVoz', { a: voz.participantes.find((p) => p.id !== voz.yo)!.id, senal: { tipo: 'cualquiera' } as never })
    await a.esperar(() => a.de('error').length >= 3, 5_000, 'los rechazos')
    expect(a.de('error').map((e) => e.motivo)).toEqual(['Esa persona no está en la voz', 'Esa persona no está en la voz', 'Señal de voz inválida'])
    // Quien salió de la voz no puede mandar.
    b.enviar('voz', { activa: false })
    await b.esperar(() => !enLaVoz(b), 5_000, 'salir de la voz')
    b.enviar('senalVoz', { a: voz.yo!, senal: OFERTA })
    await b.esperar(() => b.de('error').length > 0, 5_000, 'el rechazo')
    expect(b.de('error')[0]!.motivo).toBe('Primero activá la voz')
  })

  it('quien se va sale de la voz y los demás se enteran', async () => {
    const [a, b] = await tresEnLaVoz()
    const idB = ultimaVoz(b)!.yo
    await b.room.leave(true)
    await a.esperar(() => ultimaVoz(a)!.participantes.length === 2, 5_000, 'la salida')
    expect(ultimaVoz(a)!.participantes.map((p) => p.id)).not.toContain(idB)
  })

  it('al volver a entrar se le da un número nuevo', async () => {
    const [a] = await tresEnLaVoz()
    const antes = ultimaVoz(a)!.yo!
    a.enviar('voz', { activa: true })
    await a.esperar(() => ultimaVoz(a)!.yo !== antes, 5_000, 'el número nuevo')
    expect(ultimaVoz(a)!.yo).toBeGreaterThan(antes)
    expect(ultimaVoz(a)!.participantes).toHaveLength(3)
  })
})

describe('con voz, lo del pie se dice hablando', () => {
  it('toques y gritos quedan para cualquiera y no se aceptan sugerencias', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2', toquesYGritos: 'pie' }, botsEnVacios: true })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.voz).toBe(true)
    expect(a.sala!.config.toquesYGritos).toBe('cualquiera')
    // Sin voz, el pie vuelve a poder decidirlos.
    a.enviar('configurar', { voz: false, config: { toquesYGritos: 'pie' } })
    await a.esperar(() => a.sala!.config.toquesYGritos === 'pie', 5_000, 'el pie')
    a.enviar('configurar', { voz: true })
    await a.esperar(() => a.sala!.config.toquesYGritos === 'cualquiera', 5_000, 'cualquiera')

    a.enviar('iniciar', {})
    await a.esperar(() => a.vista !== null)
    expect(a.vista!.config.toquesYGritos).toBe('cualquiera')
    // a lidera su equipo (su pie es un bot), pero con voz no sugiere: lo dice.
    expect(a.vista!.mano.enfrentamientos[0]!.lideres[0]).toBe(0)
    a.enviar('sugerir', { sugerencia: { tipo: 'veni' } })
    await a.esperar(() => a.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.de('error')[0]!.motivo).toMatch(/voz/)
    expect(a.de('sugerencia')).toEqual([])
    // Nadie manda a tocar ni a gritar.
    expect(a.vista!.accionesValidas.some((x) => x.tipo === 'mandar')).toBe(false)
  })
})

describe('validarSenal', () => {
  it('deja solo lo que corresponde', () => {
    expect(validarSenal({ tipo: 'respuesta', sdp: 'v=0', otra: 1 })).toEqual({ tipo: 'respuesta', sdp: 'v=0' })
    expect(validarSenal({ tipo: 'oferta', sdp: '' })).toBeNull()
    expect(validarSenal({ tipo: 'oferta', sdp: 'x'.repeat(20_001) })).toBeNull()
    expect(validarSenal({ tipo: 'candidato', candidato: null })).toEqual({ tipo: 'candidato', candidato: null })
    expect(validarSenal({ tipo: 'candidato', candidato: { candidate: 'c', sdpMid: 3, sdpMLineIndex: 1.5 } })).toEqual({
      tipo: 'candidato',
      candidato: { candidate: 'c', sdpMid: null, sdpMLineIndex: null },
    })
    expect(validarSenal({ tipo: 'candidato', candidato: {} })).toBeNull()
    expect(validarSenal('oferta')).toBeNull()
    expect(validarSenal(null)).toBeNull()
  })
})

describe('servidores ICE', () => {
  it('por defecto el STUN público; con TRUCO_ICE_SERVERS, los de la lista que sirven', () => {
    expect(servidoresIceDelEntorno({})).toEqual(ICE_DEFAULT)
    const turn = { urls: ['turn:turn.ejemplo.uy:3478'], username: 'truco', credential: 'clave' }
    expect(servidoresIceDelEntorno({ TRUCO_ICE_SERVERS: JSON.stringify([turn, { urls: 'http://no' }, 3]) })).toEqual([turn])
    const errores = console.error
    console.error = () => {}
    try {
      expect(servidoresIceDelEntorno({ TRUCO_ICE_SERVERS: 'no es json' })).toEqual(ICE_DEFAULT)
      expect(servidoresIceDelEntorno({ TRUCO_ICE_SERVERS: '[]' })).toEqual(ICE_DEFAULT)
    } finally {
      console.error = errores
    }
  })
})

describe('TURN de Cloudflare', () => {
  it('pide credenciales con la clave del entorno y saca el puerto 53', async () => {
    const pedidos: { url: string; init: RequestInit | undefined }[] = []
    const pedir = (async (url: string, init?: RequestInit) => {
      pedidos.push({ url, init })
      return Response.json({
        iceServers: { urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp'], username: 'u', credential: 'c' },
      })
    }) as typeof fetch
    expect(await prenderTurnCloudflare({}, pedir)).toBe(false)
    expect(await prenderTurnCloudflare({ TRUCO_TURN_ID: 'clave', TRUCO_TURN_TOKEN: 'secreto' }, pedir)).toBe(true)
    expect(pedidos[0]!.url).toBe('https://rtc.live.cloudflare.com/v1/turn/keys/clave/credentials/generate-ice-servers')
    expect((pedidos[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer secreto')
    expect(servidoresIceActuales()).toEqual([
      { urls: ['stun:stun.cloudflare.com:3478', 'turn:turn.cloudflare.com:3478?transport=udp'], username: 'u', credential: 'c' },
    ])
    olvidarTurnParaTests()
  })
})
