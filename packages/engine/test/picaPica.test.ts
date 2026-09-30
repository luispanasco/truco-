import { describe, expect, it } from 'vitest'
import { crearConfig, enfrentamientoActual, vistaPara } from '../src'
import { esManoDePicaPica } from '../src/partida'
import { c, jugar, partidaCon, rechaza } from './helpers'

// Muestra 3 de copas; nadie tiene flor. Equipo 0: a, c, e. Equipo 1: b, d, f.
const MANOS = ['1e 7o 4b', '1b 2e 6o', '7e 5o 12b', '3e 6b 11o', '2b 5e 10o', '3o 7b 12e']

describe('pica-pica', () => {
  it('se juega solo en 3v3, con la opción activa y los dos equipos en malas', () => {
    const config = crearConfig({ formato: '3v3' })
    expect(esManoDePicaPica({ config, puntos: [0, 0] })).toBe(true)
    expect(esManoDePicaPica({ config, puntos: [15, 15] })).toBe(true)
    expect(esManoDePicaPica({ config, puntos: [16, 3] })).toBe(false)
    expect(esManoDePicaPica({ config: { ...config, picaPica: false }, puntos: [0, 0] })).toBe(false)
    expect(esManoDePicaPica({ config: crearConfig({ formato: '2v2' }), puntos: [0, 0] })).toBe(false)
  })

  it('tres duelos en serie: abre el mano contra el de enfrente y siguen en sentido antihorario', () => {
    let estado = partidaCon(MANOS, '3c')
    expect(estado.mano.picaPica).toBe(true)
    expect(enfrentamientoActual(estado).participantes).toEqual([0, 3])
    rechaza(estado, ['jugar', 'b', '1b'], 'No jugás en este duelo')

    // Duelo 1: a contra d. a gana las dos primeras.
    ;({ estado } = jugar(estado, ['jugar', 'a', '1e'], ['jugar', 'd', '3e'], ['jugar', 'a', '7o'], ['jugar', 'd', '6b']))
    expect(estado.puntos).toEqual([1, 0])
    expect(estado.mano.actual).toBe(1)
    expect(enfrentamientoActual(estado).participantes).toEqual([1, 4])
    expect(enfrentamientoActual(estado).turno).toBe(1)

    // Duelo 2: b contra e, con envido propio.
    ;({ estado } = jugar(estado, ['envido', 'b'], ['quiero', 'e'], ['declarar', 'b', 6], ['declarar', 'e', 'sonBuenas'], ['mazo', 'e']))
    expect(estado.puntos).toEqual([1, 3])
    expect(enfrentamientoActual(estado).participantes).toEqual([2, 5])

    // Duelo 3: c contra f. Los que juegan después ven las cartas de los duelos anteriores.
    const vistaC = vistaPara(estado, 'c')
    const jugadasAntes = vistaC.mano.enfrentamientos[0]!.vueltas.flatMap((v) => v.jugadas.map((j) => j.carta))
    expect(jugadasAntes).toEqual(expect.arrayContaining([c('1e'), c('3e'), c('7o'), c('6b')]))

    ;({ estado } = jugar(estado, ['truco', 'c'], ['quiero', 'f'], ['mazo', 'f']))
    expect(estado.puntos).toEqual([3, 3])
    // Terminada la mano, se reparte de nuevo y reparte el que era mano.
    expect(estado.mano.numero).toBe(2)
    expect(estado.mano.reparte).toBe(0)
    expect(estado.mano.mano).toBe(1)
  })

  it('cuando un equipo entra en buenas se vuelve a jugar redondo', () => {
    let estado = partidaCon(MANOS, '3c')
    estado.puntos = [15, 0]
    // Primera mano: se van al mazo los tres del equipo 0.
    ;({ estado } = jugar(estado, ['mazo', 'a'], ['mazo', 'e'], ['mazo', 'c']))
    expect(estado.puntos).toEqual([15, 3])
    expect(estado.mano.numero).toBe(2)
    expect(estado.mano.picaPica).toBe(true)
    expect(enfrentamientoActual(estado).participantes).toEqual([1, 4])
    // Segunda mano: el equipo 0 entra en buenas en el primer duelo, pero la mano sigue en pica-pica.
    ;({ estado } = jugar(estado, ['mazo', 'b']))
    expect(estado.puntos).toEqual([16, 3])
    expect(estado.mano.picaPica).toBe(true)
    ;({ estado } = jugar(estado, ['mazo', 'f'], ['mazo', 'd']))
    expect(estado.puntos).toEqual([18, 3])
    expect(estado.mano.numero).toBe(3)
    expect(estado.mano.picaPica).toBe(false)
    expect(enfrentamientoActual(estado).participantes).toHaveLength(6)
  })

  it('con la opción apagada, el 3v3 se juega siempre redondo', () => {
    const estado = partidaCon(MANOS, '3c', { picaPica: false })
    expect(estado.mano.picaPica).toBe(false)
    expect(enfrentamientoActual(estado).participantes).toEqual([0, 1, 2, 3, 4, 5])
  })
})
