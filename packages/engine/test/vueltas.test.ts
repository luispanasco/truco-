import { describe, expect, it } from 'vitest'
import { enfrentamientoActual, ganadorPorVueltas, resolverVuelta, type ResultadoVuelta } from '../src'
import { c, jugar, partidaCon, rechaza } from './helpers'

describe('ganador por vueltas', () => {
  const casos: [ResultadoVuelta[], 0 | 1 | null][] = [
    [[], null],
    [[0], null],
    [[0, 0], 0],
    [[1, 1], 1],
    [[0, 1], null],
    [[0, 1, 0], 0],
    [[0, 1, 1], 1],
    // Primera parda: define la segunda.
    [['parda', 1], 1],
    [['parda', 0], 0],
    // Primera y segunda pardas: define la tercera.
    [['parda', 'parda'], null],
    [['parda', 'parda', 1], 1],
    // Todas pardas: gana el mano.
    [['parda', 'parda', 'parda'], 0],
    // Primera con ganador y segunda parda: gana el de la primera.
    [[1, 'parda'], 1],
    [[0, 'parda'], 0],
    // Una y una, tercera parda: gana el de la primera.
    [[0, 1, 'parda'], 0],
    [[1, 0, 'parda'], 1],
  ]
  for (const [resultados, esperado] of casos) {
    it(`${JSON.stringify(resultados)} → ${esperado}`, () => {
      expect(ganadorPorVueltas(resultados, 0)).toBe(esperado)
    })
  }

  it('todas pardas gana el mano aunque sea el equipo 1', () => {
    expect(ganadorPorVueltas(['parda', 'parda', 'parda'], 1)).toBe(1)
  })
})

describe('resolver vuelta', () => {
  const muestra = c('3c')

  it('cartas iguales de equipos distintos: parda', () => {
    expect(
      resolverVuelta(
        [
          { asiento: 0, carta: c('6e') },
          { asiento: 1, carta: c('6b') },
        ],
        muestra,
      ).resultado,
    ).toBe('parda')
  })

  it('cartas iguales del mismo equipo: gana ese equipo, con la primera jugada', () => {
    const r = resolverVuelta(
      [
        { asiento: 0, carta: c('3e') },
        { asiento: 1, carta: c('6o') },
        { asiento: 2, carta: c('3b') },
        { asiento: 3, carta: c('5o') },
      ],
      muestra,
    )
    expect(r).toEqual({ resultado: 0, ganador: 0 })
  })

  it('una pieza le gana al 1 de espadas', () => {
    expect(
      resolverVuelta(
        [
          { asiento: 0, carta: c('1e') },
          { asiento: 1, carta: c('10c') },
        ],
        muestra,
      ),
    ).toEqual({ resultado: 1, ganador: 1 })
  })
})

describe('mano completa', () => {
  it('turnos antihorarios en 2v2 y gana la vuelta el que tiró más alto', () => {
    const p = partidaCon(['1e 4b 5b', '6o 4o 5e', '7b 6b 12e', '3o 11e 10e'], '3c')
    let { estado } = jugar(p, ['jugar', 'a', '4b'])
    expect(enfrentamientoActual(estado).turno).toBe(1)
    rechaza(estado, ['jugar', 'c', '7b'], 'No es tu turno')
    ;({ estado } = jugar(estado, ['jugar', 'b', '6o'], ['jugar', 'c', '7b'], ['jugar', 'd', '3o']))
    const e = enfrentamientoActual(estado)
    expect(e.vueltas[0]!.resultado).toBe(1)
    expect(e.vueltas[1]!.empieza).toBe(3)
    expect(e.turno).toBe(3)
  })

  it('después de una primera parda empieza el que empezó la vuelta empatada y define la segunda', () => {
    const p = partidaCon(['6e 7o 4b', '6b 1b 5o'], '3c')
    let { estado } = jugar(p, ['jugar', 'a', '6e'], ['jugar', 'b', '6b'])
    const e = enfrentamientoActual(estado)
    expect(e.vueltas[0]!.resultado).toBe('parda')
    expect(e.vueltas[1]!.empieza).toBe(0)
    ;({ estado } = jugar(estado, ['jugar', 'a', '7o'], ['jugar', 'b', '1b']))
    expect(estado.puntos).toEqual([0, 1])
    expect(estado.mano.numero).toBe(2)
  })

  it('las tres pardas: gana el mano', () => {
    const p = partidaCon(['12e 11o 6e', '12b 11b 6o'], '3c')
    const { estado } = jugar(
      p,
      ['jugar', 'a', '12e'],
      ['jugar', 'b', '12b'],
      ['jugar', 'a', '11o'],
      ['jugar', 'b', '11b'],
      ['jugar', 'a', '6e'],
      ['jugar', 'b', '6o'],
    )
    expect(estado.puntos).toEqual([1, 0])
  })

  it('no se puede jugar una carta que no tenés', () => {
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c')
    rechaza(p, ['jugar', 'a', '1b'], 'No tenés esa carta')
  })

  it('el reparto rota: la mano siguiente reparte el que era mano', () => {
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c')
    const { estado } = jugar(p, ['mazo', 'b'])
    expect(estado.mano.reparte).toBe(0)
    expect(estado.mano.mano).toBe(1)
    expect(enfrentamientoActual(estado).turno).toBe(1)
  })
})
