import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import type { ConfigSala } from '@truco/engine'
import { Jugador, levantar } from './helpers'

let colyseus: ColyseusTestServer

beforeAll(async () => {
  ;({ colyseus } = await levantar(2589, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 } }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

describe('opciones nuevas de la sala', () => {
  it('largo del partido, toques y gritos y corte: se validan y las malas salen de la mitad', async () => {
    // Sin voz: con voz, toques y gritos quedan para cualquiera (ver voz.test.ts).
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2', puntosPartida: 20, toquesYGritos: 'pie', corte: true }, voz: false })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.config).toMatchObject({ puntosPartida: 20, puntosMalas: 10, tramoPicaPica: { desde: 0, hasta: 10 }, toquesYGritos: 'pie', corte: true })
    a.enviar('configurar', { config: { puntosPartida: 25, puntosMalas: 3, toquesYGritos: 'nadie' } as unknown as Partial<ConfigSala> })
    await a.esperar(() => a.sala!.config.puntosPartida === 30, 5_000, 'el largo por defecto')
    expect(a.sala!.config).toMatchObject({ puntosMalas: 15, toquesYGritos: 'cualquiera' })
  })
})

describe('tirar reyes', () => {
  it('el primer rey reparte, y empieza a tirar el anfitrión', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '1v1' }, tirarReyes: 'reparte' })
    await a.esperar(() => a.sala !== null)
    expect(a.sala!.tirarReyes).toBe('reparte')
    a.enviar('iniciar', {})
    await a.esperar(() => a.de('reyes').length > 0 && a.vista !== null, 5_000, 'los reyes')
    const reyes = a.de('reyes')[0]!
    const ultima = reyes.tiradas.at(-1)!
    expect(ultima.carta.numero).toBe(12)
    expect(reyes.tiradas.slice(0, -1).every((t) => t.carta.numero !== 12)).toBe(true)
    expect(reyes.tiradas[0]!.asiento).toBe(0)
    expect(reyes.reparte).toBe(ultima.asiento)
    expect(a.vista!.mano.reparte).toBe(reyes.reparte)
  })

  it('con equipos, los dos primeros reyes quedan juntos', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, tirarReyes: 'reparteYEquipos' })
    await a.esperar(() => a.sala !== null)
    const b = await Jugador.unirse(colyseus, a.room.roomId)
    await b.esperar(() => b.sala?.yo != null)
    a.enviar('iniciar', {})
    await a.esperar(() => a.de('reyes').length > 0 && a.sala?.fase === 'jugando', 5_000, 'los reyes')
    await b.esperar(() => b.sala?.fase === 'jugando', 5_000, 'la sala de b')
    const { equipos, tiradas } = a.de('reyes')[0]!
    expect(equipos).toHaveLength(2)
    expect(tiradas.filter((t) => t.carta.numero === 12).map((t) => t.asiento)).toEqual(equipos)
    // Si a (asiento 0) y b (asiento 1) sacaron rey, quedaron en el mismo equipo.
    if (equipos!.includes(0) && equipos!.includes(1)) expect(a.sala!.yo! % 2).toBe(b.sala!.yo! % 2)
    // Si sacó rey uno solo, quedaron en equipos distintos.
    if (equipos!.includes(0) !== equipos!.includes(1)) expect(a.sala!.yo! % 2).not.toBe(b.sala!.yo! % 2)
  })
})

describe('el pie y sus sugerencias', () => {
  it('sugiere el que lidera, y lo oyen todos', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, botsEnVacios: true, voz: false })
    await a.esperar(() => a.sala !== null)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista !== null)
    // a es el asiento 0: en su equipo el pie es el 2, un bot. Lidera a, la persona.
    expect(a.vista!.mano.enfrentamientos[0]!.lideres[0]).toBe(0)
    a.enviar('sugerir', { sugerencia: { tipo: 'veni' } })
    await a.esperar(() => a.de('sugerencia').length > 0, 5_000, 'la sugerencia')
    expect(a.de('sugerencia')[0]).toEqual({ de: 0, sugerencia: { tipo: 'veni' } })
    a.enviar('sugerir', { sugerencia: { tipo: 'vamosA', asiento: 9 } })
    await a.esperar(() => a.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.de('error')[0]!.motivo).toBe('Sugerencia inválida')
    // "Vamos a X" es solo a un compañero: a un rival (asiento 1) no.
    a.enviar('sugerir', { sugerencia: { tipo: 'vamosA', asiento: 1 } })
    await a.esperar(() => a.de('error').length > 1, 5_000, 'el rechazo del rival')
    a.enviar('sugerir', { sugerencia: { tipo: 'vamosA', asiento: 2 } })
    await a.esperar(() => a.de('sugerencia').length > 1, 5_000, 'la sugerencia al compañero')
    expect(a.de('sugerencia')[1]).toEqual({ de: 0, sugerencia: { tipo: 'vamosA', asiento: 2 } })
  })
})

describe('cartas que no se ven', () => {
  it('en el pica-pica, las piezas de otro duelo no llegan, ni al dar vuelta las cartas', async () => {
    const a = await Jugador.crear(colyseus, {
      config: { formato: '3v3', picaPicaAlternado: false },
      botsEnVacios: true,
      senias: { habilitadas: false },
    })
    await a.esperar(() => a.sala !== null)
    a.enviar('iniciar', {})
    await a.esperar(() => a.vista !== null)
    a.autoJugar(1)
    await a.esperar(() => (a.vista?.mano.numero ?? 1) > 1 || a.vista?.ganador != null, 30_000, 'el fin de la mano')
    const eventos = a.de('eventos').flat()
    const esPieza = (c: { numero: number; palo: string }, muestra: { numero: number; palo: string }) =>
      c.palo === muestra.palo && [2, 4, 5, 10, 11, 12].includes(c.numero) && c.numero !== muestra.numero
    let muestra: { numero: number; palo: string } | null = a.vistas[0]!.mano.muestra
    let participantes: number[] = [0, 3]
    for (const e of eventos) {
      if (e.tipo === 'manoRepartida') muestra = e.muestra
      if (e.tipo === 'enfrentamientoIniciado') participantes = e.participantes
      if (e.tipo === 'cartaJugada') {
        expect(e).not.toHaveProperty('ocultaPara')
        if (!participantes.includes(0) && e.carta && muestra) expect(esPieza(e.carta, muestra)).toBe(false)
      }
      if (e.tipo === 'enfrentamientoTerminado' && !e.participantes.includes(0)) {
        for (const m of e.resultado.mostradas) for (const c of m.cartas) expect(esPieza(c, e.muestra)).toBe(false)
      }
    }
  })
})
