import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { apply, crearPartida, type Accion } from '@truco/engine'
import type { RegistroPartida } from '../src/registro'
import { cartasAjenasEnVista, esperarMs, Jugador, levantar, salaEnServidor } from './helpers'

let colyseus: ColyseusTestServer
let dirDatos: string

beforeAll(async () => {
  ;({ colyseus, dirDatos } = await levantar(2571, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 } }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

describe('sala privada', () => {
  it('se crea con un código de 5 caracteres y se entra con ese código', async () => {
    const anfitrion = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
    await anfitrion.esperar(() => anfitrion.sala !== null)
    const codigo = anfitrion.sala!.codigo!
    expect(codigo).toMatch(/^[A-HJKMNP-Z2-9]{5}$/)
    expect(anfitrion.room.roomId).toBe(codigo)

    const invitado = await Jugador.unirse(colyseus, codigo)
    await invitado.esperar(() => invitado.sala?.yo === 1)
    await anfitrion.esperar(() => anfitrion.sala!.lugares[1]!.tipo === 'humano')
    expect(anfitrion.sala!.lugares[0]!.anfitrion).toBe(true)
  })

  it('una partida 2v2 completa con dos humanos y dos bots', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, nivelBots: 'dificil' })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
    await b.esperar(() => b.sala?.yo === 1)
    // Solo el anfitrión puede empezar.
    b.enviar('iniciar', {})
    await b.esperar(() => b.de('error').length > 0)
    expect(b.de('error')[0]!.motivo).toContain('anfitrión')

    a.autoJugar(1)
    b.autoJugar(2)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista?.ganador != null, 60_000, 'el final de la partida')
    await b.esperar(() => b.vista?.ganador != null, 5_000, 'el final para b')

    expect(a.sala!.fase).toBe('terminada')
    expect(a.sala!.lugares.map((l) => l.tipo)).toEqual(['humano', 'humano', 'bot', 'bot'])
    expect(Math.max(...a.vista!.puntos)).toBe(30)

    // Ninguna vista que recibieron trae cartas ajenas.
    for (const v of [...a.vistas, ...b.vistas]) expect(cartasAjenasEnVista(v)).toEqual([])
    // Cada uno ve solo sus cartas.
    expect(a.vistas.every((v) => v.yo.asiento === 0)).toBe(true)

    // Quedó el registro, y con él se reproduce la partida entera.
    await esperarMs(100)
    const archivos = readdirSync(join(dirDatos, 'partidas')).filter((f) => f.includes(a.room.roomId))
    expect(archivos).toHaveLength(1)
    const registro = JSON.parse(readFileSync(join(dirDatos, 'partidas', archivos[0]!), 'utf8')) as RegistroPartida
    let estado = crearPartida({
      jugadores: registro.jugadores.map((j) => ({ id: `j${j.asiento}`, nombre: j.apodo })),
      semilla: registro.semilla,
      config: registro.config,
    })
    for (const { accion } of registro.acciones) {
      const r = apply(estado, accion)
      if (!r.ok) throw new Error(r.motivo)
      estado = r.estado
    }
    expect(estado.puntos).toEqual(a.vista!.puntos)
    expect(registro.resultado).toEqual({ ganador: estado.ganador, puntos: estado.puntos })
  }, 90_000)

  it('una acción inválida se rechaza con el motivo y no cambia nada', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista !== null)
    const sala = salaEnServidor(colyseus, a.room.roomId)
    const antes = sala.estadoParaTests()

    // Una carta que no tiene.
    const ajena = b.vista ?? (await b.esperar(() => b.vista !== null), b.vista!)
    const carta = ajena.mano.misCartas[0]!
    a.enviar('accion', { accion: { tipo: 'jugarCarta', jugador: 'j1', carta } as Accion })
    await a.esperar(() => a.de('error').length > 0)
    expect(a.de('error')[0]!.motivo).toMatch(/No tenés esa carta|No es tu turno/)
    expect(sala.estadoParaTests()).toBe(antes)

    // Una acción mal formada.
    a.room.send('accion', { accion: 'cualquier cosa' })
    await a.esperar(() => a.de('error').length > 1)
    expect(a.de('error')[1]!.motivo).toBe('Acción inválida')
  })

  it('si alguien se va, juega un bot por él y al volver con su ID recupera el lugar', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
    await a.esperar(() => a.sala !== null)
    const codigo = a.sala!.codigo!
    const b = await Jugador.unirse(colyseus, codigo)
    await b.esperar(() => b.sala?.yo === 1)
    a.autoJugar(3)
    a.enviar('iniciar', {})
    await b.esperar(() => b.vista !== null)

    // b se va: la partida sigue sin esperarlo (juega su bot de reemplazo).
    await b.room.leave(true)
    await a.esperar(() => a.sala!.lugares[1]!.conectado === false)
    expect(a.sala!.lugares[1]!.tipo).toBe('humano')
    const sala = salaEnServidor(colyseus, codigo)
    const accionesAlIrse = sala.estadoParaTests()!
    await a.esperar(() => sala.estadoParaTests() !== accionesAlIrse, 5_000, 'que la partida siga')

    // Vuelve con el mismo ID: recupera su asiento y su vista.
    const b2 = await Jugador.unirse(colyseus, codigo, b.invitadoId, 'Invitado')
    await b2.esperar(() => b2.sala?.yo === 1 && b2.vista !== null)
    expect(b2.vista!.yo.asiento).toBe(1)
    await a.esperar(() => a.sala!.lugares[1]!.conectado === true)

    // Un desconocido no puede entrar con la partida empezada.
    await expect(Jugador.unirse(colyseus, codigo)).rejects.toThrow()
  })

  it('quien recarga la página vuelve aunque su conexión vieja siga esperando reconectarse', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    const codigo = a.sala!.codigo!
    const b = await Jugador.unirse(colyseus, codigo)
    await b.esperar(() => b.sala?.yo === 1)
    a.enviar('iniciar', {})
    await b.esperar(() => b.vista !== null)

    // Corte sin avisar (como cerrar la pestaña): el servidor le guarda la sesión para reconectar.
    await b.room.leave(false)
    // Enseguida entra de nuevo con otra conexión y el mismo ID, con la sala "llena" de sesiones.
    const b2 = await Jugador.unirse(colyseus, codigo, b.invitadoId, 'Invitado')
    await b2.esperar(() => b2.sala?.yo === 1 && b2.vista !== null)
    expect(b2.vista!.yo.asiento).toBe(1)
    // Y nadie nuevo puede sentarse: los lugares siguen siendo dos.
    await expect(Jugador.unirse(colyseus, codigo)).rejects.toThrow()
  })

  it('las señas y el chat de equipo llegan solo a los compañeros', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
    await a.esperar(() => a.sala !== null)
    const codigo = a.sala!.codigo!
    const b = await Jugador.unirse(colyseus, codigo) // asiento 1, equipo rival
    const c = await Jugador.unirse(colyseus, codigo) // asiento 2, compañero de a
    await c.esperar(() => c.sala?.yo === 2)
    a.enviar('iniciar', {})
    await c.esperar(() => c.vista !== null)

    a.enviar('senia', { senia: 'tres' })
    a.enviar('chat', { texto: 'tengo un tres', canal: 'equipo' })
    a.enviar('chat', { texto: 'buena suerte', canal: 'general' })
    await c.esperar(() => c.de('chat').length === 2 && c.de('senia').some((s) => s.de === 0))
    await b.esperar(() => b.de('chat').length === 1)
    await esperarMs(100)

    expect(c.de('senia').filter((s) => s.de === 0)).toEqual([{ de: 0, senia: 'tres' }])
    expect(b.de('senia').some((s) => s.de === 0)).toBe(false)
    expect(b.de('chat').map((m) => m.texto)).toEqual(['buena suerte'])
    expect(c.de('chat').map((m) => [m.canal, m.texto])).toEqual([
      ['equipo', 'tengo un tres'],
      ['general', 'buena suerte'],
    ])
    // Ninguna seña del equipo 0 le llegó al equipo 1, ni viceversa.
    expect(b.de('senia').every((s) => s.de % 2 === 1)).toBe(true)
    expect(c.de('senia').every((s) => s.de % 2 === 0)).toBe(true)
  })

  it('chat: filtro de palabras, límite de mensajes y silenciar', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' } })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
    await b.esperar(() => b.sala?.yo === 1)

    a.enviar('chat', { texto: 'sos un PELOTUDO', canal: 'general' })
    await b.esperar(() => b.de('chat').length === 1)
    expect(b.de('chat')[0]!.texto).toBe('sos un ********')

    // Tres mensajes cada 5 segundos.
    a.enviar('chat', { texto: 'dos', canal: 'general' })
    a.enviar('chat', { texto: 'tres', canal: 'general' })
    a.enviar('chat', { texto: 'cuatro', canal: 'general' })
    await a.esperar(() => a.de('error').length > 0)
    expect(a.de('error')[0]!.motivo).toContain('Esperá')
    await b.esperar(() => b.de('chat').length === 3)

    // b silencia a a: deja de recibir sus mensajes.
    b.enviar('silenciar', { asiento: 0, silenciar: true })
    await esperarMs(50)
    b.enviar('chat', { texto: 'hola', canal: 'general' })
    await a.esperar(() => a.de('chat').some((m) => m.texto === 'hola'))
    expect(b.de('chat')).toHaveLength(3)
  })

  it('reportar guarda el reporte con los últimos mensajes del reportado', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' } })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
    await b.esperar(() => b.sala?.yo === 1)
    b.enviar('chat', { texto: 'mensaje feo', canal: 'general' })
    await a.esperar(() => a.de('chat').length === 1)
    a.enviar('reportar', { asiento: 1, motivo: 'insultos' })
    await esperarMs(200)
    const lineas = readFileSync(join(dirDatos, 'reportes.jsonl'), 'utf8').trim().split('\n')
    const reporte = JSON.parse(lineas[lineas.length - 1]!)
    expect(reporte.motivo).toBe('insultos')
    expect(reporte.a.asiento).toBe(1)
    expect(reporte.mensajes.map((m: { texto: string }) => m.texto)).toEqual(['mensaje feo'])
  })
})
