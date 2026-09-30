import { describe, expect, it } from 'vitest'
import { calcularEnvido, calcularFlor, crearBaraja, mismaCarta, tieneFlor, type Carta } from '../src'
import { c, mano } from './helpers'

const env = (cartas: string, muestra: string) => calcularEnvido(mano(cartas), c(muestra))
const flor = (cartas: string, muestra: string, regla: 'piezaMayorMasDigitos' | 'piezaMayorMasNumero' = 'piezaMayorMasDigitos') =>
  calcularFlor(mano(cartas), c(muestra), regla)

describe('envido', () => {
  it('dos del mismo palo: 20 más la suma', () => {
    expect(env('7e 6e 1b', '3c')).toBe(33)
    expect(env('12e 11e 4b', '3c')).toBe(20)
    expect(env('7e 12e 4b', '3c')).toBe(27)
  })

  it('sin par: la carta más alta', () => {
    expect(env('7e 6b 1o', '3c')).toBe(7)
    expect(env('12e 11b 10o', '3c')).toBe(0)
  })

  it('elige el mejor par cuando hay tres del mismo palo', () => {
    expect(env('7e 6e 5e', '3c')).toBe(33)
  })

  it('con pieza: la pieza más la carta más alta de cualquier palo', () => {
    expect(env('2o 7e 1b', '3o')).toBe(37)
    expect(env('4o 6c 5b', '3o')).toBe(35)
    expect(env('5o 12c 1b', '3o')).toBe(29)
    expect(env('11o 5c 4b', '3o')).toBe(32)
    expect(env('10o 3c 12b', '3o')).toBe(30)
  })

  it('el 12 de la muestra pieza vale como esa pieza', () => {
    expect(env('12o 7e 1b', '5o')).toBe(35)
    expect(env('12o 7e 1b', '2o')).toBe(37)
  })

  it('el máximo es 37, para cualquier muestra', () => {
    const baraja = crearBaraja()
    let max = 0
    for (const muestra of baraja) {
      const resto = baraja.filter((x) => !mismaCarta(x, muestra))
      for (let i = 0; i < resto.length; i++)
        for (let j = i + 1; j < resto.length; j++)
          for (let k = j + 1; k < resto.length; k++) {
            const t = calcularEnvido([resto[i], resto[j], resto[k]] as Carta[], muestra)
            if (t > max) max = t
          }
    }
    expect(max).toBe(37)
  })
})

describe('flor', () => {
  it('tres del mismo palo', () => {
    expect(tieneFlor(mano('7e 6e 5e'), c('3c'))).toBe(true)
    expect(flor('7e 6e 5e', '3c')).toBe(38)
    expect(flor('12e 11e 10e', '3c')).toBe(20)
  })

  it('sin flor devuelve null', () => {
    expect(tieneFlor(mano('7e 6e 5b'), c('3c'))).toBe(false)
    expect(flor('7e 6e 5b', '3c')).toBeNull()
  })

  it('una pieza más dos del mismo palo', () => {
    expect(tieneFlor(mano('2o 7e 6e'), c('3o'))).toBe(true)
    expect(flor('2o 7e 6e', '3o')).toBe(43)
    expect(flor('11o 7e 3e', '3o')).toBe(37)
  })

  it('una pieza con dos de palos distintos no es flor', () => {
    expect(tieneFlor(mano('2o 7e 6b'), c('3o'))).toBe(false)
  })

  it('una pieza más dos comunes del palo de la muestra es flor', () => {
    expect(flor('2o 7o 6o', '3o')).toBe(43)
  })

  it('dos piezas más cualquier carta', () => {
    expect(tieneFlor(mano('2o 4o 5c'), c('3o'))).toBe(true)
    expect(flor('2o 4o 5c', '3o')).toBe(44) // 30 + 9 + 5
    expect(flor('2o 4o 5c', '3o', 'piezaMayorMasNumero')).toBe(39) // 30 + 4 + 5
    expect(flor('11o 10o 12e', '3o')).toBe(34) // 27 + 7 + 0
  })

  it('tres piezas', () => {
    expect(flor('2o 4o 5o', '3o')).toBe(47) // 30 + 9 + 8
    expect(flor('2o 4o 5o', '3o', 'piezaMayorMasNumero')).toBe(39) // 30 + 4 + 5
  })

  it('con el 12 reemplazando una pieza', () => {
    expect(flor('12o 4o 1e', '2o')).toBe(40) // 30 + 9 + 1
    expect(flor('12o 4o 1e', '2o', 'piezaMayorMasNumero')).toBe(35) // 30 + 4 + 1
  })

  it('todas las manos con dos o más piezas tienen flor', () => {
    const muestra = c('3o')
    const piezas = mano('2o 4o 5o 11o 10o')
    for (const otra of crearBaraja().filter((x) => x.palo !== 'oro')) {
      for (let i = 0; i < piezas.length; i++)
        for (let j = i + 1; j < piezas.length; j++) {
          expect(tieneFlor([piezas[i]!, piezas[j]!, otra], muestra)).toBe(true)
        }
    }
  })
})
