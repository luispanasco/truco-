import { describe, expect, it } from 'vitest'
import { crearConfig, valorFalta } from '../src'
import { esManoDePicaPica } from '../src/partida'
import { partidaCon } from './helpers'

describe('largo del partido', () => {
  it('a 30 por defecto, con malas hasta 15', () => {
    const c = crearConfig()
    expect([c.puntosPartida, c.puntosMalas, c.tramoPicaPica]).toEqual([30, 15, { desde: 0, hasta: 15 }])
  })

  it('a 20 y a 40, las malas y el tramo del pica-pica son la mitad', () => {
    const veinte = crearConfig({ puntosPartida: 20 })
    expect([veinte.puntosMalas, veinte.tramoPicaPica.hasta]).toEqual([10, 10])
    const cuarenta = crearConfig({ puntosPartida: 40 })
    expect([cuarenta.puntosMalas, cuarenta.tramoPicaPica.hasta]).toEqual([20, 20])
  })

  it('a 20, la falta completa las malas hasta 10 y después es lo que falta para 20', () => {
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c', { puntosPartida: 20 })
    p.puntos = [4, 2]
    expect(valorFalta(p, 1)).toBe(6)
    p.puntos = [10, 2]
    expect(valorFalta(p, 1)).toBe(10)
  })

  it('a 40, el pica-pica sigue hasta que un equipo pasa de 20', () => {
    const config = crearConfig({ formato: '3v3', puntosPartida: 40 })
    expect(esManoDePicaPica({ config, puntos: [20, 18] }, 2)).toBe(true)
    expect(esManoDePicaPica({ config, puntos: [21, 18] }, 2)).toBe(false)
  })
})
