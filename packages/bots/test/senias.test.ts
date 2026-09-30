import { describe, expect, it } from 'vitest'
import type { Carta, Numero, Palo } from '@truco/engine'
import { mismasSenias, seniaDeCarta, seniasDeMano } from '../src'

const PALOS: Record<string, Palo> = { e: 'espada', b: 'basto', o: 'oro', c: 'copa' }
const c = (t: string): Carta => ({ numero: Number(t.slice(0, -1)) as Numero, palo: PALOS[t.slice(-1)]! })
const mano = (t: string) => t.split(' ').map(c)

describe('señas', () => {
  const muestra = c('6o')

  it('cada pieza tiene su seña', () => {
    expect(seniaDeCarta(c('2o'), muestra)).toBe('pieza2')
    expect(seniaDeCarta(c('4o'), muestra)).toBe('pieza4')
    expect(seniaDeCarta(c('5o'), muestra)).toBe('pieza5')
    expect(seniaDeCarta(c('11o'), muestra)).toBe('perico')
    expect(seniaDeCarta(c('10o'), muestra)).toBe('perica')
  })

  it('matas, treses, doses y unos falsos', () => {
    expect(seniaDeCarta(c('1e'), muestra)).toBe('unoBravo')
    expect(seniaDeCarta(c('1b'), muestra)).toBe('unoBravo')
    expect(seniaDeCarta(c('7e'), muestra)).toBe('sieteBravo')
    expect(seniaDeCarta(c('7o'), muestra)).toBe('sieteBravo')
    expect(seniaDeCarta(c('3c'), muestra)).toBe('tres')
    expect(seniaDeCarta(c('2e'), muestra)).toBe('dosComun')
    expect(seniaDeCarta(c('1c'), muestra)).toBe('unoFalso')
    expect(seniaDeCarta(c('1o'), muestra)).toBe('unoFalso')
  })

  it('el resto no tiene seña', () => {
    for (const t of ['7c', '7b', '6e', '5e', '4b', '12c', '11b', '10e', '12o']) {
      expect(seniaDeCarta(c(t), muestra), t).toBeNull()
    }
  })

  it('con la muestra pieza, el 12 hace la seña de esa pieza', () => {
    expect(seniaDeCarta(c('12o'), c('4o'))).toBe('pieza4')
    expect(seniaDeCarta(c('12o'), c('11o'))).toBe('perico')
  })

  it('una seña por carta, más la flor', () => {
    expect(seniasDeMano(mano('3e 3b 6c'), muestra)).toEqual(['tres', 'tres'])
    expect(seniasDeMano(mano('7e 6e 5e'), muestra)).toEqual(['sieteBravo', 'flor'])
    expect(seniasDeMano(mano('2o 1e 4c'), muestra)).toEqual(['pieza2', 'unoBravo'])
    expect(seniasDeMano(mano('6e 5b 4c'), muestra)).toEqual([])
  })

  it('compara señas sin importar el orden', () => {
    expect(mismasSenias(['tres', 'flor'], ['flor', 'tres'])).toBe(true)
    expect(mismasSenias(['tres'], ['tres', 'tres'])).toBe(false)
  })
})
