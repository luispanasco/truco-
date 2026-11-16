import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { Jugador, levantar } from './helpers'

let colyseus: ColyseusTestServer

beforeAll(async () => {
  ;({ colyseus } = await levantar(2609, {
    tiempos: { turnoMs: 5_000, botMinMs: 0, botMaxMs: 0, ofrecerBotMs: 60_000, reservaGrupoMs: 400 },
  }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

/** Los asientos de las personas que ya están sentadas en la sala que ve `j`. */
const humanos = (j: Jugador) => j.sala!.lugares.filter((l) => l.tipo === 'humano').map((l) => l.asiento)

/** Una sala privada con el anfitrión y `n - 1` amigos más, en ese formato. */
async function grupo(formato: '2v2' | '3v3', n: number) {
  const anfitrion = await Jugador.crear(colyseus, { config: { formato } })
  await anfitrion.esperar(() => anfitrion.sala !== null)
  const amigos: Jugador[] = []
  for (let i = 1; i < n; i++) amigos.push(await Jugador.unirse(colyseus, anfitrion.sala!.codigo!, Jugador.nuevoId(), `Amigo ${i}`))
  await anfitrion.esperar(() => humanos(anfitrion).length === n)
  return [anfitrion, ...amigos]
}

/** Lo que hace la app al recibir `irAPublica`: deja su sala y entra a la de la cola. */
async function irALaCola(j: Jugador, apodo: string) {
  await j.esperar(() => j.de('irAPublica').length > 0, 5_000, 'el aviso de ir a la cola')
  const { roomId } = j.de('irAPublica')[0]!
  await j.room.leave(true)
  return Jugador.unirse(colyseus, roomId, j.invitadoId, apodo)
}

describe('cola pública por formato', () => {
  it('quien busca 2 vs 2 no cae en la sala de mano a mano', async () => {
    const mano = await Jugador.cola(colyseus)
    const pareja = await Jugador.cola(colyseus, { formato: '2v2' })
    expect(pareja.room.roomId).not.toBe(mano.room.roomId)
    await pareja.esperar(() => pareja.sala !== null)
    expect(pareja.sala!.formato).toBe('2v2')
    expect(pareja.sala!.lugares).toHaveLength(4)
  })

  it('los que llegan solos completan primero un equipo y, con la mesa llena, empieza', async () => {
    const js: Jugador[] = []
    for (let i = 0; i < 4; i++) js.push(await Jugador.cola(colyseus, { formato: '2v2' }))
    expect(new Set(js.map((j) => j.room.roomId)).size).toBe(1)
    const a = js[0]!
    await a.esperar(() => a.sala?.fase === 'jugando', 5_000, 'que empiece')
    expect(a.sala!.chatEquipo).toBe(true)
    // Los dos primeros quedaron del mismo lado (asientos pares).
    expect(js[0]!.sala!.yo! % 2).toBe(js[1]!.sala!.yo! % 2)
  })
})

describe('salir en grupo a buscar rivales', () => {
  it('en 1 vs 1 no se puede', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    a.enviar('buscarRivales', {})
    await a.esperar(() => a.de('error').length > 0)
    expect(a.de('error')[0]!.motivo).toContain('2 vs 2')
  })

  it('si son más que un equipo, no se puede', async () => {
    const [a] = await grupo('2v2', 3)
    a!.enviar('buscarRivales', {})
    await a!.esperar(() => a!.de('error').length > 0)
    expect(a!.de('error')[0]!.motivo).toContain('más que un equipo')
  })

  it('solo el anfitrión lo puede pedir', async () => {
    const [, b] = await grupo('2v2', 2)
    b!.enviar('buscarRivales', {})
    await b!.esperar(() => b!.de('error').length > 0)
    expect(b!.de('error')[0]!.motivo).toContain('anfitrión')
  })

  it('un dúo sale del mismo lado contra dos que buscaban solos, y empieza', async () => {
    // Ya hay uno buscando solo: el dúo entra en esa sala, del otro lado.
    const solo1 = await Jugador.cola(colyseus, { formato: '2v2' })
    await solo1.esperar(() => solo1.sala !== null)
    const [a, b] = await grupo('2v2', 2)
    a!.enviar('buscarRivales', {})
    const a2 = await irALaCola(a!, 'Ana')
    const b2 = await irALaCola(b!, 'Beto')
    expect(a2.room.roomId).toBe(solo1.room.roomId)
    expect(b2.room.roomId).toBe(solo1.room.roomId)
    await a2.esperar(() => humanos(a2).length === 3)
    const lado = (apodo: string) => a2.sala!.lugares.find((l) => l.apodo === apodo)!.asiento % 2
    expect(lado('Ana')).toBe(lado('Beto'))
    expect(lado('Desconocido')).not.toBe(lado('Ana'))

    // El cuarto, solo, completa la mesa del lado del primero.
    const solo2 = await Jugador.cola(colyseus, { formato: '2v2' })
    expect(solo2.room.roomId).toBe(solo1.room.roomId)
    await a2.esperar(() => a2.sala?.fase === 'jugando', 5_000, 'que empiece')
  })

  it('un trío contra otro trío: cada uno de su lado', async () => {
    const t1 = await grupo('3v3', 3)
    t1[0]!.enviar('buscarRivales', {})
    const en1 = await Promise.all(t1.map((j, i) => irALaCola(j, `Uno ${i}`)))
    const t2 = await grupo('3v3', 3)
    t2[0]!.enviar('buscarRivales', {})
    const en2 = await Promise.all(t2.map((j, i) => irALaCola(j, `Dos ${i}`)))
    expect(new Set([...en1, ...en2].map((j) => j.room.roomId)).size).toBe(1)
    const x = en1[0]!
    await x.esperar(() => x.sala?.fase === 'jugando', 5_000, 'que empiece')
    const ladoDe = (prefijo: string) => new Set(x.sala!.lugares.filter((l) => l.apodo.startsWith(prefijo)).map((l) => l.asiento % 2))
    expect(ladoDe('Uno').size).toBe(1)
    expect(ladoDe('Dos').size).toBe(1)
    expect([...ladoDe('Uno')][0]).not.toBe([...ladoDe('Dos')][0])
  })

  it('mientras el lugar está guardado para el grupo, no lo toma un desconocido; si no llegan, se libera', async () => {
    const [a, b] = await grupo('2v2', 2)
    a!.enviar('buscarRivales', {})
    const a2 = await irALaCola(a!, 'Ana')
    // b no va. Llegan dos solos: el primero va del otro lado; el segundo no entra en el lugar de b.
    const s1 = await Jugador.cola(colyseus, { formato: '2v2' })
    expect(s1.room.roomId).toBe(a2.room.roomId)
    const s2 = await Jugador.cola(colyseus, { formato: '2v2' })
    expect(s2.room.roomId).toBe(a2.room.roomId)
    await a2.esperar(() => humanos(a2).length === 3)
    const ladoAna = a2.sala!.lugares.find((l) => l.apodo === 'Ana')!.asiento % 2
    expect(a2.sala!.lugares.filter((l) => l.tipo === 'humano' && l.asiento % 2 === ladoAna)).toHaveLength(1)
    void b
    // Vencida la reserva de b, un tercer solo ocupa su lugar y empieza.
    await new Promise((r) => setTimeout(r, 500))
    const s3 = await Jugador.cola(colyseus, { formato: '2v2' })
    expect(s3.room.roomId).toBe(a2.room.roomId)
    await a2.esperar(() => a2.sala?.fase === 'jugando', 5_000, 'que empiece')
  })
})
