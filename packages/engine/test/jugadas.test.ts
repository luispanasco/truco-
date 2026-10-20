import { describe, expect, it } from 'vitest'
import {
  accionesValidas,
  apply,
  crearPartida,
  enfrentamientoActual,
  esperandoA,
  eventosPara,
  mismaCarta,
  resolverVuelta,
  vistaPara,
  type Accion,
  type ConfigSala,
  type EstadoPartida,
  type Evento,
} from '../src'
import { c, jugar, partidaCon, rechaza } from './helpers'

// 2v2 con muestra 3 de copas: a y c (equipo 0), b y d (equipo 1). El pie del equipo 0 es c y el del 1, d.
const MANOS_2V2 = ['1e 7o 4b', '1b 2e 6o', '7e 5o 12b', '3e 6b 11o']
const dosVueltas = (config = {}) =>
  jugar(
    partidaCon(MANOS_2V2, '3c', config),
    // Primera: gana a con el 1 de espadas.
    ['jugar', 'a', '1e'],
    ['jugar', 'b', '6o'],
    ['jugar', 'c', '12b'],
    ['jugar', 'd', '11o'],
    // Segunda: gana b con el 1 de bastos.
    ['jugar', 'a', '4b'],
    ['jugar', 'b', '1b'],
    ['jugar', 'c', '5o'],
    ['jugar', 'd', '3e'],
  ).estado

function aplicar(estado: EstadoPartida, accion: Accion): EstadoPartida {
  const r = apply(estado, accion)
  if (!r.ok) throw new Error(r.motivo)
  return r.estado
}

describe('pasar en la tercera', () => {
  it('lo puede hacer el primero de su equipo en jugar la tercera, y la carta va tapada', () => {
    let estado = dosVueltas()
    expect(enfrentamientoActual(estado).turno).toBe(1)
    const r = apply(estado, { tipo: 'jugarCarta', jugador: 'b', carta: c('2e'), tapada: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    estado = r.estado
    const ev = r.eventos.find((x) => x.tipo === 'cartaJugada')!
    expect(eventosPara([ev], 0)[0]).toMatchObject({ tipo: 'cartaJugada', asiento: 1, carta: null, tapada: true })
    expect(eventosPara([ev], 1)[0]).toMatchObject({ carta: c('2e') })
    expect(vistaPara(estado, 'a').mano.enfrentamientos[0]!.vueltas[2]!.jugadas[0]!.carta).toBeNull()
    expect(vistaPara(estado, 'b').mano.enfrentamientos[0]!.vueltas[2]!.jugadas[0]!.carta).toEqual(c('2e'))
    // El compañero ya no puede pasar.
    estado = aplicar(estado, { tipo: 'jugarCarta', jugador: 'c', carta: c('7e') })
    const d = apply(estado, { tipo: 'jugarCarta', jugador: 'd', carta: c('6b'), tapada: true })
    expect(d.ok || d.motivo).toBe('Pasa solo el primero de tu equipo en jugar')
  })

  it('no se puede antes de la tercera ni en 1v1', () => {
    const p = partidaCon(MANOS_2V2, '3c')
    expect(apply(p, { tipo: 'jugarCarta', jugador: 'a', carta: c('1e'), tapada: true })).toMatchObject({
      ok: false,
      motivo: 'Solo se puede pasar en la tercera',
    })
    const uno = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c')
    expect(apply(uno, { tipo: 'jugarCarta', jugador: 'a', carta: c('1e'), tapada: true })).toMatchObject({
      ok: false,
      motivo: 'En 1v1 no se puede pasar',
    })
  })

  it('la carta tapada no gana la vuelta', () => {
    const jugadas = [
      { asiento: 0, carta: c('1e'), tapada: true },
      { asiento: 1, carta: c('4b') },
    ]
    expect(resolverVuelta(jugadas, c('3c'))).toEqual({ resultado: 1, ganador: 1 })
  })
})

describe('flor y truco', () => {
  it('se canta todo junto: se resuelve la flor y después se contesta el truco', () => {
    const p = partidaCon(['7e 6e 5e', '1b 2o 4b'], '3c')
    const r = apply(p, { tipo: 'cantarFlor', jugador: 'a', canto: 'flor', yTruco: true })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.eventos).toEqual([
      { tipo: 'cantoFlor', asiento: 0, canto: 'flor', yTruco: true },
      { tipo: 'cantoTruco', asiento: 0, canto: 'truco' },
    ])
    expect(esperandoA(r.estado)).toEqual([1])
    const { estado } = jugar(r.estado, ['quiero', 'b'])
    expect(enfrentamientoActual(estado).truco.valor).toBe(2)
  })

  it('el rival con flor la canta antes de contestar el truco', () => {
    const p = partidaCon(['7e 6e 5e', '1b 2b 4b'], '3c')
    const estado = aplicar(p, { tipo: 'cantarFlor', jugador: 'a', canto: 'flor', yTruco: true })
    rechaza(estado, ['quiero', 'b'], 'Tenés flor')
    jugar(estado, ['flor', 'b'], ['quiero', 'b'])
  })

  it('solo con flor y en tu turno', () => {
    const p = partidaCon(['7e 6e 5e', '1b 2o 4b'], '3c')
    expect(apply(p, { tipo: 'cantarFlor', jugador: 'b', canto: 'flor', yTruco: true }).ok).toBe(false)
    const sinFlor = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c')
    expect(apply(sinFlor, { tipo: 'cantarFlor', jugador: 'a', canto: 'flor', yTruco: true }).ok).toBe(false)
  })
})

describe('el pie', () => {
  /** 2v2: a y c contra b y d. `bots` son los asientos que juegan bots. */
  const conBots = (bots: number[], config: Partial<ConfigSala> = {}) =>
    crearPartida({
      jugadores: ['a', 'b', 'c', 'd'].map((id, i) => ({ id, nombre: id.toUpperCase(), ...(bots.includes(i) ? { bot: true } : {}) })),
      semilla: 1,
      config: { formato: '2v2', ...config },
      repartoFijo: { cartas: MANOS_2V2.map((m) => m.split(' ').map(c)), muestra: c('3c') },
    })

  it('es el último de cada equipo en jugar la primera', () => {
    expect(vistaPara(partidaCon(MANOS_2V2, '3c'), 'a').mano.enfrentamientos[0]!.lideres).toEqual([2, 3])
  })

  it('al truco y al envido contesta siempre el pie; una persona canta en su turno aunque no sea pie', () => {
    const estado = jugar(partidaCon(MANOS_2V2, '3c'), ['truco', 'a']).estado
    expect(esperandoA(estado)).toEqual([3])
    rechaza(estado, ['quiero', 'b'], 'Contesta el pie')
    rechaza(estado, ['truco', 'b'], 'Contesta el pie')
    jugar(estado, ['quiero', 'd'])
  })

  it('un equipo de una persona y bots: el pie es la persona, aunque el último sea un bot', () => {
    expect(vistaPara(conBots([2]), 'a').mano.enfrentamientos[0]!.lideres).toEqual([0, 3])
    // Con "el último, aunque sea bot", el pie es el bot.
    expect(vistaPara(conBots([2], { pie: 'ultimo' }), 'a').mano.enfrentamientos[0]!.lideres).toEqual([2, 3])
  })

  it('el bot que manda una persona no canta solo (salvo la flor): toca o grita si el pie lo manda', () => {
    // a es persona y pie; c es su bot. Le toca a c después de que juegan a y b.
    let estado = jugar(conBots([2]), ['jugar', 'a', '1e'], ['jugar', 'b', '1b']).estado
    rechaza(estado, ['truco', 'c'], 'Grita el pie')
    rechaza(estado, ['envido', 'c'], 'Toca el pie')
    estado = aplicar(estado, { tipo: 'mandar', jugador: 'a', a: 2, que: 'gritar' })
    jugar(estado, ['truco', 'c'])
    // Una persona que no es pie canta sola.
    jugar(conBots([]), ['jugar', 'a', '1e'], ['jugar', 'b', '1b'], ['truco', 'c'])
  })

  it('el pie le dice a su bot qué jugar (sin ver sus cartas); a una persona solo se lo insinúa', () => {
    const estado = conBots([2])
    const r = apply(estado, { tipo: 'mandar', jugador: 'a', a: 2, que: 'matala' })
    expect(r.ok && r.eventos).toEqual([{ tipo: 'orden', asiento: 0, a: 2, que: 'matala' }])
    expect(apply(estado, { tipo: 'mandar', jugador: 'c', a: 0, que: 'dejala' })).toMatchObject({ ok: false, motivo: 'Manda el pie' })
    // La carta puntual ya no se dice: el pie no ve las de sus bots.
    expect(accionesValidas(estado, 'a').some((x) => x.tipo === 'mandar' && x.que === ('carta' as never))).toBe(false)
    expect(vistaPara(estado, 'a').mano).not.toHaveProperty('misBots')
    const personas = partidaCon(MANOS_2V2, '3c')
    expect(apply(personas, { tipo: 'mandar', jugador: 'c', a: 0, que: 'matala' }).ok).toBe(true)
  })

  it('con flor en el equipo no se grita hasta que se cante: ni el truco ni la orden de gritar', () => {
    // c (compañero de a, y su pie) tiene flor de oros; a es mano y juega primero.
    const conFlor = ['4e 6b 12o', '1b 2e 6o', '1o 5o 7o', '3e 7b 11b']
    for (const config of [{}, { florObligatoria: false }]) {
      const estado = partidaCon(conFlor, '3c', config)
      expect(accionesValidas(estado, 'a').some((x) => x.tipo === 'cantarTruco')).toBe(false)
      expect(apply(estado, { tipo: 'cantarTruco', jugador: 'a' })).toMatchObject({ ok: false, motivo: 'Tu compañero tiene flor: hasta que la cante no se grita' })
      // El pie (c) tampoco le puede decir a a que grite: primero, su flor.
      expect(apply(estado, { tipo: 'mandar', jugador: 'c', a: 0, que: 'gritar' })).toMatchObject({ ok: false })
      // Los rivales sí gritan.
      const otraVuelta = jugar(estado, ['jugar', 'a', '4e']).estado
      expect(accionesValidas(otraVuelta, 'b').some((x) => x.tipo === 'cantarTruco')).toBe(true)
    }
    // Cantada la flor, se grita.
    const cantada = jugar(partidaCon(conFlor, '3c'), ['jugar', 'a', '4e'], ['jugar', 'b', '2e'], ['flor', 'c']).estado
    expect(apply(cantada, { tipo: 'mandar', jugador: 'c', a: 0, que: 'gritar' }).ok).toBe(true)
  })

  it('con la última carta del compañero, el pie solo le dice que grite o callado', () => {
    // Tercera vuelta: a (equipo 0) tiene una sola carta; el pie de su equipo es c.
    const estado = dosVueltas()
    const aA = accionesValidas(estado, 'c').filter((x): x is Extract<Accion, { tipo: 'mandar' }> => x.tipo === 'mandar' && x.a === 0)
    expect(aA.map((x) => x.que).sort()).toEqual(['callado', 'gritar'])
    expect(apply(estado, { tipo: 'mandar', jugador: 'c', a: 0, que: 'matala' })).toMatchObject({ ok: false, motivo: 'Con la última carta: que grite o callado' })
    expect(aplicar(estado, { tipo: 'mandar', jugador: 'c', a: 0, que: 'callado' }).mano.enfrentamientos[0]!.ordenes).toContainEqual({ asiento: 0, que: 'callado' })
    // Antes de la última, "callado" no va.
    expect(apply(partidaCon(MANOS_2V2, '3c'), { tipo: 'mandar', jugador: 'c', a: 0, que: 'callado' })).toMatchObject({ ok: false })
  })

  it('las órdenes de qué carta tirar: una reemplaza a la otra y se cumplen al jugar', () => {
    let estado = conBots([2])
    estado = aplicar(estado, { tipo: 'mandar', jugador: 'a', a: 2, que: 'dejala' })
    estado = aplicar(estado, { tipo: 'mandar', jugador: 'a', a: 2, que: 'matala' })
    expect(enfrentamientoActual(estado).ordenes).toEqual([{ asiento: 2, que: 'matala' }])
    estado = jugar(estado, ['jugar', 'a', '1e'], ['jugar', 'b', '1b'], ['jugar', 'c', '7e']).estado
    expect(enfrentamientoActual(estado).ordenes).toEqual([])
    // Después de jugar, en esa vuelta ya no se le dice nada.
    expect(apply(estado, { tipo: 'mandar', jugador: 'a', a: 2, que: 'dejala' })).toMatchObject({ ok: false, motivo: 'Ya jugó en esta vuelta' })
  })

  it('"vamos a" es a otro compañero que todavía no jugó', () => {
    // 3v3: a, c y e contra b, d y f; el pie del equipo de a es e.
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o', '7e 5o 12b', '3e 6b 11o', '2b 5e 10o', '3o 7b 12e'], '3c', { picaPica: false })
    expect(apply(p, { tipo: 'mandar', jugador: 'e', a: 0, que: 'vamosA', vamosA: 2 }).ok).toBe(true)
    expect(apply(p, { tipo: 'mandar', jugador: 'e', a: 0, que: 'vamosA', vamosA: 4 })).toMatchObject({ ok: false })
    expect(apply(p, { tipo: 'mandar', jugador: 'e', a: 0, que: 'vamosA', vamosA: 1 })).toMatchObject({ ok: false })
    // Al segundo, cuando ya jugó el primero, solo "vení".
    const despues = jugar(p, ['jugar', 'a', '1e'], ['jugar', 'b', '1b']).estado
    expect(apply(despues, { tipo: 'mandar', jugador: 'e', a: 2, que: 'vamosA', vamosA: 0 })).toMatchObject({ ok: false, motivo: 'Ese compañero ya jugó' })
    expect(apply(despues, { tipo: 'mandar', jugador: 'e', a: 2, que: 'veni' }).ok).toBe(true)
  })

  it('en el pica-pica no hay pie', () => {
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o', '7e 5o 12b', '3e 6b 11o', '2b 5e 10o', '3o 7b 12e'], '3c', {
      picaPicaAlternado: false,
    })
    expect(vistaPara(p, 'a').mano.enfrentamientos[0]!.lideres).toEqual([null, null])
    jugar(p, ['truco', 'a'])
  })
})

describe('irse al mazo solo', () => {
  it('si no es el pie, se va él solo y el equipo sigue', () => {
    let { estado, eventos } = jugar(partidaCon(MANOS_2V2, '3c'), ['jugar', 'a', '1e'], ['mazo', 'b'])
    expect(eventos).toContainEqual({ tipo: 'alMazo', asiento: 1, equipo: 1, solo: true })
    expect(estado.mano.numero).toBe(1)
    expect(estado.mano.cartas[1]).toEqual([])
    // Le toca a c, saltando a b.
    expect(enfrentamientoActual(estado).turno).toBe(2)
    rechaza(estado, ['jugar', 'b', '1b'], 'Te fuiste al mazo')
    ;({ estado } = jugar(estado, ['jugar', 'c', '12b'], ['jugar', 'd', '3e']))
    // La primera se cierra con tres cartas y la gana a.
    expect(enfrentamientoActual(estado).vueltas[0]!.resultado).toBe(0)
    // En la segunda b no juega; a gana también la segunda y su equipo, la mano.
    ;({ estado } = jugar(estado, ['jugar', 'a', '7o'], ['jugar', 'c', '5o'], ['jugar', 'd', '6b']))
    expect(estado.mano.numero).toBe(2)
    expect(estado.puntos).toEqual([1, 0])
  })

  it('si se va el pie, pierde el equipo', () => {
    const { estado, eventos } = jugar(partidaCon(MANOS_2V2, '3c', { mazoCobraEnvidoPendiente: false }), ['mazo', 'd'])
    expect(eventos).toContainEqual({ tipo: 'alMazo', asiento: 3, equipo: 1 })
    expect(estado.puntos).toEqual([1, 0])
  })
})

describe('piezas por abajo en el pica-pica', () => {
  // Muestra 3 de copas: el 2 de copas es pieza. Duelo 1: a contra d.
  const MANOS = ['2c 7o 4b', '1b 2e 6o', '7e 5o 12b', '3e 6b 11o', '2b 5e 10o', '3o 7b 12e']

  it('solo las ve el rival del duelo, también al terminar', () => {
    const p = partidaCon(MANOS, '3c', { picaPicaAlternado: false })
    const r = apply(p, { tipo: 'jugarCarta', jugador: 'a', carta: c('2c') })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    const ev = r.eventos[0]!
    expect(eventosPara([ev], 3)[0]).toMatchObject({ carta: c('2c') })
    expect(eventosPara([ev], 1)[0]).toMatchObject({ carta: null })
    expect(eventosPara([ev], 1)[0]).not.toHaveProperty('ocultaPara')
    const jugada = (id: string) => vistaPara(r.estado, id).mano.enfrentamientos[0]!.vueltas[0]!.jugadas[0]!.carta
    expect(jugada('d')).toEqual(c('2c'))
    expect(jugada('b')).toBeNull()
    expect(jugada('c')).toBeNull()
    // Las cartas comunes se ven.
    const comun = aplicar(r.estado, { tipo: 'jugarCarta', jugador: 'd', carta: c('3e') })
    expect(vistaPara(comun, 'b').mano.enfrentamientos[0]!.vueltas[0]!.jugadas[1]!.carta).toEqual(c('3e'))
  })

  it('un envido con pieza: el tanto lo oyen todos, pero la pieza la ve solo el rival del duelo', () => {
    const p = partidaCon(MANOS, '3c', { picaPicaAlternado: false })
    const tanto = p.mano.tantos[0]!.envidoReal
    const { estado, eventos } = jugar(p, ['envido', 'a'], ['quiero', 'd'], ['declarar', 'a', tanto], ['declarar', 'd', 'sonBuenas'], ['mazo', 'd'])
    const declarado = eventos.find((ev) => ev.tipo === 'tantoDeclarado' && ev.asiento === 0)!
    for (const asiento of [1, 2, 3]) expect(eventosPara([declarado], asiento)).toEqual([declarado])
    const mostradas = (id: string) => vistaPara(estado, id).mano.enfrentamientos[0]!.resultado!.mostradas.flatMap((m) => m.cartas)
    expect(mostradas('d')).toContainEqual(c('2c'))
    for (const id of ['b', 'c', 'e', 'f']) expect(mostradas(id)).not.toContainEqual(c('2c'))
    const fin = eventos.find((ev) => ev.tipo === 'enfrentamientoTerminado')!
    const enEvento = (asiento: number) => (eventosPara([fin], asiento)[0] as Extract<Evento, { tipo: 'enfrentamientoTerminado' }>).resultado.mostradas.flatMap((m) => m.cartas)
    expect(enEvento(3)).toContainEqual(c('2c'))
    expect(enEvento(2)).not.toContainEqual(c('2c'))
  })
})

describe('el corte', () => {
  const conCorte = (n = 2) =>
    crearPartida({
      jugadores: ['a', 'b', 'c', 'd'].slice(0, n).map((id) => ({ id, nombre: id })),
      semilla: 7,
      config: { formato: n === 2 ? '1v1' : '2v2', corte: true },
    })

  it('la mano espera que corte el de la izquierda del que reparte, sin cartas ni muestra', () => {
    const p = conCorte(4)
    // Reparte el asiento 3: corta el 2.
    expect(p.mano.cortando).toBe(2)
    expect(esperandoA(p)).toEqual([2])
    const v = vistaPara(p, 'a')
    expect(v.mano.muestra).toBeNull()
    expect(v.mano.misCartas).toEqual([])
    expect(v.accionesValidas).toEqual([])
    expect(vistaPara(p, 'c').accionesValidas.map((x) => x.tipo)).toEqual(['cortar', 'cortar', 'cortar'])
    rechaza(p, ['jugar', 'a', '1e'], 'Están cortando')
  })

  it('cada corte reparte 3 cartas a cada uno y una muestra, sin repetir', () => {
    for (const corte of ['convencional', 'sacarMuestra', 'darAlMano'] as const) {
      const p = conCorte(4)
      const r = apply(p, { tipo: 'cortar', jugador: 'c', corte })
      expect(r.ok).toBe(true)
      if (!r.ok) return
      expect(r.eventos.map((x) => x.tipo)).toEqual(['corte', 'manoRepartida', 'enfrentamientoIniciado'])
      const todas = [...r.estado.mano.cartas.flat(), r.estado.mano.muestra]
      expect(todas).toHaveLength(13)
      expect(todas.every((x, i) => todas.findIndex((y) => mismaCarta(x, y)) === i)).toBe(true)
      expect(r.estado.mano.cortando).toBeNull()
      expect(esperandoA(r.estado)).toEqual([0])
    }
  })

  it('sacar la muestra: la de arriba es la muestra; se la doy al mano: la cortada es del mano', () => {
    const p = conCorte()
    const arriba = p.mano.mazo![0]!
    const saca = aplicar(p, { tipo: 'cortar', jugador: 'a', corte: 'sacarMuestra' })
    expect(saca.mano.muestra).toEqual(arriba)
    const doy = aplicar(p, { tipo: 'cortar', jugador: 'a', corte: 'darAlMano' })
    expect(doy.mano.cartas[0]![0]).toEqual(arriba)
  })

  it('la mano siguiente vuelve a esperar el corte', () => {
    let estado = aplicar(conCorte(), { tipo: 'cortar', jugador: 'a', corte: 'convencional' })
    const r = apply(estado, { tipo: 'irseAlMazo', jugador: 'a' })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    estado = r.estado
    expect(r.eventos.at(-1)).toMatchObject({ tipo: 'esperandoCorte', numero: 2, reparte: 0, mano: 1, asiento: 1 })
    expect(estado.mano.cortando).toBe(1)
  })
})
